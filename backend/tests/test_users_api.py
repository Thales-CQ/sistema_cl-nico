from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier
from unittest.mock import patch

import pytest
from sqlalchemy.exc import IntegrityError, OperationalError

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Profile, User


BASE = "/api/v1/users"
OWN = "/api/v1/auth/me/password"
PASSWORD = "senha-original-123"
NEW = "nova-senha-segura-456"
PUBLIC = {"id", "full_name", "birth_date", "email", "username", "is_active", "is_admin", "profiles", "created_at"}
PAYLOAD = dict(full_name="  Maria   Silva  ", birth_date="2000-02-29",
               email=" MARIA@EXAMPLE.COM ", username=" MARIA ", password=PASSWORD,
               profile_ids=[1])
ROUTES = [("get", BASE), ("get", BASE + "/1"), ("post", BASE),
          ("patch", BASE + "/1"), ("patch", BASE + "/1/status"),
          ("patch", BASE + "/1/password")]


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'users.db'}")
    monkeypatch.setattr(Config, "SECRET_KEY", "users-test-secret")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        for username, admin, active in [("admin", True, True), ("common", False, True),
                                         ("inactive", True, False)]:
            user = User(username=username, email=f"{username}@example.com", is_admin=admin, is_active=active)
            user.set_password(PASSWORD)
            db.session.add(user)
        db.session.add(Profile(name="Equipe padrão"))
        db.session.commit()
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()


def headers(client):
    return {"X-CSRF-Token": client.get("/api/v1/auth/me").json["csrf_token"],
            "Origin": "http://localhost"}


def as_user(app, user_id):
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = user_id
    return client


@pytest.fixture
def client(app):
    return as_user(app, 1)


def write(client, path, payload, method="patch"):
    response = getattr(client, method)(path, json=payload, headers=headers(client))
    assert response.headers["Cache-Control"] == "no-store"
    text = response.get_data(as_text=True)
    assert PASSWORD not in text and NEW not in text
    assert '"password"' not in text and 'password_hash' not in text
    return response


@pytest.mark.parametrize("method,path", ROUTES + [("patch", OWN)])
@pytest.mark.parametrize("identity,status", [(None, 401), (3, 401), (999, 401), (2, 403)])
def test_access(app, method, path, identity, status):
    client = as_user(app, identity)
    if path == OWN and identity == 2:
        status = 400  # Active common users reach payload validation.
    response = getattr(client, method)(path, json={}, headers=headers(client))
    assert response.status_code == status
    assert response.headers["Cache-Control"] == "no-store"


def test_list_details_and_create(app, client):
    response = client.get(BASE)
    assert [u["id"] for u in response.json["users"]] == [1, 2, 3]
    for user in response.json["users"]:
        assert set(user) == PUBLIC
    assert response.json["users"][0]["birth_date"] is None
    response = write(client, BASE, PAYLOAD, "post")
    assert response.status_code == 201
    user = response.json["user"]
    assert set(user) == PUBLIC
    assert (user["full_name"], user["email"], user["username"]) == ("MARIA SILVA", "maria@example.com", "MARIA")
    assert user["is_active"] is True and user["is_admin"] is False
    assert user["birth_date"] == "2000-02-29"
    assert client.get(f"{BASE}/{user['id']}").json == {"user": user}
    with app.app_context():
        saved = db.session.get(User, user["id"])
        assert type(saved.birth_date) is date
        assert saved.check_password(PASSWORD)


def test_create_explicit_flags(app, client):
    admin_id, _, _, _ = make_profiles(app)
    response = write(client, BASE, {**PAYLOAD, "profile_ids": [admin_id],
                                    "is_admin": True, "is_active": False}, "post")
    assert response.status_code == 201
    assert response.json["user"]["is_admin"] is True
    assert response.json["user"]["is_active"] is False


