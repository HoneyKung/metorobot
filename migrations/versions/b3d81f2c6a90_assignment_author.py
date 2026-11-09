"""ผู้ตั้งโจทย์ของภารกิจ (ห้องแบบทุกคนเท่ากันให้สมาชิกตั้งโจทย์ท้ากันได้)

Revision ID: b3d81f2c6a90
Revises: a7c2e9d41f30
"""
from alembic import op
import sqlalchemy as sa

revision = 'b3d81f2c6a90'
down_revision = 'a7c2e9d41f30'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('author_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_assignments_author_id_users', 'users',
                                    ['author_id'], ['id'], ondelete='SET NULL')


def downgrade():
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_assignments_author_id_users', type_='foreignkey')
        batch_op.drop_column('author_id')
