# Quick Start Guide - New Project Structure

## Project Overview

**Cosmetic Distributor System** is a full-stack e-commerce and inventory management platform built with:
- **Backend**: Django REST Framework with a modular architecture
- **Frontend**: Next.js with TypeScript
- **Database**: MySQL
- **Message Queue**: Celery with Redis

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- MySQL 5.7+
- Redis 6+

### Backend Setup

#### 1. Virtual Environment Setup

```bash
cd cosmetic-distributor-system/backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database
MYSQL_DATABASE=cosmetics_db
MYSQL_USER=root
MYSQL_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis/Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# JWT
JWT_SECRET=your-jwt-secret

# Stripe (if using payment gateway)
STRIPE_API_KEY=your-stripe-key
```

#### 4. Run Database Migrations

```bash
python manage.py migrate
```

#### 5. Create Superuser

```bash
python manage.py createsuperuser
```

#### 6. Start Development Server

```bash
python manage.py runserver
```

The API will be available at: `http://localhost:8000`

### Frontend Setup

#### 1. Install Dependencies

```bash
cd cosmetic-distributor-system/frontend
npm install
# or
yarn install
```

#### 2. Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

#### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The frontend will be available at: `http://localhost:3000`

## API Documentation

### Authentication

The API uses JWT (JSON Web Token) authentication.

#### Login Endpoint

```bash
POST /api/v1/users/login/
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Using the Token

Include the token in subsequent requests:

```bash
GET /api/v1/users/me/
Authorization: Bearer <access_token>
```

### Core API Endpoints

#### Users Module

```
GET    /api/v1/users/                   # List all users (admin only)
POST   /api/v1/users/create/            # Register new user
GET    /api/v1/users/me/                # Get current user profile
GET    /api/v1/users/<user_id>/         # Get user details
PATCH  /api/v1/users/<user_id>/         # Update user
DELETE /api/v1/users/<user_id>/         # Delete user
```

#### Products Module

```
GET    /api/v1/products/                # List products
GET    /api/v1/products/<product_id>/   # Get product details
POST   /api/v1/products/manage/         # Create product (admin)
PATCH  /api/v1/products/manage/<id>/    # Update product (admin)
DELETE /api/v1/products/manage/<id>/    # Delete product (admin)
GET    /api/v1/products/categories/     # List categories
```

#### Customers Module

```
GET    /api/v1/customers/profile/       # Get current customer profile
POST   /api/v1/customers/profile/create/# Create customer profile
GET    /api/v1/customers/<id>/          # Get customer details
PATCH  /api/v1/customers/<id>/          # Update customer
DELETE /api/v1/customers/<id>/          # Delete customer
GET    /api/v1/customers/               # List all customers (admin)
```

#### Inventory Module

```
GET    /api/v1/inventory/               # Get inventory status
POST   /api/v1/inventory/update/        # Update stock
GET    /api/v1/inventory/low-stock/     # Get low stock items
```

#### Sales Module

```
GET    /api/v1/sales/                   # List sales orders
POST   /api/v1/sales/create/            # Create sales order
GET    /api/v1/sales/<order_id>/        # Get order details
PATCH  /api/v1/sales/<order_id>/        # Update order
```

## Project Structure Reference

### Backend Directory Layout

```
backend/
├── config/              # Django configuration
│   ├── settings/       # Environment-specific settings
│   ├── urls.py        # URL routing
│   └── wsgi.py        # WSGI entry point
│
├── core/               # Shared utilities
│   ├── models.py      # BaseModel
│   ├── constants.py   # App constants
│   ├── exceptions.py  # Custom exceptions
│   ├── validators.py  # Field validators
│   ├── mixins.py      # Model mixins
│   ├── utils.py       # Utility functions
│   └── permissions.py # Permission classes
│
├── modules/            # Feature modules
│   ├── users/         # User management
│   ├── products/      # Product catalog
│   ├── customers/     # Customer management
│   ├── inventory/     # Stock management
│   ├── sales/         # Sales orders
│   ├── purchases/     # Purchase orders
│   ├── suppliers/     # Supplier data
│   ├── payments/      # Payment processing
│   ├── accounting/    # Financial records
│   ├── reports/       # Business reports
│   ├── notifications/ # Notifications
│   └── companies/     # Company data
│
├── logs/              # Application logs
├── media/             # User uploads
├── static/            # Static files
├── tests/             # Test suite
├── manage.py          # Django CLI
└── requirements.txt   # Python dependencies
```

### Frontend Directory Layout

```
frontend/
├── public/            # Static assets
├── src/
│   ├── app/          # Next.js pages
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   ├── services/     # API service layer
│   ├── context/      # Context providers
│   ├── store/        # State management
│   ├── types/        # TypeScript types
│   ├── constants/    # Constants
│   └── styles/       # Global styles
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Module Development

