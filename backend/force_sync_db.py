import os
import django
from django.db import connection
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def force_sync():
    migrations_to_fake = [
        ('supplier', '0001_initial'),
        ('supplier', '0002_alter_supplier_address_alter_supplier_company_and_more'),
        ('inventory', '0002_stock_category'),
        ('products', '0002_category_product_category'),
        ('products', '0003_alter_product_options_alter_wishlist_options_and_more'),
        ('products', '0004_product_batch'),
        ('products', '0005_maincategory_alter_product_badge_alter_product_batch_and_more'),
        ('sales', '0002_orderitem_cost_price'),
        ('sales', '0003_order_payment_method'),
        ('sales', '0004_purchaseorder_purchaseorderitem'),
    ]

    with connection.cursor() as cursor:
        print("--- Force Syncing Database Migrations ---")
        for app, name in migrations_to_fake:
            cursor.execute("SELECT id FROM django_migrations WHERE app = %s AND name = %s", [app, name])
            if cursor.fetchone():
                print(f"[SKIP] {app}.{name} already marked.")
                continue
            
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                [app, name, datetime.now()]
            )
            print(f"[SYNC] {app}.{name} marked as applied.")
        print("--- Sync Complete ---")

if __name__ == "__main__":
    force_sync()
