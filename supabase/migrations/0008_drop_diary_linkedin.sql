-- =============================================================================
-- 0008_drop_diary_linkedin.sql   (CLEANUP — removes unused feature tables)
-- =============================================================================
-- The Diary and LinkedIn tabs (and the Newsletter/Capture placeholders) were
-- removed from the app — only Tasks remains. Their backing tables are no longer
-- read or written by any code, so drop them. RLS policies drop with the table.
--
-- ⚠️ One-way and destructive: this permanently deletes all diary_entries and
-- linkedin_posts data. Run only after the tabs-removal code is deployed.
-- (Capture/Newsletter/Posts had no tables — nothing to drop for them.)
-- =============================================================================

drop table if exists public.diary_entries cascade;
drop table if exists public.linkedin_posts cascade;
