from datetime import date, timedelta
from unittest.mock import Mock

import pytest

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import User


ADMIN_ARGS = [
    "--full-name", "Administrador Teste",
    "--birth-date", "02/01/1980",
    "--email", " Admin@Example.COM ",
    "--username", " AdminTeste ",
    "--password", "senha-teste-004",
]


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
    args = ADMIN_ARGS.copy()
    args[-1] = "12345678901"
    result = app.test_cli_runner().invoke(args=["create-admin", *args])

    assert result.exit_code == 1
    assert "A senha deve ter pelo menos 12 caracteres." in result.output
    with app.app_context():
        assert User.query.count() == 0


def test_create_admin_creates_complete_admin_without_exposing_secret(app):
    result = app.test_cli_runner().invoke(args=["create-admin", *ADMIN_ARGS])

    assert result.exit_code == 0, result.output
    assert "Usuário administrador criado com sucesso." in result.output
    assert "password_hash" not in result.output
    with app.app_context():
        user = User.query.one()
        assert user.full_name == "ADMINISTRADOR TESTE"
        assert user.birth_date == date(1980, 1, 2)
        assert user.email == "admin@example.com"
        assert user.username == "ADMINTESTE"
        assert user.is_admin is True
        assert user.is_active is True
        assert user.password_hash != "senha-teste-004"
        assert user.check_password("senha-teste-004") is True


def test_create_admin_rejects_duplicate_username(app):
    app.test_cli_runner().invoke(args=["create-admin", *ADMIN_ARGS])
    args = ADMIN_ARGS.copy()
    args[-1] = "senha-diferente-004"
    args[1] = "Outro Nome"
    args[5] = "outro@example.com"

    result = app.test_cli_runner().invoke(args=["create-admin", *args])

    assert result.exit_code == 1
    assert "Este nome de usuário já existe." in result.output
    with app.app_context():
        assert User.query.count() == 1


def test_create_admin_rejects_duplicate_email(app):
    app.test_cli_runner().invoke(args=["create-admin", *ADMIN_ARGS])
    args = ADMIN_ARGS.copy()
    args[1] = "Outro Nome"
    args[7] = "outro-username"

    result = app.test_cli_runner().invoke(args=["create-admin", *args])

    assert result.exit_code == 1
    assert "Este e-mail já existe." in result.output


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("--full-name", "   ", "nome completo"),
        ("--full-name", "João", "nome e sobrenome"),
        ("--birth-date", (date.today() + timedelta(days=1)).strftime("%d/%m/%Y"), "não pode ser futura"),
        ("--birth-date", "1980-01-01", "DD/MM/AAAA"),
        ("--birth-date", "31/04/1980", "data válida"),
        ("--email", "invalid", "formato válido"),
    ],
)
def test_create_admin_validates_profile_fields(app, field, value, message):
    args = ADMIN_ARGS.copy()
    args[args.index(field) + 1] = value
    result = app.test_cli_runner().invoke(args=["create-admin", *args])

    assert result.exit_code == 1
    assert message in result.output
    with app.app_context():
        assert User.query.count() == 0


def test_complete_legacy_user_updates_only_profile_and_explicit_admin(app):
    with app.app_context():
        user = User(username="legado")
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()
        original_hash = user.password_hash
        original_id = user.id

    result = app.test_cli_runner().invoke(
        args=[
            "complete-legacy-user",
            "--username", "LEGADO",
            "--full-name", "Usuário Legado",
            "--birth-date", "06/05/1975",
            "--email", " Legado@Example.COM ",
            "--is-admin",
        ]
    )

    assert result.exit_code == 0, result.output
    assert "password_hash" not in result.output
    with app.app_context():
        user = User.query.one()
        assert user.id == original_id
        assert user.full_name == "USUÁRIO LEGADO"
        assert user.birth_date == date(1975, 5, 6)
        assert user.email == "legado@example.com"
        assert user.is_admin is True
        assert user.is_active is True
        assert user.theme is None
        assert user.password_hash == original_hash
        assert user.check_password("senha-legado-004") is True


def test_complete_legacy_user_rejects_first_name_only(app):
    with app.app_context():
        user = User(username="legado")
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()

    result = app.test_cli_runner().invoke(args=[
        "complete-legacy-user", "--username", "legado",
        "--full-name", "João", "--birth-date", "06/05/1975",
        "--email", "legado@example.com",
    ])
    assert result.exit_code == 1
    assert "nome e sobrenome" in result.output
    with app.app_context():
        user = User.query.one()
        assert user.full_name is None
        assert user.birth_date is None
        assert user.email is None


def test_complete_legacy_user_rejects_duplicate_email_without_changes(app):
    with app.app_context():
        first = User(username="first", email="first@example.com")
        first.set_password("senha-first-004")
        second = User(username="second")
        second.set_password("senha-second-004")
        db.session.add_all([first, second])
        db.session.commit()
        original_hash = second.password_hash

    result = app.test_cli_runner().invoke(
        args=[
            "complete-legacy-user", "--username", "second",
            "--full-name", "Segundo Usuário", "--birth-date", "01/01/1980",
            "--email", "first@example.com", "--is-admin",
        ]
    )

    assert result.exit_code == 1
    assert "Este e-mail já existe." in result.output
    with app.app_context():
        user = User.query.filter_by(username="SECOND").one()
        assert user.full_name is None
        assert user.email is None
        assert user.is_admin is False
        assert user.password_hash == original_hash


