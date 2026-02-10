from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RequestViewSet, CustomTokenObtainPairView, PartNumberViewSet, ShipmentCreateView, ShipmentListView, ShipmentViewSet, PendingShipmentsDashboard, ShipmentsDashboard, get_last_shipment, TransportViewSet, get_shipments_today_and_tomorrow, reset_password_direct, PartNumberSearch, ExcelUploadView, scan_pallet, location_status, delete_pallet, pallet_history, update_pallet_quantity, cargar_partes, MatchPedidoView, SaveMaterialEntryView, MaterialEntryListView, AdvanceMaterialEntryView, AdvanceYellowConeView, StepsListView, SaveMaterialWithdrawalView, MaterialWithdrawalSummaryView, ValidarDescargasView, FinalizeGreenConeView, BuyerMaterialRequestView, BuyerValidatePartView, BuyerListView, SendMailView, HandleRejectedEntryView, shipment_report, AuditoryViewSet, WarehouseAreaViewSet, MaterialMetrics, LocateMaterialView, BuyerCreatePartView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static
print("MEDIA_ROOT en runtime:", settings.MEDIA_ROOT)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'partnumbers', PartNumberViewSet, basename='partnumber')
router.register(r'transports', TransportViewSet, basename='transport')
router.register(r'auditories', AuditoryViewSet, basename='auditory')
router.register(r'areas', WarehouseAreaViewSet, basename='area')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('shipments/', ShipmentCreateView.as_view(), name='shipment-create'),
    path('shipments/list/', ShipmentListView.as_view(), name='shipment-list'),
    #path('shipments/<int:pk>/approve/', ShipmentViewSet.as_view({'patch': 'approve'}), name='shipment-approve'),
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
    path('upload-excel/', ExcelUploadView.as_view(), name='upload-excel'),
    path('scan-pallet/', scan_pallet, name='scan_pallet'),
    path('location-status/', location_status, name='location_status'),
    path("pallets/<int:pallet_id>/", delete_pallet, name="delete_pallet"),
    path("pallet-history/", pallet_history, name="pallet_history"),
    path("update-pallet/<int:pk>/", update_pallet_quantity),
    #path('get-data-excel/', ExcelDataView.as_view(), name="get-data-excel"),
    path("cargar-partes/", cargar_partes, name="cargar_partes"),
    path('match-pedido/', MatchPedidoView.as_view(), name="match-data-doc"),
    path('save-material-entries/', SaveMaterialEntryView.as_view(), name='material-entry'),
    path('all-material-entries/', MaterialEntryListView.as_view()),
    path('material-entry/<int:entry_id>/advance/', AdvanceMaterialEntryView.as_view()),
    path('material-entry/<int:entry_id>/advance-yellow/', AdvanceYellowConeView.as_view()),
    path("entries/<int:entry_id>/finalize-green/", FinalizeGreenConeView.as_view(), name="finalize-green-cone"),
    path("entries/<int:entry_id>/locate/", LocateMaterialView.as_view()),
    path("material-entry/<int:entry_id>/handle-rejected/", HandleRejectedEntryView.as_view(), name="rejected-red-cone"),
    path('steps/', StepsListView.as_view(), name='steps-list'),
    path('save-material-withdrawal/', SaveMaterialWithdrawalView.as_view()),
    path('material-withdrawals-summary/', MaterialWithdrawalSummaryView.as_view()),
    path("validar-descargas/", ValidarDescargasView.as_view(), name="validar-descargas"),
    path("buyer-material-request/", BuyerMaterialRequestView.as_view(), name="hotlist-request"),
    path('buyer-validate-part/<str:cod_art>/', BuyerValidatePartView.as_view(), name='buyer-validate-part'),
    path("buyers/", BuyerListView.as_view(), name="buyer-list"),
    path("buyer-create-part/", BuyerCreatePartView.as_view(), name="buyer-create-part"),
    path("send-mail/", SendMailView.as_view(), name="send-mail"),
    path('shipment_report/', shipment_report, name='shipment_report'),
    path("material_metrics/", MaterialMetrics.as_view(), name="material-metrics")
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)