from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import BaseModel


class Supplier(BaseModel):
    """Standalone Supplier model with full auth and profile info"""
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    password = models.CharField(max_length=128, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    
    name = models.CharField(max_length=255, help_text="Business Name")
    company = models.CharField(max_length=255, blank=True, null=True, help_text="Company Legal Name")
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=255, blank=True, null=True, help_text="Primary Phone")
    
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    status = models.CharField(max_length=20, default='active')
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    plain_password = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'

    def __str__(self):
        return f"{self.company or 'No Company'} - {self.name}"
