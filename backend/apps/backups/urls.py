from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'backups'

router = DefaultRouter()
router.register('', views.BackupViewSet, basename='backup')

urlpatterns = [
    path('', include(router.urls)),
]
