"""Require patient sex.

Revision ID: 7f3c2a91d6e4
Revises: c4e85f1a672d
Create Date: 2026-09-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7f3c2a91d6e4"
down_revision = "c4e85f1a672d"
branch_labels = None
depends_on = None


def upgrade():
    null_sexes = op.get_bind().execute(
        sa.text("SELECT COUNT(*) FROM patients WHERE sex IS NULL")
    ).scalar_one()
    if null_sexes:
        raise RuntimeError(
            f"Não é possível tornar sex obrigatório: "
            f"{null_sexes} pacientes têm sex NULL."
        )

    with op.batch_alter_table("patients", schema=None) as batch_op:
        batch_op.alter_column(
            "sex",
            existing_type=sa.String(length=1),
            nullable=False,
        )


def downgrade():
    with op.batch_alter_table("patients", schema=None) as batch_op:
        batch_op.alter_column(
            "sex",
            existing_type=sa.String(length=1),
            nullable=True,
        )
