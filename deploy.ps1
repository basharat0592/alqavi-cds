# deploy.ps1 - Deploy alqavi-cds to remote server
# Usage: .\deploy.ps1 [-SkipBuild] [-BackendOnly] [-FrontendOnly]

param(
    [switch]$SkipBuild,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$SERVER = "74.208.242.204"
$USER = "root"
$REMOTE_DIR = "/opt/alqavi-cds"

# Ensure we have the password (prompt if not stored)
$PASSWORD = "od1stQGtxan1P"

Write-Host "=== AlQavi CDS Deployment ===" -ForegroundColor Cyan

# Step 1: Upload changed files using SCP via Python/paramiko
Write-Host "`n[1/4] Uploading files to server..." -ForegroundColor Yellow

python -c @"
import paramiko, os, stat

HOST = '$SERVER'
USER = '$USER'
PASSWORD = '$PASSWORD'
REMOTE_DIR = '$REMOTE_DIR'
LOCAL_DIR = os.path.dirname(os.path.abspath(r'$PSScriptRoot\deploy.ps1'))

SKIP = {
    '.git', 'node_modules', '.next', '.venv', '__pycache__',
    'db.sqlite3', 'scratch', '.env', 'brain',
    'tsc_output.txt', 'ts_errors.txt', 'test_api.js', 'log.txt',
    'deploy_remote.py', 'deploy.ps1', '.env.production',
    'check_gilgit.py', 'fix_branding.py', 'prompt.txt',
}

def upload_dir(sftp, local_path, remote_path):
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        sftp.mkdir(remote_path)
    for item in os.listdir(local_path):
        if item in SKIP:
            continue
        local_item = os.path.join(local_path, item)
        remote_item = f'{remote_path}/{item}'
        if os.path.isdir(local_item):
            upload_dir(sftp, local_item, remote_item)
        else:
            if os.path.getsize(local_item) > 50*1024*1024:
                continue
            print(f'  -> {remote_item}')
            sftp.put(local_item, remote_item)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = ssh.open_sftp()

# Upload .env
env_content = open(os.path.join(LOCAL_DIR, '.env.production')).read()
with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
    f.write(env_content)

upload_dir(sftp, LOCAL_DIR, REMOTE_DIR)
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
if (-not $SkipBuild) {
    if ($BackendOnly) {
        $buildCmd += " && docker compose --env-file .env build backend"
    } elseif ($FrontendOnly) {
        $buildCmd += " && docker compose --env-file .env build frontend"
    } else {
        $buildCmd += " && docker compose --env-file .env build"
    }
}
$buildCmd += " && docker compose --env-file .env up -d"

python -c @"
import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('$SERVER', username='$USER', password='$PASSWORD', timeout=30)

cmds = [
    '$buildCmd',
]
for cmd in cmds:
    print(f'> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print(err)

# Wait for services
time.sleep(10)

# Run migrations
print('Running migrations...')
stdin, stdout, stderr = ssh.exec_command('cd $REMOTE_DIR && docker compose exec -T backend python manage.py migrate --noinput', timeout=120)
print(stdout.read().decode())
print(stderr.read().decode())

# Show status
stdin, stdout, stderr = ssh.exec_command('cd $REMOTE_DIR && docker compose ps')
print(stdout.read().decode())

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
    ('Frontend', \"curl -s -o /dev/null -w '%{http_code}' http://localhost/\"),
    ('Backend API', \"curl -s -o /dev/null -w '%{http_code}' http://localhost/api/v1/products/\"),
    ('Admin', \"curl -s -o /dev/null -w '%{http_code}' http://localhost/admin/\"),
]
for name, cmd in checks:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    code = stdout.read().decode().strip()
    status = 'OK' if code in ('200', '301', '302') else f'WARN ({code})'
    print(f'  {name}: {status}')
ssh.close()
"@

Write-Host "`n[4/4] Deployment complete!" -ForegroundColor Green
Write-Host "App is live at: http://$SERVER/" -ForegroundColor Cyan
Write-Host "`nUsage tips:" -ForegroundColor Gray
Write-Host "  .\deploy.ps1                # Full rebuild and deploy" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -BackendOnly   # Rebuild only backend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -FrontendOnly  # Rebuild only frontend" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -SkipBuild     # Upload files + restart (no rebuild)" -ForegroundColor Gray
