create policy cash_tokens_require_payment_on_insert
  on public.cash_tokens as restrictive for insert to authenticated
  with check (efectivo_id is not null);

create policy cash_tokens_require_payment_on_update
  on public.cash_tokens as restrictive for update to authenticated
  using (efectivo_id is not null)
  with check (efectivo_id is not null);
