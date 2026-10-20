"""Trade 1.0 Credit Card.

Add Credit Card: the cards in the system, each held by a saleman (the card a
customer's card payment is received on), a customer (the card that pays) or
the company, with its bank, card number and the bank's tax %.

Card payment (from the Sale Invoice, Paid by Card): the customer is credited
the full amount — Credit Cards (12040009) Dr / Customer Cr, applied to that
invoice first — and the receiver card, the payer card and the card tax are
recorded for the Credit Card Report. The tax is never charged to the customer
and is not posted to the accounts; it is kept for later calculation.
"""
import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import CardBill, CardPayment, SalesStaff, TradeCard, Voucher, VoucherLine

Z = Decimal('0')
CARDS_ACC = '12040009'     # Credit Cards: card payments to come in from the bank


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def _money(v):
    return _d(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def holder_of(c):
    if c.holder_type == 'saleman' and c.staff_id:
        return c.staff.name
    if c.holder_type == 'customer' and c.customer_acc_id:
        return c.customer_acc.name
    return c.holder_name or ''


def card_label(c):
    """e.g. "Syed Sajjad · HBL · 7219"."""
    return ' · '.join(x for x in (holder_of(c), c.bank, c.card_no) if x)


def _card_row(c):
    return {
        'id': c.id, 'holder_type': c.holder_type, 'holder': holder_of(c), 'label': card_label(c),
        'staff': c.staff_id, 'customer_acc': c.customer_acc_id, 'customer_code': c.customer_acc.acc_id if c.customer_acc_id else '',
        'customer_id': c.customer_acc.customer_id if c.customer_acc_id else None,
        'holder_name': c.holder_name, 'bank': c.bank, 'card_no': c.card_no, 'tax_pct': c.tax_pct,
        'notes': c.notes, 'status': c.status, 'bill_day': c.bill_day, 'due_day': c.due_day, 'bills_from': c.bills_from,
    }


SOON_DAYS = 5   # a bill due within this many days is shown as coming up


def _on(y, m, day):
    """That day of the month (the last day when the month is shorter)."""
    import calendar
    while m > 12:
        y, m = y + 1, m - 12
    return datetime.date(y, m, min(day, calendar.monthrange(y, m)[1]))


def bill_cycles(c, upto):
    """[(bill_date, due_date)] of a company card's bills from bills_from up to `upto`."""
    if not (c.bill_day and c.due_day and c.bills_from):
        return []
    f = c.bills_from
    y, m = f.year, f.month
    if _on(y, m, c.bill_day) > f:   # the bill whose month bills_from is in
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    out = []
    while True:
        bd = _on(y, m, c.bill_day)
        if bd > upto:
            break
        dd = _on(y, m, c.due_day) if c.due_day > c.bill_day else _on(y, m + 1, c.due_day)
        out.append((bd, dd))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def card_bills(user, upto=None):
    """Every company card bill up to today: paid / late / due (soon) / open, unpaid first."""
    today = upto or datetime.date.today()
    cards = scope_to_tenant(user, TradeCard.objects.filter(status='active', bill_day__isnull=False, due_day__isnull=False), 'tenant') \
        .select_related('staff', 'customer_acc')
    saved = {(b.card_id, b.bill_date): b for b in scope_to_tenant(user, CardBill.objects.all(), 'tenant')}
    rows = []
    for c in cards:
        for bd, dd in bill_cycles(c, today):
            b = saved.get((c.id, bd))
            left = (dd - today).days
            st = 'paid' if b and b.paid_on else 'late' if left < 0 else 'due' if left <= SOON_DAYS else 'open'
            rows.append({'id': b.id if b else None, 'card': c.id, 'label': card_label(c), 'bill_date': bd, 'due_date': dd,
                         'amount': b.amount if b else Z, 'paid_on': b.paid_on if b else None, 'note': b.note if b else '',
                         'status': st, 'days': left})
    order = {'late': 0, 'due': 1, 'open': 2, 'paid': 3}
    rows.sort(key=lambda r: (order[r['status']], r['due_date']) if r['status'] != 'paid' else (3, -r['due_date'].toordinal()))
    return rows


class TradeCardViewSet(viewsets.ViewSet):
    """Cards: list / create / update / delete (unused). Card payments: GET / POST payments/."""
    permission_classes = [permissions.IsAdminUser]

    def _cards(self):
        return scope_to_tenant(self.request.user, TradeCard.objects.all(), 'tenant').select_related('staff', 'customer_acc')

    def _accounts(self):
        from modules.company.models import LedgerAccount
        return scope_to_tenant(self.request.user, LedgerAccount.objects.all(), 'tenant')

    def list(self, request):
        return Response([_card_row(c) for c in self._cards()])

    def _apply(self, c, d):
        kind = d.get('holder_type', c.holder_type)
        if kind not in ('saleman', 'customer', 'company'):
            return 'Choose whose card it is (Saleman, Customer or Company).'
        c.holder_type = kind
        c.staff = c.customer_acc = None
        if kind == 'saleman':
            c.staff = scope_to_tenant(self.request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
            if not c.staff:
                return 'Choose the saleman.'
        elif kind == 'customer':
            c.customer_acc = self._accounts().filter(pk=d.get('customer_acc'), customer__isnull=False).first() if d.get('customer_acc') else None
            if not c.customer_acc:
                return 'Find the customer.'
        c.holder_name = str(d.get('holder_name', c.holder_name) or '').strip()[:150]
        if kind == 'company' and not c.holder_name:
            return 'Enter the card holder (company) name.'
        c.bank = str(d.get('bank', c.bank) or '').strip()[:80]
        c.card_no = str(d.get('card_no', c.card_no) or '').strip()[:30]
        if not c.card_no and not c.bank:
            return 'Enter the bank and / or the card number.'
        pct = _d(d.get('tax_pct', c.tax_pct))
        if pct < 0 or pct >= 100:
            return 'Enter the card tax % (e.g. 1.5).'
        c.tax_pct = pct
        c.notes = str(d.get('notes', c.notes) or '').strip()[:255]
        c.status = 'inactive' if str(d.get('status', c.status)).lower() == 'inactive' else 'active'
        for k in ('bill_day', 'due_day'):
            if k in d:
                v = d.get(k)
                if v in (None, ''):
                    setattr(c, k, None)
                else:
                    try:
                        v = int(v)
                    except (TypeError, ValueError):
                        return 'The bill and due dates are days of the month (1 to 31).'
                    if not 1 <= v <= 31:
                        return 'The bill and due dates are days of the month (1 to 31).'
                    setattr(c, k, v)
        if bool(c.bill_day) != bool(c.due_day):
            return 'Enter both the Bill Date and the Due Date (days of the month), or neither.'
        if c.bill_day and c.bill_day == c.due_day:
            return 'The Due Date cannot be the same day as the Bill Date.'
        if c.bill_day and not c.bills_from:
            c.bills_from = datetime.date.today()   # bills count from when the dates are set
        if not c.bill_day:
            c.bills_from = None
        return None

    def create(self, request):
        c = TradeCard(tenant_id=tenant_id_for(request.user))
        err = self._apply(c, request.data)
        if err:
            return Response({'detail': err}, status=400)
        if not c.tenant_id:
            c.tenant_id = (c.staff or c.customer_acc).tenant_id if (c.staff or c.customer_acc) else None
        c.save()
        return Response(_card_row(c), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        c = self._cards().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        err = self._apply(c, request.data)
        if err:
            return Response({'detail': err}, status=400)
        c.save()
        return Response(_card_row(c))

    def destroy(self, request, pk=None):
        c = self._cards().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        if c.received_payments.exists() or c.paid_payments.exists():
            return Response({'detail': 'This card has payments — set it Inactive instead.'}, status=400)
        c.delete()
        return Response(status=204)

    @action(detail=False, methods=['get', 'post'])
    def bills(self, request):
        """GET: the company cards' bills (unpaid first) and how many are late / due.
        POST {card, bill_date, paid_on (empty = not paid), amount?, note?}: mark a bill paid."""
        if request.method == 'GET':
            rows = card_bills(request.user)
            return Response({'late': sum(1 for r in rows if r['status'] == 'late'), 'due': sum(1 for r in rows if r['status'] == 'due'),
                             'rows': rows})
        d = request.data
        c = self._cards().filter(pk=d.get('card')).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        try:
            bd = datetime.date.fromisoformat(str(d.get('bill_date'))[:10])
            paid = datetime.date.fromisoformat(str(d.get('paid_on'))[:10]) if d.get('paid_on') else None
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        cyc = dict(bill_cycles(c, datetime.date.today()))
        if bd not in cyc:
            return Response({'detail': 'That is not one of this card\'s bills.'}, status=400)
        if paid and paid > datetime.date.today():
            return Response({'detail': 'The paid date cannot be in the future.'}, status=400)
        b, _ = CardBill.objects.get_or_create(card=c, bill_date=bd, defaults={'due_date': cyc[bd], 'tenant_id': c.tenant_id})
        b.due_date, b.paid_on = cyc[bd], paid
        if 'amount' in d:
            b.amount = _money(d.get('amount'))
        if 'note' in d:
            b.note = str(d.get('note') or '').strip()[:255]
        b.save()
        return Response({'id': b.id, 'paid_on': b.paid_on})

    @action(detail=False, methods=['get', 'post'])
    def payments(self, request):
        if request.method == 'POST':
            return self._pay(request)
        q = request.query_params
        qs = (scope_to_tenant(request.user, CardPayment.objects.all(), 'tenant')
              .select_related('order', 'voucher', 'customer_acc', 'staff', 'receiver_card__staff', 'receiver_card__customer_acc',
                              'payer_card__staff', 'payer_card__customer_acc'))
        if q.get('card'):
            qs = qs.filter(Q(receiver_card_id=q['card']) | Q(payer_card_id=q['card']))
        if q.get('receiver'):
            qs = qs.filter(receiver_card_id=q['receiver'])
        if q.get('payer'):
            qs = qs.filter(payer_card_id=q['payer'])
        if q.get('staff'):
            qs = qs.filter(staff_id=q['staff'])
        if q.get('date_from'):
            qs = qs.filter(date__gte=q['date_from'])
        if q.get('date_to'):
            qs = qs.filter(date__lte=q['date_to'])
        if q.get('q'):
            s = q['q'].strip()
            qs = qs.filter(Q(customer_acc__name__icontains=s) | Q(customer_acc__acc_id__icontains=s) | Q(note__icontains=s)
                           | Q(order__tracking_id__icontains=s) | Q(voucher__voucher_no__icontains=s)
                           | Q(receiver_card__card_no__icontains=s) | Q(payer_card__card_no__icontains=s)
                           | Q(receiver_card__bank__icontains=s) | Q(payer_card__bank__icontains=s))
        out = []
        for p in qs.order_by('date', 'id')[:5000]:
            out.append({
                'id': p.id, 'date': p.date, 'voucher_no': p.voucher.voucher_no, 'invoice': p.order.tracking_id if p.order_id else '',
                'customer': p.customer_acc.name, 'customer_code': p.customer_acc.acc_id, 'amount': p.amount,
                'tax_pct': p.tax_pct, 'tax': p.tax_amount, 'net': p.amount - p.tax_amount,
                'receiver': card_label(p.receiver_card), 'receiver_bank': p.receiver_card.bank, 'receiver_no': p.receiver_card.card_no,
                'receiver_holder': holder_of(p.receiver_card),
                'payer': card_label(p.payer_card) if p.payer_card_id else '', 'payer_bank': p.payer_card.bank if p.payer_card_id else '',
                'payer_no': p.payer_card.card_no if p.payer_card_id else '', 'payer_holder': holder_of(p.payer_card) if p.payer_card_id else '',
                'staff': p.staff.name if p.staff_id else '', 'note': p.note,
            })
        return Response(out)

    def _pay(self, request):
        """Body: {order? (sale invoice) | customer (ledger account), amount, receiver_card, payer_card?, date?, staff?, note?}."""
        from .models import Order
        from .vouchers import VoucherViewSet, _allocate_to_orders
        d = request.data
        cards = self._cards()
        recv = cards.filter(pk=d.get('receiver_card')).first() if d.get('receiver_card') else None
        if not recv:
            return Response({'detail': 'Choose the Receiver Card (the card the money is received on).'}, status=400)
        payer = cards.filter(pk=d.get('payer_card')).first() if d.get('payer_card') else None
        if d.get('payer_card') and not payer:
            return Response({'detail': 'Payer card not found.'}, status=400)
        order = None
        accs = self._accounts()
        if d.get('order'):
            order = scope_to_tenant(request.user, Order.objects.filter(pk=d.get('order')), 'tenant').first()
            if not order or not order.customer_id:
                return Response({'detail': 'Invoice not found.'}, status=400)
            cust = accs.filter(customer_id=order.customer_id).first()
        else:
            cust = accs.filter(pk=d.get('customer'), customer__isnull=False).first() if d.get('customer') else None
        if not cust:
            return Response({'detail': 'The customer has no account in the Chart of Account.'}, status=400)
        if payer is None:   # not asked on the invoice: the customer's own card, when they have one
            payer = cards.filter(holder_type='customer', customer_acc=cust, status='active').first()
        amt = _money(d.get('amount'))
        if amt <= 0:
            return Response({'detail': 'Enter the amount paid by card.'}, status=400)
        try:
            day = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        cards_acc = accs.filter(acc_id=CARDS_ACC).first()
        if not cards_acc:
            return Response({'detail': 'The Credit Cards account (12040009) is missing in the Chart of Account.'}, status=400)
        staff = scope_to_tenant(request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
        # The tax: the payer card's when known, else the receiving card's.
        pct = _d(payer.tax_pct if payer else recv.tax_pct)
        tax = _money(amt * pct / 100)
        note = str(d.get('note') or '').strip()[:255]
        detail = f'Paid by card{" - " + order.tracking_id if order else ""} - {cust.name}'[:255]
        tid = tenant_id_for(request.user) or cust.tenant_id
        with transaction.atomic():
            v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(day), vtype='card_payment', date=day, staff=staff,
                                       detail=detail, total=amt, created_by=request.user, tenant_id=tid)
            left = _allocate_to_orders(cust.customer_id, amt, v, request.user, 'bank_transfer', first=order.pk if order else None)
            VoucherLine.objects.create(voucher=v, line=1, account=cust, credit=amt, unallocated=left, detail=detail)
            VoucherLine.objects.create(voucher=v, line=2, account=cards_acc, debit=amt,
                                       detail=f'Card {card_label(recv)}{" from " + card_label(payer) if payer else ""}'[:255])
            p = CardPayment.objects.create(order=order, voucher=v, date=day, customer_acc=cust, amount=amt, receiver_card=recv,
                                           payer_card=payer, tax_pct=pct, tax_amount=tax, staff=staff, note=note, tenant_id=tid)
        return Response({'id': p.id, 'voucher_no': v.voucher_no, 'amount': amt, 'tax': tax}, status=status.HTTP_201_CREATED)
