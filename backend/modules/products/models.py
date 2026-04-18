from django.db import models
from core.models import BaseModel
from modules.inventory.models import Stock, Warehouse
from modules.supplier.models import Supplier
from django.conf import settings
from django.utils.text import slugify


class MainCategory(BaseModel):
    """Broad product classification (e.g. Skin Care, Hair Care)"""
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    position = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    products = models.ManyToManyField('Product', related_name='sections', blank=True)
    
    class Meta:
        db_table = 'main_categories'
        verbose_name = 'Section'
        verbose_name_plural = 'Sections'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Category(BaseModel):
    """Product classification"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    main_category = models.ForeignKey(MainCategory, on_delete=models.CASCADE, related_name='categories', null=True)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(BaseModel):
    # ... (existing Product model)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='products')
    product_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    total_quantity = models.IntegerField(null=True, blank=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    selling_price = models.DecimalField(max_digits=15, decimal_places=2)
    batch = models.CharField(max_length=100, null=True, blank=True)
    badge = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(max_length=20, default='ACTIVE')

    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.stock:
            if not self.product_name:
                self.product_name = self.stock.product_name
            self.category = self.stock.category
            self.supplier = self.stock.supplier
            self.warehouse = self.stock.warehouse
            self.cost_price = self.stock.price_per_item
            self.total_quantity = self.stock.total_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return self.product_name


class SupplierProduct(BaseModel):
    """Products uploaded/maintained by suppliers"""
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True)
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='supplier_products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplier_products')
    
    image = models.ImageField(upload_to='supplier_products/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    # Matching DB schema exactly
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)
    retail_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)
    quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='ACTIVE')
    batch_number = models.CharField(max_length=100, null=True, blank=True)
    
    is_approved = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'supplier_products'
        verbose_name = 'Supplier Product'
        verbose_name_plural = 'Supplier Products'

    def __str__(self):
        return self.name

class Wishlist(BaseModel):
    user = models.ForeignKey('customer.Customer', on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')

    class Meta:
        db_table = 'wishlists'
        verbose_name = 'Wishlist'
        verbose_name_plural = 'Wishlists'
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.username}'s wishlist: {self.product.product_name}"
