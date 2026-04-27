from django.db import models
from django.conf import settings


class Backup(models.Model):
    STATUS_CHOICES = [
        ('pending', '等待中'),
        ('running', '备份中'),
        ('completed', '已完成'),
        ('failed', '失败'),
    ]

    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    includes_files = models.BooleanField(default=True)
    includes_db = models.BooleanField(default=True)
    note = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'backups'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'
