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

export const createUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verificar que quien llama es admin
    const { data: callerRole, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr) {
      return { ok: false as const, error: "No se pudo verificar permisos" };
    }
    if (!callerRole) {
      return { ok: false as const, error: "Solo administradores pueden crear usuarios" };
    }

    // Crear usuario en auth con email confirmado
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.correo,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, area: data.area ?? null },
    });

    if (createErr || !created.user) {
      return { ok: false as const, error: createErr?.message ?? "No se pudo crear el usuario" };
    }

    const newId = created.user.id;

    // El trigger handle_new_user crea el profile y asigna rol por defecto.
    // Aseguramos profile y forzamos el rol elegido.
    await supabaseAdmin.from("profiles").upsert({
      id: newId,
      nombre: data.nombre,
      correo: data.correo,
      area: data.area ?? null,
      activo: true,
    });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.rol });

    if (roleInsertErr) {
      return { ok: false as const, error: "Usuario creado pero falló el rol: " + roleInsertErr.message };
    }

    return { ok: true as const, userId: newId };
  });
