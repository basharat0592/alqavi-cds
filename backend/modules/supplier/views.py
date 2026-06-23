from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Supplier
from .serializers import SupplierSerializer
from modules.users.models import Role
from core.permissions import HasModulePermission

User = get_user_model()

class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for Supplier CRUD operations"""
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [AllowAny, HasModulePermission]
    perm_module = 'suppliers'

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Supplier creation logic - Hashing handled by Serializer."""
        data = request.data.copy()
        
        # Set default username if missing
        if not data.get('username') and data.get('email'):
            data['username'] = data.get('email').split('@')[0]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update supplier details - Hashing handled by Serializer."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(SupplierSerializer(instance).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete supplier and its associated Shadow User record."""
        instance = self.get_object()
        email = instance.email
        
        from modules.users.models import User as ShadowUser
        ShadowUser.objects.filter(email=email, is_supplier=True, real_id=instance.id).delete()
        
        return super().destroy(request, *args, **kwargs)
