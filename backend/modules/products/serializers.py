"""
Products module serializers.
"""
from rest_framework import serializers
from .models import Product, Category, ProductGallery, MainCategory, Wishlist

# Moved WishlistSerializer below ProductSerializer to avoid NameError

from modules.company.models import Company, CompanyCategory


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for ProductGallery model."""
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    class Meta:
        model = ProductGallery
        fields = ['id', 'image', 'image_url', 'is_feature']



class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'slug', 'image', 'status', 'main_category']
        read_only_fields = ['id']

    def validate(self, data):
        if not data.get('slug') and data.get('name'):
            from django.utils.text import slugify
            data['slug'] = slugify(data['name'])
            # If slugify returns empty (non-latin), use name as slug or just leave it for DB null
            if not data['slug']:
                 import time
                 data['slug'] = f"cat-{int(time.time())}"
        return data



class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    company_category_name = serializers.SerializerMethodField()
    is_in_stock = serializers.SerializerMethodField()
    batches = serializers.SerializerMethodField()
    gallery = ProductImageSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    main_category_names = serializers.SerializerMethodField()
    main_category_slugs = serializers.SerializerMethodField()
    
    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        # Fallback if request is missing
        return obj.image.url

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'company', 'company_name', 'supplier', 'supplier_name',
            'company_category', 'company_category_name',
            'sku', 'barcode', 'price', 'cost', 'retail_price', 'quantity_in_stock', 
            'image', 'image_url', 'gallery',
            'status', 'is_in_stock', 'batches', 'main_category_names', 'main_category_slugs', 'main_categories',
            'is_supplier_only', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


    
    def get_main_category_names(self, obj):
        return [c.name for c in obj.main_categories.all()]

    def get_main_category_slugs(self, obj):
        return [c.slug or c.name for c in obj.main_categories.all()]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else "Uncategorized"

    def get_company_category_name(self, obj):
        return obj.company_category.name if obj.company_category else None

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_is_in_stock(self, obj):
        return obj.is_in_stock()

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def get_batches(self, obj):
        from modules.inventory.serializers import BatchSerializer
        batches = obj.batch_set.all() if hasattr(obj, 'batch_set') else obj.batches.all()
        return BatchSerializer(batches, many=True).data


class WishlistSerializer(serializers.ModelSerializer):
    """Serializer for Wishlist model."""
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'product', 'product_details', 'created_at']
        read_only_fields = ['id', 'created_at', 'product_details']


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating products."""
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True
    )
    company_category = serializers.PrimaryKeyRelatedField(
        queryset=CompanyCategory.objects.all(),
        required=False,
        allow_null=True
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True
    )
    image = serializers.FileField(required=False, allow_null=True)
    sku = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    barcode = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    batch_number = serializers.CharField(write_only=True, required=False, allow_null=True)
    # Using ListField to accommodate multiple images (allow files more broadly)
    upload_images = serializers.ListField(
        child=serializers.FileField(max_length=10000, allow_empty_file=False),
        write_only=True,
        required=False
    )
    
    main_categories = serializers.PrimaryKeyRelatedField(
        queryset=MainCategory.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'company', 'supplier', 'company_category', 'sku',
            'price', 'cost', 'retail_price', 'quantity_in_stock', 'image', 'status', 'barcode',
            'batch_number', 'upload_images', 'main_categories'
        ]

    def validate(self, data):
        sku = data.get('sku')
        if not sku:
            import uuid
            # Generate a clean 8-char SKU if missing
            data['sku'] = f"PROD-{uuid.uuid4().hex[:8].upper()}"
        
        # Ensure barcode is None if empty string to avoid unique constraint on multiple empty strings
        if 'barcode' in data and not data['barcode']:
            data['barcode'] = None
            
        return data

    def create(self, validated_data):
        batch_number = validated_data.pop('batch_number', None)
        # Pop upload_images to avoid TypeError in Product.objects.create
        validated_data.pop('upload_images', None)
        
        # DRF ListField might not get all files from multipart if not handled correctly
        # Extract directly from request.FILES for multi-file upload support
        request = self.context.get('request')
        upload_images = []
        if request and hasattr(request, 'FILES'):
            upload_images = request.FILES.getlist('upload_images')
        

        
        product = super().create(validated_data)
        
        # Handle multiple images with safety check
        for img in upload_images:
            try:
                ProductGallery.objects.create(product=product, image=img)
            except Exception as e:
                print(f"Error saving additional image: {e}")

        if batch_number:
            from modules.inventory.models import Batch, Warehouse
            # Try to find a default warehouse or create one if missing
            warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
            if not warehouse:
                warehouse = Warehouse.objects.create(name="Default Warehouse", is_default=True)
            
            try:
                Batch.objects.create(
                    product=product,
                    warehouse=warehouse,
                    batch_number=batch_number,
                    status='Active'
                )
            except Exception as e:
                print(f"Error creating batch: {e}")
        return product

    def update(self, instance, validated_data):
        batch_number = validated_data.pop('batch_number', None)
        # Pop upload_images to avoid TypeError in Product.objects.update
        validated_data.pop('upload_images', None)

        request = self.context.get('request')
        upload_images = []
        if request and hasattr(request, 'FILES'):
            upload_images = request.FILES.getlist('upload_images')

        product = super().update(instance, validated_data)
        
        # If new images are uploaded, add them
        for img in upload_images:
            try:
                ProductGallery.objects.create(product=product, image=img)
            except Exception as e:
                print(f"Error saving additional image: {e}")

        if batch_number:
            from modules.inventory.models import Batch, Warehouse
            warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
            if not warehouse:
                warehouse = Warehouse.objects.create(name="Default Warehouse", is_default=True)
            
            try:
                # Check if batch exists or create new one
                Batch.objects.get_or_create(
                    product=product,
                    warehouse=warehouse,
                    batch_number=batch_number,
                    defaults={'status': 'Active'}
                )
            except Exception as e:
                print(f"Error updating batch: {e}")
        return product


class MainCategorySerializer(serializers.ModelSerializer):
    """Serializer for MainCategory model."""
    product_details = serializers.SerializerMethodField()
    product_ids = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source='products',
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = MainCategory
        fields = ['id', 'name', 'description', 'slug', 'image', 'status', 'product_details', 'product_ids']
        read_only_fields = ['id']

    def get_product_details(self, obj):
        products = obj.products.all()
        request = self.context.get('request')
        include_supplier_only = request and request.query_params.get('include_supplier_only') == 'true'
        # Consistent filtering with list_products view
        if not request or not request.user.is_authenticated:
            products = products.filter(status='active')
        else:
            is_privileged = request.user.is_staff or request.user.is_superuser or (
                getattr(request.user, 'role', None) and request.user.role.name in ['Admin', 'admin']
            )
            if not is_privileged:
                products = products.filter(status='active')
        # Exclude supplier-only products by default
        if not include_supplier_only:
            products = products.filter(is_supplier_only=False)
        
        try:
            return ProductSerializer(products, many=True, context=self.context).data
        except Exception as e:
            import traceback
            print(f"ERROR: MainCategorySerializer failure for {obj.name}: {str(e)}")
            print(traceback.format_exc())
            return [{
                "serialization_error": str(e),
                "traceback": traceback.format_exc()
            }]

    def validate(self, data):
        if not data.get('slug') and data.get('name'):
            from django.utils.text import slugify
            data['slug'] = slugify(data['name'])
            if not data['slug']:
                 import time
                 data['slug'] = f"mcat-{int(time.time())}"
        return data
