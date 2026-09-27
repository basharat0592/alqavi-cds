"""Test settings backed by in-memory SQLite.

The project runs on MySQL and `testing.py` targets it, so the suite can only run
where a MySQL server is reachable. This variant keeps everything else identical
but swaps in SQLite so behavioural tests can run anywhere.

Migrations are bypassed deliberately: one of them reads
`information_schema.COLUMNS` to normalise MySQL collations, which SQLite has no
equivalent for. Django builds the schema straight from the models instead, which
is what these tests actually need.
"""

from .testing import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}


class _NoMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = _NoMigrations()
