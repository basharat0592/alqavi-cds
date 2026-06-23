from django.core.exceptions import ValidationError
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F, ExpressionWrapper, DecimalField, Q
from .models import Product, Wishlist, Category, SupplierProduct, MainCategory, ProductImage
from .serializers import (
    ProductSerializer, WishlistSerializer, CategorySerializer,
    SupplierProductSerializer, MainCategorySerializer
)
from core.permissions import HasModulePermission


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None


class MainCategoryViewSet(viewsets.ModelViewSet):
    queryset = MainCategory.objects.all().order_by('name')
    serializer_class = MainCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.exclude(status='ARCHIVED').order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'

    def perform_create(self, serializer):
        """Handle professional deduplication and merging with existing products"""
        stock_obj = serializer.validated_data.get('stock')
        sku = serializer.validated_data.get('sku')
        barcode = serializer.validated_data.get('barcode')
        name = serializer.validated_data.get('product_name')

        # Complex query to find existing product by Name, SKU or Barcode
        query = Q(product_name=name)
        if sku: query |= Q(sku=sku)
        if barcode: query |= Q(barcode=barcode)

        existing = Product.objects.filter(query).first()

        if existing:
            # Atomic Merge with existing: increase quantity and update metadata
            added_qty = serializer.validated_data.get('total_quantity', 0)
            existing.total_quantity = F('total_quantity') + added_qty
            
            # Update price if changed
            new_price = serializer.validated_data.get('selling_price')
            if new_price:
                existing.selling_price = new_price
            
            # Update other metadata
            existing.category = serializer.validated_data.get('category', existing.category)
            existing.cost_price = serializer.validated_data.get('cost_price', existing.cost_price)
            existing.stock = stock_obj or existing.stock
            existing.badge = serializer.validated_data.get('badge', existing.badge)
            existing.status = serializer.validated_data.get('status', existing.status)
            existing.description = serializer.validated_data.get('description', existing.description)
            
            existing.save()
            serializer.instance = existing # Link to serializer for response serialization
            return existing

        # If no existing product, proceed with normal creation
        instance = serializer.save()
        
        # Handle additional images
        additional_images = self.request.FILES.getlist('additional_images')
        for img in additional_images:
            ProductImage.objects.create(product=instance, image=img)
            
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Handle new additional images (append to existing)
        additional_images = self.request.FILES.getlist('additional_images')
        for img in additional_images:
            ProductImage.objects.create(product=instance, image=img)

    def get_queryset(self):
        queryset = Product.objects.exclude(status='ARCHIVED').annotate(
            profit_amount=ExpressionWrapper(
                F('selling_price') - F('cost_price'),
                output_field=DecimalField()
            )
        )

        # Basic status filter
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status.upper())

        # Advanced Filters
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(product_name__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(category__name__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering')
        if ordering == 'profit':
            queryset = queryset.order_by('-profit_amount')
        elif ordering == 'price_low':
            queryset = queryset.order_by('selling_price')
        elif ordering == 'price_high':
            queryset = queryset.order_by('-selling_price')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def destroy(self, request, *args, **kwargs):
        """Perform a soft-delete by marking the product as ARCHIVED"""
        instance = self.get_object()
        instance.status = 'ARCHIVED'
        instance.save()
        return Response({"message": "Product removed from registry"}, status=status.HTTP_200_OK)


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = Wishlist.objects.all()
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        print(f"DEBUG: Wishlist access by user: {user}, is_customer: {getattr(user, 'is_customer', False)}, real_id: {getattr(user, 'real_id', 'None')}")
        if hasattr(user, 'is_customer') and user.is_customer:
            return self.queryset.filter(user_id=user.real_id).order_by('-created_at')
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'is_customer') and user.is_customer:
            from modules.customer.models import Customer
            customer_instance = Customer.objects.filter(id=user.real_id).first()
            if customer_instance:
                serializer.save(user=customer_instance)
                return
        serializer.save()

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({"error": "product_id is required"}, status=400)
            
        user = request.user
        if not hasattr(user, 'is_customer') or not user.is_customer:
            return Response({"error": "Only customers can manage wishlists"}, status=403)
            
        from modules.customer.models import Customer
        customer_instance = Customer.objects.filter(id=user.real_id).first()
        if not customer_instance:
            return Response({"error": "Customer profile not found"}, status=404)
            
        # Check if already in wishlist
        existing = Wishlist.objects.filter(user=customer_instance, product_id=product_id).first()
        if existing:
            existing.delete()
            return Response({"status": "removed", "message": "Product removed from wishlist"})
        else:
            Wishlist.objects.create(user=customer_instance, product_id=product_id)
            return Response({"status": "added", "message": "Product added to wishlist"})


class SupplierProductViewSet(viewsets.ModelViewSet):
    """ViewSet for products uploaded by suppliers for review"""
    serializer_class = SupplierProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'purchases'

    def get_queryset(self):
        user = self.request.user
        
        # Admins can filter by supplier; Suppliers only see their own
        if getattr(user, 'is_staff', False):
            queryset = SupplierProduct.objects.exclude(status='ARCHIVED').order_by('-created_at')
            supplier_id = self.request.query_params.get('supplier')
            
            if supplier_id and supplier_id != 'undefined' and supplier_id != 'null':
                # Try to resolve if it's an Auth User ID (Integer) instead of Supplier UUID
                if supplier_id.isdigit():
                    from django.contrib.auth import get_user_model
                    from modules.supplier.models import Supplier
                    User = get_user_model()
                    target_user = User.objects.filter(id=int(supplier_id)).first()
                    if target_user:
                        target_supplier = Supplier.objects.filter(email=target_user.email).first()
                        if target_supplier:
                            supplier_id = str(target_supplier.id)
                
                try:
                    queryset = queryset.filter(supplier_id=supplier_id)
                except (ValueError, TypeError, ValidationError):
                    pass
            return queryset
            
        # Handle Suppliers (Shadow Users from MultiTableJWTAuthentication)
        if hasattr(user, 'is_supplier') and user.is_supplier:
            # If the SupplierProduct model still links to the User table, 
            # we need to find the User record corresponding to this supplier 
            # if one exists, or return nothing if they are fully isolated.
            # Assuming for now they might have a linked user or we filter by their real_id 
            # if the DB schema was updated (which it doesn't seem to be).
            # To avoid 500, we'll return an empty queryset if we can't find a valid link.
            if hasattr(user, 'real_id') and user.real_id:
                # If the schema uses the User ID, and Suppliers are NOT Users, 
                # this filter will return empty anyway, but it won't crash.
                return SupplierProduct.objects.filter(supplier_id=user.real_id).order_by('-created_at')
            return SupplierProduct.objects.none()

        # Fallback for standard authenticated Users
        if user.is_authenticated and hasattr(user, 'id') and user.id:
            return SupplierProduct.objects.filter(supplier=user).order_by('-created_at')
            
        return SupplierProduct.objects.none()

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        
        # Resolve the actual Supplier instance for Shadow Users
        if hasattr(user, 'is_supplier') and user.is_supplier:
            from modules.supplier.models import Supplier
            supplier_instance = Supplier.objects.filter(id=user.real_id).first()
            if supplier_instance:
                serializer.save(supplier=supplier_instance)
                return
            else:
                print(f"DEBUG: Supplier instance NOT FOUND for real_id: {getattr(user, 'real_id', 'None')}")
        
        # Fallback for staff/admin
        try:
            serializer.save()
        except Exception as e:
            print(f"DEBUG: SupplierProduct save failed: {str(e)}")
            raise e
