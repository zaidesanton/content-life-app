-- =============================================================================
-- 0009_agent_recurring_management.sql
-- =============================================================================
-- Anton asked Bot to manage his recurring tasks going forward (e.g. "remove the
-- daily LinkedIn posts but keep the completed ones"). Until now Bot only had
-- INSERT + SELECT on Anton's data (0003/0004/0006) — deliberately no way to
-- modify or remove his rows.
--
-- This grants Bot UPDATE + DELETE on Anton's recurring tables and one-off tasks,
-- still tightly scoped: the policy only matches rows where the caller IS the bot
-- user AND the row belongs to Anton. Bot can now:
--   • set ends_on on a recurring rule (retire a series WITHOUT deleting history),
--   • edit a rule's title/description/schedule,
--   • complete / skip / move / edit occurrences via recurring_exceptions,
--   • complete / skip / edit / remove one-off tasks.
--
-- Note on "retire, don't delete": to stop a recurring series while preserving
-- every completed record, Bot sets recurring_tasks.ends_on to a past date rather
-- than deleting the rule (a delete would cascade recurring_exceptions). DELETE is
-- granted for genuine removals, but retirement via ends_on is the default.
--
-- Safe to re-run (policies dropped before create).
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  -- recurring_tasks: update (set ends_on / edit rule) + delete
  drop policy if exists recurring_agent_update_anton on public.recurring_tasks;
  execute format(
    'create policy recurring_agent_update_anton on public.recurring_tasks
       for update using (auth.uid() = %L::uuid and user_id = %L::uuid)
                  with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton, bot, anton
  );
  drop policy if exists recurring_agent_delete_anton on public.recurring_tasks;
  execute format(
    'create policy recurring_agent_delete_anton on public.recurring_tasks
       for delete using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );

  -- recurring_exceptions: insert (override an occurrence) + update + delete
  drop policy if exists rex_agent_insert_anton on public.recurring_exceptions;
  execute format(
    'create policy rex_agent_insert_anton on public.recurring_exceptions
       for insert with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
  drop policy if exists rex_agent_update_anton on public.recurring_exceptions;
  execute format(
    'create policy rex_agent_update_anton on public.recurring_exceptions
       for update using (auth.uid() = %L::uuid and user_id = %L::uuid)
                  with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton, bot, anton
  );
  drop policy if exists rex_agent_delete_anton on public.recurring_exceptions;
  execute format(
    'create policy rex_agent_delete_anton on public.recurring_exceptions
       for delete using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );

  -- tasks: update (complete / skip / edit) + delete one-off tasks
  drop policy if exists tasks_agent_update_anton on public.tasks;
  execute format(
    'create policy tasks_agent_update_anton on public.tasks
       for update using (auth.uid() = %L::uuid and user_id = %L::uuid)
                  with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton, bot, anton
  );
  drop policy if exists tasks_agent_delete_anton on public.tasks;
  execute format(
    'create policy tasks_agent_delete_anton on public.tasks
       for delete using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
end $$;
