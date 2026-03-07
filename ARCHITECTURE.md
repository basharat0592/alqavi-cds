# Cosmetic Distributor System - Restructured Architecture

## Overview

The project has been restructured into a cleaner, more maintainable organization with two main directories: `frontend` and `backend`. The backend follows Django best practices with a function-level approach for better code clarity and organization.

## New Directory Structure

```
cosmetic-distributor-system/
├── frontend/                          # Next.js frontend application
│   ├── public/
│   ├── src/
│   │   ├── app/                      # Next.js pages and layouts
│   │   ├── components/               # React components
│   │   ├── context/                  # Context providers
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── services/                 # API service layer
│   │   ├── store/                    # State management
│   │   ├── types/                    # TypeScript types
│   │   ├── constants/                # Application constants
│   │   └── styles/                   # CSS/styling
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Django REST API
│   ├── config/                        # Django project configuration
│   │   ├── settings/                 # Environment-specific settings
│   │   │   ├── base.py              # Base configuration
│   │   │   ├── development.py       # Development settings
│   │   │   ├── production.py        # Production settings
│   │   │   └── testing.py           # Testing settings
│   │   ├── urls.py                  # Main URL routing
│   │   ├── wsgi.py                  # WSGI configuration
│   │   └── asgi.py                  # ASGI configuration
│   │
│   ├── core/                          # Shared utilities and base classes
│   │   ├── __init__.py
│   │   ├── models.py                # BaseModel abstract class
│   │   ├── constants.py             # Application constants
│   │   ├── exceptions.py            # Custom exceptions
│   │   ├── validators.py            # Field validators
│   │   ├── mixins.py                # Model and ViewSet mixins
│   │   ├── utils.py                 # Utility functions
│   │   └── permissions.py           # Custom permission classes
│   │
│   ├── modules/                       # Application modules (features)
│   │   ├── users/                   # User management
│   │   │   ├── apps.py
│   │   │   ├── models.py            # User model definition
│   │   │   ├── views.py             # Function-based API views
│   │   │   ├── serializers.py       # Request/response serializers
│   │   │   ├── urls.py              # Module URL routes
│   │   │   ├── services.py          # Business logic functions
│   │   │   ├── migrations/
│   │   │   └── __init__.py
│   │   │
│   │   ├── customers/               # Customer management
│   │   ├── products/                # Product catalog
│   │   ├── inventory/               # Inventory management
│   │   ├── sales/                   # Sales orders
│   │   ├── purchases/               # Purchase orders
│   │   ├── suppliers/               # Supplier management
│   │   ├── payments/                # Payment processing
│   │   ├── accounting/              # Financial accounting
│   │   ├── reports/                 # Business reports
│   │   ├── notifications/           # Notification system
│   │   └── companies/               # Company management
│   │
│   ├── logs/                          # Application logs
│   ├── media/                         # User-uploaded files
│   ├── static/                        # Static files (CSS, JS)
│   ├── tests/                         # Test suite
│   ├── manage.py                      # Django management script
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # Environment variables template
│   └── db.sqlite3                     # Local database (development)
│
├── docker/                            # Docker configuration
│   ├── backend/
│   │   └── Dockerfile
│   ├── frontend/
│   │   └── Dockerfile
│   └── nginx/
│       └── default.conf
│
├── docs/                              # Project documentation
│   ├── API/                          # API documentation
│   ├── Architecture/                 # Architecture diagrams
│   ├── Deployment/                   # Deployment guides
│   ├── ERD/                          # Entity relationship diagrams
│   └── UI-Wireframes/                # UI mockups
│
├── docker-compose.yml                 # Docker Compose configuration
├── README.md                          # Project documentation
└── .gitignore                         # Git ignore rules
```

## Module Organization & Function-Level Approach

Each module under `modules/` follows a consistent structure designed for clarity and maintainability:

### Standard Module Structure

```
modules/[module_name]/
├── __init__.py              # Module initialization
├── apps.py                  # Django app configuration
├── models.py                # Database models
├── serializers.py           # DRF serializers for API
├── views.py                 # Function-based API views
├── urls.py                  # URL routing
├── services.py              # Business logic functions
├── migrations/              # Database migrations
└── __init__.py
```

### Function-Level Approach

All API endpoints are implemented using **function-based views** with decorators. This approach provides:

- **Clarity**: Each function handles one specific operation
- **Testability**: Pure functions are easier to test
- **Reusability**: Functions can be imported and used elsewhere
- **Maintainability**: Clear separation of concerns

#### Example: Users Module

**views.py** - Function-based API endpoints:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get authenticated user's profile."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
def create_user(request):
    """Create a new user account."""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**services.py** - Business logic functions:
```python
def authenticate_user(username, password):
    """Authenticate a user with credentials."""
    user = authenticate(username=username, password=password)
    return user

def get_user_by_email(email):
    """Retrieve a user by email."""
    return User.objects.filter(email=email).first()

def update_user_profile(user, **kwargs):
    """Update user profile information."""
    for field, value in kwargs.items():
        if hasattr(user, field):
            setattr(user, field, value)
    user.save()
    return user
```

