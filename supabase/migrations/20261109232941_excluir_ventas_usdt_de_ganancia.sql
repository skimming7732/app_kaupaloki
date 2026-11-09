CREATE OR REPLACE FUNCTION kaupaloki_private.calcular_ganancia_liquidacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $profit$
BEGIN
  SELECT COALESCE(SUM(CASE WHEN tipo = 'CONTRATO' THEN monto_cop ELSE -monto_cop END), 0)
  INTO NEW.total_capital_invertido_cop
  FROM public.capital_movimientos
  WHERE tipo IN ('CONTRATO', 'RETIRO');

  NEW.ganancia_esperada_cop := COALESCE(NEW.total_activos_liquidos_cop, 0)
    + COALESCE(NEW.total_liquidez_esperada_cop, 0)
    - COALESCE(NEW.saldo_neto_clientes_cop, 0)
    - COALESCE(NEW.total_gastos_cop, 0)
    - NEW.total_capital_invertido_cop;
  RETURN NEW;
END;
$profit$;

UPDATE public.resumen_liquidacion SET updated_at = now() WHERE id IS NOT NULL;
