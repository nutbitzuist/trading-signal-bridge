"""
Password reset schemas.
"""
from pydantic import BaseModel, EmailStr, field_validator


class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password."""
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Response schema for forgot password.
    
    Note: In production with email service, this would not include the token.
    Currently showing token for manual password reset (no email service).
    """
    message: str
    reset_token: str | None = None  # Only shown when email service is not configured


class ResetPasswordRequest(BaseModel):
    """Request schema for password reset."""
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class ResetPasswordResponse(BaseModel):
    """Response schema for password reset."""
    message: str
