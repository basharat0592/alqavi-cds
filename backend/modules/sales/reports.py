"""Grouped sales analytics endpoints.

All endpoints:
  - respect Area-Manager scoping (sales are scoped by customer area),
  - accept ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD,
  - return JSON-ready floats.
"""
from decimal import Decimal

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.scoping import user_area_ids, apply_report_scope
from modules.payments.models import TransactionPayment
from .models import Order, SaleReturn, PurchaseOrder


def _date_range(request, qs, field='created_at'):
    df = request.query_params.get('date_from')
    dt = request.query_params.get('date_to')
    if df:
        qs = qs.filter(**{f'{field}__date__gte': df})
    if dt:
        qs = qs.filter(**{f'{field}__date__lte': dt})
    return qs


def _scoped_orders(request):
    """Non-cancelled orders, date-filtered and area-scoped."""
    qs = (Order.objects
          .exclude(status__in=['CANCELLED', 'REJECTED'])
          .select_related('user', 'customer', 'customer__area')
          .prefetch_related('items', 'sale_returns__items'))
    qs = _date_range(request, qs)
    area_ids = user_area_ids(request.user)
    if area_ids is not None:
        qs = qs.filter(customer__area_id__in=area_ids)
    # Tenant-first: each Admin sees only their own tenant's sales; the platform
    # operator sees all (with optional ?tenant / ?created_by / ?warehouse drill-down).
    qs = apply_report_scope(request, qs, 'warehouse', 'created_by', tenant_field='tenant')
    return qs, area_ids


def _returned_qty_by_product(order):
    """Qty returned per product across this order's ACCEPTED sale returns."""
    out = {}
    for r in order.sale_returns.all():
        if str(r.status).upper() != 'ACCEPTED':
            continue
        for it in r.items.all():
            if it.product_id:
                out[it.product_id] = out.get(it.product_id, 0) + (it.quantity or 0)
    return out


def _order_profit(order):
    """Profit for an order, net of items returned via accepted sale returns.

    A returned unit reverses its own margin, so it's excluded from the qty that
    earns profit. Uses each line's own snapshotted price/cost so the netting is
    exact even if catalog prices changed later.
    """
    returned = _returned_qty_by_product(order)
    total = 0.0
    for it in order.items.all():
        qty = it.quantity or 0
        if it.product_id and returned.get(it.product_id):
            qty = max(0, qty - returned[it.product_id])
        total += float((it.price - it.cost_price) * qty)
    return total


def _supplier_name(sup):
    return (getattr(sup, 'company', None) or getattr(sup, 'name', None)
            or getattr(sup, 'username', None) or 'Supplier')


# ── Area-wise ────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_by_area(request):
    orders, area_ids = _scoped_orders(request)

    groups = {}

    def bucket(area):
        key = area.id if area else 0
        if key not in groups:
            groups[key] = {
                'area_id': area.id if area else None,
                'area': area.name if area else 'No Area / Walk-in',
                'revenue': 0.0, 'profit': 0.0, 'orders': 0,
                'outstanding': 0.0, 'returns_value': 0.0, 'returns_count': 0,
            }
        return groups[key]

    for o in orders:
        area = o.customer.area if (o.customer_id and o.customer.area_id) else None
        g = bucket(area)
        if str(o.status).upper() == 'DELIVERED':
            g['revenue'] += float(o.total_amount or 0)
            g['profit'] += _order_profit(o)
            g['orders'] += 1
        g['outstanding'] += float(o.remaining_amount or 0)

    returns = (SaleReturn.objects.filter(status='ACCEPTED')
               .select_related('customer', 'customer__area', 'order', 'order__customer', 'order__customer__area')
               .prefetch_related('items'))
    returns = _date_range(request, returns)
    returns = apply_report_scope(request, returns, 'order__warehouse', 'order__created_by', tenant_field='tenant')
    for r in returns:
        cust = r.customer or getattr(r.order, 'customer', None)
        area = cust.area if (cust and getattr(cust, 'area_id', None)) else None
        if area_ids is not None and (area is None or area.id not in area_ids):
            continue
        g = bucket(area)
        g['returns_count'] += 1
        g['returns_value'] += float(r.refund_amount or 0) or float(r.items_total or 0)

    rows = sorted(groups.values(), key=lambda x: x['revenue'], reverse=True)
    totals = {
        'revenue': round(sum(r['revenue'] for r in rows), 2),
        'profit': round(sum(r['profit'] for r in rows), 2),
        'orders': sum(r['orders'] for r in rows),
        'outstanding': round(sum(r['outstanding'] for r in rows), 2),
        'returns_value': round(sum(r['returns_value'] for r in rows), 2),
    }
    for r in rows:
        for k in ('revenue', 'profit', 'outstanding', 'returns_value'):
            r[k] = round(r[k], 2)
    return Response({'results': rows, 'totals': totals})


