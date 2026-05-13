from rest_framework import serializers
from .models import Product, Wishlist, Category, SupplierProduct, MainCategory, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.SerializerMethodField()
    section_names = serializers.SerializerMethodField()
    additional_images = ProductImageSerializer(many=True, read_only=True)
    profit_margin = serializers.SerializerMethodField()
    catalog_image = serializers.SerializerMethodField()
    total_quantity = serializers.IntegerField(read_only=True)
    sku = serializers.CharField(required=False, allow_null=True)
    barcode = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'stock', 'product_name', 'category', 'category_name', 'sections', 'section_names',
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name', 
            'cost_price', 'total_quantity', 'image', 'additional_images', 'description', 'sku', 'barcode',
            'selling_price', 'batch', 'badge', 'weight', 'size', 'status', 'profit_margin', 'created_at',
            'catalog_image'
        ]
        read_only_fields = ['id', 'created_at', 'supplier_name', 'warehouse_name', 'category_name', 'section_names', 'profit_margin', 'catalog_image']

    def get_section_names(self, obj):
        return [s.name for s in obj.sections.all()]

    def get_catalog_image(self, obj):
        if obj.image:
            return None
        from .models import SupplierProduct
        sp = SupplierProduct.objects.filter(name__iexact=obj.product_name).first()
        if sp and sp.image:
            return sp.image.url
        return None

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return "Uncategorized"

    def get_profit_margin(self, obj):
        if obj.selling_price and obj.cost_price and obj.selling_price > 0:
            margin = ((obj.selling_price - obj.cost_price) / obj.selling_price) * 100
            return float(margin)
        return 0.0


class MainCategorySerializer(serializers.ModelSerializer):
    product_ids = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='products', many=True, required=False
    )
    product_details = ProductSerializer(source='products', many=True, read_only=True)

    class Meta:
        model = MainCategory
        fields = ['id', 'name', 'slug', 'description', 'status', 'position', 'is_visible', 'product_ids', 'product_details', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


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
            'status', 'batch_number', 'weight', 'size', 'is_approved', 'created_at'
        ]
        read_only_fields = ['id', 'supplier', 'supplier_name', 'category_name', 'is_approved', 'created_at']

    def validate(self, attrs):
        print(f"DEBUG: Validating SupplierProduct data: {attrs}")
        try:
            # 1. Convert empty strings to None for optional fields
            for field in ['sku', 'barcode', 'category']:
                if field in attrs and attrs[field] == '':
                    attrs[field] = None
            
            # 2. Merge Weight and Size into the Name field for the database
            # This satisfies the requirement to have them in the same column in the backend
            name = attrs.get('name', '').strip()
            weight = attrs.get('weight', '').strip()
            size = attrs.get('size', '').strip()
            
            if weight or size:
                # Clean up name if it already has specs (to prevent duplicates on update)
                import re
                name = re.sub(r'\s*\([^)]*\)$', '', name).strip()
                
                # Format: Product Name (Weight - Type)
                specs = []
                if weight: specs.append(weight)
                if size: specs.append(size)
                
                if specs:
                    attrs['name'] = f"{name} ({' - '.join(specs)})"
            
            # 3. Ensure 'price' is set for DB integrity if 'retail_price' is provided
            if not attrs.get('price') and attrs.get('retail_price'):
                attrs['price'] = attrs['retail_price']
            
            print(f"DEBUG: Validated data: {attrs}")
            return attrs
        except Exception as e:
            print(f"DEBUG: Validation error in Serializer: {str(e)}")
            raise serializers.ValidationError(str(e))
