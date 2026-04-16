from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseViewSet, InventoryViewSet, InventoryMovementViewSet, StockViewSet

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'movements', InventoryMovementViewSet, basename='movement')
router.register(r'ledger', InventoryViewSet, basename='inventory-ledger')

# For backward compatibility with some frontend parts
router.register(r'records', InventoryViewSet, basename='inventory-records')

urlpatterns = [
    path('', include(router.urls)),
]
