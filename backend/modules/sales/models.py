"""
Sales module models - Order management for dashboard.
"""
from django.db import models
from django.conf import settings
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin
from modules.products.models import Product





class Order(BaseModel, TimestampMixin):
    """
    Order model for tracking customer purchases.
    
    Attributes:
        customer: Reference to customer
        order_number: Unique order identifier
        items: Order line items
        total_amount: Total order value
        status: Order status (pending, processing, shipped, delivered, cancelled)
        payment_status: Payment status
        notes: Order notes
        guest_name: Name of the customer if not registered
    """
    STATUS_CHOICES = [
        ('ordered', 'Ordered'),
        ('confirmed', 'Confirmed'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancel_requested', 'Cancellation Requested'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        null=True,
        blank=True
    )
    order_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ordered',
        db_index=True
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending'
    )
    notes = models.TextField(blank=True)
    guest_name = models.CharField(max_length=255, null=True, blank=True)
    
    # New fields for advanced order creation
    market = models.CharField(max_length=100, default='Pakistan')
    currency = models.CharField(max_length=10, default='PKR')
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tags = models.JSONField(default=list, blank=True)
    
    # Real-world business fields
    payment_method = models.CharField(max_length=50, default='Cash on Delivery')
    shipping_method = models.CharField(max_length=50, default='Standard Delivery')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['customer']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number}"
    
    def get_pending_amount(self):
        """Calculate pending payment amount."""
        if self.payment_status == 'pending':
            return self.total_amount
        return 0


class OrderItem(BaseModel):
    """
    Individual items in an order.
    
    Attributes:
        order: Reference to Order
        product: Reference to Product
        quantity: Number of units
        price: Price at time of purchase
        subtotal: quantity * price
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.order.order_number} - {self.product.name}"
    
    def get_subtotal(self):
        """Calculate subtotal for this item."""
        return self.quantity * self.price


# ─────────────────────────────────────────────────────────────────────────────
# PURCHASE ORDERS
# ─────────────────────────────────────────────────────────────────────────────

class PurchaseOrder(BaseModel, TimestampMixin):
    """Purchase order (buying stock from supplier)."""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ordered', 'Ordered'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('received', 'Received'),
        ('partially_received', 'Partially Received'),
        ('cancelled', 'Cancelled'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('online_payment', 'Online Payment'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
    ]

    purchase_number = models.CharField(max_length=100, unique=True, db_index=True)
    tracking_id = models.CharField(max_length=100, unique=True, null=True, blank=True, db_index=True)
    supplier = models.ForeignKey(
        'company.Supplier', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='purchase_orders',
        verbose_name='Assigned Supplier Profile'
    )
    supplier_name = models.CharField(max_length=255, blank=True)
    supplier_phone = models.CharField(max_length=50, blank=True)
    order_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='ordered', db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    transaction_reference = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.tracking_id and self.status != 'draft':
            import uuid
            # Generate a unique tracking ID: TRK + 8 random chars
            self.tracking_id = f"TRK-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.purchase_number


class PurchaseOrderItem(BaseModel):
    """Line item inside a purchase order."""
    PACKAGING_CHOICES = [
        ('piece', 'Piece'),
        ('pack', 'Pack'),
        ('carton', 'Carton'),
    ]

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    received_quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # New distributive logistics fields
    packaging_type = models.CharField(max_length=20, choices=PACKAGING_CHOICES, default='piece')
    pieces_per_unit = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.purchase_order.purchase_number} - {self.product.name}"


# ─────────────────────────────────────────────────────────────────────────────
# PURCHASE RETURNS
# ─────────────────────────────────────────────────────────────────────────────

class PurchaseReturn(BaseModel, TimestampMixin):
    """Return goods back to supplier."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    return_number = models.CharField(max_length=100, unique=True, db_index=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='returns'
    )
    supplier_name = models.CharField(max_length=255, blank=True)
    return_date = models.DateField()
    total_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_returns_created'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.return_number


class PurchaseReturnItem(BaseModel):
    """Line item inside a purchase return."""
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    refund_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.purchase_return.return_number} - {self.product.name}"
