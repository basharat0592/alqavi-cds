from rest_framework import serializers
from .models import Warehouse, Inventory, InventoryMovement, Batch, StockAdjustment, LowStockAlert
from modules.products.serializers import ProductSerializer

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    
    class Meta:
        model = Inventory
        fields = '__all__'

class InventoryMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    user_name = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = InventoryMovement
        fields = '__all__'

class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    
    class Meta:
        model = Batch
        fields = '__all__'

class StockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    user_name = serializers.ReadOnlyField(source='adjusted_by.username')
    
    class Meta:
        model = StockAdjustment
        fields = '__all__'

class LowStockAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    
    class Meta:
        model = LowStockAlert
        fields = '__all__'
