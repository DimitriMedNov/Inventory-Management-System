-- Agregar nuevo valor al enum (debe confirmarse antes de usarse en funciones)
ALTER TYPE public.solicitud_estatus ADD VALUE IF NOT EXISTS 'lista' BEFORE 'entregada';

-- Columnas adicionales en solicitudes
ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS fecha_requerida timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fecha_lista timestamp with time zone,
  ADD COLUMN IF NOT EXISTS preparado_por uuid,
  ADD COLUMN IF NOT EXISTS recibido_por uuid;