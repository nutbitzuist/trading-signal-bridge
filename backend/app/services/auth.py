"""
Authentication service for user management.
"""
from datetime import timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, Token
from app.utils.security import (
    hash_password,
    verify_password,
    generate_webhook_secret,
    create_access_token,
    create_refresh_token,
    verify_token,
)


class AuthService:
    """Service for handling authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get a user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_webhook_secret(self, secret: str) -> Optional[User]:
        """Get a user by webhook secret."""
        result = await self.db.execute(
            select(User).where(User.webhook_secret == secret)
        )
        return result.scalar_one_or_none()

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if email already exists
        existing = await self.get_user_by_email(user_data.email)
        if existing:
            raise ValueError("Email already registered")

        # Create user
        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            full_name=user_data.full_name,
            webhook_secret=generate_webhook_secret(),
        )

        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        return user

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password."""
        user = await self.get_user_by_email(email)

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    def create_tokens(self, user: User) -> Token:
        """Create access and refresh tokens for a user."""
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh_tokens(self, refresh_token: str) -> Optional[Token]:
        """Refresh access token using refresh token."""
        payload = verify_token(refresh_token, token_type="refresh")

        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await self.get_user_by_id(UUID(user_id))

        if not user or not user.is_active:
            return None

        return self.create_tokens(user)

    async def regenerate_webhook_secret(self, user: User) -> str:
        """Regenerate webhook secret for a user."""
        new_secret = generate_webhook_secret()
        user.webhook_secret = new_secret
        await self.db.flush()
        return new_secret

    async def update_password(self, user: User, new_password: str) -> None:
        """Update user password."""
        user.password_hash = hash_password(new_password)
        await self.db.flush()
