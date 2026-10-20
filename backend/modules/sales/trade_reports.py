"""Trade 1.0 Data Reports (Reports › Data Reports).

GET trade-reports/catalog/ -> the report types, grouped, with the filters each uses.
GET trade-reports/run/?type=… &date_from &date_to &staff &cheque_status
    &financial_year &invoice &account &areas=1,2,3
 -> {title, subtitle, columns: [{h, a}], rows: [{c: [...], t: None|'g'|'s'}], total: [...]|None}
   (t: 'g' a group heading, 's' a sub-total line).

Accounting reports read the voucher ledger. Sales and sale returns made in this
system do not post vouchers, so the ledger adds them the way the legacy program
booked them: customer Dr / Sales Revenue Cr and Cost of Good Sold Dr /
Inventory Cr (a return the other way round), plus cash paid at the sale (Cash Dr
/ customer Cr) and cash given back on a return. Income and expense accounts are
counted from the start of the financial year (earlier years were forwarded to
Retain Earning), the other accounts from the beginning.
"""
import datetime
import re
from collections import defaultdict
from decimal import Decimal

from django.db.models import Case, DateField, F, Q, When
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.scoping import scope_to_tenant

Z = Decimal('0')
SALES_ACC, COGS_ACC, INV_ACC, CASH_ACC = '41010001', '51010001', '12010001', '12040001'
LEGACY_SALE_NOTE = 'Legacy Trade 2.1 sale (imported history)'

# key, label, group, filters, permission
D, ST, CH, FY, INV, ACC, AR = 'dates', 'staff', 'cheque', 'fy', 'invoice', 'account', 'areas'
REPORTS = [
    ('stock_taking', 'Stock Taking List', 'Stock', [], 'rpt_stock_taking'),
    ('stock_summary', 'Stock Summary (Company-wise)', 'Stock', [], 'rpt_stock_summary'),
    ('stock_pur_rate', 'Stock with Pur.Rate', 'Stock', [], 'rpt_stock_pur_rate'),
    ('stock_no_pur_rate', 'Stock without Pur.Rate', 'Stock', [], 'rpt_stock_no_pur_rate'),
    ('stock_position', 'Stock Position', 'Stock', [D], 'rpt_stock_position'),
    ('purchase_order', 'Purchase Order List', 'Purchase', [D], 'rpt_purchase_order'),
    ('purchase_stock', 'Purchase Stock (Purchase List)', 'Purchase', [D, INV], 'rpt_purchase_stock'),
    ('purchase_return', 'Purchase Return List', 'Purchase', [D], 'rpt_purchase_return'),
    ('sale_invoice', 'Sale Invoice and List', 'Sale', [D, ST, INV, AR], 'rpt_sale_invoice'),
    ('sale_return', 'Sale Return Invoice and List', 'Sale', [D, ST, INV], 'rpt_sale_return'),
    ('delivery_challan', 'Delivery Challan', 'Sale', [INV], 'rpt_delivery_challan'),
    ('sale_date', 'Sale Summary (Date-wise)', 'Sale', [D, ST, AR], 'rpt_sale_date'),
    ('sale_saleman', 'Sale Summary (Saleman)', 'Sale', [D, ST], 'rpt_sale_saleman'),
    ('sale_customer', 'Sale Summary (Customer-wise)', 'Sale', [D, ST, AR], 'rpt_sale_customer'),
    ('sale_company', 'Sale Summary (Company-wise)', 'Sale', [D, ST, AR], 'rpt_sale_company'),
    ('sale_area', 'Sale Summary (Area-wise)', 'Sale', [D, ST, AR], 'rpt_sale_area'),
    ('daily_sale', 'Daily Sale (By Profit / Qty)', 'Sale', [D, ST, AR], 'rpt_daily_sale'),
    ('product_sale', 'Product-wise Sale (By Profit / Qty)', 'Sale', [D, ST, AR], 'rpt_product_sale'),
    ('customer_list', 'Customer List', 'Sale', [AR], 'rpt_customer_list'),
    ('opening_stock', 'Opening Stock Add / Less', 'Stock Adjustments', [D], 'rpt_opening_stock'),
    ('damage', 'Demage / Un-Demage Stock', 'Stock Adjustments', [D], 'rpt_damage'),
    ('stock_access', 'Stock Access / Short', 'Stock Adjustments', [D], 'rpt_stock_access'),
    ('cash_access', 'Cash Access / Short', 'Stock Adjustments', [D], 'rpt_cash_access'),
    ('chart_of_account', 'Chart of Account', 'Accounts', [], 'rpt_chart_of_account'),
    ('journal', 'Journal', 'Accounts', [D, ST], 'rpt_journal'),
    ('ledger', 'Ledger', 'Accounts', [D, ACC], 'rpt_ledger'),
    ('recovery', 'Recovery (Customer Balances)', 'Accounts', [D, AR], 'rpt_account_balances'),
    ('account_balances', 'Account Balances', 'Accounts', [D, FY], 'rpt_account_balances'),
    ('cheque_register', 'Cheque Register', 'Accounts', [D, CH], 'rpt_journal'),
    ('trial_balance', 'Trial Balance', 'Accounts', [D, FY], 'rpt_trial_balance'),
    ('profit_loss', 'Profit and Loss', 'Accounts', [D, FY], 'rpt_profit_loss'),
    ('balance_sheet', 'Balance Sheet', 'Accounts', [D, FY], 'rpt_balance_sheet'),
]
REPORT_PERM = {r[0]: r[4] for r in REPORTS}


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Z


def _f(v):
    return float(round(_d(v), 2))


def _dmy(d):
    return d.strftime('%d-%m-%Y') if d else ''


def _date(v):
    try:
        return datetime.date.fromisoformat(str(v)[:10]) if v else None
    except ValueError:
        return None


class Ctx:
    def __init__(self, request):
        q = request.query_params
        self.user = request.user
        self.q = q
        self.dfrom, self.dto = _date(q.get('date_from')), _date(q.get('date_to'))
        self.staff = q.get('staff') or None
        self.invoice = (q.get('invoice') or '').strip()
        self.account = (q.get('account') or '').strip()
        self.cheque = q.get('cheque_status') or ''
        self.areas = [int(x) for x in (q.get('areas') or '').split(',') if x.strip().isdigit()]
        from modules.company.models import Company, LedgerAccount
        from modules.products.models import Product
        self.company = q.get('company') or None
        co = scope_to_tenant(self.user, Company.objects.filter(pk=self.company), 'tenant').first() if self.company else None
        self.company_name = co.name if co else ''
        accs = scope_to_tenant(self.user, LedgerAccount.objects.all(), 'tenant')
        self.supplier_acc = accs.filter(pk=q.get('supplier'), supplier__isnull=False).first() if q.get('supplier') else None
        self.customer_acc = accs.filter(pk=q.get('customer'), customer__isnull=False).first() if q.get('customer') else None
        self.product = (scope_to_tenant(self.user, Product.objects.filter(pk=q.get('product')), 'tenant').select_related('stock').first()
                        if q.get('product') else None)
        self.fy = None
        from .models import FinancialYear
        fys = scope_to_tenant(self.user, FinancialYear.objects.all(), 'tenant')
        if q.get('financial_year'):
            self.fy = fys.filter(pk=q['financial_year']).first()
        if self.fy is None:
            on = self.dto or datetime.date.today()
            self.fy = fys.filter(from_date__lte=on, to_date__gte=on).first() or fys.filter(status='active').first()
        if q.get('financial_year') and self.fy:   # the year sets the dates when none are given
            self.dfrom = self.dfrom or self.fy.from_date
            self.dto = self.dto or self.fy.to_date

    def scope(self, qs, field='tenant'):
        return scope_to_tenant(self.user, qs, field)

    def period(self):
        if self.dfrom and self.dto:
            return f'From {_dmy(self.dfrom)} To {_dmy(self.dto)}'
        if self.dfrom:
            return f'From {_dmy(self.dfrom)}'
        if self.dto:
            return f'Up to {_dmy(self.dto)}'
        return 'All dates'


def _out(title, ctx, cols, rows, total=None, subtitle=None):
    return {'title': title, 'subtitle': subtitle if subtitle is not None else ctx.period(),
            'columns': [{'h': h, 'a': a} for h, a in cols], 'rows': rows, 'total': total}


def R(*cells, t=None):
    return {'c': list(cells), 't': t}


# ───────────────────────── shared look-ups ─────────────────────────

def _company(p):
    sp = getattr(getattr(p, 'stock', None), 'product', None)
    return sp.company.name if (sp and sp.company_id) else ''


def _orders(ctx):
    from .models import Order
    qs = ctx.scope(Order.objects.exclude(status__in=['CANCELLED', 'REJECTED']).filter(tracking_id__startswith='S'))
    if ctx.dfrom:
        qs = qs.filter(Q(sale_date__gte=ctx.dfrom) | Q(sale_date__isnull=True, created_at__date__gte=ctx.dfrom))
    if ctx.dto:
        qs = qs.filter(Q(sale_date__lte=ctx.dto) | Q(sale_date__isnull=True, created_at__date__lte=ctx.dto))
    if ctx.staff:
        qs = qs.filter(staff_id=ctx.staff)
    if ctx.areas:
        from modules.company.models import LedgerAccount
        cust = LedgerAccount.objects.filter(area_id__in=ctx.areas, customer__isnull=False).values_list('customer_id', flat=True)
        qs = qs.filter(customer_id__in=list(cust))
    return qs


def _cust_accounts(ctx):
    from modules.company.models import LedgerAccount
    return {a.customer_id: a for a in ctx.scope(LedgerAccount.objects.filter(customer__isnull=False)).select_related('area')}


def _odate(o):
    return o.sale_date or o.created_at.date()


def _order_lines(orders):
    """{order_id: (gross, line_disc, cost, qty, bonus)}"""
    from .models import OrderItem
    out = defaultdict(lambda: [Z, Z, Z, 0, 0])
    for oid, q, b, price, disc, cost in OrderItem.objects.filter(order__in=orders).values_list(
            'order_id', 'quantity', 'bonus_quantity', 'price', 'discount', 'cost_price'):
        x = out[oid]
        x[0] += _d(price) * (q or 0); x[1] += _d(disc); x[2] += _d(cost) * ((q or 0) + (b or 0))
        x[3] += q or 0; x[4] += b or 0
    return out


# ───────────────────────── stock ─────────────────────────

def _products(ctx):
    from modules.products.models import Product
    return ctx.scope(Product.objects.exclude(status='ARCHIVED')).select_related('stock__product__company', 'category')


def r_stock_taking(ctx):
    rows = []
    for p in sorted(_products(ctx).filter(total_quantity__gt=0), key=lambda p: (_company(p).lower(), p.product_name.lower())):
        rows.append(R(p.sku or '', p.product_name, _company(p), p.category.name if p.category_id else '', int(p.total_quantity or 0), ''))
    return _out('Stock Taking List', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Company', 'l'), ('Group', 'l'), ('System Qty', 'r'), ('Physical Qty', 'l')],
                rows, ['', f'{len(rows)} products', '', '', sum(r['c'][4] for r in rows), ''], subtitle='Products in stock')


def _batches(ctx):
    from modules.products.models import ProductBatch
    return (ProductBatch.objects.filter(product__in=_products(ctx), quantity__gt=0)
            .select_related('product__stock__product__company'))


def r_stock_summary(ctx):
    agg = defaultdict(lambda: [set(), 0, Z, Z, Z])
    for b in _batches(ctx):
        a = agg[_company(b.product) or '(No company)']
        a[0].add(b.product_id); a[1] += b.quantity
        a[2] += _d(b.cost_price or b.product.cost_price) * b.quantity
        a[3] += _d(b.selling_price or b.product.selling_price) * b.quantity
        a[4] += _d(b.retail_price or b.product.original_price) * b.quantity
    rows = [R(k, len(v[0]), v[1], _f(v[2]), _f(v[3]), _f(v[4])) for k, v in sorted(agg.items(), key=lambda x: x[0].lower())]
    tot = ['Total', sum(r['c'][1] for r in rows), sum(r['c'][2] for r in rows), *[_f(sum(_d(r['c'][i]) for r in rows)) for i in (3, 4, 5)]]
    return _out('Stock Summary', ctx, [('Company', 'l'), ('Products', 'r'), ('Qty', 'r'), ('Purchase Value', 'r'), ('Sale Value (TP)', 'r'), ('Retail Value', 'r')],
                rows, tot, subtitle='Stock in hand, company-wise')


