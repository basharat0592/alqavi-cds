"""
Products module models.
"""
from django.db import models
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin


class Category(BaseModel, StatusMixin, TimestampMixin):
    """
    Product category model.
    
    Attributes:
        name: Category name
        description: Category description
        slug: URL-safe identifier
        image: Category image
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(unique=True)
    image = models.ImageField(upload_to='categories/', blank=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
        ]
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name


class Product(BaseModel, StatusMixin, TimestampMixin):
    """
    Product model.
    
    Attributes:
        name: Product name
        description: Product description
        category: Product category
        sku: Stock keeping unit
        price: Product price
        cost: Cost to produce/acquire
        quantity_in_stock: Available quantity
        image: Product image
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products'
    )
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True, null=True, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retail_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity_in_stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True)
    packaging = models.CharField(max_length=100, default='Piece', help_text="e.g. Unit, Pack, Box, Carton")
    pack_size = models.IntegerField(default=1, help_text="Number of items per pack")
    company_category = models.ForeignKey(
        'company.CompanyCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Origin Category'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.name
    
    def is_in_stock(self):
        """Check if product is in stock."""
        return self.quantity_in_stock > 0


class ProductImage(BaseModel, TimestampMixin):
    """
    Model for storing multiple images for a single product.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='additional_images'
    )
    image = models.ImageField(upload_to='products/additional/')
    is_feature = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Image for {self.product.name}"
