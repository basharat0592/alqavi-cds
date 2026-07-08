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
            'avatar',
            'status',
            'is_active',
            'created_at',
            'updated_at',
            'first_name',
            'last_name',
            'password',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        # Never serialize credentials back out. `password` is write-only (hashed on
        # save); `plain_password` is not exposed at all through this serializer.
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def create(self, validated_data):
        """Hash password and sync with plain_password during creation."""
        from django.contrib.auth.hashers import make_password
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
            validated_data['plain_password'] = password
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Hash password and sync with plain_password during update."""
        from django.contrib.auth.hashers import make_password
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
            validated_data['plain_password'] = password
        return super().update(instance, validated_data)
