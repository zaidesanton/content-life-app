-- =============================================================================
-- 0003_agent_task_delegation.sql
-- =============================================================================
-- Lets the agent ("Bot") create tasks in Anton's account WITHOUT giving it read,
-- update or delete access to Anton's data.
--
-- After 0001, every table is per-user (auth.uid() = user_id). The agent signs in
-- as its own auth user (bot-test) and normally only sees/edits its own rows.
-- This adds ONE extra INSERT policy: the bot user may insert task rows whose
-- user_id is Anton's — i.e. hand a task to Anton — but the SELECT/UPDATE/DELETE
-- policies are unchanged, so the bot still cannot read, complete or delete any of
-- Anton's tasks. Minimal privilege: create-only delegation.
--
-- If the two UUIDs below ever change (new Supabase project / re-created users),
-- update them. Safe to re-run (policy dropped before create).
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  drop policy if exists tasks_agent_insert_for_anton on public.tasks;
  execute format(
    'create policy tasks_agent_insert_for_anton on public.tasks
       for insert
       with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
end $$;
