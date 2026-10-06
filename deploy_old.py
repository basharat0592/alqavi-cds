"""Deploy the alqavi_old branch to the isolated "old" stack (old.alqavitraders.com).

Flow:
  1. Local safety checks: on branch alqavi_old, no uncommitted changes, pushed to GitHub.
  2. ONE SSH session to the server (it resets bursts of new connections):
       cd /opt/alqavi-old && git fetch && git reset --hard origin/alqavi_old
       nohup bash deploy-old.sh <mode>   (log: /opt/alqavi-old/deploy-old.log)
     then polls that log on the same connection until DEPLOY_OLD_OK / failure.
  3. Checks https://old.alqavitraders.com responds.

Only /opt/alqavi-old is touched - never the live stack in /opt/alqavi-cds.

Usage (from the repo root):
  python deploy_old.py                 # full deploy (backend + frontend)
  python deploy_old.py --backend       # backend only (+ migrations)
  python deploy_old.py --frontend      # frontend bundle only
  python deploy_old.py --push          # git push origin alqavi_old first, then deploy
  python deploy_old.py --watch         # follow a deploy that is already running
  python deploy_old.py --status        # just show old-stack containers + last log lines
  python deploy_old.py --allow-dirty   # deploy committed code even with local uncommitted edits

SSH password: read from ALQAVI_SSH_PASSWORD, else from .env.deploy
(SSH_PASSWORD=...; gitignored), else prompted.
"""
import argparse, getpass, os, subprocess, sys, time, urllib.request, ssl

import paramiko

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HOST = '74.208.242.204'
USER = 'root'
BRANCH = 'alqavi_old'
REMOTE = '/opt/alqavi-old'
LOG = REMOTE + '/deploy-old.log'
COMPOSE = 'docker compose -f docker-compose.old.yml --env-file .env.old'
SITE = 'https://old.alqavitraders.com'
HERE = os.path.dirname(os.path.abspath(__file__))


def git(*args):
    return subprocess.run(['git', *args], cwd=HERE, capture_output=True,
                          text=True).stdout.strip()


def fail(msg):
    print(f'\nERROR: {msg}')
    sys.exit(1)


def password():
    pw = os.environ.get('ALQAVI_SSH_PASSWORD')
    if pw:
        return pw
    path = os.path.join(HERE, '.env.deploy')
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            if line.strip().startswith('SSH_PASSWORD='):
                return line.split('=', 1)[1].strip()
    return getpass.getpass(f'SSH password for {USER}@{HOST}: ')


def local_checks(push, allow_dirty):
    branch = git('rev-parse', '--abbrev-ref', 'HEAD')
    if branch != BRANCH:
        fail(f"you are on '{branch}'. Switch to '{BRANCH}' first (git checkout {BRANCH}).")

    # next-env.d.ts is rewritten by every `next dev` run - ignore it.
    dirty = [l for l in git('status', '--porcelain', '--untracked-files=no').splitlines()
             if not l.endswith('frontend/next-env.d.ts')]
    if dirty and allow_dirty:
        print('>> WARNING: uncommitted changes are NOT deployed:\n  ' + '\n  '.join(dirty))
    elif dirty:
        fail('uncommitted changes - commit them first:\n  ' + '\n  '.join(dirty))

    if push:
        print(f'>> git push origin {BRANCH}')
        r = subprocess.run(['git', 'push', 'origin', BRANCH], cwd=HERE)
        if r.returncode:
            fail('git push failed.')

    git('fetch', 'origin', BRANCH)
    ahead = git('rev-list', '--count', f'origin/{BRANCH}..HEAD')
    if ahead not in ('', '0'):
        fail(f'{ahead} local commit(s) not on GitHub. Run with --push, or git push first.')

    print(f">> Deploying {BRANCH} @ {git('log', '-1', '--format=%h %s')}")


def connect(pw):
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect(HOST, username=USER, password=pw, timeout=40,
              banner_timeout=40, auth_timeout=40)
    s.get_transport().set_keepalive(30)
    return s


