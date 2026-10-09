"""Trade 1.0 Receipt Voucher.

A receipt credits each "Receipt From" account and debits the "Receipt as"
account (cash / bank) with the total. Money received from a customer is applied
to that customer's unpaid sale invoices, oldest first, as confirmed
installments — exactly how cash paid at a sale is recorded — so their balance,
Sale Records and the ledger report all follow. Anything beyond what they owe
stays on the voucher line as unallocated credit and is taken off their balance.
"""
import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Q, Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.scoping import scope_to_tenant, tenant_id_for
from .models import Order, SalesStaff, Voucher, VoucherLine

Z = Decimal('0')
# Last receipt voucher number in the legacy Trade data; new ones follow it.
LEGACY_LAST_VOUCHER = 'V26001719'


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Z


def customer_voucher_credit(customer_id, user):
    """Receipts from this customer that were more than they owed at the time."""
    qs = scope_to_tenant(user, VoucherLine.objects.filter(account__customer_id=customer_id), 'voucher__tenant')
    return qs.aggregate(t=Sum('unallocated'))['t'] or Z


def account_balance(acc, user):
    """Balance shown beside an account: a customer's dues (as on the sale
    invoice); any other account, debits less credits of its voucher lines."""
    if acc.customer_id:
        from .trade_returns import customer_return_credit
        total = Z
        orders = scope_to_tenant(user, Order.objects.filter(customer_id=acc.customer_id)
                                 .exclude(status__in=['CANCELLED', 'REJECTED']), 'tenant')
        for o in orders.only('total_amount', 'amount_paid'):
            rem = _d(o.total_amount) - _d(o.amount_paid)
            if rem > 0:
                total += rem
        return total - customer_return_credit(acc.customer_id, user) - customer_voucher_credit(acc.customer_id, user)
    if acc.supplier_id:
        # What we still owe the supplier on their purchases (positive = payable).
        from .models import PurchaseOrder
        owed = Z
        for po in scope_to_tenant(user, PurchaseOrder.objects.filter(supplier_id=acc.supplier_id)
                                  .exclude(status__in=['CANCELLED', 'REJECTED']), 'tenant').only('total_amount', 'paid_amount'):
            rem = _d(po.total_amount) - _d(po.paid_amount)
            if rem > 0:
                owed += rem
        extra = VoucherLine.objects.filter(account=acc, voucher__legacy=False).aggregate(u=Sum('unallocated'))['u'] or Z
        return owed - extra
    agg = VoucherLine.objects.filter(account=acc).aggregate(d=Sum('debit'), c=Sum('credit'))
    return (agg['d'] or Z) - (agg['c'] or Z)


def _allocate_to_purchases(supplier_id, amount, voucher, user, method):
    """Settle the supplier's unpaid purchases (oldest first); returns the rest."""
    from modules.payments.models import TransactionPayment
    from modules.payments import services
    from .models import PurchaseOrder
    left = amount
    pos = (scope_to_tenant(user, PurchaseOrder.objects.filter(supplier_id=supplier_id)
                           .exclude(status__in=['CANCELLED', 'REJECTED']), 'tenant').order_by('order_date', 'id'))
    for po in pos.select_for_update():
        if left <= 0:
            break
        due = _d(po.total_amount) - _d(po.paid_amount)
        if due <= 0:
            continue
        had = services.confirmed_paid_total('purchaseorder', po.id)
        if _d(po.paid_amount) > had:
            base = TransactionPayment.objects.create(
                source_type='purchaseorder', source_id=str(po.id), amount=_d(po.paid_amount) - had, method='cash',
                paid_at=po.updated_at, reference=po.purchase_number, note='Paid at purchase', status='confirmed',
                direction='outbound', created_by=user if user.is_staff else None,
                warehouse_id=po.warehouse_id, tenant_id=getattr(po, 'tenant_id', None))
            services.record_installment(base)
        pay = min(due, left)
        tp = TransactionPayment.objects.create(
            source_type='purchaseorder', source_id=str(po.id), amount=pay, method=method,
            paid_at=datetime.datetime.combine(voucher.date, datetime.time(12, 0)),
            reference=voucher.voucher_no, note=f'Payment Voucher {voucher.voucher_no}', status='confirmed',
            direction='outbound', created_by=user if user.is_staff else None,
            warehouse_id=po.warehouse_id, tenant_id=getattr(po, 'tenant_id', None))
        services.record_installment(tp)
        left -= pay
    return left


