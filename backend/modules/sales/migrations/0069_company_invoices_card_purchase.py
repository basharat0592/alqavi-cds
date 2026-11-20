from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0007_area_restore_sub_areas'),
        ('sales', '0068_card_voucher_dates'),
    ]

    operations = [
        migrations.AddField(
            model_name='voucher',
            name='company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vouchers', to='company.company'),
        ),
        migrations.AddField(
            model_name='order',
            name='company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sale_orders', to='company.company'),
        ),
        migrations.AddField(
            model_name='order',
            name='bill_ref',
            field=models.CharField(blank=True, db_index=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='seller_name',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='order',
            name='buyer_name',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='purchase_orders', to='company.company'),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='bill_ref',
            field=models.CharField(blank=True, db_index=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='seller_name',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='buyer_name',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='card_acc',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='card_purchases', to='company.ledgeraccount'),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='card_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='card_tax_pct',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='purchaseorder',
            name='card_tax',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
