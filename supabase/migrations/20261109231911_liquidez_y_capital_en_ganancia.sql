ALTER TABLE public.resumen_liquidacion
  ADD COLUMN total_capital_invertido_cop numeric NOT NULL DEFAULT 0;

-- Apply the same formula to operational refreshes, manual rate edits and resets.
CREATE FUNCTION kaupaloki_private.calcular_ganancia_liquidacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $profit$
BEGIN
  SELECT COALESCE(SUM(CASE WHEN tipo = 'CONTRATO' THEN monto_cop ELSE -monto_cop END), 0)
  INTO NEW.total_capital_invertido_cop
  FROM public.capital_movimientos
  WHERE tipo IN ('CONTRATO', 'RETIRO');

  NEW.ganancia_esperada_cop := COALESCE(NEW.total_ventas_usdt_cop, 0)
    + COALESCE(NEW.total_activos_liquidos_cop, 0)
    + COALESCE(NEW.total_liquidez_esperada_cop, 0)
    - COALESCE(NEW.saldo_neto_clientes_cop, 0)
    - COALESCE(NEW.total_gastos_cop, 0)
    - NEW.total_capital_invertido_cop;
  RETURN NEW;
END;
$profit$;

REVOKE ALL ON FUNCTION kaupaloki_private.calcular_ganancia_liquidacion() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER calcular_ganancia_liquidacion
BEFORE INSERT OR UPDATE ON public.resumen_liquidacion
FOR EACH ROW EXECUTE FUNCTION kaupaloki_private.calcular_ganancia_liquidacion();

-- Capital postings can affect principal, account balances and recognized interest.
CREATE TRIGGER trg_capital_recalculate_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.capital_movimientos
FOR EACH STATEMENT EXECUTE FUNCTION public.fn_recalculate_financial_aggregates();

UPDATE public.resumen_liquidacion SET updated_at = now() WHERE id IS NOT NULL;
