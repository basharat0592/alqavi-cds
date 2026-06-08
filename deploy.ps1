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

def upload_dir(sftp, ssh, local_path, remote_path):
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        ssh.exec_command(f'mkdir -p {remote_path}')
        import time; time.sleep(0.2)
        try:
            sftp.stat(remote_path)
        except:
            sftp.mkdir(remote_path)
    for item in sorted(os.listdir(local_path)):
        if item in SKIP_DIRS or item in SKIP_FILES:
            continue
        local_item = os.path.join(local_path, item)
        remote_item = f'{remote_path}/{item}'
        if os.path.isdir(local_item):
            upload_dir(sftp, ssh, local_item, remote_item)
        else:
            ext = os.path.splitext(item)[1].lower()
            if ext in SKIP_EXT:
                continue
            size = os.path.getsize(local_item)
            if size > 50*1024*1024:
                continue
            sys.stdout.buffer.write(f'  -> {remote_item}\n'.encode('utf-8','replace'))
            sys.stdout.buffer.flush()
            sftp.put(local_item, remote_item)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = ssh.open_sftp()

env_content = open(os.path.join(LOCAL_DIR, '.env.production')).read()
with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
    f.write(env_content)

upload_dir(sftp, ssh, LOCAL_DIR, REMOTE_DIR)
sftp.close()
ssh.close()
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
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('$SERVER', username='$USER', password='$PASSWORD', timeout=30)

cmd = '$buildCmd'
print(f'> {cmd}')
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
sys.stdout.buffer.write(err.encode('utf-8', errors='replace'))
sys.stdout.buffer.flush()

time.sleep(10)

print('\nRunning migrations...')
stdin, stdout, stderr = ssh.exec_command('cd $REMOTE_DIR && docker compose exec -T backend python manage.py migrate --noinput', timeout=120)
sys.stdout.buffer.write(stdout.read())
sys.stdout.buffer.write(stderr.read())
sys.stdout.buffer.flush()

print('\nContainer status:')
stdin, stdout, stderr = ssh.exec_command('cd $REMOTE_DIR && docker compose ps')
sys.stdout.buffer.write(stdout.read())
sys.stdout.buffer.flush()

ssh.close()
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
