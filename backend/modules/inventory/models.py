from django.db import models
from core.models import BaseModel
from modules.supplier.models import Supplier


class Warehouse(BaseModel):
    """Warehouse location for stock storage"""
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)

    class Meta:
        db_table = 'warehouses'
        verbose_name = 'Warehouse'
        verbose_name_plural = 'Warehouses'

    def __str__(self):
        return self.name


class Stock(BaseModel):
    """Stock entry record"""
    PURCHASE_TYPE_CHOICES = [
        ('carton', 'Carton'),
        ('single', 'Single'),
    ]

    product_name = models.CharField(max_length=255)
    product = models.ForeignKey('products.SupplierProduct', on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    category = models.ForeignKey('products.Category', on_delete=models.CASCADE, related_name='stocks', null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='stocks')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stocks')
    purchase_type = models.CharField(max_length=20, choices=PURCHASE_TYPE_CHOICES)
    
    # Quantitative fields
    cartons = models.IntegerField(null=True, blank=True)
    items_per_carton = models.IntegerField(null=True, blank=True)
    total_quantity = models.IntegerField()
    
    # Financial fields
    price_per_carton = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_per_item = models.DecimalField(max_digits=15, decimal_places=2)
    
    date = models.DateField()

    class Meta:
        db_table = 'stocks'
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.product_name} ({self.total_quantity})"
