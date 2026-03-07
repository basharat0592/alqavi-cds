# Migration Guide: From Old to New Structure

## Overview

This guide helps you migrate existing code from the old `apps/` structure to the new `modules/` structure.

## Import Statements

Update all import statements from `apps.` to `modules.`:

### User Models
```python
# OLD
from apps.users.models import CustomUser, User

# NEW
from modules.users.models import User
from django.contrib.auth import get_user_model
User = get_user_model()
```

### Product Models
```python
# OLD
from apps.products.models import Product

# NEW
from modules.products.models import Product
```

### Customer Models
```python
# OLD
from apps.customers.models import Customer

# NEW
from modules.customers.models import Customer
```

## View Updates

### Views (HTTP Layer)

Old class-based views should be converted to function-based views:

```python
# OLD - Class-Based View
from rest_framework import viewsets
from apps.products.models import Product
from apps.products.serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

# NEW - Function-Based View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from modules.products.models import Product
from modules.products.serializers import ProductSerializer

@api_view(['GET'])
def list_products(request):
    """List all products."""
    products = Product.objects.filter(status='active')
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def product_detail(request, product_id):
    """Retrieve a specific product."""
    try:
        product = Product.objects.get(id=product_id)
        serializer = ProductSerializer(product)
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
```

## Business Logic (Services)

Extract business logic from views into dedicated service functions:

```python
# OLD - Logic in View
class CustomerViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Complex business logic mixed here
        send_welcome_email(serializer.instance)
        create_customer_profile(serializer.instance)

# NEW - Logic in Services
# modules/customers/services.py
def create_customer_from_user(user, **kwargs):
    """Create customer profile for user."""
    customer = Customer.objects.create(user=user, **kwargs)
    return customer

def send_welcome_notification(customer):
    """Send welcome notification to customer."""
    # Implementation
    pass

# modules/customers/views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer_profile(request):
    """Create customer profile."""
    serializer = CustomerCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        customer = services.create_customer_from_user(
            request.user,
            **serializer.validated_data
        )
        services.send_welcome_notification(customer)
        return Response(CustomerSerializer(customer).data, status=201)
    return Response(serializer.errors, status=400)
```

## URL Routing

Update URL imports in `config/urls.py`:

```python
# OLD
urlpatterns = [
    path('api/v1/users/', include('apps.users.urls')),
    path('api/v1/products/', include('apps.products.urls')),
]

# NEW
urlpatterns = [
    path('api/v1/users/', include('modules.users.urls')),
    path('api/v1/products/', include('modules.products.urls')),
]
```

Update URL routing within modules:

```python
# modules/products/urls.py
app_name = 'products'

urlpatterns = [
    path('', views.list_products, name='product-list'),
    path('<str:product_id>/', views.product_detail, name='product-detail'),
    path('manage/<str:product_id>/', views.manage_product, name='product-manage'),
    path('manage/', views.manage_product, name='product-create'),
]
```

## Serializer Updates

Update serializer imports and keep them consistent:

```python
# OLD
from apps.products.models import Product
from apps.products.serializers import ProductSerializer

# NEW
from modules.products.models import Product
from modules.products.serializers import ProductSerializer, ProductCreateUpdateSerializer
```

## Model Updates

Use `BaseModel` from core for all new models:

```python
# OLD
from apps.common.models import BaseModel

# NEW
from core.models import BaseModel

class Product(BaseModel):
    name = models.CharField(max_length=255)
```

For mixins, import from core:

```python
# OLD
from apps.common.mixins import TimestampMixin, StatusMixin

# NEW
from core.mixins import TimestampMixin, StatusMixin

class Product(BaseModel, StatusMixin, TimestampMixin):
    name = models.CharField(max_length=255)
```

## Exception Handling

Use exceptions from core:

```python
# OLD
from apps.common.exceptions import ValidationException

# NEW
from core.exceptions import ValidationException, NotFoundException, PaymentException

try:
    product = Product.objects.get(id=product_id)
except Product.DoesNotExist:
    raise NotFoundException('Product not found')
```

## Utility Functions

Use utility functions from core:

