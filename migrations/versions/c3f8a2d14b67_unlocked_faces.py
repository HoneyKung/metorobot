"""หน้าหุ่น 11 แบบเป็นของสะสม

เพิ่ม users.unlocked_faces — JSON list ของชนิดบล็อกหน้าที่เด็กปลดล็อกแล้ว
ปลดล็อกด้วยการใช้บล็อกหน้านั้นในงานที่รันสะอาด (ไม่ใช่ซื้อ ไม่ใช่สุ่ม)

หน้าที่เลือกเป็นรูปโปรไฟล์เก็บใน avatar_url เดิมเป็น "face:happy"
จึงไม่ต้องเพิ่มคอลัมน์ใหม่ — avatar_url มีอยู่แล้วแต่ไม่เคยถูกใช้งานเลย

Revision ID: c3f8a2d14b67
Revises: b7e4d1c8a903
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3f8a2d14b67'
down_revision = 'b7e4d1c8a903'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('unlocked_faces', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('unlocked_faces')
