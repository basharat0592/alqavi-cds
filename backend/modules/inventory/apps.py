"""Inventory module configuration."""
from django.apps import AppConfig
class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.inventory'
    label = 'inventory'
    verbose_name = 'Inventory'

    def ready(self):
        import modules.inventory.signals
