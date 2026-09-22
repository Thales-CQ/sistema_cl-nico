import pytest

from app import create_app
from app.admin_profile import sync_admin_profile
from app.config import Config
from app.extensions import db
from app.models import Profile, User


BASE = "/api/v1/profiles"


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'profiles-api.db'}")
    monkeypatch.setattr(Config, "SECRET_KEY", "profiles-api-secret")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        admin = User(username="admin", is_admin=True)
        common = User(username="common")
        for user in (admin, common):
            user.set_password("test-password-123")
            db.session.add(user)
        db.session.flush()
        sync_admin_profile(admin)
        db.session.commit()
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()


def as_user(app, user_id):
    client = app.test_client()
    if user_id is not None:
        with client.session_transaction() as session:
            session["user_id"] = user_id
    return client


def write(client, method, path, payload):
    token = client.get("/api/v1/auth/me").json["csrf_token"]
    return getattr(client, method)(path, json=payload, headers={
        "X-CSRF-Token": token, "Origin": "http://localhost",
    })


@pytest.mark.parametrize("method,path", [
    ("get", BASE), ("get", BASE + "/1"),
    ("post", BASE), ("patch", BASE + "/1"),
])
@pytest.mark.parametrize("identity,status", [(None, 401), (2, 403)])
def test_admin_only(app, method, path, identity, status):
    client = as_user(app, identity)
    response = (client.get(path) if method == "get"
                else write(client, method, path, {"name": "Teste"}))
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"


def test_list_get_create_and_edit(app):
    client = as_user(app, 1)
    initial = client.get(BASE)
    assert initial.status_code == 200
    assert [(profile["name"], profile["is_active"]) for profile in initial.json["profiles"]] == [
        ("Administrador", True)]
    assert set(initial.json["profiles"][0]) == {"id", "name", "is_active", "created_at"}
    assert "password_hash" not in initial.get_data(as_text=True)
    assert client.get(BASE + "/999").status_code == 404

    created = write(client, "post", BASE, {"name": "  Equipe   Clínica  ", "is_active": False})
    assert created.status_code == 201
    profile = created.json["profile"]
    assert profile["name"] == "Equipe Clínica" and profile["is_active"] is False
    assert client.get(f"{BASE}/{profile['id']}").json["profile"] == profile
    assert len(client.get(BASE).json["profiles"]) == 2

    activated = write(client, "patch", f"{BASE}/{profile['id']}", {"is_active": True})
    assert activated.status_code == 200
    assert activated.json["profile"]["is_active"] is True
    changed = write(client, "patch", f"{BASE}/{profile['id']}", {"name": "  Outra   Equipe "})
    assert changed.status_code == 200
    assert changed.json["profile"]["name"] == "Outra Equipe"
    assert write(client, "patch", f"{BASE}/{profile['id']}", {"is_active": False}).status_code == 200
    assert client.get(f"{BASE}/{profile['id']}").json["profile"]["is_active"] is False


@pytest.mark.parametrize("payload", [{}, {"name": ""}, {"name": "  \t  "}, {"name": None},
                                     {"is_active": True}, {"name": "Ok", "is_active": "false"},
                                     {"name": "Ok", "password_hash": "secret"}])
def test_invalid_creation(app, payload):
    response = write(as_user(app, 1), "post", BASE, payload)
    assert response.status_code == 400
    with app.app_context():
        assert Profile.query.count() == 1


def test_duplicates_and_missing_profile(app):
    client = as_user(app, 1)
    assert write(client, "post", BASE, {"name": "  administrador "}).status_code == 409
    first = write(client, "post", BASE, {"name": "Equipe  Azul"})
    assert first.status_code == 201
    assert write(client, "post", BASE, {"name": " equipe azul "}).status_code == 409
    other = write(client, "post", BASE, {"name": "Outro"})
    assert write(client, "patch", f"{BASE}/{other.json['profile']['id']}",
                 {"name": " EQUIPE   AZUL "}).status_code == 409
    assert write(client, "patch", BASE + "/999", {"name": "Novo"}).status_code == 404
    assert write(client, "patch", f"{BASE}/{first.json['profile']['id']}",
                 {"name": "   "}).status_code == 400


def test_structural_admin_cannot_be_renamed_or_deactivated(app):
    client = as_user(app, 1)
    admin_id = client.get(BASE).json["profiles"][0]["id"]
    for payload in ({"name": "Outro Nome"}, {"name": " ADMINISTRADOR "},
                    {"is_active": False}, {"name": "Outro Nome", "is_active": False}):
        assert write(client, "patch", f"{BASE}/{admin_id}", payload).status_code == 409
    assert write(client, "patch", f"{BASE}/{admin_id}", {"is_active": True}).status_code == 200
    with app.app_context():
        admin = db.session.get(Profile, admin_id)
        assert admin.name == "Administrador" and admin.is_active is True
        assert db.session.get(User, 1).is_admin is True


def test_csrf_required_for_profile_writes(app):
    client = as_user(app, 1)
    assert client.post(BASE, json={"name": "Novo"}).status_code == 403
    assert client.patch(BASE + "/1", json={"is_active": False}).status_code == 403
