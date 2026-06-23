"""
Custom permission classes for API endpoints.
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Allow access to the owning user only.
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow admins to edit, everyone can read.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsAuthenticated(permissions.BasePermission):
    """
    Allow access only to authenticated users.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


FULL_ACCESS_ROLE_NAMES = {'admin', 'super admin', 'superadmin'}


class HasModulePermission(permissions.BasePermission):
    """Per-module write enforcement for restricted staff roles.

    Write methods (POST/PUT/PATCH/DELETE) on a viewset that declares
    ``perm_module = '<module>'`` require the user's role to hold the
    ``manage_<module>`` permission code.

    This class is deliberately permissive: it ONLY ever denies a logged-in
    staff user who has a configured restricted role. Everyone else —
    anonymous users, supplier/customer (shadow) logins, superusers,
    full-access roles (Admin / Super Admin), and roles with no permissions
    configured — passes through, so public/storefront and portal flows are
    untouched and baseline auth is left to the other permission classes.
    Reads are never blocked here.
    """

    message = 'Your role does not have permission to modify this resource.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return True
        if getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False):
            return True
        if getattr(user, 'is_superuser', False):
            return True
        role = getattr(user, 'role', None)
        if role is None:
            return True
        role_name = (getattr(role, 'name', '') or '').strip().lower()
        if role_name in FULL_ACCESS_ROLE_NAMES:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True  # reads unrestricted by this class
        module = getattr(view, 'perm_module', None)
        if not module:
            return True
        try:
            codes = set(role.permissions.values_list('code', flat=True))
        except Exception:
            return True
        from core.page_modules import editable_modules
        edit_perms = getattr(user, 'page_edit_permissions', None) or []
        if not codes and not edit_perms:
            return True  # fully unconfigured -> do not block (legacy users)
        # Allow if the role can manage the module OR the user was granted
        # per-page "edit" on a page that writes to this module.
        if f'manage_{module}' in codes:
            return True
        return module in editable_modules(edit_perms)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