def test_create_and_edit_require_full_name_with_two_words(client):
    for name in ["JOÃO", " MARIA ", "   "]:
        assert write(client, BASE, {**PAYLOAD, "full_name": name}, "post").status_code == 400
        assert write(client, BASE + "/2", {"full_name": name}).status_code == 400
    created = write(client, BASE, {**PAYLOAD, "full_name": " João  da Silva "}, "post")
    assert created.status_code == 201
    assert created.json["user"]["full_name"] == "JOÃO DA SILVA"
    edited = write(client, BASE + "/2", {"full_name": " Ana  Maria Costa "})
    assert edited.status_code == 200
    assert edited.json["user"]["full_name"] == "ANA MARIA COSTA"


def test_edit_and_status(app, client):
    response = write(client, BASE + "/2", dict(full_name="  Novo   Nome ", birth_date="1980-01-02",
                     username=" COMMON2 ", email=" OTHER@EXAMPLE.COM ", is_admin=True))
    assert response.status_code == 200
    assert response.json["user"]["username"] == "COMMON2"
    assert response.json["user"]["full_name"] == "NOVO NOME"
    other = as_user(app, 2)
    assert other.get(BASE).status_code == 200
    assert write(client, BASE + "/2/status", {"is_active": False}).status_code == 200
    assert other.get(BASE).status_code == 401
    with other.session_transaction() as session:
        assert "user_id" not in session
    assert write(client, BASE + "/2/status", {"is_active": True}).status_code == 200
    assert as_user(app, 2).get(BASE).status_code == 200


@pytest.mark.parametrize("suffix,payload", [("", {"is_admin": False, "full_name": "Changed User"}),
                                            ("/status", {"is_active": False})])
def test_last_admin(client, suffix, payload):
    assert write(client, BASE + "/1" + suffix, payload).status_code == 409
    assert client.get(BASE + "/1").json["user"]["full_name"] is None
    assert write(client, BASE + "/2", {"is_admin": True}).status_code == 200
    assert write(client, BASE + "/1" + suffix, payload).status_code == 200
    assert client.get(BASE).status_code == (401 if suffix else 403)


@pytest.mark.parametrize("field,value", [("username", " ADMIN "), ("email", " ADMIN@EXAMPLE.COM ")])
def test_duplicates_and_atomic_edit(client, field, value):
    assert write(client, BASE, {**PAYLOAD, field: value}, "post").status_code == 409
    assert write(client, BASE + "/2", {field: value, "full_name": "Changed User"}).status_code == 409
    assert client.get(BASE + "/2").json["user"]["full_name"] is None
    assert write(client, BASE + "/1", {field: value}).status_code == 200


@pytest.mark.parametrize("field,value", [
    ("full_name", " "), ("full_name", 42), ("full_name", "x" * 121),
    ("username", " "), ("username", []), ("username", "x" * 81),
    ("email", "invalid"), ("email", None), ("email", "x" * 255),
    ("birth_date", "31/12/2000"), ("birth_date", "2001-02-29"),
    ("birth_date", "2000-13-01"), ("birth_date", "0000-01-01"),
    ("birth_date", "2000-1-01"), ("birth_date", None),
    ("birth_date", (date.today() + timedelta(days=1)).isoformat()),
    ("is_admin", 1), ("is_admin", "false"), ("is_active", None),
    ("password", "short"), ("password", 123), ("theme", "dark"),
    ("password_hash", "sensitive"),
])
def test_invalid_create_and_edit(client, field, value):
    assert write(client, BASE, {**PAYLOAD, field: value}, "post").status_code == 400
    assert write(client, BASE + "/2", {field: value}).status_code == (400 if field != "is_active" else 400)
    assert len(client.get(BASE).json["users"]) == 3


@pytest.mark.parametrize("field", ["full_name", "birth_date", "email", "username", "password", "profile_ids"])
def test_required_create(client, field):
    payload = {k: v for k, v in PAYLOAD.items() if k != field}
    assert write(client, BASE, payload, "post").status_code == 400


@pytest.mark.parametrize("path,method", [(BASE, "post"), (BASE + "/2", "patch"),
    (BASE + "/2/status", "patch"), (BASE + "/2/password", "patch"), (OWN, "patch")])
@pytest.mark.parametrize("body,content_type", [("[]", "application/json"), ("null", "application/json"),
    ('{"broken":', "application/json"), ('{}', "application/json"), ('{}', "text/plain")])
