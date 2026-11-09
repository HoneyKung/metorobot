"""ผลหุ่นจำลองตอนกดส่งงาน (โจทย์ท้าตรวจว่าหุ่นทำจนจบ ไม่ใช่แค่บล็อกครบ)

Revision ID: c9e4a7b2d153
Revises: b3d81f2c6a90
"""
from alembic import op
import sqlalchemy as sa

revision = 'c9e4a7b2d153'
down_revision = 'b3d81f2c6a90'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assignment_submissions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sim_ok', sa.Boolean(), nullable=True))


def downgrade():
    with op.batch_alter_table('assignment_submissions', schema=None) as batch_op:
        batch_op.drop_column('sim_ok')
