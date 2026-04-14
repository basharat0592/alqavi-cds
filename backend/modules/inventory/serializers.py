from rest_framework import serializers
from .models import Warehouse, Stock


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'location', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')

    def get_supplier_name(self, obj):
        return f"{obj.supplier.first_name} {obj.supplier.last_name}"

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
