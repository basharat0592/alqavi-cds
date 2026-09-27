"""The one place inventory quantity is allowed to change.

WHY THIS EXISTS
---------------
Stock used to be moved from five different call sites, each with its own idea of
what a "product line" is and which rows to touch. That produced the three faults
this module removes:

* **Double counting.** ``Stock`` post_save re-derives ``Product.total_quantity``
  by summing the matching stock rows (see ``inventory.signals``). Call sites that
  *also* wrote ``Product.total_quantity`` directly therefore applied the delta
  twice. Nothing outside the signal may write that field — this module never
  does, and neither should any caller.
* **Partial depletion.** A product accumulates into one stock line per branch,
  but older data can leave several rows for the same name. Deducting from a
  single row ("the biggest one") silently under-deducts when it runs out.
  ``consume`` walks every matching row, oldest first.
* **Bonus units vanishing.** Free units leave the shelf like any other. Callers
  must pass the physical units (``OrderItem.units_out``), not the paid quantity.

IDENTITY
--------
A product line is ``(tenant, warehouse, product_name)`` case-insensitively —
deliberately *not* weight, size or cost, so a re-priced or re-measured delivery
merges into the line it belongs to instead of forking a duplicate. This matches
``inventory.signals.sync_product_stock`` exactly; if you change one, change both
or ``Product.total_quantity`` will stop agreeing with its own stock rows.
"""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum, Value
from django.db.models.functions import Greatest
from django.utils import timezone

from .models import Stock, StockMovement


def _lines(*, tenant_id, warehouse_id, product_name):
    """Every stock row making up one product line, oldest first.

    Tenant is applied only when the caller knows it. A row whose tenant drifted
    to NULL still belongs to the branch, and the warehouse is the real isolation
    boundary, so falling back to warehouse-only keeps that stock reachable
    instead of silently stranding it.
    """
    qs = Stock.objects.filter(
        product_name__iexact=(product_name or '').strip(),
        warehouse_id=warehouse_id,
    )
    if tenant_id:
        scoped = qs.filter(tenant_id=tenant_id)
        if scoped.exists():
            return scoped.order_by('date', 'id')
    return qs.order_by('date', 'id')


def available(*, tenant_id, warehouse_id, product_name) -> int:
    """Units on hand for a product line."""
    return _lines(
        tenant_id=tenant_id, warehouse_id=warehouse_id, product_name=product_name,
    ).aggregate(t=Sum('total_quantity'))['t'] or 0


def _log(stock, movement_type, units, description):
    """Movement history. Never fatal — a missing log must not void the change."""
    try:
        StockMovement.objects.create(
            stock=stock,
            movement_type=movement_type,
            quantity=units,
            to_warehouse=stock.warehouse if movement_type in ('PURCHASE', 'RETURN') else None,
            from_warehouse=stock.warehouse if movement_type == 'SALE' else None,
            date=timezone.now().date(),
            description=description,
            tenant_id=stock.tenant_id,
        )
    except Exception:
        pass


@transaction.atomic
def receive(*, tenant_id, warehouse, product_name, units, unit_cost=None,
            supplier=None, category=None, supplier_product=None,
            weight=None, size=None, created_by=None, reason='Purchase received'):
    """Add units to a product line, merging into the existing row when there is one.

    This is the "do not create a duplicate product" rule: an existing line takes
    the units and the newest cost; only a genuinely new name creates a row.
    Returns the ``Stock`` the units landed on.
    """
    units = int(units or 0)
    if units <= 0:
        return None

    name = (product_name or '').strip()
    if not name:
        return None

    line = _lines(
        tenant_id=tenant_id, warehouse_id=getattr(warehouse, 'id', warehouse),
        product_name=name,
    ).last()

    if line:
        line.total_quantity = F('total_quantity') + units
        if unit_cost is not None and Decimal(str(unit_cost)) > 0:
            line.price_per_item = Decimal(str(unit_cost))   # newest cost wins
        line.save()          # fires the signal that re-derives Product.total_quantity
        line.refresh_from_db()
    else:
        line = Stock.objects.create(
            product_name=name,
            product=supplier_product,
            category=category,
            supplier=supplier,
            warehouse=warehouse,
            purchase_type='single',
            total_quantity=units,
            price_per_item=Decimal(str(unit_cost or 0)),
            weight=weight,
            size=size,
            date=timezone.now().date(),
            created_by=created_by,
            tenant_id=tenant_id,
        )

    _log(line, 'PURCHASE', units, reason)
    return line


