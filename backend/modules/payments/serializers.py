from rest_framework import serializers
from .models import Payment, PaymentCategory


class PaymentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCategory
        fields = ['id', 'name', 'type', 'created_at']
        read_only_fields = ['created_at']


class PaymentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_type', 'method', 'category', 'category_name',
            'reference_number', 'payer_payee', 'description', 'date',
            'user', 'user_name', 'source', 'is_auto', 'created_at',
        ]
        read_only_fields = ['user', 'source', 'is_auto', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System' if obj.is_auto else 'Admin'
