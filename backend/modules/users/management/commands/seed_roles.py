from django.core.management.base import BaseCommand

from modules.users.models import Role


# (name, description, is_default)
ROLES = [
    ('Super Admin', 'Full access to everything.', True),
    ('Admin', 'Full administrative access.', True),
    ('Operations Manager', 'Manages day-to-day operations across sales, inventory and procurement.', False),
    ('Sales Manager', 'Manages sales, orders, POS, invoices and customers.', False),
    ('Inventory Manager', 'Manages products, stock, warehouses and purchasing.', False),
    ('Accountant', 'Manages payments, invoices and accounting reports.', False),
    ('Area Manager', 'Manages sales, customers and reports for assigned area(s) only.', False),
    ('Cashier', 'Point-of-sale operator: create sales and view invoices.', False),
]


class Command(BaseCommand):
    help = 'Seed the standard staff roles (idempotent).'

    def handle(self, *args, **options):
        for name, desc, is_default in ROLES:
            obj, created = Role.objects.get_or_create(
                name=name,
                defaults={'description': desc, 'is_default': is_default},
            )
            if not created and not obj.description:
                obj.description = desc
                obj.save(update_fields=['description'])
            self.stdout.write(('Created ' if created else 'Exists  ') + name)
        self.stdout.write(self.style.SUCCESS('Roles seeded.'))
