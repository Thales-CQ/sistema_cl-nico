import click
from app.admin_profile import sync_admin_profile
from flask.cli import with_appcontext
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import User
from app.user_api import lock_user_writes
from app.user_identity import matching_user_ids, normalization_plan
from app.validators.user import (
    normalize_email,
    normalize_username,
    parse_birth_date,
    validate_full_name,
    validate_password,
)


def _validated_user_data(full_name, birth_date, email, username, password):
    return {
        "full_name": validate_full_name(full_name),
        "birth_date": parse_birth_date(birth_date),
        "email": normalize_email(email),
        "username": normalize_username(username),
        "password": validate_password(password),
    }


def _ensure_unique(data, user_id=None):
    if matching_user_ids("username", data["username"], exclude_id=user_id):
        raise click.ClickException("Este nome de usuário já existe.")
    if matching_user_ids("email", data["email"], exclude_id=user_id):
        raise click.ClickException("Este e-mail já existe.")


@click.command("create-admin")
@click.option("--full-name", prompt="Nome completo")
@click.option("--birth-date", prompt="Data de nascimento (DD/MM/AAAA)")
@click.option("--email", prompt="E-mail")
@click.option("--username", prompt="Nome de usuário")
@click.option(
    "--password",
    prompt="Senha",
    hide_input=True,
    confirmation_prompt="Confirme a senha",
)
@with_appcontext
def create_admin(full_name, birth_date, email, username, password):
    """Cria um usuário administrador de forma segura."""
    try:
        data = _validated_user_data(
            full_name, birth_date, email, username, password
        )
        lock_user_writes()
        _ensure_unique(data)
        user = User(
            full_name=data["full_name"],
            birth_date=data["birth_date"],
            email=data["email"],
            username=data["username"],
            is_active=True,
            is_admin=True,
        )
        user.set_password(data["password"])
        db.session.add(user)
        sync_admin_profile(user)
        db.session.commit()
    except (ValueError, click.ClickException) as exc:
        db.session.rollback()
        if isinstance(exc, click.ClickException):
            raise
        raise click.ClickException(str(exc)) from exc
    except SQLAlchemyError:
        db.session.rollback()
        raise click.ClickException("Não foi possível salvar o usuário.") from None
    except Exception:
        db.session.rollback()
        raise

    click.echo("Usuário administrador criado com sucesso.")


@click.command("complete-legacy-user")
@click.option("--username", prompt="Nome de usuário existente")
@click.option("--full-name")
@click.option("--birth-date")
@click.option("--email")
@click.option(
    "--is-admin",
    is_flag=True,
    default=False,
    help="Confirma explicitamente que a conta deve ser administradora.",
)
@with_appcontext
def complete_legacy_user(username, full_name, birth_date, email, is_admin):
    """Completa explicitamente os dados de um usuário legado."""
    try:
        normalized_username = normalize_username(username)
        lock_user_writes()
        matches = matching_user_ids("username", normalized_username)
        if len(matches) > 1:
            raise click.ClickException("Username ambíguo; resolva as colisões antes de continuar.")
        user = db.session.get(User, matches[0]) if matches else None
        if user is None:
            raise click.ClickException("Usuário legado não encontrado.")
        profile = (user.full_name, user.birth_date, user.email)
        if any(profile) and not all(profile):
            raise click.ClickException(
                "Este usuário já possui dados cadastrais; nenhuma alteração foi feita."
            )
        if not all(profile):
            data = _validated_user_data(
                full_name if full_name is not None else click.prompt("Nome completo"),
                birth_date if birth_date is not None else click.prompt(
                    "Data de nascimento (DD/MM/AAAA)"
                ),
                email if email is not None else click.prompt("E-mail"),
                normalized_username,
                "placeholder-password",
            )
            _ensure_unique(data, user_id=user.id)
            user.full_name = data["full_name"]
            user.birth_date = data["birth_date"]
            user.email = data["email"]
        # This command explicitly targets one account. Preserve supplied profile
        # semantics for completed accounts, but normalize their existing values.
        user.username = normalized_username
        if user.full_name is not None:
            user.full_name = validate_full_name(user.full_name)
        if user.email is not None:
            email = normalize_email(user.email)
            _ensure_unique({"username": normalized_username, "email": email}, user.id)
            user.email = email
        if is_admin:
            user.is_admin = True
            sync_admin_profile(user)
        db.session.commit()
    except (ValueError, click.ClickException) as exc:
        db.session.rollback()
        if isinstance(exc, click.ClickException):
            raise
        raise click.ClickException(str(exc)) from exc
    except SQLAlchemyError:
        db.session.rollback()
        raise click.ClickException("Não foi possível salvar o usuário.") from None
    except Exception:
        db.session.rollback()
        raise

    click.echo("Dados do usuário legado atualizados com sucesso.")


@click.command("normalize-users")
@click.option("--apply", "apply_changes", is_flag=True,
              help="Aplica após confirmação; sem esta opção, somente audita.")
@with_appcontext
def normalize_users(apply_changes):
    """Audita normalização e colisões, sem exibir senhas, hashes ou valores pessoais."""
    try:
        if apply_changes:
            click.confirm(
                "Confirma a normalização com backup verificado e escritores antigos parados?",
                abort=True,
            )
            lock_user_writes()
        total, changes, invalid, collisions = normalization_plan()
        click.echo(f"Usuários auditados: {total}. Usuários a normalizar: {len(changes)}.")
        for user_id, fields in changes:
            click.echo(f"ID {user_id}: {', '.join(sorted(fields))}.")
        for user_id, field in invalid:
            click.echo(f"Dado inválido: ID {user_id}, campo {field}.")
        for field, ids in collisions:
            click.echo(f"Colisão de {field}: IDs {', '.join(map(str, ids))}.")
        if invalid or collisions:
            raise click.ClickException("Regularização bloqueada; nenhuma alteração foi feita.")
        if not apply_changes:
            db.session.rollback()
            click.echo("Somente auditoria. Nenhuma alteração foi feita.")
            return
        # Only the three explicit profile columns are written. IDs, dates,
        # roles, active flags, themes and password hashes are never touched.
        for user_id, fields in changes:
            db.session.execute(update(User).where(User.id == user_id).values(**fields))
        db.session.commit()
        click.echo("Normalização concluída.")
    except SQLAlchemyError:
        db.session.rollback()
        raise click.ClickException("Não foi possível normalizar; transação revertida.") from None
    except Exception:
        db.session.rollback()
        raise
