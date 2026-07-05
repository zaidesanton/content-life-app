-- =============================================================================
-- 0006_recurrence_rule_model.sql   (NON-DESTRUCTIVE — no rows deleted)
-- =============================================================================
-- Moves recurring tasks from "pre-materialized instance rows" to a proper
-- calendar model: a RULE (recurring_tasks) + per-occurrence EXCEPTIONS
-- (recurring_exceptions). page.tsx expands the rule over the visible window and
-- overlays exceptions at render time — nothing is written on read, so series
-- can never "run out".
--
-- What changes:
--   1. recurring_tasks gains  frequency ('weekly'|'daily'), starts_on, ends_on.
--   2. New table recurring_exceptions: overrides for a single occurrence
--      (completed / skipped / moved / retitled / renoted).
--   3. Backfill:
--        a. Every recurring_task_id that only exists on tasks rows (orphan, no
--           template) gets a template synthesized from a representative row —
--           so nothing referenced by an instance loses its rule.
--        b. starts_on = earliest instance date per template.
--        c. Every RESOLVED instance (completed_date or skipped_date set) becomes
--           an exception, so history survives when the placeholder rows are
--           later dropped (that cleanup is a separate, gated migration 0007).
--   4. RLS: owner full CRUD on recurring_exceptions; bot gets read-only on
--      Anton's exceptions (digests need to see completed/skipped occurrences).
--
-- Placeholder instance rows in `tasks` are LEFT IN PLACE (the new code ignores
-- them; old code still reads them, so rollback is safe). 0007 removes them.
--
-- Atomic do-block — cannot half-apply. Safe to re-run.
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  -- 1. Rule columns on recurring_tasks -----------------------------------------
  alter table public.recurring_tasks
    add column if not exists frequency text not null default 'weekly',
    add column if not exists starts_on date,
    add column if not exists ends_on   date;

  -- constrain frequency to the two shapes we support
  alter table public.recurring_tasks
    drop constraint if exists recurring_tasks_frequency_chk;
  alter table public.recurring_tasks
    add  constraint recurring_tasks_frequency_chk
         check (frequency in ('weekly', 'daily'));

  -- 2. recurring_exceptions -----------------------------------------------------
  create table if not exists public.recurring_exceptions (
    id                uuid primary key default gen_random_uuid(),
    recurring_task_id uuid not null references public.recurring_tasks(id) on delete cascade,
    occurrence_date   date not null,            -- the rule-generated date this overrides
    completed_date    date,
    skipped_date      date,
    moved_to_date     date,                     -- if set, show occurrence on this date instead
    title             text,                     -- per-instance title override
    description       text,                     -- per-instance note override
    task_type         text,                     -- per-instance type override
    user_id           uuid not null default auth.uid(),
    unique (recurring_task_id, occurrence_date)
  );

  -- 3a. Synthesize templates for orphan series (instances with no rule) --------
  --     One template per orphan recurring_task_id, built from its most recent
  --     instance. Weekly on that instance's weekday (each orphan series in the
  --     current data is single-weekday, so this preserves behaviour exactly).
  insert into public.recurring_tasks (id, title, bucket, task_type, description,
                                      recurrence_day, frequency, user_id)
  select distinct on (t.recurring_task_id)
         t.recurring_task_id,
         t.title, t.bucket, t.task_type, t.description,
         extract(dow from t.due_date)::int,
         'weekly',
         t.user_id
  from public.tasks t
  where t.recurring_task_id is not null
    and not exists (select 1 from public.recurring_tasks r where r.id = t.recurring_task_id)
  order by t.recurring_task_id, t.due_date desc
  on conflict (id) do nothing;

  -- 3b. starts_on = earliest instance date (fallback: a fixed past date) -------
  update public.recurring_tasks r
     set starts_on = coalesce(
           (select min(t.due_date) from public.tasks t where t.recurring_task_id = r.id),
           date '2025-01-01')
   where r.starts_on is null;

  -- 3c. Backfill exceptions from every resolved instance -----------------------
  insert into public.recurring_exceptions
         (recurring_task_id, occurrence_date, completed_date, skipped_date, user_id)
  select t.recurring_task_id, t.due_date, t.completed_date, t.skipped_date, t.user_id
  from public.tasks t
  where t.recurring_task_id is not null
    and (t.completed_date is not null or t.skipped_date is not null)
  on conflict (recurring_task_id, occurrence_date) do update
     set completed_date = excluded.completed_date,
         skipped_date   = excluded.skipped_date;

  -- 4. RLS on recurring_exceptions ---------------------------------------------
  alter table public.recurring_exceptions enable row level security;

  -- owner: full CRUD on own rows
  drop policy if exists rex_owner_select on public.recurring_exceptions;
  drop policy if exists rex_owner_insert on public.recurring_exceptions;
  drop policy if exists rex_owner_update on public.recurring_exceptions;
  drop policy if exists rex_owner_delete on public.recurring_exceptions;
  create policy rex_owner_select on public.recurring_exceptions
    for select using (auth.uid() = user_id);
  create policy rex_owner_insert on public.recurring_exceptions
    for insert with check (auth.uid() = user_id);
  create policy rex_owner_update on public.recurring_exceptions
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy rex_owner_delete on public.recurring_exceptions
    for delete using (auth.uid() = user_id);

  -- bot: read-only on Anton's exceptions (needed for the daily digests)
  drop policy if exists rex_agent_select_anton on public.recurring_exceptions;
  execute format(
    'create policy rex_agent_select_anton on public.recurring_exceptions
       for select using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );

  -- bot also needs to READ Anton's recurring_tasks rules to expand the digest
  drop policy if exists recurring_agent_select_anton on public.recurring_tasks;
  execute format(
    'create policy recurring_agent_select_anton on public.recurring_tasks
       for select using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
end $$;
