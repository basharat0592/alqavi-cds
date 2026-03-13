"""
Sales module URL routing.
"""
from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    # Order endpoints
    path('orders/', views.list_orders, name='list-orders'),
    path('orders/<int:order_id>/', views.order_detail, name='order-detail'),
    path('orders/create/', views.create_order, name='create-order'),
    path('orders/<int:order_id>/update/', views.update_order, name='update-order'),
    path('orders/<int:order_id>/delete/', views.delete_order, name='delete-order'),
    
    # Dashboard endpoints
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('dashboard/recent-orders/', views.recent_orders, name='recent-orders'),
]

