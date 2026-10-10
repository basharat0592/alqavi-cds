"""Trade 1.0 setup windows and stock damage.

* Staff Detail (File › Sale Man): Salesman Code / Name / Cell / CNIC /
  Manager Cell No.1 / No.2 / Status.
* New Product Category (Product › Product Category): Product Type Code + Name.
* Damage Stock (Add) / Un-Damage Stock (Less) (Product › Product Stock Damage /
  … Reverse): D- / U-numbered invoices that move units between saleable and
  damaged stock and post a voucher (Demage Inventory 51020001 ↔ Inventory
  12010001) at the purchase rate.
"""
import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Max, Min, Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import DamageStock, DamageStockItem, SalesStaff, Voucher, VoucherLine

Z = Decimal('0')
DAMAGE_ACC = '51020001'
INVENTORY_ACC = '12010001'
LEGACY_LAST_DAMAGE = 'D25000001'


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Z


def _clean(v, n):
    return str(v or '').strip()[:n]


# ───────────────────────── Staff Detail ─────────────────────────

def _staff_row(s):
    return {'id': s.id, 'code': s.legacy_id, 'name': s.name, 'cell': s.cell, 'cnic': s.cnic,
            'manager_cell1': s.manager_cell1, 'manager_cell2': s.manager_cell2, 'status': s.status}


class TradeStaffViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, SalesStaff.objects.all(), 'tenant')

    def _next(self):
        return (self._qs().aggregate(m=Max('legacy_id'))['m'] or 0) + 1

    @action(detail=False, methods=['get'])
    def next_code(self, request):
        return Response({'code': self._next()})

    def list(self, request):
        return Response([_staff_row(s) for s in self._qs().order_by('legacy_id', 'id')])

    def _fields(self, d):
        name = _clean(d.get('name'), 120)
        st = str(d.get('status') or '').lower()
        if not name:
            return None, 'Enter the Salesman Name.'
        if st not in ('active', 'inactive'):
            return None, 'Select the Status.'
        cnic = _clean(d.get('cnic'), 20)
        if cnic and not (len(cnic.replace('-', '')) == 13 and cnic.replace('-', '').isdigit()):
            return None, 'CNIC must be 13 digits (e.g. 71501-1234567-1).'
        return {'name': name, 'status': st, 'cell': _clean(d.get('cell'), 40), 'cnic': cnic,
                'manager_cell1': _clean(d.get('manager_cell1'), 40),
                'manager_cell2': _clean(d.get('manager_cell2'), 40)}, None

    def create(self, request):
        f, err = self._fields(request.data)
        if err:
            return Response({'detail': err}, status=400)
        if self._qs().filter(name__iexact=f['name']).exists():
            return Response({'detail': f'{f["name"]} is already a salesman.'}, status=400)
        with transaction.atomic():
            s = SalesStaff.objects.create(legacy_id=self._next(), tenant_id=tenant_id_for(request.user), **f)
        return Response(_staff_row(s), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        s = self._qs().filter(pk=pk).first()
        if not s:
            return Response({'detail': 'Salesman not found.'}, status=404)
        f, err = self._fields(request.data)
        if err:
            return Response({'detail': err}, status=400)
        if self._qs().filter(name__iexact=f['name']).exclude(pk=s.pk).exists():
            return Response({'detail': f'{f["name"]} is already a salesman.'}, status=400)
        for k, v in f.items():
            setattr(s, k, v)
        s.save()
        return Response(_staff_row(s))

    def destroy(self, request, pk=None):
        from .models import Order
        s = self._qs().filter(pk=pk).first()
        if not s:
            return Response({'detail': 'Salesman not found.'}, status=404)
        used = Order.objects.filter(staff=s).count() + s.vouchers.count() + s.damage_stocks.count()
        if used:
            return Response({'detail': f'{s.name} is used in {used} sale(s) / voucher(s) — set the Status to Inactive instead.'},
                            status=400)
        s.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ───────────────────────── Product Category ─────────────────────────

class TradeCategoryViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        from modules.products.models import Category
        tid = tenant_id_for(self.request.user)
        qs = Category.objects.all()
        return qs.filter(tenant_id=tid) if tid is not None else qs

    @action(detail=False, methods=['get'])
    def next_code(self, request):
        return Response({'code': (self._qs().aggregate(m=Max('code'))['m'] or 0) + 1})

    def list(self, request):
        return Response([{'id': str(c.id), 'code': c.code, 'name': c.name, 'products': c.n}
                         for c in self._qs().annotate(n=Count('products')).order_by('code', 'name')])

    def create(self, request):
        from modules.products.models import Category
        name = _clean(request.data.get('name'), 255)
        if not name:
            return Response({'detail': 'Enter the Product Type Name.'}, status=400)
        if self._qs().filter(name__iexact=name).exists():
            return Response({'detail': f'{name} already exists.'}, status=400)
        c = Category.objects.create(name=name, tenant_id=tenant_id_for(request.user), status='ACTIVE')
        return Response({'id': str(c.id), 'code': c.code, 'name': c.name, 'products': 0}, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        from django.utils.text import slugify
        c = self._qs().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Product type not found.'}, status=404)
        name = _clean(request.data.get('name'), 255)
        if not name:
            return Response({'detail': 'Enter the Product Type Name.'}, status=400)
        if self._qs().filter(name__iexact=name).exclude(pk=c.pk).exists():
            return Response({'detail': f'{name} already exists.'}, status=400)
        c.name, c.slug = name, slugify(name)
        if self._qs().filter(slug=c.slug).exclude(pk=c.pk).exists():
            c.slug = f'{c.slug}-{c.code}'
        c.save()
        return Response({'id': str(c.id), 'code': c.code, 'name': c.name, 'products': c.products.count()})

    def destroy(self, request, pk=None):
        c = self._qs().filter(pk=pk).first()
        if not c:
            return Response({'detail': 'Product type not found.'}, status=404)
        used = c.products.count()
        if used:
            # Products cascade with their category — never delete one in use.
            return Response({'detail': f'{c.name} has {used} product(s) — it cannot be deleted.'}, status=400)
        c.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ───────────────────────── Damage Stock (Add) / (Less) ─────────────────────────

def next_damage_no(kind, date=None):
    letter = 'D' if kind == 'add' else 'U'
    prefix = f'{letter}{(date or datetime.date.today()).strftime("%y")}'
    last = DamageStock.objects.filter(number__startswith=prefix).aggregate(m=Max('number'))['m']
    nums = [int(x[3:]) for x in (last, LEGACY_LAST_DAMAGE) if x and x.startswith(prefix) and x[3:].isdigit()]
    return f'{prefix}{(max(nums) if nums else 0) + 1:06d}'


def _damaged_by_expiry(product):
    """Damaged units still held for a product, per expiry date (add − less)."""
    out = {}
    for kind, exp, q in (DamageStockItem.objects.filter(product=product)
                         .values_list('damage__kind', 'expiry_date').annotate(q=Sum('qty'))):
        out[exp] = out.get(exp, 0) + (q if kind == 'add' else -q)
    return {k: v for k, v in out.items() if v > 0}


def _move_stock(p, batch, units):
    """+units back into saleable stock, −units out of it (batch, stock, product)."""
    from modules.products.models import Product, ProductBatch
    if batch is not None:
        ProductBatch.objects.filter(id=batch.id).update(quantity=F('quantity') + units)
    stock = getattr(p, 'stock', None)
    if stock:
        type(stock).objects.filter(id=stock.id).update(total_quantity=F('total_quantity') + units)
        if stock.product_id:
            type(stock.product).objects.filter(id=stock.product_id).update(quantity=F('quantity') + units)
    Product.objects.filter(id=p.id).update(total_quantity=F('total_quantity') + units)
    nearest = ProductBatch.objects.filter(product=p, quantity__gt=0, expiry_date__isnull=False) \
        .aggregate(m=Min('expiry_date'))['m']
    Product.objects.filter(id=p.id).update(expiry_date=nearest)


def _line_row(it, d):
    p = it.product
    stock = getattr(p, 'stock', None)
    return {
        'damage_id': d.id, 'number': d.number, 'kind': d.kind, 'date': d.date, 'line': it.line,
        'pid': p.sku or '', 'name': p.product_name, 'carton': p.carton_qty or 0,
        'pack': max(1, int(getattr(stock, 'items_per_carton', None) or 1)),
        'expiry_date': it.expiry_date, 'qty': it.qty, 'pur_rate': it.pur_rate, 'sale_rate': it.sale_rate,
        'retail_rate': it.retail_rate, 'sub_total': _d(it.pur_rate) * it.qty,
        'staff': d.staff.name if d.staff_id else '', 'voucher_no': d.voucher.voucher_no if d.voucher_id else '',
    }


class TradeDamageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, DamageStock.objects.all(), 'tenant')

    def _kind(self, request):
        k = request.query_params.get('kind') or (request.data.get('kind') if request.method == 'POST' else None) or 'add'
        return 'less' if str(k).lower() == 'less' else 'add'

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'number': next_damage_no(self._kind(request))})

    @action(detail=False, methods=['get'])
    def damaged(self, request):
        """Un-Damage lookup: damaged units of a product per expiry, with rates."""
        from modules.products.models import Product
        p = scope_to_tenant(request.user, Product.objects.all(), 'tenant').filter(pk=request.query_params.get('product')).first()
        if not p:
            return Response([])
        rows = []
        for exp, q in sorted(_damaged_by_expiry(p).items(), key=lambda x: (x[0] is None, x[0] or datetime.date.min)):
            last = (DamageStockItem.objects.filter(product=p, expiry_date=exp, damage__kind='add')
                    .order_by('-damage__date', '-id').first())
            rows.append({'expiry_date': exp, 'quantity': q,
                         'cost_price': last.pur_rate if last else p.cost_price or 0,
                         'selling_price': last.sale_rate if last else p.selling_price or 0,
                         'retail_price': last.retail_rate if last else p.original_price or 0})
        return Response(rows)

    def list(self, request):
        """View Damage Stock Detail: ?kind, ?number, ?pid, ?date_from, ?date_to → lines."""
        q = request.query_params
        qs = self._qs().filter(kind=self._kind(request))
        if q.get('number'):
            qs = qs.filter(number__icontains=q['number'].strip())
        if q.get('date_from'):
            qs = qs.filter(date__gte=q['date_from'])
        if q.get('date_to'):
            qs = qs.filter(date__lte=q['date_to'])
        items = (DamageStockItem.objects.filter(damage__in=qs)
                 .select_related('damage__staff', 'damage__voucher', 'product__stock'))
        if q.get('pid'):
            items = items.filter(Q(product__sku__iexact=q['pid'].strip()) | Q(product__barcode__iexact=q['pid'].strip()))
        items = items.order_by('-damage__date', '-damage_id', 'line')[:3000]
        return Response([_line_row(it, it.damage) for it in items])

    def create(self, request):
        """Body: {kind, date?, staff?, lines: [{product, batch?, expiry_date?, qty}]} — qty in pieces."""
        from modules.company.models import LedgerAccount
        from modules.products.models import Product, ProductBatch
        d = request.data
        kind = self._kind(request)
        try:
            ddate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if ddate > datetime.date.today():
            return Response({'detail': 'The date cannot be in the future.'}, status=400)
        staff = scope_to_tenant(request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
        products = scope_to_tenant(request.user, Product.objects.all(), 'tenant').select_related('stock__product')
        accounts = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant')
        tid = tenant_id_for(request.user)
        with transaction.atomic():
            prepared, need = [], {}
            for x in d.get('lines') or []:
                p = products.filter(pk=x.get('product')).first()
                if not p:
                    return Response({'detail': 'One of the products was not found.'}, status=400)
                qty = int(_d(x.get('qty')))
                if qty <= 0:
                    return Response({'detail': f'Enter the quantity for {p.product_name}.'}, status=400)
                exp = None
                if x.get('expiry_date'):
                    try:
                        exp = datetime.date.fromisoformat(str(x['expiry_date'])[:10])
                    except ValueError:
                        return Response({'detail': f'Invalid expiry date for {p.product_name}.'}, status=400)
                batch = None
                if kind == 'add':
                    batch = ProductBatch.objects.select_for_update().filter(pk=x.get('batch'), product=p).first() if x.get('batch') else None
                    if x.get('batch') and not batch:
                        return Response({'detail': f'The stock batch of {p.product_name} was not found.'}, status=400)
                    key = ('b', batch.id) if batch else ('p', p.id)
                    have = batch.quantity if batch else int(p.total_quantity or 0)
                    need[key] = need.get(key, 0) + qty
                    if need[key] > have:
                        return Response({'detail': f'Only {have} in stock for {p.product_name}'
                                                   f'{f" (exp {batch.expiry_date:%d-%m-%Y})" if batch and batch.expiry_date else ""}.'}, status=400)
                    if batch:
                        exp = batch.expiry_date
                    pur = batch.cost_price if batch and batch.cost_price else (p.cost_price or 0)
                    sale = batch.selling_price if batch and batch.selling_price else (p.selling_price or 0)
                    retail = batch.retail_price if batch and batch.retail_price else (p.original_price or 0)
                else:
                    held = _damaged_by_expiry(p).get(exp, 0)
                    key = ('d', p.id, exp)
                    need[key] = need.get(key, 0) + qty
                    if need[key] > held:
                        return Response({'detail': f'Only {held} damaged for {p.product_name}'
                                                   f'{f" (exp {exp:%d-%m-%Y})" if exp else ""}.'}, status=400)
                    last = (DamageStockItem.objects.filter(product=p, expiry_date=exp, damage__kind='add')
                            .order_by('-damage__date', '-id').first())
                    pur = last.pur_rate if last else (p.cost_price or 0)
                    sale = last.sale_rate if last else (p.selling_price or 0)
                    retail = last.retail_rate if last else (p.original_price or 0)
                prepared.append((p, batch, exp, qty, _d(pur), _d(sale), _d(retail)))
            if not prepared:
                return Response({'detail': 'Add at least one product.'}, status=400)

            total = sum((pur * qty for _, _, _, qty, pur, _, _ in prepared), Z).quantize(Decimal('0.01'))
            dmg = DamageStock.objects.create(number=next_damage_no(kind, ddate), kind=kind, date=ddate, staff=staff,
                                             total=total, created_by=request.user, tenant_id=tid)
            for i, (p, batch, exp, qty, pur, sale, retail) in enumerate(prepared, 1):
                if kind == 'less':
                    # Back into the batch with that expiry, else a new one at the damaged rates.
                    batch = ProductBatch.objects.filter(product=p, expiry_date=exp).order_by('-quantity').first() \
                        or ProductBatch.objects.create(product=p, expiry_date=exp, quantity=0, cost_price=pur,
                                                       selling_price=sale, retail_price=retail)
                DamageStockItem.objects.create(damage=dmg, line=i, product=p, batch=batch, expiry_date=exp, qty=qty,
                                               pur_rate=pur, sale_rate=sale, retail_rate=retail)
                _move_stock(p, batch, -qty if kind == 'add' else qty)

            dmg_acc = accounts.filter(acc_id=DAMAGE_ACC).first()
            inv_acc = accounts.filter(acc_id=INVENTORY_ACC).first()
            if dmg_acc and inv_acc and total > 0:
                from .vouchers import VoucherViewSet
                label = f'{"Demage Stock" if kind == "add" else "Un Demage Stock"}-{dmg.number}'
                v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(ddate), vtype='damage_stock' if kind == 'add' else 'un_damage',
                                           date=ddate, staff=staff, detail=label, total=total, created_by=request.user, tenant_id=tid)
                dr, cr = (dmg_acc, inv_acc) if kind == 'add' else (inv_acc, dmg_acc)
                VoucherLine.objects.create(voucher=v, line=1, account=dr, debit=total, credit=Z, detail=label)
                VoucherLine.objects.create(voucher=v, line=2, account=cr, debit=Z, credit=total, detail=label)
                dmg.voucher = v
                dmg.save(update_fields=['voucher'])
        return Response({'id': dmg.id, 'number': dmg.number, 'voucher_no': dmg.voucher.voucher_no if dmg.voucher_id else '',
                         'total': total}, status=status.HTTP_201_CREATED)
