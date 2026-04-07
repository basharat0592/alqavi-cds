"""
Sales module URL routing.
"""
from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    # Order endpoints
    path('orders/', views.list_orders, name='list-orders'),
    path('orders/create/', views.create_order, name='create-order'),
    path('orders/<uuid:order_id>/', views.order_detail, name='order-detail'),
    path('orders/<uuid:order_id>/cancel/', views.cancel_order, name='cancel-order'),
    path('orders/<uuid:order_id>/received/', views.confirm_order_received, name='confirm-received'),
    path('orders/<uuid:order_id>/update/', views.update_order, name='update-order'),
    path('orders/<uuid:order_id>/delete/', views.delete_order, name='delete-order'),
    path('track/<str:order_number>/', views.track_order, name='track-order'),
    
    # Dashboard endpoints
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('dashboard/recent-orders/', views.recent_orders, name='recent-orders'),
    path('supplier/dashboard/stats/', views.supplier_dashboard_stats, name='supplier-dashboard-stats'),

    # Purchase Order endpoints
    path('purchases/', views.list_purchases, name='list-purchases'),
    path('purchases/create/', views.create_purchase, name='create-purchase'),
    path('purchases/<uuid:pk>/', views.purchase_detail, name='purchase-detail'),

    # Purchase Return endpoints
    path('purchase-returns/', views.list_purchase_returns, name='list-purchase-returns'),
    path('purchase-returns/create/', views.create_purchase_return, name='create-purchase-return'),
    path('purchase-returns/<uuid:pk>/', views.purchase_return_detail, name='purchase-return-detail'),
]
