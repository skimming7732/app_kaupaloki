-- The fee is a separate USDT debit from the origin wallet.
ALTER TABLE public.ventas_usdt
  ADD COLUMN fee_usdt numeric(18, 6) NOT NULL DEFAULT 0
    CHECK (fee_usdt >= 0 AND fee_usdt < 'Infinity'::numeric),
  ADD COLUMN saldo_venta_aplicado boolean NOT NULL DEFAULT false;

GRANT INSERT (fee_usdt), UPDATE (fee_usdt) ON public.ventas_usdt TO authenticated;

CREATE FUNCTION kaupaloki_private.contabilizar_venta_usdt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $sale$
DECLARE
  old_wallet text; new_wallet text;
  old_account text; new_account text;
  old_fee numeric := 0; new_fee numeric := 0;
  old_debit numeric := 0; new_debit numeric := 0;
  old_credit numeric := 0; new_credit numeric := 0;
  old_linked boolean := false;
  movement record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_wallet := old.wallet_origen_id;
    old_account := old.destino_fondos_id;
    old_linked := old_wallet IS NOT NULL AND old_account IS NOT NULL;
    old_fee := old.fee_usdt;

    -- For sales that predate this migration, the opening balance may already
    -- reflect the principal. Their new, separately posted fees can be reversed.
    IF old_linked AND (TG_OP = 'UPDATE' OR old.saldo_venta_aplicado) THEN
      old_debit := old.usdt_vendido;
      old_credit := old.total_cop;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_wallet := new.wallet_origen_id;
    new_account := new.destino_fondos_id;
    new_fee := new.fee_usdt;
    new.saldo_venta_aplicado := CASE WHEN TG_OP = 'INSERT' THEN true ELSE old.saldo_venta_aplicado END;

    IF new.usdt_vendido IS NULL OR NOT (new.usdt_vendido > 0 AND new.usdt_vendido < 'Infinity'::numeric)
       OR new.tasa IS NULL OR NOT (new.tasa > 0 AND new.tasa < 'Infinity'::numeric)
       OR new_fee IS NULL OR NOT (new_fee >= 0 AND new_fee < 'Infinity'::numeric)
       OR new.fecha IS NULL THEN
      RAISE EXCEPTION 'Ingresa un monto, una tasa, un fee y una fecha válidos.';
    END IF;

    IF (TG_OP = 'INSERT' OR old_linked OR new_fee > 0)
       AND (new_wallet IS NULL OR new_account IS NULL OR new_wallet = new_account) THEN
      RAISE EXCEPTION 'Selecciona una billetera de origen y una cuenta de destino válidas.';
    END IF;

    IF TG_OP = 'INSERT' OR (new.usdt_vendido, new.tasa) IS DISTINCT FROM (old.usdt_vendido, old.tasa) THEN
      new.total_cop := new.usdt_vendido * new.tasa;
    END IF;

    IF TG_OP = 'INSERT' OR old_linked THEN
      new_debit := new.usdt_vendido;
      new_credit := new.total_cop;
    END IF;
  END IF;

  FOR movement IN
    SELECT account_id, currency, sum(delta) AS amount
    FROM (VALUES (old_wallet, 'USDT', old_debit + old_fee), (old_account, 'COP', -old_credit),
                 (new_wallet, 'USDT', -(new_debit + new_fee)), (new_account, 'COP', new_credit))
      AS entries(account_id, currency, delta)
    WHERE account_id IS NOT NULL
    GROUP BY account_id, currency HAVING sum(delta) <> 0
    ORDER BY currency, account_id
  LOOP
    IF movement.currency = 'USDT' THEN
      UPDATE public.activos_digitales
      SET saldo_real = coalesce(saldo_real, saldo_usdt, 0) + movement.amount,
          saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount
      WHERE id::text = movement.account_id
        AND (movement.amount > 0 OR coalesce(saldo_real, saldo_usdt, 0) + movement.amount >= 0);
    ELSE
      UPDATE public.activos_liquidos
      SET saldo_real = coalesce(saldo_real, saldo_cop, 0) + movement.amount,
          saldo_cop = coalesce(saldo_cop, 0) + movement.amount
      WHERE id::text = movement.account_id AND coalesce(divisa, 'COP') = 'COP'
        AND (movement.amount > 0 OR coalesce(saldo_real, saldo_cop, 0) + movement.amount >= 0);
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cuenta no está disponible o el saldo es insuficiente para la venta y su fee.';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$sale$;

REVOKE ALL ON FUNCTION kaupaloki_private.contabilizar_venta_usdt() FROM public, anon, authenticated;

DROP TRIGGER aplicar_saldos_usdt ON public.ventas_usdt;
DROP TRIGGER editar_saldos_usdt ON public.ventas_usdt;
DROP TRIGGER bloquear_operacion_usdt ON public.ventas_usdt;
DROP TRIGGER bloquear_edicion_usdt ON public.ventas_usdt;

CREATE TRIGGER bloquear_cambios_venta_usdt
BEFORE INSERT OR UPDATE OR DELETE ON public.ventas_usdt
FOR EACH STATEMENT EXECUTE FUNCTION kaupaloki_private.bloquear_operacion_usdt();

CREATE TRIGGER zz_contabilizar_venta_usdt
BEFORE INSERT OR UPDATE OR DELETE ON public.ventas_usdt
FOR EACH ROW EXECUTE FUNCTION kaupaloki_private.contabilizar_venta_usdt();
