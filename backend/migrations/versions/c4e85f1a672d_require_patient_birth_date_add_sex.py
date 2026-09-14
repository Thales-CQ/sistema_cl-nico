"""Require patient birth date and add nullable sex.

Revision ID: c4e85f1a672d
Revises: 88bb050751d7
Create Date: 2026-09-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c4e85f1a672d"
down_revision = "88bb050751d7"
branch_labels = None
depends_on = None


def upgrade():
    null_birth_dates = op.get_bind().execute(
        sa.text("SELECT COUNT(*) FROM patients WHERE birth_date IS NULL")
    ).scalar_one()
    if null_birth_dates:
        raise RuntimeError(
            f"Não é possível tornar birth_date obrigatória: "
            f"{null_birth_dates} pacientes têm birth_date NULL."
        )

    with op.batch_alter_table("patients", schema=None) as batch_op:
        batch_op.alter_column(
            "birth_date",
            existing_type=sa.Date(),
            nullable=False,
        )
        batch_op.add_column(sa.Column("sex", sa.String(length=1), nullable=True))


def downgrade():
    with op.batch_alter_table("patients", schema=None) as batch_op:
        batch_op.drop_column("sex")
        batch_op.alter_column(
            "birth_date",
            existing_type=sa.Date(),
            nullable=True,
        )
