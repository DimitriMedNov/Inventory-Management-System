import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProductoAnalisis {
  producto_id: string;
  sku: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  consumo_diario_promedio: number;
  dias_restantes_estimados: number | null;
  fecha_estimada_agotamiento: string | null;
  frecuencia_recarga_dias: number | null;
  cantidad_recomendada_recompra: number;
  prioridad: "critica" | "alta" | "media" | "baja";
  recomendacion: string;
}

export interface AnalisisInventarioResultado {
  resumen_general: string;
  productos: ProductoAnalisis[];
  acciones_inmediatas: string[];
  generado_en: string;
}

export const analizarInventarioIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; data: AnalisisInventarioResultado } | { ok: false; error: string }> => {
    try {
      const { supabase } = context;

      const [{ data: productos, error: pErr }, { data: movs, error: mErr }] = await Promise.all([
        supabase
          .from("productos")
          .select("id, sku, nombre, stock_actual, stock_minimo, unidad_medida, categoria_id")
          .eq("activo", true),
        supabase
          .from("movimientos_inventario")
          .select("producto_id, tipo, cantidad, fecha")
          .gte("fecha", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order("fecha", { ascending: false })
          .limit(1000),
      ]);

      if (pErr) return { ok: false, error: "Error productos: " + pErr.message };
      if (mErr) return { ok: false, error: "Error movimientos: " + mErr.message };
      if (!productos || productos.length === 0) {
        return { ok: false, error: "No hay productos activos para analizar." };
      }

      // Construir resumen ligero por producto para el prompt
      const movsPorProd: Record<string, { salidas_90d: number; entradas_90d: number; ultima_salida?: string; ultima_entrada?: string }> = {};
      for (const m of movs ?? []) {
        const r = (movsPorProd[m.producto_id] ??= { salidas_90d: 0, entradas_90d: 0 });
        const cant = Math.abs(Number(m.cantidad));
        if (m.tipo === "salida") {
          r.salidas_90d += cant;
          if (!r.ultima_salida) r.ultima_salida = m.fecha;
        } else if (m.tipo === "entrada") {
          r.entradas_90d += cant;
          if (!r.ultima_entrada) r.ultima_entrada = m.fecha;
        }
      }

      const inventarioParaIA = productos.map((p) => {
        const r = movsPorProd[p.id] ?? { salidas_90d: 0, entradas_90d: 0 };
        return {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          unidad: p.unidad_medida,
          stock_actual: Number(p.stock_actual),
          stock_minimo: Number(p.stock_minimo),
          salidas_ultimos_90d: r.salidas_90d,
          entradas_ultimos_90d: r.entradas_90d,
          ultima_salida: r.ultima_salida ?? null,
          ultima_entrada: r.ultima_entrada ?? null,
        };
      });

      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
      if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY no configurado" };

      const systemPrompt = `Eres un analista experto de inventarios y cadena de suministro. Recibirás el inventario actual y los movimientos de los últimos 90 días. Tu tarea es:
1. Calcular el consumo diario promedio (salidas_ultimos_90d / 90).
2. Estimar cuántos días de stock quedan: stock_actual / consumo_diario_promedio (null si consumo = 0).
3. Estimar la fecha aproximada de agotamiento (ISO date) basada en hoy (${new Date().toISOString().slice(0, 10)}).
4. Recomendar cada cuántos días debe hacerse una recarga para mantener stock por encima del mínimo.
5. Sugerir cantidad a recomprar (idealmente 60 días de consumo, mínimo lo necesario para superar stock_minimo).
6. Asignar prioridad:
   - "critica": stock_actual <= stock_minimo o se agota en <= 7 días
   - "alta": se agota en 8-21 días
   - "media": se agota en 22-45 días
   - "baja": se agota en > 45 días o sin consumo
7. Dar una recomendación corta (1-2 frases) en español dirigida al almacenista.
Responde EXCLUSIVAMENTE con JSON válido siguiendo el esquema indicado, sin markdown ni texto adicional.`;

      const schemaInstructions = `Esquema JSON requerido:
{
  "resumen_general": "string (2-4 frases sobre estado global del inventario)",
  "acciones_inmediatas": ["string", ...] (máx 5 acciones urgentes),
  "productos": [
    {
      "producto_id": "uuid",
      "sku": "string",
      "nombre": "string",
      "stock_actual": number,
      "stock_minimo": number,
      "consumo_diario_promedio": number,
      "dias_restantes_estimados": number|null,
      "fecha_estimada_agotamiento": "YYYY-MM-DD"|null,
      "frecuencia_recarga_dias": number|null,
      "cantidad_recomendada_recompra": number,
      "prioridad": "critica"|"alta"|"media"|"baja",
      "recomendacion": "string"
    }
  ]
}
Incluye TODOS los productos del inventario en el array "productos".`;

      const userPrompt = `${schemaInstructions}

Inventario (JSON):
${JSON.stringify(inventarioParaIA)}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) return { ok: false, error: "Límite de uso alcanzado, intenta en unos minutos." };
        if (aiRes.status === 402) return { ok: false, error: "Créditos de IA agotados. Agrega fondos en el workspace." };
        const t = await aiRes.text();
        console.error("[analizarInventarioIA] AI gateway error", aiRes.status, t);
        return { ok: false, error: `Error de IA (${aiRes.status})` };
      }

      const aiJson = await aiRes.json();
      const content: string = aiJson.choices?.[0]?.message?.content ?? "";
      let parsed: Omit<AnalisisInventarioResultado, "generado_en">;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.error("[analizarInventarioIA] JSON parse error", content);
        return { ok: false, error: "La IA devolvió una respuesta no válida." };
      }

      return {
        ok: true,
        data: {
          ...parsed,
          generado_en: new Date().toISOString(),
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analizarInventarioIA] unexpected", e);
      return { ok: false, error: "Error inesperado: " + msg };
    }
  });
