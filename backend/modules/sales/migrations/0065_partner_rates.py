from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('sales', '0064_partner_kind')]
    operations = [migrations.AddField(model_name='partner', name='rates', field=models.JSONField(blank=True, default=list))]
