"""
Products module API URLs.
"""
from django.urls import path
from . import views


app_name = 'products'

urlpatterns = [
    path('items/', views.list_products, name='product-list-create-items'),
    path('items/<str:product_id>/', views.product_detail, name='product-detail-manage'),
    path('items/<str:product_id>/adjust-stock/', views.adjust_stock, name='product-adjust-stock'),
    path('categories/', views.list_categories, name='category-list'),
    path('categories/<str:category_id>/', views.category_detail, name='category-detail'),
    
    # Main Categories
    path('main-categories/', views.list_main_categories, name='main-category-list'),
    path('main-categories/<str:m_category_id>/', views.main_category_detail, name='main-category-detail'),
    # Wishlist Management
    path('wishlist/', views.list_wishlist, name='wishlist-list'),
    path('wishlist/add/', views.add_to_wishlist, name='wishlist-add'),
    path('wishlist/<str:product_id>/remove/', views.remove_from_wishlist, name='wishlist-remove'),
]
