from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, WishlistViewSet, CategoryViewSet, SupplierProductViewSet, MainCategoryViewSet

router = DefaultRouter()
router.register(r'items', ProductViewSet, basename='product')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'sections', MainCategoryViewSet, basename='main-category')
router.register(r'supplier-items', SupplierProductViewSet, basename='supplier-product')

urlpatterns = [
    path('', include(router.urls)),
]
