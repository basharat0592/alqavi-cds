from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from .models import Stock
from modules.products.models import Product

@receiver([post_save, post_delete], sender=Stock)
def sync_product_stock(sender, instance, **kwargs):
    """
    Whenever a Stock (batch) is updated or deleted, find all corresponding 
    Products and update their total_quantity by summing all matching stocks.
    """
    # Find all products that match this stock's identity
    # Identity is defined by Name, Weight, and Size (and optionally price if we follow ViewSet logic)
    # However, Product model already has a direct link to a 'stock' via ForeignKey, 
    # but the business logic suggests one Product listing can represent multiple batches.
    
    # To be safe and 'live', we find all products that might represent this stock.
    products = Product.objects.filter(
        product_name__iexact=instance.product_name,
        weight=instance.weight,
        size=instance.size
    )
    
    for product in products:
        # Sum all stocks that match this product's specs
        # Note: We match by cost_price too if the system treats different prices as different products
        total = Stock.objects.filter(
            product_name__iexact=product.product_name,
            price_per_item=product.cost_price,
            weight=product.weight,
            size=product.size
        ).aggregate(total=Sum('total_quantity'))['total'] or 0
        
        # Update the product's denormalized total_quantity field
        if product.total_quantity != total:
            Product.objects.filter(id=product.id).update(total_quantity=total)
