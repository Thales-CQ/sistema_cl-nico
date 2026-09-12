import pytest

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import User


PASSWORD = "senha-de-teste-005"
BASE = "/api/v1/auth"


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")
    monkeypatch.setattr(Config, "SECRET_KEY", "chave-exclusiva-dos-testes")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        assert db.engine.url.drivername == "sqlite"
        db.create_all()
        user = User(username="admin")
        user.set_password(PASSWORD)
        db.session.add(user)
        db.session.commit()
    try:
        yield app
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_headers(client):
    response = client.get(f"{BASE}/me")
    return {"X-CSRF-Token": response.json["csrf_token"], "Origin": "http://localhost"}


def login(client, username="admin", password=PASSWORD):
    return client.post(
        f"{BASE}/login", json={"username": username, "password": password},
        headers=csrf_headers(client),
    )


@pytest.mark.parametrize("username", ["admin", "  ADMIN  "])
def test_login_and_me(client, username):
    response = login(client, username)
    assert response.status_code == 200
    assert response.json["user"] == {"id": 1, "username": "admin"}
    assert "password_hash" not in response.get_data(as_text=True)
    assert PASSWORD not in response.get_data(as_text=True)
    with client.session_transaction() as session:
        assert dict(session) == {"user_id": 1}
    response = client.get(f"{BASE}/me")
    assert response.status_code == 200
    assert set(response.json["user"]) == {"id", "username"}
    assert "password_hash" not in response.get_data(as_text=True)
    assert response.headers["Cache-Control"] == "no-store"


@pytest.mark.parametrize("failure", ["unknown", "password", "inactive"])
def test_login_generic_rejection(app, client, failure):
    if failure == "inactive":
        with app.app_context():
            db.session.get(User, 1).is_active = False
            db.session.commit()
    response = login(
        client, "missing" if failure == "unknown" else "admin",
        "incorrect" if failure == "password" else PASSWORD,
    )
    assert response.status_code == 401
    assert response.json["error"] == "Credenciais inválidas."
    assert "password_hash" not in response.get_data(as_text=True)
    with client.session_transaction() as session:
        assert dict(session) == {}


@pytest.mark.parametrize("payload", [
    {}, {"username": "admin"}, {"password": PASSWORD},
    {"username": "", "password": PASSWORD},
    {"username": "   ", "password": PASSWORD},
    {"username": "admin", "password": ""},
    {"username": "admin", "password": "   "},
    {"username": 1, "password": PASSWORD},
    {"username": None, "password": PASSWORD},
    {"username": [], "password": PASSWORD},
    {"username": "admin", "password": False},
    {"username": "admin", "password": {}},
    [], "text", 42,
])
def test_invalid_fields(client, payload):
    response = client.post(f"{BASE}/login", json=payload, headers=csrf_headers(client))
    assert response.status_code == 400


@pytest.mark.parametrize("body,content_type", [
    ('{"username":', "application/json"),
    ("null", "application/json"),
    ('{"username":"admin"}', "text/plain"),
    ("username=admin&password=test", "application/x-www-form-urlencoded"),
])
def test_invalid_json(client, body, content_type):
    response = client.post(
        f"{BASE}/login", data=body, content_type=content_type,
        headers=csrf_headers(client),
    )
    assert response.status_code == 400


def test_me_without_session(client):
    response = client.get(f"{BASE}/me")
    assert response.status_code == 401
    assert "csrf_token" in response.json


@pytest.mark.parametrize("change", ["inactive", "deleted"])
def test_user_rechecked(app, client, change):
    assert login(client).status_code == 200
    with app.app_context():
        user = db.session.get(User, 1)
        if change == "inactive":
            user.is_active = False
        else:
            db.session.delete(user)
        db.session.commit()
    assert client.get(f"{BASE}/me").status_code == 401
    with client.session_transaction() as session:
        assert dict(session) == {}


@pytest.mark.parametrize("user_id", ["invalid", None, [], True, 999])
def test_invalid_session_identifier(client, user_id):
    with client.session_transaction() as session:
        session["user_id"] = user_id
    assert client.get(f"{BASE}/me").status_code == 401
    with client.session_transaction() as session:
        assert dict(session) == {}