**urls.py** - URL routing:
```python
app_name = 'users'

urlpatterns = [
    path('me/', views.get_current_user, name='current-user'),
    path('create/', views.create_user, name='user-create'),
    path('<str:user_id>/', views.user_detail, name='user-detail'),
    path('', views.list_users, name='user-list'),
]
```

## Core Module

The `core/` directory contains shared utilities used across all modules:

- **models.py**: `BaseModel` abstract class with UUID and timestamp fields
- **constants.py**: Application-wide constants (status choices, etc.)
- **exceptions.py**: Custom exception classes for API responses
- **validators.py**: Field validation functions
- **mixins.py**: Django model mixins (`TimestampMixin`, `StatusMixin`, `SoftDeleteMixin`)
- **utils.py**: Utility functions (UUID generation, pagination, currency formatting)
- **permissions.py**: Custom DRF permission classes

## API Endpoint Organization

All API endpoints follow a consistent pattern under `/api/v1/`:

```
/api/v1/users/              - User management
/api/v1/customers/          - Customer profiles
/api/v1/products/           - Product catalog
/api/v1/inventory/          - Stock management
/api/v1/sales/              - Sales orders
/api/v1/purchases/          - Purchase orders
/api/v1/suppliers/          - Supplier data
/api/v1/payments/           - Payment processing
/api/v1/accounting/         - Financial records
/api/v1/reports/            - Business reports
/api/v1/notifications/      - Notifications
/api/v1/companies/          - Company data
```

## Django Configuration

### Settings Structure
The `config/settings/` directory contains environment-specific configurations:

- **base.py**: Common settings shared across environments
- **development.py**: Development-specific settings
- **production.py**: Production-specific settings
- **testing.py**: Testing-specific settings

### INSTALLED_APPS Update
All apps now reference the `modules` package:
```python
INSTALLED_APPS = [
    # Django default apps
    'django.contrib.admin',
    'django.contrib.auth',
    # ... other defaults
    
    # Third-party apps
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    
    # Local modules
    'modules.users',
    'modules.customers',
    'modules.products',
    'modules.inventory',
    'modules.sales',
    'modules.purchases',
    'modules.payments',
    'modules.accounting',
    'modules.reports',
    'modules.notifications',
    'modules.suppliers',
    'modules.companies',
]
```

### Custom User Model
The system uses a custom User model extending Django's AbstractUser:

```python
AUTH_USER_MODEL = 'users.User'
```

Features:
- UUID primary key
- Timestamp tracking (created_at, updated_at)
- Status field (active, inactive, archived)
- Additional fields: phone, address, city, country, postal_code

## Benefits of This Structure

1. **Scalability**: Easy to add new modules without affecting existing code
2. **Maintainability**: Each module is self-contained and focused
3. **Testability**: Pure functions in services layer are easy to unit test
4. **Code Reusability**: Common utilities in `core/` prevent duplication
5. **Clear Separation**: Views handle HTTP, services handle business logic
6. **Consistency**: All modules follow the same structure and naming conventions
7. **Documentation**: Function-based views and services have clear docstrings

## Migration Guide

If you have existing code referencing the old structure:

### Old Structure → New Structure
```python
# Old
from apps.users.models import User
from apps.products.views import ProductViewSet

# New
from modules.users.models import User
from modules.products.views import list_products, product_detail
```

## Development Workflow

### Creating a New Module

1. Create module directory under `modules/`
2. Copy the template structure (users module is a good template)
3. Define models in `models.py`
4. Create serializers in `serializers.py`
5. Implement business logic in `services.py`
6. Create API endpoints in `views.py` (function-based)
7. Add URL routes in `urls.py`
8. Update `INSTALLED_APPS` in settings
9. Update main `config/urls.py`

### Adding a New API Endpoint

```python
# In modules/[module]/views.py
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def endpoint_handler(request):
    """
    Handle GET and POST requests for this endpoint.
    
    Args:
        request: HTTP request object
        
    Returns:
        Response: JSON response
    """
    # Implementation here
    pass
```

## Frontend Structure

The frontend is organized as a Next.js application with:

- `/app` - Page components and routing
- `/components` - Reusable React components
- `/services` - API service layer
- `/hooks` - Custom React hooks
- `/context` - Context providers
- `/store` - State management
- `/types` - TypeScript definitions
- `/constants` - Application constants

## Additional Resources

- See `/docs/Architecture/` for detailed architecture diagrams
- See `/docs/API/` for API documentation and examples
- See `/docs/Deployment/` for deployment guidelines
- See `/docs/ERD/` for database schema diagrams

---

**Last Updated**: February 26, 2026

This new structure provides a foundation for a scalable, maintainable cosmetics distribution system with clear separation of concerns and consistent patterns across all modules.
