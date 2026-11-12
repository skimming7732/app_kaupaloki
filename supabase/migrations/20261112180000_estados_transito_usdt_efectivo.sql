-- Migration: Estados en Tránsito para Compras USDT, Ventas USDT y Efectivo
-- Archivo: 20261112180000_estados_transito_usdt_efectivo.sql

-- 1. Añadir columnas a compras_usdt
ALTER TABLE public.compras_usdt
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('pendiente', 'recibido')),
  ADD COLUMN IF NOT EXISTS saldo_compra_aplicado boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fecha_recibido timestamptz,
  ADD COLUMN IF NOT EXISTS recibido_por uuid REFERENCES auth.users(id);

-- Asegurar que los registros históricos queden como recibido y aplicado
UPDATE public.compras_usdt
SET estado = 'recibido', saldo_compra_aplicado = true
WHERE estado IS NULL OR estado = '';

-- 2. Añadir columnas a ventas_usdt
ALTER TABLE public.ventas_usdt
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('pendiente', 'recibido')),
  ADD COLUMN IF NOT EXISTS fecha_recibido timestamptz,
  ADD COLUMN IF NOT EXISTS recibido_por uuid REFERENCES auth.users(id);

-- Asegurar que las ventas históricas queden como recibido y aplicado
UPDATE public.ventas_usdt
SET estado = 'recibido', saldo_venta_aplicado = true
WHERE estado IS NULL OR estado = '';

-- 3. Permisos a authenticated
GRANT INSERT (estado), UPDATE (estado, fecha_recibido, recibido_por) ON public.compras_usdt TO authenticated;
GRANT INSERT (estado), UPDATE (estado, fecha_recibido, recibido_por) ON public.ventas_usdt TO authenticated;

-- 4. Actualizar función trigger contabilizar_compra_usdt
CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_compra_usdt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $purchase$
declare
  old_dst text; new_dst text;
  old_currency text; new_currency text;
  old_debit numeric := 0; new_debit numeric := 0;
  old_credit numeric := 0; new_credit numeric := 0;
  historical boolean := false;
  movement record;
begin
  if tg_op <> 'INSERT' then
    old_dst := old.wallet_destino_id;
    old_currency := old.divisa_codigo;
    old_debit := coalesce(old.valor_comprado, 0);
    -- Si el saldo previo no fue aplicado porque estaba pendiente, no hay nada que revertir
    if coalesce(old.saldo_compra_aplicado, true) then
      old_credit := coalesce(old.usdt_comprado, 0);
    else
      old_credit := 0;
    end if;
    historical := old_dst is null;
  end if;

  if tg_op <> 'DELETE' then
    new_dst := new.wallet_destino_id;
    new_currency := new.divisa_codigo;
    new_debit := new.valor_comprado;

    if coalesce(new.estado, 'recibido') = 'recibido' then
      new.estado := 'recibido';
      new.saldo_compra_aplicado := true;
    else
      new.estado := 'pendiente';
      new.saldo_compra_aplicado := false;
    end if;

    if new_debit is null or new_debit <= 0 or new_debit >= 'Infinity'::numeric
       or new_currency is null or new.fecha is null then
      raise exception 'Ingresa un monto positivo, una divisa y una fecha válida.';
    end if;

    if new_dst is null and not historical then
      raise exception 'Selecciona una billetera de destino válida.';
    end if;

    if tg_op = 'INSERT' or (new_debit, new.usdt_comprado, new.tasa)
         is distinct from (old_debit, old_credit, old.tasa) then
      if new.tasa is null or new.tasa < 0 or new.tasa >= 'Infinity'::numeric then
        raise exception 'Ingresa una tasa de compra válida (mayor o igual a cero).';
      end if;

      if new.tasa = 0 then
        new.usdt_comprado := 0;
        new.costo := 0;
      else
        if new.usdt_comprado is null or new.usdt_comprado <= 0 then
          new.usdt_comprado := round(new_debit / new.tasa, 6);
        end if;

        if new.usdt_comprado is null or new.usdt_comprado < 0 or new.usdt_comprado >= 'Infinity'::numeric then
          raise exception 'El monto calculado de USDT debe ser mayor o igual que cero.';
        end if;
        new.costo := new.usdt_comprado / new_debit;
      end if;
    end if;

    -- Solo sumamos a la billetera digital destino si el estado es 'recibido'
    if new.saldo_compra_aplicado then
      new_credit := coalesce(new.usdt_comprado, 0);
    else
      new_credit := 0;
    end if;
  end if;

  if not historical then
    for movement in
      select account_id, sum(delta) amount
      from (values (old_dst, -old_credit),
                   (new_dst, new_credit)) m(account_id, delta)
      where account_id is not null
      group by account_id having sum(delta) <> 0
    loop
      update public.activos_digitales
      set saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount
      where id::text = movement.account_id;
    end loop;
  end if;

  for movement in
    select currency, sum(delta) amount
    from (values (old_currency, -old_debit), (new_currency, new_debit)) m(currency, delta)
    where currency is not null
    group by currency
    order by currency
  loop
    update public.divisas
    set total_comprado = greatest(0, coalesce(total_comprado, 0) + movement.amount),
        total_pendiente = greatest(0, coalesce(total_recibido, 0)
          - greatest(0, coalesce(total_comprado, 0) + movement.amount))
    where codigo = movement.currency;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$purchase$;

