"""fix schema drift

แก้ความต่างระหว่าง "โมเดลในโค้ด" กับ "ตารางในไฟล์ฐานข้อมูลจริง"
ที่สะสมมาจากยุคที่ยังใช้ db.create_all() (สร้างตารางใหม่ได้ แต่ไม่แก้ตารางเดิม)

1. achievement_definitions.icon  VARCHAR(10) -> VARCHAR(30)   (โครงสร้าง)
2. users.role                    STUDENT/TEACHER -> USER      (ข้อมูล)
   ระบบเป็น universal user แล้ว — auth.py บังคับ role='USER' เสมอ
   แต่บัญชีที่สมัครก่อนหน้านั้นยังค้างค่าเก่าไว้ 5 แถว
   บทบาทครู/นักเรียนมาจากความสัมพันธ์กับห้องเรียน ไม่ได้มาจากคอลัมน์นี้
   จึงเปลี่ยนได้โดยไม่กระทบสิทธิ์ของใคร

Revision ID: 0c1116a7f46f
Revises: 4972a217fa0f
Create Date: 2026-07-31 04:22:47.892684

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0c1116a7f46f'
down_revision = '4972a217fa0f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('achievement_definitions', schema=None) as batch_op:
        batch_op.alter_column('icon',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.String(length=30),
               existing_nullable=False)

    # ทำให้ค่า role เหลือชุดเดียวก่อนใส่ CheckConstraint ในขั้นถัดไป
    op.execute("UPDATE users SET role = 'USER' WHERE role <> 'USER'")


def downgrade():
    # ค่า role เดิมของแต่ละแถวกู้กลับไม่ได้ (ไม่มีที่เก็บไว้) — ย้อนได้แค่ชนิดคอลัมน์
    with op.batch_alter_table('achievement_definitions', schema=None) as batch_op:
        batch_op.alter_column('icon',
               existing_type=sa.String(length=30),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)
