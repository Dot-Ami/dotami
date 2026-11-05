r"""Make an empty store from ``migrations/``, in order.

Run: ``python tools/law-store/contract/new_store.py``

The contract never issues DDL, so something else has to make the file it opens. This only
ever makes a new file and refuses one that is already there: a store is rebuilt from its
sources, never upgraded in place, so there is nothing here worth a backup-and-migrate step.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import DB_PATH, REPO, SCHEMA_VERSION, RefusalError

MIGRATIONS = REPO / "migrations"


def create(db_path: Path = DB_PATH) -> int:
    """Apply every migration to a new file. Returns how many were applied."""
    if db_path.exists():
        raise RefusalError(f"{db_path} already exists -- this only makes a new store")
    files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql"))
    if len(files) != SCHEMA_VERSION:
        raise RefusalError(
            f"{len(files)} migrations in {MIGRATIONS}, this contract speaks v{SCHEMA_VERSION}"
        )
    conn = sqlite3.connect(db_path)
    try:
        for path in files:
            conn.executescript(path.read_text(encoding="utf-8"))
        conn.execute(f"PRAGMA user_version={len(files)}")
        conn.commit()
    finally:
        conn.close()
    return len(files)


def main() -> int:
    try:
        print(f"{DB_PATH}: created, schema v{create()}")
    except RefusalError as exc:
        print(f"REFUSED -- {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
