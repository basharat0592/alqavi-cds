"""Trade 1.0 Donation (dashboard › Donation).

Donations given on behalf of partners — Zakat 2.5 %, Khums 5 %, Sadqa, Fitrana
or any other type — each taken out of the chosen partner's own share:
  profit   pct × the profit shared to the partner From–To,
  capital  pct × the partner's capital on the day,
  amount   an amount entered.
Posted per partner like drawings: Partner capital Dr / Cash-Bank Cr, so it
comes off that partner's balance (never the business's profit or the other
partners').
"""
import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import Donation, DonationType, Partner, Voucher, VoucherLine
from .trade_partners import partner_stats

Z = Decimal('0')
DEFAULT_TYPES = [('Zakat', Decimal('2.5')), ('Khums', Decimal('5')), ('Sadqa', None), ('Fitrana', None), ('Other Donation', None)]


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def _money(v):
    return _d(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _day(v, default=None):
    return datetime.date.fromisoformat(str(v)[:10]) if v else default


def _type_row(t):
    return {'id': t.id, 'name': t.name, 'pct': t.pct, 'status': t.status, 'sno': t.sno}


class TradeDonationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _types(self):
        qs = scope_to_tenant(self.request.user, DonationType.objects.all(), 'tenant')
        if not qs.exists():   # first use: the usual types
            tid = tenant_id_for(self.request.user)
            for i, (name, pct) in enumerate(DEFAULT_TYPES, 1):
                DonationType.objects.create(name=name, pct=pct, sno=i, tenant_id=tid)
            qs = scope_to_tenant(self.request.user, DonationType.objects.all(), 'tenant')
        return qs

    def _partners(self):
        return scope_to_tenant(self.request.user, Partner.objects.all(), 'tenant').select_related('account')

    # Donation types
    @action(detail=False, methods=['get', 'post'])
    def types(self, request):
        if request.method == 'GET':
            return Response([_type_row(t) for t in self._types()])
        name = str(request.data.get('name') or '').strip()[:60]
        if not name:
            return Response({'detail': 'Enter the donation type name.'}, status=400)
        if self._types().filter(name__iexact=name).exists():
            return Response({'detail': f'{name} is already a type.'}, status=400)
        pct = request.data.get('pct')
        pct = None if pct in (None, '') else _d(pct)
        if pct is not None and not (0 < pct < 100):
            return Response({'detail': 'The % must be more than 0 and less than 100.'}, status=400)
        last = self._types().order_by('-sno').first()
        t = DonationType.objects.create(name=name, pct=pct, sno=(last.sno if last else 0) + 1, tenant_id=tenant_id_for(request.user))
        return Response(_type_row(t), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['patch', 'delete'], url_path=r'types/(?P<tid>[0-9]+)')
    def type_detail(self, request, tid=None):
        t = self._types().filter(pk=tid).first()
        if not t:
            return Response({'detail': 'Type not found.'}, status=404)
        if request.method == 'DELETE':
            if t.donations.exists():
                return Response({'detail': f'{t.name} has donations — set it Inactive instead.'}, status=400)
            t.delete()
            return Response(status=204)
        d = request.data
        if 'name' in d:
            t.name = str(d.get('name') or '').strip()[:60] or t.name
        if 'pct' in d:
            pct = d.get('pct')
            t.pct = None if pct in (None, '') else _d(pct)
            if t.pct is not None and not (0 < t.pct < 100):
                return Response({'detail': 'The % must be more than 0 and less than 100.'}, status=400)
        if 'status' in d:
            t.status = 'inactive' if str(d.get('status')).lower() == 'inactive' else 'active'
        t.save()
        return Response(_type_row(t))

    # What each partner's donation is worked out on
    @action(detail=False, methods=['get'])
    def base(self, request):
        """?date_from&date_to (profit shared in the period), ?on (capital on the day) → per partner."""
        q = request.query_params
        try:
            f, t, on = _day(q.get('date_from')), _day(q.get('date_to'), datetime.date.today()), _day(q.get('on'), datetime.date.today())
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        out = []
        for p in self._partners():
            if p.joining_date > max(t, on):
                continue
            # Profit shared to them for periods inside From–To (by the distribution's own period,
            # not the day it was posted).
            dist = VoucherLine.objects.filter(account_id=p.account_id, voucher__vtype='profit_dist',
                                              voucher__profit_distribution__date_to__lte=t)
            if f:
                dist = dist.filter(voucher__profit_distribution__date_from__gte=f)
            a = dist.aggregate(c=Sum('credit'), d=Sum('debit'))
            profit = (a['c'] or Z) - (a['d'] or Z)
            out.append({'partner': p.id, 'name': p.name, 'acc_id': p.account.acc_id, 'status': p.status,
                        'profit': profit, 'capital': partner_stats(p, on)['capital']})
        return Response(out)

    # Donations
    def list(self, request):
        q = request.query_params
        qs = (scope_to_tenant(request.user, Donation.objects.all(), 'tenant')
              .select_related('partner', 'dtype', 'voucher', 'bank'))
        if q.get('partner'):
            qs = qs.filter(partner_id=q['partner'])
        if q.get('dtype'):
            qs = qs.filter(dtype_id=q['dtype'])
        if q.get('date_from'):
            qs = qs.filter(date__gte=q['date_from'])
        if q.get('date_to'):
            qs = qs.filter(date__lte=q['date_to'])
        return Response([{
            'id': x.id, 'voucher_no': x.voucher.voucher_no, 'date': x.date, 'partner': x.partner.name, 'partner_id': x.partner_id,
            'type': x.dtype.name, 'dtype': x.dtype_id, 'basis': x.basis, 'date_from': x.date_from, 'date_to': x.date_to,
            'pct': x.pct, 'base_amount': x.base_amount, 'amount': x.amount, 'bank': x.bank.name, 'paid_to': x.paid_to, 'note': x.note,
        } for x in qs[:3000]])

    def create(self, request):
        """{dtype, basis, pct?, date_from?, date_to?, on?, date?, bank, paid_to?, note?,
        items: [{partner, amount, base?}]} — one voucher per partner."""
        from modules.company.models import LedgerAccount
        from .vouchers import VoucherViewSet
        d = request.data
        dtype = self._types().filter(pk=d.get('dtype')).first()
        if not dtype:
            return Response({'detail': 'Choose the donation type.'}, status=400)
        basis = d.get('basis') if d.get('basis') in ('profit', 'capital', 'amount') else 'amount'
        try:
            day = _day(d.get('date'), datetime.date.today())
            f, t = _day(d.get('date_from')), _day(d.get('date_to'))
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if day > datetime.date.today():
            return Response({'detail': 'The date cannot be in the future.'}, status=400)
        bank = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant').select_related('group').filter(pk=d.get('bank')).first() if d.get('bank') else None
        if not bank or not bank.group_id or bank.group.code not in (1204, 2203):
            return Response({'detail': 'Choose the cash / bank account the donation is paid from.'}, status=400)
        pct = None if d.get('pct') in (None, '') else _d(d.get('pct'))
        partners = {p.id: p for p in self._partners()}
        items = []
        for it in d.get('items') or []:
            p = partners.get(int(it.get('partner') or 0))
            amt = _money(it.get('amount'))
            if not p:
                return Response({'detail': 'One of the partners was not found.'}, status=400)
            if amt <= 0:
                continue
            items.append((p, amt, _money(it.get('base'))))
        if not items:
            return Response({'detail': 'Tick at least one partner with an amount.'}, status=400)
        paid_to = str(d.get('paid_to') or '').strip()[:150]
        note = str(d.get('note') or '').strip()[:255]
        made = []
        with transaction.atomic():
            for p, amt, base in items:
                how = (f'{pct.normalize()}% of profit {f:%d-%m-%Y}–{t:%d-%m-%Y}' if basis == 'profit' and pct is not None and f and t
                       else f'{pct.normalize()}% of capital' if basis == 'capital' and pct is not None else 'amount')
                detail = f'{dtype.name} - {p.name} ({how}){" - to " + paid_to if paid_to else ""}{" - " + note if note else ""}'[:255]
                v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(day), vtype='donation', date=day, detail=detail,
                                           total=amt, created_by=request.user, tenant_id=tenant_id_for(request.user) or p.tenant_id)
                VoucherLine.objects.create(voucher=v, line=1, account=p.account, debit=amt, detail=detail)
                VoucherLine.objects.create(voucher=v, line=2, account=bank, credit=amt, detail=detail)
                x = Donation.objects.create(partner=p, dtype=dtype, voucher=v, date=day, basis=basis, date_from=f, date_to=t, pct=pct,
                                            base_amount=base, amount=amt, bank=bank, paid_to=paid_to, note=note, tenant_id=v.tenant_id)
                made.append({'id': x.id, 'voucher_no': v.voucher_no, 'partner': p.name, 'amount': amt})
        return Response({'made': made, 'total': sum((m['amount'] for m in made), Z)}, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        x = scope_to_tenant(request.user, Donation.objects.filter(pk=pk), 'tenant').select_related('voucher').first()
        if not x:
            return Response({'detail': 'Donation not found.'}, status=404)
        no = x.voucher.voucher_no
        x.voucher.delete()
        return Response({'detail': f'{no} removed.'})
