from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import SiteSettings, WebsiteSection, MediaAsset, NavigationMenu, NavigationItem
from .serializers import (
    SiteSettingsSerializer, WebsiteSectionSerializer, MediaAssetSerializer,
    NavigationMenuSerializer, NavigationItemSerializer
)

class CmsConfigViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ['get_full_site_state']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def get_full_site_state(self, request):
        settings = SiteSettings.objects.first()
        sections = WebsiteSection.objects.all().order_by('order')
        menus = NavigationMenu.objects.all()
        return Response({
            "settings": SiteSettingsSerializer(settings).data if settings else {},
            "sections": WebsiteSectionSerializer(sections, many=True).data,
            "menus": NavigationMenuSerializer(menus, many=True).data
        })

    @action(detail=False, methods=['patch'])
    def update_settings(self, request):
        settings, _ = SiteSettings.objects.get_or_create(id=1)
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def upload_branding(self, request):
        settings, _ = SiteSettings.objects.get_or_create(id=1)
        field = request.data.get('field')
        file = request.FILES.get('file')
        allowed = ['logo', 'favicon', 'footer_logo', 'og_image']
        if field not in allowed:
            return Response({'error': 'Invalid field'}, status=400)
        setattr(settings, field, file)
        settings.save()
        serializer = SiteSettingsSerializer(settings)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def submit_review(self, request):
        name = request.data.get('name', 'Anonymous')
        rating = request.data.get('rating', 5)
        text = request.data.get('text', '')
        
        # Trigger System Notification via Activity Log
        from modules.users.models import UserActivityLog
        UserActivityLog.objects.create(
            user=None, # Unauthenticated Guest Action
            action='other',
            description=f"New Customer Review: {name} gave {rating} Stars. \"{text[:60]}...\"",
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            "status": "success", 
            "message": "Review submitted and admin notified."
        })

class WebsiteSectionViewSet(viewsets.ModelViewSet):
    queryset = WebsiteSection.objects.all().order_by('order')
    serializer_class = WebsiteSectionSerializer
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
    pagination_class = None


class NavigationMenuViewSet(viewsets.ModelViewSet):
    queryset = NavigationMenu.objects.all()
    serializer_class = NavigationMenuSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class NavigationItemViewSet(viewsets.ModelViewSet):
    queryset = NavigationItem.objects.all()
    serializer_class = NavigationItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
