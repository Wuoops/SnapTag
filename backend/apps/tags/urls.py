from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'tags'

router = DefaultRouter()
router.register('', views.TagViewSet, basename='tag')

urlpatterns = [
    path('resolve/', views.resolve_tag, name='resolve-tag'),
    path('', include(router.urls)),
]