def run(s, cmd, to=120):
    _, o, e = s.exec_command(cmd, timeout=to)
    out = o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
    return o.channel.recv_exit_status(), out


def status(s):
    _, out = run(s, f'cd {REMOTE} && {COMPOSE} ps --format "table {{{{.Service}}}}\\t{{{{.Status}}}}"'
                    f' && echo && tail -n 15 {LOG} 2>/dev/null')
    print(out)


def deploy(s, mode):
    code, out = run(s, f'test -f {REMOTE}/.env.old && test -d {REMOTE}/.git && echo OK')
    if 'OK' not in out:
        fail(f'{REMOTE} is not set up on the server (need a git clone + .env.old). '
             'See OLD_STACK_SETUP.md.')

    code, out = run(s, f'pgrep -f "bash deploy-[o]ld.sh" >/dev/null && echo BUSY || echo FREE')
    if 'BUSY' in out:
        fail('a deploy is already running on the server. Use --watch to follow it.')

    print('>> Updating code on the server...')
    code, out = run(s, f'cd {REMOTE} && git fetch origin {BRANCH} 2>&1'
                       f' && git reset --hard origin/{BRANCH} 2>&1')
    print(out.strip())
    if code:
        fail('git update on the server failed.')

    print(f'>> Launching deploy-old.sh {mode} (log: {LOG})...')
    # setsid + full redirection so the background job holds no fd of this SSH
    # channel - otherwise the channel never reaches EOF and the read blocks.
    run(s, f'cd {REMOTE} && (setsid nohup bash deploy-old.sh {mode} > {LOG} 2>&1 < /dev/null &) && echo started',
        to=30)
    return watch(s)


def watch(s):
    # Poll the log on the SAME connection; print only new lines.
    seen, start = 0, time.time()
    while time.time() - start < 40 * 60:
        time.sleep(10)
        _, out = run(s, f'cat {LOG} 2>/dev/null; echo; '
                        f'pgrep -f "bash deploy-[o]ld.sh" >/dev/null && echo __RUNNING__ || echo __DONE__')
        lines = out.rstrip().splitlines()
        state = lines.pop() if lines else '__RUNNING__'
        for line in lines[seen:]:
            print('   ' + line)
        seen = len(lines)
        if any('DEPLOY_OLD_OK' in l for l in lines):
            return True
        if state == '__DONE__':
            return False
    fail('timed out after 40 minutes - check with --status.')


def health():
    ctx = ssl.create_default_context()
    for _ in range(6):
        try:
            with urllib.request.urlopen(SITE, timeout=20, context=ctx) as r:
                print(f'>> {SITE} -> HTTP {r.status}')
                return True
        except Exception as ex:
            last = ex
            time.sleep(10)
    print(f'>> {SITE} not responding yet: {last}')
    return False


def main():
    ap = argparse.ArgumentParser(description='Deploy alqavi_old to old.alqavitraders.com')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--backend', action='store_true', help='backend only (+ migrations)')
    g.add_argument('--frontend', action='store_true', help='frontend bundle only')
    g.add_argument('--watch', action='store_true', help='follow a deploy already running')
    g.add_argument('--status', action='store_true', help='show container status + log tail')
    ap.add_argument('--push', action='store_true', help='git push origin alqavi_old first')
    ap.add_argument('--allow-dirty', action='store_true',
                    help='deploy committed code even if there are local uncommitted edits')
    a = ap.parse_args()

    if not (a.status or a.watch):
        local_checks(a.push, a.allow_dirty)

    s = connect(password())
    try:
        if a.status:
            status(s)
            return
        if a.watch:
            ok = watch(s)
        else:
            mode = 'backend' if a.backend else 'frontend' if a.frontend else 'all'
            ok = deploy(s, mode)
        print()
        status(s)
    finally:
        s.close()

    if not ok:
        fail('deploy-old.sh failed - see the log above.')
    print('DEPLOY OK')
    health()


if __name__ == '__main__':
    main()
