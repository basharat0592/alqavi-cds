from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, AreaViewSet, CompanyViewSet, AccountGroupViewSet, LedgerAccountViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='company-supplier')
router.register(r'areas', AreaViewSet, basename='company-area')
router.register(r'companies', CompanyViewSet, basename='company-company')
router.register(r'account-groups', AccountGroupViewSet, basename='company-account-group')
router.register(r'ledger-accounts', LedgerAccountViewSet, basename='company-ledger-account')

urlpatterns = [
    # Support for legacy /create/ suffix requested by frontend
    path('suppliers/create/', SupplierViewSet.as_view({'post': 'create'}), name='company-supplier-create-legacy'),
    path('companies/create/', CompanyViewSet.as_view({'post': 'create'}), name='company-company-create-legacy'),
    path('', include(router.urls)),
]
