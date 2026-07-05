-- =============================================================================
-- 0007_drop_recurring_instance_rows.sql   (CLEANUP — run LAST, after verifying)
-- =============================================================================
-- Removes the now-dead pre-materialized recurring instance rows from `tasks`.
-- After 0006 + the new code deploy, recurring occurrences are generated from
-- rules and these rows are never read (page.tsx and the digests both filter
-- `recurring_task_id is null` for one-off tasks). Their completed/skipped history
-- was already copied into recurring_exceptions by 0006's backfill.
--
-- ⚠️ DO NOT RUN until:
--   1. 0006 has been applied,
--   2. the new code is deployed to prod, and
--   3. you've confirmed the app + digests look right.
-- Running it earlier would make the OLD (still-deployed) code show no recurring
-- tasks. It is the final, one-way step.
-- =============================================================================

delete from public.tasks
where recurring_task_id is not null;
