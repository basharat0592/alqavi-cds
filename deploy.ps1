# deploy.ps1 - Deploy alqavi-cds to remote server
# Usage: .\deploy.ps1 [-SkipBuild] [-BackendOnly] [-FrontendOnly] [-IncludeMedia]

param(
    [switch]$SkipBuild,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$IncludeMedia
)

$SERVER = "74.208.242.204"
$USER = "root"
$REMOTE_DIR = "/opt/alqavi-cds"
$PASSWORD = "od1stQGtxan1P"
$INCLUDE_MEDIA = if ($IncludeMedia) { "True" } else { "False" }

Write-Host "=== AlQavi CDS Deployment ===" -ForegroundColor Cyan
if (-not $IncludeMedia) {
    Write-Host "  (Skipping media folder. Use -IncludeMedia to upload media files)" -ForegroundColor Gray
}

# Build the server-side rebuild command FIRST, so the single SSH session below can
# upload AND launch the build without opening a second connection.
$buildCmd = "cd $REMOTE_DIR"
# The Next.js bundle is produced by the profiled `frontend-builder` service, which bakes
# NEXT_PUBLIC_API_URL into the bundle and writes it to the frontend_build volume. It must be
# built AND run (its CMD repopulates the volume); a plain `up -d` skips profiled services.
$frontendBuild = "docker compose --env-file .env --profile build build frontend-builder" `
    + " && docker compose --env-file .env --profile build run --rm frontend-builder"
if (-not $SkipBuild) {
    if ($BackendOnly) {
        $buildCmd += " && docker compose --env-file .env build backend"
    } elseif ($FrontendOnly) {
        $buildCmd += " && $frontendBuild"
    } else {
        $buildCmd += " && docker compose --env-file .env build backend && $frontendBuild"
    }
}
# Restart frontend too so node picks up the freshly repopulated volume.
$buildCmd += " && docker compose --env-file .env up -d && docker compose --env-file .env restart frontend nginx"

# Single SSH session: upload, then launch the build + poll on the SAME connection.
#
# WHY: this server resets brand-new SSH sessions (WinError 10054) when they're opened
# in close succession - so the upload (1st session of the run) ALWAYS works, but a
# separate build session (2nd session) ALWAYS gets its first command reset, no matter
# how patiently we retry. The fix is to never open a second connection: we keep the
# upload's already-accepted transport and open new exec channels on it for the build,
# the log polling, and the health checks.
Write-Host "`n[1/2] Uploading files + launching rebuild (single SSH session)..." -ForegroundColor Yellow

python -c @"
import paramiko, os, sys, io, tarfile, time

# Build logs carry npm/docker Unicode glyphs; force UTF-8 so printing them never
# crashes on a cp1252 Windows console (which would kill polling mid-build).
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HOST = '$SERVER'
USER = '$USER'
PASSWORD = '$PASSWORD'
REMOTE_DIR = '$REMOTE_DIR'
LOCAL_DIR = os.path.dirname(os.path.abspath(r'$PSScriptRoot\deploy.ps1'))
INCLUDE_MEDIA = '$INCLUDE_MEDIA' == 'True'
LOG = REMOTE_DIR + '/deploy.log'
SH = REMOTE_DIR + '/_deploy_run.sh'

SKIP_DIRS = {
    '.git', '.vscode', '.idea', '.claude',
    'node_modules', '.next', 'out', 'build', 'dist',
    '.venv', 'venv', 'env', 'ENV',
    '__pycache__', '.pytest_cache', '.mypy_cache',
    'scratch', 'brain',
    '.cache', 'tmp', 'temp', 'htmlcov',
    'staticfiles', '.eggs',
}
SKIP_FILES = {
    'db.sqlite3', '.env', 'tsc_output.txt', 'ts_errors.txt',
    'test_api.js', 'log.txt', 'deploy_remote.py', 'deploy.ps1',
    '.env.production', 'check_gilgit.py', 'fix_branding.py',
    'prompt.txt', 'remote_cmd.py',
    '.DS_Store', 'Thumbs.db', 'desktop.ini',
    '.gitignore', '.dockerignore',
    'vercel.json', '.coverage',
}
SKIP_EXT = {
    '.mp4', '.avi', '.mov', '.mkv',
    '.log', '.pyc', '.pyo', '.pyd',
    '.sql', '.dump', '.bak',
    '.swp', '.swo', '.tmp',
    '.egg-info', '.tsbuildinfo',
}

if not INCLUDE_MEDIA:
    SKIP_DIRS.add('media')

def included(path):
    rel = os.path.relpath(path, LOCAL_DIR).replace('\\', '/')
    if any(p in SKIP_DIRS for p in rel.split('/')):
        return False
    base = os.path.basename(path)
    if base in SKIP_FILES:
        return False
    if os.path.splitext(base)[1].lower() in SKIP_EXT:
        return False
    return True

