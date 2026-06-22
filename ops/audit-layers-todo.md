# Audit Layers — Engineering TODO

Goal: turn the blog's "Coming soon / 待上线" roadmap into shipped layers, so we can drop the
"coming soon" tag and switch the report wording to present tense.

Two items, independent. **Item 1 (LLM) is the faster ship** (code exists, just wire + key).
**Item 2 (SkillSpector) is the bigger lift** but the higher-trust one (kills the unknown long tail).

Hard constraints (both):
- Respect [[dont-overload-supabase]]: run as a **separate scheduled job**, never overlapping sync/deploy;
  chunked per-batch commits; keyset pagination; small pages.
- Cost cap: LLM/deep scans run on a **bounded subset** (flagged / grey-zone / stars≥5 incremental), never the full 117K.
- Don't auto-chain the layers across the catalog (the spec's explicit warning).

---

## Item 1 — Enable LLM semantic review (Layer 1.5)

State: `backend/app/services/llm_security_analyzer.py` is built (`LLMSecurityAnalyzer`: `__init__(api_key, model="MiniMax-Text-01", base_url="https://api.minimax.chat/v1")`; methods `analyze_single`, `analyze_flagged(db)`, `analyze_repo_readme`). **Zero call sites** — not wired into any pipeline. Disabled: no `LLM_API_KEY` in CI.

- [ ] **Config**: add `LLM_API_KEY` (+ optional `LLM_BASE_URL`, `LLM_MODEL`) to backend `.env` and GitHub Secrets. Decide provider: MiniMax (cheap, default) for bulk; Anthropic for HIGH/CRITICAL re-check (per spec step 2).
- [ ] **Migration**: add columns if missing — `security_llm_grade`, `security_llm_analysis` (jsonb/text), `security_llm_at` (timestamptz). One migration in `supabase/migrations/` (review: irreversible).
- [ ] **Wire a job**: new `backend/llm_review_runner.py` (or scheduler job) that calls `analyze_flagged(db)` over ONLY `security_grade IN ('caution','unsafe')` (and optional grey-zone) — never the full catalog. Keyset paginate, chunked commit, rate-limit + retry/backoff.
- [ ] **Cost guard**: hard cap on rows per run (e.g. ≤500) + a daily budget; log what was skipped (no silent caps).
- [ ] **Surface it**: show LLM verdict + reasoning on the skill page `#audit` section (frontend `SkillDetailPage` / audit component).
- [ ] **Schedule**: separate GitHub Actions workflow (not in `sync.yml`), off-peak, serialized vs sync/deploy.
- [ ] **Flip the blog**: once running, change the report's roadmap bullet from "Built; being enabled" → present tense; drop "Coming soon" if both layers land.

Effort: ~1 day (code exists; mostly wiring + key + migration + a small UI block).

---

## Item 2 — Integrate SkillSpector deep scan (Layer 2)

State: spec only ([docs/skillspector-integration-spec.md](../docs/skillspector-integration-spec.md), v0.2), **0 integration code**. NVIDIA SkillSpector (Apache-2.0), 64 patterns / 16 categories, AST + taint + YARA. Python `>=3.12,<3.14` (backend venv 3.12.12 ✓; lock the worker env).

### MVP — offline batch (kills the 97.8% unknown; free)
- [ ] **Migration**: add `security_score`, `security_scanned_at` (+ reuse `security_grade`/`security_flags`) if missing.
- [ ] **`backend/skillspector_runner.py`**: select `stars>=5 AND (security_scanned_at IS NULL OR pushed_at > security_scanned_at)`; `--no-llm` scan; map SkillSpector output → `security_grade`/`security_flags`/`security_score`/`security_scanned_at`. Chunked commit, keyset pagination.
- [ ] **Clone discipline**: `git clone --depth 1`, scan, delete immediately; incremental by `pushed_at` (never re-clone already-scanned).
- [ ] **Exclude legal files** before scanning: `LICENSE*`, `COPYING`, `THIRD_PARTY_NOTICES`, `NOTICE` (known false-positive: MIT license text → "Excessive Agency", confidence 0.7).
- [ ] **osv.dev**: SC4 hits `api.osv.dev` — add retry/backoff + cache; offline fallback is built-in.
- [ ] **Grade boundary**: calibrate thresholds against real score distribution (e.g. `score≥80` → force ≥unsafe).
- [ ] **Schedule**: daily GitHub Actions batch, serialized vs sync/deploy/LLM job. Worker pinned to Python 3.12.

### Step 2 — LLM re-check on the deep layer (depends on Item 1)
- [ ] Grey zone (score 40–70) + HIGH/CRITICAL → LLM review (Anthropic); write `security_llm_grade`/`security_llm_analysis`; show on `#audit`.

### Step 3 — Monetize (behind paywall)
- [ ] Wire to `ash audit --deep` and MCP `audit_skill(depth=deep)` behind the Pro paywall (see [docs/mcp-server-spec.md](../docs/mcp-server-spec.md)).
- [ ] Arbitrary off-catalog GitHub URL deep scan = Pro tier.

Effort: MVP ~3–5 days (runner + mapping + CI + traps); Steps 2–3 after MVP has data.

---

## Recommended order
1. **Item 1 (LLM)** first — fastest, code exists, immediately strengthens flagged-item accuracy and lets us flip the blog wording.
2. **Item 2 MVP** next — the real prize: drives `unknown` toward zero with defensible deep-scan grades.
3. Then Item 2 Step 2 (LLM re-check on deep layer), then Step 3 (paywall) once there's data and traffic.

When both land: drop "Coming soon / 待上线" in the report, rewrite the two bullets in present tense, and consider a follow-up post ("we went from rule-based floor to deep audit — here's what changed").
