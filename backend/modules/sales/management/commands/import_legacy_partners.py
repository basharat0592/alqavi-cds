"""Make a Partner for every partner capital account of the legacy Trade data
(Equity › Parters Capital 3101) that has capital in it and is not a partner yet.

The legacy program kept no partner table — each partner is a capital account
funded by "Opening Share" vouchers. The partner gets that account (so their
capital in the books carries over), its phone, and as joining date the day
their first capital came in. 31010001 "Capital" holds the program's stock-rate
adjustments and is not a partner. Shares stay empty (= by capital invested).

  python manage.py import_legacy_partners [--tenant <username>] [--yes]
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Min, Sum

NOT_PARTNERS = {'31010001'}


class Command(BaseCommand):
    help = 'Create partners from the legacy partner capital accounts (3101).'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', default=None)
        parser.add_argument('--yes', action='store_true', help='Do it (otherwise only report).')

    def handle(self, *args, **o):
        from modules.company.models import LedgerAccount
        from modules.sales.models import Partner, VoucherLine
        accs = LedgerAccount.objects.filter(group__code=3101).exclude(acc_id__in=NOT_PARTNERS).order_by('acc_id')
        if o['tenant']:
            accs = accs.filter(tenant=get_user_model().objects.get(username=o['tenant']))
        made = []
        with transaction.atomic():
            for a in accs:
                if Partner.objects.filter(account=a).exists():
                    self.stdout.write(f'  {a.acc_id} {a.name}: already a partner')
                    continue
                lines = VoucherLine.objects.filter(account=a)
                agg = lines.aggregate(c=Sum('credit'), d=Sum('debit'))
                capital = (agg['c'] or 0) - (agg['d'] or 0)
                first = lines.filter(credit__gt=0).aggregate(d=Min('voucher__date'))['d']
                if capital <= 0 or not first:
                    self.stdout.write(f'  {a.acc_id} {a.name}: no capital - skipped')
                    continue
                phone = (a.cell_no or '').strip()
                made.append((a.acc_id, a.name, first, capital))
                if o['yes']:
                    Partner.objects.create(
                        name=a.name, phone='' if phone in ('-', '0') else phone, joining_date=first, account=a,
                        notes='From Trade 1.0 (partner capital account)', tenant_id=a.tenant_id)
            for acc_id, name, first, capital in made:
                self.stdout.write(f'  {"made" if o["yes"] else "would make"} {acc_id} {name}: joined {first:%d-%m-%Y}, capital {capital:,.0f}')
        if not o['yes']:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Add --yes to do it.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'PARTNERS_OK {len(made)}'))
