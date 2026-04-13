import uuid
import random
import string
from django.db import models
from django.conf import settings
from modules.products.models import Product

class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='orders', 
        null=True, 
        blank=True
    )
    tracking_id = models.CharField(max_length=20, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Shipping info
    shipping_address = models.TextField()
    phone_number = models.CharField(max_length=20)
    customer_name = models.CharField(max_length=100)
    notes = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            # Simple tracking ID generation e.g. ALQ-123456
            suffix = ''.join(random.choices(string.digits, k=6))
            self.tracking_id = f"ALQ-{suffix}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.tracking_id} - {self.customer_name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)      # Snapshotted selling price
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Snapshotted purchase cost

    @property
    def profit(self):
        return (self.price - self.cost_price) * self.quantity

    def __str__(self):
        product_name = self.product.product_name if self.product else "Deleted Product"
        return f"{self.quantity} x {product_name}"
