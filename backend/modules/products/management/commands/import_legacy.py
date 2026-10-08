"""
Import master data from the legacy "Trade 2.1" Access DB (dumped to CSV).

Reads CSVs produced by `mdb-export` (headers included) and loads:
  Company, Category, District/AreaMain/Area, Products (+ Stock + expiry/qty from
  CompBatchStock), Customers (Accounts 3L=1202), Suppliers (Accounts 3L=2201).

Idempotent: re-running updates existing rows (matched on natural keys), so it is
safe to run repeatedly. Everything is scoped to one tenant + one warehouse.

Usage:
  python manage.py import_legacy --dir /tmp/legacy_dump [--tenant admin] [--warehouse "Main Store"]
"""
import csv
import os
from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction

from modules.company.models import Company, Area, AccountGroup, LedgerAccount
from modules.customer.models import Customer
from modules.supplier.models import Supplier
from modules.inventory.models import Warehouse, Stock
from modules.products.models import Category, Product, ProductBatch, SupplierProduct

User = get_user_model()

LEGACY_SALE_NOTE = 'Legacy Trade 2.1 sale (imported history)'
CUSTOMER_GROUP = '1202'   # Accounts Receivables
SUPPLIER_GROUP = '2201'   # Account Payables


def rows(dir_path, name):
    path = os.path.join(dir_path, f'{name}.csv')
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8', errors='replace') as f:
        return list(csv.DictReader(f))


def clean(v):
    return (v or '').strip()


def to_int(v, default=0):
    try:
        return int(float(clean(v)))
    except (ValueError, TypeError):
        return default


def to_dec(v, default=Decimal('0')):
    try:
        return Decimal(str(clean(v) or '0'))
    except (InvalidOperation, ValueError, TypeError):
        return default


