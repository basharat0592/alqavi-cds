from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='company-supplier')

urlpatterns = [
    path('', include(router.urls)),
]
