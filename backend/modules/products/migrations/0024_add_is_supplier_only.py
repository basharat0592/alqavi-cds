from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0023_product_supplier'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_supplier_only',
            field=models.BooleanField(default=False),
        ),
    ]
