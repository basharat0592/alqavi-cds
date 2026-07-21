from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DeliveryPersonViewSet, my_deliveries, update_delivery_status, change_my_password, accept_order, upload_delivery_proof

router = DefaultRouter()
router.register(r'persons', DeliveryPersonViewSet, basename='delivery-person')

urlpatterns = [
    # Rider self endpoints
    path('my-deliveries/', my_deliveries, name='my-deliveries'),
    path('orders/<str:order_id>/accept/', accept_order, name='delivery-accept-order'),
    path('orders/<str:order_id>/status/', update_delivery_status, name='delivery-update-status'),
    path('orders/<str:order_id>/proof/', upload_delivery_proof, name='delivery-upload-proof'),
    path('change-password/', change_my_password, name='delivery-change-password'),

    path('', include(router.urls)),
]
