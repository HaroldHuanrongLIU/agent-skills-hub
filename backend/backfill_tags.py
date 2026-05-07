"""One-time backfill: compute and write `tags` for every existing skill.

Usage:
    cd backend && source venv/bin/activate
    python backfill_tags.py            # full run
    python backfill_tags.py --limit 100  # smoke test

After this lands, sync_runner.py also writes tags on every fresh fetch.
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Iterable

import psycopg2
from psycopg2.extras import execute_values
from dotenv import dotenv_values

# Allow `python backfill_tags.py` from backend/ dir
sys.path.insert(0, ".")
from app.services.tag_extractor import extract_tags  # noqa: E402

BATCH_SIZE = 1000


def _iter_batches(cur, batch_size: int) -> Iterable[list[tuple]]:
    while True:
        rows = cur.fetchmany(batch_size)
        if not rows:
            return
        yield rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None,
                        help="Limit rows for smoke test")
    parser.add_argument("--dry-run", action="store_true",
                        help="Compute tags but don't write")
    args = parser.parse_args()

    env = dotenv_values(".env")
    url = env.get("SUPABASE_DB_URL")
    if not url:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr)
        return 1

    # Two separate connections so commits on the write side don't kill
    # the read-side server-side cursor.
    # Server-side named cursor needs a transaction (autocommit=False)
    read_conn = psycopg2.connect(url)
    read_conn.autocommit = False
    read_cur = read_conn.cursor(name="backfill_reader")
    read_cur.itersize = BATCH_SIZE

    write_conn = psycopg2.connect(url)
    write_conn.autocommit = False
    write_cur = write_conn.cursor()

    select_sql = """
        SELECT id, repo_name, description, language, category, topics
        FROM skills
        ORDER BY id
    """
    if args.limit:
        select_sql += f" LIMIT {int(args.limit)}"

    read_cur.execute(select_sql)

    total = 0
    tagged_count = 0
    started = time.time()

    for batch in _iter_batches(read_cur, BATCH_SIZE):
        rows_to_update: list[tuple[list[str], int]] = []

        for row in batch:
            skill_id, repo_name, description, language, category, topics = row
            tags = extract_tags(
                topics=topics,
                description=description,
                repo_name=repo_name,
                language=language,
                category=category,
            )
            if tags:
                tagged_count += 1
            rows_to_update.append((tags, skill_id))

        if not args.dry_run and rows_to_update:
            # Use VALUES list + UPDATE FROM for batch efficiency
            execute_values(
                write_cur,
                """
                UPDATE skills AS s
                   SET tags = v.tags::text[]
                  FROM (VALUES %s) AS v(tags, id)
                 WHERE s.id = v.id
                """,
                rows_to_update,
                template="(%s::text[], %s)",
                page_size=BATCH_SIZE,
            )
            write_conn.commit()

        total += len(batch)
        elapsed = time.time() - started
        rate = total / elapsed if elapsed else 0
        print(f"  · {total:>6,} rows  |  {tagged_count:>6,} tagged  "
              f"|  {rate:.0f} rows/sec", flush=True)

    read_cur.close()
    write_cur.close()
    read_conn.close()
    write_conn.close()

    print(f"\n✓ Done — {total:,} processed, {tagged_count:,} tagged "
          f"({100 * tagged_count / total:.1f}%) in {time.time() - started:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
