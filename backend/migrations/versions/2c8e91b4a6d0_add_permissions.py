"""Add permission catalog and grant it to the structural Administrator.

Revision ID: 2c8e91b4a6d0
Revises: f6c6d75d8e20
"""
from alembic import op
import sqlalchemy as sa


revision = "2c8e91b4a6d0"
down_revision = "f6c6d75d8e20"
branch_labels = None
depends_on = None


CATALOG = (
    ("patients.view", "Consultar pacientes"),
    ("patients.create", "Cadastrar pacientes"),
    ("patients.update", "Alterar pacientes"),
    ("patients.change_status", "Alterar status de pacientes"),
    ("users.view", "Consultar usuários"),
    ("users.create", "Cadastrar usuários"),
    ("users.update", "Alterar usuários"),
    ("users.change_status", "Alterar status de usuários"),
    ("users.reset_password", "Redefinir senha de usuários"),
    ("users.assign_profiles", "Atribuir perfis a usuários"),
    ("profiles.view", "Consultar perfis"),
    ("profiles.create", "Cadastrar perfis"),
    ("profiles.update", "Alterar perfis"),
)


def upgrade():
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=120), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=False),
    )
    op.create_table(
        "profile_permissions",
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("profiles.id"), primary_key=True),
        sa.Column("permission_id", sa.Integer(), sa.ForeignKey("permissions.id"), primary_key=True),
    )

    connection = op.get_bind()
    admin_id = connection.execute(sa.text(
        "SELECT id FROM profiles WHERE name = :name"
    ), {"name": "Administrador"}).scalar_one()
    connection.execute(sa.text(
        "INSERT INTO permissions (code, description) VALUES (:code, :description)"
    ), [{"code": code, "description": description} for code, description in CATALOG])
    ids = dict(connection.execute(sa.text("SELECT code, id FROM permissions")).all())
    if set(ids) != {code for code, _ in CATALOG}:
        raise RuntimeError("Catálogo inicial de permissões incompleto.")
    connection.execute(sa.text(
        "INSERT INTO profile_permissions (profile_id, permission_id) "
        "VALUES (:profile_id, :permission_id)"
    ), [{"profile_id": admin_id, "permission_id": ids[code]} for code, _ in CATALOG])


def downgrade():
    op.drop_table("profile_permissions")
    op.drop_table("permissions")
