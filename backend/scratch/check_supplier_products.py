import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import SupplierProduct

def check_supplier_products():
    prods = SupplierProduct.objects.all()
    print(f"Total Supplier Products: {prods.count()}")
    for p in prods[:10]:
        print(f"ID: {p.id} | Name: {p.name} | Status: {p.status} | Qty: {p.quantity} | Approved: {p.is_approved}")

if __name__ == "__main__":
    check_supplier_products()
