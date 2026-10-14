from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0056_trade_permissions'),
    ]

    operations = [
        migrations.AddField(model_name='voucher', name='chq_status', field=models.CharField(blank=True, default='', max_length=10)),
        migrations.AddField(model_name='voucher', name='chq_received', field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name='voucher', name='chq_cash_date', field=models.DateField(blank=True, null=True)),
    ]
