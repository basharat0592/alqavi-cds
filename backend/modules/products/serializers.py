from rest_framework import serializers
from .models import Product, Wishlist, Category, SupplierProduct


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    profit_margin = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'stock', 'product_name', 'category', 'category_name',
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name', 
            'cost_price', 'total_quantity', 'image', 'description', 
            'selling_price', 'batch', 'badge', 'status', 'profit_margin', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'supplier_name', 'warehouse_name', 'category_name', 'profit_margin']

    def get_profit_margin(self, obj):
        if obj.selling_price and obj.cost_price and obj.selling_price > 0:
            margin = ((obj.selling_price - obj.cost_price) / obj.selling_price) * 100
            return float(margin)
        return 0.0


class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'product', 'product_details', 'created_at']
        read_only_fields = ['id', 'created_at', 'product_details']


class SupplierProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    supplier_name = serializers.ReadOnlyField(source='supplier.username')

    class Meta:
        model = SupplierProduct
        fields = [
            'id', 'name', 'sku', 'barcode', 'supplier', 'supplier_name',
            'category', 'category_name', 'image', 'description',
            'price', 'cost_price', 'retail_price', 'quantity', 
            'status', 'batch_number', 'is_approved', 'created_at'
        ]
        read_only_fields = ['id', 'supplier', 'supplier_name', 'category_name', 'is_approved', 'created_at']

    def validate(self, attrs):
        print(f"DEBUG: Validating SupplierProduct data: {attrs}")
        try:
            # Convert empty strings to None for optional fields
            for field in ['sku', 'barcode', 'category']:
                if field in attrs and attrs[field] == '':
                    attrs[field] = None
            
            # Ensure 'price' is set for DB integrity if 'retail_price' is provided
            if not attrs.get('price') and attrs.get('retail_price'):
                attrs['price'] = attrs['retail_price']
            
            print(f"DEBUG: Validated data: {attrs}")
            return attrs
        except Exception as e:
            print(f"DEBUG: Validation error in Serializer: {str(e)}")
            raise serializers.ValidationError(str(e))
