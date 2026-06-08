from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_sync_drifted_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='page_permissions',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
