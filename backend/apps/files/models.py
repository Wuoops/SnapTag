import os
from django.db import models
from django.conf import settings
from apps.tags.models import Tag


def file_upload_path(instance, filename):
    return f'uploads/{instance.uploaded_by_id}/{filename}'


class File(models.Model):
    name = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=file_upload_path)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, through='FileTag', related_name='files', blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files'
    )
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'files'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['uploaded_by', '-created_at']),
            models.Index(fields=['file_type']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name

    @property
    def extension(self):
        _, ext = os.path.splitext(self.original_name)
        return ext.lower()

    def save(self, *args, **kwargs):
        if self.file and not self.file_size:
            self.file_size = self.file.size
        if not self.file_type:
            self.file_type = self.extension.lstrip('.')
        super().save(*args, **kwargs)


class FileTag(models.Model):
    """Through model for File-Tag M2M relationship with metadata."""
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='file_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='file_tags')
    tagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_tags'
        unique_together = ('file', 'tag')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.file.name} - {self.tag.name}'
