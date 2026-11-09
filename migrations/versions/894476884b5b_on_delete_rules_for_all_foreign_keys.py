"""on delete rules for all foreign keys

ประกาศให้ชัดว่า "แถวลูกจะเป็นยังไงเมื่อแถวแม่ถูกลบ" ครบทุกเส้น
เดิมไม่ประกาศเลย ทำให้พฤติกรรมต่างกันระหว่าง SQLite (dev) กับ PostgreSQL (production)

  CASCADE   — ไม่มีความหมายถ้าไม่มีเจ้าของ (log, tutorial, สมาชิกห้อง, เหรียญ, โปรเจกต์, โจทย์)
  RESTRICT  — เป็นหลักฐานทางการศึกษา ห้ามหายเงียบ (คะแนน, งานที่ส่ง, เจ้าของห้อง)
  SET NULL  — ข้อมูลเสริม (โปรเจกต์ที่ใช้อ้างเป็นหลักฐาน, ครูที่แก้ผลประเมิน)

หมายเหตุเรื่องวิธีทำ:
  SQLite แก้ FK ของตารางที่มีอยู่ไม่ได้ ต้องสร้างตารางใหม่แล้วคัดลอกข้อมูล
  จึงประกาศโครงสร้างเป้าหมายไว้ในไฟล์นี้แบบตายตัว (ไม่ import จาก models.py
  เพื่อให้ migration นี้ให้ผลเหมือนเดิมเสมอแม้โมเดลจะเปลี่ยนไปในอนาคต)
  ส่วน PostgreSQL แก้ตรงๆ ด้วยชื่อ constraint อัตโนมัติ `<ตาราง>_<คอลัมน์>_fkey`

Revision ID: 894476884b5b
Revises: d88484437294
Create Date: 2026-07-31 05:26:38.621601

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '894476884b5b'
down_revision = 'd88484437294'
branch_labels = None
depends_on = None


# (ตาราง, คอลัมน์, ตารางแม่, กติกาเมื่อแม่ถูกลบ)
FK_RULES = [
    ('activity_logs', 'user_id', 'users', 'CASCADE'),
    ('assignment_submissions', 'assignment_id', 'assignments', 'CASCADE'),
    ('assignment_submissions', 'student_id', 'users', 'RESTRICT'),
    ('assignment_submissions', 'project_id', 'projects', 'RESTRICT'),
    ('assignments', 'classroom_id', 'classrooms', 'CASCADE'),
    ('class_memberships', 'classroom_id', 'classrooms', 'CASCADE'),
    ('class_memberships', 'student_id', 'users', 'CASCADE'),
    ('classrooms', 'teacher_id', 'users', 'RESTRICT'),
    ('grades', 'teacher_id', 'users', 'RESTRICT'),
    ('grades', 'student_id', 'users', 'RESTRICT'),
    ('grades', 'project_id', 'projects', 'RESTRICT'),
    ('projects', 'user_id', 'users', 'CASCADE'),
    ('student_objective_progress', 'student_id', 'users', 'CASCADE'),
    ('student_objective_progress', 'objective_id', 'learning_objectives', 'RESTRICT'),
    ('student_objective_progress', 'evidence_project_id', 'projects', 'SET NULL'),
    ('student_objective_progress', 'updated_by_teacher_id', 'users', 'SET NULL'),
    ('tutorial_progress', 'user_id', 'users', 'CASCADE'),
    ('user_achievements', 'user_id', 'users', 'CASCADE'),
    ('user_achievements', 'achievement_id', 'achievement_definitions', 'CASCADE'),
]


# index ที่ต้องสร้างใหม่หลังสร้างตารางใหม่ (ตาราง, ชื่อ index, คอลัมน์)
INDEXES = [
    ('activity_logs', 'ix_log_user_action', ['user_id', 'action_type']),
    ('activity_logs', 'ix_log_user_time', ['user_id', 'created_at']),
    ('class_memberships', 'ix_membership_student', ['student_id']),
    ('grades', 'ix_grade_student_project', ['student_id', 'project_id']),
    ('projects', 'ix_project_user_updated', ['user_id', 'updated_at']),
]


def _fk(column, parent, ondelete, with_rules):
    """สร้าง ForeignKey โดยใส่หรือไม่ใส่ ondelete ตามทิศทางของ migration"""
    return sa.ForeignKey(f'{parent}.id', ondelete=ondelete if with_rules else None)


def _target_tables(with_rules, suffix=''):
    """โครงสร้างเป้าหมายของ 10 ตารางที่มีคีย์นอก (เฉพาะตารางที่ต้องสร้างใหม่)

    suffix ใช้ตอนสร้างตารางชั่วคราวก่อนคัดลอกข้อมูล — คีย์นอกยังชี้ไปตารางแม่ชื่อจริง
    """
    meta = sa.MetaData()

    # โครงร่างของตารางแม่ (แค่คอลัมน์ id) เพื่อให้ ForeignKey อ้างชื่อได้ตอน compile
    # ไม่ถูกสร้างจริง — มีไว้ให้ SQLAlchemy รู้จักปลายทางเท่านั้น
    for parent in ('users', 'classrooms', 'projects', 'assignments',
                   'learning_objectives', 'achievement_definitions'):
        sa.Table(parent, meta, sa.Column('id', sa.Integer, primary_key=True))

    t = {}

    t['activity_logs'] = sa.Table(
        'activity_logs' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, _fk('user_id', 'users', 'CASCADE', with_rules), nullable=False),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('metadata_json', sa.Text),
        sa.Column('created_at', sa.DateTime),
    )

    t['assignment_submissions'] = sa.Table(
        'assignment_submissions' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('assignment_id', sa.Integer, _fk('assignment_id', 'assignments', 'CASCADE', with_rules), nullable=False),
        sa.Column('student_id', sa.Integer, _fk('student_id', 'users', 'RESTRICT', with_rules), nullable=False),
        sa.Column('project_id', sa.Integer, _fk('project_id', 'projects', 'RESTRICT', with_rules), nullable=False),
        sa.Column('submitted_at', sa.DateTime),
        sa.UniqueConstraint('assignment_id', 'student_id', name='uq_submission_assignment_student'),
    )

    t['assignments'] = sa.Table(
        'assignments' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('classroom_id', sa.Integer, _fk('classroom_id', 'classrooms', 'CASCADE', with_rules), nullable=False),
        sa.Column('task_key', sa.String(20), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500)),
        sa.Column('level', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime),
        sa.UniqueConstraint('classroom_id', 'task_key', name='uq_assignment_class_task'),
    )

    t['class_memberships'] = sa.Table(
        'class_memberships' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('classroom_id', sa.Integer, _fk('classroom_id', 'classrooms', 'CASCADE', with_rules), nullable=False),
        sa.Column('student_id', sa.Integer, _fk('student_id', 'users', 'CASCADE', with_rules), nullable=False),
        sa.Column('joined_at', sa.DateTime),
        sa.UniqueConstraint('classroom_id', 'student_id', name='uq_membership_class_student'),
    )

    t['classrooms'] = sa.Table(
        'classrooms' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('teacher_id', sa.Integer, _fk('teacher_id', 'users', 'RESTRICT', with_rules), nullable=False),
        sa.Column('invite_code', sa.String(6), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime),
    )

    t['grades'] = sa.Table(
        'grades' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('teacher_id', sa.Integer, _fk('teacher_id', 'users', 'RESTRICT', with_rules), nullable=False),
        sa.Column('student_id', sa.Integer, _fk('student_id', 'users', 'RESTRICT', with_rules), nullable=False),
        sa.Column('project_id', sa.Integer, _fk('project_id', 'projects', 'RESTRICT', with_rules), nullable=False),
        sa.Column('score', sa.Float, nullable=False),
        sa.Column('max_score', sa.Float, nullable=False),
        sa.Column('comment', sa.Text),
        sa.Column('created_at', sa.DateTime),
    )

    t['projects'] = sa.Table(
        'projects' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, _fk('user_id', 'users', 'CASCADE', with_rules), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('blockly_xml', sa.Text),
        sa.Column('generated_code', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )

    t['student_objective_progress'] = sa.Table(
        'student_objective_progress' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('student_id', sa.Integer, _fk('student_id', 'users', 'CASCADE', with_rules), nullable=False),
        sa.Column('objective_id', sa.Integer, _fk('objective_id', 'learning_objectives', 'RESTRICT', with_rules), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('evidence_project_id', sa.Integer, _fk('evidence_project_id', 'projects', 'SET NULL', with_rules)),
        sa.Column('updated_by_teacher_id', sa.Integer, _fk('updated_by_teacher_id', 'users', 'SET NULL', with_rules)),
        sa.UniqueConstraint('student_id', 'objective_id', name='uq_progress_student_objective'),
    )

    t['tutorial_progress'] = sa.Table(
        'tutorial_progress' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, _fk('user_id', 'users', 'CASCADE', with_rules), nullable=False, unique=True),
        sa.Column('is_completed', sa.Boolean),
        sa.Column('skipped', sa.Boolean),
        sa.Column('last_step_seen', sa.Integer),
        sa.Column('completed_at', sa.DateTime),
    )

    t['user_achievements'] = sa.Table(
        'user_achievements' + suffix, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, _fk('user_id', 'users', 'CASCADE', with_rules), nullable=False),
        sa.Column('achievement_id', sa.Integer, _fk('achievement_id', 'achievement_definitions', 'CASCADE', with_rules), nullable=False),
        sa.Column('unlocked_at', sa.DateTime),
        sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )

    return t


SUFFIX = '_migtmp'


def _rebuild_sqlite(with_rules):
    """SQLite แก้ ON DELETE ของตารางที่มีอยู่ไม่ได้ ต้องสร้างตารางใหม่-คัดลอก-สลับชื่อ

    env.py ปิด PRAGMA foreign_keys และเปิด legacy_alter_table ระหว่างรัน migration ไว้แล้ว
    """
    tables = _target_tables(with_rules, suffix=SUFFIX)

    for name, tmp_table in tables.items():
        columns = ', '.join(f'"{c.name}"' for c in tmp_table.columns)
        tmp_name = name + SUFFIX

        # เผื่อกรณีรันซ้ำหลัง migration ล้มกลางทาง — เก็บกวาดตารางชั่วคราวที่ค้างก่อน
        op.execute(f'DROP TABLE IF EXISTS "{tmp_name}"')
        op.execute(sa.schema.CreateTable(tmp_table))
        op.execute(f'INSERT INTO "{tmp_name}" ({columns}) SELECT {columns} FROM "{name}"')
        op.execute(f'DROP TABLE "{name}"')
        op.execute(f'ALTER TABLE "{tmp_name}" RENAME TO "{name}"')
        action = 'พร้อมกติกา ON DELETE' if with_rules else 'แบบไม่มีกติกา ON DELETE (ย้อนกลับ)'
        print(f'  [fk] สร้าง {name} ใหม่{action}', flush=True)

    # index หายไปพร้อมตารางเดิม ต้องสร้างคืน
    for table, index_name, columns in INDEXES:
        op.create_index(index_name, table, columns)


def _alter_other(with_rules):
    """PostgreSQL และฐานข้อมูลอื่น — ลบ constraint เดิมแล้วสร้างใหม่พร้อมกติกา
    ชื่อ constraint ที่ PostgreSQL ตั้งให้อัตโนมัติคือ `<ตาราง>_<คอลัมน์>_fkey`"""
    for table, column, parent, ondelete in FK_RULES:
        constraint = f'{table}_{column}_fkey'
        op.drop_constraint(constraint, table, type_='foreignkey')
        op.create_foreign_key(
            constraint, table, parent, [column], ['id'],
            ondelete=ondelete if with_rules else None,
        )


def _apply(with_rules):
    if op.get_bind().dialect.name == 'sqlite':
        _rebuild_sqlite(with_rules)
    else:
        _alter_other(with_rules)


def upgrade():
    _apply(with_rules=True)


def downgrade():
    _apply(with_rules=False)
