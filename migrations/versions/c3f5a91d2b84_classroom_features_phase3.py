"""classroom features phase 3

โครงสร้างที่ห้องเรียนจริงต้องใช้ (ช่วงที่ 3 ของแผน)

  3.1 assignments.due_date                     กำหนดส่ง
  3.4 assignment_submissions.blockly_xml_snapshot / attempt_no / is_late
                                               แช่แข็งงาน ณ เวลาที่กดส่ง
  3.2 grades.submission_id (+ unique index)    ผูกคะแนนกับงานที่ส่ง ไม่ใช่แค่โปรเจกต์
  3.3 grades.updated_at                        แก้คะแนนที่ผิดได้ ไม่ต้องสร้างแถวใหม่
  3.5 ตาราง project_versions                   ประวัติเวอร์ชันของงาน
  3.6 class_memberships.status / left_at / student_no
                                               แยก "เคยอยู่" กับ "อยู่ตอนนี้"
  3.7 classrooms.academic_year / semester / is_active / is_open / invite_expires_at
                                               แยกเทอมและปีการศึกษา + รหัสเชิญยาวได้ถึง 8
  3.8 activity_logs.value                      ตัวเลขที่ SUM ได้ตรงๆ + backfill ของเดิม

Revision ID: c3f5a91d2b84
Revises: b7e21c9f4a30
Create Date: 2026-07-31 08:10:00.000000

"""
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3f5a91d2b84'
down_revision = 'b7e21c9f4a30'
branch_labels = None
depends_on = None


SUFFIX = '_migtmp'

# คอลัมน์ที่เพิ่มได้ด้วย ALTER TABLE ADD COLUMN ตรงๆ (SQLite รองรับ)
NEW_COLUMNS = [
    ('assignments', sa.Column('due_date', sa.DateTime(), nullable=True)),
    ('assignment_submissions', sa.Column('blockly_xml_snapshot', sa.Text(), nullable=True)),
    ('assignment_submissions', sa.Column('attempt_no', sa.Integer(), nullable=False, server_default='1')),
    ('assignment_submissions', sa.Column('is_late', sa.Boolean(), nullable=False, server_default='0')),
    ('activity_logs', sa.Column('value', sa.Integer(), nullable=True)),
]

# คอลัมน์ของ grades — บน SQLite มาพร้อมการสร้างตารางใหม่ (ต้องมีคีย์นอกจริงด้วย)
GRADE_COLUMNS = [
    sa.Column('submission_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
]

# ตัวเลขหลักของแต่ละเหตุการณ์อยู่ในคีย์ไหนของ metadata_json
VALUE_KEYS = {
    'BLOCK_COUNT': 'count',
    'RUN_CODE': 'block_count',
}


def _backfill_activity_value():
    """ย้ายตัวเลขจาก metadata_json มาลงคอลัมน์ value ของแถวเดิม"""
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        'SELECT id, action_type, metadata_json FROM activity_logs '
        'WHERE metadata_json IS NOT NULL AND metadata_json <> \'\''
    )).fetchall()

    updated = 0
    for row_id, action_type, raw in rows:
        key = VALUE_KEYS.get(action_type)
        if not key:
            continue
        try:
            payload = json.loads(raw)
        except (ValueError, TypeError):
            continue
        if not isinstance(payload, dict):
            continue
        value = payload.get(key)
        if not isinstance(value, int):
            continue
        conn.execute(
            sa.text('UPDATE activity_logs SET value = :v WHERE id = :i'),
            {'v': value, 'i': row_id},
        )
        updated += 1

    print(f'  [3.8] ย้ายตัวเลขจาก metadata มาลงคอลัมน์ value {updated} แถว', flush=True)


