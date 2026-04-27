from django.db.models import Q, Value, CharField, F
from django.db.models.functions import Length
from django.contrib.postgres.search import TrigramSimilarity
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response

from .models import Tag, TagAlias
from .serializers import TagSerializer, TagAliasSerializer


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.prefetch_related('aliases').all()
    serializer_class = TagSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def suggest(self, request):
        """
        Smart tag suggestion endpoint.
        Matching priority: exact > prefix > alias match > trigram similarity
        """
        q = request.query_params.get('q', '').strip()
        if not q:
            tags = Tag.objects.order_by('-usage_count')[:15]
            results = [
                {
                    'id': t.id, 'name': t.name, 'color': t.color,
                    'usage_count': t.usage_count,
                    'match_type': 'popular', 'matched_alias': None,
                }
                for t in tags
            ]
            return Response(results)

        results = []
        seen_ids = set()

        exact = Tag.objects.filter(name__iexact=q).first()
        if exact:
            results.append({
                'id': exact.id, 'name': exact.name, 'color': exact.color,
                'usage_count': exact.usage_count,
                'match_type': 'exact', 'matched_alias': None,
            })
            seen_ids.add(exact.id)

        prefix_tags = (
            Tag.objects.filter(name__istartswith=q)
            .exclude(id__in=seen_ids)
            .order_by('-usage_count')[:5]
        )
        for t in prefix_tags:
            results.append({
                'id': t.id, 'name': t.name, 'color': t.color,
                'usage_count': t.usage_count,
                'match_type': 'prefix', 'matched_alias': None,
            })
            seen_ids.add(t.id)

        alias_matches = (
            TagAlias.objects.filter(
                Q(alias__istartswith=q) | Q(alias__icontains=q)
            )
            .exclude(tag_id__in=seen_ids)
            .select_related('tag')[:5]
        )
        for a in alias_matches:
            t = a.tag
            results.append({
                'id': t.id, 'name': t.name, 'color': t.color,
                'usage_count': t.usage_count,
                'match_type': 'alias', 'matched_alias': a.alias,
            })
            seen_ids.add(t.id)

        if len(results) < 10:
            similar_tags = (
                Tag.objects.annotate(
                    similarity=TrigramSimilarity('name', q)
                )
                .filter(similarity__gt=0.1)
                .exclude(id__in=seen_ids)
                .order_by('-similarity', '-usage_count')[:max(0, 10 - len(results))]
            )
            for t in similar_tags:
                results.append({
                    'id': t.id, 'name': t.name, 'color': t.color,
                    'usage_count': t.usage_count,
                    'match_type': 'similar', 'matched_alias': None,
                })
                seen_ids.add(t.id)

        return Response(results)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        limit = int(request.query_params.get('limit', '20'))
        tags = Tag.objects.order_by('-usage_count')[:limit]
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_alias(self, request, pk=None):
        tag = self.get_object()
        alias_name = request.data.get('alias', '').strip()
        if not alias_name:
            return Response({'detail': '别名不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        if TagAlias.objects.filter(alias__iexact=alias_name).exists():
            return Response({'detail': '该别名已被使用'}, status=status.HTTP_400_BAD_REQUEST)

        alias = TagAlias.objects.create(alias=alias_name, tag=tag)
        return Response(TagAliasSerializer(alias).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='remove-alias/(?P<alias_id>[0-9]+)')
    def remove_alias(self, request, pk=None, alias_id=None):
        tag = self.get_object()
        try:
            alias = tag.aliases.get(id=alias_id)
            alias.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TagAlias.DoesNotExist:
            return Response({'detail': '别名不存在'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def resolve_tag(request):
    """Resolve a tag name or alias to an actual Tag. Creates if not exists."""
    name = request.data.get('name', '').strip()
    if not name:
        return Response({'detail': '标签名不能为空'}, status=status.HTTP_400_BAD_REQUEST)

    tag = Tag.objects.filter(name__iexact=name).first()
    if tag:
        return Response(TagSerializer(tag).data)

    alias = TagAlias.objects.filter(alias__iexact=name).select_related('tag').first()
    if alias:
        return Response(TagSerializer(alias.tag).data)

    tag = Tag.objects.create(name=name, created_by=request.user)
    return Response(TagSerializer(tag).data, status=status.HTTP_201_CREATED)
