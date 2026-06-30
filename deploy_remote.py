#!/usr/bin/env python3
"""Deploy alqavi-cds to remote server via SSH using paramiko."""
import paramiko
import os
import sys
import stat
import time

HOST = "74.208.242.204"
USER = "root"
PASSWORD = "od1stQGtxan1P"
REMOTE_DIR = "/opt/alqavi-cds"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

# Directories/files to skip
SKIP = {
    '.git', 'node_modules', '.next', '.venv', '__pycache__',
    'db.sqlite3', 'scratch', '.env', 'brain',
    'tsc_output.txt', 'ts_errors.txt', 'test_api.js', 'log.txt',
    'deploy_remote.py', '.env.production',
    'check_gilgit.py', 'fix_branding.py', 'prompt.txt',
}

def ssh_exec(ssh, cmd, check=True):
    print(f"  > {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print(err.strip())
    if check and rc != 0:
        print(f"  [WARN] exit code: {rc}")
    return rc, out, err

def upload_dir(sftp, local_path, remote_path):
    """Recursively upload directory, skipping SKIP entries."""
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        sftp.mkdir(remote_path)

    for item in os.listdir(local_path):
        if item in SKIP:
            continue
        local_item = os.path.join(local_path, item)
        remote_item = f"{remote_path}/{item}"

        if os.path.isdir(local_item):
            upload_dir(sftp, local_item, remote_item)
        else:
            size = os.path.getsize(local_item)
            if size > 50 * 1024 * 1024:  # skip files > 50MB
                print(f"  [SKIP] {local_item} ({size} bytes)")
                continue
            print(f"  -> {remote_item}")
            sftp.put(local_item, remote_item)

def main():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()

    print(f"\n1. Preparing remote directory {REMOTE_DIR}...")
    ssh_exec(ssh, f"mkdir -p {REMOTE_DIR}", check=False)

    print(f"\n2. Uploading project files...")
    upload_dir(sftp, LOCAL_DIR, REMOTE_DIR)

    print(f"\n3. Creating .env file...")
    env_content = open(os.path.join(LOCAL_DIR, '.env.production')).read()
    with sftp.open(f"{REMOTE_DIR}/.env", 'w') as f:
        f.write(env_content)

    print(f"\n4. Installing Docker if needed...")
    rc, out, _ = ssh_exec(ssh, "docker --version", check=False)
    if rc != 0:
        print("  Installing Docker...")
        ssh_exec(ssh, "apt-get update && apt-get install -y docker.io docker-compose-plugin", check=False)
        ssh_exec(ssh, "systemctl enable docker && systemctl start docker")

    rc, out, _ = ssh_exec(ssh, "docker compose version", check=False)
    if rc != 0:
        print("  Installing docker-compose plugin...")
        ssh_exec(ssh, "apt-get install -y docker-compose-plugin", check=False)

    print(f"\n5. Stopping system nginx (port 80 conflict)...")
    ssh_exec(ssh, "systemctl stop nginx && systemctl disable nginx", check=False)

    print(f"\n6. Building and starting Docker containers...")
    ssh_exec(ssh, f"cd {REMOTE_DIR} && docker compose --env-file .env down --remove-orphans", check=False)
    rc, out, err = ssh_exec(ssh, f"cd {REMOTE_DIR} && docker compose --env-file .env build --no-cache 2>&1", check=False)
    if rc != 0:
        print(f"Build may have issues, continuing...")

    rc, out, err = ssh_exec(ssh, f"cd {REMOTE_DIR} && docker compose --env-file .env up -d && docker compose --env-file .env restart nginx 2>&1", check=False)

    print(f"\n7. Waiting for services to start...")
    time.sleep(15)

    print(f"\n8. Running Django migrations...")
    ssh_exec(ssh, f"cd {REMOTE_DIR} && docker compose exec -T backend python manage.py migrate --noinput", check=False)

    print(f"\n9. Checking container status...")
    ssh_exec(ssh, f"cd {REMOTE_DIR} && docker compose ps")

    print(f"\n10. Testing endpoints...")
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/v1/products/ || echo 'backend check done'", check=False)
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/ || echo 'frontend check done'", check=False)

    sftp.close()
    ssh.close()
    print(f"\nDone! App should be at http://{HOST}/")

if __name__ == "__main__":
    main()
