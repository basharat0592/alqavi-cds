from django.db import models
from django.conf import settings


class DeliveryPerson(models.Model):
    """A standalone delivery rider account, created and managed by the admin.

    Mirrors the Supplier/Customer "standalone identity + shadow login" pattern:
    the rider logs in with their own credentials (token prefixed `del_`) and
    gets their own dashboard scoped to the orders assigned to them.
    """
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    plain_password = models.CharField(max_length=255, blank=True, null=True)

    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Logistics details
    VEHICLE_CHOICES = [
        ('bike', 'Bike'),
        ('car', 'Car'),
        ('van', 'Van'),
        ('truck', 'Truck'),
        ('other', 'Other'),
    ]
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_CHOICES, blank=True, default='bike')
    vehicle_number = models.CharField(max_length=50, blank=True, default='')
    cnic = models.CharField(max_length=30, blank=True, default='')
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')

    # Geographic area the rider covers (used for Area Manager scoping + routing).
    area = models.ForeignKey(
        'company.Area', on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_persons'
    )
    # Branch (warehouse) this rider serves. The rider sees this branch's active
    # orders in their notifications feed (not only orders explicitly assigned).
    warehouse = models.ForeignKey(
        'inventory.Warehouse', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delivery_persons'
    )
    avatar = models.ImageField(upload_to='delivery/avatars/', null=True, blank=True)

    # Admin who created this rider — drives per-admin data isolation.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_delivery_persons'
    )
    # Owning Admin (tenant) — per-Admin delivery riders.
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='tenant_delivery_persons'
    )

    status = models.CharField(max_length=20, default='active')
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_persons'
        ordering = ['-created_at']
        verbose_name = 'Delivery Person'
        verbose_name_plural = 'Delivery Persons'

    def __str__(self):
        return f"{self.name} ({self.email})"

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
