-- 013_fix_get_masters_perf.sql
-- Date: 2026-06-03
-- Issue: get_masters() RPC consistently times out (57014 statement_timeout).
-- Root cause: per-master LATERAL JOIN against full 95K skills table with
-- OR + jsonb_array_elements_text() that no index can serve.
-- Diagnosis: 13 masters × 95K row scan × 2 (masters + emerging) ≈ 2.5M
-- per-call row reads. Grows linearly with skills table.
--
-- Fix: pre-aggregate per-master stats into materialized view; rewrite
-- get_masters() to JOIN the MV (O(13) instead of O(13 × N_skills)).
-- Add refresh function called by sync_runner Phase 7 (every 8h).

-- Allow the initial MV build to take however long it needs.
SET LOCAL statement_timeout = 0;

-- ----------------------------------------------------------------------------
-- 1) Pre-aggregated stats per master (one row per master.github)
-- ----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_master_aggregates AS
SELECT
  sm.github,
  COALESCE(SUM(s.stars), 0)::bigint                              AS total_stars,
  COUNT(s.id)::int                                               AS skill_count,
  ROUND(AVG(NULLIF(s.score, 0))::numeric, 1)                     AS avg_score
FROM skill_masters sm
LEFT JOIN skills s ON (
  s.author_name = sm.github
  OR s.author_name = ANY(
       SELECT jsonb_array_elements_text(sm.github_aliases::jsonb)
     )
)
GROUP BY sm.github;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_master_agg_github_idx
  ON mv_master_aggregates(github);

-- ----------------------------------------------------------------------------
-- 2) Rewrite get_masters() to use MV
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_masters()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'masters', COALESCE((
      SELECT json_agg(row_to_json(m))
      FROM (
        SELECT
          sm.github,
          sm.name,
          sm.x_handle,
          sm.bio,
          sm.tags::json                        AS tags,
          sm.github_aliases::json              AS github_aliases,
          sm.x_followers,
          sm.x_posts_count,
          sm.x_notes,
          COALESCE(mv.total_stars, 0)          AS total_stars,
          COALESCE(mv.skill_count, 0)          AS skill_count,
          COALESCE(mv.avg_score, 0)            AS avg_score,
          TRUE                                  AS is_verified
        FROM skill_masters sm
        LEFT JOIN mv_master_aggregates mv ON mv.github = sm.github
        WHERE sm.is_active = TRUE
          AND (sm.x_followers >= 1000 OR sm.force_verified = TRUE)
        ORDER BY sm.x_followers DESC
      ) m
    ), '[]'::json),
    'emerging', COALESCE((
      SELECT json_agg(row_to_json(e))
      FROM (
        SELECT
          sm.github,
          sm.name,
          sm.x_handle,
          sm.bio,
          sm.tags::json                        AS tags,
          sm.github_aliases::json              AS github_aliases,
          sm.x_followers,
          sm.x_posts_count,
          sm.x_notes,
          COALESCE(mv.total_stars, 0)          AS total_stars,
          COALESCE(mv.skill_count, 0)          AS skill_count,
          COALESCE(mv.avg_score, 0)            AS avg_score,
          FALSE                                 AS is_verified
        FROM skill_masters sm
        LEFT JOIN mv_master_aggregates mv ON mv.github = sm.github
        WHERE sm.is_active = TRUE
          AND sm.x_followers < 1000
          AND sm.force_verified = FALSE
        ORDER BY mv.total_stars DESC NULLS LAST
        LIMIT 20
      ) e
    ), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3) Refresh helper (called by sync_runner after Phase 6)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_master_aggregates()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_master_aggregates;
$$;

-- Grant execute to anon + authenticated so callers via PostgREST can refresh
-- (the function itself is idempotent and rate-limited by REFRESH semantics)
GRANT EXECUTE ON FUNCTION refresh_master_aggregates() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_masters()              TO anon, authenticated, service_role;

-- Force PostgREST to reload its schema cache so the rewritten function
-- is visible immediately (otherwise stale signature can be cached up to 10 min).
NOTIFY pgrst, 'reload schema';
