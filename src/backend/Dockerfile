FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    libopenjp2-7-dev \
    libtiff-dev \
    libwebp-dev \
 && rm -rf /var/lib/apt/lists/*

COPY src/backend/requirements.txt /app/src/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r /app/src/backend/requirements.txt

# Copy application source
COPY src/backend /app/src/backend

WORKDIR /app/src/backend
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