def to_date(v):
    """Legacy dates are YYYYMMDD integers (e.g. 20261230). 0/blank -> None."""
    s = clean(v)
    if not s or s in ('0', '00000000'):
        return None
    try:
        n = int(float(s))
    except (ValueError, TypeError):
        return None
    if n < 19000101 or n > 29991231:
        return None
    try:
        return date(n // 10000, (n // 100) % 100, n % 100)
    except ValueError:
        return None


class Command(BaseCommand):
    help = 'Import legacy Trade 2.1 master data from mdb-export CSVs.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', default='/tmp/legacy_dump')
        parser.add_argument('--tenant', default=None, help='Username of the owning admin (default: first superuser)')
        parser.add_argument('--warehouse', default='Main Store')
        parser.add_argument('--accounts-only', action='store_true',
                            help='Only import the Chart of Accounts (MainAccount/Accounts2L/Accounts3L/'
                                 'Accounts) and link existing customers/suppliers; products, stock '
                                 'and parties are left untouched.')
        parser.add_argument('--sales-only', action='store_true',
                            help='Only import the legacy sales history (SaleAmount + Sale) as settled, '
                                 'delivered invoices. Stock, balances and the income ledger are untouched.')

    @transaction.atomic
    def handle(self, *args, **opts):
        d = opts['dir']
        if not os.path.isdir(d):
            raise CommandError(f'Dump dir not found: {d}')

        tenant = (User.objects.filter(username=opts['tenant']).first() if opts['tenant']
                  else User.objects.filter(is_superuser=True).order_by('id').first())
        if not tenant:
            raise CommandError('No tenant user found (need a superuser or --tenant).')
        self.stdout.write(f'Tenant: {tenant.username} (id={tenant.id})')

        warehouse, _ = Warehouse.objects.get_or_create(
            tenant=tenant, name=opts['warehouse'],
            defaults={'location': 'Imported', 'is_active': True},
        )

        # ── Companies ──
        comp_map = {}
        for r in rows(d, 'Company'):
            name = clean(r.get('CompName'))
            if not name:
                continue
            code = to_int(r.get('CompID'), 0) or None
            obj, _ = Company.objects.get_or_create(tenant=tenant, name=name, defaults={'code': code})
            if code and obj.code != code and not Company.objects.filter(tenant=tenant, code=code).exists():
                obj.code = code
                obj.save(update_fields=['code'])
            comp_map[clean(r.get('CompID'))] = obj
        self.stdout.write(f'Companies: {len(comp_map)}')

        # ── Categories ──
        cat_map = {}
        for r in rows(d, 'Category'):
            name = clean(r.get('CategName'))
            if not name:
                continue
            obj, _ = Category.objects.get_or_create(tenant=tenant, name=name)
            cat_map[clean(r.get('CategID'))] = obj
        self.stdout.write(f'Categories: {len(cat_map)}')

        # ── Areas (District > AreaMain > Area) ──
        dist_map, marea_map, area_map = {}, {}, {}
        for r in rows(d, 'District'):
            name = clean(r.get('DistName'))
            if not name:
                continue
            obj, _ = Area.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={'code': f"D{clean(r.get('DistID'))}"})
            dist_map[clean(r.get('DistID'))] = obj
        for r in rows(d, 'AreaMain'):
            name = clean(r.get('MAreaName'))
            if not name:
                continue
            parent = dist_map.get(clean(r.get('DistID')))
            obj, _ = Area.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={'code': f"M{clean(r.get('MAreaID'))}", 'parent': parent})
            marea_map[clean(r.get('MAreaID'))] = obj
        for r in rows(d, 'Area'):
            name = clean(r.get('AreaName'))
            if not name:
                continue
            parent = marea_map.get(clean(r.get('MAreaID')))
            obj, _ = Area.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={'code': f"A{clean(r.get('AreaID'))}", 'parent': parent})
            area_map[clean(r.get('AreaID'))] = obj
        self.stdout.write(f'Areas: districts={len(dist_map)} main={len(marea_map)} areas={len(area_map)}')

        if opts['accounts_only']:
            self._import_chart(d, tenant, area_map)
            self.stdout.write(self.style.SUCCESS('IMPORT_OK'))
            return
        if opts['sales_only']:
            self._import_sales(d, tenant)
            self.stdout.write(self.style.SUCCESS('IMPORT_OK'))
            return

        # ── CompBatchStock → per-product qty / expiry / prices ──
        batch = {}  # PID -> dict(qty, exp, cost, sale, retail, createdt)
        batch_rows = {}  # PID -> [ProductBatch kwargs] (one per legacy batch)
        for r in rows(d, 'CompBatchStock'):
            pid = clean(r.get('PID'))
            if not pid:
                continue
            qty = to_dec(r.get('Qty'))
            exp = to_date(r.get('ExpDate'))
            cdt = to_int(r.get('CreateDt'))
            b = batch.setdefault(pid, {'qty': Decimal('0'), 'exp': None,
                                       'cost': Decimal('0'), 'sale': Decimal('0'),
                                       'retail': Decimal('0'), 'cdt': -1})
            b['qty'] += qty
            batch_rows.setdefault(pid, []).append(dict(
                expiry_date=exp, quantity=int(qty),
                cost_price=to_dec(r.get('UPRate')), selling_price=to_dec(r.get('USRate')),
                retail_price=to_dec(r.get('URRate'))))
            if exp and (b['exp'] is None or exp < b['exp']):
                b['exp'] = exp
            # Latest batch row wins for the representative prices.
            if cdt >= b['cdt']:
                b['cdt'] = cdt
                b['cost'] = to_dec(r.get('UPRate'))
                b['sale'] = to_dec(r.get('USRate'))
                b['retail'] = to_dec(r.get('URRate'))
        self.stdout.write(f'Batches aggregated for {len(batch)} products')

        # ── Products (SupplierProduct + Stock + Product) ──
        n_prod = n_batch = 0
        seen_barcodes = set()  # legacy barcodes aren't unique; keep first, null dupes
        for r in rows(d, 'Product'):
            pid = clean(r.get('PID'))
            name = clean(r.get('ProdName'))
            if not pid or not name:
                continue
            company = comp_map.get(clean(r.get('CompID')))
            category = cat_map.get(clean(r.get('CategID')))
            barcode = clean(r.get('BarCode'))
            barcode = barcode if barcode and barcode != '-' else None
            if barcode and barcode in seen_barcodes:
                barcode = None
            if barcode:
                seen_barcodes.add(barcode)
            min_qty = to_int(r.get('MinQty'), 10)
            packing = max(1, to_int(r.get('Packing'), 1))
            status = 'ACTIVE' if clean(r.get('ProdStatus')).lower().startswith('activ') else 'INACTIVE'
            exp_apply = clean(r.get('ExpApply')).lower().startswith('y')
            b = batch.get(pid, {})
            qty = int(b.get('qty') or 0)
            cost = b.get('cost') or Decimal('0')
            sale = b.get('sale') or Decimal('0')
            retail = b.get('retail') or None
            exp = b.get('exp')

            sp, _ = SupplierProduct.objects.update_or_create(
                sku=pid,
                defaults=dict(name=name, barcode=barcode, company=company, category=category,
                              price=sale, cost_price=cost, retail_price=retail or 0,
                              quantity=qty, status=status, is_approved=True),
            )
            stock = (Stock.objects.filter(tenant=tenant, warehouse=warehouse, product=sp).first())
            if stock:
                stock.total_quantity = qty
                stock.items_per_carton = packing
                stock.price_per_item = cost
                stock.category = category
                stock.save()
            else:
                stock = Stock.objects.create(
                    tenant=tenant, warehouse=warehouse, product=sp, product_name=name,
                    category=category, purchase_type='single', total_quantity=qty,
                    items_per_carton=packing,
                    price_per_item=cost, date=date.today(), created_by=tenant)

            product, _ = Product.objects.update_or_create(
                tenant=tenant, warehouse=warehouse, sku=pid,
                defaults=dict(stock=stock, product_name=name, category=category,
                              cost_price=cost, selling_price=sale or 0,
                              original_price=retail, min_count=min_qty,
                              total_quantity=qty, barcode=barcode, status=status,
                              expiry_date=exp, expiry_apply=exp_apply),
            )
            # Batches are replaced wholesale so re-runs stay idempotent.
            product.batches.all().delete()
            ProductBatch.objects.bulk_create(
                [ProductBatch(product=product, **kw) for kw in batch_rows.get(pid, [])])
            n_batch += len(batch_rows.get(pid, []))
            n_prod += 1
        self.stdout.write(f'Products: {n_prod}  Batches: {n_batch}')

        # ── Parties from Accounts ──
        n_cust = n_sup = 0
        for r in rows(d, 'Accounts'):
            grp = clean(r.get('Acc3LID'))
            name = clean(r.get('AccName'))
            acc = clean(r.get('AccID'))
            if not name or not acc:
                continue
            phone = clean(r.get('CellNo'))
            phone = '' if phone in ('-', '0') else phone
            active = clean(r.get('AccStatus')).lower().startswith('activ')
            if grp == CUSTOMER_GROUP:
                Customer.objects.update_or_create(
                    username=f'cust{acc}',
                    defaults=dict(email=f'cust{acc}@legacy.local', password=make_password(None),
                                  first_name=name[:100], phone=phone[:20],
                                  area=area_map.get(clean(r.get('AreaID'))),
                                  tenant=tenant, created_by=tenant,
                                  status='active' if active else 'inactive',
                                  is_active=active),
                )
                n_cust += 1
            elif grp == SUPPLIER_GROUP:
                Supplier.objects.update_or_create(
                    tenant=tenant, name=name,
                    defaults=dict(contact_person=clean(r.get('ContactPerson')) or None,
                                  phone=phone or None,
                                  status='active' if active else 'inactive',
                                  is_active=active),
                )
                n_sup += 1
        self.stdout.write(f'Customers: {n_cust}  Suppliers: {n_sup}')

        self._import_chart(d, tenant, area_map)
        self._import_sales(d, tenant)
        self.stdout.write(self.style.SUCCESS('IMPORT_OK'))

    def _import_sales(self, d, tenant):
        """Legacy sales history (SaleAmount = invoice header, Sale = lines) as
        DELIVERED, fully-PAID orders keeping their legacy numbers (S23000079 …).

        History only: rows are bulk-inserted, so no stock is deducted (current
        stock already reflects these sales) and no income-ledger entries are
        booked (the order post_save hook is skipped). Marked as PAID so they
        don't change customers' Prev. Bal. Re-running replaces them."""
        from datetime import datetime, time
        from decimal import Decimal
        from django.utils import timezone
        from modules.sales.models import Order, OrderItem, SalesStaff

        # Salemen (legacy Staff) — matched on their legacy id.
        staff = {}
        for r in rows(d, 'Staff'):
            sid_ = to_int(r.get('StaffID'), None)
            name = clean(r.get('StaffName'))
            if sid_ is None or not name:
                continue
            cell = clean(r.get('StaffCell'))
            obj, _ = SalesStaff.objects.update_or_create(
                tenant=tenant, legacy_id=sid_,
                defaults=dict(name=name[:120], cell='' if cell in ('0', '-') else cell[:40],
                              status='active' if clean(r.get('StaffStatus')).lower().startswith('activ') else 'inactive'))
            staff[str(sid_)] = obj
        if staff:
            self.stdout.write(f'Staff: {len(staff)}')

        headers = rows(d, 'SaleAmount')
        if not headers:
            self.stdout.write('Sales: no SaleAmount.csv - skipped')
            return
        lines = {}
        for r in rows(d, 'Sale'):
            lines.setdefault(clean(r.get('SaleID')), []).append(r)

        products = {p.sku: p for p in Product.objects.filter(tenant=tenant).exclude(sku__isnull=True)}
        customers = {c.username[4:]: c for c in Customer.objects.filter(username__startswith='cust')}
        ids = [clean(h.get('SaleID')) for h in headers if clean(h.get('SaleID'))]

        # Replace earlier imports of these invoices; never touch an order made
        # in the new system that happens to share a number.
        Order.objects.filter(tracking_id__in=ids, notes=LEGACY_SALE_NOTE).delete()
        taken = set(Order.objects.filter(tracking_id__in=ids).values_list('tracking_id', flat=True))

        def money(v):
            d = v if isinstance(v, Decimal) else to_dec(v)
            return Decimal(str(round(float(d), 2)))

        orders, dates, n_missing = [], {}, 0
        for h in headers:
            sid = clean(h.get('SaleID'))
            if not sid or sid in taken:
                continue
            cust = customers.get(clean(h.get('AccID')))
            sd = to_date(h.get('SaleDate')) or to_date(h.get('CreateDt')) or date.today()
            gross = to_dec(h.get('Amount'))
            net = gross - to_dec(h.get('DisPAmt')) - to_dec(h.get('DiscAAmt'))
            when = timezone.make_aware(datetime.combine(sd, time(12, 0)))
            orders.append(Order(
                tracking_id=sid, customer=cust,
                customer_name=(cust.first_name if cust else f"Account {clean(h.get('AccID'))}")[:100],
                phone_number=((cust.phone if cust else '') or 'N/A')[:20], shipping_address='-',
                notes=LEGACY_SALE_NOTE, status='DELIVERED', payment_method='SHOP',
                payment_status='PAID', total_amount=money(net), amount_paid=money(net),
                discount=money(h.get('DiscAAmt')), sale_date=sd, delivered_at=when, tenant=tenant,
                staff=staff.get(clean(h.get('StaffID'))),
                prev_balance=money(h.get('PreBal')), paid_at_sale=money(h.get('PaidCash')),
            ))
            dates[sid] = when
        Order.objects.bulk_create(orders, batch_size=500)

        by_id = dict(Order.objects.filter(tracking_id__in=[o.tracking_id for o in orders])
                     .values_list('tracking_id', 'id'))
        items = []
        for sid, oid in by_id.items():
            for r in lines.get(sid, []):
                qty = max(0, to_int(r.get('Qty')))
                price = float(to_dec(r.get('USRate')))
                disc = qty * price * float(to_dec(r.get('DiscP'))) / 100
                prod = products.get(clean(r.get('PID')))
                if not prod:
                    n_missing += 1
                items.append(OrderItem(
                    order_id=oid, product=prod, quantity=qty,
                    bonus_quantity=max(0, to_int(r.get('QtyTo'))),
                    price=Decimal(str(round(price, 2))), discount=Decimal(str(round(disc, 2))),
                    cost_price=money(r.get('UPRate')), expiry_date=to_date(r.get('ExpDate')),
                ))
        OrderItem.objects.bulk_create(items, batch_size=1000)

        # Order the history by the real sale date, not the import time.
        for sid, oid in by_id.items():
            Order.objects.filter(id=oid).update(created_at=dates[sid])
        self.stdout.write(f'Sales: invoices={len(by_id)} lines={len(items)} '
                          f'(skipped existing={len(taken)}, lines without product={n_missing})')
        self._import_sale_returns(d, tenant, products, customers, staff, money)

    def _import_sale_returns(self, d, tenant, products, customers, staff, money):
        """Legacy sale returns (SaleRetAmount + SaleReturn, T-series) as history
        (kind='legacy'): no restock and no effect on balances. New returns carry
        on from the last legacy number."""
        from decimal import Decimal
        from modules.sales.models import TradeSaleReturn, TradeSaleReturnItem
        headers = rows(d, 'SaleRetAmount')
        if not headers:
            return
        lines = {}
        for r in rows(d, 'SaleReturn'):
            lines.setdefault(clean(r.get('SaleRetID')), []).append(r)
        ids = [clean(h.get('SaleRetID')) for h in headers if clean(h.get('SaleRetID'))]
        TradeSaleReturn.objects.filter(return_no__in=ids, kind='legacy').delete()
        taken = set(TradeSaleReturn.objects.filter(return_no__in=ids).values_list('return_no', flat=True))
        rets = []
        for h in headers:
            rid = clean(h.get('SaleRetID'))
            if not rid or rid in taken:
                continue
            cust = customers.get(clean(h.get('AccID')))
            gross = to_dec(h.get('Amount'))
            disc = to_dec(h.get('DisPAmt'))
            rets.append(TradeSaleReturn(
                return_no=rid, kind='legacy', customer=cust,
                customer_name=(cust.first_name if cust else f"Account {clean(h.get('AccID'))}")[:150],
                staff=staff.get(clean(h.get('StaffID'))),
                return_date=to_date(h.get('SaleDate')) or to_date(h.get('CreateDt')) or date.today(),
                gross=money(gross), discount=money(disc),
                net_amount=money(gross - disc - to_dec(h.get('DiscAAmt'))),
                less_amount=money(h.get('DiscAAmt')), cash_returned=money(h.get('PaidCash')),
                prev_balance=money(h.get('PreBal')), notes='Legacy Trade 2.1 sale return (imported history)',
                tenant=tenant,
            ))
        TradeSaleReturn.objects.bulk_create(rets, batch_size=500)
        by_no = dict(TradeSaleReturn.objects.filter(return_no__in=[r.return_no for r in rets])
                     .values_list('return_no', 'id'))
        items = []
        for rid, pk in by_no.items():
            for r in lines.get(rid, []):
                qty = max(0, to_int(r.get('Qty')))
                price = float(to_dec(r.get('USRate')))
                pct = float(to_dec(r.get('DiscP')))
                items.append(TradeSaleReturnItem(
                    sale_return_id=pk, product=products.get(clean(r.get('PID'))),
                    expiry_date=to_date(r.get('ExpDate')), quantity=qty,
                    bonus_quantity=max(0, to_int(r.get('QtyTo'))),
                    price=Decimal(str(round(price, 2))), retail=money(r.get('URRate')),
                    disc_pct=Decimal(str(round(pct, 2))),
                    discount=Decimal(str(round(qty * price * pct / 100, 2))),
                    cost_price=money(r.get('UPRate')),
                ))
        TradeSaleReturnItem.objects.bulk_create(items, batch_size=1000)
        self.stdout.write(f'Sale returns: {len(by_no)} lines={len(items)} (skipped existing={len(taken)})')

    def _import_chart(self, d, tenant, area_map):
        """Chart of Accounts: the three heading levels, then every legacy account,
        linked to its Customer (1202) / Supplier (2201) record when one exists."""
        groups = {}
        for level, name, code_col, name_col, parent_col in (
                (1, 'MainAccount', 'MainAccID', 'MainAccName', None),
                (2, 'Accounts2L', 'SubAccID', 'SubAccName', 'MainAccID'),
                (3, 'Accounts3L', 'Acc3LID', 'Acc3LName', 'SubAccID')):
            for r in rows(d, name):
                code = to_int(r.get(code_col), None)
                if code is None:
                    continue
                parent = groups.get(to_int(r.get(parent_col), None)) if parent_col else None
                obj, _ = AccountGroup.objects.update_or_create(
                    tenant=tenant, code=code,
                    defaults=dict(name=clean(r.get(name_col))[:150], level=level, parent=parent))
                groups[code] = obj

        n_acc = 0
        for r in rows(d, 'Accounts'):
            acc = clean(r.get('AccID'))
            name = clean(r.get('AccName'))
            group = groups.get(to_int(r.get('Acc3LID'), None))
            if not acc or not name or not group:
                continue
            cell = clean(r.get('CellNo'))
            cell = '' if cell in ('-', '0') else cell
            contact = clean(r.get('ContactPerson'))
            contact = '' if contact in ('-', '0') else contact
            active = clean(r.get('AccStatus')).lower().startswith('activ')
            customer = (Customer.objects.filter(username=f'cust{acc}').first()
                        if group.code == int(CUSTOMER_GROUP) else None)
            supplier = (Supplier.objects.filter(tenant=tenant, name=name).first()
                        if group.code == int(SUPPLIER_GROUP) else None)
            # Supplier links are one-to-one; legacy can repeat a supplier name.
            if supplier and LedgerAccount.objects.filter(supplier=supplier).exclude(tenant=tenant, acc_id=acc).exists():
                supplier = None
            LedgerAccount.objects.update_or_create(
                tenant=tenant, acc_id=acc,
                defaults=dict(name=name[:255], group=group, area=area_map.get(clean(r.get('AreaID'))),
                              cell_no=cell[:40], contact_person=contact[:150],
                              status='active' if active else 'inactive',
                              customer=customer, supplier=supplier))
            n_acc += 1
        self.stdout.write(f'Chart of Accounts: groups={len(groups)} accounts={n_acc}')
