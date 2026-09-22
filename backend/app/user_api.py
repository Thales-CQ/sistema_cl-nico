"""Shared validation and transaction boundaries for user API writes."""

import re
from functools import wraps
from datetime import timezone

from flask import jsonify, request
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Profile, User
from app.admin_profile import ADMIN_PROFILE_NAME
from app.security import resolve_active_user
from app.user_identity import matching_user_ids
from app.validators.user import (
    normalize_email, normalize_username, parse_birth_date,
    validate_full_name, validate_password,
)


class UserAPIError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


def api_birth_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("A data de nascimento deve estar no formato AAAA-MM-DD.")
    year, month, day = value.split("-")
    try:
        return parse_birth_date(f"{day}/{month}/{year}")
    except ValueError as exc:
        raise ValueError(str(exc).replace("DD/MM/AAAA", "AAAA-MM-DD")) from None


def boolean(value):
    if type(value) is not bool:
        raise ValueError("O valor deve ser booleano.")
    return value


def profile_ids(value):
    if not isinstance(value, list) or any(type(item) is not int or item < 1 for item in value):
        raise ValueError("profile_ids deve ser uma lista de IDs inteiros positivos.")
    if not value:
        raise ValueError("Selecione pelo menos um perfil.")
    if len(value) != len(set(value)):
        raise ValueError("profile_ids não pode conter IDs duplicados.")
    return value


def resolve_profiles(ids, existing=()):
    profiles = db.session.execute(select(Profile).where(Profile.id.in_(ids))).scalars().all()
    by_id = {profile.id: profile for profile in profiles}
    if len(by_id) != len(ids):
        raise UserAPIError("Perfil não encontrado.", 400)
    existing_ids = {profile.id for profile in existing}
    if any(not by_id[profile_id].is_active and profile_id not in existing_ids for profile_id in ids):
        raise UserAPIError("Não é permitido atribuir um perfil inativo.", 400)
    return [by_id[profile_id] for profile_id in ids]


def admin_from_profiles(profiles):
    return any(profile.name == ADMIN_PROFILE_NAME for profile in profiles)


def reconcile_admin_flag(data, profiles):
    derived = admin_from_profiles(profiles)
    if "is_admin" in data and data["is_admin"] != derived:
        raise UserAPIError("is_admin contradiz profile_ids.", 400)
    data["is_admin"] = derived


PROFILE_VALIDATORS = {
    "full_name": validate_full_name,
    "birth_date": api_birth_date,
    "email": normalize_email,
    "username": normalize_username,
    "is_admin": boolean,
    "profile_ids": profile_ids,
}


def validated_payload(validators, required=()):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        raise UserAPIError("Envie um objeto JSON não vazio válido.")
    if set(data) - validators.keys():
        # Never echo arbitrary keys or values, which may contain credentials.
        raise UserAPIError("Campos não permitidos.")
    if set(required) - data.keys():
        raise UserAPIError("Campos obrigatórios ausentes.")
    try:
        return {field: validators[field](value) for field, value in data.items()}
    except ValueError as exc:
        raise UserAPIError(str(exc)) from None


def serialize_user(user):
    created_at = user.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": user.id,
        "full_name": user.full_name,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "email": user.email,
        "username": user.username,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "profiles": [{"id": profile.id, "name": profile.name, "is_active": profile.is_active}
                     for profile in sorted(user.profiles, key=lambda profile: profile.id)],
        "created_at": created_at.astimezone(timezone.utc).isoformat(),
    }


def require_user(admin=False):
    user = resolve_active_user()
    if user is None:
        raise UserAPIError("Não autenticado.", 401)
    if admin and not user.is_admin:
        raise UserAPIError("Acesso restrito a administradores.", 403)
    return user


def lock_user_writes():
    """Serialize writes on the first user (users cannot be deleted by this API).

    InnoDB/PostgreSQL use a row lock; SQLite needs a write to acquire its
    database writer lock. Locks live until commit/rollback, across workers.
    """
    first_id = select(User.id).order_by(User.id).limit(1).scalar_subquery()
    if db.engine.dialect.name == "sqlite":
        db.session.execute(
            update(User).where(User.id == first_id).values(id=User.id),
            execution_options={"synchronize_session": False},
        )
    else:
        db.session.execute(select(User.id).order_by(User.id).limit(1).with_for_update()).all()
    # Discard the authentication snapshot taken before waiting for the lock.
    db.session.expire_all()


def user_write(admin=False):
    def decorate(function):
        @wraps(function)
        def wrapped(*args, **kwargs):
            try:
                actor = require_user(admin)
                lock_user_writes()
                # Locking reads see current values even under MySQL REPEATABLE READ.
                db.session.refresh(actor, with_for_update=True)
                actor = require_user(admin)
                result = function(actor, *args, **kwargs)
                db.session.commit()
                return result
            except UserAPIError as exc:
                db.session.rollback()
                return jsonify({"error": exc.message}), exc.status
            except IntegrityError:
                db.session.rollback()
                return jsonify({"error": "Conflito de integridade nos dados do usuário."}), 409
            except SQLAlchemyError:
                db.session.rollback()
                # Do not log database exceptions: their parameters may contain hashes.
                return jsonify({"error": "Não foi possível salvar o usuário."}), 503
            except Exception:
                db.session.rollback()
                raise
        return wrapped
    return decorate


def find_user(user_id):
    query = select(User).where(User.id == user_id)
    if request.method != "GET":
        query = query.with_for_update().execution_options(populate_existing=True)
    user = db.session.execute(query).scalar_one_or_none()
    if user is None:
        raise UserAPIError("Usuário não encontrado.", 404)
    return user


def ensure_unique(data, user_id=None):
    for field in ("username", "email"):
        if field in data:
            if matching_user_ids(field, data[field], exclude_id=user_id):
                raise UserAPIError("Nome de usuário ou e-mail já cadastrado.", 409)


def preserve_active_admin(user, changes):
    """Must run within user_write's lock, before changing any fields."""
    remains_admin = changes.get("is_admin", user.is_admin)
    remains_active = changes.get("is_active", user.is_active)
    if user.is_admin and user.is_active and not (remains_admin and remains_active):
        other = db.session.execute(select(User.id).where(
            User.id != user.id, User.is_admin.is_(True), User.is_active.is_(True),
        ).with_for_update()).first()
        if other is None:
            raise UserAPIError("Não é permitido remover o último administrador ativo.", 409)
