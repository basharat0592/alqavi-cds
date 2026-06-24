from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentViewSet, PaymentCategoryViewSet, TransactionPaymentViewSet,
    payment_stats, payments_due,
)

router = DefaultRouter()
router.register(r'transactions', PaymentViewSet, basename='payment')
router.register(r'categories', PaymentCategoryViewSet, basename='payment-category')
router.register(r'installments', TransactionPaymentViewSet, basename='installment')

urlpatterns = [
    path('stats/summary/', payment_stats, name='payment-stats'),
    path('due/', payments_due, name='payments-due'),
    path('', include(router.urls)),
]
