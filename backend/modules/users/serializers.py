"""
User management serializers.
"""
from rest_framework import serializers
from .models import User, Role, Permission, UserActivityLog, UserSettings
from modules.company.models import Area
from modules.inventory.models import Warehouse


def _warehouse_brief(obj):
    """Compact branch list for a user: id + name + location (address) + city/area label."""
    return [
        {'id': str(w.id), 'name': w.name, 'location': w.location, 'area': (w.area.name if w.area_id else None)}
        for w in obj.warehouses.all()
    ]


def _is_super_admin(user):
    return bool(
        getattr(user, 'is_superuser', False)
        or (getattr(user, 'role', None)
            and (user.role.name or '').strip().lower() in {'super admin', 'superadmin'})
    )


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
        fields = ['id', 'user', 'user_name', 'action', 'action_display', 'description', 'ip_address', 'timestamp', 'is_read']
        read_only_fields = ['id', 'timestamp']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with role and permissions."""
    role_name = serializers.CharField(source='role.name', read_only=True)
    permissions = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    areas = serializers.SerializerMethodField()
    warehouses = serializers.SerializerMethodField()
    is_super_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone',
            'avatar', 'address', 'city', 'country', 'postal_code', 'role', 'role_name',
            'status', 'status_display', 'is_active', 'is_staff', 'permissions',
            'page_permissions', 'page_edit_permissions',
            'areas', 'warehouses', 'is_super_admin',
            'date_joined', 'last_login', 'last_login_ip', 'last_login_at', 'plain_password'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'last_login_ip', 'last_login_at']

    def get_areas(self, obj):
        return [{'id': a.id, 'name': a.name, 'code': a.code} for a in obj.areas.all()]

    def get_warehouses(self, obj):
        return _warehouse_brief(obj)

    def get_is_super_admin(self, obj):
        return _is_super_admin(obj)
    
    def get_permissions(self, obj):
        """Get user's permissions through their role."""
        perms = obj.get_permissions()
        return PermissionSerializer(perms, many=True).data


class UserListSerializer(serializers.ModelSerializer):
    """List user serializer with basic info."""
    role_name = serializers.CharField(source='role.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    warehouses = serializers.SerializerMethodField()
    is_super_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'avatar', 'role', 'role_name',
            'status', 'status_display', 'is_active', 'date_joined', 'last_login', 'plain_password',
            'warehouses', 'is_super_admin'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_warehouses(self, obj):
        return _warehouse_brief(obj)

    def get_is_super_admin(self, obj):
        return _is_super_admin(obj)


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    areas = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=Area.objects.all()
    )
    warehouses = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=Warehouse.objects.all()
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 'first_name',
            'last_name', 'phone', 'avatar', 'address', 'city', 'country', 'postal_code', 'role',
            'page_permissions', 'page_edit_permissions', 'areas', 'warehouses'
        ]

    def validate(self, data):
        """Validate passwords match."""
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError('Passwords do not match.')
        return data

    def create(self, validated_data):
        """Create user with hashed password and store plain version."""
        password = validated_data.pop('password')
        areas = validated_data.pop('areas', None)
        warehouses = validated_data.pop('warehouses', None)
        # Only a global Super Admin may assign branches.
        request = self.context.get('request')
        if warehouses is not None and not _is_super_admin(getattr(request, 'user', None) if request else None):
            warehouses = None
        user = User.objects.create_user(password=password, **validated_data)
        user.plain_password = password
        # Internal users created here are staff so they can reach the admin panel;
        # page_permissions + area/branch scoping handle what they can actually see.
        user.is_staff = True
        # Tenant (owning Admin): a staff sub-user inherits the creating Admin's
        # tenant so they share that Admin's workspace. An Admin/Super-Admin is
        # created with tenant NULL and resolves to their own id (Admin) or
        # cross-tenant (Super Admin) via core.scoping.tenant_id_for — so when the
        # creator is the platform operator / public signup, the new account
        # correctly owns its own tenant.
        from core.scoping import tenant_id_for
        creator = getattr(request, 'user', None) if request else None
        user.tenant_id = tenant_id_for(creator)
        user.save()
        if areas is not None:
            user.areas.set(areas)
        if warehouses is not None:
            user.warehouses.set(warehouses)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""
    areas = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=Area.objects.all()
    )
    warehouses = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=Warehouse.objects.all()
    )

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'avatar', 'address',
            'city', 'country', 'postal_code', 'role', 'page_permissions',
            'page_edit_permissions', 'areas', 'warehouses', 'is_active', 'status'
        ]

    def update(self, instance, validated_data):
        # Keep the textual status in sync with the Active toggle so the list
        # filters and the status badge agree.
        if 'is_active' in validated_data and 'status' not in validated_data:
            validated_data['status'] = 'active' if validated_data['is_active'] else 'inactive'
        # Only a global Super Admin may (re)assign branches.
        request = self.context.get('request')
        if not _is_super_admin(getattr(request, 'user', None) if request else None):
            validated_data.pop('warehouses', None)
        return super().update(instance, validated_data)


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