# ── User / staff-wise ────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_by_user(request):
    orders, area_ids = _scoped_orders(request)

    users = {}

    def urow(u, name=None, role=None):
        key = u.id if u else 0
        if key not in users:
            display = name
            if u and not display:
                display = (f"{u.first_name} {u.last_name}".strip() or u.username)
            users[key] = {
                'user_id': u.id if u else None,
                'name': display or 'System / Online',
                'role': role or (getattr(getattr(u, 'role', None), 'name', None) if u else None),
                'orders': 0, 'sales_total': 0.0, 'avg_order_value': 0.0,
                'returns_handled': 0, 'collections': 0.0,
                'purchases_created': 0, 'purchase_value': 0.0,
            }
        return users[key]

    for o in orders:
        if str(o.status).upper() != 'DELIVERED':
            continue
        # Attribute the sale to the staff member who created it (the POS operator).
        g = urow(o.created_by)
        g['orders'] += 1
        g['sales_total'] += float(o.total_amount or 0)

    # Returns handled (by staff who processed the return).
    rets = _date_range(request, SaleReturn.objects.filter(status='ACCEPTED').select_related('user'))
    rets = apply_report_scope(request, rets, 'order__warehouse', 'order__created_by', tenant_field='tenant')
    for r in rets:
        if r.user_id:
            urow(r.user)['returns_handled'] += 1

    # Collections = confirmed inbound installments recorded by each staff member.
    inst = _date_range(request, TransactionPayment.objects.filter(
        status='confirmed', direction='inbound').select_related('created_by'), field='paid_at')
    inst = apply_report_scope(request, inst, 'warehouse', 'created_by', tenant_field='tenant')
    for tp in inst:
        if tp.created_by_id:
            urow(tp.created_by)['collections'] += float(tp.amount or 0)

    # Purchases created by each staff member (not area-scoped — purchases have no area).
    if area_ids is None:
        pos = _date_range(request, PurchaseOrder.objects.exclude(status='CANCELLED')
                          .select_related('created_by'), field='order_date')
        pos = apply_report_scope(request, pos, 'warehouse', 'created_by', tenant_field='tenant')
        for p in pos:
            if p.created_by_id:
                g = urow(p.created_by)
                g['purchases_created'] += 1
                g['purchase_value'] += float(p.total_amount or 0)

    rows = list(users.values())
    for r in rows:
        r['avg_order_value'] = round(r['sales_total'] / r['orders'], 2) if r['orders'] else 0.0
        for k in ('sales_total', 'collections', 'purchase_value'):
            r[k] = round(r[k], 2)
    rows.sort(key=lambda x: x['sales_total'], reverse=True)

    totals = {
        'sales_total': round(sum(r['sales_total'] for r in rows), 2),
        'orders': sum(r['orders'] for r in rows),
        'collections': round(sum(r['collections'] for r in rows), 2),
        'purchase_value': round(sum(r['purchase_value'] for r in rows), 2),
    }
    return Response({'results': rows, 'totals': totals})


