from rest_framework import serializers

from .models import Area, Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'numbers', 'category', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class AreaSerializer(serializers.ModelSerializer):
    customer_count = serializers.SerializerMethodField()
    manager_count = serializers.SerializerMethodField()
    parent_name = serializers.ReadOnlyField(source='parent.name')

    class Meta:
        model = Area
        fields = [
            'id', 'name', 'code', 'description', 'parent', 'parent_name',
            'is_active', 'created_at', 'customer_count', 'manager_count',
            'tenant',
        ]
        read_only_fields = ['tenant']

    def get_customer_count(self, obj):
        return obj.customers.count()

    def get_manager_count(self, obj):
        return obj.managers.count()
