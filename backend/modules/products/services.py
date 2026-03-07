"""
Products module services containing business logic.
"""
from .models import Product, Category


def get_product_by_sku(sku):
    """
    Get a product by its SKU.
    
    Args:
        sku: Stock keeping unit
        
    Returns:
        Product: Product object or None
    """
    return Product.objects.filter(sku=sku).first()


def get_products_by_category(category_id):
    """
    Get all products in a category.
    
    Args:
        category_id: Category ID
        
    Returns:
        QuerySet: Products in the category
    """
    return Product.objects.filter(category_id=category_id, status='active')


def update_stock(product, quantity):
    """
    Update product stock level.
    
    Args:
        product: Product object
        quantity: Quantity to add/subtract
        
    Returns:
        Product: Updated product object
    """
    product.quantity_in_stock += quantity
    product.save()
    return product


def get_low_stock_products(threshold=10):
    """
    Get products with low stock.
    
    Args:
        threshold: Minimum stock level
        
    Returns:
        QuerySet: Products with low stock
    """
    return Product.objects.filter(
        quantity_in_stock__lte=threshold,
        status='active'
    )


def calculate_product_profit(product):
    """
    Calculate profit margin for a product.
    
    Args:
        product: Product object
        
    Returns:
        dict: Profit information
    """
    if product.cost == 0:
        margin_percent = 0
    else:
        margin_percent = ((product.price - product.cost) / product.cost) * 100
    
    return {
        'profit_per_unit': product.price - product.cost,
        'margin_percent': margin_percent
    }
