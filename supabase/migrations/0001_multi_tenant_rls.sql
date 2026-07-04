-- =============================================================================
-- 0001_multi_tenant_rls.sql
-- =============================================================================
-- Converts the previously single-tenant schema into a per-user multi-tenant one
-- protected by Postgres Row Level Security (RLS).
--
-- The whole migration is a single DO block so it runs as ONE atomic statement:
-- it either fully applies or fully rolls back, never half-way (an earlier
-- multi-statement version left some tables with a user_id column and others
-- without when the editor executed statement-by-statement).
--
-- For every app table (tasks, recurring_tasks, diary_entries, linkedin_posts,
-- task_date_changes) it:
--   1. Adds a `user_id uuid` column (FK -> auth.users, cascade on delete) that
--      defaults to auth.uid() so new rows are auto-owned by the caller.
--   2. Backfills all existing rows to the sole pre-existing user, Anton.
--   3. Enables RLS.
--   4. Drops EVERY existing policy on the table — the app used to read/write via
--      the public anon key, so a permissive `using (true)` policy already exists
--      and, because Postgres OR's permissive policies together, would otherwise
--      override the per-user policies and keep leaking every row to anon.
--   5. Creates per-user select/insert/update/delete policies (auth.uid() = user_id).
--
-- HOW TO RUN: paste this whole file once into the Supabase SQL editor and run.
-- Safe to re-run (add column IF NOT EXISTS; every policy dropped before create).
-- =============================================================================

do $$
declare
  t text;
  r record;
  anton uuid;
  tbls text[] := array['tasks','recurring_tasks','diary_entries','linkedin_posts','task_date_changes'];
begin
  select id into anton from auth.users where email = 'anton@manager.dev' limit 1;
  if anton is null then
    raise exception 'No auth.users row with email anton@manager.dev — fix the email before running';
  end if;

  -- 1-3. add user_id, backfill, enable RLS on each table
  foreach t in array tbls loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid()', t);
    execute format('update public.%I set user_id = %L where user_id is null', t, anton);
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- 4. drop ALL existing policies on those tables (removes leftover permissive ones)
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename = any(tbls)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;

  -- 5. create per-user policies
  foreach t in array tbls loop
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t||'_delete_own', t);
  end loop;
end $$;
