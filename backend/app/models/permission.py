from app.extensions import db
from app.models.profile import profile_permissions


class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(120), nullable=False, unique=True)
    description = db.Column(db.String(255), nullable=False)

    profiles = db.relationship(
        "Profile", secondary=profile_permissions, back_populates="permissions"
    )
