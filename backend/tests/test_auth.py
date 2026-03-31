from fastapi.testclient import TestClient

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