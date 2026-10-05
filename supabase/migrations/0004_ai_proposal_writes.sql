-- Phase 5: AI trade proposals live in ai_action_logs (status pending, then
-- rejected, expired, executed, or failed). The API writes these rows using the
-- caller's own JWT, so authenticated users need insert and update rights on
-- their own rows only. Row Level Security keeps every user's logs private, and
-- every proposal transition is validated server side before it is written.

drop policy if exists ai_action_logs_insert_own on public.ai_action_logs;
create policy ai_action_logs_insert_own
  on public.ai_action_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists ai_action_logs_update_own on public.ai_action_logs;
create policy ai_action_logs_update_own
  on public.ai_action_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant insert, update on public.ai_action_logs to authenticated;
