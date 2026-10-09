"""Trade 1.0 "Backup Data Base": the whole database as a gzipped SQL dump.

Written with the app's own MySQL connection (no mysqldump needed in the
image): for every table its CREATE TABLE and its rows as INSERT statements,
foreign-key checks off, so `gunzip < file.sql.gz | mysql <db>` restores it.
"""
import datetime
import gzip
import os
import tempfile

from django.db import connection
from django.http import FileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import UserActivityLog

BATCH = 500


def _q(name):
    return '`' + name.replace('`', '``') + '`'


def write_dump(fh):
    connection.ensure_connection()
    raw = connection.connection
    with connection.cursor() as cur:
        cur.execute('SELECT DATABASE()')
        db = cur.fetchone()[0]
        cur.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
        tables = [r[0] for r in cur.fetchall()]
        fh.write(f'-- AL-QAVI TRADERS database backup\n-- Database: {db}\n'
                 f'-- Made: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n\n'
                 'SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSET UNIQUE_CHECKS = 0;\n'
                 "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n".encode())
        for t in tables:
            cur.execute(f'SHOW CREATE TABLE {_q(t)}')
            create = cur.fetchone()[1]
            fh.write(f'DROP TABLE IF EXISTS {_q(t)};\n{create};\n'.encode())
            cur.execute(f'SELECT * FROM {_q(t)}')
            cols = ', '.join(_q(c[0]) for c in cur.description)
            while True:
                rows = cur.fetchmany(BATCH)
                if not rows:
                    break
                values = b',\n'.join(b'(' + b', '.join(raw.literal(v) if not isinstance(v, bytes) else (b"X'" + v.hex().encode() + b"'") for v in r) + b')'
                                     for r in rows)
                fh.write(f'INSERT INTO {_q(t)} ({cols}) VALUES\n'.encode() + values + b';\n')
            fh.write(b'\n')
        fh.write(b'SET FOREIGN_KEY_CHECKS = 1;\nSET UNIQUE_CHECKS = 1;\n')
    return db, len(tables)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def trade_backup(request):
    """Download the database backup (the shop's admin login only, not staff sub-users)."""
    u = request.user
    if not (u.is_superuser or not getattr(u, 'tenant_id', None) or u.tenant_id == u.pk):
        return Response({'detail': 'Only the main admin login can back up the database.'}, status=403)
    tmp = tempfile.NamedTemporaryFile(prefix='aqt-backup-', suffix='.sql.gz', delete=False)
    try:
        with gzip.GzipFile(fileobj=tmp, mode='wb', compresslevel=6) as gz:
            db, n = write_dump(gz)
        tmp.close()
    except Exception:
        tmp.close()
        os.unlink(tmp.name)
        raise
    size = os.path.getsize(tmp.name)
    name = f'AlqaviTraders-{datetime.datetime.now():%Y-%m-%d-%H%M}.sql.gz'
    UserActivityLog.objects.create(user=u, action='export',
                                   description=f'Database backup downloaded ({n} tables, {size // 1024} KB)')
    fh = open(tmp.name, 'rb')
    os.unlink(tmp.name)  # stays readable through the open handle (POSIX)
    resp = FileResponse(fh, as_attachment=True, filename=name, content_type='application/gzip')
    resp['Content-Length'] = str(size)
    resp['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
    return resp
