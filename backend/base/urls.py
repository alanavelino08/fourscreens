from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RequestViewSet, CustomTokenObtainPairView, PartNumberViewSet, ShipmentCreateView, ShipmentListView, ShipmentViewSet, PendingShipmentsDashboard, ShipmentsDashboard, get_last_shipment, TransportViewSet, get_shipments_today_and_tomorrow, reset_password_direct, PartNumberSearch
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'partnumbers', PartNumberViewSet, basename='partnumber')
router.register(r'transports', TransportViewSet, basename='transport')


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
    path('shipments/last/', get_last_shipment, name='last-shipment'),
    path('shipments/get_shipments_today_and_tomorrow/',get_shipments_today_and_tomorrow, name='today-tomorrow'),
    path('shipments/<int:pk>/update_add_albaran/', ShipmentViewSet.as_view({'patch': 'update_add_albaran'}), name='shipment-update-albaran'),
    path('shipments/<int:pk>/update_wh_comment/', ShipmentViewSet.as_view({'patch': 'update_wh_comment'}), name="shipment-update-whcomment"),
    path('shipments/<int:pk>/update_admin_comment/', ShipmentViewSet.as_view({'patch': 'update_admin_comment'}), name="shipment-update-admincomment"),
    path('auth/reset-password/', reset_password_direct),
    path('partnumber/filter/', PartNumberSearch.as_view(), name='allshipments-dashboard'),
    #path('shipments/<int:shipment_id>/update_wh_comment/', ShipmentViewSet.as_view({'patch': 'update_wh_comment'}), name='update_wh_comment'),
    #path('shipments/<int:shipment_id>/admin_comment/', views.update_admin_comment, name='update_admin_comment'),
]