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
        ('REJECTED', 'Rejected'),
        ('CANCEL_REQUESTED', 'Cancel Requested'),
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
    customer = models.ForeignKey(
        'customer.Customer',
        on_delete=models.SET_NULL,
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
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_reserved = models.BooleanField(default=False)

    # WhatsApp Integration
    whatsapp_number = models.CharField(max_length=20, null=True, blank=True)
    whatsapp_sent = models.BooleanField(default=False)
    whatsapp_status = models.CharField(max_length=20, default='PENDING', choices=[
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed')
    ])
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            # Generate a new unique numeric tracking ID
            try:
                # Find the maximum numeric ID currently in use
                tids = Order.objects.values_list('tracking_id', flat=True)
                numeric_ids = [int(tid) for tid in tids if str(tid).isdigit()]
                
                next_id = max(numeric_ids) + 1 if numeric_ids else 10001
                
                # Double-check for collisions (important for data integrity)
                while Order.objects.filter(tracking_id=str(next_id)).exists():
                    next_id += 1
                
                self.tracking_id = str(next_id)
            except Exception:
                # Absolute fallback: Timestamp + Randomness
                import time, random
                self.tracking_id = str(int(time.time()))[-7:] + str(random.randint(10, 99))
                
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

class CustomerBoughtProduct(models.Model):
    """Dedicated table for customer purchased products (Order Products) - Work in Real."""
    customer = models.ForeignKey('customer.Customer', on_delete=models.CASCADE, related_name='bought_items', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_bought_items', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Customer Bought Products"
        ordering = ['-purchased_at']

    def __str__(self):
        return f"{self.customer_name} bought {self.product.product_name}"

    @property
    def customer_name(self):
        return self.customer.name if self.customer else (self.user.username if self.user else "Unknown")


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
    payment_method = models.CharField(max_length=30, choices=[
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('ONLINE', 'Online Payment'),
        ('CHEQUE', 'Cheque'),
        ('CREDIT', 'Credit'),
    ], default='CASH')
    
    order_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    # Payment Details
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    payment_notes = models.TextField(null=True, blank=True)
    payment_slip = models.FileField(upload_to='payment_slips/', null=True, blank=True)
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    payment_confirmed = models.BooleanField(default=False)
    
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def remaining_amount(self):
        return self.total_amount - self.paid_amount

    def save(self, *args, **kwargs):
        if not self.purchase_number:
            last_po = PurchaseOrder.objects.order_by('-order_date').first()
            if last_po and last_po.purchase_number and last_po.purchase_number.isdigit():
                self.purchase_number = str(int(last_po.purchase_number) + 1)
            else:
                self.purchase_number = "50001"
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

    weight = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)

    @property
    def total_units(self):
        if self.packaging_type == 'CARTON':
            return self.quantity * self.items_per_carton
        return self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Deleted'}"


class PurchaseReturn(models.Model):
    STATUS_CHOICES = [
        ('WAITING_FOR_SUPPLIER', 'Waiting for Supplier Response'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    return_number = models.CharField(max_length=20, unique=True, db_index=True)
    supplier = models.ForeignKey('supplier.Supplier', on_delete=models.CASCADE, related_name='returns')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='WAITING_FOR_SUPPLIER')
    reason = models.TextField(null=True, blank=True)
    return_date = models.DateField()
    
    total_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.return_number:
            last = PurchaseReturn.objects.order_by('-created_at').first()
            if last and last.return_number and last.return_number.startswith('PR-'):
                try:
                    num = int(last.return_number.split('-')[1])
                    self.return_number = f"PR-{num + 1}"
                except:
                    self.return_number = f"PR-{random.randint(100000, 999999)}"
            else:
                self.return_number = f"PR-70001"
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'purchase_returns'
        ordering = ['-created_at']

    def __str__(self):
        return f"Return {self.return_number} - {self.status}"


class PurchaseReturnItem(models.Model):
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.SupplierProduct', on_delete=models.SET_NULL, null=True)
    
    quantity = models.PositiveIntegerField(default=1)
    refund_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Deleted'}"


class SaleReturn(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]

    return_number = models.CharField(max_length=20, unique=True, db_index=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='sale_returns')
    
    # Identify who is returning
    customer = models.ForeignKey('customer.Customer', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reason = models.TextField()
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.return_number:
            last = SaleReturn.objects.order_by('-created_at').first()
            if last and last.return_number and last.return_number.startswith('SR-'):
                try:
                    num = int(last.return_number.split('-')[1])
                    self.return_number = f"SR-{num + 1}"
                except:
                    self.return_number = f"SR-{random.randint(100000, 999999)}"
            else:
                self.return_number = f"SR-80001"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Return {self.return_number} - {self.order.tracking_id}"


class SaleReturnItem(models.Model):
    sale_return = models.ForeignKey(SaleReturn, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    # Snapshotted price at return time if needed
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.product_name}"
