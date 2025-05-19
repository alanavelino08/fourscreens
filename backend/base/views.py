from rest_framework import viewsets, status, permissions, generics, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import User, Request, PartNumber, Shipment
from .serializers import UserSerializer, RequestSerializer, ShipmentSerializer, PartNumberSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from django.http import JsonResponse
from rest_framework.generics import ListAPIView
from datetime import datetime
from django.db import models
from django.db.models import Count

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'ADMIN'

class IsPlanner(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'PLANNER'
    
class IsWarehouse(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'WAREHOUSE'

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]  # Solo admin puede gestionar usuarios

    @action(detail=True, methods=['patch'])
    def update_users(self, request, pk=None):
        user = self.get_object()
        serializer = UserSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'Usuario actualizado correctamente'})
        else:
            return Response(serializer.errors, status=400)


class PartNumberViewSet(viewsets.ModelViewSet):
    queryset = PartNumber.objects.all()
    #serializer_class = RequestSerializer
    serializer_class = PartNumberSerializer
    permission_classes = [IsAdmin] 
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

class ShipmentCreateView(generics.CreateAPIView):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shipment = serializer.save(created_by=request.user)
        return Response({
            'shipment': ShipmentSerializer(shipment).data,
            'message': 'Shipment created successfully'
        }, status=status.HTTP_201_CREATED)
    
class ShipmentListView(ListAPIView):
    queryset = Shipment.objects.all().order_by('created_at') 
    serializer_class = ShipmentSerializer

class ShipmentViewSet(viewsets.ModelViewSet):

    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer
    
    # @action(detail=True, methods=['patch'])
    # def approve(self, request, pk=None):
    #     shipment = self.get_object()
    #     shipment.status = 'EN PREPARACION'
    #     shipment.taked_by = request.user
    #     shipment.save()
    #     return Response({'status': 'shipment in preparation status'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        shipment = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if new_status == 'EN PREPARACION':
            shipment.taked_by = request.user
            
        shipment.status = new_status
        shipment.save(current_user=request.user)
        
        return Response({'status': 'Status updated successfully'})


class RequestViewSet(viewsets.ModelViewSet):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset
    
    
    @action(detail=False, methods=['get'])
    def autocomplete_part(self, request):
        ikor_number = request.query_params.get('ikor_number', '')
        
        if not ikor_number:
            return Response({'error': 'ikor_number parameter is required'}, status=400)
        
        try:
            part = PartNumber.objects.get(ikor_number=ikor_number)
            data = {
                'id': part.id,
                'customer_pn': part.customer_pn,
                'nickname': part.nickname if part.nickname else '',
                'project': part.project if part.project else '',
                'exists': True
            }
            return Response(data)
        except PartNumber.DoesNotExist:
            return Response({'exists': False}, status=404)
        
#Dashboard Shipments diferentes de ENVIADOS y CANCELADOS
class PendingShipmentsDashboard(generics.ListAPIView):
    serializer_class = ShipmentSerializer

    def get_queryset(self):
        return Shipment.objects.exclude(status__in=['ENVIADO', 'CANCELADO'])

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Agregar cálculos de urgencia
        now = datetime.now()
        data = serializer.data
        expired_count = 0
        
        for shipment in data:
            requirement_date = datetime.strptime(shipment['requirement_date'], '%Y-%m-%dT%H:%M:%S%z')
            now = timezone.now()
            delta = requirement_date - now
            hours_left = delta.total_seconds() / 3600
            
            shipment['hours_left'] = hours_left
            shipment['urgency_level'] = self.get_urgency_level(hours_left)

            if hours_left < 0:
                expired_count +=1
        
        # Estadísticas
        stats = {
            'total_pending': queryset.count(),
            'status': queryset.values('status').annotate(count=models.Count('id')),
            'urgent_count': sum(1 for s in data if s['urgency_level'] == 'error'),
            'expired_count': expired_count  # Nuevo campo
        }
        
        return Response({
            'shipments': data,
            'stats': stats
        })

    def get_urgency_level(self, hours_left):
        if hours_left >= 24:
            return 'success'
        elif hours_left >= 9:
            return 'warning'
        elif hours_left >= 0:
            return 'error'
        return 'expired'
    
class ShipmentsDashboard(generics.ListAPIView):
    serializer_class = ShipmentSerializer
    queryset = Shipment.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['shipment_code']  # Permite búsqueda por código

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        now = timezone.now()
        data = serializer.data
        expired_count = 0

        for shipment in data:
            try:
                requirement_date = datetime.strptime(
                    shipment['requirement_date'], '%Y-%m-%dT%H:%M:%S%z'
                )
                delta = requirement_date - now
                hours_left = delta.total_seconds() / 3600
                shipment['hours_left'] = hours_left
                shipment['urgency_level'] = self.get_urgency_level(hours_left)
                if hours_left < 0:
                    expired_count += 1
            except Exception:
                shipment['hours_left'] = None
                shipment['urgency_level'] = 'unknown'

        stats = {
            'total_shipments': queryset.count(),
            'status': queryset.values('status').annotate(count=Count('id')),
            #'urgent_count': sum(1 for s in data if s['urgency_level'] == 'error'),
            #'expired_count': expired_count
        }

        return Response({
            'shipments': data,
            'stats': stats
        })

    def get_urgency_level(self, hours_left):
        if hours_left is None:
            return 'unknown'
        elif hours_left >= 24:
            return 'success'
        elif hours_left >= 9:
            return 'warning'
        elif hours_left >= 0:
            return 'error'
        return 'expired'
