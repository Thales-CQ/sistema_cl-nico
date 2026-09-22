from flask import Blueprint, jsonify

from app.extensions import db
from app.admin_profile import sync_admin_profile
from app.models import User
from app.security import protect_csrf
from app.user_api import (
    PROFILE_VALIDATORS, UserAPIError, boolean, ensure_unique, find_user,
    reconcile_admin_flag, resolve_profiles,
    preserve_active_admin, require_user, serialize_user, user_write, validated_payload,
)
from app.validators.user import validate_password


UPDATE_VALIDATORS = {**PROFILE_VALIDATORS, "is_active": boolean}


users_bp = Blueprint("users", __name__)
users_bp.before_request(protect_csrf)


@users_bp.before_request
def require_admin():
    try:
        require_user(admin=True)
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
def list_users():
    return jsonify({"users": [serialize_user(user) for user in User.query.order_by(User.id).all()]})


@users_bp.get("/<int:user_id>")
def get_user(user_id):
    return jsonify({"user": serialize_user(find_user(user_id))})


@users_bp.post("")
@user_write(admin=True)
def create_user(actor):
    data = validated_payload(
        {**PROFILE_VALIDATORS, "password": validate_password, "is_active": boolean},
        required={"full_name", "birth_date", "email", "username", "password", "profile_ids"},
    )
    ensure_unique(data)
    password = data.pop("password")
    profiles = None
    if "profile_ids" in data:
        profiles = resolve_profiles(data.pop("profile_ids"))
        reconcile_admin_flag(data, profiles)
    user = User(**data)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    if profiles is None:
        sync_admin_profile(user)
    else:
        user.profiles = profiles
    return jsonify({"user": serialize_user(user)}), 201


@users_bp.patch("/<int:user_id>")
@user_write(admin=True)
def update_user(actor, user_id):
    user = find_user(user_id)
    data = validated_payload(UPDATE_VALIDATORS)
    ensure_unique(data, user.id)
    profiles = None
    if "profile_ids" in data:
        profiles = resolve_profiles(data.pop("profile_ids"), user.profiles)
        reconcile_admin_flag(data, profiles)
    preserve_active_admin(user, data)
    for field, value in data.items():
        setattr(user, field, value)
    if profiles is not None:
        user.profiles = profiles
    elif "is_admin" in data:
        sync_admin_profile(user)
    return jsonify({"user": serialize_user(user)})


@users_bp.patch("/<int:user_id>/status")
@user_write(admin=True)
def update_status(actor, user_id):
    user = find_user(user_id)
    data = validated_payload({"is_active": boolean}, required={"is_active"})
    preserve_active_admin(user, data)
    user.is_active = data["is_active"]
    return jsonify({"user": serialize_user(user)})


@users_bp.patch("/<int:user_id>/password")
@user_write(admin=True)
def reset_password(actor, user_id):
    user = find_user(user_id)
    data = validated_payload({"new_password": validate_password}, required={"new_password"})
    user.set_password(data["new_password"])
    return jsonify({"message": "Senha atualizada com sucesso."})