def test_bad_bodies(client, path, method, body, content_type):
    response = getattr(client, method)(path, data=body, content_type=content_type, headers=headers(client))
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [{"is_active": 0}, {"is_active": "true"},
    {"is_active": None}, {"is_active": True, "is_admin": True}, {"password": PASSWORD}])
def test_invalid_status(client, payload):
    assert write(client, BASE + "/2/status", payload).status_code == 400


def test_passwords(app, client):
    assert write(client, BASE + "/2/password", {"new_password": NEW}).status_code == 200
    common = as_user(app, 2)
    assert write(common, OWN, {"current_password": PASSWORD, "new_password": PASSWORD}).status_code == 403
    assert write(common, OWN, {"current_password": NEW, "new_password": PASSWORD}).status_code == 200
    with app.app_context():
        user = db.session.get(User, 2)
        assert user.check_password(PASSWORD) and not user.check_password(NEW)
        assert not user.is_admin
    assert common.get(BASE).status_code == 403
    assert write(client, OWN, {"current_password": PASSWORD, "new_password": NEW}).status_code == 200


@pytest.mark.parametrize("value", ["short", "x" * 11, None, [], 12, False])
def test_password_policy(client, value):
    assert write(client, BASE + "/2/password", {"new_password": value}).status_code == 400
    assert write(client, OWN, {"current_password": PASSWORD, "new_password": value}).status_code == 400


def test_password_exact_fields_and_minimum(client):
    assert write(client, BASE + "/2/password", {"new_password": NEW, "current_password": PASSWORD}).status_code == 400
    for data in [{"new_password": NEW}, {"current_password": None, "new_password": NEW},
                 {"current_password": PASSWORD, "new_password": NEW, "is_admin": True}]:
        assert write(client, OWN, data).status_code == 400
    assert write(client, BASE + "/2/password", {"new_password": "x" * 12}).status_code == 200


@pytest.mark.parametrize("suffix", ["", "/status", "/password"])
def test_not_found(client, suffix):
    assert write(client, BASE + "/999" + suffix, {}).status_code == 404
    response = client.get(BASE + "/999")
    assert response.status_code == 404
    assert response.headers["Cache-Control"] == "no-store"


@pytest.mark.parametrize("method,path", [r for r in ROUTES if r[0] != "get"] + [("patch", OWN)])
@pytest.mark.parametrize("attack", ["missing", "mismatch", "forged", "origin"])
def test_csrf(client, method, path, attack):
    h = headers(client)
    if attack == "missing":
        h.pop("X-CSRF-Token")
    elif attack == "mismatch":
        h["X-CSRF-Token"] = "wrong"
    elif attack == "forged":
        h["X-CSRF-Token"] = "forged"
        client.set_cookie("auth_csrf", "forged", path="/api/v1")
    else:
        h["Origin"] = "https://evil.example"
    response = getattr(client, method)(path, json=PAYLOAD, headers=h)
    assert response.status_code == 403
    assert response.headers["Cache-Control"] == "no-store"


@pytest.mark.parametrize("path,method,payload", [(BASE, "post", PAYLOAD),
    (BASE + "/2", "patch", {"full_name": "Changed User"}),
    (BASE + "/2/status", "patch", {"is_active": False}),
    (BASE + "/2/password", "patch", {"new_password": NEW}),
    (OWN, "patch", {"current_password": PASSWORD, "new_password": NEW})])
@pytest.mark.parametrize("exception,status", [(IntegrityError, 409), (OperationalError, 503)])
def test_rollback(app, client, path, method, payload, exception, status):
    h = headers(client)
    with app.app_context():
        with patch.object(db.session, "commit", side_effect=exception("sql", {}, Exception("sensitive"))), \
             patch.object(db.session, "rollback", wraps=db.session.rollback) as rollback:
            response = getattr(client, method)(path, json=payload, headers=h)
            assert response.status_code == status
            assert "sensitive" not in response.get_data(as_text=True)
            rollback.assert_called_once()
        assert User.query.count() == 3
        user = db.session.get(User, 2)
        assert user.full_name is None and user.is_active
        assert user.check_password(PASSWORD)
        assert db.session.get(User, 1).check_password(PASSWORD)


