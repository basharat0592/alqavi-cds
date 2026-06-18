from django.db import models
from django.conf import settings
from django.utils import timezone


class PaymentCategory(models.Model):
    """Buckets used to group payments (e.g. Sales, Rent, Salary)."""
    TYPE_CHOICES = [
        ('inbound', 'Income'),
        ('outbound', 'Expense'),
        ('both', 'Both'),
    ]

    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='both')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_categories'
        ordering = ['name']
        verbose_name_plural = 'Payment Categories'

    def __str__(self):
        return self.name


class Payment(models.Model):
    """A single money-in / money-out entry in the business ledger.

    Entries are either created by hand (Add Payment form) or generated
    automatically from sales, purchase payments and returns. Auto entries
    carry a (source, source_type, source_id) marker so they stay unique and
    can be reversed when the underlying record is cancelled/deleted.
    """
    PAYMENT_TYPES = [
        ('inbound', 'Income'),
        ('outbound', 'Expense'),
    ]
    METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
        ('mobile_wallet', 'Digital Wallet'),
        ('other', 'Other'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('sale', 'Sale'),
        ('purchase', 'Purchase Payment'),
        ('sale_return', 'Sale Return'),
        ('purchase_return', 'Purchase Return'),
    ]

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPES, default='inbound')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    category = models.ForeignKey(
        PaymentCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )
    reference_number = models.CharField(max_length=100, blank=True, default='')
    payer_payee = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    date = models.DateField(default=timezone.now)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )

    # Audit / auto-generation tracking
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    source_type = models.CharField(max_length=30, blank=True, default='')   # e.g. 'order', 'purchaseorder'
    source_id = models.CharField(max_length=64, blank=True, default='')     # supports UUID and int PKs
    is_auto = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-date', '-created_at']
        # Auto entries are kept unique per business record at the app layer via
        # services.update_or_create(source, source_type, source_id). A DB-level
        # partial unique constraint isn't used because MariaDB can't enforce one.
        indexes = [
            models.Index(fields=['source', 'source_type', 'source_id'], name='payments_source_idx'),
        ]

    def __str__(self):
        sign = '+' if self.payment_type == 'inbound' else '-'
        return f"{sign}{self.amount} ({self.get_source_display()})"
