"""Trade 1.0 User Permissions (Setup › User-Role Permissions).

Each login can be given a set of rights, "<key>.<action>" (e.g. "purchase.save").
A login without a saved set has full access, and the shop's main admin (and the
platform operator) always does. Once a set is saved for a login:

* the dashboard greys out, and the window guard refuses, every window the login
  has no right on at all;
* the server refuses the actions not granted (TradePermissionMiddleware below):
  Save (create), Update (change), Delete, and View where the View list is its
  own request. Shared look-up lists (accounts, companies, areas …) stay open, as
  other windows need them.
"""
import json
import re

from django.http import JsonResponse

S, V, U, D, E, P = 'save', 'view', 'update', 'delete', 'export', 'print'
SVUDE = [S, V, U, D, E]

# The window's layout: section -> rows (key, label, actions, windows it opens).
CATALOG = [
    {'id': 'masters', 'rows': [
        ('staff', 'Staff', SVUDE, ['/admin/trade/staff']),
        ('companies', 'Companies', SVUDE, ['/admin/trade/companies']),
        ('product_category', 'Product Category', SVUDE, ['/admin/trade/product-category']),
        ('product_group', 'Product Group', SVUDE, []),
        ('product_detail', 'Product Detail', SVUDE, ['/admin/trade/product-detail']),
        ('purchase_order', 'Purchase Order', [S, V, U, D], ['/admin/trade/purchase-order']),
        ('district', 'District', SVUDE, ['/admin/trade/district']),
        ('area', 'Area', SVUDE, ['/admin/trade/main-area', '/admin/trade/sub-area']),
        ('accounts_2nd', 'Accounts 2nd Level', SVUDE, ['/admin/trade/accounts-2nd-level']),
        ('accounts_3rd', 'Accounts 3nd Level', SVUDE, ['/admin/trade/accounts-3rd-level']),
        ('chart_of_accounts', 'Chart of Accounts', SVUDE, ['/admin/trade/chart-of-account']),
        ('financial_year', 'Financial Year', [S, V, U, D], ['/admin/trade/financial-year']),
        ('general_voucher', 'General Voucher', SVUDE, ['/admin/trade/general-voucher', '/admin/trade/forward-profit-loss']),
    ]},
    {'id': 'setup', 'rows': [
        ('new_user', 'New User', [S, V, U, D], ['/admin/trade/new-user']),
        ('user_permissions', 'User Permissions', [S, V, D], ['/admin/trade/user-permissions']),
        ('change_password', 'Change Password', ['own', 'all'], ['/admin/trade/change-password']),
        ('database', 'Database', ['backup', 'restore'], ['/admin/trade/backup']),
        ('distribution', 'Distributions Titles', [U], ['/admin/trade/distribution-setting']),
    ]},
    {'id': 'stock', 'rows': [
        ('cheque_management', 'Cheque Managment', [S, V], ['/admin/trade/cheque-management']),
        ('purchase', 'Purchase', [S, V], ['/admin/trade/purchase']),
        ('purchase_return', 'Purchase Return', [S, V], ['/admin/trade/purchase-return']),
        ('opening_stock_add', 'Opening Stock Add', [S, V], ['/admin/trade/opening-stock-add']),
        ('opening_stock_less', 'Opening Stock Less', [S, V], ['/admin/trade/opening-stock-less']),
        ('opening_assets', 'Opening Assets', [S, V], ['/admin/trade/opening-assets']),
        ('opening_receivables', 'Opening Receivables', [S, V], ['/admin/trade/opening-receivable']),
        ('opening_liabilities', 'Opening Liabilities', [S, V], ['/admin/trade/opening-liabilities']),
    ]},
    {'id': 'money', 'rows': [
        ('receipt_voucher', 'Receipt Voucher', [S, V], ['/admin/trade/receipt-voucher']),
        ('payment_voucher', 'Payment Voucher', [S, V], ['/admin/trade/payment-voucher']),
        ('expense_voucher', 'Expanse Voucher', [S, V], ['/admin/trade/expense-voucher']),
        ('bank_deposit', 'Bank Deposite', [S, V], []),
        ('bank_withdrawal', 'Bank withdrawal', [S, V], ['/admin/trade/bank-withdrawal']),
        ('credit_card', 'Credit Card', [S, V, U, D], ['/admin/trade/credit-card', '/admin/trade/credit-card-report']),
        ('partnership', 'Partnership', [S, V, U, D], ['/admin/trade/partnership', '/admin/trade/investors']),
        ('donation', 'Donation', [S, V, U, D], ['/admin/trade/donation']),
        ('sale', 'Sale', [S, V], ['/admin/trade/sale-invoice', '/admin/trade/sale-records']),
        ('sale_return', 'Sale Return', [S, V], ['/admin/trade/sale-return']),
        ('purrate_in_sale', 'PurRate and Pur Value in Sale', [V], []),
    ]},
    {'id': 'adjust', 'rows': [
        ('damage', 'Demage', [S, V], ['/admin/trade/damage-stock']),
        ('un_damage', 'Un-Demage', [S, V], ['/admin/trade/damage-reverse']),
        ('stock_access', 'Stock Access', [S, V], ['/admin/trade/stock-excess']),
        ('stock_short', 'Stock Short', [S, V], ['/admin/trade/stock-short']),
        ('cash_access', 'Cash Access', [S, V], ['/admin/trade/cash-excess']),
        ('cash_short', 'Cash Short', [S, V], ['/admin/trade/cash-short']),
        ('rates_expiry', 'Rates/Expiry', [S, V], ['/admin/trade/update-rates']),
        ('stock', 'Stock', [V, E], []),
    ]},
    {'id': 'reports1', 'rows': [(k, l, [P], []) for k, l in [
        ('rpt_stock_taking', 'Stock Taking List'), ('rpt_stock_summary', 'Stock Summary'),
        ('rpt_stock_pur_rate', 'Stock with Pur.Rate'), ('rpt_stock_no_pur_rate', 'Stock without Pur.Rate'),
        ('rpt_purchase_order', 'Purchase order'), ('rpt_purchase_stock', 'Purchase Stock'),
        ('rpt_purchase_return', 'Purchase Return'), ('rpt_sale_invoice', 'Sale Invoice and List'),
        ('rpt_sale_return', 'Sale Ret Invoice and List'), ('rpt_delivery_challan', 'Delivery Challan'),
        ('rpt_customer_list', 'Customer List')]]},
    {'id': 'reports2', 'rows': [(k, l, [P], []) for k, l in [
        ('rpt_opening_stock', 'Opening Stock Add / Less'), ('rpt_damage', 'Demage/Un-Demage Stock'),
        ('rpt_stock_access', 'Stock Access / Short'), ('rpt_cash_access', 'Cash Access / Short'),
        ('rpt_sale_date', 'Sale Summary (Date-wise)'), ('rpt_sale_saleman', 'Sale Summary (Saleman)'),
        ('rpt_sale_customer', 'Sale Summary (Customer-wise)'), ('rpt_sale_company', 'Sale Summary (Company-wise)'),
        ('rpt_sale_area', 'Sale Summary (Area-wise)'), ('rpt_daily_sale', 'Daily Sale  (By Profit/Qty)'),
        ('rpt_product_sale', 'Product-wise Sale  ( By Profit/Qty')]]},
    {'id': 'reports3', 'rows': [(k, l, [P], []) for k, l in [
        ('rpt_stock_position', 'Stock Position'), ('rpt_chart_of_account', 'Chart of Account'),
        ('rpt_journal', 'Journal'), ('rpt_account_balances', 'Account Balances'), ('rpt_ledger', 'Ledger'),
        ('rpt_trial_balance', 'Tribalance'), ('rpt_profit_loss', 'Profit and Loss'), ('rpt_balance_sheet', 'Balance Sheet')]]},
]
LABELS = {r[0]: r[1] for s in CATALOG for r in s['rows']}
ALL_PERMS = sorted(f'{r[0]}.{a}' for s in CATALOG for r in s['rows'] for a in r[2])
ACTION_WORD = {S: 'save', V: 'view', U: 'update', D: 'delete', E: 'export', P: 'print', 'own': 'change',
               'all': 'change', 'backup': 'back up', 'restore': 'restore'}