def _rebuilt_tables():
    """ตารางที่เพิ่มคอลัมน์อย่างเดียวไม่พอ

    - classrooms        เปลี่ยนความยาว invite_code
    - class_memberships ต้องมี CHECK ของ status
    - grades            submission_id ต้องเป็นคีย์นอกจริง (SQLite เพิ่ม FK ทีหลังไม่ได้)
    """
    meta = sa.MetaData()
    sa.Table('users', meta, sa.Column('id', sa.Integer, primary_key=True))
    sa.Table('projects', meta, sa.Column('id', sa.Integer, primary_key=True))
    sa.Table('assignment_submissions', meta, sa.Column('id', sa.Integer, primary_key=True))

    tables = {}

    tables['classrooms'] = sa.Table(
        'classrooms' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('teacher_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        # ยาว 8 เผื่อรหัส 6 ตัวชนกันจนต้องต่อความยาว
        sa.Column('invite_code', sa.String(8), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('academic_year', sa.String(10)),
        sa.Column('semester', sa.String(10)),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('is_open', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('invite_expires_at', sa.DateTime),
    )

    sa.Table('classrooms', meta, sa.Column('id', sa.Integer, primary_key=True))

    tables['class_memberships'] = sa.Table(
        'class_memberships' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('classroom_id', sa.Integer,
                  sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('joined_at', sa.DateTime),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE'),
        sa.Column('left_at', sa.DateTime),
        sa.Column('student_no', sa.String(10)),
        sa.UniqueConstraint('classroom_id', 'student_id', name='uq_membership_class_student'),
        sa.CheckConstraint("status IN ('ACTIVE','LEFT')", name='ck_membership_status'),
    )

    tables['grades'] = sa.Table(
        'grades' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('teacher_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('student_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('project_id', sa.Integer,
                  sa.ForeignKey('projects.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('submission_id', sa.Integer,
                  sa.ForeignKey('assignment_submissions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('score', sa.Numeric(5, 2), nullable=False),
        sa.Column('max_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('comment', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
        sa.CheckConstraint('max_score > 0', name='ck_grade_max_score_positive'),
        sa.CheckConstraint('score >= 0 AND score <= max_score', name='ck_grade_score_range'),
    )

    return tables


def _rebuild_sqlite_tables(tables, copy_columns):
    """สร้างตารางใหม่-คัดลอกข้อมูล-สลับชื่อ (คอลัมน์ใหม่ปล่อยให้ใช้ค่า default)"""
    for name, tmp_table in tables.items():
        tmp_name = name + SUFFIX
        cols = ', '.join(f'"{c}"' for c in copy_columns[name])

        op.execute(f'DROP TABLE IF EXISTS "{tmp_name}"')
        op.execute(sa.schema.CreateTable(tmp_table))
        op.execute(f'INSERT INTO "{tmp_name}" ({cols}) SELECT {cols} FROM "{name}"')
        op.execute(f'DROP TABLE "{name}"')
        op.execute(f'ALTER TABLE "{tmp_name}" RENAME TO "{name}"')
        print(f'  [3.6/3.7] สร้าง {name} ใหม่', flush=True)


def upgrade():
    is_sqlite = op.get_bind().dialect.name == 'sqlite'

    # --- คอลัมน์ที่เพิ่มตรงๆ ได้ ---
    for table, column in NEW_COLUMNS:
        op.add_column(table, column)

    _backfill_activity_value()

    # งานที่ส่งของแถวเดิมยังไม่มีสำเนา ณ เวลาส่ง — ปล่อยว่างไว้ตามจริง
    # หน้าเว็บจะบอกว่า "งานก่อนมีระบบสำเนา" แทนการเดาข้อมูลย้อนหลัง

    # --- ตารางใหม่: ประวัติเวอร์ชัน ---
    op.create_table(
        'project_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('blockly_xml', sa.Text(), nullable=True),
        sa.Column('generated_code', sa.Text(), nullable=True),
        sa.Column('block_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ver_project_time', 'project_versions', ['project_id', 'created_at'])

    # --- ตารางที่ต้องสร้างใหม่ ---
    copy_columns = {
        'classrooms': ['id', 'name', 'teacher_id', 'invite_code', 'created_at'],
        'class_memberships': ['id', 'classroom_id', 'student_id', 'joined_at'],
        'grades': ['id', 'teacher_id', 'student_id', 'project_id',
                   'score', 'max_score', 'comment', 'created_at'],
    }
    if is_sqlite:
        _rebuild_sqlite_tables(_rebuilt_tables(), copy_columns)
        # index หายไปพร้อมตารางเดิม
        op.create_index('ix_membership_student', 'class_memberships', ['student_id'])
        op.create_index('ix_grade_student_project', 'grades', ['student_id', 'project_id'])
    else:
        for column in GRADE_COLUMNS:
            op.add_column('grades', column)
        op.create_foreign_key(
            'grades_submission_id_fkey', 'grades', 'assignment_submissions',
            ['submission_id'], ['id'], ondelete='CASCADE',
        )
        for table, column in [
            ('classrooms', sa.Column('academic_year', sa.String(10), nullable=True)),
            ('classrooms', sa.Column('semester', sa.String(10), nullable=True)),
            ('classrooms', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1')),
            ('classrooms', sa.Column('is_open', sa.Boolean(), nullable=False, server_default='1')),
            ('classrooms', sa.Column('invite_expires_at', sa.DateTime(), nullable=True)),
            ('class_memberships', sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE')),
            ('class_memberships', sa.Column('left_at', sa.DateTime(), nullable=True)),
            ('class_memberships', sa.Column('student_no', sa.String(10), nullable=True)),
        ]:
            op.add_column(table, column)
        op.alter_column('classrooms', 'invite_code',
                        existing_type=sa.String(6), type_=sa.String(8), existing_nullable=False)
        op.create_check_constraint('ck_membership_status', 'class_memberships',
                                   "status IN ('ACTIVE','LEFT')")

    # งานที่ส่งหนึ่งชิ้นมีคะแนนที่ใช้จริงได้แถวเดียว (NULL ซ้ำกันได้)
    op.create_index('uq_grade_submission', 'grades', ['submission_id'], unique=True)
    op.execute('UPDATE grades SET updated_at = created_at WHERE updated_at IS NULL')


def downgrade():
    is_sqlite = op.get_bind().dialect.name == 'sqlite'

    op.drop_index('uq_grade_submission', table_name='grades')
    op.drop_index('ix_ver_project_time', table_name='project_versions')
    op.drop_table('project_versions')

    if not is_sqlite:
        op.drop_constraint('grades_submission_id_fkey', 'grades', type_='foreignkey')
        for column in reversed(GRADE_COLUMNS):
            op.drop_column('grades', column.name)
        op.drop_constraint('ck_membership_status', 'class_memberships', type_='check')
        for table, column in [
            ('class_memberships', 'student_no'), ('class_memberships', 'left_at'),
            ('class_memberships', 'status'), ('classrooms', 'invite_expires_at'),
            ('classrooms', 'is_open'), ('classrooms', 'is_active'),
            ('classrooms', 'semester'), ('classrooms', 'academic_year'),
        ]:
            op.drop_column(table, column)
    else:
        meta = sa.MetaData()
        sa.Table('users', meta, sa.Column('id', sa.Integer, primary_key=True))
        old = {}
        old['classrooms'] = sa.Table(
            'classrooms' + SUFFIX, meta,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('teacher_id', sa.Integer,
                      sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('invite_code', sa.String(6), nullable=False, unique=True),
            sa.Column('created_at', sa.DateTime),
        )
        sa.Table('classrooms', meta, sa.Column('id', sa.Integer, primary_key=True))
        sa.Table('projects', meta, sa.Column('id', sa.Integer, primary_key=True))
        old['class_memberships'] = sa.Table(
            'class_memberships' + SUFFIX, meta,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('classroom_id', sa.Integer,
                      sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.Integer,
                      sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('joined_at', sa.DateTime),
            sa.UniqueConstraint('classroom_id', 'student_id', name='uq_membership_class_student'),
        )
        old['grades'] = sa.Table(
            'grades' + SUFFIX, meta,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('teacher_id', sa.Integer,
                      sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('student_id', sa.Integer,
                      sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('project_id', sa.Integer,
                      sa.ForeignKey('projects.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('score', sa.Numeric(5, 2), nullable=False),
            sa.Column('max_score', sa.Numeric(5, 2), nullable=False),
            sa.Column('comment', sa.Text),
            sa.Column('created_at', sa.DateTime),
            sa.CheckConstraint('max_score > 0', name='ck_grade_max_score_positive'),
            sa.CheckConstraint('score >= 0 AND score <= max_score', name='ck_grade_score_range'),
        )
        _rebuild_sqlite_tables(old, {
            'classrooms': ['id', 'name', 'teacher_id', 'invite_code', 'created_at'],
            'class_memberships': ['id', 'classroom_id', 'student_id', 'joined_at'],
            'grades': ['id', 'teacher_id', 'student_id', 'project_id',
                       'score', 'max_score', 'comment', 'created_at'],
        })
        op.create_index('ix_membership_student', 'class_memberships', ['student_id'])
        op.create_index('ix_grade_student_project', 'grades', ['student_id', 'project_id'])

    for table, column in reversed(NEW_COLUMNS):
        op.drop_column(table, column.name)
