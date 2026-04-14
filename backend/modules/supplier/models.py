from django.db import models
from core.models import BaseModel
from core.mixins import StatusMixin


class Supplier(BaseModel, StatusMixin):
    """Supplier model linked to User"""
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='supplier_profile', null=True, blank=True)
    name = models.CharField(max_length=255, help_text="Name of the supplier")
    company = models.CharField(max_length=255, blank=True, null=True, help_text="Name of the company")
    contact = models.CharField(max_length=255, blank=True, null=True, help_text="Contact information (phone/email)")
    email = models.EmailField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True, help_text="Physical address of the supplier")

    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'

    def __str__(self):
        return f"{self.company or 'No Company'} - {self.name}"
