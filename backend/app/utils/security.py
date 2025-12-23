"""
Security utilities for password hashing, token generation, and JWT handling.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt

from app.config import settings

# Password hashing

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # Ensure password is truncated to 72 bytes (bcrypt limitation)
    if isinstance(password, str):
        password = password.encode('utf-8')[:72]
    elif isinstance(password, bytes):
        password = password[:72]
        
    # Generate salt and hash
    hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS))
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    # Ensure password is truncated to 72 bytes (bcrypt limitation)
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')[:72]
    elif isinstance(plain_password, bytes):
        plain_password = plain_password[:72]

    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
        
    return bcrypt.checkpw(plain_password, hashed_password)


def generate_api_key() -> str:
    """Generate a secure API key for MT accounts."""
    return secrets.token_hex(settings.API_KEY_LENGTH // 2)


def generate_webhook_secret() -> str:
    """Generate a secure webhook secret for users."""
    return secrets.token_hex(settings.WEBHOOK_SECRET_LENGTH // 2)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        subject: The subject (usually user ID) to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
    }

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT refresh token.

    Args:
        subject: The subject (usually user ID) to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
    }

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token to verify
        token_type: Expected token type ('access' or 'refresh')

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        # Verify token type
        if payload.get("type") != token_type:
            return None

        return payload
    except JWTError:
        return None


def create_password_reset_token(email: str) -> str:
    """
    Create a JWT token for password reset.

    Args:
        email: The user's email address

    Returns:
        Encoded JWT token string
    """
    expire = datetime.utcnow() + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )

    to_encode = {
        "sub": email,
        "exp": expire,
        "type": "password_reset",
        "iat": datetime.utcnow(),
    }

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify and decode a password reset token.

    Args:
        token: The password reset JWT token to verify

    Returns:
        User email if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        # Verify token type
        if payload.get("type") != "password_reset":
            return None

        return payload.get("sub")
    except JWTError:
        return None

