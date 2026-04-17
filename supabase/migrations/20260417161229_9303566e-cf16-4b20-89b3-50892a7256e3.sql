-- Cambiar el rol de un usuario (solo admin)
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden cambiar roles';
  END IF;
  IF _user_id = auth.uid() AND _new_role <> 'admin' THEN
    RAISE EXCEPTION 'No puedes quitarte tu propio rol de administrador';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _new_role);
END;
$$;

-- Activar / desactivar cuenta (solo admin)
CREATE OR REPLACE FUNCTION public.set_user_activo(_user_id uuid, _activo boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden cambiar el estado de cuentas';
  END IF;
  IF _user_id = auth.uid() AND _activo = false THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta';
  END IF;

  UPDATE public.profiles SET activo = _activo, updated_at = now() WHERE id = _user_id;
END;
$$;