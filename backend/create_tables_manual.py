import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def create_missing_tables():
    queries = [
        """
        CREATE TABLE IF NOT EXISTS suppliers (
            id CHAR(32) PRIMARY KEY,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            name VARCHAR(255) NOT NULL,
            company VARCHAR(255) NULL,
            contact VARCHAR(255) NULL,
            address TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS main_categories (
            id CHAR(32) PRIMARY KEY,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            name VARCHAR(255) NOT NULL UNIQUE,
            slug VARCHAR(255) NOT NULL UNIQUE,
            description TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id CHAR(32) PRIMARY KEY,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            po_number VARCHAR(20) NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL,
            supplier_id CHAR(32) NULL,
            warehouse_id CHAR(32) NULL,
            total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
            notes TEXT NULL,
            CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id CHAR(32) PRIMARY KEY,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            purchase_order_id CHAR(32) NOT NULL,
            product_id CHAR(32) NOT NULL,
            packaging_type VARCHAR(20) NOT NULL,
            quantity INTEGER NOT NULL,
            items_per_carton INTEGER NULL,
            cost_price DECIMAL(10, 2) NOT NULL,
            selling_price DECIMAL(10, 2) NOT NULL,
            total_price DECIMAL(15, 2) NOT NULL,
            CONSTRAINT fk_poi_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
            CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        # Add column to categories
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS main_category_id CHAR(32) NULL;",
        "ALTER TABLE categories ADD CONSTRAINT fk_cat_main FOREIGN KEY (main_category_id) REFERENCES main_categories(id);"
    ]

    with connection.cursor() as cursor:
        print("--- Creating Missing Tables Manually ---")
        for query in queries:
            try:
                cursor.execute(query)
                print(f"[OK] Executed: {query[:50]}...")
            except Exception as e:
                print(f"[ERROR] {e}")
        print("--- Done ---")

if __name__ == "__main__":
    create_missing_tables()
