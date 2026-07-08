"""
Users module API views with function-based approach.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.hashers import check_password
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from .models import User, Role, Permission, UserActivityLog, UserSettings
from core.scoping import tenant_id_for, scope_to_tenant, is_platform_operator
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer, UserUpdateSerializer,
    UserPasswordChangeSerializer, UserStatusChangeSerializer, RoleSerializer, PermissionSerializer,
    UserActivityLogSerializer, CustomTokenObtainPairSerializer, UserSettingsSerializer
)
from core.utils import get_or_404_response


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current authenticated user profile (Registry Aware)."""
    user = request.user
    
    # 1. Handle Shadow Supplier
    if getattr(user, 'is_supplier', False):
        from modules.supplier.models import Supplier
        supplier = Supplier.objects.filter(id=user.real_id).first()
        if not supplier:
            return Response({'error': 'Supplier profile not found'}, status=404)
        return Response({
            'id': supplier.id,
            'username': supplier.username,
            'email': supplier.email,
            'first_name': supplier.first_name,
            'last_name': supplier.last_name,
            'phone': supplier.phone,
            'address': supplier.address,
            'city': supplier.city,
            'country': supplier.country,
            'postal_code': supplier.postal_code,
            'company': supplier.company,
            'avatar': supplier.avatar.url if supplier.avatar else None,
            'role_name': 'Supplier',
            'is_supplier': True
        })

    # 2. Handle Shadow Customer
    if getattr(user, 'is_customer', False):
        from modules.customer.models import Customer
        customer = Customer.objects.filter(id=user.real_id).first()
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=404)
        return Response({
            'id': customer.id,
            'username': customer.username,
            'email': customer.email,
            'first_name': customer.first_name,
            'last_name': customer.last_name,
            'phone': customer.phone,
            'address': customer.address,
            'city': customer.city,
            'country': customer.country,
            'postal_code': customer.postal_code,
            'role_name': 'Customer',
            'is_customer': True
        })

    # 3. Standard User
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


