from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1 endpoints
    path('api/v1/users/', include('modules.users.urls')),
    path('api/v1/products/', include('modules.products.urls')),
    path('api/v1/sales/', include('modules.sales.urls')),
    path('api/v1/inventory/', include('modules.inventory.urls')),
    path('api/v1/payments/', include('modules.payments.urls')),
    path('api/v1/company/', include('modules.company.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
