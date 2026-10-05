-- BiTrade paper trading engine: atomic trade execution with row locking and idempotency.

alter table public.trades
  add column if not exists execution_token uuid;

create unique index if not exists trades_execution_token_uidx
  on public.trades (execution_token)
  where execution_token is not null;

-- Executes one paper trade atomically.
-- The trusted execution price is supplied by the validated server route; the client price is never accepted.
-- Validation failures are recorded as rejected trade rows instead of exceptions so audit history is kept.
-- Locking order is always paper account, then holding, so concurrent trades serialize safely.
create or replace function public.execute_paper_trade(
  p_asset_id text,
  p_side text,
  p_quantity numeric,
  p_execution_price numeric,
  p_source text,
  p_execution_token uuid
)
returns table (
  trade_id uuid,
  trade_status text,
  trade_rejection_reason text,
  resulting_cash numeric,
  resulting_quantity numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cash numeric;
  v_existing_id uuid;
  v_existing_status text;
  v_existing_reason text;
  v_holding_id uuid;
  v_old_qty numeric := 0;
  v_old_avg numeric := 0;
  v_new_qty numeric;
  v_new_avg numeric;
  v_notional numeric;
  v_fee numeric := 0;
  v_cash_change numeric := 0;
  v_reason text := null;
  v_realized numeric;
  v_trade_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_side not in ('buy', 'sell') then
    raise exception 'invalid side';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;
  if p_execution_price is null or p_execution_price <= 0 then
    raise exception 'execution price must be positive';
  end if;
  if p_source not in ('manual', 'ai') then
    raise exception 'invalid source';
  end if;
  if p_execution_token is null then
    raise exception 'execution token is required';
  end if;

  -- Idempotency: a token can only ever produce one trade row.
  select t.id, t.status, t.rejection_reason
  into v_existing_id, v_existing_status, v_existing_reason
  from public.trades t
  where t.execution_token = p_execution_token and t.user_id = v_uid;

  if found then
    select coalesce(pa.cash_balance, 0) into v_cash
    from public.paper_accounts pa
    where pa.user_id = v_uid;
    v_new_qty := coalesce((
      select h.quantity
      from public.holdings h
      where h.user_id = v_uid and h.asset_id = p_asset_id
    ), 0);
    return query
      select v_existing_id, v_existing_status, v_existing_reason,
             coalesce(v_cash, 0), v_new_qty;
    return;
  end if;

  insert into public.paper_accounts (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select pa.cash_balance into v_cash
  from public.paper_accounts pa
  where pa.user_id = v_uid
  for update;

  if not found then
    raise exception 'paper account not found';
  end if;

  insert into public.holdings (user_id, asset_id, quantity, average_entry_price)
  values (v_uid, p_asset_id, 0, 0)
  on conflict (user_id, asset_id) do nothing;

  select h.id, h.quantity, h.average_entry_price
  into v_holding_id, v_old_qty, v_old_avg
  from public.holdings h
  where h.user_id = v_uid and h.asset_id = p_asset_id
  for update;

  if not found then
    raise exception 'holding row not found';
  end if;

  v_notional := round(p_quantity * p_execution_price, 8);

  if p_side = 'buy' then
    v_cash_change := -(v_notional + v_fee);
    if v_cash + v_cash_change < 0 then
      v_reason := 'Insufficient paper cash for this order.';
    elsif v_notional < 1 then
      v_reason := 'Order value is below the minimum of 1.00 dollar.';
    elsif v_notional > 100000000 then
      v_reason := 'Order exceeds the maximum allowed value.';
    end if;
  else
    if v_old_qty < p_quantity then
      v_reason := 'Insufficient holdings for this sale.';
    elsif v_notional > 100000000 then
      v_reason := 'Order exceeds the maximum allowed value.';
    else
      v_cash_change := v_notional - v_fee;
    end if;
  end if;

  if v_reason is not null then
    insert into public.trades (
      user_id, asset_id, side, quantity, execution_price, notional_value,
      fee, cash_change, source, status, rejection_reason, execution_token
    ) values (
      v_uid, p_asset_id, p_side, p_quantity, p_execution_price, v_notional,
      v_fee, 0, p_source, 'rejected', v_reason, p_execution_token
    ) returning id into v_trade_id;

    return query
      select v_trade_id, 'rejected'::text, v_reason, v_cash, v_old_qty;
    return;
  end if;

  update public.paper_accounts
  set cash_balance = cash_balance + v_cash_change
  where user_id = v_uid;

  if p_side = 'buy' then
    v_new_qty := v_old_qty + p_quantity;
    if v_old_qty = 0 then
      v_new_avg := p_execution_price;
    else
      v_new_avg := round(
        ((v_old_qty * v_old_avg) + (p_quantity * p_execution_price)) / v_new_qty,
        12
      );
    end if;

    update public.holdings
    set quantity = v_new_qty, average_entry_price = v_new_avg
    where id = v_holding_id;
  else
    v_new_qty := v_old_qty - p_quantity;
    v_realized := round((p_execution_price - v_old_avg) * p_quantity, 8);

    update public.holdings
    set quantity = v_new_qty,
        average_entry_price = case when v_new_qty = 0 then 0 else v_old_avg end,
        realized_pnl = realized_pnl + v_realized
    where id = v_holding_id;
  end if;

  insert into public.trades (
    user_id, asset_id, side, quantity, execution_price, notional_value,
    fee, cash_change, source, status, rejection_reason, execution_token
  ) values (
    v_uid, p_asset_id, p_side, p_quantity, p_execution_price, v_notional,
    v_fee, v_cash_change, p_source, 'filled', null, p_execution_token
  ) returning id into v_trade_id;

  return query
    select v_trade_id, 'filled'::text, null::text, v_cash + v_cash_change, v_new_qty;
end;
$$;

revoke execute on function public.execute_paper_trade(text, text, numeric, numeric, text, uuid) from public;
revoke execute on function public.execute_paper_trade(text, text, numeric, numeric, text, uuid) from anon;
grant execute on function public.execute_paper_trade(text, text, numeric, numeric, text, uuid) to authenticated;
grant execute on function public.execute_paper_trade(text, text, numeric, numeric, text, uuid) to service_role;
