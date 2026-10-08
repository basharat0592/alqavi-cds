from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sales', '0042_trade_return_shelf_discount'),
    ]

    operations = [
        migrations.CreateModel(
            name='InvoiceProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('proprietor', models.CharField(default='Syed Sakhawat & Associates', max_length=150)),
                ('phones', models.CharField(default='03351240190, 03138692190', max_length=120)),
                ('easypaisa', models.CharField(blank=True, default='', max_length=40)),
                ('contact_no', models.CharField(blank=True, default='', max_length=40)),
                ('whatsapp', models.CharField(blank=True, default='', max_length=40)),
                ('tenant', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                                related_name='invoice_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'trade_invoice_profile'},
        ),
    ]
