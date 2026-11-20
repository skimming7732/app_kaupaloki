-- Narrow ledger projection: no contracts, conditions or unliquidated accruals.
CREATE FUNCTION kaupaloki_private.movimientos_tesoreria() RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR coalesce(kaupaloki_private.staff_role(),'') NOT IN ('administrador','super_admin','supervisor','auditor') OR EXISTS(
 SELECT 1 FROM public.profiles WHERE id=auth.uid() AND lower(coalesce(status,'')) IN ('inactivo','inactive','invitado','invited')
 ) THEN RAISE insufficient_privilege; END IF;
 RETURN QUERY SELECT jsonb_build_object(
 'id',m.id,'codigo',m.codigo,'socio_id',m.socio_id,'socio_nombre',p.nombre,'fecha',m.fecha,
 'tipo',m.tipo,'monto',m.monto,'monto_cop',m.monto_cop,'tasa',m.tasa,'medio',m.medio,
 'cuenta_liquida_id',m.cuenta_liquida_id,'cuenta_digital_id',m.cuenta_digital_id,
 'created_by',m.created_by,'created_by_name',m.created_by_name,'created_at_audit',m.created_at_audit,
 'created_at',m.created_at,'numero',m.numero)
 FROM public.capital_movimientos m LEFT JOIN public.capital_socios p ON p.id=m.socio_id
 WHERE m.cuenta_liquida_id IS NOT NULL OR m.cuenta_digital_id IS NOT NULL
 ORDER BY m.fecha DESC,m.created_at_audit DESC NULLS LAST,m.created_at DESC NULLS LAST,m.numero DESC NULLS LAST,m.id;
END;
$fn$;
REVOKE ALL ON FUNCTION kaupaloki_private.movimientos_tesoreria() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION kaupaloki_private.movimientos_tesoreria() TO authenticated;
CREATE FUNCTION public.listar_movimientos_tesoreria() RETURNS SETOF jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT * FROM kaupaloki_private.movimientos_tesoreria();
$fn$;
REVOKE ALL ON FUNCTION public.listar_movimientos_tesoreria() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.listar_movimientos_tesoreria() TO authenticated;

CREATE OR REPLACE FUNCTION public.abrir_portal_cliente(p_token uuid, p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'kaupaloki_private'
AS $function$
declare
  link kaupaloki_private.portal_links%rowtype;
  cliente public.clientes%rowtype;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return null; end if;
  select * into link from kaupaloki_private.portal_links where token = p_token for update;
  if not found or link.expires_at <= now() or link.blocked_until > now() then return null; end if;
  if link.pin_hash <> encode(sha256(convert_to(p_token::text || ':' || p_pin, 'UTF8')), 'hex') then
    update kaupaloki_private.portal_links
    set failed_attempts = link.failed_attempts + 1,
        blocked_until = case when (link.failed_attempts + 1) % 5 = 0 then now() + interval '15 minutes' else null end,
        expires_at = case when link.failed_attempts >= 19 then now() else link.expires_at end
    where token = p_token;
    return null;
  end if;

  if link.failed_attempts > 0 or link.blocked_until is not null then
    update kaupaloki_private.portal_links set failed_attempts = 0, blocked_until = null where token = p_token;
  end if;
  select * into cliente from public.clientes c where c.id::text = link.client_id;
  if not found then return null; end if;

  return jsonb_build_object(
    'client', jsonb_build_object(
      'codigo', cliente.codigo,
      'nombre', cliente.nombre,
      'pais', cliente.pais,
      'saldoPendienteCOP', cliente.saldo_cop,
      'totalIngresosCOP', cliente.ingresos_cop,
      'totalDispersadoCOP', cliente.pagado_cop,
      'estado', cliente.estado
    ),
    'negocios', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'codigo', n.codigo, 'fecha', n.fecha,
        'divisaCodigo', n.divisa_codigo, 'montoDivisa', n.monto_divisa, 'tasaCambio', coalesce(n.tasa_cliente_cop, n.tasa),
        'ingresoCOP', n.ingreso_cop, 'estado', n.estado) order by n.fecha desc)
      from public.negocios n where n.cliente_id::text = link.client_id or (n.cliente_id is null and n.cliente_codigo = cliente.codigo)
    ), '[]'::jsonb),
    'dispersiones', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'codigo', d.codigo, 'fecha', d.fecha,
        'origenFondos', d.origen_fondos, 'monto', coalesce(d.monto_cop, d.monto), 'referencia', d.referencia, 'comprobanteUrl', d.comprobante_url))
      from public.dispersiones d
      where (d.cliente_id::text = link.client_id or (d.cliente_id is null and d.cliente_codigo = cliente.codigo))
        and upper(btrim(coalesce(d.estado, 'COMPLETADO'))) <> 'RECHAZADO'
    ), '[]'::jsonb),
    'efectivo', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'fecha', e.fecha,
        'tipo', CASE WHEN upper(btrim(coalesce(e.tipo, '')))='INGRESO' THEN 'Ingreso' ELSE 'Pago' END, 'monto', e.monto, 'origenFondos', e.origen_fondos, 'referencia', e.referencia))
      from public.efectivo e
      where (e.cliente_id::text = link.client_id or (e.cliente_id is null and e.cliente_codigo = cliente.codigo))
    ), '[]'::jsonb),
    'comisiones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ref_c.id,
        'clienteMasked', public.mask_client_code_for_portal(ref_c.codigo, ref_c.nombre),
        'negocios', coalesce((select count(*) from public.negocios n where n.cliente_id = ref_c.id or (n.cliente_id is null and n.cliente_codigo = ref_c.codigo)), 0),
        'totalComisionesCOP', coalesce((
          select sum(n.ingreso_cop) from public.negocios n where n.cliente_id = ref_c.id or (n.cliente_id is null and n.cliente_codigo = ref_c.codigo)
        ), 0) * coalesce(cm.porcentaje_comision, 0.01)
      ))
      from public.comisionistas cm
      cross join unnest(cm.referidos_ids) as ref_id
      join public.clientes ref_c on ref_c.id = ref_id
      where cm.cliente_id::text = link.client_id
    ), '[]'::jsonb)
  );
end;
$function$
;
NOTIFY pgrst, 'reload schema';
