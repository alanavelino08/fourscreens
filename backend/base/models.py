from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils.timezone import localtime
from django.utils.timezone import now
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.validators import MinValueValidator

#SHIPMENT AREA
class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('PLANNER', 'Planner'),
        ('WAREHOUSE', 'Warehouse'),
        ('QUALITY', 'Quality'),
        ('BUYER', 'Buyer'),
    )
    
    role = models.CharField(max_length=15, choices=ROLE_CHOICES)
    employee_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(_('email address'), unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'employee_number', 'first_name', 'last_name']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.employee_number})"
    
class PartNumber(models.Model):
    ikor_number = models.CharField(max_length=50, unique=True, verbose_name="Número de Parte Ikor")
    customer_pn = models.CharField(max_length=100, verbose_name="Número de Parte del Cliente")
    nickname = models.CharField(max_length=100, blank=True, null=True, verbose_name="Apodo")
    project = models.CharField(max_length=100, blank=True, null=True, verbose_name="Proyecto")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Número de Parte"
        verbose_name_plural = "Números de Parte"
        ordering = ['ikor_number']
    
    def __str__(self):
        return f"{self.id} ->{self.ikor_number} -> {self.customer_pn} ({self.project})"


class Request(models.Model):

    order = models.CharField(max_length=100)
    qty = models.PositiveIntegerField()
    ref_client = models.CharField(max_length=100, null=True, blank=True)
    line = models.CharField(max_length=100, null=True, blank=True)
    warehouse = models.CharField(max_length=100)
    part_number = models.ForeignKey(PartNumber, on_delete=models.PROTECT, related_name='requests', null=True)
    shipment = models.ForeignKey('Shipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    comment_per_line = models.TextField(blank=True, null=True)

    @property
    def ikor_number(self):
        return self.part_number.ikor_number
    
    @property
    def customer_pn(self):
        return self.part_number.customer_pn
    
    @property
    def nickname(self):
        return self.part_number.nickname
    
    @property
    def project(self):
        return self.part_number.project
    
    def __str__(self):
        ikor = self.part_number.ikor_number if self.part_number else "No Part Number"
        return f"Request #{self.id} - {ikor}"
    
class Transport(models.Model):
    placas = models.CharField(max_length=20, blank=True, null=True)
    engomado = models.CharField(max_length=20, blank=True, null=True)
    caat = models.CharField(max_length=20, blank=True, null=True)
    tag = models.CharField(max_length=20, blank=True, null=True)
    rfc = models.CharField(max_length=20, blank=True, null=True)
    empresa = models.CharField(max_length=100, blank=True, null=True)
    conductor = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.empresa} - {self.placas} - {self.conductor}"

