import hmac
import secrets

from flask import Blueprint, current_app, jsonify, request, session
from itsdangerous import BadData, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import User


auth_bp = Blueprint("auth", __name__)
_DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))
_CSRF_COOKIE = "auth_csrf"


def _csrf_signer():
    return URLSafeTimedSerializer(current_app.secret_key, salt="auth-csrf-v1")


def _response(payload, status=200):
    # Signed double-submit token: separate from the session, bound to its user.
    token = _csrf_signer().dumps(
        {"user_id": session.get("user_id"), "nonce": secrets.token_urlsafe(32)}
    )
    response = jsonify({**payload, "csrf_token": token})
    response.status_code = status
    response.set_cookie(
        _CSRF_COOKIE,
        token,
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite="Lax",
        path="/api/v1/auth",
    )
    return response


@auth_bp.after_request
def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@auth_bp.before_request
def protect_csrf():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    origin = request.headers.get("Origin")
    if origin is not None and origin != request.host_url.rstrip("/"):
        return jsonify({"error": "Origem não permitida."}), 403

    cookie = request.cookies.get(_CSRF_COOKIE, "")
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


@auth_bp.post("/login")
def login():
    session.clear()
    if not request.is_json:
        return _response({"error": "Envie um objeto JSON válido."}, 400)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _response({"error": "Envie um objeto JSON válido."}, 400)
    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return _response({"error": "Username e password devem ser textos não vazios."}, 400)
    username = username.strip().lower()
    if not username or not password.strip():
        return _response({"error": "Username e password devem ser textos não vazios."}, 400)

    user = User.query.filter_by(username=username).first()
    # Perform a hash verification even when the username does not exist.
    valid_password = (
        user.check_password(password)
        if user is not None
        else check_password_hash(_DUMMY_HASH, password)
    )
    if user is None or not valid_password or not user.is_active:
        return _response({"error": "Credenciais inválidas."}, 401)

    session["user_id"] = user.id
    return _response({"user": {"id": user.id, "username": user.username}})


@auth_bp.get("/me")
def me():
    user_id = session.get("user_id")
    user = db.session.get(User, user_id) if type(user_id) is int else None
    if user is None or not user.is_active:
        session.clear()
        # Also bootstraps CSRF for same-origin clients before their first login.
        return _response({"error": "Não autenticado."}, 401)
    return _response({"user": {"id": user.id, "username": user.username}})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return _response({"message": "Sessão encerrada."})
