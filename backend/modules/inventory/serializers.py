from rest_framework import serializers
from .models import Warehouse, Stock, StockMovement
from modules.supplier.serializers import SupplierSerializer


class WarehouseSerializer(serializers.ModelSerializer):
    stock_count = serializers.SerializerMethodField()
    area_name = serializers.CharField(source='area.name', read_only=True, default=None)

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'location', 'area', 'area_name', 'is_active',
                  'tenant', 'stock_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'area_name', 'tenant', 'stock_count', 'created_at', 'updated_at']

    def get_stock_count(self, obj):
        # 1. Count unique products linked to the catalog
        catalog_count = obj.stocks.filter(product__isnull=False).values('product').distinct().count()
        # 2. Count unique products added manually (by name)
        manual_count = obj.stocks.filter(product__isnull=True).values('product_name').distinct().count()
        return catalog_count + manual_count


class StockSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    sku = serializers.ReadOnlyField(source='product.sku')
    barcode = serializers.ReadOnlyField(source='product.barcode')
    description = serializers.ReadOnlyField(source='product.description')
    product_image = serializers.SerializerMethodField()
    # Sale + cost price come from the matching Admin Product (repriced on each purchase).
    sale_price = serializers.SerializerMethodField()
    cost_price = serializers.SerializerMethodField()

    weight = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'product_name', 'product', 'category', 'category_name',
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name',
            'purchase_type', 'cartons', 'items_per_carton', 'total_quantity',
            'price_per_carton', 'price_per_item', 'sale_price', 'cost_price',
            'sku', 'barcode', 'description', 'product_image', 'date',
            'weight', 'size', 'tenant', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at', 'supplier_name', 'warehouse_name', 'category_name']

    def _admin_product(self, obj):
        # Cache the matching Admin Product on the instance to avoid repeat queries.
        if not hasattr(obj, '_cached_admin_product'):
            from modules.products.models import Product
            obj._cached_admin_product = Product.objects.filter(
                product_name__iexact=obj.product_name, warehouse=obj.warehouse, tenant_id=obj.tenant_id
            ).first()
        return obj._cached_admin_product

    def _latest_purchase_item(self, obj):
        # The most recent purchase-order line for this stock's product (by id = newest).
        if not hasattr(obj, '_cached_pitem'):
            from modules.sales.models import PurchaseOrderItem
            it = None
            try:
                if obj.product_id:
                    it = PurchaseOrderItem.objects.filter(product_id=obj.product_id).order_by('-id').first()
                if it is None and obj.product_name:
                    it = PurchaseOrderItem.objects.filter(product__name__iexact=obj.product_name).order_by('-id').first()
            except Exception:
                it = None
            obj._cached_pitem = it
        return obj._cached_pitem

    def get_sale_price(self, obj):
        it = self._latest_purchase_item(obj)
        try:
            if it and it.selling_price and float(it.selling_price) > 0:
                return float(it.selling_price)
        except Exception:
            pass
        p = self._admin_product(obj)
        try:
            return float(p.selling_price) if p and p.selling_price else None
        except Exception:
            return None

    def get_cost_price(self, obj):
        it = self._latest_purchase_item(obj)
        try:
            if it and it.price:
                return float(it.price)
        except Exception:
            pass
        return float(obj.price_per_item or 0)

    def get_weight(self, obj):
        if obj.weight: return obj.weight
        if obj.product and hasattr(obj.product, 'weight'): return obj.product.weight
        return ''

    def get_size(self, obj):
        if obj.size: return obj.size
        if obj.product and hasattr(obj.product, 'size'): return obj.product.size
        return ''

    def get_product_image(self, obj):
        from modules.products.models import SupplierProduct
        try:
            # Try matching by supplier product link first
            if hasattr(obj, 'supplier_product') and obj.supplier_product and obj.supplier_product.image:
                return obj.supplier_product.image.url
            # Fallback to name matching
            sp = SupplierProduct.objects.filter(name__iexact=obj.product_name).first()
            if sp and sp.image:
                return sp.image.url
        except:
            pass
        return None


class StockMovementSerializer(serializers.ModelSerializer):
    from_warehouse_name = serializers.ReadOnlyField(source='from_warehouse.name')
    to_warehouse_name = serializers.ReadOnlyField(source='to_warehouse.name')
    warehouse_name = serializers.ReadOnlyField(source='stock.warehouse.name')
    supplier_name = serializers.ReadOnlyField(source='stock.supplier.name')
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'warehouse_name', 'supplier_name', 'movement_type', 
            'movement_type_display', 'quantity', 'from_warehouse', 
            'from_warehouse_name', 'to_warehouse', 'to_warehouse_name', 
            'date', 'description', 'created_at'
        ]
