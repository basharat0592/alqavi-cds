from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CmsConfigViewSet, WebsiteSectionViewSet, MediaAssetViewSet, NavigationMenuViewSet, NavigationItemViewSet

router = DefaultRouter()
router.register(r'config', CmsConfigViewSet, basename='cms-config')
router.register(r'sections', WebsiteSectionViewSet, basename='cms-sections')
router.register(r'media', MediaAssetViewSet, basename='cms-media')
router.register(r'menus', NavigationMenuViewSet, basename='cms-menus')
router.register(r'nav-items', NavigationItemViewSet, basename='cms-nav-items')

urlpatterns = [
    path('', include(router.urls)),
]
