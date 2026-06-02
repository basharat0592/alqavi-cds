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
    navbar_page = models.ForeignKey('cms.NavbarPage', on_delete=models.SET_NULL, related_name='categories', null=True, blank=True)
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
    total_quantity = models.IntegerField(null=True, blank=True) # Physical Stock
    reserved_quantity = models.IntegerField(default=0)          # Ordered but not delivered
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    selling_price = models.DecimalField(max_digits=15, decimal_places=2)
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True)
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True)
    batch = models.CharField(max_length=100, null=True, blank=True)
    badge = models.CharField(max_length=20, null=True, blank=True)
    weight = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, default='ACTIVE')

    @property
    def available_quantity(self):
        """Net stock visible to customers"""
        return max(0, (self.total_quantity or 0) - self.reserved_quantity)

    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.stock:
            if not self.product_name:
                self.product_name = self.stock.product_name
            if not self.category:
                self.category = self.stock.category
            if not self.supplier:
                self.supplier = self.stock.supplier
            if not self.warehouse:
                self.warehouse = self.stock.warehouse
            if not self.cost_price:
                self.cost_price = self.stock.price_per_item
            
            # Sync all metadata from linked stock
            if self.stock.product:
                if not self.sku: self.sku = self.stock.product.sku
                if not self.barcode: self.barcode = self.stock.product.barcode
                if not self.description: self.description = self.stock.product.description
            else:
                # Fallback to name matching if no direct link
                sp = SupplierProduct.objects.filter(name__iexact=self.product_name or self.stock.product_name).first()
                if sp:
                    if not self.sku: self.sku = sp.sku
                    if not self.barcode: self.barcode = sp.barcode
                    if not self.description: self.description = sp.description
            
            # Aggregate total quantity across ALL warehouses/batches for this product identity
            from django.db.models import Sum
            total = Stock.objects.filter(
                product_name__iexact=self.product_name or self.stock.product_name,
                price_per_item=self.cost_price or self.stock.price_per_item,
                weight=self.weight or self.stock.weight,
                size=self.size or self.stock.size
            ).aggregate(total=Sum('total_quantity'))['total'] or 0
            
            self.total_quantity = total
            
            # Sync weight and size from stock if not set
            if not self.weight: self.weight = self.stock.weight
            if not self.size: self.size = self.stock.size
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Ensure underlying stock record is also removed when a product is deleted"""
        if self.stock:
            stock = self.stock
            super().delete(*args, **kwargs)
            stock.delete()
        else:
            super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.product_name} ({self.total_quantity} units)"


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
    weight = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    
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
class ProductImage(BaseModel):
    """Gallery images for products"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='additional_images')
    image = models.ImageField(upload_to='product_gallery/')
    
    class Meta:
        db_table = 'product_images'
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'

    def __str__(self):
        return f"Image for {self.product.product_name}"
