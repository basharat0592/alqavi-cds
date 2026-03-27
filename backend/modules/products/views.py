"""
Products module API views with function-based approach.
"""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.pagination import PageNumberPagination
from .models import Product, Category, MainCategory
from .serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    CategorySerializer,
    MainCategorySerializer
)
from modules.users.models import UserActivityLog
from core.utils import get_or_404_response


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def list_products(request):
    """List all products or create a new one."""
    try:
        if request.method == 'GET':
            products = Product.objects.all().order_by('-created_at')
            
            # Supplier Isolation Logic: 
            # Suppliers only see their own products. 
            # Staff/Admins see all products.
            # Filter out inactive products for non-staff users
            if not request.user.is_authenticated:
                products = products.filter(status='active')
            else:
                is_privileged = request.user.is_staff or request.user.is_superuser or (
                    request.user.role and request.user.role.name in ['Admin', 'admin']
                )
                
                if not is_privileged:
                    if hasattr(request.user, 'supplier_profile') and request.user.supplier_profile:
                        # Suppliers see their own products (active or inactive)
                        products = products.filter(supplier=request.user.supplier_profile)
                    else:
                        # Customers or others hidden by default
                        products = products.filter(status='active')
            
            # Filtering
            search = request.query_params.get('search')
            category_name = request.query_params.get('category_name')
            supplier_id = request.query_params.get('supplier')
            
            if search:
                from django.db.models import Q
                products = products.filter(
                    Q(name__icontains=search) | Q(sku__icontains=search)
                )
            
            if category_name:
                products = products.filter(category__name=category_name)
                
            if supplier_id:
                products = products.filter(supplier_id=supplier_id)

            # Option to bypass pagination for merged local-storage pagination in frontend
            if request.query_params.get('all_items') == 'true':
                serializer = ProductSerializer(products, many=True, context={'request': request})
                return Response(serializer.data)

            paginator = PageNumberPagination()
            paginated_products = paginator.paginate_queryset(products, request)
            serializer = ProductSerializer(paginated_products, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        elif request.method == 'POST':
            # POST — allowed for anyone during development
            serializer = ProductCreateUpdateSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                product = serializer.save()
                
                # Auto-initialize inventory record to ensure visibility in Stock Management
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
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        import traceback
        print(f"DEBUG: Product API error: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': str(e),
            'message': 'Internal Server Error occurred during product operation.',
            'traceback': traceback.format_exc() if 'DEBUG' else None
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
            # Check if this user is the supplier (owner) of the product
            # If not owner AND product is NOT active, hide it
            is_owner = hasattr(request.user, 'supplier_profile') and product.supplier == request.user.supplier_profile
            
            if not is_owner and product.status != 'active':
                return Response({'error': 'Product not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
                
        return Response(ProductSerializer(product, context={'request': request}).data)

    # Ownership Check for Modification/Deletion
    if request.user.is_authenticated:
        is_admin = request.user.is_staff or request.user.is_superuser or (request.user.role and request.user.role.name == 'Admin')
        if not is_admin:
            if hasattr(request.user, 'supplier_profile') and request.user.supplier_profile:
                if product.supplier != request.user.supplier_profile:
                    return Response({
                        'error': 'Permission denied',
                        'detail': 'You can only manage your own products.'
                    }, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({
                    'error': 'Permission denied',
                    'detail': 'You do not have permission to modify products.'
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