### Creating a New Module

Each module under `modules/` should have this structure:

```
modules/[module_name]/
├── __init__.py
├── apps.py          # App configuration
├── models.py        # Database models
├── serializers.py   # DRF serializers
├── views.py         # Function-based views
├── urls.py          # URL patterns
├── services.py      # Business logic
└── migrations/
```

### Example: Adding a New Endpoint

1. **Define the model** (`models.py`):
```python
from core.models import BaseModel
from core.mixins import StatusMixin, TimestampMixin

class Example(BaseModel, StatusMixin, TimestampMixin):
    name = models.CharField(max_length=255)
```

2. **Create serializer** (`serializers.py`):
```python
from rest_framework import serializers
from .models import Example

class ExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Example
        fields = '__all__'
```

3. **Create view** (`views.py`):
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Example
from .serializers import ExampleSerializer

@api_view(['GET'])
def list_examples(request):
    examples = Example.objects.all()
    serializer = ExampleSerializer(examples, many=True)
    return Response(serializer.data)
```

4. **Add URL route** (`urls.py`):
```python
from django.urls import path
from . import views

app_name = 'examples'

urlpatterns = [
    path('', views.list_examples, name='list'),
]
```

5. **Add to main URLs** (`config/urls.py`):
```python
path('api/v1/examples/', include('modules.examples.urls')),
```

## Common Commands

### Backend Commands

```bash
# Run migrations
python manage.py migrate

# Create migration
python manage.py makemigrations

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Run tests
python manage.py test

# Shell access
python manage.py shell

# Collect static files
python manage.py collectstatic
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Run linting
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'modules'`
- **Solution**: Make sure you've activated the virtual environment and installed requirements.

**Issue**: `No such table: users_user`
- **Solution**: Run migrations: `python manage.py migrate`

**Issue**: Port 8000 already in use
- **Solution**: Run on different port: `python manage.py runserver 8001`

### Frontend Issues

**Issue**: `Error: NEXT_PUBLIC_API_URL is not set`
- **Solution**: Create `.env.local` file with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

**Issue**: CORS errors when calling backend
- **Solution**: Ensure `CORS_ALLOWED_ORIGINS` is configured in Django settings.

## Docker Setup (Optional)

### Build and Run with Docker Compose

```bash
cd cosmetic-distributor-system
docker-compose up -d
```

This will start:
- Django backend on port 8000
- Next.js frontend on port 3000
- MySQL on port 3306
- Redis on port 6379

## Next Steps

1. Read the [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture overview
2. Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) if migrating from old code
3. Review API documentation in `/docs/API/`
4. Check database schema in `/docs/ERD/`
5. Explore the example modules (users, customers, products) for patterns

## Support & Documentation

- **API Documentation**: See `/docs/API/` for endpoint examples
- **Architecture**: Read [ARCHITECTURE.md](ARCHITECTURE.md)
- **Migration**: Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Database**: See `/docs/ERD/` for schema diagrams

---

**Happy Coding!** 🚀

For any questions or issues, refer to the documentation files in the `/docs` directory or the individual README files in each module.
