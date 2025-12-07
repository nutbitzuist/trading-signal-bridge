"""
Authentication endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    Token,
    RefreshTokenRequest,
)
from app.services.auth import AuthService


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Register a new user.
    """
    auth_service = AuthService(db)

    try:
        user = await auth_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Authenticate user and return JWT tokens.
    """
    auth_service = AuthService(db)

    user = await auth_service.authenticate_user(
        credentials.email,
        credentials.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth_service.create_tokens(user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Refresh access token using refresh token.
    """
    auth_service = AuthService(db)

    tokens = await auth_service.refresh_tokens(request.refresh_token)

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return tokens


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current authenticated user info.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Update current user profile.
    """
    auth_service = AuthService(db)

    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name

    if user_data.settings is not None:
        current_user.settings = user_data.settings

    if user_data.password is not None:
        await auth_service.update_password(current_user, user_data.password)

    await db.flush()
    await db.refresh(current_user)

    return current_user


@router.post("/regenerate-webhook-secret", response_model=dict)
async def regenerate_webhook_secret(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Regenerate webhook secret for current user.
    """
    auth_service = AuthService(db)
    new_secret = await auth_service.regenerate_webhook_secret(current_user)

    return {"webhook_secret": new_secret}
