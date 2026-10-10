"""Legacy sub areas whose name is also a district's (Lahore, karachi, Joglot,
Gilgit, Skardu, nagar) were merged into the district on import, because area
names had to be unique. Names may now repeat: the sub areas are restored under
their main area and their accounts moved back to them (legacy Accounts.AreaID)."""
from django.db import migrations

SUB_AREAS = {"21": ["Lahore", "1"], "22": ["karachi", "1"], "35": ["Joglot", "1"], "39": ["Gilgit", "1"], "44": ["Skardu", "13"], "72": ["nagar", "1"]}  # AreaID -> [name, MAreaID]
ACCOUNTS = {"21": ["22010019", "22010021", "22010033", "22010036", "22010037", "22010038", "22010039", "22010042", "22010043"], "22": ["22010020", "22010026", "22010028"], "35": ["12020132", "12020133", "12020135", "12020137", "12020139", "12020167", "12020184", "12020225", "12020414"], "39": ["51040002", "12040007", "22020001", "12020428", "31010007", "53070001", "12030004", "12020483", "52010003", "12040009", "22030001", "55010001", "12020557", "33010002", "55020001"], "44": ["22010018", "12020201", "31010005", "31010006", "12020575", "33010001"], "72": ["12020430", "12020433", "12020494", "12020501", "12020654"]}  # AreaID -> legacy AccIDs


def restore(apps, schema_editor):
    Area = apps.get_model('company', 'Area')
    Ledger = apps.get_model('company', 'LedgerAccount')
    Customer = apps.get_model('customer', 'Customer')
    for tenant_id in Area.objects.filter(code='M1').values_list('tenant_id', flat=True):
        for aid, (name, maid) in SUB_AREAS.items():
            main = Area.objects.filter(tenant_id=tenant_id, code=f'M{maid}').first()
            if not main or Area.objects.filter(tenant_id=tenant_id, code=f'A{aid}').exists():
                continue
            sub = Area.objects.create(tenant_id=tenant_id, code=f'A{aid}', name=name, parent=main, is_active=True)
            for acc in Ledger.objects.filter(tenant_id=tenant_id, acc_id__in=ACCOUNTS.get(aid, []),
                                             area__code__regex=r'^D[0-9]+$', area__name__iexact=name):
                old = acc.area_id
                acc.area = sub
                acc.save(update_fields=['area'])
                if acc.customer_id:
                    Customer.objects.filter(pk=acc.customer_id, area_id=old).update(area=sub)


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0006_ledgeraccount_address'),
        ('customer', '0006_customer_tenant'),
    ]

    operations = [
        migrations.AlterUniqueTogether(name='area', unique_together={('tenant', 'code')}),
        migrations.RunPython(restore, migrations.RunPython.noop),
    ]
