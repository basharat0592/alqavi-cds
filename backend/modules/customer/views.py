from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.contrib.auth.hashers import make_password
from .models import Customer
from .serializers import CustomerSerializer, CustomerCreateSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer CRUD operations"""
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new Customer with hashed password."""
        data = request.data.copy()
        if data.get('password'):
            data['password'] = make_password(data['password'])
        
        if not data.get('username') and data.get('email'):
            # Use email as username to ensure uniqueness, or fallback to prefix if email is missing
            data['username'] = data.get('email')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save(plain_password=request.data.get('password'))
        
        # Return detail serializer output with context for absolute URLs
        return Response(CustomerSerializer(customer, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update customer details, handling password separately if provided."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        if data.get('password'):
            data['password'] = make_password(data['password'])
        else:
            data.pop('password', None) # Don't overwrite if empty

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        if data.get('password'):
            serializer.save(plain_password=request.data.get('password'))
        else:
            self.perform_update(serializer)

        return Response(CustomerSerializer(instance, context={'request': request}).data)
