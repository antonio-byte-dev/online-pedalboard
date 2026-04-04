import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch
from app.main import app
from app.database import Base, get_db
from app.routers.auth import hash_password
from app.models.user import User
from app.models.ir import IR
from app.models.ir import IR, UserIRUsage
from app.models.favorite import Favorite


# --- In-memory SQLite database for tests ---

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Override database dependency ---

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# --- Mock MinIO storage ---

@pytest.fixture(autouse=True)
def mock_storage():
    with patch("app.routers.irs.storage.upload_ir", return_value="http://localhost:9000/irs/test.wav"), \
         patch("app.routers.irs.storage.delete_ir", return_value=None):
        yield

# --- Create and drop tables for each test ---

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# --- Test client ---

@pytest.fixture
def client():
    return TestClient(app)

# --- Reusable fixtures ---

@pytest.fixture
def db():
    database = TestingSessionLocal()
    try:
        yield database
    finally:
        database.close()

@pytest.fixture
def test_user(db):
    user = User(
        username="testuser",
        email="test@test.com",
        password=hash_password("password123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_user_2(db):
    user = User(
        username="otheruser",
        email="other@test.com",
        password=hash_password("password123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(client, test_user):
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_2(client, test_user_2):
    response = client.post("/auth/login", data={
        "username": "otheruser",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_ir(db, test_user):
    ir = IR(
        name="Test IR",
        description="A test IR",
        tags="marshall,v30",
        file_url="http://localhost:9000/irs/test.wav",
        file_name="test.wav",
        file_size=1024,
        author_id=test_user.id
    )
    db.add(ir)
    db.commit()
    db.refresh(ir)
    return ir

@pytest.fixture
def test_favorite(db, test_user, test_ir):
    favorite = Favorite(user_id=test_user.id, ir_id=test_ir.id)
    db.add(favorite)
    db.commit()
    return favorite

@pytest.fixture
def test_ir_usage(db, test_user, test_ir):
    from datetime import datetime, timezone
    usage = UserIRUsage(
        user_id=test_user.id,
        ir_id=test_ir.id,
        last_used_at=datetime.now(timezone.utc)
    )
    db.add(usage)
    db.commit()
    return usage
@pytest.fixture
def test_wav_file():
    # Minimal valid WAV file bytes
    return b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"