REVOKE ALL ON FUNCTION kaupaloki_private.contabilizar_compra_usdt() FROM public, anon, authenticated;

-- 5. Actualizar función trigger contabilizar_venta_usdt
CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_venta_usdt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

    IF old_linked THEN
      old_debit := old.usdt_vendido;
      -- Si ya se había aplicado el saldo a la cuenta destino, lo revertimos
      IF old.saldo_venta_aplicado THEN
        old_credit := old.total_cop;
      ELSE
        old_credit := 0;
      END IF;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_wallet := new.wallet_origen_id;
    new_account := new.destino_fondos_id;
    new_fee := new.fee_usdt;

    IF coalesce(new.estado, 'recibido') = 'recibido' THEN
      new.estado := 'recibido';
      new.saldo_venta_aplicado := true;
    ELSE
      new.estado := 'pendiente';
      new.saldo_venta_aplicado := false;
    END IF;

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
      -- Solo acreditamos la cuenta de destino si el dinero ya fue recibido
      IF new.saldo_venta_aplicado THEN
        new_credit := new.total_cop;
      ELSE
        new_credit := 0;
      END IF;
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
      SET saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount
      WHERE id::text = movement.account_id
        AND (movement.amount > 0 OR coalesce(saldo_usdt, 0) + movement.amount >= 0);
    ELSE
      UPDATE public.activos_liquidos
      SET saldo_cop = coalesce(saldo_cop, 0) + movement.amount
      WHERE id::text = movement.account_id AND coalesce(divisa, 'COP') = 'COP'
        AND (movement.amount > 0 OR coalesce(saldo_cop, 0) + movement.amount >= 0);
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

-- 6. Funciones RPC para marcar como recibido
CREATE OR REPLACE FUNCTION public.marcar_compra_usdt_recibida(p_compra_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.compras_usdt;
BEGIN
  SELECT * INTO v_row FROM public.compras_usdt WHERE id = p_compra_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra USDT no encontrada.';
  END IF;

  IF v_row.estado = 'recibido' THEN
    RETURN jsonb_build_object('success', true, 'already_received', true, 'codigo', v_row.codigo);
  END IF;

  UPDATE public.compras_usdt
  SET estado = 'recibido',
      fecha_recibido = clock_timestamp(),
      recibido_por = auth.uid()
  WHERE id = p_compra_id;

  RETURN jsonb_build_object('success', true, 'codigo', v_row.codigo);
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_venta_usdt_recibida(p_venta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ventas_usdt;
BEGIN
  SELECT * INTO v_row FROM public.ventas_usdt WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta USDT no encontrada.';
  END IF;

  IF v_row.estado = 'recibido' THEN
    RETURN jsonb_build_object('success', true, 'already_received', true, 'codigo', v_row.codigo);
  END IF;

  UPDATE public.ventas_usdt
  SET estado = 'recibido',
      fecha_recibido = clock_timestamp(),
      recibido_por = auth.uid()
  WHERE id = p_venta_id;

  RETURN jsonb_build_object('success', true, 'codigo', v_row.codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_compra_usdt_recibida(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_venta_usdt_recibida(uuid) TO authenticated;
