# Cosmetic Distributor System

A comprehensive, scalable B2B and B2C cosmetic distribution platform built with modern web technologies and best practices.

## 🎯 Overview

**Cosmetic Distributor System** is a full-stack e-commerce and inventory management platform designed for cosmetics wholesalers and retailers. The application handles product catalogs, customer management, inventory tracking, sales orders, and financial accounting—all with a clean, modular architecture.

## 🏗️ Architecture

### Tech Stack

- **Backend**: Django 4.2+ with Django REST Framework (DRF)
- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Database**: MySQL 5.7+ (PostgreSQL compatible)
- **Cache/Queue**: Redis 6+ with Celery
- **Containerization**: Docker + Docker Compose

### Project Structure

The project is organized into two main directories:

```
cosmetic-distributor-system/
├── frontend/       # Next.js React application
├── backend/        # Django REST API
├── docker/         # Container configurations
└── docs/          # Project documentation
```

**For detailed architecture information**, see [ARCHITECTURE.md](ARCHITECTURE.md)

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

**Backend available at**: `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start development server
npm run dev
```

**Frontend available at**: `http://localhost:3000`

## 🗂️ New Project Structure

### Backend Module Organization

The backend uses a **modular architecture** with function-based API endpoints:

```
backend/
├── config/           # Django configuration
│   ├── settings/    # Environment-specific settings
│   ├── urls.py      # Main URL routing
│   └── wsgi.py/asgi.py
│
├── core/            # Shared utilities (NO NEW APPS!)
│   ├── models.py           # BaseModel abstract class
│   ├── constants.py        # Application constants
│   ├── exceptions.py       # Custom exceptions
│   ├── validators.py       # Field validators
│   ├── mixins.py          # Reusable model mixins
│   ├── utils.py           # Utility functions
│   └── permissions.py     # Permission classes
│
├── modules/         # Feature modules (business logic)
│   ├── users/       # User management and authentication
│   ├── customers/   # Customer profiles and management
│   ├── products/    # Product catalog
│   ├── inventory/   # Stock management
│   ├── sales/       # Sales orders
│   ├── purchases/   # Purchase orders
│   ├── suppliers/   # Supplier management
│   ├── payments/    # Payment processing
│   ├── accounting/  # Financial records
│   ├── reports/     # Business reports
│   ├── notifications/ # Notification system
│   └── companies/   # Company management
│
├── logs/            # Application logs
├── media/           # User-uploaded files
├── static/          # Static assets
├── tests/           # Test suite
├── manage.py
└── requirements.txt
```

### Module Structure

Each module follows a consistent, function-based pattern:

```
modules/[module_name]/
├── apps.py          # Django app configuration
├── models.py        # Database models
├── serializers.py   # API request/response serializers
├── views.py         # Function-based API endpoints
├── urls.py          # URL routing
├── services.py      # Business logic functions
├── permissions.py   # Custom permissions (if needed)
└── migrations/      # Database migrations
```

**Key Feature**: All views are **function-based** with decorators for clarity and testability:

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get the authenticated user's profile."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
```

## 📚 Documentation

### Key Documentation Files

- **[QUICKSTART.md](QUICKSTART.md)** - Setup guide and common commands
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture overview
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migrating from old code structure

### Additional Documentation

- `/docs/API/` - API documentation and examples
- `/docs/Architecture/` - Architecture diagrams
- `/docs/ERD/` - Database schema diagrams
- `/docs/Deployment/` - Production deployment guides

## API Endpoints

### Structure

All API endpoints follow the pattern: `/api/v1/{module}/`

### Available Endpoints

| Module | Base URL | Description |
|--------|----------|-------------|
| Users | `/api/v1/users/` | User management & authentication |
| Customers | `/api/v1/customers/` | Customer profiles |
| Products | `/api/v1/products/` | Product catalog |
| Inventory | `/api/v1/inventory/` | Stock management |
| Sales | `/api/v1/sales/` | Sales orders |
| Purchases | `/api/v1/purchases/` | Purchase orders |
| Suppliers | `/api/v1/suppliers/` | Supplier data |
| Payments | `/api/v1/payments/` | Payment processing |
| Accounting | `/api/v1/accounting/` | Financial records |
| Reports | `/api/v1/reports/` | Business reports |
| Notifications | `/api/v1/notifications/` | Notifications |
| Companies | `/api/v1/companies/` | Company data |

### Authentication

Uses JWT (JSON Web Token) authentication:

```bash
POST /api/v1/users/login/
{
  "username": "user@example.com",
  "password": "password123"
}
```

Include token in subsequent requests:
```
Authorization: Bearer <access_token>
```

## 🐳 Docker Support

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- Django backend (port 8000)
- Next.js frontend (port 3000)
- MySQL database (port 3306)
- Redis (port 6379)
- Nginx reverse proxy

## 🔧 Development Commands

### Backend Commands

```bash
# Run migrations
python manage.py migrate

