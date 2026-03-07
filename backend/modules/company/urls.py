"""
Company module API URLs.
"""
from django.urls import path
from . import views

app_name = 'company'

urlpatterns = [
    # Company categories
    path('categories/', views.list_categories, name='category-list'),
    path('categories/create/', views.create_category, name='category-create'),
    path('categories/<int:category_id>/', views.category_detail, name='category-detail'),
    
    # Companies
    path('', views.list_companies, name='company-list'),
    path('create/', views.create_company, name='company-create'),
    path('<int:company_id>/', views.company_detail, name='company-detail'),
]
