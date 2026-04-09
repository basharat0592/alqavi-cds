"""Create SupplierProduct model."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0009_supplier'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupplierProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('supplier_sku', models.CharField(blank=True, max_length=128)),
                ('price', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('currency', models.CharField(default='PKR', max_length=10)),
                ('lead_time_days', models.IntegerField(blank=True, null=True)),
                ('min_order_qty', models.IntegerField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='supplier_options', to='products.product')),
                ('supplier', models.ForeignKey(on_delete=models.CASCADE, related_name='supplier_products', to='company.supplier')),
            ],
            options={
                'verbose_name': 'Supplier Product',
                'verbose_name_plural': 'Supplier Products',
            },
        ),
        migrations.AddIndex(
            model_name='supplierproduct',
            index=models.Index(fields=['supplier'], name='company_supp_li_7d9d2a_idx'),
        ),
        migrations.AddIndex(
            model_name='supplierproduct',
            index=models.Index(fields=['product'], name='company_supp_prd_7d9d2a_idx'),
        ),
    ]
