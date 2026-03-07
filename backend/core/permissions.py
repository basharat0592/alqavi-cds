"""
Custom permission classes for API endpoints.
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Allow access to the owning user only.
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow admins to edit, everyone can read.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsAuthenticated(permissions.BasePermission):
    """
    Allow access only to authenticated users.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
