from django.db import models
import json

class SiteSettings(models.Model):
    """Global Website Branding, SEO, and Contact Info."""
    # Branding
    site_name = models.CharField(max_length=255, default="Al-Qavi Hub")
    logo = models.ImageField(upload_to='cms/branding/', blank=True, null=True)
    footer_logo = models.ImageField(upload_to='cms/branding/', blank=True, null=True)
    favicon = models.ImageField(upload_to='cms/branding/', blank=True, null=True)
    primary_color = models.CharField(max_length=20, default="#c45500")
    secondary_color = models.CharField(max_length=20, default="#111c31")

    # Announcement
    show_announcement = models.BooleanField(default=True)
    announcement_text = models.CharField(max_length=255, default="Free Delivery on all orders over Rs. 5000!")
    announcement_link = models.CharField(max_length=255, blank=True, null=True)

    # Contact & Business Info
    whatsapp_number = models.CharField(max_length=20, default="+923000000000")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    contact_email = models.EmailField(default="info@alqavihub.com")
    address = models.TextField(blank=True, null=True)
    google_maps_url = models.TextField(blank=True, null=True)

    # Social Links
    instagram_url = models.URLField(blank=True, null=True)
    facebook_url = models.URLField(blank=True, null=True)
    tiktok_url = models.URLField(blank=True, null=True)
    youtube_url = models.URLField(blank=True, null=True)

    # SEO Settings
    meta_title = models.CharField(max_length=255, default="Al-Qavi Hub | Luxury Cosmetics")
    meta_description = models.TextField(blank=True, null=True)
    meta_keywords = models.TextField(blank=True, null=True)
    og_image = models.ImageField(upload_to='cms/seo/', blank=True, null=True)

    # Analytics
    google_analytics_id = models.CharField(max_length=50, blank=True, null=True)
    pixel_id = models.CharField(max_length=50, blank=True, null=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Global Site Settings"

class WebsiteSection(models.Model):
    """Dynamic Landing Page Sections."""
    SECTION_TYPES = [
        ('hero', 'Hero Slider / Banner'),
        ('products', 'Product Grid'),
        ('categories', 'Category Showcase'),
        ('about', 'About Us / Text Block'),
        ('testimonials', 'Customer Reviews'),
        ('faq', 'FAQ Accordion'),
        ('newsletter', 'Newsletter Signup'),
        ('gallery', 'Media Gallery'),
        ('video', 'Video Section'),
        ('promotion', 'Promotional Banner'),
    ]
    
    name = models.CharField(max_length=255, help_text="Internal name for admin identification")
    section_type = models.CharField(max_length=50, choices=SECTION_TYPES)
    content = models.JSONField(default=dict, help_text="Stores all settings, text, and media IDs for this section")
    order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['order']

class MediaAsset(models.Model):
    """Central Media Library."""
    file = models.FileField(upload_to='cms/media/', max_length=500)
    file_type = models.CharField(max_length=20, choices=[('image', 'Image'), ('video', 'Video')])
    alt_text = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class NavigationMenu(models.Model):
    """Header and Footer Menu Management."""
    LOCATION_CHOICES = [('header', 'Header Main Menu'), ('footer_1', 'Footer Quick Links'), ('footer_2', 'Footer Customer Care')]
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    
    def __str__(self):
        return f"{self.name} ({self.location})"

class NavigationItem(models.Model):
    menu = models.ForeignKey(NavigationMenu, related_name='items', on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    parent = models.ForeignKey('self', blank=True, null=True, related_name='children', on_delete=models.CASCADE)

    class Meta:
        ordering = ['order']
