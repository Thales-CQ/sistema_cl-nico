from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import OperationalError
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Permission, Profile, User
from app.validators.user import normalize_username, validate_full_name, normalize_email

PASSWORD = " MinhaSenha123! "
HASH = generate_password_hash(PASSWORD)
BASE = "/api/v1/users"


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'normalization.db'}")
    monkeypatch.setattr(Config, "SECRET_KEY", "normalization-tests")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        operator = User(username="operator", is_admin=True, password_hash=HASH)
        db.session.add(operator)
        db.session.add(Profile(name="Equipe"))
        db.session.flush()
        operator.profiles.append(Profile(name="Operador", permissions=[
            Permission(code=code, description=code)
            for code in ("users.view", "users.create", "users.update", "users.assign_profiles")
        ]))
        db.session.commit()
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()


def legacy(app, username="thales", full_name="João da Silva", email="Usuario@Email.COM"):
    with app.app_context():
        result = db.session.execute(insert(User.__table__).values(
            username=username, full_name=full_name, email=email,
            password_hash=HASH, birth_date=date(1980, 1, 2) if full_name else None,
            is_admin=False, is_active=True, theme="dark",
        ))
        db.session.commit()
        return result.inserted_primary_key[0]


def snapshot(app):
    with app.app_context():
        return [dict(row) for row in db.session.execute(select(User.__table__).order_by(User.id)).mappings()]


def headers(client):
    token = client.get("/api/v1/auth/me").json["csrf_token"]
    return {"X-CSRF-Token": token, "Origin": "http://localhost"}


def admin_client(app):
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = 1
    return client


def login(app, username, password=PASSWORD):
    client = app.test_client()
    result = client.post("/api/v1/auth/login", json={"username": username, "password": password}, headers=headers(client))
    assert PASSWORD not in result.text and HASH not in result.text and "password_hash" not in result.text
    return result


def payload(username="thales", email="Usuario@Email.COM"):
    return dict(full_name="  João   da Silva  ", birth_date="1980-01-02", email=email,
                username=username, password=PASSWORD, profile_ids=[1])


@pytest.mark.parametrize("value,expected", [(" thales ", "THALES"), ("ThAlEs", "THALES"), ("josé", "JOSÉ"), ("straße", "STRASSE")])
def test_shared_unicode_username_rule(value, expected):
    assert normalize_username(value) == expected
    assert normalize_username(expected) == expected


def test_name_and_email_normalization_and_expansion_limits():
    assert validate_full_name("  João   da Silva  ") == "JOÃO DA SILVA"
    assert normalize_email(" Usuario@Email.COM ") == "usuario@email.com"
    with pytest.raises(ValueError):
        normalize_username("ß" * 41)
    with pytest.raises(ValueError):
        validate_full_name("ß" * 61)


def test_model_normalizes_assignments_but_not_password(app):
    with app.app_context():
        user = User(username="thales", full_name="João da Silva", email="Usuario@Email.COM")
        user.set_password(PASSWORD)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        assert (user.username, user.full_name, user.email) == ("THALES", "JOÃO DA SILVA", "usuario@email.com")
        assert user.check_password(PASSWORD)
        assert not user.check_password(PASSWORD.upper())
        assert not user.check_password(PASSWORD.lower())
        assert not user.check_password(PASSWORD.strip())


@pytest.mark.parametrize("username", ["thales", "THALES", "Thales", "tHaLeS"])
@pytest.mark.parametrize("old", [False, True])
def test_login_new_and_legacy_accounts(app, username, old):
    if old:
        legacy(app)
    else:
        client = admin_client(app)
        assert client.post(BASE, json=payload(), headers=headers(client)).status_code == 201
    before = snapshot(app)
    response = login(app, username)
    assert response.status_code == 200
    assert response.json["user"]["username"] == ("thales" if old else "THALES")
    assert snapshot(app) == before  # Login never rewrites existing accounts.


