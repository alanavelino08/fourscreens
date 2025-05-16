FROM python:3.13.3-alpine

WORKDIR /src

# Set environment variables 
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1 

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN python manage.py migrate

EXPOSE 8000

CMD ["gunicorn", "--workers", "3", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]