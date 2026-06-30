from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PaymentViewSet, PaymentCategoryViewSet, payment_stats

router = DefaultRouter()
router.register(r'transactions', PaymentViewSet, basename='payment')
router.register(r'categories', PaymentCategoryViewSet, basename='payment-category')

urlpatterns = [
    path('stats/summary/', payment_stats, name='payment-stats'),
    path('', include(router.urls)),
]
