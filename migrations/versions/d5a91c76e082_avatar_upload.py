"""รูปโปรไฟล์อัปโหลดเองได้

ขยาย users.avatar_url จาก String(500) เป็น Text
เพราะรูปที่อัปโหลดเก็บเป็น data URI ซึ่งยาวเกิน 500 ตัวอักษรแน่นอน
(ย่อเป็นจัตุรัส 160px JPEG q0.72 แล้วประมาณ 6–12 KB)

คอลัมน์เดียวเก็บได้ 3 แบบ เพราะมันคือคำตอบเดียวว่า "แสดงอะไรเป็นรูปโปรไฟล์"
  face:happy          หน้าหุ่นที่ปลดล็อกแล้ว
  data:image/jpeg;... รูปที่ผู้ใช้อัปโหลด
  NULL                ตัวอักษรแรกของชื่อ

Revision ID: d5a91c76e082
Revises: c3f8a2d14b67
"""
from alembic import op
import sqlalchemy as sa

revision = 'd5a91c76e082'
down_revision = 'c3f8a2d14b67'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column(
            'avatar_url',
            existing_type=sa.String(length=500),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade():
    # ตัดรูปที่ยาวเกิน 500 ทิ้งก่อน ไม่งั้นย่อคอลัมน์ไม่ได้
    op.execute("UPDATE users SET avatar_url = NULL WHERE length(avatar_url) > 500")
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column(
            'avatar_url',
            existing_type=sa.Text(),
            type_=sa.String(length=500),
            existing_nullable=True,
        )
