"""Data scoping helpers.

Two independent axes:

* **Area** — an Area Manager only sees data for their assigned area(s).
* **Branch (warehouse)** — multi-branch isolation: a Branch Admin only sees data
  for the warehouse(s) the Super Admin assigned them. The global Super Admin
  (Django superuser or the "Super Admin" role) sees every branch. Plain "Admin"
  is a *branch* admin and IS scoped — having permission to open a page is not the
  same as being allowed to see every branch's rows.
"""


# Roles that see EVERY branch. Plain 'admin' is intentionally absent: an Admin is
# a branch admin, scoped to their assigned warehouses.
GLOBAL_BRANCH_ROLE_NAMES = {'super admin', 'superadmin'}


def is_unscoped_admin(user):
    """True for users who see all branches: Django superusers and the Super
    Admin role. Used to bypass branch scoping entirely."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    role = getattr(user, 'role', None)
    role_name = (getattr(role, 'name', '') or '').strip().lower()
    return role_name in GLOBAL_BRANCH_ROLE_NAMES


def user_warehouse_ids(user):
    """Branch (warehouse) scope for the current user.

    Returns:
      None  -> NOT branch-scoped; sees every branch. This covers global admins
               (super admin / superuser) and supplier/customer/delivery shadow
               logins + anonymous requests (those are governed by their own view
               logic and permission classes, never by branch).
      set   -> a branch-scoped staff user: the ids of their assigned warehouses.
               An empty set means no branch is assigned == sees nothing (fail
               closed).
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if (getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False)
            or getattr(user, 'is_delivery', False)):
        return None
    if is_unscoped_admin(user):
        return None
    try:
        return {str(x) for x in user.warehouses.values_list('id', flat=True)}
    except Exception:
        return set()


def scope_queryset(user, queryset, field='warehouse'):
    """Filter a queryset to the user's assigned branch(es).

    `field` is the FK path from the model to inventory.Warehouse, e.g.
    'warehouse', 'order__warehouse', 'purchase_order__warehouse', or 'id' for the
    Warehouse model itself. Unscoped users get the queryset unchanged; scoped
    users with no branch get an empty queryset.
    """
    ids = user_warehouse_ids(user)
    if ids is None:
        return queryset
    if not ids:
        return queryset.none()
    return queryset.filter(**{f'{field}__in': ids})


def scope_to_creator(user, queryset, field='created_by'):
    """Further restrict a queryset to records the branch admin personally created.

    Layered on top of branch scoping: a branch-scoped admin only sees their own
    records (``field`` = their user id). Unscoped users (super admin / superuser)
    and shadow/anonymous requests are left untouched. ``field`` is the path to the
    creating-user FK, e.g. 'created_by', 'user', 'order__created_by'.
    """
    ids = user_warehouse_ids(user)
    if ids is None:
        return queryset  # super admin / shadow / anon — not creator-scoped
    pk = getattr(user, 'pk', None)
    if not pk:
        return queryset.none()
    return queryset.filter(**{field: pk})


def apply_report_scope(request, queryset, branch_field='warehouse', creator_field='created_by'):
    """Scope a report/aggregate queryset.

    * Branch admin -> locked to their branch AND their own records (per-admin).
    * Super admin   -> everything, with optional drill-down via ?created_by=<userId>
                       and/or ?warehouse=<branchId> query params.

    Pass creator_field=None to scope by branch only (e.g. shared inventory).
    """
    user = getattr(request, 'user', None)
    queryset = scope_queryset(user, queryset, branch_field)
    if creator_field:
        queryset = scope_to_creator(user, queryset, creator_field)
    # Super-admin explicit drill-down (ignored for branch admins — already locked).
    if is_unscoped_admin(user):
        params = getattr(request, 'query_params', None) or {}
        cb = params.get('created_by')
        wh = params.get('warehouse')
        if cb and creator_field:
            queryset = queryset.filter(**{creator_field: cb})
        if wh:
            queryset = queryset.filter(**{branch_field: wh})
    return queryset


def user_can_use_warehouse(user, warehouse_id):
    """Whether the user may create/act against the given warehouse. Unscoped
    admins can target any warehouse; branch admins only their assigned ones."""
    if warehouse_id in (None, '', 'null'):
        return True
    ids = user_warehouse_ids(user)
    if ids is None:
        return True
    return str(warehouse_id) in ids


class BranchScopedQuerysetMixin:
    """ViewSet mixin that transparently scopes both list and detail access to the
    requesting user's assigned warehouse(s).

    It hooks ``filter_queryset`` — which DRF calls for list *and* ``get_object``
    — so it composes with viewsets that define their own ``get_queryset``
    (overriding ``get_queryset`` would be shadowed by the subclass's own).
    Set ``branch_field`` to the FK path from the model to Warehouse. Custom
    ``@action`` methods that build their own querysets must call
    ``scope_queryset`` themselves.
    """
    branch_field = 'warehouse'
    # When set, branch admins additionally only see records they created (their
    # own). Leave None to show the whole branch. Path to the creator FK, e.g.
    # 'created_by', 'user', 'order__created_by'.
    creator_field = None

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        user = getattr(self.request, 'user', None)
        queryset = scope_queryset(user, queryset, self.branch_field)
        if self.creator_field:
            queryset = scope_to_creator(user, queryset, self.creator_field)
        return queryset


def user_area_ids(user):
    """Return the list of Area ids an Area Manager is scoped to.

    Returns None when the user is NOT area-scoped (i.e. should see everything).
    Returns a (possibly empty) list when the user IS an Area Manager — an empty
    list means they have no areas assigned yet and therefore see nothing.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    # Shadow users (supplier/customer logins) are never area-scoped here.
    if getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False):
        return None
    # Scope strictly by role name so it still applies even though Area Managers
    # are is_staff (needed to reach the admin panel). Admin / Super Admin and
    # every other staff role are unrestricted by area.
    role = getattr(user, 'role', None)
    role_name = (getattr(role, 'name', '') or '').strip().lower()
    if role_name != 'area manager':
        return None
    try:
        return list(user.areas.values_list('id', flat=True))
    except Exception:
        return []
