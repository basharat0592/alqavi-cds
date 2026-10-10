"""Import legacy Trade opening stock (B…), damage (D…) and stock access / short (H… / G…) invoices as history.

Reads OpStockDemAmt.csv (headers) + OpStockDem.csv (lines) from mdb-export.
Each becomes a DamageStock (kind 'oadd' for B, 'add' for D, 'sexc' for H stock
access, 'ssho' for G stock short; legacy=True) with
its lines, linked to the legacy voucher already imported ("OpStock Add-B…",
"Demage Stock-D…"). Stock is not moved — the legacy stock was brought over
as it stood. Re-running replaces only these imported rows.

  python manage.py import_legacy_opening_stock --dir /tmp/legacy_dump [--tenant admin]
"""
import csv
import datetime
import os
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from modules.products.models import Product
from modules.sales.models import DamageStock, DamageStockItem, SalesStaff, Voucher

KINDS = {'B': ('oadd', 'OpStock Add'), 'D': ('add', 'Demage Stock'),
         'H': ('sexc', 'Stock Access '), 'G': ('ssho', 'Stock Short')}


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


class Command(BaseCommand):
    help = 'Import legacy opening stock / damage invoices as history.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', required=True)
        parser.add_argument('--tenant', default=None)

    def handle(self, *args, **o):
        head_p, line_p = os.path.join(o['dir'], 'OpStockDemAmt.csv'), os.path.join(o['dir'], 'OpStockDem.csv')
        if not (os.path.exists(head_p) and os.path.exists(line_p)):
            raise CommandError('OpStockDemAmt.csv / OpStockDem.csv not found')
        User = get_user_model()
        tenant = (User.objects.filter(username=o['tenant']).first() if o['tenant']
                  else User.objects.filter(is_superuser=True).order_by('id').first())
        by_pid = {}
        for p in Product.objects.filter(tenant=tenant).exclude(sku__isnull=True):
            by_pid.setdefault(p.sku, p)
        staff = {s.legacy_id: s for s in SalesStaff.objects.filter(tenant=tenant) if s.legacy_id}
        lines = {}
        with open(line_p, encoding='utf-8', errors='replace', newline='') as fh:
            for r in csv.DictReader(fh):
                lines.setdefault(r['OSDRID'].strip(), []).append(r)
        made = items = 0
        with transaction.atomic():
            old = DamageStock.objects.filter(tenant=tenant, legacy=True)
            replaced = old.count()
            DamageStockItem.objects.filter(damage__in=old).delete()
            old.delete()
            with open(head_p, encoding='utf-8', errors='replace', newline='') as fh:
                for h in csv.DictReader(fh):
                    num = h['OSDRID'].strip()
                    if num[:1] not in KINDS or DamageStock.objects.filter(number=num).exists():
                        continue
                    kind, label = KINDS[num[:1]]
                    v = Voucher.objects.filter(tenant=tenant, detail__endswith=f'-{num}').first()  # wording varies (Stock Access / Stock Excess)
                    sid = int(h['StaffID']) if str(h.get('StaffID') or '').strip().isdigit() else None
                    doc = DamageStock.objects.create(
                        number=num, kind=kind, date=_date(h.get('OSDRDate')) or datetime.date.today(),
                        staff=staff.get(sid), bill_no=('' if (h.get('BillNo') or '').strip() in ('0', '-') else (h.get('BillNo') or '').strip())[:50],
                        total=_money(h.get('PurAmt')), voucher=v, tenant=tenant, legacy=True)
                    batch = []
                    for r in sorted(lines.get(num, []), key=lambda x: int(x.get('SNo') or 0)):
                        p = by_pid.get(r['PID'].strip())
                        if not p:
                            continue
                        batch.append(DamageStockItem(
                            damage=doc, line=int(r.get('SNo') or 0) or len(batch) + 1, product=p,
                            expiry_date=_date(r.get('ExpiryDate')), qty=int(_money(r.get('QtyP'))),
                            pur_rate=_money(r.get('UPRate')), sale_rate=_money(r.get('USRate')), retail_rate=_money(r.get('URRate'))))
                    DamageStockItem.objects.bulk_create(batch)
                    made += 1
                    items += len(batch)
        self.stdout.write(self.style.SUCCESS(f'Opening stock / damage invoices: {made} (replaced {replaced}), lines: {items}'))
