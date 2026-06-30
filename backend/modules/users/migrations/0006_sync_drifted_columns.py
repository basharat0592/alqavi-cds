from django.db import migrations


def add_missing_columns(apps, schema_editor):
    """Idempotently add columns that exist in the model state but are missing
    from the real database table.

    This repairs schema drift on environments (e.g. production) where these
    fields were added to the already-applied ``0001_initial`` migration, so a
    normal ``migrate`` reports nothing to do yet the columns never got created.
    On environments that already have the columns (local/fresh installs) this
    is a no-op.
    """
    connection = schema_editor.connection

    def existing_columns(table_name):
        with connection.cursor() as cursor:
            return {
                col.name
                for col in connection.introspection.get_table_description(cursor, table_name)
            }

    targets = [
        ('UserSettings', [
            'notif_new_order', 'notif_low_stock', 'notif_new_user',
            'notif_weekly_report', 'notif_marketing', 'notif_sms',
            'theme', 'accent_color', 'compact_mode', 'animations',
            'sidebar_collapsed',
        ]),
        ('Role', ['is_default']),
    ]

    for model_name, field_names in targets:
        model = apps.get_model('users', model_name)
        table = model._meta.db_table
        present = existing_columns(table)
        for field_name in field_names:
            if field_name not in present:
                field = model._meta.get_field(field_name)
                schema_editor.add_field(model, field)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_useractivitylog_is_read'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
    ]
