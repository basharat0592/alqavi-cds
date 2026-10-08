from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0040_trade_sale_returns'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='shelf_discount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='sale_unit',
            field=models.CharField(blank=True, default='', max_length=10),
        ),
    ]
