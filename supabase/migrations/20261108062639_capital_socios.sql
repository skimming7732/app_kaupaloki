create table public.capital_socios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 150),
  tipo text not null check (tipo in ('SOCIO', 'INVERSIONISTA'))
);

create unique index capital_socios_nombre_idx on public.capital_socios (lower(btrim(nombre)));

create table public.capital_movimientos (
  id uuid primary key default gen_random_uuid(),
  socio_id uuid not null references public.capital_socios(id),
  fecha date not null,
  tipo text not null check (tipo in ('CONTRATO', 'DIVIDENDO', 'INTERES', 'LIQUIDACION', 'ADELANTO', 'RETIRO')),
  monto numeric(24,6) not null check (monto > 0 and monto < 'Infinity'::numeric),
  tasa numeric(20,8),
  monto_cop numeric generated always as (round(monto * coalesce(tasa, 1), 2)) stored,
  medio text,
  cuenta_liquida_id uuid references public.activos_liquidos(id),
  cuenta_digital_id uuid references public.activos_digitales(id),
  contrato_id uuid references public.capital_movimientos(id),
  condiciones text,
  check (monto_cop > 0),
  check (medio = 'USDT' or monto = round(monto, 2)),
  check (
    (medio is null and cuenta_liquida_id is null and cuenta_digital_id is null and tasa is null)
    or (medio is not null and medio in ('EFECTIVO','CUENTA') and cuenta_liquida_id is not null and cuenta_digital_id is null and tasa is null)
    or (medio is not null and medio = 'USDT' and cuenta_liquida_id is null and cuenta_digital_id is not null
        and tasa is not null and tasa > 0 and tasa < 'Infinity'::numeric)
  ),
  check (tipo not in ('CONTRATO', 'LIQUIDACION', 'ADELANTO', 'RETIRO') or medio is not null),
  check (tipo <> 'DIVIDENDO' or medio is null),
  check ((tipo in ('INTERES', 'RETIRO')) = (contrato_id is not null)),
  check (tipo <> 'CONTRATO' or nullif(btrim(condiciones), '') is not null),
  check (condiciones is null or char_length(condiciones) <= 4000)
);

create index capital_movimientos_socio_idx on public.capital_movimientos (socio_id, fecha, id);
create index capital_movimientos_contrato_idx on public.capital_movimientos (contrato_id) where contrato_id is not null;
create index capital_movimientos_fecha_idx on public.capital_movimientos (fecha, id);

alter table public.capital_socios enable row level security;
alter table public.capital_movimientos enable row level security;
revoke all on public.capital_socios, public.capital_movimientos from public, anon, authenticated;
grant select, insert on public.capital_socios, public.capital_movimientos to authenticated;
create policy capital_socios_leer on public.capital_socios for select to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador', 'super_admin'));
create policy capital_socios_registrar on public.capital_socios for insert to authenticated
  with check ((select kaupaloki_private.staff_role()) in ('administrador', 'super_admin'));
create policy capital_movimientos_leer on public.capital_movimientos for select to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador', 'super_admin'));
create policy capital_movimientos_registrar on public.capital_movimientos for insert to authenticated
  with check ((select kaupaloki_private.staff_role()) in ('administrador', 'super_admin'));

create function kaupaloki_private.aplicar_movimiento_capital() returns trigger
language plpgsql security definer set search_path = ''
as $capital$
declare
  socio_tipo text;
  disponible numeric;
  importe numeric;
  delta numeric;
