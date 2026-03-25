from django.db import models
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin
from django.conf import settings

class Warehouse(BaseModel, StatusMixin, TimestampMixin):
    name = models.CharField(max_length=255)
    warehouse_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    warehouse_type = models.CharField(max_length=50, choices=(('Main', 'Main'), ('Regional', 'Regional'), ('Store', 'Store')), default='Main')
    location = models.CharField(max_length=500, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Warehouses'

    def __str__(self):
        return self.name

class Inventory(BaseModel, TimestampMixin):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='inventory_records')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='inventory_records')
    # Duplicate product fields removed to maintain single source of truth in Product model
    
    quantity_available = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_reserved = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_damaged = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_in_transit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    last_stock_update = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Inventory Records'
        # If we track by batch, unique might need to include batch_number
        unique_together = ('product', 'warehouse', 'batch_number')

    def save(self, *args, **kwargs):
        # Determine if we should create an alert
        # We only create alerts if reorder_level is set (> 0)
        should_alert = self.reorder_level > 0 and self.quantity_available <= self.reorder_level
        
        super().save(*args, **kwargs)
        
        if should_alert:
            LowStockAlert.objects.update_or_create(
                product=self.product,
                warehouse=self.warehouse,
                defaults={
                    'current_quantity': self.quantity_available,
                    'reorder_level': self.reorder_level,
                    'alert_status': 'Pending'
                }
            )
        else:
            # If stock is now above reorder level, we can auto-resolve pending alerts 
            # for this product/warehouse combination
            LowStockAlert.objects.filter(
                product=self.product, 
                warehouse=self.warehouse, 
                alert_status='Pending'
            ).update(alert_status='Resolved')

class InventoryMovement(BaseModel, TimestampMixin):
    MOVEMENT_TYPES = (
        ('Purchase', 'Purchase'),
        ('Sale', 'Sale'),
        ('Transfer In', 'Transfer In'),
        ('Transfer Out', 'Transfer Out'),
        ('Adjustment', 'Adjustment'),
        ('Return', 'Return'),
    )
    
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=50, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    previous_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

class Batch(BaseModel, TimestampMixin):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    batch_number = models.CharField(max_length=100)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=(('Active', 'Active'), ('Expired', 'Expired')), default='Active')

    class Meta:
        verbose_name_plural = 'Batches'

class StockAdjustment(BaseModel, TimestampMixin):
    ADJUSTMENT_TYPES = (('Add', 'Add'), ('Remove', 'Remove'))
    REASONS = (('Damaged', 'Damaged'), ('Lost', 'Lost'), ('Correction', 'Correction'))
    
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    adjustment_type = models.CharField(max_length=20, choices=ADJUSTMENT_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=50, choices=REASONS)
    notes = models.TextField(blank=True)
    adjusted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

class LowStockAlert(BaseModel, TimestampMixin):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    current_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2)
    alert_status = models.CharField(max_length=50, choices=(('Pending', 'Pending'), ('Resolved', 'Resolved')), default='Pending')
