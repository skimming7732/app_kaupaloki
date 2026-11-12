-- Migración para sincronizar y trasladar nombres de billeteras al campo titular en activos_digitales
UPDATE public.activos_digitales
SET titular = activo
WHERE titular IS NULL OR btrim(titular) = '';

UPDATE public.activos_digitales
SET activo = titular
WHERE titular IS NOT NULL AND btrim(titular) <> '';
