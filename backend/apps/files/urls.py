from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'files'

router = DefaultRouter()
router.register('', views.FileViewSet, basename='file')

urlpatterns = [
    path('', include(router.urls)),
]