def test_tampered_session(client, app):
    assert login(client).status_code == 200
    client.set_cookie(app.config["SESSION_COOKIE_NAME"], "tampered-cookie")
    assert client.get(f"{BASE}/me").status_code == 401


def test_logout_and_repeated_logout(client):
    assert login(client).status_code == 200
    for _ in range(2):
        response = client.post(f"{BASE}/logout", headers=csrf_headers(client))
        assert response.status_code == 200
        with client.session_transaction() as session:
            assert dict(session) == {}
        assert client.get(f"{BASE}/me").status_code == 401


def test_login_clears_previous_session(client):
    headers = csrf_headers(client)
    with client.session_transaction() as session:
        session["old_data"] = "discard"
    response = client.post(
        f"{BASE}/login", json={"username": "admin", "password": PASSWORD}, headers=headers,
    )
    assert response.status_code == 200
    with client.session_transaction() as session:
        assert dict(session) == {"user_id": 1}
    response = login(client, password="wrong")
    assert response.status_code == 401
    with client.session_transaction() as session:
        assert dict(session) == {}


@pytest.mark.parametrize("secure", [False, True])
def test_cookie_attributes(app, client, secure):
    app.config["SESSION_COOKIE_SECURE"] = secure
    response = login(client)
    cookies = response.headers.getlist("Set-Cookie")
    assert any(cookie.startswith("session=") for cookie in cookies)
    assert any(cookie.startswith("auth_csrf=") for cookie in cookies)
    for cookie in cookies:
        assert "HttpOnly" in cookie
        assert "SameSite=Lax" in cookie
        assert ("Secure" in cookie) is secure
    assert app.permanent_session_lifetime.total_seconds() == 1800


@pytest.mark.parametrize("endpoint", ["login", "logout"])
@pytest.mark.parametrize("attack", ["missing", "mismatch", "forged", "origin", "null_origin"])
def test_csrf_rejected(client, endpoint, attack):
    assert login(client).status_code == 200
    headers = csrf_headers(client)
    if attack == "missing":
        del headers["X-CSRF-Token"]
    elif attack == "mismatch":
        headers["X-CSRF-Token"] = "different"
    elif attack == "forged":
        headers["X-CSRF-Token"] = "forged"
        client.set_cookie("auth_csrf", "forged", path="/api/v1/auth")
    else:
        headers["Origin"] = "null" if attack == "null_origin" else "https://evil.example"
    response = client.post(
        f"{BASE}/{endpoint}", json={"username": "admin", "password": PASSWORD},
        headers=headers,
    )
    assert response.status_code == 403
    assert "Access-Control-Allow-Origin" not in response.headers


def test_login_requires_csrf_even_when_anonymous(client):
    response = client.post(f"{BASE}/login", json={"username": "admin", "password": PASSWORD})
    assert response.status_code == 403


def test_csrf_bound_to_authenticated_user(client):
    old_headers = csrf_headers(client)
    assert login(client).status_code == 200
    client.set_cookie("auth_csrf", old_headers["X-CSRF-Token"], path="/api/v1/auth")
    assert client.post(f"{BASE}/logout", headers=old_headers).status_code == 403


def test_csrf_without_origin_still_requires_token(client):
    headers = csrf_headers(client)
    del headers["Origin"]
    response = client.post(
        f"{BASE}/login", json={"username": "admin", "password": PASSWORD}, headers=headers,
    )
    assert response.status_code == 200


def test_expired_session(app, client, monkeypatch):
    from itsdangerous import TimestampSigner

    with monkeypatch.context() as past:
        original = TimestampSigner.get_timestamp
        past.setattr(TimestampSigner, "get_timestamp", lambda self: original(self) - 1801)
        serializer = app.session_interface.get_signing_serializer(app)
        cookie = serializer.dumps({"user_id": 1})
    client.set_cookie(app.config["SESSION_COOKIE_NAME"], cookie)
    assert client.get(f"{BASE}/me").status_code == 401


def test_expired_csrf(client, monkeypatch):
    from itsdangerous import TimestampSigner

    with monkeypatch.context() as past:
        original = TimestampSigner.get_timestamp
        past.setattr(TimestampSigner, "get_timestamp", lambda self: original(self) - 1801)
        headers = csrf_headers(client)
    assert client.post(f"{BASE}/logout", headers=headers).status_code == 403
