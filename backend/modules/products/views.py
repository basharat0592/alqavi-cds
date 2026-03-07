"""
Products module API views with function-based approach.
"""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
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
    if request.method == 'GET':
        products = Product.objects.all()
        return Response(ProductSerializer(products, many=True).data)

    # POST — admin only
    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ProductCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def product_detail(request, product_id):
    """Retrieve, update, or delete a specific product."""
    product, err = get_or_404_response(Product, id=product_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(ProductSerializer(product).data)

    if not request.user or not request.user.is_staff:
        return Response({'error': 'Admin permissions required'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ProductSerializer(product).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    product.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def list_categories(request):
    """List all active categories."""
    categories = Category.objects.filter(status='active')
    return Response(CategorySerializer(categories, many=True).data)
