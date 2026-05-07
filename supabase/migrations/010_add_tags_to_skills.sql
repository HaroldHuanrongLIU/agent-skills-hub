-- Add normalized tags[] column to skills + GIN index for fast scenario matching
--
-- WHY:
--   Existing `topics` column = raw GitHub topics (free-form, ~10K distinct values:
--   "ai-tools", "agent-tools", "ai_agent", "agents", "agent_tools", ...).
--   Keyword matching against this is noisy — same concept appears under 5+ spellings.
--
--   `tags` = curated, normalized taxonomy (~50 controlled values: "mcp", "memory",
--   "browser", "rag", "voice", "skill", "framework", "cli", "vector-db", "embedding",
--   "code-agent", ...). Computed at sync time from topics + category + language +
--   readme-keyword extraction. Used by scenario matcher with high weight (+10) to
--   improve match precision and reduce reliance on noisy keyword scans.
--
-- SECURITY IMPACT:
--   None. Adds a nullable column with no PII. RLS policies on `skills` are unchanged.
--   Anon role keeps SELECT-only access (existing policy).
--
-- ROLLBACK:
--   ALTER TABLE skills DROP COLUMN IF EXISTS tags;
--   DROP INDEX IF EXISTS skills_tags_gin;

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for `tags @> ARRAY['mcp']` and `tags && ARRAY['mcp','memory']` queries.
CREATE INDEX IF NOT EXISTS skills_tags_gin ON skills USING gin(tags);

COMMENT ON COLUMN skills.tags IS
  'Normalized taxonomy tags (~50 controlled values). Computed at sync time. Empty array = un-tagged.';
