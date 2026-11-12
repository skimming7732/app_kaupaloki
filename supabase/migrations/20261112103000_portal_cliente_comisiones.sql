-- Migration: Incluir comisiones activas en el resultado de abrir_portal_cliente
create or replace function public.abrir_portal_cliente(p_token uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, kaupaloki_private
as $$
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
        'origenFondos', d.origen_fondos, 'monto', coalesce(d.monto_cop, d.monto), 'referencia', d.referencia))
      from public.dispersiones d
      where (d.cliente_id::text = link.client_id or (d.cliente_id is null and d.cliente_codigo = cliente.codigo))
        and upper(btrim(coalesce(d.estado, 'COMPLETADO'))) <> 'RECHAZADO'
    ), '[]'::jsonb),
    'efectivo', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'fecha', e.fecha,
        'tipo', e.tipo, 'monto', e.monto, 'origenFondos', e.origen_fondos, 'referencia', e.referencia))
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
$$;
