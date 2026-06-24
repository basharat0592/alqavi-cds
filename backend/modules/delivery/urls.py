from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DeliveryPersonViewSet, my_deliveries, update_delivery_status

router = DefaultRouter()
router.register(r'persons', DeliveryPersonViewSet, basename='delivery-person')

urlpatterns = [
    # Rider self endpoints
    path('my-deliveries/', my_deliveries, name='my-deliveries'),
    path('orders/<str:order_id>/status/', update_delivery_status, name='delivery-update-status'),

    path('', include(router.urls)),
]
