-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'almacen', 'solicitante');
CREATE TYPE public.solicitud_estatus AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'entregada');
CREATE TYPE public.movimiento_tipo AS ENUM ('entrada', 'salida', 'ajuste');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  area TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ has_role (security definer) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'almacen' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- ============ CATALOGOS ============
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCTOS ============
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ubicacion_id UUID REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  unidad_medida TEXT NOT NULL DEFAULT 'pieza',
  stock_actual NUMERIC NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo NUMERIC NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  proveedor TEXT,
  observaciones TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX idx_productos_activo ON public.productos(activo);

-- ============ SOLICITUDES ============
CREATE TABLE public.solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio SERIAL UNIQUE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estatus public.solicitud_estatus NOT NULL DEFAULT 'pendiente',
  comentarios_usuario TEXT,
  comentarios_admin TEXT,
  comentarios_almacen TEXT,
  autorizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entregado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_autorizacion TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_solicitudes_usuario ON public.solicitudes(usuario_id);
CREATE INDEX idx_solicitudes_estatus ON public.solicitudes(estatus);

CREATE TABLE public.detalle_solicitud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad_solicitada NUMERIC NOT NULL CHECK (cantidad_solicitada > 0),
  cantidad_entregada NUMERIC NOT NULL DEFAULT 0 CHECK (cantidad_entregada >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.detalle_solicitud ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_detalle_solicitud ON public.detalle_solicitud(solicitud_id);

-- ============ MOVIMIENTOS ============
CREATE TABLE public.movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  tipo public.movimiento_tipo NOT NULL,
  cantidad NUMERIC NOT NULL CHECK (cantidad <> 0),
  motivo TEXT,
  referencia TEXT,
  solicitud_id UUID REFERENCES public.solicitudes(id) ON DELETE SET NULL,
  usuario_responsable UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_movimientos_producto ON public.movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON public.movimientos_inventario(fecha DESC);

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_productos_updated BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_solicitudes_updated BEFORE UPDATE ON public.solicitudes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STOCK AUTO-UPDATE ============
CREATE OR REPLACE FUNCTION public.aplicar_movimiento_stock()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE delta NUMERIC;
BEGIN
  IF NEW.tipo = 'entrada' THEN delta := ABS(NEW.cantidad);
  ELSIF NEW.tipo = 'salida' THEN delta := -ABS(NEW.cantidad);
  ELSE delta := NEW.cantidad; -- ajuste puede ser positivo o negativo
  END IF;
  UPDATE public.productos
  SET stock_actual = stock_actual + delta
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movimiento_stock AFTER INSERT ON public.movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimiento_stock();

-- ============ AUTO PROFILE + PRIMER ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, nombre, correo, area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'area'
  );
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_first THEN 'admin'::app_role ELSE 'solicitante'::app_role END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FUNCION ENTREGAR SOLICITUD ============
CREATE OR REPLACE FUNCTION public.entregar_solicitud(
  _solicitud_id UUID,
  _entregas JSONB, -- [{detalle_id, cantidad_entregada}, ...]
  _comentarios TEXT DEFAULT NULL
)
RETURNS public.solicitudes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user UUID := auth.uid();
  _sol public.solicitudes;
  _entrega JSONB;
  _det public.detalle_solicitud;
  _prod public.productos;
  _cant NUMERIC;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT (public.has_role(_user, 'almacen') OR public.has_role(_user, 'admin')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO _sol FROM public.solicitudes WHERE id = _solicitud_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no existe'; END IF;
  IF _sol.estatus <> 'aprobada' THEN
    RAISE EXCEPTION 'La solicitud debe estar aprobada (estatus actual: %)', _sol.estatus;
  END IF;

  FOR _entrega IN SELECT * FROM jsonb_array_elements(_entregas) LOOP
    SELECT * INTO _det FROM public.detalle_solicitud
    WHERE id = (_entrega->>'detalle_id')::uuid AND solicitud_id = _solicitud_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Detalle no encontrado'; END IF;
    _cant := (_entrega->>'cantidad_entregada')::numeric;
    IF _cant <= 0 THEN CONTINUE; END IF;

    SELECT * INTO _prod FROM public.productos WHERE id = _det.producto_id FOR UPDATE;
    IF _prod.stock_actual < _cant THEN
      RAISE EXCEPTION 'Stock insuficiente para %: disponible % requerido %', _prod.nombre, _prod.stock_actual, _cant;
    END IF;

    UPDATE public.detalle_solicitud SET cantidad_entregada = _cant WHERE id = _det.id;

    INSERT INTO public.movimientos_inventario
      (producto_id, tipo, cantidad, motivo, referencia, solicitud_id, usuario_responsable)
    VALUES
      (_prod.id, 'salida', _cant, 'Entrega de solicitud',
       'SOL-' || _sol.folio::text, _sol.id, _user);
  END LOOP;

  UPDATE public.solicitudes SET
    estatus = 'entregada',
    entregado_por = _user,
    fecha_entrega = now(),
    comentarios_almacen = COALESCE(_comentarios, comentarios_almacen)
  WHERE id = _solicitud_id
  RETURNING * INTO _sol;
  RETURN _sol;
END;
$$;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "Usuario ve su perfil" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin/almacen ven todos los perfiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));
CREATE POLICY "Usuario actualiza su perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin actualiza cualquier perfil" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Ver mi rol" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin ve todos los roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gestiona roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categorias / ubicaciones (lectura para todos auth, escritura admin/almacen)
CREATE POLICY "Categorias visibles" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Categorias gestion" ON public.categorias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));

CREATE POLICY "Ubicaciones visibles" ON public.ubicaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ubicaciones gestion" ON public.ubicaciones FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));

-- productos
CREATE POLICY "Productos visibles" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Productos gestion" ON public.productos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));

-- solicitudes
CREATE POLICY "Mis solicitudes" ON public.solicitudes FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));
CREATE POLICY "Crear mi solicitud" ON public.solicitudes FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Cancelar mi solicitud" ON public.solicitudes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid() AND estatus = 'pendiente');
CREATE POLICY "Admin gestiona solicitudes" ON public.solicitudes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Almacen actualiza solicitudes" ON public.solicitudes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'almacen'));

-- detalle_solicitud
CREATE POLICY "Ver detalle solicitud" ON public.detalle_solicitud FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.solicitudes s WHERE s.id = solicitud_id
  AND (s.usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'))));
CREATE POLICY "Crear detalle propio" ON public.detalle_solicitud FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.solicitudes s WHERE s.id = solicitud_id AND s.usuario_id = auth.uid() AND s.estatus = 'pendiente'));
CREATE POLICY "Almacen/admin actualizan detalle" ON public.detalle_solicitud FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));

-- movimientos
CREATE POLICY "Movimientos visibles staff" ON public.movimientos_inventario FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));
CREATE POLICY "Crear movimientos staff" ON public.movimientos_inventario FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almacen'));

-- ============ SEED DATA ============
INSERT INTO public.categorias (nombre, descripcion) VALUES
  ('Herramientas', 'Herramientas manuales y eléctricas'),
  ('Consumibles', 'Material de uso recurrente'),
  ('Refacciones', 'Piezas de repuesto'),
  ('EPP', 'Equipo de protección personal');

INSERT INTO public.ubicaciones (nombre, descripcion) VALUES
  ('Estante A', 'Pasillo principal - lado izquierdo'),
  ('Estante B', 'Pasillo principal - lado derecho'),
  ('Bodega', 'Almacén general'),
  ('Taller', 'Área de trabajo');