```python
# OLD
from apps.common.utils import generate_uuid, format_currency

# NEW
from core.utils import generate_uuid, paginate_queryset, format_currency

# Common utilities
value_uuid = generate_uuid()
price_str = format_currency(99.99, 'USD')  # Outputs: $99.99
paginated, total, pages = paginate_queryset(queryset, page=1)
```

## Validators

Update validator imports:

```python
# OLD
from apps.common.validators import validate_phone_number

# NEW
from core.validators import validate_phone_number, validate_postal_code

class User(models.Model):
    phone = models.CharField(max_length=20, validators=[validate_phone_number])
```

## Permissions

Use permission classes from core:

```python
# OLD
from apps.common.permissions import IsOwner

# NEW
from core.permissions import IsOwner, IsAdminOrReadOnly

@api_view(['GET'])
@permission_classes([IsOwner])
def get_user_profile(request):
    pass
```

## Settings Configuration

Update INSTALLED_APPS:

```python
# OLD
INSTALLED_APPS = [
    'apps.users',
    'apps.products',
    'apps.customers',
    'apps.common',  # REMOVE THIS
]

# NEW
INSTALLED_APPS = [
    'modules.users',
    'modules.products',
    'modules.customers',
    # No need for 'modules.common' - it's in core/
]
```

Update AUTH_USER_MODEL:

```python
# OLD
AUTH_USER_MODEL = 'users.CustomUser'

# NEW
AUTH_USER_MODEL = 'users.User'
```

## Testing Updates

Update test imports:

```python
# OLD
from apps.users.models import User
from apps.users.serializers import UserSerializer

# NEW
from modules.users.models import User
from modules.users.serializers import UserSerializer

# OLD - ViewSet testing
from rest_framework.test import APITestCase
from apps.products.views import ProductViewSet

class ProductTests(APITestCase):
    def test_list_products(self):
        self.client.get('/api/v1/products/')

# NEW - Function-based view testing
from rest_framework.test import APITestCase
from modules.products import views as product_views

class ProductTests(APITestCase):
    def test_list_products(self):
        response = self.client.get('/api/v1/products/')
        self.assertEqual(response.status_code, 200)
```

## Celery Tasks

Update task imports:

```python
# OLD
from apps.inventory.tasks import update_stock

# NEW
from modules.inventory.services import update_stock
# Or if using Celery specifically:
from modules.inventory.tasks import update_stock_async
```

## API Client Updates

If using the API from frontend or external clients, ensure URLs match:

```javascript
// Frontend API calls remain the same
fetch('http://localhost:8000/api/v1/products/') // Still works!
fetch('http://localhost:8000/api/v1/users/me/')  // Still works!
```

## Checklist for Migration

- [ ] Update all imports from `apps` to `modules`
- [ ] Update INSTALLED_APPS in settings
- [ ] Update AUTH_USER_MODEL
- [ ] Update main `config/urls.py`
- [ ] Convert class-based views to function-based
- [ ] Extract business logic to services layer
- [ ] Update test imports and structure
- [ ] Update any scripts or management commands
- [ ] Update CircleCI/GitHub Actions workflows if applicable
- [ ] Update API documentation
- [ ] Test all endpoints after migration
- [ ] Update frontend API calls if needed (usually no change needed)

## Common Migration Errors

### ImportError: No module named 'apps.xxx'
**Solution**: Replace `apps.` with `modules.` in the import statement.

### AttributeError: User has no attribute CustomUser
**Solution**: Use `from modules.users.models import User` instead.

### INSTALLED_APPS error
**Solution**: Ensure all modules in `config/settings/base.py` use `'modules.xxx'` format.

### URL routing Error
**Solution**: Update `config/urls.py` to include `'modules.xxx.urls'` instead of `'apps.xxx.urls'`.

## Verification Steps

1. **Run migrations**: `python manage.py migrate`
2. **Create superuser**: `python manage.py createsuperuser`
3. **Test endpoints**: Test each API endpoint in your module
4. **Check logs**: Review logs for any import errors
5. **Run tests**: `python manage.py test`

---

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md)
