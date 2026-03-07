"""
Products module serializers.
"""
from rest_framework import serializers
from .models import Product, Category
from modules.company.models import CompanyCategory


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'slug', 'image', 'status']
        read_only_fields = ['id', 'slug']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    company_category_name = serializers.CharField(source='company_category.name', read_only=True)
    is_in_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'company_category', 'company_category_name',
            'sku', 'price', 'cost', 'retail_price', 'quantity_in_stock', 'image',
            'status', 'is_in_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_in_stock(self, obj):
        return obj.is_in_stock()


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating products."""
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True
    )
    company_category = serializers.PrimaryKeyRelatedField(
        queryset=CompanyCategory.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'company_category', 'sku',
            'price', 'cost', 'retail_price', 'quantity_in_stock', 'image', 'status'
        ]