@pytest.mark.parametrize("stored,entered", [("straße", "STRASSE"), ("josé", "JOSÉ"), ("Thales", "tHaLeS")])
def test_legacy_login_uses_python_unicode_not_database_upper(app, stored, entered):
    legacy(app, username=stored)
    assert login(app, entered).status_code == 200


@pytest.mark.parametrize("wrong", [PASSWORD.upper(), PASSWORD.lower(), PASSWORD.strip()])
def test_password_remains_exact_on_login(app, wrong):
    legacy(app)
    assert login(app, "THALES", wrong).status_code == 401
    assert login(app, "THALES").status_code == 200


@pytest.mark.parametrize("old", [False, True])
@pytest.mark.parametrize("field", ["username", "email"])
def test_create_and_edit_reject_case_insensitive_duplicates(app, old, field):
    if old:
        legacy(app)
    else:
        with app.app_context():
            db.session.add(User(username="THALES", email="usuario@email.com", password_hash=HASH))
            db.session.commit()
    client = admin_client(app)
    values = payload(username="other", email="other@example.com")
    values[field] = "  tHaLeS " if field == "username" else " USUARIO@EMAIL.COM "
    before = snapshot(app)
    assert client.post(BASE, json=values, headers=headers(client)).status_code == 409
    assert client.patch(BASE + "/1", json={field: values[field]}, headers=headers(client)).status_code == 409
    assert snapshot(app) == before


def test_api_create_edit_normalization_and_no_secrets(app):
    client = admin_client(app)
    response = client.post(BASE, json=payload(), headers=headers(client))
    assert response.status_code == 201
    user = response.json["user"]
    assert (user["full_name"], user["username"], user["email"]) == ("JOÃO DA SILVA", "THALES", "usuario@email.com")
    response = client.patch(f"{BASE}/{user['id']}", json={"full_name": "Maria José", "username": "mArIa", "email": " MARIA@EMAIL.COM "}, headers=headers(client))
    assert response.status_code == 200
    assert (response.json["user"]["full_name"], response.json["user"]["username"], response.json["user"]["email"]) == ("MARIA JOSÉ", "MARIA", "maria@email.com")
    assert login(app, "mArIa").status_code == 200
    for response in [response, client.get(BASE), client.get(f"{BASE}/{user['id']}")]:
        assert "password_hash" not in response.text and PASSWORD not in response.text and HASH not in response.text


def test_ambiguous_legacy_login_fails_closed_and_audit_blocks_all_writes(app):
    legacy(app, username="straße", email="one@example.com")
    legacy(app, username="STRASSE", email="two@example.com")
    before = snapshot(app)
    assert login(app, "straße").status_code == 401
    assert login(app, "STRASSE").status_code == 401
    for args in [["normalize-users"], ["normalize-users", "--apply"]]:
        result = app.test_cli_runner().invoke(args=args, input="y\n")
        assert result.exit_code == 1
        assert "Colisão de username: IDs 2, 3" in result.output
        assert HASH not in result.output and PASSWORD not in result.output
        assert snapshot(app) == before
    result = app.test_cli_runner().invoke(args=["complete-legacy-user", "--username", "strasse"])
    assert result.exit_code == 1 and "ambíguo" in result.output
    assert snapshot(app) == before


def test_audit_default_is_read_only_apply_is_explicit_atomic_and_idempotent(app):
    legacy(app)
    before = snapshot(app)
    runner = app.test_cli_runner()
    result = runner.invoke(args=["normalize-users"])
    assert result.exit_code == 0 and "Somente auditoria" in result.output
    assert "ID 2: email, full_name, username" in result.output
    assert snapshot(app) == before
    assert runner.invoke(args=["normalize-users", "--apply"], input="n\n").exit_code != 0
    assert snapshot(app) == before
    result = runner.invoke(args=["normalize-users", "--apply"], input="y\n")
    assert result.exit_code == 0, result.output
    after = snapshot(app)
    expected = dict(before[1], username="THALES", full_name="JOÃO DA SILVA", email="usuario@email.com")
    assert after == [before[0], expected]
    assert runner.invoke(args=["normalize-users", "--apply"], input="y\n").exit_code == 0
    assert snapshot(app) == after
    assert HASH not in result.output and PASSWORD not in result.output


