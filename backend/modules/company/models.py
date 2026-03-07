"""
Company module models - stores company/business information.
"""
from django.db import models


class CompanyCategory(models.Model):
    """
    Model for company categories (e.g., Local, Imported, Pakistan, India).
    """
    TYPE_CHOICES = [
        ('local', 'Local'),
        ('imported', 'Imported'),
    ]

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='local')
    country = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default='emerald')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Company Category'
        verbose_name_plural = 'Company Categories'

    def __str__(self):
        return self.name


class Company(models.Model):
    """
    Company model to store business information.
    Only one record is expected (singleton pattern).
    """
    name = models.CharField(max_length=255, verbose_name='Company Name')
    category = models.ForeignKey(
        CompanyCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies',
        verbose_name='Company Category'
    )
    tagline = models.CharField(max_length=255, blank=True, verbose_name='Tagline / Slogan')
    email = models.EmailField(blank=True, verbose_name='Email Address')
    phone = models.CharField(max_length=50, blank=True, verbose_name='Phone Number')
    whatsapp = models.CharField(max_length=50, blank=True, verbose_name='WhatsApp Number')
    address = models.TextField(blank=True, verbose_name='Address')
    city = models.CharField(max_length=100, blank=True, verbose_name='City')
    country = models.CharField(max_length=100, blank=True, default='Pakistan', verbose_name='Country')
    website = models.URLField(blank=True, verbose_name='Website URL')
    logo = models.ImageField(upload_to='company/', blank=True, null=True, verbose_name='Logo')
    description = models.TextField(blank=True, verbose_name='About / Description')
    facebook = models.URLField(blank=True, verbose_name='Facebook URL')
    instagram = models.URLField(blank=True, verbose_name='Instagram URL')
    twitter = models.URLField(blank=True, verbose_name='Twitter / X URL')
    currency = models.CharField(max_length=10, default='PKR', verbose_name='Currency')
    tax_number = models.CharField(max_length=100, blank=True, verbose_name='Tax / NTN Number')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Company'

    def __str__(self):
        return self.name
