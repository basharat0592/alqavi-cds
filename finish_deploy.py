"""Finish the AlQavi production deploy over a SINGLE persistent SSH connection.

The project files are already uploaded to the server by deploy.ps1. Its build phase
fails because it opens a *burst* of new SSH connections, which the server resets.
This opens ONE connection (like the upload, which always works), keeps it, launches
the build detached, and polls the log via channels on the SAME transport — no new
TCP connections. Reconnects only if the single session actually drops.

Run:  python finish_deploy.py
"""
import paramiko, time, sys

HOST = '74.208.242.204'
USER = 'root'
PASSWORD = 'od1stQGtxan1P'
REMOTE = '/opt/alqavi-cds'
ENV = '--env-file .env'

chain = (
    f'cd {REMOTE}'
    f' && docker compose {ENV} build backend'
    f' && docker compose {ENV} --profile build build frontend-builder'
    f' && docker compose {ENV} --profile build run --rm frontend-builder'
    f' && docker compose {ENV} up -d'
    f' && docker compose {ENV} restart frontend nginx'
    f' && docker compose {ENV} exec -T backend python manage.py migrate --noinput'
    f' && docker compose {ENV} exec -T backend python manage.py backfill_tenants'
    f' && docker compose {ENV} exec -T backend python manage.py seed_roles'
    f' && docker compose {ENV} exec -T backend python manage.py seed_permissions'
    f' && docker compose {ENV} exec -T backend python manage.py seed_areas'
)
script = '#!/bin/bash\n( ' + chain + ' ) && echo DEPLOY_OK || echo DEPLOY_FAIL\n'
SH = f'{REMOTE}/_deploy_run.sh'
LOG = f'{REMOTE}/deploy.log'


def connect():
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect(HOST, username=USER, password=PASSWORD, timeout=40,
              banner_timeout=40, auth_timeout=40)
    t = s.get_transport()
    if t:
        t.set_keepalive(30)
    return s


def run(s, cmd, timeout=120):
    i, o, e = s.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')


def main():
    print('Connecting (single persistent session)...', flush=True)
    s = connect()
    print('Connected. Writing run-script + launching detached build...', flush=True)
    i, o, e = s.exec_command('cat > ' + SH, timeout=30)
    i.write(script); i.flush(); i.channel.shutdown_write(); o.read(); e.read()
    run(s, 'chmod +x ' + SH, 20)
    run(s, 'rm -f ' + LOG + '; nohup ' + SH + ' > ' + LOG + ' 2>&1 < /dev/null &', 20)
    print('Build launched on server. Polling log every 15s on the SAME connection...', flush=True)

    seen = 0
    status = None
    deadline = time.time() + 2700  # 45 min
    while time.time() < deadline:
        time.sleep(15)
        try:
            t = s.get_transport()
            if not t or not t.is_active():
                print('  (connection dropped — reconnecting once)', flush=True)
                time.sleep(8)
                s = connect()
            out, _ = run(s, f'cat {LOG} 2>/dev/null', 60)
        except Exception as ex:
            print(f'  (poll hiccup: {ex} — reconnecting)', flush=True)
            try:
                time.sleep(10)
                s = connect()
            except Exception as ex2:
                print(f'  (reconnect failed: {ex2})', flush=True)
            continue
        if len(out) > seen:
            sys.stdout.write(out[seen:]); sys.stdout.flush()
            seen = len(out)
        if 'DEPLOY_OK' in out:
            status = 'OK'; break
        if 'DEPLOY_FAIL' in out:
            status = 'FAIL'; break

    print(f'\n--- build status: {status} ---', flush=True)
    try:
        out, _ = run(s, f'cd {REMOTE} && docker compose ps', 60)
        print(out, flush=True)
    except Exception:
        pass
    try:
        for name, url in [
            ('Frontend', 'https://localhost/'),
            ('Backend API', 'https://localhost/api/v1/products/'),
            ('Admin Dashboard', 'https://localhost/admin/dashboard'),
        ]:
            out, _ = run(s, f"curl -sk -o /dev/null -w '%{{http_code}}' {url}", 25)
            print(f'  {name}: {out.strip()}', flush=True)
    except Exception:
        pass
    try:
        s.close()
    except Exception:
        pass
    print('\nDeployment finished.' if status == 'OK' else '\nBuild did not report OK — see log above.', flush=True)
    sys.exit(0 if status == 'OK' else 1)


if __name__ == '__main__':
    main()
