from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RequestViewSet, CustomTokenObtainPairView, PartNumberViewSet, ShipmentCreateView, ShipmentListView, ShipmentViewSet, PendingShipmentsDashboard, ShipmentsDashboard
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'partnumbers', PartNumberViewSet, basename='partnumber')


urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('shipments/', ShipmentCreateView.as_view(), name='shipment-create'),
    path('shipments/list/', ShipmentListView.as_view(), name='shipment-list'),
    path('shipments/<int:pk>/approve/', ShipmentViewSet.as_view({'patch': 'approve'}), name='shipment-approve'),
    path('shipments/<int:pk>/update_status/', ShipmentViewSet.as_view({'patch': 'update_status'}), name='shipment-update-status'),
    path('users/<int:pk>/', UserViewSet.as_view({'patch': 'update'}), name='user-update-data'),
    path('shipments/dashboard/', PendingShipmentsDashboard.as_view(), name='shipments-dashboard'),
    path('allshipments/dashboard/', ShipmentsDashboard.as_view(), name='allshipments-dashboard'),
]