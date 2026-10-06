from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from modules.supplier.models import Supplier
from modules.supplier.serializers import SupplierSerializer
from .models import Area, Company
from .serializers import AreaSerializer, CompanySerializer
from core.permissions import HasModulePermission
from core.scoping import tenant_id_for, is_platform_operator, scope_to_tenant


class CompanyViewSet(viewsets.ModelViewSet):
    """Admin-facing Company / brand registry (name, contact numbers, category).
    Tenant-scoped: each admin manages their own companies; the super admin sees all."""
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if (getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False)
                or getattr(user, 'is_delivery', False)):
            return Company.objects.none()
        return scope_to_tenant(user, Company.objects.all(), 'tenant').order_by('name')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        tid = tenant_id_for(self.request.user)
        serializer.save(**({'tenant_id': tid} if tid else {}))


def _is_portal_login(user):
    """Supplier / customer / delivery shadow logins — never allowed into the
    admin-facing supplier registry."""
    return bool(getattr(user, 'is_supplier', False)
                or getattr(user, 'is_customer', False)
                or getattr(user, 'is_delivery', False))


class AreaViewSet(viewsets.ModelViewSet):
    """CRUD for geographic areas / territories used in Area Manager scoping.

    Reads are public so the storefront's "Deliver to" city picker works for
    guests too; writes still require an authenticated, permitted staff user.
    """
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'areas'

    def get_queryset(self):
        from core.scoping import is_platform_operator
        qs = Area.objects.all()
        user = self.request.user
        # Areas/territories are a SUPER-ADMIN-only function. Internal branch admins
        # & staff never see them. The public storefront / customer / supplier /
        # delivery portals still get the global delivery-city list for checkout.
        if is_platform_operator(user):
            pass  # Super Admin manages every area
        elif (not getattr(user, 'is_authenticated', False)
              or getattr(user, 'is_customer', False)
              or getattr(user, 'is_supplier', False)
              or getattr(user, 'is_delivery', False)):
            qs = qs.filter(tenant__isnull=True)
        else:
            qs = qs.none()
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def _ensure_super(self):
        from rest_framework.exceptions import PermissionDenied
        if not is_platform_operator(self.request.user):
            raise PermissionDenied('Only the super admin can manage areas / territories.')

    def create(self, request, *args, **kwargs):
        self._ensure_super()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._ensure_super()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._ensure_super()
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        # tenant is a FK — assign via *_id so an int/None binds correctly (a bare
        # `tenant=<int>` raises ValueError on save for non-super creators).
        # A platform operator has no tenant of their own; a new sub-area then
        # belongs to the same tenant as its parent area.
        tid = tenant_id_for(self.request.user)
        parent = serializer.validated_data.get('parent')
        if tid is None and parent is not None:
            tid = parent.tenant_id
        serializer.save(tenant_id=tid)


class SupplierViewSet(viewsets.ModelViewSet):
    """Admin-facing Supplier registry.

    Suppliers are shared across all Admins by design (each Admin's *ledger* with a
    supplier is still tenant-scoped, see supplier ledger). Access is therefore
    limited to authenticated internal staff; portal/shadow logins and anonymous
    requests are denied — the endpoint previously ran `AllowAny`, which exposed
    supplier PII (and passwords) to the public.
    """
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'suppliers'

    def get_queryset(self):
        if _is_portal_login(self.request.user):
            return Supplier.objects.none()
        # Per-Admin isolation: each admin sees only their own suppliers; the Super
        # Admin sees all (scope_to_tenant is a no-op for the platform operator).
        return scope_to_tenant(self.request.user, Supplier.objects.all(), 'tenant').order_by('-created_at')

    def paginate_queryset(self, queryset):
        # The supplier registry + purchase-order supplier picker load the full list
        # and paginate client-side, so honour an explicit opt-out.
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        # Stamp the creating admin as the owning tenant so it stays private to them.
        tid = tenant_id_for(self.request.user)
        serializer.save(**({'tenant_id': tid} if tid else {}))

    def create(self, request, *args, **kwargs):
        if _is_portal_login(request.user):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


# ───────────────────────── Chart of Accounts (legacy Trade 2.1) ─────────────────────────
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import action
from .models import AccountGroup, LedgerAccount

CUSTOMER_GROUP = 1202   # Accounts Receivables
SUPPLIER_GROUP = 2201   # Account Payables


def _ledger_row(a):
    g = a.group
    return {
        'id': a.id, 'acc_id': a.acc_id, 'name': a.name,
        'group': g.code, 'group_name': g.name,
        'area': a.area_id, 'area_name': a.area.name if a.area_id else None,
        'cell_no': a.cell_no, 'contact_person': a.contact_person, 'status': a.status,
        'customer': a.customer_id, 'supplier': str(a.supplier_id) if a.supplier_id else None,
    }


class AccountGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """Chart of Accounts headings (levels 1-3) for the account dropdowns."""
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        return scope_to_tenant(self.request.user, AccountGroup.objects.all(), 'tenant')

    def list(self, request, *args, **kwargs):
        rows = [{'id': g.id, 'code': g.code, 'name': g.name, 'level': g.level,
                 'parent': g.parent.code if g.parent_id else None}
                for g in self.get_queryset().select_related('parent')]
        return Response(rows)


class LedgerAccountViewSet(viewsets.ViewSet):
    """Chart of Accounts entries. ?group=1202 filters by level-3 group, ?q= searches."""
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, LedgerAccount.objects.all(), 'tenant') \
            .select_related('group', 'area')

    def _group(self, code):
        try:
            code = int(code)
        except (TypeError, ValueError):
            return None
        return scope_to_tenant(self.request.user, AccountGroup.objects.filter(code=code, level=3), 'tenant').first()

    @staticmethod
    def _next_acc_id(group, qs):
        """Level-3 code + next 4-digit sequence. Customer usernames (cust<acc_id>)
        are globally unique, so receivables also skip any code already taken there."""
        prefix = str(group.code)
        taken = list(qs.filter(group=group).values_list('acc_id', flat=True))
        if group.code == CUSTOMER_GROUP:
            from modules.customer.models import Customer
            taken += [u[4:] for u in Customer.objects.filter(username__startswith=f'cust{prefix}')
                      .values_list('username', flat=True)]
        seq = max([int(t[len(prefix):]) for t in taken if t.startswith(prefix) and t[len(prefix):].isdigit()] or [0])
        return f"{prefix}{seq + 1:04d}"

    def list(self, request):
        qs = self._qs()
        if request.query_params.get('group'):
            qs = qs.filter(group__code=request.query_params['group'])
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(acc_id__icontains=q))
        return Response([_ledger_row(a) for a in qs[:2000]])

    @action(detail=False, methods=['get'])
    def next_id(self, request):
        group = self._group(request.query_params.get('group'))
        if not group:
            return Response({'acc_id': None})
        return Response({'acc_id': self._next_acc_id(group, self._qs())})

    def create(self, request):
        d = request.data
        group = self._group(d.get('group'))
        name = (d.get('name') or '').strip()
        if not group:
            return Response({'detail': 'Select the Acc 3rd Level.'}, status=status.HTTP_400_BAD_REQUEST)
        if not name:
            return Response({'detail': 'Enter the account name.'}, status=status.HTTP_400_BAD_REQUEST)
        area = None
        if d.get('area'):
            area = Area.objects.filter(id=d.get('area')).first()
        st = 'inactive' if str(d.get('status', '')).lower() == 'inactive' else 'active'
        cell = (d.get('cell_no') or '').strip()[:40]
        contact = (d.get('contact_person') or '').strip()[:150]
        # New accounts belong to the actor's tenant; a platform operator adds to
        # the tenant that owns the chosen group.
        tenant_id = tenant_id_for(request.user) or group.tenant_id

        with transaction.atomic():
            acc_id = self._next_acc_id(group, self._qs())
            customer = supplier = None
            if group.code == CUSTOMER_GROUP:
                import secrets
                from django.contrib.auth.hashers import make_password
                from modules.customer.models import Customer
                customer = Customer.objects.create(
                    username=f'cust{acc_id}', email=f'cust{acc_id}@legacy.local',
                    password=make_password(secrets.token_urlsafe(12)),
                    first_name=name[:100], phone=cell[:20], area=area,
                    tenant_id=tenant_id, created_by=request.user if request.user.is_staff else None,
                    status=st, is_active=st == 'active',
                )
            elif group.code == SUPPLIER_GROUP:
                supplier = Supplier.objects.create(
                    name=name, contact_person=contact or None, phone=cell or None,
                    tenant_id=tenant_id, status=st, is_active=st == 'active',
                )
            acc = LedgerAccount.objects.create(
                acc_id=acc_id, name=name, group=group, area=area, cell_no=cell,
                contact_person=contact, status=st, customer=customer, supplier=supplier,
                tenant_id=tenant_id,
            )
        out = _ledger_row(acc)
        if customer:
            from modules.customer.serializers import CustomerSerializer
            out['customer_record'] = CustomerSerializer(customer, context={'request': request}).data
        return Response(out, status=status.HTTP_201_CREATED)
