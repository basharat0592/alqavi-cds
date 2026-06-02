from rest_framework import serializers
from .models import SiteSettings, WebsiteSection, MediaAsset, NavigationMenu, NavigationItem, NavbarPage

class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = '__all__'

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'

    def to_internal_value(self, data):
        data_copy = data.copy()
        self._manual_images = {}
        
        # Handle images
        for field in ['logo', 'footer_logo', 'favicon', 'og_image']:
            if field in data_copy:
                val = data_copy[field]
                if val == "" or val is None:
                    data_copy[field] = None
                elif isinstance(val, str) and (val.startswith('http') or val.startswith('/media/') or '/media/' in val):
                    # Capture the path and remove from standard validation
                    if 'media/' in val:
                        self._manual_images[field] = val.split('media/')[-1]
                    data_copy.pop(field)
                
        # Handle empty or invalid URLs
        url_fields = ['google_maps_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'youtube_url', 'announcement_link']
        for field in url_fields:
            if field in data_copy:
                val = data_copy[field]
                if val == "" or (isinstance(val, str) and val.lower() in ["none", "null", "undefined"]):
                    data_copy[field] = None
                elif isinstance(val, str) and not val.startswith(('http://', 'https://', '/')):
                    data_copy[field] = None
                
        return super().to_internal_value(data_copy)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Apply manual images after standard update to ensure persistence
        if hasattr(self, '_manual_images') and self._manual_images:
            for field, path in self._manual_images.items():
                setattr(instance, field, path)
            instance.save()
        return instance

class WebsiteSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSection
        fields = '__all__'

class NavigationItemSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = NavigationItem
        fields = ['id', 'menu', 'title', 'url', 'order', 'parent', 'children']
        extra_kwargs = {'menu': {'required': False}}

    def get_children(self, obj):
        if obj.children.exists():
            return NavigationItemSerializer(obj.children.all(), many=True).data
        return []

class NavigationMenuSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = NavigationMenu
        fields = ['id', 'name', 'location', 'items']

    def get_items(self, obj):
        items = obj.items.filter(parent=None)
        return NavigationItemSerializer(items, many=True).data

class NavbarPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavbarPage
        fields = ['id', 'name', 'slug', 'description', 'icon_url', 'order', 'is_visible', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at']

