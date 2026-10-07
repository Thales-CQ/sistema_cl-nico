"""Permission-protected catalog of profiles."""

from datetime import timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm.attributes import set_committed_value

from app.admin_profile import ADMIN_PROFILE_NAME
from app.extensions import db
from app.models import Permission, Profile
from app.models.profile import profile_permissions
from app.permission_security import effective_permissions, require_permission
from app.security import protect_csrf
from app.user_api import UserAPIError, boolean, require_user, user_write, validated_payload


profiles_bp = Blueprint("profiles", __name__)
profiles_bp.before_request(protect_csrf)


@profiles_bp.before_request
def require_authentication():
    try:
        require_user()
    except UserAPIError as exc:
        return jsonify({"error": exc.message}), exc.status


@profiles_bp.after_request
def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@profiles_bp.errorhandler(UserAPIError)
def handle_profile_error(exc):
    return jsonify({"error": exc.message}), exc.status


def normalize_profile_name(value):
    if not isinstance(value, str):
        raise ValueError("O nome do perfil deve ser um texto.")
    name = " ".join(value.split())
    if not name:
        raise ValueError("O nome do perfil não pode ficar vazio.")
    if len(name) > 120:
        raise ValueError("O nome do perfil deve ter no máximo 120 caracteres.")
    return name


def ensure_unique_name(name, exclude_id=None):
    if any(profile.name.casefold() == name.casefold() and profile.id != exclude_id
           for profile in Profile.query.all()):
        raise UserAPIError("Nome de perfil já cadastrado.", 409)


def permission_ids(value):
    if not isinstance(value, list) or any(type(item) is not int or item < 1 for item in value):
        raise ValueError("permission_ids deve ser uma lista de IDs inteiros positivos.")
    if len(value) != len(set(value)):
        raise ValueError("permission_ids não pode conter IDs duplicados.")
    return value


PROFILE_VALIDATORS = {
    "name": normalize_profile_name, "is_active": boolean, "permission_ids": permission_ids,
}


def resolve_permissions(ids, actor):
    catalog = {permission.id: permission for permission in db.session.execute(
        select(Permission).with_for_update()
    ).scalars()}
    if not set(ids) <= catalog.keys():
        raise UserAPIError("Permissão não encontrada.", 400)
    permissions = [catalog[permission_id] for permission_id in ids]
    if not {permission.code for permission in permissions} <= effective_permissions(actor, for_update=True):
        raise UserAPIError("Permissão insuficiente.", 403)
    return permissions


def preserve_admin_permissions(name, permissions):
    if name.casefold() == ADMIN_PROFILE_NAME.casefold():
        catalog_ids = set(db.session.execute(select(Permission.id).with_for_update()).scalars())
        if not catalog_ids <= {permission.id for permission in permissions}:
            raise UserAPIError("As permissões do perfil Administrador não podem ser removidas.", 409)


def serialize_profile(profile):
    created_at = profile.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": profile.id, "name": profile.name,
        "is_active": profile.is_active,
        "created_at": created_at.astimezone(timezone.utc).isoformat(),
        "permission_ids": sorted(permission.id for permission in profile.permissions),
    }


def find_profile(profile_id):
    query = select(Profile).where(Profile.id == profile_id)
    if request.method != "GET":
        query = query.with_for_update().execution_options(populate_existing=True)
    profile = db.session.execute(query).scalar_one_or_none()
    if profile is None:
        raise UserAPIError("Perfil não encontrado.", 404)
    return profile


@profiles_bp.get("/permissions")
@require_permission("profiles.view")
def list_permissions():
    return jsonify({"permissions": [
        {"id": permission.id, "code": permission.code, "description": permission.description}
        for permission in Permission.query.order_by(Permission.code, Permission.id).all()
    ]})


@profiles_bp.get("")
@require_permission("profiles.view")
def list_profiles():
    return jsonify({"profiles": [serialize_profile(profile)
                                 for profile in Profile.query.order_by(Profile.id).all()]})


@profiles_bp.get("/<int:profile_id>")
@require_permission("profiles.view")
def get_profile(profile_id):
    return jsonify({"profile": serialize_profile(find_profile(profile_id))})


@profiles_bp.post("")
@require_permission("profiles.create")
@user_write(permission="profiles.create")
def create_profile(actor):
    data = validated_payload(
        PROFILE_VALIDATORS, required={"name"},
    )
    ensure_unique_name(data["name"])
    permissions = resolve_permissions(data.pop("permission_ids", []), actor)
    preserve_admin_permissions(data["name"], permissions)
    profile = Profile(**data, permissions=permissions)
    db.session.add(profile)
    db.session.flush()
    return jsonify({"profile": serialize_profile(profile)}), 201


@profiles_bp.patch("/<int:profile_id>")
@require_permission("profiles.update")
@user_write(permission="profiles.update")
def update_profile(actor, profile_id):
    profile = find_profile(profile_id)
    data = validated_payload(PROFILE_VALIDATORS)
    if profile.name.casefold() == ADMIN_PROFILE_NAME.casefold():
        if ("name" in data and data["name"] != profile.name) or data.get("is_active") is False:
            raise UserAPIError("O perfil Administrador não pode ser renomeado ou inativado.", 409)
    if "name" in data:
        ensure_unique_name(data["name"], profile.id)
    permissions = None
    if "permission_ids" in data:
        permissions = resolve_permissions(data.pop("permission_ids"), actor)
        preserve_admin_permissions(data.get("name", profile.name), permissions)
        # Read current links after the shared write lock, including under REPEATABLE READ.
        current = db.session.execute(
            select(Permission).join(profile_permissions)
            .where(profile_permissions.c.profile_id == profile.id).with_for_update()
        ).scalars().all()
        set_committed_value(profile, "permissions", current)
    for field, value in data.items():
        setattr(profile, field, value)
    if permissions is not None:
        profile.permissions = permissions
    return jsonify({"profile": serialize_profile(profile)})
