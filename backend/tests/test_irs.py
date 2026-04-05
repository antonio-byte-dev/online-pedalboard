from fastapi.testclient import TestClient
from app.models import IR
# --- Upload ---

def test_upload_ir_success(client: TestClient, auth_headers, test_wav_file):
    response = client.post("/irs/", 
        data={
            "name": "My IR",
            "description": "A great cabinet IR",
            "tags": "marshall,v30"
        },
        files={"file": ("cabinet.wav", test_wav_file, "audio/wav")},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My IR"
    assert data["description"] == "A great cabinet IR"
    assert data["tags"] == "marshall,v30"
    assert data["file_url"] == "http://localhost:9000/irs/test.wav"
    assert "id" in data
    assert "created_at" in data

def test_upload_ir_unauthenticated(client: TestClient, test_wav_file):
    response = client.post("/irs/",
        data={"name": "My IR"},
        files={"file": ("cabinet.wav", test_wav_file, "audio/wav")}
    )
    assert response.status_code == 401

def test_upload_ir_invalid_file_type(client: TestClient, auth_headers):
    response = client.post("/irs/",
        data={"name": "My IR"},
        files={"file": ("cabinet.mp3", b"fake mp3 data", "audio/mpeg")},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "Only .wav files are accepted" in response.json()["detail"]

def test_upload_ir_missing_name(client: TestClient, auth_headers, test_wav_file):
    response = client.post("/irs/",
        files={"file": ("cabinet.wav", test_wav_file, "audio/wav")},
        headers=auth_headers
    )
    assert response.status_code == 422

# --- List ---

def test_list_irs_empty(client: TestClient, auth_headers):
    response = client.get("/irs/", headers=auth_headers)
    assert response.status_code == 200

def test_list_irs(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/", headers=auth_headers)
    assert response.status_code == 200

def test_list_irs_search(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/?search=Test", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1

    response = client.get("/irs/?search=nonexistent", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0

def test_list_irs_filter_by_tags(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/?tags=marshall", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1

    response = client.get("/irs/?tags=fender", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0

def test_list_irs_pagination(client: TestClient, auth_headers, db, test_user):
    from app.models.ir import IR
    for i in range(5):
        db.add(IR(
            name=f"IR {i}",
            file_url="http://localhost:9000/irs/test.wav",
            file_name=f"test{i}.wav",
            author_id=test_user.id
        ))
    db.commit()

    response = client.get("/irs/?limit=2&skip=0", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5

    response = client.get("/irs/?limit=2&skip=2", headers=auth_headers)
    assert len(response.json()["items"]) == 2

def test_get_ir_success(client: TestClient, auth_headers, test_ir):
    response = client.get(f"/irs/{test_ir.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Test IR"

def test_get_ir_not_found(client: TestClient, auth_headers):
    response = client.get("/irs/99999", headers=auth_headers)
    assert response.status_code == 404

def test_delete_ir_success(client: TestClient, auth_headers, test_ir):
    response = client.delete(f"/irs/{test_ir.id}", headers=auth_headers)
    assert response.status_code == 204

    response = client.get(f"/irs/{test_ir.id}", headers=auth_headers)  # ← add headers
    assert response.status_code == 404

def test_list_irs_includes_author_username(client: TestClient, auth_headers, test_ir):  # ← add auth_headers param
    response = client.get("/irs/", headers=auth_headers)  # ← add headers
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["author_username"] == "testuser"


def test_get_ir_includes_author_username(client: TestClient, auth_headers, test_ir):
    response = client.get(f"/irs/{test_ir.id}", headers=auth_headers)  # ← add headers
    assert response.status_code == 200
    assert response.json()["author_username"] == "testuser"


# --- Delete ---


def test_delete_ir_not_owner(client: TestClient, auth_headers_2, test_ir, test_user_2):
    response = client.delete(f"/irs/{test_ir.id}", headers=auth_headers_2)
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]

def test_delete_ir_not_found(client: TestClient, auth_headers):
    response = client.delete("/irs/99999", headers=auth_headers)
    assert response.status_code == 404

def test_delete_ir_unauthenticated(client: TestClient, test_ir):
    response = client.delete(f"/irs/{test_ir.id}")
    assert response.status_code == 401

# --- Favorites ---

def test_add_favorite_success(client: TestClient, auth_headers, test_ir, test_user):
    response = client.post(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    assert response.status_code == 201
    assert "Added to favorites" in response.json()["message"]

def test_add_favorite_already_favorited(client: TestClient, auth_headers, test_ir, test_user):
    client.post(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    response = client.post(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    assert response.status_code == 400
    assert "Already in favorites" in response.json()["detail"]

def test_add_favorite_ir_not_found(client: TestClient, auth_headers):
    response = client.post("/irs/99999/favorite", headers=auth_headers)
    assert response.status_code == 404

def test_add_favorite_unauthenticated(client: TestClient, test_ir):
    response = client.post(f"/irs/{test_ir.id}/favorite")
    assert response.status_code == 401

def test_remove_favorite_success(client: TestClient, auth_headers, test_ir, test_user):
    client.post(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    response = client.delete(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    assert response.status_code == 204

def test_remove_favorite_not_in_favorites(client: TestClient, auth_headers, test_ir, test_user):
    response = client.delete(f"/irs/{test_ir.id}/favorite", headers=auth_headers)
    assert response.status_code == 404
    assert "Not in favorites" in response.json()["detail"]

def test_remove_favorite_unauthenticated(client: TestClient, test_ir):
    response = client.delete(f"/irs/{test_ir.id}/favorite")
    assert response.status_code == 401


# --- is_favorited in responses ---

def test_list_irs_is_favorited_false_when_not_favorited(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/", headers=auth_headers)
    if not response.json()["items"][0]["is_favorited"]:
        assert True
    else:
        assert False

def test_list_irs_is_favorited_true_when_favorited(client: TestClient, auth_headers, test_ir, test_favorite):
    response = client.get("/irs/", headers=auth_headers)
    if response.json()["items"][0]["is_favorited"]:
        assert True
    else:
        assert False

# --- favorites_only filter ---

def test_list_irs_favorites_only_empty(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/?favorites_only=true", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0

def test_list_irs_favorites_only_returns_favorited(client: TestClient, auth_headers, test_ir, test_favorite):
    response = client.get("/irs/?favorites_only=true", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == test_ir.id

def test_list_irs_favorites_only_unauthenticated(client: TestClient, test_ir):
    response = client.get("/irs/?favorites_only=true")
    assert response.status_code == 401

# --- My IRs ---

def test_list_my_irs_returns_only_own(client: TestClient, auth_headers, auth_headers_2, test_ir, test_user_2, db):
    from app.models.ir import IR
    other_ir = IR(
        name="Other IR",
        file_url="http://localhost:9000/irs/other.wav",
        file_name="other.wav",
        author_id=test_user_2.id
    )
    db.add(other_ir)
    db.commit()

    response = client.get("/irs/mine", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Test IR"

def test_list_my_irs_unauthenticated(client: TestClient):
    response = client.get("/irs/mine")
    assert response.status_code == 401

def test_list_my_irs_search(client: TestClient, auth_headers, test_ir):
    response = client.get("/irs/mine?search=Test", headers=auth_headers)
    assert response.json()["total"] == 1

    response = client.get("/irs/mine?search=nonexistent", headers=auth_headers)
    assert response.json()["total"] == 0

# --- Update IR ---

def test_update_ir_success(client: TestClient, auth_headers, test_ir):
    response = client.patch(f"/irs/{test_ir.id}",
        json={"name": "Updated Name", "tags": "fender,greenback"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["tags"] == "fender,greenback"

def test_update_ir_partial(client: TestClient, auth_headers, test_ir):
    response = client.patch(f"/irs/{test_ir.id}",
        json={"name": "Only Name Updated"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Only Name Updated"
    assert response.json()["tags"] == "marshall,v30"  # unchanged

def test_update_ir_not_owner(client: TestClient, auth_headers_2, test_ir):
    response = client.patch(f"/irs/{test_ir.id}",
        json={"name": "Hacked"},
        headers=auth_headers_2
    )
    assert response.status_code == 403

def test_update_ir_not_found(client: TestClient, auth_headers):
    response = client.patch("/irs/99999",
        json={"name": "Ghost"},
        headers=auth_headers
    )
    assert response.status_code == 404

def test_update_ir_unauthenticated(client: TestClient, test_ir):
    response = client.patch(f"/irs/{test_ir.id}", json={"name": "No auth"})
    assert response.status_code == 401

# --- Record usage ---

def test_record_ir_usage_success(client: TestClient, auth_headers, test_ir):
    response = client.post(f"/irs/{test_ir.id}/use", headers=auth_headers)
    assert response.status_code == 204

def test_record_ir_usage_unauthenticated(client: TestClient, test_ir):
    response = client.post(f"/irs/{test_ir.id}/use")
    assert response.status_code == 401

def test_record_ir_usage_upserts(client: TestClient, auth_headers, test_ir):
    # calling twice should not error — upsert behaviour
    client.post(f"/irs/{test_ir.id}/use", headers=auth_headers)
    response = client.post(f"/irs/{test_ir.id}/use", headers=auth_headers)
    assert response.status_code == 204

# Admin tests
def test_admin_can_delete_any_ir(client: TestClient, db):
    from app.models.user import User
    from app.routers.auth import hash_password

    # Create admin (first user)
    admin = User(username="admin", email="admin@test.com",
                 password=hash_password("adminpass"), is_admin=True)
    db.add(admin)
    db.commit()

    # Create IR owned by a different user
    other = User(username="other", email="other@test.com",
                 password=hash_password("otherpass"))
    db.add(other)
    db.commit()

    ir = IR(name="Other IR", file_url="http://localhost:9000/irs/x.wav",
            file_name="x.wav", author_id=other.id)
    db.add(ir)
    db.commit()

    # Login as admin
    res = client.post("/auth/login", data={"username": "admin", "password": "adminpass"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    response = client.delete(f"/irs/{ir.id}", headers=headers)
    assert response.status_code == 204

def test_admin_can_update_any_ir(client: TestClient, db):
    from app.models.user import User
    from app.routers.auth import hash_password

    admin = User(username="admin", email="admin@test.com",
                 password=hash_password("adminpass"), is_admin=True)
    db.add(admin)
    db.commit()

    other = User(username="other", email="other@test.com",
                 password=hash_password("otherpass"))
    db.add(other)
    db.commit()

    ir = IR(name="Other IR", file_url="http://localhost:9000/irs/x.wav",
            file_name="x.wav", author_id=other.id)
    db.add(ir)
    db.commit()

    res = client.post("/auth/login", data={"username": "admin", "password": "adminpass"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    response = client.patch(f"/irs/{ir.id}", json={"name": "Admin Renamed"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Admin Renamed"