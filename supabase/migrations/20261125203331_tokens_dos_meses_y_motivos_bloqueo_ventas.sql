-- Calendar-month lifetime for new tokens and Super Admin delivery corrections.
CREATE OR REPLACE FUNCTION public.trg_cash_tokens_auto_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_next_num integer;
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.fecha IS NULL THEN
    NEW.fecha := CURRENT_DATE;
  END IF;

  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '2 months';
  END IF;

  IF NEW.estado IS NULL THEN
    NEW.estado := 'activo';
  END IF;
  NEW.status := NEW.estado;

  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.cash_tokens.codigo'));
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM '^TK([0-9]+)$')::integer), 0) + 1 INTO v_next_num FROM public.cash_tokens;
    IF v_next_num > 99999 THEN
      RAISE EXCEPTION 'Se alcanzó el máximo de códigos de token (TK99999).';
    END IF;
    NEW.codigo := 'TK' || LPAD(v_next_num::text, 5, '0');
  END IF;

  IF NEW.token_code IS NULL OR NEW.token_code = '' THEN
    NEW.token_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::text || clock_timestamp()::text) FROM 1 FOR 8));
  END IF;

  NEW.token_code := UPPER(NEW.token_code);
  NEW.updated_at := clock_timestamp();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reabrir_token_efectivo(p_token_id uuid, p_motivo text, p_updated_at timestamp with time zone)
 RETURNS cash_tokens
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  token public.cash_tokens;
  payment_id uuid;
  actor_name text;
  reason text := btrim(p_motivo);
BEGIN
  IF auth.uid() IS NULL OR coalesce(kaupaloki_private.staff_role(),'')<>'super_admin' OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id=auth.uid()
      AND lower(btrim(coalesce(status,''))) IN ('inactivo','inactive','invitado','invited')
  ) THEN RAISE EXCEPTION 'Solo Super Admin puede devolver un token a pendiente.' USING ERRCODE='42501'; END IF;
  IF reason IS NULL OR length(reason)<3 OR length(reason)>500 THEN
    RAISE EXCEPTION 'Escribe un motivo entre 3 y 500 caracteres.' USING ERRCODE='22023';
  END IF;
  SELECT efectivo_id INTO payment_id FROM public.cash_tokens WHERE id=p_token_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El token ya no está disponible.' USING ERRCODE='P0002'; END IF;
  -- Match the payment-first lock order used by token issuance.
  PERFORM 1 FROM public.efectivo WHERE id=payment_id AND upper(btrim(tipo)) IN ('PAGO','EGRESO') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pago vinculado ya no está disponible.' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT token FROM public.cash_tokens WHERE id=p_token_id FOR UPDATE;
  IF token.updated_at IS DISTINCT FROM p_updated_at OR token.efectivo_id IS DISTINCT FROM payment_id THEN
    RAISE EXCEPTION 'El token cambió. Actualiza la lista y vuelve a abrir el vale.' USING ERRCODE='40001';
  END IF;
  IF token.estado<>'entregado' THEN RAISE EXCEPTION 'Solo se puede corregir un token entregado.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(nullif(btrim(full_name),''),id::text) INTO actor_name FROM public.profiles WHERE id=auth.uid();
  UPDATE public.cash_tokens SET
    estado='activo',status='activo',redeemed_at=NULL,redeemed_by=NULL,redeemed_by_name=NULL,
    cancelled_at=NULL,cancel_reason=NULL,expires_at=now()+interval '2 months',
    reopen_history=token.reopen_history || jsonb_build_array(jsonb_build_object(
      'reopened_at',now(),'reopened_by',auth.uid(),'reopened_by_name',actor_name,'reason',reason,
      'previous_redeemed_at',token.redeemed_at,'previous_redeemed_by',token.redeemed_by,
      'previous_redeemed_by_name',token.redeemed_by_name,'previous_expires_at',token.expires_at
    ))
  WHERE id=token.id RETURNING * INTO token;
  RETURN token;
END;
$function$
;

