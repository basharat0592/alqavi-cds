from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Supplier
from .serializers import SupplierSerializer
from modules.users.models import Role
from core.permissions import HasModulePermission

User = get_user_model()

class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for Supplier CRUD operations"""
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [AllowAny, HasModulePermission]
    perm_module = 'suppliers'

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Supplier creation logic - Hashing handled by Serializer."""
        data = request.data.copy()
        
        # Set default username if missing
        if not data.get('username') and data.get('email'):
            data['username'] = data.get('email').split('@')[0]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update supplier details - Hashing handled by Serializer."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(SupplierSerializer(instance).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete supplier and its associated Shadow User record."""
        instance = self.get_object()
        email = instance.email
        
        from modules.users.models import User as ShadowUser
        ShadowUser.objects.filter(email=email, is_supplier=True, real_id=instance.id).delete()

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """Running statement + payables aging for one supplier."""
        from modules.sales.models import PurchaseOrder, PurchaseReturn
        from modules.payments.services import aging_buckets
        from core.scoping import apply_report_scope

        supplier = self.get_object()
        # Per-admin: a branch admin sees only the purchases for this supplier that
        # THEY created; super admin sees all (with optional ?created_by / ?warehouse).
        pos = apply_report_scope(request,
                                 (PurchaseOrder.objects.filter(supplier=supplier)
                                  .exclude(status='CANCELLED').order_by('order_date', 'purchase_number')),
                                 'warehouse', 'created_by')

        entries = []
        total_billed = 0.0   # what we owe the supplier
        total_paid = 0.0
        balance = 0.0
        aging_items = []
        for p in pos:
            billed = float(p.total_amount or 0)
            paid = float(p.paid_amount or 0)
            total_billed += billed
            total_paid += paid
            balance += billed - paid
            rem = billed - paid
            if rem > 0:
                basis = p.due_date or (p.order_date.date() if p.order_date else None)
                aging_items.append((rem, basis))
            entries.append({
                'date': p.order_date.date().isoformat() if p.order_date else None,
                'type': 'purchase',
                'ref': p.purchase_number,
                'description': f"Purchase #{p.purchase_number}",
                'debit': billed,       # we owe supplier
                'credit': paid,        # we paid supplier
                'remaining': rem,
                'payment_status': p.payment_status,
                'due_date': p.due_date.isoformat() if p.due_date else None,
                'is_overdue': p.is_overdue,
                'days_overdue': p.days_overdue,
                'balance': round(balance, 2),
            })

        # Accepted purchase returns: supplier refunds us (reduces what we owe).
        total_refunds = 0.0
        for r in apply_report_scope(request,
                                    PurchaseReturn.objects.filter(supplier=supplier, status='ACCEPTED').order_by('created_at'),
                                    'purchase_order__warehouse', 'purchase_order__created_by'):
            amt = float(r.total_refund_amount or 0)
            total_refunds += amt
            balance -= amt
            entries.append({
                'date': r.created_at.date().isoformat(),
                'type': 'purchase_return',
                'ref': r.return_number,
                'description': f"Purchase return {r.return_number}",
                'debit': 0.0,
                'credit': amt,
                'remaining': 0.0,
                'payment_status': r.refund_status,
                'due_date': r.due_date.isoformat() if r.due_date else None,
                'is_overdue': False,
                'days_overdue': 0,
                'balance': round(balance, 2),
            })

        entries.sort(key=lambda e: (e['date'] or ''))
        outstanding = round(total_billed - total_paid, 2)
        return Response({
            'supplier': {'id': supplier.id, 'name': _supplier_display(supplier),
                         'phone': supplier.phone},
            'summary': {
                'total_billed': round(total_billed, 2),
                'total_paid': round(total_paid, 2),
                'total_refunds': round(total_refunds, 2),
                'outstanding': outstanding,
            },
            'aging': aging_buckets(aging_items),
            'entries': entries,
        })


def _supplier_display(sup):
    return (getattr(sup, 'company', None) or getattr(sup, 'name', None)
            or getattr(sup, 'username', None) or 'Supplier')
