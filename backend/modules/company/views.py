"""
Company module API views.
"""
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Company, CompanyCategory
from .serializers import CompanySerializer, CompanyCategorySerializer
from core.utils import get_or_404_response


@api_view(['GET'])
@permission_classes([AllowAny])
def list_categories(request):
    """List all company categories."""
    categories = CompanyCategory.objects.all().order_by('name')
    return Response(CompanyCategorySerializer(categories, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_category(request):
    """Create a new company category."""
    serializer = CompanyCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def category_detail(request, category_id):
    """Retrieve, update, or delete a specific category."""
    category, err = get_or_404_response(CompanyCategory, id=category_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(CompanyCategorySerializer(category).data)

    if request.method in ('PUT', 'PATCH'):
        serializer = CompanyCategorySerializer(category, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    category.delete()
    return Response({'message': 'Category deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_companies(request):
    """List all companies. Public endpoint."""
    companies = Company.objects.all().order_by('-created_at')
    return Response(CompanySerializer(companies, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_company(request):
    """Create a new company."""
    serializer = CompanySerializer(data=request.data)
    if serializer.is_valid():
        company = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def company_detail(request, company_id):
    """Retrieve, update, or delete a specific company."""
    company, err = get_or_404_response(Company, id=company_id)
    if err:
        return err

    if request.method == 'GET':
        return Response(CompanySerializer(company).data)

    if request.method in ('PUT', 'PATCH'):
        serializer = CompanySerializer(company, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    company.delete()
    return Response({'message': 'Company deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
