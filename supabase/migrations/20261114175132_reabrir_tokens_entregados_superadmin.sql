ALTER TABLE public.cash_tokens ADD COLUMN reopen_history jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(reopen_history)='array');

CREATE OR REPLACE FUNCTION kaupaloki_private.validar_token_pago() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $guard$
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
        OR new.expires_at IS DISTINCT FROM now()+interval '48 hours'
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
$guard$;

CREATE FUNCTION public.reabrir_token_efectivo(p_token_id uuid,p_motivo text,p_updated_at timestamptz)
RETURNS public.cash_tokens LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $reopen$
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
    cancelled_at=NULL,cancel_reason=NULL,expires_at=now()+interval '48 hours',
    reopen_history=token.reopen_history || jsonb_build_array(jsonb_build_object(
      'reopened_at',now(),'reopened_by',auth.uid(),'reopened_by_name',actor_name,'reason',reason,
      'previous_redeemed_at',token.redeemed_at,'previous_redeemed_by',token.redeemed_by,
      'previous_redeemed_by_name',token.redeemed_by_name,'previous_expires_at',token.expires_at
    ))
  WHERE id=token.id RETURNING * INTO token;
  RETURN token;
END;
$reopen$;
REVOKE ALL ON FUNCTION public.reabrir_token_efectivo(uuid,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reabrir_token_efectivo(uuid,text,timestamptz) TO authenticated;

CREATE FUNCTION public.entregar_token_efectivo(p_token_id uuid,p_updated_at timestamptz)
RETURNS public.cash_tokens LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $deliver$
DECLARE token public.cash_tokens; actor_name text;
BEGIN
  IF auth.uid() IS NULL OR coalesce(kaupaloki_private.staff_role(),'') NOT IN ('administrador','super_admin','supervisor') THEN
    RAISE EXCEPTION 'Tu perfil no puede confirmar entregas de efectivo.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO token FROM public.cash_tokens WHERE id=p_token_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El token ya no está disponible.' USING ERRCODE='P0002'; END IF;
  IF token.estado='entregado' THEN RAISE EXCEPTION 'Este token ya fue entregado. No se puede volver a entregar.' USING ERRCODE='22023'; END IF;
  IF token.estado<>'activo' OR token.expires_at<=clock_timestamp() THEN
    RAISE EXCEPTION 'Este token ya no está vigente para entrega.' USING ERRCODE='22023';
  END IF;
  IF token.updated_at IS DISTINCT FROM p_updated_at THEN
    RAISE EXCEPTION 'El token cambió. Vuelve a escanearlo antes de confirmar la entrega.' USING ERRCODE='40001';
  END IF;
  SELECT coalesce(nullif(btrim(full_name),''),id::text) INTO actor_name FROM public.profiles WHERE id=auth.uid();
  UPDATE public.cash_tokens SET estado='entregado',status='entregado',redeemed_at=clock_timestamp(),
    redeemed_by=auth.uid(),redeemed_by_name=actor_name
  WHERE id=token.id RETURNING * INTO token;
  RETURN token;
END;
$deliver$;
REVOKE ALL ON FUNCTION public.entregar_token_efectivo(uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entregar_token_efectivo(uuid,timestamptz) TO authenticated;

-- Each delivery cycle gets a distinct version, even inside one transaction.
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
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;

  IF NEW.estado IS NULL THEN
    NEW.estado := 'activo';
  END IF;
  NEW.status := NEW.estado;

  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 'TK([0-9]+)')::integer), 0) + 1 INTO v_next_num FROM public.cash_tokens;
    NEW.codigo := 'TK' || LPAD(v_next_num::text, 4, '0');
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
NOTIFY pgrst, 'reload schema';
