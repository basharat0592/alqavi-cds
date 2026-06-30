"""
Users module API URLs.
"""
from django.urls import path
from . import views


from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

app_name = 'users'

# NOTE: All literal routes (roles/, permissions/, settings/, profile/, ...) MUST be
# declared BEFORE the dynamic ``<str:user_id>/`` routes. ``<str:user_id>`` matches any
# single path segment, so if it comes first it shadows literals like ``settings/`` and
# ``roles/`` (routing them into ``user_detail`` and causing 500s).
urlpatterns = [
    # Auth
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.signup, name='user-register'),
    path('register/supplier/', views.signup_supplier, name='supplier-register'),
    path('register/admin/', views.signup_admin, name='admin-register'),

    # User Management (literal)
    path('', views.list_users, name='user-list'),
    path('profile/', views.get_profile, name='user-profile'),
    path('create/', views.create_user, name='user-create'),

    # Role Management (literal — must precede <str:user_id>)
    path('roles/', views.list_roles, name='role-list'),
    path('roles/create/', views.create_role, name='role-create'),
    path('roles/<int:role_id>/', views.role_detail, name='role-detail'),

    # Permission Management (literal)
    path('permissions/', views.list_permissions, name='permission-list'),

    # User Settings (literal)
    path('settings/', views.get_user_settings, name='user-settings-get'),
    path('settings/update/', views.update_user_settings, name='user-settings-update'),

    # Activity Logs (literal-prefixed)
    path('Admin/all-activity-logs/', views.all_activity_logs, name='all-activity-logs'),
    path('activity-logs/<int:log_id>/mark-read/', views.mark_activity_read, name='mark-activity-read'),
    path('activity-logs/mark-all-read/', views.mark_all_activities_read, name='mark-all-activities-read'),

    # ── Dynamic per-user routes LAST (<str:user_id> is a greedy single-segment match) ──
    path('<str:user_id>/', views.user_detail, name='user-detail'),
    path('<str:user_id>/update/', views.update_user, name='user-update'),
    path('<str:user_id>/delete/', views.delete_user, name='user-delete'),
    path('<str:user_id>/assign-role/', views.assign_role, name='user-assign-role'),
    path('<str:user_id>/activate/', views.activate_user, name='user-activate'),
    path('<str:user_id>/deactivate/', views.deactivate_user, name='user-deactivate'),
    path('<str:user_id>/suspend/', views.suspend_user, name='user-suspend'),
    path('<str:user_id>/change-password/', views.change_password, name='user-change-password'),
    path('<str:user_id>/admin-reset-password/', views.admin_reset_password, name='user-admin-password-reset'),
    path('<str:user_id>/activity-logs/', views.user_activity_log, name='user-activity-logs'),
]
