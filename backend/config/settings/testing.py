from .base import *

DEBUG = True
SECRET_KEY = 'test-key'

# Uses the MySQL database from base settings (SQLite removed project-wide).
# Django automatically creates/destroys a test_<name> database for the test run.
