from django.db import migrations

# '-', '.', '0' … were typed for "no bar code" (legacy habit); store them as empty.
PLACEHOLDERS = ['-', '--', '.', '0', '00', 'na', 'NA', 'n/a', 'N/A', 'none', 'None', 'nil', 'Nil']


def clear(apps, schema_editor):
    for model in ('Product', 'SupplierProduct'):
        apps.get_model('products', model).objects.filter(barcode__in=PLACEHOLDERS).update(barcode=None)


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0028_product_carton_qty'),
    ]

    operations = [
        migrations.RunPython(clear, migrations.RunPython.noop),
    ]
