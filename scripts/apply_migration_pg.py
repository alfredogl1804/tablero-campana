#!/usr/bin/env python3
"""Apply a SQL migration directly to Supabase Postgres via pooler.

Usage:
  SUPABASE_DB_URL=... python3 apply_migration_pg.py path/to/migration.sql
"""
import os
import sys
import psycopg

if len(sys.argv) != 2:
    print("Usage: apply_migration_pg.py <migration.sql>", file=sys.stderr)
    sys.exit(1)

migration_path = sys.argv[1]
db_url = os.environ.get("SUPABASE_DB_URL")
if not db_url:
    print("FAIL: SUPABASE_DB_URL env var required", file=sys.stderr)
    sys.exit(1)

with open(migration_path, "r") as f:
    sql = f.read()

print(f"Applying migration: {migration_path}")
print(f"SQL size: {len(sql)} chars")
print()

with psycopg.connect(db_url, autocommit=False) as conn:
    with conn.cursor() as cur:
        try:
            cur.execute(sql)
            conn.commit()
            print("✓ Migration applied successfully.")
        except Exception as e:
            conn.rollback()
            print(f"✗ Migration failed: {e}", file=sys.stderr)
            sys.exit(2)

# Verify the table exists post-migration
with psycopg.connect(db_url) as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'kernel_events_stream_signed'
            ORDER BY ordinal_position
        """)
        rows = cur.fetchall()
        if not rows:
            print("✗ Table kernel_events_stream_signed NOT found post-migration", file=sys.stderr)
            sys.exit(3)
        print(f"\n✓ Table created with {len(rows)} columns:")
        for r in rows[:5]:
            print(f"    {r[0]:32s} {r[1]:20s} nullable={r[2]}")
        print(f"    ... ({len(rows) - 5} more)")
