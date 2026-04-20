import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/movimientos")({
  component: Page,
});

interface Mov {
  id: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  motivo: string | null;
  referencia: string | null;
  fecha: string;
  productos: { nombre: string; sku: string; unidad_medida: string } | null;
  profiles: { nombre: string } | null;
}

function Page() {
  return <RequireAuth roles={["admin", "almacen"]}><Inner /></RequireAuth>;
}

function Inner() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<Mov[]>([]);
  const [productos, setProductos] = useState<{ id: string; nombre: string; sku: string; stock_actual: number; unidad_medida: string }[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("movimientos_inventario")
        .select("id, tipo, cantidad, motivo, referencia, fecha, productos(nombre, sku, unidad_medida), profiles!movimientos_inventario_usuario_responsable_fkey(nombre)")
        .order("fecha", { ascending: false }).limit(200),
      supabase.from("productos").select("id, nombre, sku, stock_actual, unidad_medida").eq("activo", true).order("nombre"),
    ]);
    setMovs((m ?? []) as unknown as Mov[]);
    setProductos(p ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const onSave = async (form: { producto_id: string; tipo: string; cantidad: number; motivo: string; referencia: string }) => {
    try {
      if (form.tipo === "salida") {
        const prod = productos.find((x) => x.id === form.producto_id);
        if (prod && Number(prod.stock_actual) < form.cantidad) {
          toast.error(`Stock insuficiente (disponible: ${prod.stock_actual})`);
          return;
        }
      }
      const { error } = await supabase.from("movimientos_inventario").insert({
        producto_id: form.producto_id,
        tipo: form.tipo as "entrada" | "salida" | "ajuste",
        cantidad: form.cantidad,
        motivo: form.motivo,
        referencia: form.referencia,
        usuario_responsable: user?.id,
      });
      if (error) throw error;
      toast.success("Movimiento registrado");
      setOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <>
      <PageHeader
        title="Movimientos de inventario"
        description="Registra entradas, salidas y ajustes. El stock se actualiza automáticamente."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nuevo movimiento</Button>}
      />

      {/* Tabla desktop */}
      <div className="rounded-lg border border-border bg-card hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium text-right">Cantidad</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Referencia</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movs.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDateTime(m.fecha)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.tipo} /></td>
                <td className="px-4 py-3 font-medium">{m.productos?.nombre ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.productos?.sku}</td>
                <td className="px-4 py-3 text-right font-semibold">{m.cantidad} <span className="text-xs text-muted-foreground">{m.productos?.unidad_medida}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{m.motivo ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.referencia ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.profiles?.nombre ?? "—"}</td>
              </tr>
            ))}
            {movs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Sin movimientos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden rounded-lg border border-border bg-card divide-y divide-border">
        {movs.map((m) => (
          <div key={m.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{m.productos?.nombre ?? "—"}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{m.productos?.sku}</div>
              </div>
              <StatusBadge status={m.tipo} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Cantidad</div>
                <div className="font-semibold">{m.cantidad} {m.productos?.unidad_medida}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha</div>
                <div>{fmtDateTime(m.fecha)}</div>
              </div>
              {m.motivo && (
                <div className="col-span-2">
                  <div className="text-muted-foreground">Motivo</div>
                  <div>{m.motivo}</div>
                </div>
              )}
              {m.referencia && (
                <div>
                  <div className="text-muted-foreground">Referencia</div>
                  <div>{m.referencia}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Responsable</div>
                <div className="truncate">{m.profiles?.nombre ?? "—"}</div>
              </div>
            </div>
          </div>
        ))}
        {movs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Sin movimientos.</div>
        )}
      </div>

      <MovDialog open={open} onOpenChange={setOpen} productos={productos} onSave={onSave} />
    </>
  );
}

function MovDialog({
  open, onOpenChange, productos, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productos: { id: string; nombre: string; sku: string; stock_actual: number }[];
  onSave: (form: { producto_id: string; tipo: string; cantidad: number; motivo: string; referencia: string }) => void;
}) {
  const [form, setForm] = useState({ producto_id: "", tipo: "entrada", cantidad: 1, motivo: "", referencia: "" });
  useEffect(() => { if (open) setForm({ producto_id: "", tipo: "entrada", cantidad: 1, motivo: "", referencia: "" }); }, [open]);

  const prod = productos.find((p) => p.id === form.producto_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Producto</Label>
            <Select value={form.producto_id} onValueChange={(v) => setForm({ ...form, producto_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} <span className="text-muted-foreground">— {p.sku} (stock: {p.stock_actual})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (suma stock)</SelectItem>
                <SelectItem value="salida">Salida (resta stock)</SelectItem>
                <SelectItem value="ajuste">Ajuste manual (+/-)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad {form.tipo === "ajuste" && <span className="text-xs text-muted-foreground">(usa - para restar)</span>}</Label>
            <Input type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
            {prod && <p className="text-xs text-muted-foreground mt-1">Stock actual: {prod.stock_actual}</p>}
          </div>
          <div>
            <Label>Referencia</Label>
            <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Factura, orden..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Motivo</Label>
            <Textarea rows={2} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Compra, devolución, conteo físico..." />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.producto_id || (form.tipo !== "ajuste" && form.cantidad <= 0) || (form.tipo === "ajuste" && form.cantidad === 0)}
          >Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
