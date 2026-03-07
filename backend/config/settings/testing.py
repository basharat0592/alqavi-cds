from .base import *

DEBUG = True
SECRET_KEY = 'test-key'
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
