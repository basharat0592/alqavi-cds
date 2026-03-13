from django.db import models
from django.conf import settings
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin


class PaymentCategory(BaseModel, StatusMixin, TimestampMixin):
    """
    Categories for payments (e.g. Sales, Refund, Loan, Salary).
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Payment Categories'
    
    def __str__(self):
        return self.name


class Payment(BaseModel, TimestampMixin):
    """
    General payment model for tracking all financial inflows/outflows.
    """
    PAYMENT_TYPE_CHOICES = [
        ('inbound', 'Inbound (Receivable)'),
        ('outbound', 'Outbound (Payable)'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
        ('mobile_wallet', 'Mobile Wallet (JazzCash/EasyPaisa)'),
        ('other', 'Other'),
    ]
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='cash')
    category = models.ForeignKey(PaymentCategory, on_delete=models.SET_NULL, null=True, related_name='payments')
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    payer_payee = models.CharField(max_length=255, blank=True) # Name of customer or supplier
    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)
    
    # Internal references
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.payment_type.upper()} - {self.amount} ({self.date})"