# ── Customer ledger (running balance) ────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_ledger(request):
    """Per-customer running-balance ledger (like the desktop 'Ledger' report).
    Each sale invoice is a Debit; each payment (checkout + confirmed installments)
    is a Credit. Optional ?date_from/&date_to gives opening balance + period rows.
    Select the party with ?customer_id= (registered) or ?customer_name= (walk-in).
    """
    from collections import defaultdict
    cid = request.query_params.get('customer_id')
    cname = (request.query_params.get('customer_name') or '').strip()
    df = request.query_params.get('date_from')
    dt = request.query_params.get('date_to')

    qs = (Order.objects.exclude(status__in=['CANCELLED', 'REJECTED'])
          .select_related('customer'))
    qs = apply_report_scope(request, qs, 'warehouse', 'created_by', tenant_field='tenant')
    area_ids = user_area_ids(request.user)
    if area_ids is not None:
        qs = qs.filter(customer__area_id__in=area_ids)

    if cid:
        qs = qs.filter(customer_id=cid)
    elif cname:
        qs = qs.filter(customer__isnull=True, customer_name__iexact=cname)
    else:
        return Response({'error': 'Provide customer_id or customer_name.'}, status=400)

    orders = list(qs)
    if not orders:
        return Response({'customer': cname or '', 'opening': 0, 'rows': [], 'closing': 0,
                         'totals': {'debit': 0, 'credit': 0}})

    cust_name = cname
    for o in orders:
        if o.customer_id and o.customer:
            cust_name = o.customer.name; break
        if o.customer_name:
            cust_name = o.customer_name

    oid_ref = {str(o.id): (o.order_number or o.tracking_id) for o in orders}
    insts = list(TransactionPayment.objects.filter(
        source_type='order', source_id__in=list(oid_ref.keys()),
        status='confirmed', direction='inbound'))
    inst_sum = defaultdict(float)
    for ip in insts:
        inst_sum[str(ip.source_id)] += float(ip.amount or 0)

    events = []
    for o in orders:
        d0 = (o.created_at.date().isoformat() if o.created_at else '')
        ref = o.order_number or o.tracking_id
        events.append({'date': d0, 'ref': ref, 'detail': 'Sale Invoice',
                       'debit': round(float(o.total_amount or 0), 2), 'credit': 0.0})
        checkout = float(o.amount_paid or 0) - inst_sum.get(str(o.id), 0.0)
        if checkout > 0.01:
            events.append({'date': d0, 'ref': ref, 'detail': 'Paid at sale',
                           'debit': 0.0, 'credit': round(checkout, 2)})
    for ip in insts:
        pd = ip.paid_at or ip.created_at
        events.append({'date': pd.date().isoformat() if pd else '',
                       'ref': oid_ref.get(str(ip.source_id), ''),
                       'detail': f"Payment ({(ip.method or 'cash').replace('_', ' ')})",
                       'debit': 0.0, 'credit': round(float(ip.amount or 0), 2)})

    events.sort(key=lambda e: (e['date'], 0 if e['debit'] else 1))

    opening = sum(e['debit'] - e['credit'] for e in events if df and e['date'] and e['date'] < df)
    run = round(opening, 2)
    rows = []
    tot_d = tot_c = 0.0
    for e in events:
        if df and e['date'] and e['date'] < df:
            continue
        if dt and e['date'] and e['date'] > dt:
            continue
        run = round(run + e['debit'] - e['credit'], 2)
        tot_d += e['debit']; tot_c += e['credit']
        rows.append({**e, 'balance': run})

    return Response({
        'customer': cust_name,
        'opening': round(opening, 2),
        'rows': rows,
        'closing': run,
        'totals': {'debit': round(tot_d, 2), 'credit': round(tot_c, 2)},
    })


# ── Customer statements ──────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_statements(request):
    orders, _ = _scoped_orders(request)

    custs = {}
    for o in orders:
        if o.customer_id:
            key = f"c{o.customer_id}"
            name = o.customer.name
        else:
            name = (o.customer_name or 'Walk-in Customer').strip()
            key = f"g:{name.lower()}"
        g = custs.setdefault(key, {
            'customer_id': o.customer_id, 'name': name,
            'total_billed': 0.0, 'total_paid': 0.0, 'remaining': 0.0,
            'orders': 0, 'last_payment': None,
        })
        billed = float(o.total_amount or 0)
        paid = float(o.amount_paid or 0)
        g['total_billed'] += billed
        g['total_paid'] += paid
        g['remaining'] += float(o.remaining_amount or 0)
        g['orders'] += 1
        if paid > 0 and o.updated_at:
            d = o.updated_at.date().isoformat()
            if not g['last_payment'] or d > g['last_payment']:
                g['last_payment'] = d

    rows = list(custs.values())
    for r in rows:
        for k in ('total_billed', 'total_paid', 'remaining'):
            r[k] = round(r[k], 2)
    rows.sort(key=lambda x: x['remaining'], reverse=True)

    totals = {
        'total_billed': round(sum(r['total_billed'] for r in rows), 2),
        'total_paid': round(sum(r['total_paid'] for r in rows), 2),
        'remaining': round(sum(r['remaining'] for r in rows), 2),
        'customers': len(rows),
    }
    return Response({'results': rows, 'totals': totals})


