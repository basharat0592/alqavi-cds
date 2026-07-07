from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum, Q

from . import services
from .models import Payment, PaymentCategory, TransactionPayment
from .serializers import (
    PaymentSerializer, PaymentCategorySerializer, TransactionPaymentSerializer,
)
from core.permissions import HasModulePermission
from core.scoping import (
    BranchScopedQuerysetMixin, scope_queryset, user_warehouse_ids,
    user_can_use_warehouse, apply_report_scope,
    tenant_id_for, is_platform_operator,
)


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    # PaymentCategory is a GLOBAL (shared) lookup — NOT tenant-scoped. Reads are
    # open to any authenticated user with the module permission; mutations are
    # restricted to the platform operator (super admin) so a tenant can't alter
    # the shared category list everyone depends on.
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'

    def paginate_queryset(self, queryset):
        return None  # categories are a small fixed list — never paginate

    def _ensure_platform_operator(self):
        from rest_framework.exceptions import PermissionDenied
        if not is_platform_operator(self.request.user):
            raise PermissionDenied('Only the super admin can manage payment categories.')

    def create(self, request, *args, **kwargs):
        self._ensure_platform_operator()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._ensure_platform_operator()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._ensure_platform_operator()
        return super().destroy(request, *args, **kwargs)


class PaymentViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'
    branch_field = 'warehouse'
    # Tenant (owning Admin) is THE isolation axis — branch/creator scoping is
    # superseded once tenant_field is set.
    tenant_field = 'tenant'

    def get_queryset(self):
        qs = Payment.objects.select_related('category', 'user').all()

        ptype = self.request.query_params.get('payment_type') or self.request.query_params.get('type')
        if ptype and ptype != 'all':
            qs = qs.filter(payment_type=ptype)

        source = self.request.query_params.get('source')
        if source and source != 'all':
            qs = qs.filter(source=source)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(payer_payee__icontains=search)
                | Q(reference_number__icontains=search)
                | Q(description__icontains=search)
            )

        # The Super Admin's own ledger pages (Payments / Income / Expense) show ONLY
        # the platform operator's OWN entries (tenant NULL) — a branch admin's sales
        # income belongs to that admin and stays out of the super admin's books.
        # A branch drill-down (?warehouse / ?created_by) or an explicit ?scope=all
        # override this so reports can still aggregate across branches.
        params = self.request.query_params
        if is_platform_operator(self.request.user):
            if not (params.get('warehouse') or params.get('created_by') or params.get('scope') == 'all'):
                qs = qs.filter(tenant__isnull=True)
        return qs

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        actor = self.request.user
        real_user = actor if getattr(actor, 'pk', None) and actor.__class__.__name__ == 'User' else None
        # Branch for this manual entry: honour an explicit choice (super admin can
        # pick any; a branch admin only their own), otherwise default to the
        # creator's branch when they have exactly one.
        wh_id = self.request.data.get('warehouse') or self.request.data.get('warehouse_id')
        if wh_id and not user_can_use_warehouse(actor, wh_id):
            raise PermissionDenied('You cannot record a payment for that branch.')
        if not wh_id:
            ids = user_warehouse_ids(actor)
            if ids:
                wh_id = sorted(ids)[0]
        # Manual entries only — auto entries are created by the ledger services.
        serializer.save(user=real_user, source='manual', is_auto=False,
                        warehouse_id=wh_id or None, tenant_id=tenant_id_for(actor))

    def destroy(self, request, *args, **kwargs):
        # Any ledger line can be deleted from here (incl. auto ones). Note: deleting
        # an auto entry only removes the ledger row — the source sale/purchase/return
        # is untouched and may re-create the row if it is edited again.
        return super().destroy(request, *args, **kwargs)


class TransactionPaymentViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    """Installments (partial payments) recorded against a single transaction.

    List/create with ?source_type=&source_id=. Each confirmed installment posts
    a ledger row and recomputes the parent's paid amount / status via services.
    """
    serializer_class = TransactionPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'
    branch_field = 'warehouse'
    # Tenant (owning Admin) is THE isolation axis.
    tenant_field = 'tenant'
    shadow_safe = True

    def get_queryset(self):
        qs = TransactionPayment.objects.select_related('created_by').all()
        user = self.request.user

        if user and not getattr(user, 'is_staff', False):
            from modules.sales.models import Order, PurchaseOrder
            
            # Check if customer
            if getattr(user, 'is_customer', False) or user.__class__.__name__ == 'Customer':
                order_ids = Order.objects.filter(Q(customer=user) | Q(customer_id=user.id) | Q(user=user) | Q(user_id=user.id)).values_list('id', flat=True)
                qs = qs.filter(source_type='order', source_id__in=[str(o_id) for o_id in order_ids])
            elif getattr(user, 'is_supplier', False) or user.__class__.__name__ == 'Supplier':
                po_ids = PurchaseOrder.objects.filter(supplier_id=user.id).values_list('id', flat=True)
                qs = qs.filter(source_type='purchaseorder', source_id__in=[str(po_id) for po_id in po_ids])
            else:
                qs = qs.none()

        st = self.request.query_params.get('source_type')
        sid = self.request.query_params.get('source_id')
        status = self.request.query_params.get('status')
        if st:
            qs = qs.filter(source_type=st)
        if sid:
            qs = qs.filter(source_id=str(sid))
        if status:
            qs = qs.filter(status=status)
        return qs

    def paginate_queryset(self, queryset):
        # A transaction has only a handful of installments — return the lot.
        return None

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = self.request.user
        if (getattr(user, 'is_customer', False) or 
            getattr(user, 'is_supplier', False) or 
            getattr(user, 'is_delivery', False) or
            not getattr(user, 'pk', None) or 
            user.__class__.__name__ != 'User' or
            not User.objects.filter(pk=user.pk).exists()):
            user = None
        tp = serializer.save(created_by=user)
        # Stamp the branch + owning tenant from the parent transaction so
        # installments (and the ledger rows they post) stay branch- and
        # tenant-scoped — authoritative even when the actor is a shadow user.
        update_fields = []
        wh_id = tp.warehouse_id or services.parent_warehouse_id(tp.source_type, tp.source_id)
        if wh_id and tp.warehouse_id != wh_id:
            tp.warehouse_id = wh_id
            update_fields.append('warehouse')
        ten_id = services.parent_tenant_id(tp.source_type, tp.source_id)
        if ten_id and tp.tenant_id != ten_id:
            tp.tenant_id = ten_id
            update_fields.append('tenant')
        if update_fields:
            tp.save(update_fields=update_fields)
        services.record_installment(tp)

    def perform_update(self, serializer):
        tp = serializer.save()
        services.record_installment(tp)

    def perform_destroy(self, instance):
        st, sid = instance.source_type, instance.source_id
        services._remove_installment_ledger(instance)
        instance.delete()
        services.recompute_parent(st, sid)


def _due_row(kind, ref, party, total, paid, remaining, due_date, sid, products=''):
    from modules.sales.models import _settlement_alert
    is_overdue, days_overdue, is_due_soon = _settlement_alert(due_date, remaining)
    if is_overdue:
        bucket = 'overdue'
    elif is_due_soon:
        bucket = 'due_soon'
    elif due_date:
        bucket = 'upcoming'
    else:
        bucket = 'no_due_date'
    return {
        'type': kind,
        'ref': ref,
        'party': party,
        'total': float(total or 0),
        'paid': float(paid or 0),
        'remaining': float(remaining or 0),
        'due_date': due_date.isoformat() if due_date else None,
        'days_overdue': days_overdue,
        'is_overdue': is_overdue,
        'is_due_soon': is_due_soon,
        'bucket': bucket,
        'products': products or '',
        'source_type': {'sale': 'order', 'purchase': 'purchaseorder',
                        'sale_return': 'salereturn', 'purchase_return': 'purchasereturn'}.get(kind, kind),
        'source_id': str(sid),
    }


