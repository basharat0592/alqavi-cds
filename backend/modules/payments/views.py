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


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'

    def paginate_queryset(self, queryset):
        return None  # categories are a small fixed list — never paginate


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'

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
        return qs

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        user = user if getattr(user, 'pk', None) and user.__class__.__name__ == 'User' else None
        # Manual entries only — auto entries are created by the ledger services.
        serializer.save(user=user, source='manual', is_auto=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_auto:
            return Response(
                {"error": "Auto-generated entries can't be deleted here. "
                          "Reverse the related sale, purchase or return instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class TransactionPaymentViewSet(viewsets.ModelViewSet):
    """Installments (partial payments) recorded against a single transaction.

    List/create with ?source_type=&source_id=. Each confirmed installment posts
    a ledger row and recomputes the parent's paid amount / status via services.
    """
    serializer_class = TransactionPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'payments'

    def get_queryset(self):
        qs = TransactionPayment.objects.select_related('created_by').all()
        st = self.request.query_params.get('source_type')
        sid = self.request.query_params.get('source_id')
        if st:
            qs = qs.filter(source_type=st)
        if sid:
            qs = qs.filter(source_id=str(sid))
        return qs

    def paginate_queryset(self, queryset):
        # A transaction has only a handful of installments — return the lot.
        return None

    def perform_create(self, serializer):
        user = self.request.user
        user = user if getattr(user, 'pk', None) and user.__class__.__name__ == 'User' else None
        tp = serializer.save(created_by=user)
        services.record_installment(tp)

    def perform_update(self, serializer):
        tp = serializer.save()
        services.record_installment(tp)

    def perform_destroy(self, instance):
        st, sid = instance.source_type, instance.source_id
        services._remove_installment_ledger(instance)
        instance.delete()
        services.recompute_parent(st, sid)


def _due_row(kind, ref, party, total, paid, remaining, due_date, sid):
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
    for o in orders.only('id', 'tracking_id', 'customer_name', 'total_amount',
                         'amount_paid', 'due_date'):
        rem = o.remaining_amount
        if rem and rem > 0:
            rows.append(_due_row('sale', o.tracking_id, o.customer_name or 'Walk-in Customer',
                                 o.total_amount, o.amount_paid, rem, o.due_date, o.id))

    # Purchases we still owe suppliers.
    for p in (PurchaseOrder.objects.exclude(status='CANCELLED')
              .select_related('supplier')):
        rem = p.remaining_amount
        if rem and rem > 0:
            rows.append(_due_row('purchase', p.purchase_number, _supplier_name(p.supplier),
                                 p.total_amount, p.paid_amount, rem, p.due_date, p.pk))

    # Sale returns: refunds we still owe customers.
    for r in (SaleReturn.objects.filter(status='ACCEPTED', refund_status='PENDING')
              .select_related('order')):
        rem = r.refund_remaining
        if rem and rem > 0:
            party = getattr(r.order, 'customer_name', None) or 'Customer'
            rows.append(_due_row('sale_return', r.return_number, party,
                                 rem, 0, rem, r.due_date, r.pk))

    # Purchase returns: refunds suppliers still owe us.
    for r in (PurchaseReturn.objects.filter(status='ACCEPTED', refund_status='PENDING')
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
    qs = Payment.objects.all()
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
