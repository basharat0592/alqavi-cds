"""Make every table collation consistent so cross-table foreign keys are compatible.

Production accumulated mixed table collations: the UUID primary-key tables (Warehouse,
Category, ... -> char(32) ids) were created under one server default, while other tables
were created under another. MySQL/MariaDB require a FK column to share the referenced
column's exact collation, so new FKs to those char ids fail with error 3780 whenever the
referencing table's collation diverges.

This command makes the whole schema consistent BEFORE migrate runs:

  1. Detect the canonical collation from a UUID PK (``warehouses.id``) - self-adjusting,
     so it matches whatever production actually uses.
  2. Point the database default at it, so freshly-created tables inherit it.
  3. Convert every divergent utf8mb4 table to it. This is a collation-only change (same
     charset) so no row data is re-encoded. Non-utf8mb4 tables are skipped to avoid any
     charset conversion of data.
  4. Drop half-built tables a previously-failed CreateModel left behind (only when the
     owning migration is NOT recorded as applied - so a populated table is never touched).

Idempotent: a second run finds everything already consistent and does nothing. Safe to run
before every migrate.
"""
from django.core.management.base import BaseCommand
from django.db import connection


# (app, migration, table) for new-table migrations that may have half-applied on a prior
# failed run. Dropped ONLY when the migration is not yet recorded as applied.
PARTIAL_NEW_TABLES = [
    ('products', '0019_storeproduct', 'store_products'),
]


class Command(BaseCommand):
    help = "Normalize table collations so cross-table foreign keys are compatible."

    def handle(self, *args, **options):
        if connection.vendor != 'mysql':
            self.stdout.write("Not MySQL/MariaDB - nothing to do.")
            return

        c = connection.cursor()

        # 1) Canonical target = collation of a UUID PK column other tables FK to.
        c.execute(
            "SELECT CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'id'"
        )
        row = c.fetchone()
        if not row or not row[1]:
            self.stdout.write("Could not determine target collation (warehouses.id missing); skipping.")
            return
        charset, target = row[0], row[1]
        c.execute("SELECT DATABASE()")
        db = c.fetchone()[0]
        self.stdout.write("Canonical collation: %s / %s  (db=%s)" % (charset, target, db))

        # 2) Database default so newly-created tables inherit the target.
        try:
            c.execute("ALTER DATABASE `%s` CHARACTER SET %s COLLATE %s" % (db, charset, target))
            self.stdout.write("Database default -> %s" % target)
        except Exception as ex:
            self.stdout.write("ALTER DATABASE skipped (%s)" % ex)

        # 3) Convert divergent utf8mb4 tables (collation-only; data charset unchanged).
        c.execute(
            "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
        )
        rows = c.fetchall()
        todo = [t for (t, coll) in rows if coll and coll != target and coll.startswith('utf8mb4')]
        skipped = [(t, coll) for (t, coll) in rows if coll and coll != target and not coll.startswith('utf8mb4')]
        for t, coll in skipped:
            self.stdout.write("  skip (not utf8mb4): %s [%s]" % (t, coll))

        converted = 0
        if todo:
            c.execute("SET FOREIGN_KEY_CHECKS=0")
            try:
                for t in todo:
                    try:
                        c.execute("ALTER TABLE `%s` CONVERT TO CHARACTER SET %s COLLATE %s" % (t, charset, target))
                        converted += 1
                    except Exception as ex:
                        self.stdout.write("  FAILED to convert %s: %s" % (t, ex))
            finally:
                c.execute("SET FOREIGN_KEY_CHECKS=1")
        self.stdout.write("Converted %d/%d divergent utf8mb4 tables to %s." % (converted, len(todo), target))

        # 4) Drop half-built tables from a prior failed CreateModel (never if applied).
        def _applied(app, name):
            c.execute("SELECT 1 FROM django_migrations WHERE app=%s AND name=%s", [app, name])
            return c.fetchone() is not None

        for app, name, table in PARTIAL_NEW_TABLES:
            if _applied(app, name):
                continue
            c.execute("SET FOREIGN_KEY_CHECKS=0")
            try:
                c.execute("DROP TABLE IF EXISTS `%s`" % table)
                self.stdout.write("  dropped partial table `%s` (%s.%s not yet applied)" % (table, app, name))
            except Exception as ex:
                self.stdout.write("  could not drop `%s`: %s" % (table, ex))
            finally:
                c.execute("SET FOREIGN_KEY_CHECKS=1")

        self.stdout.write("normalize_collation: done.")
