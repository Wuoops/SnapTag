from rest_framework import serializers
from apps.tags.serializers import TagSerializer
from .models import File, FileTag


class FileTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)

    class Meta:
        model = FileTag
        fields = ['id', 'tag', 'tagged_by', 'created_at']


class FileSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True, required=False, default=[]
    )
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = File
        fields = [
            'id', 'name', 'original_name', 'file', 'file_url',
            'file_type', 'file_size', 'mime_type', 'description',
            'tags', 'tag_ids', 'is_favorite',
            'uploaded_by', 'uploaded_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'original_name', 'file_size', 'file_type', 'mime_type',
            'uploaded_by', 'created_at', 'updated_at',
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def create(self, validated_data):
        validated_data.pop('tag_ids', [])
        uploaded_file = validated_data.get('file')
        if uploaded_file:
            if not validated_data.get('name'):
                validated_data['name'] = uploaded_file.name
            validated_data['original_name'] = uploaded_file.name
            validated_data['file_size'] = uploaded_file.size
            content_type = getattr(uploaded_file, 'content_type', '')
            validated_data['mime_type'] = content_type

        file_obj = File.objects.create(**validated_data)
        return file_obj

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tag_ids is not None:
            user = self.context['request'].user
            instance.file_tags.exclude(tag_id__in=tag_ids).delete()
            for tag_id in tag_ids:
                FileTag.objects.get_or_create(
                    file=instance, tag_id=tag_id,
                    defaults={'tagged_by': user}
                )
            from apps.tags.models import Tag
            Tag.objects.all().update(usage_count=0)
            for tag in Tag.objects.all():
                tag.refresh_usage_count()

        return instance


class FileListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    tags = TagSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id', 'name', 'original_name', 'file_url',
            'file_type', 'file_size', 'description',
            'tags', 'is_favorite', 'created_at',
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None
