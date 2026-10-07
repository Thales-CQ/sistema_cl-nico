from datetime import datetime, timezone

from app.extensions import db


user_profiles = db.Table(
    "user_profiles",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id"), primary_key=True),
    db.Column("profile_id", db.Integer, db.ForeignKey("profiles.id"), primary_key=True),
)

profile_permissions = db.Table(
    "profile_permissions",
    db.Column("profile_id", db.Integer, db.ForeignKey("profiles.id"), primary_key=True),
    db.Column("permission_id", db.Integer, db.ForeignKey("permissions.id"), primary_key=True),
)


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    users = db.relationship("User", secondary=user_profiles, back_populates="profiles")
    permissions = db.relationship(
        "Permission", secondary=profile_permissions, back_populates="profiles"
    )
