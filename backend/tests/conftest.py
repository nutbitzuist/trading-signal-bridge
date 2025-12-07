"""
Pytest configuration and fixtures.
"""
import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings

# Test database URL (use SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database and session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with the test database."""

    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def user_data() -> dict:
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
    }


@pytest.fixture
def account_data() -> dict:
    """Sample MT account data for testing."""
    return {
        "name": "Test Account",
        "broker": "Test Broker",
        "account_number": "123456",
        "platform": "mt4",
    }


@pytest.fixture
def webhook_payload() -> dict:
    """Sample webhook payload for testing."""
    return {
        "secret": "test-webhook-secret",
        "symbol": "XAUUSD",
        "action": "buy",
        "order_type": "market",
        "quantity": 0.1,
        "take_profit": 2050.00,
        "stop_loss": 2020.00,
        "comment": "Test Signal",
    }
