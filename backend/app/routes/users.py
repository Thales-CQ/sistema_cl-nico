from flask import Blueprint, jsonify, request

from app.extensions import db
from app.admin_profile import sync_admin_profile
from app.models import User
from app.permission_security import require_permission
from app.security import protect_csrf
from app.user_api import (
    PROFILE_VALIDATORS, UserAPIError, admin_from_profiles, assignable_profiles,
    authorize_profile_assignment, boolean,
    current_user_profiles, ensure_unique, find_user, is_structural_admin, reconcile_admin_flag,
    require_actor_permissions, resolve_profiles,
    preserve_active_admin, require_user, serialize_user, user_write, validated_payload,
)
from app.validators.user import validate_password


UPDATE_VALIDATORS = {**PROFILE_VALIDATORS, "is_active": boolean}


users_bp = Blueprint("users", __name__)
users_bp.before_request(protect_csrf)


@users_bp.before_request
def require_admin():
    try:
        permission_routes = {
            "users.list_users", "users.get_user", "users.list_assignable_profiles",
            "users.create_user",
            "users.update_user", "users.update_status", "users.reset_password",
        }
        require_user(admin=request.endpoint not in permission_routes)
    except UserAPIError as exc:
        return jsonify({"error": exc.message}), exc.status


@users_bp.after_request
def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@users_bp.errorhandler(UserAPIError)
def handle_user_error(exc):
    return jsonify({"error": exc.message}), exc.status


@users_bp.get("")
@require_permission("users.view")
def list_users():
    return jsonify({"users": [serialize_user(user) for user in User.query.order_by(User.id).all()]})


@users_bp.get("/assignable-profiles")
@require_permission("users.assign_profiles")
def list_assignable_profiles():
    actor = require_user()
    return jsonify({"profiles": [
        {"id": profile.id, "name": profile.name, "is_active": profile.is_active}
        for profile in assignable_profiles(actor)
    ]})


@users_bp.get("/<int:user_id>")
@require_permission("users.view")
def get_user(user_id):
    return jsonify({"user": serialize_user(find_user(user_id))})


@users_bp.post("")
@require_permission("users.create")
@user_write(permission="users.create")
def create_user(actor):
    data = validated_payload(
        {**PROFILE_VALIDATORS, "password": validate_password, "is_active": boolean},
        required={"full_name", "birth_date", "email", "username", "password", "profile_ids"},
    )
    require_actor_permissions(actor, "users.assign_profiles")
    if data.get("is_active") is False:
        require_actor_permissions(actor, "users.change_status")
    password = data.pop("password")
    profiles = resolve_profiles(data.pop("profile_ids"))
    reconcile_admin_flag(data, profiles)
    authorize_profile_assignment(actor, profiles)
    ensure_unique(data)
    user = User(**data)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    user.profiles = profiles
    return jsonify({"user": serialize_user(user)}), 201


@users_bp.patch("/<int:user_id>")
@user_write()
def update_user(actor, user_id):
    user = find_user(user_id)
    # Check the permission implied by the submitted areas before validating
    # their values. This keeps unauthorized writes at 403 even when the
    # payload itself is malformed, while still allowing profile-only edits.
    raw = request.get_json(silent=True)
    raw_keys = set(raw) if isinstance(raw, dict) else set()
    if not raw_keys or raw_keys - {"profile_ids", "is_admin"}:
        require_actor_permissions(actor, "users.update")
    if raw_keys & {"profile_ids", "is_admin"}:
        require_actor_permissions(actor, "users.assign_profiles")
    data = validated_payload(UPDATE_VALIDATORS)
    profile_change = "profile_ids" in data or "is_admin" in data
    data_change = bool(set(data) - {"profile_ids", "is_admin"})
    if data_change:
        require_actor_permissions(actor, "users.update")
    if profile_change:
        require_actor_permissions(actor, "users.assign_profiles")
    if not data_change and not profile_change:
        raise UserAPIError("Nenhuma alteração autorizada.", 400)
    if "is_active" in data:
        require_actor_permissions(actor, "users.change_status")
    direct_admin = "is_admin" in data
    if "profile_ids" in data or direct_admin:
        current_user_profiles(user)
    profiles = None
    if "profile_ids" in data:
        profiles = resolve_profiles(data.pop("profile_ids"), user.profiles)
        reconcile_admin_flag(data, profiles)
        authorize_profile_assignment(actor, profiles, user.profiles)
    if direct_admin:
        flag_changed = data["is_admin"] != user.is_admin
        link_changed = profiles is None and data["is_admin"] != admin_from_profiles(user.profiles)
        if (flag_changed or link_changed) and not is_structural_admin(actor):
            raise UserAPIError("Permissão insuficiente.", 403)
    ensure_unique(data, user.id)
    preserve_active_admin(user, data)
    for field, value in data.items():
        setattr(user, field, value)
    if profiles is not None:
        user.profiles = profiles
    elif "is_admin" in data:
        sync_admin_profile(user)
    return jsonify({"user": serialize_user(user)})


@users_bp.patch("/<int:user_id>/status")
@require_permission("users.change_status")
@user_write(permission="users.change_status")
def update_status(actor, user_id):
    user = find_user(user_id)
    data = validated_payload({"is_active": boolean}, required={"is_active"})
    preserve_active_admin(user, data)
    user.is_active = data["is_active"]
    return jsonify({"user": serialize_user(user)})


@users_bp.patch("/<int:user_id>/password")
@require_permission("users.reset_password")
@user_write(permission="users.reset_password")
def reset_password(actor, user_id):
    user = find_user(user_id)
    data = validated_payload({"new_password": validate_password}, required={"new_password"})
    user.set_password(data["new_password"])
    return jsonify({"message": "Senha atualizada com sucesso."})
