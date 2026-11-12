-- Migration: Campos pais y api_id en activos_liquidos y activos_digitales
-- Archivo: 20261112144000_activos_pais_y_api_id.sql

ALTER TABLE public.activos_liquidos 
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Colombia',
  ADD COLUMN IF NOT EXISTS api_id text;

ALTER TABLE public.activos_digitales 
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Colombia';
