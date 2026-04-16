from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import BaseModel


class Supplier(BaseModel):
    """Standalone Supplier model with full auth and profile info"""
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    password = models.CharField(max_length=128, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    
    name = models.CharField(max_length=255, help_text="Name of the supplier")
    company = models.CharField(max_length=255, blank=True, null=True, help_text="Name of the company")
    contact_person = models.CharField(max_length=255, blank=True, null=True, help_text="Person to contact")
    contact = models.CharField(max_length=255, blank=True, null=True, help_text="Contact phone number")
    address = models.TextField(blank=True, null=True, help_text="Physical address of the supplier")
    
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