def catalog_json():
    return [{'id': s['id'], 'rows': [{'key': k, 'label': l, 'actions': a, 'hrefs': h} for k, l, a, h in s['rows']]}
            for s in CATALOG]


# ───────────────────────── who is restricted ─────────────────────────

def is_owner(user):
    """The shop's main admin (and the platform operator) always has full access."""
    if getattr(user, 'is_superuser', False):
        return True
    tid = getattr(user, 'tenant_id', None)
    return tid is None or tid == user.pk


def perms_for(user):
    """None = full access, else the set of granted rights."""
    from .models import TradePermission
    if not user or not getattr(user, 'is_authenticated', False) or is_owner(user):
        return None
    tp = TradePermission.objects.filter(user=user).first()
    return None if tp is None else set(tp.perms or [])


def allowed(user, perm):
    granted = perms_for(user)
    return granted is None or perm in granted


# ───────────────────────── server-side rules ─────────────────────────
# (methods, path regex under /api/v1/, condition on the request's kind / level /
# vtype (None = always), key, action). First match wins.

def _kind(*vals):
    return lambda q: str(q.get('kind') or '') in vals


def _level(*vals, default=None):
    return lambda q: str(q.get('level') or default or '') in vals


def _vtype(v, default=None):
    return lambda q: str(q.get('vtype') or default or '') == v


