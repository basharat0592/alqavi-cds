from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db.models import Sum
from .models import PaymentCategory, Payment
from .serializers import (
    PaymentCategorySerializer,
    PaymentSerializer,
)


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment categories."""
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing general payments."""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference_number', 'payer_payee', 'description']
    ordering_fields = ['date', 'amount', 'created_at']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_stats(request):
    """Get financial statistics for the dashboard."""
    total_inbound = Payment.objects.filter(payment_type='inbound').aggregate(Sum('amount'))['amount__sum'] or 0
    total_outbound = Payment.objects.filter(payment_type='outbound').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return Response({
        'total_inbound': float(total_inbound),
        'total_outbound': float(total_outbound),
        'net_balance': float(total_inbound - total_outbound)
    })
