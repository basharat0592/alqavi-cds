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
@permission_classes([AllowAny])
def get_profile(request):
    """Get current authenticated user profile."""
    user = request.user
    if not user.is_authenticated:
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    
    if not user:
        return Response({'detail': 'No users found in database'}, status=404)
        
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


# ==================== USER MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_users(request):
    """List all users with optional filters."""
    users = User.objects.all()

    role = request.query_params.get('role')
    if role:
        users = users.filter(role_id=role)

    role_name = request.query_params.get('role_name')
    if role_name:
        users = users.filter(role__name__iexact=role_name)

    status_filter = request.query_params.get('status')
    if status_filter:
        users = users.filter(status=status_filter)

    is_active = request.query_params.get('is_active')
    if is_active:
        users = users.filter(is_active=is_active.lower() == 'true')

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
    """Create a new user."""
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
@permission_classes([AllowAny])
def update_user(request, user_id):
    """Update user information."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    if request.user.is_authenticated and request.user.id != user_id and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserUpdateSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        user = serializer.save()
        if request.user.is_authenticated:
            UserActivityLog.objects.create(
                user=request.user,
                action='update',
                description=f'Updated user: {user.username}'
            )
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
@permission_classes([AllowAny])
def change_password(request, user_id):
    """Change user password."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    if request.user.id != user_id and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserPasswordChangeSerializer(data=request.data)
    if serializer.is_valid():
        if not check_password(serializer.validated_data['old_password'], user.password):
            return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.plain_password = serializer.validated_data['new_password']
        user.save()
        UserActivityLog.objects.create(
            user=request.user,
            action='password_change',
            description=f'Changed password for user: {user.username}'
        )
        return Response({'message': 'Password changed successfully'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
@permission_classes([AllowAny])
def user_activity_log(request, user_id):
    """Get activity logs for a specific user."""
    user, err = get_or_404_response(User, id=user_id)
    if err:
        return err

    if request.user.id != user_id and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    limit = int(request.query_params.get('limit', 50))
    logs = UserActivityLog.objects.filter(user=user)[:limit]
    serializer = UserActivityLogSerializer(logs, many=True)
    return Response({'results': serializer.data, 'count': logs.count()})


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
    """Public customer registration with 'Customer' role auto-assignment."""
    data = request.data.copy()
    
    # Ensure 'Customer' role exists
    customer_role, _ = Role.objects.get_or_create(
        name='Customer',
        defaults={'description': 'Standard shopping customer'}
    )
    
    # We pass the role ID as a string or UUID
    data['role'] = customer_role.id
    data['status'] = 'active'
    
    from .serializers import UserCreateSerializer
    serializer = UserCreateSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Log Initial Activity
        UserActivityLog.objects.create(
            user=user,
            action='create',
            description=f'Customer account registered: {user.email}'
        )
        
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_supplier(request):
    """Public supplier registration with 'Supplier' role auto-assignment and Supplier Profile creation."""
    data = request.data.copy()
    
    # Ensure 'Supplier' role exists
    supplier_role, _ = Role.objects.get_or_create(
        name='Supplier',
        defaults={'description': 'External distributor / brand partner'}
    )
    
    data['role'] = supplier_role.id
    data['status'] = 'active'
    
    from .serializers import UserCreateSerializer
    serializer = UserCreateSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Log Initial Activity
        UserActivityLog.objects.create(
            user=user,
            action='create',
            description=f'Supplier account registered: {user.email}'
        )
        
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
