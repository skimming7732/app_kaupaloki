-- Preserve the original audit data; only administrators may edit operation fields.
grant update (fecha, divisa_codigo, origen_fondos_id, valor_comprado, usdt_comprado, wallet_destino_id, wallet_destino)
  on public.compras_usdt to authenticated;
grant update (fecha, concepto, wallet_origen_id, usdt_vendido, tasa, destino_fondos_id, wallet_origen, destino_fondos_nombre)
  on public.ventas_usdt to authenticated;
create policy staff_edit_usdt on public.compras_usdt for update to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'));
create policy staff_edit_usdt on public.ventas_usdt for update to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'));

-- Use the same lock as new operations, before taking any operation row locks.
create trigger bloquear_edicion_usdt before update on public.compras_usdt
  for each statement execute function kaupaloki_private.bloquear_operacion_usdt();
create trigger bloquear_edicion_usdt before update on public.ventas_usdt
  for each statement execute function kaupaloki_private.bloquear_operacion_usdt();

create function kaupaloki_private.editar_saldos_usdt() returns trigger
language plpgsql security definer set search_path = ''
as $edit$
declare
  old_src text; new_src text; old_dst text; new_dst text;
  old_currency text; new_currency text; dst_currency text;
  old_debit numeric; new_debit numeric; old_credit numeric; new_credit numeric;
  movement record;
begin
  if tg_table_name = 'compras_usdt' then
    old_src := old.origen_fondos_id; new_src := new.origen_fondos_id;
    old_dst := old.wallet_destino_id; new_dst := new.wallet_destino_id;
    old_currency := old.divisa_codigo; new_currency := new.divisa_codigo; dst_currency := 'USDT';
    old_debit := old.valor_comprado; new_debit := new.valor_comprado;
    old_credit := old.usdt_comprado; new_credit := new.usdt_comprado;
  else
    old_src := old.wallet_origen_id; new_src := new.wallet_origen_id;
    old_dst := old.destino_fondos_id; new_dst := new.destino_fondos_id;
    old_currency := 'USDT'; new_currency := 'USDT'; dst_currency := 'COP';
    old_debit := old.usdt_vendido; new_debit := new.usdt_vendido;
    old_credit := old.total_cop; new_credit := new.usdt_vendido * new.tasa;
  end if;

  if new_debit is null or new_debit <= 0 or new_credit is null or new_credit <= 0
     or new_currency is null or new.fecha is null then
    raise exception 'Ingresa montos positivos y una fecha válida.';
  end if;
  if tg_table_name = 'compras_usdt' then
    if (new_debit, new_credit) is distinct from (old_debit, old_credit) then
      new.tasa := new_debit / new_credit;
      new.costo := new_credit / new_debit;
    end if;
  elsif (new.usdt_vendido, new.tasa) is distinct from (old.usdt_vendido, old.tasa) then
    new.total_cop := new_credit;
  else
    new_credit := old_credit;
  end if;

  -- Imported operations were not posted by the balance trigger. Never assign
  -- new accounts implicitly or reverse balances that were not booked here.
  if old_src is null or old_dst is null then
    if (old_src, old_dst) is distinct from (new_src, new_dst) then
      raise exception 'Las cuentas de un registro histórico no se pueden reasignar.';
    end if;
    return new;
  end if;

  if new_src is null or new_dst is null or new_src = new_dst then
    raise exception 'Selecciona un origen y destino válidos e ingresa montos positivos.';
  end if;
  -- Apply only the net change to each account, atomically with the edit.
  for movement in
    select account_id, currency, sum(delta) amount
    from (values (old_src, old_currency, old_debit), (old_dst, dst_currency, -old_credit),
                 (new_src, new_currency, -new_debit), (new_dst, dst_currency, new_credit)) m(account_id, currency, delta)
    group by account_id, currency having sum(delta) <> 0
    order by currency, account_id
  loop
    if movement.currency = 'USDT' then
      update public.activos_digitales
      set saldo_real=coalesce(saldo_real,saldo_usdt,0)+movement.amount,
          saldo_usdt=coalesce(saldo_usdt,0)+movement.amount
      where id::text=movement.account_id and (movement.amount > 0 or coalesce(saldo_real,saldo_usdt,0)+movement.amount >= 0);
    else
      update public.activos_liquidos
      set saldo_real=coalesce(saldo_real,saldo_cop,0)+movement.amount,
          saldo_cop=coalesce(saldo_cop,0)+movement.amount
      where id::text=movement.account_id and coalesce(divisa,'COP')=movement.currency
        and (movement.amount > 0 or coalesce(saldo_real,saldo_cop,0)+movement.amount >= 0);
    end if;
    if not found then raise exception 'El ajuste supera el saldo disponible o la cuenta ya no está disponible.'; end if;
  end loop;
  return new;
end;
$edit$;
revoke all on function kaupaloki_private.editar_saldos_usdt() from public, anon, authenticated;
create trigger editar_saldos_usdt before update on public.compras_usdt
  for each row execute function kaupaloki_private.editar_saldos_usdt();
create trigger editar_saldos_usdt before update on public.ventas_usdt
  for each row execute function kaupaloki_private.editar_saldos_usdt();

-- Link only the caller's uploaded file and distinguish missing rows from concurrent edits.
create or replace function public.guardar_comprobante_dashboard(p_table text,p_id uuid,p_receipt text,p_previous text) returns void
language plpgsql security definer set search_path = ''
as $receipt$
declare
  actor text := coalesce(kaupaloki_private.staff_role(),'');
  current_receipt text;
  object_path text := substr(p_receipt,9);
begin
  if p_table is null or p_table not in ('gastos','dispersiones') then raise invalid_parameter_value; end if;
  if auth.uid() is null or (actor not in ('administrador','super_admin') and not (p_table='dispersiones' and actor='dispersor')) then
    raise insufficient_privilege;
  end if;
  if p_receipt is null or split_part(p_receipt,'/',1) <> 'storage:' || p_table
     or split_part(p_receipt,'/',2) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id='comprobantes' and name=object_path and owner_id::text=auth.uid()::text)
  then raise exception 'Archivo no disponible' using errcode='22023'; end if;

  if p_table='dispersiones' then
    select comprobante_url into current_receipt from public.dispersiones where id=p_id for update;
  else
    select comprobante_url into current_receipt from public.gastos where id=p_id for update;
  end if;
  if not found then raise exception 'Registro no encontrado' using errcode='P0002'; end if;
  if current_receipt=p_receipt then return; end if;
  if nullif(btrim(current_receipt),'') is distinct from nullif(btrim(p_previous),'') then
    raise exception 'El comprobante cambió' using errcode='40001';
  end if;
  if p_table='dispersiones' then
    update public.dispersiones set comprobante_url=p_receipt,tiene_comprobante=true where id=p_id;
  else
    update public.gastos set comprobante_url=p_receipt where id=p_id;
  end if;
end;
$receipt$;
notify pgrst, 'reload schema';
