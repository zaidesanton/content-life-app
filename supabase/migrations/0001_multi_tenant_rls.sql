-- =============================================================================
-- 0001_multi_tenant_rls.sql
-- =============================================================================
-- Converts the previously single-tenant schema into a per-user multi-tenant one
-- protected by Postgres Row Level Security (RLS).
--
-- For each app table (tasks, recurring_tasks, diary_entries, linkedin_posts,
-- task_date_changes) this migration:
--   1. Adds a `user_id uuid` column (FK -> auth.users, cascade on delete) that
--      defaults to auth.uid() so newly inserted rows are auto-owned by the
--      authenticated caller.
--   2. Backfills all existing (pre-migration) rows to the sole existing user,
--      Anton (anton@manager.dev), since the data predates ownership tracking.
--   3. Enables RLS on the table.
--   4. Creates select / insert / update / delete policies that restrict every
--      operation to rows where auth.uid() = user_id.
--
-- HOW TO RUN: paste this whole file once into the Supabase SQL editor and run
-- it (it is safe to re-run — columns use IF NOT EXISTS and every policy is
-- dropped before being recreated). The ordering matters: each table is fully
-- backfilled BEFORE RLS is enabled on it, so the backfill UPDATE is not blocked
-- by the new policies.
--
-- NOTE: after RLS is enabled, the public anon key can no longer read/write
-- these tables unless a request carries a valid logged-in session (auth.uid()).
-- The app must use the authenticated server client (createSupabaseServerClient)
-- for all server-side data access — which the accompanying code change does.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
alter table tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update tasks
  set user_id = (select id from auth.users where email = 'anton@manager.dev' limit 1)
  where user_id is null;

alter table tasks enable row level security;

drop policy if exists "tasks_select_own" on tasks;
create policy "tasks_select_own" on tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on tasks;
create policy "tasks_insert_own" on tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on tasks;
create policy "tasks_update_own" on tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on tasks;
create policy "tasks_delete_own" on tasks
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- recurring_tasks
-- -----------------------------------------------------------------------------
alter table recurring_tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update recurring_tasks
  set user_id = (select id from auth.users where email = 'anton@manager.dev' limit 1)
  where user_id is null;

alter table recurring_tasks enable row level security;

drop policy if exists "recurring_tasks_select_own" on recurring_tasks;
create policy "recurring_tasks_select_own" on recurring_tasks
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_tasks_insert_own" on recurring_tasks;
create policy "recurring_tasks_insert_own" on recurring_tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_tasks_update_own" on recurring_tasks;
create policy "recurring_tasks_update_own" on recurring_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_tasks_delete_own" on recurring_tasks;
create policy "recurring_tasks_delete_own" on recurring_tasks
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- diary_entries
-- -----------------------------------------------------------------------------
alter table diary_entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update diary_entries
  set user_id = (select id from auth.users where email = 'anton@manager.dev' limit 1)
  where user_id is null;

alter table diary_entries enable row level security;

drop policy if exists "diary_entries_select_own" on diary_entries;
create policy "diary_entries_select_own" on diary_entries
  for select using (auth.uid() = user_id);

drop policy if exists "diary_entries_insert_own" on diary_entries;
create policy "diary_entries_insert_own" on diary_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "diary_entries_update_own" on diary_entries;
create policy "diary_entries_update_own" on diary_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "diary_entries_delete_own" on diary_entries;
create policy "diary_entries_delete_own" on diary_entries
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- linkedin_posts
-- -----------------------------------------------------------------------------
alter table linkedin_posts
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update linkedin_posts
  set user_id = (select id from auth.users where email = 'anton@manager.dev' limit 1)
  where user_id is null;

alter table linkedin_posts enable row level security;

drop policy if exists "linkedin_posts_select_own" on linkedin_posts;
create policy "linkedin_posts_select_own" on linkedin_posts
  for select using (auth.uid() = user_id);

drop policy if exists "linkedin_posts_insert_own" on linkedin_posts;
create policy "linkedin_posts_insert_own" on linkedin_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "linkedin_posts_update_own" on linkedin_posts;
create policy "linkedin_posts_update_own" on linkedin_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "linkedin_posts_delete_own" on linkedin_posts;
create policy "linkedin_posts_delete_own" on linkedin_posts
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- task_date_changes
-- -----------------------------------------------------------------------------
alter table task_date_changes
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update task_date_changes
  set user_id = (select id from auth.users where email = 'anton@manager.dev' limit 1)
  where user_id is null;

alter table task_date_changes enable row level security;

drop policy if exists "task_date_changes_select_own" on task_date_changes;
create policy "task_date_changes_select_own" on task_date_changes
  for select using (auth.uid() = user_id);

drop policy if exists "task_date_changes_insert_own" on task_date_changes;
create policy "task_date_changes_insert_own" on task_date_changes
  for insert with check (auth.uid() = user_id);

drop policy if exists "task_date_changes_update_own" on task_date_changes;
create policy "task_date_changes_update_own" on task_date_changes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_date_changes_delete_own" on task_date_changes;
create policy "task_date_changes_delete_own" on task_date_changes
  for delete using (auth.uid() = user_id);
