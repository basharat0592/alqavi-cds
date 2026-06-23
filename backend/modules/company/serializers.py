from rest_framework import serializers

from .models import Area


class AreaSerializer(serializers.ModelSerializer):
    customer_count = serializers.SerializerMethodField()
    manager_count = serializers.SerializerMethodField()
    parent_name = serializers.ReadOnlyField(source='parent.name')

    class Meta:
        model = Area
        fields = [
            'id', 'name', 'code', 'description', 'parent', 'parent_name',
            'is_active', 'created_at', 'customer_count', 'manager_count',
        ]

    def get_customer_count(self, obj):
        return obj.customers.count()

    def get_manager_count(self, obj):
        return obj.managers.count()
