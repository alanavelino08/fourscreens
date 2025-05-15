# permissions.py
from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # user = request.user

        # if not user.is_authenticated:
        #     return False

        # Acceso completo para ADMIN
        # if user.role == 'ADMIN':
        #     return True

        # Solo lectura para PLANNER
        # if user.role == 'PLANNER':
        #     return request.method in permissions.SAFE_METHODS

        # Otros roles: sin acceso
        # return False
        return request.user.is_authenticated and request.user.role == 'ADMIN'