from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, WishlistViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'items', ProductViewSet, basename='product')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
