"""
Users module API views with function-based approach.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.hashers import check_password
from .models import User, Role, Permission, UserActivityLog, UserSettings
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
@permission_classes([AllowAny])
def list_users(request):
    """List users, with support for real-time classification (Walk-in vs Registered)."""
    from modules.customer.models import Customer
    from modules.supplier.models import Supplier
    from django.db.models import Q
    
    user_type = request.query_params.get('user_type') # 'guest' or 'registered'
    role_filter = request.query_params.get('role', '').lower()
    search = request.query_params.get('search', '')

    # 1. Handle Customer Classification
    if role_filter == 'customer' or user_type:
        if user_type == 'guest':
            # Walk-in: Capture unique names from POS orders (SHOP payment method)
            from modules.sales.models import Order
            pos_orders = Order.objects.filter(payment_method='SHOP')
            if search:
                pos_orders = pos_orders.filter(customer_name__icontains=search)
            
            # Use unique names as the primary identity for walk-ins
            walk_in_names = pos_orders.values('customer_name', 'phone_number', 'created_at').distinct('customer_name')
            
            results = []
            for item in walk_in_names:
                results.append({
                    'id': f"guest_{item['customer_name']}",
                    'username': item['customer_name'],
                    'email': 'N/A',
                    'full_name': item['customer_name'],
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
                'plain_password': c.plain_password
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
                'plain_password': s.plain_password
            })
        return Response({'results': results, 'count': len(results)})

    # 3. Standard Internal User List
    users = User.objects.exclude(role__name__iexact='customer').exclude(role__name__iexact='supplier')
    if search:
        users = users.filter(Q(username__icontains=search) | Q(email__icontains=search))
    
    status_filter = request.query_params.get('status')
    if status_filter: users = users.filter(status=status_filter)

    serializer = UserListSerializer(users, many=True)
    return Response({'results': serializer.data, 'count': users.count()})


@api_view(['GET'])
@permission_classes([AllowAny])
def user_detail(request, user_id):
    """Retrieve user details with role and permissions."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err
    return Response(UserDetailSerializer(user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_user(request):
    """Create a new user, with dedicated logic for Suppliers."""
    from modules.users.models import Role
    role_id = request.data.get('role')
    role = None
    if role_id:
        role = Role.objects.filter(id=role_id).first()
    
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
            contact_person=f"{request.data.get('first_name', '')} {request.data.get('last_name', '')}".strip()
        )
        
        if request.user.is_authenticated:
            UserActivityLog.objects.create(
                user=request.user,
                action='create',
                description=f'Created supplier: {supplier.email}'
            )
            
        return Response({
            'id': supplier.id,
            'email': supplier.email,
            'role_name': 'Supplier',
            'message': 'Supplier created in dedicated registry.'
        }, status=status.HTTP_201_CREATED)

    # Standard User creation
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        if request.user.is_authenticated:
            UserActivityLog.objects.create(
                user=request.user,
                action='create',
                description=f'Created user: {user.username}'
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
        is_self = (curr_user.real_id == user_id)
    else:
        is_self = (curr_user.id == user_id)
    if not is_self and not curr_user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    if getattr(curr_user, 'is_supplier', False) and is_self:
        from modules.supplier.models import Supplier
        obj = Supplier.objects.filter(id=user_id).first()
        for attr, value in request.data.items():
            if hasattr(obj, attr): setattr(obj, attr, value)
        obj.save()
        return Response({'message': 'Supplier profile updated'})
    if getattr(curr_user, 'is_customer', False) and is_self:
        from modules.customer.models import Customer
        obj = Customer.objects.filter(id=user_id).first()
        for attr, value in request.data.items():
            if hasattr(obj, attr): setattr(obj, attr, value)
        obj.save()
        return Response({'message': 'Customer profile updated'})
    user, err = get_or_404_response(User, id=user_id)
    if err: return err
    serializer = UserUpdateSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserDetailSerializer(user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_user(request, user_id):
    """Delete a user."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    if request.user.is_authenticated and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    username = user.username
    user.delete()
    if request.user.is_authenticated:
        UserActivityLog.objects.create(
            user=request.user,
            action='delete',
            description=f'Deleted user: {username}'
        )
    return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# ==================== ROLE ASSIGNMENT ====================

@api_view(['POST'])
@permission_classes([AllowAny])
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
            description=f'Assigned role {role.name} to user {user.username}'
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
            description=log_msg.format(username=user.username)
        )
    return Response(UserDetailSerializer(user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def activate_user(request, user_id):
    """Activate a user account."""
    return _set_user_status(request, user_id, True, 'active', 'Activated user: {username}')


@api_view(['POST'])
@permission_classes([AllowAny])
def deactivate_user(request, user_id):
    """Deactivate a user account."""
    return _set_user_status(request, user_id, False, 'inactive', 'Deactivated user: {username}')


@api_view(['POST'])
@permission_classes([AllowAny])
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
        is_self = (curr_user.real_id == user_id)
    else:
        is_self = (curr_user.id == user_id)
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
        description=f'Admin reset password for user: {user.username}'
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
            if getattr(curr_user, 'real_id', None) == user_id:
                is_self_lookup = True

    if is_self_lookup:
        target_user = curr_user
    else:
        # Admin or cross-user lookup
        if not curr_user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        target_user = User.objects.filter(id=user_id).first()
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
@permission_classes([AllowAny])
def all_activity_logs(request):
    """Get all activity logs (admin only)."""
    logs = UserActivityLog.objects.all()

    user_id = request.query_params.get('user_id')
    if user_id:
        logs = logs.filter(user_id=user_id)

    action = request.query_params.get('action')
    if action:
        logs = logs.filter(action=action)

    limit = int(request.query_params.get('limit', 100))
    logs = logs[:limit]
    serializer = UserActivityLogSerializer(logs, many=True)
    return Response({'results': serializer.data, 'count': logs.count()})


# ==================== ROLE MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_roles(request):
    """List all roles."""
    roles = Role.objects.all()
    serializer = RoleSerializer(roles, many=True)
    return Response({'results': serializer.data, 'count': roles.count()})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def role_detail(request, role_id):
    """Get, update, or delete role details."""
    role, err = get_or_404_response(Role, id=role_id)
    if err:
        return err
        
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
@permission_classes([AllowAny])
def create_role(request):
    """Create a new role."""
    serializer = RoleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
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
@permission_classes([AllowAny])
def get_user_settings(request):
    """Get settings for the currently authenticated user."""
    user = request.user
    if not user.is_authenticated:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    if not user:
        return Response({'detail': 'No users found'}, status=404)
        
    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
    return Response(UserSettingsSerializer(settings_obj).data)


@api_view(['PATCH'])
@permission_classes([AllowAny])
def update_user_settings(request):
    """Update settings for the currently authenticated user."""
    user = request.user
    if not user.is_authenticated:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
    if not user:
        return Response({'detail': 'No users found'}, status=404)
        
    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
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
        username=email.split('@')[0],
        email=email,
        password=make_password(password),
        plain_password=password,
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
        phone=request.data.get('phone', ''),
        address=request.data.get('address', ''),
        city=request.data.get('city', ''),
        country=request.data.get('country', ''),
        postal_code=request.data.get('postal_code', '')
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
    supplier = Supplier.objects.create(
        username=email.split('@')[0],
        email=email,
        password=make_password(password),
        plain_password=password,
        name=request.data.get('company_name', email),
        company=request.data.get('company_name', ''),
        phone=request.data.get('phone', ''),
        address=request.data.get('address', ''),
        contact_person=f"{request.data.get('first_name', '')} {request.data.get('last_name', '')}".strip() or email
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
        
        # Log Initial Activity
        UserActivityLog.objects.create(
            user=user,
            action='create',
            description=f'Admin account registered: {user.email}'
        )
        
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