def _allocate_to_orders(customer_id, amount, voucher, user, method):
    """Settle the customer's unpaid sale invoices (oldest first). Returns what
    could not be applied."""
    from modules.payments.models import TransactionPayment
    from modules.payments import services
    left = amount
    orders = (scope_to_tenant(user, Order.objects.filter(customer_id=customer_id)
                              .exclude(status__in=['CANCELLED', 'REJECTED']), 'tenant')
              .order_by('sale_date', 'created_at'))
    for o in orders.select_for_update():
        if left <= 0:
            break
        due = _d(o.total_amount) - _d(o.amount_paid)
        if due <= 0:
            continue
        # An order paid without installments: record what it already had first,
        # so recomputing it from installments keeps that money.
        had = services.confirmed_paid_total('order', o.id)
        if _d(o.amount_paid) > had:
            base = TransactionPayment.objects.create(
                source_type='order', source_id=str(o.id), amount=_d(o.amount_paid) - had, method='cash',
                paid_at=o.created_at, reference=o.tracking_id, note='Paid at sale', status='confirmed',
                direction='inbound', created_by=user if user.is_staff else None,
                warehouse_id=o.warehouse_id, tenant_id=o.tenant_id)
            services.record_installment(base)
        pay = min(due, left)
        tp = TransactionPayment.objects.create(
            source_type='order', source_id=str(o.id), amount=pay, method=method,
            paid_at=datetime.datetime.combine(voucher.date, datetime.time(12, 0)),
            reference=voucher.voucher_no, note=f'Receipt Voucher {voucher.voucher_no}', status='confirmed',
            direction='inbound', created_by=user if user.is_staff else None,
            warehouse_id=o.warehouse_id, tenant_id=o.tenant_id)
        services.record_installment(tp)
        left -= pay
    return left


class VoucherViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _qs(self):
        return scope_to_tenant(self.request.user, Voucher.objects.all(), 'tenant')

    @staticmethod
    def next_no(date=None):
        """V + 2-digit year + 6-digit sequence, continuing the legacy numbers."""
        yy = (date or datetime.date.today()).strftime('%y')
        prefix = f'V{yy}'
        last = Voucher.objects.filter(voucher_no__startswith=prefix).aggregate(m=Max('voucher_no'))['m']
        nums = [int(x[3:]) for x in (last, LEGACY_LAST_VOUCHER) if x and x.startswith(prefix) and x[3:].isdigit()]
        return f'{prefix}{(max(nums) if nums else 0) + 1:06d}'

    @action(detail=False, methods=['get'])
    def next_voucher_no(self, request):
        return Response({'voucher_no': self.next_no()})

    @action(detail=False, methods=['get'])
    def balance(self, request):
        from modules.company.models import LedgerAccount
        acc = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant') \
            .filter(pk=request.query_params.get('account')).first()
        if not acc:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'balance': account_balance(acc, request.user)})

    def create(self, request):
        if request.data.get('vtype') == 'payment':
            return self._create_payment(request)
        return self._create_receipt(request)

    def _create_payment(self, request):
        """Payment voucher. Body: {vtype:'payment', date?, pay_to, pay_from, amount,
        staff?, detail?}. Debits Payment to (supplier / expense / customer ...),
        credits Payment from (cash / bank). Paying a supplier settles their
        unpaid purchases; paying a customer adds to what they owe."""
        from modules.company.models import LedgerAccount
        d = request.data
        accounts = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant')
        to = accounts.filter(pk=d.get('pay_to')).first() if d.get('pay_to') else None
        frm = accounts.filter(pk=d.get('pay_from')).first() if d.get('pay_from') else None
        amt = _d(d.get('amount')).quantize(Decimal('0.01'))
        if not to:
            return Response({'detail': 'Choose the Payment to account.'}, status=400)
        if not frm:
            return Response({'detail': 'Choose the Payment from account (cash / bank).'}, status=400)
        if to.pk == frm.pk:
            return Response({'detail': 'Payment to and Payment from cannot be the same account.'}, status=400)
        if amt <= 0:
            return Response({'detail': 'Enter the amount.'}, status=400)
        try:
            vdate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if vdate > datetime.date.today():
            return Response({'detail': 'The voucher date cannot be in the future.'}, status=400)
        staff = SalesStaff.objects.filter(pk=d.get('staff')).first() if d.get('staff') else None
        detail = str(d.get('detail') or '').strip()[:255]
        method = 'cash' if frm.name.lower().startswith('cash') else 'bank_transfer'
        tid = tenant_id_for(request.user) or frm.tenant_id
        with transaction.atomic():
            v = Voucher.objects.create(voucher_no=self.next_no(vdate), vtype='payment', date=vdate, staff=staff,
                                       detail=detail, total=amt, created_by=request.user, tenant_id=tid)
            unalloc = Z
            if to.supplier_id:
                unalloc = _allocate_to_purchases(to.supplier_id, amt, v, request.user, method)
            elif to.customer_id:
                unalloc = -amt  # money paid out to a customer is owed back by them
            VoucherLine.objects.create(voucher=v, line=1, account=to, debit=amt, unallocated=unalloc,
                                       detail=detail or f'Paid to {to.name}')
            VoucherLine.objects.create(voucher=v, line=2, account=frm, credit=amt, detail=detail or f'Payment {v.voucher_no}')
        return Response({'id': v.id, 'voucher_no': v.voucher_no, 'total': amt}, status=status.HTTP_201_CREATED)

    def _create_receipt(self, request):
        """Receipt voucher. Body: {date?, receipt_as (cash/bank account id), staff?,
        chq_no?, chq_date?, bank?, detail?, lines: [{account, amount}]}"""
        from modules.company.models import LedgerAccount
        d = request.data
        accounts = scope_to_tenant(request.user, LedgerAccount.objects.all(), 'tenant')
        cash = accounts.filter(pk=d.get('receipt_as')).first() if d.get('receipt_as') else None
        if not cash:
            return Response({'detail': 'Choose the account the money is received in (Receipt as).'}, status=400)
        lines = []
        for x in d.get('lines') or []:
            acc = accounts.filter(pk=x.get('account')).first()
            amt = _d(x.get('amount')).quantize(Decimal('0.01'))
            if not acc:
                return Response({'detail': 'One of the Receipt From accounts was not found.'}, status=400)
            if amt <= 0:
                return Response({'detail': f'Enter an amount for {acc.name}.'}, status=400)
            if acc.pk == cash.pk:
                return Response({'detail': 'Receipt From and Receipt as cannot be the same account.'}, status=400)
            lines.append((acc, amt))
        if not lines:
            return Response({'detail': 'Add at least one Receipt From account with an amount.'}, status=400)
        try:
            vdate = datetime.date.fromisoformat(str(d.get('date'))[:10]) if d.get('date') else datetime.date.today()
            chq_date = datetime.date.fromisoformat(str(d.get('chq_date'))[:10]) if d.get('chq_date') else None
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)
        if vdate > datetime.date.today():
            return Response({'detail': 'The voucher date cannot be in the future.'}, status=400)
        chq_no = str(d.get('chq_no') or '').strip()[:40]
        method = 'cheque' if chq_no else ('bank_transfer' if cash.group_id and str(cash.acc_id).startswith('1204') and not cash.name.lower().startswith('cash') else 'cash')
        staff = SalesStaff.objects.filter(pk=d.get('staff')).first() if d.get('staff') else None
        detail = str(d.get('detail') or '').strip()[:255]
        total = sum((a for _, a in lines), Z)
        tid = tenant_id_for(request.user) or cash.tenant_id
        with transaction.atomic():
            v = Voucher.objects.create(
                voucher_no=self.next_no(vdate), vtype='receipt', date=vdate, staff=staff,
                chq_no=chq_no, chq_date=chq_date, bank=str(d.get('bank') or '').strip()[:80], detail=detail,
                total=total, created_by=request.user, tenant_id=tid)
            for i, (acc, amt) in enumerate(lines, 1):
                left = _allocate_to_orders(acc.customer_id, amt, v, request.user, method) if acc.customer_id else Z
                VoucherLine.objects.create(voucher=v, line=i, account=acc, credit=amt, unallocated=left if acc.customer_id else Z,
                                           detail=detail or f'Received from {acc.name}')
            VoucherLine.objects.create(voucher=v, line=len(lines) + 1, account=cash, debit=total,
                                       detail=detail or f'Receipt {v.voucher_no}')
        return Response({'id': v.id, 'voucher_no': v.voucher_no, 'total': total}, status=status.HTTP_201_CREATED)

    def list(self, request):
        """View Receipt Voucher Detail: ?voucher_no=, ?date_from=, ?date_to= — one row per line."""
        p = request.query_params
        qs = self._qs().filter(vtype=p.get('vtype') or 'receipt')
        if p.get('account'):
            qs = qs.filter(lines__account_id=p['account']).distinct()
        if p.get('voucher_no'):
            qs = qs.filter(voucher_no__icontains=p['voucher_no'].strip())
        if p.get('date_from'):
            qs = qs.filter(date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(date__lte=p['date_to'])
        rows = []
        ids = list(qs.order_by('-date', '-id').values_list('id', flat=True)[:2000])
        for ln in (VoucherLine.objects.filter(voucher_id__in=ids)
                   .select_related('voucher__staff', 'account').order_by('-voucher__date', '-voucher__id', 'line')):
            v = ln.voucher
            rows.append({
                'voucher_id': v.id, 'voucher_no': v.voucher_no, 'date': v.date, 'line': ln.line,
                'acc_id': ln.account.acc_id, 'account': ln.account.name, 'detail': ln.detail,
                'chq_no': v.chq_no, 'chq_date': v.chq_date, 'bank': v.bank,
                'staff': v.staff.name if v.staff_id else '', 'debit': ln.debit, 'credit': ln.credit,
            })
        return Response(rows)
