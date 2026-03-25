"""
User management serializers.
"""
from rest_framework import serializers
from .models import User, Role, Permission, UserActivityLog, UserSettings


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model."""
    
    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'description', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model with nested permissions."""
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        write_only=True,
        many=True,
        required=False,
        source='permissions'
    )
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permission_ids', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_default']


class UserActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for UserActivityLog model."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = UserActivityLog
        fields = ['id', 'user', 'user_name', 'action', 'action_display', 'description', 'ip_address', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with role and permissions."""
    role_name = serializers.CharField(source='role.name', read_only=True)
    permissions = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone', 
            'avatar', 'address', 'city', 'country', 'postal_code', 'role', 'role_name',
            'status', 'status_display', 'is_active', 'permissions', 
            'date_joined', 'last_login', 'last_login_ip', 'last_login_at'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'last_login_ip', 'last_login_at']
    
    def get_permissions(self, obj):
        """Get user's permissions through their role."""
        perms = obj.get_permissions()
        return PermissionSerializer(perms, many=True).data


class UserListSerializer(serializers.ModelSerializer):
    """List user serializer with basic info."""
    role_name = serializers.CharField(source='role.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'avatar', 'role', 'role_name',
            'status', 'status_display', 'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 'first_name', 
            'last_name', 'phone', 'avatar', 'address', 'city', 'country', 'postal_code', 'role'
        ]
    
    def validate(self, data):
        """Validate passwords match."""
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError('Passwords do not match.')
        return data
    
    def create(self, validated_data):
        """Create user with hashed password."""
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'avatar', 'address', 
            'city', 'country', 'postal_code', 'role'
        ]


class UserPasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing user password."""
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate(self, data):
        """Validate passwords match."""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError('New passwords do not match.')
        return data



class UserStatusChangeSerializer(serializers.Serializer):
    """Serializer for changing user status."""
    status = serializers.ChoiceField(choices=['active', 'inactive', 'suspended'])
    reason = serializers.CharField(required=False, allow_blank=True)


class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for UserSettings model."""
    class Meta:
        model = UserSettings
        fields = [
            'notif_new_order', 'notif_low_stock', 'notif_new_user',
            'notif_weekly_report', 'notif_marketing', 'notif_sms',
            'theme', 'accent_color', 'compact_mode', 'animations',
            'sidebar_collapsed', 'updated_at'
        ]
        read_only_fields = ['updated_at']


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username')
        
        # If the provided username is an email, resolve it to the actual username
        if '@' in username:
            user = User.objects.filter(email=username).first()
            if user:
                attrs['username'] = user.username
                
        data = super().validate(attrs)
        
        # Add user data to the response
        user = self.user

        # Determine role string: superusers and staff are always 'admin'
        if user.is_superuser or user.is_staff:
            role = 'admin'
        elif user.role:
            role = user.role.name.lower()
        else:
            role = 'customer'

        data['user'] = {
            'id': str(user.id),
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': role,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
        
        return data
