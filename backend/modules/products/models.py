"""
Products module models.
"""
from django.db import models
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin


class Category(BaseModel, StatusMixin):
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
    slug = models.SlugField(unique=True, blank=True, null=True)
    image = models.FileField(upload_to='categories/', blank=True)
    main_category = models.ForeignKey(
        'MainCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sub_categories'
    )
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
        ]
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name


class Product(BaseModel, StatusMixin):
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
    sku = models.CharField(max_length=100, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retail_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity_in_stock = models.IntegerField(default=0)
    image = models.FileField(upload_to='products/', blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusMixin.STATUS_CHOICES,
        default='pending_procurement'
    )
    company_category = models.ForeignKey(
        'company.CompanyCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Origin / Vendor Category'
    )
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Manufacturing Company'
    )
    supplier = models.ForeignKey(
        'company.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Strategic Supplier'
    )
    # Marks products that were added by suppliers from their dashboard.
    # Supplier-only products should not appear in admin product lists or stock views
    # unless explicitly requested (e.g. when creating a Purchase Order).
    is_supplier_only = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products_created'
    )

    
    class Meta:
        ordering = ['-created_at']
        unique_together = (('sku', 'is_supplier_only'), ('barcode', 'is_supplier_only'))
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['is_supplier_only']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.name
    
    def is_in_stock(self):
        """Check if product is in stock."""
        return self.quantity_in_stock > 0


class ProductGallery(BaseModel, TimestampMixin):
    """
    Model for storing additional images for a single product.
    Using a fresh name to avoid database tablespace conflicts.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='gallery'
    )
    image = models.FileField(upload_to='products/gallery/')
    is_feature = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Gallery {self.id} for {self.product.name}"


class MainCategory(BaseModel, StatusMixin):
    """
    Main Category model for grouping products into top-level sections.
    
    Attributes:
        name: Main category name
        description: Category description
        slug: URL-safe identifier
        image: Category image
        products: Many-to-Many relationship with Product
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(unique=True, blank=True, null=True)
    image = models.FileField(upload_to='main_categories/', blank=True)
    products = models.ManyToManyField(Product, related_name='main_categories', blank=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
        ]
        verbose_name_plural = 'Main Categories'

    def __str__(self):
        return self.name
class Wishlist(BaseModel):
    """
    Model for storing user's saved/wishlisted products.
    """
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='wishlist'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by'
    )
    
    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'product']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"
