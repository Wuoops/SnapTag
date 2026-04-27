from django.db.models import Q, Count
from django.http import FileResponse
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tags.models import Tag
from .models import File, FileTag
from .serializers import FileSerializer, FileListSerializer


class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = File.objects.prefetch_related('tags', 'tags__aliases').all()
        return self._apply_filters(qs)

    def _apply_filters(self, qs):
        params = self.request.query_params

        tag_ids = params.get('tags', '')
        tag_mode = params.get('tag_mode', 'union')
        if tag_ids:
            parsed = [int(t.strip()) for t in tag_ids.split(',') if t.strip().isdigit()]
            if parsed:
                if tag_mode == 'intersect':
                    for tid in parsed:
                        qs = qs.filter(tags__id=tid)
                else:
                    qs = qs.filter(tags__id__in=parsed)

        # Filter by file type
        file_type = params.get('file_type', '')
        if file_type:
            qs = qs.filter(file_type__in=file_type.split(','))

        # Filter by favorite
        favorite = params.get('favorite', '')
        if favorite.lower() in ('true', '1'):
            qs = qs.filter(is_favorite=True)

        # Search by name or description
        search = params.get('search', '')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(original_name__icontains=search)
            )

        # Date range filter
        date_from = params.get('date_from', '')
        date_to = params.get('date_to', '')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return FileListSerializer
        return FileSerializer

    def perform_create(self, serializer):
        file_obj = serializer.save(uploaded_by=self.request.user)
        # Handle tag_ids from multipart FormData (getlist for repeated fields)
        tag_ids = self.request.data.getlist('tag_ids', [])
        if not tag_ids:
            tag_ids = self.request.data.getlist('tag_ids[]', [])
        for tid in tag_ids:
            try:
                tid = int(tid)
                FileTag.objects.get_or_create(
                    file=file_obj, tag_id=tid,
                    defaults={'tagged_by': self.request.user}
                )
            except (ValueError, Exception):
                pass
        for tag in Tag.objects.filter(file_tags__file=file_obj):
            tag.refresh_usage_count()

    @action(detail=True, methods=['post'])
    def add_tag(self, request, pk=None):
        file = self.get_object()
        tag_id = request.data.get('tag_id')
        tag_name = request.data.get('tag_name', '').strip()

        if tag_id:
            try:
                tag = Tag.objects.get(id=tag_id)
            except Tag.DoesNotExist:
                return Response({'detail': '标签不存在'}, status=status.HTTP_404_NOT_FOUND)
        elif tag_name:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name, defaults={'created_by': request.user}
            )
        else:
            return Response({'detail': '请提供标签ID或名称'}, status=status.HTTP_400_BAD_REQUEST)

        _, created = FileTag.objects.get_or_create(
            file=file, tag=tag, defaults={'tagged_by': request.user}
        )
        tag.refresh_usage_count()

        if not created:
            return Response({'detail': '该标签已存在'}, status=status.HTTP_200_OK)

        return Response(FileSerializer(file, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_tag(self, request, pk=None):
        file = self.get_object()
        tag_id = request.data.get('tag_id')
        deleted, _ = FileTag.objects.filter(file=file, tag_id=tag_id).delete()
        if deleted:
            try:
                tag = Tag.objects.get(id=tag_id)
                tag.refresh_usage_count()
            except Tag.DoesNotExist:
                pass
        return Response(FileSerializer(file, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file = self.get_object()
        if not file.file or not file.file.storage.exists(file.file.name):
            return Response({'detail': '文件不存在'}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(
            file.file.open('rb'),
            as_attachment=True,
            filename=file.original_name or file.name,
        )
        return response

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        file = self.get_object()
        file.is_favorite = not file.is_favorite
        file.save(update_fields=['is_favorite'])
        return Response({'is_favorite': file.is_favorite})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = File.objects.all()
        return Response({
            'total_files': qs.count(),
            'total_size': sum(f.file_size for f in qs.only('file_size')),
            'file_types': dict(
                qs.values('file_type')
                .annotate(count=Count('id'))
                .values_list('file_type', 'count')
            ) if qs.exists() else {},
            'favorites': qs.filter(is_favorite=True).count(),
        })

    @action(detail=False, methods=['post'])
    def batch_tag(self, request):
        """Add a tag to multiple files at once."""
        file_ids = request.data.get('file_ids', [])
        tag_id = request.data.get('tag_id')
        tag_name = request.data.get('tag_name', '').strip()

        if tag_id:
            try:
                tag = Tag.objects.get(id=tag_id)
            except Tag.DoesNotExist:
                return Response({'detail': '标签不存在'}, status=status.HTTP_404_NOT_FOUND)
        elif tag_name:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name, defaults={'created_by': request.user}
            )
        else:
            return Response({'detail': '请提供标签'}, status=status.HTTP_400_BAD_REQUEST)

        files = File.objects.filter(id__in=file_ids)
        created_count = 0
        for f in files:
            _, created = FileTag.objects.get_or_create(
                file=f, tag=tag, defaults={'tagged_by': request.user}
            )
            if created:
                created_count += 1

        tag.refresh_usage_count()
        return Response({'tagged': created_count, 'total': files.count()})
