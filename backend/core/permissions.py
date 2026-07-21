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
            codes = set()
        from core.page_modules import editable_modules
        edit_perms = getattr(user, 'page_edit_permissions', None) or []
        view_perms = getattr(user, 'page_permissions', None) or []

        # A user the admin has explicitly page-restricted (a view or edit list is
        # configured) is governed by their per-page EDIT grants. The role's
        # blanket manage_* must NOT silently re-grant edit on a page the admin
        # deliberately marked view-only.
        if view_perms or edit_perms:
            return module in editable_modules(edit_perms)

        # Unconfigured (legacy) users fall back to role-level module permissions.
        if not codes:
            return True  # fully unconfigured -> do not block
        return f'manage_{module}' in codes

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanRecordPayment(HasModulePermission):
    """Permission for payment installments, which are polymorphic (booked against a
    sale, purchase, sale-return or purchase-return).

    A payment recorded against a sale/purchase should be allowed for anyone who can
    EDIT that sale/purchase — not only someone granted the standalone Payments page.
    So this passes when the base ``payments`` module check passes OR the user may
    edit the parent transaction's own module (sales / purchases). Standalone
    income/expense payments (no mapped source) still require the payments module.
    """

    perm_module = 'payments'

    _SOURCE_MODULE = {
        'order': 'sales',
        'salereturn': 'sales',
        'purchaseorder': 'purchases',
        'purchasereturn': 'purchases',
    }

    def _source_type(self, request, obj=None):
        if obj is not None:
            return (getattr(obj, 'source_type', '') or '').strip().lower()
        data = getattr(request, 'data', None) or {}
        st = data.get('source_type') or request.query_params.get('source_type')
        return (st or '').strip().lower()

    def _can_edit_module(self, user, module):
        from core.page_modules import editable_modules
        edit_perms = getattr(user, 'page_edit_permissions', None) or []
        view_perms = getattr(user, 'page_permissions', None) or []
        # Page-restricted users are governed by their per-page edit grants.
        if view_perms or edit_perms:
            return module in editable_modules(edit_perms)
        # Unconfigured (legacy) users fall back to role-level module permissions.
        try:
            codes = set(user.role.permissions.values_list('code', flat=True)) if getattr(user, 'role', None) else set()
        except Exception:
            codes = set()
        if not codes:
            return True  # fully unconfigured -> do not block
        return f'manage_{module}' in codes

    def _source_ok(self, request, obj=None):
        if request.method in permissions.SAFE_METHODS:
            return True
        st = self._source_type(request, obj)
        if not st:
            # Detail write with no body & no object yet — defer to object check.
            return True
        module = self._SOURCE_MODULE.get(st)
        return bool(module) and self._can_edit_module(request.user, module)

    def has_permission(self, request, view):
        # Base check covers reads, full-access roles, shadow logins, and the
        # payments-module edit grant. Otherwise allow if the source module is editable.
        if super().has_permission(request, view):
            return True
        return self._source_ok(request)

    def has_object_permission(self, request, view, obj):
        if super().has_permission(request, view):
            return True
        return self._source_ok(request, obj)
