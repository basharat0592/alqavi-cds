"""
Utility functions used across the application.
"""
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response


def get_or_404_response(model, error_msg=None, **kwargs):
    """
    Retrieve a model instance or return a (None, 404 Response) tuple.

    Usage in views::

        obj, err = get_or_404_response(User, id=user_id)
        if err:
            return err

    Args:
        model: Django model class
        error_msg: Custom error message (defaults to '<ModelName> not found')
        **kwargs: Lookup keyword arguments passed to .get()

    Returns:
        tuple: (instance, None) on success or (None, Response) on 404
    """
    if error_msg is None:
        error_msg = f'{model.__name__} not found'
    try:
        return model.objects.get(**kwargs), None
    except model.DoesNotExist:
        return None, Response({'error': error_msg}, status=status.HTTP_404_NOT_FOUND)


def generate_slug(text, separator='-'):
    """
    Generate a URL-safe slug from text.

    Args:
        text: Text to convert to slug
        separator: Character to use as separator (default: '-')

    Returns:
        str: Generated slug
    """
    return slugify(text, allow_unicode=False).replace('-', separator)


def paginate_queryset(queryset, page=1, page_size=20):
    """
    Paginate a queryset.

    Args:
        queryset: Django queryset to paginate
        page: Page number (1-indexed)
        page_size: Number of items per page

    Returns:
        tuple: (paginated_queryset, total_count, page_count)
    """
    total_count = queryset.count()
    page_count = (total_count + page_size - 1) // page_size
    start = (page - 1) * page_size
    end = start + page_size
    return queryset[start:end], total_count, page_count


def format_currency(amount, currency='PKR'):
    """
    Format amount as currency string.

    Args:
        amount: Numeric amount
        currency: Currency code (default: 'PKR')

    Returns:
        str: Formatted currency string
    """
    currency_symbols = {
        'USD': '$',
        'EUR': '\u20ac',
        'GBP': '\u00a3',
        'PKR': 'Rs.',
    }
    symbol = currency_symbols.get(currency, currency)
    return f'{symbol}{amount:,.2f}'


def get_current_timestamp():
    """
    Get current timezone-aware timestamp.

    Returns:
        datetime: Current timezone-aware datetime
    """
    return timezone.now()
