from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from core.scoping import is_platform_operator
from .models import SiteSettings, WebsiteSection, MediaAsset, NavigationMenu, NavigationItem, NavbarPage
from .serializers import (
    SiteSettingsSerializer, WebsiteSectionSerializer, MediaAssetSerializer,
    NavigationMenuSerializer, NavigationItemSerializer, NavbarPageSerializer
)


def _storefront_event_tenants(request):
    """Resolve which Admin (tenant) a branch-less storefront event — a newsletter
    signup or a customer review — belongs to, from the branch/city the shopper is
    currently browsing.

    The storefront is a single shared multi-city site, so these events carry no
    branch of their own. The client sends the active ``branch`` (warehouse id) or,
    failing that, the active ``city`` (Area name from ``deliver_to_city``). We map
    that to the owning Admin(s) so each branch admin only sees signups from their
    own city/branch. A city with more than one branch resolves to every tenant
    serving it. Returns a de-duplicated list of tenant ids (empty = unresolved →
    the caller records a global/super-admin-only event)."""
    from modules.inventory.models import Warehouse
    qs = Warehouse.objects.filter(is_active=True, tenant__isnull=False)
    branch = request.data.get('branch') or request.data.get('warehouse')
    if branch:
        tids = list(qs.filter(id=branch).values_list('tenant_id', flat=True))
        if tids:
            return list(dict.fromkeys(tids))
    city = (request.data.get('city') or '').strip()
    if city:
        tids = list(qs.filter(area__name__iexact=city).values_list('tenant_id', flat=True))
        return list(dict.fromkeys(tids))
    return []


def _fanout_storefront_log(request, description):
    """Record a guest storefront activity log, one row per resolved tenant so each
    branch admin sees only their own city/branch's signups. When the tenant can't
    be resolved (no active branch/city sent) a single NULL-tenant row is written —
    a global event visible only to the super admin."""
    from modules.users.models import UserActivityLog
    ip = request.META.get('REMOTE_ADDR')
    ua = request.META.get('HTTP_USER_AGENT', '')
    tenants = _storefront_event_tenants(request)
    if not tenants:
        UserActivityLog.objects.create(
            user=None, action='other', description=description,
            ip_address=ip, user_agent=ua,
        )
        return
    for tid in tenants:
        UserActivityLog.objects.create(
            user=None, action='other', description=description,
            ip_address=ip, user_agent=ua, tenant_id=tid,
        )


