"""Normalized tag taxonomy for scenario matching.

Why this exists
---------------
GitHub `topics` are author-curated and noisy: the same concept appears under
5+ spellings (`ai-tools` / `agent-tools` / `agents` / `ai_agent`). Our scenario
matcher relies on substring keyword matches over description+name+topics, which
gives false positives (wrong scenario) and false negatives (missed matches).

The `tags` column stores a curated, normalized vocabulary (~50 controlled values)
computed from topics + category + language + repo name + (optionally) README.
The matcher then scores `tags` membership directly with a high weight (+10).

Pipeline
--------
1. Run `extract_tags(skill)` per row at sync time (or in backfill script).
2. Returns a deduped `list[str]` of tag IDs.
3. Caller writes back to `skills.tags` (PostgreSQL TEXT[]).

Design constraints
------------------
- Pure-Python, no LLM, no network — runs in <1ms per row.
- Whitelisted vocabulary only — avoid taxonomy drift.
- Case-insensitive matching, normalize separators (`-`/`_`/space).
"""

from __future__ import annotations

import json
from typing import Iterable

# ----------------------------------------------------------------------------
# Tag taxonomy — controlled vocabulary
# ----------------------------------------------------------------------------
# Format: tag_id → list of "trigger phrases" (lowercased, separator-normalized)
# Triggers are matched against: topics, repo_name, description (full-text contains).
# Order matters only for documentation — extraction runs all rules.
TAG_RULES: dict[str, list[str]] = {
    # ── Protocols & ecosystems ─────────────────────────────────
    "mcp": ["mcp", "model context protocol", "model-context-protocol", "mcp-server", "mcp-client"],
    "claude": ["claude", "claude-code", "claude-skill", "anthropic"],
    "codex": ["codex", "openai-codex", "codex-cli", "codex-skill"],
    "gemini": ["gemini", "google-gemini", "gemini-cli"],
    "openai": ["openai", "gpt-4", "gpt-5", "chatgpt"],
    "ollama": ["ollama", "ollama-api"],
    "openrouter": ["openrouter"],

    # ── Agent capabilities ─────────────────────────────────────
    "agent": ["agent", "ai-agent", "ai agent", "agentic", "agent-tool"],
    "multi-agent": ["multi-agent", "multiagent", "agent-orchestration", "swarm"],
    "agent-framework": ["agent-framework", "langchain", "crewai", "autogen", "langgraph", "llamaindex", "agno"],
    "agent-memory": ["memory", "agent-memory", "long-term-memory", "context-memory", "mem0"],
    "agent-deployment": ["deployment", "deploy", "agent-deployment", "production-agent", "serverless-agent"],
    "agent-governance": ["governance", "policy", "guardrails", "compliance", "audit-log"],
    "agent-security": ["security", "agent-security", "prompt-injection", "jailbreak", "ai-security", "cybersecurity", "llm-security"],
    "agent-observability": ["observability", "tracing", "monitoring", "telemetry", "agent-monitoring"],

    # ── Capabilities / scenarios ───────────────────────────────
    "browser": ["browser", "browser-automation", "playwright", "puppeteer", "headless-chrome", "chromium"],
    "web-scraping": ["web-scraping", "scraping", "crawler", "scraper", "spider"],
    "code-review": ["code-review", "pr-review", "code-quality"],
    "code-completion": ["code-completion", "autocomplete", "intellisense", "copilot"],
    "code-agent": ["code-agent", "coding-agent", "ai-coding", "autonomous-coding"],
    "rag": ["rag", "retrieval-augmented-generation", "retrieval-augmented"],
    "vector-db": ["vector", "vector-db", "vector-database", "embedding-store", "qdrant", "pinecone", "weaviate", "chromadb", "milvus"],
    "embedding": ["embedding", "embeddings", "sentence-transformers", "text-embedding"],
    "semantic-search": ["semantic-search", "neural-search", "similarity-search"],

    # ── Content types ──────────────────────────────────────────
    "voice": ["voice", "speech", "tts", "stt", "whisper", "elevenlabs", "voice-agent", "speech-to-text", "text-to-speech"],
    "image": ["image-generation", "diffusion", "sd", "stable-diffusion", "image-editing", "midjourney", "dalle", "flux"],
    "video": ["video", "video-generation", "video-editing", "remotion"],
    "ppt": ["ppt", "pptx", "powerpoint", "presentation", "slides", "slide-generation"],
    "document": ["document", "pdf", "docx", "ocr", "document-parsing", "paddleocr"],
    "translation": ["translation", "translate", "i18n", "localization"],

    # ── Workflows ──────────────────────────────────────────────
    "workflow": ["workflow", "workflow-automation", "n8n", "zapier", "automation"],
    "ci-cd": ["ci-cd", "ci/cd", "continuous-integration", "github-actions", "gitlab-ci"],
    "rss": ["rss", "rss-feed", "rss-monitoring", "atom-feed"],
    "newsletter": ["newsletter", "email-digest"],

    # ── Data / DB ──────────────────────────────────────────────
    "database": ["database", "postgres", "postgresql", "mysql", "sqlite", "supabase"],
    "data-pipeline": ["data-pipeline", "etl", "elt", "airflow", "dagster"],
    "data-visualization": ["data-visualization", "dataviz", "charts", "dashboard"],

    # ── Dev tools ──────────────────────────────────────────────
    "cli": ["cli", "command-line", "terminal-tool"],
    "framework": ["framework", "library", "sdk"],
    "skill": ["skill", "ai-skill", "claude-skill", "agent-skill", "skill-creation"],
    "plugin": ["plugin", "extension"],
    "debugging": ["debugging", "debugger", "devtools"],
    "testing": ["testing", "test-generation", "qa-automation"],
    "git-tools": ["git", "github", "gitlab", "git-tools"],
    "container": ["docker", "kubernetes", "k8s", "containerization", "podman"],
    "auth": ["auth", "authentication", "oauth", "sso"],

    # ── Communication ──────────────────────────────────────────
    "slack": ["slack", "slack-bot", "slack-integration"],
    "discord": ["discord", "discord-bot"],
    "telegram": ["telegram", "telegram-bot"],
    "wechat": ["wechat", "weixin"],
    "lark": ["lark", "feishu", "lark-cli"],
    "email": ["email", "smtp", "imap", "email-automation"],

    # ── Founder / creator workflows ────────────────────────────
    "saas": ["saas", "indie-hacker", "solo-founder", "micro-saas"],
    "business-diagnosis": ["business-diagnosis", "founder", "fundraising", "growth-hacking", "gtm"],
    "anti-slop": ["anti-slop", "slopbuster", "humanize", "ai-detector"],
    "skill-creation": ["skill-creation", "skill-builder", "meta-tools"],
    "vibe-coding": ["vibe-coding", "ai-pair-programming", "cursor", "windsurf"],

    # ── Personal & knowledge ───────────────────────────────────
    "personal-knowledge": ["personal-knowledge", "second-brain", "obsidian", "logseq", "zettelkasten", "pkm"],
    "knowledge-base": ["knowledge-base", "kb", "documentation"],
    "content-syndication": ["content-syndication", "cross-posting", "social-syndication"],

    # ── Languages / runtimes (only common ones) ────────────────
    "python": [],   # filled from skill.language at runtime
    "typescript": [],
    "rust": [],
    "go": [],
}

