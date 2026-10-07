from datetime import date, datetime

import pytest
from flask_migrate import upgrade
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Permission, Profile, User


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'profiles.db'}")
    monkeypatch.setattr(Config, "SECRET_KEY", "profiles-test-secret")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()


def test_profile_relationships_and_constraints(app):
    with app.app_context():
        db.create_all()
        tables = inspect(db.engine).get_table_names()
        assert "profiles" in tables and "user_profiles" in tables
        profile_columns = {column["name"] for column in inspect(db.engine).get_columns("profiles")}
        assert profile_columns == {"id", "name", "is_active", "created_at"}
        links = inspect(db.engine).get_pk_constraint("user_profiles")["constrained_columns"]
        assert set(links) == {"user_id", "profile_id"}

        first = User(username="first")
        second = User(username="second")
        for user in (first, second):
            user.set_password("test-password-123")
        alpha = Profile(name="Alpha")
        beta = Profile(name="Beta")
        first.profiles.extend((alpha, beta))
        second.profiles.append(alpha)
        db.session.add_all((first, second))
        db.session.commit()
        assert {profile.name for profile in first.profiles} == {"Alpha", "Beta"}
        assert {user.username for user in alpha.users} == {"FIRST", "SECOND"}
        assert alpha.is_active is True
        assert isinstance(alpha.created_at, datetime)

        with pytest.raises(IntegrityError):
            db.session.execute(text(
                "INSERT INTO user_profiles (user_id, profile_id) VALUES (:user_id, :profile_id)"
            ), {"user_id": first.id, "profile_id": alpha.id})
        db.session.rollback()
        db.session.add(Profile(name="Alpha"))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_migration_backfills_only_admins_and_preserves_data(app):
    with app.app_context():
        upgrade(revision="3e5b9d1f0a11")
        db.session.execute(text(
            "INSERT INTO users (id, username, password_hash, is_active, is_admin, "
            "created_at, full_name, birth_date, email, theme) VALUES "
            "(11, 'admin', 'hash-one', 1, 1, '2026-09-20', 'ADMIN EXISTENTE', "
            "'1980-01-02', 'admin@example.com', 'dark'), "
            "(12, 'inactive', 'hash-two', 0, 1, '2026-09-20', NULL, "
            "NULL, NULL, NULL), "
            "(13, 'common', 'hash-three', 1, 0, '2026-09-20', NULL, "
            "NULL, NULL, 'light')"
        ))
        db.session.commit()
        upgrade()

        admin = Profile.query.filter_by(name="Administrador").one()
        assert Profile.query.count() == 1
        assert admin.is_active is True
        assert {user.id for user in admin.users} == {11, 12}
        assert User.query.filter_by(is_admin=True).count() == len(admin.users)
        assert User.query.filter_by(is_admin=False).one().profiles == []
        preserved = db.session.get(User, 11)
        assert preserved.password_hash == "hash-one"
        assert (preserved.full_name, preserved.birth_date, preserved.email) == (
            "ADMIN EXISTENTE", date(1980, 1, 2), "admin@example.com")
        assert preserved.theme == "dark" and preserved.is_active is True
        assert db.session.get(User, 12).is_active is False
        assert db.session.get(User, 13).password_hash == "hash-three"
        assert db.session.get(User, 13).theme == "light"

        client = app.test_client()
        with client.session_transaction() as session:
            session["user_id"] = 11
        response = client.get("/api/v1/users")
        assert response.status_code == 200
        assert "password_hash" not in response.get_data(as_text=True)
        assert "hash-one" not in response.get_data(as_text=True)
        assert response.json["users"][0]["is_admin"] is True


def test_admin_association_tracks_existing_admin_writes(app):
    with app.app_context():
        db.create_all()
        actor = User(username="actor", is_admin=True)
        actor.set_password("test-password-123")
        db.session.add(actor)
        db.session.commit()
        from app.admin_profile import sync_admin_profile
        sync_admin_profile(actor)
        actor.profiles[0].permissions.extend(
            Permission(code=code, description=code)
            for code in ("users.view", "users.create", "users.update", "users.assign_profiles")
        )
        db.session.commit()
        client = app.test_client()
        with client.session_transaction() as session:
            session["user_id"] = actor.id
        token = client.get("/api/v1/auth/me").json["csrf_token"]
        headers = {"X-CSRF-Token": token, "Origin": "http://localhost"}
        payload = {"full_name": "Outro Usuario", "birth_date": "1980-01-02",
                   "email": "other@example.com", "username": "other",
                   "password": "test-password-123", "is_admin": True,
                   "profile_ids": [Profile.query.filter_by(name="Administrador").one().id]}
        created = client.post("/api/v1/users", json=payload, headers=headers)
        assert created.status_code == 201
        new_id = created.json["user"]["id"]
        assert [profile.name for profile in db.session.get(User, new_id).profiles] == ["Administrador"]
        changed = client.patch(f"/api/v1/users/{new_id}", json={"is_admin": False}, headers=headers)
        assert changed.status_code == 200
        db.session.expire_all()
        assert db.session.get(User, new_id).profiles == []
        assert client.get("/api/v1/users").status_code == 200