CREATE OR REPLACE FUNCTION kaupaloki_private.validar_token_pago()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  pago public.efectivo;
  reopening boolean := false;
  actor_name text;
  reason text;
  expected_history jsonb;
BEGIN
  IF tg_op='DELETE' THEN
    IF old.efectivo_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cancela el token desde el listado para conservar el historial del pago.';
    END IF;
    RETURN old;
  END IF;
  IF tg_op='INSERT' AND new.reopen_history<>'[]'::jsonb THEN
    RAISE EXCEPTION 'El historial de correcciones no puede modificarse.' USING ERRCODE='42501';
  END IF;
  IF tg_op='UPDATE' THEN
    reopening := old.estado='entregado' AND new.estado='activo';
    IF reopening THEN
      IF coalesce(kaupaloki_private.staff_role(),'')<>'super_admin' OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id=auth.uid()
          AND lower(btrim(coalesce(status,''))) IN ('inactivo','inactive','invitado','invited')
      ) THEN RAISE EXCEPTION 'Solo Super Admin puede devolver un token a pendiente.' USING ERRCODE='42501'; END IF;
      SELECT coalesce(nullif(btrim(full_name),''),id::text) INTO actor_name FROM public.profiles WHERE id=auth.uid();
      reason := btrim(new.reopen_history->-1->>'reason');
      expected_history := old.reopen_history || jsonb_build_array(jsonb_build_object(
        'reopened_at',now(),'reopened_by',auth.uid(),'reopened_by_name',actor_name,'reason',reason,
        'previous_redeemed_at',old.redeemed_at,'previous_redeemed_by',old.redeemed_by,
        'previous_redeemed_by_name',old.redeemed_by_name,'previous_expires_at',old.expires_at
      ));
      IF reason IS NULL OR length(reason)<3 OR length(reason)>500
        OR new.reopen_history IS DISTINCT FROM expected_history
        OR new.redeemed_at IS NOT NULL OR new.redeemed_by IS NOT NULL OR new.redeemed_by_name IS NOT NULL
        OR new.expires_at IS DISTINCT FROM now()+interval '2 months'
        OR old.efectivo_id IS NULL OR new.efectivo_id IS DISTINCT FROM old.efectivo_id
      THEN RAISE EXCEPTION 'La corrección requiere un motivo e historial válidos.' USING ERRCODE='22023'; END IF;
    ELSIF new.reopen_history IS DISTINCT FROM old.reopen_history THEN
      RAISE EXCEPTION 'El historial de correcciones no puede modificarse.' USING ERRCODE='42501';
    END IF;
    IF old.estado='entregado' AND NOT reopening AND
      (new.redeemed_at,new.redeemed_by,new.redeemed_by_name) IS DISTINCT FROM
      (old.redeemed_at,old.redeemed_by,old.redeemed_by_name)
    THEN RAISE EXCEPTION 'Usa la corrección de entrega para cambiar un token entregado.' USING ERRCODE='42501'; END IF;
  END IF;

  IF tg_op='UPDATE' AND old.efectivo_id IS NOT NULL THEN
    IF new.efectivo_id IS DISTINCT FROM old.efectivo_id THEN
      IF new.efectivo_id IS NOT NULL OR pg_trigger_depth()<2 OR EXISTS (SELECT 1 FROM public.efectivo WHERE id=old.efectivo_id) THEN
        RAISE EXCEPTION 'El vínculo del token con el pago no puede cambiar.';
      END IF;
      new.pago_codigo := old.pago_codigo;
      IF old.estado='activo' THEN
        new.estado := 'cancelado'; new.status := 'cancelado';
        new.cancelled_at := now(); new.cancel_reason := 'Pago anulado';
      END IF;
      RETURN new;
    END IF;
    IF new.estado IS DISTINCT FROM old.estado AND NOT reopening AND (
      old.estado<>'activo' OR (new.estado='entregado' AND old.expires_at<=clock_timestamp())
    ) THEN RAISE EXCEPTION 'Este token ya no está disponible para entrega.'; END IF;
  ELSIF new.efectivo_id IS NOT NULL AND (
    tg_op<>'INSERT' OR coalesce(kaupaloki_private.staff_role(),'') NOT IN ('administrador','super_admin')
  ) THEN RAISE EXCEPTION 'Solo administración puede vincular un token a un pago.' USING ERRCODE='42501'; END IF;
  IF new.efectivo_id IS NULL THEN
    new.pago_codigo := CASE WHEN tg_op='UPDATE' THEN old.pago_codigo ELSE NULL END;
    RETURN new;
  END IF;
  SELECT * INTO STRICT pago FROM public.efectivo WHERE id=new.efectivo_id;
  IF upper(btrim(pago.tipo)) NOT IN ('PAGO','EGRESO') THEN RAISE EXCEPTION 'El token debe vincularse a una salida de efectivo.'; END IF;
  IF tg_op='INSERT' THEN
    new.monto := pago.monto-pago.comision_cop; new.divisa := 'COP';
    IF new.monto IS NULL OR new.monto<=0 THEN RAISE EXCEPTION 'El pago debe tener efectivo por entregar.'; END IF;
  ELSIF new.monto IS DISTINCT FROM old.monto OR new.divisa IS DISTINCT FROM old.divisa
    OR new.token_code IS DISTINCT FROM old.token_code OR (new.expires_at IS DISTINCT FROM old.expires_at AND NOT reopening)
  THEN RAISE EXCEPTION 'Emite un reemplazo para cambiar el vale de un pago.'; END IF;
  new.referencia := pago.referencia; new.pago_codigo := pago.codigo;
  RETURN new;
