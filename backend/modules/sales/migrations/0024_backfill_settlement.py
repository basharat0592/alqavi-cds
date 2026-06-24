from django.db import migrations


def backfill_settlement(apps, schema_editor):
    """Existing data predates the settlement fields:

    - Sale orders were always treated as paid-in-full on delivery, so mark every
      existing order fully paid (amount_paid = total_amount, status PAID).
    - Re-derive each purchase order's payment_status from its current paid_amount
      so the new logic and the stored status agree.
    """
    Order = apps.get_model('sales', 'Order')
    for o in Order.objects.all().iterator():
        o.amount_paid = o.total_amount or 0
        o.payment_status = 'PAID'
        o.save(update_fields=['amount_paid', 'payment_status'])

    PurchaseOrder = apps.get_model('sales', 'PurchaseOrder')
    for p in PurchaseOrder.objects.all().iterator():
        total = p.total_amount or 0
        paid = p.paid_amount or 0
        if paid <= 0:
            status = 'UNPAID'
        elif paid >= total and total > 0:
            status = 'PAID'
        else:
            status = 'PARTIAL'
        if p.payment_status != status:
            p.payment_status = status
            p.save(update_fields=['payment_status'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0023_order_amount_paid_order_due_date_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_settlement, noop),
    ]
