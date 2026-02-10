from rest_framework import serializers
from .models import User, Request, PartNumber, Shipment, Transport, Location, PalletScan, Cone, MaterialEntry, Auditory, WarehouseArea, AuditoryEvidence, IncomingPart
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['employee_number'] = user.employee_number
        token['email'] = user.email
        token['full_name'] = user.get_full_name()
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_active:
            raise serializers.ValidationError("Cuenta inactiva")
        return data
    
class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name'] 

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 
                 'employee_number', 'role', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True},
            'employee_number': {'required': True},
        }

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        return value
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            employee_number=validated_data['employee_number'],
            role=validated_data['role']
        )
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
    
class PartNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartNumber
        fields = ['id', 'customer_pn', 'nickname', 'ikor_number', 'project']
        extra_kwargs = {
            'customer_pn': {'required': True},
            'nickname': {'required': True},
            'ikor_number': {'required': True},
            'project': {'required': True}
        }

    def validate_ikor_number(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("El número de CG debe tener al menos 5 caracteres.")
        return value
    
    def create(self, validated_data):
        part_number = PartNumber.objects.create(
            customer_pn=validated_data['customer_pn'],
            nickname=validated_data['nickname'],
            ikor_number=validated_data['ikor_number'],
            project=validated_data['project']
        )
        return part_number


class RequestSerializer(serializers.ModelSerializer):
    ikor_number = serializers.ReadOnlyField()
    customer_pn = serializers.CharField(read_only=True)
    nickname = serializers.CharField(read_only=True)
    project = serializers.CharField(read_only=True)
    
    class Meta:
        model = Request
        fields = [
            'id', 'order', 'qty', 'ref_client', 'line', 'warehouse',
            'part_number', 'shipment', 'ikor_number', 'customer_pn',
            'nickname', 'project', 'comment_per_line'
        ]
        read_only_fields = ['customer_pn', 'nickname', 'project']
        extra_kwargs = {
            'part_number': {'required': False},
            'shipment': {'required': False}
        }
    
    def validate_ikor_number(self, value):
        if not PartNumber.objects.filter(ikor_number=value).exists():
            raise serializers.ValidationError("No existe un número de parte con este código")
        return value
    
class TransportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transport
        fields = ['id', 'placas', 'engomado', 'caat', 'tag', 'rfc', 'empresa', 'conductor']
    
    
class ShipmentSerializer(serializers.ModelSerializer):
    #created_by = SimpleUserSerializer(read_only=True)
    #confirmed_by = UserSerializer(read_only=True)
    taked_by = UserSerializer(read_only=True)
    give_progress_by = UserSerializer(read_only=True)
    requests = RequestSerializer(many=True, required=False)
    transport = TransportSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Shipment
        fields = '__all__'
        read_only_fields = ['shipment_code', 'created_at', 'status', 
                            'confirmed_by', 'created_by', 'preparation_at',
                            'onhold_at', 'validation_at',
                            'taked_by']
    
    def validate_shipment_code(self, value):
        if Shipment.objects.filter(shipment_code=value).exists():
            raise serializers.ValidationError("Shipment code must be unique.")
        return value

    def create(self, validated_data):
        requests_data = validated_data.pop('requests', [])
        shipment = Shipment.objects.create(**validated_data)
        
        for request_data in requests_data:
            Request.objects.create(shipment=shipment, **request_data)
            
        return shipment
    
    # def validate(self, data):
    #     if 'status' in data and data['status'] == 'EN PREPARACION':
    #         request = self.context.get('request')
    #         if request and not self.instance.taked_by:
    #             data['taked_by'] = request.user
    #     return data

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'
        
class PalletSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = PalletScan
        fields = '__all__'
        
class ConeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cone
        fields = ['number', 'color']

class MaterialEntrySerializer(serializers.ModelSerializer):
    step_label = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    received_by = UserSerializer(read_only=True)
    cone = ConeSerializer()

    class Meta:
        model = MaterialEntry
        fields = '__all__'
        
        
    def get_step_label(self, obj):
        return dict(MaterialEntry.STEP_CHOICES).get(obj.current_step, "")

class IncomingPartCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomingPart
        fields = ["code", "fam", "descrip", "is_urgent"]
        
    def validate_code(self, value):
        if IncomingPart.objects.filter(code=value).exists():
            raise serializers.ValidationError("El número de parte ya existe.")
        return value
    
#Auditory plan
class WarehouseAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseArea
        fields = ['id', 'area']
        
class AuditoryEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditoryEvidence
        fields = ['id', 'image']

            
class AuditorySerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )
    
    assigned_to_details = UserSerializer(many=True, read_only=True, source='assigned_to')
    area = WarehouseAreaSerializer(read_only=True)
    area_id = serializers.PrimaryKeyRelatedField(
        queryset=WarehouseArea.objects.all(),
        write_only=True,
        source='area',
        required=False
    )
    evidences = AuditoryEvidenceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Auditory
        fields = "__all__"

    def create(self, validated_data):
        print("VALIDATED:", validated_data)
        user = self.context["request"].user
        validated_data["created_by"] = user
        assigned_users = validated_data.pop("assigned_to", [])
        
        instance = super().create(validated_data)
        instance.assigned_to.set(assigned_users)
        return instance