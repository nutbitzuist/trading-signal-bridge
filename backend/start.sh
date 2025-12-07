#!/bin/sh
set -e

echo "=== Container Starting ==="
echo "PORT: $PORT"
echo "DATABASE_URL present: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'no')"
echo "REDIS_URL present: $([ -n "$REDIS_URL" ] && echo 'yes' || echo 'no')"

echo "=== Testing Python ==="
python --version

echo "=== Testing imports ==="
python -c "
import sys
print('Python path:', sys.path)
try:
    print('Importing app.config...')
    from app.config import settings
    print('Config loaded successfully')
    print(f'DATABASE_URL: {settings.DATABASE_URL[:50]}...')
except Exception as e:
    print(f'Config error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    print('Importing app.main...')
    from app.main import app
    print('Main app imported successfully')
except Exception as e:
    print(f'Main import error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

echo "=== Running database migrations ==="
alembic upgrade head || echo "Migration warning (may be already applied)"

echo "=== Starting uvicorn ==="
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
