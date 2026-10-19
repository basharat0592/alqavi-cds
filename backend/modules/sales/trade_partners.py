"""Trade 1.0 Partnership.

Partners, each with a capital account (Equity › Parters Capital 3101): joining
date, the capital invested (value) and their share (percent). The share is the
agreed percent when one is set, else the capital invested as a part of all the
partners' capital. Money in / out of capital posts a voucher (PartnerEntry).

Capital: what the partner has in the business — money brought in, less capital
taken back, PLUS profit shared to them and not drawn (kept profit is
re-invested); drawings come off it.

Profit distribution: the period's net profit (or loss) — the Profit and Loss of
the ledger, every expense taken out — is shared out, each partner counted only
for the days they were a partner in the period:
  capital basis  a partner with an agreed % gets that % (of the period's profit,
                 for their days); the rest is shared by the others'
                 capital × days (capital as it stood each day)
  agreed basis   every partner by agreed % × days
and posted: Retain Earning Dr / each partner's capital Cr (a loss the other way).
"""
import datetime
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal
from types import SimpleNamespace

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import Partner, PartnerEntry, ProfitDistribution, Voucher, VoucherLine

Z = Decimal('0')
YEAR_DAYS = Decimal(365)
CAPITAL_GROUP = 3101
RETAIN_ACC = '32010001'
DIST_VTYPE = 'profit_dist'


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def _money(v):
    return _d(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _day(v, default=None):
    if not v:
        return default
    return datetime.date.fromisoformat(str(v)[:10])


def _money_moves(p):
    """[(date, +/-amount)] of money put in / taken back: every entry on the capital
    account except profit shares and drawings."""
    drawings = PartnerEntry.objects.filter(partner__account_id=p.account_id, kind='drawing').values_list('voucher_id', flat=True)
    lines = (VoucherLine.objects.filter(account_id=p.account_id).exclude(voucher__vtype__in=[DIST_VTYPE, 'donation'])
             .exclude(voucher_id__in=drawings).exclude(voucher__chq_status='pending')
             .values_list('voucher__date', 'credit', 'debit'))
    return sorted((d, _d(cr) - _d(dr)) for d, cr, dr in lines)


def _capital_moves(p):
    """[(date, +/-amount)] of the partner's capital: everything on the capital account —
    money in / out, profit shared (kept profit counts as capital), drawings (taken off)."""
    lines = (VoucherLine.objects.filter(account_id=p.account_id).exclude(voucher__chq_status='pending')
             .values_list('voucher__date', 'credit', 'debit'))
    return sorted((d, _d(cr) - _d(dr)) for d, cr, dr in lines)


def partner_stats(p, upto=None, since=None):
    """Invested and capital as on `upto`; profit / loss and drawings from `since` (all, when empty) to `upto`."""
    upto = upto or datetime.date.today()
    invested = sum((a for d, a in _money_moves(p) if d <= upto), Z)
    agg = lambda qs: qs.aggregate(c=Sum('credit'), d=Sum('debit'))
    dist = VoucherLine.objects.filter(account_id=p.account_id, voucher__vtype=DIST_VTYPE, voucher__date__lte=upto)
    draw = PartnerEntry.objects.filter(partner=p, kind='drawing', date__lte=upto)
    if since:
        dist, draw = dist.filter(voucher__date__gte=since), draw.filter(date__gte=since)
    a = agg(dist)
    profit = (a['c'] or Z) - (a['d'] or Z)
    drawings = draw.aggregate(s=Sum('amount'))['s'] or Z
    from .models import Donation
    don = Donation.objects.filter(partner=p, date__lte=upto)
    if since:
        don = don.filter(date__gte=since)
    donations = don.aggregate(s=Sum('amount'))['s'] or Z
    a = agg(VoucherLine.objects.filter(account_id=p.account_id, voucher__date__lte=upto).exclude(voucher__chq_status='pending'))
    balance = (a['c'] or Z) - (a['d'] or Z)
    # capital = money in + profit kept − drawings: what the shares go by
    return {'invested': invested, 'profit': profit, 'drawings': drawings, 'donations': donations, 'balance': balance, 'capital': balance}


def _active_days(p, f, t):
    start = max(f, p.joining_date)
    end = min(t, p.leaving_date) if p.leaving_date else t
    return max((end - start).days + 1, 0), start, end


def _capital_days(p, f, t, moves=None):
    """Capital (with kept profit) × days, day by day over the partner's days in the period
    (`moves`: other movements, e.g. only the money invested)."""
    n, start, end = _active_days(p, f, t)
    if not n:
        return Z
    moves = _capital_moves(p) if moves is None else moves
    cap = sum((a for d, a in moves if d < start), Z)
    total, cur = Z, start
    for d, a in [(d, a) for d, a in moves if start <= d <= end]:
        total += cap * (d - cur).days
        cap += a; cur = d
    total += cap * ((end - cur).days + 1)
    return max(total, Z)


def profit_statement(user, f, t):
    """(net profit, groups): the period's income and every expense (cost of goods,
    salaries, fares, rent, bank / card charges …) by account group — what is left
    after all of them is the profit the partners share."""
    from .trade_reports import Ctx, _pl
    ctx = Ctx(SimpleNamespace(user=user, query_params={'date_from': f.isoformat(), 'date_to': t.isoformat()}))
    _, inc, exp = _pl(ctx)
    groups = {}
    for kind, items in (('income', inc), ('expense', exp)):
        for a, v in items:
            g = a.group
            key = (kind, g.code if g else 0)
            row = groups.setdefault(key, {'kind': kind, 'code': g.code if g else '', 'name': g.name if g else 'Other',
                                         'amount': Z, 'accounts': []})
            row['amount'] += v
            row['accounts'].append({'acc_id': a.acc_id, 'name': a.name, 'amount': _money(v)})
    rows = [dict(r, amount=_money(r['amount'])) for _, r in sorted(groups.items(), key=lambda kv: (kv[0][0] != 'income', str(kv[0][1])))]
    return sum((v for _, v in inc), Z) - sum((v for _, v in exp), Z), rows


def net_profit(user, f, t):
    return profit_statement(user, f, t)[0]


def rate_changes(p):
    """[(from date, pct)] sorted — the investor's return % changes."""
    out = []
    for r in p.rates or []:
        try:
            out.append((datetime.date.fromisoformat(str(r.get('from'))[:10]), _d(r.get('pct'))))
        except (ValueError, AttributeError):
            continue
    return sorted(out)


def rate_on(p, day):
    pct = _d(p.share_pct) if p.share_pct is not None else None
    for d, r in rate_changes(p):
        if d <= day:
            pct = r
    return pct


def rate_segments(p, f, t):
    """[(start, end, pct)] covering f–t: the rate from joining (share_pct), then each change."""
    segs, start, pct = [], f, _d(p.share_pct)
    for d, r in rate_changes(p):
        if d <= start:
            pct = r
            continue
        if d > t:
            break
        segs.append((start, d - datetime.timedelta(days=1), pct))
        start, pct = d, r
    segs.append((start, t, pct))
    return segs


def investor_due(p, f, t):
    """An investor's return for the period: their agreed % a year on the money they
    invested, day by day (money in / out only — their profit is not re-invested), at the
    rate that applied on each day."""
    moves = _money_moves(p)
    return sum((_capital_days(p, s, e, moves) * pct / 100 / YEAR_DAYS for s, e, pct in rate_segments(p, f, t)), Z)


def share_out(partners, f, t, basis, profit):
    """[{partner, name, kind, days, capital, share_pct, method, weight_pct, amount}] — amounts add up to `profit`.

    1. Investors first: each gets their agreed % a year on the money they invested,
       for their days (18 % on 600,000 for a full year = 108,000). If the profit is
       less than all that is due, they share the profit in that proportion; a loss
       is borne by the partners alone.
    2. Partners share what is left:
       capital basis — a partner with an agreed % gets that % of it (for their
       days); the rest goes to the partners without one, by capital × days
       (capital = money in + profit kept − drawings);
       agreed basis — every partner by agreed % × days (scaled to the whole)."""
    period = Decimal((t - f).days + 1)
    profit = _money(profit)
    rows = []
    for p in partners:
        n, _, _ = _active_days(p, f, t)
        if not n:
            continue
        if p.kind == 'investor':
            rows.append({'partner': p.id, 'name': p.name, 'kind': 'investor', 'days': n, 'capital': partner_stats(p, t)['invested'],
                         'share_pct': p.share_pct, 'method': 'investor', 'due': _money(investor_due(p, f, t))})
            continue
        fixed = basis == 'agreed' or p.share_pct is not None
        rows.append({'partner': p.id, 'name': p.name, 'kind': 'partner', 'days': n, 'capital': partner_stats(p, t)['capital'],
                     'share_pct': p.share_pct, 'method': 'agreed' if fixed else 'capital',
                     'w': _d(p.share_pct) * n if fixed else _capital_days(p, f, t)})
    if not rows:
        return rows
    investors = [r for r in rows if r['kind'] == 'investor']
    partners_ = [r for r in rows if r['kind'] == 'partner']
    due = sum((r['due'] for r in investors), Z)
    # 1. the investors' returns
    if profit <= 0 or not investors:
        for r in investors:
            r['amount'] = Z
    elif due <= profit or not partners_:
        for r in investors:
            r['amount'] = r['due'] if due <= profit else _money(profit * r['due'] / due) if due else Z
    else:   # less profit than is due: shared in proportion
        for r in investors:
            r['amount'] = _money(profit * r['due'] / due) if due else Z
    rest = profit - sum((r['amount'] for r in investors), Z)
    # 2. the partners share the rest
    if partners_:
        fixed = [r for r in partners_ if r['method'] == 'agreed']
        pool = [r for r in partners_ if r['method'] == 'capital']
        if basis == 'agreed' or not pool:
            tw = sum((r['w'] for r in partners_), Z)
            for r in partners_:
                r['frac'] = r['w'] / tw if tw else Z
        else:
            for r in fixed:
                r['frac'] = _d(r['share_pct']) / 100 * Decimal(r['days']) / period
            left = Decimal(1) - sum((r['frac'] for r in fixed), Z)
            tw = sum((r['w'] for r in pool), Z)
            for r in pool:
                r['frac'] = left * r['w'] / tw if tw else Z
        for r in partners_:
            r['amount'] = _money(rest * r['frac'])
        if any(r['frac'] for r in partners_):   # rounding: the biggest share takes the odd paisa
            max(partners_, key=lambda r: r['frac'])['amount'] += rest - sum((r['amount'] for r in partners_), Z)
    elif investors and rest:   # no partners: the investors take it all
        max(investors, key=lambda r: r['due'])['amount'] += rest
    for r in rows:
        r['weight_pct'] = abs(r['amount'] / profit * 100).quantize(Decimal('0.01')) * (1 if r['amount'] * profit >= 0 else -1) if profit and r['amount'] else Z
        r.pop('w', None); r.pop('frac', None)
    return rows


class TradePartnershipViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _partners(self):
        return scope_to_tenant(self.request.user, Partner.objects.all(), 'tenant').select_related('account')

    def _accounts(self):
        from modules.company.models import LedgerAccount
        return scope_to_tenant(self.request.user, LedgerAccount.objects.all(), 'tenant').select_related('group')

    def _row(self, p, total_invested=None, s=None, accrued=None):
        s = dict(s or partner_stats(p))
        if accrued is not None:   # investor: return built up since the last posted distribution
            in_period, to_date = accrued   # (within From–To, everything not posted up to To)
            s['posted'] = s['profit']
            s['accrued'] = in_period
            s['profit'] = s['profit'] + in_period
            s['balance'] = s['capital'] = s['balance'] + to_date
        out = {
            'id': p.id, 'name': p.name, 'father_name': p.father_name, 'cnic': p.cnic, 'phone': p.phone, 'address': p.address,
            'joining_date': p.joining_date, 'leaving_date': p.leaving_date, 'share_pct': p.share_pct, 'notes': p.notes,
            'status': p.status, 'kind': p.kind, 'rates': p.rates or [],
            'rate_now': rate_on(p, datetime.date.today()) if p.kind == 'investor' else None, 'account': p.account_id, 'acc_id': p.account.acc_id, 'account_name': p.account.name, **s,
        }
        if total_invested is not None:
            out['capital_pct'] = (s['capital'] / total_invested * 100).quantize(Decimal('0.01')) \
                if p.kind == 'partner' and total_invested > 0 and s['capital'] > 0 else Z
        return out

    def list(self, request):
        """?date_to: capital as on that day (partners who had joined by then); ?date_from: profit /
        loss and drawings from that day."""
        try:
            upto, since = _day(request.query_params.get('date_to')), _day(request.query_params.get('date_from'))
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        ps = list(self._partners())
        if upto:
            ps = [p for p in ps if p.joining_date <= upto]
        stats = {p.id: partner_stats(p, upto, since) for p in ps}
        live = lambda p: p.kind == 'partner' and p.status == 'active' and not (upto and p.leaving_date and p.leaving_date < upto)
        total = sum((stats[p.id]['capital'] for p in ps if live(p) and stats[p.id]['capital'] > 0), Z)
        # Investors: the return due (new rules) from the day after the last posted
        # distribution up to the date — shown before it is posted.
        from .models import ProfitDistribution
        last = scope_to_tenant(request.user, ProfitDistribution.objects.all(), 'tenant').order_by('-date_to').values_list('date_to', flat=True).first()
        end = upto or datetime.date.today()
        after = last + datetime.timedelta(days=1) if last else datetime.date(1900, 1, 1)
        start = max(after, since) if since else after
        due = lambda p, f: _money(investor_due(p, f, end)) if p.share_pct and f <= end else Z
        def accrued(p):
            if p.kind != 'investor':
                return None
            if p.status != 'active' and not p.leaving_date:
                return Z, Z
            return due(p, start), due(p, after)
        return Response([self._row(p, total, stats[p.id], accrued(p)) for p in ps])

    @action(detail=False, methods=['get'])
    def investments(self, request):
        """Each investor's money, one line per amount put in (or taken back), with the
        return it earned: amount × agreed % a year × its days ÷ 365, for the days inside
        From (?date_from) – To (?date_to, today). The lines add up to the investor's return."""
        q = request.query_params
        try:
            upto = _day(q.get('date_to')) or datetime.date.today()
            since = _day(q.get('date_from'))
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        out = []
        for p in self._partners().filter(kind='investor').order_by('joining_date', 'id'):
            if p.joining_date > upto:
                continue
            rate = _d(p.share_pct)
            earns = p.status == 'active' or bool(p.leaving_date)
            if not earns:   # inactive (not left): nothing to show
                continue
            end = min(upto, p.leaving_date) if p.leaving_date else upto
            items = []
            for d, amt in _money_moves(p):
                if d > upto or not amt:
                    continue
                start = max(d, p.joining_date, since) if since else max(d, p.joining_date)
                segs = rate_segments(p, start, end) if start <= end else [(start, end, rate)]
                for k, (s, e, pct) in enumerate(segs):
                    days = max((e - s).days + 1, 0)
                    items.append({'date': d, 'first': k == 0, 'kind': 'in' if amt > 0 else 'out', 'amount': amt, 'from': s, 'to': e,
                                  'days': days, 'rate': pct, 'earned': _money(amt * pct * days / 100 / YEAR_DAYS)})
            out.append({'partner': p.id, 'name': p.name, 'acc_id': p.account.acc_id, 'rate': p.share_pct, 'status': p.status,
                        'items': items, 'invested': sum((i['amount'] for i in items if i['first']), Z),
                        'earned': sum((i['earned'] for i in items), Z)})
        return Response(out)

    def _apply(self, p, d):
        name = str(d.get('name', p.name) or '').strip()[:150]
        if not name:
            return 'Enter the partner name.'
        try:
            p.joining_date = _day(d.get('joining_date'), p.joining_date if p.pk else None) or datetime.date.today()
            p.leaving_date = _day(d.get('leaving_date')) if 'leaving_date' in d else p.leaving_date
        except ValueError:
            return 'Invalid date.'
        if p.leaving_date and p.leaving_date < p.joining_date:
            return 'The leaving date cannot be before the joining date.'
        if 'share_pct' in d:
            v = d.get('share_pct')
            if v in (None, ''):
                p.share_pct = None
            else:
                pct = _d(v)
                if pct < 0 or pct > 100:
                    return 'The share must be 0 to 100 %.'
                p.share_pct = pct
        p.name = name
        for k, n in (('father_name', 150), ('cnic', 20), ('phone', 40), ('address', 255), ('notes', 255)):
            if k in d:
                setattr(p, k, str(d.get(k) or '').strip()[:n])
        if 'status' in d:
            p.status = 'inactive' if str(d.get('status')).lower() == 'inactive' else 'active'
        if 'kind' in d:
            p.kind = 'investor' if d.get('kind') == 'investor' else 'partner'
        if 'rates' in d:
            rates, seen = [], set()
            for r in d.get('rates') or []:
                if not r or (not r.get('from') and r.get('pct') in (None, '')):
                    continue
                try:
                    day = datetime.date.fromisoformat(str(r.get('from'))[:10])
                except ValueError:
                    return 'Enter the date each return % change starts from.'
                pct = _d(r.get('pct'))
                if not (0 < pct <= 100):
                    return f'The return % from {day:%d-%m-%Y} must be more than 0 and up to 100.'
                if day in seen:
                    return f'Two return % changes on {day:%d-%m-%Y}.'
                seen.add(day)
                rates.append({'from': day.isoformat(), 'pct': str(pct.normalize())})
            p.rates = sorted(rates, key=lambda r: r['from'])
        if p.kind == 'investor' and (p.share_pct is None or p.share_pct <= 0):
            return 'Enter the investor\'s agreed return % a year (e.g. 18).'
        if 'account' in d and d.get('account') not in (None, '', 'new'):
            acc = self._accounts().filter(pk=d.get('account')).first()
            if not acc:
                return 'Capital account not found.'
            other = self._partners().filter(account=acc).exclude(pk=p.pk).first()
            if other:
                return f'{acc.acc_id} {acc.name} is already the capital account of {other.name}.'
            p.account = acc
        return None

    def _new_capital_account(self, name):
        from modules.company.models import AccountGroup, LedgerAccount
        from modules.company.views import LedgerAccountViewSet
        group = scope_to_tenant(self.request.user, AccountGroup.objects.filter(code=CAPITAL_GROUP, level=3), 'tenant').first()
        if not group:
            return None
        return LedgerAccount.objects.create(acc_id=LedgerAccountViewSet._next_acc_id(group, self._accounts()), name=name[:255],
                                            group=group, tenant_id=tenant_id_for(self.request.user) or group.tenant_id)

    def create(self, request):
        d = request.data
        p = Partner(tenant_id=tenant_id_for(request.user))
        with transaction.atomic():
            err = self._apply(p, d)
            if not err and not p.account_id:
                p.account = self._new_capital_account(p.name)
                if not p.account:
                    err = 'The Parters Capital (3101) account group is missing — choose the capital account.'
            if err:
                transaction.set_rollback(True)
                return Response({'detail': err}, status=400)
            p.tenant_id = p.tenant_id or p.account.tenant_id
            p.save()
            # Capital brought in on joining, if given.
            amt = _money(d.get('investment'))
            if amt > 0:
                bank = self._accounts().filter(pk=d.get('bank')).first() if d.get('bank') else None
                if not bank:
                    transaction.set_rollback(True)
                    return Response({'detail': 'Find the cash / bank account the investment came into.'}, status=400)
                self._post_entry(p, 'invest', p.joining_date, amt, bank, 'Capital on joining', None)
        return Response(self._row(p), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        p = self._partners().filter(pk=pk).first()
        if not p:
            return Response({'detail': 'Partner not found.'}, status=404)
        err = self._apply(p, request.data)
        if err:
            return Response({'detail': err}, status=400)
        p.save()
        return Response(self._row(p))

    def destroy(self, request, pk=None):
        p = self._partners().filter(pk=pk).first()
        if not p:
            return Response({'detail': 'Partner not found.'}, status=404)
        if p.entries.exists() or VoucherLine.objects.filter(account=p.account, voucher__vtype=DIST_VTYPE).exists():
            return Response({'detail': f'{p.name} has entries — set Inactive / a leaving date instead.'}, status=400)
        p.delete()
        return Response(status=204)

    # Capital in / out
    def _post_entry(self, p, kind, day, amt, bank, note, staff):
        from .vouchers import VoucherViewSet
        label = {'invest': 'Capital invested', 'withdraw': 'Capital withdrawn', 'drawing': 'Drawings'}[kind]
        detail = f'{label} - {p.name}' + (f' - {note}' if note else '')
        v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(day), vtype=f'partner_{kind}', date=day, staff=staff,
                                   detail=detail[:255], total=amt, created_by=self.request.user,
                                   tenant_id=tenant_id_for(self.request.user) or p.tenant_id)
        if kind == 'invest':
            VoucherLine.objects.create(voucher=v, line=1, account=bank, debit=amt, detail=detail[:255])
            VoucherLine.objects.create(voucher=v, line=2, account=p.account, credit=amt, detail=detail[:255])
        else:
            VoucherLine.objects.create(voucher=v, line=1, account=p.account, debit=amt, detail=detail[:255])
            VoucherLine.objects.create(voucher=v, line=2, account=bank, credit=amt, detail=detail[:255])
        return PartnerEntry.objects.create(partner=p, kind=kind, voucher=v, date=day, amount=amt, bank=bank, note=note[:255],
                                           tenant_id=v.tenant_id)

    @action(detail=False, methods=['get', 'post'])
    def entries(self, request):
        from .models import SalesStaff
        if request.method == 'GET':
            q = request.query_params
            qs = scope_to_tenant(request.user, PartnerEntry.objects.all(), 'tenant').select_related('partner', 'voucher', 'bank')
            if q.get('partner'):
                qs = qs.filter(partner_id=q['partner'])
            if q.get('kind'):
                qs = qs.filter(partner__kind=q['kind'])
            if q.get('date_from'):
                qs = qs.filter(date__gte=q['date_from'])
            if q.get('date_to'):
                qs = qs.filter(date__lte=q['date_to'])
            return Response([{'id': e.id, 'voucher_no': e.voucher.voucher_no, 'date': e.date, 'kind': e.kind, 'partner': e.partner.name,
                              'amount': e.amount, 'bank': e.bank.name, 'note': e.note} for e in qs.order_by('-date', '-id')[:2000]])
        d = request.data
        p = self._partners().filter(pk=d.get('partner')).first()
        if not p:
            return Response({'detail': 'Choose the partner.'}, status=400)
        kind = d.get('kind')
        if kind not in ('invest', 'withdraw', 'drawing'):
            return Response({'detail': 'Choose investment, capital withdrawn or drawings.'}, status=400)
        amt = _money(d.get('amount'))
        if amt <= 0:
            return Response({'detail': 'Enter the amount.'}, status=400)
        try:
            day = _day(d.get('date'), datetime.date.today())
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if day > datetime.date.today():
            return Response({'detail': 'The date cannot be in the future.'}, status=400)
        if day < p.joining_date:
            return Response({'detail': f'{p.name} joined on {p.joining_date:%d-%m-%Y} — the date cannot be before that.'}, status=400)
        bank = self._accounts().filter(pk=d.get('bank')).first() if d.get('bank') else None
        if not bank or not bank.group_id or bank.group.code not in (1204, 2203):
            return Response({'detail': 'Find the cash / bank account.'}, status=400)
        staff = scope_to_tenant(request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
        with transaction.atomic():
            e = self._post_entry(p, kind, day, amt, bank, str(d.get('note') or '').strip(), staff)
        return Response({'id': e.id, 'voucher_no': e.voucher.voucher_no, 'amount': amt}, status=status.HTTP_201_CREATED)

    # Profit distribution
    def _period(self, d):
        try:
            f, t = _day(d.get('date_from')), _day(d.get('date_to'))
        except ValueError:
            return None, None, 'Invalid date.'
        if not f or not t:
            return None, None, 'Choose the From and To dates of the period.'
        if t < f:
            return None, None, 'The To date is before the From date.'
        return f, t, None

    def _preview(self, d):
        f, t, err = self._period(d)
        if err:
            return None, err
        basis = 'agreed' if d.get('basis') == 'agreed' else 'capital'
        ps = [p for p in self._partners() if p.status == 'active' or (p.leaving_date and p.leaving_date >= f)]
        no_rate = [p.name for p in ps if p.kind == 'investor' and not p.share_pct and _active_days(p, f, t)[0]]
        if no_rate:
            return None, f'No agreed return % for the investor{"s" if len(no_rate) > 1 else ""} {", ".join(no_rate)} — set it in Investors.'
        if basis == 'agreed':
            missing = [p.name for p in ps if p.kind == 'partner' and p.share_pct is None and _active_days(p, f, t)[0]]
            if missing:
                return None, f'No agreed share % for {", ".join(missing)} — set it, or share by capital.'
        else:
            agreed = sum((_d(p.share_pct) for p in ps if p.kind == 'partner' and p.share_pct is not None and _active_days(p, f, t)[0]), Z)
            if agreed > 100:
                return None, f'The agreed shares add up to {agreed}% — more than 100%. Correct them in Partners.'
        ledger, statement = profit_statement(self.request.user, f, t)
        profit = ledger
        if 'amount' in d and d.get('amount') not in (None, ''):
            profit = _money(d.get('amount'))        # a different figure, e.g. after adjustments
        rows = share_out(ps, f, t, basis, profit)
        if not rows:
            return None, 'No partner was a partner in this period.'
        done = scope_to_tenant(self.request.user, ProfitDistribution.objects.filter(date_from__lte=t, date_to__gte=f), 'tenant')
        # A partner joining or leaving inside the period: counted for their days only, which
        # assumes the profit came evenly. Exact: share the profit up to that date first.
        notes = []
        for p in ps:
            if f < p.joining_date <= t:
                notes.append(f'{p.name} joined on {p.joining_date:%d-%m-%Y} — for exact shares, distribute up to {p.joining_date - datetime.timedelta(days=1):%d-%m-%Y} first, then from {p.joining_date:%d-%m-%Y}.')
            if p.leaving_date and f <= p.leaving_date < t:
                notes.append(f'{p.name} left on {p.leaving_date:%d-%m-%Y} — for exact shares, distribute up to {p.leaving_date:%d-%m-%Y} first, then pay out their capital (Capital In / Out › Capital withdrawn).')
        return {'date_from': f, 'date_to': t, 'basis': basis, 'net_profit': _money(profit), 'ledger_profit': _money(ledger), 'statement': statement,
                'total_income': _money(sum((r['amount'] for r in statement if r['kind'] == 'income'), Z)),
                'total_expense': _money(sum((r['amount'] for r in statement if r['kind'] == 'expense'), Z)),
                'rows': rows, 'notes': notes, 'overlaps': [{'id': x.id, 'from': x.date_from, 'to': x.date_to, 'voucher_no': x.voucher.voucher_no} for x in done]}, None

    @action(detail=False, methods=['get'])
    def preview(self, request):
        out, err = self._preview(request.query_params)
        return Response({'detail': err}, status=400) if err else Response(out)

    @action(detail=False, methods=['get', 'post'])
    def distributions(self, request):
        from .vouchers import VoucherViewSet
        if request.method == 'GET':
            qs = scope_to_tenant(request.user, ProfitDistribution.objects.all(), 'tenant').select_related('voucher')
            return Response([{'id': x.id, 'voucher_no': x.voucher.voucher_no, 'date': x.voucher.date, 'date_from': x.date_from, 'date_to': x.date_to,
                              'net_profit': x.net_profit, 'basis': x.basis, 'lines': x.lines, 'note': x.note} for x in qs])
        d = request.data
        out, err = self._preview(d)
        if err:
            return Response({'detail': err}, status=400)
        if out['overlaps'] and not d.get('confirm_overlap'):
            o = out['overlaps'][0]
            return Response({'detail': f'Profit from {o["from"]:%d-%m-%Y} to {o["to"]:%d-%m-%Y} is already distributed ({o["voucher_no"]}).',
                             'overlap': True}, status=409)
        profit = out['net_profit']
        if profit == 0:
            return Response({'detail': 'There is no profit or loss to share in this period.'}, status=400)
        retain = self._accounts().filter(acc_id=RETAIN_ACC).first()
        if not retain:
            return Response({'detail': 'The Retain Earning account (32010001) is missing.'}, status=400)
        try:
            day = _day(d.get('date'), datetime.date.today())
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        word = 'Profit' if profit > 0 else 'Loss'
        detail = f'{word} {out["date_from"]:%d-%m-%Y} to {out["date_to"]:%d-%m-%Y} shared among partners'
        note = str(d.get('note') or '').strip()[:255]
        partners = {p.id: p for p in self._partners()}
        with transaction.atomic():
            v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(day), vtype=DIST_VTYPE, date=day, detail=(f'{note} - ' if note else '') + detail,
                                       total=abs(profit), created_by=request.user, tenant_id=tenant_id_for(request.user) or retain.tenant_id)
            n = 1
            VoucherLine.objects.create(voucher=v, line=n, account=retain, debit=max(profit, Z), credit=max(-profit, Z), detail=detail)
            for r in out['rows']:
                n += 1
                a = r['amount']
                VoucherLine.objects.create(voucher=v, line=n, account=partners[r['partner']].account, credit=max(a, Z), debit=max(-a, Z),
                                           detail=(f'Investor return {_d(r["share_pct"]).normalize()}% a year - {r["name"]}' if r['kind'] == 'investor'
                                                   else f'{word} share {r["weight_pct"]}% - {r["name"]}'))
            x = ProfitDistribution.objects.create(
                date_from=out['date_from'], date_to=out['date_to'], net_profit=profit, basis=out['basis'], voucher=v, note=note,
                tenant_id=v.tenant_id,
                lines=[{**r, 'capital': str(r['capital']), 'weight_pct': str(r['weight_pct']), 'amount': str(r['amount']),
                        'due': str(r['due']) if r.get('due') is not None else None,
                        'share_pct': str(r['share_pct']) if r['share_pct'] is not None else None} for r in out['rows']])
        return Response({'id': x.id, 'voucher_no': v.voucher_no, 'net_profit': profit}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'], url_path=r'distributions/(?P<did>[0-9]+)')
    def undo_distribution(self, request, did=None):
        x = scope_to_tenant(request.user, ProfitDistribution.objects.filter(pk=did), 'tenant').select_related('voucher').first()
        if not x:
            return Response({'detail': 'Not found.'}, status=404)
        no = x.voucher.voucher_no
        x.voucher.delete()
        return Response({'detail': f'{no} removed.'})

    @action(detail=False, methods=['get'])
    def statement(self, request):
        """One partner's capital account: opening, every entry, running balance."""
        q = request.query_params
        p = self._partners().filter(pk=q.get('partner')).first()
        if not p:
            return Response({'detail': 'Choose the partner.'}, status=400)
        try:
            f, t = _day(q.get('date_from')), _day(q.get('date_to'))
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        lines = (VoucherLine.objects.filter(account=p.account).exclude(voucher__chq_status='pending')
                 .select_related('voucher').order_by('voucher__date', 'voucher_id', 'line'))
        drawings = set(PartnerEntry.objects.filter(partner=p, kind='drawing').values_list('voucher_id', flat=True))
        opening, bal, rows = Z, None, []
        for l in lines:
            d = l.voucher.date
            if t and d > t:
                break
            amt = _d(l.credit) - _d(l.debit)
            if f and d < f:
                opening += amt
                continue
            if bal is None:
                bal = opening
            bal += amt
            kind = ('Investor return' if p.kind == 'investor' else 'Profit share' if amt >= 0 else 'Loss share') if l.voucher.vtype == DIST_VTYPE else \
                'Donation' if l.voucher.vtype == 'donation' else \
                'Drawings' if l.voucher_id in drawings else ('Capital in' if amt >= 0 else 'Capital out')
            rows.append({'date': d, 'voucher_no': l.voucher.voucher_no, 'kind': kind, 'detail': l.detail or l.voucher.detail,
                         'debit': l.debit, 'credit': l.credit, 'balance': bal})
        return Response({'partner': self._row(p), 'opening': opening, 'rows': rows, 'closing': bal if bal is not None else opening})
