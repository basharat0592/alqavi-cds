"""
Seed script: populates CMS database with all real landing page content.
Run: python scratch/seed_cms_full.py
"""
import os, sys, django, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.cms.models import SiteSettings, WebsiteSection, NavigationMenu, NavigationItem

print("=== Seeding CMS with real landing page data ===")

# ── 1. SITE SETTINGS ──────────────────────────────────────────────────────────
settings, _ = SiteSettings.objects.get_or_create(id=1)
settings.site_name        = "Al-Qavi Hub"
settings.primary_color    = "#F59E0B"
settings.secondary_color  = "#111827"
settings.show_announcement = True
settings.announcement_text = "Free Delivery on all orders over Rs. 5000! 🚚"
settings.announcement_link = "/customer/shop"
settings.announcement_bg_color = "#131921"
settings.announcement_text_color = "#ffffff"
settings.announcement_scroll = False
settings.announcement_scroll_speed = "medium"
settings.announcement_duration = 5
settings.whatsapp_number   = "+923000000000"
settings.phone_number      = "+92-42-0000000"
settings.contact_email     = "info@alqavihub.com"
settings.address           = "Main Market, Lahore, Pakistan"
settings.instagram_url     = "#"
settings.facebook_url      = "#"
settings.tiktok_url        = "#"
settings.youtube_url       = "#"
settings.meta_title        = "Al-Qavi Hub | Luxury Cosmetics Pakistan"
settings.meta_description  = "Discover premium cosmetics and skincare products from top brands. Authentic products, fast delivery across Pakistan."
settings.meta_keywords     = "cosmetics, skincare, beauty, Pakistan, Al-Qavi, makeup, serum"
settings.save()
print("[OK] SiteSettings saved")

# ── 2. WEBSITE SECTIONS (real landing page sections) ─────────────────────────
WebsiteSection.objects.all().delete()

SECTIONS = [
    {
        "name": "Hero Slider",
        "section_type": "hero",
        "order": 1,
        "is_visible": True,
        "content": {
            "title": "Hero Video Slider",
            "slides": [
                {
                    "title": "Beauty Redefined",
                    "subtitle": "Luxury Cosmetics",
                    "description": "Experience the pinnacle of beauty artistry. Our premium studio collections bring professional-grade results to your daily routine.",
                    "cta_text": "Shop the Collection",
                    "cta_link": "/customer/shop",
                    "media_type": "video",
                    "video": "/images/BEAUTY STUDIO _ MAKEUP PROMO VIDEO.mp4",
                    "image": "/images/hero-artist.jpg",
                    "color": "from-amber-500 to-orange-600"
                },
                {
                    "title": "Studio Artistry",
                    "subtitle": "Scientific Artistry",
                    "description": "Witness the magic of cosmetics through ultra-high-definition captures. Ethereal looks crafted with scientific precision.",
                    "cta_text": "Explore Shop",
                    "cta_link": "/customer/shop",
                    "media_type": "video",
                    "video": "/images/Abstract cosmetics formulation footage ⚗️ 🧪 Stock video for beauty, skincare and makeup commercial.mp4",
                    "image": "/images/hero-collage.png",
                    "color": "from-pink-500 to-rose-600"
                },
                {
                    "title": "Pure Radiant Glow",
                    "subtitle": "Exclusive Skin Care",
                    "description": "Experience the ultimate hydration and rejuvenation. Our scientifically formulated serums deliver a lasting, healthy glow from within.",
                    "cta_text": "Shop Serums",
                    "cta_link": "/customer/shop",
                    "media_type": "video",
                    "video": "/images/Skin Care Product example commercial.mp4",
                    "image": "/images/hero-3.png",
                    "color": "from-violet-500 to-purple-600"
                }
            ]
        }
    },
    {
        "name": "Category Filter Bar",
        "section_type": "categories",
        "order": 2,
        "is_visible": True,
        "content": {
            "title": "Shop by Category",
            "note": "Categories are loaded dynamically from the database"
        }
    },
    {
        "name": "Full Product Collection",
        "section_type": "products",
        "order": 3,
        "is_visible": True,
        "content": {
            "title": "Full Collection",
            "subtitle": "Premium products",
            "show_price": True,
            "show_rating": True,
            "per_row": 5,
            "show_stock": True,
            "note": "Products are loaded dynamically from inventory"
        }
    },
    {
        "name": "Brand Logos Marquee",
        "section_type": "promotion",
        "order": 4,
        "is_visible": True,
        "content": {
            "title": "Our Brand Partners",
            "subtitle": "Authentic products from top brands",
            "brands": [
                {"name": "L'OREAL", "sub": "PARIS"},
                {"name": "MAYBELLINE", "sub": "NEW YORK"},
                {"name": "REVLON", "sub": ""},
                {"name": "NIVEA", "sub": ""},
                {"name": "Dove", "sub": ""},
                {"name": "PANTENE", "sub": "PRO-V"}
            ]
        }
    },
    {
        "name": "Customer Testimonials",
        "section_type": "testimonials",
        "order": 5,
        "is_visible": True,
        "content": {
            "title": "What Our Customers Say",
            "reviews": [
                {
                    "name": "Ayesha Khan",
                    "role": "Verified Customer",
                    "rating": 5,
                    "text": "The quality of the products is amazing. I've been using their skincare line for 3 months and the results are visible!"
                },
                {
                    "name": "Sarah Ahmed",
                    "role": "Professional Makeup Artist",
                    "rating": 5,
                    "text": "As a professional, I need reliable distributors. Al-Qavi always delivers authentic products on time."
                },
                {
                    "name": "Zainab Malik",
                    "role": "Frequent Buyer",
                    "rating": 5,
                    "text": "Best customer service in Pakistan! Their WhatsApp support helped me choose the right foundation shade perfectly."
                }
            ]
        }
    },
    {
        "name": "FAQ Section",
        "section_type": "faq",
        "order": 6,
        "is_visible": True,
        "content": {
            "title": "Common Questions",
            "subtitle": "Everything you need to know about shopping with Al-Qavi.",
            "items": [
                {"q": "Are your products 100% authentic?", "a": "Yes, we source all products directly from authorized distributors and trusted manufacturers."},
                {"q": "How long does delivery take?", "a": "Major cities usually take 2-3 business days. Remote areas may take 4-5 business days."},
                {"q": "Do you offer cash on delivery?", "a": "Yes, Cash on Delivery is available across Pakistan."}
            ]
        }
    },
    {
        "name": "Newsletter Signup",
        "section_type": "newsletter",
        "order": 7,
        "is_visible": True,
        "content": {
            "title": "Stay Updated With Latest Offers",
            "subtitle": "Subscribe to receive discounts, beauty tips, and new arrivals directly in your inbox.",
            "placeholder": "Enter your email address",
            "button_text": "Subscribe Now",
            "note": "No spam. Only useful updates."
        }
    }
]

