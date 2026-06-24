from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, PurchaseViewSet, SupplierDashboardViewSet,
    PurchaseReturnViewSet, SaleReturnViewSet, track_order_by_id
)
from .reports import (
    report_by_area, report_by_user, report_statements, report_returns_summary,
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'returns', SaleReturnViewSet, basename='sale-return')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'purchase-returns', PurchaseReturnViewSet, basename='purchase-return')
router.register(r'supplier/dashboard', SupplierDashboardViewSet, basename='supplier-dashboard')

urlpatterns = [
    # Grouped analytics
    path('reports/by-area/', report_by_area, name='report-by-area'),
    path('reports/by-user/', report_by_user, name='report-by-user'),
    path('reports/statements/', report_statements, name='report-statements'),
    path('reports/returns-summary/', report_returns_summary, name='report-returns-summary'),

    path('', include(router.urls)),
    # Customer-facing order tracking by ID
    path('track/<str:tracking_id>/', track_order_by_id, name='track-order'),
]
