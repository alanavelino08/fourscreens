# Generated by Django 5.2 on 2025-04-29 22:54

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0007_proyect_client'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Client',
        ),
        migrations.DeleteModel(
            name='Proyect',
        ),
    ]
