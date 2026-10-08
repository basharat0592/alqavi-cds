from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0041_orderitem_shelf_discount'),
    ]

    operations = [
        migrations.AddField(
            model_name='tradesalereturn',
            name='shelf_discount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='tradesalereturnitem',
            name='shelf_discount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
