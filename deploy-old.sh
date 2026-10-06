#!/bin/bash
# Build + run the isolated "old" stack, then migrate/seed its fresh database.
# Run from the old stack directory on the server, e.g. /opt/alqavi-old
#
#   cd /opt/alqavi-old && bash deploy-old.sh
#
# Safe to re-run. Does NOT touch the live stack in /opt/alqavi-cds.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.old.yml --env-file .env.old"
BE="$COMPOSE exec -T oldbackend python manage.py"

echo ">> Ensuring shared 'edge' network exists..."
docker network inspect edge >/dev/null 2>&1 || docker network create edge

echo ">> Building images (backend + frontend builder)..."
$COMPOSE --profile build build

echo ">> Building Next.js bundle into the frontend_build volume..."
$COMPOSE --profile build run --rm oldfrontend-builder

echo ">> Starting the old stack..."
$COMPOSE up -d

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

echo ">> Restarting frontend + internal nginx to pick up fresh bundle..."
$COMPOSE restart oldfrontend oldnginx

echo "DEPLOY_OLD_OK"
echo
echo "Next: create a super admin for the old stack's fresh DB:"
echo "  $COMPOSE exec oldbackend python manage.py createsuperuser"
