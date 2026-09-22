from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.orm import validates

from app.extensions import db
from app.models.profile import user_profiles
from app.validators.user import normalize_email, normalize_username, validate_full_name


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    email = db.Column(db.String(254), nullable=True, unique=True, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    theme = db.Column(db.String(5), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    profiles = db.relationship("Profile", secondary=user_profiles, back_populates="users")

    @validates("username", "full_name", "email")
    def normalize_profile(self, key, value):
        # Assignment only: loading legacy rows must never silently rewrite them.
        if value is None and key != "username":
            return None
        return {
            "username": normalize_username,
            "full_name": validate_full_name,
            "email": normalize_email,
        }[key](value)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
