"""
Reconcile COD payment status.

COD (cash-on-delivery) is collected at the doorstep, so a COD order must stay UNPAID
until it is actually delivered. Historically new orders defaulted payment_status to
'PAID', which wrongly showed undelivered COD orders as fully paid. Order creation now
defaults COD to UNPAID and delivery settles it to PAID — this command backfills the
existing rows to that same rule.

Safe + idempotent — only touches COD orders that are NOT delivered/cancelled, are
currently PAID, and have no confirmed installment payments. Delivered COD orders (paid
on delivery), prepaid/online orders, and partial/credit sales are left untouched.
"""
from django.core.management.base import BaseCommand

from modules.sales.models import Order
from modules.payments.services import has_confirmed_installments


class Command(BaseCommand):
    help = "Set undelivered COD orders back to UNPAID (payment is collected on delivery)."

    def handle(self, *args, **options):
        qs = Order.objects.filter(
            payment_method__iexact='COD',
            payment_status__iexact='PAID',
        ).exclude(status__in=['DELIVERED', 'CANCELLED', 'REJECTED'])

        fixed = 0
        for order in qs.iterator():
            if has_confirmed_installments('order', order.id):
                continue  # a real advance payment was recorded — leave it.
            Order.objects.filter(pk=order.pk).update(payment_status='UNPAID', amount_paid=0)
            fixed += 1

        self.stdout.write(self.style.SUCCESS(
            f"reconcile_cod_payments: {fixed} undelivered COD order(s) reset to UNPAID."
        ))
