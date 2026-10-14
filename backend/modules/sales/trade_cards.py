"""Trade 1.0 Credit Card (Accounts > Credit Card).

Two kinds of card (CreditCard.kind):

* own      one of our credit cards. Money taken on it ("Amount Post") arrives
           in our bank less the bank's charges (1.5 % …); the full amount is a
           loan on the card account, due by the payment date (the card's due
           day after the billing day that follows the credit date). Card bill
           payments repay it, oldest posting first - the sheet the shop kept in
           Excel: credit date, billing / payment date, amount post, charges,
           received, paid, remaining, paid date, by bank.
* machine  a card machine customers pay on. The customer is credited the
           full amount; the bank's charges are our expense, not the customer's.

Every entry posts a voucher (CardEntry docstring), so the ledger, trial balance
and profit & loss all follow; the charges land on the card's charges account.
"""
import calendar
import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import CardEntry, CreditCard, SalesStaff, Voucher, VoucherLine

Z = Decimal('0')
CARD_GROUP = 2203        # Bank (current liabilities): our card accounts
CHARGES_GROUP = 5501     # credit card tax
CASH_ACC = '12040001'


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def _money(v):
    return _d(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _on_day(year, month, day):
    return datetime.date(year, month, min(day, calendar.monthrange(year, month)[1]))


def _next_month(y, m):
    return (y + 1, 1) if m == 12 else (y, m + 1)


def bill_dates(credit_date, billing_day, due_day):
    """(billing date, payment date) of money taken on `credit_date`: the first
    billing day after it, then the due day after that billing date."""
    y, m = credit_date.year, credit_date.month
    bill = _on_day(y, m, billing_day)
    if bill <= credit_date:
        y, m = _next_month(y, m)
        bill = _on_day(y, m, billing_day)
    py, pm = (bill.year, bill.month) if due_day > billing_day else _next_month(bill.year, bill.month)
    return bill, _on_day(py, pm, due_day)


def card_sheet(card, today=None):
    """The card's postings with what is paid / remaining, card bill payments
    applied oldest first (after any balance the card already had)."""
    today = today or datetime.date.today()
    entries = list(card.entries.select_related('bank', 'voucher').order_by('date', 'id'))
    posts = [e for e in entries if e.kind == 'post']
    pays = [e for e in entries if e.kind == 'pay']
    opening = Z
    if card.account_id:
        mine = CardEntry.objects.filter(card__account_id=card.account_id).values_list('voucher_id', flat=True)
        agg = (VoucherLine.objects.filter(account_id=card.account_id).exclude(voucher_id__in=mine)
               .exclude(voucher__chq_status='pending').aggregate(d=Sum('debit'), c=Sum('credit')))
        opening = (agg['c'] or Z) - (agg['d'] or Z)
    items = [{'opening': True, 'amount': max(opening, Z), 'paid': Z, 'paid_date': None, 'by': ''}]
    items += [{'e': e, 'amount': _d(e.amount), 'paid': Z, 'paid_date': None, 'by': ''} for e in posts]
    advance = max(-opening, Z)
    for p in pays:
        left = _d(p.amount)
        for it in items:
            if left <= 0:
                break
            take = min(left, it['amount'] - it['paid'])
            if take > 0:
                it['paid'] += take; left -= take
                it['paid_date'] = p.date; it['by'] = p.bank.name
        advance += left
    rows = []
    for n, it in enumerate(items[1:], 1):
        e = it['e']
        rem = it['amount'] - it['paid']
        days = (e.payment_date - today).days if e.payment_date else None
        state = 'paid' if rem <= 0 else ('overdue' if days is not None and days < 0 else ('due' if days is not None and days <= 5 else 'open'))
        rows.append({
            'sno': n, 'id': e.id, 'voucher_no': e.voucher.voucher_no, 'credit_date': e.date, 'billing_date': e.billing_date,
            'payment_date': e.payment_date, 'amount': e.amount, 'charges': e.charges, 'received': e.received,
            'paid': it['paid'], 'remaining': rem, 'paid_date': it['paid_date'], 'by_bank': it['by'],
            'bank': e.bank.name, 'note': e.note, 'state': state, 'days': days,
        })
    op = items[0]
    return {
        'opening': op['amount'], 'opening_remaining': op['amount'] - op['paid'], 'rows': rows,
        'payments': [{'id': p.id, 'voucher_no': p.voucher.voucher_no, 'date': p.date, 'amount': p.amount,
                      'bank': p.bank.name, 'note': p.note} for p in pays],
        'owed': op['amount'] - op['paid'] + sum((r['remaining'] for r in rows), Z) - advance,
        'advance': advance,
    }


def _card_row(c, sheet=None):
    out = {
        'id': c.id, 'kind': c.kind, 'name': c.name, 'bank': c.bank, 'card_no': c.card_no,
        'billing_day': c.billing_day, 'due_day': c.due_day, 'charge_pct': c.charge_pct, 'status': c.status,
        'account': c.account_id, 'account_code': c.account.acc_id if c.account_id else '', 'account_name': c.account.name if c.account_id else '',
        'charges_account': c.charges_account_id, 'charges_account_code': c.charges_account.acc_id if c.charges_account_id else '',
        'charges_account_name': c.charges_account.name if c.charges_account_id else '',
        'bank_account': c.bank_account_id, 'bank_account_name': c.bank_account.name if c.bank_account_id else '',
    }
    if sheet is not None:
        out['owed'] = sheet['owed']
        out['due'] = sum(1 for r in sheet['rows'] if r['state'] in ('due', 'overdue'))
        out['overdue'] = sum(1 for r in sheet['rows'] if r['state'] == 'overdue')
    return out


class TradeCreditCardViewSet(viewsets.ViewSet):
    """Cards: list / create / update / delete (no entries yet). Entries:
    GET / POST entries/, the card's sheet: <id>/sheet/."""
    permission_classes = [permissions.IsAdminUser]

    def _cards(self):
        return scope_to_tenant(self.request.user, CreditCard.objects.all(), 'tenant') \
            .select_related('account', 'charges_account', 'bank_account')

    def _accounts(self):
        from modules.company.models import LedgerAccount
        return scope_to_tenant(self.request.user, LedgerAccount.objects.all(), 'tenant').select_related('group')

    def _new_account(self, group_code, name):
        from modules.company.models import AccountGroup, LedgerAccount
        from modules.company.views import LedgerAccountViewSet
        group = scope_to_tenant(self.request.user, AccountGroup.objects.filter(code=group_code, level=3), 'tenant').first()
        if not group:
            return None
        acc_id = LedgerAccountViewSet._next_acc_id(group, self._accounts())
        return LedgerAccount.objects.create(acc_id=acc_id, name=name[:255], group=group,
                                            tenant_id=tenant_id_for(self.request.user) or group.tenant_id)

    @staticmethod
    def _is_money(acc):
        g = acc.group.code if acc.group_id else None
        return g in (1204, 2203)

    def list(self, request):
        out = []
        for c in self._cards():
            out.append(_card_row(c, card_sheet(c) if c.kind == 'own' else None))
        return Response(out)

    def _apply(self, c, d, creating):
        name = str(d.get('name', c.name) or '').strip()[:80]
        if not name:
            return 'Enter the card name.'
        kind = d.get('kind', c.kind) if creating else c.kind
        if kind not in ('own', 'machine'):
            return 'Choose the card type.'
        try:
            bd, dd = int(d.get('billing_day', c.billing_day)), int(d.get('due_day', c.due_day))
        except (TypeError, ValueError):
            return 'Billing and due day must be numbers (1 to 31).'
        if not (1 <= bd <= 31 and 1 <= dd <= 31):
            return 'Billing and due day must be 1 to 31.'
        pct = _d(d.get('charge_pct', c.charge_pct))
        if pct < 0 or pct >= 100:
            return 'Enter the bank charges % (e.g. 1.5).'
        accs = self._accounts()
        for field in ('account', 'charges_account', 'bank_account'):
            if field in d:
                v = d.get(field)
                acc = accs.filter(pk=v).first() if v not in (None, '', 'new') else None
                if v not in (None, '', 'new') and not acc:
                    return 'One of the accounts was not found.'
                setattr(c, field, acc)
                if field == 'account' and v == 'new':
                    c._new_card_acc = True
                if field == 'charges_account' and v == 'new':
                    c._new_charges_acc = True
        c.name, c.kind, c.billing_day, c.due_day, c.charge_pct = name, kind, bd, dd, pct
        c.bank = str(d.get('bank', c.bank) or '').strip()[:80]
        c.card_no = str(d.get('card_no', c.card_no) or '').strip()[:30]
        c.status = 'inactive' if str(d.get('status', c.status)).lower() == 'inactive' else 'active'
        return None

    def _finish_accounts(self, c):
        label = f'{c.name}{" " + c.card_no if c.card_no and c.card_no not in c.name else ""}'
        if c.kind == 'own' and (getattr(c, '_new_card_acc', False) or not c.account_id):
            c.account = self._new_account(CARD_GROUP, label)
        if getattr(c, '_new_charges_acc', False) or not c.charges_account_id:
            c.charges_account = self._new_account(CHARGES_GROUP, f'{label} (tax)')
        if c.kind == 'own' and not c.account_id:
            return 'The Bank (2203) account group is missing — choose the card account.'
        if not c.charges_account_id:
            return 'The credit card tax (5501) account group is missing — choose the charges account.'
        return None

    def create(self, request):
        c = CreditCard(tenant_id=tenant_id_for(request.user))
        with transaction.atomic():
            err = self._apply(c, request.data, True) or self._finish_accounts(c)
            if err:
                transaction.set_rollback(True)
                return Response({'detail': err}, status=400)
            if not c.tenant_id:
                c.tenant_id = (c.account or c.charges_account).tenant_id
            c.save()
        return Response(_card_row(c), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        c = self._cards().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        with transaction.atomic():
            err = self._apply(c, request.data, False) or self._finish_accounts(c)
            if err:
                transaction.set_rollback(True)
                return Response({'detail': err}, status=400)
            c.save()
        return Response(_card_row(c))

    def destroy(self, request, pk=None):
        c = self._cards().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        if c.entries.exists():
            return Response({'detail': f'{c.name} has entries — set it Inactive instead.'}, status=400)
        c.delete()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def sheet(self, request, pk=None):
        c = self._cards().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Card not found.'}, status=404)
        if c.kind != 'own':
            rows = [{'voucher_no': e.voucher.voucher_no, 'date': e.date, 'customer': e.customer_acc.name if e.customer_acc_id else '',
                     'acc_id': e.customer_acc.acc_id if e.customer_acc_id else '', 'amount': e.amount, 'charges': e.charges,
                     'received': e.received, 'bank': e.bank.name, 'note': e.note}
                    for e in c.entries.select_related('voucher', 'customer_acc', 'bank').order_by('date', 'id')]
            return Response({'card': _card_row(c), 'rows': rows})
        s = card_sheet(c)
        return Response({'card': _card_row(c, s), **s})

    @action(detail=False, methods=['get', 'post'])
    def entries(self, request):
        if request.method == 'GET':
            q = request.query_params
            qs = scope_to_tenant(request.user, CardEntry.objects.all(), 'tenant').select_related('card', 'voucher__staff', 'bank', 'customer_acc')
            if q.get('card'):
                qs = qs.filter(card_id=q['card'])
            if q.get('kind'):
                qs = qs.filter(kind=q['kind'])
            if q.get('voucher_no'):
                qs = qs.filter(voucher__voucher_no__icontains=q['voucher_no'].strip())
            if q.get('date_from'):
                qs = qs.filter(date__gte=q['date_from'])
            if q.get('date_to'):
                qs = qs.filter(date__lte=q['date_to'])
            if q.get('q'):
                s = q['q'].strip()
                qs = qs.filter(Q(note__icontains=s) | Q(voucher__detail__icontains=s) | Q(customer_acc__name__icontains=s)
                               | Q(card__card_no__icontains=s) | Q(card__name__icontains=s) | Q(voucher__voucher_no__icontains=s))
            # Paid / remaining of each posting on our cards (card bills applied oldest first).
            sheets = {}
            for c in {e.card for e in qs if e.kind == 'post'}:
                sheets.update({r['id']: r for r in card_sheet(c)['rows']})
            out = []
            for e in qs.order_by('-date', '-id')[:3000]:
                s = sheets.get(e.id) or {}
                out.append({
                    'id': e.id, 'voucher_no': e.voucher.voucher_no, 'kind': e.kind, 'date': e.date, 'card': e.card.name,
                    'card_no': e.card.card_no, 'card_kind': e.card.kind, 'customer': e.customer_acc.name if e.customer_acc_id else '',
                    'customer_acc': e.customer_acc.acc_id if e.customer_acc_id else '', 'amount': e.amount, 'charge_pct': e.charge_pct,
                    'charges': e.charges, 'received': e.received, 'bank': e.bank.name, 'billing_date': e.billing_date,
                    'payment_date': e.payment_date, 'paid': s.get('paid'), 'remaining': s.get('remaining'), 'paid_date': s.get('paid_date'),
                    'state': s.get('state', ''), 'detail': e.voucher.detail, 'note': e.note,
                    'staff': e.voucher.staff.name if e.voucher.staff_id else '',
                })
            return Response(out)
        return self._save_entry(request)

    def _save_entry(self, request):
        from .vouchers import VoucherViewSet, _allocate_to_orders
        d = request.data
        kind = d.get('kind')
        if kind not in ('post', 'customer', 'pay'):
            return Response({'detail': 'Choose what you are entering.'}, status=400)
        card = self._cards().filter(pk=d.get('card'), status='active').first()
        if not card:
            return Response({'detail': 'Choose the card.'}, status=400)
        if kind in ('post', 'pay') and (card.kind != 'own' or not card.account_id):
            return Response({'detail': 'Choose one of our credit cards.'}, status=400)
        if kind == 'customer' and card.kind != 'machine':
            return Response({'detail': 'Choose the card machine the customer paid on.'}, status=400)
        if kind != 'pay' and not card.charges_account_id:
            return Response({'detail': f'{card.name} has no charges account — set it in Cards.'}, status=400)
        accs = self._accounts()
        bank = accs.filter(pk=d.get('bank')).first() if d.get('bank') else None
        if not bank or not self._is_money(bank) or bank.pk == card.account_id:
            return Response({'detail': 'Find the cash / bank account the money ' + ('is paid from.' if kind == 'pay' else 'comes into.')}, status=400)
        cust = order = None
        if kind == 'customer' and d.get('order'):
            from .models import Order
            order = scope_to_tenant(request.user, Order.objects.filter(pk=d.get('order')), 'tenant').first()
            if not order or not order.customer_id:
                return Response({'detail': 'Invoice not found.'}, status=400)
            cust = accs.filter(customer_id=order.customer_id).first()
            if not cust:
                return Response({'detail': 'The customer has no account in the Chart of Account.'}, status=400)
        if kind == 'customer' and not cust:
            cust = accs.filter(pk=d.get('customer')).first() if d.get('customer') else None
            if not cust:
                return Response({'detail': 'Find the customer who paid.'}, status=400)
            if cust.pk == bank.pk:
                return Response({'detail': 'The customer and the bank cannot be the same account.'}, status=400)
        amt = _money(d.get('amount'))
        if amt <= 0:
            return Response({'detail': 'Enter the amount.'}, status=400)
        try:
            day = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if day > datetime.date.today():
            return Response({'detail': 'The date cannot be in the future.'}, status=400)
        pct = charges = Z
        if kind != 'pay':
            pct = _d(d.get('charge_pct')) if d.get('charge_pct') not in (None, '') else _d(card.charge_pct)
            if pct < 0 or pct >= 100:
                return Response({'detail': 'Enter the bank charges %.'}, status=400)
            charges = _money(amt * pct / 100)
        received = amt - charges
        note = str(d.get('note') or '').strip()[:255]
        staff = scope_to_tenant(request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
        bill = pay_date = None
        if kind == 'post':
            bill, pay_date = bill_dates(day, card.billing_day, card.due_day)
        tid = tenant_id_for(request.user) or card.tenant_id
        label = card.name
        with transaction.atomic():
            vtype = {'post': 'card_post', 'customer': 'card_receipt', 'pay': 'card_pay'}[kind]
            detail = {
                'post': f'{label}: card posting, due {pay_date.strftime("%d-%m-%Y") if pay_date else ""}',
                'customer': f'Paid by card ({label}){" - " + cust.name if cust else ""}{" - " + order.tracking_id if order else ""}',
                'pay': f'{label}: card bill paid',
            }[kind]
            if note:
                detail = f'{note} - {detail}'
            v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(day), vtype=vtype, date=day, staff=staff,
                                       detail=detail[:255], total=amt, created_by=request.user, tenant_id=tid)
            ln = 0

            def line(acc, dr=Z, cr=Z, det=detail, unalloc=Z):
                nonlocal ln
                ln += 1
                VoucherLine.objects.create(voucher=v, line=ln, account=acc, debit=dr, credit=cr, detail=det[:255], unallocated=unalloc)

            if kind == 'post':
                line(bank, dr=received)
                if charges:
                    line(card.charges_account, dr=charges, det=f'Bank charges {pct}% on {amt:,.0f} ({label})')
                line(card.account, cr=amt)
            elif kind == 'customer':
                left = _allocate_to_orders(cust.customer_id, amt, v, request.user, 'bank_transfer', first=order.pk if order else None) \
                    if cust.customer_id else Z
                line(cust, cr=amt, unalloc=left if cust.customer_id else Z)
                line(bank, dr=received)
                if charges:
                    line(card.charges_account, dr=charges, det=f'Bank charges {pct}% on {amt:,.0f} ({label}) - on us')
            else:
                line(card.account, dr=amt)
                line(bank, cr=amt)
            e = CardEntry.objects.create(card=card, kind=kind, voucher=v, date=day, amount=amt, charge_pct=pct, charges=charges,
                                         received=received, bank=bank, customer_acc=cust, order=order, billing_date=bill, payment_date=pay_date,
                                         note=note, tenant_id=tid)
        return Response({'id': e.id, 'voucher_no': v.voucher_no, 'amount': amt, 'charges': charges, 'received': received,
                         'billing_date': bill, 'payment_date': pay_date}, status=status.HTTP_201_CREATED)
