# Generated by Django 5.2 on 2025-05-08 19:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0014_shipment_cancelled_at_shipment_delivered_at_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shipment',
            name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='finished_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='onhold_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='preparation_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='validation_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='waittruck_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
