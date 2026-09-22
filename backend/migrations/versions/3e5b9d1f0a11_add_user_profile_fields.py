"""Add profile fields and minimal administration flag to users.

Revision ID: 3e5b9d1f0a11
Revises: b9d4a72c810f
"""
from alembic import op
import sqlalchemy as sa


revision = "3e5b9d1f0a11"
down_revision = "b9d4a72c810f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("full_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(length=254), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade():
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "is_admin")
    op.drop_column("users", "email")
    op.drop_column("users", "birth_date")
    op.drop_column("users", "full_name")
