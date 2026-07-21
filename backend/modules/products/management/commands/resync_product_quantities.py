"""
Recompute every Product.total_quantity from the live Stock table.

Historically Product.total_quantity was recomputed in Product.save() using a fragile
match (name + cost price + weight + size + warehouse + tenant). Whenever a Stock row's
weight/size/cost drifted from the Product's, the aggregate collapsed to 0 and the item
disappeared from the city-filtered storefront even though it had real stock.

Product.save() and the sync_product_stock signal now both key quantity on
NAME + tenant + warehouse only. This command backfills existing rows to that same
definition so already-saved products stop showing a stale 0. Idempotent — safe to run
on every deploy.
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum

from modules.products.models import Product
from modules.inventory.models import Stock


class Command(BaseCommand):
    help = "Recompute Product.total_quantity from Stock (name + tenant + warehouse)."

    def handle(self, *args, **options):
        fixed = 0
        total_seen = 0
        for product in Product.objects.all().iterator():
            total_seen += 1
            wh = product.warehouse_id or (product.stock.warehouse_id if product.stock_id else None)
            name = product.product_name or (product.stock.product_name if product.stock_id else None)
            if not name:
                continue
            total = Stock.objects.filter(
                product_name__iexact=name,
                warehouse_id=wh,
                tenant_id=product.tenant_id,
            ).aggregate(total=Sum('total_quantity'))['total'] or 0
            if product.total_quantity != total:
                # Update directly to avoid re-running save() side effects.
                Product.objects.filter(id=product.id).update(total_quantity=total)
                fixed += 1
                self.stdout.write(
                    f"  {name} @ wh={wh}: {product.total_quantity} -> {total}"
                )
        self.stdout.write(
            self.style.SUCCESS(
                f"resync_product_quantities: {fixed} of {total_seen} products updated."
            )
        )
