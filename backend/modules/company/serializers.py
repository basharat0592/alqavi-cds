"""
Company module serializers.
"""
from rest_framework import serializers
from .models import Company, CompanyCategory


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
            'address', 'city', 'country', 'website', 'logo',
            'description', 'facebook', 'instagram', 'twitter',
            'currency', 'tax_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
