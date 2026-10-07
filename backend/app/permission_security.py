"""Permission checks against the current database state."""

from functools import wraps

from flask import jsonify
from sqlalchemy import select

from app.extensions import db
from app.models import Permission, Profile, User
from app.models.profile import profile_permissions, user_profiles
from app.security import protect_csrf, resolve_active_user


def effective_permissions(user, *, for_update=False):
    """Return permission codes granted by the user's active profiles."""
    if user is None or not user.is_active or user.id is None:
        return set()
    query = (
        select(Permission.code)
        .join(profile_permissions, Permission.id == profile_permissions.c.permission_id)
        .join(Profile, Profile.id == profile_permissions.c.profile_id)
        .join(user_profiles, Profile.id == user_profiles.c.profile_id)
        .where(user_profiles.c.user_id == user.id, Profile.is_active.is_(True))
    )
    if for_update:
        query = query.with_for_update()
    else:
        query = query.distinct()
    codes = db.session.execute(query).scalars()
    return set(codes)


def has_permission(user, code, *, for_update=False):
    """Check a permission without caching grants in the user or session."""
    return code in effective_permissions(user, for_update=for_update)


def require_permission(code):
    """Protect a view with CSRF, active-session and permission checks."""
    def decorate(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            csrf_error = protect_csrf()
            if csrf_error is not None:
                return csrf_error
            user = resolve_active_user()
            if user is None:
                return jsonify({"error": "Não autenticado."}), 401
            if not has_permission(user, code):
                return jsonify({"error": "Permissão insuficiente."}), 403
            return view(*args, **kwargs)
        return wrapped
    return decorate
