"""
Main API v1 router that combines all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.signals import router as signals_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.dashboard import router as dashboard_router


api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(webhooks_router)
api_router.include_router(signals_router)
api_router.include_router(accounts_router)
api_router.include_router(dashboard_router)
