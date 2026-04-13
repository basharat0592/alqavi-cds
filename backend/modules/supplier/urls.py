from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')

urlpatterns = [
    # Support for legacy /create/ suffix if needed by frontend
    path('suppliers/create/', SupplierViewSet.as_view({'post': 'create'}), name='supplier-create-legacy'),
    path('', include(router.urls)),
]
