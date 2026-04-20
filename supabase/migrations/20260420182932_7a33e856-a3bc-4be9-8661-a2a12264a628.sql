-- Bloquear acceso a usuarios desactivados a nivel RLS
-- Función helper que comprueba si el usuario actual está activo
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT activo FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- Recrear políticas SELECT clave para exigir cuenta activa.
-- Mantenemos la lógica original pero añadimos el filtro is_active_user().

-- profiles: el usuario solo ve su perfil si está activo (admin/almacen mantienen visibilidad total)
DROP POLICY IF EXISTS "Usuario ve su perfil" ON public.profiles;
CREATE POLICY "Usuario ve su perfil" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND public.is_active_user());

DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON public.profiles;
CREATE POLICY "Usuario actualiza su perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.is_active_user());

-- productos: visibles solo si está activo
DROP POLICY IF EXISTS "Productos visibles" ON public.productos;
CREATE POLICY "Productos visibles" ON public.productos
  FOR SELECT TO authenticated
  USING (public.is_active_user());

-- categorias
DROP POLICY IF EXISTS "Categorias visibles" ON public.categorias;
CREATE POLICY "Categorias visibles" ON public.categorias
  FOR SELECT TO authenticated
  USING (public.is_active_user());

-- ubicaciones
DROP POLICY IF EXISTS "Ubicaciones visibles" ON public.ubicaciones;
CREATE POLICY "Ubicaciones visibles" ON public.ubicaciones
  FOR SELECT TO authenticated
  USING (public.is_active_user());

-- proyectos
DROP POLICY IF EXISTS "Proyectos visibles autenticados" ON public.proyectos;
CREATE POLICY "Proyectos visibles autenticados" ON public.proyectos
  FOR SELECT TO authenticated
  USING (public.is_active_user());

-- solicitudes (mantiene lógica de propietario/admin/almacen + activo)
DROP POLICY IF EXISTS "Mis solicitudes" ON public.solicitudes;
CREATE POLICY "Mis solicitudes" ON public.solicitudes
  FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND (
      usuario_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'almacen'::app_role)
    )
  );

DROP POLICY IF EXISTS "Crear mi solicitud" ON public.solicitudes;
CREATE POLICY "Crear mi solicitud" ON public.solicitudes
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND public.is_active_user());

-- detalle_solicitud insert: requiere usuario activo
DROP POLICY IF EXISTS "Crear detalle propio" ON public.detalle_solicitud;
CREATE POLICY "Crear detalle propio" ON public.detalle_solicitud
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.solicitudes s
      WHERE s.id = detalle_solicitud.solicitud_id
        AND s.usuario_id = auth.uid()
        AND s.estatus = 'pendiente'::solicitud_estatus
    )
  );

-- También endurecemos set_user_activo para evitar que un admin desactivado se reactive a sí mismo (defensa)
-- (se mantiene la lógica original).
