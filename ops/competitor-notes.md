# Competitor Notes / Battlecards

Quick intel on adjacent products. Use for positioning, enterprise sales, and
deciding what to borrow vs differentiate.

---

## iflytek/skillhub (讯飞)
GitHub: https://github.com/iflytek/skillhub · 3.6k★ · enterprise self-hosted skill registry

**What it is:** a self-hosted, open-source skill **registry + governance layer** —
you publish/version/govern skills *into* it (team namespaces, RBAC Owner/Admin/Member,
review workflows, semantic versioning + beta/stable tags, audit logging, social
ratings/downloads, CLI + REST + ClawHub-compatible protocol).

**What it does NOT have:** automated quality scoring, security grading, or skill
validation beyond file-extension allowlisting. ← **our differentiator.**

**Positioning vs us (battlecard line):**
> "iflytek SkillHub is where enterprises **host** their skills.
>  AgentSkillsHub is where you **vet** any open-source skill before you host it."
Complementary, not a direct competitor: they're a private registry backend; we're a
public discovery + trust layer over the whole open ecosystem.

**What it validates for us:** the enterprise demand for self-hosted + governance
(namespace/RBAC/review/audit/on-prem) is real — backs our `/enterprise/` direction
(on-prem mirroring + audit-ready evidence). Cite as proof-of-demand in enterprise pitches.

**What to borrow:** their formal skill manifest/schema (capability declarations, I/O
contracts, versioning) → a **spec-compliance signal** for our quality score + SkillSpector
audit. Tracked in [audit-layers-todo.md](./audit-layers-todo.md) "Future enhancement".

---

## LobeHub — lobehub.com/skills
Larger scenario taxonomy than ours was; we borrowed missing scenario buckets
(Search & Research, Productivity) during the 79→84 scenario expansion. Reference
when reviewing scenario coverage.

## NanoSkill — nanoskill.ai
Fine-grained marketing-agent skill verticals; inspired our job-based marketing
scenarios (paid-ads / lead-generation / marketing-analytics).
