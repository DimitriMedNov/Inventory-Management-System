
-- 1) Empresas table
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  color_primario TEXT NOT NULL DEFAULT '#2563eb',
  color_sidebar TEXT NOT NULL DEFAULT '#1e293b',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2) Backfill empresa
INSERT INTO public.empresas (id, nombre, slug, color_primario, color_sidebar)
VALUES ('00000000-0000-0000-0000-000000000001', 'Diprolam Bjx', 'diprolam', '#58595B', '#58595B');

-- 3) Add empresa_id columns
ALTER TABLE public.profiles               ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles             ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.productos              ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.categorias             ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ubicaciones            ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.proyectos              ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes            ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.movimientos_inventario ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

UPDATE public.profiles               SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.user_roles             SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.productos              SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.categorias             SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.ubicaciones            SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.proyectos              SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.solicitudes            SET empresa_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.movimientos_inventario SET empresa_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.productos              ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.categorias             ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ubicaciones            ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.proyectos              ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.solicitudes            ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.movimientos_inventario ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX idx_productos_empresa            ON public.productos(empresa_id);
CREATE INDEX idx_categorias_empresa           ON public.categorias(empresa_id);
CREATE INDEX idx_ubicaciones_empresa          ON public.ubicaciones(empresa_id);
CREATE INDEX idx_proyectos_empresa            ON public.proyectos(empresa_id);
CREATE INDEX idx_solicitudes_empresa          ON public.solicitudes(empresa_id);
CREATE INDEX idx_movimientos_empresa          ON public.movimientos_inventario(empresa_id);
CREATE INDEX idx_profiles_empresa             ON public.profiles(empresa_id);
CREATE INDEX idx_user_roles_empresa           ON public.user_roles(empresa_id);

-- 4) Helpers
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
$$;

-- 5) Auto-fill triggers
CREATE OR REPLACE FUNCTION public.set_empresa_from_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.current_empresa_id();
  END IF;
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_solicitudes_set_empresa BEFORE INSERT ON public.solicitudes
FOR EACH ROW EXECUTE FUNCTION public.set_empresa_from_user();

CREATE OR REPLACE FUNCTION public.set_movimiento_empresa()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT empresa_id INTO NEW.empresa_id FROM public.productos WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_movimientos_set_empresa BEFORE INSERT ON public.movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION public.set_movimiento_empresa();

-- 6) Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_first BOOLEAN;
  _empresa_id UUID;
BEGIN
  _empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id', '')::uuid;

  INSERT INTO public.profiles (id, nombre, correo, area, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'area',
    _empresa_id
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role, empresa_id) VALUES (NEW.id, 'super_admin', NULL);
  ELSE
    INSERT INTO public.user_roles (user_id, role, empresa_id) VALUES (NEW.id, 'solicitante', _empresa_id);
  END IF;
  RETURN NEW;
END $$;

-- 7) crear_empresa_con_admin function
CREATE OR REPLACE FUNCTION public.crear_empresa(
  _nombre TEXT,
  _slug TEXT,
  _color_primario TEXT DEFAULT '#2563eb',
  _color_sidebar TEXT DEFAULT '#1e293b',
  _logo_url TEXT DEFAULT NULL
)
RETURNS public.empresas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _emp public.empresas;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo el super administrador puede crear empresas';
  END IF;
  INSERT INTO public.empresas (nombre, slug, color_primario, color_sidebar, logo_url)
  VALUES (_nombre, _slug, _color_primario, _color_sidebar, _logo_url)
  RETURNING * INTO _emp;
  RETURN _emp;
END $$;

-- 8) RLS policies

-- empresas
CREATE POLICY "Super admin gestiona empresas" ON public.empresas FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Usuario ve su empresa" ON public.empresas FOR SELECT TO authenticated
USING (id = public.current_empresa_id());

-- profiles
DROP POLICY IF EXISTS "Admin/almacen ven todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin actualiza cualquier perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuario ve su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON public.profiles;

CREATE POLICY "Super admin ve todo perfil" ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin());
CREATE POLICY "Staff ve perfiles empresa" ON public.profiles FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen'))
       AND empresa_id = public.current_empresa_id());
CREATE POLICY "Usuario ve su perfil" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());
CREATE POLICY "Super admin actualiza perfiles" ON public.profiles FOR UPDATE TO authenticated
USING (public.is_super_admin());
CREATE POLICY "Admin actualiza perfiles empresa" ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());
CREATE POLICY "Usuario actualiza su perfil" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Ver mi rol" ON public.user_roles;
DROP POLICY IF EXISTS "Admin ve todos los roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin gestiona roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin borra roles" ON public.user_roles;

CREATE POLICY "Ver mi rol" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Super admin ve roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin());
CREATE POLICY "Admin ve roles empresa" ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());
CREATE POLICY "Super admin gestiona roles" ON public.user_roles FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Admin gestiona roles empresa" ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id() AND role <> 'super_admin')
WITH CHECK (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id() AND role <> 'super_admin');

