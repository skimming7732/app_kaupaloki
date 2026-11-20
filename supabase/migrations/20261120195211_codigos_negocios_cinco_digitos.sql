CREATE OR REPLACE FUNCTION public.trg_negocios_auto_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.id := coalesce(new.id, gen_random_uuid());
  new.fecha := coalesce(new.fecha, current_date);
  if new.numero is null or new.numero <= 0 then
    perform pg_advisory_xact_lock(814636, 1);
    select coalesce(max(numero),40)+1 into new.numero from public.negocios;
  end if;
  if new.codigo is null or new.codigo in ('','AUTO') then
    if new.numero > 99999 then raise exception 'Se alcanzó el máximo de códigos de negocio (N99999).' using errcode='22003'; end if;
    new.codigo := 'N' || lpad(new.numero::text, 5, '0') || '-' || coalesce(new.divisa_codigo,'COP');
  end if;
  if new.cliente_id is not null and (new.cliente_nombre is null or new.cliente_codigo is null) then
    select codigo,nombre into new.cliente_codigo,new.cliente_nombre from public.clientes where id=new.cliente_id;
  end if;
  return new;
end;
$function$
;

-- Keep historical statement references in sync with the expanded business codes.
DO $codes$
DECLARE mapping record; account record; rewritten text;
BEGIN
 FOR account IN SELECT 'activos_liquidos'::text AS tabla,id,movimientos FROM public.activos_liquidos WHERE movimientos IS NOT NULL
   UNION ALL SELECT 'activos_digitales'::text,id,movimientos FROM public.activos_digitales WHERE movimientos IS NOT NULL
 LOOP
   rewritten:=account.movimientos::text;
   FOR mapping IN SELECT codigo AS old_code,'N0'||substr(codigo,2) AS new_code FROM public.negocios WHERE codigo ~ '^N[0-9]{4}-' LOOP
     rewritten:=replace(rewritten,mapping.old_code,mapping.new_code);
   END LOOP;
   IF rewritten IS DISTINCT FROM account.movimientos::text THEN
     EXECUTE format('UPDATE public.%I SET movimientos=$1 WHERE id=$2',account.tabla) USING rewritten::jsonb,account.id;
   END IF;
 END LOOP;
 UPDATE public.negocios SET codigo='N0'||substr(codigo,2) WHERE codigo ~ '^N[0-9]{4}-';
END;
$codes$;
