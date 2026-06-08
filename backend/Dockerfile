# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config

COPY requirements/base.txt requirements/base.txt
COPY requirements/production.txt requirements/production.txt
COPY requirement.txt requirement.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements/production.txt

COPY . .

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
