"""
Reusable mixins for models and view sets.
"""
from django.db import models


class TimestampMixin(models.Model):
    """
    Mixin to add timestamp fields to models.
    
    Attributes:
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class StatusMixin(models.Model):
    """
    Mixin to add status field to models.
    
    Attributes:
        status: Status of the record (active, inactive, archived)
    """
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
        ('pending_procurement', 'Pending Procurement'),
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """
    Mixin to add soft delete functionality to models.
    
    Attributes:
        is_deleted: Whether the record is soft-deleted
        deleted_at: Timestamp when record was deleted
    """
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
