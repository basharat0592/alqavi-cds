"""Trade 1.0 customer dues: what each customer owes and which of their bills are late.

A customer's balance is their ledger balance — every voucher line on their account
(legacy history, receipts, card payments …) plus the sales / returns made in this
system, the same figure as the Recovery report and the invoice's Remaining Balance.
What they owe is taken to be their newest bills (receipts settle the oldest first);
a bill still owed DUE_DAYS after its date is late.
"""
import datetime
import re
from collections import defaultdict
from decimal import Decimal

from django.db.models import Sum
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.scoping import scope_to_tenant

Z = Decimal('0')
DUE_DAYS = 15   # as printed on the invoice: payment due within 15 days
MIN_DUE = Decimal('50')   # less than this left on an account is a rounding remainder, not a due


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def customer_dues(user, customer_ids=None, upto=None, staff=None):
    """{customer_id: {'acc', 'balance', 'bills': [{id, no, date, due, net, owed, late_days, staff}] (oldest first)}}
    for customers with something owed. `staff`: only that saleman's bills."""
    from modules.company.models import LedgerAccount
    from .models import Order, TradeSaleReturn, Voucher, VoucherLine
    from .trade_reports import _odate, _vline_date
    upto = upto or datetime.date.today()
    accs = scope_to_tenant(user, LedgerAccount.objects.filter(customer__isnull=False), 'tenant').select_related('area')
    if customer_ids is not None:
        accs = accs.filter(customer_id__in=list(customer_ids))
    accs = {a.customer_id: a for a in accs}
    if not accs:
        return {}
    bal = defaultdict(lambda: Z)
    by_pk = {a.pk: cid for cid, a in accs.items()}
    lines = (scope_to_tenant(user, VoucherLine.objects.filter(account_id__in=list(by_pk)), 'voucher__tenant')
             .exclude(voucher__chq_status='pending').annotate(on=_vline_date()).filter(on__lte=upto)
             .values('account_id').annotate(dr=Sum('debit'), cr=Sum('credit')))
    for x in lines:
        bal[by_pk[x['account_id']]] += _d(x['dr']) - _d(x['cr'])
    # Sales / returns already booked by a (legacy) voucher count through that voucher.
    booked = set()
    for det in scope_to_tenant(user, Voucher.objects.filter(vtype__in=['sale', 'sale_return']), 'tenant').values_list('detail', flat=True):
        m = re.search(r'([ST]\d{8})', det or '')
        if m:
            booked.add(m.group(1))
    orders = (scope_to_tenant(user, Order.objects.exclude(status__in=['CANCELLED', 'REJECTED'])
                              .filter(tracking_id__startswith='S', customer_id__in=list(accs)), 'tenant')
              .only('id', 'tracking_id', 'customer_id', 'total_amount', 'paid_at_sale', 'sale_date', 'created_at', 'staff_id'))
    bills = defaultdict(list)
    for o in orders:
        day = _odate(o)
        if day > upto:
            continue
        net, paid = _d(o.total_amount), _d(o.paid_at_sale)
        if o.tracking_id not in booked:
            bal[o.customer_id] += net - paid
        bills[o.customer_id].append((day, o, net - paid))
    for r in scope_to_tenant(user, TradeSaleReturn.objects.filter(customer_id__in=list(accs), return_date__lte=upto), 'tenant') \
            .exclude(return_no__in=booked).only('customer_id', 'net_amount', 'less_amount', 'cash_returned'):
        bal[r.customer_id] += _d(r.cash_returned) - (_d(r.net_amount) - _d(r.less_amount))
    out = {}
    for cid, a in accs.items():
        b = bal.get(cid, Z)
        if b < MIN_DUE:
            continue
        left, owed = b, []
        for day, o, amt in sorted(bills.get(cid, []), key=lambda x: (x[0], x[1].tracking_id), reverse=True):   # newest first
            if left <= 0:
                break
            if amt <= 0:
                continue
            take = min(amt, left)
            left -= take
            due = day + datetime.timedelta(days=DUE_DAYS)
            owed.append({'id': str(o.id), 'no': o.tracking_id, 'date': day, 'due': due, 'net': amt, 'owed': take,
                         'late_days': max((upto - due).days, 0), 'staff': o.staff_id})
        owed.reverse()   # oldest first
        if staff:
            owed = [x for x in owed if str(x['staff']) == str(staff)]
        # Owed from before any bill here (opening balance / legacy history) — counted as late.
        out[cid] = {'acc': a, 'balance': b, 'opening': max(left, Z), 'bills': owed}
    return out


def late_summary(d):
    late = [x for x in d['bills'] if x['late_days'] > 0]
    return {'balance': d['balance'], 'late_count': len(late), 'late_amount': sum((x['owed'] for x in late), Z) + d['opening'],
            'opening': d['opening'], 'oldest_days': max([x['late_days'] for x in late], default=0),
            'bills': [{**x, 'staff': None} for x in d['bills']]}


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def late_bills(request):
    """?customer=<customer id> → that customer's dues: balance, bills owed (oldest first) and how late."""
    cid = request.query_params.get('customer')
    if not cid:
        return Response({'detail': 'Choose the customer.'}, status=400)
    d = customer_dues(request.user, [cid]).get(int(cid) if str(cid).isdigit() else cid)
    if not d:
        return Response({'balance': 0, 'late_count': 0, 'late_amount': 0, 'opening': 0, 'oldest_days': 0, 'bills': []})
    return Response(late_summary(d))
