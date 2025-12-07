# Backend Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port (Railway uses PORT env var)
EXPOSE ${PORT:-8000}

# Set default port
ENV PORT=8000

# Remove Docker healthcheck - let Railway handle it
# Run the application with shell to expand PORT variable
CMD ["sh", "-c", "echo 'Starting uvicorn on port ${PORT:-8000}...' && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