@pytest.mark.parametrize("invalid", ["collision", "invalid"])
def test_audit_blocks_email_collision_or_invalid_expanded_username(app, invalid):
    legacy(app)
    legacy(app, username="other" if invalid == "collision" else "ß" * 41,
           email="usuario@email.com" if invalid == "collision" else "other@example.com")
    before = snapshot(app)
    result = app.test_cli_runner().invoke(args=["normalize-users", "--apply"], input="y\n")
    assert result.exit_code == 1
    assert snapshot(app) == before


def test_apply_database_failure_rolls_back_without_exposing_parameters(app, monkeypatch):
    legacy(app)
    before = snapshot(app)
    with app.app_context():
        def fail():
            db.session.flush()
            raise OperationalError("private SQL", {"password_hash": HASH}, Exception(PASSWORD))
        monkeypatch.setattr(db.session, "commit", fail)
        result = app.test_cli_runner().invoke(args=["normalize-users", "--apply"], input="y\n")
    assert result.exit_code == 1 and "transação revertida" in result.output
    assert HASH not in result.output and PASSWORD not in result.output and "private SQL" not in result.output
    assert snapshot(app) == before


def test_cli_create_and_legacy_completion_share_rule_and_preserve_hash(app):
    runner = app.test_cli_runner()
    args = ["create-admin", "--username", " mArIa ", "--full-name", "Maria José", "--email", " MARIA@EMAIL.COM ", "--birth-date", "01/01/1980", "--password", PASSWORD]
    result = runner.invoke(args=args)
    assert result.exit_code == 0, result.output
    created = snapshot(app)[1]
    assert PASSWORD not in result.output and created["password_hash"] not in result.output
    assert (created["username"], created["full_name"], created["email"]) == ("MARIA", "MARIA JOSÉ", "maria@email.com")
    assert login(app, "maria").status_code == 200
    legacy(app, full_name=None, email=None)
    before = snapshot(app)[2]
    result = runner.invoke(args=["complete-legacy-user", "--username", "THALES", "--full-name", "João da Silva", "--email", " USUARIO@EMAIL.COM ", "--birth-date", "02/01/1980"])
    assert result.exit_code == 0, result.output
    after = snapshot(app)[2]
    assert (after["username"], after["full_name"], after["email"]) == ("THALES", "JOÃO DA SILVA", "usuario@email.com")
    assert after["password_hash"] == before["password_hash"]
    assert after["is_admin"] == before["is_admin"]
    assert HASH not in result.output and PASSWORD not in result.output


def test_cli_create_rejects_existing_legacy_username(app):
    legacy(app)
    result = app.test_cli_runner().invoke(args=["create-admin", "--username", "THALES", "--full-name", "Outro Nome", "--email", "other@example.com", "--birth-date", "01/01/1980", "--password", PASSWORD])
    assert result.exit_code == 1 and "nome de usuário já existe" in result.output
    assert len(snapshot(app)) == 2


def test_completed_legacy_profile_normalizes_stored_values_without_replacing_them(app):
    legacy(app)
    before = snapshot(app)
    result = app.test_cli_runner().invoke(args=[
        "complete-legacy-user", "--username", "tHaLeS",
        "--full-name", "Ignored Name", "--email", "ignored@example.com",
    ])
    assert result.exit_code == 0, result.output
    assert snapshot(app) == [before[0], dict(
        before[1], username="THALES", full_name="JOÃO DA SILVA", email="usuario@email.com",
    )]


def test_concurrent_case_variants_cannot_create_two_accounts(app):
    barrier = Barrier(2)
    def create(index):
        client = admin_client(app)
        token = headers(client)
        barrier.wait()
        return client.post(BASE, json=payload(["thales", "THALES"][index], f"{index}@example.com"), headers=token).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(create, range(2))) == [201, 409]
    assert len(snapshot(app)) == 2
