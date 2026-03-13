"""
Products module API views with function-based approach.
"""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from .models import Product, Category
from .serializers import (
    ProductSerializer,
    ProductCreateUpdateSerializer,
    CategorySerializer
)
from core.utils import get_or_404_response


@api_view(['GET', 'POST'])
def list_products(request):
    """List all products or create a new one."""
    try:
        if request.method == 'GET':
            products = Product.objects.all().order_by('-created_at')
            
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

            # Option to bypass pagination for merged local-storage pagination in frontend
            if request.query_params.get('all_items') == 'true':
                serializer = ProductSerializer(products, many=True, context={'request': request})
                return Response(serializer.data)

            paginator = PageNumberPagination()
            paginated_products = paginator.paginate_queryset(products, request)
            serializer = ProductSerializer(paginated_products, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # POST — admin only
    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ProductCreateUpdateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def product_detail(request, product_id):
    """Retrieve, update, or delete a specific product."""
    product, err = get_or_404_response(Product, id=product_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(ProductSerializer(product, context={'request': request}).data)

    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(ProductSerializer(product, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    product.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_categories(request):
    """List all categories or create a new one."""
    if request.method == 'GET':
        categories = Category.objects.all()
        return Response(CategorySerializer(categories, many=True).data)

    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        category = serializer.save()
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def category_detail(request, category_id):
    """Retrieve, update, or delete a specific category."""
    category, err = get_or_404_response(Category, id=category_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(CategorySerializer(category).data)

    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

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
