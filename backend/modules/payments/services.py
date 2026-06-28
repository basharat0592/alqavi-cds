"""Ledger helpers.

These functions turn business events (sales, purchase payments, returns) into
ledger entries. They are idempotent: calling them twice for the same record
updates the existing entry instead of creating a duplicate.
"""
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import Payment, PaymentCategory, TransactionPayment


# Default categories seeded by migration; we fall back to get_or_create so the
# helpers never fail even if a category was deleted by hand.
def _category(name, ctype='both'):
    cat, _ = PaymentCategory.objects.get_or_create(name=name, defaults={'type': ctype})
    return cat


def _real_user(user):
    """Only attach real staff User accounts; suppliers/customers are shadow users."""
    if user is None:
        return None
    if getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False):
        return None
    return user if getattr(user, 'pk', None) and user.__class__.__name__ == 'User' else None


def _upsert_auto(source, source_type, source_id, defaults):
    """Create or update the single auto entry for a given business record."""
    payment, created = Payment.objects.update_or_create(
        source=source,
        source_type=source_type,
        source_id=str(source_id),
        is_auto=True,
        defaults=defaults,
    )
    return payment


def _remove_auto(source, source_type, source_id):
    Payment.objects.filter(
        source=source, source_type=source_type, source_id=str(source_id), is_auto=True
    ).delete()


def aging_buckets(items, today=None):
    """Age outstanding balances into receivable/payable buckets.

    items: iterable of (remaining_amount, basis_date) where basis_date is the
    due date (or fall back to the transaction date). Returns the standard
    current / 1-30 / 31-60 / 61-90 / 90+ buckets.
    """
    today = today or timezone.localdate()
    buckets = {'current': 0.0, 'd1_30': 0.0, 'd31_60': 0.0, 'd61_90': 0.0, 'd90_plus': 0.0}
    for remaining, basis in items:
        rem = float(remaining or 0)
        if rem <= 0:
            continue
        days = (today - basis).days if basis else 0
        if days <= 0:
            buckets['current'] += rem
        elif days <= 30:
            buckets['d1_30'] += rem
        elif days <= 60:
            buckets['d31_60'] += rem
        elif days <= 90:
            buckets['d61_90'] += rem
        else:
            buckets['d90_plus'] += rem
    return {k: round(v, 2) for k, v in buckets.items()}


# ── Installments (partial payments over time) ────────────────────────────────
#
# A TransactionPayment is one installment against a transaction. Each *confirmed*
# installment posts its own ledger row (keyed by the installment id so partial
# payments stay separate), and the parent's paid amount / status is recomputed
# from the sum of confirmed installments.

# Which ledger source + category each transaction type maps to.
_LEDGER_SOURCE = {
    'order': 'sale',
    'purchaseorder': 'purchase',
    'salereturn': 'sale_return',
    'purchasereturn': 'purchase_return',
}
_LEDGER_CATEGORY = {
    'order': ('Sales', 'inbound'),
    'purchaseorder': ('Purchase Payment', 'outbound'),
    'salereturn': ('Sale Return', 'outbound'),
    'purchasereturn': ('Purchase Return', 'inbound'),
}
# TransactionPayment.method → Payment.method (the ledger uses a smaller set).
_LEDGER_METHOD = {
    'cash': 'cash', 'bank_transfer': 'bank_transfer', 'online': 'bank_transfer',
    'cheque': 'check', 'wallet': 'mobile_wallet', 'other': 'other',
}


def _load_parent(source_type, source_id):
    from modules.sales.models import Order, PurchaseOrder, SaleReturn, PurchaseReturn
    model = {
        'order': Order, 'purchaseorder': PurchaseOrder,
        'salereturn': SaleReturn, 'purchasereturn': PurchaseReturn,
    }.get(source_type)
    if not model:
        return None
    return model.objects.filter(pk=source_id).first()