RULES = []


def _crud(prefix, key, cond=None, view_list=False):
    p = re.escape(prefix)
    if view_list:
        RULES.append(('GET', rf'^{p}$', cond, key, V))
    RULES.append(('POST', rf'^{p}$', cond, key, S))
    RULES.append(('PATCH PUT', rf'^{p}[^/]+/$', cond, key, U))
    RULES.append(('DELETE', rf'^{p}[^/]+/$', cond, key, D))


_crud('sales/trade-staff/', 'staff', view_list=True)
_crud('company/companies/', 'companies')
_crud('sales/trade-categories/', 'product_category')
_crud('sales/trade-purchase-orders/', 'purchase_order', view_list=True)
_crud('sales/trade-areas/', 'district', _level('district', default='district'))
_crud('sales/trade-areas/', 'area', _level('main', 'sub'))
_crud('sales/trade-account-groups/', 'accounts_2nd', _level('2', default='2'))
_crud('sales/trade-account-groups/', 'accounts_3rd', _level('3'))
_crud('company/ledger-accounts/', 'chart_of_accounts')
_crud('sales/trade-financial-years/', 'financial_year')
_crud('sales/trade-general-vouchers/', 'general_voucher', view_list=True)
_crud('sales/trade-forward-pl/', 'general_voucher', view_list=True)
_crud('users/trade-users/', 'new_user', view_list=True)
RULES += [('GET', r'^sales/trade-cards/payments/$', None, 'credit_card', V),
          ('POST', r'^sales/trade-cards/payments/$', None, 'sale', S)]   # paid by card on the Sale Invoice
_crud('sales/trade-cards/', 'credit_card')
RULES += [('POST', r'^sales/trade-partners/(entries|distributions)/$', None, 'partnership', S),
          ('DELETE', r'^sales/trade-partners/distributions/[0-9]+/$', None, 'partnership', D)]
_crud('sales/trade-partners/', 'partnership', view_list=True)
RULES += [('POST', r'^sales/trade-donations/types/$', None, 'donation', U),
          ('PATCH DELETE', r'^sales/trade-donations/types/[0-9]+/$', None, 'donation', U)]
