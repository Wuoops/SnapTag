from django.contrib import admin
from .models import Tag, TagAlias


class TagAliasInline(admin.TabularInline):
    model = TagAlias
    extra = 1


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'usage_count', 'created_by', 'created_at']
    search_fields = ['name']
    inlines = [TagAliasInline]


@admin.register(TagAlias)
class TagAliasAdmin(admin.ModelAdmin):
    list_display = ['alias', 'tag', 'created_at']
    search_fields = ['alias', 'tag__name']
