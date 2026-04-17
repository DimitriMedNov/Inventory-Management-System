-- Crear usuario admin sistemas.bajio@diprolam.com
DO $$
DECLARE
  _uid UUID;
  _existing UUID;
BEGIN
  SELECT id INTO _existing FROM auth.users WHERE email = 'sistemas.bajio@diprolam.com';

  IF _existing IS NOT NULL THEN
    _uid := _existing;
    -- Actualizar password y confirmar email
    UPDATE auth.users
    SET encrypted_password = crypt('J35u5m3d1n45610', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('nombre','Jesus D Medina Novelo','area','Sistemas'),
        updated_at = now()
    WHERE id = _uid;
  ELSE
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'sistemas.bajio@diprolam.com',
      crypt('J35u5m3d1n45610', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre','Jesus D Medina Novelo','area','Sistemas'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _uid, _uid::text,
      jsonb_build_object('sub', _uid::text, 'email', 'sistemas.bajio@diprolam.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  -- Asegurar profile
  INSERT INTO public.profiles (id, nombre, correo, area, activo)
  VALUES (_uid, 'Jesus D Medina Novelo', 'sistemas.bajio@diprolam.com', 'Sistemas', true)
  ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre, area = EXCLUDED.area, activo = true;

  -- Asignar rol admin (y limpiar otros roles para este usuario)
  DELETE FROM public.user_roles WHERE user_id = _uid AND role <> 'admin';
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT DO NOTHING;
END $$;