def parent_warehouse_id(source_type, source_id):
    """Branch (warehouse) id for a transaction, used to stamp its ledger rows so
    they stay branch-scoped. Returns None when it can't be resolved."""
    parent = _load_parent(source_type, source_id)
    if parent is None:
        return None
    if source_type in ('order', 'purchaseorder'):
        return getattr(parent, 'warehouse_id', None)
    if source_type == 'salereturn':
        return getattr(getattr(parent, 'order', None), 'warehouse_id', None)
    if source_type == 'purchasereturn':
        return getattr(getattr(parent, 'purchase_order', None), 'warehouse_id', None)
    return None


def parent_tenant_id(source_type, source_id):
    """Owning-Admin (tenant) id for a transaction, used to stamp its ledger rows
    and installments so they stay tenant-scoped — authoritative even when the
    acting user is None. Returns None when it can't be resolved."""
    parent = _load_parent(source_type, source_id)
    if parent is None:
        return None
    return getattr(parent, 'tenant_id', None)


def _status_for(paid, total):
    paid = Decimal(str(paid or 0))
    total = Decimal(str(total or 0))
    if paid <= 0:
        return 'UNPAID'
    if paid >= total > 0:
        return 'PAID'
    return 'PARTIAL'


def confirmed_paid_total(source_type, source_id):
    """Sum of confirmed installments for a transaction."""
    return TransactionPayment.objects.filter(
        source_type=source_type, source_id=str(source_id), status='confirmed'
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')


def has_confirmed_installments(source_type, source_id):
    return TransactionPayment.objects.filter(
        source_type=source_type, source_id=str(source_id), status='confirmed'
    ).exists()


def _installment_meta(tp, parent):
    """(payer_payee, reference, description) for an installment's ledger row."""
    st = tp.source_type
    if st == 'order' and parent is not None:
        return (parent.customer_name or 'Walk-in Customer',
                parent.tracking_id or tp.reference,
                f"Payment received for sale #{parent.tracking_id}")
    if st == 'purchaseorder' and parent is not None:
        sup = getattr(parent, 'supplier', None)
        name = (getattr(sup, 'company', None) or getattr(sup, 'name', None)
                or getattr(sup, 'username', None) or 'Supplier')
        return (name, parent.purchase_number or tp.reference,
                f"Payment for purchase #{parent.purchase_number}")
    if st == 'salereturn' and parent is not None:
        order = getattr(parent, 'order', None)
        cust = getattr(order, 'customer_name', None) or 'Customer'
        return (cust, parent.return_number or tp.reference,
                f"Refund paid for sale return {parent.return_number}")
    if st == 'purchasereturn' and parent is not None:
        sup = getattr(parent, 'supplier', None)
        name = (getattr(sup, 'company', None) or getattr(sup, 'name', None)
                or getattr(sup, 'username', None) or 'Supplier')
        return (name, parent.return_number or tp.reference,
                f"Refund received for purchase return {parent.return_number}")
    return (tp.reference or '', tp.reference or '', tp.note or 'Installment')


def recompute_parent(source_type, source_id):
    """Re-derive the parent transaction's paid amount / status from its
    confirmed installments. Only ever called after an installment changes, so
    transactions that never use installments keep their original status."""
    parent = _load_parent(source_type, source_id)
    if parent is None:
        return
    paid = confirmed_paid_total(source_type, source_id)
    if source_type == 'order':
        parent.amount_paid = paid
        parent.payment_status = _status_for(paid, parent.total_amount)
        parent.save(update_fields=['amount_paid', 'payment_status'])
    elif source_type == 'purchaseorder':
        parent.paid_amount = paid
        parent.payment_status = _status_for(paid, parent.total_amount)
        parent.save(update_fields=['paid_amount', 'payment_status'])
    elif source_type == 'salereturn':
        target = Decimal(str(parent.refund_amount or 0)) or parent.items_total
        settled = paid >= target and target > 0
        parent.refund_status = 'PAID' if settled else 'PENDING'
        parent.settled_at = timezone.now() if settled else None
        parent.save(update_fields=['refund_status', 'settled_at'])
    elif source_type == 'purchasereturn':
        target = Decimal(str(parent.total_refund_amount or 0))
        settled = paid >= target and target > 0
        parent.refund_status = 'PAID' if settled else 'PENDING'
        parent.settled_at = timezone.now() if settled else None
        parent.save(update_fields=['refund_status', 'settled_at'])


def _remove_installment_ledger(tp):
    Payment.objects.filter(
        source_type=tp.source_type, source_id=f"tp:{tp.id}", is_auto=True
    ).delete()


def record_installment(tp):
    """Post (or update) the ledger row for one installment, then recompute the
    parent. Pending/rejected installments don't hit the ledger."""
    if tp.status != 'confirmed':
        _remove_installment_ledger(tp)
        recompute_parent(tp.source_type, tp.source_id)
        return
    parent = _load_parent(tp.source_type, tp.source_id)
    cat_name, cat_type = _LEDGER_CATEGORY.get(tp.source_type, ('Other', 'both'))
    payer, ref, desc = _installment_meta(tp, parent)
    Payment.objects.update_or_create(
        source_type=tp.source_type,
        source_id=f"tp:{tp.id}",
        is_auto=True,
        defaults={
            'source': _LEDGER_SOURCE.get(tp.source_type, 'manual'),
            'amount': Decimal(str(tp.amount or 0)),
            'payment_type': tp.direction,
            'method': _LEDGER_METHOD.get(tp.method, 'cash'),
            'category': _category(cat_name, cat_type),
            'reference_number': ref or '',
            'payer_payee': payer or '',
            'description': desc or '',
            'date': (tp.paid_at or timezone.now()).date(),
            'user': _real_user(tp.created_by),
            'warehouse_id': tp.warehouse_id or parent_warehouse_id(tp.source_type, tp.source_id),
            'tenant_id': (getattr(parent, 'tenant_id', None) or tp.tenant_id
                          or parent_tenant_id(tp.source_type, tp.source_id)),
        },
    )
    recompute_parent(tp.source_type, tp.source_id)


def remove_installment(tp):
    _remove_installment_ledger(tp)
    recompute_parent(tp.source_type, tp.source_id)


# ── Sales (money in) ────────────────────────────────────────────────────────
def record_sale(order):
    """Add income for a completed (delivered) order — POS or online.

    If the order has been settled through installments, those own the ledger
    (one row each) — so we drop the single full-amount entry and stop here.
    """
    if has_confirmed_installments('order', order.id):
        _remove_auto('sale', 'order', order.id)
        return
    # Fully-paid sales (incl. legacy + online) book the full total as income.
    # Credit / partial sales without installments only book what was received.
    amount = Decimal(str(order.total_amount or 0))
    if str(getattr(order, 'payment_status', 'PAID')).upper() in ('UNPAID', 'PARTIAL'):
        amount = Decimal(str(getattr(order, 'amount_paid', 0) or 0))
    if amount <= 0:
        _remove_auto('sale', 'order', order.id)
        return
    method_map = {'SHOP': 'cash', 'COD': 'cash', 'ONLINE': 'bank_transfer'}
    return _upsert_auto(
        'sale', 'order', order.id,
        defaults={
            'amount': amount,
            'payment_type': 'inbound',
            'method': method_map.get(order.payment_method, 'cash'),
            'category': _category('Sales', 'inbound'),
            'reference_number': order.tracking_id or '',
            'payer_payee': order.customer_name or 'Walk-in Customer',
            'description': f"Sale from order #{order.tracking_id} ({order.get_payment_method_display()})",
            'date': (order.delivered_at or order.created_at or order.updated_at).date(),
            'warehouse_id': order.warehouse_id,
            'user': _real_user(getattr(order, 'created_by', None)),
            'tenant_id': getattr(order, 'tenant_id', None),
        },
    )


def remove_sale(order):
    _remove_auto('sale', 'order', order.id)


# ── Purchase payments (money out) ─────────────────────────────────────────────
def record_purchase_payment(purchase):
    """Subtract expense when a supplier accepts the admin's purchase payment.

    When installments are in use they own the ledger, so skip the single entry.
    """
    if has_confirmed_installments('purchaseorder', purchase.pk):
        _remove_auto('purchase', 'purchaseorder', purchase.pk)
        return
    paid = Decimal(str(purchase.paid_amount or 0))
    if paid <= 0:
        paid = Decimal(str(purchase.total_amount or 0))
    supplier = getattr(purchase, 'supplier', None)
    supplier_name = (getattr(supplier, 'company', None) or getattr(supplier, 'name', None)
                     or getattr(supplier, 'username', None) or 'Supplier')
    method_map = {
        'CASH': 'cash', 'BANK_TRANSFER': 'bank_transfer', 'ONLINE': 'bank_transfer',
        'CHEQUE': 'check', 'CREDIT': 'other',
    }
    return _upsert_auto(
        'purchase', 'purchaseorder', purchase.pk,
        defaults={
            'amount': paid,
            'payment_type': 'outbound',
            'method': method_map.get(purchase.payment_method, 'cash'),
            'category': _category('Purchase Payment', 'outbound'),
            'reference_number': purchase.purchase_number or '',
            'payer_payee': supplier_name,
            'description': f"Payment for purchase #{purchase.purchase_number} (accepted by supplier)",
            'warehouse_id': purchase.warehouse_id,
            'user': _real_user(getattr(purchase, 'created_by', None)),
            'tenant_id': getattr(purchase, 'tenant_id', None),
        },
    )


def remove_purchase_payment(purchase):
    _remove_auto('purchase', 'purchaseorder', purchase.pk)


# ── Purchase return (money back in) ──────────────────────────────────────────
def record_purchase_return(ret):
    """Add income when a supplier accepts a purchase return (refund to admin)."""
    if has_confirmed_installments('purchasereturn', ret.pk):
        _remove_auto('purchase_return', 'purchasereturn', ret.pk)
        return
    supplier = getattr(ret, 'supplier', None)
    supplier_name = (getattr(supplier, 'company', None) or getattr(supplier, 'name', None)
                     or getattr(supplier, 'username', None) or 'Supplier')
    return _upsert_auto(
        'purchase_return', 'purchasereturn', ret.pk,
        defaults={
            'amount': Decimal(str(ret.total_refund_amount or 0)),
            'payment_type': 'inbound',
            'method': 'cash',
            'category': _category('Purchase Return', 'inbound'),
            'reference_number': ret.return_number or '',
            'payer_payee': supplier_name,
            'description': f"Refund received for purchase return {ret.return_number}",
            'warehouse_id': getattr(getattr(ret, 'purchase_order', None), 'warehouse_id', None),
            'user': _real_user(getattr(getattr(ret, 'purchase_order', None), 'created_by', None)),
            'tenant_id': (getattr(ret, 'tenant_id', None)
                          or getattr(getattr(ret, 'purchase_order', None), 'tenant_id', None)),
        },
    )


def remove_purchase_return(ret):
    _remove_auto('purchase_return', 'purchasereturn', ret.pk)


# ── Sale return (money out) ──────────────────────────────────────────────────
def record_sale_return(sale_return):
    """Subtract expense when a customer sale return is accepted (refund out)."""
    if has_confirmed_installments('salereturn', sale_return.pk):
        _remove_auto('sale_return', 'salereturn', sale_return.pk)
        return
    total = sum(
        (Decimal(str(i.price or 0)) * Decimal(str(i.quantity or 0)))
        for i in sale_return.items.all()
    )
    order = getattr(sale_return, 'order', None)
    customer_name = getattr(order, 'customer_name', None) or 'Customer'
    return _upsert_auto(
        'sale_return', 'salereturn', sale_return.pk,
        defaults={
            'amount': total,
            'payment_type': 'outbound',
            'method': 'cash',
            'category': _category('Sale Return', 'outbound'),
            'reference_number': sale_return.return_number or '',
            'payer_payee': customer_name,
            'description': f"Refund paid for sale return {sale_return.return_number}",
            'warehouse_id': getattr(getattr(sale_return, 'order', None), 'warehouse_id', None),
            'user': _real_user(getattr(getattr(sale_return, 'order', None), 'created_by', None)),
            'tenant_id': (getattr(sale_return, 'tenant_id', None)
                          or getattr(getattr(sale_return, 'order', None), 'tenant_id', None)),
        },
    )


def remove_sale_return(sale_return):
    _remove_auto('sale_return', 'salereturn', sale_return.pk)
