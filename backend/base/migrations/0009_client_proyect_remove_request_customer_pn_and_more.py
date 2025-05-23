# Generated by Django 5.2 on 2025-04-29 22:56

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0008_delete_client_delete_proyect'),
    ]

    operations = [
        migrations.CreateModel(
            name='Client',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cg_part_number', models.CharField(max_length=100, unique=True)),
                ('client_part_number', models.CharField(max_length=50, unique=True)),
                ('client_name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Proyect',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('proyect_name', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='request',
            name='customer_pn',
        ),
        migrations.RemoveField(
            model_name='request',
            name='ikor_number',
        ),
        migrations.AddField(
            model_name='request',
            name='client',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='base.client'),
        ),
        migrations.AddField(
            model_name='client',
            name='proyect',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='clients', to='base.proyect'),
        ),
    ]