@pytest.mark.parametrize("value, message", [
    ("1980-01-02", "DD/MM/AAAA"),
    ("2/1/1980", "DD/MM/AAAA"),
    ("31/04/1980", "data válida"),
    ("29/02/1900", "data válida"),
    ((date.today() + timedelta(days=1)).strftime("%d/%m/%Y"), "não pode ser futura"),
])
def test_complete_legacy_user_rejects_invalid_birth_date(app, value, message):
    with app.app_context():
        user = User(username="legado")
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()
        original_hash = user.password_hash

    result = app.test_cli_runner().invoke(args=[
        "complete-legacy-user", "--username", "legado",
        "--full-name", "Usuário Legado", "--birth-date", value,
        "--email", "legado@example.com", "--is-admin",
    ])

    assert result.exit_code == 1
    assert message in result.output
    with app.app_context():
        user = User.query.one()
        assert user.birth_date is None
        assert user.full_name is None
        assert user.email is None
        assert user.is_admin is False
        assert user.password_hash == original_hash


@pytest.mark.parametrize("command", ["create-admin", "complete-legacy-user"])
def test_commands_prompt_for_brazilian_birth_date(app, command):
    if command == "complete-legacy-user":
        with app.app_context():
            user = User(username="legado")
            user.set_password("senha-legado-004")
            db.session.add(user)
            db.session.commit()
    args = [command, "--full-name", "Nome Completo", "--username", "legado",
            "--email", "legado@example.com"]
    if command == "create-admin":
        args += ["--password", "senha-teste-004"]
    result = app.test_cli_runner().invoke(args=args, input="29/02/2000\n")
    assert result.exit_code == 0, result.output
    assert "Data de nascimento (DD/MM/AAAA)" in result.output
    with app.app_context():
        assert User.query.one().birth_date == date(2000, 2, 29)


@pytest.mark.parametrize("initial_admin", [False, True])
@pytest.mark.parametrize("promote", [False, True])
@pytest.mark.parametrize("supply_profile", [False, True])
def test_complete_regularized_legacy_user_preserves_data(
    app, monkeypatch, initial_admin, promote, supply_profile
):
    with app.app_context():
        user = User(
            username="thales", full_name="Thales Legado",
            birth_date=date(1980, 1, 2), email="thales@example.com",
            is_admin=initial_admin, is_active=False, theme="dark",
        )
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()
        original = {column.name: getattr(user, column.name)
                    for column in User.__table__.columns}

    commit = Mock(wraps=db.session.commit)
    monkeypatch.setattr(db.session, "commit", commit)
    args = ["complete-legacy-user", "--username", "thales"]
    if promote:
        args.append("--is-admin")
    if supply_profile:
        args += ["--full-name", "Outro Nome", "--birth-date", "03/04/1990",
                 "--email", "outro@example.com"]
    result = app.test_cli_runner().invoke(args=args)

    assert result.exit_code == 0, result.output
    commit.assert_called_once_with()
    assert "Nome completo:" not in result.output
    assert "Data de nascimento" not in result.output
    assert "E-mail:" not in result.output
    assert "senha-legado-004" not in result.output
    assert original["password_hash"] not in result.output
    assert "password_hash" not in result.output
    with app.app_context():
        user = User.query.one()
        expected = dict(original, is_admin=initial_admin or promote)
        assert {column.name: getattr(user, column.name)
                for column in User.__table__.columns} == expected


def test_complete_regularized_legacy_user_rolls_back_failed_promotion(app, monkeypatch):

    with app.app_context():
        user = User(
            username="thales", full_name="Thales Legado",
            birth_date=date(1980, 1, 2), email="thales@example.com",
        )
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()
        original_hash = user.password_hash

        def fail_commit():
            db.session.flush()
            raise RuntimeError("Falha simulada")

        commit = Mock(side_effect=fail_commit)
        rollback = Mock(wraps=db.session.rollback)
        monkeypatch.setattr(db.session, "commit", commit)
        monkeypatch.setattr(db.session, "rollback", rollback)
        result = app.test_cli_runner().invoke(args=[
            "complete-legacy-user", "--username", "thales", "--is-admin",
        ])

        assert result.exit_code == 1
        commit.assert_called_once_with()
        rollback.assert_called_once_with()
        assert User.query.one().is_admin is False
        assert User.query.one().password_hash == original_hash
        assert original_hash not in result.output
        assert "senha-legado-004" not in result.output


@pytest.mark.parametrize("initial_admin", [False, True])
def test_complete_legacy_user_without_flag_preserves_privileges(app, initial_admin):
    with app.app_context():
        user = User(username="legado", is_admin=initial_admin)
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()

    result = app.test_cli_runner().invoke(
        args=["complete-legacy-user", "--username", "legado"],
        input="Usuário Legado\n06/05/1975\nlegado@example.com\n",
    )

    assert result.exit_code == 0, result.output
    with app.app_context():
        user = User.query.one()
        assert user.is_admin is initial_admin
        assert user.full_name == "USUÁRIO LEGADO"
        assert user.birth_date == date(1975, 5, 6)
        assert user.email == "legado@example.com"


def test_complete_legacy_user_still_rejects_partial_profile(app):
    with app.app_context():
        user = User(username="legado", full_name="Nome Existente")
        user.set_password("senha-legado-004")
        db.session.add(user)
        db.session.commit()

    result = app.test_cli_runner().invoke(args=[
        "complete-legacy-user", "--username", "legado", "--is-admin",
        "--full-name", "Outro Nome", "--birth-date", "01/01/1980",
        "--email", "legado@example.com",
    ])

    assert result.exit_code == 1
    assert "já possui dados cadastrais" in result.output
    with app.app_context():
        user = User.query.one()
        assert user.full_name == "NOME EXISTENTE"
        assert user.birth_date is None
        assert user.email is None
        assert user.is_admin is False
