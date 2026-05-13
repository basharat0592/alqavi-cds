from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'postal_code',
            'status', 'is_active', 'created_at', 'updated_at', 'plain_password', 'avatar'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'postal_code',
            'status', 'is_active', 'avatar'
        ]
        extra_kwargs = {'password': {'write_only': True}}
