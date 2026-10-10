from django.db import models
from django.conf import settings


class Area(models.Model):
    """A geographic area / territory used to scope Area Managers and customers
    (e.g. Gilgit, Skardu, Hunza). Optional self-parent for hierarchies."""
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Owning Admin (tenant) — per-Admin areas/territories. NULL = global/shared
    # (the public storefront delivery-city list). Name & code unique per-tenant.
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_areas'
    )

    class Meta:
        db_table = 'areas'
        ordering = ['name']
        # Names may repeat across levels (legacy has a district and a sub area both
        # called "Gilgit"); the code (D1 / M1 / A39) is what is unique.
        unique_together = [('tenant', 'code')]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Company(models.Model):
    """A company / brand / manufacturer (e.g. Aish, Amour Company) with a name,
    contact number(s) and a free-text category. Tenant-scoped per Admin."""
    # Legacy Trade 1.0 "Company Code" (CompID): 1, 2, 3 … per tenant, assigned on save.
    code = models.PositiveIntegerField(null=True, blank=True)
    name = models.CharField(max_length=150)
    numbers = models.CharField(max_length=200, blank=True, default='')   # phone number(s)
    category = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Owning Admin (tenant) — per-Admin company registry.
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_companies'
    )

    class Meta:
        db_table = 'companies'
        ordering = ['name']
        unique_together = [('tenant', 'name')]

    def save(self, *args, **kwargs):
        if self.code is None:
            last = (Company.objects.filter(tenant_id=self.tenant_id)
                    .aggregate(m=models.Max('code'))['m']) or 0
            self.code = last + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AccountGroup(models.Model):
    """Chart of Accounts heading (legacy Trade 2.1 MainAccount / Accounts2L /
    Accounts3L). Level 1 = main account (1 Assets … 5 Expences), level 2 = sub
    account (e.g. 12 Current assets), level 3 = account group (e.g. 1202
    Accounts Receivables). Ledger accounts hang off level-3 groups."""
    code = models.PositiveIntegerField()
    name = models.CharField(max_length=150)
    level = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children')
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_account_groups'
    )

    class Meta:
        db_table = 'account_groups'
        ordering = ['code']
        unique_together = [('tenant', 'code')]

    def __str__(self):
        return f"{self.code} {self.name}"


class LedgerAccount(models.Model):
    """A Chart of Accounts entry (legacy Accounts table). `acc_id` is the level-3
    group code + a 4-digit sequence, e.g. 12020654. Customer (1202) and supplier
    (2201) accounts link to their Customer / Supplier record."""
    STATUS_CHOICES = [('active', 'Active'), ('inactive', 'Inactive')]

    acc_id = models.CharField(max_length=12)
    name = models.CharField(max_length=255)
    group = models.ForeignKey(AccountGroup, on_delete=models.PROTECT, related_name='accounts')
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_accounts')
    cell_no = models.CharField(max_length=40, blank=True, default='')
    contact_person = models.CharField(max_length=150, blank=True, default='')
    address = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    customer = models.OneToOneField('customer.Customer', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='ledger_account')
    supplier = models.OneToOneField('supplier.Supplier', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='ledger_account')
    created_at = models.DateTimeField(auto_now_add=True)
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_ledger_accounts'
    )

    class Meta:
        db_table = 'ledger_accounts'
        ordering = ['acc_id']
        unique_together = [('tenant', 'acc_id')]

    def __str__(self):
        return f"{self.acc_id} {self.name}"
