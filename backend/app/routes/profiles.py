"""Administrative catalog of profiles; authorization still uses User.is_admin."""

from datetime import timezone

from flask import Blueprint, jsonify

from app.admin_profile import ADMIN_PROFILE_NAME
from app.extensions import db
from app.models import Profile
from app.security import protect_csrf
from app.user_api import UserAPIError, boolean, require_user, user_write, validated_payload


profiles_bp = Blueprint("profiles", __name__)
profiles_bp.before_request(protect_csrf)


@profiles_bp.before_request
def require_admin():
    try:
        require_user(admin=True)
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


def serialize_profile(profile):
    created_at = profile.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": profile.id, "name": profile.name,
        "is_active": profile.is_active,
        "created_at": created_at.astimezone(timezone.utc).isoformat(),
    }


def find_profile(profile_id):
    profile = db.session.get(Profile, profile_id)
    if profile is None:
        raise UserAPIError("Perfil não encontrado.", 404)
    return profile


@profiles_bp.get("")
def list_profiles():
    return jsonify({"profiles": [serialize_profile(profile)
                                 for profile in Profile.query.order_by(Profile.id).all()]})


@profiles_bp.get("/<int:profile_id>")
def get_profile(profile_id):
    return jsonify({"profile": serialize_profile(find_profile(profile_id))})


@profiles_bp.post("")
@user_write(admin=True)
def create_profile(actor):
    data = validated_payload(
        {"name": normalize_profile_name, "is_active": boolean}, required={"name"},
    )
    ensure_unique_name(data["name"])
    profile = Profile(**data)
    db.session.add(profile)
    db.session.flush()
    return jsonify({"profile": serialize_profile(profile)}), 201


@profiles_bp.patch("/<int:profile_id>")
@user_write(admin=True)
def update_profile(actor, profile_id):
    profile = find_profile(profile_id)
    data = validated_payload({"name": normalize_profile_name, "is_active": boolean})
    if profile.name.casefold() == ADMIN_PROFILE_NAME.casefold():
        if ("name" in data and data["name"] != profile.name) or data.get("is_active") is False:
            raise UserAPIError("O perfil Administrador não pode ser renomeado ou inativado.", 409)
    if "name" in data:
        ensure_unique_name(data["name"], profile.id)
    for field, value in data.items():
        setattr(profile, field, value)
    return jsonify({"profile": serialize_profile(profile)})
