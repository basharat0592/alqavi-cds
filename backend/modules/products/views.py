from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F, ExpressionWrapper, DecimalField, Q, Sum
from .models import Product, Wishlist, Category, SupplierProduct, MainCategory, ProductImage, StoreProduct, ProductBatch
from .serializers import (
    ProductSerializer, WishlistSerializer, CategorySerializer,
    SupplierProductSerializer, MainCategorySerializer, StoreProductSerializer
)
from core.permissions import HasModulePermission
from core.scoping import (
    is_unscoped_admin, BranchScopedQuerysetMixin,
    scope_to_tenant, tenant_id_for,
)


# The legacy system typed '-' (or '.', '0') for "no bar code"; those are not codes.
BARCODE_PLACEHOLDERS = {'-', '--', '.', '0', '00', 'na', 'n/a', 'none', 'nil'}


def clean_barcode(v):
    code = str(v or '').strip()
    return None if not code or code.lower() in BARCODE_PLACEHOLDERS else code[:100]


class IsSuperAdmin(permissions.BasePermission):
    """Allow only global Super Admins (they manage the cross-branch store catalog)."""
    message = 'Super Admin only.'

    def has_permission(self, request, view):
        return is_unscoped_admin(getattr(request, 'user', None))


class CategoryViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None
    # Tenant is THE isolation axis: each Admin sees only their own categories;
    # the storefront/suppliers/super-admin (tenant_id_for -> None) see all.
    tenant_field = 'tenant'
    shadow_safe = True  # storefront/portal users may read the category list

    def perform_create(self, serializer):
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class MainCategoryViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MainCategory.objects.all().order_by('name')
    serializer_class = MainCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'
    pagination_class = None
    tenant_field = 'tenant'
    shadow_safe = True  # storefront/portal users may read the sections list

    def perform_create(self, serializer):
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class ProductViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    # Branch admins only see products in their assigned warehouse(s). Super admins,
    # customers and storefront guests are unscoped (helper returns None for them).
    branch_field = 'warehouse'
    # Tenant is THE isolation axis. The admin list shows only the logged-in
    # Admin's products; the anonymous storefront list is unscoped (tenant_id_for
    # -> None makes scope_to_tenant a no-op) so it still shows every tenant.
    tenant_field = 'tenant'
    shadow_safe = True  # public storefront catalog (anon + logged-in shoppers)
    queryset = Product.objects.exclude(status='ARCHIVED').order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'products'

    def create(self, request, *args, **kwargs):
        # Turn DB uniqueness collisions into a clean message instead of a raw 500.
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            msg = str(e).lower()
            if 'barcode' in msg:
                detail = 'A product with this barcode already exists in this branch.'
            elif 'sku' in msg:
                detail = 'A product with this SKU already exists in this branch.'
            else:
                detail = 'This product conflicts with an existing one (duplicate value).'
            return Response({'error': detail}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        """Merge into an existing product ONLY when it is the same item in the SAME
        branch — same name, price, size, weight AND warehouse. Different branches
        keep their own rows (each admin sees only their products); the storefront
        deduplicates across branches at display time. Size/weight fall back to the
        linked stock when not supplied.
        """
        tenant_id = tenant_id_for(self.request.user)
        stock_obj = serializer.validated_data.get('stock')
        name = serializer.validated_data.get('product_name') or (getattr(stock_obj, 'product_name', None) if stock_obj else None)
        price = serializer.validated_data.get('selling_price')
        weight = serializer.validated_data.get('weight') or (getattr(stock_obj, 'weight', None) if stock_obj else None)
        size = serializer.validated_data.get('size') or (getattr(stock_obj, 'size', None) if stock_obj else None)
        warehouse_id = getattr(stock_obj, 'warehouse_id', None) if stock_obj else None

        # Match on tenant too, so two Admins' identically-named products do not
        # merge into a single shared row.
        existing = Product.objects.filter(
            product_name=name, selling_price=price, weight=weight, size=size,
            warehouse_id=warehouse_id, tenant_id=tenant_id,
        ).first()

        if existing:
            # Same item, same branch -> merge quantities, keep ONE row for this branch.
            added_qty = serializer.validated_data.get('total_quantity', 0)
            existing.total_quantity = F('total_quantity') + added_qty
            existing.category = serializer.validated_data.get('category', existing.category)
            existing.cost_price = serializer.validated_data.get('cost_price', existing.cost_price)
            existing.stock = stock_obj or existing.stock
            existing.badge = serializer.validated_data.get('badge', existing.badge)
            existing.status = serializer.validated_data.get('status', existing.status)
            existing.description = serializer.validated_data.get('description', existing.description)

            existing.save()
            serializer.instance = existing  # Link to serializer for response serialization
            return existing

        # New unique listing. Stamp the owning Admin (tenant); anonymous/storefront
        # create paths leave tenant = None (tenant_id_for(anon) -> None).
        instance = serializer.save(tenant_id=tenant_id)

        # Handle additional images
        additional_images = self.request.FILES.getlist('additional_images')
        for img in additional_images:
            ProductImage.objects.create(product=instance, image=img)
            
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Handle new additional images (append to existing)
        additional_images = self.request.FILES.getlist('additional_images')
        for img in additional_images:
            ProductImage.objects.create(product=instance, image=img)

    def get_queryset(self):
        queryset = Product.objects.exclude(status='ARCHIVED').annotate(
            profit_amount=ExpressionWrapper(
                F('selling_price') - F('cost_price'),
                output_field=DecimalField()
            )
        )

        # Basic status filter
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status.upper())

        # Advanced Filters
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(product_name__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(category__name__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering')
        if ordering == 'profit':
            queryset = queryset.order_by('-profit_amount')
        elif ordering == 'price_low':
            queryset = queryset.order_by('selling_price')
        elif ordering == 'price_high':
            queryset = queryset.order_by('-selling_price')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    @action(detail=False, methods=['get'])
    def stock_list(self, request):
        """Available stock for the Trade 1.0 Find Product window: one row per
        in-stock batch (PID, Category, Product, Pack, Expiry, Qty, TP, Retail,
        Company). Filters: ?company=<company id>, ?q=<name/code>, ?barcode=."""
        qs = self.get_queryset().filter(status='ACTIVE')
        company = (request.query_params.get('company') or '').strip()
        q = (request.query_params.get('q') or '').strip()
        barcode = (request.query_params.get('barcode') or '').strip()
        if company:
            qs = qs.filter(stock__product__company_id=company)
        if q:
            qs = qs.filter(Q(product_name__icontains=q) | Q(sku__icontains=q))
        if barcode:
            qs = qs.filter(Q(barcode__iexact=barcode) | Q(sku__iexact=barcode))
        batches = (ProductBatch.objects
                   .filter(product__in=qs, quantity__gt=0)
                   .select_related('product__category', 'product__stock__product__company')
                   .order_by('product__product_name', 'expiry_date')[:3000])
        rows = []
        for b in batches:
            p = b.product
            stock = getattr(p, 'stock', None)
            sp = getattr(stock, 'product', None)
            rows.append({
                'batch_id': str(b.id), 'product_id': str(p.id), 'pid': p.sku or '',
                'category': p.category.name if p.category_id else '',
                'name': p.product_name, 'barcode': p.barcode or '',
                'pack': max(1, int(getattr(stock, 'items_per_carton', None) or 1)),
                'expiry_date': b.expiry_date, 'qty': b.quantity,
                'tp': b.selling_price or p.selling_price or 0,
                'retail': b.retail_price or p.original_price or 0,
                'company': sp.company.name if (sp and sp.company_id) else '',
            })
        return Response(rows)

    @action(detail=False, methods=['get'])
    def sale_lookup(self, request):
        """Product lookup for the Trade 1.0 Sale Invoice window.
        ?code=10816 -> exact match on product code (PID/sku) or barcode;
        ?q=cream    -> name/code search (max 50).
        Each result carries company, packing, stock and its in-stock batches
        (expiry + per-batch rates), nearest expiry first."""
        code = (request.query_params.get('code') or '').strip()
        q = (request.query_params.get('q') or '').strip()
        qs = (self.get_queryset().filter(status='ACTIVE')
              .select_related('stock__product__company'))
        if code:
            qs = qs.filter(Q(sku__iexact=code) | Q(barcode__iexact=code))
        elif q:
            qs = qs.filter(Q(product_name__icontains=q) | Q(sku__icontains=q)).order_by('product_name')
        else:
            return Response([])
        products = list(qs[:50])
        batches = {}
        for b in (ProductBatch.objects.filter(product__in=products, quantity__gt=0)
                  .order_by('expiry_date')):
            batches.setdefault(b.product_id, []).append({
                'id': str(b.id), 'expiry_date': b.expiry_date, 'quantity': b.quantity,
                'cost_price': b.cost_price, 'selling_price': b.selling_price,
                'retail_price': b.retail_price,
            })
        out = []
        for p in products:
            stock = getattr(p, 'stock', None)
            sp = getattr(stock, 'product', None)
            out.append({
                'id': str(p.id), 'code': p.sku or '', 'name': p.product_name,
                'company': sp.company.name if (sp and sp.company_id) else '',
                'packing': max(1, int(getattr(stock, 'items_per_carton', None) or 1)),
                'carton': p.carton_qty or 0,
                'stock': int(p.total_quantity or 0),
                'cost_price': p.cost_price or 0, 'selling_price': p.selling_price or 0,
                'retail_price': p.original_price or 0,
                'batches': batches.get(p.id, []),
            })
        return Response(out)

    # ── Trade 1.0 "Product Detail" window ──
    # A legacy product is one SupplierProduct (PID, company) -> Stock (packing)
    # -> Product (the sellable row) chain, exactly as import_legacy builds it.

    @staticmethod
    def _next_pid():
        """Legacy PIDs are numbers (10001, 10002, …). SupplierProduct.sku is
        globally unique, so the next PID follows the highest numeric one anywhere."""
        codes = list(SupplierProduct.objects.exclude(sku__isnull=True).values_list('sku', flat=True))
        codes += list(Product.objects.exclude(sku__isnull=True).values_list('sku', flat=True))
        nums = [int(c) for c in codes if c and c.strip().isdigit()]
        return max(nums) + 1 if nums else 10001

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, HasModulePermission])
    def next_pid(self, request):
        return Response({'pid': str(self._next_pid())})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, HasModulePermission])
    def trade_list(self, request):
        """Every product (active and inactive) for the Product Detail › View grid."""
        qs = (self.get_queryset().select_related('category', 'stock__product__company')
              .order_by('product_name'))
        out = []
        for p in qs:
            stock = getattr(p, 'stock', None)
            sp = getattr(stock, 'product', None)
            out.append({
                'id': str(p.id), 'pid': p.sku or '', 'name': p.product_name,
                'barcode': p.barcode or '',
                'company_id': str(sp.company_id) if (sp and sp.company_id) else '',
                'company': sp.company.name if (sp and sp.company_id) else '',
                'category_id': str(p.category_id) if p.category_id else '',
                'category': p.category.name if p.category_id else '',
                'packing': max(1, int(getattr(stock, 'items_per_carton', None) or 1)),
                'carton': p.carton_qty, 'expiry_apply': p.expiry_apply,
                'status': p.status, 'image': p.image.url if p.image else '',
            })
        return Response(out)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, HasModulePermission])
    def trade_save(self, request):
        """Save the Product Detail form (multipart). No ``id`` -> new product with
        the next PID; with ``id`` -> update that product. Fields: name, company,
        barcode, carton (pieces per carton), packing (pieces per pack),
        expiry_apply (Yes/No), category, status
        (ACTIVE/INACTIVE), image (optional file), remove_image (1)."""
        from datetime import date
        from modules.company.models import Company
        from modules.inventory.models import Stock, Warehouse

        d = request.data
        name = (d.get('name') or '').strip()
        barcode = clean_barcode(d.get('barcode'))
        status_v = (d.get('status') or '').strip().upper()
        exp_v = (d.get('expiry_apply') or '').strip().lower()
        try:
            packing = int(d.get('packing') or 0)
            carton = int(d.get('carton') or 0)
        except (TypeError, ValueError):
            return Response({'error': 'Carton and Packing must be whole numbers.'}, status=400)
        if not name:
            return Response({'error': 'Enter the Product Name.'}, status=400)
        if len(name) > 255:
            return Response({'error': 'Product Name is too long (255 characters at most).'}, status=400)
        if barcode and len(str(d.get('barcode')).strip()) > 100:
            return Response({'error': 'Bar Code is too long (100 characters at most).'}, status=400)
        if packing > 100000 or carton > 100000:
            return Response({'error': 'Carton and Packing must be 100000 or less.'}, status=400)
        if packing < 1:
            return Response({'error': 'Packing must be 1 or more.'}, status=400)
        if carton < 1:
            return Response({'error': 'Enter the pieces in one Carton.'}, status=400)
        if carton < packing:
            return Response({'error': f'A carton ({carton} pcs) cannot hold less than one pack ({packing} pcs).'}, status=400)
        if exp_v not in ('yes', 'no'):
            return Response({'error': 'Select Expiry Apply.'}, status=400)
        if status_v not in ('ACTIVE', 'INACTIVE'):
            return Response({'error': 'Select the Status.'}, status=400)

        company = None
        if d.get('company'):
            company = scope_to_tenant(request.user, Company.objects.all(), 'tenant') \
                .filter(pk=d.get('company')).first()
        if not company:
            return Response({'error': 'Select the Company.'}, status=400)
        category = None
        if d.get('category'):
            category = scope_to_tenant(request.user, Category.objects.all(), 'tenant') \
                .filter(pk=d.get('category')).first()
        if not category:
            return Response({'error': 'Select the Category.'}, status=400)
        # Super admins aren't tenant-scoped: the product belongs to the company's admin.
        tid = tenant_id_for(request.user) or company.tenant_id

        product = None
        if d.get('id'):
            product = self.get_queryset().select_related('stock__product').filter(pk=d.get('id')).first()
            if not product:
                return Response({'error': 'Product not found.'}, status=404)
            tid = product.tenant_id
        stock = getattr(product, 'stock', None)
        sp = getattr(stock, 'product', None)

        # One product per name per company; bar codes must be unique.
        dup = Product.objects.filter(tenant_id=tid, product_name__iexact=name,
                                     stock__product__company=company).exclude(status='ARCHIVED')
        if product:
            dup = dup.exclude(pk=product.pk)
        if dup.exists():
            return Response({'error': f'"{name}" already exists for {company.name} (PID {dup.first().sku}).'}, status=400)
        if barcode:
            taken = Product.objects.filter(tenant_id=tid, barcode__iexact=barcode).exclude(status='ARCHIVED')
            taken_sp = SupplierProduct.objects.filter(barcode__iexact=barcode)
            if product:
                taken = taken.exclude(pk=product.pk)
            if sp:
                taken_sp = taken_sp.exclude(pk=sp.pk)
            if taken.exists() or taken_sp.exists():
                return Response({'error': f'Bar Code {barcode} is already used by another product.'}, status=400)

        image = request.FILES.get('image')
        try:
            with transaction.atomic():
                if product is None:
                    # Same branch as the rest of this admin's products.
                    wh_id = (Product.objects.filter(tenant_id=tid).exclude(warehouse__isnull=True)
                             .values_list('warehouse_id', flat=True).first())
                    warehouse = (Warehouse.objects.filter(pk=wh_id).first() if wh_id
                                 else Warehouse.objects.filter(tenant_id=tid).first())
                    pid = str(self._next_pid())
                    sp = SupplierProduct.objects.create(
                        sku=pid, name=name, barcode=barcode, company=company, category=category,
                        status=status_v, is_approved=True)
                    stock = Stock.objects.create(
                        tenant_id=tid, warehouse=warehouse, product=sp, product_name=name,
                        category=category, purchase_type='single', total_quantity=0,
                        items_per_carton=packing, price_per_item=0, date=date.today(),
                        created_by=request.user)
                    product = Product.objects.create(
                        tenant_id=tid, warehouse=warehouse, stock=stock, sku=pid,
                        product_name=name, category=category, barcode=barcode,
                        carton_qty=carton, expiry_apply=exp_v == 'yes', status=status_v,
                        selling_price=0, cost_price=0, total_quantity=0, image=image)
                else:
                    if sp:
                        sp.name, sp.barcode, sp.company, sp.category, sp.status = \
                            name, barcode, company, category, status_v
                        sp.save()
                    if stock:
                        stock.product_name, stock.category, stock.items_per_carton = name, category, packing
                        stock.save()
                    product.product_name, product.category, product.barcode = name, category, barcode
                    product.carton_qty, product.expiry_apply, product.status = carton, exp_v == 'yes', status_v
                    if image:
                        product.image = image
                    elif d.get('remove_image') == '1':
                        product.image = None
                    product.save()
        except IntegrityError:
            return Response({'error': 'Could not save: the PID or Bar Code clashes with another product. Try again.'}, status=400)
        return Response({'id': str(product.id), 'pid': product.sku, 'name': product.product_name},
                        status=200 if d.get('id') else 201)

    @action(detail=False, methods=['get'])
    def dashboard_lists(self, request):
        """Lightweight feed for the admin dashboard: the Expiry List and the
        Stock Minimum Range list, computed in one scoped query (no per-row
        serialization), so it stays fast even with thousands of products."""
        qs = (self.get_queryset()
              .select_related('stock__product__company')
              .only('id', 'sku', 'product_name', 'total_quantity', 'min_count',
                    'stock__product__company__name'))
        expiry, low = [], []
        info = {}  # product id -> (pid, name, company)
        # Like legacy Trade 2.1, only products that have stock batches are
        # tracked against their minimum (never-stocked items are not "low").
        batched = set(ProductBatch.objects.filter(product__in=qs)
                      .values_list('product_id', flat=True).distinct())
        for p in qs:
            sp = getattr(getattr(p, 'stock', None), 'product', None)
            company = sp.company.name if (sp and sp.company_id) else None
            pid = p.sku or str(p.id)
            info[p.id] = (pid, p.product_name, company)
            qty = int(p.total_quantity or 0)
            mn = int(p.min_count or 0)
            if p.id in batched and qty <= mn:
                low.append({'pid': pid, 'name': p.product_name, 'company': company,
                            'min': mn, 'qty': qty})
        # Expiry List = in-stock batches (like legacy Trade 2.1): a product with
        # two live batches shows twice, empty batches are skipped.
        batches = (ProductBatch.objects
                   .filter(product_id__in=list(info), quantity__gt=0, expiry_date__isnull=False)
                   .values_list('product_id', 'quantity', 'expiry_date'))
        for product_id, qty, exp in batches:
            pid, name, company = info[product_id]
            expiry.append({'pid': pid, 'name': name, 'qty': qty, 'exp': exp, 'company': company})
        expiry.sort(key=lambda x: ((x['name'] or '').lower(), x['exp']))
        low.sort(key=lambda x: ((x['company'] or '').lower(), (x['name'] or '').lower()))
        return Response({'expiry': expiry, 'low_stock': low})

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        # Storefront (customers / guests — not staff): Amazon-style, every branch lists
        # its OWN products separately. There is NO cross-branch merge — two branches
        # selling the same name/price/weight/type each show their own entry (identified
        # by their own warehouse). A selected city narrows to that city's active
        # branches; "all"/blank shows every branch's products. Only in-stock items are
        # listed (consistently, in both All-Cities and a specific city).
        if not getattr(request.user, 'is_staff', False):
            city = (request.query_params.get('city') or '').strip()
            if city and city.lower() != 'all':
                qs = qs.filter(warehouse__area__name__iexact=city, warehouse__is_active=True)
            qs = qs.filter(total_quantity__gt=0)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        # No cross-branch merge: each product ID is one branch's own row, so the detail
        # page simply shows that branch's product and its own stock.
        instance = self.get_object()
        return Response(self.get_serializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        """Perform a soft-delete by marking the product as ARCHIVED"""
        instance = self.get_object()
        instance.status = 'ARCHIVED'
        instance.save()
        return Response({"message": "Product removed from registry"}, status=status.HTTP_200_OK)


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = Wishlist.objects.all()
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        print(f"DEBUG: Wishlist access by user: {user}, is_customer: {getattr(user, 'is_customer', False)}, real_id: {getattr(user, 'real_id', 'None')}")
        if hasattr(user, 'is_customer') and user.is_customer:
            return self.queryset.filter(user_id=user.real_id).order_by('-created_at')
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'is_customer') and user.is_customer:
            from modules.customer.models import Customer
            customer_instance = Customer.objects.filter(id=user.real_id).first()
            if customer_instance:
                serializer.save(user=customer_instance)
                return
        serializer.save()

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({"error": "product_id is required"}, status=400)
            
        user = request.user
        if not hasattr(user, 'is_customer') or not user.is_customer:
            return Response({"error": "Only customers can manage wishlists"}, status=403)
            
        from modules.customer.models import Customer
        customer_instance = Customer.objects.filter(id=user.real_id).first()
        if not customer_instance:
            return Response({"error": "Customer profile not found"}, status=404)
            
        # Check if already in wishlist
        existing = Wishlist.objects.filter(user=customer_instance, product_id=product_id).first()
        if existing:
            existing.delete()
            return Response({"status": "removed", "message": "Product removed from wishlist"})
        else:
            Wishlist.objects.create(user=customer_instance, product_id=product_id)
            return Response({"status": "added", "message": "Product added to wishlist"})


