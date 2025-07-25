# Generated by Django 5.2 on 2025-07-14 22:47

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0022_alter_user_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rack', models.CharField(max_length=20)),
                ('code', models.CharField(max_length=20)),
                ('is_occupied', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='PalletScan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('part_number', models.CharField(max_length=100)),
                ('quantity', models.IntegerField()),
                ('project', models.CharField(max_length=50)),
                ('code', models.CharField(max_length=50)),
                ('date', models.DateField()),
                ('batch', models.CharField(max_length=50)),
                ('box_id', models.CharField(max_length=50)),
                ('mfg_part_number', models.CharField(max_length=50)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('location', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='base.location')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
