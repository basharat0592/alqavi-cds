from rest_framework import serializers
from .models import Warehouse, Stock
from modules.supplier.serializers import SupplierSerializer


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'location', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Stock
        fields = [
            'id', 'product_name', 'category', 'category_name', 
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name', 
            'purchase_type', 'cartons', 'items_per_carton', 'total_quantity', 
            'price_per_carton', 'price_per_item', 'date', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'supplier_name', 'warehouse_name', 'category_name']
