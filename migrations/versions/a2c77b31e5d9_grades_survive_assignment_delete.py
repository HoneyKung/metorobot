"""คะแนนต้องไม่หายเมื่อลบโจทย์ — grades.submission_id CASCADE -> SET NULL

เคสที่เกิดจริง:
  ครูกด "ยกเลิกโจทย์" -> ลบ AssignmentSubmission ทั้งหมดของโจทย์นั้น
  -> grades.submission_id เป็น ON DELETE CASCADE -> คะแนนของนักเรียนทั้งห้องหายถาวร

ขัดกับเหตุผลของ RESTRICT อีกสามเส้นใน grades ที่เขียนไว้เองว่า
"คะแนนเป็นหลักฐานทางการศึกษา ห้ามหายเงียบตามการลบอย่างอื่น"
RESTRICT กันไม่ได้เพราะการลบเข้ามาทางฝั่ง submission ไม่ใช่ฝั่ง student/project

หลังแก้: ลบโจทย์แล้วคะแนนยังอยู่ แค่ submission_id เป็น NULL
คอลัมน์ที่เหลือ (student_id / classroom_id / project_id / score / comment) ยังครบ
uq_grade_submission ยังใช้ได้ เพราะทั้ง SQLite และ Postgres
ยอมให้มี NULL ซ้ำได้ในดัชนี unique

หมายเหตุการเขียน: FK เดิมในตารางไม่มีชื่อ (สร้างมาก่อนมี naming convention)
drop_constraint ด้วยชื่อจึงใช้ไม่ได้ ต้องใช้ copy_from ให้ alembic
สร้างตารางใหม่ทั้งใบจากนิยามที่ระบุ แล้วย้ายข้อมูลข้ามมา

Revision ID: a2c77b31e5d9
Revises: f1a44c2e90b7
"""
from alembic import op
import sqlalchemy as sa


revision = 'a2c77b31e5d9'
down_revision = 'f1a44c2e90b7'
branch_labels = None
depends_on = None


def _grades_table(submission_ondelete):
    """นิยามตาราง grades ตามที่มีอยู่จริง เปลี่ยนแค่ ondelete ของ submission_id"""
    return sa.Table(
        'grades', sa.MetaData(),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=True),
        sa.Column('classroom_id', sa.Integer(), nullable=True),
        sa.Column('score', sa.Numeric(5, 2), nullable=False),
        sa.Column('max_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['submission_id'], ['assignment_submissions.id'],
                                ondelete=submission_ondelete),
        sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='SET NULL'),
        sa.CheckConstraint('max_score > 0', name='ck_grade_max_score_positive'),
        sa.CheckConstraint('score >= 0 AND score <= max_score', name='ck_grade_score_range'),
    )


def _rebuild(new_ondelete):
    """สร้างตาราง grades ใหม่ด้วย ondelete ที่ต้องการ แล้วย้ายข้อมูลข้ามมา

    copy_from คือ "นิยามของตารางที่จะสร้าง" ไม่ใช่ "ตารางต้นทาง" —
    ส่งนิยามเก่าเข้าไปจะได้ตารางเก่ากลับมาเหมือนเดิม (พลาดมาแล้วรอบหนึ่ง)
    """
    with op.batch_alter_table(
        'grades', copy_from=_grades_table(new_ondelete), recreate='always'
    ) as batch:
        # ไม่มีอะไรต้องแก้เพิ่ม — recreate='always' บังคับสร้างใหม่ตามนิยามข้างบน
        batch.alter_column('submission_id', existing_type=sa.Integer(), nullable=True)

    # batch mode สร้างตารางใหม่จาก copy_from ซึ่งไม่รวม index — สร้างคืนเอง
    op.create_index('ix_grade_student_project', 'grades', ['student_id', 'project_id'])
    op.create_index('uq_grade_submission', 'grades', ['submission_id'], unique=True)
    op.create_index('ix_grade_classroom_student', 'grades', ['classroom_id', 'student_id'])


def upgrade():
    # ปลดคะแนนที่ค้างอยู่กับ submission ที่หายไปแล้วก่อน (ถ้ามี)
    op.execute("""
        UPDATE grades SET submission_id = NULL
        WHERE submission_id IS NOT NULL
          AND submission_id NOT IN (SELECT id FROM assignment_submissions)
    """)
    _rebuild('SET NULL')


def downgrade():
    _rebuild('CASCADE')
