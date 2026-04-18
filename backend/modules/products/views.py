from django.core.exceptions import ValidationError
from rest_framework import viewsets, permissions
from django.db.models import F, ExpressionWrapper, DecimalField, Q
from .models import Product, Wishlist, Category, SupplierProduct, MainCategory
from .serializers import (
    ProductSerializer, WishlistSerializer, CategorySerializer, 
    SupplierProductSerializer, MainCategorySerializer
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None


class MainCategoryViewSet(viewsets.ModelViewSet):
    queryset = MainCategory.objects.all().order_by('name')
    serializer_class = MainCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Annotate with profit for ordering
        queryset = Product.objects.annotate(
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


class SupplierProductViewSet(viewsets.ModelViewSet):
    """ViewSet for products uploaded by suppliers for review"""
    serializer_class = SupplierProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Admins can filter by supplier; Suppliers only see their own
        if getattr(user, 'is_staff', False):
            queryset = SupplierProduct.objects.all().order_by('-created_at')
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
