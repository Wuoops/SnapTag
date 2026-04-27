from django.contrib import admin
from .models import File, FileTag


class FileTagInline(admin.TabularInline):
    model = FileTag
    extra = 1


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['name', 'file_type', 'file_size', 'uploaded_by', 'created_at']
    list_filter = ['file_type', 'is_favorite', 'created_at']
    search_fields = ['name', 'description']
    inlines = [FileTagInline]
