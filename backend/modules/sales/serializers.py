from rest_framework import serializers
from .models import Order, OrderItem, PurchaseOrder, PurchaseOrderItem
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

    class Meta:
        model = Order
        fields = [
            'id', 'tracking_id', 'status', 'status_display', 'payment_method', 'total_amount',
            'shipping_address', 'phone_number', 'customer_name', 'notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tracking_id', 'created_at', 'updated_at']

class CreateOrderSerializer(serializers.ModelSerializer):
    items = serializers.JSONField()

    class Meta:
        model = Order
        fields = ['customer_name', 'shipping_address', 'phone_number', 'notes', 'items', 'payment_method']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Safely get user - handle AnonymousUser
        request = self.context.get('request')
        user = None
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        
        order = Order.objects.create(user=user, **validated_data)
        total_amount = 0
        
        for item in items_data:
            try:
                product = Product.objects.get(id=item['id'])
                # Use price from frontend if provided, else use product.selling_price
                price = item.get('price', product.selling_price)
                quantity = item.get('quantity', 1)
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=price,
                    cost_price=product.cost_price or 0
                )
                total_amount += (price * quantity)
            except Product.DoesNotExist:
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

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'purchase_number', 'supplier', 'supplier_name', 'reference_number',
            'warehouse', 'warehouse_name', 'total_amount', 'shipping_cost', 'tax_amount',
            'status', 'payment_status', 'order_date', 'expected_delivery_date', 'notes', 'items',
            'supplier_phone', 'supplier_email'
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