_crud('sales/trade-donations/', 'donation', view_list=True)
RULES += [
    ('POST', r'^products/items/trade_save/$', None, 'product_detail', S),
    ('DELETE', r'^products/items/[^/]+/$', None, 'product_detail', D),
    ('GET', r'^sales/trade-bank/cheques/$', None, 'cheque_management', V),
    ('POST', r'^sales/trade-bank/clear_cheques/$', None, 'cheque_management', S),
    ('GET', r'^sales/trade-bank/withdrawals/$', None, 'bank_withdrawal', V),
    ('POST', r'^sales/trade-bank/withdrawals/$', None, 'bank_withdrawal', S),
    ('GET', r'^sales/trade-purchases/$', None, 'purchase', V),
    ('POST', r'^sales/trade-purchases/$', None, 'purchase', S),
    ('GET', r'^sales/trade-purchase-returns/$', None, 'purchase_return', V),
    ('POST', r'^sales/trade-purchase-returns/$', None, 'purchase_return', S),
]
for _k, _key in [('oadd', 'opening_stock_add'), ('oles', 'opening_stock_less'), ('sexc', 'stock_access'), ('ssho', 'stock_short')]:
    RULES += [('GET', r'^sales/trade-opening-stock/$', _kind(_k), _key, V), ('POST', r'^sales/trade-opening-stock/$', _kind(_k), _key, S)]
for _k, _key in [('assets', 'opening_assets'), ('receivables', 'opening_receivables'), ('liabilities', 'opening_liabilities')]:
    RULES += [('GET', r'^sales/trade-opening-vouchers/$', _kind(_k), _key, V), ('POST', r'^sales/trade-opening-vouchers/$', _kind(_k), _key, S)]
for _k, _key in [('add', 'damage'), ('less', 'un_damage')]:
    RULES += [('GET', r'^sales/trade-damage/$', _kind(_k) if _k == 'less' else (lambda q: str(q.get('kind') or 'add') == 'add'), _key, V),
              ('POST', r'^sales/trade-damage/$', _kind(_k) if _k == 'less' else (lambda q: str(q.get('kind') or 'add') == 'add'), _key, S)]
for _k, _key in [('access', 'cash_access'), ('short', 'cash_short')]:
    RULES += [('GET', r'^sales/trade-cash-short-excess/$', _kind(_k) if _k == 'short' else (lambda q: str(q.get('kind') or 'access') == 'access'), _key, V),
              ('POST', r'^sales/trade-cash-short-excess/$', _kind(_k) if _k == 'short' else (lambda q: str(q.get('kind') or 'access') == 'access'), _key, S)]
for _v, _key in [('receipt', 'receipt_voucher'), ('payment', 'payment_voucher'), ('expense', 'expense_voucher')]:
    RULES += [('GET', r'^sales/vouchers/$', _vtype(_v, 'receipt'), _key, V), ('POST', r'^sales/vouchers/$', _vtype(_v, 'receipt'), _key, S)]
RULES += [
    ('POST', r'^sales/orders/$', None, 'sale', S),
    ('GET', r'^sales/orders/sale_records/$', None, 'sale', V),
    ('POST', r'^sales/trade-returns/$', None, 'sale_return', S),
    ('GET', r'^products/items/rate_expiry_list/$', None, 'rates_expiry', V),
    ('POST', r'^products/items/rate_expiry_update/$', None, 'rates_expiry', S),
    ('GET', r'^users/trade-backup/$', None, 'database', 'backup'),
    ('PATCH', r'^sales/orders/invoice_profile/$', None, 'distribution', U),
]
_COMPILED = [(set(m.split()), re.compile(rx), cond, key, act) for m, rx, cond, key, act in RULES]


def _lookup(request):
    q = {k: v for k, v in request.GET.items()}
    if request.method != 'GET' and 'json' in (request.content_type or ''):
        try:
            body = json.loads(request.body or b'{}')
            if isinstance(body, dict):
                q.update({k: v for k, v in body.items() if k in ('kind', 'level', 'vtype')})
        except (ValueError, UnicodeDecodeError):
            pass
    return q


