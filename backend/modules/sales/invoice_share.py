"""Sharing a Trade sale invoice: a signed public link (/invoice/<token>) that
anyone with the link can open (read only), WhatsApp share text, and automatic
sending from the Al-Qavi Traders business number via the WhatsApp Cloud API.

Automatic sending needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in the
server environment. Messages a business starts must use an approved template:
set WHATSAPP_INVOICE_TEMPLATE (body params: shop name, invoice no, amount,
link; language WHATSAPP_TEMPLATE_LANG, default 'en'). Without a template a
plain text message is sent, which WhatsApp only delivers inside a 24-hour
customer conversation window.
"""
import logging
from decimal import Decimal

import json
import urllib.error
import urllib.request
from django.conf import settings
from django.core import signing
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Order

logger = logging.getLogger(__name__)
SALT = 'trade-invoice-share'


def make_token(order):
    return signing.dumps({'o': str(order.id)}, salt=SALT, compress=True)


def read_token(token):
    try:
        return signing.loads(token, salt=SALT, max_age=60 * 60 * 24 * 365)['o']
    except (signing.BadSignature, KeyError, TypeError):
        return None


def wa_number(raw):
    """03xx-xxxxxxx / 3xxxxxxxxx / +92… -> 92xxxxxxxxxx (Pakistan)."""
    d = ''.join(ch for ch in str(raw or '') if ch.isdigit())
    if d.startswith('0092'):
        d = d[2:]
    if d.startswith('0') and len(d) == 11:
        d = '92' + d[1:]
    elif len(d) == 10 and d.startswith('3'):
        d = '92' + d
    return d if len(d) >= 11 else ''


def _customer_phone(order):
    c = order.customer
    return (c.phone if c else '') or (order.phone_number if order.phone_number not in ('N/A', None) else '') or ''


def _shop(order):
    c = order.customer
    return (f"{c.first_name or ''} {c.last_name or ''}".strip() if c else '') or order.customer_name or 'Customer'


def share_info(order, base):
    token = make_token(order)
    url = f"{base.rstrip('/')}/invoice/{token}" if base else f'/invoice/{token}'
    amount = Decimal(str(order.total_amount or 0))
    text = (f"Assalam o Alaikum {_shop(order)},\n"
            f"Al-Qavi Traders — Sale Invoice {order.tracking_id}\n"
            f"Amount: Rs {amount:,.2f}\n"
            f"View / download: {url}\nShukriya!")
    return {'token': token, 'url': url, 'phone': wa_number(_customer_phone(order)), 'text': text,
            'auto_enabled': bool(getattr(settings, 'WHATSAPP_TOKEN', '') and getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', ''))}


def send_invoice_whatsapp(order, base, to=''):
    info = share_info(order, base)
    number = wa_number(to) or info['phone']
    if not number:
        return False, 'The customer has no mobile number.', info
    token = getattr(settings, 'WHATSAPP_TOKEN', '')
    phone_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    if not token or not phone_id:
        return False, 'WhatsApp Business is not connected on the server yet.', info
    version = getattr(settings, 'WHATSAPP_API_VERSION', 'v17.0')
    template = getattr(settings, 'WHATSAPP_INVOICE_TEMPLATE', '')
    if template:
        payload = {'messaging_product': 'whatsapp', 'to': number, 'type': 'template', 'template': {
            'name': template, 'language': {'code': getattr(settings, 'WHATSAPP_TEMPLATE_LANG', 'en')},
            'components': [{'type': 'body', 'parameters': [
                {'type': 'text', 'text': _shop(order)}, {'type': 'text', 'text': order.tracking_id},
                {'type': 'text', 'text': f"{Decimal(str(order.total_amount or 0)):,.2f}"}, {'type': 'text', 'text': info['url']}]}]}}
    else:
        payload = {'messaging_product': 'whatsapp', 'to': number, 'type': 'text', 'text': {'body': info['text'], 'preview_url': True}}
    req = urllib.request.Request(f'https://graph.facebook.com/{version}/{phone_id}/messages',
                                 data=json.dumps(payload).encode(), method='POST',
                                 headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
        from django.utils import timezone
        Order.objects.filter(pk=order.pk).update(whatsapp_sent=True, whatsapp_status='SENT', whatsapp_sent_at=timezone.now())
        return True, f'Invoice sent on WhatsApp to +{number}.', info
    except urllib.error.HTTPError as e:
        try:
            err = (json.loads(e.read().decode() or '{}').get('error') or {}).get('message', str(e))
        except ValueError:
            err = str(e)
        Order.objects.filter(pk=order.pk).update(whatsapp_status='FAILED')
        return False, f'WhatsApp: {err}', info
    except Exception as e:  # network
        logger.exception('WhatsApp send failed')
        return False, f'WhatsApp could not be reached: {e}', info


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_invoice(request, token):
    """Read-only invoice for the shared link."""
    from .views import OrderViewSet
    oid = read_token(token)
    o = (Order.objects.select_related('customer__area__parent__parent', 'staff', 'salesperson').filter(pk=oid).first()
         if oid else None)
    if not o:
        return Response({'detail': 'This invoice link is not valid.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(OrderViewSet.trade_invoice_payload(o, None))