def test_single_commit(app, client):
    h = headers(client)
    with app.app_context():
        with patch.object(db.session, "commit", wraps=db.session.commit) as commit:
            assert client.post(BASE, json=PAYLOAD, headers=h).status_code == 201
            commit.assert_called_once()


@pytest.mark.parametrize("mixed", [False, True])
def test_concurrent_last_admin(app, client, mixed):
    assert write(client, BASE + "/2", {"is_admin": True}).status_code == 200
    clients = [as_user(app, 1), as_user(app, 2)]
    tokens = [headers(c) for c in clients]
    barrier = Barrier(2)

    def remove(index):
        barrier.wait(timeout=5)
        suffix = "/status" if mixed and index else ""
        data = {"is_active": False} if suffix else {"is_admin": False}
        return clients[index].patch(f"{BASE}/{index + 1}{suffix}", json=data,
                                    headers=tokens[index]).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(remove, range(2)))
    assert sorted(results) == [200, 409]
    with app.app_context():
        assert User.query.filter_by(is_admin=True, is_active=True).count() == 1


def test_database_unique_constraint_rolls_back(app, client):
    h = headers(client)
    # Simulate a concurrent insertion escaping the optimistic uniqueness check.
    with patch("app.routes.users.ensure_unique"):
        response = client.post(BASE, json={**PAYLOAD, "username": "admin"}, headers=h)
    assert response.status_code == 409
    with app.app_context():
        assert User.query.count() == 3
        assert db.session.get(User, 1).email == "admin@example.com"
    assert write(client, BASE, PAYLOAD, "post").status_code == 201


def test_invalid_edit_does_not_partially_change_user(client):
    assert write(client, BASE + "/2", {"full_name": "Changed", "email": "bad"}).status_code == 400
    assert client.get(BASE + "/2").json["user"]["full_name"] is None


def test_edit_persists_profile_and_status_in_one_update(client, app):
    response = write(client, BASE + "/2", {
        "full_name": "Changed User",
        "birth_date": "1980-01-02",
        "email": "changed@example.com",
        "username": "changed",
        "is_admin": False,
        "is_active": False,
    })
    assert response.status_code == 200
    assert response.json["user"]["is_active"] is False
    with app.app_context():
        user = db.session.get(User, 2)
        assert user.full_name == "CHANGED USER"
        assert user.is_active is False


def test_edit_status_last_admin_is_checked_against_final_state(client):
    assert write(client, BASE + "/1", {"is_admin": False, "is_active": False}).status_code == 409
    assert client.get(BASE + "/1").json["user"]["is_active"] is True


def test_edit_integrity_failure_rolls_back_profile_and_status(app, client):
    with app.app_context():
        original_commit = db.session.commit
        def fail_commit():
            raise IntegrityError("sql", {}, Exception("sensitive"))
        db.session.commit = fail_commit
        try:
            response = write(client, BASE + "/2", {
                "full_name": "Should Roll Back", "is_active": False,
                "is_admin": False,
            })
        finally:
            db.session.commit = original_commit
        assert response.status_code == 409
        user = db.session.get(User, 2)
        assert user.full_name is None and user.is_active is True


def test_admin_reset_does_not_require_active_target(client):
    assert write(client, BASE + "/3/password", {"new_password": NEW}).status_code == 200


def test_own_password_accepts_legacy_current_password(app):
    with app.app_context():
        db.session.get(User, 2).set_password("old")
        db.session.commit()
    common = as_user(app, 2)
    assert write(common, OWN, {"current_password": "old", "new_password": NEW}).status_code == 200


def test_password_changes_used_by_login(app, client):
    assert write(client, BASE + "/2/password", {"new_password": NEW}).status_code == 200
    browser = app.test_client()
    for password, status in [(PASSWORD, 401), (NEW, 200)]:
        response = browser.post("/api/v1/auth/login", json={"username": "common", "password": password},
                                headers=headers(browser))
        assert response.status_code == status