def match(request):
    path = request.path
    if not path.startswith('/api/v1/'):
        return None
    rel = path[len('/api/v1/'):]
    q = None
    for methods, rx, cond, key, act in _COMPILED:
        if request.method in methods and rx.match(rel):
            if cond is not None:
                q = q if q is not None else _lookup(request)
                if not cond(q):
                    continue
            return key, act
    return None


class TradePermissionMiddleware:
    """Refuses Trade actions a restricted login has not been granted."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        hit = match(request)
        if hit:
            user = None
            try:
                from modules.users.authentication import MultiTableJWTAuthentication
                res = MultiTableJWTAuthentication().authenticate(request)
                user = res[0] if res else None
            except Exception:
                user = None   # the view itself answers bad / missing tokens
            if user is not None and getattr(user, 'is_staff', False):
                key, act = hit
                if not allowed(user, f'{key}.{act}'):
                    return JsonResponse({'detail': f'You do not have permission to {ACTION_WORD.get(act, act)} — {LABELS.get(key, key)}.'},
                                        status=403)
        return self.get_response(request)


# ───────────────────────── API ─────────────────────────
from rest_framework.decorators import api_view, permission_classes as _pc  # noqa: E402
from rest_framework.permissions import IsAdminUser  # noqa: E402
from rest_framework.response import Response  # noqa: E402


def _shop_users(actor):
    from django.contrib.auth import get_user_model
    from django.db.models import Q
    from core.scoping import tenant_id_for
    tid = tenant_id_for(actor) or actor.pk
    return get_user_model().objects.filter(is_staff=True, is_active=True).filter(Q(pk=tid) | Q(tenant_id=tid)).order_by('date_joined', 'id')


@api_view(['GET'])
@_pc([IsAdminUser])
def my_permissions(request):
    """The signed-in login's rights (for greying out the dashboard / guarding windows)."""
    granted = perms_for(request.user)
    return Response({'restricted': granted is not None, 'perms': sorted(granted or []), 'catalog': catalog_json()})


@api_view(['GET'])
@_pc([IsAdminUser])
def permission_users(request):
    if not allowed(request.user, 'user_permissions.view') and not allowed(request.user, 'user_permissions.save'):
        return Response({'detail': 'You do not have permission to view — User Permissions.'}, status=403)
    from .models import TradePermission
    saved = dict(TradePermission.objects.filter(user__in=_shop_users(request.user)).values_list('user_id', 'perms'))
    return Response([{'id': u.pk, 'name': u.username, 'owner': is_owner(u), 'restricted': (u.pk in saved) and not is_owner(u),
                      'perms': ALL_PERMS if (is_owner(u) or u.pk not in saved) else sorted(saved[u.pk] or [])}
                     for u in _shop_users(request.user)])


@api_view(['PUT', 'DELETE'])
@_pc([IsAdminUser])
def permission_user(request, user_id):
    """PUT {perms: [...]}: save this login's rights. DELETE: back to full access."""
    from .models import TradePermission
    act = 'save' if request.method == 'PUT' else 'delete'
    if not allowed(request.user, f'user_permissions.{act}'):
        return Response({'detail': f'You do not have permission to {act} — User Permissions.'}, status=403)
    u = _shop_users(request.user).filter(pk=user_id).first()
    if not u:
        return Response({'detail': 'Login not found.'}, status=404)
    if is_owner(u):
        return Response({'detail': f'{u.username} is the main admin and always has full access.'}, status=400)
    if u.pk == request.user.pk:
        return Response({'detail': 'You cannot change your own permissions.'}, status=400)
    if request.method == 'DELETE':
        TradePermission.objects.filter(user=u).delete()
        return Response({'id': u.pk, 'restricted': False, 'perms': ALL_PERMS})
    valid = set(ALL_PERMS)
    perms = sorted({p for p in (request.data.get('perms') or []) if p in valid})
    TradePermission.objects.update_or_create(user=u, defaults={'perms': perms})
    return Response({'id': u.pk, 'restricted': True, 'perms': perms})
