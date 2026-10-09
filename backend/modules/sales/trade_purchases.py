"""Trade 1.0 Purchase (Purchase Product window).

A purchase from a supplier: each line adds a stock batch (expiry, purchase /
sale / retail rate, units incl. bonus) to the product, updates its rates and
stock, and is recorded as a PurchaseOrder (RECEIVED, inventory already synced)
so the supplier balance and payment vouchers follow. A purchase voucher posts
Inventory debit / supplier credit, and the cash paid as supplier debit / cash
credit.
"""
import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Min, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import PurchaseOrder, PurchaseOrderItem, SalesStaff, Voucher, VoucherLine

Z = Decimal('0')
LEGACY_LAST_PURCHASE = 'P26000059'
LEGACY_LAST_ORDER = 'K26000002'
ORDER_NOTE = 'Trade Purchase Order'
LEGACY_ORDER_NOTE = 'Legacy Trade purchase order'
LEGACY_NOTE = 'Legacy Trade purchase'


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Z


def next_purchase_no(date=None, letter='P'):
    yy = (date or datetime.date.today()).strftime('%y')
    prefix = f'{letter}{yy}'
    last = PurchaseOrder.objects.filter(purchase_number__startswith=prefix).aggregate(m=Max('purchase_number'))['m']
    legacy = LEGACY_LAST_ORDER if letter == 'K' else LEGACY_LAST_PURCHASE
    nums = [int(x[3:]) for x in (last, legacy) if x and x.startswith(prefix) and x[3:].isdigit()]
    return f'{prefix}{(max(nums) if nums else 0) + 1:06d}'


def _line_row(it, po, supplier_name):
    sp = it.product
    return {
        'purchase_id': po.id, 'purchase_no': po.purchase_number, 'date': po.order_date.date() if po.order_date else None,
        'bill_no': po.reference_number or '', 'supplier': supplier_name,
        'pid': (sp.sku or '') if sp else '', 'name': sp.name if sp else 'Deleted product',
        'pack': it.items_per_carton or 1, 'qty': it.quantity, 'bonus': it.bonus_quantity,
        'expiry_date': it.expiry_date, 'pur_rate': it.price, 'sale_rate': it.selling_price,
        'retail_rate': it.retail_rate, 'sub_total': _d(it.price) * (it.quantity or 0),
    }


def _supplier_name(po):
    s = po.supplier
    return (getattr(getattr(s, 'ledger_account', None), 'name', '') or (s.name if s else '') or '') if s else ''


class TradePurchaseViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, PurchaseOrder.objects.all(), 'tenant')

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'purchase_no': next_purchase_no()})

    @action(detail=False, methods=['get'])
    def product_history(self, request):
        """Previous purchases of one product (Show Previous Purchase History)."""
        from modules.products.models import Product
        p = scope_to_tenant(request.user, Product.objects.all(), 'tenant').select_related('stock__product') \
            .filter(pk=request.query_params.get('product')).first()
        sp = getattr(getattr(p, 'stock', None), 'product', None) if p else None
        if not sp:
            return Response([])
        items = (PurchaseOrderItem.objects.filter(product=sp, purchase_order__in=self._qs())
                 .select_related('purchase_order__supplier__ledger_account', 'product')
                 .order_by('-purchase_order__order_date', '-id')[:200])
        return Response([_line_row(it, it.purchase_order, _supplier_name(it.purchase_order)) for it in items])

    def list(self, request):
        """View Purchase Detail: ?purchase_no, ?supplier (ledger account id), ?date_from, ?date_to."""
        from modules.company.models import LedgerAccount
        p = request.query_params
        qs = self._qs().filter(purchase_number__startswith='P', status='RECEIVED')
        if p.get('purchase_no'):
            qs = qs.filter(purchase_number__icontains=p['purchase_no'].strip())
        if p.get('supplier'):
            acc = LedgerAccount.objects.filter(pk=p['supplier']).first()
            qs = qs.filter(supplier_id=acc.supplier_id if acc else None)
        if p.get('date_from'):
            qs = qs.filter(order_date__date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(order_date__date__lte=p['date_to'])
        ids = list(qs.order_by('-order_date', '-id').values_list('id', flat=True)[:500])
        items = (PurchaseOrderItem.objects.filter(purchase_order_id__in=ids)
                 .select_related('purchase_order__supplier__ledger_account', 'product')
                 .order_by('-purchase_order__order_date', '-purchase_order_id', 'id'))
        return Response([_line_row(it, it.purchase_order, _supplier_name(it.purchase_order)) for it in items])

    def create(self, request):
        """Body: {supplier (ledger account id), date?, bill_no?, extra_disc?, freight?,
        tax?, paid?, staff?, lines: [{product, qty, bonus?, expiry_date?, pur_rate,
        sale_rate?, retail_rate?}]} — qty and bonus in pieces."""
        from modules.company.models import LedgerAccount
        from modules.products.models import Product, ProductBatch
        from modules.inventory.models import Stock
        d = request.data
        accounts = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant')
        sup_acc = accounts.select_related('supplier').filter(pk=d.get('supplier')).first() if d.get('supplier') else None
        if not sup_acc or not sup_acc.supplier_id:
            return Response({'detail': 'Find the supplier first.'}, status=400)
        try:
            pdate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if pdate > datetime.date.today():
            return Response({'detail': 'The purchase date cannot be in the future.'}, status=400)
        products = scope_to_tenant(request.user, Product.objects.all(), 'tenant').select_related('stock__product')
        prepared = []
        for x in d.get('lines') or []:
            p = products.filter(pk=x.get('product')).first()
            if not p or not getattr(p, 'stock', None) or not p.stock.product_id:
                return Response({'detail': 'One of the products was not found.'}, status=400)
            qty = int(_d(x.get('qty'))); bonus = int(_d(x.get('bonus')))
            pur = _d(x.get('pur_rate')).quantize(Decimal('0.01'))
            sale = _d(x.get('sale_rate')).quantize(Decimal('0.01'))
            retail = _d(x.get('retail_rate')).quantize(Decimal('0.01'))
            if qty <= 0 and bonus <= 0:
                return Response({'detail': f'Enter a quantity for {p.product_name}.'}, status=400)
            if qty < 0 or bonus < 0 or pur < 0 or sale < 0 or retail < 0:
                return Response({'detail': f'Negative values are not allowed ({p.product_name}).'}, status=400)
            if qty > 0 and pur <= 0:
                return Response({'detail': f'Enter the purchase rate for {p.product_name}.'}, status=400)
            exp = None
            if x.get('expiry_date'):
                try:
                    exp = datetime.date.fromisoformat(str(x['expiry_date'])[:10])
                except ValueError:
                    return Response({'detail': f'Invalid expiry date for {p.product_name}.'}, status=400)
            prepared.append((p, qty, bonus, pur, sale, retail, exp))
        if not prepared:
            return Response({'detail': 'Add at least one product.'}, status=400)
        extra_disc = _d(d.get('extra_disc')); freight = _d(d.get('freight')); tax = _d(d.get('tax')); paid = _d(d.get('paid'))
        if min(extra_disc, freight, tax, paid) < 0:
            return Response({'detail': 'Amounts cannot be negative.'}, status=400)
        amount = sum((pur * qty for _, qty, _, pur, _, _, _ in prepared), Z)
        net = (amount - extra_disc + freight + tax).quantize(Decimal('0.01'))
        if net < 0:
            return Response({'detail': 'Extra Disc is more than the purchase amount.'}, status=400)
        if paid > net:
            return Response({'detail': 'Paid Cash is more than the Net Amount.'}, status=400)
        staff = SalesStaff.objects.filter(pk=d.get('staff')).first() if d.get('staff') else None
        tid = tenant_id_for(request.user) or sup_acc.tenant_id

        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                purchase_number=next_purchase_no(pdate), supplier_id=sup_acc.supplier_id,
                reference_number=str(d.get('bill_no') or '').strip()[:50] or None,
                warehouse_id=prepared[0][0].warehouse_id, tenant_id=tid, created_by=request.user,
                total_amount=net, shipping_cost=freight, tax_amount=tax, extra_discount=extra_disc,
                status='RECEIVED', is_inventory_synced=True, paid_amount=paid,
                payment_status='PAID' if paid >= net and net > 0 else ('PARTIAL' if paid > 0 else 'UNPAID'),
                payment_method='CASH', notes=f'Trade Purchase · staff {staff.name}' if staff else 'Trade Purchase')
            PurchaseOrder.objects.filter(pk=po.pk).update(
                order_date=datetime.datetime.combine(pdate, datetime.datetime.now().time()))
            for p, qty, bonus, pur, sale, retail, exp in prepared:
                stock = p.stock
                carton = int(p.carton_qty or 0)
                PurchaseOrderItem.objects.create(
                    purchase_order=po, product=stock.product, packaging_type='SINGLE',
                    items_per_carton=carton or stock.items_per_carton or 1, quantity=qty, bonus_quantity=bonus,
                    price=pur, selling_price=sale, retail_rate=retail, expiry_date=exp)
                units = qty + bonus
                ProductBatch.objects.create(product=p, expiry_date=exp, quantity=units, cost_price=pur,
                                            selling_price=sale or p.selling_price or 0, retail_price=retail or p.original_price or 0)
                Stock.objects.filter(pk=stock.pk).update(total_quantity=(stock.total_quantity or 0) + units,
                                                         price_per_item=pur or stock.price_per_item)
                stock.refresh_from_db()
                if pur:
                    p.cost_price = pur
                if sale:
                    p.selling_price = sale
                if retail:
                    p.original_price = retail
                nearest = ProductBatch.objects.filter(product=p, quantity__gt=0, expiry_date__isnull=False) \
                    .aggregate(m=Min('expiry_date'))['m']
                p.expiry_date = nearest
                p.save()
            # Purchase voucher (Inventory / supplier, and the cash paid).
            inv_acc = accounts.filter(acc_id='12010001').first()
            cash_acc = accounts.filter(acc_id='12040001').first()
            vno = ''
            if inv_acc and net > 0:
                from .vouchers import VoucherViewSet
                v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(pdate), vtype='purchase', date=pdate,
                                           staff=staff, detail=f'Purchase-{po.purchase_number}', total=net,
                                           created_by=request.user, tenant_id=tid)
                lines = [(inv_acc, net, Z), (sup_acc, Z, net)]
                if paid > 0 and cash_acc:
                    lines += [(sup_acc, paid, Z), (cash_acc, Z, paid)]
                for i, (acc, dr, cr) in enumerate(lines, 1):
                    VoucherLine.objects.create(voucher=v, line=i, account=acc, debit=dr, credit=cr,
                                               detail=f'Purchase-{po.purchase_number}')
                vno = v.voucher_no
        return Response({'id': po.id, 'purchase_no': po.purchase_number, 'voucher_no': vno, 'net': net},
                        status=status.HTTP_201_CREATED)


