from django.core.management.base import BaseCommand

from modules.users.models import Role, Permission, RolePermission


# (module key, Permission.category, human label)
MODULES = [
    ('products', 'products', 'Products & categories'),
    ('inventory', 'inventory', 'Stock & warehouses'),
    ('purchases', 'orders', 'Purchases & procurement'),
    ('suppliers', 'users', 'Suppliers'),
    ('sales', 'orders', 'Sales, orders, POS & invoices'),
    ('customers', 'users', 'Customers'),
    ('payments', 'orders', 'Payments, income & expense'),
    ('reports', 'settings', 'Reports'),
    ('users', 'roles', 'Users, roles & permissions'),
    ('areas', 'settings', 'Areas / territories'),
    ('settings', 'settings', 'Website & system settings'),
]

# Modules each role may MANAGE (write). Reads aren't restricted by enforcement,
# but we also grant the matching view_ codes for completeness/future use.
ROLE_MANAGE = {
    'Operations Manager': ['products', 'inventory', 'purchases', 'suppliers', 'sales', 'customers', 'payments'],
    'Sales Manager': ['sales', 'customers'],
    'Inventory Manager': ['products', 'inventory', 'purchases', 'suppliers'],
    'Accountant': ['payments'],
    'Area Manager': ['sales', 'customers'],
    'Cashier': ['sales'],
}

# Extra view-only modules per role (no manage).
ROLE_VIEW_EXTRA = {
    'Operations Manager': ['reports'],
    'Sales Manager': ['products', 'payments', 'reports'],
    'Inventory Manager': ['reports'],
    'Accountant': ['sales', 'reports'],
    'Area Manager': ['products', 'inventory', 'reports'],
    'Cashier': ['products'],
}


class Command(BaseCommand):
    help = 'Seed module permissions and assign them to the standard roles (idempotent).'

    def handle(self, *args, **options):
        perm = {}
        for mod, cat, label in MODULES:
            for action, verb in (('view', 'View'), ('manage', 'Manage')):
                code = f'{action}_{mod}'
                obj, _ = Permission.objects.get_or_create(
                    code=code, defaults={'name': f'{verb} {label}', 'category': cat}
                )
                perm[code] = obj
        self.stdout.write(f'{len(perm)} permissions ensured.')

        for role_name, manage_mods in ROLE_MANAGE.items():
            role = Role.objects.filter(name=role_name).first()
            if not role:
                self.stdout.write(f'  (skip) role not found: {role_name}')
                continue
            codes = set()
            for m in manage_mods:
                codes.add(f'manage_{m}')
                codes.add(f'view_{m}')
            for m in ROLE_VIEW_EXTRA.get(role_name, []):
                codes.add(f'view_{m}')
            # Reset this role's permission set to the seeded list.
            RolePermission.objects.filter(role=role).delete()
            for c in sorted(codes):
                RolePermission.objects.get_or_create(role=role, permission=perm[c])
            self.stdout.write(f'  {role_name}: {len(codes)} permissions')

        self.stdout.write(self.style.SUCCESS('Permissions seeded.'))
