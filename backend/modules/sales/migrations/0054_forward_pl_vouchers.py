from django.db import migrations


def mark(apps, schema_editor):
    """Legacy "fwd P/L of FY …" vouchers (VT 28) were imported as type "other"."""
    Voucher = apps.get_model('sales', 'Voucher')
    Voucher.objects.filter(vtype='other', detail__istartswith='fwd P/L', lines__account__acc_id='32010001') \
        .update(vtype='forward_pl')


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0053_cheque_cleared_by'),
    ]

    operations = [
        migrations.RunPython(mark, migrations.RunPython.noop),
    ]
