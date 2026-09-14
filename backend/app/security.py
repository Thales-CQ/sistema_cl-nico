"""Shared session authentication and CSRF protection."""

import hmac
import secrets

from flask import current_app, jsonify, request, session
from itsdangerous import BadData, URLSafeTimedSerializer

from app.extensions import db
from app.models import User


CSRF_COOKIE = "auth_csrf"


def resolve_active_user():
    """Return the active session user, clearing an invalid session."""
    user_id = session.get("user_id")
    user = db.session.get(User, user_id) if type(user_id) is int else None
    if user is None or not user.is_active:
        session.clear()
        return None
    return user


def _csrf_signer():
    return URLSafeTimedSerializer(current_app.secret_key, salt="auth-csrf-v1")


def generate_csrf_token():
    # Signed double-submit token: separate from the session, bound to its user.
    return _csrf_signer().dumps(
        {"user_id": session.get("user_id"), "nonce": secrets.token_urlsafe(32)}
    )


def protect_csrf():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    origin = request.headers.get("Origin")
    if origin is not None and origin != request.host_url.rstrip("/"):
        return jsonify({"error": "Origem não permitida."}), 403

    cookie = request.cookies.get(CSRF_COOKIE, "")
    token = request.headers.get("X-CSRF-Token", "")
    if not cookie or not token or not hmac.compare_digest(cookie.encode(), token.encode()):
        return jsonify({"error": "Token CSRF inválido."}), 403
    try:
        data = _csrf_signer().loads(
            token, max_age=int(current_app.permanent_session_lifetime.total_seconds())
        )
    except BadData:
        return jsonify({"error": "Token CSRF inválido."}), 403
    if not isinstance(data, dict) or data.get("user_id") != session.get("user_id"):
        return jsonify({"error": "Token CSRF inválido."}), 403
    return None
