"""แบบของห้อง: ให้คะแนน หรือ ทุกคนเท่ากัน

ห้องเดิมทั้งหมดเป็น graded (มีเจ้าของห้องตรวจให้คะแนน) ตามที่ใช้กันมา

Revision ID: a7c2e9d41f30
Revises: d5a91c76e082
"""
from alembic import op
import sqlalchemy as sa

revision = 'a7c2e9d41f30'
down_revision = 'd5a91c76e082'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.add_column(sa.Column('room_mode', sa.String(length=10),
                                      nullable=False, server_default='graded'))


def downgrade():
    with op.batch_alter_table('classrooms', schema=None) as batch_op:
        batch_op.drop_column('room_mode')
