"""Shared pagination for the API.

DRF's stock ``PageNumberPagination`` leaves ``page_size_query_param`` as ``None``,
which means the client cannot ask for a different page size — the admin console's
rows-per-page control would silently do nothing on every server-paginated list.
This subclass opens that parameter up while capping it, so a caller can neither
accidentally nor deliberately ask for an unbounded page.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Page-number pagination that honours ``?page_size=`` up to a hard ceiling."""

    #: Matches the options offered by the admin console's rows-per-page control.
    page_size_query_param = 'page_size'

    #: The largest page the console offers. Anything above is clamped by DRF
    #: rather than rejected, so an over-eager caller still gets a valid response.
    max_page_size = 100
