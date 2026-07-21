"""READ-ONLY watcher for an in-progress AlQavi deploy.

deploy.ps1 launches the rebuild detached (nohup) on the server and writes its
output to /opt/alqavi-cds/deploy.log. If the local launcher dies (e.g. a console
encoding crash) the server build keeps running. This script does NOT deploy or run
any migration - it only opens one SSH session and tails that log until the build
reports DEPLOY_OK / DEPLOY_FAIL, then prints container status. Pure observation.

Run:  python check_deploy.py
"""
import paramiko, time, sys

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HOST = '74.208.242.204'
USER = 'root'
PASSWORD = 'od1stQGtxan1P'
REMOTE = '/opt/alqavi-cds'
LOG = REMOTE + '/deploy.log'


def connect():
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect(HOST, username=USER, password=PASSWORD, timeout=40,
              banner_timeout=40, auth_timeout=40)
    t = s.get_transport()
    if t:
        t.set_keepalive(30)
    return s


def run(s, cmd, to=60):
    i, o, e = s.exec_command(cmd, timeout=to)
    return o.read().decode('utf-8', 'replace')


def main():
    print('Attaching to running build (read-only)...', flush=True)
    s = connect()
    seen = 0
    status = None
    deadline = time.time() + 2400  # 40 min
    while time.time() < deadline:
        try:
            t = s.get_transport()
            if not t or not t.is_active():
                time.sleep(8)
                s = connect()
            out = run(s, 'cat ' + LOG + ' 2>/dev/null')
        except Exception:
            try:
                time.sleep(10)
                s = connect()
            except Exception:
                pass
            time.sleep(8)
            continue
        if len(out) > seen:
            sys.stdout.write(out[seen:])
            sys.stdout.flush()
            seen = len(out)
        if 'DEPLOY_OK' in out:
            status = 'OK'
            break
        if 'DEPLOY_FAIL' in out:
            status = 'FAIL'
            break
        time.sleep(12)

    print('\n--- build status: ' + str(status) + ' ---', flush=True)
    try:
        print(run(s, 'cd ' + REMOTE + ' && docker compose --env-file .env ps'), flush=True)
    except Exception:
        pass
    try:
        for name, url in [('Frontend', 'https://localhost/'),
                          ('Backend API', 'https://localhost/api/v1/products/'),
                          ('Admin Dashboard', 'https://localhost/admin/dashboard')]:
            try:
                code = run(s, "curl -sk -o /dev/null -w '%{http_code}' " + url, 25).strip()
            except Exception:
                code = 'ERR'
            print('  ' + name + ': ' + ('OK' if code in ('200', '301', '302') else 'WARN (' + code + ')'), flush=True)
    except Exception:
        pass
    try:
        s.close()
    except Exception:
        pass
    sys.exit(0 if status == 'OK' else 1)


if __name__ == '__main__':
    main()
