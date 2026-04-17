import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Search, Plus, Trash2, ShoppingCart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo")({
  component: Page,
});

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  categorias: { nombre: string } | null;
  ubicaciones: { nombre: string } | null;
}

interface Linea { producto: Producto; cantidad: number }

function Page() {
  return <RequireAuth><Inner /></RequireAuth>;
}

function Inner() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [open, setOpen] = useState(false);
  const [comentario, setComentario] = useState("");
  const [fechaRequerida, setFechaRequerida] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("productos").select("id, sku, nombre, descripcion, unidad_medida, stock_actual, stock_minimo, categorias(nombre), ubicaciones(nombre), categoria_id").eq("activo", true).order("nombre"),
      supabase.from("categorias").select("id, nombre").order("nombre"),
    ]);
    setProductos((p ?? []) as unknown as Producto[]);
    setCategorias(c ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = productos.filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "all" || p.categorias?.nombre === categorias.find((x) => x.id === cat)?.nombre;
    return matchSearch && matchCat;
  });

  const addCarrito = (prod: Producto) => {
    if (Number(prod.stock_actual) <= 0) { toast.error("Sin stock disponible"); return; }
    const existing = carrito.find((l) => l.producto.id === prod.id);
    if (existing) {
      setCarrito(carrito.map((l) => l.producto.id === prod.id ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setCarrito([...carrito, { producto: prod, cantidad: 1 }]);
    }
    toast.success(`${prod.nombre} agregado`);
  };

  const enviar = async () => {
    if (!user || carrito.length === 0) return;
    try {
      const { data: sol, error: e1 } = await supabase
        .from("solicitudes")
        .insert({
          usuario_id: user.id,
          comentarios_usuario: comentario || null,
          fecha_requerida: fechaRequerida ? new Date(fechaRequerida).toISOString() : null,
        })
        .select().single();
      if (e1) throw e1;
      const detalles = carrito.map((l) => ({
        solicitud_id: sol.id,
        producto_id: l.producto.id,
        cantidad_solicitada: l.cantidad,
      }));
      const { error: e2 } = await supabase.from("detalle_solicitud").insert(detalles);
      if (e2) throw e2;
      toast.success(`Solicitud #${sol.folio} enviada`);
      setCarrito([]); setComentario(""); setFechaRequerida(""); setOpen(false);
      nav({ to: "/solicitudes" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <>
      <PageHeader
        title="Inventario disponible"
        description="Consulta los artículos en almacén y crea solicitudes internas."
        actions={
          carrito.length > 0 && (
            <Button onClick={() => setOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Revisar solicitud ({carrito.length})
            </Button>
          )
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar artículo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const sinStock = Number(p.stock_actual) <= 0;
          const bajo = !sinStock && Number(p.stock_actual) <= Number(p.stock_minimo);
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-mono text-[10px] text-muted-foreground">{p.sku}</div>
                {sinStock && <span className="text-xs text-destructive font-medium">Sin stock</span>}
                {bajo && <span className="inline-flex items-center gap-1 text-xs text-warning-foreground"><AlertTriangle className="h-3 w-3" />Bajo</span>}
              </div>
              <div className="font-semibold mb-1">{p.nombre}</div>
              <div className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{p.descripcion ?? "—"}</div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><div className="text-muted-foreground">Stock</div><div className="font-semibold text-foreground">{p.stock_actual} {p.unidad_medida}</div></div>
                <div><div className="text-muted-foreground">Ubicación</div><div className="font-medium">{p.ubicaciones?.nombre ?? "—"}</div></div>
              </div>
              <Button size="sm" disabled={sinStock} onClick={() => addCarrito(p)}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-border bg-card p-10 text-center text-muted-foreground text-sm">
            No hay artículos que coincidan.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Confirmar solicitud</DialogTitle></DialogHeader>
          <div className="rounded-md border border-border overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right w-32">Cantidad</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {carrito.map((l, i) => (
                  <tr key={l.producto.id}>
                    <td className="px-3 py-2"><div className="font-medium">{l.producto.nombre}</div><div className="text-xs text-muted-foreground">{l.producto.sku}</div></td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{l.producto.stock_actual}</td>
                    <td className="px-3 py-2 text-right">
                      <Input type="number" className="h-8 text-right" min={1} max={l.producto.stock_actual}
                        value={l.cantidad}
                        onChange={(e) => {
                          const n = [...carrito]; n[i] = { ...l, cantidad: Number(e.target.value) }; setCarrito(n);
                        }} />
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="sm" onClick={() => setCarrito(carrito.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Fecha requerida</Label>
              <Input
                type="date"
                value={fechaRequerida}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setFechaRequerida(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">¿Para cuándo la necesitas?</p>
            </div>
            <div>
              <Label>Motivo o comentario</Label>
              <Textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Para qué se usará, urgencia, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Seguir agregando</Button>
            <Button onClick={enviar} disabled={carrito.some((l) => l.cantidad <= 0 || l.cantidad > l.producto.stock_actual)}>
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
