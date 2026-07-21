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
    # Real sale-order PK behind this ledger row (for the "View → sale page"
    # drill-down): sale/delivery lines key by order.id; installment lines key by
    # "tp:<id>", so those are resolved back through the TransactionPayment.
    order_ref_id = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_type', 'method', 'category', 'category_name',
            'reference_number', 'payer_payee', 'description', 'date',
            'user', 'user_name', 'source', 'source_type', 'source_id', 'order_ref_id',
            'is_auto', 'created_at',
            'warehouse', 'warehouse_name', 'tenant',
        ]
        # Branch + tenant are set server-side (perform_create / ledger services)
        # and only ever read here, so out-of-branch/out-of-tenant entries can't be
        # forged via the API. source_type/source_id are the read-only link back to
        # the originating transaction (order / purchase / return) for drill-down.
        read_only_fields = ['user', 'source', 'source_type', 'source_id', 'is_auto', 'created_at', 'warehouse', 'tenant']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System' if obj.is_auto else 'Admin'

    def get_order_ref_id(self, obj):
        st = obj.source_type or ''
        sid = str(obj.source_id or '')
        if not sid:
            return None
        # Delivery-charge lines are keyed directly by the order pk.
        if st == 'delivery':
            return sid
        if st == 'order':
            # Installment ledger rows key by "tp:<TransactionPayment id>" — follow
            # that back to the installment's own order id.
            if sid.startswith('tp:'):
                from .models import TransactionPayment
                tp = TransactionPayment.objects.filter(pk=sid[3:]).only('source_id', 'source_type').first()
                if tp and tp.source_type == 'order':
                    return str(tp.source_id)
                return None
            return sid
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if ret.get('payer_payee') == 'Registered Customer' and instance.source_type == 'order' and instance.source_id:
            from modules.sales.models import Order
            try:
                order = Order.objects.filter(id=instance.source_id).first()
                if order and order.customer:
                    fullname = f"{order.customer.first_name} {order.customer.last_name}".strip()
                    if fullname:
                        ret['payer_payee'] = fullname
                    elif order.customer.username:
                        ret['payer_payee'] = order.customer.username
            except Exception:
                pass
        return ret


class TransactionPaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    slip_url = serializers.SerializerMethodField()
    payer_name = serializers.SerializerMethodField()
    source_number = serializers.SerializerMethodField()
    warehouse_name = serializers.SerializerMethodField()

    class Meta:
        model = TransactionPayment
        fields = [
            'id', 'source_type', 'source_id', 'amount', 'method', 'paid_at',
            'reference', 'slip', 'slip_url', 'note', 'status', 'direction',
            'created_by', 'created_by_name', 'created_at', 'warehouse', 'tenant',
            'payer_name', 'source_number', 'warehouse_name',
        ]
        # Branch + tenant are copied from the parent transaction in the view,
        # never set by the client.
        read_only_fields = ['created_by', 'created_at', 'warehouse', 'tenant']

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

    def get_payer_name(self, obj):
        from .services import _load_parent
        parent = _load_parent(obj.source_type, obj.source_id)
        if not parent:
            return 'Unknown'
        if obj.source_type == 'order':
            if parent.customer:
                fullname = f"{parent.customer.first_name} {parent.customer.last_name}".strip()
                if fullname:
                    return fullname
                if parent.customer.username:
                    return parent.customer.username
            return parent.customer_name or 'Walk-in Customer'
        elif obj.source_type == 'purchaseorder':
            from .views import _supplier_name
            return _supplier_name(parent.supplier)
        elif obj.source_type == 'salereturn':
            order = getattr(parent, 'order', None)
            return getattr(order, 'customer_name', 'Customer') if order else 'Customer'
        elif obj.source_type == 'purchasereturn':
            from .views import _supplier_name
            return _supplier_name(parent.supplier)
        return 'Internal'

    def get_source_number(self, obj):
        from .services import _load_parent
        parent = _load_parent(obj.source_type, obj.source_id)
        if not parent:
            return obj.source_id
        if obj.source_type == 'order':
            return parent.tracking_id or parent.order_number
        elif obj.source_type == 'purchaseorder':
            return parent.purchase_number
        elif obj.source_type in ('salereturn', 'purchasereturn'):
            return parent.return_number
        return obj.source_id

    def get_warehouse_name(self, obj):
        return obj.warehouse.name if obj.warehouse else ''