# ==================== USER MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List users, with support for real-time classification (Walk-in vs Registered)."""
    from modules.customer.models import Customer
    from modules.supplier.models import Supplier
    from django.db.models import Q
    
    user_type = request.query_params.get('user_type') # 'guest' or 'registered'
    role_filter = request.query_params.get('role', '').lower()
    search = request.query_params.get('search', '')

    # Only the platform operator (Super Admin) may see stored plaintext passwords.
    reveal_pw = is_platform_operator(request.user)

    # 1. Handle Customer Classification
    if role_filter == 'customer' or user_type:
        if user_type == 'guest':
            # Walk-in: Capture unique names from POS orders (SHOP payment method)
            from modules.sales.models import Order
            pos_orders = Order.objects.filter(payment_method='SHOP')
            if search:
                pos_orders = pos_orders.filter(customer_name__icontains=search)
            
            # Unique walk-in names. NB: `.distinct('field')` (DISTINCT ON) is
            # PostgreSQL-only and raises NotSupportedError on MySQL/MariaDB — dedupe
            # in Python instead so this works on the production DB.
            rows = pos_orders.values('customer_name', 'phone_number', 'created_at').order_by('customer_name', '-created_at')
            seen = set()
            results = []
            for item in rows:
                name = item['customer_name']
                if name in seen:
                    continue
                seen.add(name)
                results.append({
                    'id': f"guest_{name}",
                    'username': name,
                    'email': 'N/A',
                    'full_name': name,
                    'phone': item['phone_number'],
                    'role_name': 'customer',
                    'is_active': True,
                    'date_joined': item['created_at'],
                    'plain_password': 'N/A'
                })
            return Response({'results': results, 'count': len(results)})

        queryset = Customer.objects.all()
        if user_type == 'registered':
            # Registered: Signed up via web/register page (Has password)
            queryset = queryset.exclude(password__exact='')
        
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(email__icontains=search) | 
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
            
        # Transform Registered Users
        results = []
        for c in queryset:
            results.append({
                'id': c.id,
                'username': c.username,
                'email': c.email,
                'full_name': f"{c.first_name} {c.last_name}".strip(),
                'phone': c.phone,
                'address': c.address,
                'city': c.city,
                'country': c.country,
                'role': 'customer',
                'role_name': 'customer',
                'is_active': c.is_active,
                'date_joined': c.created_at,
                'plain_password': c.plain_password if reveal_pw else None
            })
        return Response({'results': results, 'count': len(results)})

    # 2. Handle Supplier Classification
    if role_filter == 'supplier':
        queryset = Supplier.objects.all()
        if search:
            queryset = queryset.filter(Q(username__icontains=search) | Q(email__icontains=search))
        
        results = []
        for s in queryset:
            results.append({
                'id': s.id,
                'username': s.username,
                'email': s.email,
                'full_name': s.name,
                'company': s.company,
                'phone': s.phone,
                'address': s.address,
                'city': s.city,
                'country': s.country,
                'role': 'supplier',
                'role_name': 'supplier',
                'is_active': s.is_active,
                'date_joined': s.created_at,
                'plain_password': s.plain_password if reveal_pw else None
            })
        return Response({'results': results, 'count': len(results)})

    # 3. Standard Internal User List
    users = User.objects.exclude(role__name__iexact='customer').exclude(role__name__iexact='supplier')

    # Tenant isolation:
    #   • Platform operator (Super Admin) → manages the tenant-OWNER Admins only
    #     (tenant_id NULL, or self-owned). Staff that an Admin created belong to
    #     that Admin (tenant_id = that Admin's id) and stay hidden from the super
    #     admin and every other admin — only their creating Admin sees them.
    #     EXCEPTION: the Reports "System Users" view passes ?include_staff=true to
    #     list a branch's staff (optionally scoped to a ?warehouse=<id>). A user
    #     belongs to a branch if directly assigned to it OR owned by an Admin who is.
    #   • A tenant Admin → sees themselves + their own staff.
    from django.db.models import F
    tid = tenant_id_for(request.user)
    include_staff = request.query_params.get('include_staff') in ('true', '1', 'yes')
    warehouse = request.query_params.get('warehouse')
    if is_platform_operator(request.user):
        if include_staff:
            if warehouse:
                admin_ids = list(User.objects.filter(warehouses__id=warehouse).values_list('id', flat=True))
                users = users.filter(Q(warehouses__id=warehouse) | Q(tenant_id__in=admin_ids)).distinct()
            # else: All Branches → every internal user (admins + staff)
        else:
            users = users.filter(Q(tenant_id__isnull=True) | Q(tenant_id=F('id')))
    elif tid is not None:
        users = users.filter(Q(tenant_id=tid) | Q(id=request.user.id))

    if search:
        users = users.filter(Q(username__icontains=search) | Q(email__icontains=search))

    status_filter = request.query_params.get('status')
    if status_filter: users = users.filter(status=status_filter)

    serializer = UserListSerializer(users, many=True)
    data = serializer.data
    # The platform operator (Super Admin) may see every internal user's password —
    # they own the workspace. Everyone else only sees their own row's password.
    self_id = str(getattr(request.user, 'id', ''))
    reveal_all = is_platform_operator(request.user)
    if not reveal_all:
        for row in data:
            if str(row.get('id')) != self_id:
                row.pop('plain_password', None)
    return Response({'results': data, 'count': users.count()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    """Retrieve user details with role and permissions."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err
    return Response(UserDetailSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """Create a new user, with dedicated logic for Suppliers."""
    from modules.users.models import Role
    role_id = request.data.get('role')
    role = None
    if role_id:
        role = Role.objects.filter(id=role_id).first()

    # Only the platform operator (Super Admin) may mint another Super Admin —
    # that role is cross-tenant and would bypass per-admin isolation. A branch
    # admin creating their own staff can assign any other role.
    if role and role.name.strip().lower() in {'super admin', 'superadmin'}:
        from core.scoping import is_platform_operator
        if not is_platform_operator(request.user):
            return Response({'role': ['You are not allowed to assign the Super Admin role.']},
                            status=status.HTTP_400_BAD_REQUEST)

    # Check if this is meant to be a supplier
    if role and role.name.lower() == 'supplier':
        from django.contrib.auth.hashers import make_password
        from modules.supplier.models import Supplier
        
        email = request.data.get('email')
        if not email:
            return Response({'email': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
            
        if Supplier.objects.filter(email=email).exists():
            return Response({'email': ['Supplier with this email already exists']}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password') or 'Alqavi@123'
        supplier = Supplier.objects.create(
            username=request.data.get('username') or email.split('@')[0],
            email=email,
            password=make_password(password),
            plain_password=password,
            name=request.data.get('business_name') or f"{request.data.get('first_name', '')} {request.data.get('last_name', '')}".strip() or email,
            company=request.data.get('business_name', ''),
            phone=request.data.get('phone', ''),
            address=request.data.get('address', ''),
            contact_person=f"{request.data.get('first_name', '')} {request.data.get('last_name', '')}".strip(),
            avatar=request.FILES.get('avatar') or request.data.get('avatar')
        )
        
        if request.user.is_authenticated:
            UserActivityLog.objects.create(
                user=request.user,
                action='create',
                description=f'Created supplier: {supplier.email}',
                tenant_id=tenant_id_for(request.user)
            )
            
        return Response({
            'id': supplier.id,
            'email': supplier.email,
            'role_name': 'Supplier',
            'message': 'Supplier created in dedicated registry.'
        }, status=status.HTTP_201_CREATED)

    # Standard User creation
    serializer = UserCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        
        if request.user.is_authenticated:
            UserActivityLog.objects.create(
                user=request.user,
                action='create',
                description=f'Created user: {user.username}',
                tenant_id=tenant_id_for(request.user)
            )
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """Update user information (Registry Aware)."""
    curr_user = request.user
    is_self = False
    if getattr(curr_user, 'is_supplier', False) or getattr(curr_user, 'is_customer', False):
        is_self = (str(curr_user.real_id) == str(user_id))
    else:
        is_self = (str(curr_user.id) == str(user_id))
    if not is_self and not curr_user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    if getattr(curr_user, 'is_supplier', False) and is_self:
        from modules.supplier.models import Supplier
        obj = Supplier.objects.filter(id=user_id).first()
        if not obj: return Response({'error': 'Supplier not found'}, status=404)
        
        # Handle regular data
        data = request.data.copy()
        
        # Mapping for frontend consistency (contact -> phone)
        if 'contact' in data and not 'phone' in data:
            data['phone'] = data['contact']
            
        for attr, value in data.items():
            if attr != 'avatar' and hasattr(obj, attr): 
                setattr(obj, attr, value)
        
        # Auto-sync Name if first/last names are updated
        if 'first_name' in data or 'last_name' in data:
            f_name = data.get('first_name', obj.first_name or '')
            l_name = data.get('last_name', obj.last_name or '')
            obj.name = f"{(f_name or '').strip()} {(l_name or '').strip()}".strip() or obj.name
            
        # Handle files explicitly
        if 'avatar' in request.FILES:
            obj.avatar = request.FILES['avatar']
        elif 'avatar' in data:
            # Only set if it's not a string (to avoid setting a URL as a file)
            if not isinstance(data['avatar'], str):
                obj.avatar = data['avatar']
                
        obj.save()
        return Response({'message': 'Supplier profile updated'})
    if getattr(curr_user, 'is_customer', False) and is_self:
        from modules.customer.models import Customer
        obj = Customer.objects.filter(id=user_id).first()
        for attr, value in request.data.items():
            if attr != 'avatar' and hasattr(obj, attr): setattr(obj, attr, value)
        if 'avatar' in request.FILES:
            obj.avatar = request.FILES['avatar']
        elif 'avatar' in request.data:
            obj.avatar = request.data['avatar']
        obj.save()
        return Response({'message': 'Customer profile updated'})
    user, err = get_or_404_response(User, id=user_id)
    if err: return err
    serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserDetailSerializer(user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """Delete a user."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    if request.user.is_authenticated and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.user.is_authenticated and str(request.user.id) == str(user.id):
        return Response({'error': 'You cannot delete your own account.'},
                        status=status.HTTP_400_BAD_REQUEST)

    username = user.username
    # Hard-delete when the user owns no protected records. Users referenced as the
    # `tenant`/owner of branches, payments, stock, deliveries, etc. (on_delete=PROTECT)
    # cannot be hard-deleted without destroying that data — deactivate them instead so
    # they can no longer sign in, which is what the "remove" action really needs.
    try:
        with transaction.atomic():
            user.delete()
        deactivated = False
    except (ProtectedError, IntegrityError):
        user.is_active = False
        user.status = 'inactive'
        user.save(update_fields=['is_active', 'status'])
        deactivated = True

    if request.user.is_authenticated:
        UserActivityLog.objects.create(
            user=request.user,
            action='delete',
            description=(f'Deactivated user (owns records): {username}' if deactivated
                        else f'Deleted user: {username}'),
            tenant_id=tenant_id_for(request.user)
        )

    if deactivated:
        return Response(
            {'deactivated': True,
             'message': 'This user owns branches or transaction records and cannot be '
                        'permanently deleted. They have been deactivated and can no longer sign in.'},
            status=status.HTTP_200_OK)
    return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# ==================== ROLE ASSIGNMENT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_role(request, user_id):
    """Assign a role to a user."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    role, role_err = get_or_404_response(Role, id=request.data.get('role_id'))
    if role_err:
        return role_err

    user.role = role
    user.save()
    if request.user.is_authenticated:
        UserActivityLog.objects.create(
            user=request.user,
            action='role_assign',
            description=f'Assigned role {role.name} to user {user.username}',
            tenant_id=tenant_id_for(request.user)
        )
    return Response(UserDetailSerializer(user).data)


# ==================== USER STATUS ====================

def _set_user_status(request, user_id, is_active, status_value, log_msg):
    """Internal helper: update user active/status fields and log the change."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    user.is_active = is_active
    user.status = status_value
    user.save()
    if request.user.is_authenticated:
        UserActivityLog.objects.create(
            user=request.user,
            action='status_change',
            description=log_msg.format(username=user.username),
            tenant_id=tenant_id_for(request.user)
        )
    return Response(UserDetailSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_user(request, user_id):
    """Activate a user account."""
    return _set_user_status(request, user_id, True, 'active', 'Activated user: {username}')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivate_user(request, user_id):
    """Deactivate a user account."""
    return _set_user_status(request, user_id, False, 'inactive', 'Deactivated user: {username}')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suspend_user(request, user_id):
    """Suspend a user account."""
    return _set_user_status(request, user_id, False, 'suspended', 'Suspended user: {username}')


# ==================== PASSWORD MANAGEMENT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Change user password (Registry Aware)."""
    curr_user = request.user
    from django.contrib.auth.hashers import check_password, make_password
    is_self = False
    if getattr(curr_user, 'is_supplier', False) or getattr(curr_user, 'is_customer', False):
        is_self = (str(curr_user.real_id) == str(user_id))
    else:
        is_self = (str(curr_user.id) == str(user_id))
    if not is_self and not curr_user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    serializer = UserPasswordChangeSerializer(data=request.data)
    if not serializer.is_valid(): return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    if getattr(curr_user, 'is_supplier', False):
        from modules.supplier.models import Supplier
        obj = Supplier.objects.filter(id=user_id).first()
        if not check_password(serializer.validated_data['old_password'], obj.password):
            return Response({'error': 'Old password incorrect'}, status=400)
        obj.password = make_password(serializer.validated_data['new_password'])
        obj.plain_password = serializer.validated_data['new_password']
        obj.save()
        return Response({'message': 'Password changed'})
    if getattr(curr_user, 'is_customer', False):
        from modules.customer.models import Customer
        obj = Customer.objects.filter(id=user_id).first()
        if not check_password(serializer.validated_data['old_password'], obj.password):
            return Response({'error': 'Old password incorrect'}, status=400)
        obj.password = make_password(serializer.validated_data['new_password'])
        obj.plain_password = serializer.validated_data['new_password']
        obj.save()
        return Response({'message': 'Password changed'})
    user = User.objects.filter(id=user_id).first()
    if not check_password(serializer.validated_data['old_password'], user.password):
        return Response({'error': 'Old password incorrect'}, status=400)
    user.set_password(serializer.validated_data['new_password'])
    user.plain_password = serializer.validated_data['new_password']
    user.save()
    return Response({'message': 'Password changed'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reset_password(request, user_id):
    """Reset a user's password (admin only)."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    new_password = request.data.get('new_password')
    if not new_password or len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.plain_password = new_password
    user.save()
    
    UserActivityLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action='password_reset',
        description=f'Admin reset password for user: {user.username}',
        tenant_id=tenant_id_for(request.user) if request.user.is_authenticated else None
    )
    return Response({'message': 'Password reset successfully'})


# ==================== ACTIVITY LOGS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity_log(request, user_id):
    """
    Get activity logs for a specific user. 
    Registry Aware: Supports looking up logs for the authenticated User even if 
    the frontend passes a Supplier/Customer specific ID.
    """
    curr_user = request.user
    target_user = None

    # Handle "Self" lookup logic
    is_self_lookup = (curr_user.id == user_id)
    
    # For Suppliers/Customers, user_id might be their real_id (Supplier PK)
    if not is_self_lookup:
        if (getattr(curr_user, 'is_supplier', False) or getattr(curr_user, 'is_customer', False)):
            if str(getattr(curr_user, 'real_id', None)) == str(user_id):
                is_self_lookup = True

    if is_self_lookup:
        target_user = curr_user
    else:
        # Admin or cross-user lookup
        if not curr_user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Tenant isolation: a tenant admin/staff may only inspect users inside
        # their own tenant; the platform operator may inspect anyone.
        from core.scoping import tenant_id_for, is_platform_operator
        from django.db.models import Q
        target_qs = User.objects.filter(id=user_id)
        if not is_platform_operator(curr_user):
            tid = tenant_id_for(curr_user)
            target_qs = target_qs.filter(Q(tenant_id=tid) | Q(id=getattr(curr_user, 'id', None)))
        target_user = target_qs.first()
        if not target_user:
            return Response({'error': 'User not found'}, status=404)

    limit = int(request.query_params.get('limit', 50))
    logs_qs = UserActivityLog.objects.filter(user=target_user)[:limit]
    serializer = UserActivityLogSerializer(logs_qs, many=True)
    results = serializer.data

    if getattr(target_user, 'is_supplier', False):
        from modules.sales.models import PurchaseReturn
        returns = PurchaseReturn.objects.filter(supplier_id=target_user.real_id).order_by('-created_at')[:limit]
        for ret in returns:
            results.append({
                'id': f"ret_{ret.id}",
                'user': target_user.id,
                'user_name': getattr(target_user, 'username', 'Supplier'),
                'action': 'other',
                'action_display': 'Other',
                'description': f"New Return Request RECEIVED: {ret.return_number} from Admin. [ID: {ret.id}] Reason: {ret.reason or 'Not specified'}",
                'ip_address': 'Internal',
                'timestamp': ret.created_at.isoformat() if ret.created_at else None
            })
        
        # Sort combined results descending by timestamp
        results.sort(key=lambda x: str(x.get('timestamp') or ''), reverse=True)
        results = results[:limit]

    return Response({'results': results, 'count': len(results)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_activity_logs(request):
    """Get all activity logs (admin only)."""
    logs = UserActivityLog.objects.all()

    # Tenant isolation: an Admin sees only their own tenant's logs; the platform
    # operator (super admin / superuser) sees everything.
    logs = scope_to_tenant(request.user, logs, 'tenant')

    user_id = request.query_params.get('user_id')
    if user_id:
        logs = logs.filter(user_id=user_id)

    action = request.query_params.get('action')
    if action:
        logs = logs.filter(action=action)

    is_read = request.query_params.get('is_read')
    if is_read is not None:
        logs = logs.filter(is_read=is_read.lower() == 'true')

    limit = int(request.query_params.get('limit', 100))
    logs = logs[:limit]
    serializer = UserActivityLogSerializer(logs, many=True)
    return Response({'results': serializer.data, 'count': logs.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_activity_read(request, log_id):
    """Mark a specific activity log as read."""
    log, err = get_or_404_response(UserActivityLog, id=log_id)
    if err:
        return err
    
    log.is_read = True
    log.save()
    return Response({'message': 'Log marked as read'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_activities_read(request):
    """Mark all unread activity logs for the current tenant as read."""
    logs = scope_to_tenant(request.user, UserActivityLog.objects.filter(is_read=False), 'tenant')
    logs.update(is_read=True)
    return Response({'message': 'All logs marked as read'})


# ==================== ROLE MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_roles(request):
    """List all roles."""
    from django.db.models import Q
    roles = Role.objects.all()
    # Show GLOBAL roles (tenant NULL) + the caller's own-tenant roles; the
    # platform operator sees every role.
    tid = tenant_id_for(request.user)
    if tid is not None and not is_platform_operator(request.user):
        roles = roles.filter(Q(tenant__isnull=True) | Q(tenant_id=tid))
    serializer = RoleSerializer(roles, many=True)
    return Response({'results': serializer.data, 'count': roles.count()})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail(request, role_id):
    """Get, update, or delete role details."""
    role, err = get_or_404_response(Role, id=role_id)
    if err:
        return err

    # Tenant isolation: a tenant user may only touch global roles or their own.
    tid = tenant_id_for(request.user)
    if tid is not None and not is_platform_operator(request.user):
        if role.tenant_id not in (None, tid):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(RoleSerializer(role).data)
        
    elif request.method == 'PATCH':
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        if role.is_default:
            return Response({'error': 'Cannot delete system default role'}, status=status.HTTP_400_BAD_REQUEST)
        role.delete()
        return Response({'message': 'Role deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_role(request):
    """Create a new role."""
    serializer = RoleSerializer(data=request.data)
    if serializer.is_valid():
        # Stamp tenant: an Admin's role belongs to their tenant; the platform
        # operator creates GLOBAL roles (tenant NULL).
        serializer.save(tenant_id=tenant_id_for(request.user))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_permissions(request):
    """List all permissions."""
    permissions = Permission.objects.all()
    serializer = PermissionSerializer(permissions, many=True)
    return Response({'results': serializer.data, 'count': permissions.count()})


# ==================== USER SETTINGS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_settings(request):
    """Get settings for the currently authenticated user — strictly per-user.

    No super-admin fallback: each admin only ever reads their own settings, so one
    admin's preferences can never leak into another's.
    """
    settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
    return Response(UserSettingsSerializer(settings_obj).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user_settings(request):
    """Update settings for the currently authenticated user — strictly per-user."""
    settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
    serializer = UserSettingsSerializer(settings_obj, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """Public customer registration - Redirects to isolated Customer registry."""
    from django.contrib.auth.hashers import make_password
    from modules.customer.models import Customer
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    if Customer.objects.filter(email=email).exists():
        return Response({'email': ['Account with this email already exists']}, status=status.HTTP_400_BAD_REQUEST)

    # Create standalone Customer
    customer = Customer.objects.create(
        username=email,
        email=email,
        password=make_password(password),
        plain_password=password,
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
        phone=request.data.get('phone', ''),
        address=request.data.get('address', ''),
        city=request.data.get('city', ''),
        country=request.data.get('country', ''),
        postal_code=request.data.get('postal_code', ''),
        avatar=request.FILES.get('avatar')
    )
    
    return Response({
        'message': 'Account created successfully',
        'id': customer.id,
        'email': customer.email
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_supplier(request):
    """Public supplier registration - Creates record ONLY in Supplier table as requested."""
    from django.contrib.auth.hashers import make_password
    from modules.supplier.models import Supplier
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    if Supplier.objects.filter(email=email).exists():
        return Response({'email': ['Supplier with this email already exists']}, status=status.HTTP_400_BAD_REQUEST)

    # Create Supplier directly
    company_name = request.data.get('company') or request.data.get('company_name') or email.split('@')[0]
    full_name = f"{request.data.get('first_name', '')} {request.data.get('last_name', '')}".strip()
    
    supplier = Supplier.objects.create(
        username=request.data.get('username') or email.split('@')[0],
        email=email,
        password=make_password(password),
        plain_password=password,
        name=company_name,
        company=company_name,
        phone=request.data.get('phone', ''),
        address=request.data.get('address', ''),
        contact_person=full_name or company_name,
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
        avatar=request.FILES.get('avatar') or request.data.get('avatar')
    )
    
    return Response({
        'message': 'Supplier registered successfully',
        'id': supplier.id,
        'email': supplier.email
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_admin(request):
    """Public admin registration with 'Admin' role auto-assignment."""
    data = request.data.copy()
    
    # Ensure 'Admin' role exists
    admin_role, _ = Role.objects.get_or_create(
        name='Admin',
        defaults={'description': 'System administrator with full access'}
    )
    
    data['role'] = admin_role.id
    data['status'] = 'active'
    data['is_staff'] = True
    
    from .serializers import UserCreateSerializer
    serializer = UserCreateSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Log Initial Activity. The new Admin owns their own tenant (tenant NULL
        # on the row -> tenant_id_for resolves to their own pk).
        UserActivityLog.objects.create(
            user=user,
            action='create',
            description=f'Admin account registered: {user.email}',
            tenant_id=tenant_id_for(user)
        )
        
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_rider(request):
    """Public delivery rider self-registration."""
    from django.contrib.auth.hashers import make_password
    from modules.delivery.models import DeliveryPerson

    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if DeliveryPerson.objects.filter(email=email).exists():
        return Response({'email': ['Rider with this email already exists']}, status=status.HTTP_400_BAD_REQUEST)

    username = request.data.get('username') or email.split('@')[0]
    if DeliveryPerson.objects.filter(username=username).exists():
        username = f"{username}_{DeliveryPerson.objects.count() + 1}"

    rider = DeliveryPerson.objects.create(
        username=username,
        email=email,
        password=make_password(password),
        plain_password=password,
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
        phone=request.data.get('phone', ''),
        vehicle_type=request.data.get('vehicle_type', 'bike'),
        vehicle_number=request.data.get('vehicle_number', ''),
        cnic=request.data.get('cnic', ''),
        address=request.data.get('address', ''),
        city=request.data.get('city', ''),
        status='active',
        is_active=True
    )

    return Response({
        'message': 'Rider registered successfully',
        'id': rider.id,
        'email': rider.email
    }, status=status.HTTP_201_CREATED)

