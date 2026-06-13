#!/usr/bin/env python3
"""
SkillSpector trial runner — scope-limited, STAGING ONLY (does not touch the
production skills.security_grade). Scans a small list of high-value repos with
a good OpenAI model, post-filters the known false-positive files (LICENSE,
test files), and emits both the raw and filtered verdict so a human can judge
accuracy before any bulk rollout.

Usage:
    OPENAI_API_KEY=sk-... python skillspector_runner.py /tmp/ss10/repos.txt

Env:
    OPENAI_API_KEY           required (real api.openai.com key)
    SKILLSPECTOR_DIR         clone path (default /Users/zhuyansen/content/skillspector)
    SKILLSPECTOR_MODEL       default gpt-4o
    SKILLSPECTOR_MAX_RETRIES default 8 (Tier-1 TPM backoff)
    OUT                      staging output JSON (default /tmp/ss10/results.json)
"""

import json
import os
import re
import subprocess
import sys
import time

SS_DIR = os.environ.get("SKILLSPECTOR_DIR", "/Users/zhuyansen/content/skillspector")
MODEL = os.environ.get("SKILLSPECTOR_MODEL", "gpt-4o")
OUT = os.environ.get("OUT", "/tmp/ss10/results.json")

# Files whose findings are systematically false positives (license boilerplate,
# test fixtures referencing .env / "reset state", etc.). README/SKILL.md are
# kept — they can carry real prompt-injection.
FP_FILE_RE = re.compile(
    r"(^|/)(LICENSE|COPYING|NOTICE|THIRD_PARTY[_A-Z]*)"
    r"|(_test\.|\.test\.|(^|/)tests?/)",
    re.IGNORECASE,
)

SEV_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def grade_from(severity, recommendation):
    """Map a (max-severity, recommendation) pair → our security_grade enum."""
    rec = (recommendation or "").upper().replace(" ", "_")
    sev = (severity or "").upper()
    if rec in ("SAFE", "") and sev in ("", "LOW", "NONE"):
        return "safe"
    if rec == "SAFE":
        return "safe"
    if rec == "CAUTION" or sev == "MEDIUM":
        return "caution"
    if sev == "CRITICAL":
        return "reject"
    if rec == "DO_NOT_INSTALL" or sev == "HIGH":
        return "unsafe"
    return "caution"


def scan(repo):
    url = f"https://github.com/{repo}"
    out_json = f"/tmp/ss10/{repo.replace('/', '__')}.json"
    env = {**os.environ, "SKILLSPECTOR_PROVIDER": "openai",
           "SKILLSPECTOR_MODEL": MODEL,
           "SKILLSPECTOR_MAX_RETRIES": os.environ.get("SKILLSPECTOR_MAX_RETRIES", "8")}
    env.pop("OPENAI_BASE_URL", None)
    t0 = time.time()
    proc = subprocess.run(
        ["uv", "run", "skillspector", "scan", url, "--format", "json", "--output", out_json],
        cwd=SS_DIR, env=env, capture_output=True, text=True, timeout=900,
    )
    dt = round(time.time() - t0, 1)
    if not os.path.exists(out_json):
        return {"repo": repo, "error": (proc.stderr or proc.stdout)[-200:], "seconds": dt}
    d = json.load(open(out_json))
    issues = d.get("issues", []) or []
    ra = d.get("risk_assessment", {}) or {}
    # filtered: drop FP-file findings, recompute max severity
    kept = [i for i in issues if not FP_FILE_RE.search((i.get("location") or {}).get("file", ""))]
    max_sev = max((SEV_RANK.get(i.get("severity", ""), 0) for i in kept), default=0)
    sev_label = next((k for k, v in SEV_RANK.items() if v == max_sev), "NONE")
    return {
        "repo": repo,
        "seconds": dt,
        "raw": {
            "recommendation": ra.get("recommendation"),
            "severity": ra.get("severity"),
            "score": ra.get("score"),
            "issues": len(issues),
            "grade": grade_from(ra.get("severity"), ra.get("recommendation")),
        },
        "filtered": {
            "kept_issues": len(kept),
            "dropped_fp": len(issues) - len(kept),
            "max_severity": sev_label,
            "grade": grade_from(sev_label, "DO_NOT_INSTALL" if max_sev >= 3 else "CAUTION" if max_sev == 2 else "SAFE"),
        },
        "llm_available": d.get("metadata", {}).get("llm_available"),
    }


def main():
    repos = [r.strip() for r in open(sys.argv[1]) if r.strip()]
    results = []
    for i, repo in enumerate(repos, 1):
        print(f"[{i}/{len(repos)}] scanning {repo} …", flush=True)
        try:
            r = scan(repo)
        except Exception as e:  # noqa: BLE001
            r = {"repo": repo, "error": str(e)}
        results.append(r)
        json.dump(results, open(OUT, "w"), indent=2, ensure_ascii=False)
        if "error" in r:
            print(f"    ✗ {r['error'][:120]}", flush=True)
        else:
            print(f"    raw={r['raw']['grade']}({r['raw']['recommendation']}/{r['raw']['issues']}) "
                  f"→ filtered={r['filtered']['grade']}(kept {r['filtered']['kept_issues']}, "
                  f"dropped {r['filtered']['dropped_fp']} FP) · {r['seconds']}s", flush=True)
    print(f"\n✓ done → {OUT}")


if __name__ == "__main__":
    main()