class TradePurchaseOrderViewSet(viewsets.ViewSet):
    """Trade 1.0 Purchase Order: products to order from a supplier (K-numbered
    PurchaseOrder, status PENDING). No stock, rate or balance change."""
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, PurchaseOrder.objects.filter(purchase_number__startswith='K'), 'tenant')

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'order_no': next_purchase_no(letter='K')})

    def list(self, request):
        """View Purchase Order Detail: ?order_no, ?supplier (ledger account id), ?date_from, ?date_to."""
        from modules.company.models import LedgerAccount
        p = request.query_params
        qs = self._qs()
        if p.get('order_no'):
            qs = qs.filter(purchase_number__icontains=p['order_no'].strip())
        if p.get('supplier'):
            acc = LedgerAccount.objects.filter(pk=p['supplier']).first()
            qs = qs.filter(supplier_id=acc.supplier_id if acc else None)
        if p.get('date_from'):
            qs = qs.filter(order_date__date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(order_date__date__lte=p['date_to'])
        out = []
        for po in qs.select_related('supplier__ledger_account').prefetch_related('items__product').order_by('-order_date', '-id')[:300]:
            acc = getattr(po.supplier, 'ledger_account', None) if po.supplier_id else None
            lines = [{'pid': (it.product.sku or '') if it.product else '', 'name': it.product.name if it.product else 'Deleted product',
                      'qty': it.quantity, 'pur_rate': it.price, 'sub_total': _d(it.price) * (it.quantity or 0)}
                     for it in po.items.all()]
            out.append({'id': po.id, 'order_no': po.purchase_number, 'date': po.order_date.date() if po.order_date else None,
                        'supplier_acc': acc.acc_id if acc else '',
                        'supplier': (acc.name if acc else '') or (po.supplier.name if po.supplier_id else ''),
                        'amount': po.total_amount, 'lines': lines})
        return Response(out)

    def create(self, request):
        """Body: {supplier (ledger account id), date?, lines: [{product, qty, pur_rate?}]}"""
        from modules.company.models import LedgerAccount
        from modules.products.models import Product
        d = request.data
        sup = (scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant').filter(pk=d.get('supplier')).first()
               if d.get('supplier') else None)
        if not sup or not sup.supplier_id:
            return Response({'detail': 'Find the supplier first.'}, status=400)
        try:
            odate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        products = scope_to_tenant(request.user, Product.objects.all(), 'tenant').select_related('stock__product')
        prepared = []
        for x in d.get('lines') or []:
            p = products.filter(pk=x.get('product')).first()
            if not p or not getattr(p, 'stock', None) or not p.stock.product_id:
                return Response({'detail': 'One of the products was not found.'}, status=400)
            qty = int(_d(x.get('qty')))
            if qty <= 0:
                return Response({'detail': f'Enter a quantity for {p.product_name}.'}, status=400)
            raw = x.get('pur_rate')
            rate = _d(raw if raw not in (None, '') else p.cost_price).quantize(Decimal('0.01'))
            prepared.append((p, qty, max(rate, Z)))
        if not prepared:
            return Response({'detail': 'Add at least one product.'}, status=400)
        total = sum((r * q for _, q, r in prepared), Z)
        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                purchase_number=next_purchase_no(odate, 'K'), supplier_id=sup.supplier_id,
                warehouse_id=prepared[0][0].warehouse_id, tenant_id=tenant_id_for(request.user) or sup.tenant_id,
                created_by=request.user, total_amount=total, status='PENDING', is_inventory_synced=True,
                payment_status='UNPAID', payment_method='CREDIT', notes=ORDER_NOTE)
            PurchaseOrder.objects.filter(pk=po.pk).update(order_date=datetime.datetime.combine(odate, datetime.datetime.now().time()))
            for p, qty, rate in prepared:
                PurchaseOrderItem.objects.create(purchase_order=po, product=p.stock.product, packaging_type='SINGLE',
                                                 items_per_carton=p.carton_qty or 1, quantity=qty, bonus_quantity=0,
                                                 price=rate, selling_price=0, retail_rate=0)
        return Response({'id': po.id, 'order_no': po.purchase_number, 'amount': total}, status=status.HTTP_201_CREATED)
