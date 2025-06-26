from rest_framework import viewsets, status, permissions, generics, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from .models import User, Request, PartNumber, Shipment, Transport
from .serializers import UserSerializer, RequestSerializer, ShipmentSerializer, PartNumberSerializer, TransportSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
#from django.http import JsonResponse
from rest_framework.generics import ListAPIView
from datetime import datetime
from django.db import models
from django.db.models import Count
from .pagination import CustomPageNumberPagination
from django.core.mail import EmailMessage
from datetime import timedelta
from django.contrib.auth import get_user_model

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
    pagination_class = CustomPageNumberPagination
    #permission_classes = [IsAdmin]  # Solo admin puede gestionar usuarios
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

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
    permission_classes = [IsAuthenticated] 
    
    # def get_permissions(self):
    #     if self.action in ['create', 'update', 'partial_update', 'destroy']:
    #         permission_classes = [IsAdmin]
    #     else:
    #         permission_classes = [IsAuthenticated]
    #     return [permission() for permission in permission_classes]
class PartNumberSearch(generics.ListAPIView):
    serializer_class = PartNumberSerializer
    queryset = PartNumber.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['ikor_number']

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
    queryset = Shipment.objects.all().order_by('-created_at') 
    serializer_class = ShipmentSerializer

    def paginate_queryset(self, queryset):
        paginate = self.request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            return None
        return super().paginate_queryset(queryset)

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
        old_status = shipment.status
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        #if new_status == 'EN PREPARACION':
        if old_status == 'PENDIENTE' and new_status == 'EN PREPARACION':
            shipment.taked_by = request.user

            #mandamos correo
            creator_email = shipment.created_by.email if shipment.created_by else None
            shipment_code = shipment.shipment_code
            status_ = shipment.status
            project_name = shipment.requests.first().project if shipment.requests.exists() else 'SIN PROYECTO'
            first_name = shipment.created_by.first_name
            last_name = shipment.created_by.last_name

            full_name = f"{first_name} {last_name}"

            to_emails = [creator_email]  # Destinatario principal
            #cc_emails = ["a.delatorre@connectgroup.com", "a.barrientos@connectgroup.com"]

            html_content = f"""

            <h4>Estimado {full_name}</h4>

            <p>Les escribo para informarles que el estatus del pedido <strong>{shipment_code}</strong> ha cambiado de "Pendiente" a <strong>{new_status}</strong>. 
            Una vez que la preparación esté finalizada, agradeceríamos mucho que pudieran completar el formulario de datos de transporte 
            con la información requerida para gestionar el envío de manera oportuna y eficiente.</p>

            <p>Agradecemos de antemano su colaboración y el esfuerzo que siempre ponen en cada proceso. Quedamos atentos a cualquier actualización.</p>

            <h3>Nota: consideren que si no se envia la información en tiempo, el embarque se verá afectado a su salida, ya que se requiere la información para trabajar en el packing list!</h3>
            
            <p>Gracias y saludos.</p>
            """

            try:
                email = EmailMessage(
                    subject=f"Proyecto {project_name} - Encargado {full_name} del embarque {shipment_code}",
                    body=html_content,
                    from_email=None,
                    to=to_emails,
                    #cc=cc_emails,
                )
                email.content_subtype = "html"
                email.send(fail_silently=False)
            except Exception as e:
                return Response(
                    {'warning': f'Error al enviar el correo: {str(e)}'},
                    status=status.HTTP_207_MULTI_STATUS
                )
            
        shipment.status = new_status
        shipment.save(current_user=request.user)

        return Response({'status': 'Status updated successfully'})
    
    #Albaran
    @action(detail=True, methods=['patch'])
    def update_add_albaran(self, request, pk=None):
        shipment = self.get_object()
        add_albaran = request.data.get('albaran', '').strip()

        if shipment.albaran:
            return Response(
                {'error': 'Este Shipment ya tiene un albaran asignado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not add_albaran:
            return Response(
                {'error': 'El albaran no puede estar vacío'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if Shipment.objects.filter(albaran=add_albaran).exists():
            return Response(
                {'error': 'Este albaran ya está registrado en otro shipment'},
                status=status.HTTP_409_CONFLICT
            )

        shipment.albaran = add_albaran
        shipment.save()

        # serialized_data = ShipmentSerializer(shipment).data
        # html_content = "<h3>Nuevo albarán asignado</h3><ul>"
        # for key, value in serialized_data.items():
        #     html_content += f"<li><strong>{key}</strong>: {value}</li>"
        # html_content += "</ul>"

        shipment_code = shipment.shipment_code
        status_ = shipment.status
        albaran_ = shipment.albaran
        project_name = shipment.requests.first().project if shipment.requests.exists() else 'SIN PROYECTO'
        first_name = shipment.created_by.first_name
        last_name = shipment.created_by.last_name

        full_name = f"{first_name} {last_name}"

        to_emails = ["a.avelino@connectgroup.com"]  # Destinatario principal
        #cc_emails = ["a.delatorre@connectgroup.com", "a.barrientos@connectgroup.com"]  # Copia (CC)

        html_content = f"""
        <p>Hola ESTO ES UNA PRUEBA DE ALBARAN EN COPIA,</p>

        <p>¿Puedes ayudarme con la facturación del embarque <strong>{shipment_code}</strong> - Creado por: <strong>{full_name}</strong> - Proyecto: <strong>{project_name}</strong> - Estatus: <strong>{status_}</strong> con N.° de Albarán: <strong>{albaran_}</strong>?</p>

        <p>Gracias y saludos.</p>
        """

        try:
            # send_mail(
            #     subject=f"Albarán {add_albaran} asignado al Shipment {shipment.shipment_code}",
            #     message='',
            #     from_email=None,
            #     recipient_list=["a.avelino@connectgroup.com"],
            #     fail_silently=False,
            #     html_message=html_content
            # )
            email = EmailMessage(
                subject=f"Proyecto {project_name} - Albarán {add_albaran} asignado al Shipment {shipment.shipment_code}",
                body=html_content,
                from_email=None,  # Usará DEFAULT_FROM_EMAIL de settings.py
                to=to_emails,
                #cc=cc_emails,
            )
            email.content_subtype = "html"
            email.send(fail_silently=False)
        except Exception as e:
            return Response(
                {'warning': f'Albarán guardado, pero error al enviar el correo: {str(e)}'},
                status=status.HTTP_207_MULTI_STATUS
            )

        return Response(
            {'success': f'Albarán {add_albaran} añadido correctamente'},
            status=status.HTTP_200_OK
        )

    # Comentario WH
    @action(detail=True, methods=['patch'])
    def update_wh_comment(self, request, pk=None):
        comment = request.data.get('wh_comment')
        if comment:
            try:
                shipment = self.get_object()
                shipment.wh_comment = comment
                shipment.save()
                return Response({'message': 'Comentario de almacén actualizado correctamente.'}, status=200)
            except Shipment.DoesNotExist:
                return Response({'error': 'Shipment no encontrado.'}, status=404)
        return Response({'error': 'Comentario vacío, no se guardó.'}, status=400)

    # Comentario ADMIN
    @action(detail=True, methods=['patch'])
    def update_admin_comment(self, request, pk=None):
        comment = request.data.get('admin_comment')
        if comment:
            try:
                shipment = self.get_object()
                shipment.admin_comment = comment
                shipment.save()
                return Response({'message': 'Comentario de admin actualizado correctamente.'}, status=200)
            except Shipment.DoesNotExist:
                return Response({'error': 'Shipment no encontrado.'}, status=404)
        return Response({'error': 'Comentario vacío, no se guardó.'}, status=400)


# endpoint para no crear un nuevo shipment despes de 5 horas
@api_view(['GET'])
def get_last_shipment(request):
    last_shipment = Shipment.objects.order_by('-created_at').first()
    if last_shipment:
        serializer = ShipmentSerializer(last_shipment)
        return Response(serializer.data)
    return Response({})

@api_view(['GET'])
def get_shipments_today_and_tomorrow(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_after_tomorrow = today_start + timedelta(days=2)

    shipments = Shipment.objects.filter(
        created_at__gte=today_start,
        created_at__lt=day_after_tomorrow
    ).order_by('-created_at')[:10]

    serializer = ShipmentSerializer(shipments, many=True)
    return Response(serializer.data)

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

# Viewset para datos de transporte
class TransportViewSet(viewsets.ModelViewSet):
    queryset = Transport.objects.all()
    serializer_class = TransportSerializer

    def create(self, request, *args, **kwargs):
        shipment_id = request.data.get('shipment_id')
        if not shipment_id:
            return Response({'status': 'error', 'message': 'shipment_id is required'}, status=400)

        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response({'status': 'error', 'message': 'Shipment not found'}, status=404)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transport = serializer.save()
        shipment.transport = transport
        shipment.save()
        return Response({'status': 'success', 'transport_id': transport.id}, status=201)
    
#Endpoint para resetear password directamente BD
User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_direct(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')

    if not email or not password or not confirm_password:
        return Response({'detail': 'Todos los campos son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({'detail': 'Las contraseñas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        user.set_password(password)
        user.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'})
    except User.DoesNotExist:
        return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)