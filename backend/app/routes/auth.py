import secrets

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from app.models import User
from app.security import (
    CSRF_COOKIE,
    generate_csrf_token,
    protect_csrf,
    resolve_active_user,
)


auth_bp = Blueprint("auth", __name__)
auth_bp.before_request(protect_csrf)
_DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))


def _response(payload, status=200):
    token = generate_csrf_token()
    response = jsonify({**payload, "csrf_token": token})
    response.status_code = status
    response.set_cookie(
        CSRF_COOKIE,
        token,
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite="Lax",
        path="/api/v1",
    )
    # Remove the legacy cookie so browsers do not send two values to auth.
    response.delete_cookie(
        CSRF_COOKIE,
        path="/api/v1/auth",
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite="Lax",
    )
    return response


@auth_bp.after_request
def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


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
    session.permanent = True
    return _response({"user": {"id": user.id, "username": user.username}})


@auth_bp.get("/me")
def me():
    user = resolve_active_user()
    if user is None:
        # Also bootstraps CSRF for same-origin clients before their first login.
        return _response({"error": "Não autenticado."}, 401)
    return _response({"user": {"id": user.id, "username": user.username}})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return _response({"message": "Sessão encerrada."})
