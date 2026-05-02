from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, PurchaseViewSet, SupplierDashboardViewSet, 
    PurchaseReturnViewSet, SaleReturnViewSet, track_order_by_id
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'returns', SaleReturnViewSet, basename='sale-return')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'purchase-returns', PurchaseReturnViewSet, basename='purchase-return')
router.register(r'supplier/dashboard', SupplierDashboardViewSet, basename='supplier-dashboard')

urlpatterns = [
    path('', include(router.urls)),
    # Customer-facing order tracking by ID
    path('track/<str:tracking_id>/', track_order_by_id, name='track-order'),
]