@transaction.atomic
def consume(*, tenant_id, warehouse_id, product_name, units, reason='Sale'):
    """Take units off a product line, oldest row first. Returns units actually taken.

    Spreads across every row of the line, so a line split over several rows
    depletes correctly. Clamped at zero — stock never goes negative — and the
    shortfall is reported back rather than hidden, so callers can surface it.
    """
    want = int(units or 0)
    if want <= 0:
        return 0

    taken = 0
    for line in _lines(tenant_id=tenant_id, warehouse_id=warehouse_id,
                       product_name=product_name):
        if taken >= want:
            break
        have = int(line.total_quantity or 0)
        if have <= 0:
            continue
        step = min(have, want - taken)
        line.total_quantity = Greatest(F('total_quantity') - step, Value(0))
        line.save()          # signal re-derives Product.total_quantity
        # Keep the supplier's own availability in step when one is linked.
        if line.product_id:
            sp = line.product
            sp.quantity = Greatest(F('quantity') - step, Value(0))
            sp.save()
        _log(line, 'SALE', step, reason)
        taken += step

    return taken


@transaction.atomic
def release(*, tenant_id, warehouse_id, product_name, units, reason='Return'):
    """Put units back — a cancelled sale, a customer return. Returns units restored.

    Restores onto the newest row of the line so returned goods carry the current
    cost. If the line has no rows left, nothing is created: a return of something
    the branch never stocked is a data problem, not a reason to invent inventory.
    """
    qty = int(units or 0)
    if qty <= 0:
        return 0

    line = _lines(tenant_id=tenant_id, warehouse_id=warehouse_id,
                  product_name=product_name).last()
    if not line:
        return 0

    line.total_quantity = F('total_quantity') + qty
    line.save()
    if line.product_id:
        sp = line.product
        sp.quantity = F('quantity') + qty
        sp.save()
    _log(line, 'RETURN', qty, reason)
    return qty


def consume_order_item(item, *, order, reason='Sale'):
    """Deduct one ``OrderItem`` from the branch it was sold in.

    Uses ``units_out`` (paid + bonus) because free units leave the shelf too,
    and resolves the branch from the order, falling back to the product's own
    warehouse for older rows that predate order-level warehouses.
    """
    product = getattr(item, 'product', None)
    if not product:
        return 0
    warehouse_id = getattr(order, 'warehouse_id', None) or getattr(product, 'warehouse_id', None)
    if not warehouse_id:
        return 0
    return consume(
        tenant_id=getattr(order, 'tenant_id', None),
        warehouse_id=warehouse_id,
        product_name=product.product_name,
        units=getattr(item, 'units_out', None) or item.quantity,
        reason=reason,
    )


def release_order_item(item, *, order, reason='Order cancelled'):
    """Give one ``OrderItem``'s units back to the branch it was sold in."""
    product = getattr(item, 'product', None)
    if not product:
        return 0
    warehouse_id = getattr(order, 'warehouse_id', None) or getattr(product, 'warehouse_id', None)
    if not warehouse_id:
        return 0
    return release(
        tenant_id=getattr(order, 'tenant_id', None),
        warehouse_id=warehouse_id,
        product_name=product.product_name,
        units=getattr(item, 'units_out', None) or item.quantity,
        reason=reason,
    )
