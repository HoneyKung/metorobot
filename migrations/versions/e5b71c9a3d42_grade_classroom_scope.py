"""grade classroom scope

คะแนนบอกไม่ได้ว่าเป็นของห้องไหน

`grades` มีแต่ teacher_id / student_id / project_id / submission_id
จะรู้ว่าคะแนนก้อนนี้เกิดในห้องเรียนไหนต้องไล่ submission -> assignment -> classroom_id
และคะแนนที่ให้ตรงๆ บนโปรเจกต์ (submission_id IS NULL) **ไม่สังกัดห้องไหนเลย**

ผลคือหน้าแดชบอร์ดแบบแยกตามห้อง (โปรไฟล์ของฉัน / ห้องที่ฉันสอน / ห้องที่ฉันเรียน)
ถามว่า "คะแนนของฉันในห้องนี้" ไม่ได้ ต้องดึงมาทั้งหมดแล้วกรองที่หน้าเว็บซึ่งกรองไม่ครบ

migration นี้เพิ่ม `grades.classroom_id` ให้ตอบคำถามนั้นได้ตรงๆ

  ON DELETE SET NULL — คะแนนเป็นหลักฐานทางการศึกษา ห้ามหายเพราะห้องถูกลบ
                       (คะแนนที่ผูกกับงานที่ส่งยังถูก CASCADE ผ่าน submission_id เหมือนเดิม
                        กติกานี้ไม่ได้เปลี่ยนพฤติกรรมเดิม แค่ไม่เพิ่มเส้นทางลบใหม่)
  nullable          — คะแนนที่ไม่ได้มาจากการส่งงานยังไม่มีห้องได้ ไม่บังคับเดา

backfill อ่านจากข้อมูลจริงเท่านั้น — submission -> assignment -> classroom_id
แถวที่ไม่มี submission ปล่อยเป็น NULL ไม่เดาจากห้องที่ครูสอน
เพราะครูคนเดียวสอนหลายห้อง เดาผิดแล้วคะแนนจะไปโผล่ผิดห้อง

Revision ID: e5b71c9a3d42
Revises: cc93a6478d7e
Create Date: 2026-08-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5b71c9a3d42'
down_revision = 'cc93a6478d7e'
branch_labels = None
depends_on = None


INDEX_NAME = 'ix_grade_classroom_student'

# ไล่ห้องจากงานที่ส่ง — เส้นทางเดียวที่เป็นข้อมูลจริง ไม่ใช่การเดา
_BACKFILL_SQL = """
UPDATE grades
   SET classroom_id = (
       SELECT a.classroom_id
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = grades.submission_id
   )
 WHERE submission_id IS NOT NULL
   AND classroom_id IS NULL
"""


def upgrade():
    is_sqlite = op.get_bind().dialect.name == 'sqlite'

    if is_sqlite:
        # SQLite เพิ่มคอลัมน์ที่มี REFERENCES ได้ ถ้าค่าเริ่มต้นเป็น NULL
        # ใช้ทางนี้แทนการสร้างตารางใหม่ เพื่อไม่ให้ CHECK constraint ของ grades
        # (ck_grade_score_range / ck_grade_max_score_positive) หายไปตอน reflect
        op.execute(
            'ALTER TABLE grades ADD COLUMN classroom_id INTEGER '
            'REFERENCES classrooms (id) ON DELETE SET NULL'
        )
    else:
        op.add_column('grades', sa.Column('classroom_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_grade_classroom', 'grades', 'classrooms',
            ['classroom_id'], ['id'], ondelete='SET NULL',
        )

    result = op.get_bind().execute(sa.text(_BACKFILL_SQL))
    print(f'  [grade] เติม classroom_id จากงานที่ส่ง {result.rowcount} แถว', flush=True)

    op.create_index(INDEX_NAME, 'grades', ['classroom_id', 'student_id'])


def downgrade():
    op.drop_index(INDEX_NAME, table_name='grades')

    if op.get_bind().dialect.name == 'sqlite':
        # SQLite 3.35+ รองรับ DROP COLUMN ตรงๆ
        op.execute('ALTER TABLE grades DROP COLUMN classroom_id')
    else:
        op.drop_constraint('fk_grade_classroom', 'grades', type_='foreignkey')
        op.drop_column('grades', 'classroom_id')
