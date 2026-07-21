"""Backfill the ``tenant`` (owning-Admin) FK on existing rows for strict
multi-tenant isolation.

Run AFTER the tenant-FK schema migrations and the tenant-aware code are deployed,
BEFORE relying on per-tenant scoping for historical data. Idempotent: it only ever
fills rows whose ``tenant`` is still NULL, so it is safe to re-run.

    python manage.py backfill_tenants            # apply
    python manage.py backfill_tenants --dry-run  # report only, change nothing

Attribution rules (the owning Admin = the tenant):
  * A row created by an **Admin**            -> tenant = that Admin.
  * A row created by a **staff** sub-user    -> tenant = the staff's Admin (User.tenant).
  * A row created by the **Super Admin**, an unresolved staff, or nobody (storefront
    / anonymous) -> tenant stays NULL == public/unscoped (correct: the platform
    operator and the public shop are never tenant-locked).

Rows with no creator are derived from a related row's tenant where possible
(Product<-Stock, StockMovement<-Stock, SaleReturn<-Order, Warehouse<-assigned admin).
Genuinely ambiguous rows are LEFT NULL and reported, never guessed.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


def _owning_admin_id(creator):
    """The owning-Admin pk for a creating user, or None when it should stay public.

    Mirrors core.scoping.tenant_id_for but operates on a raw model instance:
    Admin -> self; staff with a tenant -> that tenant; Super Admin / superuser /
    unresolved -> None.
    """
    if creator is None:
        return None
    from core.scoping import is_platform_operator
    if is_platform_operator(creator):
        return None
    tid = getattr(creator, 'tenant_id', None)
    if tid:
        return tid
    role = ''
    if getattr(creator, 'role_id', None):
        role = (getattr(creator.role, 'name', '') or '').strip().lower()
    if role == 'admin':
        return creator.pk
    return None  # ambiguous staff with no tenant — flagged, not guessed


class Command(BaseCommand):
    help = "Backfill the per-Admin tenant FK on existing rows (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change without writing.')

    def handle(self, *args, **opts):
        self.dry = opts['dry_run']
        self.stdout.write(self.style.WARNING(
            ('DRY RUN — no changes will be written.' if self.dry else 'Backfilling tenants...')))

        with transaction.atomic():
            self._backfill_staff_users()
            self._backfill_simple_creator()
            self._backfill_derived()
            if self.dry:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS('Done.'))

    # ── staff users -> their Admin (best-effort via shared warehouse) ──────────
    def _backfill_staff_users(self):
        from modules.users.models import User
        from core.scoping import is_platform_operator
        admins = list(User.objects.filter(role__name__iexact='admin'))
        # Map warehouse id -> [admin ids] so we can resolve a staff user's Admin.
        wh_to_admins = {}
        for a in admins:
            for wid in a.warehouses.values_list('id', flat=True):
                wh_to_admins.setdefault(wid, []).append(a.pk)

        staff = User.objects.filter(tenant__isnull=True, is_staff=True)
        assigned = ambiguous = 0
        for u in staff:
            if is_platform_operator(u):
                continue
            role = (u.role.name if u.role_id else '') or ''
            if role.strip().lower() == 'admin':
                continue  # an Admin's tenant is itself (NULL resolves to own pk)
            candidates = set()
            for wid in u.warehouses.values_list('id', flat=True):
                candidates.update(wh_to_admins.get(wid, []))
            if len(candidates) == 1:
                aid = next(iter(candidates))
                if not self.dry:
                    User.objects.filter(pk=u.pk).update(tenant_id=aid)
                assigned += 1
            elif candidates:
                ambiguous += 1
                self.stdout.write(f'  [staff ambiguous] user#{u.pk} {u.username!r} '
                                  f'shares warehouses with admins {sorted(candidates)} — left NULL')
        self.stdout.write(f'Staff users: {assigned} assigned, {ambiguous} ambiguous (left NULL).')

    # ── rows that carry a direct creator FK ────────────────────────────────────
    def _backfill_simple_creator(self):
        # (model_path, creator_attr)
        from modules.sales.models import Order, PurchaseOrder, SaleReturn
        from modules.inventory.models import Stock
        from modules.customer.models import Customer
        from modules.payments.models import Payment, TransactionPayment
        from modules.users.models import UserActivityLog
        targets = [
            (Order, 'created_by'),
            (PurchaseOrder, 'created_by'),
            (SaleReturn, 'user'),
            (Stock, 'created_by'),
            (Customer, 'created_by'),
            (Payment, 'user'),
            (TransactionPayment, 'created_by'),
            (UserActivityLog, 'user'),
        ]
        for Model, attr in targets:
            qs = Model.objects.filter(tenant__isnull=True).select_related(attr)
            filled = 0
            for row in qs.iterator():
                creator = getattr(row, attr, None)
                aid = _owning_admin_id(creator)
                if aid and not self.dry:
                    Model.objects.filter(pk=row.pk).update(tenant_id=aid)
                if aid:
                    filled += 1
            self.stdout.write(f'{Model.__name__}: {filled} attributed via {attr}.')

    # ── rows whose tenant is derived from a related row ────────────────────────
    def _backfill_derived(self):
        from modules.products.models import Product
        from modules.inventory.models import StockMovement, Warehouse
        from modules.users.models import User

        # Product <- its Stock's tenant (Product has no creator of its own).
        filled = 0
        for p in Product.objects.filter(tenant__isnull=True).select_related('stock').iterator():
            aid = getattr(p.stock, 'tenant_id', None) if p.stock_id else None
            if not aid and p.stock_id:
                aid = _owning_admin_id(getattr(p.stock, 'created_by', None))
            if aid and not self.dry:
                Product.objects.filter(pk=p.pk).update(tenant_id=aid)
            if aid:
                filled += 1
        self.stdout.write(f'Product: {filled} attributed via Stock.')

        # StockMovement <- its Stock's tenant.
        filled = 0
        for m in StockMovement.objects.filter(tenant__isnull=True).select_related('stock').iterator():
            aid = getattr(m.stock, 'tenant_id', None) if m.stock_id else None
            if aid and not self.dry:
                StockMovement.objects.filter(pk=m.pk).update(tenant_id=aid)
            if aid:
                filled += 1
        self.stdout.write(f'StockMovement: {filled} attributed via Stock.')

        # Warehouse <- the single Admin it is assigned to (User.warehouses M2M).
        assigned = ambiguous = 0
        admins = list(User.objects.filter(role__name__iexact='admin'))
        for w in Warehouse.objects.filter(tenant__isnull=True).iterator():
            owners = [a.pk for a in admins if a.warehouses.filter(pk=w.pk).exists()]
            if len(owners) == 1:
                if not self.dry:
                    Warehouse.objects.filter(pk=w.pk).update(tenant_id=owners[0])
                assigned += 1
            elif owners:
                ambiguous += 1
                self.stdout.write(f'  [warehouse ambiguous] warehouse#{w.pk} {w.name!r} '
                                  f'assigned to admins {sorted(owners)} — left NULL')
        self.stdout.write(f'Warehouse: {assigned} attributed, {ambiguous} ambiguous (left NULL).')
