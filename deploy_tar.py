#!/usr/bin/env python3
"""SFTP-free deploy: stream a tarball over the SSH exec channel (tar x on remote),
then build/restart. Used because the server's SFTP subsystem drops connections,
while the SSH exec channel works fine."""
import paramiko, os, sys, io, tarfile

HOST = "74.208.242.204"
USER = "root"
PASSWORD = "od1stQGtxan1P"
REMOTE_DIR = "/opt/alqavi-cds"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

SKIP_DIRS = {
    '.git', '.vscode', '.idea', '.claude', 'node_modules', '.next', 'out',
    'build', 'dist', '.venv', 'venv', 'env', 'ENV', '__pycache__',
    '.pytest_cache', '.mypy_cache', 'scratch', 'brain', '.cache', 'tmp',
    'temp', 'htmlcov', 'staticfiles', '.eggs', 'media',
}
SKIP_FILES = {
    'db.sqlite3', '.env', 'deploy_tar.py', 'deploy.ps1', '.env.production',
    'deploy_remote.py', 'remote_cmd.py', 'prompt.txt', '.DS_Store',
    'Thumbs.db', 'desktop.ini',
}
SKIP_EXT = {'.mp4', '.avi', '.mov', '.mkv', '.log', '.pyc', '.pyo', '.pyd',
            '.sql', '.dump', '.bak', '.swp', '.swo', '.tmp', '.tsbuildinfo'}

def included(path):
    rel = os.path.relpath(path, LOCAL_DIR)
    parts = rel.replace('\\', '/').split('/')
    if any(p in SKIP_DIRS for p in parts):
        return False
    base = os.path.basename(path)
    if base in SKIP_FILES:
        return False
    if os.path.splitext(base)[1].lower() in SKIP_EXT:
        return False
    return True

print("[1/3] Building tarball (SFTP-free)...")
buf = io.BytesIO()
count = 0
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    for root, dirs, files in os.walk(LOCAL_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            full = os.path.join(root, f)
            if not included(full):
                continue
            if os.path.getsize(full) > 50 * 1024 * 1024:
                continue
            arc = os.path.relpath(full, LOCAL_DIR).replace('\\', '/')
            tar.add(full, arcname=arc)
            count += 1
    # inject .env from .env.production
    env_bytes = open(os.path.join(LOCAL_DIR, '.env.production'), 'rb').read()
    ti = tarfile.TarInfo('.env'); ti.size = len(env_bytes)
    tar.addfile(ti, io.BytesIO(env_bytes))
data = buf.getvalue()
print(f"  {count} files, {len(data)/1024/1024:.1f} MB tarball")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

print("[2/3] Streaming tarball over SSH exec channel...")
cmd = f"mkdir -p {REMOTE_DIR} && tar xzf - -C {REMOTE_DIR} && echo TAR_OK"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
stdin.write(data); stdin.flush(); stdin.channel.shutdown_write()
out = stdout.read().decode('utf-8', 'replace'); err = stderr.read().decode('utf-8', 'replace')
print(out);
if err.strip(): print("STDERR:", err)
if 'TAR_OK' not in out:
    print("Upload failed (no TAR_OK)."); ssh.close(); sys.exit(1)
print("  Upload OK.")

print("[3/3] Building + restarting containers...")
fb = ("docker compose --env-file .env --profile build build frontend-builder"
      " && docker compose --env-file .env --profile build run --rm frontend-builder")
build = (f"cd {REMOTE_DIR}"
         " && docker compose --env-file .env build backend"
         f" && {fb}"
         " && docker compose --env-file .env up -d"
         " && docker compose --env-file .env restart frontend nginx")
stdin, stdout, stderr = ssh.exec_command(build, timeout=900)
sys.stdout.buffer.write(stdout.read()); sys.stdout.buffer.write(stderr.read()); sys.stdout.buffer.flush()

print("\nRunning migrations...")
stdin, stdout, stderr = ssh.exec_command(
    f"cd {REMOTE_DIR} && docker compose exec -T backend python manage.py migrate --noinput", timeout=180)
sys.stdout.buffer.write(stdout.read()); sys.stdout.buffer.write(stderr.read()); sys.stdout.buffer.flush()

print("\nContainer status:")
stdin, stdout, stderr = ssh.exec_command(f"cd {REMOTE_DIR} && docker compose ps", timeout=60)
sys.stdout.buffer.write(stdout.read()); sys.stdout.buffer.flush()
ssh.close()
print("\nDone. App: https://alqavitraders.com/")
