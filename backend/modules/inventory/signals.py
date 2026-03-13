from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from .models import Inventory
from modules.products.models import Product

@receiver(post_save, sender=Inventory)
@receiver(post_delete, sender=Inventory)
def update_product_stock(sender, instance, **kwargs):
    """
    Update the associated Product's quantity_in_stock field 
    whenever an Inventory record is saved or deleted.
    """
    product = instance.product
    # Sum up all available quantity for this product across all warehouses/batches
    total_stock = Inventory.objects.filter(product=product).aggregate(
        total=Sum('quantity_available')
    )['total'] or 0
    
    # Update the product's quantity_in_stock field
    product.quantity_in_stock = total_stock
    product.save(update_fields=['quantity_in_stock'])
