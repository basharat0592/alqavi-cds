# Adds the `link` field to NavbarPage and seeds the default storefront navbar links.

from django.db import migrations, models
from django.utils.text import slugify


DEFAULT_PAGES = [
    {"name": "About Us", "link": "/about", "order": 0},
    {"name": "Track Order", "link": "/customer/tracking", "order": 1},
    {"name": "Customer Service", "link": "/contact", "order": 2},
    {"name": "Gift Cards", "link": "/gift-cards", "order": 3},
    {"name": "Wishlists", "link": "/customer/wishlist", "order": 4},
]


def seed_pages(apps, schema_editor):
    NavbarPage = apps.get_model('cms', 'NavbarPage')
    # Only seed when the table is empty, so we never clobber admin-managed data.
    if NavbarPage.objects.exists():
        return
    for page in DEFAULT_PAGES:
        NavbarPage.objects.create(
            name=page["name"],
            slug=slugify(page["name"]),
            link=page["link"],
            order=page["order"],
            is_visible=True,
        )


def unseed_pages(apps, schema_editor):
    NavbarPage = apps.get_model('cms', 'NavbarPage')
    NavbarPage.objects.filter(name__in=[p["name"] for p in DEFAULT_PAGES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0007_navbarpage_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='navbarpage',
            name='link',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Destination URL/route this navbar item links to (e.g. /about)',
                max_length=500,
            ),
        ),
        migrations.RunPython(seed_pages, unseed_pages),
    ]
