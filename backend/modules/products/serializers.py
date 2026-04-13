from rest_framework import serializers
from .models import Product, Wishlist, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    profit_margin = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'stock', 'product_name', 'category', 'category_name',
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name', 
            'cost_price', 'total_quantity', 'image', 'description', 
            'selling_price', 'batch', 'badge', 'status', 'profit_margin', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'supplier_name', 'warehouse_name', 'category_name', 'profit_margin']

    def get_profit_margin(self, obj):
        if obj.selling_price and obj.cost_price and obj.selling_price > 0:
            margin = ((obj.selling_price - obj.cost_price) / obj.selling_price) * 100
            return float(margin)
        return 0.0


class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'product', 'product_details', 'created_at']
        read_only_fields = ['id', 'created_at', 'product_details']
