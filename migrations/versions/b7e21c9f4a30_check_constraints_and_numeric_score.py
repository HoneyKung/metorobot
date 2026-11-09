"""check constraints and numeric score

คอลัมน์ที่เก็บ "ค่าจากชุดจำกัด" ไม่มีอะไรกันค่าที่ผิดเลย และคะแนนไม่มีขอบเขต
(ให้ 999 หรือ -50 ก็ผ่าน) ข้อนี้ใส่ยามให้ที่ระดับฐานข้อมูล

  users.role                              IN ('USER')
  student_objective_progress.status       IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')
  assignments.level                       IN ('Sequential','If/Else','Loop')
  grades.score / max_score                FLOAT -> NUMERIC(5,2)
                                          + 0 <= score <= max_score และ max_score > 0

ทำไมต้องเป็น NUMERIC: เงื่อนไขเหรียญ PERFECT_GRADE เทียบ score == max_score ตรงๆ
ซึ่งเป็นวิธีที่เชื่อถือไม่ได้กับ binary float

วิธีทำเหมือน migration ก่อนหน้า — SQLite เพิ่ม CHECK ให้ตารางที่มีอยู่ไม่ได้
ต้องสร้างตารางใหม่แล้วคัดลอกข้อมูล ส่วน PostgreSQL สั่ง ALTER ตรงๆ ได้

Revision ID: b7e21c9f4a30
Revises: 894476884b5b
Create Date: 2026-07-31 06:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7e21c9f4a30'
down_revision = '894476884b5b'
branch_labels = None
depends_on = None


SUFFIX = '_migtmp'

CHECKS = [
    ('users', 'ck_user_role', "role IN ('USER')"),
    ('student_objective_progress', 'ck_progress_status',
     "status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')"),
    ('assignments', 'ck_assignment_level',
     "level IN ('Sequential','If/Else','Loop')"),
    ('grades', 'ck_grade_max_score_positive', 'max_score > 0'),
    ('grades', 'ck_grade_score_range', 'score >= 0 AND score <= max_score'),
]

INDEXES = [
    ('grades', 'ix_grade_student_project', ['student_id', 'project_id']),
]


def _tables(with_checks):
    """โครงสร้างเป้าหมายของ 4 ตารางที่ต้องแก้ (คีย์นอกคงกติกา ON DELETE จาก migration ก่อนหน้า)"""
    meta = sa.MetaData()

    for parent in ('users', 'projects', 'classrooms', 'learning_objectives'):
        if parent != 'users':
            sa.Table(parent, meta, sa.Column('id', sa.Integer, primary_key=True))

    def check(name, condition):
        return [sa.CheckConstraint(condition, name=name)] if with_checks else []

    t = {}

    t['users'] = sa.Table(
        'users' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(80), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('display_name', sa.String(120), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime),
        sa.Column('last_login_at', sa.DateTime),
        # ความไม่ซ้ำของ username มาจาก unique index ix_users_username (สร้างคืนหลัง rename)
        *check('ck_user_role', "role IN ('USER')"),
    )

    t['student_objective_progress'] = sa.Table(
        'student_objective_progress' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('student_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('objective_id', sa.Integer,
                  sa.ForeignKey('learning_objectives.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('evidence_project_id', sa.Integer,
                  sa.ForeignKey('projects.id', ondelete='SET NULL')),
        sa.Column('updated_by_teacher_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.UniqueConstraint('student_id', 'objective_id', name='uq_progress_student_objective'),
        *check('ck_progress_status',
               "status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')"),
    )

    t['assignments'] = sa.Table(
        'assignments' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('classroom_id', sa.Integer,
                  sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_key', sa.String(20), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500)),
        sa.Column('level', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime),
        sa.UniqueConstraint('classroom_id', 'task_key', name='uq_assignment_class_task'),
        *check('ck_assignment_level', "level IN ('Sequential','If/Else','Loop')"),
    )

    score_type = sa.Numeric(5, 2) if with_checks else sa.Float
    t['grades'] = sa.Table(
        'grades' + SUFFIX, meta,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('teacher_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('student_id', sa.Integer,
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('project_id', sa.Integer,
                  sa.ForeignKey('projects.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('score', score_type, nullable=False),
        sa.Column('max_score', score_type, nullable=False),
        sa.Column('comment', sa.Text),
        sa.Column('created_at', sa.DateTime),
        *check('ck_grade_max_score_positive', 'max_score > 0'),
        *check('ck_grade_score_range', 'score >= 0 AND score <= max_score'),
    )

    # users ถูกสร้างใหม่ด้วย จึงต้องมีโครงร่างชื่อจริงไว้ให้ FK ของตารางอื่นอ้างถึง
    sa.Table('users', meta, sa.Column('id', sa.Integer, primary_key=True))

    return t


def _clean_data_first():
    """แก้ข้อมูลที่จะขัดกับ CHECK ก่อนสร้าง constraint ไม่งั้นสร้างไม่ผ่าน"""
    conn = op.get_bind()
    statements = [
        "UPDATE users SET role = 'USER' WHERE role <> 'USER'",
        "UPDATE student_objective_progress SET status = 'NOT_STARTED' "
        "WHERE status NOT IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')",
        "UPDATE assignments SET level = 'Sequential' "
        "WHERE level NOT IN ('Sequential','If/Else','Loop')",
        "UPDATE grades SET max_score = 100 WHERE max_score IS NULL OR max_score <= 0",
        "UPDATE grades SET score = 0 WHERE score < 0",
        "UPDATE grades SET score = max_score WHERE score > max_score",
    ]
    for sql in statements:
        result = conn.execute(sa.text(sql))
        if result.rowcount:
            print(f'  [clean] แก้ข้อมูล {result.rowcount} แถว: {sql[:60]}...', flush=True)


def _rebuild_sqlite(with_checks):
    for name, tmp_table in _tables(with_checks).items():
        columns = ', '.join(f'"{c.name}"' for c in tmp_table.columns)
        tmp_name = name + SUFFIX

        op.execute(f'DROP TABLE IF EXISTS "{tmp_name}"')
        op.execute(sa.schema.CreateTable(tmp_table))
        op.execute(f'INSERT INTO "{tmp_name}" ({columns}) SELECT {columns} FROM "{name}"')
        op.execute(f'DROP TABLE "{name}"')
        op.execute(f'ALTER TABLE "{tmp_name}" RENAME TO "{name}"')
        print(f'  [check] สร้าง {name} ใหม่', flush=True)

    # index ที่หายไปพร้อมตารางเดิม
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    for table, index_name, columns in INDEXES:
        op.create_index(index_name, table, columns)


def upgrade():
    _clean_data_first()

    if op.get_bind().dialect.name == 'sqlite':
        _rebuild_sqlite(with_checks=True)
        return

    for table, name, condition in CHECKS:
        op.create_check_constraint(name, table, condition)

    with op.batch_alter_table('grades') as batch_op:
        batch_op.alter_column('score', existing_type=sa.Float,
                              type_=sa.Numeric(5, 2), existing_nullable=False)
        batch_op.alter_column('max_score', existing_type=sa.Float,
                              type_=sa.Numeric(5, 2), existing_nullable=False)


def downgrade():
    if op.get_bind().dialect.name == 'sqlite':
        _rebuild_sqlite(with_checks=False)
        return

    with op.batch_alter_table('grades') as batch_op:
        batch_op.alter_column('score', existing_type=sa.Numeric(5, 2),
                              type_=sa.Float, existing_nullable=False)
        batch_op.alter_column('max_score', existing_type=sa.Numeric(5, 2),
                              type_=sa.Float, existing_nullable=False)

    for table, name, _condition in reversed(CHECKS):
        op.drop_constraint(name, table, type_='check')