def test_inactivated_session_rejected_with_existing_csrf(app, client):
    common = as_user(app, 2)
    token = headers(common)
    assert write(client, BASE + "/2/status", {"is_active": False}).status_code == 200
    response = common.patch(OWN, json={"current_password": PASSWORD, "new_password": NEW}, headers=token)
    assert response.status_code == 401
    with common.session_transaction() as session:
        assert "user_id" not in session


@pytest.mark.parametrize("field,status", [("is_admin", 403), ("is_active", 401)])
def test_rechecks_actor_after_waiting_for_lock(app, client, monkeypatch, field, status):
    from app import user_api
    from sqlalchemy import update

    original_lock = user_api.lock_user_writes

    def changed_while_waiting():
        with db.engine.begin() as connection:
            connection.execute(update(User).where(User.id == 1).values(**{field: False}))
        original_lock()

    monkeypatch.setattr(user_api, "lock_user_writes", changed_while_waiting)
    assert write(client, BASE + "/2", {"full_name": "Forbidden"}).status_code == status
    with app.app_context():
        assert db.session.get(User, 2).full_name is None


def make_profiles(app):
    with app.app_context():
        admin = Profile(name="Administrador")
        first = Profile(name="Equipe")
        second = Profile(name="Clínica")
        inactive = Profile(name="Inativo", is_active=False)
        db.session.add_all((admin, first, second, inactive))
        db.session.commit()
        return admin.id, first.id, second.id, inactive.id


def test_create_with_one_and_multiple_profiles(app, client):
    admin_id, first_id, second_id, _ = make_profiles(app)
    one = write(client, BASE, {**PAYLOAD, "profile_ids": [first_id]}, "post")
    assert one.status_code == 201
    assert one.json["user"]["is_admin"] is False
    assert one.json["user"]["profiles"] == [
        {"id": first_id, "name": "Equipe", "is_active": True}]
    assert "password_hash" not in one.get_data(as_text=True)

    multiple = write(client, BASE, {
        **PAYLOAD, "username": "another", "email": "another@example.com",
        "profile_ids": [second_id, admin_id, first_id],
    }, "post")
    assert multiple.status_code == 201
    user = multiple.json["user"]
    assert user["is_admin"] is True
    assert [profile["id"] for profile in user["profiles"]] == sorted(
        [admin_id, first_id, second_id])
    assert client.get(f"{BASE}/{user['id']}").json["user"]["profiles"] == user["profiles"]
    assert any(item["id"] == user["id"] and item["profiles"] == user["profiles"]
               for item in client.get(BASE).json["users"])


def test_empty_profile_ids_rejected_and_legacy_patch_without_ids_preserves_links(client):
    created = write(client, BASE, {**PAYLOAD, "profile_ids": []}, "post")
    assert created.status_code == 400
    assert created.json["error"] == "Selecione pelo menos um perfil."
    changed = write(client, BASE + "/2", {"full_name": "Pessoa Legada", "profile_ids": []})
    assert changed.status_code == 400
    assert changed.json["error"] == "Selecione pelo menos um perfil."
    assert write(client, BASE + "/2", {"full_name": "Pessoa Legada"}).status_code == 200
    legacy = client.get(BASE + "/2").json["user"]
    assert legacy["full_name"] == "PESSOA LEGADA" and legacy["profiles"] == []


def test_patch_replaces_or_preserves_profiles_and_admin_flag(app, client):
    admin_id, first_id, second_id, _ = make_profiles(app)
    assert client.get(BASE + "/2").json["user"]["profiles"] == []  # legacy user
    added = write(client, BASE + "/2", {"profile_ids": [first_id, second_id]})
    assert added.status_code == 200
    assert [profile["id"] for profile in added.json["user"]["profiles"]] == [first_id, second_id]
    assert write(client, BASE + "/2", {"full_name": "Changed User"}).status_code == 200
    assert [profile["id"] for profile in client.get(BASE + "/2").json["user"]["profiles"]] == [
        first_id, second_id]
    promoted = write(client, BASE + "/2", {"profile_ids": [admin_id, second_id]})
    assert promoted.status_code == 200 and promoted.json["user"]["is_admin"] is True
    assert as_user(app, 2).get(BASE).status_code == 200
    removed = write(client, BASE + "/2", {"profile_ids": [first_id]})
    assert removed.status_code == 200 and removed.json["user"]["is_admin"] is False
    assert [profile["id"] for profile in removed.json["user"]["profiles"]] == [first_id]


