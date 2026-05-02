import os
from .base import *

DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-alkavi-dev-key-2025')
ALLOWED_HOSTS = ['*']

# Force refresh the signing key to match the dev secret key
SIMPLE_JWT['SIGNING_KEY'] = SECRET_KEY

# Register debug middleware
MIDDLEWARE = [
    'core.middleware.DebugMiddleware',
] + MIDDLEWARE

# Database — local MySQL (XAMPP/WAMP) with SQLite fallback
if os.environ.get('USE_SQLITE', 'False').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('MYSQL_DATABASE', 'al_qavidb'),
            'USER': os.environ.get('MYSQL_USER', 'root'),
            'PASSWORD': os.environ.get('MYSQL_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }

# Allow frontend to talk to backend
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False  # Disable to avoid CSRF issues with cookies in dev

# Disable CSRF for API endpoints (API uses JWT auth)
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
]

# Ensure we don't have mixed session/token auth issues
REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = (
    'modules.users.authentication.MultiTableJWTAuthentication',
)
