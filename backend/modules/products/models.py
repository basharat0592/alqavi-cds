from django.db import models
from core.models import BaseModel
from modules.inventory.models import Stock, Warehouse
from django.conf import settings
from django.utils.text import slugify


class MainCategory(BaseModel):
    """Broad product classification (e.g. Skin Care, Hair Care)"""
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'main_categories'
        verbose_name = 'Main Category'
        verbose_name_plural = 'Main Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Category(BaseModel):
    """Product classification (sub-category)"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    main_category = models.ForeignKey(MainCategory, on_delete=models.CASCADE, related_name='subcategories', null=True, blank=True)
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

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='products')
    
    # Auto-populated fields from Stock
    product_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    supplier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    total_quantity = models.IntegerField(null=True, blank=True)

    # Core product fields
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    selling_price = models.DecimalField(max_digits=15, decimal_places=2)
    batch = models.CharField(max_length=100, null=True, blank=True, help_text="Dynamic tag like 'SPECIALTY' or 'POPULAR'")
    badge = models.CharField(max_length=20, choices=BADGE_CHOICES, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

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
            self.category = self.stock.category
            self.supplier = self.stock.supplier
            self.warehouse = self.stock.warehouse
            self.cost_price = self.stock.price_per_item
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


class SupplierProduct(BaseModel):
    """Product catalog specific for suppliers before they are integrated into main catalog"""
    supplier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supplier_products')
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplier_products')
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    retail_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    quantity = models.IntegerField(default=0)
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True)
    barcode = models.CharField(max_length=100, null=True, blank=True)
    batch_number = models.CharField(max_length=100, null=True, blank=True)
    image = models.ImageField(upload_to='supplier_products/', null=True, blank=True)
    status = models.CharField(max_length=20, default='PENDING')

    class Meta:
        db_table = 'supplier_products'
        verbose_name = 'Supplier Product'
        verbose_name_plural = 'Supplier Products'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.supplier.username})"
