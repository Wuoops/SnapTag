from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .serializers import (
    UserSerializer, RegisterSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    from django.contrib.auth import authenticate
    user = authenticate(request, username=username, password=password)
    if user is None:
        # Try email login
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None:
        return Response({'detail': '用户名或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'detail': '已登出'})


@api_view(['GET', 'PATCH'])
def profile_view(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    login(request, request.user)
    return Response({'detail': '密码修改成功'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request_view(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    user = User.objects.get(email=email)
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    reset_url = f"{request.META.get('HTTP_ORIGIN', 'http://localhost:3000')}/reset-password/{uid}/{token}"

    send_mail(
        subject='SnapTag - 重置密码',
        message=f'请点击以下链接重置密码：\n\n{reset_url}\n\n如果不是你本人操作，请忽略此邮件。',
        from_email=settings.EMAIL_HOST_USER or 'noreply@snaptag.local',
        recipient_list=[email],
        fail_silently=True,
    )

    return Response({'detail': '密码重置邮件已发送，请检查邮箱'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm_view(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': '无效的重置链接'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, serializer.validated_data['token']):
        return Response({'detail': '重置链接已过期'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'detail': '密码重置成功'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_auth_view(request):
    if request.user.is_authenticated:
        return Response(UserSerializer(request.user).data)
    return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)
