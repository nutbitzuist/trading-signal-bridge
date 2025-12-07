"""
User-related Pydantic schemas.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    settings: Optional[dict] = None


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID
    webhook_secret: str
    is_active: bool
    is_admin: bool
    tier: str = UserTier.FREE.value
    is_approved: bool = True
    max_accounts: int = 2
    max_signals_per_day: int = 50
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Admin-specific schemas
class AdminUserCreate(UserBase):
    """Schema for admin creating a user."""

    password: str = Field(..., min_length=8, max_length=128)
    is_admin: bool = False
    tier: UserTier = UserTier.FREE
    is_approved: bool = True
    is_active: bool = True
    max_accounts: int = 2
    max_signals_per_day: int = 50
    admin_notes: Optional[str] = None


class AdminUserUpdate(BaseModel):
    """Schema for admin updating a user."""

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    tier: Optional[UserTier] = None
    is_approved: Optional[bool] = None
    max_accounts: Optional[int] = None
    max_signals_per_day: Optional[int] = None
    admin_notes: Optional[str] = None


class AdminUserResponse(UserBase):
    """Schema for admin user response with all details."""

    id: UUID
    webhook_secret: str
    is_active: bool
    is_admin: bool
    tier: str
    is_approved: bool
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    admin_notes: Optional[str] = None
    max_accounts: int
    max_signals_per_day: int
    settings: dict
    created_at: datetime
    updated_at: datetime
    # Stats
    accounts_count: int = 0
    signals_count: int = 0

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for paginated user list."""

    users: List[AdminUserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TierUpdateRequest(BaseModel):
    """Schema for tier upgrade request."""

    tier: UserTier
    admin_notes: Optional[str] = None


class ApprovalRequest(BaseModel):
    """Schema for user approval request."""

    is_approved: bool
    admin_notes: Optional[str] = None


class UserStatsResponse(BaseModel):
    """Schema for admin dashboard stats."""

    total_users: int
    active_users: int
    pending_approval: int
    users_by_tier: dict
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    sub: str
    exp: datetime
    type: str = "access"


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str
