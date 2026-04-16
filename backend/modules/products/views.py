from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F, ExpressionWrapper, DecimalField, Q
from django.shortcuts import get_object_or_404
from .models import Product, Wishlist, Category
from .serializers import ProductSerializer, WishlistSerializer, CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.all().order_by('name')
        
        # 🔒 Strict Privacy Filter: If a user has a supplier profile, they ONLY see their own.
        # This ensures isolation even for staff accounts testing as suppliers.
        if hasattr(self.request.user, 'supplier_profile'):
            return qs.filter(supplier=self.request.user.supplier_profile)
        
        # 🔒 Partner restriction: Even without a profile, non-staff see nothing
        is_partner = self.request.user.is_authenticated and not (self.request.user.is_staff or self.request.user.is_superuser)
        if is_partner:
            # Partners without profiles should see an empty list for safety
            return qs.none()
        
        # Admin can filter by supplier, but 'all' or empty shows everything
        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id and supplier_id != 'all' and supplier_id != 'undefined':
            qs = qs.filter(supplier_id=supplier_id)
            
        return qs

    def perform_create(self, serializer):
        if self.request.user.is_authenticated and hasattr(self.request.user, 'supplier_profile'):
            serializer.save(supplier=self.request.user.supplier_profile)
        else:
            serializer.save()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        # Annotate with profit for ordering
        queryset = Product.objects.annotate(
            profit_amount=ExpressionWrapper(
                F('selling_price') - F('cost_price'),
                output_field=DecimalField()
            )
        )

        # 🔒 Strict Privacy Filter: If a user has a supplier profile, they ONLY see their own.
        if hasattr(self.request.user, 'supplier_profile'):
            queryset = queryset.filter(supplier=self.request.user.supplier_profile)
        
        # 🔒 Partner restriction: Even without a profile, non-staff see nothing
        is_partner = self.request.user.is_authenticated and not (self.request.user.is_staff or self.request.user.is_superuser)
        if is_partner and not hasattr(self.request.user, 'supplier_profile'):
            return queryset.none()

        # Advanced Filters
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        supplier = self.request.query_params.get('supplier')
        if supplier and supplier != 'all' and supplier != 'undefined':
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

    def perform_create(self, serializer):
        if self.request.user.is_authenticated and hasattr(self.request.user, 'supplier_profile'):
            # Automatically link to supplier and mark as B2B only
            serializer.save(
                supplier=self.request.user.supplier_profile,
                is_supplier_only=True,
                status='ACTIVE' # Ensure supplier products are ACTIVE by default in their catalog
            )
        else:
            serializer.save()


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = Wishlist.objects.all()
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add(self, request):
        product_id = request.data.get('product_id') or request.data.get('product')
        if not product_id:
            return Response({"error": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Avoid duplicates
        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user,
            product_id=product_id
        )
        return Response(WishlistSerializer(wishlist_item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def remove(self, request, pk=None):
        # Here pk is actually the product_id from the frontend
        deleted, _ = Wishlist.objects.filter(user=request.user, product_id=pk).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Wishlist item not found"}, status=status.HTTP_404_NOT_FOUND)
