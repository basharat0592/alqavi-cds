"""
Base models for all applications.
"""
from django.db import models
import uuid


class BaseModel(models.Model):
    """
    Abstract base model providing common fields for all models.
    
    Attributes:
        id: UUID primary key
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
