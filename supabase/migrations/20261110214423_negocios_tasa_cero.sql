-- Save one validated operation through a typed endpoint while keeping negocios RLS.
create or replace function public.crear_negocio_dashboard(
  p_id uuid, p_cliente_id uuid, p_divisa_codigo text, p_fecha date, p_monto numeric, p_tasa numeric, p_codigo text default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $create$
declare
  client_record record;
  saved_id uuid;
begin
  if p_id is null or p_fecha is null or p_monto is null or p_tasa is null
     or not (p_monto > 0 and p_monto < 'Infinity'::numeric and p_tasa >= 0 and p_tasa < 'Infinity'::numeric) then
    raise invalid_parameter_value using message = 'Ingresa una fecha, un monto y una tasa válidos.';
  end if;
  select codigo,nombre into client_record from public.clientes where id=p_cliente_id;
  if not found or not exists (select 1 from public.divisas where codigo=p_divisa_codigo) then
    raise foreign_key_violation using message = 'El cliente o la divisa no está disponible.';
  end if;

  insert into public.negocios
    (id, codigo, fecha, cliente_id, cliente_codigo, cliente_nombre, divisa_codigo, monto_divisa,
     tasa, tasa_cliente_cop, ingreso_cop, monto_cop, usdt_por_divisa, costo_usdt_comp, estado)
  values
    (p_id, nullif(btrim(p_codigo),''), p_fecha, p_cliente_id, client_record.codigo, client_record.nombre, p_divisa_codigo, p_monto,
     p_tasa, p_tasa, p_monto*p_tasa, p_monto*p_tasa, 0, 0, 'Completado')
  returning id into strict saved_id;
  return saved_id;
end;
$create$;
