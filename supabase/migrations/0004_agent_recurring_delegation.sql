-- =============================================================================
-- 0004_agent_delegation_expansion.sql
-- =============================================================================
-- Expands the create-only delegation from 0003 with two capabilities the agent
-- ("Bot") needs, WITHOUT giving it update/delete over Anton's data:
--
--   1. INSERT on public.recurring_tasks  — so Bot can create a recurring
--      template in Anton's account (e.g. "every Wednesday: send sponsor copy").
--      page.tsx (running as Anton) then generates the weekly instances.
--
--   2. SELECT on public.tasks            — so Bot can READ Anton's tasks to
--      send the daily digests (morning "due today" / evening "not completed").
--      Read-only: no update/delete policy is added, so Bot still can't complete
--      or change Anton's tasks — only list them.
--
-- Least privilege: create + read, never modify/delete Anton's rows.
-- Safe to re-run (policies dropped before create).
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  -- 1. recurring_tasks: create-only delegation (mirror of 0003 on tasks)
  drop policy if exists recurring_agent_insert_for_anton on public.recurring_tasks;
  execute format(
    'create policy recurring_agent_insert_for_anton on public.recurring_tasks
       for insert
       with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );

  -- 2. tasks: read-only delegation so Bot can send Anton his daily task digests
  drop policy if exists tasks_agent_select_anton on public.tasks;
  execute format(
    'create policy tasks_agent_select_anton on public.tasks
       for select
       using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
end $$;
