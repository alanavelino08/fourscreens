# from django.contrib import admin
# from .models import User, Request, PartNumber, Shipment

# # Register your models here.
# admin.site.register(User)
# admin.site.register(Request)
# admin.site.register(PartNumber)
# admin.site.register(Shipment)

from django.contrib import admin
from .models import User, Request, PartNumber, Shipment
from django.utils.html import format_html

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    # list_display = (
    #     'preparation_at',
    # )
    
    list_filter = (
        'status',
        'taked_by',
        'preparation_at',
        'onhold_at',
    )
    
    search_fields = ('shipment_code',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('shipment_code', 'status')
        }),
        ('Asignación', {
            'fields': ('created_by','taked_by', 'give_progress_by'),
        }),
        ('Registro de Tiempos', {
            'fields': (
                ('preparation_at', 'finished_at'),
                ('validation_at', 'waittruck_at'),
                ('delivered_at', 'onhold_at'),
                'cancelled_at'
            ),
            'classes': ('collapse', 'wide')
        }),
    )
    
    readonly_fields = (
        'preparation_at',
        'finished_at',
        'validation_at',
        'waittruck_at',
        'delivered_at',
        'onhold_at',
        'cancelled_at'
    )
    
    def taked_by_display(self, obj):
        return obj.taked_by.username if obj.taked_by else "-"
    taked_by_display.short_description = 'Tomado por'
    
    def preparation_time(self, obj):
        return obj.preparation_at.strftime("%Y-%m-%d %H:%M") if obj.preparation_at else "-"
    preparation_time.short_description = 'Preparación'
    
    def onhold_time(self, obj):
        return obj.onhold_at.strftime("%Y-%m-%d %H:%M") if obj.onhold_at else "-"
    onhold_time.short_description = 'En espera'
    
    def finished_time(self, obj):
        return obj.finished_at.strftime("%Y-%m-%d %H:%M") if obj.finished_at else "-"
    finished_time.short_description = 'Terminado'
    
    def validation_time(self, obj):
        return obj.validation_at.strftime("%Y-%m-%d %H:%M") if obj.validation_at else "-"
    validation_time.short_description = 'Validación'
    
    def waittruck_time(self, obj):
        return obj.waittruck_at.strftime("%Y-%m-%d %H:%M") if obj.waittruck_at else "-"
    waittruck_time.short_description = 'Espera camión'
    
    def delivered_time(self, obj):
        return obj.delivered_at.strftime("%Y-%m-%d %H:%M") if obj.delivered_at else "-"
    delivered_time.short_description = 'Enviado'
    
    def cancelled_time(self, obj):
        return obj.cancelled_at.strftime("%Y-%m-%d %H:%M") if obj.cancelled_at else "-"
    cancelled_time.short_description = 'Cancelado'


admin.site.register(User)
admin.site.register(Request)
admin.site.register(PartNumber)