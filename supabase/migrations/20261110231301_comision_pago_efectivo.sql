alter table public.efectivo
  add column comision_cop numeric not null default 0,
  add constraint efectivo_comision_pago_check check (
    comision_cop >= 0 and (
      comision_cop = 0
      or (upper(btrim(coalesce(tipo, ''))) in ('PAGO', 'EGRESO') and monto is not null and monto > comision_cop)
    )
  );

comment on column public.efectivo.comision_cop is
  'Comisión cobrada al cliente, incluida en monto. La salida de caja es monto menos comision_cop.';

CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_efectivo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'kaupaloki_private'
AS $function$
DECLARE
  old_source text;
  new_source text;
  old_delta numeric := 0;
  new_delta numeric := 0;
  movement record;
  default_cash_id text;
BEGIN
  SELECT id::text INTO default_cash_id
  FROM public.activos_liquidos
  WHERE lower(activo) LIKE '%efectivo%' OR lower(institucion) LIKE '%efectivo%' OR lower(institucion) LIKE '%caja%'
  ORDER BY created_at ASC LIMIT 1;

  IF TG_OP <> 'INSERT' THEN
    old_source := coalesce(nullif(btrim(old.origen_fondos_id::text), ''), default_cash_id);
    IF upper(btrim(old.tipo)) = 'INGRESO' THEN
      old_delta := coalesce(old.monto, 0);
    ELSE
      old_delta := -(coalesce(old.monto, 0) - old.comision_cop);
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_source := coalesce(nullif(btrim(new.origen_fondos_id::text), ''), default_cash_id);
    IF new_source IS NOT NULL THEN
      new.origen_fondos_id := new_source::uuid;
    END IF;
    IF upper(btrim(new.tipo)) = 'INGRESO' THEN
      new_delta := coalesce(new.monto, 0);
    ELSE
      new_delta := -(coalesce(new.monto, 0) - new.comision_cop);
    END IF;
  END IF;

  FOR movement IN
    SELECT account_id, sum(delta) AS amount, sum(ingreso_delta) AS inc_ingresos, sum(egreso_delta) AS inc_egresos
    FROM (
      VALUES 
        (old_source, -old_delta, CASE WHEN old_delta > 0 THEN -old_delta ELSE 0 END, CASE WHEN old_delta < 0 THEN old_delta ELSE 0 END),
        (new_source, new_delta, CASE WHEN new_delta > 0 THEN new_delta ELSE 0 END, CASE WHEN new_delta < 0 THEN -new_delta ELSE 0 END)
    ) AS entries(account_id, delta, ingreso_delta, egreso_delta)
    WHERE account_id IS NOT NULL
    GROUP BY account_id HAVING sum(delta) <> 0 OR sum(ingreso_delta) <> 0 OR sum(egreso_delta) <> 0
    ORDER BY account_id
  LOOP
    UPDATE public.activos_liquidos
    SET saldo_cop = coalesce(saldo_cop, 0) + movement.amount,
        ingresos_cop = coalesce(ingresos_cop, 0) + movement.inc_ingresos,
        egresos_cop = coalesce(egresos_cop, 0) + movement.inc_egresos
    WHERE id::text = movement.account_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$function$
