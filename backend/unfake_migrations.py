import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def unapply_migrations():
    to_remove = [
        ('supplier', '0001_initial'),
        ('supplier', '0002_alter_supplier_address_alter_supplier_company_and_more'),
        ('sales', '0004_purchaseorder_purchaseorderitem'),
        ('products', '0005_maincategory_alter_product_badge_alter_product_batch_and_more'),
    ]

    with connection.cursor() as cursor:
        print("--- Un-faking Migrations ---")
        for app, name in to_remove:
            cursor.execute("DELETE FROM django_migrations WHERE app = %s AND name = %s", [app, name])
            print(f"[REMOVED] {app}.{name}")
        print("--- Done ---")

if __name__ == "__main__":
    unapply_migrations()
