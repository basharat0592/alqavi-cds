from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.contrib.auth.hashers import make_password
from .models import Customer
from .serializers import CustomerSerializer, CustomerCreateSerializer
from core.permissions import HasModulePermission

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer CRUD operations"""
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny, HasModulePermission]
    perm_module = 'customers'

    def get_queryset(self):
        qs = Customer.objects.all().order_by('-created_at')
        from core.scoping import user_area_ids, scope_to_tenant, is_platform_operator
        user = self.request.user
        # Fail CLOSED for the admin LIST/detail read: an unauthenticated or
        # non-staff caller must never be able to dump customers across tenants.
        # (The storefront self-signup CREATE path does not go through here.)
        if not is_platform_operator(user) and not getattr(user, 'is_staff', False):
            return qs.none()
        # Area Manager scoping: only customers in their assigned area(s).
        area_ids = user_area_ids(user)
        if area_ids is not None:
            qs = qs.filter(area_id__in=area_ids)
        # Per-admin (tenant) isolation: a tenant user only sees their tenant's
        # customers; the platform operator (super admin) sees all.
        qs = scope_to_tenant(user, qs, 'tenant')
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new Customer with hashed password."""
        data = request.data.copy()
        if data.get('password'):
            data['password'] = make_password(data['password'])

        # Email is OPTIONAL for admin-added (walk-in) customers. The model needs a
        # unique email + username, so generate a stable placeholder from the phone
        # (or a random slug) when none was provided.
        if not (data.get('email') or '').strip():
            import uuid as _uuid
            phone_digits = ''.join(ch for ch in str(data.get('phone') or '') if ch.isdigit())
            base = f"walkin_{phone_digits or _uuid.uuid4().hex[:10]}"
            email = f"{base}@walkin.local"
            n = 1
            while Customer.objects.filter(email=email).exists():
                email = f"{base}_{n}@walkin.local"
                n += 1
            data['email'] = email

        if not data.get('username') and data.get('email'):
            # Use email as username to ensure uniqueness, or fallback to prefix if email is missing
            data['username'] = data.get('email')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        # Stamp the creating admin so the customer is scoped to them (per-admin
        # isolation). Null for self-registered / anonymous storefront signups.
        from core.scoping import tenant_id_for
        creator = request.user if getattr(request.user, 'is_staff', False) else None
        customer = serializer.save(
            plain_password=request.data.get('password'),
            created_by=creator,
            tenant_id=tenant_id_for(request.user),
        )
        
        # Return detail serializer output with context for absolute URLs
        return Response(CustomerSerializer(customer, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update customer details, handling password separately if provided."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        has_new_password = False
        new_password = data.get('password')
        if new_password:
            has_new_password = True
            data.pop('password', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        if has_new_password:
            instance.password = make_password(new_password)
            instance.plain_password = new_password
            instance.save(update_fields=['password', 'plain_password'])

        return Response(CustomerSerializer(instance, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """Running statement + receivables aging for one customer."""
        from modules.sales.models import Order, SaleReturn
        from modules.payments.services import aging_buckets
        from core.scoping import apply_report_scope

        customer = self.get_object()
        # Per-admin: a branch admin sees only the sales for this customer that THEY
        # handled; super admin sees all (with optional ?created_by / ?warehouse).
        orders = apply_report_scope(request,
                                    (Order.objects.filter(customer=customer)
                                     .exclude(status__in=['CANCELLED', 'REJECTED'])
                                     .order_by('created_at', 'tracking_id')),
                                    'warehouse', 'created_by', tenant_field='tenant')

        entries = []
        total_billed = 0.0
        total_paid = 0.0
        balance = 0.0
        aging_items = []
        for o in orders:
            billed = float(o.total_amount or 0)
            paid = float(o.amount_paid or 0)
            total_billed += billed
            total_paid += paid
            balance += billed - paid
            rem = billed - paid
            if rem > 0:
                aging_items.append((rem, o.due_date or o.created_at.date()))
            entries.append({
                'date': o.created_at.date().isoformat(),
                'type': 'sale',
                'ref': o.tracking_id,
                'description': f"Sale #{o.tracking_id}",
                'debit': billed,        # customer owes us
                'credit': paid,         # customer paid us
                'remaining': rem,
                'payment_status': o.payment_status,
                'due_date': o.due_date.isoformat() if o.due_date else None,
                'is_overdue': o.is_overdue,
                'days_overdue': o.days_overdue,
                'balance': round(balance, 2),
            })

        # Accepted sale returns reduce what the customer owes (money back to them).
        total_refunds = 0.0
        for r in apply_report_scope(request,
                                    SaleReturn.objects.filter(customer=customer, status='ACCEPTED').order_by('created_at'),
                                    'order__warehouse', 'order__created_by', tenant_field='tenant'):
            amt = float(r.refund_amount or 0) or float(r.items_total or 0)
            total_refunds += amt
            balance -= amt
            entries.append({
                'date': r.created_at.date().isoformat(),
                'type': 'sale_return',
                'ref': r.return_number,
                'description': f"Sale return {r.return_number}",
                'debit': 0.0,
                'credit': amt,
                'remaining': 0.0,
                'payment_status': r.refund_status,
                'due_date': r.due_date.isoformat() if r.due_date else None,
                'is_overdue': False,
                'days_overdue': 0,
                'balance': round(balance, 2),
            })

        entries.sort(key=lambda e: e['date'])
        outstanding = round(total_billed - total_paid, 2)
        return Response({
            'customer': {'id': customer.id, 'name': customer.name, 'phone': customer.phone},
            'summary': {
                'total_billed': round(total_billed, 2),
                'total_paid': round(total_paid, 2),
                'total_refunds': round(total_refunds, 2),
                'outstanding': outstanding,
            },
            'aging': aging_buckets(aging_items),
            'entries': entries,
        })
