import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertTriangle, Calendar, RefreshCw, Package, TrendingDown, Loader2 } from "lucide-react";
import { analizarInventarioIA, type AnalisisInventarioResultado } from "@/lib/inventory-analysis.functions";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/analisis-ia")({
  component: AnalisisIAPage,
});

const PRIORIDAD_STYLES: Record<string, string> = {
  critica: "bg-destructive/10 text-destructive border-destructive/30",
  alta: "bg-warning/15 text-warning-foreground border-warning/30",
  media: "bg-info/10 text-info border-info/30",
  baja: "bg-muted text-muted-foreground border-border",
};

const PRIORIDAD_ORDEN: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

function AnalisisIAPage() {
  return (
    <RequireAuth roles={["admin", "almacen"]}>
      <AnalisisIAInner />
    </RequireAuth>
  );
}

function AnalisisIAInner() {
  const ejecutar = useServerFn(analizarInventarioIA);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<AnalisisInventarioResultado | null>(null);
  const [filtro, setFiltro] = useState<string>("todas");

  const generar = async () => {
    setLoading(true);
    try {
      const res = await ejecutar();
      if (res.ok) {
        setResultado(res.data);
        toast.success("Análisis generado correctamente");
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = resultado?.productos
    ?.slice()
    .sort((a, b) => (PRIORIDAD_ORDEN[a.prioridad] ?? 9) - (PRIORIDAD_ORDEN[b.prioridad] ?? 9))
    .filter((p) => filtro === "todas" || p.prioridad === filtro) ?? [];

  const conteos = resultado?.productos?.reduce(
    (acc, p) => {
      acc[p.prioridad] = (acc[p.prioridad] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  ) ?? {};

  return (
    <>
      <PageHeader
        title="Análisis IA de Inventario"
        description="Recomendaciones inteligentes de recompra y proyección de agotamiento basadas en consumo histórico (90 días)."
        actions={
          <Button onClick={generar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analizando..." : resultado ? "Regenerar análisis" : "Generar análisis"}
          </Button>
        }
      />

      {!resultado && !loading && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Aún no se ha ejecutado el análisis</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              La IA analizará todo tu inventario activo, calculará el consumo promedio, estimará cuándo se
              agotará cada producto y te dirá cada cuánto tiempo deberías reabastecerlo.
            </p>
            <Button onClick={generar} className="mt-2">
              <Sparkles className="h-4 w-4" /> Generar análisis ahora
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && !resultado && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">La IA está analizando tu inventario...</p>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <div className="space-y-6">
          {/* Resumen general */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resumen general
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{resultado.resumen_general}</p>

              {resultado.acciones_inmediatas?.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                    Acciones inmediatas
                  </div>
                  <ul className="space-y-1 text-sm">
                    {resultado.acciones_inmediatas.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-warning-foreground">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Generado: {fmtDateTime(resultado.generado_en)}
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {(["todas", "critica", "alta", "media", "baja"] as const).map((p) => {
              const count = p === "todas" ? resultado.productos.length : conteos[p] ?? 0;
              return (
                <button
                  key={p}
                  onClick={() => setFiltro(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filtro === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {p === "todas" ? "Todas" : p.charAt(0).toUpperCase() + p.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista productos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {productosFiltrados.map((p) => (
              <Card key={p.producto_id} className="overflow-hidden">
                <div className={`h-1 w-full ${
                  p.prioridad === "critica" ? "bg-destructive" :
                  p.prioridad === "alta" ? "bg-warning" :
                  p.prioridad === "media" ? "bg-info" : "bg-muted"
                }`} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.nombre}</div>
                      <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${PRIORIDAD_STYLES[p.prioridad]}`}>
                      {p.prioridad.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Metric icon={Package} label="Stock actual" value={`${p.stock_actual}`} sub={`mín. ${p.stock_minimo}`} />
                    <Metric icon={TrendingDown} label="Consumo/día" value={p.consumo_diario_promedio.toFixed(2)} />
                    <Metric
                      icon={Calendar}
                      label="Días restantes"
                      value={p.dias_restantes_estimados !== null ? `${Math.round(p.dias_restantes_estimados)} días` : "—"}
                      sub={p.fecha_estimada_agotamiento ? `Se agota: ${p.fecha_estimada_agotamiento}` : "Sin consumo registrado"}
                    />
                    <Metric
                      icon={RefreshCw}
                      label="Recargar cada"
                      value={p.frecuencia_recarga_dias ? `${p.frecuencia_recarga_dias} días` : "—"}
                      sub={`Comprar: ${p.cantidad_recomendada_recompra}`}
                    />
                  </div>

                  <div className="rounded-md bg-muted/40 p-3 text-sm border border-border">
                    {p.recomendacion}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="uppercase tracking-wide text-[10px] font-medium">{label}</span>
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