END;
$function$
;

ALTER TABLE public.cash_tokens ALTER COLUMN expires_at SET DEFAULT (now()+interval '2 months');
-- One atomic administrative extension. The immutable-field guard is restored before releasing the table lock.
DO $extend$
BEGIN
 ALTER TABLE public.cash_tokens DISABLE TRIGGER zz_validar_token_pago;
 UPDATE public.cash_tokens SET expires_at=greatest(expires_at,now()+interval '2 months')
 WHERE estado='activo' AND expires_at>now();
 ALTER TABLE public.cash_tokens ENABLE TRIGGER zz_validar_token_pago;
END;
$extend$;

-- Preserve accounting and balance protection; report the exact reason for a rejected change.
CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_venta_usdt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  old_wallet text; new_wallet text;
  old_account text; new_account text;
  old_fee numeric := 0; new_fee numeric := 0;
  old_debit numeric := 0; new_debit numeric := 0;
  old_credit numeric := 0; new_credit numeric := 0;
  old_linked boolean := false;
  movement record;
  available numeric;
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
      IF movement.currency='COP' THEN
        SELECT coalesce(saldo_cop,0) INTO available FROM public.activos_liquidos
        WHERE id::text=movement.account_id AND coalesce(divisa,'COP')='COP';
        IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta de destino de esta venta ya no está disponible. Revisa la cuenta vinculada.' USING ERRCODE='22023'; END IF;
        RAISE EXCEPTION 'No se puede revertir el abono de esta venta: se necesitan % COP en la cuenta de destino y solo hay % COP disponibles. Revisa los movimientos posteriores.',
          to_char(abs(movement.amount),'FM999,999,999,999,990.00'),to_char(available,'FM999,999,999,999,990.00') USING ERRCODE='22023';
      ELSE
        SELECT coalesce(saldo_usdt,0) INTO available FROM public.activos_digitales WHERE id::text=movement.account_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'La billetera de origen de esta venta ya no está disponible. Revisa la billetera vinculada.' USING ERRCODE='22023'; END IF;
        RAISE EXCEPTION 'Saldo insuficiente en la billetera de origen para la venta y su fee. Se requieren % USDT y hay % USDT disponibles.',
          rtrim(rtrim(to_char(abs(movement.amount),'FM999,999,999,999,990.000000'),'0'),'.'),
          rtrim(rtrim(to_char(available,'FM999,999,999,999,990.000000'),'0'),'.') USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$function$
;
NOTIFY pgrst, 'reload schema';
