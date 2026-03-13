"""
Products module serializers.
"""
from rest_framework import serializers
from .models import Product, Category, ProductImage
from modules.company.models import CompanyCategory


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for ProductImage model."""
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_feature']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'slug', 'image', 'status']
        read_only_fields = ['id']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""
    
    category_name = serializers.SerializerMethodField()
    company_category_name = serializers.SerializerMethodField()
    is_in_stock = serializers.SerializerMethodField()
    batches = serializers.SerializerMethodField()
    additional_images = ProductImageSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    
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
            'company_category', 'company_category_name',
            'sku', 'barcode', 'price', 'cost', 'retail_price', 'quantity_in_stock', 
            'image', 'image_url', 'additional_images',
            'packaging', 'pack_size',
            'status', 'is_in_stock', 'batches', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else "Uncategorized"

    def get_company_category_name(self, obj):
        return obj.company_category.name if obj.company_category else None

    def get_is_in_stock(self, obj):
        return obj.is_in_stock()

    def get_batches(self, obj):
        from modules.inventory.serializers import ProductBatchSerializer
        batches = obj.batches.all()
        return ProductBatchSerializer(batches, many=True).data


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
    
    batch_number = serializers.CharField(write_only=True, required=False, allow_null=True)
    # Using ListField to accommodate multiple images (expecting list of files)
    upload_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'company_category', 'sku',
            'price', 'cost', 'retail_price', 'image', 'status', 'barcode',
            'packaging', 'pack_size', 'batch_number', 'upload_images'
        ]

    def create(self, validated_data):
        batch_number = validated_data.pop('batch_number', None)
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
                ProductImage.objects.create(product=product, image=img)
            except Exception as e:
                print(f"Error saving additional image: {e}")

        if batch_number:
            from modules.inventory.models import ProductBatch
            ProductBatch.objects.create(
                product=product,
                batch_number=batch_number,
                status='active'
            )
        return product

    def update(self, instance, validated_data):
        batch_number = validated_data.pop('batch_number', None)
        request = self.context.get('request')
        upload_images = []
        if request and hasattr(request, 'FILES'):
            upload_images = request.FILES.getlist('upload_images')

        product = super().update(instance, validated_data)
        
        # If new images are uploaded, add them
        for img in upload_images:
            try:
                ProductImage.objects.create(product=product, image=img)
            except Exception as e:
                print(f"Error saving additional image: {e}")

        if batch_number:
            from modules.inventory.models import ProductBatch
            # Check if batch exists or create new one
            ProductBatch.objects.get_or_create(
                product=product,
                batch_number=batch_number,
                defaults={'status': 'active'}
            )
        return product
