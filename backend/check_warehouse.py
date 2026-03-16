from modules.inventory.models import Warehouse, Batch
from modules.products.models import Product

def check():
    count = Warehouse.objects.count()
    print(f"Total Warehouses: {count}")
    if count == 0:
        w = Warehouse.objects.create(name="Central Warehouse", is_default=True)
        print(f"Created default warehouse: {w.id}")
    else:
        dw = Warehouse.objects.filter(is_default=True).first()
        if not dw:
            w = Warehouse.objects.first()
            if w:
                w.is_default = True
                w.save()
                print(f"Set {w.name} as default")

if __name__ == "__main__":
    check()
