from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0027_product_expiry_apply'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='carton_qty',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
