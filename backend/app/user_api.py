"""Shared validation and transaction boundaries for user API writes."""

import re
from functools import wraps
from datetime import timezone

from flask import jsonify, request
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm.attributes import set_committed_value

from app.extensions import db
from app.models import Permission, Profile, User
from app.admin_profile import ADMIN_PROFILE_NAME
from app.models.profile import profile_permissions, user_profiles
from app.permission_security import effective_permissions, has_permission
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
    profiles = db.session.execute(
        select(Profile).where(Profile.id.in_(ids)).with_for_update()
        .execution_options(populate_existing=True)
    ).scalars().all()
    by_id = {profile.id: profile for profile in profiles}
    if len(by_id) != len(ids):
        raise UserAPIError("Perfil não encontrado.", 400)
    existing_ids = {profile.id for profile in existing}
    if any(not by_id[profile_id].is_active and profile_id not in existing_ids for profile_id in ids):
        raise UserAPIError("Não é permitido atribuir um perfil inativo.", 400)
    return [by_id[profile_id] for profile_id in ids]


def current_user_profiles(user):
    """Load current links after the user-write lock and align the ORM collection."""
    profiles = db.session.execute(
        select(Profile).join(user_profiles, Profile.id == user_profiles.c.profile_id)
        .where(user_profiles.c.user_id == user.id).with_for_update()
        .execution_options(populate_existing=True)
    ).scalars().all()
    set_committed_value(user, "profiles", profiles)
    return profiles


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


def require_actor_permissions(actor, *codes):
    if not set(codes) <= effective_permissions(actor, for_update=True):
        raise UserAPIError("Permissão insuficiente.", 403)


def is_structural_admin(actor, *, for_update=True):
    if not actor.is_active or not actor.is_admin:
        return False
    query = (
        select(Profile.id)
        .join(user_profiles, Profile.id == user_profiles.c.profile_id)
        .where(
            user_profiles.c.user_id == actor.id,
            Profile.name == ADMIN_PROFILE_NAME,
            Profile.is_active.is_(True),
        )
    )
    if for_update:
        query = query.with_for_update()
    return db.session.execute(query).first() is not None


def profile_is_assignable(profile, actor_codes, structural_admin, *, for_update=False):
    """Whether this profile can be chosen for a new association."""
    if not profile.is_active or (profile.name == ADMIN_PROFILE_NAME and not structural_admin):
        return False
    query = (
        select(Permission.code)
        .join(profile_permissions, Permission.id == profile_permissions.c.permission_id)
        .where(profile_permissions.c.profile_id == profile.id)
    )
    if for_update:
        query = query.with_for_update()
    profile_codes = set(db.session.execute(query).scalars())
    return profile_codes <= actor_codes


def assignable_profiles(actor):
    """List current options for a new profile association."""
    actor_codes = effective_permissions(actor)
    structural_admin = is_structural_admin(actor, for_update=False)
    profiles = db.session.execute(
        select(Profile).where(Profile.is_active.is_(True)).order_by(Profile.id)
    ).scalars()
    return [profile for profile in profiles if profile_is_assignable(
        profile, actor_codes, structural_admin
    )]


def authorize_profile_assignment(actor, profiles, existing=()):
    """Authorize new links and changes to structural Administrator membership."""
    existing_ids = {profile.id for profile in existing}
    requested_ids = {profile.id for profile in profiles}
    admin = Profile.query.filter_by(name=ADMIN_PROFILE_NAME).one_or_none()
    admin_id = admin.id if admin is not None else None
    admin_link_changed = admin_id is not None and (
        (admin_id in existing_ids) != (admin_id in requested_ids)
    )
    structural_admin = is_structural_admin(actor) if admin_link_changed else False
    if admin_link_changed and not structural_admin:
        raise UserAPIError("Permissão insuficiente.", 403)

    new_profiles = [profile for profile in profiles if profile.id not in existing_ids]
    if not new_profiles:
        return
    actor_codes = effective_permissions(actor, for_update=True)
    for profile in new_profiles:
        if not profile.is_active:
            raise UserAPIError("Não é permitido atribuir um perfil inativo.", 400)
        if not profile_is_assignable(profile, actor_codes, structural_admin, for_update=True):
            raise UserAPIError("Permissão insuficiente.", 403)


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


def user_write(admin=False, permission=None):
    def decorate(function):
        @wraps(function)
        def wrapped(*args, **kwargs):
            try:
                actor = require_user(admin)
                lock_user_writes()
                # Locking reads see current values even under MySQL REPEATABLE READ.
                db.session.refresh(actor, with_for_update=True)
                actor = require_user(admin)
                if permission and not has_permission(actor, permission, for_update=True):
                    raise UserAPIError("Permissão insuficiente.", 403)
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
