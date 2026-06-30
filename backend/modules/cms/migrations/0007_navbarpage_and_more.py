# Generated migration for NavbarPage model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0006_sitesettings_announcement_bg_color_and_more'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='NavbarPage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of this navbar section', max_length=255, unique=True)),
                ('slug', models.SlugField(blank=True, max_length=255, unique=True)),
                ('description', models.TextField(blank=True, help_text='Internal description', null=True)),
                ('icon_url', models.CharField(blank=True, help_text='URL or icon class', max_length=500, null=True)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order in navbar')),
                ('is_visible', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Navbar Page',
                'verbose_name_plural': 'Navbar Pages',
                'ordering': ['order'],
            },
        ),
    ]
