from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Supplier
from .serializers import SupplierSerializer
from modules.users.models import Role

User = get_user_model()

class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for Supplier CRUD operations"""
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Dedicated Supplier creation logic - No User record created."""
        from django.contrib.auth.hashers import make_password
        data = request.data.copy()
        
        # Hash password if provided
        if data.get('password'):
            data['password'] = make_password(data['password'])
            
        # Set default username if missing
        if not data.get('username') and data.get('email'):
            data['username'] = data.get('email').split('@')[0]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(plain_password=request.data.get('password'))
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update supplier details, handling password hashing."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        from django.contrib.auth.hashers import make_password
        if data.get('password'):
            data['password'] = make_password(data['password'])
        else:
            data.pop('password', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        if data.get('password'):
            serializer.save(plain_password=request.data.get('password'))
        else:
            self.perform_update(serializer)

        return Response(SupplierSerializer(instance).data)