-- productos
DROP POLICY IF EXISTS "Productos gestion" ON public.productos;
DROP POLICY IF EXISTS "Admin borra productos" ON public.productos;
DROP POLICY IF EXISTS "Productos visibles" ON public.productos;

CREATE POLICY "Super admin productos" ON public.productos FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Productos visibles empresa" ON public.productos FOR SELECT TO authenticated
USING (is_active_user() AND empresa_id = public.current_empresa_id());
CREATE POLICY "Productos gestion empresa" ON public.productos FOR ALL TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id());

-- categorias
DROP POLICY IF EXISTS "Categorias gestion" ON public.categorias;
DROP POLICY IF EXISTS "Admin borra categorias" ON public.categorias;
DROP POLICY IF EXISTS "Categorias visibles" ON public.categorias;

CREATE POLICY "Super admin categorias" ON public.categorias FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Categorias visibles empresa" ON public.categorias FOR SELECT TO authenticated
USING (is_active_user() AND empresa_id = public.current_empresa_id());
CREATE POLICY "Categorias gestion empresa" ON public.categorias FOR ALL TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id());

-- ubicaciones
DROP POLICY IF EXISTS "Ubicaciones gestion" ON public.ubicaciones;
DROP POLICY IF EXISTS "Admin borra ubicaciones" ON public.ubicaciones;
DROP POLICY IF EXISTS "Ubicaciones visibles" ON public.ubicaciones;

CREATE POLICY "Super admin ubicaciones" ON public.ubicaciones FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Ubicaciones visibles empresa" ON public.ubicaciones FOR SELECT TO authenticated
USING (is_active_user() AND empresa_id = public.current_empresa_id());
CREATE POLICY "Ubicaciones gestion empresa" ON public.ubicaciones FOR ALL TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')) AND empresa_id = public.current_empresa_id());

-- proyectos
DROP POLICY IF EXISTS "Admin gestiona proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Admin borra proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Proyectos visibles autenticados" ON public.proyectos;

CREATE POLICY "Super admin proyectos" ON public.proyectos FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Proyectos visibles empresa" ON public.proyectos FOR SELECT TO authenticated
USING (is_active_user() AND empresa_id = public.current_empresa_id());
CREATE POLICY "Admin gestiona proyectos empresa" ON public.proyectos FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id())
WITH CHECK (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());

-- solicitudes
DROP POLICY IF EXISTS "Almacen actualiza solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Cancelar mi solicitud" ON public.solicitudes;
DROP POLICY IF EXISTS "Admin gestiona solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Solicitante confirma recepcion" ON public.solicitudes;
DROP POLICY IF EXISTS "Admin borra solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Mis solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Crear mi solicitud" ON public.solicitudes;

CREATE POLICY "Super admin solicitudes" ON public.solicitudes FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Mis solicitudes empresa" ON public.solicitudes FOR SELECT TO authenticated
USING (is_active_user() AND empresa_id = public.current_empresa_id()
       AND (usuario_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')));
CREATE POLICY "Crear mi solicitud" ON public.solicitudes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND is_active_user());
CREATE POLICY "Almacen actualiza solicitudes empresa" ON public.solicitudes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'almacen') AND empresa_id = public.current_empresa_id());
CREATE POLICY "Admin gestiona solicitudes empresa" ON public.solicitudes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());
CREATE POLICY "Cancelar mi solicitud" ON public.solicitudes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid() AND estatus = 'pendiente' AND empresa_id = public.current_empresa_id());
CREATE POLICY "Solicitante confirma recepcion" ON public.solicitudes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid() AND estatus = 'lista' AND empresa_id = public.current_empresa_id());
CREATE POLICY "Admin borra solicitudes empresa" ON public.solicitudes FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());

-- movimientos_inventario
DROP POLICY IF EXISTS "Movimientos visibles staff" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Crear movimientos staff" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Admin borra movimientos" ON public.movimientos_inventario;

CREATE POLICY "Super admin movimientos" ON public.movimientos_inventario FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Movimientos visibles staff empresa" ON public.movimientos_inventario FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen'))
       AND empresa_id = public.current_empresa_id());
CREATE POLICY "Crear movimientos staff empresa" ON public.movimientos_inventario FOR INSERT TO authenticated
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen'))
            AND empresa_id = public.current_empresa_id());
CREATE POLICY "Admin borra movimientos empresa" ON public.movimientos_inventario FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND empresa_id = public.current_empresa_id());

-- 9) Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding publicly readable" ON storage.objects FOR SELECT
USING (bucket_id = 'branding');
CREATE POLICY "Super admin uploads branding" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.is_super_admin());
CREATE POLICY "Super admin updates branding" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND public.is_super_admin());
CREATE POLICY "Super admin deletes branding" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND public.is_super_admin());
CREATE POLICY "Admin uploads branding" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates branding" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'));
