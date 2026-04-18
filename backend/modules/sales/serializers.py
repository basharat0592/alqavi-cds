from rest_framework import serializers
from .models import Order, OrderItem, PurchaseOrder, PurchaseOrderItem, PurchaseReturn, PurchaseReturnItem
from modules.products.models import Product

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'image', 'quantity', 'price', 'cost_price']

    def get_product_name(self, obj):
        return obj.product.product_name if obj.product else 'Deleted Product'

    def get_image(self, obj):
        if obj.product and obj.product.image:
            return obj.product.image.url
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    order_number = serializers.CharField(source='tracking_id', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'tracking_id', 'status', 'status_display', 'payment_method', 'total_amount',
            'shipping_address', 'phone_number', 'customer_name', 'notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tracking_id', 'order_number', 'created_at', 'updated_at']

class CreateOrderSerializer(serializers.ModelSerializer):
    items = serializers.JSONField()

    class Meta:
        model = Order
        fields = ['customer_name', 'shipping_address', 'phone_number', 'notes', 'items', 'payment_method']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        request = self.context.get('request')
        user = None
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if not getattr(request.user, 'is_customer', False) and not getattr(request.user, 'is_supplier', False):
                user = request.user
        
        order = Order.objects.create(user=user, **validated_data)
        
        total_amount = 0
        for item in items_data:
            try:
                product = Product.objects.get(id=item.get('id'))
                price = float(item.get('price', product.selling_price))
                quantity = int(item.get('quantity', 1))
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=price,
                    cost_price=product.cost_price or 0
                )
                total_amount += (price * quantity)
            except (Product.DoesNotExist, ValueError, TypeError, KeyError):
                continue
        
        order.total_amount = total_amount
        order.save()
        return order

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'product', 'product_name', 'packaging_type', 'items_per_carton', 'quantity', 'price', 'selling_price', 'total_units', 'subtotal']

    def get_subtotal(self, obj):
        return float(obj.quantity * obj.price)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    supplier_phone = serializers.ReadOnlyField(source='supplier.phone')
    supplier_email = serializers.ReadOnlyField(source='supplier.email')
    warehouse_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(source='purchase_number', read_only=True)
    remaining_amount = serializers.ReadOnlyField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'purchase_number', 'supplier', 'supplier_name', 'reference_number',
            'warehouse', 'warehouse_name', 'total_amount', 'shipping_cost', 'tax_amount',
            'status', 'payment_status', 'payment_method', 'order_date', 'expected_delivery_date', 'notes', 'items',
            'supplier_phone', 'supplier_email', 'paid_amount', 'remaining_amount', 'payment_date', 
            'payment_notes', 'payment_slip', 'transaction_id', 'payment_confirmed'
        ]

    def get_supplier_name(self, obj):
        return obj.supplier.username if obj.supplier else 'Internal'

    def get_warehouse_name(self, obj):
        return obj.warehouse.name if obj.warehouse else 'Default Warehouse'


class OrderStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    received_orders = serializers.IntegerField()
    total_order_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    supplier_name = serializers.CharField()


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    total_refund = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseReturnItem
        fields = ['id', 'product', 'product_name', 'quantity', 'refund_price', 'total_refund']

    def get_total_refund(self, obj):
        return float(obj.quantity * obj.refund_price)


class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    purchase_number = serializers.ReadOnlyField(source='purchase_order.purchase_number')

    class Meta:
        model = PurchaseReturn
        fields = [
            'id', 'return_number', 'supplier', 'supplier_name', 'purchase_order', 'purchase_number',
            'status', 'reason', 'return_date', 'total_refund_amount', 'items', 'created_at'
        ]

    def get_supplier_name(self, obj):
        return obj.supplier.username if obj.supplier else 'Unknown'
