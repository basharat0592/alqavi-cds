import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('sales', '0065_partner_rates'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(model_name='tradecard', name='bill_day', field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='tradecard', name='due_day', field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='tradecard', name='bills_from', field=models.DateField(blank=True, null=True)),
        migrations.CreateModel(
            name='CardBill',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bill_date', models.DateField()),
                ('due_date', models.DateField()),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('paid_on', models.DateField(blank=True, null=True)),
                ('note', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bills', to='sales.tradecard')),
                ('tenant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='tenant_card_bills', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'trade_card_bills', 'ordering': ['bill_date', 'id'], 'unique_together': {('card', 'bill_date')}},
        ),
    ]
