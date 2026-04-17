
-- Tabla de proyectos
CREATE TABLE public.proyectos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver proyectos (para seleccionar al solicitar)
CREATE POLICY "Proyectos visibles autenticados"
ON public.proyectos FOR SELECT
TO authenticated
USING (true);

-- Solo admin gestiona
CREATE POLICY "Admin gestiona proyectos"
ON public.proyectos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_proyectos_updated_at
BEFORE UPDATE ON public.proyectos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agregar proyecto_id a solicitudes (nullable temporal para no romper datos existentes)
ALTER TABLE public.solicitudes ADD COLUMN proyecto_id UUID REFERENCES public.proyectos(id);
CREATE INDEX idx_solicitudes_proyecto_id ON public.solicitudes(proyecto_id);
