"""Store each user's theme preference.

Revision ID: b9d4a72c810f
Revises: 7f3c2a91d6e4
"""
from alembic import op
import sqlalchemy as sa


revision = "b9d4a72c810f"
down_revision = "7f3c2a91d6e4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("theme", sa.String(length=5), nullable=True))


def downgrade():
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("theme")
