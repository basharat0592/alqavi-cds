from django.db import migrations, models


def copy_addresses(apps, schema_editor):
    """Start each account's address from its linked customer / supplier."""
    LedgerAccount = apps.get_model('company', 'LedgerAccount')
    for acc in LedgerAccount.objects.filter(models.Q(customer__isnull=False) | models.Q(supplier__isnull=False)) \
            .select_related('customer', 'supplier'):
        addr = ((acc.customer.address if acc.customer_id else '') or
                (acc.supplier.address if acc.supplier_id else '') or '').strip()
        if addr:
            acc.address = addr
            acc.save(update_fields=['address'])


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0005_company_code'),
        ('customer', '0006_customer_tenant'),
        ('supplier', '0009_backfill_supplier_tenant'),
    ]

    operations = [
        migrations.AddField(
            model_name='ledgeraccount',
            name='address',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.RunPython(copy_addresses, migrations.RunPython.noop),
    ]