def _batch_report(ctx, with_rate):
    rows, cur, tq, tv = [], None, 0, Z
    for b in sorted(_batches(ctx), key=lambda b: (_company(b.product).lower(), b.product.product_name.lower(), b.expiry_date or datetime.date.max)):
        c = _company(b.product) or '(No company)'
        if c != cur:
            rows.append(R(c, t='g')); cur = c
        p = b.product
        if with_rate:
            rate = _d(b.cost_price or p.cost_price); val = rate * b.quantity; tv += val
            rows.append(R(p.sku or '', p.product_name, _dmy(b.expiry_date), b.quantity, _f(rate), _f(val)))
        else:
            rows.append(R(p.sku or '', p.product_name, _dmy(b.expiry_date), b.quantity,
                          _f(b.selling_price or p.selling_price), _f(b.retail_price or p.original_price)))
        tq += b.quantity
    if with_rate:
        return _out('Stock with Pur.Rate', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Expiry', 'l'), ('Qty', 'r'), ('Pur.Rate', 'r'), ('Value', 'r')],
                    rows, ['Total', '', '', tq, '', _f(tv)], subtitle='Stock in hand by batch')
    return _out('Stock without Pur.Rate', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Expiry', 'l'), ('Qty', 'r'), ('Sale Rate', 'r'), ('Retail', 'r')],
                rows, ['Total', '', '', tq, '', ''], subtitle='Stock in hand by batch')


def r_stock_pur_rate(ctx):
    return _batch_report(ctx, True)


def r_stock_no_pur_rate(ctx):
    return _batch_report(ctx, False)


def r_stock_position(ctx):
    """Per product: purchased / purchase-returned / sold / sale-returned / adjusted in the period, and stock now."""
    from .models import PurchaseOrder, PurchaseOrderItem, OrderItem, TradeSaleReturn, TradeSaleReturnItem, DamageStock, DamageStockItem
    mv = defaultdict(lambda: [0, 0, 0, 0, 0])
    pi = PurchaseOrderItem.objects.filter(purchase_order__in=ctx.scope(PurchaseOrder.objects.filter(status__in=['RECEIVED', 'RETURNED'])))
    if ctx.dfrom:
        pi = pi.filter(purchase_order__order_date__date__gte=ctx.dfrom)
    if ctx.dto:
        pi = pi.filter(purchase_order__order_date__date__lte=ctx.dto)
    for sp_id, st, q, b in pi.values_list('product_id', 'purchase_order__status', 'quantity', 'bonus_quantity'):
        mv[('sp', sp_id)][0 if st == 'RECEIVED' else 1] += (q or 0) + (b or 0)
    for pid, q, b in OrderItem.objects.filter(order__in=_orders(ctx)).values_list('product_id', 'quantity', 'bonus_quantity'):
        mv[('p', pid)][2] += (q or 0) + (b or 0)
    rq = ctx.scope(TradeSaleReturn.objects.all())
    if ctx.dfrom:
        rq = rq.filter(return_date__gte=ctx.dfrom)
    if ctx.dto:
        rq = rq.filter(return_date__lte=ctx.dto)
    for pid, q, b in TradeSaleReturnItem.objects.filter(sale_return__in=rq).values_list('product_id', 'quantity', 'bonus_quantity'):
        mv[('p', pid)][3] += (q or 0) + (b or 0)
    dq = DamageStockItem.objects.filter(damage__in=ctx.scope(DamageStock.objects.all()))
    if ctx.dfrom:
        dq = dq.filter(damage__date__gte=ctx.dfrom)
    if ctx.dto:
        dq = dq.filter(damage__date__lte=ctx.dto)
    for pid, kind, q in dq.values_list('product_id', 'damage__kind', 'qty'):
        mv[('p', pid)][4] += q if kind in ('less', 'oadd', 'sexc') else -q
    rows = []
    for p in sorted(_products(ctx), key=lambda p: (_company(p).lower(), p.product_name.lower())):
        a = mv.get(('p', p.id), [0] * 5); b = mv.get(('sp', p.stock.product_id), [0] * 5) if p.stock_id and p.stock.product_id else [0] * 5
        pur, pret, sold, sret, adj = b[0], b[1], a[2], a[3], a[4]
        if not any((pur, pret, sold, sret, adj)) and not p.total_quantity:
            continue
        rows.append(R(p.sku or '', p.product_name, _company(p), pur, pret, sold, sret, adj, int(p.total_quantity or 0)))
    tot = ['Total', f'{len(rows)} products', ''] + [sum(r['c'][i] for r in rows) for i in range(3, 9)]
    return _out('Stock Position', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Company', 'l'), ('Purchased', 'r'), ('Pur.Return', 'r'),
                                        ('Sold', 'r'), ('Sale Return', 'r'), ('Adjust (±)', 'r'), ('Stock Now', 'r')], rows, tot)


# ───────────────────────── purchase ─────────────────────────

def _pos(ctx, prefix, status):
    from .models import PurchaseOrder
    qs = ctx.scope(PurchaseOrder.objects.filter(purchase_number__startswith=prefix, status=status)).select_related('supplier__ledger_account')
    if ctx.dfrom:
        qs = qs.filter(order_date__date__gte=ctx.dfrom)
    if ctx.dto:
        qs = qs.filter(order_date__date__lte=ctx.dto)
    return qs.order_by('order_date', 'purchase_number')


def _sup(po):
    a = getattr(po.supplier, 'ledger_account', None) if po.supplier_id else None
    return (a.name if a else '') or (po.supplier.name if po.supplier_id else '')


def _po_lines_report(ctx, po, title):
    rows, tot = [], Z
    for i, it in enumerate(po.items.select_related('product').order_by('id'), 1):
        sub = _d(it.price) * (it.quantity or 0); tot += sub
        rows.append(R(i, it.product.sku if it.product else '', it.product.name if it.product else '', it.quantity, it.bonus_quantity or '',
                      _dmy(it.expiry_date), _f(it.price), _f(sub)))
    return _out(title, ctx, [('S.No', 'r'), ('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Expiry', 'l'), ('Pur.Rate', 'r'), ('Sub Total', 'r')],
                rows, ['Total', '', '', sum(r['c'][3] for r in rows), '', '', '', _f(tot)],
                subtitle=f'{po.purchase_number} · {_dmy(po.order_date.date() if po.order_date else None)} · {_sup(po)}')


def r_purchase_order(ctx):
    rows = []
    for po in _pos(ctx, 'K', 'PENDING').prefetch_related('items'):
        amt = sum((_d(i.price) * (i.quantity or 0) for i in po.items.all()), Z)
        rows.append(R(po.purchase_number, _dmy(po.order_date.date()), _sup(po), po.items.count(), _f(amt)))
    return _out('Purchase Order List', ctx, [('Order No', 'l'), ('Date', 'l'), ('Supplier', 'l'), ('Items', 'r'), ('Amount', 'r')],
                rows, ['Total', f'{len(rows)} orders', '', '', _f(sum(_d(r['c'][4]) for r in rows))])


def r_purchase_stock(ctx):
    if ctx.invoice:
        from .models import PurchaseOrder
        po = ctx.scope(PurchaseOrder.objects.filter(purchase_number__iexact=ctx.invoice)).first()
        if po:
            return _po_lines_report(ctx, po, 'Purchase Invoice')
    rows = []
    for po in _pos(ctx, 'P', 'RECEIVED'):
        ch = _d(po.shipping_cost) + _d(po.fare_amount) + _d(po.goods_amount)
        rows.append(R(po.purchase_number, _dmy(po.order_date.date()), po.reference_number or '', _sup(po),
                      _f(po.extra_discount), _f(ch), _f(po.tax_amount), _f(po.total_amount), _f(po.paid_amount)))
    tot = ['Total', f'{len(rows)} purchases', '', ''] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in range(4, 9)]
    return _out('Purchase Stock', ctx, [('Pur. Inv', 'l'), ('Date', 'l'), ('Bill No', 'l'), ('Supplier', 'l'), ('Extra Disc', 'r'),
                                        ('Freight/Fare/Goods', 'r'), ('Tax', 'r'), ('Net Amount', 'r'), ('Paid', 'r')], rows, tot)


def r_purchase_return(ctx):
    rows = [R(po.purchase_number, _dmy(po.order_date.date()), _sup(po), _f(po.extra_discount), _f(po.total_amount), _f(po.paid_amount))
            for po in _pos(ctx, 'R', 'RETURNED')]
    tot = ['Total', f'{len(rows)} returns', ''] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in range(3, 6)]
    return _out('Purchase Return List', ctx, [('Ret. Inv', 'l'), ('Date', 'l'), ('Supplier', 'l'), ('Less Amount', 'r'), ('Net Amount', 'r'), ('Cash Received', 'r')], rows, tot)


# ───────────────────────── sale ─────────────────────────

def _invoice(ctx):
    from .models import Order
    return ctx.scope(Order.objects.filter(tracking_id__iexact=ctx.invoice)).select_related('customer', 'staff').first()


def _cust_name(o, accs):
    a = accs.get(o.customer_id)
    return (a.acc_id if a else ''), (a.name if a else (o.customer_name or 'Cash Customer')), (a.area.name if a and a.area_id else '')


