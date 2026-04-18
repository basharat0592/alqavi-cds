import os
import sys
import django

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from modules.inventory.models import Stock
from modules.products.models import SupplierProduct

def link_stock():
    linked_count = 0
    for s in Stock.objects.filter(product__isnull=True):
        p = SupplierProduct.objects.filter(name=s.product_name, supplier=s.supplier).first()
        if p:
            s.product = p
            s.save()
            linked_count += 1
            print(f"Linked: {s.product_name}")
        else:
            print(f"FAILED to find match for: {s.product_name} (Supplier: {s.supplier.name})")
    
    print(f"\nSuccessfully linked {linked_count} stock records.")

if __name__ == "__main__":
    link_stock()