begin
  if auth.uid() is null or coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin') then
    raise insufficient_privilege;
  end if;
  -- Serialize obligations for each person before checking their available balance.
  select tipo into socio_tipo from public.capital_socios where id = new.socio_id for no key update;
  if not found then raise exception 'El socio o inversionista no está disponible.'; end if;
  if new.tipo = 'DIVIDENDO' and socio_tipo <> 'SOCIO' then
    raise exception 'Los dividendos solo se registran para socios.';
  end if;

  if new.contrato_id is not null then
    select contrato.monto_cop - coalesce((
      select sum(retiro.monto_cop) from public.capital_movimientos retiro
      where retiro.contrato_id = contrato.id and retiro.tipo = 'RETIRO' and retiro.id <> new.id
    ), 0) into disponible
    from public.capital_movimientos contrato
    where contrato.id = new.contrato_id and contrato.tipo = 'CONTRATO'
      and contrato.socio_id = new.socio_id and contrato.fecha <= new.fecha;
    if not found then raise exception 'Selecciona un contrato de esta persona con fecha válida.'; end if;
    if new.tipo = 'RETIRO' and new.monto_cop > disponible then
      raise exception 'El retiro supera el capital disponible del contrato.';
    end if;
  end if;

  if new.tipo in ('LIQUIDACION','ADELANTO') or (new.tipo = 'INTERES' and new.medio is not null) then
    select coalesce(sum(case
      when tipo = 'DIVIDENDO' or (tipo = 'INTERES' and medio is null) then monto_cop
      when tipo in ('LIQUIDACION','ADELANTO') then -monto_cop
      else 0 end), 0) into disponible
    from public.capital_movimientos where socio_id = new.socio_id and id <> new.id;
    if new.tipo = 'LIQUIDACION' and new.monto_cop > disponible then
      raise exception 'El monto supera el saldo disponible. Para adelantar rendimientos, usa Adelantar.';
    end if;
    if new.tipo = 'INTERES' and disponible < 0 then
      raise exception 'Acredita el interés al saldo para compensar el adelanto antes de pagar.';
    end if;
    if new.tipo = 'ADELANTO' and new.monto_cop <= disponible then
      raise exception 'El saldo ya cubre ese monto. Usa Liquidar.';
    end if;
  end if;

  if new.medio is not null then
    importe := new.monto;
    delta := case when new.tipo = 'CONTRATO' then importe else -importe end;
    if new.medio = 'USDT' then
      update public.activos_digitales
      set saldo_usdt = coalesce(saldo_usdt, 0) + delta,
          ingresos_usdt = coalesce(ingresos_usdt, 0) + greatest(delta, 0),
          egresos_usdt = coalesce(egresos_usdt, 0) + greatest(-delta, 0)
      where id = new.cuenta_digital_id and (delta > 0 or coalesce(saldo_usdt, 0) >= importe);
    else
      update public.activos_liquidos
      set saldo_cop = coalesce(saldo_cop, 0) + delta,
          ingresos_cop = coalesce(ingresos_cop, 0) + greatest(delta, 0),
          egresos_cop = coalesce(egresos_cop, 0) + greatest(-delta, 0)
      where id = new.cuenta_liquida_id and coalesce(divisa, 'COP') = 'COP'
        and ((upper(coalesce(institucion, '')) = 'EFECTIVO' or upper(coalesce(activo, '')) like '%EFECTIVO%') = (new.medio = 'EFECTIVO'))
        and (delta > 0 or coalesce(saldo_cop, 0) >= importe);
    end if;
    if not found then raise exception 'La cuenta no está disponible o su saldo contable es insuficiente.'; end if;
  end if;

  if new.tipo = 'INTERES' then
    -- Register the operating cost once. Treasury movements are linked through
    -- capital_movimientos, so this expense does not create a second cash entry.
    insert into public.gastos(id, fecha, concepto, categoria, divisa, monto, origen_fondos)
      values(new.id, new.fecha, 'Intereses · Capital & Socios', 'Gastos Financieros y Bancarios', 'COP', new.monto_cop, 'Capital & Socios');
  elsif new.medio is not null then
    -- Recompute treasury totals through the existing statement trigger.
    update public.gastos set monto=monto where false;
  end if;
  return new;
end;
$capital$;

revoke all on function kaupaloki_private.aplicar_movimiento_capital() from public, anon, authenticated;
create trigger aplicar_movimiento_capital
  after insert on public.capital_movimientos
  for each row execute function kaupaloki_private.aplicar_movimiento_capital();

notify pgrst, 'reload schema';

-- A generated interest expense is owned by its capital movement.
create function kaupaloki_private.proteger_costo_capital() returns trigger
language plpgsql security definer set search_path = ''
as $expense$
begin
  if exists(select 1 from public.capital_movimientos where id = old.id and tipo = 'INTERES') then
    if tg_op = 'DELETE' then raise exception 'Este gasto pertenece a una liquidación de Capital & Socios.'; end if;
    if (new.id, new.fecha, new.monto, new.divisa, new.origen_fondos_id) is distinct from
      (old.id, old.fecha, old.monto, old.divisa, old.origen_fondos_id) then
      raise exception 'Este gasto pertenece a una liquidación de Capital & Socios.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$expense$;
revoke all on function kaupaloki_private.proteger_costo_capital() from public, anon, authenticated;
create trigger proteger_costo_capital before update or delete on public.gastos
for each row execute function kaupaloki_private.proteger_costo_capital();

-- Guard the imported cash balance reconciliation against later treasury activity.
-- This sale is already included in Caja's recorded inflows. Its balance was
-- moved again from the bank when the imported sale's destination was edited.
do $reconcile$
declare
  caja public.activos_liquidos%rowtype;
  banco public.activos_liquidos%rowtype;
  importe numeric := 159500000;
begin
  select * into caja from public.activos_liquidos where activo = 'EFECTIVO-CAJA' and saldo_cop = 318600000 for update;
  select * into banco from public.activos_liquidos where activo = 'COINSENDA-KAUPALOKI' and saldo_cop = 199408020 for update;
  if caja.id is not null and banco.id is not null
    and caja.ingresos_cop - caja.egresos_cop = caja.saldo_cop - importe
    and banco.ingresos_cop - banco.egresos_cop = banco.saldo_cop + importe
    and exists (
      select 1 from public.ventas_usdt
      where codigo = 'COP-06-11-26-0013' and total_cop = importe and destino_fondos_id = caja.id::text
    ) then
    update public.activos_liquidos
    set saldo_cop = case when id = caja.id then saldo_cop - importe else saldo_cop + importe end
    where id in (caja.id, banco.id);
    update public.gastos set monto=monto where false;
  end if;
end;
$reconcile$;