# Pack the project into an in-memory tar.gz (SFTP is broken on this server, so
# we stream the archive over the SSH exec channel and extract it remotely).
buf = io.BytesIO(); count = 0
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    for root, dirs, files in os.walk(LOCAL_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            full = os.path.join(root, f)
            if not included(full):
                continue
            if os.path.getsize(full) > 50*1024*1024:
                continue
            arc = os.path.relpath(full, LOCAL_DIR).replace('\\', '/')
            tar.add(full, arcname=arc); count += 1
    env_bytes = open(os.path.join(LOCAL_DIR, '.env.production'), 'rb').read()
    ti = tarfile.TarInfo('.env'); ti.size = len(env_bytes)
    tar.addfile(ti, io.BytesIO(env_bytes))
data = buf.getvalue()
sys.stdout.write('  packed ' + str(count) + ' files, ' + format(len(data)/1024/1024, '.1f') + ' MB\n')
sys.stdout.flush()

# The server-side chain: rebuild, then migrate + backfill tenants + seed.
_be = 'docker compose --env-file .env exec -T backend python manage.py'
chain = ('$buildCmd'
         + ' && ' + _be + ' normalize_collation'
         + ' && ' + _be + ' migrate --noinput'
         + ' && ' + _be + ' backfill_tenants'
         + ' && ' + _be + ' seed_roles'
         + ' && ' + _be + ' seed_permissions'
         + ' && ' + _be + ' seed_areas'
         + ' && ' + _be + ' resync_product_quantities')
script = '#!/bin/bash\n( ' + chain + ' ) && echo DEPLOY_OK || echo DEPLOY_FAIL\n'

def connect():
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect(HOST, username=USER, password=PASSWORD, timeout=40,
              banner_timeout=40, auth_timeout=40)
    t = s.get_transport()
    if t: t.set_keepalive(30)
    return s

# ---- the ONE connection that the server accepts (1st session of the run) ----
ssh = connect()

# 1) Upload (stream tar.gz over the exec channel, extract remotely).
stdin, stdout, stderr = ssh.exec_command('mkdir -p ' + REMOTE_DIR + ' && tar xzf - -C ' + REMOTE_DIR + ' && echo TAR_OK', timeout=600)
stdin.write(data); stdin.flush(); stdin.channel.shutdown_write()
out = stdout.read().decode('utf-8','replace'); err = stderr.read().decode('utf-8','replace')
sys.stdout.write(out)
if err.strip(): sys.stdout.write('STDERR: ' + err + '\n')
sys.stdout.flush()
if 'TAR_OK' not in out:
    sys.stderr.write('Upload failed!\n'); sys.exit(1)
sys.stdout.write('Upload complete.\n'); sys.stdout.flush()

if '$SkipBuild' == 'True':
    sys.stdout.write('SkipBuild set - restarting containers only...\n'); sys.stdout.flush()

# 2) Launch the build DETACHED on the SAME connection (new channels on an already-
#    accepted transport are fine; only brand-new sessions get reset). nohup + the log
#    file keep it running independent of our session so a later drop never kills it.
i, o, e = ssh.exec_command('cat > ' + SH, timeout=30)
i.write(script); i.flush(); i.channel.shutdown_write(); o.read(); e.read()
ssh.exec_command('chmod +x ' + SH, timeout=20)[1].read()
ssh.exec_command('rm -f ' + LOG + '; nohup ' + SH + ' > ' + LOG + ' 2>&1 < /dev/null &', timeout=20)[1].read()
sys.stdout.write('\n[2/2] Building on server (migrate + backfill + seed). Polling log...\n'); sys.stdout.flush()

# 3) Poll the log on the same connection; reconnect only if the session truly drops.
seen = 0; status = None; deadline = time.time() + 2700
while time.time() < deadline:
    time.sleep(15)
    try:
        t = ssh.get_transport()
        if not t or not t.is_active():
            sys.stdout.write('  (session dropped - reconnecting)\n'); sys.stdout.flush()
            time.sleep(8); ssh = connect()
        i, o, e = ssh.exec_command('cat ' + LOG + ' 2>/dev/null', timeout=60)
        out = o.read().decode('utf-8','replace')
    except Exception:
        try:
            time.sleep(10); ssh = connect()
        except Exception: pass
        continue
    if len(out) > seen:
        sys.stdout.write(out[seen:]); sys.stdout.flush(); seen = len(out)
    if 'DEPLOY_OK' in out: status = 'OK'; break
    if 'DEPLOY_FAIL' in out: status = 'FAIL'; break

sys.stdout.write('\n--- build status: ' + str(status) + ' ---\n'); sys.stdout.flush()

# 4) Container state + health checks on the same connection.
try:
    i, o, e = ssh.exec_command('cd ' + REMOTE_DIR + ' && docker compose --env-file .env ps', timeout=60)
    sys.stdout.write(o.read().decode('utf-8','replace') + '\n')
except Exception: pass
try:
    for name, url in [('Frontend','https://localhost/'),
                      ('Backend API','https://localhost/api/v1/products/'),
                      ('Admin Dashboard','https://localhost/admin/dashboard')]:
        try:
            i, o, e = ssh.exec_command(""curl -sk -o /dev/null -w '%{http_code}' "" + url, timeout=20)
            code = o.read().decode().strip()
        except Exception:
            code = 'ERR'
        ok = code in ('200','301','302')
        sys.stdout.write('  ' + name + ': ' + ('OK' if ok else 'WARN (' + code + ')') + '\n')
    sys.stdout.flush()
except Exception: pass

try: ssh.close()
except Exception: pass
if status != 'OK':
    sys.exit(1)
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nDeploy did NOT complete cleanly (build did not report OK). See the log above." -ForegroundColor Red
    exit 1
}

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "App is live at: https://alqavitraders.com/" -ForegroundColor Cyan
Write-Host "`nUsage tips:" -ForegroundColor Gray
Write-Host "  .\deploy.ps1                  # Full rebuild and deploy (no media)" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -BackendOnly     # Rebuild only backend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -FrontendOnly    # Rebuild only frontend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -SkipBuild       # Upload files + restart (no rebuild)" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -IncludeMedia    # Full deploy + upload media files" -ForegroundColor Gray
