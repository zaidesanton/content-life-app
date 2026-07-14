-- =============================================================================
-- 0011_bot_tasks.sql
-- =============================================================================
-- A SHARED task board for Bot (the NanoClaw agent). Distinct from Anton's own
-- `tasks` on purpose: Bot's work has finer time granularity — hourly jobs,
-- tasks pinned to a specific time, recurring infra cadences — which don't fit
-- the day-bucketed personal task model. Keeping them in their own table (and a
-- dedicated "Bot" tab in the UI) avoids mixing the two.
--
-- This table is the SOURCE OF TRUTH for what Bot is doing and when:
--   • Anton assigns Bot a task here (created_by = 'anton').
--   • Bot assigns itself tasks + mirrors its schedule here (created_by = 'bot').
--   • Bot writes status / last_run / next_run back after each run so the app
--     always reflects reality.
--
-- Both people work this one board, so RLS is symmetric: Anton and the bot user
-- both get full CRUD. (Only these two accounts ever authenticate against the
-- app, so "authenticated in {anton,bot}" is the whole world.)
--
-- Columns:
--   status         queued | scheduled | in_progress | done | cancelled
--   scheduled_for  full timestamptz (date + time); null = "whenever / no fixed time"
--   cadence        null = one-off; else a label like 'hourly'|'daily'|'weekly'|cron
--   next_run       for recurring: next fire time (Bot keeps this current)
--   last_run       last time Bot actually executed it
--   created_by     'anton' | 'bot' — who put it on the board
--   nanoclaw_task_id  link to the NanoClaw schedule that executes it (if any)
--   result         short note on the latest outcome
--
-- Safe to re-run.
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  create table if not exists public.bot_tasks (
    id               uuid primary key default gen_random_uuid(),
    title            text not null,
    description      text,
    status           text not null default 'queued',
    scheduled_for    timestamptz,
    cadence          text,
    next_run         timestamptz,
    last_run         timestamptz,
    created_by       text not null default 'bot',
    nanoclaw_task_id text,
    result           text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
  );

  create index if not exists bot_tasks_status_idx
    on public.bot_tasks (status, scheduled_for);
  create index if not exists bot_tasks_next_run_idx
    on public.bot_tasks (next_run);

  alter table public.bot_tasks enable row level security;

  -- Symmetric access for the two humans-of-record on this board.
  drop policy if exists bot_tasks_shared_select on public.bot_tasks;
  drop policy if exists bot_tasks_shared_insert on public.bot_tasks;
  drop policy if exists bot_tasks_shared_update on public.bot_tasks;
  drop policy if exists bot_tasks_shared_delete on public.bot_tasks;

  execute format(
    'create policy bot_tasks_shared_select on public.bot_tasks
       for select using (auth.uid() in (%L::uuid, %L::uuid))',
    anton, bot
  );
  execute format(
    'create policy bot_tasks_shared_insert on public.bot_tasks
       for insert with check (auth.uid() in (%L::uuid, %L::uuid))',
    anton, bot
  );
  execute format(
    'create policy bot_tasks_shared_update on public.bot_tasks
       for update using (auth.uid() in (%L::uuid, %L::uuid))
                  with check (auth.uid() in (%L::uuid, %L::uuid))',
    anton, bot, anton, bot
  );
  execute format(
    'create policy bot_tasks_shared_delete on public.bot_tasks
       for delete using (auth.uid() in (%L::uuid, %L::uuid))',
    anton, bot
  );
end $$;
