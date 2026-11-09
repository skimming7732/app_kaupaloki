-- Asset forms manage identifying fields. Ledger writes continue through
-- the transaction triggers, which run with their own privileges.
REVOKE INSERT, UPDATE, TRUNCATE, TRIGGER ON public.activos_liquidos, public.activos_digitales FROM public, anon, authenticated;
GRANT INSERT (id, activo, institucion, titular, empresa, cuenta, tarifas),
      UPDATE (activo, institucion, titular, empresa, cuenta, tarifas)
  ON public.activos_liquidos TO authenticated;
GRANT INSERT (id, activo, red, wallet, id_wallet, titular, tarifas),
      UPDATE (activo, red, wallet, titular, tarifas)
  ON public.activos_digitales TO authenticated;

ALTER TABLE public.activos_liquidos
  ALTER COLUMN saldo_inicial SET DEFAULT 0,
  ALTER COLUMN saldo_real DROP DEFAULT;
ALTER TABLE public.activos_digitales
  ALTER COLUMN saldo_inicial SET DEFAULT 0,
  ALTER COLUMN saldo_real DROP DEFAULT;

ALTER POLICY activos_liquidos_staff_update ON public.activos_liquidos
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'))
  WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY activos_digitales_staff_update ON public.activos_digitales
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'))
  WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY activos_liquidos_staff_delete ON public.activos_liquidos
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY activos_digitales_staff_delete ON public.activos_digitales
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));

-- Resolve legacy statement links before account names become editable.
WITH cuentas AS (
  SELECT lower(btrim(activo)) AS nombre, min(id::text) AS id
  FROM public.activos_liquidos
  GROUP BY lower(btrim(activo))
  HAVING count(*) = 1
)
UPDATE public.efectivo e
SET origen_fondos_id = a.id
FROM cuentas a
WHERE e.origen_fondos_id IS NULL AND lower(btrim(e.origen_fondos)) = a.nombre;

WITH activos AS (
  SELECT id, activo, 'COP' AS divisa FROM public.activos_liquidos
  UNION ALL
  SELECT id, activo, 'USDT' AS divisa FROM public.activos_digitales
), cuentas AS (
  SELECT lower(btrim(activo)) AS nombre, divisa, min(id::text) AS id
  FROM activos
  GROUP BY lower(btrim(activo)), divisa
  HAVING count(*) = 1
)
UPDATE public.gastos g
SET origen_fondos_id = a.id
FROM cuentas a
WHERE g.origen_fondos_id IS NULL AND g.divisa = a.divisa AND lower(btrim(g.origen_fondos)) = a.nombre;

NOTIFY pgrst, 'reload schema';
