from django.db import models
from django.conf import settings
from core.models import BaseModel
from modules.supplier.models import Supplier


class Warehouse(BaseModel):
    """Warehouse location for stock storage.

    Doubles as the *branch* unit for multi-branch isolation: each city's shop
    maps to one (or more) warehouses, and admins are scoped to the warehouses
    they're assigned (see users.User.warehouses).
    """
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    # City / territory this warehouse belongs to (used to group branches).
    area = models.ForeignKey(
        'company.Area', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='warehouses'
    )
    is_active = models.BooleanField(default=True)

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
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='stocks', null=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stocks', null=True, blank=True)
    purchase_type = models.CharField(max_length=20, choices=PURCHASE_TYPE_CHOICES)
    
    # Quantitative fields
    cartons = models.IntegerField(null=True, blank=True)
    items_per_carton = models.IntegerField(null=True, blank=True)
    total_quantity = models.IntegerField()
    
    # Financial fields
    price_per_carton = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_per_item = models.DecimalField(max_digits=15, decimal_places=2)
    
    weight = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)

    date = models.DateField()
    # Staff member this stock is attributed to (the purchase creator who brought it
    # in, or whoever added it manually). Lets a branch admin see only their own stock.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_stocks'
    )

    class Meta:
        db_table = 'stocks'
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.product_name} ({self.total_quantity})"


class StockMovement(BaseModel):
    """Log of every stock change"""
    MOVEMENT_TYPES = [
        ('PURCHASE', 'Purchase'),
        ('TRANSFER_IN', 'Transfer In'),
        ('TRANSFER_OUT', 'Transfer Out'),
        ('SALE', 'Sale'),
        ('RETURN', 'Return'),
        ('ADJUSTMENT', 'Adjustment'),
    ]
    
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField() # Amount changed
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_out')
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_in')
    date = models.DateField()
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'stock_movements'
        verbose_name = 'Stock Movement'
        verbose_name_plural = 'Stock Movements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} - {self.stock.product_name} ({self.quantity})"
