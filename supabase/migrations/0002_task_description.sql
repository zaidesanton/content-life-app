-- =============================================================================
-- 0002_task_description.sql
-- =============================================================================
-- Adds a free-text `description` column to tasks (and their recurring templates)
-- so a task can carry notes / details beyond its one-line title.
--
-- Safe to re-run (add column IF NOT EXISTS). RLS from 0001 already covers these
-- tables, so no policy changes are needed — the new column inherits row access.
-- =============================================================================

alter table public.tasks            add column if not exists description text;
alter table public.recurring_tasks  add column if not exists description text;
