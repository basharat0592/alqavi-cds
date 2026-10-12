"""Fresh start from the legacy Trade database (TDistribution.mdb, dumped to CSV).

Removes everything *entered on the website* — sales, sale returns, purchases,
purchase orders / returns, vouchers, stock damage / opening / access entries,
rate changes, and the installment payments they made — then re-runs every
legacy import with the given dump, so the shop data is exactly the legacy
program's again. Master records that exist only on the website (products,
accounts …) are kept; products not in the dump are set to zero stock, since
the website entries that stocked them are gone.

All in one database transaction: if any step fails nothing changes.
Without --yes it only reports what it would remove.

  python manage.py legacy_fresh_start --dir /tmp/newdump [--tenant admin] --yes
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

LEGACY_SALE_NOTE = 'Legacy Trade 2.1 sale (imported history)'


class Command(BaseCommand):
    help = 'Remove the website-entered Trade data and re-import everything from the legacy dump.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', required=True)
        parser.add_argument('--tenant', default=None)
        parser.add_argument('--yes', action='store_true', help='Do it (otherwise only report).')

    def handle(self, *args, **o):
        import os
        from modules.payments import services
        from modules.payments.models import TransactionPayment
        from modules.products.models import Product, ProductBatch, RateExpiryUpdate
        from modules.sales.models import (DamageStock, Order, PurchaseOrder, TradeSaleReturn, Voucher)
        need = ['Product', 'CompBatchStock', 'Accounts', 'SaleAmount', 'Sale', 'VoucherDetail', 'VoucherType',
                'PurchaseAmt', 'Purchase', 'PurOrderAmt', 'PurOrder', 'OpStockDemAmt', 'OpStockDem']
        missing = [n for n in need if not os.path.exists(os.path.join(o['dir'], f'{n}.csv'))]
        if missing:
            raise CommandError(f'Missing in {o["dir"]}: {", ".join(missing)}')

        orders = Order.objects.exclude(notes=LEGACY_SALE_NOTE)
        returns = TradeSaleReturn.objects.exclude(kind='legacy')
        vouchers = Voucher.objects.filter(legacy=False)
        pos = PurchaseOrder.objects.exclude(notes__startswith='Legacy')
        damage = DamageStock.objects.filter(legacy=False)
        v_nos = list(vouchers.values_list('voucher_no', flat=True))
        tps = (TransactionPayment.objects.filter(source_type='order', source_id__in=[str(i) for i in orders.values_list('id', flat=True)])
               | TransactionPayment.objects.filter(source_type='purchaseorder', source_id__in=[str(i) for i in pos.values_list('id', flat=True)])
               | TransactionPayment.objects.filter(reference__in=v_nos))
        report = {
            'sales': list(orders.values_list('tracking_id', flat=True)),
            'sale returns': list(returns.values_list('return_no', flat=True)),
            'vouchers': v_nos,
            'purchases / orders / returns': list(pos.values_list('purchase_number', flat=True)),
            'damage / opening / stock entries': list(damage.values_list('number', flat=True)),
            'installment payments': tps.count(),
            'rate / expiry changes': RateExpiryUpdate.objects.count(),
        }
        for k, v in report.items():
            self.stdout.write(f'  remove {k}: {v if isinstance(v, int) else (len(v), v[:30])}')
        if not o['yes']:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Add --yes to do it.'))
            return

        with transaction.atomic():
            for tp in list(tps):
                services.remove_installment(tp)
                TransactionPayment.objects.filter(pk=tp.pk).delete()
            for qs in (orders, returns, vouchers, pos, damage, RateExpiryUpdate.objects.all()):
                for obj in list(qs):          # one by one, so the ledger signals clean up too
                    obj.delete()
            args = ['--dir', o['dir']] + (['--tenant', o['tenant']] if o['tenant'] else [])
            for cmd in ('import_legacy', 'import_legacy_vouchers', 'import_legacy_purchases',
                        'import_legacy_purchase_orders', 'import_legacy_opening_stock'):
                self.stdout.write(f'── {cmd}')
                call_command(cmd, *args, stdout=self.stdout)
            # Products not in the legacy dump: their stock came from website entries now removed.
            import csv
            with open(os.path.join(o['dir'], 'Product.csv'), encoding='utf-8', errors='replace', newline='') as fh:
                pids = {r['PID'].strip() for r in csv.DictReader(fh)}
            extra = Product.objects.exclude(sku__in=pids)
            ProductBatch.objects.filter(product__in=extra).delete()
            for p in extra.select_related('stock'):
                if p.stock_id:
                    type(p.stock).objects.filter(pk=p.stock_id).update(total_quantity=0)
            n_extra = extra.update(total_quantity=0, expiry_date=None)
            Product.objects.update(reserved_quantity=0)
            self.stdout.write(f'Website-only products set to zero stock: {n_extra}')
        self.stdout.write(self.style.SUCCESS('FRESH_START_OK'))