def r_sale_invoice(ctx):
    accs = _cust_accounts(ctx)
    if ctx.invoice:
        o = _invoice(ctx)
        if not o:
            return _out('Sale Invoice', ctx, [('', 'l')], [R(f'Invoice {ctx.invoice} not found.')])
        rows = []
        for i, it in enumerate(o.items.select_related('product').order_by('id'), 1):
            gross = _d(it.price) * (it.quantity or 0)
            rows.append(R(i, it.product.sku if it.product else '', it.product.product_name if it.product else '', it.quantity, it.bonus_quantity or '',
                          _f(it.price), _f(it.discount), _f(gross - _d(it.discount))))
        code, name, area = _cust_name(o, accs)
        return _out('Sale Invoice', ctx, [('S.No', 'r'), ('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('TP', 'r'), ('Disc', 'r'), ('Net', 'r')],
                    rows, ['Total', '', '', sum(r['c'][3] for r in rows), '', '', _f(sum(_d(r['c'][6]) for r in rows)), _f(o.total_amount)],
                    subtitle=f'{o.tracking_id} · {_dmy(_odate(o))} · {code} {name}{" · " + area if area else ""}')
    orders = sorted(_orders(ctx).select_related('staff'), key=lambda o: (_odate(o), o.tracking_id))
    ls = _order_lines(orders)
    rows = []
    for o in orders:
        code, name, area = _cust_name(o, accs)
        g = ls[o.id]
        paid = o.paid_at_sale if o.paid_at_sale is not None else o.amount_paid
        rows.append(R(o.tracking_id, _dmy(_odate(o)), code, name, area, o.staff.name if o.staff_id else '', _f(g[0]),
                      _f(g[1] + _d(o.discount)), _f(o.total_amount), _f(paid)))
    tot = ['Total', f'{len(rows)} invoices', '', '', '', ''] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in range(6, 10)]
    return _out('Sale Invoice List', ctx, [('Inv. No', 'l'), ('Date', 'l'), ('Acc ID', 'l'), ('Customer', 'l'), ('Area', 'l'), ('Saleman', 'l'),
                                           ('Gross', 'r'), ('Disc', 'r'), ('Net', 'r'), ('Paid', 'r')], rows, tot)


def _returns(ctx):
    from .models import TradeSaleReturn
    qs = ctx.scope(TradeSaleReturn.objects.all()).select_related('staff', 'customer')
    if ctx.dfrom:
        qs = qs.filter(return_date__gte=ctx.dfrom)
    if ctx.dto:
        qs = qs.filter(return_date__lte=ctx.dto)
    if ctx.staff:
        qs = qs.filter(staff_id=ctx.staff)
    return qs


def r_sale_return(ctx):
    accs = _cust_accounts(ctx)
    from .models import TradeSaleReturn
    if ctx.invoice:
        r = ctx.scope(TradeSaleReturn.objects.filter(return_no__iexact=ctx.invoice)).first()
        if r:
            rows = [R(i, it.product.sku if it.product else '', it.product.product_name if it.product else '', it.quantity, it.bonus_quantity or '',
                      _f(it.price), _f(it.discount), _f(_d(it.price) * (it.quantity or 0) - _d(it.discount)))
                    for i, it in enumerate(r.items.select_related('product').order_by('id'), 1)]
            return _out('Sale Return Invoice', ctx, [('S.No', 'r'), ('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('TP', 'r'), ('Disc', 'r'), ('Net', 'r')],
                        rows, ['Total', '', '', sum(x['c'][3] for x in rows), '', '', '', _f(r.net_amount - r.less_amount)],
                        subtitle=f'{r.return_no} · {_dmy(r.return_date)} · {r.customer_name or ""}')
    rows = []
    for r in _returns(ctx).order_by('return_date', 'created_at'):
        a = accs.get(r.customer_id)
        rows.append(R(r.return_no, _dmy(r.return_date), a.acc_id if a else '', (a.name if a else r.customer_name) or '',
                      r.staff.name if r.staff_id else '', _f(r.gross), _f(r.net_amount - r.less_amount), _f(r.cash_returned)))
    tot = ['Total', f'{len(rows)} returns', '', '', ''] + [_f(sum(_d(x['c'][i]) for x in rows)) for i in range(5, 8)]
    return _out('Sale Return List', ctx, [('Ret. No', 'l'), ('Date', 'l'), ('Acc ID', 'l'), ('Customer', 'l'), ('Saleman', 'l'),
                                          ('Gross', 'r'), ('Net', 'r'), ('Cash Returned', 'r')], rows, tot)


def r_delivery_challan(ctx):
    o = _invoice(ctx) if ctx.invoice else None
    if not o:
        return _out('Delivery Challan', ctx, [('', 'l')], [R('Enter the Invoice No.')], subtitle='')
    accs = _cust_accounts(ctx)
    code, name, area = _cust_name(o, accs)
    rows = []
    for i, it in enumerate(o.items.select_related('product').order_by('id'), 1):
        p = it.product
        ctn = p.carton_qty if p else 0
        rows.append(R(i, p.sku if p else '', p.product_name if p else '', (f'{it.quantity // ctn} + {it.quantity % ctn}' if ctn and it.quantity % ctn else (it.quantity // ctn if ctn else '')),
                      it.quantity, it.bonus_quantity or '', ''))
    return _out('Delivery Challan', ctx, [('S.No', 'r'), ('PID', 'l'), ('Product Name', 'l'), ('Cartons', 'r'), ('Qty', 'r'), ('Bonus', 'r'), ('Received', 'l')],
                rows, ['Total', '', '', '', sum(r['c'][4] for r in rows), sum(r['c'][5] or 0 for r in rows), ''],
                subtitle=f'{o.tracking_id} · {_dmy(_odate(o))} · {code} {name}{" · " + area if area else ""}')


def _sale_group(ctx, title, head, keyfn, sort=None):
    orders = list(_orders(ctx).select_related('staff'))
    ls = _order_lines(orders)
    accs = _cust_accounts(ctx)
    agg = defaultdict(lambda: [0, Z, Z, Z])
    for o in orders:
        k = keyfn(o, accs)
        g = ls[o.id]; a = agg[k]
        a[0] += 1; a[1] += g[0]; a[2] += g[1] + _d(o.discount); a[3] += _d(o.total_amount)
    items = sorted(agg.items(), key=sort or (lambda x: str(x[0]).lower()))
    rows = [R(*(k if isinstance(k, tuple) else (k,)), v[0], _f(v[1]), _f(v[2]), _f(v[3])) for k, v in items]
    n = len(head)
    tot = ['Total'] + [''] * (n - 1) + [sum(r['c'][n] for r in rows)] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in range(n + 1, n + 4)]
    return _out(title, ctx, [(h, 'l') for h in head] + [('Invoices', 'r'), ('Gross', 'r'), ('Disc', 'r'), ('Net', 'r')], rows, tot)


def r_sale_date(ctx):
    return _sale_group(ctx, 'Sale Summary (Date-wise)', ['Date'], lambda o, a: _dmy(_odate(o)),
                       sort=lambda x: datetime.datetime.strptime(x[0], '%d-%m-%Y'))


def r_sale_saleman(ctx):
    return _sale_group(ctx, 'Sale Summary (Saleman)', ['Saleman'], lambda o, a: o.staff.name if o.staff_id else '(none)')


def r_sale_customer(ctx):
    return _sale_group(ctx, 'Sale Summary (Customer-wise)', ['Acc ID', 'Customer'], lambda o, a: _cust_name(o, a)[:2])


def r_sale_area(ctx):
    return _sale_group(ctx, 'Sale Summary (Area-wise)', ['Area'], lambda o, a: _cust_name(o, a)[2] or '(no area)')


def _items(ctx):
    from .models import OrderItem
    return (OrderItem.objects.filter(order__in=_orders(ctx))
            .select_related('order', 'product__stock__product__company'))


def r_sale_company(ctx):
    agg = defaultdict(lambda: [0, 0, Z, Z, Z])
    for it in _items(ctx):
        a = agg[_company(it.product) if it.product else '(deleted)']
        gross = _d(it.price) * (it.quantity or 0)
        a[0] += it.quantity or 0; a[1] += it.bonus_quantity or 0; a[2] += gross; a[3] += _d(it.discount); a[4] += gross - _d(it.discount)
    rows = [R(k or '(No company)', v[0], v[1], _f(v[2]), _f(v[3]), _f(v[4])) for k, v in sorted(agg.items(), key=lambda x: x[0].lower())]
    tot = ['Total', sum(r['c'][1] for r in rows), sum(r['c'][2] for r in rows)] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in (3, 4, 5)]
    return _out('Sale Summary (Company-wise)', ctx, [('Company', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Gross', 'r'), ('Disc', 'r'), ('Net', 'r')], rows, tot)


def _profit_rows(agg, keys):
    rows = []
    for k in keys:
        q, b, net, cost = agg[k]
        pr = net - cost
        rows.append(R(*(k if isinstance(k, tuple) else (k,)), q, b, _f(net), _f(cost), _f(pr), round(float(pr / net * 100), 1) if net else 0))
    return rows


def r_daily_sale(ctx):
    agg = defaultdict(lambda: [0, 0, Z, Z])
    for it in _items(ctx):
        a = agg[_odate(it.order)]
        a[0] += it.quantity or 0; a[1] += it.bonus_quantity or 0
        a[2] += _d(it.price) * (it.quantity or 0) - _d(it.discount); a[3] += _d(it.cost_price) * ((it.quantity or 0) + (it.bonus_quantity or 0))
    keys = sorted(agg)
    rows = _profit_rows(agg, keys)
    for r, k in zip(rows, keys):
        r['c'][0] = _dmy(k)
    net = sum(_d(r['c'][3]) for r in rows); pr = sum(_d(r['c'][5]) for r in rows)
    tot = ['Total', sum(r['c'][1] for r in rows), sum(r['c'][2] for r in rows), _f(net), _f(sum(_d(r['c'][4]) for r in rows)), _f(pr),
           round(float(pr / net * 100), 1) if net else 0]
    return _out('Daily Sale (By Profit / Qty)', ctx, [('Date', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Net Sale', 'r'), ('Cost', 'r'), ('Profit', 'r'), ('Profit %', 'r')], rows, tot)


def r_product_sale(ctx):
    agg = defaultdict(lambda: [0, 0, Z, Z])
    for it in _items(ctx):
        p = it.product
        a = agg[(p.sku if p else '', p.product_name if p else '(deleted)', _company(p) if p else '')]
        a[0] += it.quantity or 0; a[1] += it.bonus_quantity or 0
        a[2] += _d(it.price) * (it.quantity or 0) - _d(it.discount); a[3] += _d(it.cost_price) * ((it.quantity or 0) + (it.bonus_quantity or 0))
    keys = sorted(agg, key=lambda k: (k[2].lower(), k[1].lower()))
    rows = _profit_rows(agg, keys)
    net = sum(_d(r['c'][5]) for r in rows); pr = sum(_d(r['c'][7]) for r in rows)
    tot = ['Total', f'{len(rows)} products', '', sum(r['c'][3] for r in rows), sum(r['c'][4] for r in rows), _f(net),
           _f(sum(_d(r['c'][6]) for r in rows)), _f(pr), round(float(pr / net * 100), 1) if net else 0]
    return _out('Product-wise Sale (By Profit / Qty)', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Company', 'l'), ('Qty', 'r'), ('Bonus', 'r'),
                                                             ('Net Sale', 'r'), ('Cost', 'r'), ('Profit', 'r'), ('Profit %', 'r')], rows, tot)


def r_customer_list(ctx):
    from modules.company.models import LedgerAccount
    qs = ctx.scope(LedgerAccount.objects.filter(group__code=1202)).select_related('area')
    if ctx.areas:
        qs = qs.filter(area_id__in=ctx.areas)
    rows, cur = [], None
    for a in sorted(qs, key=lambda a: ((a.area.name if a.area_id else '').lower(), a.name.lower())):
        ar = a.area.name if a.area_id else '(no area)'
        if ar != cur:
            rows.append(R(ar, t='g')); cur = ar
        rows.append(R(a.acc_id, a.name, a.contact_person or '', a.cell_no or '', a.address or ''))
    n = sum(1 for r in rows if not r['t'])
    return _out('Customer List', ctx, [('Acc ID', 'l'), ('Customer', 'l'), ('Contact Person', 'l'), ('Cell No', 'l'), ('Address', 'l')],
                rows, ['Total', f'{n} customers', '', '', ''], subtitle='Selected areas' if ctx.areas else 'All areas')


# ───────────────────────── stock adjustments ─────────────────────────

def _adj(ctx, title, kinds):
    from .models import DamageStock
    qs = ctx.scope(DamageStock.objects.filter(kind__in=list(kinds))).select_related('staff', 'voucher').prefetch_related('items')
    if ctx.dfrom:
        qs = qs.filter(date__gte=ctx.dfrom)
    if ctx.dto:
        qs = qs.filter(date__lte=ctx.dto)
    rows = [R(d.number, _dmy(d.date), kinds[d.kind], d.items.count(), sum(i.qty for i in d.items.all()), d.staff.name if d.staff_id else '',
              d.voucher.voucher_no if d.voucher_id else '', _f(d.total)) for d in qs.order_by('date', 'number')]
    tot = ['Total', f'{len(rows)} invoices', '', sum(r['c'][3] for r in rows), sum(r['c'][4] for r in rows), '', '', _f(sum(_d(r['c'][7]) for r in rows))]
    return _out(title, ctx, [('Inv. No', 'l'), ('Date', 'l'), ('Type', 'l'), ('Items', 'r'), ('Qty', 'r'), ('Staff', 'l'), ('Voucher', 'l'), ('Amount', 'r')], rows, tot)


def r_opening_stock(ctx):
    return _adj(ctx, 'Opening Stock Add / Less', {'oadd': 'Add', 'oles': 'Less'})


def r_damage(ctx):
    return _adj(ctx, 'Demage / Un-Demage Stock', {'add': 'Demage', 'less': 'Un-Demage'})


def r_stock_access(ctx):
    return _adj(ctx, 'Stock Access / Short', {'sexc': 'Access', 'ssho': 'Short'})


def r_cash_access(ctx):
    from .models import Voucher
    qs = ctx.scope(Voucher.objects.filter(vtype__in=['cash_access', 'cash_short'])).select_related('staff')
    if ctx.dfrom:
        qs = qs.filter(date__gte=ctx.dfrom)
    if ctx.dto:
        qs = qs.filter(date__lte=ctx.dto)
    rows = [R(v.voucher_no, _dmy(v.date), 'Access' if v.vtype == 'cash_access' else 'Short', v.staff.name if v.staff_id else '',
              _f(v.total) if v.vtype == 'cash_access' else '', _f(v.total) if v.vtype == 'cash_short' else '') for v in qs.order_by('date', 'id')]
    tot = ['Total', f'{len(rows)} vouchers', '', '', _f(sum(_d(r['c'][4] or 0) for r in rows)), _f(sum(_d(r['c'][5] or 0) for r in rows))]
    return _out('Cash Access / Short', ctx, [('Voucher', 'l'), ('Date', 'l'), ('Type', 'l'), ('Staff', 'l'), ('Access', 'r'), ('Short', 'r')], rows, tot)


# ───────────────────────── accounts ─────────────────────────

def _vline_date():
    """The day a voucher line counts: a cashed cheque from the day it was cashed, else the voucher date."""
    return Case(When(voucher__chq_status='cashed', voucher__chq_cash_date__isnull=False, then=F('voucher__chq_cash_date')),
                default=F('voucher__date'), output_field=DateField())


def _ledger(ctx, upto=None, since=None, pending=False):
    """Every entry (date, voucher_no, account, detail, debit, credit, staff_id) — vouchers plus the
    sales / returns made in this system (they post no voucher). Cheques not cashed yet are left
    out; `pending=True` returns only those."""
    from modules.company.models import LedgerAccount
    from .models import VoucherLine, Order, OrderItem, TradeSaleReturn, TradeSaleReturnItem
    accs = {a.acc_id: a for a in ctx.scope(LedgerAccount.objects.all()).select_related('group')}
    out = []
    lines = ctx.scope(VoucherLine.objects.all(), 'voucher__tenant').annotate(on=_vline_date())
    lines = lines.filter(voucher__chq_status='pending') if pending else lines.exclude(voucher__chq_status='pending')
    if upto:
        lines = lines.filter(on__lte=upto)
    if since:
        lines = lines.filter(on__gte=since)
    by_pk = {a.pk: a for a in accs.values()}
    for d, no, vdet, st, aid, det, dr, cr in lines.order_by('on', 'voucher_id', 'line').values_list(
            'on', 'voucher__voucher_no', 'voucher__detail', 'voucher__staff_id', 'account_id', 'detail', 'debit', 'credit'):
        a = by_pk.get(aid)
        if a is not None:
            out.append((d, no, a, det or vdet, _d(dr), _d(cr), st))
    if pending:
        return out
    # Bills already booked by a (legacy) voucher.
    from .models import Voucher
    booked = set()
    for det in ctx.scope(Voucher.objects.filter(vtype__in=['sale', 'sale_return'])).values_list('detail', flat=True):
        m = re.search(r'([ST]\d{8})', det or '')
        if m:
            booked.add(m.group(1))
    by_cust = {a.customer_id: a for a in accs.values() if a.customer_id}
    sales, cogs, inv, cash = accs.get(SALES_ACC), accs.get(COGS_ACC), accs.get(INV_ACC), accs.get(CASH_ACC)
    if not (sales and cogs and inv and cash):
        return out
    orders = ctx.scope(Order.objects.exclude(status__in=['CANCELLED', 'REJECTED']).filter(tracking_id__startswith='S')).exclude(tracking_id__in=booked)
    orders = [o for o in orders if (not upto or _odate(o) <= upto) and (not since or _odate(o) >= since)]
    cost = defaultdict(lambda: Z)
    for oid, c, q, b in OrderItem.objects.filter(order__in=orders).values_list('order_id', 'cost_price', 'quantity', 'bonus_quantity'):
        cost[oid] += _d(c) * ((q or 0) + (b or 0))
    for o in orders:
        cust = by_cust.get(o.customer_id)
        if not cust:
            continue
        d, no, net = _odate(o), o.tracking_id, _d(o.total_amount)
        det = f'Sale of Bill No  {no}'
        out += [(d, no, cust, det, net, Z, o.staff_id), (d, no, sales, det, Z, net, o.staff_id),
                (d, no, cogs, det, cost[o.id], Z, o.staff_id), (d, no, inv, det, Z, cost[o.id], o.staff_id)]
        paid = _d(o.paid_at_sale if o.paid_at_sale is not None else 0)
        if paid > 0:
            out += [(d, no, cash, f'Cash at sale {no}', paid, Z, o.staff_id), (d, no, cust, f'Cash at sale {no}', Z, paid, o.staff_id)]
    rets = [r for r in ctx.scope(TradeSaleReturn.objects.exclude(return_no__in=booked))
            if (not upto or r.return_date <= upto) and (not since or r.return_date >= since)]
    rcost = defaultdict(lambda: Z)
    for rid, c, q, b in TradeSaleReturnItem.objects.filter(sale_return__in=rets).values_list('sale_return_id', 'cost_price', 'quantity', 'bonus_quantity'):
        rcost[rid] += _d(c) * ((q or 0) + (b or 0))
    for r in rets:
        cust = by_cust.get(r.customer_id)
        if not cust:
            continue
        d, no, net = r.return_date, r.return_no, _d(r.net_amount) - _d(r.less_amount)
        det = f'Sale Ret. of Bill No  {no}'
        out += [(d, no, sales, det, net, Z, r.staff_id), (d, no, cust, det, Z, net, r.staff_id),
                (d, no, inv, det, rcost[r.id], Z, r.staff_id), (d, no, cogs, det, Z, rcost[r.id], r.staff_id)]
        if _d(r.cash_returned) > 0:
            out += [(d, no, cust, f'Cash returned {no}', _d(r.cash_returned), Z, r.staff_id), (d, no, cash, f'Cash returned {no}', Z, _d(r.cash_returned), r.staff_id)]
    out.sort(key=lambda e: (e[0], e[1]))
    return out


def _is_pl(acc):
    g = str(acc.group.code if acc.group_id else acc.acc_id)
    return g[:1] in ('4', '5')


def _balances(ctx):
    """{account: (debit, credit)} up to the end date; income / expense from the financial year start."""
    upto = ctx.dto or datetime.date.today()
    fy_start = ctx.fy.from_date if ctx.fy else None
    bal = defaultdict(lambda: [Z, Z])
    for d, no, acc, det, dr, cr, st in _ledger(ctx, upto=upto):
        if _is_pl(acc) and fy_start and d < fy_start:
            continue
        if _is_pl(acc) and ctx.dfrom and d < ctx.dfrom:
            continue
        bal[acc][0] += dr; bal[acc][1] += cr
    return bal


def r_chart_of_account(ctx):
    from modules.company.models import AccountGroup, LedgerAccount
    groups = {g.id: g for g in ctx.scope(AccountGroup.objects.all())}
    rows, cur = [], None
    for a in ctx.scope(LedgerAccount.objects.all()).select_related('group', 'area').order_by('acc_id'):
        g3 = a.group
        g2 = groups.get(g3.parent_id) if g3 else None
        g1 = groups.get(g2.parent_id) if g2 else None
        head = f'{g1.name if g1 else ""} › {g2.name if g2 else ""} › {g3.code} {g3.name}' if g3 else ''
        if head != cur:
            rows.append(R(head, t='g')); cur = head
        rows.append(R(a.acc_id, a.name, a.area.name if a.area_id else '', a.cell_no or '', a.status or ''))
    return _out('Chart of Account', ctx, [('Acc ID', 'l'), ('Account Name', 'l'), ('Area', 'l'), ('Cell No', 'l'), ('Status', 'l')], rows,
                ['Total', f'{sum(1 for r in rows if not r["t"])} accounts', '', '', ''], subtitle='')


def r_journal(ctx):
    rows, td, tc, cur = [], Z, Z, None
    for d, no, acc, det, dr, cr, st in _ledger(ctx, upto=ctx.dto, since=ctx.dfrom):
        if ctx.staff and str(st or '') != str(ctx.staff):
            continue
        if len(rows) > 6000:
            break
        if no != cur:
            rows.append(R(f'{no}  ·  {_dmy(d)}', t='g')); cur = no
        rows.append(R(_dmy(d), no, acc.acc_id, acc.name, det, _f(dr) if dr else '', _f(cr) if cr else ''))
        td += dr; tc += cr
    return _out('Journal', ctx, [('Date', 'l'), ('Voucher', 'l'), ('Acc ID', 'l'), ('Account', 'l'), ('Detail', 'l'), ('Debit', 'r'), ('Credit', 'r')],
                rows, ['Total', '', '', '', '', _f(td), _f(tc)])


def r_ledger(ctx):
    from modules.company.models import LedgerAccount
    acc = ctx.scope(LedgerAccount.objects.filter(acc_id=ctx.account)).first() if ctx.account else None
    if not acc:
        return _out('Ledger', ctx, [('', 'l')], [R('Find the account (Acc ID) first.')], subtitle='')
    opening, rows = Z, []
    entries = [e + (False,) for e in _ledger(ctx, upto=ctx.dto) if e[2].pk == acc.pk]
    # Cheques received but not cashed: shown in red on the day received, not in the balance.
    entries += [e + (True,) for e in _ledger(ctx, upto=ctx.dto, since=ctx.dfrom, pending=True) if e[2].pk == acc.pk]
    entries.sort(key=lambda e: (e[0], e[1]))
    bal = Z
    for d, no, a, det, dr, cr, st, pend in entries:
        if ctx.dfrom and d < ctx.dfrom:
            opening += dr - cr
            continue
        if not rows:
            bal = opening
            rows.append(R('', '', 'Opening Balance', '', '', _f(abs(opening)) if opening else '0', 'Dr' if opening >= 0 else 'Cr'))
        if pend:
            rows.append(R(_dmy(d), no, f'{det}  (cheque pending - not in balance)', _f(dr) if dr else '', _f(cr) if cr else '', 'Pending', '', t='p'))
            continue
        bal += dr - cr
        rows.append(R(_dmy(d), no, det, _f(dr) if dr else '', _f(cr) if cr else '', _f(abs(bal)), 'Dr' if bal >= 0 else 'Cr'))
    if not rows:
        rows.append(R('', '', 'Opening Balance', '', '', _f(abs(opening)), 'Dr' if opening >= 0 else 'Cr')); bal = opening
    td = sum(_d(r['c'][3] or 0) for r in rows if r['t'] != 'p'); tc = sum(_d(r['c'][4] or 0) for r in rows if r['t'] != 'p')
    return _out(f'Ledger — {acc.acc_id} {acc.name}', ctx, [('Date', 'l'), ('Voucher', 'l'), ('Detail', 'l'), ('Debit', 'r'), ('Credit', 'r'), ('Balance', 'r'), ('', 'l')],
                rows, ['Total', '', '', _f(td), _f(tc), _f(abs(bal)), 'Dr' if bal >= 0 else 'Cr'])


def r_recovery(ctx):
    """Customers' balances (what each owes), area-wise, from the whole ledger — the legacy
    history (sales, receipts, opening balances) and the sales made since."""
    from modules.company.models import LedgerAccount
    qs = ctx.scope(LedgerAccount.objects.filter(group__code=1202)).select_related('area')
    if ctx.areas:
        qs = qs.filter(area_id__in=ctx.areas)
    bal = defaultdict(lambda: Z)
    for d, no, acc, det, dr, cr, st in _ledger(ctx, upto=ctx.dto):
        if acc.group_id and acc.group.code == 1202:
            bal[acc.pk] += dr - cr
    rows, cur, total = [], None, Z
    for a in sorted(qs, key=lambda a: ((a.area.name if a.area_id else '').lower(), a.name.lower())):
        b = bal.get(a.pk, Z)
        if abs(b) < Decimal('0.5'):
            continue
        ar = a.area.name if a.area_id else '(no area)'
        if ar != cur:
            rows.append(R(ar, t='g')); cur = ar
        rows.append(R(a.acc_id, a.name, a.cell_no or '', _f(b))); total += b
    return _out('Recovery (Customer Balances)', ctx, [('Acc ID', 'l'), ('Customer', 'l'), ('Cell No', 'l'), ('Balance', 'r')], rows,
                ['Total', f'{sum(1 for r in rows if not r["t"])} customers', '', _f(total)], subtitle=f'Balances as on {_dmy(ctx.dto or datetime.date.today())}' + (' · selected areas' if ctx.areas else ''))


def r_account_balances(ctx):
    bal = _balances(ctx)
    rows, cur, td, tc = [], None, Z, Z
    for acc in sorted(bal, key=lambda a: a.acc_id):
        dr, cr = bal[acc]
        net = dr - cr
        if abs(net) < Decimal('0.005'):
            continue
        g = f'{acc.group.code} {acc.group.name}' if acc.group_id else ''
        if g != cur:
            rows.append(R(g, t='g')); cur = g
        rows.append(R(acc.acc_id, acc.name, _f(net) if net > 0 else '', _f(-net) if net < 0 else ''))
        td += max(net, Z); tc += max(-net, Z)
    return _out('Account Balances', ctx, [('Acc ID', 'l'), ('Account', 'l'), ('Debit', 'r'), ('Credit', 'r')], rows, ['Total', '', _f(td), _f(tc)],
                subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def r_trial_balance(ctx):
    bal = _balances(ctx)
    rows, td, tc = [], Z, Z
    for acc in sorted(bal, key=lambda a: a.acc_id):
        dr, cr = bal[acc]
        net = dr - cr
        if abs(net) < Decimal('0.005'):
            continue
        rows.append(R(acc.acc_id, acc.name, _f(net) if net > 0 else '', _f(-net) if net < 0 else ''))
        td += max(net, Z); tc += max(-net, Z)
    diff = td - tc
    if abs(diff) >= Decimal('0.01'):
        rows.append(R('', 'Difference', _f(-diff) if diff < 0 else '', _f(diff) if diff > 0 else '', t='s'))
    return _out('Trial Balance', ctx, [('Acc ID', 'l'), ('Account', 'l'), ('Debit', 'r'), ('Credit', 'r')], rows, ['Total', '', _f(td), _f(tc)],
                subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def _pl(ctx):
    bal = _balances(ctx)
    inc = sorted(((a, bal[a][1] - bal[a][0]) for a in bal if str(a.group.code if a.group_id else '')[:1] == '4'), key=lambda x: x[0].acc_id)
    exp = sorted(((a, bal[a][0] - bal[a][1]) for a in bal if str(a.group.code if a.group_id else '')[:1] == '5'), key=lambda x: x[0].acc_id)
    return bal, [x for x in inc if abs(x[1]) >= Decimal('0.005')], [x for x in exp if abs(x[1]) >= Decimal('0.005')]


def r_profit_loss(ctx):
    _, inc, exp = _pl(ctx)
    rows = [R('Income', t='g')] + [R(a.acc_id, a.name, _f(v)) for a, v in inc]
    ti = sum((v for _, v in inc), Z)
    rows += [R('', 'Total Income', _f(ti), t='s'), R('Expenses', t='g')] + [R(a.acc_id, a.name, _f(v)) for a, v in exp]
    te = sum((v for _, v in exp), Z)
    rows.append(R('', 'Total Expenses', _f(te), t='s'))
    np_ = ti - te
    start = ctx.dfrom or (ctx.fy.from_date if ctx.fy else None)
    return _out('Profit and Loss', ctx, [('Acc ID', 'l'), ('Account', 'l'), ('Amount', 'r')], rows,
                ['', 'Net Profit' if np_ >= 0 else 'Net Loss', _f(abs(np_))],
                subtitle=f'From {_dmy(start)} To {_dmy(ctx.dto or datetime.date.today())}' if start else ctx.period())


def r_balance_sheet(ctx):
    bal, inc, exp = _pl(ctx)
    profit = sum((v for _, v in inc), Z) - sum((v for _, v in exp), Z)
    rows, totals = [], {}
    for head, digit, sign in (('Assets', '1', 1), ('Liabilities', '2', -1), ('Equity', '3', -1)):
        rows.append(R(head, t='g'))
        t = Z
        for a in sorted((a for a in bal if str(a.group.code if a.group_id else '')[:1] == digit), key=lambda a: a.acc_id):
            v = (bal[a][0] - bal[a][1]) * sign
            if abs(v) < Decimal('0.005'):
                continue
            rows.append(R(a.acc_id, a.name, _f(v))); t += v
        if digit == '3':
            rows.append(R('', 'Profit / Loss of the year (not forwarded)', _f(profit))); t += profit
        rows.append(R('', f'Total {head}', _f(t), t='s'))
        totals[digit] = t
    diff = totals['1'] - totals['2'] - totals['3']
    return _out('Balance Sheet', ctx, [('Acc ID', 'l'), ('Account', 'l'), ('Amount', 'r')], rows,
                ['', 'Assets − (Liabilities + Equity)', _f(diff)], subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def r_cheque_register(ctx):
    from .models import VoucherLine
    lines = ctx.scope(VoucherLine.objects.filter(account__acc_id='12040002', debit__gt=0), 'voucher__tenant').select_related('voucher', 'cleared_by')
    if ctx.dfrom:
        lines = lines.filter(voucher__date__gte=ctx.dfrom)
    if ctx.dto:
        lines = lines.filter(voucher__date__lte=ctx.dto)
    if ctx.cheque == 'cleared':
        lines = lines.filter(cleared_by__isnull=False)
    elif ctx.cheque == 'uncleared':
        lines = lines.filter(cleared_by__isnull=True)
    rows = []
    for l in lines.order_by('voucher__date', 'id'):
        v = l.voucher
        party = VoucherLine.objects.filter(voucher=v, credit__gt=0).select_related('account').first()
        rows.append(R(v.voucher_no, _dmy(v.date), party.account.name if party else '', l.chq_no or v.chq_no, _dmy(l.chq_date or v.chq_date),
                      l.bank or v.bank, 'Cleared ' + l.cleared_by.voucher_no if l.cleared_by_id else 'Un-clear', _f(l.debit)))
    return _out('Cheque Register', ctx, [('Voucher', 'l'), ('Date', 'l'), ('Received from', 'l'), ('Chq No', 'l'), ('Chq Date', 'l'), ('Bank', 'l'), ('Status', 'l'), ('Amount', 'r')],
                rows, ['Total', f'{len(rows)} cheques', '', '', '', '', '', _f(sum(_d(r['c'][7]) for r in rows))])


# ═════════════════════ the legacy report menu: groups and the reports in each ═════════════════════
# (key, label, filters, permission). Filters: dates, staff, cheque, fy, areas and one "find" box:
# find:invoice | find:voucher | find:company | find:supplier | find:product | find:customer | find:account.
# "staff!" = a saleman must be chosen.

def _filter_company(ctx, p):
    return not ctx.company or (getattr(getattr(p, 'stock', None), 'product', None) and str(p.stock.product.company_id) == str(ctx.company))


def _stock_list(ctx, title, *, by_company=True, qty='all', rate=False, specific=False):
    if specific and not ctx.company:
        return _out(title, ctx, [('', 'l')], [R('Find the company first.')], subtitle='')
    rows, cur, sub = [], None, [0, Z]
    tq, tv = 0, Z
    prods = [p for p in _products(ctx) if _filter_company(ctx, p)]
    q = lambda p: int(p.total_quantity or 0)
    keep = {'all': lambda p: True, 'nonzero': lambda p: q(p) != 0, 'zero': lambda p: q(p) == 0,
            'above': lambda p: q(p) > int(p.min_count or 0), 'below': lambda p: q(p) <= int(p.min_count or 0)}[qty]
    prods = [p for p in prods if keep(p)]
    prods.sort(key=lambda p: ((_company(p).lower() if by_company else ''), p.product_name.lower()))

    def close():
        if by_company and cur is not None:
            rows.append(R('', f'Total {cur}', '', sub[0], '', '', _f(sub[1]), t='s') if not rate else R('', f'Total {cur}', '', sub[0], '', _f(sub[1]), t='s'))
    for p in prods:
        c = _company(p) or '(No company)'
        if by_company and c != cur:
            close(); rows.append(R(c, t='g')); cur = c; sub[0], sub[1] = 0, Z
        pack = max(1, int(getattr(p.stock, 'items_per_carton', None) or 1)) if p.stock_id else 1
        if rate:
            val = _d(p.cost_price) * q(p)
            rows.append(R(p.sku or '', p.product_name, pack, q(p), _f(p.cost_price), _f(val)))
        else:
            val = _d(p.selling_price) * q(p)
            rows.append(R(p.sku or '', p.product_name, pack, q(p), _f(p.selling_price), _f(p.original_price), _f(val)))
        sub[0] += q(p); sub[1] += val; tq += q(p); tv += val
    close()
    if rate:
        cols = [('PID', 'l'), ('Product Name', 'l'), ('Pack', 'r'), ('Qty', 'r'), ('Pur.Rate', 'r'), ('Value', 'r')]
        tot = ['Total', f'{len(prods)} products', '', tq, '', _f(tv)]
    else:
        cols = [('PID', 'l'), ('Product Name', 'l'), ('Pack', 'r'), ('Qty', 'r'), ('TP', 'r'), ('Retail', 'r'), ('Value (TP)', 'r')]
        tot = ['Total', f'{len(prods)} products', '', tq, '', '', _f(tv)]
    return _out(title, ctx, cols, rows, tot, subtitle=f'Stock in hand as on {_dmy(datetime.date.today())}')


def r_stock_company_all(ctx):
    return _stock_list(ctx, 'Company-wise Stock of all Products')


def r_stock_company_specific(ctx):
    return _stock_list(ctx, 'Company Stock (Specific)', specific=True)


def r_stock_above_min(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Above Min Qty)', by_company=False, qty='above')


def r_stock_below_min(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Below Min Qty)', by_company=False, qty='below')


def r_stock_nonzero(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Non zero Qty)', by_company=False, qty='nonzero')


def r_stock_zero(ctx):
    return _stock_list(ctx, 'Product-wise Stock (zero Qty)', by_company=False, qty='zero')


def r_stock_company_all_rate(ctx):
    return _stock_list(ctx, 'Company-wise Stock of all Products W.Pur.Rate', rate=True)


def r_stock_company_specific_rate(ctx):
    return _stock_list(ctx, 'Company Stock (Specific) W.Pur.Rate', rate=True, specific=True)


def r_stock_above_min_rate(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Above Min Qty) W.Pur.Rate', by_company=False, qty='above', rate=True)


def r_stock_below_min_rate(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Below Min Qty) W.Pur.Rate', by_company=False, qty='below', rate=True)


def r_stock_nonzero_rate(ctx):
    return _stock_list(ctx, 'Product-wise Stock (Non zero Qty) W.Pur.Rate', by_company=False, qty='nonzero', rate=True)


def r_stock_position_company(ctx):
    base = r_stock_position(ctx)
    agg = defaultdict(lambda: [0] * 7)
    for r in base['rows']:
        a = agg[r['c'][2] or '(No company)']
        a[0] += 1
        for i in range(6):
            a[i + 1] += r['c'][3 + i]
    rows = [R(k, *v) for k, v in sorted(agg.items(), key=lambda x: x[0].lower())]
    tot = ['Total'] + [sum(r['c'][i] for r in rows) for i in range(1, 8)]
    return _out('Stock Position Company-wise', ctx, [('Company', 'l'), ('Products', 'r'), ('Purchased', 'r'), ('Pur.Return', 'r'), ('Sold', 'r'),
                                                     ('Sale Return', 'r'), ('Adjust (±)', 'r'), ('Stock Now', 'r')], rows, tot)


# ── purchase order / purchase / purchase return ──

PUR_KIND = {'K': ('PENDING', 'Purchase Order', 'Order No'), 'P': ('RECEIVED', 'Purchase Detail', 'Pur. Inv'), 'R': ('RETURNED', 'Purchase Return', 'Ret. Inv')}


def _pur_docs(ctx, letter):
    qs = _pos(ctx, letter, PUR_KIND[letter][0]).prefetch_related('items__product')
    if ctx.supplier_acc:
        qs = qs.filter(supplier_id=ctx.supplier_acc.supplier_id)
    return qs


def _pur_detail(ctx, letter, mode):
    status, what, numh = PUR_KIND[letter]
    title = f'{what} By ' + {'date': 'Date-wise', 'invoice': 'Invoice No', 'product': 'Product-Wise', 'supplier': 'Supplier-Wise'}[mode]
    if mode == 'invoice':
        from .models import PurchaseOrder
        po = ctx.scope(PurchaseOrder.objects.filter(purchase_number__iexact=ctx.invoice)).first() if ctx.invoice else None
        if not po:
            return _out(title, ctx, [('', 'l')], [R(f'Enter the {what} number.' if not ctx.invoice else f'{ctx.invoice} not found.')], subtitle='')
        return _po_lines_report(ctx, po, f'{what} Invoice')
    if mode == 'supplier' and not ctx.supplier_acc:
        return _out(title, ctx, [('', 'l')], [R('Find the supplier first.')], subtitle='')
    if mode == 'product' and not ctx.product:
        return _out(title, ctx, [('', 'l')], [R('Find the product first.')], subtitle='')
    rows, tq, tv = [], 0, Z
    sp_id = ctx.product.stock.product_id if (ctx.product and ctx.product.stock_id) else None
    for po in _pur_docs(ctx, letter):
        items = [it for it in po.items.all() if mode != 'product' or it.product_id == sp_id]
        if not items:
            continue
        d = _dmy(po.order_date.date() if po.order_date else None)
        if mode == 'product':
            for it in items:
                sub = _d(it.price) * (it.quantity or 0)
                rows.append(R(po.purchase_number, d, _sup(po), it.quantity, it.bonus_quantity or '', _dmy(it.expiry_date), _f(it.price), _f(sub)))
                tq += it.quantity or 0; tv += sub
            continue
        rows.append(R(f'{po.purchase_number}  ·  {d}  ·  {_sup(po)}', t='g'))
        st = Z
        for it in items:
            sub = _d(it.price) * (it.quantity or 0); st += sub
            rows.append(R(it.product.sku if it.product else '', it.product.name if it.product else '', it.quantity, it.bonus_quantity or '',
                          _dmy(it.expiry_date), _f(it.price), _f(sub)))
            tq += it.quantity or 0
        rows.append(R('', f'Total {po.purchase_number}', '', '', '', '', _f(st), t='s')); tv += st
    if mode == 'product':
        return _out(title, ctx, [(numh, 'l'), ('Date', 'l'), ('Supplier', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Expiry', 'l'), ('Rate', 'r'), ('Sub Total', 'r')],
                    rows, ['Total', '', '', tq, '', '', '', _f(tv)], subtitle=f'{ctx.product.sku} {ctx.product.product_name} · {ctx.period()}')
    sub = ctx.period() + (f' · {ctx.supplier_acc.name}' if ctx.supplier_acc else '')
    return _out(title, ctx, [('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Expiry', 'l'), ('Rate', 'r'), ('Sub Total', 'r')],
                rows, ['Total', '', tq, '', '', '', _f(tv)], subtitle=sub)


def _mk_pur(letter, mode):
    return lambda ctx: _pur_detail(ctx, letter, mode)


def r_pur_summary(ctx):
    agg = defaultdict(lambda: [0, Z, 0, Z])
    for letter, i in (('P', 0), ('R', 2)):
        for po in _pur_docs(ctx, letter):
            a = agg[_sup(po) or '(no supplier)']
            a[i] += 1; a[i + 1] += _d(po.total_amount)
    rows = [R(k, v[0], _f(v[1]), v[2], _f(v[3]), _f(v[1] - v[3])) for k, v in sorted(agg.items(), key=lambda x: x[0].lower())]
    tot = ['Total', sum(r['c'][1] for r in rows), _f(sum(_d(r['c'][2]) for r in rows)), sum(r['c'][3] for r in rows),
           _f(sum(_d(r['c'][4]) for r in rows)), _f(sum(_d(r['c'][5]) for r in rows))]
    return _out('Purchase / Pur.Return Summary', ctx, [('Supplier', 'l'), ('Purchases', 'r'), ('Purchase Amount', 'r'), ('Returns', 'r'),
                                                      ('Return Amount', 'r'), ('Net', 'r')], rows, tot)


# ── sale / sale return invoices ──

def _sale_detail(ctx, mode):
    """Invoices with their lines, grouped per invoice (by date, or one customer's)."""
    title = 'Sale Invoice By ' + ('Date' if mode == 'date' else 'Customer')
    if mode == 'customer' and not ctx.customer_acc:
        return _out(title, ctx, [('', 'l')], [R('Find the customer first.')], subtitle='')
    from .models import OrderItem
    accs = _cust_accounts(ctx)
    orders = _orders(ctx)
    if mode == 'customer':
        orders = orders.filter(customer_id=ctx.customer_acc.customer_id)
    orders = sorted(orders.select_related('staff'), key=lambda o: (_odate(o), o.tracking_id))[:1500]
    lines = defaultdict(list)
    for it in OrderItem.objects.filter(order__in=orders).select_related('product').order_by('id'):
        lines[it.order_id].append(it)
    rows, tq, tn = [], 0, Z
    for o in orders:
        code, name, area = _cust_name(o, accs)
        rows.append(R(f'{o.tracking_id}  ·  {_dmy(_odate(o))}  ·  {code} {name}{"  ·  " + area if area else ""}{"  ·  " + o.staff.name if o.staff_id else ""}', t='g'))
        for it in lines[o.id]:
            gross = _d(it.price) * (it.quantity or 0)
            rows.append(R(it.product.sku if it.product else '', it.product.product_name if it.product else '', it.quantity, it.bonus_quantity or '',
                          _f(it.price), _f(it.discount), _f(gross - _d(it.discount))))
            tq += it.quantity or 0
        rows.append(R('', f'Net {o.tracking_id}', '', '', '', '', _f(o.total_amount), t='s')); tn += _d(o.total_amount)
    return _out(title, ctx, [('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('TP', 'r'), ('Disc', 'r'), ('Net', 'r')],
                rows, ['Total', f'{len(orders)} invoices', tq, '', '', '', _f(tn)],
                subtitle=ctx.period() + (f' · {ctx.customer_acc.name}' if mode == 'customer' else ''))


def r_sale_by_date(ctx):
    return _sale_detail(ctx, 'date')


def r_sale_by_invoice(ctx):
    if not ctx.invoice:
        return _out('Sale Invoice By Invice No', ctx, [('', 'l')], [R('Enter the Invoice No.')], subtitle='')
    return r_sale_invoice(ctx)


def r_sale_by_customer(ctx):
    return _sale_detail(ctx, 'customer')


def _return_detail(ctx, mode):
    title = 'Sale Return Invoice By ' + ('Date' if mode == 'date' else 'Customer')
    if mode == 'customer' and not ctx.customer_acc:
        return _out(title, ctx, [('', 'l')], [R('Find the customer first.')], subtitle='')
    rets = _returns(ctx)
    if mode == 'customer':
        rets = rets.filter(customer_id=ctx.customer_acc.customer_id)
    rows, tn, n = [], Z, 0
    for r in rets.order_by('return_date', 'return_no').prefetch_related('items__product')[:1500]:
        n += 1
        rows.append(R(f'{r.return_no}  ·  {_dmy(r.return_date)}  ·  {r.customer_name or ""}{"  ·  " + r.staff.name if r.staff_id else ""}', t='g'))
        for it in r.items.all():
            rows.append(R(it.product.sku if it.product else '', it.product.product_name if it.product else '', it.quantity, it.bonus_quantity or '',
                          _f(it.price), _f(it.discount), _f(_d(it.price) * (it.quantity or 0) - _d(it.discount))))
        net = _d(r.net_amount) - _d(r.less_amount)
        rows.append(R('', f'Net {r.return_no}', '', '', '', '', _f(net), t='s')); tn += net
    return _out(title, ctx, [('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('TP', 'r'), ('Disc', 'r'), ('Net', 'r')],
                rows, ['Total', f'{n} returns', '', '', '', '', _f(tn)], subtitle=ctx.period() + (f' · {ctx.customer_acc.name}' if mode == 'customer' else ''))


def r_return_by_date(ctx):
    return _return_detail(ctx, 'date')


def r_return_by_invoice(ctx):
    if not ctx.invoice:
        return _out('Sale Return Invoice By Invice No', ctx, [('', 'l')], [R('Enter the Return No.')], subtitle='')
    return r_sale_return(ctx)


def r_return_by_customer(ctx):
    return _return_detail(ctx, 'customer')


def r_challan_bills(ctx):
    """Delivery challan of the invoices, area by area: whom to deliver which bill, to be signed on receipt."""
    accs = _cust_accounts(ctx)
    from .models import OrderItem
    orders = list(_orders(ctx))
    qty = defaultdict(lambda: [0, 0, 0])
    for oid, q, b, ctn in OrderItem.objects.filter(order__in=orders).values_list('order_id', 'quantity', 'bonus_quantity', 'product__carton_qty'):
        a = qty[oid]
        a[0] += 1; a[1] += (q or 0) + (b or 0)
        if ctn:
            a[2] += (q or 0) // ctn
    by_area = defaultdict(list)
    for o in orders:
        code, name, area = _cust_name(o, accs)
        a = accs.get(o.customer_id)
        by_area[area or '(no area)'].append((o, code, name, a.cell_no if a else ''))
    rows, tot, n = [], Z, 0
    for area in sorted(by_area, key=str.lower):
        rows.append(R(area, t='g'))
        sub = Z
        for o, code, name, cell in sorted(by_area[area], key=lambda x: (x[2].lower(), _odate(x[0]))):
            q = qty[o.id]
            rows.append(R(o.tracking_id, _dmy(_odate(o)), code, name, cell or '', q[0], q[1], q[2] or '', _f(o.total_amount), ''))
            sub += _d(o.total_amount); n += 1
        rows.append(R(f'{area} total', '', '', f'{len(by_area[area])} bills', '', '', '', '', _f(sub), '', t='s'))
        tot += sub
    return _out('Area-Wise Delivery Challan (Bills)', ctx,
                [('Invoice', 'l'), ('Date', 'l'), ('Acc ID', 'l'), ('Customer', 'l'), ('Cell No', 'l'), ('Items', 'r'), ('Qty', 'r'), ('Ctn', 'r'), ('Net', 'r'), ('Received (sign)', 'l')],
                rows, ['Total', '', '', f'{n} bills', '', '', '', '', _f(tot), ''],
                subtitle=ctx.period() + (' · selected areas' if ctx.areas else ''))


def _recovery_rows(ctx, company=False):
    """Recovery challan: area by area, each customer's balance and the bills it is made of
    (oldest first) — late ones in red — with a column to write what is received."""
    from .trade_dues import customer_dues
    upto = ctx.dto or datetime.date.today()
    dues = customer_dues(ctx.user, upto=upto, staff=ctx.staff)
    if ctx.areas:
        dues = {k: v for k, v in dues.items() if v['acc'].area_id in ctx.areas}
    share = {}
    if company:   # each bill's goods of this company, and so its part of what is owed
        from .models import OrderItem
        ids = [b['id'] for d in dues.values() for b in d['bills']]
        tot, mine = defaultdict(lambda: Z), defaultdict(lambda: Z)
        for oid, pr, q, disc, co in OrderItem.objects.filter(order_id__in=ids).values_list(
                'order_id', 'price', 'quantity', 'discount', 'product__stock__product__company_id'):
            v = _d(pr) * (q or 0) - _d(disc)
            tot[str(oid)] += v
            if str(co) == str(ctx.company):
                mine[str(oid)] += v
        share = {k: (mine[k] / tot[k] if tot[k] else Z) for k in tot}
    by_area = defaultdict(list)
    for d in dues.values():
        bills = d['bills']
        if company:
            bills = [dict(b, owed=(b['owed'] * share.get(b['id'], Z)).quantize(Decimal('0.01'))) for b in bills if share.get(b['id'])]
            bills = [b for b in bills if b['owed'] > 0]
            if not bills:
                continue
        elif ctx.staff and not bills:
            continue
        a = d['acc']
        by_area[a.area.name if a.area_id else '(no area)'].append((a, d, bills))
    rows, total, late_total, n = [], Z, Z, 0
    for area in sorted(by_area, key=str.lower):
        rows.append(R(area, t='g'))
        for a, d, bills in sorted(by_area[area], key=lambda x: x[0].name.lower()):
            owed = sum((b['owed'] for b in bills), Z) + (Z if (company or ctx.staff) else d['opening'])
            late = sum((b['owed'] for b in bills if b['late_days'] > 0), Z) + (Z if (company or ctx.staff) else d['opening'])
            rows.append(R(a.acc_id, a.name, a.cell_no or '', '', '', _f(owed), '', t='s'))
            if d['opening'] > 0 and not (company or ctx.staff):
                rows.append(R('', 'Old balance (before these bills)', '', '', 'old', _f(d['opening']), '', t='p'))
            for b in bills:
                rows.append(R('', b['no'], _dmy(b['date']), _dmy(b['due']), f"{b['late_days']} days late" if b['late_days'] else 'not due yet',
                              _f(b['owed']), '', t='p' if b['late_days'] else None))
            total += owed; late_total += late; n += 1
    title = 'Recovery Challan (Company-wise)' if company else 'Recovery Challan (Area-wise)'
    sub = f'Dues as on {_dmy(upto)}' + (f' · {ctx.company_name}' if company else '') + (' · selected areas' if ctx.areas else '') + \
          f' · late: {_f(late_total)}'
    return _out(title, ctx, [('Acc ID', 'l'), ('Customer / Bill', 'l'), ('Bill Date', 'l'), ('Due Date', 'l'), ('Late', 'l'), ('Amount Due', 'r'), ('Received', 'l')],
                rows, ['Total', f'{n} customers', '', '', '', _f(total), ''], subtitle=sub)


def r_recovery_challan(ctx):
    return _recovery_rows(ctx)


def r_recovery_company(ctx):
    if not ctx.company:
        return _out('Recovery Challan (Company-wise)', ctx, [('', 'l')], [R('Find the company first.')], subtitle='')
    return _recovery_rows(ctx, company=True)


def r_challan_area(ctx):
    """Loading sheet: for each area, the products of the invoices in the period (qty, bonus, cartons)."""
    accs = _cust_accounts(ctx)
    from .models import OrderItem
    orders = list(_orders(ctx))
    area_of = {o.id: (_cust_name(o, accs)[2] or '(no area)') for o in orders}
    agg = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    names = {}
    for it in OrderItem.objects.filter(order__in=orders).select_related('product'):
        p = it.product
        k = p.id if p else None
        names[k] = (p.sku if p else '', p.product_name if p else '(deleted)', p.carton_qty if p else 0)
        a = agg[area_of[it.order_id]][k]
        a[0] += it.quantity or 0; a[1] += it.bonus_quantity or 0
    rows = []
    for area in sorted(agg, key=str.lower):
        rows.append(R(area, t='g'))
        for k, (q, b) in sorted(agg[area].items(), key=lambda x: names[x[0]][1].lower()):
            sku, nm, ctn = names[k]
            rows.append(R(sku, nm, (f'{q // ctn} + {q % ctn}' if q % ctn else q // ctn) if ctn else '', q, b or '', ''))
    return _out('Area-Wise Delivery Challan', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Cartons', 'r'), ('Qty', 'r'), ('Bonus', 'r'), ('Loaded', 'l')],
                rows, ['Total', f'{len(orders)} invoices', '', sum(r['c'][3] for r in rows if not r['t']), '', ''])


# ── sale statements ──

def _two_level(ctx, title, outer_h, inner_h, outer, inner, items=True):
    """Sale totals grouped by outer -> inner (e.g. saleman -> area)."""
    agg = defaultdict(lambda: defaultdict(lambda: [0, Z, Z]))
    if items:
        for it in _items(ctx).select_related('order__staff'):
            gross = _d(it.price) * (it.quantity or 0)
            a = agg[outer(it)][inner(it)]
            a[0] += it.quantity or 0; a[1] += gross; a[2] += gross - _d(it.discount)
    rows, tq, tg, tn = [], 0, Z, Z
    for o in sorted(agg, key=lambda x: str(x).lower()):
        rows.append(R(o, t='g'))
        sq, sg, sn = 0, Z, Z
        for i, (q, g, n) in sorted(agg[o].items(), key=lambda x: str(x[0]).lower()):
            rows.append(R(i, q, _f(g), _f(n))); sq += q; sg += g; sn += n
        rows.append(R(f'Total {o}', sq, _f(sg), _f(sn), t='s'))
        tq += sq; tg += sg; tn += sn
    return _out(title, ctx, [(inner_h, 'l'), ('Qty', 'r'), ('Gross', 'r'), ('Net', 'r')], rows, ['Total', tq, _f(tg), _f(tn)])


def _staff_name(o):
    return o.staff.name if o.staff_id else '(no saleman)'


def r_saleman_area(ctx):
    accs = _cust_accounts(ctx)
    return _two_level(ctx, 'Saleman Area-wise', 'Saleman', 'Area', lambda it: _staff_name(it.order), lambda it: _cust_name(it.order, accs)[2] or '(no area)')


def r_saleman_comp(ctx):
    return _two_level(ctx, 'Saleman Comp-wise', 'Saleman', 'Company', lambda it: _staff_name(it.order), lambda it: (_company(it.product) if it.product else '') or '(No company)')


def r_saleman_specific_comp(ctx):
    if not ctx.staff:
        return _out('Saleman Specific Comp-wise', ctx, [('', 'l')], [R('Choose the Staff (saleman) first.')], subtitle='')
    return _two_level(ctx, 'Saleman Specific Comp-wise', 'Saleman', 'Company', lambda it: _staff_name(it.order), lambda it: (_company(it.product) if it.product else '') or '(No company)')


def r_company_specific(ctx):
    if not ctx.company:
        return _out('Company-Wise (Specific)', ctx, [('', 'l')], [R('Find the company first.')], subtitle='')
    agg = defaultdict(lambda: [0, 0, Z, Z])
    for it in _items(ctx).filter(product__stock__product__company_id=ctx.company):
        p = it.product
        a = agg[(p.sku or '', p.product_name)]
        gross = _d(it.price) * (it.quantity or 0)
        a[0] += it.quantity or 0; a[1] += it.bonus_quantity or 0; a[2] += gross; a[3] += gross - _d(it.discount)
    rows = [R(k[0], k[1], v[0], v[1] or '', _f(v[2]), _f(v[3])) for k, v in sorted(agg.items(), key=lambda x: x[0][1].lower())]
    tot = ['Total', f'{len(rows)} products', sum(r['c'][2] for r in rows), '', _f(sum(_d(r['c'][4]) for r in rows)), _f(sum(_d(r['c'][5]) for r in rows))]
    return _out('Company-Wise (Specific)', ctx, [('PID', 'l'), ('Product Name', 'l'), ('Qty', 'r'), ('Bonus', 'r'), ('Gross', 'r'), ('Net', 'r')], rows, tot,
                subtitle=ctx.period() + f' · {ctx.company_name}')


def r_company_customer(ctx):
    accs = _cust_accounts(ctx)
    return _two_level(ctx, 'Company and Customer-Wise', 'Company', 'Customer',
                      lambda it: (_company(it.product) if it.product else '') or '(No company)',
                      lambda it: ' '.join(x for x in _cust_name(it.order, accs)[:2] if x))


def r_customers_overall(ctx):
    """Each customer: sales, returns, received and balance (whole ledger)."""
    from modules.company.models import LedgerAccount
    qs = ctx.scope(LedgerAccount.objects.filter(group__code=1202)).select_related('area')
    if ctx.areas:
        qs = qs.filter(area_id__in=ctx.areas)
    sale, ret, rec, bal = defaultdict(lambda: Z), defaultdict(lambda: Z), defaultdict(lambda: Z), defaultdict(lambda: Z)
    for d, no, acc, det, dr, cr, st in _ledger(ctx, upto=ctx.dto):
        if not (acc.group_id and acc.group.code == 1202):
            continue
        bal[acc.pk] += dr - cr
        if ctx.dfrom and d < ctx.dfrom:
            continue
        if str(det or '').startswith('Sale of'):
            sale[acc.pk] += dr
        elif str(det or '').startswith('Sale Ret'):
            ret[acc.pk] += cr
        else:
            rec[acc.pk] += cr - dr
    rows = []
    for a in sorted(qs, key=lambda a: a.name.lower()):
        if not any((sale[a.pk], ret[a.pk], rec[a.pk], bal[a.pk])):
            continue
        rows.append(R(a.acc_id, a.name, a.area.name if a.area_id else '', _f(sale[a.pk]), _f(ret[a.pk]), _f(rec[a.pk]), _f(bal[a.pk])))
    tot = ['Total', f'{len(rows)} customers', ''] + [_f(sum(_d(r['c'][i]) for r in rows)) for i in range(3, 7)]
    return _out('Customers over all', ctx, [('Acc ID', 'l'), ('Customer', 'l'), ('Area', 'l'), ('Sales', 'r'), ('Returns', 'r'), ('Received / Other', 'r'), ('Balance', 'r')], rows, tot)


def _sorted_profit(base, col, title):
    rows = sorted(base['rows'], key=lambda r: -_d(r['c'][col]))
    return {**base, 'title': title, 'rows': rows}


def r_daily_by_profit(ctx):
    return _sorted_profit(r_daily_sale(ctx), 5, 'Daily Sale Summary Order By Profit')


def r_daily_by_qty(ctx):
    return _sorted_profit(r_daily_sale(ctx), 1, 'Daily Sale Summary Order By Qty')


def r_product_by_profit(ctx):
    return _sorted_profit(r_product_sale(ctx), 7, 'Product-wise Sale Summary Order By Profit')


# ── accounting ──

def r_journal_voucher(ctx):
    if not ctx.invoice:
        return _out('General Journal by voucher No', ctx, [('', 'l')], [R('Enter the Voucher No.')], subtitle='')
    rows, td, tc = [], Z, Z
    for d, no, acc, det, dr, cr, st in _ledger(ctx):
        if no.upper() != ctx.invoice.upper():
            continue
        rows.append(R(_dmy(d), acc.acc_id, acc.name, det, _f(dr) if dr else '', _f(cr) if cr else ''))
        td += dr; tc += cr
    if not rows:
        rows = [R(f'{ctx.invoice} not found.')]
        return _out('General Journal by voucher No', ctx, [('', 'l')], rows, subtitle='')
    return _out('General Journal by voucher No', ctx, [('Date', 'l'), ('Acc ID', 'l'), ('Account', 'l'), ('Detail', 'l'), ('Debit', 'r'), ('Credit', 'r')],
                rows, ['Total', '', '', '', _f(td), _f(tc)], subtitle=ctx.invoice.upper())


def r_balances_2nd(ctx):
    from modules.company.models import AccountGroup
    groups = {g.id: g for g in ctx.scope(AccountGroup.objects.all())}
    bal = _balances(ctx)
    agg = defaultdict(list)
    for acc, (dr, cr) in bal.items():
        net = dr - cr
        if abs(net) < Decimal('0.005') or not acc.group_id:
            continue
        g2 = groups.get(acc.group.parent_id)
        agg[(g2.code if g2 else 0, g2.name if g2 else '')].append((acc, net))
    rows, td, tc = [], Z, Z
    for (code, name) in sorted(agg):
        rows.append(R(f'{code} {name}', t='g'))
        sd = sc = Z
        for acc, net in sorted(agg[(code, name)], key=lambda x: x[0].acc_id):
            rows.append(R(acc.acc_id, acc.name, _f(net) if net > 0 else '', _f(-net) if net < 0 else ''))
            sd += max(net, Z); sc += max(-net, Z)
        rows.append(R('', f'Total {name}', _f(sd), _f(sc), t='s')); td += sd; tc += sc
    return _out('Over all Balances Acc 2nd Level-wise', ctx, [('Acc ID', 'l'), ('Account', 'l'), ('Debit', 'r'), ('Credit', 'r')], rows, ['Total', '', _f(td), _f(tc)],
                subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def _vouchers_report(ctx, vtype, title, group_by_staff):
    from .models import Voucher, VoucherLine
    qs = ctx.scope(Voucher.objects.filter(vtype=vtype)).select_related('staff')
    if ctx.dfrom:
        qs = qs.filter(date__gte=ctx.dfrom)
    if ctx.dto:
        qs = qs.filter(date__lte=ctx.dto)
    if ctx.staff:
        qs = qs.filter(staff_id=ctx.staff)
    if ctx.cheque == 'cash':
        qs = qs.filter(chq_no__in=['', '-'])
    elif ctx.cheque in ('cleared', 'uncleared', 'cheque'):
        qs = qs.exclude(chq_no__in=['', '-'])
    side = 'credit' if vtype == 'receipt' else 'debit'
    lines = (VoucherLine.objects.filter(voucher__in=qs, **{f'{side}__gt': 0}).select_related('voucher__staff', 'account')
             .order_by('voucher__date', 'voucher_id', 'line'))
    if ctx.cheque == 'cleared':
        lines = [l for l in lines if VoucherLine.objects.filter(voucher=l.voucher, cleared_by__isnull=False).exists()]
    elif ctx.cheque == 'uncleared':
        lines = [l for l in lines if VoucherLine.objects.filter(voucher=l.voucher, account__acc_id='12040002', cleared_by__isnull=True, debit__gt=0).exists()]
    rows, cur, sub, tot = [], None, Z, Z
    for l in sorted(lines, key=lambda l: ((l.voucher.staff.name if l.voucher.staff_id else '~') if group_by_staff else '', l.voucher.date, l.voucher.voucher_no)):
        v = l.voucher
        g = (v.staff.name if v.staff_id else '(no staff)') if group_by_staff else _dmy(v.date)
        if g != cur:
            if cur is not None:
                rows.append(R('', '', f'Total {cur}', '', '', _f(sub), t='s'))
            rows.append(R(g, t='g')); cur = g; sub = Z
        amt = getattr(l, side)
        rows.append(R(v.voucher_no, _dmy(v.date), l.account.acc_id, l.account.name, (v.chq_no if v.chq_no not in ('', '-') else '') or l.detail or v.detail, _f(amt)))
        sub += amt; tot += amt
    if cur is not None:
        rows.append(R('', '', f'Total {cur}', '', '', _f(sub), t='s'))
    return _out(title, ctx, [('Voucher', 'l'), ('Date', 'l'), ('Acc ID', 'l'), ('Account', 'l'), ('Chq No / Detail', 'l'), ('Amount', 'r')], rows, ['Total', '', '', '', '', _f(tot)])


def r_receipts_saleman(ctx):
    return _vouchers_report(ctx, 'receipt', 'Saleman-wise Receipt Vouchers', True)


def r_expense_date(ctx):
    return _vouchers_report(ctx, 'expense', 'Date-wise Expanse Vouchers', False)


def _by_group(ctx, items, groups):
    """items: [(acc, value)] -> rows per 3rd-level group (short)."""
    agg = defaultdict(lambda: Z)
    for acc, v in items:
        agg[acc.group_id] += v
    return [(groups[g], v) for g, v in sorted(agg.items(), key=lambda x: groups[x[0]].code) if abs(v) >= Decimal('0.005')]


def r_trial_short(ctx):
    from modules.company.models import AccountGroup
    groups = {g.id: g for g in ctx.scope(AccountGroup.objects.all())}
    bal = _balances(ctx)
    rows, td, tc = [], Z, Z
    for g, net in _by_group(ctx, [(a, dr - cr) for a, (dr, cr) in bal.items() if a.group_id], groups):
        rows.append(R(g.code, g.name, _f(net) if net > 0 else '', _f(-net) if net < 0 else ''))
        td += max(net, Z); tc += max(-net, Z)
    if abs(td - tc) >= Decimal('0.01'):
        rows.append(R('', 'Difference', _f(tc - td) if tc > td else '', _f(td - tc) if td > tc else '', t='s'))
    return _out('Trial Balance (Short)', ctx, [('Group', 'l'), ('Account Group', 'l'), ('Debit', 'r'), ('Credit', 'r')], rows, ['Total', '', _f(td), _f(tc)],
                subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def r_income_short(ctx):
    from modules.company.models import AccountGroup
    groups = {g.id: g for g in ctx.scope(AccountGroup.objects.all())}
    _, inc, exp = _pl(ctx)
    gi, ge = _by_group(ctx, inc, groups), _by_group(ctx, exp, groups)
    ti, te = sum((v for _, v in gi), Z), sum((v for _, v in ge), Z)
    rows = ([R('Income', t='g')] + [R(g.code, g.name, _f(v)) for g, v in gi] + [R('', 'Total Income', _f(ti), t='s'), R('Expenses', t='g')]
            + [R(g.code, g.name, _f(v)) for g, v in ge] + [R('', 'Total Expenses', _f(te), t='s')])
    base = r_profit_loss(ctx)
    return _out('Income Statement (Short)', ctx, [('Group', 'l'), ('Account Group', 'l'), ('Amount', 'r')], rows,
                ['', 'Net Profit' if ti >= te else 'Net Loss', _f(abs(ti - te))], subtitle=base['subtitle'])


def r_balance_short(ctx):
    from modules.company.models import AccountGroup
    groups = {g.id: g for g in ctx.scope(AccountGroup.objects.all())}
    bal, inc, exp = _pl(ctx)
    profit = sum((v for _, v in inc), Z) - sum((v for _, v in exp), Z)
    rows, totals = [], {}
    for head, digit, sign in (('Assets', '1', 1), ('Liabilities', '2', -1), ('Equity', '3', -1)):
        rows.append(R(head, t='g'))
        items = [(a, (dr - cr) * sign) for a, (dr, cr) in bal.items() if a.group_id and str(a.group.code)[:1] == digit]
        t = Z
        for g, v in _by_group(ctx, items, groups):
            rows.append(R(g.code, g.name, _f(v))); t += v
        if digit == '3':
            rows.append(R('', 'Profit / Loss of the year (not forwarded)', _f(profit))); t += profit
        rows.append(R('', f'Total {head}', _f(t), t='s')); totals[digit] = t
    return _out('Balance Sheet (short)', ctx, [('Group', 'l'), ('Account Group', 'l'), ('Amount', 'r')], rows,
                ['', 'Assets − (Liabilities + Equity)', _f(totals['1'] - totals['2'] - totals['3'])],
                subtitle=f'As on {_dmy(ctx.dto or datetime.date.today())}' + (f' · FY {ctx.fy.title}' if ctx.fy else ''))


def _retitle(fn, title):
    def run(ctx):
        out = fn(ctx)
        out['title'] = title if not out['title'].startswith('Ledger —') else out['title']
        return out
    return run


F_D, F_S, F_A, F_FY = 'dates', 'staff', 'areas', 'fy'
CATEGORIES = [
    ('401', '401-Reports Stock', [
        ('stock_taking', 'Stock Taking List', [], 'rpt_stock_taking'),
        ('stock_company_all', 'Company-wise Stock of all Products', [], 'rpt_stock_summary'),
        ('stock_company_specific', 'Company Stock (Speciifc)', ['find:company'], 'rpt_stock_summary'),
        ('stock_above_min', 'Product-wise Stock (Above Min Qty)', [], 'rpt_stock_summary'),
        ('stock_below_min', 'Product-wise Stock (Below Min Qty)', [], 'rpt_stock_summary'),
        ('stock_nonzero', 'Product-wise Stock (Non zero Qty)', [], 'rpt_stock_summary'),
        ('stock_zero', 'Product-wise Stock (zero Qty)', [], 'rpt_stock_summary'),
        ('stock_position', 'Stock Position', [F_D], 'rpt_stock_position'),
        ('stock_summary', 'Company-wise Stock Summary', [], 'rpt_stock_summary'),
        ('stock_company_all_rate', 'Company-wise Stock of all Products W.Pur.Rate)', [], 'rpt_stock_pur_rate'),
        ('stock_company_specific_rate', 'Company Stock (Speciifc) W.Pur.Rate', ['find:company'], 'rpt_stock_pur_rate'),
        ('stock_above_min_rate', 'Product-wise Stock (Above Min Qty) W.Pur.Rate', [], 'rpt_stock_pur_rate'),
        ('stock_below_min_rate', 'Product-wise Stock (Below Min Qty) W.Pur.Rate', [], 'rpt_stock_pur_rate'),
        ('stock_nonzero_rate', 'Product-wise Stock (Non zero Qty)W.Pur.Rate)', [], 'rpt_stock_pur_rate'),
        ('stock_position_company', 'Stock Position Company-wise', [F_D], 'rpt_stock_position'),
    ]),
    ('402', '402-Stock Adjustments', [
        ('opening_stock', 'Opening Stock Add / Less', [F_D], 'rpt_opening_stock'),
        ('damage', 'Demage / Un-Demage Stock', [F_D], 'rpt_damage'),
        ('stock_access', 'Stock Access / Short', [F_D], 'rpt_stock_access'),
        ('cash_access', 'Cash Access / Short', [F_D], 'rpt_cash_access'),
    ]),
    ('403', '403-Purchase Order / Purchase / Purchase Retuern', [
        ('po_date', 'Purchase Order By Date-wise', [F_D], 'rpt_purchase_order'),
        ('po_invoice', 'Purchase Order By Invoice No', ['find:invoice'], 'rpt_purchase_order'),
        ('po_supplier', 'Purchase Order By Supplier-Wise', [F_D, 'find:supplier'], 'rpt_purchase_order'),
        None,
        ('pur_date', 'Purchase Detail By Date-wise', [F_D], 'rpt_purchase_stock'),
        ('pur_invoice', 'Purchase Detail By Invoice No', ['find:invoice'], 'rpt_purchase_stock'),
        ('pur_product', 'Purchase Detail By Product-Wise', [F_D, 'find:product'], 'rpt_purchase_stock'),
        ('pur_supplier', 'Purchase Detail By Supplier-Wise', [F_D, 'find:supplier'], 'rpt_purchase_stock'),
        None,
        ('pret_date', 'Purchase  Return By Date-wise', [F_D], 'rpt_purchase_return'),
        ('pret_invoice', 'Purchase  Return By Invoice No', ['find:invoice'], 'rpt_purchase_return'),
        ('pret_product', 'Purchase  Return By Product-Wise', [F_D, 'find:product'], 'rpt_purchase_return'),
        ('pret_supplier', 'Purchase  Return By Supplier-Wise', [F_D, 'find:supplier'], 'rpt_purchase_return'),
        ('pur_summary', 'Purchase / Pur.Return Summary', [F_D], 'rpt_purchase_stock'),
    ]),
    ('404', '404-Sale / Sale Return', [
        ('sale_by_date', 'Sale Invoice  By Date', [F_D, F_S, F_A], 'rpt_sale_invoice'),
        ('sale_by_invoice', 'Sale Invoice  By Invice No', ['find:invoice'], 'rpt_sale_invoice'),
        ('sale_by_customer', 'Sale Invoice  By Customer', [F_D, 'find:customer'], 'rpt_sale_invoice'),
        None,
        ('return_by_date', 'Sale Return Invoice By Date', [F_D, F_S], 'rpt_sale_return'),
        ('return_by_invoice', 'Sale Return Invoice By Invice No', ['find:invoice'], 'rpt_sale_return'),
        ('return_by_customer', 'Sale Return Invoice By Customer', [F_D, 'find:customer'], 'rpt_sale_return'),
        None,
        ('delivery_invoice', 'Delivery Challan By Invoice No', ['find:invoice'], 'rpt_delivery_challan'),
        ('challan_area', 'Area-Wise Delivery Challan (Products)', [F_D, F_S, F_A], 'rpt_delivery_challan'),
        ('challan_bills', 'Area-Wise Delivery Challan (Bills)', [F_D, F_S, F_A], 'rpt_delivery_challan'),
        ('recovery_challan', 'Recovery Challan (Area-wise)', [F_D, F_S, F_A], 'rpt_account_balances'),
        ('recovery_company', 'Recovery Challan (Company-wise)', [F_D, F_S, F_A, 'find:company'], 'rpt_account_balances'),
        ('customer_list', 'Area-Wise Customer List', [F_A], 'rpt_customer_list'),
        None,
        ('sale_invoice', 'Sale Invoice List', [F_D, F_S, F_A], 'rpt_sale_invoice'),
        ('sale_return', 'Sale Return Invoice List', [F_D, F_S], 'rpt_sale_return'),
    ]),
    ('405', '405-Sale Statements', [
        ('sale_date', 'Date-wise', [F_D, F_S, F_A], 'rpt_sale_date'),
        ('saleman_area', 'Saleman Area-wise', [F_D, F_S], 'rpt_sale_saleman'),
        ('saleman_comp', 'Saleman Comp-wise', [F_D, F_S], 'rpt_sale_saleman'),
        ('saleman_specific_comp', 'Saleman Specific Comp-wise', [F_D, 'staff!'], 'rpt_sale_saleman'),
        ('sale_customer', 'Customer-Wise', [F_D, F_S, F_A], 'rpt_sale_customer'),
        ('customers_overall', 'Customers over all', [F_D, F_A], 'rpt_sale_customer'),
        ('sale_company', 'Company-Wise', [F_D, F_S, F_A], 'rpt_sale_company'),
        ('company_specific', 'Company-Wise(Specific)', [F_D, F_S, 'find:company'], 'rpt_sale_company'),
        ('company_customer', 'Company and Customer-Wise', [F_D, F_S, F_A], 'rpt_sale_company'),
        None,
        ('sale_area', 'Area-Wise', [F_D, F_S, F_A], 'rpt_sale_area'),
        ('daily_by_profit', 'Daily Sale Summary Order By Profit', [F_D, F_S, F_A], 'rpt_daily_sale'),
        ('daily_by_qty', 'Daily Sale Summary Order By Qty', [F_D, F_S, F_A], 'rpt_daily_sale'),
        ('product_by_profit', 'Product-wise Sale Summary Order By Profit', [F_D, F_S, F_A], 'rpt_product_sale'),
    ]),
    ('406', '406-Accounting', [
        ('chart_of_account', 'Chart of Accounts', [], 'rpt_chart_of_account'),
        ('journal', 'General Journal by Date', [F_D, F_S], 'rpt_journal'),
        ('journal_voucher', 'General Journal by voucher No', ['find:voucher'], 'rpt_journal'),
        ('recovery', 'Over all  Balances Area-wise', [F_D, F_A], 'rpt_account_balances'),
        ('balances_2nd', 'Over all  Balances Acc 2nd Level-wise', [F_D, F_FY], 'rpt_account_balances'),
        ('receipts_saleman', 'Salwman-wise Receipt Vouchers', [F_D, F_S, 'cheque'], 'rpt_journal'),
        ('expense_date', 'Date-wise Expanse Vouchers', [F_D, F_S], 'rpt_journal'),
        ('ledger', 'General Ledger', [F_D, 'find:account'], 'rpt_ledger'),
        ('trial_balance', 'Trial Balance(Detail)', [F_D, F_FY], 'rpt_trial_balance'),
        ('trial_short', 'Trial Balance(Short)', [F_D, F_FY], 'rpt_trial_balance'),
        ('income_short', 'Income Statement (Short)', [F_D, F_FY], 'rpt_profit_loss'),
        ('profit_loss', 'Income Statement (Detail)', [F_D, F_FY], 'rpt_profit_loss'),
        ('balance_short', 'Balance Sheet (short)', [F_D, F_FY], 'rpt_balance_sheet'),
        ('balance_sheet', 'Balance Sheet (Detail)', [F_D, F_FY], 'rpt_balance_sheet'),
    ]),
]
_EXTRA = {
    'po_date': _mk_pur('K', 'date'), 'po_invoice': _mk_pur('K', 'invoice'), 'po_supplier': _mk_pur('K', 'supplier'),
    'pur_date': _mk_pur('P', 'date'), 'pur_invoice': _mk_pur('P', 'invoice'), 'pur_product': _mk_pur('P', 'product'), 'pur_supplier': _mk_pur('P', 'supplier'),
    'pret_date': _mk_pur('R', 'date'), 'pret_invoice': _mk_pur('R', 'invoice'), 'pret_product': _mk_pur('R', 'product'), 'pret_supplier': _mk_pur('R', 'supplier'),
    'delivery_invoice': r_delivery_challan,
    'customer_list': _retitle(r_customer_list, 'Area-Wise Customer List'), 'recovery': _retitle(r_recovery, 'Over all Balances Area-wise'),
    'journal': _retitle(r_journal, 'General Journal by Date'), 'trial_balance': _retitle(r_trial_balance, 'Trial Balance (Detail)'),
    'profit_loss': _retitle(r_profit_loss, 'Income Statement (Detail)'), 'balance_sheet': _retitle(r_balance_sheet, 'Balance Sheet (Detail)'),
    'sale_date': _retitle(r_sale_date, 'Sale Statement Date-wise'), 'sale_customer': _retitle(r_sale_customer, 'Sale Statement Customer-Wise'),
    'sale_company': _retitle(r_sale_company, 'Sale Statement Company-Wise'), 'sale_area': _retitle(r_sale_area, 'Sale Statement Area-Wise'),
    'stock_summary': _retitle(r_stock_summary, 'Company-wise Stock Summary'),
}
REPORTS = [(k, l, code, f, perm) for code, _, items in CATEGORIES for it in items if it for k, l, f, perm in [it]]
REPORT_PERM = {r[0]: r[4] for r in REPORTS}
RUNNERS = {k: _EXTRA.get(k) or globals()[f'r_{k}'] for k, *_ in REPORTS}


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def report_catalog(request):
    from .trade_perms import allowed
    out = []
    for code, label, items in CATEGORIES:
        rs = [None if it is None else {'key': it[0], 'label': it[1], 'filters': it[2]}
              for it in items if it is None or allowed(request.user, f'{it[3]}.print')]
        while rs and rs[-1] is None:
            rs.pop()
        if any(rs):
            out.append({'code': code, 'label': label, 'reports': rs})
    return Response(out)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def report_run(request):
    from .trade_perms import allowed
    t = request.query_params.get('type')
    if t not in RUNNERS:
        return Response({'detail': 'Choose the report.'}, status=400)
    if not allowed(request.user, f'{REPORT_PERM[t]}.print'):
        return Response({'detail': 'You do not have permission to print this report.'}, status=403)
    return Response(RUNNERS[t](Ctx(request)))
