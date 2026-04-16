from rest_framework import serializers
from .models import Warehouse, Inventory, InventoryMovement, Batch, StockAdjustment, LowStockAlert, Stock

# Removed ProductSerializer import to prevent circular dependency since it's not used here

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'

class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    
    sku = serializers.ReadOnlyField(source='product.sku')
    barcode = serializers.ReadOnlyField(source='product.barcode')
    purchase_price = serializers.ReadOnlyField(source='product.cost')
    cost_price = serializers.ReadOnlyField(source='product.cost')
    selling_price = serializers.ReadOnlyField(source='product.price')
    
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

class StockSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')

    class Meta:
        model = Stock
        fields = '__all__'

    def validate(self, data):
        # We can leverage model's clean method for validation
        # Re-construct an instance to check validation natively
        instance = Stock(**data)
        instance.clean()
        return data
