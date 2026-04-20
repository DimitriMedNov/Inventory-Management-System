import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateUserSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  correo: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  area: z.string().trim().max(100).optional().nullable(),
  rol: z.enum(["admin", "almacen", "solicitante"]),
});

async function assertCallerIsAdmin(
  supabase: Parameters<typeof createServerFn>[0] extends never ? never : any,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: callerRole, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) return { ok: false, error: "No se pudo verificar permisos: " + roleErr.message };
  if (!callerRole) return { ok: false, error: "Solo administradores pueden realizar esta acción" };
  return { ok: true };
}

export const createUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;

      const adminCheck = await assertCallerIsAdmin(supabase, userId);
      if (!adminCheck.ok) return { ok: false as const, error: adminCheck.error };

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.correo,
        password: data.password,
        email_confirm: true,
        user_metadata: { nombre: data.nombre, area: data.area ?? null },
      });

      if (createErr || !created.user) {
        console.error("[createUserAdmin] createUser error:", createErr);
        return { ok: false as const, error: createErr?.message ?? "No se pudo crear el usuario" };
      }

      const newId = created.user.id;

      const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
        id: newId,
        nombre: data.nombre,
        correo: data.correo,
        area: data.area ?? null,
        activo: true,
      });
      if (profErr) {
        console.error("[createUserAdmin] profile upsert error:", profErr);
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
      const { error: roleInsertErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: data.rol });

      if (roleInsertErr) {
        console.error("[createUserAdmin] role insert error:", roleInsertErr);
        return { ok: false as const, error: "Usuario creado pero falló el rol: " + roleInsertErr.message };
      }

      return { ok: true as const, userId: newId };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[createUserAdmin] unexpected error:", e);
      return { ok: false as const, error: "Error inesperado: " + msg };
    }
  });

const SetActivoSchema = z.object({
  user_id: z.string().uuid(),
  activo: z.boolean(),
});

// Activa o desactiva una cuenta. Cuando se desactiva:
//   - Marca profiles.activo = false (vía RPC set_user_activo)
//   - Banea la cuenta en Supabase Auth (invalida sesiones y bloquea futuros logins)
// Cuando se activa: revierte el ban y vuelve a marcar activo = true.
export const setUserActivoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetActivoSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;

      const adminCheck = await assertCallerIsAdmin(supabase, userId);
      if (!adminCheck.ok) return { ok: false as const, error: adminCheck.error };

      if (data.user_id === userId && !data.activo) {
        return { ok: false as const, error: "No puedes desactivar tu propia cuenta" };
      }

      // 1. Actualiza profiles.activo
      const { error: rpcErr } = await supabaseAdmin.rpc("set_user_activo", {
        _user_id: data.user_id,
        _activo: data.activo,
      });
      if (rpcErr) {
        // El RPC requiere auth.uid(); como llamamos con service role, hacemos update directo
        const { error: updErr } = await supabaseAdmin
          .from("profiles")
          .update({ activo: data.activo })
          .eq("id", data.user_id);
        if (updErr) {
          console.error("[setUserActivoAdmin] profile update error:", updErr);
          return { ok: false as const, error: "No se pudo actualizar el perfil: " + updErr.message };
        }
      }

      // 2. Ban / unban en Auth
      const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: data.activo ? "none" : "876000h", // ~100 años
      });
      if (banErr) {
        console.error("[setUserActivoAdmin] ban error:", banErr);
        return { ok: false as const, error: "Estado actualizado pero no se pudo aplicar bloqueo: " + banErr.message };
      }

      return { ok: true as const };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[setUserActivoAdmin] unexpected error:", e);
      return { ok: false as const, error: "Error inesperado: " + msg };
    }
  });

const ResetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
});

// Permite a un admin restablecer la contraseña de cualquier cuenta.
// Útil para rotar credenciales que pudieran haber quedado expuestas.
export const resetUserPasswordAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;

      const adminCheck = await assertCallerIsAdmin(supabase, userId);
      if (!adminCheck.ok) return { ok: false as const, error: adminCheck.error };

      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.password,
      });
      if (error) {
        console.error("[resetUserPasswordAdmin] error:", error);
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[resetUserPasswordAdmin] unexpected error:", e);
      return { ok: false as const, error: "Error inesperado: " + msg };
    }
  });
