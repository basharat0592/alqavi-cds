from rest_framework import serializers
from .models import DeliveryPerson


class DeliveryPersonSerializer(serializers.ModelSerializer):
    area_name = serializers.ReadOnlyField(source='area.name')
    name = serializers.ReadOnlyField()
    active_deliveries = serializers.SerializerMethodField()
    completed_deliveries = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryPerson
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'name', 'phone',
            'vehicle_type', 'vehicle_number', 'cnic', 'address', 'city',
            'area', 'area_name', 'avatar', 'status', 'is_active',
            'plain_password', 'created_at', 'updated_at',
            'active_deliveries', 'completed_deliveries',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_deliveries(self, obj):
        return obj.deliveries.exclude(status__in=['DELIVERED', 'CANCELLED', 'REJECTED']).count()

    def get_completed_deliveries(self, obj):
        return obj.deliveries.filter(status='DELIVERED').count()


class DeliveryPersonCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryPerson
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name', 'phone',
            'vehicle_type', 'vehicle_number', 'cnic', 'address', 'city',
            'area', 'avatar', 'status', 'is_active',
        ]
        extra_kwargs = {'password': {'write_only': True}}
