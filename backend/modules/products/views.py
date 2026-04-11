"""
Products module API views with function-based approach.
"""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.pagination import PageNumberPagination
from .models import Product, Category, MainCategory, Wishlist
from .serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    CategorySerializer,
    MainCategorySerializer,
    WishlistSerializer
)

from core.utils import get_or_404_response
from modules.users.models import UserActivityLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_wishlist(request):
    """List all products in the authenticated user's wishlist."""
    try:
        # Optimized fetch to prevent N+1 performance bottlenecks
        wishlist_items = Wishlist.objects.filter(user=request.user).select_related(
            'product', 
            'product__category', 
            'product__company', 
            'product__company_category',
            'product__supplier'
        ).prefetch_related(
            'product__gallery',
            'product__main_categories',
            'product__batch_set'
        ).order_by('-created_at')
        
        serializer = WishlistSerializer(wishlist_items, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        import traceback
        print(f"DEBUG: Wishlist API error: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': str(e),
            'message': 'Internal Server Error occurred during wishlist operation.',
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_wishlist(request):
    """Add a product to the user's wishlist."""
    product_id = request.data.get('product_id')
    if not product_id:
        return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    product, err = get_or_404_response(Product, id=product_id)
    if err:
        return err

    wishlist_item, created = Wishlist.objects.get_or_create(user=request.user, product=product)
    if created:
        return Response(WishlistSerializer(wishlist_item, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response({'message': 'Product already in wishlist'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_wishlist(request, product_id):
    """Remove a product from the user's wishlist."""
    Wishlist.objects.filter(user=request.user, product_id=product_id).delete()
    return Response({'message': 'Product removed from wishlist'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def list_products(request):
    """List all products or create a new one."""
    try:
        if request.method == 'GET':
            products = Product.objects.all().order_by('-created_at')
            
            # Supplier/Admin Isolation & Pending Procurement Logic: 
            # Suppliers only see their own products. Staff see all confirmed products.
            include_pending = request.query_params.get('include_pending') == 'true'
            include_supplier_only = request.query_params.get('include_supplier_only') == 'true'

            # Detect Role and apply strict Catalog Isolation
            is_supplier_user = False
            if request.user.is_authenticated and request.user.role and request.user.role.name.lower() == 'supplier':
                from modules.company.models import Supplier
                supplier = Supplier.objects.filter(user=request.user).first()
                if supplier:
                    is_supplier_user = True
                    # Suppliers strictly manage their own catalog entries.
                    products = products.filter(supplier=supplier, is_supplier_only=True)
                else:
                    # Unlinked supplier users see nothing for safety
                    products = products.none()
            
            elif request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser or (request.user.role and request.user.role.name.lower() == 'admin')):
                # Admin/Staff Logic:
                if not include_pending:
                    products = products.exclude(status='pending_procurement')
                
                # Admins see the Admin Catalog by default. 
                # They MUST opt-in to see Supplier catalogs (e.g. for Purchase Orders).
                if not include_supplier_only:
                    products = products.filter(is_supplier_only=False)
            
            else:
                # Public or unpowered users see only active Admin Catalog items
                products = products.filter(status='active', is_supplier_only=False)
            
            # Filtering
            search = request.query_params.get('search')
            category_name = request.query_params.get('category_name')
            
            if search:
                from django.db.models import Q
                products = products.filter(
                    Q(name__icontains=search) | Q(sku__icontains=search)
                )
            
            if category_name:
                products = products.filter(category__name=category_name)

            supplier_id = request.query_params.get('supplier_id')
            if supplier_id:
                products = products.filter(supplier_id=supplier_id)

            # Date range filters for business reports
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            if start_date: products = products.filter(created_at__date__gte=start_date)
            if end_date: products = products.filter(created_at__date__lte=end_date)

            # Option to bypass pagination for merged local-storage pagination in frontend
            if request.query_params.get('all_items') == 'true':
                # Ensure all_items also respects the supplier-only visibility rules.
                # Supplier owners should always see their own supplier products; others must opt-in.
                if not include_supplier_only and not is_supplier_user:
                    products = products.filter(is_supplier_only=False)
                serializer = ProductSerializer(products, many=True, context={'request': request})
                return Response(serializer.data)

            paginator = PageNumberPagination()
            paginated_products = paginator.paginate_queryset(products, request)
            serializer = ProductSerializer(paginated_products, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        elif request.method == 'POST':
            # POST — restricted to Admin or Suppliers
            serializer = ProductCreateUpdateSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                # Role Detection
                is_admin = request.user.is_staff or request.user.is_superuser or (
                    request.user.is_authenticated and request.user.role and request.user.role.name.lower() == 'admin'
                )

                # Auto-assign supplier ONLY if user is NOT admin and IS a supplier
                supplier_instance = None
                if not is_admin:
                    supplier_instance = getattr(request.user, 'supplier_profile', None) if request.user.is_authenticated else None
                    if not supplier_instance and request.user.is_authenticated and request.user.role:
                        if request.user.role.name.lower() == 'supplier':
                            from modules.company.models import Supplier
                            supplier_instance = Supplier.objects.filter(user=request.user).first()
                
                # Logic: If user is a supplier, ALWAYS force their own supplier profile.
                # If admin, use the supplied 'supplier' ID from request.data.
                assigned_supplier = None
                if supplier_instance:
                    assigned_supplier = supplier_instance
                elif request.data.get('supplier'):
                    assigned_supplier = request.data.get('supplier')

                product = serializer.save(supplier=assigned_supplier, created_by=request.user if request.user.is_authenticated else None)

                # If the product was created by a supplier user, mark as supplier-only
                # and DO NOT auto-initialize inventory records for it (supplier-only
                # products should not appear in stock lists).
                # Logic: If user is a supplier, check if they explicitly want to show to admin.
                # By default, supplier-added products are supplier-only.
                if supplier_instance:
                    # If 'is_supplier_only' was in request.data, it's already handled by the serializer.save() 
                    # if it was passed to serializer. However, we forced it to True here.
                    # Let's check if it was explicitly provided as false.
                    req_is_supplier_only = request.data.get('is_supplier_only')
                    if req_is_supplier_only is not None:
                        # Convert string 'true'/'false' from FormData if necessary
                        is_sop = str(req_is_supplier_only).lower() == 'true'
                        product.is_supplier_only = is_sop
                    else:
                        product.is_supplier_only = True
                        
                    product.save(update_fields=['is_supplier_only'])
                    initialize_inventory = False
                else:
                    initialize_inventory = True

                # Auto-initialize inventory record to ensure visibility in Stock Management
                if initialize_inventory:
                    try:
                        from modules.inventory.models import Warehouse, Inventory
                        # Find default warehouse or use the first available one
                        warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
                        if warehouse:
                            Inventory.objects.get_or_create(
                                product=product,
                                warehouse=warehouse,
                                defaults={
                                    'quantity_available': 0,
                                    'reorder_level': 5, # Reasonable default threshold
                                    'batch_number': 'INITIAL-LOG'
                                }
                            )
                    except Exception as inv_err:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Failed to auto-link product {product.name} to warehouse: {inv_err}")

                UserActivityLog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    action='create',
                    description=f'Created product: {product.name} and initialized stock tracking.'
                )
                return Response(
                    ProductSerializer(product, context={'request': request}).data, 
                    status=status.HTTP_201_CREATED
                )
            # PERSISTENT DEBUG LOGGING - DO NOT REMOVE UNTIL 400 IS FIXED
            print(f"DEBUG: Serializer Validation Errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        import traceback
        import logging
        from django.conf import settings
        
        logger = logging.getLogger(__name__)
        error_traceback = traceback.format_exc()
        
        # Log to server console/logs for developer visibility
        logger.error(f"Product API Error: {str(e)}")
        logger.error(error_traceback)
        
        return Response({
            'error': str(e),
            'message': 'An internal server error occurred while processing product data.',
            'traceback': error_traceback if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    """Retrieve, update, or delete a specific product."""
    product, err = get_or_404_response(Product, id=product_id)
    if err:
        return err

    if request.method == 'GET':
        # If public user or customer, block inactive products
        if not request.user.is_authenticated or (
            not request.user.is_staff and 
            not request.user.is_superuser and 
            not (getattr(request.user, 'role', None) and request.user.role.name in ['Admin', 'admin'])
        ):
            # If product is NOT active, hide it
            if product.status != 'active':
                return Response({'error': 'Product not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
                
        return Response(ProductSerializer(product, context={'request': request}).data)

    # Ownership Check for Modification/Deletion
    if request.user.is_authenticated:
        # Check if user is Admin
        is_admin = request.user.is_staff or request.user.is_superuser or (request.user.role and request.user.role.name.lower() in ['admin', 'owner'])
        
        # Check if user is Supplier owner
        is_owner = False
        if request.user.role and request.user.role.name.lower() == 'supplier':
            # Check if product belongs to this supplier
            is_owner = product.supplier and product.supplier.user == request.user
        
        if not is_admin and not is_owner:
            return Response({
                'error': 'Permission denied',
                'detail': 'You do not have permission to modify this product.'
            }, status=status.HTTP_403_FORBIDDEN)

    # if not request.user or not request.user.is_staff:
    #     return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            UserActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='update',
                description=f'Updated product: {product.name}'
            )
            return Response(ProductSerializer(product, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    product.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def list_categories(request):
    """List all categories (public) or create a new one."""
    if request.method == 'GET':
        categories = Category.objects.all()
        
        # Public users and customers only see active categories
        if not request.user.is_authenticated or (
            not request.user.is_staff and 
            not request.user.is_superuser and 
            not (getattr(request.user, 'role', None) and request.user.role.name in ['Admin', 'admin'])
        ):
            categories = categories.filter(status='active')
            
        return Response(CategorySerializer(categories, many=True).data)

    # POST
    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        category = serializer.save()
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def category_detail(request, category_id):
    """Retrieve, update, or delete a specific category."""
    category, err = get_or_404_response(Category, id=category_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(CategorySerializer(category).data)

    if request.method == 'PATCH':
        serializer = CategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CategorySerializer(category).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    category.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def adjust_stock(request, product_id):
    """Manually adjust stock upward or downward."""
    product, err = get_or_404_response(Product, id=product_id)
    if err:
        return err

    try:
        adjustment = int(request.data.get('adjustment', 0))
        # reason = request.data.get('reason', 'Manual Adjustment')
        
        product.quantity_in_stock += adjustment
        if product.quantity_in_stock < 0:
            product.quantity_in_stock = 0
            
        product.save()
        return Response(ProductSerializer(product).data)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid adjustment value'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def list_main_categories(request):
    """List all main categories or create a new one."""
    if request.method == 'GET':
        try:
            main_categories = MainCategory.objects.all().order_by('name')
            
            # Public users and customers only see active categories
            if not request.user.is_authenticated or (
                not request.user.is_staff and 
                not request.user.is_superuser and 
                not (getattr(request.user, 'role', None) and request.user.role.name in ['Admin', 'admin'])
            ):
                main_categories = main_categories.filter(status='active')
                
            serializer = MainCategorySerializer(main_categories, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"DEBUG: MainCategory API error: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': str(e),
                'message': 'Internal Server Error occurred during main category operation.',
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'POST':
        serializer = MainCategorySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            main_category = serializer.save()
            return Response(
                MainCategorySerializer(main_category, context={'request': request}).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def main_category_detail(request, m_category_id):
    """Retrieve, update, or delete a specific main category."""
    main_category, err = get_or_404_response(MainCategory, id=m_category_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(MainCategorySerializer(main_category, context={'request': request}).data)

    if request.method == 'PATCH':
        serializer = MainCategorySerializer(main_category, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(MainCategorySerializer(main_category, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    main_category.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
