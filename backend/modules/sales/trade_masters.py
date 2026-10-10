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
    for kind, exp, q in (DamageStockItem.objects.filter(product=product, damage__kind__in=['add', 'less'])
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


# ───────────────────────── District / Main Area ─────────────────────────

class TradeAreaViewSet(viewsets.ViewSet):
    """Trade 1.0 New District (?level=district, codes D1, D2 …), New Main Area
    (?level=main, M1, M2 …, under a district) and Sub Area (?level=sub, A1, A2 …,
    under a main area)."""
    permission_classes = [permissions.IsAdminUser]
    PREFIX = {'district': 'D', 'main': 'M', 'sub': 'A'}

    def _level(self, request):
        lv = request.query_params.get('level') or (request.data.get('level') if request.method in ('POST', 'PATCH') else None)
        return lv if lv in ('main', 'sub') else 'district'

    def _tid(self):
        u = self.request.user
        return tenant_id_for(u) or u.pk

    def _qs(self, level):
        from modules.company.models import Area
        return Area.objects.filter(tenant_id=self._tid(), code__regex=rf'^{self.PREFIX[level]}[0-9]+$')

    @staticmethod
    def _num(code):
        return int(code[1:]) if code and code[1:].isdigit() else None

    def _next(self, level):
        return max([self._num(c) or 0 for c in self._qs(level).values_list('code', flat=True)] or [0]) + 1

    def _row(self, a):
        r = {'id': a.id, 'code': self._num(a.code), 'name': a.name}
        if a.code.startswith('A'):   # sub area: parent = main area, its parent = district
            m = a.parent
            d = m.parent if m else None
            r.update(main=str(m.id) if m else '', main_name=m.name if m else '',
                     district=str(d.id) if d else '', district_name=d.name if d else '')
        else:
            r.update(district=str(a.parent_id) if a.parent_id else '', district_name=a.parent.name if a.parent_id else '')
        return r

    @action(detail=False, methods=['get'])
    def next_code(self, request):
        return Response({'code': self._next(self._level(request))})

    def list(self, request):
        return Response([self._row(a) for a in self._qs(self._level(request)).select_related('parent__parent')])

    def _fields(self, request, level, exclude=None):
        from modules.company.models import Area
        name = _clean(request.data.get('name'), 120)
        if not name:
            return None, {'district': 'Enter the District Name.', 'main': 'Enter the Main Area Name.',
                          'sub': 'Enter the Sub Area Name.'}[level]
        if self._qs(level).filter(name__iexact=name).exclude(pk=exclude).exists():
            return None, f'{name} already exists.'
        parent = None
        if level == 'main':
            parent = self._qs('district').filter(pk=request.data.get('district') or 0).first()
            if not parent:
                return None, 'Select the District.'
        if level == 'sub':
            parent = self._qs('main').filter(pk=request.data.get('main') or 0).first()
            if not parent:
                return None, 'Select the Main Area.'
        return {'name': name, 'parent': parent}, None

    def create(self, request):
        from modules.company.models import Area
        level = self._level(request)
        f, err = self._fields(request, level)
        if err:
            return Response({'detail': err}, status=400)
        with transaction.atomic():
            a = Area.objects.create(code=f'{self.PREFIX[level]}{self._next(level)}', tenant_id=self._tid(), is_active=True, **f)
        return Response(self._row(a), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        level = self._level(request)
        a = self._qs(level).filter(pk=pk).first()
        if not a:
            return Response({'detail': 'Not found.'}, status=404)
        f, err = self._fields(request, level, exclude=a.pk)
        if err:
            return Response({'detail': err}, status=400)
        a.name = f['name']
        if level != 'district':
            a.parent = f['parent']
        a.save()
        return Response(self._row(a))

    def destroy(self, request, pk=None):
        level = self._level(request)
        a = self._qs(level).filter(pk=pk).first()
        if not a:
            return Response({'detail': 'Not found.'}, status=404)
        kids = a.children.count()
        if kids:
            what = 'main area(s)' if level == 'district' else 'sub area(s)'
            return Response({'detail': f'{a.name} has {kids} {what} — it cannot be deleted.'}, status=400)
        used = a.ledger_accounts.count() + a.customers.count()
        if used:
            return Response({'detail': f'{a.name} is used by {used} account(s) — it cannot be deleted.'}, status=400)
        a.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



# ───────────────────────── Chart of Accounts 2nd / 3rd Level ─────────────────────────

class TradeAccountGroupViewSet(viewsets.ViewSet):
    """Chart of Accounts 2nd Level (?level=2: Sub Account Code under a Main
    Account, e.g. 12 Current assets) and 3rd Level (?level=3: e.g. 1202 Accounts
    Receivables under a 2nd-level account). Main accounts (1 Assets … 5
    Expences) are fixed."""
    permission_classes = [permissions.IsAdminUser]

    def _level(self, request):
        lv = request.query_params.get('level') or (request.data.get('level') if request.method in ('POST', 'PATCH') else None)
        return 3 if str(lv) == '3' else 2

    def _qs(self, level=None):
        from modules.company.models import AccountGroup
        qs = scope_to_tenant(self.request.user, AccountGroup.objects.all(), 'tenant')
        return qs.filter(level=level) if level else qs

    @staticmethod
    def _row(g):
        p = g.parent
        r = {'id': g.id, 'code': g.code, 'name': g.name, 'level': g.level}
        if g.level == 2:
            r.update(main=str(p.id) if p else '', main_name=p.name if p else '')
        else:
            m = p.parent if p else None
            r.update(sub=str(p.id) if p else '', sub_name=p.name if p else '',
                     main=str(m.id) if m else '', main_name=m.name if m else '')
        return r

    def _next(self, level, parent):
        if not parent:
            return ''
        last = self._qs(level).filter(parent=parent).aggregate(m=Max('code'))['m']
        return (last + 1) if last else (parent.code * (10 if level == 2 else 100) + 1)

    @staticmethod
    def _used(g):
        return g.children.count() + g.accounts.count()

    @action(detail=False, methods=['get'])
    def next_code(self, request):
        """Code the next account gets: ?parent (main / 2nd-level id); blank until one is chosen."""
        level = self._level(request)
        parent = self._qs(level - 1).filter(pk=request.query_params.get('parent') or 0).first()
        return Response({'code': self._next(level, parent)})

    @action(detail=False, methods=['get'])
    def mains(self, request):
        return Response([{'id': g.id, 'code': g.code, 'name': g.name} for g in self._qs(1).order_by('code')])

    def list(self, request):
        level = self._level(request)
        return Response([self._row(g) for g in self._qs(level).select_related('parent__parent').order_by('code')])

    def _parent(self, request, level):
        key = 'main' if level == 2 else 'sub'
        p = self._qs(level - 1).filter(pk=request.data.get(key) or 0).first()
        return p, (None if p else ('Select the Main Account.' if level == 2 else 'Select the Account 2nd Level.'))

    def create(self, request):
        from modules.company.models import AccountGroup
        level = self._level(request)
        name = _clean(request.data.get('name'), 150)
        if not name:
            return Response({'detail': 'Enter the account name.'}, status=400)
        parent, err = self._parent(request, level)
        if err:
            return Response({'detail': err}, status=400)
        if self._qs(level).filter(parent=parent, name__iexact=name).exists():
            return Response({'detail': f'{name} already exists under {parent.name}.'}, status=400)
        with transaction.atomic():
            g = AccountGroup.objects.create(code=self._next(level, parent), name=name, level=level, parent=parent,
                                            tenant_id=tenant_id_for(request.user) or parent.tenant_id)
        return Response(self._row(g), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        level = self._level(request)
        g = self._qs(level).filter(pk=pk).first()
        if not g:
            return Response({'detail': 'Not found.'}, status=404)
        name = _clean(request.data.get('name'), 150)
        if not name:
            return Response({'detail': 'Enter the account name.'}, status=400)
        parent, err = self._parent(request, level)
        if err:
            return Response({'detail': err}, status=400)
        if parent.id != g.parent_id and self._used(g):
            # The code carries the parent's code (1202 under 12), so a used account keeps its parent.
            return Response({'detail': f'{g.name} is in use, its parent account cannot be changed.'}, status=400)
        g.name = name
        if parent.id != g.parent_id:
            g.parent = parent
            g.code = self._next(level, parent)
        g.save()
        return Response(self._row(g))

    def destroy(self, request, pk=None):
        level = self._level(request)
        g = self._qs(level).filter(pk=pk).first()
        if not g:
            return Response({'detail': 'Not found.'}, status=404)
        used = self._used(g)
        if used:
            return Response({'detail': f'{g.name} has {used} account(s) under it, it cannot be deleted.'}, status=400)
        g.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ───────────────────────── Financial Year ─────────────────────────

class TradeFinancialYearViewSet(viewsets.ViewSet):
    """Trade 1.0 New Financial Year: S.No, Year Title, From / To Date, Status.
    One year is Active at a time; dates may not overlap."""
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        from .models import FinancialYear
        return scope_to_tenant(self.request.user, FinancialYear.objects.all(), 'tenant')

    @staticmethod
    def _row(y):
        return {'id': y.id, 'code': y.sno, 'name': y.title, 'title': y.title, 'from_date': y.from_date,
                'to_date': y.to_date, 'status': y.status}

    @action(detail=False, methods=['get'])
    def next_code(self, request):
        return Response({'code': (self._qs().aggregate(m=Max('sno'))['m'] or 0) + 1})

    def list(self, request):
        return Response([self._row(y) for y in self._qs().order_by('sno')])

    def _fields(self, d, exclude=None):
        title = _clean(d.get('title'), 40)
        st = str(d.get('status') or '').lower()
        try:
            f = datetime.date.fromisoformat(str(d.get('from_date'))[:10])
            t = datetime.date.fromisoformat(str(d.get('to_date'))[:10])
        except ValueError:
            return None, 'Choose the From Date and To Date.'
        if not title:
            return None, 'Enter the Year Title.'
        if st not in ('active', 'inactive'):
            return None, 'Select the Status.'
        if t < f:
            return None, 'To Date is before From Date.'
        if self._qs().filter(from_date__lte=t, to_date__gte=f).exclude(pk=exclude).exists():
            return None, 'These dates overlap another financial year.'
        return {'title': title, 'from_date': f, 'to_date': t, 'status': st}, None

    def _only_active(self, y):
        if y.status == 'active':
            self._qs().exclude(pk=y.pk).filter(status='active').update(status='inactive')

    def create(self, request):
        from .models import FinancialYear
        f, err = self._fields(request.data)
        if err:
            return Response({'detail': err}, status=400)
        with transaction.atomic():
            y = FinancialYear.objects.create(sno=(self._qs().aggregate(m=Max('sno'))['m'] or 0) + 1,
                                             tenant_id=tenant_id_for(request.user) or request.user.pk, **f)
            self._only_active(y)
        return Response(self._row(y), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        y = self._qs().filter(pk=pk).first()
        if not y:
            return Response({'detail': 'Not found.'}, status=404)
        f, err = self._fields(request.data, exclude=y.pk)
        if err:
            return Response({'detail': err}, status=400)
        with transaction.atomic():
            for k, v in f.items():
                setattr(y, k, v)
            y.save()
            self._only_active(y)
        return Response(self._row(y))

    def destroy(self, request, pk=None):
        y = self._qs().filter(pk=pk).first()
        if not y:
            return Response({'detail': 'Not found.'}, status=404)
        if y.status == 'active':
            return Response({'detail': 'The Active financial year cannot be deleted.'}, status=400)
        y.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



# ───────────────────────── Opening Stock (Add) / (Less) ─────────────────────────
# Same invoice tables as Damage Stock, kinds 'oadd' (B-numbered, legacy last
# B24000027) and 'oles' (C-numbered). Add puts new stock batches in at the rates
# entered (Inventory Dr / Capital Cr); Less takes units out of a batch (Capital
# Dr / Inventory Cr), both at the purchase rate.

CAPITAL_ACC = '31010001'
OPENING_LETTER = {'oadd': 'B', 'oles': 'C'}
LEGACY_LAST_OPENING = 'B24000027'


def next_opening_no(kind, date=None):
    prefix = f'{OPENING_LETTER[kind]}{(date or datetime.date.today()).strftime("%y")}'
    last = DamageStock.objects.filter(number__startswith=prefix).aggregate(m=Max('number'))['m']
    nums = [int(x[3:]) for x in (last, LEGACY_LAST_OPENING) if x and x.startswith(prefix) and x[3:].isdigit()]
    return f'{prefix}{(max(nums) if nums else 0) + 1:06d}'


class TradeOpeningStockViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, DamageStock.objects.all(), 'tenant')

    def _kind(self, request):
        k = request.query_params.get('kind') or (request.data.get('kind') if request.method == 'POST' else None)
        return 'oles' if k in ('oles', 'less') else 'oadd'

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'number': next_opening_no(self._kind(request))})

    def list(self, request):
        """View Opening Stock Detail: ?kind, ?number, ?pid, ?date_from, ?date_to -> lines."""
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
        out = []
        for it in items.order_by('-damage__date', '-damage_id', 'line')[:3000]:
            r = _line_row(it, it.damage)
            r['bill_no'] = it.damage.bill_no
            out.append(r)
        return Response(out)

    def create(self, request):
        """Body: {kind, date?, bill_no?, staff?, lines: [...]}.
        oadd lines: {product, qty, expiry_date?, pur_rate, sale_rate, retail_rate}.
        oles lines: {product, batch?, qty} (rates from the batch)."""
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
                    return Response({'detail': f'Enter Qty (U) for {p.product_name}.'}, status=400)
                if kind == 'oadd':
                    pur, sale, retail = (_d(x.get(k)).quantize(Decimal('0.01')) for k in ('pur_rate', 'sale_rate', 'retail_rate'))
                    if pur <= 0:
                        return Response({'detail': f'Enter the Pur.Rate for {p.product_name}.'}, status=400)
                    if min(sale, retail) < 0:
                        return Response({'detail': 'Rates cannot be negative.'}, status=400)
                    exp = None
                    if x.get('expiry_date'):
                        try:
                            exp = datetime.date.fromisoformat(str(x['expiry_date'])[:10])
                        except ValueError:
                            return Response({'detail': f'Invalid expiry date for {p.product_name}.'}, status=400)
                    if p.expiry_apply and not exp:
                        return Response({'detail': f'Choose the expiry date for {p.product_name}.'}, status=400)
                    prepared.append((p, None, exp, qty, pur, sale, retail))
                else:
                    batch = None
                    if x.get('batch'):
                        batch = ProductBatch.objects.select_for_update().filter(pk=x['batch'], product=p).first()
                        if not batch:
                            return Response({'detail': f'The stock batch of {p.product_name} was not found.'}, status=400)
                    key = batch.id if batch else p.id
                    have = batch.quantity if batch else int(p.total_quantity or 0)
                    need[key] = need.get(key, 0) + qty
                    if need[key] > have:
                        return Response({'detail': f'Only {have} in stock for {p.product_name}.'}, status=400)
                    prepared.append((p, batch, batch.expiry_date if batch else None, qty,
                                     _d(batch.cost_price if batch and batch.cost_price else p.cost_price),
                                     _d(batch.selling_price if batch and batch.selling_price else p.selling_price),
                                     _d(batch.retail_price if batch and batch.retail_price else p.original_price)))
            if not prepared:
                return Response({'detail': 'Add at least one product.'}, status=400)
            total = sum((pur * qty for _, _, _, qty, pur, _, _ in prepared), Z).quantize(Decimal('0.01'))
            doc = DamageStock.objects.create(number=next_opening_no(kind, ddate), kind=kind, date=ddate, staff=staff,
                                             bill_no=_clean(d.get('bill_no'), 50), total=total,
                                             created_by=request.user, tenant_id=tid)
            for i, (p, batch, exp, qty, pur, sale, retail) in enumerate(prepared, 1):
                if kind == 'oadd':
                    batch = ProductBatch.objects.create(product=p, expiry_date=exp, quantity=0, cost_price=pur,
                                                        selling_price=sale or p.selling_price or 0,
                                                        retail_price=retail or p.original_price or 0)
                    # The rates entered become the product's current rates (as on a purchase).
                    Product.objects.filter(pk=p.pk).update(cost_price=pur, **({'selling_price': sale} if sale else {}),
                                                           **({'original_price': retail} if retail else {}))
                DamageStockItem.objects.create(damage=doc, line=i, product=p, batch=batch, expiry_date=exp, qty=qty,
                                               pur_rate=pur, sale_rate=sale, retail_rate=retail)
                _move_stock(p, batch, qty if kind == 'oadd' else -qty)

            cap = accounts.filter(acc_id=CAPITAL_ACC).first()
            inv = accounts.filter(acc_id=INVENTORY_ACC).first()
            if cap and inv and total > 0:
                from .vouchers import VoucherViewSet
                label = f'{"OpStock Add" if kind == "oadd" else "OpStock Less"}-{doc.number}'
                v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(ddate),
                                           vtype='opening_stock_add' if kind == 'oadd' else 'opening_stock_less',
                                           date=ddate, staff=staff, detail=label, total=total, created_by=request.user, tenant_id=tid)
                dr, cr = (inv, cap) if kind == 'oadd' else (cap, inv)
                VoucherLine.objects.create(voucher=v, line=1, account=dr, debit=total, credit=Z, detail=label)
                VoucherLine.objects.create(voucher=v, line=2, account=cr, debit=Z, credit=total, detail=label)
                doc.voucher = v
                doc.save(update_fields=['voucher'])
        return Response({'id': doc.id, 'number': doc.number, 'voucher_no': doc.voucher.voucher_no if doc.voucher_id else '',
                         'total': total}, status=status.HTTP_201_CREATED)