@pytest.mark.parametrize("ids", ["1", None, {}, [True], [0], [-1], [1.0], [1, 1]])
def test_invalid_profile_ids_on_create_and_patch(app, client, ids):
    make_profiles(app)
    assert write(client, BASE, {**PAYLOAD, "profile_ids": ids}, "post").status_code == 400
    assert write(client, BASE + "/2", {"profile_ids": ids}).status_code == 400
    assert client.get(BASE + "/2").json["user"]["profiles"] == []


def test_missing_or_inactive_profile_and_atomicity(app, client):
    _, first_id, _, inactive_id = make_profiles(app)
    for ids in ([999], [first_id, inactive_id]):
        assert write(client, BASE, {**PAYLOAD, "profile_ids": ids}, "post").status_code == 400
        response = write(client, BASE + "/2", {
            "full_name": "Changed User", "profile_ids": ids,
        })
        assert response.status_code == 400
        assert client.get(BASE + "/2").json["user"]["full_name"] is None
    assert len(client.get(BASE).json["users"]) == 3

    with app.app_context():
        legacy = db.session.get(User, 2)
        legacy.profiles.append(db.session.get(Profile, inactive_id))
        db.session.commit()
    retained = write(client, BASE + "/2", {"profile_ids": [inactive_id, first_id]})
    assert retained.status_code == 200
    assert [profile["is_active"] for profile in retained.json["user"]["profiles"]] == [True, False]


def test_profile_ids_and_is_admin_conflicts(app, client):
    admin_id, first_id, _, _ = make_profiles(app)
    for ids, flag in [([admin_id], False), ([first_id], True), ([], True)]:
        assert write(client, BASE, {**PAYLOAD, "profile_ids": ids,
                                    "is_admin": flag}, "post").status_code == 400
        assert write(client, BASE + "/2", {"profile_ids": ids,
                                             "is_admin": flag}).status_code == 400
    assert write(client, BASE, {**PAYLOAD, "profile_ids": [first_id],
                                "is_admin": False}, "post").status_code == 201
    assert write(client, BASE + "/2", {"profile_ids": [admin_id],
                                        "is_admin": True}).status_code == 200


def test_last_admin_cannot_lose_profile_in_same_update(app, client):
    admin_id, first_id, _, _ = make_profiles(app)
    with app.app_context():
        actor = db.session.get(User, 1)
        actor.profiles.append(db.session.get(Profile, admin_id))
        db.session.commit()
    blocked = write(client, BASE + "/1", {
        "full_name": "Changed User", "profile_ids": [first_id],
    })
    assert blocked.status_code == 409
    unchanged = client.get(BASE + "/1").json["user"]
    assert unchanged["full_name"] is None and unchanged["is_admin"] is True
    assert [profile["id"] for profile in unchanged["profiles"]] == [admin_id]
    assert write(client, BASE + "/2", {"profile_ids": [admin_id]}).status_code == 200
    assert write(client, BASE + "/1", {"profile_ids": [first_id]}).status_code == 200


def test_profile_assignment_rolls_back_with_user_write(app, client):
    _, first_id, _, _ = make_profiles(app)
    with app.app_context():
        original_commit = db.session.commit

        def fail_commit():
            raise IntegrityError("sql", {}, Exception("sensitive"))

        db.session.commit = fail_commit
        try:
            response = write(client, BASE + "/2", {
                "full_name": "Changed User", "profile_ids": [first_id],
            })
        finally:
            db.session.commit = original_commit
        assert response.status_code == 409
        db.session.expire_all()
        user = db.session.get(User, 2)
        assert user.full_name is None and user.profiles == []
