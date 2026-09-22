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
