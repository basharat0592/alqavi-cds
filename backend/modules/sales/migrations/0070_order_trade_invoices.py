from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0069_company_invoices_card_purchase'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='trade_invoices',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
