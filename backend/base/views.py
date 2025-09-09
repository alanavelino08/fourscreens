from rest_framework import viewsets, status, permissions, generics, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from .models import User, Request, PartNumber, Shipment, Transport, Location, PalletScan, PalletHistory, IncomingPart, SupplierInfo, Cone, MaterialEntry, ProductionOrder, MaterialWithdrawal
from .serializers import UserSerializer, RequestSerializer, ShipmentSerializer, PartNumberSerializer, TransportSerializer, PalletSerializer, MaterialEntrySerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from django.http import JsonResponse
from rest_framework.generics import ListAPIView
from datetime import datetime
from django.db import models
from django.db.models import Count, Sum, Max
from .pagination import CustomPageNumberPagination
from django.core.mail import EmailMessage, send_mail
from datetime import timedelta
from django.contrib.auth import get_user_model
import pandas as pd
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
import re
import pydoc
import os
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from io import BytesIO
from django.core.exceptions import ValidationError
from django.conf import settings


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
    
#FINISH GOOD
def process_scan(scan_str, user, location_str):
    scan_str = scan_str.strip()
    location_str = location_str.strip()

    if '(' in scan_str:
        header = scan_str.split('(')[0].strip()
        match = re.search(r'\(([^)]+)', scan_str)
        if not match:
            raise ValueError("Cadena con paréntesis inválida")
        data = match.group(1).split('"')
        if len(data) < 8:
            raise ValueError("Formato de etiqueta no reconocido (con paréntesis)")
        part_number = header + "*" + data[0]
        quantity = int(data[1])
        project = data[2]
        code = data[4]
        batch = data[5]
        box_id = data[6]
        mfg_part_number = data[7]
    else:
        data = scan_str.split('"')
        if len(data) < 8:
            raise ValueError("Formato de etiqueta no reconocido (sin paréntesis)")
        part_number = data[0]
        quantity = int(data[1])
        project = data[2]
        code = data[4]
        batch = data[5]
        box_id = data[6]
        mfg_part_number = data[7]

    # Validamos que no sea repetido
    if PalletScan.objects.filter(box_id=box_id).exists():
        raise ValueError(f"El box_id '{box_id}' ya fue registrado anteriormente.")

    # código de location
    try:
        code_location = location_str.strip()
        location = Location.objects.get(code_location=code_location)
        print("Ubicación escaneada:", code_location)
    except Location.DoesNotExist:
        raise ValueError(f"La ubicación '{location_str}' no existe")

    # No excede de cantidad 72 o 4 pallets
    pallet_count = PalletScan.objects.filter(location=location).count()
    total_quantity = PalletScan.objects.filter(location=location).aggregate(total=Sum('quantity'))['total'] or 0

    if pallet_count >= 10 or (total_quantity + quantity) > 72:
        raise ValueError("La ubicación ya está ocupada o supera el límite permitido")

    # Creamos Pallet - Material Nuevo
    pallet = PalletScan.objects.create(
        part_number=part_number,
        quantity=quantity,
        project=project,
        date=datetime.strptime(code, "%Y%m%d").date(),
        batch=batch,
        box_id=box_id,
        mfg_part_number=mfg_part_number,
        user=user,
        location=location
    )

    return {
        "pallet": {
            "part_number": pallet.part_number,
            "quantity": pallet.quantity,
            "project": pallet.project,
            "code": pallet.code,
            "date": pallet.date,
            "batch": pallet.batch,
            "box_id": pallet.box_id,
            "mfg_part_number": pallet.mfg_part_number,
        },
        "location": {
            "rack": location.rack,
            "code_location": location.code_location,
            "pallet_count": pallet_count + 1,
            "total_quantity": total_quantity + quantity
        }
    }

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def scan_pallet(request):
    scan_data = request.data.get("scan")
    location_str = request.data.get("location")

    if not location_str:
        return Response({"error": "Debes escanear la ubicación."}, status=400)

    try:
        result = process_scan(scan_data, request.user, location_str)
        return Response({
            "message": "Pallet registrado correctamente",
            "pallet": result["pallet"],
            "location": result["location"]
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def location_status(request):
    locations = Location.objects.all()
    data = []

    for loc in locations:
        pallets = PalletScan.objects.filter(location=loc).select_related('user')
        serialized_pallets = PalletSerializer(pallets, many=True).data

        data.append({
            "rack": loc.rack,
            "code_location": loc.code_location,
            "pallet_count": pallets.count(),
            "total_quantity": sum(p.quantity for p in pallets),
            "pallets": serialized_pallets,
        })

    return Response(data)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_pallet(request, pallet_id):
    try:
        pallet = PalletScan.objects.get(id=pallet_id)
        
        PalletHistory.objects.create(
            part_number=pallet.part_number,
            quantity=pallet.quantity,
            project=pallet.project,
            code=pallet.code,
            date=pallet.date,
            batch=pallet.batch,
            box_id=pallet.box_id,
            mfg_part_number=pallet.mfg_part_number,
            location=pallet.location,
            timestamp_in=pallet.timestamp,
            user_in=pallet.user,
            user_out=request.user
        )

        pallet.delete()
        return Response({"message": "Pallet eliminado y archivado en historial."})
    except PalletScan.DoesNotExist:
        return Response({"error": "Pallet no encontrado"}, status=404)
    
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_pallet_quantity(request, pk):
    try:
        pallet = PalletScan.objects.get(pk=pk)
        new_qty = request.data.get("quantity")
        if new_qty is None or int(new_qty) < 0 or int(new_qty) > 72:
            return Response({"error": "Cantidad inválida"}, status=400)

        pallet.quantity = int(new_qty)
        pallet.save()
        return Response({"message": "Cantidad actualizada correctamente"})
    except pallet.DoesNotExist:
        return Response({"error": "Pallet no encontrado"}, status=404)
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pallet_history(request):
    part = request.query_params.get("part")
    start = request.query_params.get("start")
    end = request.query_params.get("end")

    history = PalletHistory.objects.all()

    if part:
        history = history.filter(part_number__icontains=part)
    
    if start:
        history = history.filter(timestamp_out__date__gte=start)
    if end:
        history = history.filter(timestamp_out__date__lte=end)

    serialized = [{
        "part_number": p.part_number,
        "quantity": p.quantity,
        "timestamp_in": p.timestamp_in,
        "timestamp_out": p.timestamp_out,
        "box_id": p.box_id,
        "location": p.location.code_location if p.location else "N/A",
        "user_in": f"{p.user_in.first_name} {p.user_in.last_name}" if p.user_in else "N/A",
        "user_out": f"{p.user_out.first_name} {p.user_out.last_name}" if p.user_out else "N/A",
    } for p in history]

    return Response(serialized)

#Withdrawal Material
class SaveMaterialWithdrawalView(APIView):
    def post(self, request):
        order_number = request.data.get("order_number")
        scanned_lines = request.data.get("lines", [])

        if not order_number:
            return Response({"error": "order_number es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        if not scanned_lines:
            return Response({"error": "No se enviaron líneas para registrar"}, status=status.HTTP_400_BAD_REQUEST)

        production_order, _ = ProductionOrder.objects.get_or_create(order_number=order_number)

        saved_entries = []
        for line in scanned_lines:
            try:
                # 🔹 Normalizar: todo mayúsculas y reemplazar separadores
                line = line.strip().upper().replace("ÇOD", "COD").replace("´", "+")
                
                match = re.search(r"COD\+(\w+)\+LOT\+(\w+)\+QTY\+([\d\.]+)", line)
                if match:
                    part_code = match.group(1)
                    batch = match.group(2)
                    qty = float(match.group(3))
                else:
                    parts = line.split()
                    if len(parts) == 3:
                        part_code, batch, qty = parts[0], parts[1], float(parts[2])
                    elif len(parts) == 2:
                        part_code, qty = parts[0], float(parts[1])
                        batch = None
                    else:
                        raise ValueError(
                            "Formato inválido. Usa: 'COD+part+LOT+batch+QTY+qty', 'part batch qty' o 'part qty'"
                        )

                withdrawal = MaterialWithdrawal.objects.create(
                    production_order=production_order,
                    part_code=part_code,
                    batch=batch,
                    qty=qty,
                    user_out_material=request.user
                )
                saved_entries.append({
                    "part_code": part_code,
                    "batch": batch,
                    "qty": qty
                })

            except (IndexError, ValueError, ValidationError) as e:
                return Response(
                    {"error": f"Error procesando línea '{line}': {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response({
            "message": f"Se registraron {len(saved_entries)} retiros de material",
            "order_number": production_order.order_number,
            "entries": saved_entries
        }, status=status.HTTP_201_CREATED)
# class SaveMaterialWithdrawalView(APIView):
#     def post(self, request):
#         order_number = request.data.get("order_number")
#         scanned_lines = request.data.get("lines", [])

#         if not order_number:
#             return Response({"error": "order_number es requerido"}, status=status.HTTP_400_BAD_REQUEST)

#         if not scanned_lines:
#             return Response({"error": "No se enviaron líneas para registrar"}, status=status.HTTP_400_BAD_REQUEST)

#         # Buscar o crear la orden de producción
#         production_order, _ = ProductionOrder.objects.get_or_create(order_number=order_number)

#         saved_entries = []
#         for line in scanned_lines:
#             try:
#                 line = line.strip()

#                 # 🔹 Normalizar línea (acepta ÇOD, + o ´ como separador)
#                 normalized = line.replace("ÇOD", "COD").replace("´", "+")

#                 # 🔹 Caso escaneado
#                 match = re.search(r"COD\+(\w+)\+LOT\+(\w+)\+QTY\+([\d\.]+)", normalized)
#                 if match:
#                     part_code = match.group(1)
#                     batch = match.group(2)
#                     qty = float(match.group(3))
#                 else:
#                     # 🔹 Caso manual -> formato: "3040143 003455053 192" o "3040143 192"
#                     parts = line.split()
#                     if len(parts) == 3:
#                         part_code, batch, qty = parts[0], parts[1], float(parts[2])
#                     elif len(parts) == 2:
#                         part_code, qty = parts[0], float(parts[1])
#                         batch = None   # batch opcional
#                     else:
#                         raise ValueError("Formato inválido. Usa: 'COD+part+LOT+batch+QTY+qty', 'part batch qty' o 'part qty'")

#                 # Guardar en BD
#                 withdrawal = MaterialWithdrawal.objects.create(
#                     production_order=production_order,
#                     part_code=part_code,
#                     batch=batch,
#                     qty=qty,
#                     user_out_material=request.user
#                 )
#                 saved_entries.append({
#                     "part_code": part_code,
#                     "batch": batch,
#                     "qty": qty
#                 })

#             except (IndexError, ValueError, ValidationError) as e:
#                 return Response(
#                     {"error": f"Error procesando línea '{line}': {str(e)}"},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#         return Response({
#             "message": f"Se registraron {len(saved_entries)} retiros de material",
#             "order_number": production_order.order_number,
#             "entries": saved_entries
#         }, status=status.HTTP_201_CREATED)

        
class MaterialWithdrawalSummaryView(APIView):
    def get(self, request):
        # Filtros
        part_code = request.query_params.get("part_code", "").strip()
        order_number = request.query_params.get("order_number", "").strip()
        date = request.query_params.get("date", "").strip()

        withdrawals = MaterialWithdrawal.objects.select_related("production_order", "user_out_material")

        # Aplicar filtros
        if part_code:
            withdrawals = withdrawals.filter(part_code__icontains=part_code)
        if order_number:
            withdrawals = withdrawals.filter(production_order__order_number__icontains=order_number)
        if date:
            withdrawals = withdrawals.filter(production_order__entry_date__date=date)

        # Agrupar solo por OF y part_code
        summary = (
            withdrawals
            .values(
                "production_order__order_number",
                "part_code",
                "production_order__entry_date",
            )
            .annotate(
                total_qty=Sum("qty"),
                last_user_id=Max("user_out_material__id"),
                last_user_name=Max("user_out_material__username"),
            )
            .order_by("production_order__order_number", "part_code")
        )

        data = [
            {
                "order_number": item["production_order__order_number"],
                "part_code": item["part_code"],
                "total_qty": item["total_qty"],
                "entry_date": item["production_order__entry_date"],
                "user_out_material": {
                    "id": item["last_user_id"],
                    "username": item["last_user_name"],
                }
            }
            for item in summary
        ]

        return Response(data, status=status.HTTP_200_OK)

class ValidarDescargasView(APIView):
    def get(self, request):
        fecha_str = request.query_params.get("date", "").strip()
        export_excel = request.query_params.get("export", "0") == "1"
        part_code_filter = request.query_params.get("part_code", "").strip()
        order_number_filter = request.query_params.get("order_number", "").strip()

        if not fecha_str:
            return Response({"error": "El parámetro 'date' es obligatorio"}, status=400)

        try:
            fecha_excel = datetime.strptime(fecha_str, "%Y-%m-%d").date()

            ruta_archivo = os.path.join(
                r"\\ikormx-files\Supply Chain\.06- Reporting\13 Reportes  Diarios",
                str(fecha_excel.year),
                "REPORTES  HOY.xlsx"
            )
            if not os.path.exists(ruta_archivo):
                return Response({"error": f"No se encontró el archivo {ruta_archivo}"}, status=404)

            df = pd.read_excel(
                ruta_archivo,
                sheet_name="MOVIMIENTOS MES  (2K DIARIA)",
                skiprows=2
            )

            df["fech_mov"] = pd.to_datetime(df["fech_mov"], format="%d/%m/%Y", errors="coerce").dt.date

            df_filtrado = df[
                (df["fech_mov"] == fecha_excel) &
                (df["tip_mov"] == "SF") &
                (df["cod_alm"] == 201)
            ].copy()

            df_filtrado["n_of"] = df_filtrado["n_of"].fillna("").astype(str).str.strip()
            df_filtrado["cod_art"] = df_filtrado["cod_art"].fillna("").astype(str).str.strip()
            df_filtrado["cant_sal"] = pd.to_numeric(df_filtrado["cant_sal"], errors="coerce").fillna(0).astype(float)

            excel_full = (
                df_filtrado.groupby(["n_of", "cod_art"])["cant_sal"].sum().to_dict()
            )

            qs = MaterialWithdrawal.objects.filter(production_order__entry_date__date=fecha_excel)
            if part_code_filter:
                qs = qs.filter(part_code__icontains=part_code_filter)
            if order_number_filter:
                qs = qs.filter(production_order__order_number__icontains=order_number_filter)

            bd_dict = {
                (str(w["production_order__order_number"]).strip(), str(w["part_code"]).strip()): float(w["total_qty"])
                for w in (
                    qs.values("production_order__order_number", "part_code")
                      .annotate(total_qty=Sum("qty"))
                )
            }

            keys_intersection = [k for k in bd_dict.keys() if k in excel_full]

            resultados = []
            for key in keys_intersection:
                order_number, part_code = key
                qty_bd = bd_dict[key]
                qty_excel = float(excel_full[key])

                diferencia = qty_excel - qty_bd
                if abs(diferencia) < 1e-9:
                    diferencia = 0.0

                estado = "OK" if diferencia == 0 else ("FALTA" if diferencia > 0 else "SOBRA")

                resultados.append({
                    "Orden": order_number,
                    "Parte": part_code,
                    "Cantidad_Excel": qty_excel,
                    "Cantidad_BD": qty_bd,
                    "Diferencia": diferencia,
                    "Estado": estado
                })

            resultados.sort(key=lambda r: (r["Orden"], r["Parte"]))

            if export_excel:
                df_resultados = pd.DataFrame(resultados)
                output = BytesIO()
                with pd.ExcelWriter(output, engine="openpyxl") as writer:
                    df_resultados.to_excel(writer, index=False, sheet_name="Validación")
                output.seek(0)

                response = HttpResponse(
                    output,
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                response["Content-Disposition"] = f'attachment; filename="validacion_{fecha_str}.xlsx"'
                return response

            return Response(resultados, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
#INCOMING    
class ExcelUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file, sheet_name="Guia")
            df = df.fillna("")
            df.columns = df.columns.str.strip()
            data = df.head(10).to_dict(orient="records")
            return Response({"data": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


#Match Excel y tabla en BD
class MatchPedidoView(APIView):
    def get(self, request):
        n_pedido = request.query_params.get("n_pedido")
        if not n_pedido:
            return JsonResponse({"error": "La PO es requerida"}, status=400)

        #network_path = r"\\ikormx-files\Publico\Dashboard\Downtime"
        network_path = r"\\ikormx-files\Supply Chain\.06- Reporting\13 Reportes  Diarios\2025"
        file_name = "REPORTES  HOY.xlsx"
        #file_name = "REPORTES HOY__.xlsx"
        full_path = os.path.join(network_path, file_name)

        try:
            excel_data = pd.ExcelFile(full_path)
            df = pd.read_excel(excel_data, sheet_name='OPOR SUC 8-12-13-39 (6K)', skiprows=2)
            df_filtered = df[df["n_pedido"] == int(n_pedido)]

            results = []
            for _, row in df_filtered.iterrows():
                cod_art = str(int(row["cod_art"])).strip()
                cant_ped = row["cant_ped"]
                name_fact = row["nombre"]

                incoming_info = IncomingPart.objects.filter(code=cod_art).first()

                suppliers_data = []
                if incoming_info:
                    description = incoming_info.descrip
                    is_urgent = incoming_info.is_urgent
                    suppliers = incoming_info.suppliers.order_by("order")
                    suppliers_data = [
                        {
                            "supplier": s.supplier,
                            "value": s.value,
                            "order": s.order
                        }
                        for s in suppliers
                    ]

                if incoming_info:
                    results.append({
                        "cod_art": cod_art,
                        "cant_ped": cant_ped,
                        "descrip": description,
                        "is_urgent": is_urgent,
                        "name": name_fact,
                        "suppliers": suppliers_data,
                        "order": n_pedido
                    })

            return JsonResponse({"n_pedido": n_pedido, "results": results}, safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

#Save material lines        
class SaveMaterialEntryView(APIView):
    def post(self, request):
        user = request.user
        entries = request.data.get("entries", [])
        print(entries)
        saved_entries = []
        for item in entries:
            cod_art = item.get("cod_art")
            descrip = item.get("descrip")
            quantity = item.get("quantity")
            urgent = item.get("is_urgent")
            supp_name = item.get("name")
            supplier_name = item.get("supplier_name")
            order = item.get("order")

            # Buscar un cono blanco disponible
            white_cone = Cone.objects.filter(color="white", is_assigned=False).order_by("number").first()
            if not white_cone:
                return Response({"detail": "No hay conos blancos disponibles."}, status=status.HTTP_400_BAD_REQUEST)

            # Crear entrada
            entry = MaterialEntry.objects.create(
                cod_art=cod_art,
                descrip=descrip,
                quantity=quantity,
                is_urgent=urgent,
                supplier_company=supp_name,
                supplier_name=supplier_name,
                order = order,
                user=user,
                cone=white_cone,
            )

            # Asignar cono
            white_cone.is_assigned = True
            white_cone.assigned_to = entry
            white_cone.save()

            saved_entries.append({
                "id": entry.id,
                "cone_number": white_cone.number,
                "cone_color": white_cone.color,
            })

        return Response({"saved": saved_entries}, status=status.HTTP_201_CREATED)

#Get material lines added
class MaterialEntryListView(APIView):
    #permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = MaterialEntry.objects.select_related('cone').order_by('created_at')
        data = MaterialEntrySerializer(entries, many=True).data
        return Response(data)

#advance to yellow or black cone.
class AdvanceMaterialEntryView(APIView):
    def post(self, request, entry_id):
        try:
            entry = MaterialEntry.objects.get(id=entry_id)
        except MaterialEntry.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        entry.is_po = request.data.get("is_po", False)
        entry.is_invoice = request.data.get("is_invoice", False)
        #entry.request_guide = request.data.get("request_guide", "")
        #entry.supplier_name = request.data.get("supplier_name", "")

        # decidir nuevo color y current_step
        if entry.is_po and entry.is_invoice:
            new_color = "yellow"
            entry.document_validation = timezone.now()
            entry.current_step = MaterialEntry.STEP_VALIDATION_MATERIAL
            
            if not entry.user:
                entry.user = request.user
            if not entry.request_guide:
                entry.request_guide = request.data.get("request_guide", "")
            if not entry.supplier_name:
                entry.supplier_name = request.data.get("supplier_name", "")
            if not entry.invoice_number: 
                entry.invoice_number = request.data.get("invoice_number", "")
        else:
            new_color = "black"
            entry.onhold_at = timezone.now()
            entry.current_step = MaterialEntry.STEP_DETENIDO
            
            if not entry.user:
                entry.user = request.user
            if not entry.supplier_name:
                entry.supplier_name = request.data.get("supplier_name", "")
            if not entry.invoice_number: 
                entry.invoice_number = request.data.get("invoice_number", "")
            if not entry.request_guide:
                entry.request_guide = request.data.get("request_guide", "")

        entry.save()

        # liberar cono antiguo
        if entry.cone:
            entry.cone.is_assigned = False
            entry.cone.assigned_to = None
            entry.cone.save()

        new_cone = Cone.objects.filter(color=new_color, is_assigned=False).first()
        if not new_cone:
            return Response({"detail": f"No hay conos {new_color} disponibles"}, status=400)

        new_cone.is_assigned = True
        new_cone.assigned_to = entry
        new_cone.save()

        entry.cone = new_cone
        entry.save()

        return Response({"success": True, "current_step": entry.current_step}, status=status.HTTP_200_OK)

#advance from yellow cone to green or red
class AdvanceYellowConeView(APIView):
    def post(self, request, entry_id):
        try:
            entry = MaterialEntry.objects.get(id=entry_id)
        except MaterialEntry.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        cone_color = entry.cone.color if entry.cone else None
        if cone_color != "yellow":
            return Response({"detail": "No está en cono amarillo"}, status=400)

        stage = request.data.get("stage")

        if stage == "material":
            entry.is_pn_ok = request.data.get("is_pn_ok", False)
            entry.is_pn_supp_ok = request.data.get("is_pn_supp_ok", False)
            entry.is_qty_ok = request.data.get("is_qty_ok", False)
            entry.date_code = request.data.get("date_code", "")
            entry.is_label_attached = request.data.get("is_label_attached", False)

            if not all([
                entry.is_pn_ok,
                entry.is_pn_supp_ok,
                entry.is_qty_ok,
                entry.is_label_attached
            ]):
                new_color = "red"
                entry.is_rejected = True
                entry.rejected_at = timezone.now()
                entry.current_step = MaterialEntry.STEP_RECHAZADO
            else:
                new_color = "yellow"
                entry.validation_at = timezone.now()
                entry.current_step = MaterialEntry.STEP_VALIDATION_QUALITY
                entry.save()
                return Response(
                    {"success": True, "next_step": "quality", "current_step": entry.current_step},
                    status=200
                )

        elif stage == "quality":
            entry.measures = request.data.get("measures", False)
            entry.packing_status = request.data.get("packing_status", False)
            entry.special_characteristics = request.data.get("special_characteristics", False)
            entry.quality_certified = request.data.get("quality_certified", False)
            entry.validated_labels = request.data.get("validated_labels", False)

            if not all([
                entry.measures,
                entry.validated_labels,
                entry.packing_status
            ]):
                new_color = "red"
                entry.is_rejected = True
                entry.rejected_at = timezone.now()
                entry.current_step = MaterialEntry.STEP_RECHAZADO
            else:
                new_color = "green"
                entry.released_at = timezone.now()
                entry.current_step = MaterialEntry.STEP_LIBERADO
        else:
            return Response({"detail": "Etapa inválida"}, status=400)

        # Liberar cono actual
        if entry.cone:
            entry.cone.is_assigned = False
            entry.cone.assigned_to = None
            entry.cone.save()

        # Asignar nuevo cono
        new_cone = Cone.objects.filter(color=new_color, is_assigned=False).first()
        if not new_cone:
            return Response({"detail": f"No hay conos {new_color} disponibles"}, status=400)

        new_cone.is_assigned = True
        new_cone.assigned_to = entry
        new_cone.save()

        entry.cone = new_cone
        entry.save()

        return Response(
            {"success": True, "cone": new_color, "current_step": entry.current_step, "stage":stage},
            status=200
        )

#release material and finalize the process
class FinalizeGreenConeView(APIView):
    def post(self, request, entry_id):
        try:
            entry = MaterialEntry.objects.get(id=entry_id)
        except MaterialEntry.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        # Validar que tiene un cono verde
        cone_color = entry.cone.color if entry.cone else None
        if cone_color != "green":
            return Response({"detail": "El material no está en cono verde"}, status=400)

        # Liberar el cono verde
        if entry.cone:
            entry.cone.is_assigned = False
            entry.cone.assigned_to = None
            entry.cone.save()
            entry.cone = None

        # Cambiar estado a finalizado y registrar hora de entrega
        entry.current_step = MaterialEntry.STEP_FINALIZADO
        entry.delivered_at = timezone.now()
        entry.save()

        return Response({
            "success": True,
            "detail": "Material entregado, cono liberado",
            "current_step": entry.current_step,
            "delivered_at": entry.delivered_at
        }, status=200)

# Handle the red cone 
class HandleRejectedEntryView(APIView):
    def post(self, request, entry_id):
        try:
            entry = MaterialEntry.objects.get(id=entry_id)
        except MaterialEntry.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if not entry.cone or entry.cone.color != "red":
            return Response({"detail": "El material no está en cono rojo"}, status=400)

        option = request.data.get("option")  # "rma" o "income"
        comment = request.data.get("comment", "")

        entry.comments = comment

        # Liberar cono rojo
        if entry.cone:
            entry.cone.is_assigned = False
            entry.cone.assigned_to = None
            entry.cone.save()
            entry.cone = None

        if option == "rma":
            entry.rma = True
            entry.current_step = MaterialEntry.STEP_RECHAZADO
            entry.removed_at = timezone.now()
            entry.save()
            return Response({"success": True, "removed": True}, status=200)

        elif option == "income":
            entry.income = True
            entry.is_rejected = False
            #entry.current_step = MaterialEntry.STEP_VALIDATION_MATERIAL
            if entry.current_step <= MaterialEntry.STEP_VALIDATION_MATERIAL:
                entry.current_step = MaterialEntry.STEP_VALIDATION_MATERIAL
            else:
                entry.current_step = MaterialEntry.STEP_VALIDATION_QUALITY

            # Asignar cono amarillo disponible
            new_cone = Cone.objects.filter(color="yellow", is_assigned=False).first()
            if not new_cone:
                return Response({"detail": "No hay conos amarillos disponibles"}, status=400)

            new_cone.is_assigned = True
            new_cone.assigned_to = entry
            new_cone.save()

            entry.cone = new_cone
            entry.save()

            return Response(
                {"success": True, "cone": "yellow", "current_step": entry.current_step},
                status=200,
            )

        else:
            return Response({"detail": "Opción inválida"}, status=400)


class StepsListView(APIView):
    def get(self, request):
        # Devuelve lista de labels en orden
        labels = [label for _, label in MaterialEntry.STEP_CHOICES]
        return Response(labels)

class BuyerMaterialRequestView(APIView):
    def post(self, request):
        user = request.user
        entries = request.data.get("entries", [])
        if not entries:
            return Response({"detail": "No se recibieron líneas."}, status=status.HTTP_400_BAD_REQUEST)

        saved_entries = []

        for item in entries:
            cod_art = item.get("cod_art")
            quantity = item.get("quantity")
            supplier_company = item.get("supplier_company")
            order = item.get("order")
            request_guide = item.get("request_guide")
            parcel_service = item.get("parcel_service")
            is_urgent = item.get("is_urgent", True)
            arrived_date = item.get("arrived_date")
            invoice_number = item.get("invoice_number")

            # Validar IncomingPart y obtener descripción
            incoming_part = IncomingPart.objects.filter(code=cod_art).first()
            if not incoming_part:
                return Response(
                    {"detail": f"No se encontró descripción para el código {cod_art}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Buscar un cono blanco disponible
            white_cone = Cone.objects.filter(color="white", is_assigned=False).order_by("number").first()
            if not white_cone:
                return Response(
                    {"detail": "No hay conos blancos disponibles."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Crear entrada
            entry = MaterialEntry.objects.create(
                cod_art=cod_art,
                descrip=incoming_part.descrip,
                quantity=quantity,
                current_step=MaterialEntry.STEP_INGRESO,
                supplier_company=supplier_company,
                order=order,
                request_guide=request_guide,
                parcel_service=parcel_service,
                is_urgent=True,
                arrived_date=arrived_date,
                invoice_number=invoice_number,
                created_by=user,
                cone=white_cone,
            )

            # Marcar cono como asignado
            white_cone.is_assigned = True
            white_cone.assigned_to = entry
            white_cone.save()

            saved_entries.append({
                "id": entry.id,
                "cod_art": entry.cod_art,
                "descrip": entry.descrip,
                "quantity": entry.quantity,
                "order": entry.order,
                "supplier_company": entry.supplier_company,
                "cone_number": white_cone.number,
                "cone_color": white_cone.color,
                "is_urgent": entry.is_urgent,
                "arrived_date": entry.arrived_date
            })

        return Response({"saved": saved_entries}, status=status.HTTP_201_CREATED)    
    
class BuyerValidatePartView(APIView):
    def get(self, request, cod_art):
        incoming_part = IncomingPart.objects.filter(code=cod_art).first()
        if not incoming_part:
            return Response(
                {"detail": f"No se encontró el código {cod_art}"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "cod_art": cod_art,
            "descrip": incoming_part.descrip,
            "is_urgent": True
        }, status=status.HTTP_200_OK)

class BuyerListView(APIView):
    def get(self, request):
        buyers = User.objects.filter(role="BUYER").values_list("email", flat=True)
        return Response(buyers)

class SendMailView(APIView):
    def post(self, request):
        try:
            to = request.data.get("to", [])
            cc = request.data.get("cc", [])
            subject = request.data.get("subject", "")
            content = request.data.get("content", "")

            if not to:
                return Response({"error": "El campo 'to' es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

            recipients = list(set(to + cc))  # mandamos a todos en to + cc

            send_mail(
                subject,
                content,
                settings.DEFAULT_FROM_EMAIL,
                recipients,
                fail_silently=False,
            )

            return Response({"message": "Correo enviado exitosamente ✅"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        

#Massive insertions into tables
@csrf_exempt
def cargar_partes(request):
    if request.method == "POST":
        network_path = r"\\ikormx-files\Publico\Dashboard\Downtime"
        file_name = "insertarnpmissing.xlsx"
        full_path = os.path.join(network_path, file_name)

        try:
            df = pd.read_excel(full_path)

            # nuevos_registros = []
            # for _, d in df.iterrows():
            #     #print(f'Valor cod_cli del Excel: "{d["cod_cli"]}" tipo: {type(d["cod_cli"])}')
            #     project = None
            #     if pd.notna(d["cod_cli"]):
            #         cod_cli_val = str(int(d["cod_cli"]))
            #         cod_cli_val = cod_cli_val.strip()
            #         project = Client.objects.filter(cod_cli=cod_cli_val).first()
            #         print(f'Buscando cod_cli="{cod_cli_val}" → {project}')
            #     print(project)
            #     family = Family.objects.filter(incoming_customer_pn=d["incoming_customer_pn"]).first() if pd.notna(d["incoming_customer_pn"]) else None
            #     tipo = TypeIncoming.objects.filter(type_art=d["type_art"]).first() if pd.notna(d["type_art"]) else None

            #     nuevos_registros.append(IncommingPartNumber(
            #         internal_pn=d["internal_pn"],
            #         supplier_pn=d["supplier_pn"],
            #         des_art=d["des_art"],
            #         project_inc=project,
            #         family_inc=family,
            #         type_inc=tipo
            #     ))

            # IncommingPartNumber.objects.bulk_create(nuevos_registros)
            for _, row in df.iterrows():
                part, _ = IncomingPart.objects.get_or_create(
                    code=row['code'],
                    defaults={
                        'fam': row['fam'],
                        'descrip': row['descrip']
                    }
                )

                for i in range(1, 15):
                    supplier_name = row.get(f'Nombre_{i}')
                    supplier_value = row.get(f'Valor_{i}')

                    if pd.notna(supplier_name) or pd.notna(supplier_value):
                        SupplierInfo.objects.create(
                            part=part,
                            supplier=supplier_name if pd.notna(supplier_name) else "",
                            value=supplier_value if pd.notna(supplier_value) else "",
                            order=i
                        )

            return JsonResponse({"mensaje": "Registros cargados con éxito."})

        except Exception as e:
            return JsonResponse({"error": f"Error al procesar el archivo: {str(e)}"}, status=500)

    return JsonResponse({"error": "Método no permitido"}, status=405)