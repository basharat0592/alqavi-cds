"""
Company module serializers.
"""
from rest_framework import serializers
from .models import Company, CompanyCategory, Supplier
from .models import SupplierProduct


class CompanyCategorySerializer(serializers.ModelSerializer):
    """Serializer for CompanyCategory model."""
    class Meta:
        model = CompanyCategory
        fields = ['id', 'name', 'code', 'type', 'country', 'description', 'color', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'category', 'category_name', 'tagline', 'email', 'phone', 'whatsapp',
            'address', 'city', 'country', 'website', 'logo', 'is_active',
            'description', 'facebook', 'instagram', 'twitter',
            'currency', 'tax_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for Supplier model."""
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contact_person', 'email', 'phone', 'whatsapp',
            'address', 'city', 'country', 'tax_number', 'is_active',
            'notes', 'product_count', 'product_list', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    product_count = serializers.IntegerField(read_only=True)
    product_list = serializers.SerializerMethodField()

    def get_product_list(self, obj):
        return [p.name for p in obj.products.all()[:5]] # Show first 5 names


class SupplierProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = SupplierProduct
        fields = [
            'id', 'supplier', 'supplier_name', 'product', 'product_name', 'supplier_sku',
            'price', 'currency', 'lead_time_days', 'min_order_qty', 'notes', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
