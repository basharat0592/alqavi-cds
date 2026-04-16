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
    PAYMENT_CHOICES = [
        ('COD', 'COD'),
        ('ONLINE', 'Online'),
        ('SHOP', 'Shop'),
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
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='COD')
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


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    ]

    purchase_number = models.CharField(max_length=20, unique=True)
    supplier = models.ForeignKey('supplier.Supplier', on_delete=models.CASCADE, related_name='purchase_orders')
    reference_number = models.CharField(max_length=50, null=True, blank=True)
    
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.SET_NULL, null=True, blank=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_inventory_synced = models.BooleanField(default=False)
    payment_status = models.CharField(max_length=20, choices=[
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Paid'),
    ], default='UNPAID')
    
    order_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.purchase_number:
            suffix = ''.join(random.choices(string.digits, k=6))
            self.purchase_number = f"PO-{suffix}"
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-order_date']

    def __str__(self):
        return f"PO {self.purchase_number} - {self.supplier.username}"


class PurchaseOrderItem(models.Model):
    PACKAGING_CHOICES = [
        ('SINGLE', 'Single Units'),
        ('CARTON', 'Carton Pack'),
    ]

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.SupplierProduct', on_delete=models.SET_NULL, null=True)
    
    packaging_type = models.CharField(max_length=10, choices=PACKAGING_CHOICES, default='SINGLE')
    items_per_carton = models.PositiveIntegerField(default=1) # If carton, how many pieces inside?
    
    quantity = models.PositiveIntegerField(default=1) # Number of cartons or items
    price = models.DecimalField(max_digits=10, decimal_places=2) # Cost Price (from supplier)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Planned Sale Price for distributor

    @property
    def total_units(self):
        if self.packaging_type == 'CARTON':
            return self.quantity * self.items_per_carton
        return self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Deleted'}"
