import os
import sys
import django
from datetime import date

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.supplier.models import Supplier
from modules.products.models import MainCategory, Category, Product, SupplierProduct
from modules.inventory.models import Warehouse, Stock

print("=== Seeding Products, Categories, Suppliers, Warehouses, and Stocks ===")

# 1. Create Supplier
supplier, _ = Supplier.objects.get_or_create(
    username="supplier1",
    defaults={
        "email": "supplier@alqavihub.com",
        "name": "L'Oreal Beauty Supply",
        "company": "L'Oreal Pakistan",
        "contact_person": "Ali Khan",
        "phone": "+923001234567",
        "address": "Gulberg III, Lahore",
        "city": "Lahore",
        "country": "Pakistan",
        "status": "active"
    }
)
print("✅ Supplier created/fetched")

# 2. Create Warehouses
warehouse_lhr, _ = Warehouse.objects.get_or_create(
    name="Lahore Main Warehouse",
    defaults={"location": "Ferozepur Road, Lahore"}
)
warehouse_gilgit, _ = Warehouse.objects.get_or_create(
    name="Gilgit Warehouse",
    defaults={"location": "Riverview Road, Gilgit"}
)
print("✅ Warehouses created/fetched")

# 3. Create MainCategories & Categories
main_skincare, _ = MainCategory.objects.get_or_create(
    name="Skin Care",
    defaults={"description": "Premium skincare serums, moisturizers, and creams"}
)
main_makeup, _ = MainCategory.objects.get_or_create(
    name="Makeup",
    defaults={"description": "High-fidelity makeup, lipsticks, and palettes"}
)

cat_serums, _ = Category.objects.get_or_create(
    name="Serums",
    defaults={"main_category": main_skincare, "description": "Hydrating and glowing face serums"}
)
cat_lipsticks, _ = Category.objects.get_or_create(
    name="Lipsticks",
    defaults={"main_category": main_makeup, "description": "Matte and gloss lipsticks"}
)
print("✅ Categories created/fetched")

# 4. Products Data to seed
products_data = [
    {
        "name": "Hyaluronic Acid Serum",
        "category": cat_serums,
        "sku": "SKU-HA-SERUM-01",
        "barcode": "BARCODE-HA-SERUM-01",
        "price": 2500,
        "cost_price": 1800,
        "weight": "30ml",
        "size": "Regular",
        "description": "Deeply hydrates the skin, leaving a glowing, radiant finish.",
        "badge": "Best Seller",
        "warehouse": warehouse_lhr,
        "qty": 150
    },
    {
        "name": "Vitamin C Glow Serum",
        "category": cat_serums,
        "sku": "SKU-VITC-SERUM-02",
        "barcode": "BARCODE-VITC-SERUM-02",
        "price": 2800,
        "cost_price": 2000,
        "weight": "30ml",
        "size": "Regular",
        "description": "Brightens complexion and reduces dark spots for an even skin tone.",
        "badge": "Trending",
        "warehouse": warehouse_gilgit,
        "qty": 80
    },
    {
        "name": "Matte Velvet Lipstick",
        "category": cat_lipsticks,
        "sku": "SKU-MATTE-LIP-03",
        "barcode": "BARCODE-MATTE-LIP-03",
        "price": 1800,
        "cost_price": 1200,
        "weight": "4g",
        "size": "Regular",
        "description": "Long-lasting matte finish lipstick with high color payoff.",
        "badge": "New Arrival",
        "warehouse": warehouse_lhr,
        "qty": 200
    }
]

for p_info in products_data:
    # A. Create SupplierProduct
    sp, sp_created = SupplierProduct.objects.get_or_create(
        sku=p_info["sku"],
        defaults={
            "name": p_info["name"],
            "barcode": p_info["barcode"],
            "supplier": supplier,
            "category": p_info["category"],
            "description": p_info["description"],
            "price": p_info["price"],
            "cost_price": p_info["cost_price"],
            "retail_price": p_info["price"],
            "quantity": p_info["qty"],
            "weight": p_info["weight"],
            "size": p_info["size"],
            "is_approved": True,
            "status": "ACTIVE"
        }
    )
    if sp_created:
        print(f"Created SupplierProduct: {sp.name}")

    # B. Create Stock Record
    stock, stock_created = Stock.objects.get_or_create(
        product_name=p_info["name"],
        supplier=supplier,
        warehouse=p_info["warehouse"],
        price_per_item=p_info["cost_price"],
        weight=p_info["weight"],
        size=p_info["size"],
        defaults={
            "product": sp,
            "category": p_info["category"],
            "purchase_type": "single",
            "total_quantity": p_info["qty"],
            "date": date.today()
        }
    )
    if stock_created:
        print(f"Created Stock: {stock.product_name} in {p_info['warehouse'].name}")

    # C. Create Main Customer Product
    product, prod_created = Product.objects.get_or_create(
        sku=p_info["sku"],
        defaults={
            "stock": stock,
            "product_name": p_info["name"],
            "category": p_info["category"],
            "supplier": supplier,
            "warehouse": p_info["warehouse"],
            "cost_price": p_info["cost_price"],
            "total_quantity": p_info["qty"],
            "description": p_info["description"],
            "selling_price": p_info["price"],
            "barcode": p_info["barcode"],
            "badge": p_info["badge"],
            "weight": p_info["weight"],
            "size": p_info["size"],
            "status": "ACTIVE"
        }
    )
    if prod_created:
        print(f"Created Customer Product: {product.product_name}")

# Add products to MainCategory sections
main_skincare.products.set(Product.objects.filter(category=cat_serums))
main_makeup.products.set(Product.objects.filter(category=cat_lipsticks))
print("✅ Associated products with MainCategory sections")

print("=== Product seeding complete successfully! ===")
