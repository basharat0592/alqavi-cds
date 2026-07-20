from django.db import migrations


def backfill(apps, schema_editor):
    """Attribute each existing supplier to the admin (tenant) it actually deals
    with — the tenant behind most of its purchase orders. Suppliers with no
    tenant-stamped POs stay NULL (Super-Admin-only once the registry is scoped)."""
    from collections import Counter
    Supplier = apps.get_model('supplier', 'Supplier')
    PurchaseOrder = apps.get_model('sales', 'PurchaseOrder')
    for sup in Supplier.objects.all():
        if sup.tenant_id:
            continue
        tenants = list(
            PurchaseOrder.objects.filter(supplier_id=sup.id, tenant__isnull=False)
            .values_list('tenant_id', flat=True)
        )
        if tenants:
            sup.tenant_id = Counter(tenants).most_common(1)[0][0]
            sup.save(update_fields=['tenant'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('supplier', '0008_supplier_tenant'),
        ('sales', '0028_order_tenant_purchaseorder_tenant_and_more'),
    ]
    operations = [migrations.RunPython(backfill, noop)]
