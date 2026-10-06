# Run the project on your PC (local development)

Runs MySQL + Django + Next.js in Docker, with hot reload. No SSL, no server.
- App:  **http://localhost:3000**
- API:  **http://localhost:8000/api**

Everything below is typed in **PowerShell** on your PC, in the project folder.

---

## Part A — Install Docker Desktop (one time)

1. Download **Docker Desktop for Windows**: https://www.docker.com/products/docker-desktop/
2. Run the installer. Keep **"Use WSL 2"** checked. Finish, and **restart the PC** if asked.
3. Launch **Docker Desktop** from the Start menu. Wait until the whale icon (bottom-right tray)
   stops animating and shows **"Engine running"**.
   - If it complains that virtualization/WSL2 is off, open PowerShell **as Administrator** and run:
     ```
     wsl --install
     ```
     then restart and open Docker Desktop again.
4. Confirm it works — in a normal PowerShell:
   ```
   docker --version
   docker compose version
   ```
   Both should print a version. If "command not found", close and reopen PowerShell (or reboot).

---

## Part B — Start the app

1. Go to the project and make your local env file:
   ```
   cd f:\project\alqavi-cds
   copy .env.local.example .env.local
   ```
2. Build and start everything (first time pulls images + builds — can take 5–10 min):
   ```
   docker compose -f docker-compose.local.yml --env-file .env.local up -d --build
   ```
3. Set up the database (run once):
   ```
   docker compose -f docker-compose.local.yml --env-file .env.local exec backend python manage.py migrate
   docker compose -f docker-compose.local.yml --env-file .env.local exec backend python manage.py seed_roles
   docker compose -f docker-compose.local.yml --env-file .env.local exec backend python manage.py seed_permissions
   docker compose -f docker-compose.local.yml --env-file .env.local exec backend python manage.py seed_areas
   ```
4. Create your local admin login:
   ```
   docker compose -f docker-compose.local.yml --env-file .env.local exec backend python manage.py createsuperuser
   ```
5. Open **http://localhost:3000** in your browser.
   - The frontend may take a minute the first time (it runs `npm install` then compiles).
   - Watch progress with: `docker compose -f docker-compose.local.yml --env-file .env.local logs -f frontend`

---

## Everyday commands
```
cd f:\project\alqavi-cds
# start / stop
docker compose -f docker-compose.local.yml --env-file .env.local up -d
docker compose -f docker-compose.local.yml --env-file .env.local down
# logs
docker compose -f docker-compose.local.yml --env-file .env.local logs -f backend
docker compose -f docker-compose.local.yml --env-file .env.local logs -f frontend
# status
docker compose -f docker-compose.local.yml --env-file .env.local ps
```
Code edits under `frontend/` and `backend/` reload automatically — no rebuild needed.
Only re-run with `--build` if you change `requirements` or the Dockerfile.

## Reset the local database (wipes local data only)
```
docker compose -f docker-compose.local.yml --env-file .env.local down -v
```