class Shipment(models.Model):

    STATUS_CHOICES = (
        ('PENDIENTE', 'Pendiente'),
        ('EN PREPARACION', 'En Preparacion'),
        ('TERMINADO', 'Terminado'),
        ('VALIDACION CALIDAD', 'Validacion Calidad'),
        ('ESPERA CAMION', 'Espera Camion'),
        ('ENVIADO', 'Enviado'),
        ('EN ESPERA', 'En Espera'),
        ('CANCELADO', 'Cancelado'),
    )


    shipment_code = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    requirement_date = models.DateTimeField(blank=True, null=True) # user
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDIENTE')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_shipments')
    #confirmed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='approved_shipments')

    taked_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='taked_shipments')
    give_progress_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='progress_shipments')

    preparation_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    validation_at = models.DateTimeField( blank=True, null=True)
    waittruck_at = models.DateTimeField( blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    onhold_at = models.DateTimeField( blank=True, null=True)
    cancelled_at = models.DateTimeField( blank=True, null=True)

    comment = models.TextField(blank=True, null=True)

    albaran = models.TextField(blank=True, null=True)

    transport = models.ForeignKey(Transport, on_delete=models.SET_NULL, blank=True, null=True, related_name='shipments', verbose_name='Transporte')

    wh_comment = models.TextField(blank=True, null=True)

    admin_comment = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):

        current_user = kwargs.pop('current_user', None)

        if not self.shipment_code:
            with transaction.atomic():
                super().save(*args, **kwargs)

                today = now().date()
                week_number = today.isocalendar()[1]
                day = today.day
                year = today.year % 100

                shipment_code = f"SH{week_number:02d}{day:02d}{year:02d}00{self.id}"

                if Shipment.objects.filter(shipment_code=shipment_code).exists():
                    raise IntegrityError(f"Shipment code '{shipment_code}' already exists.")
                
                self.shipment_code = shipment_code
                super().save(update_fields=['shipment_code'])
        else:
            if self.pk:
                old_instance = Shipment.objects.get(pk=self.pk)
                old_status = old_instance.status

                 # --- Pendiente a EN PREPARACION ---
                if self.status == 'EN PREPARACION' and old_status == 'PENDIENTE':
                    if not old_instance.taked_by:
                        self.taked_by = current_user
                        self.preparation_at = localtime(timezone.now())
                    else:
                        # Proteger contra sobrescritura
                        self.taked_by = old_instance.taked_by
                        self.preparation_at = old_instance.preparation_at

                # --- EN PREPARACION a EN ESPERA ---
                elif self.status == 'EN ESPERA' and old_status == 'EN PREPARACION':
                    self.onhold_at = localtime(timezone.now())
                    self.taked_by = old_instance.taked_by  # Protege taked_by
                    self.preparation_at = old_instance.preparation_at  # Protege preparation_at

                    if old_instance.taked_by and old_instance.taked_by != current_user:
                        self.give_progress_by = current_user
                    else:
                        self.give_progress_by = None  # No lo tomó otro usuario
                elif self.status == 'EN PREPARACION' and old_status == 'EN ESPERA':
                    # Mantener los datos anteriores
                    self.taked_by = old_instance.taked_by
                    self.preparation_at = old_instance.preparation_at
                    self.onhold_at = old_instance.onhold_at

                    # Si otro usuario lo retoma, registrar give_progress_by
                    if current_user and current_user != old_instance.taked_by:
                        self.give_progress_by = current_user
                    else:
                        self.give_progress_by = old_instance.give_progress_by

                # Registrar tiempos para otros estados
                elif self.status == 'TERMINADO':
                    self.finished_at = localtime(timezone.now())
                elif self.status == 'VALIDACION CALIDAD':
                    self.validation_at = localtime(timezone.now())
                elif self.status == 'ESPERA CAMION':
                    self.waittruck_at = localtime(timezone.now())
                elif self.status == 'ENVIADO':
                    self.delivered_at = localtime(timezone.now())
                elif self.status == 'CANCELADO':
                    self.cancelled_at = localtime(timezone.now())
                
                else:
                    # Proteger taked_by y preparation_at en cualquier otro cambio
                    self.taked_by = old_instance.taked_by
                    self.preparation_at = old_instance.preparation_at
            
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.shipment_code} - {self.id}"

#FINISH GOOD - Shipment area
class Location(models.Model):
    rack = models.CharField(max_length=20)
    code_location = models.CharField(max_length=20)
    #is_occupied = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.rack} - {self.code_location}"
    
class PalletScan(models.Model):
    part_number = models.CharField(max_length=100)
    quantity = models.IntegerField()
    project = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    date = models.DateField()
    batch = models.CharField(max_length=50)
    box_id = models.CharField(max_length=50)
    mfg_part_number = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return f"{self.part_number} - {self.location}"
    
class PalletHistory(models.Model):
    part_number = models.CharField(max_length=100)
    quantity = models.IntegerField()
    project = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    date = models.DateField()
    batch = models.CharField(max_length=50)
    box_id = models.CharField(max_length=50)
    mfg_part_number = models.CharField(max_length=50)
    
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True)
    
    timestamp_in = models.DateTimeField()
    timestamp_out = models.DateTimeField(auto_now_add=True)
    
    user_in = models.ForeignKey(User, related_name='registered_pallets', on_delete=models.SET_NULL, null=True)
    user_out = models.ForeignKey(User, related_name='removed_pallets', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.part_number} ({self.box_id}) - Historial"
    
#Withdrawal of material - Shipment area
class ProductionOrder(models.Model):
    order_number = models.CharField(max_length=50)
    entry_date = models.DateTimeField(auto_now_add=True, null=True)
    
    def __str__(self):
        return f"Orden {self.order_number}"

class MaterialWithdrawal(models.Model):
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='material_withdrawals')
    part_code = models.CharField(max_length=20, null=True)
    batch = models.CharField(max_length=20, null=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name="Cantidad")
    #entry_date = models.DateTimeField(auto_now_add=True)
    
    user_out_material = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='material_withdrawals_removed')
    
    def __str__(self):
        return f"{self.part_code} - {self.batch} - {self.qty}"
    
#Incoming
class IncomingPart(models.Model):
    code = models.CharField(max_length=20, unique=True)
    fam = models.CharField(max_length=50)
    descrip = models.TextField()
    is_urgent = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.code} - {self.descrip}"


