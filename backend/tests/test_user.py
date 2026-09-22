from datetime import date

from app.models import User


def test_set_password_generates_hash():
    user = User(username="admin")
    user.set_password("senha-segura")

    assert user.password_hash != "senha-segura"
    assert user.password_hash is not None


def test_check_password():
    user = User(username="admin")
    user.set_password("senha-segura")

    assert user.check_password("senha-segura") is True
    assert user.check_password("senha-errada") is False


def test_user_has_0_0_11_profile_fields():
    user = User(
        full_name="Nome Completo",
        birth_date=date(1980, 1, 2),
        email="nome@example.com",
        username="nome",
    )
    assert user.full_name == "NOME COMPLETO"
    assert user.birth_date == date(1980, 1, 2)
    assert user.email == "nome@example.com"
    assert user.is_admin is None


def test_user_admin_default_is_false_after_persist(monkeypatch):
    from app import create_app
    from app.config import Config
    from app.extensions import db

    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")
    app = create_app()
    with app.app_context():
        db.create_all()
        user = User(username="legacy")
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()
        assert user.is_admin is False
        db.session.remove()
        db.engine.dispose()


def test_theme_migration_preserves_existing_users(monkeypatch, tmp_path):
    from flask_migrate import upgrade
    from sqlalchemy import text
    from app import create_app
    from app.config import Config
    from app.extensions import db

    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'theme.db'}")
    app = create_app()
    with app.app_context():
        try:
            upgrade(revision="7f3c2a91d6e4")
            db.session.execute(text(
                "INSERT INTO users (username, password_hash, is_active, created_at) "
                "VALUES ('existing', 'existing-hash', 1, '2026-09-20 00:00:00')"
            ))
            db.session.commit()
            upgrade()
            user = User.query.filter_by(username="existing").one()
            assert user.theme is None
            assert user.password_hash == "existing-hash"
            assert user.is_active is True
            user.theme = "dark"
            db.session.commit()
            db.session.expire_all()
            assert User.query.filter_by(username="existing").one().theme == "dark"
        finally:
            db.session.remove()
            db.engine.dispose()


def test_user_profile_migration_preserves_legacy_users(monkeypatch, tmp_path):
    from flask_migrate import upgrade
    from sqlalchemy import text
    from app import create_app
    from app.config import Config
    from app.extensions import db

    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'profile.db'}")
    app = create_app()
    with app.app_context():
        try:
            upgrade(revision="b9d4a72c810f")
            db.session.execute(text(
                "INSERT INTO users (username, password_hash, is_active, created_at, theme) "
                "VALUES ('existing', 'existing-hash', 1, '2026-09-20 00:00:00', 'dark')"
            ))
            db.session.commit()
            upgrade()
            user = User.query.filter_by(username="existing").one()
            assert user.full_name is None
            assert user.birth_date is None
            assert user.email is None
            assert user.is_admin is False
            assert user.password_hash == "existing-hash"
            assert user.is_active is True
            assert user.theme == "dark"
        finally:
            db.session.remove()
            db.engine.dispose()
