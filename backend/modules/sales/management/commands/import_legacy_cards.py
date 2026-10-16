"""Add the legacy Trade data's credit cards to Add Credit Card.

The legacy program kept no card table: each credit card is an account
("Credit Card HBL", "Alfah Credit Card Bhai" …, under Account Payables 2201 /
Bank 2203) with a "… tax" expense account beside it. Each becomes a company
card named as its account, with the bank taken from the name. The card number
is not in the legacy data (7219 is the HBL card's, from the shop's sheet); the
tax % is the usual 1.5 — both can be changed in Add Credit Card.

  python manage.py import_legacy_cards [--tenant <username>] [--yes]
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Q

BANKS = [('hbl', 'HBL'), ('ubl', 'UBL'), ('alfah', 'Bank Alfalah'), ('alfalah', 'Bank Alfalah'), ('meezan', 'Meezan Bank'), ('mcb', 'MCB')]
CARD_NO = {'22010027': '7219'}


class Command(BaseCommand):
    help = 'Create Add Credit Card cards from the legacy credit card accounts.'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', default=None)
        parser.add_argument('--yes', action='store_true', help='Do it (otherwise only report).')

    def handle(self, *args, **o):
        from modules.company.models import LedgerAccount
        from modules.sales.models import TradeCard
        accs = (LedgerAccount.objects.filter(group__code__in=[2201, 2203])
                .filter(Q(name__icontains='credit card') | Q(name__icontains='card'))
                .order_by('acc_id'))
        if o['tenant']:
            accs = accs.filter(tenant=get_user_model().objects.get(username=o['tenant']))
        n = 0
        for a in accs:
            tag = f'Trade 1.0 account {a.acc_id}'
            if TradeCard.objects.filter(notes__startswith=tag).exists():
                self.stdout.write(f'  {a.acc_id} {a.name}: already added')
                continue
            low = a.name.lower()
            bank = next((b for k, b in BANKS if k in low), '')
            n += 1
            self.stdout.write(f'  {"add" if o["yes"] else "would add"} {a.acc_id} {a.name} · {bank or "-"} · {CARD_NO.get(a.acc_id, "")}')
            if o['yes']:
                contact = (a.contact_person or '').strip()
                TradeCard.objects.create(
                    holder_type='company', holder_name=a.name, bank=bank, card_no=CARD_NO.get(a.acc_id, ''),
                    notes=f'{tag}{" · " + contact if contact not in ("", "0") else ""}', tenant_id=a.tenant_id)
        if not o['yes']:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Add --yes to do it.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'CARDS_OK {n}'))
