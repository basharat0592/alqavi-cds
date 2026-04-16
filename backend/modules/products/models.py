from django.db import models
from core.models import BaseModel
from modules.inventory.models import Stock, Warehouse
from modules.supplier.models import Supplier
from django.conf import settings
from django.utils.text import slugify


class Category(BaseModel):
    """Product classification"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, related_name='categories', null=True, blank=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        unique_together = [['name', 'supplier'], ['slug', 'supplier']]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(BaseModel):
    """Catalog entry record"""
    BADGE_CHOICES = [
        ('NEW', 'New Arrival'),
        ('SALE', 'Flash Sale'),
        ('HOT', 'Hot'),
        ('BEST SELLER', 'Best Seller'),
        ('LIMITED', 'Limited Edition'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    
    # Auto-populated fields from Stock
    product_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    total_quantity = models.IntegerField(null=True, blank=True)

    # Core product fields
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    selling_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    batch = models.CharField(max_length=100, null=True, blank=True, help_text="Dynamic tag like 'SPECIALTY' or 'POPULAR'")
    badge = models.CharField(max_length=20, choices=BADGE_CHOICES, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    is_supplier_only = models.BooleanField(default=False, help_text="True if this is a B2B supplier product not yet active for retail")

    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.stock:
            # Auto-populate from linked stock entry
            if not self.product_name:
                self.product_name = self.stock.product_name
            if hasattr(self.stock, 'category'):
                self.category = self.stock.category
            if hasattr(self.stock, 'supplier'):
                self.supplier = self.stock.supplier
            if hasattr(self.stock, 'warehouse'):
                self.warehouse = self.stock.warehouse
            self.cost_price = self.stock.price_per_item
            
            # Note: total_quantity is managed separately on order creation.
            # We don't overwrite it here if it already exists and is just being updated.
            if self.pk is None and getattr(self, 'total_quantity', None) is None:
                self.total_quantity = self.stock.total_quantity
                
        super().save(*args, **kwargs)

    def __str__(self):
        return self.product_name


class Wishlist(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')

    class Meta:
        db_table = 'wishlists'
        verbose_name = 'Wishlist'
        verbose_name_plural = 'Wishlists'
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.username}'s wishlist: {self.product.product_name}"
