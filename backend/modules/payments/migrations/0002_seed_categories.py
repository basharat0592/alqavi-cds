from django.db import migrations


DEFAULT_CATEGORIES = [
    ('Sales', 'inbound'),
    ('Purchase Payment', 'outbound'),
    ('Sale Return', 'outbound'),
    ('Purchase Return', 'inbound'),
    ('Salary', 'outbound'),
    ('Rent', 'outbound'),
    ('Utilities', 'outbound'),
    ('Other', 'both'),
]


def seed(apps, schema_editor):
    PaymentCategory = apps.get_model('payments', 'PaymentCategory')
    for name, ctype in DEFAULT_CATEGORIES:
        PaymentCategory.objects.get_or_create(name=name, defaults={'type': ctype})


def unseed(apps, schema_editor):
    PaymentCategory = apps.get_model('payments', 'PaymentCategory')
    PaymentCategory.objects.filter(name__in=[c[0] for c in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
