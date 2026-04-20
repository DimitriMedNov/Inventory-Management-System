import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Search, ShieldCheck, Boxes, Wrench, UserCheck, UserX, Plus } from "lucide-react";
import { toast } from "sonner";
import { createUserAdmin, setUserActivoAdmin } from "@/utils/users.functions";

export const Route = createFileRoute("/usuarios")({
  component: UsuariosPage,
});

interface ProfileRow {
  id: string;
  nombre: string;
  correo: string;
  area: string | null;
  activo: boolean;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: AppRole;
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  almacen: "Encargado de almacén",
  solicitante: "Solicitante",
};
const ROLE_ICON: Record<AppRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  almacen: Boxes,
  solicitante: Wrench,
};

function UsuariosPage() {
  return (
    <RequireAuth roles={["admin"]}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Map<string, AppRole>>(new Map());
  const [search, setSearch] = useState("");
  const [pendingActivo, setPendingActivo] = useState<{ user: ProfileRow; nuevo: boolean } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const createUserFn = useServerFn(createUserAdmin);
  const setActivoFn = useServerFn(setUserActivoAdmin);

  const load = useCallback(async () => {
    const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
      supabase.from("profiles").select("*").order("nombre"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pe) toast.error(pe.message);
    if (re) toast.error(re.message);
    setProfiles((p ?? []) as ProfileRow[]);
    const m = new Map<string, AppRole>();
    (r as RoleRow[] | null)?.forEach((row) => m.set(row.user_id, row.role));
    setRoles(m);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.correo.toLowerCase().includes(q) ||
        (p.area ?? "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const changeRole = async (u: ProfileRow, newRole: AppRole) => {
    if (roles.get(u.id) === newRole) return;
    const { error } = await supabase.rpc("set_user_role", { _user_id: u.id, _new_role: newRole });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Rol actualizado a ${ROLE_LABEL[newRole]}`);
      setRoles((prev) => new Map(prev).set(u.id, newRole));
    }
  };

  const toggleActivo = async () => {
    if (!pendingActivo) return;
    const { user: u, nuevo } = pendingActivo;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sesión expirada. Inicia sesión de nuevo.");
        setPendingActivo(null);
        return;
      }
      const res = await setActivoFn({
        data: { user_id: u.id, activo: nuevo },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar el estado");
      } else {
        toast.success(nuevo ? "Cuenta activada" : "Cuenta desactivada y bloqueada");
        setProfiles((prev) => prev.map((p) => (p.id === u.id ? { ...p, activo: nuevo } : p)));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al actualizar estado";
      toast.error(msg);
    }
    setPendingActivo(null);
  };

  return (
    <>
      <PageHeader
        title="Gestión de usuarios"
        description="Administra los miembros del sistema, sus roles y el estado de sus cuentas."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, correo o área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground ml-auto">{filtered.length} usuarios</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium w-40 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => {
                const role = roles.get(u.id) ?? "solicitante";
                const RoleIcon = ROLE_ICON[role];
                const isMe = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {u.nombre}
                      {isMe && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.correo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.area ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RoleIcon className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={role}
                          onValueChange={(v) => changeRole(u, v as AppRole)}
                          disabled={isMe}
                        >
                          <SelectTrigger className="h-8 w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="almacen">Encargado de almacén</SelectItem>
                            <SelectItem value="solicitante">Solicitante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isMe}
                        onClick={() => setPendingActivo({ user: u, nuevo: !u.activo })}
                        className={u.activo ? "text-destructive hover:text-destructive" : "text-success hover:text-success"}
                      >
                        {u.activo ? (
                          <><UserX className="h-3.5 w-3.5 mr-1" /> Desactivar</>
                        ) : (
                          <><UserCheck className="h-3.5 w-3.5 mr-1" /> Activar</>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No hay usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Nota: no puedes cambiar tu propio rol ni desactivar tu propia cuenta.
      </p>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (form) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              toast.error("Sesión expirada. Inicia sesión de nuevo.");
              return false;
            }
            const res = await createUserFn({
              data: form,
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
              toast.error(res.error || "No se pudo crear el usuario");
              return false;
            }
            toast.success("Usuario creado");
            setCreateOpen(false);
            await load();
            return true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error al crear usuario";
            toast.error(msg);
            console.error("createUser error:", e);
            return false;
          }
        }}
      />

      <AlertDialog open={!!pendingActivo} onOpenChange={(o) => !o && setPendingActivo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingActivo?.nuevo ? "Activar cuenta" : "Desactivar cuenta"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingActivo?.nuevo
                ? `La cuenta de "${pendingActivo?.user.nombre}" volverá a poder usarse.`
                : `La cuenta de "${pendingActivo?.user.nombre}" se marcará como inactiva.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggleActivo}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CreateUserForm {
  nombre: string;
  correo: string;
  password: string;
  area: string;
  rol: AppRole;
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (form: { nombre: string; correo: string; password: string; area: string | null; rol: AppRole }) => Promise<boolean>;
}) {
  const [form, setForm] = useState<CreateUserForm>({
    nombre: "",
    correo: "",
    password: "",
    area: "",
    rol: "solicitante",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ nombre: "", correo: "", password: "", area: "", rol: "solicitante" });
    }
  }, [open]);

  const submit = async () => {
    if (form.nombre.trim().length < 2) return toast.error("Nombre demasiado corto");
    if (!form.correo.trim()) return toast.error("Correo obligatorio");
    if (form.password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    setBusy(true);
    await onCreate({
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      password: form.password,
      area: form.area.trim() || null,
      rol: form.rol,
    });
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
          <DialogDescription>
            La cuenta quedará activa y con email confirmado. Podrá iniciar sesión inmediatamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nombre completo *</Label>
            <Input
              value={form.nombre}
              maxLength={100}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label>Correo *</Label>
            <Input
              type="email"
              value={form.correo}
              maxLength={255}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
          </div>
          <div>
            <Label>Área / Departamento</Label>
            <Input
              value={form.area}
              maxLength={100}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="Ej. Producción"
            />
          </div>
          <div>
            <Label>Contraseña temporal *</Label>
            <Input
              type="text"
              value={form.password}
              maxLength={72}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <Label>Rol *</Label>
            <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v as AppRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="almacen">Encargado de almacén</SelectItem>
                <SelectItem value="solicitante">Solicitante</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creando..." : "Crear usuario"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