for s in SECTIONS:
    WebsiteSection.objects.create(**s)
    print(f"  [OK] Section: {s['name']}")

print(f"\n[OK] {len(SECTIONS)} sections created")

# ── 3. NAVIGATION MENUS ───────────────────────────────────────────────────────
NavigationItem.objects.all().delete()
NavigationMenu.objects.all().delete()

# Header Menu
header_menu = NavigationMenu.objects.create(name="Header Main Menu", location="header")
header_items = [
    {"title": "Top Pick", "url": "/customer", "order": 1},
    {"title": "Best Seller", "url": "/customer#menu-section", "order": 2},
    {"title": "Track Order", "url": "/customer/tracking", "order": 3},
    {"title": "Shop All", "url": "/customer/shop", "order": 4},
]
for item in header_items:
    NavigationItem.objects.create(menu=header_menu, **item)
print(f"[OK] Header menu with {len(header_items)} items created")

# Footer Collections
footer1 = NavigationMenu.objects.create(name="Footer - Collections", location="footer_1")
footer1_items = [
    {"title": "Skincare", "url": "/customer/shop?category=skincare", "order": 1},
    {"title": "Makeup", "url": "/customer/shop?category=makeup", "order": 2},
    {"title": "Best Sellers", "url": "/customer/shop?filter=best-sellers", "order": 3},
    {"title": "New Arrivals", "url": "/customer/shop?filter=new-arrivals", "order": 4},
]
for item in footer1_items:
    NavigationItem.objects.create(menu=footer1, **item)

# Footer Company
footer2 = NavigationMenu.objects.create(name="Footer - Company", location="footer_2")
footer2_items = [
    {"title": "About Us", "url": "/about", "order": 1},
    {"title": "Partners", "url": "/partners", "order": 2},
    {"title": "Distribution", "url": "/distribution", "order": 3},
    {"title": "Careers", "url": "/careers", "order": 4},
    {"title": "Track Order", "url": "/customer/orders", "order": 5},
    {"title": "Shipping Policy", "url": "/shipping", "order": 6},
    {"title": "Returns", "url": "/returns", "order": 7},
    {"title": "Contact", "url": "/contact", "order": 8},
]
for item in footer2_items:
    NavigationItem.objects.create(menu=footer2, **item)

print(f"[OK] Footer menus created")

print("\n[SUCCESS] CMS seeding complete! All real landing page data is now in the database.")
print("   Go to: http://localhost:3000/admin/website-settings")
