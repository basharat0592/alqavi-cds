from django.urls import path, include
from rest_framework.routers import DefaultRouter
from modules.supplier.views import SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='company-suppliers')

urlpatterns = [
    path('', include(router.urls)),
]
