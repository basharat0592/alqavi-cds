from rest_framework import serializers
from .models import Payment, PaymentCategory, TransactionPayment


class PaymentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCategory
        fields = ['id', 'name', 'type', 'created_at']
        read_only_fields = ['created_at']


class PaymentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    user_name = serializers.SerializerMethodField()
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, default='')

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_type', 'method', 'category', 'category_name',
            'reference_number', 'payer_payee', 'description', 'date',
            'user', 'user_name', 'source', 'is_auto', 'created_at',
            'warehouse', 'warehouse_name',
        ]
        # Branch is set server-side (perform_create / ledger services) and only
        # ever read here, so out-of-branch entries can't be forged via the API.
        read_only_fields = ['user', 'source', 'is_auto', 'created_at', 'warehouse']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System' if obj.is_auto else 'Admin'


class TransactionPaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    slip_url = serializers.SerializerMethodField()

    class Meta:
        model = TransactionPayment
        fields = [
            'id', 'source_type', 'source_id', 'amount', 'method', 'paid_at',
            'reference', 'slip', 'slip_url', 'note', 'status', 'direction',
            'created_by', 'created_by_name', 'created_at', 'warehouse',
        ]
        # Branch is copied from the parent transaction in the view, never set by
        # the client.
        read_only_fields = ['created_by', 'created_at', 'warehouse']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'System'

    def get_slip_url(self, obj):
        if not obj.slip:
            return None
        request = self.context.get('request')
        url = obj.slip.url
        return request.build_absolute_uri(url) if request else url
