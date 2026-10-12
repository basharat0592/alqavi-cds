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

from django.db.models import Q
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

def _ledger(ctx, upto=None, since=None):
    """Every entry (date, voucher_no, account, detail, debit, credit, staff_id) — vouchers plus the
    sales / returns made in this system (they post no voucher)."""
    from modules.company.models import LedgerAccount
    from .models import VoucherLine, Order, OrderItem, TradeSaleReturn, TradeSaleReturnItem
    accs = {a.acc_id: a for a in ctx.scope(LedgerAccount.objects.all()).select_related('group')}
    out = []
    lines = ctx.scope(VoucherLine.objects.all(), 'voucher__tenant')
    if upto:
        lines = lines.filter(voucher__date__lte=upto)
    if since:
        lines = lines.filter(voucher__date__gte=since)
    by_pk = {a.pk: a for a in accs.values()}
    for d, no, vdet, st, aid, det, dr, cr in lines.order_by('voucher__date', 'voucher_id', 'line').values_list(
            'voucher__date', 'voucher__voucher_no', 'voucher__detail', 'voucher__staff_id', 'account_id', 'detail', 'debit', 'credit'):
        a = by_pk.get(aid)
        if a is not None:
            out.append((d, no, a, det or vdet, _d(dr), _d(cr), st))
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
    entries = [e for e in _ledger(ctx, upto=ctx.dto) if e[2].pk == acc.pk]
    bal = Z
    for d, no, a, det, dr, cr, st in entries:
        if ctx.dfrom and d < ctx.dfrom:
            opening += dr - cr
            continue
        if not rows:
            bal = opening
            rows.append(R('', '', 'Opening Balance', '', '', _f(abs(opening)) if opening else '0', 'Dr' if opening >= 0 else 'Cr'))
        bal += dr - cr
        rows.append(R(_dmy(d), no, det, _f(dr) if dr else '', _f(cr) if cr else '', _f(abs(bal)), 'Dr' if bal >= 0 else 'Cr'))
    if not rows:
        rows.append(R('', '', 'Opening Balance', '', '', _f(abs(opening)), 'Dr' if opening >= 0 else 'Cr')); bal = opening
    td = sum(_d(r['c'][3] or 0) for r in rows); tc = sum(_d(r['c'][4] or 0) for r in rows)
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


RUNNERS = {k: globals()[f'r_{k}'] for k, *_ in REPORTS}


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def report_catalog(request):
    from .trade_perms import allowed
    return Response([{'key': k, 'label': l, 'group': g, 'filters': f} for k, l, g, f, perm in REPORTS
                     if allowed(request.user, f'{perm}.print')])


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def report_run(request):
    from .trade_perms import allowed
    t = request.query_params.get('type')
    if t not in RUNNERS:
        return Response({'detail': 'Choose the Report Type.'}, status=400)
    if not allowed(request.user, f'{REPORT_PERM[t]}.print'):
        return Response({'detail': 'You do not have permission to print this report.'}, status=403)
    return Response(RUNNERS[t](Ctx(request)))
