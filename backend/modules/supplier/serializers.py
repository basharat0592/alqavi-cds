from rest_framework import serializers
from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            'id',
            'username',
            'name',
            'company',
            'contact_person',
            'email',
            'phone',
            'address',
            'status',
            'is_active',
            'created_at',
            'updated_at',
            'plain_password',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
