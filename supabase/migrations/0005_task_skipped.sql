-- =============================================================================
-- 0005_task_skipped.sql
-- =============================================================================
-- Adds a "won't do (but was planned)" status to tasks — distinct from deletion
-- and from completion.
--
-- Modeled as a nullable date, mirroring completed_date: null = not skipped,
-- a date = the day it was marked won't-do. A task is never both completed and
-- skipped (the server actions clear one when setting the other).
--
-- Works for recurring instances too: skipping a single generated instance just
-- sets skipped_date on that row. The row persists, so (a) the recurring series
-- is untouched and keeps generating future instances, and (b) page.tsx won't
-- regenerate this instance (its (recurring_task_id, due_date) key already exists).
--
-- Rollout: run BEFORE deploying the new code (the app selects this column).
-- Safe on current prod (old code ignores the extra column). Safe to re-run.
-- =============================================================================

alter table public.tasks add column if not exists skipped_date date;
