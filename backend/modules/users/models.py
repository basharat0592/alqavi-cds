"""
Users module models.
"""
from django.db import models
from django.contrib.auth.models import AbstractUser
from core.models import BaseModel
from core.mixins import StatusMixin


class Permission(models.Model):
    """
    Permission model for defining system permissions.
    
    Attributes:
        name: Name of the permission
        code: Unique code identifier
        description: Description of what the permission allows
        category: Category/module this permission belongs to
    """
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ('users', 'User Management'),
            ('products', 'Product Management'),
            ('orders', 'Order Management'),
            ('inventory', 'Inventory Management'),
            ('settings', 'Settings'),
            ('roles', 'Roles & Permissions'),
        ],
        default='users'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return self.name


class Role(models.Model):
    """
    Role model for defining user roles with permissions.
    
    Attributes:
        name: Name of the role
        description: Description of the role
        permissions: M2M relationship to permissions
        is_default: Whether this is a default system role
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, through='RolePermission')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_default']),
        ]
    
    def __str__(self):
        return self.name
    
    def get_permissions(self):
        """Get all permissions for this role"""
        return self.permissions.all()


class RolePermission(models.Model):
    """
    Association model between Role and Permission.
    """
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('role', 'permission')
        indexes = [
            models.Index(fields=['role', 'permission']),
        ]
    
    def __str__(self):
        return f"{self.role.name} - {self.permission.name}"


class User(AbstractUser, StatusMixin):
    """
    Custom user model extending Django's AbstractUser.
    
    Attributes:
        phone: Contact phone number
        address: User's address
        city: City of residence
        country: Country of residence
        postal_code: Postal code
        role: User's assigned role
    """
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    plain_password = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return self.get_full_name() or self.username
    
    def get_permissions(self):
        """Get all permissions for this user through their role"""
        if self.role:
            return self.role.get_permissions()
        return Permission.objects.none()
    
    def has_permission(self, permission_code):
        """Check if user has a specific permission"""
        return self.get_permissions().filter(code=permission_code).exists()


class UserActivityLog(models.Model):
    """
    Activity log for tracking user actions and login history.
    
    Attributes:
        user: User who performed the action
        action: Type of action performed
        description: Detailed description of the action
        ip_address: IP address from which action was performed
        user_agent: Browser/client information
        timestamp: When the action occurred
    """
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        ('role_assign', 'Role Assignment'),
        ('status_change', 'Status Change'),
        ('export', 'Export'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"


class UserSettings(models.Model):
    """
    Per-user settings: notification prefs and UI appearance.
    One-to-one with User.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')

    # ── Notification preferences ──────────────────────────────
    notif_new_order = models.BooleanField(default=True)
    notif_low_stock = models.BooleanField(default=True)
    notif_new_user = models.BooleanField(default=False)
    notif_weekly_report = models.BooleanField(default=True)
    notif_marketing = models.BooleanField(default=False)
    notif_sms = models.BooleanField(default=False)

    # ── Appearance ────────────────────────────────────────────
    theme = models.CharField(max_length=10, default='light')
    accent_color = models.CharField(max_length=20, default='#007185')
    compact_mode = models.BooleanField(default=False)
    animations = models.BooleanField(default=True)
    sidebar_collapsed = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Settings for {self.user.username}'
