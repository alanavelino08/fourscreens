# Generated by Django 5.2 on 2025-06-10 15:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0017_alter_shipment_created_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='request',
            name='comment_per_line',
            field=models.TextField(blank=True, null=True),
        ),
    ]
