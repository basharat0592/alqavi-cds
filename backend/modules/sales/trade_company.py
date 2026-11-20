"""Trade 1.0: one invoice per company.

A Sale Invoice / Purchase is entered as one bill, but saved as one invoice per
company (the company of each line's product). The bill-wide amounts (cash paid,
card paid, freight, extra discount …) are shared out to the invoices in
proportion to each invoice's amount; the last invoice takes the rounding.
"""
from collections import OrderedDict
from decimal import ROUND_HALF_UP, Decimal

Z = Decimal('0')
CENT = Decimal('0.01')


def money(v):
    try:
        return Decimal(str(v if v not in (None, '') else 0)).quantize(CENT, rounding=ROUND_HALF_UP)
    except Exception:
        return Z


def company_of_product(p):
    """The Company of a shop Product (Product › stock › SupplierProduct › company)."""
    sp = getattr(getattr(p, 'stock', None), 'product', None) if p else None
    return sp.company if (sp and sp.company_id) else None


def group_by_company(rows, company_of):
    """[(company or None, [rows])] in the order the companies first appear."""
    groups = OrderedDict()
    for r in rows:
        co = company_of(r)
        key = co.pk if co else None
        if key not in groups:
            groups[key] = (co, [])
        groups[key][1].append(r)
    return list(groups.values())


def share(total, weights):
    """Split `total` (money) over `weights` in proportion; the parts add up exactly."""
    total = money(total)
    weights = [Decimal(str(w or 0)) for w in weights]
    s = sum(weights, Z)
    if not weights:
        return []
    if s <= 0:
        return [total] + [Z] * (len(weights) - 1)
    parts = [money(total * w / s) for w in weights[:-1]]
    parts.append(total - sum(parts, Z))
    return parts
