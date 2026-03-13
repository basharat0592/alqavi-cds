from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WarehouseViewSet, InventoryViewSet, InventoryMovementViewSet,
    BatchViewSet, StockAdjustmentViewSet, LowStockAlertViewSet
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet)
router.register(r'records', InventoryViewSet)
router.register(r'movements', InventoryMovementViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'adjustments', StockAdjustmentViewSet)
router.register(r'alerts', LowStockAlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
