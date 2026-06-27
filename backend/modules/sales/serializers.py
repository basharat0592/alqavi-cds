from rest_framework import serializers
from django.utils import timezone
from .models import (
    Order, OrderItem, PurchaseOrder, PurchaseOrderItem, 
    PurchaseReturn, PurchaseReturnItem, CustomerBoughtProduct,
    SaleReturn, SaleReturnItem
)
from modules.products.models import Product

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    weight = serializers.ReadOnlyField(source='product.weight')
    size = serializers.ReadOnlyField(source='product.size')

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'image', 'quantity', 'price', 'cost_price', 'weight', 'size']

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
    customer_display_name = serializers.SerializerMethodField()
    remaining_amount = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    delivery_person_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'tracking_id', 'status', 'status_display', 'payment_method', 'total_amount',
            'amount_paid', 'payment_status', 'due_date', 'remaining_amount', 'is_overdue', 'days_overdue',
            'shipping_address', 'phone_number', 'customer_name', 'customer_display_name', 'notes',
            'delivery_person', 'delivery_person_name',
            'items', 'created_at', 'updated_at',
            'whatsapp_number', 'whatsapp_sent', 'whatsapp_status', 'whatsapp_sent_at'
        ]
        read_only_fields = ['id', 'tracking_id', 'order_number', 'created_at', 'updated_at']

    def get_delivery_person_name(self, obj):
        return obj.delivery_person.name if obj.delivery_person_id else None

    def get_customer_display_name(self, obj):
        """Resolve the real customer name: prefer the linked account, then the
        snapshot field, ignoring generic placeholders like 'Registered Customer'."""
        placeholders = {'', 'registered customer', 'walk-in customer', 'walk in customer', 'guest'}
        if obj.customer_id and getattr(obj.customer, 'name', None):
            return obj.customer.name
        snapshot = (obj.customer_name or '').strip()
        if snapshot and snapshot.lower() not in placeholders:
            return snapshot
        if obj.user_id:
            full = f"{getattr(obj.user, 'first_name', '')} {getattr(obj.user, 'last_name', '')}".strip()
            return full or getattr(obj.user, 'username', '') or snapshot
        return snapshot or 'Walk-in Customer'

