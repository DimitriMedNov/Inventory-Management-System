-- ============================================================
-- Datos de demostración para InventaPro
--
-- ANTES DE CORRER ESTO:
--   1. En Supabase → Authentication → Users → Add user, crea:
--        correo:      demo@inventapro.mx
--        contraseña:  la que tú elijas (será pública, no reutilices ninguna tuya)
--        marca "Auto Confirm User"
--   2. Pega este archivo completo en Supabase → SQL Editor y córrelo.
--
-- Todo lo que se inserta aquí es inventado. No hay datos de ninguna empresa real.
-- Para borrarlo después, corre el bloque del final.
-- ============================================================

DO $$
DECLARE
  v_demo UUID;
  v_sol  UUID;
  v_emp  UUID;
BEGIN
  SELECT id INTO v_demo FROM auth.users WHERE email = 'demo@inventapro.mx';
  IF v_demo IS NULL THEN
    RAISE EXCEPTION 'Primero crea el usuario demo@inventapro.mx en Authentication → Users';
  END IF;

  -- Empresa de demostración: el sistema es multi-empresa y todo cuelga de aquí
  INSERT INTO public.empresas (nombre, slug)
  VALUES ('Suministros del Sureste', 'demo')
  ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id INTO v_emp;

  -- Perfil y rol del usuario de demostración (admin: la demo enseña el sistema completo)
  -- empresa_id va en el UPDATE también: si Supabase ya creó el perfil al dar de alta
  -- al usuario, viene sin empresa y sin eso el usuario no ve absolutamente nada.
  INSERT INTO public.profiles (id, nombre, correo, area, empresa_id)
  VALUES (v_demo, 'Usuario de demostración', 'demo@inventapro.mx', 'Visitantes', v_emp)
  ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre, area = EXCLUDED.area, empresa_id = EXCLUDED.empresa_id;

  INSERT INTO public.user_roles (user_id, role, empresa_id)
  VALUES (v_demo, 'admin', v_emp)
  ON CONFLICT (user_id, role) DO UPDATE SET empresa_id = EXCLUDED.empresa_id;

  -- Catálogos
  INSERT INTO public.categorias (nombre, descripcion, empresa_id) VALUES
    ('Herramienta manual', 'Herramienta que no requiere energía', v_emp),
    ('Herramienta eléctrica', 'Equipo con motor o batería', v_emp),
    ('Consumible',           'Material que se agota con el uso', v_emp),
    ('Seguridad',            'Equipo de protección personal', v_emp),
    ('Papelería',            'Insumos de oficina', v_emp)
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO public.ubicaciones (nombre, descripcion, empresa_id) VALUES
    ('Almacén central',   'Bodega principal, pasillo A', v_emp),
    ('Almacén norte',     'Sucursal norte', v_emp),
    ('Taller de servicio','Anaquel del taller', v_emp)
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO public.proyectos (codigo, nombre, descripcion, empresa_id) VALUES
    ('PRY-001', 'Mantenimiento preventivo', 'Rutina trimestral de equipos', v_emp),
    ('PRY-002', 'Ampliación almacén norte',  'Obra civil y estantería', v_emp),
    ('PRY-003', 'Renovación de flotilla',    'Servicio mayor de unidades', v_emp),
    ('PRY-004', 'Operación general',         'Gastos no asignados a obra', v_emp)
  ON CONFLICT (codigo) DO NOTHING;

  -- Productos
  INSERT INTO public.productos (sku, nombre, descripcion, categoria_id, ubicacion_id, unidad_medida, stock_actual, stock_minimo, proveedor, creado_por, empresa_id) VALUES
    ('HRM-001','Juego de llaves mixtas 8-22 mm','Acero cromo vanadio, 12 piezas',      (SELECT id FROM public.categorias WHERE nombre='Herramienta manual'),    (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'juego', 14,  4,'Truper',       v_demo, v_emp),
    ('HRM-002','Martillo de bola 16 oz','Mango de fibra de vidrio',                    (SELECT id FROM public.categorias WHERE nombre='Herramienta manual'),    (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza', 22,  6,'Truper',       v_demo, v_emp),
    ('HRM-003','Flexómetro 5 m','Cinta métrica con freno',                             (SELECT id FROM public.categorias WHERE nombre='Herramienta manual'),    (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'pieza', 31, 10,'Stanley',      v_demo, v_emp),
    ('HRM-004','Pinzas de corte 7"','Mango aislado 1000 V',                            (SELECT id FROM public.categorias WHERE nombre='Herramienta manual'),    (SELECT id FROM public.ubicaciones WHERE nombre='Taller de servicio'),'pieza', 9,  5,'Klein',       v_demo, v_emp),
    ('ELE-001','Taladro percutor 1/2"','Inalámbrico 20 V con dos baterías',            (SELECT id FROM public.categorias WHERE nombre='Herramienta eléctrica'), (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza',  6,  2,'DeWalt',       v_demo, v_emp),
    ('ELE-002','Esmeriladora angular 4 1/2"','800 W',                                  (SELECT id FROM public.categorias WHERE nombre='Herramienta eléctrica'), (SELECT id FROM public.ubicaciones WHERE nombre='Taller de servicio'),'pieza', 4, 2,'Bosch',        v_demo, v_emp),
    ('ELE-003','Multímetro digital','True RMS, categoría III',                         (SELECT id FROM public.categorias WHERE nombre='Herramienta eléctrica'), (SELECT id FROM public.ubicaciones WHERE nombre='Taller de servicio'),'pieza', 3, 2,'Fluke',        v_demo, v_emp),
    ('ELE-004','Compresor de aire 25 L','2 HP, uso intermitente',                      (SELECT id FROM public.categorias WHERE nombre='Herramienta eléctrica'), (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'pieza',  2,  1,'Evans',        v_demo, v_emp),
    ('CON-001','Broca para concreto 3/8"','Vástago SDS',                               (SELECT id FROM public.categorias WHERE nombre='Consumible'),            (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza', 48, 20,'Bosch',        v_demo, v_emp),
    ('CON-002','Disco de corte 4 1/2"','Para metal, 10 piezas',                        (SELECT id FROM public.categorias WHERE nombre='Consumible'),            (SELECT id FROM public.ubicaciones WHERE nombre='Taller de servicio'),'caja', 12, 5,'Austromex',   v_demo, v_emp),
    ('CON-003','Cinta de aislar 3/4"','Rollo de 18 m',                                 (SELECT id FROM public.categorias WHERE nombre='Consumible'),            (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza', 64, 25,'3M',          v_demo, v_emp),
    ('CON-004','Silicón transparente','Cartucho de 280 ml',                            (SELECT id FROM public.categorias WHERE nombre='Consumible'),            (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'pieza', 18,  8,'Sista',       v_demo, v_emp),
    ('CON-005','Estopa blanca','Bolsa de 1 kg',                                        (SELECT id FROM public.categorias WHERE nombre='Consumible'),            (SELECT id FROM public.ubicaciones WHERE nombre='Taller de servicio'),'kg',  7,  5,'Genérico',    v_demo, v_emp),
    ('SEG-001','Casco de seguridad','Con barboquejo, norma NOM-115',                   (SELECT id FROM public.categorias WHERE nombre='Seguridad'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza', 27, 10,'Libus',        v_demo, v_emp),
    ('SEG-002','Guantes de carnaza','Par, talla grande',                               (SELECT id FROM public.categorias WHERE nombre='Seguridad'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'par',   41, 20,'Truper',      v_demo, v_emp),
    ('SEG-003','Lentes de seguridad','Mica clara antiempañante',                       (SELECT id FROM public.categorias WHERE nombre='Seguridad'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'pieza', 35, 15,'3M',          v_demo, v_emp),
    ('SEG-004','Botas dieléctricas','Talla 27, casquillo de poliamida',                (SELECT id FROM public.categorias WHERE nombre='Seguridad'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'par',    5,  4,'Berrendo',    v_demo, v_emp),
    ('PAP-001','Papel bond carta','Paquete de 500 hojas',                              (SELECT id FROM public.categorias WHERE nombre='Papelería'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'paquete',23, 10,'Scribe',      v_demo, v_emp),
    ('PAP-002','Marcador permanente','Punta gruesa, negro',                            (SELECT id FROM public.categorias WHERE nombre='Papelería'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén central'),'pieza', 52, 20,'Sharpie',     v_demo, v_emp),
    ('PAP-003','Carpeta de argollas 2"','Blanca con bolsillo',                         (SELECT id FROM public.categorias WHERE nombre='Papelería'),             (SELECT id FROM public.ubicaciones WHERE nombre='Almacén norte'),  'pieza', 16,  8,'Acco',        v_demo, v_emp)
  ON CONFLICT (sku) DO NOTHING;

  -- Movimientos: entradas de compra y salidas de consumo, repartidos en el tiempo
  INSERT INTO public.movimientos_inventario (producto_id, tipo, cantidad, motivo, referencia, usuario_responsable, fecha, empresa_id)
  SELECT p.id, 'entrada', v.cant, v.motivo, v.ref, v_demo, now() - (v.dias || ' days')::interval, v_emp
  FROM public.productos p
  JOIN (VALUES
    ('HRM-001', 20, 'Compra inicial de temporada', 'OC-2026-014', 74),
    ('HRM-002', 30, 'Compra inicial de temporada', 'OC-2026-014', 74),
    ('HRM-003', 40, 'Reposición de almacén norte', 'OC-2026-021', 61),
    ('ELE-001',  8, 'Compra de herramienta mayor',  'OC-2026-027', 52),
    ('ELE-002',  6, 'Compra de herramienta mayor',  'OC-2026-027', 52),
    ('CON-001', 80, 'Consumibles de obra',          'OC-2026-033', 40),
    ('CON-002', 24, 'Consumibles de obra',          'OC-2026-033', 40),
    ('CON-003', 90, 'Consumibles de obra',          'OC-2026-033', 40),
    ('SEG-001', 35, 'Dotación de seguridad',        'OC-2026-040', 28),
    ('SEG-002', 60, 'Dotación de seguridad',        'OC-2026-040', 28),
    ('SEG-003', 50, 'Dotación de seguridad',        'OC-2026-040', 28),
    ('PAP-001', 30, 'Papelería trimestral',         'OC-2026-046', 15),
    ('PAP-002', 70, 'Papelería trimestral',         'OC-2026-046', 15)
  ) AS v(sku, cant, motivo, ref, dias) ON v.sku = p.sku;

  INSERT INTO public.movimientos_inventario (producto_id, tipo, cantidad, motivo, referencia, usuario_responsable, fecha, empresa_id)
  SELECT p.id, 'salida', v.cant, v.motivo, v.ref, v_demo, now() - (v.dias || ' days')::interval, v_emp
  FROM public.productos p
  JOIN (VALUES
    ('HRM-001',  6, 'Entrega a mantenimiento preventivo', 'PRY-001', 55),
    ('HRM-002',  8, 'Entrega a mantenimiento preventivo', 'PRY-001', 55),
    ('HRM-003',  9, 'Entrega a obra almacén norte',       'PRY-002', 44),
    ('ELE-001',  2, 'Préstamo a taller',                  'PRY-003', 33),
    ('ELE-002',  2, 'Entrega a obra almacén norte',       'PRY-002', 30),
    ('CON-001', 32, 'Consumo de obra',                    'PRY-002', 26),
    ('CON-002', 12, 'Consumo de taller',                  'PRY-003', 22),
    ('CON-003', 26, 'Consumo de taller',                  'PRY-003', 18),
    ('SEG-001',  8, 'Dotación a personal nuevo',          'PRY-004', 12),
    ('SEG-002', 19, 'Reposición por desgaste',            'PRY-004',  9),
    ('SEG-003', 15, 'Dotación a personal nuevo',          'PRY-004',  9),
    ('PAP-001',  7, 'Consumo de oficina',                 'PRY-004',  5),
    ('PAP-002', 18, 'Consumo de oficina',                 'PRY-004',  3)
  ) AS v(sku, cant, motivo, ref, dias) ON v.sku = p.sku;

  -- Un ajuste de inventario, para que se vea el tercer tipo de movimiento
  INSERT INTO public.movimientos_inventario (producto_id, tipo, cantidad, motivo, referencia, usuario_responsable, fecha, empresa_id)
  SELECT id, 'ajuste', -2, 'Diferencia encontrada en conteo físico', 'CONTEO-Q3', v_demo, now() - interval '7 days', v_emp
  FROM public.productos WHERE sku = 'CON-005';

  -- Requisiciones en distintos estados
  INSERT INTO public.solicitudes (usuario_id, estatus, comentarios_usuario, fecha_solicitud, empresa_id)
  VALUES (v_demo, 'pendiente', 'Material para el mantenimiento de octubre', now() - interval '2 days', v_emp)
  RETURNING id INTO v_sol;
  INSERT INTO public.detalle_solicitud (solicitud_id, producto_id, cantidad_solicitada)
  SELECT v_sol, id, 4 FROM public.productos WHERE sku IN ('HRM-001','CON-003');

  INSERT INTO public.solicitudes (usuario_id, estatus, comentarios_usuario, comentarios_admin, autorizado_por, fecha_solicitud, fecha_autorizacion, empresa_id)
  VALUES (v_demo, 'aprobada', 'Equipo de protección para dos personas nuevas', 'Autorizado, entregar esta semana', v_demo, now() - interval '6 days', now() - interval '5 days', v_emp)
  RETURNING id INTO v_sol;
  INSERT INTO public.detalle_solicitud (solicitud_id, producto_id, cantidad_solicitada)
  SELECT v_sol, id, 2 FROM public.productos WHERE sku IN ('SEG-001','SEG-002','SEG-003');

  INSERT INTO public.solicitudes (usuario_id, estatus, comentarios_usuario, comentarios_almacen, autorizado_por, entregado_por, fecha_solicitud, fecha_autorizacion, fecha_entrega, empresa_id)
  VALUES (v_demo, 'entregada', 'Consumibles para el taller', 'Entregado completo en ventanilla', v_demo, v_demo, now() - interval '20 days', now() - interval '19 days', now() - interval '18 days', v_emp)
  RETURNING id INTO v_sol;
  INSERT INTO public.detalle_solicitud (solicitud_id, producto_id, cantidad_solicitada, cantidad_entregada)
  SELECT v_sol, id, 10, 10 FROM public.productos WHERE sku = 'CON-003';

  INSERT INTO public.solicitudes (usuario_id, estatus, comentarios_usuario, comentarios_admin, autorizado_por, fecha_solicitud, fecha_autorizacion, empresa_id)
  VALUES (v_demo, 'rechazada', 'Taladro adicional para uso personal', 'No procede: hay dos disponibles en el taller', v_demo, now() - interval '30 days', now() - interval '29 days', v_emp)
  RETURNING id INTO v_sol;
  INSERT INTO public.detalle_solicitud (solicitud_id, producto_id, cantidad_solicitada)
  SELECT v_sol, id, 1 FROM public.productos WHERE sku = 'ELE-001';

  INSERT INTO public.solicitudes (usuario_id, estatus, comentarios_usuario, fecha_solicitud, empresa_id)
  VALUES (v_demo, 'cancelada', 'Papelería — se canceló por cambio de proveedor', now() - interval '11 days', v_emp)
  RETURNING id INTO v_sol;
  INSERT INTO public.detalle_solicitud (solicitud_id, producto_id, cantidad_solicitada)
  SELECT v_sol, id, 5 FROM public.productos WHERE sku = 'PAP-001';

  RAISE NOTICE 'Listo: 20 productos, 27 movimientos y 5 requisiciones para demo@inventapro.mx';
END $$;

-- ============================================================
-- Para borrar los datos de demostración:
--
-- DELETE FROM public.detalle_solicitud WHERE solicitud_id IN
--   (SELECT id FROM public.solicitudes WHERE usuario_id =
--     (SELECT id FROM auth.users WHERE email = 'demo@inventapro.mx'));
-- DELETE FROM public.solicitudes WHERE usuario_id =
--   (SELECT id FROM auth.users WHERE email = 'demo@inventapro.mx');
-- DELETE FROM public.movimientos_inventario WHERE usuario_responsable =
--   (SELECT id FROM auth.users WHERE email = 'demo@inventapro.mx');
-- DELETE FROM public.productos WHERE sku LIKE 'HRM-%' OR sku LIKE 'ELE-%'
--   OR sku LIKE 'CON-%' OR sku LIKE 'SEG-%' OR sku LIKE 'PAP-%';
-- ============================================================