# Language-driven tags (case-sensitive match against skill.language)
LANGUAGE_TO_TAG = {
    "Python": "python",
    "TypeScript": "typescript",
    "JavaScript": "typescript",  # JS projects also tag as typescript ecosystem
    "Rust": "rust",
    "Go": "go",
}

# Category-driven tags
CATEGORY_TO_TAG = {
    "mcp-server": "mcp",
    "claude-skill": ["claude", "skill"],
    "codex-skill": ["codex", "skill"],
    "agent-tool": "agent",
}


# ----------------------------------------------------------------------------
# Pre-compute trigger → tag reverse index for fast lookup
# ----------------------------------------------------------------------------
def _normalize(s: str) -> str:
    """Lowercase + collapse separators."""
    return s.lower().replace("_", "-").replace(" ", "-").strip()


# Reverse index: each trigger phrase → set of tags it activates
_TRIGGER_INDEX: dict[str, set[str]] = {}
for _tag, _triggers in TAG_RULES.items():
    for _t in _triggers:
        _norm = _normalize(_t)
        _TRIGGER_INDEX.setdefault(_norm, set()).add(_tag)


def extract_tags(
    *,
    topics: Iterable[str] | str | None,
    description: str | None,
    repo_name: str | None,
    language: str | None,
    category: str | None,
) -> list[str]:
    """Compute normalized tags for a single skill.

    Args:
        topics: GitHub topics — accepts list[str] OR JSON-encoded string OR None.
        description: Repo description (one-liner). Used for substring matches.
        repo_name: Repo basename (e.g. "mem0", not "mem0ai/mem0").
        language: GitHub-reported primary language (e.g. "Python", "TypeScript").
        category: Hub-assigned category (e.g. "mcp-server").

    Returns:
        Sorted, deduped list of tag IDs from the controlled vocabulary.
    """
    tags: set[str] = set()

    # 1) Topics — author-curated, highest signal
    topic_list: list[str] = []
    if topics:
        if isinstance(topics, str):
            try:
                topic_list = json.loads(topics)
            except (json.JSONDecodeError, TypeError):
                topic_list = []
        else:
            topic_list = list(topics)

    for raw_topic in topic_list:
        if not isinstance(raw_topic, str):
            continue
        norm = _normalize(raw_topic)
        if norm in _TRIGGER_INDEX:
            tags.update(_TRIGGER_INDEX[norm])

    # 2) Repo name — also high signal (e.g. "mem0" → agent-memory)
    # Pad with hyphens so we can do whole-word matching: "mcp" finds "claude-mcp-server"
    # but not "comcp". Triggers like "claude-code" stay matchable because both sides normalize.
    if repo_name:
        rname_padded = f"-{_normalize(repo_name)}-"
        for trigger, tag_set in _TRIGGER_INDEX.items():
            if f"-{trigger}-" in rname_padded:
                tags.update(tag_set)

    # 3) Description — substring match with hyphen-word boundary (lower precision, last)
    if description:
        # Normalize spaces/underscores → hyphens so "model context protocol" → "model-context-protocol"
        desc_padded = f"-{_normalize(description)}-"
        for trigger, tag_set in _TRIGGER_INDEX.items():
            if f"-{trigger}-" in desc_padded:
                tags.update(tag_set)

    # 4) Language → tag
    if language and language in LANGUAGE_TO_TAG:
        tags.add(LANGUAGE_TO_TAG[language])

    # 5) Category → tag(s)
    if category and category in CATEGORY_TO_TAG:
        cat_tag = CATEGORY_TO_TAG[category]
        if isinstance(cat_tag, list):
            tags.update(cat_tag)
        else:
            tags.add(cat_tag)

    return sorted(tags)


def all_tag_ids() -> list[str]:
    """Return the full controlled vocabulary, useful for validation."""
    return sorted(TAG_RULES.keys())
