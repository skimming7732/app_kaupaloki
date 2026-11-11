-- Permitir a supervisores y auditores generar y consultar enlaces seguros del portal de clientes
CREATE OR REPLACE FUNCTION public.crear_enlace_cliente(p_client_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  share_token uuid := gen_random_uuid();
  share_pin text;
  random_hex text := replace(gen_random_uuid()::text, '-', '');
  existing jsonb;
  expiry timestamptz;
begin
  if coalesce(kaupaloki_private.staff_role(),'') not in ('administrador','super_admin','supervisor','auditor','comercial','operador','dispersor') then
    raise insufficient_privilege;
  end if;

  if not exists (select 1 from public.clientes c where c.id::text = p_client_id) then
    raise foreign_key_violation;
  end if;

  perform pg_advisory_xact_lock(814637, hashtext(p_client_id));
  existing := public.obtener_enlace_cliente(p_client_id);
  if existing is not null then return existing; end if;

  share_pin := lpad(((('x' || substr(random_hex, 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
  insert into kaupaloki_private.portal_links(token, client_id, pin_hash)
  values (share_token, p_client_id, encode(sha256(convert_to(share_token::text || ':' || share_pin, 'UTF8')), 'hex'))
  returning expires_at into expiry;

  return jsonb_build_object('token', share_token, 'pin', share_pin, 'expiresAt', expiry);
end;
$function$;

REVOKE ALL ON FUNCTION public.crear_enlace_cliente(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_enlace_cliente(text) TO authenticated;

REVOKE ALL ON FUNCTION public.obtener_enlace_cliente(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_enlace_cliente(text) TO authenticated;
