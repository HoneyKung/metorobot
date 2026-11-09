"""ครูเขียนโจทย์เองได้ทั้งหมด — ปลดล็อกจากชุดโจทย์สำเร็จรูป 6 ข้อ

สิ่งที่เปลี่ยน
  1. ปลด CheckConstraint ที่บังคับ level เป็น Sequential/If-Else/Loop เท่านั้น
     ครูหลายคนไม่ได้แบ่งบทเรียนเป็น 3 ระดับแบบนี้ และหน้าเด็กก็ไม่ได้แสดงป้ายระดับแล้ว
  2. level เปลี่ยนเป็น nullable — ไม่ใส่ก็ได้
  3. task_key ขยายจาก 20 เป็น 40 ตัวอักษร รองรับคีย์ของโจทย์ที่ครูเขียนเอง (custom_xxxxxxxx)
  4. เพิ่ม goal_json — เกณฑ์ผ่านที่ครูตั้งเอง (ว่าง = ไม่มีเกณฑ์อัตโนมัติ ครูตรวจเอง)

หมายเหตุ SQLite: แก้ constraint/ชนิดคอลัมน์ตรง ๆ ไม่ได้ ต้องใช้ batch_alter_table
ซึ่ง Alembic จะสร้างตารางใหม่แล้วย้ายข้อมูลให้เอง

Revision ID: b7e4d1c8a903
Revises: a2c77b31e5d9
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7e4d1c8a903'
down_revision = 'a2c77b31e5d9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('goal_json', sa.Text(), nullable=True))
        batch_op.alter_column(
            'task_key',
            existing_type=sa.String(length=20),
            type_=sa.String(length=40),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'level',
            existing_type=sa.String(length=30),
            nullable=True,
            existing_server_default=None,
        )
        # ปลดข้อบังคับ 3 ระดับ — batch mode สร้างตารางใหม่โดยไม่ใส่ constraint นี้กลับไป
        try:
            batch_op.drop_constraint('ck_assignment_level', type_='check')
        except Exception:
            # ฐานที่สร้างก่อนมี constraint ชื่อนี้ (หรือ SQLite ไม่ได้ตั้งชื่อไว้) ก็ข้ามได้
            pass


def downgrade():
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.create_check_constraint(
            'ck_assignment_level', "level IN ('Sequential','If/Else','Loop')")
        batch_op.alter_column(
            'level',
            existing_type=sa.String(length=30),
            nullable=False,
            server_default='Sequential',
        )
        batch_op.alter_column(
            'task_key',
            existing_type=sa.String(length=40),
            type_=sa.String(length=20),
            existing_nullable=False,
        )
        batch_op.drop_column('goal_json')
