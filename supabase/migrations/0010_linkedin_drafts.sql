-- =============================================================================
-- 0010_linkedin_drafts.sql
-- =============================================================================
-- A simple LinkedIn drafts store. Anton sends Bot some initial thoughts (and
-- often an inspiration link); Bot captures a draft here; Anton sees + edits it
-- in the content app under a new "Drafts" tab. Simpler than the old linkedin_posts
-- table that was dropped in 0008 — just a title, the content, an optional source
-- link, and a status.
--
-- RLS:
--   • owner (Anton) — full CRUD on his own drafts.
--   • bot (bot-test) — insert + select + update on Anton's drafts, so Bot can
--     capture new drafts and refine them, but not delete his work.
--
-- Safe to re-run.
-- =============================================================================

do $$
declare
  bot   uuid := '316c111d-16b1-4da6-8017-1c6ad65b87b5';  -- bot-test@manager.dev
  anton uuid := 'dbb2155a-0a1e-4a81-91e9-4a8505c7ff00';  -- anton@manager.dev
begin
  create table if not exists public.linkedin_drafts (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null default auth.uid(),
    title       text not null default 'Untitled draft',
    content     text not null default '',
    source_url  text,
    status      text not null default 'draft',   -- draft | ready | posted
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
  );

  create index if not exists linkedin_drafts_user_idx
    on public.linkedin_drafts (user_id, created_at desc);

  alter table public.linkedin_drafts enable row level security;

  -- owner: full CRUD
  drop policy if exists drafts_owner_select on public.linkedin_drafts;
  drop policy if exists drafts_owner_insert on public.linkedin_drafts;
  drop policy if exists drafts_owner_update on public.linkedin_drafts;
  drop policy if exists drafts_owner_delete on public.linkedin_drafts;
  create policy drafts_owner_select on public.linkedin_drafts
    for select using (auth.uid() = user_id);
  create policy drafts_owner_insert on public.linkedin_drafts
    for insert with check (auth.uid() = user_id);
  create policy drafts_owner_update on public.linkedin_drafts
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy drafts_owner_delete on public.linkedin_drafts
    for delete using (auth.uid() = user_id);

  -- bot: insert + select + update on Anton's drafts (no delete)
  drop policy if exists drafts_agent_insert_anton on public.linkedin_drafts;
  execute format(
    'create policy drafts_agent_insert_anton on public.linkedin_drafts
       for insert with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
  drop policy if exists drafts_agent_select_anton on public.linkedin_drafts;
  execute format(
    'create policy drafts_agent_select_anton on public.linkedin_drafts
       for select using (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton
  );
  drop policy if exists drafts_agent_update_anton on public.linkedin_drafts;
  execute format(
    'create policy drafts_agent_update_anton on public.linkedin_drafts
       for update using (auth.uid() = %L::uuid and user_id = %L::uuid)
                  with check (auth.uid() = %L::uuid and user_id = %L::uuid)',
    bot, anton, bot, anton
  );
end $$;
