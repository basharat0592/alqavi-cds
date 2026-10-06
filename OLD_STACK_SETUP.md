# "old" stack setup — old.alqavitraders.com

Runs the **alqavi_old** branch on the server **next to** the live site, fully isolated
(own containers, own fresh database), reached at **https://old.alqavitraders.com**.

- Live stack: `/opt/alqavi-cds` — **never touched** except one additive nginx block (Step 6).
- Old stack: `/opt/alqavi-old` — everything new lives here.

Run the steps in order. Each `$ ...` line is pasted into the server terminal
(`ssh root@74.208.242.204`, then the commands).

---

## Step 0 — DNS (do this first; the SSL cert needs it)
In your **IONOS** control panel → the domain `alqavitraders.com` → DNS:
- Add an **A record**: host/name `old`, value `74.208.242.204`.
- Save. Wait ~5–15 min, then from the server check it resolves:
  ```
  $ getent hosts old.alqavitraders.com
  ```
  You should see `74.208.242.204`. Don't continue until it does.

## Step 1 — Get the alqavi_old code onto the server
```
$ git clone https://github.com/basharat0592/alqavi-cds.git /opt/alqavi-old
$ cd /opt/alqavi-old
$ git checkout alqavi_old
```
If git asks for a login, use your GitHub username and a personal-access-token as the
password. (If you can't clone, tell me and I'll give you a no-GitHub copy method.)

## Step 2 — Create the old stack's environment file
```
$ cd /opt/alqavi-old
$ cp .env.old.example .env.old
$ nano .env.old
```
Fill in:
- `MYSQL_ROOT_PASSWORD` — a NEW strong password (not the live one)
- `SECRET_KEY` — a new random string (50+ chars)
- leave `NEXT_PUBLIC_API_URL=https://old.alqavitraders.com/api` and the hosts as-is

Save in nano: `Ctrl+O`, Enter, then `Ctrl+X`.

## Step 3 — Build + start the old stack (creates its own fresh DB)
```
$ cd /opt/alqavi-old
$ bash deploy-old.sh
```
This creates the shared `edge` network, builds images, builds the frontend bundle,
starts the stack, and runs all migrations + seeds. Wait for it to print
**`DEPLOY_OLD_OK`**. (First run takes several minutes.)

## Step 4 — Connect the LIVE nginx to the shared network
So the live nginx can reach the old stack. This does **not** restart or rebuild the
live site — it just attaches it to the `edge` network:
```
$ docker network connect edge $(cd /opt/alqavi-cds && docker compose --env-file .env ps -q nginx)
```
(If a future live redeploy recreates the live nginx, re-run this one command.)

## Step 5 — Issue the SSL certificate for the subdomain
Uses the live stack's existing certbot. DNS (Step 0) must already point here:
```
$ cd /opt/alqavi-cds
$ docker compose --env-file .env run --rm --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot -d old.alqavitraders.com \
    --non-interactive --agree-tos -m admin@alqavi.com
```
Expect "Successfully received certificate". The cert file lands where the nginx block
in Step 6 expects it.

## Step 6 — Add the subdomain block to the LIVE nginx (additive)
Append the ready-made block to the live config, then validate before reloading:
```
$ cd /opt/alqavi-cds
$ cat /opt/alqavi-old/docker/nginx/old-subdomain.live-block.conf >> docker/nginx/default.conf
$ docker compose --env-file .env exec nginx nginx -t
```
- If it prints **"syntax is ok" / "test is successful"**, reload:
  ```
  $ docker compose --env-file .env exec nginx nginx -s reload
  ```
- If `nginx -t` reports an error, **do not reload**. The live site keeps running on the
  old config. Undo the append and send me the error:
  ```
  $ git checkout -- docker/nginx/default.conf     # if /opt/alqavi-cds is a git checkout
  ```

## Step 7 — Create the old stack's super admin
```
$ cd /opt/alqavi-old
$ docker compose -f docker-compose.old.yml --env-file .env.old exec oldbackend \
    python manage.py createsuperuser
```
Enter an email/username and password you choose — this is the login for the old site.

## Step 8 — Verify
- Open **https://old.alqavitraders.com** — the storefront loads with a padlock.
- Log in with the super admin from Step 7.
- The live site **https://alqavitraders.com** is unchanged.

---

## Everyday commands (old stack)
```
$ cd /opt/alqavi-old
# status / logs
$ docker compose -f docker-compose.old.yml --env-file .env.old ps
$ docker compose -f docker-compose.old.yml --env-file .env.old logs -f oldbackend
# after pulling new alqavi_old code: rebuild + migrate
$ git pull && bash deploy-old.sh
# stop / start
$ docker compose -f docker-compose.old.yml --env-file .env.old down
$ docker compose -f docker-compose.old.yml --env-file .env.old up -d
```

## Tear down the old stack completely (live untouched)
```
$ cd /opt/alqavi-old
$ docker compose -f docker-compose.old.yml --env-file .env.old down -v   # -v also deletes its DB
# then remove the subdomain block you appended in Step 6 and reload live nginx.
```
