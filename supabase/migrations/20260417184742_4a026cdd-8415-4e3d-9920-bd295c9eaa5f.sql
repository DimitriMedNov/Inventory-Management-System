-- Política para que el solicitante pueda confirmar recepción
DROP POLICY IF EXISTS "Solicitante confirma recepcion" ON public.solicitudes;
CREATE POLICY "Solicitante confirma recepcion"
ON public.solicitudes FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid() AND estatus = 'lista'::solicitud_estatus);

-- Función: marcar como lista (almacén/admin, sin descontar stock)
CREATE OR REPLACE FUNCTION public.marcar_lista_solicitud(
  _solicitud_id uuid,
  _entregas jsonb,
  _comentarios text DEFAULT NULL
)
RETURNS public.solicitudes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF _sol.estatus <> 'aprobada'::solicitud_estatus THEN
    RAISE EXCEPTION 'La solicitud debe estar aprobada (estatus actual: %)', _sol.estatus;
  END IF;

  FOR _entrega IN SELECT * FROM jsonb_array_elements(_entregas) LOOP
    SELECT * INTO _det FROM public.detalle_solicitud
    WHERE id = (_entrega->>'detalle_id')::uuid AND solicitud_id = _solicitud_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Detalle no encontrado'; END IF;
    _cant := (_entrega->>'cantidad_entregada')::numeric;
    IF _cant < 0 THEN RAISE EXCEPTION 'Cantidad no puede ser negativa'; END IF;

    SELECT * INTO _prod FROM public.productos WHERE id = _det.producto_id;
    IF _prod.stock_actual < _cant THEN
      RAISE EXCEPTION 'Stock insuficiente para %: disponible % requerido %', _prod.nombre, _prod.stock_actual, _cant;
    END IF;

    UPDATE public.detalle_solicitud SET cantidad_entregada = _cant WHERE id = _det.id;
  END LOOP;

  UPDATE public.solicitudes SET
    estatus = 'lista'::solicitud_estatus,
    preparado_por = _user,
    fecha_lista = now(),
    comentarios_almacen = COALESCE(_comentarios, comentarios_almacen)
  WHERE id = _solicitud_id
  RETURNING * INTO _sol;
  RETURN _sol;
END;
$$;

-- Función: confirmar recepción (solicitante; descuenta stock y crea movimientos)
CREATE OR REPLACE FUNCTION public.confirmar_recepcion_solicitud(
  _solicitud_id uuid,
  _comentarios text DEFAULT NULL
)
RETURNS public.solicitudes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _sol public.solicitudes;
  _det public.detalle_solicitud;
  _prod public.productos;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO _sol FROM public.solicitudes WHERE id = _solicitud_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no existe'; END IF;
  IF _sol.usuario_id <> _user AND NOT public.has_role(_user, 'admin') THEN
    RAISE EXCEPTION 'Solo el solicitante puede confirmar la recepción';
  END IF;
  IF _sol.estatus <> 'lista'::solicitud_estatus THEN
    RAISE EXCEPTION 'La solicitud debe estar lista para recoger (estatus actual: %)', _sol.estatus;
  END IF;

  FOR _det IN SELECT * FROM public.detalle_solicitud WHERE solicitud_id = _solicitud_id LOOP
    IF _det.cantidad_entregada > 0 THEN
      SELECT * INTO _prod FROM public.productos WHERE id = _det.producto_id FOR UPDATE;
      IF _prod.stock_actual < _det.cantidad_entregada THEN
        RAISE EXCEPTION 'Stock insuficiente para %: disponible % requerido %',
          _prod.nombre, _prod.stock_actual, _det.cantidad_entregada;
      END IF;

      INSERT INTO public.movimientos_inventario
        (producto_id, tipo, cantidad, motivo, referencia, solicitud_id, usuario_responsable)
      VALUES
        (_prod.id, 'salida', _det.cantidad_entregada, 'Entrega confirmada por solicitante',
         'SOL-' || _sol.folio::text, _sol.id, _user);
    END IF;
  END LOOP;

  UPDATE public.solicitudes SET
    estatus = 'entregada'::solicitud_estatus,
    recibido_por = _user,
    fecha_entrega = now(),
    comentarios_usuario = CASE
      WHEN _comentarios IS NOT NULL AND _comentarios <> ''
        THEN COALESCE(comentarios_usuario || E'\n---\n', '') || 'Recepción: ' || _comentarios
      ELSE comentarios_usuario
    END
  WHERE id = _solicitud_id
  RETURNING * INTO _sol;
  RETURN _sol;
END;
$$;