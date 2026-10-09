"""Import the legacy Trade vouchers (VoucherDetail.csv + VoucherType.csv).

Every voucher type is brought in (receipt, payment, expense, sale, purchase,
stock …) with its lines, accounts, staff, cheque details and debit / credit.
Imported vouchers are flagged `legacy`; a re-run replaces only those, never
vouchers entered in the app. They do not settle any invoice (legacy sales were
imported as paid) and carry no unallocated credit, so balances are unchanged.

  python manage.py import_legacy_vouchers --dir /tmp/legacy_dump [--tenant admin]
"""
import csv
import datetime
import os
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from modules.company.models import LedgerAccount
from modules.sales.models import SalesStaff, Voucher, VoucherLine

VTYPES = {
    1: 'opening_assets', 2: 'opening_receivables', 3: 'opening_liabilities', 4: 'payment', 5: 'receipt',
    6: 'expense', 7: 'deposit', 8: 'withdrawal', 9: 'general', 10: 'purchase', 11: 'purchase_return',
    12: 'damage_stock', 13: 'un_damage', 14: 'stock_update', 15: 'opening_stock_add', 16: 'opening_stock_less',
    17: 'stock_access', 18: 'stock_short', 19: 'cash_access', 20: 'cash_short', 21: 'sale', 22: 'sale_return',
    23: 'chq_voucher', 24: 'stock_short', 25: 'stock_access', 26: 'cash_short', 27: 'cash_access',
}


def _money(v):
    try:
        return Decimal(str(v or '0').strip() or '0').quantize(Decimal('0.01'))
    except InvalidOperation:
        return Decimal('0.00')


def _date(v):
    s = str(v or '').strip()
    if len(s) == 8 and s.isdigit() and s != '00000000':
        try:
            return datetime.date(int(s[:4]), int(s[4:6]), int(s[6:]))
        except ValueError:
            return None
    return None


def _clean(v):
    s = str(v or '').strip()
    return '' if s in ('-', '0') else s


class Command(BaseCommand):
    help = 'Import legacy Trade vouchers (all types) from VoucherDetail.csv.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', required=True)
        parser.add_argument('--tenant', default=None, help='Owning admin username (default: first superuser)')

    def handle(self, *args, **opts):
        path = os.path.join(opts['dir'], 'VoucherDetail.csv')
        if not os.path.exists(path):
            raise CommandError(f'{path} not found')
        User = get_user_model()
        tenant = (User.objects.filter(username=opts['tenant']).first() if opts['tenant']
                  else User.objects.filter(is_superuser=True).order_by('id').first())
        if not tenant:
            raise CommandError('No tenant user found.')

        accounts = {a.acc_id: a.id for a in LedgerAccount.objects.filter(tenant=tenant)}
        staff = {s.legacy_id: s.id for s in SalesStaff.objects.filter(tenant=tenant, legacy_id__isnull=False)}

        groups = {}
        skipped = 0
        with open(path, encoding='utf-8', errors='replace', newline='') as fh:
            for r in csv.DictReader(fh):
                vid = (r.get('VoucherID') or '').strip()
                if not vid or vid == '0':
                    skipped += 1
                    continue
                groups.setdefault(vid, []).append(r)

        missing = set()
        with transaction.atomic():
            old = Voucher.objects.filter(tenant=tenant, legacy=True)
            VoucherLine.objects.filter(voucher__in=old).delete()
            removed = old.count()
            old.delete()
            # A voucher number already used in the app is left alone.
            taken = set(Voucher.objects.filter(voucher_no__in=list(groups)).values_list('voucher_no', flat=True))

            vouchers = []
            for vid, rows in groups.items():
                if vid in taken:
                    continue
                rows.sort(key=lambda x: int(x.get('LineID') or 0))
                first = rows[0]
                try:
                    vt = int(first.get('VT') or 0)
                except ValueError:
                    vt = 0
                debit = sum((_money(x.get('Debit')) for x in rows), Decimal('0'))
                try:
                    sid = int(first.get('StaffID') or 0)
                except ValueError:
                    sid = 0
                vouchers.append(Voucher(
                    voucher_no=vid[:20], vtype=VTYPES.get(vt, 'other'), date=_date(first.get('DateVoch')) or datetime.date(2023, 1, 1),
                    staff_id=staff.get(sid), chq_no=_clean(first.get('ChqNo'))[:40], chq_date=_date(first.get('DateChq')),
                    bank=_clean(first.get('Bank'))[:80], detail=_clean(first.get('VDetail'))[:255],
                    total=debit, legacy=True, created_by=tenant, tenant=tenant))
            Voucher.objects.bulk_create(vouchers, batch_size=1000)
            ids = dict(Voucher.objects.filter(tenant=tenant, legacy=True).values_list('voucher_no', 'id'))

            lines = []
            for vid, rows in groups.items():
                v_id = ids.get(vid[:20])
                if not v_id:
                    continue
                for x in rows:
                    acc = accounts.get(str(x.get('AccID') or '').strip())
                    if not acc:
                        missing.add(str(x.get('AccID')))
                        continue
                    lines.append(VoucherLine(
                        voucher_id=v_id, line=int(x.get('LineID') or 0) or 1, account_id=acc,
                        debit=_money(x.get('Debit')), credit=_money(x.get('Credit')), unallocated=0,
                        detail=_clean(x.get('VDetail'))[:255]))
            VoucherLine.objects.bulk_create(lines, batch_size=2000)

        self.stdout.write(self.style.SUCCESS(
            f'Vouchers: {len(vouchers)} imported (replaced {removed}), lines: {len(lines)}, '
            f'skipped blank-id rows: {skipped}, already used numbers: {len(taken)}, '
            f'unknown accounts: {len(missing)} {sorted(missing)[:5]}'))
