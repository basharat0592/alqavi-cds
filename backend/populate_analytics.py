import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.sales.models import Order, OrderItem
from modules.products.models import Product
from modules.users.models import User

def populate_orders():
    products = list(Product.objects.all())
    if not products:
        print("No products found to create orders.")
        return
    
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("No user found to assign orders.")
        return

    today = timezone.now()
    
    # Create orders for the last 30 days
    for i in range(30):
        date = today - timedelta(days=i)
        # Random daily order count: between 1 and 4
        num_daily_orders = random.randint(1, 4)
        
        for j in range(num_daily_orders):
            order_num = f"AQ-{random.randint(1000, 9999)}"
            total = 0
            
            # Create the order object first
            order = Order.objects.create(
                order_number=order_num,
                customer=user,
                status='delivered', # Delivered so it shows in analytics
                payment_status='completed', # Completed so it shows in revenue
                total_amount=0,
                created_at=date,
                updated_at=date
            )
            
            # Add random items
            num_items = random.randint(1, 3)
            for k in range(num_items):
                product = random.choice(products)
                qty = random.randint(2, 10)
                price = product.price or 1000
                subtotal = float(qty) * float(price)
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=qty,
                    price=price,
                    created_at=date,
                    updated_at=date
                )
                total += subtotal
            
            # Update total amount
            order.total_amount = total
            order.save()
            
            # Manually set the creation date as auto_now_add might override it
            Order.objects.filter(pk=order.pk).update(created_at=date, updated_at=date)
            OrderItem.objects.filter(order=order).update(created_at=date, updated_at=date)

    print(f"Successfully populated historical data for 30 days.")

if __name__ == "__main__":
    populate_orders()
