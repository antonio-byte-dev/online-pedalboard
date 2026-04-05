from fastapi.testclient import TestClient
from unittest.mock import patch

# — Forgot password —

def test_forgot_password_success(client: TestClient, test_user):
    with patch("app.routers.auth.send_password_reset_email") as mock_send:
        response = client.post("/auth/forgot-password", json={"email": "test@test.com"})
        assert response.status_code == 204
        mock_send.assert_called_once()

def test_forgot_password_unknown_email_returns_204(client: TestClient):
    # Must not leak whether email exists
    response = client.post("/auth/forgot-password", json={"email": "ghost@ghost.com"})
    assert response.status_code == 204

def test_forgot_password_creates_token(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    with patch("app.routers.auth.send_password_reset_email"):
        client.post("/auth/forgot-password", json={"email": "test@test.com"})
    token = db.query(PasswordResetToken).filter_by(user_id=test_user.id).first()
    assert token is not None
    if not token.used:
        assert True
    else:
        assert False

def test_forgot_password_invalidates_previous_token(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    with patch("app.routers.auth.send_password_reset_email"):
        client.post("/auth/forgot-password", json={"email": "test@test.com"})
        client.post("/auth/forgot-password", json={"email": "test@test.com"})
    tokens = db.query(PasswordResetToken).filter_by(user_id=test_user.id).all()
    used_tokens   = [t for t in tokens if t.used]
    active_tokens = [t for t in tokens if not t.used]
    assert len(used_tokens) == 1
    assert len(active_tokens) == 1

# — Reset password —

def test_reset_password_success(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    from datetime import datetime, timezone, timedelta

    token = PasswordResetToken(
        user_id=test_user.id,
        token="validtoken123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(token)
    db.commit()

    response = client.post("/auth/reset-password", json={
        "token":        "validtoken123",
        "new_password": "newpassword456"
    })
    assert response.status_code == 204

def test_reset_password_token_is_marked_used(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    from datetime import datetime, timezone, timedelta

    token = PasswordResetToken(
        user_id=test_user.id,
        token="usetoken123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(token)
    db.commit()

    client.post("/auth/reset-password", json={
        "token":        "usetoken123",
        "new_password": "newpassword456"
    })

    db.refresh(token)
    if token.used:
        assert True
    else:
        assert False

def test_reset_password_updates_password(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    from datetime import datetime, timezone, timedelta

    token = PasswordResetToken(
        user_id=test_user.id,
        token="pwdtoken123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(token)
    db.commit()

    client.post("/auth/reset-password", json={
        "token":        "pwdtoken123",
        "new_password": "brandnewpassword"
    })

    # Should be able to login with new password
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "brandnewpassword"
    })
    assert response.status_code == 200

def test_reset_password_invalid_token(client: TestClient):
    response = client.post("/auth/reset-password", json={
        "token":        "totallyinvalidtoken",
        "new_password": "newpassword456"
    })
    assert response.status_code == 400
    assert "Invalid or expired token" in response.json()["detail"]

def test_reset_password_already_used_token(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    from datetime import datetime, timezone, timedelta

    token = PasswordResetToken(
        user_id=test_user.id,
        token="usedtoken123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        used=True,  # already used
    )
    db.add(token)
    db.commit()

    response = client.post("/auth/reset-password", json={
        "token":        "usedtoken123",
        "new_password": "newpassword456"
    })
    assert response.status_code == 400

def test_reset_password_expired_token(client: TestClient, test_user, db):
    from app.models.password_reset import PasswordResetToken
    from datetime import datetime, timezone, timedelta

    token = PasswordResetToken(
        user_id=test_user.id,
        token="expiredtoken123",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),  # expired
    )
    db.add(token)
    db.commit()

    response = client.post("/auth/reset-password", json={
        "token":        "expiredtoken123",
        "new_password": "newpassword456"
    })
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()

def test_register_success(client: TestClient):
    response = client.post("/auth/register", json={
        "username": "newuser",
        "email": "newuser@test.com",
        "password": "password123"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@test.com"
    assert "password" not in data
    assert "id" in data
    assert "created_at" in data

def test_register_duplicate_email(client: TestClient, test_user):
    response = client.post("/auth/register", json={
        "username": "differentuser",
        "email": "test@test.com",  # same email as test_user
        "password": "password123"
    })
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_register_duplicate_username(client: TestClient, test_user):
    response = client.post("/auth/register", json={
        "username": "testuser",  # same username as test_user
        "email": "different@test.com",
        "password": "password123"
    })
    assert response.status_code == 400
    assert "Username already taken" in response.json()["detail"]

def test_register_invalid_email(client: TestClient):
    response = client.post("/auth/register", json={
        "username": "newuser",
        "email": "not-an-email",
        "password": "password123"
    })
    assert response.status_code == 422

def test_login_success(client: TestClient, test_user):
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client: TestClient, test_user):
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_login_user_not_found(client: TestClient):
    response = client.post("/auth/login", data={
        "username": "nonexistent",
        "password": "password123"
    })
    assert response.status_code == 401

def test_me_authenticated(client: TestClient, auth_headers, test_user):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@test.com"
    assert "password" not in data

def test_me_unauthenticated(client: TestClient):
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_me_invalid_token(client: TestClient):
    response = client.get("/auth/me", headers={
        "Authorization": "Bearer invalidtoken"
    })
    assert response.status_code == 401

def test_recent_ir_none_when_no_usage(client: TestClient, auth_headers):
    response = client.get("/auth/me/recent-ir", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() is None

def test_recent_ir_returns_last_used(client: TestClient, auth_headers, test_ir, db):
    from app.models.ir import UserIRUsage
    from datetime import datetime, timezone
    db.add(UserIRUsage(
        user_id=db.query(__import__('app.models.user', fromlist=['User']).User)
                  .filter_by(username='testuser').first().id,
        ir_id=test_ir.id,
        last_used_at=datetime.now(timezone.utc)
    ))
    db.commit()
    response = client.get("/auth/me/recent-ir", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == test_ir.id

def test_recent_ir_unauthenticated(client: TestClient):
    response = client.get("/auth/me/recent-ir")
    assert response.status_code == 401

def test_stats_returns_expected_shape(client: TestClient, auth_headers, test_ir):
    response = client.get("/auth/me/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_irs" in data
    assert "user_uploads" in data
    assert "last_login" in data