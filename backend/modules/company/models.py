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
        unique_together = [('tenant', 'name'), ('tenant', 'code')]

    def __str__(self):
        return f"{self.name} ({self.code})"
