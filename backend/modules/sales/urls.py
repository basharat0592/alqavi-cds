from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PurchaseViewSet, SupplierDashboardViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'supplier/dashboard', SupplierDashboardViewSet, basename='supplier-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
