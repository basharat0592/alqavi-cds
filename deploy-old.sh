#!/bin/bash
# Build + run the isolated "old" stack, then migrate/seed its database.
# Run from the old stack directory on the server, e.g. /opt/alqavi-old
#
#   cd /opt/alqavi-old && bash deploy-old.sh            # full: backend + frontend
#   cd /opt/alqavi-old && bash deploy-old.sh backend    # backend only (+ migrations)
#   cd /opt/alqavi-old && bash deploy-old.sh frontend   # frontend bundle only
#
# Safe to re-run. Does NOT touch the live stack in /opt/alqavi-cds.
set -euo pipefail

MODE="${1:-all}"
case "$MODE" in
  all|backend|frontend) ;;
  *) echo "Unknown mode '$MODE' (use: all | backend | frontend)"; exit 1 ;;
esac

COMPOSE="docker compose -f docker-compose.old.yml --env-file .env.old"
BE="$COMPOSE exec -T oldbackend python manage.py"

echo ">> Ensuring shared 'edge' network exists..."
docker network inspect edge >/dev/null 2>&1 || docker network create edge

if [ "$MODE" != "frontend" ]; then
  echo ">> Building backend image..."
  $COMPOSE build oldbackend
fi

if [ "$MODE" != "backend" ]; then
  echo ">> Building Next.js bundle into the frontend_build volume..."
  $COMPOSE --profile build build oldfrontend-builder
  $COMPOSE --profile build run --rm oldfrontend-builder
fi

echo ">> Starting the old stack..."
$COMPOSE up -d

if [ "$MODE" != "frontend" ]; then
  echo ">> Waiting for the database to accept connections..."
  until $COMPOSE exec -T olddb mysqladmin ping -h localhost --silent >/dev/null 2>&1; do
    sleep 3
  done

  echo ">> Running migrations + seeds (same chain as the live deploy)..."
  $BE normalize_collation
  $BE migrate --noinput
  $BE backfill_tenants
  $BE seed_roles
  $BE seed_permissions
  $BE seed_areas
  $BE resync_product_quantities
  $BE reconcile_cod_payments

  echo ">> Restarting backend to load new code..."
  $COMPOSE restart oldbackend
fi

echo ">> Restarting frontend + internal nginx to pick up fresh bundle..."
$COMPOSE restart oldfrontend oldnginx

echo "DEPLOY_OLD_OK"