class ReadOnlyOrPlatformOperator(BasePermission):
    """Reads (safe methods) allowed for any authenticated user; writes restricted
    to the platform operator (super admin). The CMS/storefront is a single global
    site, so writes must never be performed by tenant admins."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_platform_operator(request.user)

class CmsConfigViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ['get_full_site_state', 'submit_review', 'subscribe_newsletter']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def get_full_site_state(self, request):
        settings = SiteSettings.objects.filter(id=1).first() or SiteSettings.objects.first()
        
        # Self-healing for branding images (on-the-fly path correction)
        if settings:
            import os
            from django.conf import settings as django_settings
            fields = ['logo', 'favicon', 'footer_logo', 'og_image']
            modified = False
            for f in fields:
                val = getattr(settings, f)
                if val and hasattr(val, 'name') and val.name:
                    path = val.name
                    # If it's just a filename without a folder prefix, try to find it
                    if '/' not in path:
                        for root, dirs, files in os.walk(django_settings.MEDIA_ROOT):
                            if path in files:
                                rel = os.path.relpath(os.path.join(root, path), django_settings.MEDIA_ROOT).replace('\\', '/')
                                setattr(settings, f, rel)
                                modified = True
                                break
            if modified:
                settings.save()

        sections = WebsiteSection.objects.all().order_by('order')
        menus = NavigationMenu.objects.all()
        navbar_pages = NavbarPage.objects.filter(is_visible=True).order_by('order')
        return Response({
            "settings": SiteSettingsSerializer(settings, context={'request': request}).data if settings else {},
            "sections": WebsiteSectionSerializer(sections, many=True, context={'request': request}).data,
            "menus": NavigationMenuSerializer(menus, many=True, context={'request': request}).data,
            "navbar_pages": NavbarPageSerializer(navbar_pages, many=True, context={'request': request}).data
        })

    @action(detail=False, methods=['patch'])
    def update_settings(self, request):
        if not is_platform_operator(request.user):
            return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
        settings, _ = SiteSettings.objects.get_or_create(id=1)
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def upload_branding(self, request):
        if not is_platform_operator(request.user):
            return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
        settings, _ = SiteSettings.objects.get_or_create(id=1)
        field = request.data.get('field')
        file = request.FILES.get('file')
        allowed = ['logo', 'favicon', 'footer_logo', 'og_image']
        if field not in allowed:
            return Response({'error': 'Invalid field'}, status=400)
        setattr(settings, field, file)
        settings.save()
        serializer = SiteSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def submit_review(self, request):
        name = request.data.get('name', 'Anonymous')
        rating = request.data.get('rating', 5)
        text = request.data.get('text', '')
        
        # Trigger System Notification via Activity Log — routed to the branch
        # admin(s) of the city/branch the shopper is browsing.
        from modules.users.models import UserActivityLog
        desc = f"New Customer Review: {name} gave {rating} Stars. \"{text[:60]}...\""
        _fanout_storefront_log(request, desc)

        return Response({
            "status": "success",
            "message": "Review submitted and admin notified."
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def subscribe_newsletter(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        
        # Trigger System Notification via Activity Log — routed to the branch
        # admin(s) of the city/branch the shopper is browsing.
        _fanout_storefront_log(request, f"Newsletter: {email}")

        return Response({
            "status": "success",
            "message": "Subscribed successfully and admin notified."
        })

class WebsiteSectionViewSet(viewsets.ModelViewSet):
    queryset = WebsiteSection.objects.all().order_by('order')
    serializer_class = WebsiteSectionSerializer
    permission_classes = [ReadOnlyOrPlatformOperator]
    pagination_class = None

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        orders = request.data.get('orders', [])
        for item in orders:
            WebsiteSection.objects.filter(id=item['id']).update(order=item['order'])
        return Response({"status": "reordered"})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        original.pk = None
        original.name = f"{original.name} (Copy)"
        original.order = WebsiteSection.objects.count() + 1
        original.save()
        return Response(WebsiteSectionSerializer(original).data, status=status.HTTP_201_CREATED)


class MediaAssetViewSet(viewsets.ModelViewSet):
    queryset = MediaAsset.objects.all().order_by('-created_at')
    serializer_class = MediaAssetSerializer
    permission_classes = [ReadOnlyOrPlatformOperator]
    pagination_class = None


class NavigationMenuViewSet(viewsets.ModelViewSet):
    queryset = NavigationMenu.objects.all()
    serializer_class = NavigationMenuSerializer
    permission_classes = [ReadOnlyOrPlatformOperator]
    pagination_class = None


class NavigationItemViewSet(viewsets.ModelViewSet):
    queryset = NavigationItem.objects.all()
    serializer_class = NavigationItemSerializer
    permission_classes = [ReadOnlyOrPlatformOperator]
    pagination_class = None

class NavbarPageViewSet(viewsets.ModelViewSet):
    queryset = NavbarPage.objects.all().order_by('order')
    serializer_class = NavbarPageSerializer
    permission_classes = [ReadOnlyOrPlatformOperator]
    pagination_class = None

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        orders = request.data.get('orders', [])
        for item in orders:
            NavbarPage.objects.filter(id=item['id']).update(order=item['order'])
        return Response({"status": "reordered"})

    @action(detail=False, methods=['get'])
    def get_categories_count(self, request):
        """Get count of categories for each navbar page"""
        navbar_pages = NavbarPage.objects.all()
        data = []
        for page in navbar_pages:
            try:
                from modules.products.models import Category
                count = Category.objects.filter(navbar_page=page).count()
                data.append({'id': page.id, 'name': page.name, 'categories_count': count})
            except:
                data.append({'id': page.id, 'name': page.name, 'categories_count': 0})
        return Response(data)