# ── Sale-returns analytics ───────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_returns_summary(request):
    area_ids = user_area_ids(request.user)

    rets = (SaleReturn.objects
            .select_related('customer', 'customer__area', 'order', 'order__customer', 'order__customer__area')
            .prefetch_related('items'))
    rets = _date_range(request, rets)
    rets = apply_report_scope(request, rets, 'order__warehouse', 'order__created_by', tenant_field='tenant')
    if area_ids is not None:
        rets = [r for r in rets if (
            (r.customer and r.customer.area_id in area_ids) or
            (getattr(r.order, 'customer', None) and r.order.customer.area_id in area_ids)
        )]

    status_counts = {'PENDING': 0, 'ACCEPTED': 0, 'REJECTED': 0}
    reasons = {}
    total_value = 0.0
    accepted_value = 0.0
    total_count = 0
    accepted_count = 0
    for r in rets:
        total_count += 1
        st = str(r.status).upper()
        status_counts[st] = status_counts.get(st, 0) + 1
        val = float(r.refund_amount or 0) or float(r.items_total or 0)
        total_value += val
        if st == 'ACCEPTED':
            accepted_value += val
            accepted_count += 1
        reason = (r.reason or 'Unspecified').strip()[:60] or 'Unspecified'
        rb = reasons.setdefault(reason, {'reason': reason, 'count': 0, 'value': 0.0})
        rb['count'] += 1
        rb['value'] += val

    # Return rate = accepted returns vs delivered orders in the same window/scope.
    orders, _ = _scoped_orders(request)
    delivered = sum(1 for o in orders if str(o.status).upper() == 'DELIVERED')
    return_rate = round((accepted_count / delivered) * 100, 1) if delivered else 0.0

    reason_rows = sorted(reasons.values(), key=lambda x: x['value'], reverse=True)
    for rb in reason_rows:
        rb['value'] = round(rb['value'], 2)
        rb['pct'] = round((rb['count'] / total_count) * 100, 1) if total_count else 0.0

    return Response({
        'totals': {
            'total_count': total_count,
            'accepted_count': accepted_count,
            'total_value': round(total_value, 2),
            'accepted_value': round(accepted_value, 2),
            'return_rate': return_rate,
            'delivered_orders': delivered,
        },
        'status_counts': status_counts,
        'reasons': reason_rows,
    })


# ── Delivery (per-rider) ──────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_delivery(request):
    """Per-rider delivery performance: orders assigned, delivered, still pending,
    and rider earnings (each order's delivery_fee, falling back to shipping_cost).
    Tenant/branch scoped like the other reports."""
    qs = (Order.objects
          .exclude(delivery_person__isnull=True)
          .select_related('delivery_person'))
    qs = _date_range(request, qs)
    qs = apply_report_scope(request, qs, 'warehouse', 'created_by', tenant_field='tenant')

    rows = {}
    for o in qs:
        rid = o.delivery_person_id
        r = rows.get(rid)
        if r is None:
            r = rows[rid] = {
                'delivery_person': (o.delivery_person.name if o.delivery_person else 'Unassigned'),
                'phone': (getattr(o.delivery_person, 'phone', '') or ''),
                'total_orders': 0, 'delivered': 0, 'pending': 0, 'earnings': 0.0,
            }
        r['total_orders'] += 1
        st = str(o.status).upper()
        fee = float(o.delivery_fee or 0) or float(o.shipping_cost or 0)
        if st == 'DELIVERED':
            r['delivered'] += 1
            r['earnings'] += fee
        elif st not in ('CANCELLED', 'REJECTED'):
            r['pending'] += 1

    results = sorted(rows.values(), key=lambda x: x['earnings'], reverse=True)
    for r in results:
        r['earnings'] = round(r['earnings'], 2)
    return Response({
        'results': results,
        'totals': {
            'riders': len(results),
            'total_orders': sum(r['total_orders'] for r in results),
            'delivered': sum(r['delivered'] for r in results),
            'earnings': round(sum(r['earnings'] for r in results), 2),
        },
    })
