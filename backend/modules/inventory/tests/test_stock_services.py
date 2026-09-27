"""Behavioural cover for the single source of truth.

These lock in the three faults that motivated `inventory.services`: a purchase
merging instead of duplicating, a sale deducting exactly once (the old paths
wrote the stock row *and* Product.total_quantity, which the signal had already
re-derived), and a deduction spreading across a line split over several rows.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from modules.inventory import services
from modules.inventory.models import Stock, Warehouse
from modules.products.models import Product


class StockServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.tenant = User.objects.create(username='tenant-a', email='a@example.com')
        cls.wh = Warehouse.objects.create(name='Skardu Main', tenant=cls.tenant)

    def _product(self, line, name='Rice Face Wash'):
        """A sellable Product for a stock line. `Product.stock` is a required FK,
        so the line has to exist first."""
        return Product.objects.create(
            product_name=name, warehouse=self.wh, tenant=self.tenant,
            stock=line, selling_price=Decimal('100.00'), total_quantity=0,
        )

    # ── receive ──────────────────────────────────────────────────────────
    def test_receive_creates_one_line_for_a_new_product(self):
        services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                         product_name='Rice Face Wash', units=10, unit_cost=50)
        self.assertEqual(Stock.objects.count(), 1)
        self.assertEqual(services.available(tenant_id=self.tenant.id,
                                            warehouse_id=self.wh.id,
                                            product_name='Rice Face Wash'), 10)

    def test_second_purchase_merges_instead_of_duplicating(self):
        services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                         product_name='Rice Face Wash', units=10, unit_cost=50)
        services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                         product_name='rice face WASH', units=5, unit_cost=60)
        # One line, both quantities, newest cost.
        self.assertEqual(Stock.objects.count(), 1)
        line = Stock.objects.get()
        self.assertEqual(line.total_quantity, 15)
        self.assertEqual(line.price_per_item, Decimal('60'))

    def test_receive_keeps_product_quantity_in_step(self):
        line = services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                                product_name='Rice Face Wash', units=12, unit_cost=50)
        product = self._product(line)
        line.save()          # re-fire the signal now the product exists
        product.refresh_from_db()
        self.assertEqual(product.total_quantity, 12)

    # ── consume ──────────────────────────────────────────────────────────
    def test_sale_deducts_exactly_once(self):
        """The regression this module exists for: no double counting."""
        line = services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                                product_name='Rice Face Wash', units=10, unit_cost=50)
        product = self._product(line)
        services.consume(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                         product_name='Rice Face Wash', units=3)
        product.refresh_from_db()
        self.assertEqual(product.total_quantity, 7)
        self.assertEqual(services.available(tenant_id=self.tenant.id,
                                            warehouse_id=self.wh.id,
                                            product_name='Rice Face Wash'), 7)

    def test_consume_spreads_across_a_split_line(self):
        """Older data can leave several rows for one name; all of them count."""
        for cost in (50, 60):
            Stock.objects.create(
                product_name='Rice Face Wash', warehouse=self.wh, tenant=self.tenant,
                purchase_type='single', total_quantity=4,
                price_per_item=Decimal(cost), date=timezone.now().date(),
            )
        taken = services.consume(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                                 product_name='Rice Face Wash', units=6)
        self.assertEqual(taken, 6)
        self.assertEqual(services.available(tenant_id=self.tenant.id,
                                            warehouse_id=self.wh.id,
                                            product_name='Rice Face Wash'), 2)

    def test_consume_never_goes_negative_and_reports_the_shortfall(self):
        services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                         product_name='Rice Face Wash', units=2, unit_cost=50)
        taken = services.consume(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                                 product_name='Rice Face Wash', units=5)
        self.assertEqual(taken, 2)
        self.assertEqual(services.available(tenant_id=self.tenant.id,
                                            warehouse_id=self.wh.id,
                                            product_name='Rice Face Wash'), 0)

    # ── release ──────────────────────────────────────────────────────────
    def test_release_returns_units_to_the_line(self):
        line = services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                                product_name='Rice Face Wash', units=10, unit_cost=50)
        product = self._product(line)
        services.consume(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                         product_name='Rice Face Wash', units=4)
        services.release(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                         product_name='Rice Face Wash', units=4)
        product.refresh_from_db()
        self.assertEqual(product.total_quantity, 10)

    def test_release_invents_nothing_for_an_unknown_product(self):
        restored = services.release(tenant_id=self.tenant.id, warehouse_id=self.wh.id,
                                    product_name='Never Stocked', units=5)
        self.assertEqual(restored, 0)
        self.assertEqual(Stock.objects.count(), 0)

    # ── isolation ────────────────────────────────────────────────────────
    def test_a_branch_never_consumes_another_branches_stock(self):
        other = Warehouse.objects.create(name='Gilgit', tenant=self.tenant)
        services.receive(tenant_id=self.tenant.id, warehouse=self.wh,
                         product_name='Rice Face Wash', units=10, unit_cost=50)
        taken = services.consume(tenant_id=self.tenant.id, warehouse_id=other.id,
                                 product_name='Rice Face Wash', units=3)
        self.assertEqual(taken, 0)
        self.assertEqual(services.available(tenant_id=self.tenant.id,
                                            warehouse_id=self.wh.id,
                                            product_name='Rice Face Wash'), 10)
