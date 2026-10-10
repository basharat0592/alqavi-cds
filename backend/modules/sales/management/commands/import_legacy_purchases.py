"""Import legacy Trade purchases (PurchaseAmt.csv + Purchase.csv) as history.

Each P-numbered purchase becomes a PurchaseOrder (RECEIVED, inventory already
synced, fully paid — stock and balances were brought over from the legacy
stock / vouchers, so nothing is counted twice) with its lines; each R-numbered
purchase return the same way as status RETURNED. Re-running replaces only these
imported rows.

  python manage.py import_legacy_purchases --dir /tmp/legacy_dump [--tenant admin]
"""
import csv
import datetime
import os
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from modules.company.models import LedgerAccount
from modules.products.models import SupplierProduct
from modules.sales.models import PurchaseOrder, PurchaseOrderItem
from modules.sales.trade_purchases import LEGACY_NOTE, LEGACY_RETURN_NOTE


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
    help = 'Import legacy Trade purchases as purchase history.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', required=True)
        parser.add_argument('--tenant', default=None)

    def handle(self, *args, **o):
        head_p, line_p = os.path.join(o['dir'], 'PurchaseAmt.csv'), os.path.join(o['dir'], 'Purchase.csv')
        if not (os.path.exists(head_p) and os.path.exists(line_p)):
            raise CommandError('PurchaseAmt.csv / Purchase.csv not found')
        User = get_user_model()
        tenant = (User.objects.filter(username=o['tenant']).first() if o['tenant']
                  else User.objects.filter(is_superuser=True).order_by('id').first())
        sup_by_acc = dict(LedgerAccount.objects.filter(tenant=tenant, supplier__isnull=False).values_list('acc_id', 'supplier_id'))
        sp_by_pid = dict(SupplierProduct.objects.exclude(sku__isnull=True).values_list('sku', 'id'))
        lines = {}
        with open(line_p, encoding='utf-8', errors='replace', newline='') as fh:
            for r in csv.DictReader(fh):
                lines.setdefault(r['PurID'].strip(), []).append(r)
        made = items = skipped = 0
        with transaction.atomic():
            old = PurchaseOrder.objects.filter(tenant=tenant, notes__in=[LEGACY_NOTE, LEGACY_RETURN_NOTE])
            replaced = old.count()
            PurchaseOrderItem.objects.filter(purchase_order__in=old).delete()
            old.delete()
            with open(head_p, encoding='utf-8', errors='replace', newline='') as fh:
                for h in csv.DictReader(fh):
                    pid = h['PurID'].strip()
                    ret = pid.startswith('R')
                    if not (pid.startswith('P') or ret) or PurchaseOrder.objects.filter(purchase_number=pid).exists():
                        skipped += 1
                        continue
                    total = _money(h.get('PurAmt'))
                    po = PurchaseOrder.objects.create(
                        purchase_number=pid, supplier_id=sup_by_acc.get(h.get('AccID', '').strip()),
                        reference_number=(h.get('BillNo') or '').strip()[:50] or None, tenant=tenant,
                        total_amount=total, shipping_cost=_money(h.get('Freight')), tax_amount=_money(h.get('STaxAmt')),
                        extra_discount=_money(h.get('DiscAmt')), status='RETURNED' if ret else 'RECEIVED', is_inventory_synced=True,
                        paid_amount=total, payment_status='PAID', payment_method='CASH', notes=LEGACY_RETURN_NOTE if ret else LEGACY_NOTE)
                    d = _date(h.get('PurDate'))
                    if d:
                        PurchaseOrder.objects.filter(pk=po.pk).update(order_date=datetime.datetime.combine(d, datetime.time(12, 0)))
                    batch = []
                    for r in sorted(lines.get(pid, []), key=lambda x: int(x.get('SNo') or 0)):
                        sp = sp_by_pid.get(r['PID'].strip())
                        if not sp:
                            continue
                        batch.append(PurchaseOrderItem(
                            purchase_order=po, product_id=sp, packaging_type='SINGLE', items_per_carton=1,
                            quantity=int(_money(r.get('QtyP'))), bonus_quantity=int(_money(r.get('QTO'))),
                            price=_money(r.get('UPRate')), selling_price=_money(r.get('USRate')),
                            retail_rate=_money(r.get('URRate')), expiry_date=_date(r.get('ExpiryDate'))))
                    PurchaseOrderItem.objects.bulk_create(batch)
                    made += 1
                    items += len(batch)
        self.stdout.write(self.style.SUCCESS(f'Purchases: {made} (replaced {replaced}), lines: {items}, skipped: {skipped}'))
