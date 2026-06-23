from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, AreaViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='company-supplier')
router.register(r'areas', AreaViewSet, basename='company-area')

urlpatterns = [
    # Support for legacy /create/ suffix requested by frontend
    path('suppliers/create/', SupplierViewSet.as_view({'post': 'create'}), name='company-supplier-create-legacy'),
    path('', include(router.urls)),
]
