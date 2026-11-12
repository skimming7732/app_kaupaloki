-- Migración para añadir columna de color institucional
ALTER TABLE public.instituciones
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#4318FF';
