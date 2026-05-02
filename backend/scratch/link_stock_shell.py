from modules.inventory.models import Stock
from modules.products.models import SupplierProduct

linked_count = 0
for s in Stock.objects.filter(product__isnull=True):
    p = SupplierProduct.objects.filter(name=s.product_name, supplier=s.supplier).first()
    if p:
        s.product = p
        s.save()
        linked_count += 1
        print(f"Linked: {s.product_name}")
    else:
        print(f"FAILED to match: {s.product_name}")

print(f"\nTotal linked: {linked_count}")