# ───────────────────────── Opening Assets / Receivables / Liabilities ─────────────────────────

OPENING_KINDS = {
    # kind: (vtype, detail, account filter, account side)
    'assets': ('opening_assets', 'Opening Balance of Assets', 'debit'),
    'receivables': ('opening_receivables', 'Opening Balance of Receiveables', 'debit'),
    'liabilities': ('opening_liabilities', 'Opening Balance of Liabilities', 'credit'),
}


class TradeOpeningVoucherViewSet(viewsets.ViewSet):
    """Opening Assets (an asset account Dr, Capital Cr), Opening Receivables (a
    customer Dr, Capital Cr) and Opening Liabilities (a supplier / liability
    account Cr, Capital Dr) — one voucher, each line with its Capital line. A
    customer's or supplier's opening amount is added to their balance."""
    permission_classes = [permissions.IsAdminUser]

    def _kind(self, request):
        k = request.query_params.get('kind') or (request.data.get('kind') if request.method == 'POST' else None)
        return k if k in OPENING_KINDS else 'assets'

    @staticmethod
    def _allowed(kind, acc):
        g = str(acc.group.code if acc.group_id else '')
        if kind == 'assets':
            return g.startswith('1') and g != '1202'
        if kind == 'receivables':
            return g == '1202'
        return g.startswith('2')

    @action(detail=False, methods=['get'])
    def accounts(self, request):
        """Accounts the Find Account window lists for this kind."""
        from modules.company.models import LedgerAccount
        kind = self._kind(request)
        qs = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant').select_related('group', 'area')
        return Response([{'id': a.id, 'acc_id': a.acc_id, 'name': a.name, 'group': a.group.code if a.group_id else None,
                          'area': a.area.name if a.area_id else '', 'cell': getattr(a, 'cell', '') or ''}
                         for a in qs.order_by('acc_id') if self._allowed(kind, a)])

    def list(self, request):
        """View Opening … Voucher Detail: ?kind, ?voucher_no, ?date_from, ?date_to -> lines."""
        q = request.query_params
        kind = self._kind(request)
        vqs = scope_to_tenant(request.user, Voucher.objects.filter(vtype=OPENING_KINDS[kind][0]), 'tenant')
        if q.get('voucher_no'):
            vqs = vqs.filter(voucher_no__icontains=q['voucher_no'].strip())
        if q.get('date_from'):
            vqs = vqs.filter(date__gte=q['date_from'])
        if q.get('date_to'):
            vqs = vqs.filter(date__lte=q['date_to'])
        lines = (VoucherLine.objects.filter(voucher__in=vqs).exclude(account__acc_id=CAPITAL_ACC)
                 .select_related('voucher__staff', 'account').order_by('-voucher__date', '-voucher_id', 'line')[:3000])
        return Response([{
            'voucher_no': l.voucher.voucher_no, 'date': l.voucher.date, 'acc_id': l.account.acc_id, 'account': l.account.name,
            'chq_no': l.chq_no, 'bank': l.bank, 'chq_date': l.chq_date, 'detail': l.detail,
            'amount': l.debit or l.credit, 'staff': l.voucher.staff.name if l.voucher.staff_id else '',
        } for l in lines])

    def create(self, request):
        """Body: {kind, date?, staff?, lines: [{account, amount, chq_no?, bank?, chq_date?}]}."""
        from modules.company.models import LedgerAccount
        from .vouchers import VoucherViewSet
        d = request.data
        kind = self._kind(request)
        vtype, detail, side = OPENING_KINDS[kind]
        try:
            vdate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        accounts = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant').select_related('group')
        cap = accounts.filter(acc_id=CAPITAL_ACC).first()
        if not cap:
            return Response({'detail': 'The Capital account (31010001) is missing from the Chart of Accounts.'}, status=400)
        prepared = []
        for x in d.get('lines') or []:
            acc = accounts.filter(pk=x.get('account')).first()
            if not acc or not self._allowed(kind, acc):
                return Response({'detail': 'One of the accounts cannot take this opening balance.'}, status=400)
            amt = _d(x.get('amount')).quantize(Decimal('0.01'))
            if amt <= 0:
                return Response({'detail': f'Enter the amount for {acc.name}.'}, status=400)
            cd = None
            if x.get('chq_date'):
                try:
                    cd = datetime.date.fromisoformat(str(x['chq_date'])[:10])
                except ValueError:
                    return Response({'detail': 'Invalid cheque date.'}, status=400)
            prepared.append((acc, amt, _clean(x.get('chq_no'), 40), _clean(x.get('bank'), 80), cd))
        if not prepared:
            return Response({'detail': 'Add at least one account.'}, status=400)
        staff = scope_to_tenant(request.user, SalesStaff.objects.all(), 'tenant').filter(pk=d.get('staff')).first() if d.get('staff') else None
        total = sum((a for _, a, _, _, _ in prepared), Z)
        with transaction.atomic():
            v = Voucher.objects.create(voucher_no=VoucherViewSet.next_no(vdate), vtype=vtype, date=vdate, staff=staff,
                                       detail=detail, total=total, created_by=request.user,
                                       tenant_id=tenant_id_for(request.user) or cap.tenant_id)
            n = 0
            for acc, amt, chq, bank, cd in prepared:
                # A customer's / supplier's opening amount counts as owed (negative unallocated).
                owed = -amt if (acc.customer_id or acc.supplier_id) else Z
                n += 1
                VoucherLine.objects.create(voucher=v, line=n, account=acc, detail=detail, chq_no=chq, bank=bank, chq_date=cd,
                                           debit=amt if side == 'debit' else Z, credit=amt if side == 'credit' else Z,
                                           unallocated=owed)
                n += 1
                VoucherLine.objects.create(voucher=v, line=n, account=cap, detail=detail,
                                           debit=amt if side == 'credit' else Z, credit=amt if side == 'debit' else Z)
        return Response({'voucher_no': v.voucher_no, 'total': total}, status=status.HTTP_201_CREATED)
