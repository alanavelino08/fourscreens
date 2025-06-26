from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils.timezone import localtime
from django.utils.timezone import now
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.db.models.signals import pre_save
from django.dispatch import receiver

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('PLANNER', 'Planner'),
        ('WAREHOUSE', 'Warehouse'),
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