class CreateOrderSerializer(serializers.ModelSerializer):
    items = serializers.JSONField()
    warehouse_id = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Order
        fields = ['customer', 'customer_name', 'shipping_address', 'phone_number', 'whatsapp_number', 'notes', 'items', 'payment_method', 'status', 'warehouse_id', 'payment_status', 'amount_paid', 'due_date']

    def create(self, validated_data):
        from django.db import transaction, IntegrityError
        from rest_framework import serializers as drf_serializers
        
        items_data = validated_data.pop('items')
        status_val = validated_data.get('status', 'PENDING').upper()
        
        request = self.context.get('request')
        user_obj = None
        customer_obj = None
        
        # Manual Customer Selection (for POS/Admin)
        manual_customer_id = validated_data.get('customer')
        if manual_customer_id:
            from modules.customer.models import Customer
            customer_obj = Customer.objects.filter(id=manual_customer_id.id if hasattr(manual_customer_id, 'id') else manual_customer_id).first()
            user_obj = None # Prefer linked Customer
        
        if not customer_obj and request and hasattr(request, 'user') and request.user.is_authenticated:
            # Identify the real identity of the user
            from modules.customer.models import Customer
            
            # Try to find if this user is actually a Customer (standalone model)
            # Many systems use the same ID or a matching username for both.
            user_id = getattr(request.user, 'id', None)
            
            # Case 1: Standalone Customer object
            if request.user.__class__.__name__ == 'Customer':
                customer_obj = request.user
                user_obj = None
            else:
                # Case 2: User object acting as a customer
                # Try to find a Customer entry that matches this User
                customer_obj = Customer.objects.filter(id=user_id).first()
                if not customer_obj:
                     customer_obj = Customer.objects.filter(email=getattr(request.user, 'email', '')).first()
                
                if customer_obj:
                    user_obj = None # Prefer Customer model for dashboard sync
                else:
                    user_obj = request.user
                    customer_obj = None

        try:
            with transaction.atomic():
                # Build params dynamically to avoid passing None to a field that 
                # might have a flawed NOT NULL constraint in the underlying DB
                params = {
                    'customer_name': validated_data.get('customer_name', ''),
                    'shipping_address': validated_data.get('shipping_address', ''),
                    'phone_number': validated_data.get('phone_number', ''),
                    'whatsapp_number': validated_data.get('whatsapp_number', ''),
                    'notes': validated_data.get('notes', ''),
                    'payment_method': validated_data.get('payment_method', 'COD'),
                    'status': validated_data.get('status', 'PENDING'),
                    # Settlement (partial / on-credit POS sales). Defaults keep
                    # ordinary fully-paid sales unchanged.
                    'payment_status': validated_data.get('payment_status', 'PAID'),
                    'amount_paid': validated_data.get('amount_paid', 0) or 0,
                    'due_date': validated_data.get('due_date'),
                    # Stamp the branch this sale was made from (drives multi-branch
                    # isolation). Falls back to null for legacy/online flows.
                    'warehouse_id': ((validated_data.get('warehouse_id') or '').strip() or None),
                }

                # Stamp the staff member who rang up this sale (POS) so a branch
                # admin can see the sales they personally created.
                _actor = getattr(request, 'user', None) if request else None
                if (_actor and getattr(_actor, 'is_authenticated', False) and getattr(_actor, 'is_staff', False)
                        and not getattr(_actor, 'is_supplier', False) and not getattr(_actor, 'is_customer', False)):
                    params['created_by'] = _actor

                if customer_obj:
                    params['customer'] = customer_obj
                    # We EXCLUDE 'user' to bypass the failing FK constraint
                elif user_obj:
                    params['user'] = user_obj
                
                order = Order.objects.create(**params)
                
                total_amount = 0
                from django.db.models import F
                
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
                        
                        # 3. Handle Reservation / Deduction based on initial status
                        acceptance_statuses = ["CONFIRMED", "PROCESSING", "SHIPPED"]
                        if status_val in acceptance_statuses:
                            product.reserved_quantity = F("reserved_quantity") + quantity
                            product.save()
                            order.is_reserved = True
                        
                        elif status_val == 'DELIVERED':
                            warehouse_id = validated_data.get('warehouse_id')
                            if warehouse_id and warehouse_id.strip():
                                from modules.inventory.models import Stock
                                import uuid
                                
                                # Validate UUID format to avoid DB errors
                                try:
                                    uuid.UUID(str(warehouse_id))
                                except ValueError:
                                    raise serializers.ValidationError(f"Invalid warehouse ID format: {warehouse_id}")

                                # Deduct from Stock entry in SELECTED warehouse (Matching ALL specs)
                                stock = Stock.objects.filter(
                                    product_name__iexact=product.product_name,
                                    weight=product.weight,
                                    size=product.size,
                                    warehouse_id=warehouse_id
                                ).first()
                                
                                if not stock:
                                    raise drf_serializers.ValidationError(f"Product '{product.product_name}' is not registered in the selected warehouse.")
                                
                                if stock.total_quantity < quantity:
                                    raise drf_serializers.ValidationError(f"Insufficient stock for '{product.product_name}' in selected warehouse. (Available: {stock.total_quantity}, Required: {quantity})")
                                
                                stock.total_quantity = F('total_quantity') - quantity
                                stock.save()
                                
                                # Deduct from Supplier Product
                                if hasattr(stock, 'product') and stock.product:
                                    sp_prod = stock.product
                                    sp_prod.quantity = F('quantity') - quantity
                                    sp_prod.save()
                                
                                # Trigger Product re-aggregation
                                product.save()
                            else:
                                # Fallback to default stock if no warehouse provided (though UI should prevent this)
                                if product.stock:
                                    stock = product.stock
                                    if stock.total_quantity < quantity:
                                        raise drf_serializers.ValidationError(f"Insufficient stock for '{product.product_name}'. (Available: {stock.total_quantity}, Required: {quantity})")
                                    
                                    stock.total_quantity = F('total_quantity') - quantity
                                    stock.save()
                                    
                                    if hasattr(stock, 'product') and stock.product:
                                        sp_prod = stock.product
                                        sp_prod.quantity = F('quantity') - quantity
                                        sp_prod.save()
                                        
                                product.total_quantity = F('total_quantity') - quantity
                                product.save()

                            # 4. Sync to CustomerBoughtProduct Table
                            from .models import CustomerBoughtProduct
                            CustomerBoughtProduct.objects.get_or_create(
                                order=order,
                                product=product,
                                defaults={
                                    'customer': customer_obj,
                                    'user': user_obj,
                                    'quantity': quantity,
                                    'price': price
                                }
                            )
                            
                    except (Product.DoesNotExist, ValueError, TypeError, KeyError):
                        continue
                
                order.total_amount = total_amount
                order.save()
                return order
                
        except serializers.ValidationError as e:
            raise e
        except IntegrityError as e:
            raise serializers.ValidationError({"detail": f"Database Integrity Error: {str(e)}"})
        except Exception as e:
            raise serializers.ValidationError({"detail": f"Order Processing Error: {str(e)}"})

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'packaging_type', 'items_per_carton', 'quantity', 'price', 'selling_price', 'total_units', 'subtotal']

    def get_product_image(self, obj):
        if obj.product and obj.product.image:
            return obj.product.image.url
        return None

    def get_subtotal(self, obj):
        # total_units already accounts for carton packaging (qty × pcs-per-carton);
        # price is per-piece, so subtotal = total_units × price.
        return float(obj.total_units * obj.price)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    supplier_phone = serializers.ReadOnlyField(source='supplier.phone')
    supplier_email = serializers.ReadOnlyField(source='supplier.email')
    warehouse_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(source='purchase_number', read_only=True)
    remaining_amount = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'purchase_number', 'supplier', 'supplier_name', 'reference_number',
            'warehouse', 'warehouse_name', 'total_amount', 'shipping_cost', 'tax_amount',
            'status', 'payment_status', 'payment_method', 'order_date', 'expected_delivery_date',
            'due_date', 'is_overdue', 'days_overdue', 'notes', 'items',
            'supplier_phone', 'supplier_email', 'paid_amount', 'remaining_amount', 'payment_date',
            'payment_notes', 'payment_slip', 'transaction_id', 'payment_confirmed',
            'created_by', 'created_by_name'
        ]

    def get_created_by_name(self, obj):
        u = getattr(obj, 'created_by', None)
        if not u:
            return None
        full_name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return full_name or u.username

    def get_supplier_name(self, obj):
        if not obj.supplier:
            return 'Internal'
        s = obj.supplier
        full_name = f"{s.first_name or ''} {s.last_name or ''}".strip()
        return s.name or s.company or full_name or s.username

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
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = PurchaseReturn
        fields = [
            'id', 'return_number', 'supplier', 'supplier_name', 'purchase_order', 'purchase_number',
            'status', 'reason', 'return_date', 'total_refund_amount', 'items', 'created_at',
            'refund_status', 'refund_method', 'due_date', 'settled_at', 'is_overdue', 'days_overdue',
        ]

    def get_supplier_name(self, obj):
        if not obj.supplier:
            return 'Unknown'
        s = obj.supplier
        full_name = f"{s.first_name or ''} {s.last_name or ''}".strip()
        return s.name or s.company or full_name or s.username

class CustomerBoughtProductSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.product_name')
    image = serializers.SerializerMethodField()
    order_number = serializers.ReadOnlyField(source='order.tracking_id')

    class Meta:
        model = CustomerBoughtProduct
        fields = ['id', 'product', 'product_name', 'image', 'order', 'order_number', 'quantity', 'price', 'purchased_at']

    def get_image(self, obj):
        if obj.product and obj.product.image:
            return obj.product.image.url
        return None


class SaleReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.product_name')
    image = serializers.SerializerMethodField()

    class Meta:
        model = SaleReturnItem
        fields = ['id', 'product', 'product_name', 'image', 'quantity', 'price']

    def get_image(self, obj):
        if obj.product and obj.product.image:
            return obj.product.image.url
        return None


class SaleReturnSerializer(serializers.ModelSerializer):
    items = SaleReturnItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    order_tracking_id = serializers.ReadOnlyField(source='order.tracking_id')
    refund_total = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = SaleReturn
        fields = [
            'id', 'return_number', 'order', 'order_tracking_id', 'customer', 'customer_name',
            'status', 'reason', 'notes', 'items', 'created_at', 'updated_at',
            'refund_amount', 'refund_total', 'refund_status', 'refund_method', 'due_date',
            'settled_at', 'is_overdue', 'days_overdue',
        ]
        read_only_fields = ['id', 'return_number', 'created_at', 'updated_at']

    def get_refund_total(self, obj):
        # Prefer the stored refund amount; fall back to the line-item total.
        amt = float(obj.refund_amount or 0)
        return amt if amt > 0 else float(obj.items_total or 0)

    def get_customer_name(self, obj):
        if obj.customer: return obj.customer.name
        if obj.user: return obj.user.username
        return "N/A"
