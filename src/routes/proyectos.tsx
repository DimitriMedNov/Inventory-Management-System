import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Briefcase, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/proyectos")({
  component: Page,
});

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  solicitudes?: { count: number }[];
}

function Page() {
  return (
    <RequireAuth roles={["admin"]}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [items, setItems] = useState<Proyecto[]>([]);
  const [filter, setFilter] = useState<"activos" | "terminados" | "todos">("activos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const [confirmDel, setConfirmDel] = useState<Proyecto | null>(null);
  const [form, setForm] = useState<{ codigo: string; nombre: string; descripcion: string; activo: boolean }>({
    codigo: "", nombre: "", descripcion: "", activo: true,
  });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("proyectos")
      .select("id, codigo, nombre, descripcion, activo, solicitudes(count)")
      .order("activo", { ascending: false })
      .order("codigo");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Proyecto[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm({ codigo: "", nombre: "", descripcion: "", activo: true });
    setOpen(true);
  };
  const startEdit = (p: Proyecto) => {
    setEditing(p);
    setForm({ codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion ?? "", activo: p.activo });
    setOpen(true);
  };

  const save = async () => {
    const codigo = form.codigo.trim();
    const nombre = form.nombre.trim();
    if (!codigo) return toast.error("El código es obligatorio");
    if (!nombre) return toast.error("El nombre es obligatorio");
    if (codigo.length > 40) return toast.error("Código máx. 40 caracteres");
    if (nombre.length > 120) return toast.error("Nombre máx. 120 caracteres");
    const payload = {
      codigo,
      nombre,
      descripcion: form.descripcion.trim() || null,
      activo: form.activo,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("proyectos").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Proyecto actualizado");
      } else {
        const { error } = await supabase.from("proyectos").insert(payload);
        if (error) throw error;
        toast.success("Proyecto creado");
      }
      setOpen(false); load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(msg.includes("duplicate") ? "Ya existe un proyecto con ese código" : msg);
    }
  };

  const toggleActivo = async (p: Proyecto) => {
    const { error } = await supabase.from("proyectos").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.activo ? "Proyecto marcado como terminado" : "Proyecto reactivado");
    load();
  };

  const remove = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("proyectos").delete().eq("id", confirmDel.id);
    if (error) {
      toast.error("No se puede eliminar: " + error.message);
    } else {
      toast.success("Proyecto eliminado");
      load();
    }
    setConfirmDel(null);
  };

  const filtered = items.filter((p) => {
    if (filter === "activos") return p.activo;
    if (filter === "terminados") return !p.activo;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Centros de costo a los que se asignan las solicitudes de inventario."
        actions={<Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> Nuevo proyecto</Button>}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="terminados">Terminados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="h-4 w-4" /> {filtered.length} proyecto{filtered.length === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Solicitudes</th>
                <th className="px-4 py-3 font-medium w-44"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const count = p.solicitudes?.[0]?.count ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono">{p.codigo}</td>
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.descripcion ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.activo
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> Activo</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" /> Terminado</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleActivo(p)}
                          title={p.activo ? "Marcar como terminado" : "Reactivar"}>
                          {p.activo ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDel(p)}
                          disabled={count > 0}
                          title={count > 0 ? "No se puede eliminar: tiene solicitudes asociadas" : "Eliminar"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  Sin proyectos en este filtro.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
            <DialogDescription>El código identifica al proyecto (ej. 19530).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>Código *</Label>
                <Input value={form.codigo} maxLength={40} placeholder="19530"
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} maxLength={120} placeholder="Ventury Nrt"
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={3} value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Proyecto activo</div>
                <div className="text-xs text-muted-foreground">Solo los activos aparecen al crear nuevas solicitudes.</div>
              </div>
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
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
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{confirmDel?.codigo} - {confirmDel?.nombre}". Esta acción no se puede deshacer.
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
