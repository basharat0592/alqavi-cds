"""Credit cards start over: the vouchers the first card system posted (our-card
postings, card bill payments, customer payments on a card machine) are removed
with its cards and entries; the next migration replaces its tables with the
new card list and customers' card payments."""
from django.db import migrations


def remove_old_card_vouchers(apps, schema_editor):
    CardEntry = apps.get_model('sales', 'CardEntry')
    Voucher = apps.get_model('sales', 'Voucher')
    Order = apps.get_model('sales', 'Order')
    TransactionPayment = apps.get_model('payments', 'TransactionPayment')
    vids = list(CardEntry.objects.values_list('voucher_id', flat=True))
    nos = list(Voucher.objects.filter(pk__in=vids).values_list('voucher_no', flat=True))
    # A customer's card payment had settled invoices: take those back.
    for tp in TransactionPayment.objects.filter(reference__in=nos, source_type='order'):
        o = Order.objects.filter(pk=tp.source_id).first()
        if o is not None:
            o.amount_paid = max((o.amount_paid or 0) - tp.amount, 0)
            o.payment_status = 'UNPAID' if o.amount_paid <= 0 else ('PAID' if o.amount_paid >= (o.total_amount or 0) else 'PARTIAL')
            o.save(update_fields=['amount_paid', 'payment_status'])
        tp.delete()
    CardEntry.objects.all().delete()
    Voucher.objects.filter(pk__in=vids).delete()
    apps.get_model('sales', 'CreditCard').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
        ('sales', '0060_card_entry_order'),
    ]

    operations = [
        migrations.RunPython(remove_old_card_vouchers, migrations.RunPython.noop),
    ]