# Create migrations
python manage.py makemigrations

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test

# Django shell
python manage.py shell

# Collect static files
python manage.py collectstatic

# Run on custom port
python manage.py runserver 8001
```

### Frontend Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production build
npm run start

# Run linter
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 📋 Features

### Current Implementation
- ✅ User management and authentication (JWT-based)
- ✅ Customer profile management
- ✅ Product catalog with categories
- ✅ Basic inventory tracking
- ✅ Modular API structure
- ✅ Function-based API views
- ✅ Comprehensive error handling
- ✅ Permission-based access control

### Coming Soon
- 🔜 Complete sales order system
- 🔜 Purchase order management
- 🔜 Advanced inventory analytics
- 🔜 Payment gateway integration
- 🔜 Financial reporting
- 🔜 Email notifications
- 🔜 Admin dashboard enhancements

## 🛠️ Development Workflow

### Creating a New Module

1. Create module directory under `modules/`
2. Copy the template structure (see users module)
3. Define models, serializers, views, and URLs
4. Update `INSTALLED_APPS` in settings
5. Update main `config/urls.py`
6. Run migrations

### Best Practices

- ✅ Use function-based views with decorators
- ✅ Keep business logic in `services.py`
- ✅ Inherit from `BaseModel` for unified UUID handling
- ✅ Use mixins from `core/` for common functionality
- ✅ Add docstrings to all functions
- ✅ Write tests for critical functions
- ✅ Follow Django conventions

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- CORS configuration for frontend
- Environment-based settings
- Password validation and hashing
- SQL injection protection (ORM)
- CSRF protection

## 📊 Database

### Supported Databases

- MySQL 5.7+ (Primary)
- PostgreSQL 10+ (Compatible)
- SQLite (Development)

### Key Tables

All models extend `BaseModel` providing:
- UUID primary key
- Automatic timestamps (created_at, updated_at)
- Consistent field naming across modules

## 🧪 Testing

```bash
# Run all tests
python manage.py test

# Run specific module tests
python manage.py test modules.users

# Run with verbosity
python manage.py test --verbosity=2

# Run specific test case
python manage.py test modules.users.tests.UserTests
```

## 📈 Deployment

### Production Setup

1. Configure production settings in `config/settings/production.py`
2. Set environment variables securely
3. Run migrations: `python manage.py migrate`
4. Collect static files: `python manage.py collectstatic`
5. Use WSGI/ASGI server (Gunicorn/Uvicorn)
6. Configure reverse proxy (Nginx)

See [Deployment Guide](docs/Deployment/) for detailed instructions.

## 🐛 Troubleshooting

### Common Issues

**ModuleNotFoundError**: Ensure virtual environment is activated and requirements installed.

**Database errors**: Check MySQL is running and credentials in `.env` are correct.

**CORS errors**: Verify `CORS_ALLOWED_ORIGINS` in Django settings.

**Port already in use**: Run development server on different port: `python manage.py runserver 8001`

For more help, check the troubleshooting section in [QUICKSTART.md](QUICKSTART.md).

## 📝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes following the project structure
3. Write tests for new functionality
4. Ensure code passes linting: `npm run lint` (frontend)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For questions or issues:
1. Check the documentation files in `/docs`
2. Review the [QUICKSTART.md](QUICKSTART.md) guide
3. See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) if upgrading from old code
4. Check the [ARCHITECTURE.md](ARCHITECTURE.md) for structural details

## 🎓 Learning Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [DRF Best Practices](https://www.django-rest-framework.org/topics/authentication/)

---

**Last Updated**: February 26, 2026

**Version**: 2.0 (Restructured)

Built with ❤️ for scalable e-commerce platforms.
