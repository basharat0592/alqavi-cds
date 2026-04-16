from django.contrib import admin
from .models import Warehouse, Inventory, InventoryMovement, Batch, StockAdjustment, LowStockAlert

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'warehouse_code', 'warehouse_type', 'location', 'status', 'is_default')
    search_fields = ('name', 'warehouse_code')
    list_filter = ('warehouse_type', 'status', 'is_default')

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'warehouse', 'batch_number', 'quantity_available', 'quantity_reserved', 'expiry_date')
    search_fields = ('product__name', 'sku', 'barcode', 'batch_number')
    list_filter = ('warehouse', 'expiry_date')

@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ('product', 'warehouse', 'movement_type', 'quantity', 'created_at')
    list_filter = ('movement_type', 'warehouse')
    date_hierarchy = 'created_at'

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'product', 'warehouse', 'quantity', 'expiry_date', 'status')
    list_filter = ('status', 'warehouse')
    search_fields = ('batch_number', 'product__name')

@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('product', 'warehouse', 'adjustment_type', 'quantity', 'reason', 'created_at')
    list_filter = ('adjustment_type', 'reason')

@admin.register(LowStockAlert)
class LowStockAlertAdmin(admin.ModelAdmin):
    list_display = ('product', 'warehouse', 'current_quantity', 'reorder_level', 'alert_status')
    list_filter = ('alert_status',)