class SupplierInfo(models.Model):
    part = models.ForeignKey(IncomingPart, related_name="suppliers", on_delete=models.CASCADE)
    supplier = models.CharField(max_length=200)
    value = models.CharField(max_length=200, blank=True, null=True)
    order = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.supplier} ({self.value}) - {self.part.code}"
    
class Cone(models.Model):
    COLOR_CHOICES = [
        ("white", "White"),
        ("yellow", "Yellow"),
        ("green", "Green"),
        ("red", "Red"),
        ("black", "Black"),
    ]

    number = models.PositiveSmallIntegerField()
    color = models.CharField(max_length=10, choices=COLOR_CHOICES)
    is_assigned = models.BooleanField(default=False)
    assigned_to = models.ForeignKey('MaterialEntry', null=True, blank=True, 
                                  on_delete=models.SET_NULL, related_name='assigned_cones')  # Added related_name

    class Meta:
        unique_together = ['number', 'color']

    def __str__(self):
        return f"Cone {self.number} ({self.color})"
    
class MaterialEntry(models.Model):
    STEP_INGRESO = 0
    STEP_VALIDATION_MATERIAL = 1
    STEP_VALIDATION_QUALITY = 2
    STEP_LIBERADO = 3
    STEP_FINALIZADO = 4
    STEP_DETENIDO = 5
    STEP_RECHAZADO = 6

    STEP_CHOICES = [
        (STEP_INGRESO, "Ingreso"),
        (STEP_VALIDATION_MATERIAL, "Validación Material"),
        (STEP_VALIDATION_QUALITY, "Validación Calidad"),
        (STEP_LIBERADO, "Liberado"),
        (STEP_FINALIZADO, "Finalizado"),
        (STEP_DETENIDO, "Detenido"),
        (STEP_RECHAZADO, "Rechazado"),
    ]
    
    cod_art = models.CharField(max_length=50)
    descrip = models.TextField()
    quantity = models.PositiveIntegerField()
    supplier_name = models.CharField(max_length=200)
    current_step = models.IntegerField(choices=STEP_CHOICES, default=STEP_INGRESO)
    previous_step = models.CharField(max_length=50, choices=STEP_CHOICES, null=True, blank=True)
    
    #Buyer's form
    supplier_company = models.CharField(max_length=200, blank=True, null=True)
    order = models.CharField(max_length=50,blank=True, null=True)
    request_guide = models.TextField(blank=True, null=True)
    parcel_service = models.CharField(max_length=30, blank=True, null=True)
    is_urgent = models.BooleanField(default=False)
    arrived_date = models.DateField(blank=True, null=True)
    invoice_number = models.CharField(max_length=50, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incoming_created', null=True)
    
    #steps to pass yellow cone
    is_po = models.BooleanField(default=False)
    is_invoice = models.BooleanField(default=False)
    
    #first steps to pass green cone
    is_pn_ok = models.BooleanField(default=False)
    is_pn_supp_ok = models.BooleanField(default=False)
    is_qty_ok = models.BooleanField(default=False)
    date_code = models.CharField(max_length=20, blank=True, null=True)
    is_label_attached = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False) 
    
    #Second steps
    measures = models.BooleanField(default=False)
    #physical_state = models.CharField(max_length=50, blank=True, null=True)
    packing_status = models.BooleanField(default=False)
    special_characteristics = models.BooleanField(default=False)
    quality_certified = models.BooleanField(default=False)
    validated_labels = models.BooleanField(default=False)
    
    #Assign cone and user
    cone = models.ForeignKey(Cone, null=True, blank=True, 
                           on_delete=models.SET_NULL, related_name='material_entries')
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    
    #White cone
    created_at = models.DateTimeField(auto_now_add=True)
    document_validation = models.DateTimeField(blank=True, null=True)
    #Black cone
    onhold_at = models.DateTimeField(blank=True, null=True)
    #Yellow cone
    validation_at = models.DateTimeField(blank=True, null=True)
    #Green cone
    released_at = models.DateTimeField(blank=True, null=True)
    #Red cone
    rejected_at = models.DateTimeField(blank=True, null=True)
    is_rejected = models.BooleanField(default=False)
    
    delivered_at = models.DateTimeField(blank=True, null=True)
    
    removed_at = models.DateTimeField(blank=True, null=True)
    #handle when the cone is red
    comments = models.TextField(blank=True, null=True)
    rma = models.BooleanField(default=False)
    income = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.cod_art} - {self.quantity} by {self.user}"