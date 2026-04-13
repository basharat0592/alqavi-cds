from django.db import models
from core.models import BaseModel


class Supplier(BaseModel):
    """Supplier model with minimal info"""
    name = models.CharField(max_length=255, help_text="Name of the supplier")
    company = models.CharField(max_length=255, blank=True, null=True, help_text="Name of the company")
    contact = models.CharField(max_length=255, blank=True, null=True, help_text="Contact information (phone/email)")
    address = models.TextField(blank=True, null=True, help_text="Physical address of the supplier")

    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'

    def __str__(self):
        return f"{self.company or 'No Company'} - {self.name}"
