from django.middleware.csrf import CsrfViewMiddleware
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class EnsureCsrfCookieMiddleware(MiddlewareMixin):
    """Ensure csrftoken cookie is set on every response so the frontend can read it."""

    def process_response(self, request, response):
        if not request.META.get("CSRF_COOKIE_USED"):
            from django.middleware.csrf import get_token
            get_token(request)
            request.META["CSRF_COOKIE_USED"] = True
        return response


class DynamicCsrfMiddleware(CsrfViewMiddleware):
    """
    When CSRF_TRUST_ALL_ORIGINS is True, skip origin verification
    so any IP/domain can make requests without pre-configuration.
    """

    def _origin_verified(self, request):
        if getattr(settings, 'CSRF_TRUST_ALL_ORIGINS', False):
            return True
        return super()._origin_verified(request)

    def _check_referer(self, request):
        if getattr(settings, 'CSRF_TRUST_ALL_ORIGINS', False):
            return None
        return super()._check_referer(request)

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if getattr(settings, 'CSRF_TRUST_ALL_ORIGINS', False):
            request._dont_enforce_csrf_checks = True
            return None
        return super().process_view(request, callback, callback_args, callback_kwargs)
