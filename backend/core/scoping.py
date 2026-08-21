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


# ── Tenant (per-Admin) isolation ──────────────────────────────────────────────
# The PRIMARY isolation axis. Every Admin created by the Super Admin is an
# independent tenant; a staff sub-user belongs to (shares) their Admin's tenant;
# the Super Admin / superuser is the cross-tenant platform operator. Branch
# (warehouse) and area remain orthogonal SUB-axes *within* a tenant.

PLATFORM_OPERATOR_ROLE_NAMES = {'super admin', 'superadmin'}


def is_platform_operator(user):
    """True for the cross-tenant platform operator: a Django superuser or the
    'Super Admin' role. They manage Admin (tenant) accounts and see every
    tenant's data. A plain 'Admin' is a TENANT owner — NOT a platform operator —
    and is strictly scoped to their own tenant."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    role = getattr(user, 'role', None)
    role_name = (getattr(role, 'name', '') or '').strip().lower()
    return role_name in PLATFORM_OPERATOR_ROLE_NAMES


def tenant_id_for(user):
    """The owning-Admin (tenant) id for the current user — the single isolation axis.

    Returns:
      None -> NOT tenant-scoped. The platform operator (super admin / superuser),
              supplier/customer/delivery shadow logins, and anonymous requests.
              These are governed by their own view logic / permission classes,
              never by tenant, so ``scope_to_tenant`` is a no-op for them (the
              public storefront and supplier/customer portals keep working).
      int  -> the owning Admin's pk. An Admin's tenant is ITSELF; a staff
              sub-user's tenant is the Admin they belong to (``User.tenant_id``).
              Falls back to the user's own pk when tenant is unset (an Admin row
              before backfill). The fallback is fail-SAFE: it never widens
              visibility beyond the user's own records.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if (getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False)
            or getattr(user, 'is_delivery', False)):
        return None
    if is_platform_operator(user):
        return None
    tid = getattr(user, 'tenant_id', None)
    if tid:
        return tid
    return getattr(user, 'pk', None)


def scope_to_tenant(user, queryset, field='tenant'):
    """Restrict a queryset to the requesting user's tenant (owning Admin).

    Platform operator / shadow logins / anonymous (``tenant_id_for`` -> None) get
    the queryset unchanged. A tenant user sees only rows whose ``field`` matches
    their owning-Admin id. ``field`` is the FK path to the owning-Admin User, e.g.
    'tenant', 'order__tenant', 'purchase_order__tenant'.
    """
    tid = tenant_id_for(user)
    if tid is None:
        return queryset
    return queryset.filter(**{field: tid})


def user_can_use_tenant(user, tenant_id):
    """Whether the user may create/act against the given tenant id. The platform
    operator may target any tenant; a tenant user only their own. A blank/None
    target (a public/storefront row) is always allowed."""
    tid = tenant_id_for(user)
    if tid is None:
        return True
    if tenant_id in (None, '', 'null'):
        return True
    return str(tenant_id) == str(tid)


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


