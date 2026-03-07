"""
Users module API URLs.
"""
from django.urls import path
from . import views


from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

app_name = 'users'

urlpatterns = [
    # Auth
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User Management
    path('', views.list_users, name='user-list'),
    path('profile/', views.get_profile, name='user-profile'),
    path('create/', views.create_user, name='user-create'),
    path('<int:user_id>/', views.user_detail, name='user-detail'),
    path('<int:user_id>/update/', views.update_user, name='user-update'),
    path('<int:user_id>/delete/', views.delete_user, name='user-delete'),
    
    # Role Assignment
    path('<int:user_id>/assign-role/', views.assign_role, name='user-assign-role'),
    
    # User Status Management
    path('<int:user_id>/activate/', views.activate_user, name='user-activate'),
    path('<int:user_id>/deactivate/', views.deactivate_user, name='user-deactivate'),
    path('<int:user_id>/suspend/', views.suspend_user, name='user-suspend'),
    
    # Password Management
    path('<int:user_id>/change-password/', views.change_password, name='user-change-password'),
    
    # Activity Logs
    path('<int:user_id>/activity-logs/', views.user_activity_log, name='user-activity-logs'),
    path('Admin/all-activity-logs/', views.all_activity_logs, name='all-activity-logs'),
    
    # Role Management
    path('roles/', views.list_roles, name='role-list'),
    path('roles/<int:role_id>/', views.role_detail, name='role-detail'),
    path('roles/create/', views.create_role, name='role-create'),
    
    # Permission Management
    path('permissions/', views.list_permissions, name='permission-list'),

    # User Settings
    path('settings/', views.get_user_settings, name='user-settings-get'),
    path('settings/update/', views.update_user_settings, name='user-settings-update'),
]
