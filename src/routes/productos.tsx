import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, Search, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/productos")({
  component: ProductosPage,
});

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  ubicacion_id: string | null;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  proveedor: string | null;
  observaciones: string | null;
  activo: boolean;
  categorias?: { nombre: string } | null;
  ubicaciones?: { nombre: string } | null;
}

function ProductosPage() {
  return (
    <RequireAuth roles={["admin", "almacen"]}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user, empresaId } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [ubicaciones, setUbicaciones] = useState<{ id: string; nombre: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: c }, { data: u }] = await Promise.all([
      supabase.from("productos").select("*, categorias(nombre), ubicaciones(nombre)").order("nombre"),
      supabase.from("categorias").select("id, nombre").order("nombre"),
      supabase.from("ubicaciones").select("id, nombre").order("nombre"),
    ]);
    setProductos((p ?? []) as Producto[]);
    setCategorias(c ?? []);
    setUbicaciones(u ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = productos.filter(
    (p) => p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const onSave = async (form: Partial<Producto>) => {
    try {
      // strip joined relations before sending
      const { categorias: _c, ubicaciones: _u, id: _id, ...payload } = form as Producto;
      void _c; void _u; void _id;
      if (editing) {
        const { error } = await supabase.from("productos").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        if (!empresaId) return toast.error("Sin empresa asignada");
        const { error } = await supabase.from("productos").insert({ ...(payload as Omit<Producto, "id" | "categorias" | "ubicaciones">), creado_por: user?.id, empresa_id: empresaId });
        if (error) throw error;
        toast.success("Producto creado");
      }
      setOpen(false); setEditing(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <>
      <PageHeader
        title="Inventario de productos"
        description="Gestiona herramientas, materiales, refacciones y consumibles."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo producto
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground ml-auto">{filtered.length} productos</div>
        </div>

        {/* Tabla desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Mínimo</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const bajo = Number(p.stock_actual) <= Number(p.stock_minimo);
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categorias?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.ubicaciones?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.stock_actual}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.stock_minimo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unidad_medida}</td>
                    <td className="px-4 py-3">
                      {!p.activo ? (
                        <span className="text-xs text-muted-foreground">Inactivo</span>
                      ) : bajo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" /> Stock bajo
                        </span>
                      ) : (
                        <span className="text-xs text-success font-medium">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">No hay productos. Crea el primero.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards móvil */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((p) => {
            const bajo = Number(p.stock_actual) <= Number(p.stock_minimo);
            return (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.nombre}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p.sku}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="shrink-0 h-9 w-9 p-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Stock</div>
                    <div className="font-semibold">{p.stock_actual} {p.unidad_medida} <span className="text-muted-foreground font-normal">/ mín {p.stock_minimo}</span></div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Ubicación</div>
                    <div className="font-medium truncate">{p.ubicaciones?.nombre ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Categoría</div>
                    <div className="font-medium truncate">{p.categorias?.nombre ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estado</div>
                    <div>
                      {!p.activo ? (
                        <span className="text-xs text-muted-foreground">Inactivo</span>
                      ) : bajo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" /> Stock bajo
                        </span>
                      ) : (
                        <span className="text-xs text-success font-medium">OK</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay productos. Crea el primero.</div>
          )}
        </div>
      </div>

      <ProductoDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categorias={categorias}
        ubicaciones={ubicaciones}
        onSave={onSave}
      />
    </>
  );
}

function ProductoDialog({
  open, onOpenChange, editing, categorias, ubicaciones, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Producto | null;
  categorias: { id: string; nombre: string }[];
  ubicaciones: { id: string; nombre: string }[];
  onSave: (form: Partial<Producto>) => void;
}) {
  const [form, setForm] = useState<Partial<Producto>>({});
  useEffect(() => {
    setForm(editing ?? { unidad_medida: "pieza", stock_actual: 0, stock_minimo: 0, activo: true });
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>SKU / Código interno</Label>
            <Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={form.categoria_id ?? ""} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ubicación</Label>
            <Select value={form.ubicacion_id ?? ""} onValueChange={(v) => setForm({ ...form, ubicacion_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {ubicaciones.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidad de medida</Label>
            <Input value={form.unidad_medida ?? ""} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} placeholder="pieza, kg, litro..." />
          </div>
          <div>
            <Label>Proveedor</Label>
            <Input value={form.proveedor ?? ""} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
          </div>
          <div>
            <Label>Stock inicial</Label>
            <Input type="number" min={0} value={form.stock_actual ?? 0} onChange={(e) => setForm({ ...form, stock_actual: Number(e.target.value) })} disabled={!!editing} />
            {editing && <p className="text-xs text-muted-foreground mt-1">Usa Movimientos para cambiar stock.</p>}
          </div>
          <div>
            <Label>Stock mínimo</Label>
            <Input type="number" min={0} value={form.stock_minimo ?? 0} onChange={(e) => setForm({ ...form, stock_minimo: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observaciones</Label>
            <Textarea rows={2} value={form.observaciones ?? ""} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>{editing ? "Guardar cambios" : "Crear producto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
