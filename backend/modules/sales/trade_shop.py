"""The shop (customer side) linked to Trade 1.0 (admin side).

- The shop shows and charges the RETAIL price (Product.original_price, the
  Retail Rate set on the Purchase; the sale rate when no retail is set).
- A shop order waits in Trade › Online Orders: it is not a sale and nothing is
  paid until it is confirmed. Confirming makes it Trade sale invoice(s) — the
  S-numbered bill, one invoice per company, stock taken from the batches by
  earliest expiry — for the customer's account (Chart of Account 1202). The
  shop order stays as the customer's tracking record (Confirmed › Shipped ›
  Delivered) and never moves stock or balances itself.
- Every shop customer has an account in the Chart of Account: a new one is
  made on sign-up (or on their first order). An existing Trade customer gets
  a shop login set from Online Orders › Shop Logins.
"""
import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import Order, OrderItem

Z = Decimal('0')
CUSTOMER_GROUP = 1202
SHOP_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']


def retail_price(p):
    """The price the shop shows and charges: the Retail Rate, else the sale rate."""
    r = Decimal(str(p.original_price or 0))
    return r if r > 0 else Decimal(str(p.selling_price or 0))


# The shop's delivery charge (as the checkout page shows it).
FREE_DELIVERY_ABOVE, DELIVERY_CHARGE = Decimal('5000'), Decimal('350')


def shop_shipping(items_total):
    return Z if items_total > FREE_DELIVERY_ABOVE else DELIVERY_CHARGE


def shop_tenant_id():
    """The Admin (tenant) who owns the shop: the one whose Chart of Account holds the
    customers (receivables 1202). One shop, one business."""
    from modules.company.models import AccountGroup
    g = AccountGroup.objects.filter(code=CUSTOMER_GROUP, level=3, tenant__isnull=False).order_by('id').first()
    return g.tenant_id if g else None


def ensure_customer_account(customer):
    """The customer's account in the Chart of Account (receivables 1202) — made when missing."""
    from modules.company.models import AccountGroup, LedgerAccount
    from modules.company.views import LedgerAccountViewSet
    acc = LedgerAccount.objects.filter(customer=customer).first()
    if acc:
        return acc
    tid = customer.tenant_id or shop_tenant_id()
    group = AccountGroup.objects.filter(code=CUSTOMER_GROUP, level=3, tenant_id=tid).first()
    if not group:
        return None
    name = (f'{customer.first_name or ""} {customer.last_name or ""}'.strip() or customer.email or customer.username)[:255]
    with transaction.atomic():
        acc_id = LedgerAccountViewSet._next_acc_id(group, LedgerAccount.objects.filter(tenant_id=tid))
        acc = LedgerAccount.objects.create(acc_id=acc_id, name=name, group=group, cell_no=(customer.phone or '')[:40],
                                           address=customer.address or '', contact_person='Shop customer',
                                           customer=customer, tenant_id=tid)
        if not customer.tenant_id:
            type(customer).objects.filter(pk=customer.pk).update(tenant_id=tid)
    return acc


def release_reservation(order):
    """Give back the stock a pending shop order was holding."""
    from modules.products.models import Product
    if not order.is_reserved:
        return
    for it in order.items.all():
        if it.product_id:
            Product.objects.filter(pk=it.product_id).update(
                reserved_quantity=F('reserved_quantity') - ((it.quantity or 0) + (it.bonus_quantity or 0)))
            Product.objects.filter(pk=it.product_id, reserved_quantity__lt=0).update(reserved_quantity=0)
    Order.objects.filter(pk=order.pk).update(is_reserved=False)


def pick_batches(product, qty):
    """[(batch or None, units)] covering `qty`, earliest expiry first (batches without
    an expiry last). Raises ValueError when the stock is short."""
    from modules.products.models import ProductBatch
    batches = list(ProductBatch.objects.filter(product=product, quantity__gt=0).order_by(F('expiry_date').asc(nulls_last=True), 'id'))
    have = sum(b.quantity for b in batches)
    if not batches:
        if int(product.total_quantity or 0) >= qty:
            return [(None, qty)]
        raise ValueError(f'Only {int(product.total_quantity or 0)} in stock for {product.product_name}.')
    if have < qty:
        raise ValueError(f'Only {have} in stock for {product.product_name}.')
    out, left = [], qty
    for b in batches:
        if left <= 0:
            break
        n = min(b.quantity, left)
        out.append((b, n))
        left -= n
    return out


