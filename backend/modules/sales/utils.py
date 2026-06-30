import requests
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

import re

def get_whatsapp_message_body(order):
    """
    Constructs the formatted message string for WhatsApp.
    Matches the user's requested template.
    """
    # Format product details
    items = order.items.all()
    product_names = []
    total_qty = 0
    product_details = ""
    
    for item in items:
        p_name = item.product.product_name if item.product else "Unknown Product"
        # Clean product name from redundant weight/type in parenthesis
        p_name = re.sub(r'\s*\(.*?\)\s*$', '', p_name).strip()
        
        qty = item.quantity
        price = item.price
        
        # Access size and weight from the product model
        size = item.product.size if item.product and item.product.size else "N/A"
        weight = item.product.weight if item.product and item.product.weight else "N/A"
        
        product_names.append(p_name)
        total_qty += qty
        product_details += f"- {p_name} ({size} | {weight}) x {qty}\n"

    message_body = (
        f"🌟 *AL-QAVI HUB* 🌟\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Assalam-o-Alaikum! 👋\n"
        f"Dear *{order.customer_name}*,\n"
        f"Your order has been *CONFIRMED* successfully and is now being prepared for shipment. ✅\n\n"
        f"📜 *ORDER SUMMARY*\n"
        f"🆔 *Order ID:* #{order.tracking_id}\n"
        f"📦 *Items Detail:*\n{product_details}\n"
        f"💰 *Bill Amount:* *Rs {order.total_amount}*\n\n"
        f"📍 *SHIPPING DETAILS*\n"
        f"Address: {order.shipping_address}\n"
        f"Payment: {order.payment_method}\n\n"
        f"🚚 *Delivery Timeline:* 2-3 Working Days\n\n"
        f"Thank you for choosing Al-Qavi Hub. We look forward to serving you again! 🛍️✨"
    )
    return message_body

def send_whatsapp_order_confirmation(order):
    """
    Sends an automated WhatsApp message using the WhatsApp Cloud API.
    """
    if not order.whatsapp_number:
        logger.warning(f"No WhatsApp number provided for order {order.tracking_id}")
        return False, "No WhatsApp number provided."

    # Prevent duplicate messages
    if order.whatsapp_sent:
        return True, "Message already sent."

    token = getattr(settings, 'WHATSAPP_TOKEN', '')
    phone_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    version = getattr(settings, 'WHATSAPP_API_VERSION', 'v17.0')

    if not token or not phone_id:
        logger.error("WhatsApp API credentials not configured in settings.")
        return False, "WhatsApp API not configured."

    url = f"https://graph.facebook.com/{version}/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    message_body = get_whatsapp_message_body(order)

    # Sanitize number for WhatsApp API (e.g. 03xx -> 923xx, remove non-digits)
    raw_number = order.whatsapp_number or ""
    clean_number = ''.join(filter(str.isdigit, raw_number))
    
    if clean_number.startswith('0') and len(clean_number) == 11:
        clean_number = '92' + clean_number[1:]
    elif len(clean_number) == 10:
        clean_number = '92' + clean_number
    elif not clean_number:
        # Fallback if still empty after cleaning
        clean_number = ''.join(filter(str.isdigit, order.phone_number or ""))
        if clean_number.startswith('0') and len(clean_number) == 11:
            clean_number = '92' + clean_number[1:]
        elif len(clean_number) == 10:
            clean_number = '92' + clean_number

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_number,
        "type": "text",
        "text": {
            "body": message_body
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response_data = response.json()

        if response.status_code == 200:
            order.whatsapp_sent = True
            order.whatsapp_status = 'SENT'
            order.whatsapp_sent_at = timezone.now()
            order.save()
            return True, "Message sent successfully."
        else:
            error_msg = response_data.get('error', {}).get('message', 'Unknown Error')
            order.whatsapp_status = 'FAILED'
            order.save()
            logger.error(f"WhatsApp API Error: {error_msg}")
            return False, f"WhatsApp API Error: {error_msg}"

    except Exception as e:
        order.whatsapp_status = 'FAILED'
        order.save()
        logger.exception("Failed to send WhatsApp message")
        return False, str(e)
