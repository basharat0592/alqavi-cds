from rest_framework import serializers
from .models import SiteSettings, WebsiteSection, MediaAsset, NavigationMenu, NavigationItem

class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = '__all__'

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'

    def to_internal_value(self, data):
        # If image fields are provided as strings (URLs), remove them from validation
        # so they don't trigger "The submitted data was not a file" error.
        # This allows updating other settings while keeping existing images.
        data_copy = data.copy()
        for field in ['logo', 'footer_logo', 'favicon', 'og_image']:
            if field in data_copy and isinstance(data_copy[field], str):
                data_copy.pop(field)
        return super().to_internal_value(data_copy)

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

