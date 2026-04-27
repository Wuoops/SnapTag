from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex


class Tag(models.Model):
    """Flat tag with usage count tracking and trigram search support."""
    name = models.CharField(max_length=100, unique=True, db_index=True)
    color = models.CharField(max_length=7, default='#4A90D9')
    description = models.TextField(blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_tags'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tags'
        ordering = ['-usage_count', 'name']
        indexes = [
            GinIndex(
                name='tag_name_trgm_idx',
                fields=['name'],
                opclasses=['gin_trgm_ops'],
            ),
        ]

    def __str__(self):
        return self.name

    def refresh_usage_count(self):
        self.usage_count = self.file_tags.count()
        self.save(update_fields=['usage_count'])


class TagAlias(models.Model):
    """Alias/synonym for a tag. e.g., JS -> JavaScript"""
    alias = models.CharField(max_length=100, unique=True, db_index=True)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='aliases')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tag_aliases'
        ordering = ['alias']
        indexes = [
            GinIndex(
                name='alias_name_trgm_idx',
                fields=['alias'],
                opclasses=['gin_trgm_ops'],
            ),
        ]

    def __str__(self):
        return f'{self.alias} -> {self.tag.name}'
