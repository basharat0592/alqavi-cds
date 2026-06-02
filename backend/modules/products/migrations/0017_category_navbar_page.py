# Generated migration for Category navbar_page field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0016_product_reserved_quantity'),
        ('cms', '0007_navbarpage_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='navbar_page',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='categories', to='cms.navbarpage'),
        ),
    ]