def _order_row(o, accs):
    acc = accs.get(o.customer_id)
    items = [{'product': it.product.product_name if it.product_id else 'Deleted product', 'pid': (it.product.sku or '') if it.product_id else '',
              'qty': it.quantity, 'price': it.price, 'net': it.line_net,
              'stock': int(it.product.total_quantity or 0) if it.product_id else 0} for it in o.items.all()]
    return {
        'id': str(o.id), 'order_no': o.tracking_id, 'date': o.created_at, 'status': o.status,
        'customer': o.customer_name, 'phone': o.phone_number, 'whatsapp': o.whatsapp_number or '', 'address': o.shipping_address,
        'notes': o.notes or '', 'payment_method': o.payment_method, 'total': o.total_amount, 'shipping': o.shipping_cost,
        'account': {'id': acc.id, 'acc_id': acc.acc_id, 'name': acc.name} if acc else None,
        'invoices': o.trade_invoices, 'items': items,
        'invoice_links': [{'id': str(i), 'no': n} for i, n in Order.objects.filter(
            tracking_id__in=[x.strip() for x in o.trade_invoices.split(',') if x.strip()]).values_list('id', 'tracking_id')] if o.trade_invoices else [],
    }


class OnlineOrderViewSet(viewsets.ViewSet):
    """Trade › Online Orders: the shop's orders waiting to be confirmed (and the ones done)."""
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        # Shop orders: not Trade S-invoices. Those of no tenant (a guest order) are the shop's too.
        tid = tenant_id_for(self.request.user)
        qs = Order.objects.exclude(tracking_id__startswith='S')
        if not getattr(self.request.user, 'is_superuser', False):
            qs = qs.filter(Q(tenant_id=tid) | Q(tenant__isnull=True))
        return qs

    def list(self, request):
        """?show=new (waiting) | done (invoiced) | cancelled | all."""
        from modules.company.models import LedgerAccount
        show = request.query_params.get('show') or 'new'
        qs = self._qs()
        if show == 'new':
            qs = qs.filter(trade_invoices='').exclude(status__in=['CANCELLED', 'REJECTED'])
        elif show == 'done':
            qs = qs.exclude(trade_invoices='')
        elif show == 'cancelled':
            qs = qs.filter(status__in=['CANCELLED', 'REJECTED'])
        qs = qs.select_related('customer').prefetch_related('items__product').order_by('-created_at')[:500]
        orders = list(qs)
        accs = {a.customer_id: a for a in LedgerAccount.objects.filter(customer_id__in=[o.customer_id for o in orders if o.customer_id])}
        waiting = self._qs().filter(trade_invoices='').exclude(status__in=['CANCELLED', 'REJECTED']).count()
        return Response({'waiting': waiting, 'rows': [_order_row(o, accs) for o in orders]})

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Make the shop order Trade sale invoice(s). Body: {staff?, account? (ledger id, for a
        guest's order: else an account is made from the order's name / phone / address), sale_date?}"""
        from modules.company.models import LedgerAccount
        from modules.customer.models import Customer
        from modules.products.models import Product
        from .models import SalesStaff
        from .views import OrderViewSet
        from .vouchers import account_balance
        d = request.data
        try:
            with transaction.atomic():
                o = self._qs().select_for_update().filter(pk=pk).first()
                if not o:
                    return Response({'detail': 'Order not found.'}, status=404)
                if o.trade_invoices:
                    return Response({'detail': f'Already invoiced: {o.trade_invoices}.', 'already': True}, status=409)
                if o.status in ('CANCELLED', 'REJECTED'):
                    return Response({'detail': 'This order was cancelled.'}, status=400)
                accounts = scope_to_tenant(request.user, LedgerAccount.objects.filter(customer__isnull=False), 'tenant')
                acc = None
                if o.customer_id:
                    acc = ensure_customer_account(o.customer)
                elif d.get('account'):
                    acc = accounts.filter(pk=d.get('account')).first()
                    if not acc:
                        return Response({'detail': 'That customer account was not found.'}, status=400)
                else:   # a guest's order: a new customer account from the order's details
                    import secrets
                    from django.contrib.auth.hashers import make_password
                    from modules.company.views import LedgerAccountViewSet
                    from modules.company.models import AccountGroup
                    tid = tenant_id_for(request.user) or shop_tenant_id()
                    group = AccountGroup.objects.filter(code=CUSTOMER_GROUP, level=3, tenant_id=tid).first()
                    if not group:
                        return Response({'detail': 'The Chart of Account has no Accounts Receivables (1202) group.'}, status=400)
                    acc_id = LedgerAccountViewSet._next_acc_id(group, LedgerAccount.objects.filter(tenant_id=tid))
                    cust = Customer.objects.create(username=f'cust{acc_id}', email=f'cust{acc_id}@legacy.local',
                                                   password=make_password(secrets.token_urlsafe(12)), first_name=(o.customer_name or '')[:100],
                                                   phone=(o.phone_number or '')[:20], address=o.shipping_address or '', tenant_id=tid)
                    acc = LedgerAccount.objects.create(acc_id=acc_id, name=(o.customer_name or 'Online customer')[:255], group=group,
                                                       cell_no=(o.phone_number or '')[:40], address=o.shipping_address or '',
                                                       contact_person='Shop customer', customer=cust, tenant_id=tid)
                if not acc:
                    return Response({'detail': 'No customer account for this order.'}, status=400)
                staff = SalesStaff.objects.filter(pk=d.get('staff')).first() if d.get('staff') else None
                # Lines: the shop price, stock from the batches (earliest expiry first).
                items = []
                for it in o.items.select_related('product'):
                    if not it.product_id:
                        return Response({'detail': 'A product on this order was deleted.'}, status=400)
                    p = Product.objects.select_for_update().get(pk=it.product_id)
                    for b, n in pick_batches(p, (it.quantity or 0) + (it.bonus_quantity or 0)):
                        items.append({'id': str(p.id), 'batch_id': str(b.id) if b else None, 'quantity': n, 'bonus_quantity': 0,
                                      'price': str(it.price), 'discount': 0, 'shelf_discount': 0, 'sale_unit': 'PIECE'})
                release_reservation(o)
                try:
                    day = datetime.date.fromisoformat(str(d.get('sale_date'))[:10]) if d.get('sale_date') else datetime.date.today()
                except ValueError:
                    return Response({'detail': 'Invalid date.'}, status=400)
                view = OrderViewSet(); view.request = request; view.format_kwarg = None; view.action = 'create'
                out = view.save_bill(request, {
                    'customer': acc.customer_id, 'customer_name': acc.name, 'shipping_address': o.shipping_address or '-',
                    'phone_number': o.phone_number or 'N/A', 'notes': f'Online order {o.tracking_id}', 'status': 'DELIVERED',
                    'payment_method': 'SHOP', 'discount': 0, 'shipping_cost': 0, 'staff': staff.id if staff else None,
                    'prev_balance': str(account_balance(acc, request.user)), 'paid': 0, 'card': 0, 'sale_date': str(day),
                    'items': items,
                }, first_extra={'shipping_cost': str(o.shipping_cost or 0)} if (o.shipping_cost or 0) > 0 else None)
                nos = ', '.join(i['tracking_id'] for i in out['invoices'])
                Order.objects.filter(pk=o.pk).update(trade_invoices=nos[:120], status='CONFIRMED', customer_id=acc.customer_id,
                                                     tenant_id=o.tenant_id or tenant_id_for(request.user))
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        return Response({'order_no': o.tracking_id, 'invoices': out['invoices'], 'account': acc.acc_id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            o = self._qs().select_for_update().filter(pk=pk).first()
            if not o:
                return Response({'detail': 'Order not found.'}, status=404)
            if o.trade_invoices:
                return Response({'detail': f'Already invoiced ({o.trade_invoices}) — make a Sale Return instead.'}, status=400)
            release_reservation(o)
            Order.objects.filter(pk=o.pk).update(status='CANCELLED')
        return Response({'order_no': o.tracking_id, 'status': 'CANCELLED'})

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        """For the customer's tracking: an invoiced order's Shipped / Delivered (no stock or money moves)."""
        st = str(request.data.get('status') or '').upper()
        if st not in ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'):
            return Response({'detail': 'Choose Confirmed, Processing, Shipped or Delivered.'}, status=400)
        o = self._qs().filter(pk=pk).first()
        if not o:
            return Response({'detail': 'Order not found.'}, status=404)
        if not o.trade_invoices:
            return Response({'detail': 'Confirm the order (make the invoice) first.'}, status=400)
        from django.utils import timezone
        Order.objects.filter(pk=o.pk).update(status=st, delivered_at=timezone.now() if st == 'DELIVERED' else o.delivered_at)
        return Response({'order_no': o.tracking_id, 'status': st})

    @action(detail=False, methods=['get', 'post'])
    def shop_login(self, request):
        """A Trade customer's shop login. GET ?account=<ledger id> -> {login, has_login}.
        POST {account, email, password}: set the e-mail they log in with and their password."""
        from django.contrib.auth.hashers import is_password_usable, make_password
        from modules.company.models import LedgerAccount
        from modules.customer.models import Customer
        accs = scope_to_tenant(request.user, LedgerAccount.objects.filter(customer__isnull=False), 'tenant').select_related('customer')
        acc = accs.filter(pk=request.data.get('account') or request.query_params.get('account')).first()
        if not acc:
            return Response({'detail': 'Find the customer account first.'}, status=400)
        c = acc.customer
        real = not str(c.email or '').endswith('@legacy.local')
        if request.method == 'GET':
            return Response({'account': acc.id, 'acc_id': acc.acc_id, 'name': acc.name, 'login': c.email if real else '',
                             'has_login': real and is_password_usable(c.password), 'phone': c.phone})
        email = str(request.data.get('email') or '').strip().lower()
        pw = str(request.data.get('password') or '')
        if '@' not in email or '.' not in email.split('@')[-1]:
            return Response({'detail': 'Enter the e-mail address they will log in with.'}, status=400)
        if len(pw) < 6:
            return Response({'detail': 'The password must be at least 6 characters.'}, status=400)
        if Customer.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exclude(pk=c.pk).exists():
            return Response({'detail': 'Another customer already uses that e-mail.'}, status=400)
        # Only the e-mail and password: the username (cust<acc_id>) stays — Trade reads the account no. from it.
        c.email = email; c.password = make_password(pw); c.is_active = True; c.status = 'active'
        c.save(update_fields=['email', 'password', 'is_active', 'status'])
        return Response({'account': acc.id, 'login': email, 'has_login': True})
