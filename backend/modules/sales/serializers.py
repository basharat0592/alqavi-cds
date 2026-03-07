"""
Sales module serializers for API responses.
"""
from rest_framework import serializers
from .models import Order, OrderItem
from modules.products.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product = ProductSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'subtotal']
    
    def get_subtotal(self, obj):
        """Calculate subtotal."""
        return float(obj.get_subtotal())


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for order details."""
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    
    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.username or obj.customer.email
        return obj.guest_name or 'Guest'
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_email',
            'guest_name', 'total_amount', 'status', 'payment_status', 'items', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class OrderCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating orders."""
    
    class Meta:
        model = Order
        fields = [
            'order_number', 'customer', 'guest_name', 'total_amount', 'status',
            'payment_status', 'notes'
        ]
    
    def validate_order_number(self, value):
        """Validate unique order number."""
        if Order.objects.filter(order_number=value).exists():
            raise serializers.ValidationError("Order number already exists.")
        return value


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order listings."""
    customer_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    
    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.username or obj.customer.email
        return obj.guest_name or 'Guest'
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'guest_name', 'total_amount',
            'status', 'payment_status', 'item_count', 'created_at'
        ]
    
    def get_item_count(self, obj):
        """Get total items in order."""
        return obj.items.count()

