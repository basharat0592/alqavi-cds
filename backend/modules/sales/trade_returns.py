"""Trade 1.0 sale returns (Sale Return Complete Bill / Sale Return Random).

A return takes units of earlier sale lines back into stock — into the batch
they were sold from (or a batch with the same expiry) — and credits the value
to the customer. Each line is tied to the OrderItem it came from, so a line
can never be returned beyond what was sold (minus earlier returns).
"""
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F, Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import Order, OrderItem, SalesStaff, TradeSaleReturn, TradeSaleReturnItem

Z = Decimal('0')


def _d(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0))
    except Exception:
        return Z


def _r2(v):
    return Decimal(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _returned_map(order_item_ids):
    """order_item id -> (units returned, bonus returned) by earlier returns."""
    rows = (TradeSaleReturnItem.objects.filter(order_item_id__in=order_item_ids)
            .values('order_item_id').annotate(q=Sum('quantity'), b=Sum('bonus_quantity')))
    return {r['order_item_id']: (r['q'] or 0, r['b'] or 0) for r in rows}


def _line(oi, returned):
    """A sale line as the return windows show it, with what is still returnable."""
    p = oi.product
    rq, rb = returned.get(oi.id, (0, 0))
    gross = _d(oi.price) * (oi.quantity or 0)
    disc_pct = (_d(oi.discount) / gross * 100) if gross else Z
    retail = (oi.batch.retail_price if oi.batch_id else None) or (p.original_price if p else 0) or 0
    return {
        'order_item': oi.id, 'order_id': str(oi.order_id), 'invoice_no': oi.order.tracking_id,
        'date': oi.order.sale_date or oi.order.created_at.date(),
        'product_id': str(p.id) if p else None, 'pid': (p.sku or '') if p else '',
        'name': p.product_name if p else 'Deleted product',
        'expiry_date': oi.expiry_date, 'qty': oi.quantity, 'bonus': oi.bonus_quantity,
        'returned_qty': rq, 'returned_bonus': rb,
        'remaining_qty': max(0, (oi.quantity or 0) - rq),
        'remaining_bonus': max(0, (oi.bonus_quantity or 0) - rb),
        'tp': oi.price, 'retail': retail, 'disc_pct': round(disc_pct, 2), 'cost': oi.cost_price,
    }


def _restock(oi, units):
    """Put returned units back: the line's batch, else one with the same expiry,
    else a new batch at the line's rates; plus the stock / product totals."""
    from modules.products.models import Product, ProductBatch
    p = oi.product
    if not p or units <= 0:
        return None
    batch = None
    if oi.batch_id:
        batch = ProductBatch.objects.filter(id=oi.batch_id).first()
    if batch is None:
        batch = ProductBatch.objects.filter(product=p, expiry_date=oi.expiry_date).order_by('-quantity').first()
    if batch is None:
        batch = ProductBatch.objects.create(
            product=p, expiry_date=oi.expiry_date, quantity=0,
            cost_price=oi.cost_price or 0, selling_price=oi.price or 0,
            retail_price=p.original_price or 0)
    ProductBatch.objects.filter(id=batch.id).update(quantity=F('quantity') + units)
    stock = getattr(p, 'stock', None)
    if stock:
        type(stock).objects.filter(id=stock.id).update(total_quantity=F('total_quantity') + units)
        if stock.product_id:
            type(stock.product).objects.filter(id=stock.product_id).update(quantity=F('quantity') + units)
    Product.objects.filter(id=p.id).update(total_quantity=F('total_quantity') + units)
    return batch


def customer_return_credit(customer_id, user):
    """Total credit from this customer's (non-legacy) returns, for Prev. Bal."""
    qs = scope_to_tenant(user, TradeSaleReturn.objects.filter(customer_id=customer_id)
                         .exclude(kind='legacy'), 'tenant')
    return sum((r.credit for r in qs), Z)


class TradeSaleReturnViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _orders(self):
        return scope_to_tenant(self.request.user, Order.objects.all(), 'tenant')

    def _items(self):
        return (OrderItem.objects.filter(order__in=self._orders())
                .exclude(order__status__in=['CANCELLED', 'REJECTED'])
                .select_related('order', 'product', 'batch'))

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'return_no': TradeSaleReturn.next_return_no()})

    @action(detail=False, methods=['get'])
    def order_lines(self, request):
        """Every line of one invoice, with what is still returnable (Complete Bill)."""
        items = list(self._items().filter(order_id=request.query_params.get('order')).order_by('id'))
        returned = _returned_map([i.id for i in items])
        return Response([_line(i, returned) for i in items])

    @action(detail=False, methods=['get'])
    def customer_lines(self, request):
        """The customer's sale lines that can still be returned (Random › Sale History).
        Filters: customer (required), date_from, date_to, invoice, product (PID)."""
        p = request.query_params
        if not p.get('customer'):
            return Response([])
        qs = self._items().filter(order__customer_id=p['customer'])
        if p.get('date_from'):
            qs = qs.filter(Q(order__sale_date__gte=p['date_from']) | Q(order__sale_date__isnull=True, order__created_at__date__gte=p['date_from']))
        if p.get('date_to'):
            qs = qs.filter(Q(order__sale_date__lte=p['date_to']) | Q(order__sale_date__isnull=True, order__created_at__date__lte=p['date_to']))
        if p.get('invoice'):
            qs = qs.filter(order__tracking_id__icontains=p['invoice'].strip())
        if p.get('product'):
            qs = qs.filter(Q(product__sku__iexact=p['product'].strip()) | Q(product__product_name__icontains=p['product'].strip()))
        items = list(qs.order_by('-order__sale_date', '-order__created_at', 'id')[:600])
        returned = _returned_map([i.id for i in items])
        rows = [_line(i, returned) for i in items]
        return Response([r for r in rows if r['remaining_qty'] > 0 or r['remaining_bonus'] > 0])

    def list(self, request):
        """Saved returns (Sale Records › Sale Return, and Random › View)."""
        p = request.query_params
        qs = scope_to_tenant(request.user, TradeSaleReturn.objects.all(), 'tenant') \
            .select_related('customer', 'staff', 'order')
        if p.get('customer'):
            qs = qs.filter(customer_id=p['customer'])
        if p.get('date_from'):
            qs = qs.filter(return_date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(return_date__lte=p['date_to'])
        if p.get('staff'):
            qs = qs.filter(staff_id=p['staff'])
        rows = []
        for r in qs[:3000]:
            c = r.customer
            code = c.username[4:] if (c and str(c.username).startswith('cust')) else ''
            pre = r.prev_balance or Z
            rows.append({
                'id': r.id, 'return_no': r.return_no, 'kind': r.kind, 'date': r.return_date,
                'invoice_no': r.order.tracking_id if r.order_id else '',
                'staff': r.staff.name if r.staff_id else '', 'acc_id': code, 'acc_name': r.customer_name,
                'amount': r.gross, 'disc': r.discount, 'net': r.net_amount, 'less': r.less_amount,
                'pre_bal': pre, 'cash_returned': r.cash_returned, 'balance': pre - r.credit,
            })
        return Response(rows)

    def create(self, request):
        """Body: {customer, staff?, return_date?, kind: complete|random, less_amount?,
        cash_returned?, prev_balance?, items: [{order_item, quantity, bonus_quantity}]}"""
        import datetime
        from modules.customer.models import Customer
        d = request.data
        lines = d.get('items') or []
        if not lines:
            return Response({'detail': 'Add at least one product to return.'}, status=status.HTTP_400_BAD_REQUEST)
        kind = 'complete' if d.get('kind') == 'complete' else 'random'
        try:
            rdate = datetime.date.fromisoformat(str(d.get('return_date'))) if d.get('return_date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid return date.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            ids = [int(x.get('order_item')) for x in lines if str(x.get('order_item', '')).isdigit()]
            items = {i.id: i for i in self._items().select_for_update(of=('self',)).filter(id__in=ids)}
            returned = _returned_map(list(items))
            customer_id = d.get('customer') or None
            gross = disc = net = bonus_value = Z
            prepared = []
            for x in lines:
                oi = items.get(int(x.get('order_item') or 0))
                if not oi:
                    return Response({'detail': 'A sale line was not found.'}, status=status.HTTP_400_BAD_REQUEST)
                if customer_id is None:
                    customer_id = oi.order.customer_id
                if str(oi.order.customer_id) != str(customer_id):
                    return Response({'detail': 'All returned products must be from this customer\'s sales.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                q = max(0, int(x.get('quantity') or 0))
                b = max(0, int(x.get('bonus_quantity') or 0))
                rq, rb = returned.get(oi.id, (0, 0))
                name = oi.product.product_name if oi.product else 'product'
                if q > (oi.quantity or 0) - rq or b > (oi.bonus_quantity or 0) - rb:
                    return Response({'detail': f"Only {(oi.quantity or 0) - rq} unit(s) + {(oi.bonus_quantity or 0) - rb} bonus of "
                                               f"{name} ({oi.order.tracking_id}) can still be returned."},
                                    status=status.HTTP_400_BAD_REQUEST)
                if q + b == 0:
                    continue
                returned[oi.id] = (rq + q, rb + b)  # same line twice in one return
                line_gross = _d(oi.price) * (oi.quantity or 0)
                pct = (_d(oi.discount) / line_gross * 100) if line_gross else Z
                g = _d(oi.price) * q
                dsc = _r2(g * pct / 100)
                gross += g; disc += dsc; net += g - dsc
                bonus_value += _d(oi.cost_price) * b
                prepared.append((oi, q, b, pct, dsc))
            if not prepared:
                return Response({'detail': 'Enter a quantity to return.'}, status=status.HTTP_400_BAD_REQUEST)

            customer = Customer.objects.filter(id=customer_id).first() if customer_id else None
            orders = {oi.order_id for oi, *_ in prepared}
            staff = SalesStaff.objects.filter(id=d.get('staff')).first() if d.get('staff') else None
            if staff is None and len(orders) == 1:
                staff = prepared[0][0].order.staff
            ret = TradeSaleReturn.objects.create(
                return_no=TradeSaleReturn.next_return_no(rdate), kind=kind,
                customer=customer,
                customer_name=(f"{customer.first_name or ''} {customer.last_name or ''}".strip() if customer
                               else prepared[0][0].order.customer_name)[:150],
                order_id=next(iter(orders)) if len(orders) == 1 else None,
                staff=staff, return_date=rdate,
                gross=_r2(gross), discount=_r2(disc), net_amount=_r2(net), bonus_value=_r2(bonus_value),
                less_amount=_r2(_d(d.get('less_amount'))), cash_returned=_r2(_d(d.get('cash_returned'))),
                prev_balance=_r2(_d(d.get('prev_balance'))) if d.get('prev_balance') not in (None, '') else None,
                created_by=request.user if request.user.is_staff else None,
                tenant_id=prepared[0][0].order.tenant_id or tenant_id_for(request.user),
            )
            for oi, q, b, pct, dsc in prepared:
                batch = _restock(oi, q + b)
                p = oi.product
                TradeSaleReturnItem.objects.create(
                    sale_return=ret, order_item=oi, product=p, batch=batch, expiry_date=oi.expiry_date,
                    quantity=q, bonus_quantity=b, price=oi.price,
                    retail=(oi.batch.retail_price if oi.batch_id else None) or (p.original_price if p else 0) or 0,
                    disc_pct=_r2(pct), discount=dsc, cost_price=oi.cost_price or 0,
                )
        return Response({'id': ret.id, 'return_no': ret.return_no, 'net_amount': ret.net_amount,
                         'credit': ret.credit}, status=status.HTTP_201_CREATED)
