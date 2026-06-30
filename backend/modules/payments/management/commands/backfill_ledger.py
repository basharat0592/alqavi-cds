"""Post ledger entries for business records created before the payment system
existed. Safe to run repeatedly — the ledger services are idempotent.

Usage:
    python manage.py backfill_ledger
"""
from django.core.management.base import BaseCommand

from modules.sales.models import Order, PurchaseOrder, PurchaseReturn, SaleReturn
from modules.payments import services


class Command(BaseCommand):
    help = "Backfill ledger entries for existing sales, purchase payments and returns."

    def handle(self, *args, **options):
        counts = {'sales': 0, 'purchases': 0, 'purchase_returns': 0, 'sale_returns': 0}

        # Sales — income for every delivered order.
        for order in Order.objects.filter(status='DELIVERED'):
            services.record_sale(order)
            counts['sales'] += 1

        # Purchase payments — expense for every supplier-accepted payment.
        for po in PurchaseOrder.objects.filter(payment_confirmed=True):
            services.record_purchase_payment(po)
            counts['purchases'] += 1

        # Purchase returns — income (refund received) for accepted returns.
        for ret in PurchaseReturn.objects.filter(status='ACCEPTED'):
            services.record_purchase_return(ret)
            counts['purchase_returns'] += 1

        # Sale returns — expense (refund paid) for accepted returns.
        for sr in SaleReturn.objects.filter(status='ACCEPTED'):
            services.record_sale_return(sr)
            counts['sale_returns'] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Backfill complete — sales: {counts['sales']}, "
            f"purchase payments: {counts['purchases']}, "
            f"purchase returns: {counts['purchase_returns']}, "
            f"sale returns: {counts['sale_returns']}"
        ))
