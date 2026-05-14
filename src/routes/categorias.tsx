import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/categorias")({
  component: CategoriasPage,
});

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  productos?: { count: number }[];
}

function CategoriasPage() {
  return (
    <RequireAuth roles={["admin", "almacen"]}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<Categoria[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [confirmDel, setConfirmDel] = useState<Categoria | null>(null);
  const [form, setForm] = useState<{ nombre: string; descripcion: string }>({ nombre: "", descripcion: "" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre, descripcion, productos(count)")
      .order("nombre");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Categoria[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm({ nombre: "", descripcion: "" });
    setOpen(true);
  };
  const startEdit = (c: Categoria) => {
    setEditing(c);
    setForm({ nombre: c.nombre, descripcion: c.descripcion ?? "" });
    setOpen(true);
  };

  const save = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) return toast.error("El nombre es obligatorio");
    if (nombre.length > 80) return toast.error("Máximo 80 caracteres");
    const payload = { nombre, descripcion: form.descripcion.trim() || null };
    try {
      if (editing) {
        const { error } = await supabase.from("categorias").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Categoría actualizada");
      } else {
        if (!empresaId) return toast.error("Sin empresa asignada");
        const { error } = await supabase.from("categorias").insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
        toast.success("Categoría creada");
      }
      setOpen(false); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("categorias").delete().eq("id", confirmDel.id);
    if (error) {
      toast.error("No se puede eliminar: " + error.message);
    } else {
      toast.success("Categoría eliminada");
      load();
    }
    setConfirmDel(null);
  };

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Clasifica tus productos por tipo (herramientas, consumibles, refacciones, etc.)."
        actions={<Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> Nueva categoría</Button>}
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Tags className="h-4 w-4" /> {items.length} categorías registradas
        </div>
        {/* Tabla desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium text-right">Productos</th>
                <th className="px-4 py-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => {
                const count = c.productos?.[0]?.count ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.descripcion ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDel(c)}
                          disabled={count > 0}
                          title={count > 0 ? "No se puede eliminar: tiene productos asociados" : "Eliminar"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No hay categorías. Crea la primera.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards móvil */}
        <div className="md:hidden divide-y divide-border">
          {items.map((c) => {
            const count = c.productos?.[0]?.count ?? 0;
            return (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.nombre}</div>
                    {c.descripcion && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.descripcion}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{count} producto{count === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(c)} className="h-9 w-9 p-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="text-destructive hover:text-destructive h-9 w-9 p-0"
                      onClick={() => setConfirmDel(c)}
                      disabled={count > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No hay categorías. Crea la primera.</div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>Define un nombre claro y opcionalmente una descripción.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} maxLength={80} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{confirmDel?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
