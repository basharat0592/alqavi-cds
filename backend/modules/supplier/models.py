from django.db import models
from core.models import BaseModel
from django.conf import settings


class Supplier(BaseModel):
    name = models.CharField(max_length=255, help_text='Name of the supplier')
    company = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Name of the company'
    )
    contact = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Contact information (phone/email)'
    )
    address = models.TextField(
        blank=True,
        null=True,
        help_text='Physical address of the supplier'
    )
    email = models.EmailField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text='Login email (Gmail) for supplier portal'
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_profile',
        help_text='Linked user account for supplier portal login'
    )

    class Meta:
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'
        db_table = 'suppliers'

    def __str__(self):
        return self.name

class PurchaseOrder(BaseModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled')
    ]
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    admin_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_pos')
    tracking_id = models.CharField(max_length=50, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PO {self.tracking_id} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            import random
            import string
            suffix = ''.join(random.choices(string.digits, k=6))
            self.tracking_id = f"PO-{suffix}"
        super().save(*args, **kwargs)

class PurchaseOrderItem(BaseModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE) # String reference to avoid circular imports
    quantity = models.PositiveIntegerField(default=1)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2) # Purchase unit price

    def __str__(self):
        return f"{self.quantity}x in {self.purchase_order.tracking_id}"