class SupplierProductViewSet(viewsets.ModelViewSet):
    """ViewSet for products uploaded by suppliers for review"""
    serializer_class = SupplierProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'purchases'

    def get_queryset(self):
        user = self.request.user
        
        # Admins can filter by supplier; Suppliers only see their own
        if getattr(user, 'is_staff', False):
            queryset = (SupplierProduct.objects
                        .select_related('category', 'supplier', 'company')
                        .exclude(status='ARCHIVED').order_by('-created_at'))
            supplier_id = self.request.query_params.get('supplier')
            
            if supplier_id and supplier_id != 'undefined' and supplier_id != 'null':
                # Try to resolve if it's an Auth User ID (Integer) instead of Supplier UUID
                if supplier_id.isdigit():
                    from django.contrib.auth import get_user_model
                    from modules.supplier.models import Supplier
                    User = get_user_model()
                    target_user = User.objects.filter(id=int(supplier_id)).first()
                    if target_user:
                        target_supplier = Supplier.objects.filter(email=target_user.email).first()
                        if target_supplier:
                            supplier_id = str(target_supplier.id)
                
                try:
                    queryset = queryset.filter(supplier_id=supplier_id)
                except (ValueError, TypeError, ValidationError):
                    pass
            return queryset
            
        # Handle Suppliers (Shadow Users from MultiTableJWTAuthentication)
        if hasattr(user, 'is_supplier') and user.is_supplier:
            # If the SupplierProduct model still links to the User table, 
            # we need to find the User record corresponding to this supplier 
            # if one exists, or return nothing if they are fully isolated.
            # Assuming for now they might have a linked user or we filter by their real_id 
            # if the DB schema was updated (which it doesn't seem to be).
            # To avoid 500, we'll return an empty queryset if we can't find a valid link.
            if hasattr(user, 'real_id') and user.real_id:
                # If the schema uses the User ID, and Suppliers are NOT Users, 
                # this filter will return empty anyway, but it won't crash.
                return SupplierProduct.objects.filter(supplier_id=user.real_id).order_by('-created_at')
            return SupplierProduct.objects.none()

        # Fallback for standard authenticated Users
        if user.is_authenticated and hasattr(user, 'id') and user.id:
            return SupplierProduct.objects.filter(supplier=user).order_by('-created_at')
            
        return SupplierProduct.objects.none()

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user

        # Resolve the actual Supplier instance for Shadow Users (supplier portal)
        if hasattr(user, 'is_supplier') and user.is_supplier:
            from modules.supplier.models import Supplier
            supplier_instance = Supplier.objects.filter(id=user.real_id).first()
            if supplier_instance:
                serializer.save(supplier=supplier_instance)
                return
            else:
                print(f"DEBUG: Supplier instance NOT FOUND for real_id: {getattr(user, 'real_id', 'None')}")

        # Staff / Admin: 'supplier' field is writable; if it came through validated_data, just save.
        # As a safety net, if 'supplier' was not in validated_data try to resolve from raw request.
        if user.is_staff:
            if 'supplier' in serializer.validated_data:
                serializer.save()
                return
            supplier_id = self.request.data.get('supplier')
            if supplier_id:
                from modules.supplier.models import Supplier
                supplier_instance = Supplier.objects.filter(id=supplier_id).first()
                if supplier_instance:
                    serializer.save(supplier=supplier_instance)
                    return

        # Final fallback
        try:
            serializer.save()
        except Exception as e:
            print(f"DEBUG: SupplierProduct save failed: {str(e)}")
            raise e


class StoreProductViewSet(viewsets.ModelViewSet):
    """Super-admin master store catalog.

    Super admins add/edit listings here directly; (later) branch products fold in
    by name+weight+size+price. The storefront is sourced from the visible entries.
    Restricted to Super Admins — it spans every branch.
    """
    queryset = StoreProduct.objects.all().order_by('-created_at')
    serializer_class = StoreProductSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)
