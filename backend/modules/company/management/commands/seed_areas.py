from django.core.management.base import BaseCommand

from modules.company.models import Area

# (name, code)
AREAS = [
    ('Gilgit', 'GIL'),
    ('Skardu', 'SKD'),
    ('Hunza', 'HUN'),
    ('Ghizer', 'GHZ'),
    ('Chilas', 'CHL'),
]


class Command(BaseCommand):
    help = 'Seed the default Gilgit-Baltistan areas (idempotent).'

    def handle(self, *args, **options):
        for name, code in AREAS:
            _, created = Area.objects.get_or_create(code=code, defaults={'name': name})
            self.stdout.write(('Created ' if created else 'Exists  ') + name)
        self.stdout.write(self.style.SUCCESS(f'Areas seeded ({Area.objects.count()} total).'))
