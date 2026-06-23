from django.db import models


class Area(models.Model):
    """A geographic area / territory used to scope Area Managers and customers
    (e.g. Gilgit, Skardu, Hunza). Optional self-parent for hierarchies."""
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'areas'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"
