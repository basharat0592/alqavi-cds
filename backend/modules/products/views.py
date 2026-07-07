from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F, ExpressionWrapper, DecimalField, Q, Sum
from .models import Product, Wishlist, Category, SupplierProduct, MainCategory, ProductImage, StoreProduct
from .serializers import (
    ProductSerializer, WishlistSerializer, CategorySerializer,
    SupplierProductSerializer, MainCategorySerializer, StoreProductSerializer
)
from core.permissions import HasModulePermission
from core.scoping import (
    is_unscoped_admin, BranchScopedQuerysetMixin,
    scope_to_tenant, tenant_id_for,
)


class IsSuperAdmin(permissions.BasePermission):
    """Allow only global Super Admins (they manage the cross-branch store catalog)."""
    message = 'Super Admin only.'

    def has_permission(self, request, view):
        return is_unscoped_admin(getattr(request, 'user', None))


class CategoryViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None
    # Tenant is THE isolation axis: each Admin sees only their own categories;
    # the storefront/suppliers/super-admin (tenant_id_for -> None) see all.
    tenant_field = 'tenant'
    shadow_safe = True  # storefront/portal users may read the category list

    def perform_create(self, serializer):
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class MainCategoryViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MainCategory.objects.all().order_by('name')
    serializer_class = MainCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None
    tenant_field = 'tenant'
    shadow_safe = True  # storefront/portal users may read the sections list

    def perform_create(self, serializer):
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class ProductViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    # Branch admins only see products in their assigned warehouse(s). Super admins,
    # customers and storefront guests are unscoped (helper returns None for them).
    branch_field = 'warehouse'
    # Tenant is THE isolation axis. The admin list shows only the logged-in
    # Admin's products; the anonymous storefront list is unscoped (tenant_id_for
    # -> None makes scope_to_tenant a no-op) so it still shows every tenant.
    tenant_field = 'tenant'
    shadow_safe = True  # public storefront catalog (anon + logged-in shoppers)
    queryset = Product.objects.exclude(status='ARCHIVED').order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'

    def create(self, request, *args, **kwargs):
        # Turn DB uniqueness collisions into a clean message instead of a raw 500.
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            msg = str(e).lower()
            if 'barcode' in msg:
                detail = 'A product with this barcode already exists in this branch.'
            elif 'sku' in msg:
                detail = 'A product with this SKU already exists in this branch.'
            else:
                detail = 'This product conflicts with an existing one (duplicate value).'
            return Response({'error': detail}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        """Merge into an existing product ONLY when it is the same item in the SAME
        branch — same name, price, size, weight AND warehouse. Different branches
        keep their own rows (each admin sees only their products); the storefront
        deduplicates across branches at display time. Size/weight fall back to the
        linked stock when not supplied.
        """
        tenant_id = tenant_id_for(self.request.user)
        stock_obj = serializer.validated_data.get('stock')
        name = serializer.validated_data.get('product_name') or (getattr(stock_obj, 'product_name', None) if stock_obj else None)
        price = serializer.validated_data.get('selling_price')
        weight = serializer.validated_data.get('weight') or (getattr(stock_obj, 'weight', None) if stock_obj else None)
        size = serializer.validated_data.get('size') or (getattr(stock_obj, 'size', None) if stock_obj else None)
        warehouse_id = getattr(stock_obj, 'warehouse_id', None) if stock_obj else None

        # Match on tenant too, so two Admins' identically-named products do not
        # merge into a single shared row.
        existing = Product.objects.filter(
            product_name=name, selling_price=price, weight=weight, size=size,
            warehouse_id=warehouse_id, tenant_id=tenant_id,
        ).first()

        if existing:
            # Same item, same branch -> merge quantities, keep ONE row for this branch.
            added_qty = serializer.validated_data.get('total_quantity', 0)
            existing.total_quantity = F('total_quantity') + added_qty
            existing.category = serializer.validated_data.get('category', existing.category)
            existing.cost_price = serializer.validated_data.get('cost_price', existing.cost_price)
            existing.stock = stock_obj or existing.stock
            existing.badge = serializer.validated_data.get('badge', existing.badge)
            existing.status = serializer.validated_data.get('status', existing.status)
            existing.description = serializer.validated_data.get('description', existing.description)

            existing.save()
            serializer.instance = existing  # Link to serializer for response serialization
            return existing

        # New unique listing. Stamp the owning Admin (tenant); anonymous/storefront
        # create paths leave tenant = None (tenant_id_for(anon) -> None).
        instance = serializer.save(tenant_id=tenant_id)

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

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        # Storefront (customers / guests — not staff) get a DEDUPLICATED catalog:
        # the same product (name+price+size+weight) from different branches shows
        # once, with quantities summed. Staff see the branch-scoped list as-is.
        if not getattr(request.user, 'is_staff', False):
            # City scope: when a city is selected, keep only products stocked in an
            # active branch of that city. "all"/blank = every branch (merged).
            city = (request.query_params.get('city') or '').strip()
            city_scoped = bool(city and city.lower() != 'all')
            if city_scoped:
                qs = qs.filter(warehouse__area__name__iexact=city, warehouse__is_active=True)

            seen = {}
            for p in qs:
                key = (p.product_name, str(p.selling_price), p.weight or '', p.size or '')
                if key in seen:
                    seen[key].total_quantity = (seen[key].total_quantity or 0) + (p.total_quantity or 0)
                else:
                    seen[key] = p
            items = list(seen.values())
            # In a selected city, hide products that have no stock there.
            if city_scoped:
                items = [p for p in items if (p.total_quantity or 0) > 0]
            qs = items
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self.get_serializer(instance).data
        # Storefront product detail shows the selected city's stock (or the sum
        # across all branches when no city is chosen) for this exact item.
        if not getattr(request.user, 'is_staff', False):
            city = (request.query_params.get('city') or '').strip()
            ident = Product.objects.exclude(status='ARCHIVED').filter(
                product_name=instance.product_name,
                selling_price=instance.selling_price,
                weight=instance.weight, size=instance.size,
            )
            if city and city.lower() != 'all':
                ident = ident.filter(warehouse__area__name__iexact=city, warehouse__is_active=True)
            data['total_quantity'] = ident.aggregate(t=Sum('total_quantity'))['t'] or 0
        return Response(data)

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

        # Resolve the actual Supplier instance for Shadow Users (supplier portal)
        if hasattr(user, 'is_supplier') and user.is_supplier:
            from modules.supplier.models import Supplier
            supplier_instance = Supplier.objects.filter(id=user.real_id).first()
            if supplier_instance:
                serializer.save(supplier=supplier_instance)
                return
            else:
                print(f"DEBUG: Supplier instance NOT FOUND for real_id: {getattr(user, 'real_id', 'None')}")

        # Staff / Admin: 'supplier' field is writable; if it came through validated_data, just save.
        # As a safety net, if 'supplier' was not in validated_data try to resolve from raw request.
        if user.is_staff:
            if 'supplier' in serializer.validated_data:
                serializer.save()
                return
            supplier_id = self.request.data.get('supplier')
            if supplier_id:
                from modules.supplier.models import Supplier
                supplier_instance = Supplier.objects.filter(id=supplier_id).first()
                if supplier_instance:
                    serializer.save(supplier=supplier_instance)
                    return

        # Final fallback
        try:
            serializer.save()
        except Exception as e:
            print(f"DEBUG: SupplierProduct save failed: {str(e)}")
            raise e


class StoreProductViewSet(viewsets.ModelViewSet):
    """Super-admin master store catalog.

    Super admins add/edit listings here directly; (later) branch products fold in
    by name+weight+size+price. The storefront is sourced from the visible entries.
    Restricted to Super Admins — it spans every branch.
    """
    queryset = StoreProduct.objects.all().order_by('-created_at')
    serializer_class = StoreProductSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)
