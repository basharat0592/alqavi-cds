"""
Custom exceptions for the application.
"""
from rest_framework.exceptions import APIException


class BaseAPIException(APIException):
    """Base exception class for API exceptions."""
    
    status_code = 400
    default_detail = 'An error occurred.'


class ValidationException(BaseAPIException):
    """Raised when validation fails."""
    
    status_code = 400
    default_detail = 'Validation error.'


class NotFoundException(BaseAPIException):
    """Raised when a resource is not found."""
    
    status_code = 404
    default_detail = 'Resource not found.'


class PaymentException(BaseAPIException):
    """Raised when payment processing fails."""
    
    status_code = 400
    default_detail = 'Payment processing error.'


class InventoryException(BaseAPIException):
    """Raised for inventory-related errors."""
    
    status_code = 400
    default_detail = 'Inventory error.'
