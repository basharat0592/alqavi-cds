"""
Custom validators for form and model fields.
"""
from django.core.exceptions import ValidationError
import re


def validate_phone_number(value):
    """
    Validate phone number format.
    
    Args:
        value: Phone number string to validate
        
    Raises:
        ValidationError: If phone number format is invalid
    """
    pattern = r'^\+?1?\d{9,15}$'
    if not re.match(pattern, value.replace('-', '').replace(' ', '')):
        raise ValidationError('Invalid phone number format.')


def validate_postal_code(value):
    """
    Validate postal code format.
    
    Args:
        value: Postal code string to validate
        
    Raises:
        ValidationError: If postal code format is invalid
    """
    if not value or len(value) < 3:
        raise ValidationError('Invalid postal code.')


def validate_positive_number(value):
    """
    Validate that a number is positive.
    
    Args:
        value: Number to validate
        
    Raises:
        ValidationError: If number is not positive
    """
    if value <= 0:
        raise ValidationError('Value must be positive.')
