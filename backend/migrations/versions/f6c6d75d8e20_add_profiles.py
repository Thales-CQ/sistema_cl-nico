"""Add profiles and backfill the current administrators.

Revision ID: f6c6d75d8e20
Revises: 3e5b9d1f0a11
"""
from alembic import op
import sqlalchemy as sa


revision = "f6c6d75d8e20"
down_revision = "3e5b9d1f0a11"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.current_timestamp()),
    )
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("profiles.id"), primary_key=True),
    )

    connection = op.get_bind()
    connection.execute(sa.text("INSERT INTO profiles (name) VALUES ('Administrador')"))
    admin_id = connection.execute(sa.text(
        "SELECT id FROM profiles WHERE name = 'Administrador'"
    )).scalar_one()
    connection.execute(sa.text(
        "INSERT INTO user_profiles (user_id, profile_id) "
        "SELECT id, :profile_id FROM users WHERE is_admin = :is_admin"
    ), {"profile_id": admin_id, "is_admin": True})

    expected = connection.execute(sa.text(
        "SELECT COUNT(*) FROM users WHERE is_admin = :is_admin"
    ), {"is_admin": True}).scalar_one()
    migrated = connection.execute(sa.text(
        "SELECT COUNT(*) FROM user_profiles WHERE profile_id = :profile_id"
    ), {"profile_id": admin_id}).scalar_one()
    if migrated != expected:
        raise RuntimeError("A migração não associou todos os administradores existentes.")


def downgrade():
    op.drop_table("user_profiles")
    op.drop_table("profiles")
