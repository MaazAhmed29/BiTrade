-- Explicit Data API grants for BiTrade tables and functions.
-- New Supabase projects do not always inherit default privileges, and RLS remains
-- the actual row level protection for every table.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles to anon, authenticated, service_role;
grant select on public.paper_accounts to anon, authenticated, service_role;
grant select on public.holdings to anon, authenticated, service_role;
grant select on public.trades to anon, authenticated, service_role;
grant select on public.ai_action_logs to anon, authenticated, service_role;

grant execute on function public.initialize_paper_account() to authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.set_updated_at() to service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
