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

# Step 1: Upload changed files
Write-Host "`n[1/4] Uploading files to server..." -ForegroundColor Yellow

python -c @"
import paramiko, os, sys

HOST = '$SERVER'
USER = '$USER'
PASSWORD = '$PASSWORD'
REMOTE_DIR = '$REMOTE_DIR'
LOCAL_DIR = os.path.dirname(os.path.abspath(r'$PSScriptRoot\deploy.ps1'))
INCLUDE_MEDIA = '$INCLUDE_MEDIA' == 'True'

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

import io, tarfile

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
sys.stdout.buffer.write(f'  packed {count} files, {len(data)/1024/1024:.1f} MB\n'.encode())
sys.stdout.buffer.flush()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {REMOTE_DIR} && tar xzf - -C {REMOTE_DIR} && echo TAR_OK', timeout=600)
stdin.write(data); stdin.flush(); stdin.channel.shutdown_write()
out = stdout.read().decode('utf-8','replace'); err = stderr.read().decode('utf-8','replace')
sys.stdout.buffer.write(out.encode('utf-8','replace'))
if err.strip(): sys.stdout.buffer.write(('STDERR: '+err+'\n').encode('utf-8','replace'))
sys.stdout.buffer.flush()
ssh.close()
if 'TAR_OK' not in out:
    sys.exit(1)
print('Upload complete.')
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Rebuild and restart containers
Write-Host "`n[2/4] Rebuilding containers on server..." -ForegroundColor Yellow

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

python -c @"
import paramiko, sys, time

def conn():
    last = None
    for _ in range(6):
        try:
            s = paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            s.connect('$SERVER', username='$USER', password='$PASSWORD', timeout=30)
            return s
        except Exception as ex:
            last = ex; time.sleep(5)
    raise last

LOG = '$REMOTE_DIR/deploy.log'
# Run build + restart + migrate detached on the server, logging to a file, with a
# DEPLOY_OK/DEPLOY_FAIL marker at the end. We then poll the log over short-lived
# connections, so no single SSH read has to survive the whole (long) build.
_be = 'docker compose --env-file .env exec -T backend python manage.py'
chain = ('$buildCmd'
         + ' && ' + _be + ' migrate --noinput'
         + ' && ' + _be + ' seed_roles'
         + ' && ' + _be + ' seed_permissions'
         + ' && ' + _be + ' seed_areas')
script = '#!/bin/bash\n( ' + chain + ' ) && echo DEPLOY_OK || echo DEPLOY_FAIL\n'
SH = '$REMOTE_DIR/_deploy_run.sh'
# Retry the launch until it punches through (server resets new sessions intermittently).
launched = False
for attempt in range(10):
    try:
        ssh = conn()
        # Write the run-script via stdin to avoid all shell-quoting issues.
        i, o, e = ssh.exec_command('cat > ' + SH, timeout=30)
        i.write(script); i.flush(); i.channel.shutdown_write(); o.read(); e.read()
        ssh.exec_command('chmod +x ' + SH, timeout=15)[1].read()
        # Launch detached so the build survives our disconnect; output goes to LOG.
        ssh.exec_command('rm -f ' + LOG + '; nohup ' + SH + ' > ' + LOG + ' 2>&1 < /dev/null &', timeout=15)[1].read()
        ssh.close()
        launched = True; print('LAUNCHED'); break
    except Exception as ex:
        print('  launch attempt ' + str(attempt + 1) + ' reset; retrying...'); time.sleep(6)
if not launched:
    print('Could not launch build (server kept resetting connections).'); sys.exit(1)
time.sleep(2)

print('Building on server (detached); polling log every 15s...')
seen = 0; status = None; deadline = time.time() + 1800
while time.time() < deadline:
    time.sleep(15)
    try:
        s = conn()
        i, o, e = s.exec_command(f'cat {LOG} 2>/dev/null', timeout=30)
        data = o.read().decode('utf-8', 'replace'); s.close()
    except Exception as ex:
        print('  (poll retry)'); continue
    if len(data) > seen:
        sys.stdout.buffer.write(data[seen:].encode('utf-8', 'replace')); sys.stdout.buffer.flush()
        seen = len(data)
    if 'DEPLOY_OK' in data: status = 'OK'; break
    if 'DEPLOY_FAIL' in data: status = 'FAIL'; break

print(f'\n--- build status: {status} ---')
try:
    s = conn(); i, o, e = s.exec_command('cd $REMOTE_DIR && docker compose ps', timeout=60)
    sys.stdout.buffer.write(o.read()); sys.stdout.buffer.flush(); s.close()
except Exception: pass
if status != 'OK':
    sys.exit(1)
"@

# Step 3: Health check
Write-Host "`n[3/4] Running health checks..." -ForegroundColor Yellow

python -c @"
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('$SERVER', username='$USER', password='$PASSWORD', timeout=30)

checks = [
    ('Frontend', ""curl -sk -o /dev/null -w '%{http_code}' https://localhost/""),
    ('Backend API', ""curl -sk -o /dev/null -w '%{http_code}' https://localhost/api/v1/products/""),
    ('Admin Dashboard', ""curl -sk -o /dev/null -w '%{http_code}' https://localhost/admin/dashboard""),
]
for name, cmd in checks:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    code = stdout.read().decode().strip()
    status = 'OK' if code in ('200', '301', '302') else f'WARN ({code})'
    print(f'  {name}: {status}')
ssh.close()
"@

Write-Host "`n[4/4] Deployment complete!" -ForegroundColor Green
Write-Host "App is live at: https://alqavitraders.com/" -ForegroundColor Cyan
Write-Host "`nUsage tips:" -ForegroundColor Gray
Write-Host "  .\deploy.ps1                  # Full rebuild and deploy (no media)" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -BackendOnly     # Rebuild only backend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -FrontendOnly    # Rebuild only frontend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -SkipBuild       # Upload files + restart (no rebuild)" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -IncludeMedia    # Full deploy + upload media files" -ForegroundColor Gray
