-- SALDO_DIVISA identifies a purchase funded by the selected divisa, without
-- debiting a liquid account or another wallet.
grant update (tasa) on public.compras_usdt to authenticated;

create function kaupaloki_private.contabilizar_compra_usdt() returns trigger
language plpgsql security definer set search_path = ''
as $purchase$
declare
  old_src text; new_src text;
  old_dst text; new_dst text;
  old_currency text; new_currency text;
  old_debit numeric := 0; new_debit numeric := 0;
  old_credit numeric := 0; new_credit numeric := 0;
  historical boolean := false;
  movement record;
begin
  if tg_op <> 'INSERT' then
    old_src := old.origen_fondos_id;
    old_dst := old.wallet_destino_id;
    old_currency := old.divisa_codigo;
    old_debit := coalesce(old.valor_comprado, 0);
    old_credit := coalesce(old.usdt_comprado, 0);
    historical := old_src is null or old_dst is null;
  end if;

  if tg_op <> 'DELETE' then
    new_src := new.origen_fondos_id;
    new_dst := new.wallet_destino_id;
    new_currency := new.divisa_codigo;
    new_debit := new.valor_comprado;

    if new_debit is null or new_debit <= 0 or new_debit >= 'Infinity'::numeric
       or new_currency is null or new.fecha is null then
      raise exception 'Ingresa un monto positivo, una divisa y una fecha válida.';
    end if;
    if historical then
      if (old_src, old_dst) is distinct from (new_src, new_dst) then
        raise exception 'Las cuentas de un registro histórico no se pueden reasignar.';
      end if;
    elsif new_src is null or new_dst is null or new_src = new_dst then
      raise exception 'Selecciona un origen y una billetera de destino distintos.';
    end if;

    if tg_op = 'INSERT' or (new_debit, new.usdt_comprado, new.tasa)
         is distinct from (old_debit, old_credit, old.tasa) then
      -- Older clients sent the USDT amount on edits and let Postgres infer the rate.
      if tg_op = 'UPDATE' and new_src is distinct from 'SALDO_DIVISA'
         and new.tasa is not distinct from old.tasa
         and new.usdt_comprado > 0
         and (coalesce(new.tasa, 0) <= 0
              or abs(new.usdt_comprado - round(new_debit / nullif(new.tasa, 0), 6)) > 0.000001) then
        new.tasa := new_debit / new.usdt_comprado;
      end if;
      if new.tasa is null or new.tasa <= 0 or new.tasa >= 'Infinity'::numeric then
        raise exception 'Ingresa una tasa de compra positiva.';
      end if;
      if new_src = 'SALDO_DIVISA' then
        new.usdt_comprado := round(new_debit / new.tasa, 6);
      end if;
      if new.usdt_comprado is null or new.usdt_comprado <= 0 or new.usdt_comprado >= 'Infinity'::numeric then
        raise exception 'El monto calculado de USDT debe ser mayor que cero.';
      end if;
      new.costo := new.usdt_comprado / new_debit;
    end if;
    new_credit := new.usdt_comprado;
  end if;

  if not historical then
    for movement in
      select account_id, currency, sum(delta) amount
      from (values (nullif(old_src, 'SALDO_DIVISA'), old_currency, old_debit),
                   (old_dst, 'USDT', -old_credit),
                   (nullif(new_src, 'SALDO_DIVISA'), new_currency, -new_debit),
                   (new_dst, 'USDT', new_credit)) m(account_id, currency, delta)
      where account_id is not null
      group by account_id, currency having sum(delta) <> 0
      order by currency, account_id
    loop
      if movement.currency = 'USDT' then
        update public.activos_digitales
        set saldo_real = coalesce(saldo_real, saldo_usdt, 0) + movement.amount,
            saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount
        where id::text = movement.account_id
          and (movement.amount > 0 or coalesce(saldo_real, saldo_usdt, 0) + movement.amount >= 0);
      else
        update public.activos_liquidos
        set saldo_real = coalesce(saldo_real, saldo_cop, 0) + movement.amount,
            saldo_cop = coalesce(saldo_cop, 0) + movement.amount
        where id::text = movement.account_id and coalesce(divisa, 'COP') = movement.currency
          and (movement.amount > 0 or coalesce(saldo_real, saldo_cop, 0) + movement.amount >= 0);
      end if;
      if not found then
        raise exception 'El ajuste supera el saldo disponible o la cuenta ya no está disponible.';
      end if;
    end loop;
  end if;

  -- Apply the net change to the aggregate, keeping any imported opening total.
  -- Check the available amount on the same locked row that gets updated.
  for movement in
    select currency, sum(delta) amount
    from (values (old_currency, -old_debit), (new_currency, new_debit)) m(currency, delta)
    where currency is not null
    group by currency
    order by currency
  loop
    update public.divisas
    set total_comprado = greatest(0, coalesce(total_comprado, 0) + movement.amount),
        total_pendiente = greatest(0, coalesce(total_recibido, 0)
          - greatest(0, coalesce(total_comprado, 0) + movement.amount))
    where codigo = movement.currency
      and (new_src is distinct from 'SALDO_DIVISA' or movement.currency <> new_currency
           or coalesce(total_pendiente, 0) >= movement.amount);
    if not found and new_src = 'SALDO_DIVISA' and movement.currency = new_currency then
      raise exception 'El monto supera el saldo pendiente de la divisa %.', new_currency;
    end if;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$purchase$;
revoke all on function kaupaloki_private.contabilizar_compra_usdt() from public, anon, authenticated;

-- Sales continue to use their existing triggers and share the same operation lock.
drop trigger aplicar_saldos_usdt on public.compras_usdt;
drop trigger editar_saldos_usdt on public.compras_usdt;
drop trigger bloquear_operacion_usdt on public.compras_usdt;
drop trigger bloquear_edicion_usdt on public.compras_usdt;
create trigger bloquear_cambios_compra_usdt before insert or update or delete on public.compras_usdt
  for each statement execute function kaupaloki_private.bloquear_operacion_usdt();
create trigger contabilizar_compra_usdt before insert or update or delete on public.compras_usdt
  for each row execute function kaupaloki_private.contabilizar_compra_usdt();
