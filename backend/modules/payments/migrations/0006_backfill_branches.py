"""Backfill the new branch (warehouse) links on existing data.

Multi-branch isolation keys every transactional record to a warehouse. Historical
rows pre-date that field, so this migration assigns them a branch:

  * Default branch  — the active warehouse holding the most stock (the "main"
    shop), falling back to the oldest warehouse. Used wherever a record's branch
    can't be derived.
  * Orders          — had no warehouse historically -> default branch.
  * PurchaseOrders  — usually already have one; gaps filled with default.
  * Payments /      — derived from their parent transaction (order / purchase /
    TransactionPayment   return); default when the parent can't be resolved.

It also seeds the "Super Admin" role and grandfathers legacy plain-'admin' staff
onto the default branch so they aren't locked out the moment scoping turns on
(super admins / Django superusers are unscoped and need no assignment).
"""
from django.db import migrations


def backfill(apps, schema_editor):
    from django.db.models import Count

    Warehouse = apps.get_model('inventory', 'Warehouse')
    Order = apps.get_model('sales', 'Order')
    PurchaseOrder = apps.get_model('sales', 'PurchaseOrder')
    SaleReturn = apps.get_model('sales', 'SaleReturn')
    PurchaseReturn = apps.get_model('sales', 'PurchaseReturn')
    Payment = apps.get_model('payments', 'Payment')
    TransactionPayment = apps.get_model('payments', 'TransactionPayment')
    Role = apps.get_model('users', 'Role')
    User = apps.get_model('users', 'User')

    # Always make sure the global role exists, even with no warehouses yet.
    Role.objects.get_or_create(
        name='Super Admin',
        defaults={'description': 'Full, cross-branch access to everything.'},
    )

    default_wh = (
        Warehouse.objects.filter(is_active=True)
        .annotate(_n=Count('stocks'))
        .order_by('-_n', 'created_at')
        .first()
    )
    if default_wh is None:
        default_wh = Warehouse.objects.order_by('created_at').first()
    if default_wh is None:
        # No warehouses at all -> nothing to scope to. Leave rows null (visible
        # to super admin only) until branches are created.
        return

    Order.objects.filter(warehouse__isnull=True).update(warehouse=default_wh)
    PurchaseOrder.objects.filter(warehouse__isnull=True).update(warehouse=default_wh)

    def wh_for(source_type, source_id):
        """Branch for a ledger/installment row, derived from its parent."""
        try:
            if source_type == 'order':
                o = Order.objects.filter(pk=source_id).only('warehouse').first()
                return o.warehouse_id if o else None
            if source_type == 'purchaseorder':
                p = PurchaseOrder.objects.filter(pk=source_id).only('warehouse').first()
                return p.warehouse_id if p else None
            if source_type == 'salereturn':
                r = SaleReturn.objects.filter(pk=source_id).select_related('order').first()
                return r.order.warehouse_id if r and r.order_id else None
            if source_type == 'purchasereturn':
                r = (PurchaseReturn.objects.filter(pk=source_id)
                     .select_related('purchase_order').first())
                return r.purchase_order.warehouse_id if r and r.purchase_order_id else None
        except Exception:
            return None
        return None

    # Installments -> parent transaction's branch (default if unresolved).
    for tp in TransactionPayment.objects.filter(warehouse__isnull=True).iterator():
        wid = wh_for(tp.source_type, tp.source_id) or default_wh.id
        TransactionPayment.objects.filter(pk=tp.pk).update(warehouse_id=wid)

    # Ledger entries. Installment rows carry source_id "tp:<id>"; everything else
    # points straight at a parent transaction. Manual entries -> default branch.
    for p in Payment.objects.filter(warehouse__isnull=True).iterator():
        sid = str(p.source_id or '')
        wid = None
        if sid.startswith('tp:'):
            tp = TransactionPayment.objects.filter(pk=sid[3:]).only('warehouse').first()
            wid = tp.warehouse_id if tp else None
        elif p.source_type:
            wid = wh_for(p.source_type, sid)
        Payment.objects.filter(pk=p.pk).update(warehouse_id=(wid or default_wh.id))

    # Grandfather legacy plain-'admin' staff onto the default branch.
    for u in User.objects.filter(is_superuser=False):
        role_name = ''
        if u.role_id:
            r = Role.objects.filter(pk=u.role_id).first()
            role_name = ((r.name if r else '') or '').strip().lower()
        if role_name == 'admin' and not u.warehouses.exists():
            u.warehouses.add(default_wh)


def noop(apps, schema_editor):
    # Irreversible by design: we can't tell backfilled rows from later edits.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0009_warehouse_area_warehouse_is_active'),
        ('sales', '0026_order_warehouse'),
        ('users', '0010_user_warehouses'),
        ('payments', '0005_payment_warehouse_transactionpayment_warehouse'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
