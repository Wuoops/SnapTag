from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('password-reset/', views.password_reset_request_view, name='password-reset'),
    path('password-reset-confirm/', views.password_reset_confirm_view, name='password-reset-confirm'),
    path('check/', views.check_auth_view, name='check-auth'),
]
