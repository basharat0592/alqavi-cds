"""
Users module services containing business logic.
"""
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, Role, Permission, UserActivityLog


class UserService:
    """Service class for user management operations."""
    
    @staticmethod
    def authenticate_user(username, password):
        """Authenticate a user with username and password."""
        user = authenticate(username=username, password=password)
        if user:
            user.last_login_at = timezone.now()
            user.save()
        return user
    
    @staticmethod
    def get_user_by_email(email):
        """Retrieve a user by email address."""
        return User.objects.filter(email=email).first()
    
    @staticmethod
    def get_user_by_username(username):
        """Retrieve a user by username."""
        return User.objects.filter(username=username).first()
    
    @staticmethod
    def create_user(username, email, password, first_name='', last_name='', role=None, **kwargs):
        """Create a new user account."""
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            **kwargs
        )
        if role:
            user.role = role
            user.save()
        return user
    
    @staticmethod
    def update_user_profile(user, **kwargs):
        """Update user profile information."""
        for field, value in kwargs.items():
            if hasattr(user, field) and field not in ['password', 'id']:
                setattr(user, field, value)
        user.save()
        return user
    
    @staticmethod
    def change_password(user, new_password):
        """Change user password."""
        user.set_password(new_password)
        user.save()
        return user
    
    @staticmethod
    def assign_role(user, role):
        """Assign a role to a user."""
        user.role = role
        user.save()
        return user
    
    @staticmethod
    def activate_user(user):
        """Activate a user account."""
        user.is_active = True
        user.status = 'active'
        user.save()
        return user
    
    @staticmethod
    def deactivate_user(user):
        """Deactivate a user account."""
        user.is_active = False
        user.status = 'inactive'
        user.save()
        return user
    
    @staticmethod
    def suspend_user(user):
        """Suspend a user account."""
        user.is_active = False
        user.status = 'suspended'
        user.save()
        return user
    
    @staticmethod
    def get_active_users():
        """Get all active users."""
        return User.objects.filter(is_active=True, status='active')
    
    @staticmethod
    def get_users_by_role(role):
        """Get all users with a specific role."""
        return User.objects.filter(role=role)
    
    @staticmethod
    def get_user_count_by_status(status):
        """Get count of users by status."""
        return User.objects.filter(status=status).count()
    
    @staticmethod
    def search_users(query):
        """Search users by username, email, or name."""
        return User.objects.filter(
            username__icontains=query
        ) | User.objects.filter(
            email__icontains=query
        ) | User.objects.filter(
            first_name__icontains=query
        ) | User.objects.filter(
            last_name__icontains=query
        )


class RoleService:
    """Service class for role management operations."""
    
    @staticmethod
    def create_role(name, description='', permissions=None):
        """Create a new role."""
        role = Role.objects.create(name=name, description=description)
        if permissions:
            role.permissions.set(permissions)
        return role
    
    @staticmethod
    def get_role_by_name(name):
        """Get role by name."""
        return Role.objects.filter(name=name).first()
    
    @staticmethod
    def update_role(role, name=None, description=None, permissions=None):
        """Update role information."""
        if name:
            role.name = name
        if description is not None:
            role.description = description
        role.save()
        if permissions:
            role.permissions.set(permissions)
        return role
    
    @staticmethod
    def add_permission_to_role(role, permission):
        """Add a permission to a role."""
        role.permissions.add(permission)
        return role
    
    @staticmethod
    def remove_permission_from_role(role, permission):
        """Remove a permission from a role."""
        role.permissions.remove(permission)
        return role
    
    @staticmethod
    def get_role_permissions(role):
        """Get all permissions for a role."""
        return role.permissions.all()
    
    @staticmethod
    def get_users_by_role(role):
        """Get all users with a specific role."""
        return User.objects.filter(role=role)


class PermissionService:
    """Service class for permission management operations."""
    
    @staticmethod
    def create_permission(name, code, description='', category='users'):
        """Create a new permission."""
        return Permission.objects.create(
            name=name,
            code=code,
            description=description,
            category=category
        )
    
    @staticmethod
    def get_permission_by_code(code):
        """Get permission by code."""
        return Permission.objects.filter(code=code).first()
    
    @staticmethod
    def get_permissions_by_category(category):
        """Get all permissions in a category."""
        return Permission.objects.filter(category=category)
    
    @staticmethod
    def user_has_permission(user, permission_code):
        """Check if user has a specific permission."""
        if not user.role:
            return False
        return user.role.permissions.filter(code=permission_code).exists()


class ActivityLogService:
    """Service class for activity logging operations."""
    
    @staticmethod
    def log_action(user, action, description, ip_address=None, user_agent=None):
        """Log a user action."""
        return UserActivityLog.objects.create(
            user=user,
            action=action,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def get_user_activity(user, limit=50):
        """Get user activity logs."""
        return UserActivityLog.objects.filter(user=user)[:limit]
    
    @staticmethod
    def get_activity_by_action(action, limit=100):
        """Get logs filtered by action type."""
        return UserActivityLog.objects.filter(action=action)[:limit]
    
    @staticmethod
    def get_recent_activity(limit=100):
        """Get recent activity logs."""
        return UserActivityLog.objects.all()[:limit]
    
    @staticmethod
    def get_login_history(user, limit=10):
        """Get user login history."""
        return UserActivityLog.objects.filter(user=user, action='login')[:limit]
