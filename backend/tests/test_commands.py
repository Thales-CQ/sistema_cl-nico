import pytest

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import User


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")
    app = create_app()
    app.config["TESTING"] = True

    with app.app_context():
        db.create_all()

    try:
        yield app
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()


def test_create_admin_rejects_short_password(app):
    result = app.test_cli_runner().invoke(
        args=["create-admin", "--username", "adminteste", "--password", "12345678901"]
    )

    assert result.exit_code == 1
    assert "A senha deve ter pelo menos 12 caracteres." in result.output
    with app.app_context():
        assert User.query.count() == 0


def test_create_admin_stores_password_hash(app):
    password = "senha-teste-004"
    result = app.test_cli_runner().invoke(
        args=["create-admin", "--username", "adminteste", "--password", password]
    )

    assert result.exit_code == 0, result.output
    assert "Usuário administrador criado com sucesso." in result.output
    with app.app_context():
        user = User.query.one()
        assert user.username == "adminteste"
        assert user.password_hash != password
        assert user.check_password(password) is True
        assert user.check_password("outra-senha-004") is False


def test_create_admin_rejects_duplicate_username(app):
    with app.app_context():
        user = User(username="adminteste")
        user.set_password("senha-original-004")
        db.session.add(user)
        db.session.commit()
        original_id = user.id
        original_hash = user.password_hash

    result = app.test_cli_runner().invoke(
        args=[
            "create-admin", "--username", "adminteste",
            "--password", "senha-diferente-004",
        ]
    )

    assert result.exit_code == 1
    assert "Este nome de usuário já existe." in result.output
    with app.app_context():
        user = User.query.one()
        assert user.id == original_id
        assert user.password_hash == original_hash
