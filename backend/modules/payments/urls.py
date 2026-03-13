from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'payments'

router = DefaultRouter()
router.register('categories', views.PaymentCategoryViewSet, basename='payment-category')
router.register('transactions', views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/summary/', views.payment_stats, name='payment-stats'),
]
