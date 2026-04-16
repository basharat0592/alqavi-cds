from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem


class SupplierSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'company', 'contact', 'address',
            'email', 'user', 'user_email', 'product_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_product_count(self, obj):
        return obj.products.count()


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.product_name')
    product_image = serializers.ImageField(source='product.image', read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'quantity', 'cost_price', 'line_total'
        ]
        read_only_fields = ['id']

    def get_line_total(self, obj):
        return float(obj.quantity * obj.cost_price)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    admin_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'supplier', 'supplier_name', 'admin_user', 'admin_name',
            'tracking_id', 'status', 'total_amount', 'notes',
            'items', 'item_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tracking_id', 'created_at', 'updated_at']

    def get_admin_name(self, obj):
        if obj.admin_user:
            return f"{obj.admin_user.first_name} {obj.admin_user.last_name}".strip() or obj.admin_user.email
        return 'System'

    def get_item_count(self, obj):
        return obj.items.count()


class PurchaseOrderCreateSerializer(serializers.Serializer):
    """Used to create a PO with nested items in a single request."""
    supplier = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = serializers.ListField(child=serializers.DictField(), min_length=1)

    def validate_items(self, value):
        for item in value:
            if 'product' not in item or 'quantity' not in item or 'cost_price' not in item:
                raise serializers.ValidationError(
                    "Each item must have 'product', 'quantity', and 'cost_price'."
                )
            if int(item['quantity']) <= 0:
                raise serializers.ValidationError("Quantity must be greater than 0.")
        return value
