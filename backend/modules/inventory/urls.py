from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseViewSet, StockViewSet, public_branches

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'stocks', StockViewSet, basename='stock')

# For backward compatibility with some frontend parts that might still call 'records'
router.register(r'records', StockViewSet, basename='inventory-records')

urlpatterns = [
    # Public storefront branch picker (no auth).
    path('public-branches/', public_branches, name='public-branches'),
    path('', include(router.urls)),
]
