import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('sales', '0066_card_bills')]
    operations = [
        migrations.AlterField(model_name='cardpayment', name='voucher',
                              field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='card_payments', to='sales.voucher')),
    ]
