from django.db import migrations, models

# Legacy Trade 1.0 Company table (legacy_dump/Company.csv): CompID -> CompName.
LEGACY_CODES = [
    (1, 'Zaitun Herbal'),
    (2, 'RIVAJ UK'),
    (3, 'Face Fresh'),
    (4, 'AREENA GOLD'),
    (5, 'Bio Amla'),
    (6, 'Golden Pearl'),
    (7, 'Mother Care'),
    (8, 'Saeed ghani'),
    (9, 'KALA KULA'),
    (10, 'SPPER GRACE'),
    (11, 'RAWMENTS'),
    (12, 'Universal'),
    (13, 'Luvel'),
    (14, 'CEELA HBR'),
    (15, 'MAX TOX'),
    (16, 'ELHAM SOAP'),
    (17, 'BEAUTY CARE PERFUM'),
    (18, 'UNIC PERFUM'),
    (19, 'EXPARTS PERFUM'),
    (20, 'MAIN GOLD'),
    (21, 'CEEP INTERNATIONAL'),
    (22, 'WAYKA DABAR AMLA'),
    (23, 'NADIA INTERNATIONAL'),
    (24, 'HASHMI SURMA'),
    (25, 'Imported Items'),
    (27, 'WERRICK HEALTH CARE'),
    (28, 'VATIKA COMPANY'),
    (29, 'Grace International'),
    (30, 'House care'),
    (31, '12'),
    (32, 'BEAUTY CARE PERFUM COMPANY'),
    (33, 'HIMALIYA COMPANY'),
    (35, 'FALAHYE COMPANY'),
    (37, 'PAKIZA'),
    (38, 'WAKEEL'),
    (39, 'REVLON'),
    (40, 'LUBNAS'),
    (41, 'Aish'),
    (42, 'HUNZA HONEY'),
    (43, 'IRN IMPORTED'),
    (44, 'BEST CARE'),
    (46, 'Saso cloure company'),
    (47, 'Al qavi traders skd'),
    (48, 'Derma Shine Company'),
    (49, 'W/company'),
    (50, 'Unique Perfume Company'),
    (51, 'Amour Company'),
    (52, 'Santex Traust company'),
    (53, 'Doctor Tooth Paste Company'),
    (54, 'Daiper me and my company'),
    (55, 'Mother Care karachi'),
    (56, 'Baba Cosmetics'),
    (57, 'Kidi Diaper Company'),
    (58, 'BNB Company'),
    (59, 'Mother Care Pindi sole'),
    (60, 'Black Rose Company'),
    (61, 'Rawmins company'),
    (62, 'Gorey Company'),
    (63, 'KD Interprice Hibas company'),
    (64, 'Hibas Company'),
    (65, 'Imported Perfume'),
    (66, 'Himalaya Company'),
]


def set_codes(apps, schema_editor):
    Company = apps.get_model('company', 'Company')
    by_name = {n.strip().lower(): code for code, n in LEGACY_CODES}
    tenants = Company.objects.values_list('tenant_id', flat=True).distinct()
    for tid in tenants:
        rows = list(Company.objects.filter(tenant_id=tid).order_by('created_at', 'id'))
        used = set()
        for c in rows:
            code = by_name.get(c.name.strip().lower())
            if code and code not in used:
                c.code = code
                used.add(code)
                c.save(update_fields=['code'])
        nxt = max(used or {0})
        for c in rows:
            if c.code is None:
                nxt += 1
                c.code = nxt
                c.save(update_fields=['code'])


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0004_chart_of_accounts'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='code',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(set_codes, migrations.RunPython.noop),
    ]
