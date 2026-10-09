"""Import legacy Trade purchase orders (PurOrderAmt.csv + PurOrder.csv).

K-numbered orders become PurchaseOrder rows (status PENDING) with their lines;
no stock or balance change. Re-running replaces only these imported rows.
The legacy QtyO column sometimes holds a date (e.g. 20261230) instead of a
quantity; such values are imported as 0.

  python manage.py import_legacy_purchase_orders --dir /tmp/legacy_dump [--tenant admin]
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
from modules.sales.trade_purchases import LEGACY_ORDER_NOTE


def _dec(v):
    try:
        return Decimal(str(v or '0').strip() or '0')
    except InvalidOperation:
        return Decimal('0')


class Command(BaseCommand):
    help = 'Import legacy Trade purchase orders.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', required=True)
        parser.add_argument('--tenant', default=None)

    def handle(self, *args, **o):
        hp, lp = os.path.join(o['dir'], 'PurOrderAmt.csv'), os.path.join(o['dir'], 'PurOrder.csv')
        if not (os.path.exists(hp) and os.path.exists(lp)):
            raise CommandError('PurOrderAmt.csv / PurOrder.csv not found')
        User = get_user_model()
        tenant = (User.objects.filter(username=o['tenant']).first() if o['tenant']
                  else User.objects.filter(is_superuser=True).order_by('id').first())
        sup = dict(LedgerAccount.objects.filter(tenant=tenant, supplier__isnull=False).values_list('acc_id', 'supplier_id'))
        sp = dict(SupplierProduct.objects.exclude(sku__isnull=True).values_list('sku', 'id'))
        lines = {}
        with open(lp, encoding='utf-8', errors='replace', newline='') as fh:
            for r in csv.DictReader(fh):
                lines.setdefault(r['POID'].strip(), []).append(r)
        made = n = bad_qty = 0
        with transaction.atomic():
            old = PurchaseOrder.objects.filter(tenant=tenant, notes=LEGACY_ORDER_NOTE)
            PurchaseOrderItem.objects.filter(purchase_order__in=old).delete()
            old.delete()
            with open(hp, encoding='utf-8', errors='replace', newline='') as fh:
                for h in csv.DictReader(fh):
                    pid = h['POID'].strip()
                    if not pid.startswith('K') or PurchaseOrder.objects.filter(purchase_number=pid).exists():
                        continue
                    items = []
                    total = Decimal('0')
                    for r in sorted(lines.get(pid, []), key=lambda x: int(x.get('SNo') or 0)):
                        spid = sp.get(r['PID'].strip())
                        if not spid:
                            continue
                        q = int(_dec(r.get('QtyO')))
                        if q > 100000:
                            q = 0
                            bad_qty += 1
                        rate = _dec(r.get('PR')).quantize(Decimal('0.01'))
                        total += rate * q
                        items.append(PurchaseOrderItem(purchase_order=None, product_id=spid, packaging_type='SINGLE',
                                                       items_per_carton=1, quantity=q, bonus_quantity=0, price=rate,
                                                       selling_price=0, retail_rate=0))
                    po = PurchaseOrder.objects.create(
                        purchase_number=pid, supplier_id=sup.get(h.get('AccID', '').strip()), tenant=tenant,
                        total_amount=total, status='PENDING', is_inventory_synced=True, payment_status='UNPAID',
                        payment_method='CREDIT', notes=LEGACY_ORDER_NOTE)
                    s = str(h.get('OrderDate') or '')
                    if len(s) == 8 and s.isdigit():
                        PurchaseOrder.objects.filter(pk=po.pk).update(
                            order_date=datetime.datetime(int(s[:4]), int(s[4:6]), int(s[6:]), 12, 0))
                    for it in items:
                        it.purchase_order = po
                    PurchaseOrderItem.objects.bulk_create(items)
                    made += 1
                    n += len(items)
        self.stdout.write(self.style.SUCCESS(f'Purchase orders: {made}, lines: {n}, date-like quantities set to 0: {bad_qty}'))