def _supplier_name(sup):
    return (getattr(sup, 'company', None) or getattr(sup, 'name', None)
            or getattr(sup, 'username', None) or 'Supplier')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payments_due(request):
    """Unified due & overdue feed across sales, purchases and both return types.

    ?bucket=overdue|due_soon|all (default all). Respects Area Manager scoping for
    sales (by customer area)."""
    from modules.sales.models import Order, PurchaseOrder, SaleReturn, PurchaseReturn
    from core.scoping import user_area_ids

    want = request.query_params.get('bucket', 'all')
    rows = []

    area_ids = user_area_ids(request.user)

    # Sales with an outstanding balance (partial / on-credit).
    orders = (Order.objects.exclude(payment_status='PAID')
              .exclude(status__in=['CANCELLED', 'REJECTED']))
    if area_ids is not None:
        orders = orders.filter(customer__area_id__in=area_ids)
    orders = apply_report_scope(request, orders, 'warehouse', 'created_by', tenant_field='tenant')
    for o in orders.select_related('customer').prefetch_related('items__product'):
        rem = o.remaining_amount
        if rem and rem > 0:
            prods = ', '.join(
                f"{(it.product.product_name if it.product else 'Item')}×{it.quantity}"
                for it in o.items.all()
            )
            cust_name = o.customer_name
            if o.customer:
                cust_name = f"{o.customer.first_name} {o.customer.last_name}".strip() or o.customer.username
            if not cust_name or cust_name == 'Registered Customer':
                cust_name = 'Registered Customer'
            rows.append(_due_row('sale', o.tracking_id, cust_name,
                                 o.total_amount, o.amount_paid, rem, o.due_date, o.id, products=prods))

    # Purchases we still owe suppliers.
    for p in (apply_report_scope(request,
                                 PurchaseOrder.objects.exclude(status='CANCELLED'),
                                 'warehouse', 'created_by', tenant_field='tenant')
              .select_related('supplier')):
        rem = p.remaining_amount
        if rem and rem > 0:
            rows.append(_due_row('purchase', p.purchase_number, _supplier_name(p.supplier),
                                 p.total_amount, p.paid_amount, rem, p.due_date, p.pk))

    # Sale returns: refunds we still owe customers.
    for r in (apply_report_scope(request,
                                 SaleReturn.objects.filter(status='ACCEPTED', refund_status='PENDING'),
                                 'order__warehouse', 'order__created_by', tenant_field='tenant')
              .select_related('order')):
        rem = r.refund_remaining
        if rem and rem > 0:
            party = getattr(r.order, 'customer_name', None) or 'Customer'
            rows.append(_due_row('sale_return', r.return_number, party,
                                 rem, 0, rem, r.due_date, r.pk))

    # Purchase returns: refunds suppliers still owe us.
    for r in (apply_report_scope(request,
                                 PurchaseReturn.objects.filter(status='ACCEPTED', refund_status='PENDING'),
                                 'purchase_order__warehouse', 'purchase_order__created_by', tenant_field='tenant')
              .select_related('supplier')):
        rem = r.refund_remaining
        if rem and rem > 0:
            rows.append(_due_row('purchase_return', r.return_number, _supplier_name(r.supplier),
                                 rem, 0, rem, r.due_date, r.pk))

    summary = {
        'overdue': sum(1 for x in rows if x['bucket'] == 'overdue'),
        'due_soon': sum(1 for x in rows if x['bucket'] == 'due_soon'),
        'upcoming': sum(1 for x in rows if x['bucket'] == 'upcoming'),
        'total_outstanding': round(sum(x['remaining'] for x in rows), 2),
        'overdue_amount': round(sum(x['remaining'] for x in rows if x['bucket'] == 'overdue'), 2),
    }

    if want in ('overdue', 'due_soon', 'upcoming'):
        rows = [x for x in rows if x['bucket'] == want]

    # Most urgent first: overdue (by days desc), then due soon, then the rest.
    order_rank = {'overdue': 0, 'due_soon': 1, 'upcoming': 2, 'no_due_date': 3}
    rows.sort(key=lambda x: (order_rank.get(x['bucket'], 9), -x['days_overdue']))

    return Response({'summary': summary, 'results': rows})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_stats(request):
    # Per-admin totals, matching the income/expense list (Payment.user = the
    # responsible staff). The Super Admin's cards show only their OWN ledger
    # (tenant NULL) to mirror the list — a branch drill-down (?warehouse /
    # ?created_by) or ?scope=all aggregates across branches instead.
    qs = apply_report_scope(request, Payment.objects.all(), 'warehouse', 'user', tenant_field='tenant')
    params = request.query_params
    if is_platform_operator(request.user) and not (
        params.get('warehouse') or params.get('created_by') or params.get('scope') == 'all'
    ):
        qs = qs.filter(tenant__isnull=True)
    inbound = qs.filter(payment_type='inbound').aggregate(t=Sum('amount'))['t'] or 0
    outbound = qs.filter(payment_type='outbound').aggregate(t=Sum('amount'))['t'] or 0
    # "Internal" = manually recorded expenses (rent, salary, etc.), not auto ones.
    internal = qs.filter(payment_type='outbound', source='manual').aggregate(t=Sum('amount'))['t'] or 0

    return Response({
        'total_inbound': float(inbound),
        'total_outbound': float(outbound),
        'total_expenses': float(internal),
        'net_balance': float(inbound) - float(outbound),
    })
