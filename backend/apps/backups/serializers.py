from rest_framework import serializers
from .models import Backup


class BackupSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Backup
        fields = [
            'id', 'name', 'file_size', 'status',
            'includes_files', 'includes_db', 'note',
            'error_message', 'created_by', 'created_by_name',
            'created_at', 'completed_at',
        ]
        read_only_fields = [
            'id', 'file_size', 'status', 'error_message',
            'created_by', 'created_at', 'completed_at',
        ]
