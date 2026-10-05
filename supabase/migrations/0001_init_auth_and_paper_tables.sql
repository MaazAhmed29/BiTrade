-- BiTrade initial schema: user profiles, paper accounts, holdings, trades, AI action logs.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  initial_balance numeric not null default 10000 check (initial_balance = 10000),
  cash_balance numeric not null default 10000 check (cash_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  average_entry_price numeric not null default 0,
  realized_pnl numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  execution_price numeric not null check (execution_price > 0),
  notional_value numeric not null,
  fee numeric not null default 0,
  cash_change numeric not null,
  source text not null check (source in ('manual', 'ai')),
  status text not null check (status in ('filled', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null,
  asset_id text,
  side text check (side in ('buy', 'sell')),
  quantity numeric,
  quote_amount numeric,
  status text not null,
  user_approved boolean not null default false,
  created_at timestamptz not null default now(),
  executed_trade_id uuid references public.trades (id),
  metadata jsonb
);

create index if not exists trades_user_created_idx on public.trades (user_id, created_at desc);
create index if not exists ai_action_logs_user_created_idx on public.ai_action_logs (user_id, created_at desc);
create index if not exists holdings_user_idx on public.holdings (user_id);

-- updated_at maintenance

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists paper_accounts_set_updated_at on public.paper_accounts;
create trigger paper_accounts_set_updated_at
  before update on public.paper_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists holdings_set_updated_at on public.holdings;
create trigger holdings_set_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

-- One time account initialization on signup: profile plus $10,000 paper account.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));

  if v_username is null or char_length(v_username) < 3 or char_length(v_username) > 24 then
    raise exception 'username must be between 3 and 24 characters';
  end if;

  insert into public.profiles (id, username)
  values (new.id, v_username);

  insert into public.paper_accounts (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Idempotent fallback initialization for authenticated users created before the trigger existed.

create or replace function public.initialize_paper_account()
returns table (account_id uuid, cash numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, username)
  values (v_uid, 'user_' || substr(md5(v_uid::text), 1, 8))
  on conflict (id) do nothing;

  insert into public.paper_accounts (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  return query
  select pa.id, pa.cash_balance
  from public.paper_accounts pa
  where pa.user_id = v_uid;
end;
$$;

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.paper_accounts enable row level security;
alter table public.holdings enable row level security;
alter table public.trades enable row level security;
alter table public.ai_action_logs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists paper_accounts_select_own on public.paper_accounts;
create policy paper_accounts_select_own
  on public.paper_accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists holdings_select_own on public.holdings;
create policy holdings_select_own
  on public.holdings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists trades_select_own on public.trades;
create policy trades_select_own
  on public.trades for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ai_action_logs_select_own on public.ai_action_logs;
create policy ai_action_logs_select_own
  on public.ai_action_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);
