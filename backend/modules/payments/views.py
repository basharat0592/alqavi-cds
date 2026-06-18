from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum, Q

from .models import Payment, PaymentCategory
from .serializers import PaymentSerializer, PaymentCategorySerializer


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def paginate_queryset(self, queryset):
        return None  # categories are a small fixed list — never paginate


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

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
