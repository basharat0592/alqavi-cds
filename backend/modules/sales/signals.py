"""Ledger hooks for sales.

A sale is booked as income when its order reaches DELIVERED (covers POS orders
created as delivered and online orders delivered later). Deleting a delivered
order removes its ledger entry so the books stay balanced.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Order


@receiver(post_save, sender=Order)
def order_to_ledger(sender, instance, **kwargs):
    from modules.payments import services
    if str(instance.status).upper() == 'DELIVERED':
        services.record_sale(instance)
    else:
        # Order moved out of DELIVERED (or never reached it) → ensure no income entry.
        services.remove_sale(instance)


@receiver(post_delete, sender=Order)
def order_deleted_from_ledger(sender, instance, **kwargs):
    from modules.payments import services
    services.remove_sale(instance)
