"""Sales module configuration."""
from django.apps import AppConfig
class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.sales'
    label = 'sales'
    verbose_name = 'Sales'

    def ready(self):
        import modules.sales.signals
