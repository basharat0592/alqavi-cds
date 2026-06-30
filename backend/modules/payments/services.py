"""Ledger helpers.

These functions turn business events (sales, purchase payments, returns) into
ledger entries. They are idempotent: calling them twice for the same record
updates the existing entry instead of creating a duplicate.
"""
from decimal import Decimal

from .models import Payment, PaymentCategory


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


# ── Sales (money in) ────────────────────────────────────────────────────────
def record_sale(order):
    """Add income for a completed (delivered) order — POS or online."""
    method_map = {'SHOP': 'cash', 'COD': 'cash', 'ONLINE': 'bank_transfer'}
    return _upsert_auto(
        'sale', 'order', order.id,
        defaults={
            'amount': Decimal(str(order.total_amount or 0)),
            'payment_type': 'inbound',
            'method': method_map.get(order.payment_method, 'cash'),
            'category': _category('Sales', 'inbound'),
            'reference_number': order.tracking_id or '',
            'payer_payee': order.customer_name or 'Walk-in Customer',
            'description': f"Sale from order #{order.tracking_id} ({order.get_payment_method_display()})",
            'date': (order.delivered_at or order.created_at or order.updated_at).date(),
        },
    )


def remove_sale(order):
    _remove_auto('sale', 'order', order.id)


# ── Purchase payments (money out) ─────────────────────────────────────────────
def record_purchase_payment(purchase):
    """Subtract expense when a supplier accepts the admin's purchase payment."""
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
        },
    )


def remove_purchase_payment(purchase):
    _remove_auto('purchase', 'purchaseorder', purchase.pk)


# ── Purchase return (money back in) ──────────────────────────────────────────
def record_purchase_return(ret):
    """Add income when a supplier accepts a purchase return (refund to admin)."""
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
        },
    )


def remove_purchase_return(ret):
    _remove_auto('purchase_return', 'purchasereturn', ret.pk)


# ── Sale return (money out) ──────────────────────────────────────────────────
def record_sale_return(sale_return):
    """Subtract expense when a customer sale return is accepted (refund out)."""
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
        },
    )


def remove_sale_return(sale_return):
    _remove_auto('sale_return', 'salereturn', sale_return.pk)
