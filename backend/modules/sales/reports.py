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
          .prefetch_related('items'))
    qs = _date_range(request, qs)
    area_ids = user_area_ids(request.user)
    if area_ids is not None:
        qs = qs.filter(customer__area_id__in=area_ids)
    # Tenant-first: each Admin sees only their own tenant's sales; the platform
    # operator sees all (with optional ?tenant / ?created_by / ?warehouse drill-down).
    qs = apply_report_scope(request, qs, 'warehouse', 'created_by', tenant_field='tenant')
    return qs, area_ids


def _order_profit(order):
    return sum(float((it.price - it.cost_price) * it.quantity) for it in order.items.all())


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
