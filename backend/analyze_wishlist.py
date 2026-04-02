import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modules.products.models import Wishlist, Product
from django.db.models import Count

print("Wishlist Statistics:")
print(f"Total Wishlist records: {Wishlist.objects.count()}")

# Top users by wishlist count
top_users = Wishlist.objects.values('user__username').annotate(item_count=Count('id')).order_by('-item_count')[:10]
print("\nTop Users by Item Count:")
for u in top_users:
    print(f"{u['user__username']}: {u['item_count']} items")

# Check if there are any products with issues
wishlist_per_prod = Wishlist.objects.values('product__name').annotate(user_count=Count('id')).order_by('-user_count')[:10]
print("\nTop Products by Wishlist Count:")
for p in wishlist_per_prod:
    print(f"{p['product__name']}: {p['user_count']} users")
