"""Area-based data scoping for Area Manager users.

An Area Manager only sees data belonging to the area(s) assigned to them.
Everyone else (staff, super admin, full-access roles, suppliers, customers,
and other staff roles) is unrestricted by area.
"""


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
