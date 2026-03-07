import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from modules.users.models import User
from modules.products.models import Product, Category
from modules.sales.models import Order, OrderItem

def create_fake_data():
    print("Deleting old mock data...")
    # Delete non-admin users
    User.objects.filter(is_superuser=False).delete()
    Order.objects.all().delete()
    
    Category.objects.all().delete()
    cat = Category.objects.create(name="Skin Care", description="High end skin items")
    
    products = list(Product.objects.all())
    if not products:
        print("Creating mock products since none exist...")
        names = ["Hydra Boost Moisturizer", "Matte Finish Foundation", "Vitamin C Serum", "Glow Toner", "SPF 50 Sunscreen"]
        for p in names:
            prod = Product.objects.create(
                category=cat,
                name=p,
                sku=f"SKU-{p.replace(' ', '-').upper()}",
                price=round(random.uniform(15.0, 75.0), 2),
                quantity_in_stock=100,
                status='active'
            )
            products.append(prod)

    print("Creating mock customers...")
    names = [
        ("Sarah", "Ahmed", "sarah@example.com", "03001234567"),
        ("Ali", "Khan", "ali@example.com", "03111234567"),
        ("Fatima", "Zahra", "fatima@example.com", "03221234567"),
        ("Usman", "Tariq", "usman@example.com", "03331234567"),
        ("Ayesha", "Malik", "ayesha@example.com", "03441234567"),
        ("Bilal", "Saeed", "bilal@example.com", "03551234567")
    ]
    
    customers = []
    for first, last, email, phone in names:
        user = User.objects.create_user(
            email=email,
            password='password123',
            first_name=first,
            last_name=last,
            role='customer',
            phone=phone
        )
        # Give them some join dates over the last 30 days
        user.date_joined = timezone.now() - timedelta(days=random.randint(1, 28))
        user.save()
        customers.append(user)
        
    print(f"Created {len(customers)} customers.")

    print("Creating mock orders for the last 30 days...")
    statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    payment_statuses = ['pending', 'completed']
    
    now = timezone.now()
    
    order_count = 0
    # Create 35 orders
    for i in range(35):
        # Pick random customer
        customer = random.choice(customers)
        
        # Determine how many days ago (lean more towards recent)
        days_ago = int(random.triangular(0, 29, 5))
        order_date = now - timedelta(days=days_ago, hours=random.randint(1, 23))
        
        status = random.choice(statuses) if days_ago < 7 else 'delivered'
        if status == 'cancelled':
            payment_status = 'failed'
        else:
            payment_status = 'completed' if status in ['shipped', 'delivered'] else random.choice(payment_statuses)
            
        order = Order.objects.create(
            customer=customer,
            order_number=f"ORD-2026{str(i+300).zfill(4)}",
            status=status,
            payment_status=payment_status,
        )
        # Override created_at which is auto_now_add
        Order.objects.filter(id=order.id).update(created_at=order_date)
        
        # Add 1-4 random items
        num_items = random.randint(1, 4)
        order_items = random.sample(products, num_items)
        
        total = 0
        for prod in order_items:
            qty = random.randint(1, 3)
            price = prod.price
            subtotal = qty * price
            
            OrderItem.objects.create(
                order=order,
                product=prod,
                quantity=qty,
                price=price
            )
            total += subtotal
            
        Order.objects.filter(id=order.id).update(total_amount=total)
        order_count += 1
        
    print(f"Created {order_count} realistic orders spanning the last 30 days.")
    print("Dashboard will now show real active data!")

if __name__ == "__main__":
    create_fake_data()