def suspended_organization_names(user):
    """The user's organizations, when EVERY one of them is deactivated.

    Deactivating an organization suspends it: nobody who belongs to it can sign
    in or use the API. Returns a list of names in that case, otherwise an empty
    list.

    Not applicable to:
      * the platform operator (super admin / superuser) -- they span every
        organization and are not a member of any one of them;
      * supplier / customer / delivery shadow logins -- governed by their own
        is_active flags;
      * a staff user with no organization at all -- that is not a suspension,
        and branch scoping already fails them closed.

    A user assigned to several organizations stays active while ANY of them is,
    so deactivating one branch of a multi-branch admin does not lock them out.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return []
    if (getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False)
            or getattr(user, 'is_delivery', False)):
        return []
    if is_unscoped_admin(user):
        return []
    try:
        rows = list(user.warehouses.values_list('name', 'is_active'))
    except Exception:
        return []
    if not rows:
        return []
    if any(active for _, active in rows):
        return []
    return [name for name, _ in rows]


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


def apply_report_scope(request, queryset, branch_field='warehouse', creator_field='created_by', tenant_field=None):
    """Scope a report/aggregate queryset.

    When ``tenant_field`` is set (the FK path to the owning-Admin, usually
    'tenant') the report is locked to the requesting TENANT:

    * Tenant user  -> only their tenant's rows. Optional within-tenant drill-down
                      via ?warehouse=<branchId> and ?created_by=<userId>.
    * Platform op  -> every tenant, with optional ?tenant=<adminId> drill-down
                      (and the same ?warehouse / ?created_by sub-filters).

    When ``tenant_field`` is None it falls back to the legacy branch (+creator)
    scoping, so reports on models without a tenant column keep working. Pass
    creator_field=None to scope by branch only (e.g. shared inventory).
    """
    user = getattr(request, 'user', None)
    params = getattr(request, 'query_params', None) or {}
    if tenant_field:
        queryset = scope_to_tenant(user, queryset, tenant_field)
        if is_platform_operator(user):
            t = params.get('tenant')
            if t:
                queryset = queryset.filter(**{tenant_field: t})
        cb = params.get('created_by')
        wh = params.get('warehouse')
        if cb and creator_field:
            queryset = queryset.filter(**{creator_field: cb})
        if wh and branch_field:
            queryset = queryset.filter(**{branch_field: wh})
        return queryset
    # Legacy branch + creator scoping (models without a tenant column).
    queryset = scope_queryset(user, queryset, branch_field)
    if creator_field:
        queryset = scope_to_creator(user, queryset, creator_field)
    # Super-admin explicit drill-down (ignored for branch admins — already locked).
    if is_unscoped_admin(user):
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
    """ViewSet mixin that scopes both list and detail access for the requester.

    **Tenant isolation is the primary axis.** Set ``tenant_field`` to the FK path
    from the model to the owning-Admin User (usually 'tenant'). When set, the
    queryset is filtered to the requester's tenant and branch/creator scoping is
    NOT applied — tenant replaces them as the isolation boundary. ``warehouse``
    becomes an optional within-tenant filter via the ?warehouse= query param.

    When ``tenant_field`` is None the mixin falls back to legacy branch (+optional
    creator) scoping, so viewsets not yet migrated keep their current behaviour.

    It hooks ``filter_queryset`` — which DRF calls for list *and* ``get_object``
    — so it composes with viewsets that define their own ``get_queryset``.
    Custom ``@action`` methods that build their own querysets must call
    ``scope_to_tenant`` (or ``scope_queryset``) themselves.
    """
    branch_field = 'warehouse'
    # When set (legacy mode only), branch admins additionally only see records
    # they created. Path to the creator FK, e.g. 'created_by', 'user'.
    creator_field = None
    # When set, THE isolation axis: FK path to the owning-Admin User ('tenant').
    tenant_field = None
    # Shadow PORTAL users (supplier / customer / delivery logins) have NO access
    # to a tenant's admin business data — for them tenant scoping is a no-op, so
    # without this guard they would see EVERY tenant's rows. Tenant-scoped
    # viewsets therefore DENY shadow users by default. Set shadow_safe=True only
    # on viewsets that legitimately serve portal/storefront users (the public
    # catalog, or viewsets whose get_queryset already limits the shadow user to
    # their own slice — orders, purchases, returns).
    shadow_safe = False

    def _is_shadow(self, user):
        return bool(getattr(user, 'is_supplier', False)
                    or getattr(user, 'is_customer', False)
                    or getattr(user, 'is_delivery', False))

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        user = getattr(self.request, 'user', None)
        if self.tenant_field:
            if not self.shadow_safe and self._is_shadow(user):
                return queryset.none()
            queryset = scope_to_tenant(user, queryset, self.tenant_field)
            wh = (getattr(self.request, 'query_params', None) or {}).get('warehouse')
            if wh and self.branch_field:
                queryset = queryset.filter(**{self.branch_field: wh})
            return queryset
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
