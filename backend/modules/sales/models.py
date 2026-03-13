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
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
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
        default='pending',
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

