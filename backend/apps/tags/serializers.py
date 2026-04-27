from rest_framework import serializers
from .models import Tag, TagAlias


class TagAliasSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagAlias
        fields = ['id', 'alias', 'tag', 'created_at']
        read_only_fields = ['id', 'created_at']


class TagSerializer(serializers.ModelSerializer):
    aliases = TagAliasSerializer(many=True, read_only=True)
    alias_list = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True, required=False, default=[]
    )

    class Meta:
        model = Tag
        fields = [
            'id', 'name', 'color', 'description',
            'usage_count', 'aliases', 'alias_list',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def create(self, validated_data):
        alias_list = validated_data.pop('alias_list', [])
        tag = Tag.objects.create(**validated_data)
        for alias_name in alias_list:
            TagAlias.objects.get_or_create(alias=alias_name.strip(), tag=tag)
        return tag

    def update(self, instance, validated_data):
        alias_list = validated_data.pop('alias_list', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if alias_list is not None:
            instance.aliases.exclude(alias__in=alias_list).delete()
            for alias_name in alias_list:
                TagAlias.objects.get_or_create(alias=alias_name.strip(), tag=instance)

        return instance


class TagSuggestionSerializer(serializers.Serializer):
    """Used for tag autocomplete responses."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    usage_count = serializers.IntegerField()
    match_type = serializers.CharField()  # 'exact', 'prefix', 'similar', 'alias'
    matched_alias = serializers.CharField(required=False, allow_null=True)
