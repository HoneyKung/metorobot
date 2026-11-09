"""skill focus (ภารกิจที่กำลังเก็บ) + โจทย์ประกาศเป้าหมายทักษะได้

เพิ่มสองอย่างที่แก้ปัญหาเดียวกัน: แผนที่ทักษะไม่เคยบอกว่า "เอาอันไหนก่อน"

  1. ตาราง skill_focus — ปักหมุดว่าตอนนี้เล็งทักษะไหน เป้ากี่ดาว ใครเป็นคนเล็ง
     ผูกกับห้อง (classroom_id) เพราะเด็กอยู่ได้หลายห้อง ครูแต่ละคนเล็งคนละอันได้
     classroom_id = NULL คือโฟกัสส่วนตัวที่เด็กตั้งเอง
     ไม่เก็บจำนวนดาวไว้ที่นี่ — อ่านจากตัวนับกลาง student_objective_progress เสมอ

  2. assignments.objective_id / target_stars — ครูประกาศเองได้ว่าโจทย์นี้ฝึกอะไร
     เดิมระบบ *เดา* จาก required_blocks ครูไม่เคยได้พูด

Revision ID: f1a44c2e90b7
Revises: e5b71c9a3d42
"""
from alembic import op
import sqlalchemy as sa


revision = 'f1a44c2e90b7'
down_revision = 'e5b71c9a3d42'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'skill_focus',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('objective_id', sa.Integer(), nullable=False),
        sa.Column('classroom_id', sa.Integer(), nullable=True),
        sa.Column('target_stars', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('source', sa.String(length=10), nullable=False, server_default='SELF'),
        sa.Column('set_by_id', sa.Integer(), nullable=True),
        sa.Column('note', sa.String(length=300), nullable=True),
        sa.Column('status', sa.String(length=12), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('reached_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['objective_id'], ['learning_objectives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['set_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("source IN ('SELF','TEACHER')", name='ck_focus_source'),
        sa.CheckConstraint("status IN ('ACTIVE','REACHED','CANCELLED')", name='ck_focus_status'),
        sa.CheckConstraint('target_stars >= 1 AND target_stars <= 3', name='ck_focus_target'),
    )
    op.create_index('ix_focus_student_status', 'skill_focus', ['student_id', 'status'])

    # หนึ่งคน มีโฟกัส ACTIVE ได้ห้องละอันเดียว (และส่วนตัวอีกอันที่ classroom_id เป็น NULL)
    # partial index เพราะแถวที่ REACHED/CANCELLED ต้องซ้ำได้ไม่จำกัด — เป็นประวัติ
    # SQLite รองรับ partial index ตั้งแต่ 3.8 · Postgres รองรับอยู่แล้ว
    op.create_index(
        'uq_focus_active_per_room', 'skill_focus',
        ['student_id', 'classroom_id'],
        unique=True, sqlite_where=sa.text("status = 'ACTIVE'"),
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    with op.batch_alter_table('assignments') as batch:
        batch.add_column(sa.Column('objective_id', sa.Integer(), nullable=True))
        batch.add_column(sa.Column('target_stars', sa.Integer(), nullable=True))
        batch.create_foreign_key(
            'fk_assignment_objective', 'learning_objectives',
            ['objective_id'], ['id'], ondelete='SET NULL')


def downgrade():
    with op.batch_alter_table('assignments') as batch:
        batch.drop_constraint('fk_assignment_objective', type_='foreignkey')
        batch.drop_column('target_stars')
        batch.drop_column('objective_id')

    op.drop_index('uq_focus_active_per_room', table_name='skill_focus')
    op.drop_index('ix_focus_student_status', table_name='skill_focus')
    op.drop_table('skill_focus')