def build_user_payload(user):
    """The `user` object returned alongside a token pair on login.

    Extracted so anything else that signs a user in -- currently accepting an
    organization invite -- returns the SAME shape. The frontend stores this
    verbatim as the session user, and every role/scoping check reads from it, so
    a second hand-rolled copy that drifted would produce a session that looks
    valid but is scoped wrong.
    """
    # Prefer the user's actual role name so restricted staff roles (Sales
    # Manager, Area Manager, ...) keep their page/area scoping. Only fall back to
    # 'admin' for staff with no explicit role.
    role = 'customer'
    if user.role:
        role = user.role.name.lower()
    elif user.is_superuser or user.is_staff:
        role = 'admin'

    return {
        'id': str(user.id),
        'name': user.get_full_name() or user.username,
        'email': user.email,
        'avatar': user.avatar.url if user.avatar else None,
        'role': role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'page_permissions': user.page_permissions or [],
        'page_edit_permissions': user.page_edit_permissions or [],
        'areas': [{'id': a.id, 'name': a.name, 'code': a.code} for a in user.areas.all()],
        'warehouses': _warehouse_brief(user),
        'is_super_admin': _is_super_admin(user),
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        from django.contrib.auth.hashers import check_password
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.utils import timezone
        from modules.supplier.models import Supplier
        from modules.customer.models import Customer
        from django.db.models import Q
        from rest_framework import serializers

        # 1. Attempt Standard User Login (Admins, Employees, etc.)
        user_obj = User.objects.filter(Q(email=username) | Q(username=username)).first()

        if user_obj:
            try:
                # Update attrs with actual username if email was provided
                auth_attrs = attrs.copy()
                auth_attrs['username'] = user_obj.username
                data = super().validate(auth_attrs)
                user = self.user
                
                # Without this the login would succeed and every request after
                # it would fail on the authentication guard, which reads as a
                # broken app rather than a suspended organization.
                from core.scoping import suspended_organization_names
                suspended = suspended_organization_names(user)
                if suspended:
                    raise serializers.ValidationError({
                        'detail': f"{', '.join(suspended)} is deactivated. Contact your administrator."
                    })

                data['user'] = build_user_payload(user)
                return data
            except serializers.ValidationError:
                # A deliberate rejection (suspended organization), not a failed
                # password. The blanket except below would swallow it and fall
                # through to the supplier/customer tables, turning a clear
                # message into "invalid credentials".
                raise
            except Exception:
                # If standard login fails, continue to check Supplier/Customer tables
                pass

        # 2. Attempt Direct Supplier Login
        supplier = Supplier.objects.filter(Q(email=username) | Q(username=username), is_active=True).first()

        if supplier and check_password(password, supplier.password):
            supplier.last_login = timezone.now()
            supplier.save()
            refresh = RefreshToken()
            # SimpleJWT tokens need a 'user_id' claim. Using a prefix for non-User models.
            refresh['user_id'] = f"sup_{supplier.id}"
            refresh['role'] = 'supplier'
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': supplier.id,
                    'name': supplier.name,
                    'email': supplier.email,
                    'role': 'supplier',
                    'is_staff': False,
                    'is_superuser': False,
                }
            }

        # 3. Attempt Direct Customer Login
        customer = Customer.objects.filter(Q(email=username) | Q(username=username), is_active=True).first()

        if customer and check_password(password, customer.password):
            customer.last_login = timezone.now()
            customer.save()
            refresh = RefreshToken()
            refresh['user_id'] = f"cus_{customer.id}"
            refresh['role'] = 'customer'
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': customer.id,
                    'name': customer.name,
                    'email': customer.email,
                    'avatar': customer.avatar.url if customer.avatar else None,
                    'role': 'customer',
                    'is_staff': False,
                    'is_superuser': False,
                }
            }

        # 4. Attempt Direct Delivery Rider Login — accept email, username OR phone so a
        # rider can sign in with whichever identifier the admin gave them (riders very
        # often only know their phone number). Guard the phone match against a blank
        # value so an empty phone field can never match an empty input.
        from modules.delivery.models import DeliveryPerson
        _rider_q = Q(email=username) | Q(username=username)
        if username:
            _rider_q |= Q(phone=username)
        rider = DeliveryPerson.objects.filter(_rider_q, is_active=True).first()

        if rider and check_password(password, rider.password):
            rider.last_login = timezone.now()
            rider.save()
            refresh = RefreshToken()
            refresh['user_id'] = f"del_{rider.id}"
            refresh['role'] = 'delivery'
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': rider.id,
                    'name': rider.name,
                    'email': rider.email,
                    'avatar': rider.avatar.url if rider.avatar else None,
                    'role': 'delivery',
                    'is_staff': False,
                    'is_superuser': False,
                }
            }

        # 5. If all fail, raise standard error
        raise serializers.ValidationError({'detail': 'No active account found with the given credentials'})
