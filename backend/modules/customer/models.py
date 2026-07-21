from django.db import models
from django.conf import settings

class Customer(models.Model):
    """Standalone Customer model for strict data isolation."""
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    # Geographic area this customer belongs to (used for Area Manager scoping).
    area = models.ForeignKey(
        'company.Area', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers'
    )
    avatar = models.ImageField(upload_to='customers/avatars/', null=True, blank=True)

    # Admin who created this customer — drives per-admin data isolation. Null for
    # self-registered (storefront) customers.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_customers'
    )
    # Owning Admin (tenant) — per-Admin customer database. NULL for self-registered
    # (storefront) customers, which stay public/unscoped.
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_customers'
    )

    status = models.CharField(max_length=20, default='active')
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    plain_password = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
