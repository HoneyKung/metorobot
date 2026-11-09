"""research tables phase4

สิ่งที่เล่มวิจัยต้องใช้ (ช่วงที่ 4 ของแผน)

  4.1 ตาราง ai_conversations              เก็บ transcript ที่เดิมอยู่แค่ในหน่วยความจำ
  4.2 ตาราง assessments                   คะแนนแบบทดสอบก่อน/หลัง/คงทน
  4.3 คอลัมน์กลุ่มตัวอย่างใน users
      + ตาราง parental_consents           ตัวแปรควบคุมและบันทึกความยินยอม
  4.4 มิติเวลาใน student_objective_progress
      + ตาราง objective_progress_history  ตอบได้ว่าเด็ก "เดินทางมายังไง" ไม่ใช่แค่ "อยู่ตรงไหน"
  4.5 learning_objectives.mastery_threshold  ย้ายเลข 3 ที่ฝังในโค้ดออกมาเป็นค่าที่ตั้งได้
  4.7 ตาราง events                        เหตุการณ์ที่มีโครงสร้างชัดเจน

Revision ID: cc93a6478d7e
Revises: c3f5a91d2b84
Create Date: 2026-08-01 14:51:08.187807

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cc93a6478d7e'
down_revision = 'c3f5a91d2b84'
branch_labels = None
depends_on = None


SUFFIX = '_migtmp'


def _research_user_columns():
    """คอลัมน์กลุ่มตัวอย่างที่เพิ่มเข้าตาราง users"""
    return [
        sa.Column('birth_year', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('grade_level', sa.String(length=20), nullable=True),
        sa.Column('school_code', sa.String(length=20), nullable=True),
        sa.Column('prior_coding_exp', sa.String(length=20), nullable=True),
        sa.Column('research_group', sa.String(length=10), nullable=True),
        sa.Column('participant_code', sa.String(length=20), nullable=True),
    ]


_OLD_USER_COLUMNS = ['id', 'username', 'password_hash', 'display_name',
                     'role', 'avatar_url', 'created_at', 'last_login_at']


def _rebuild_users_sqlite(with_research):
    """SQLite เพิ่ม CHECK / unique ให้ตารางที่มีอยู่ไม่ได้ ต้องสร้างใหม่แล้วคัดลอกข้อมูล

    (env.py ปิด PRAGMA foreign_keys และเปิด legacy_alter_table ระหว่างรัน migration ไว้แล้ว)
    """
    meta = sa.MetaData()
    columns = [
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(80), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('display_name', sa.String(120), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime),
        sa.Column('last_login_at', sa.DateTime),
    ]
    constraints = [sa.CheckConstraint("role IN ('USER')", name='ck_user_role')]

    if with_research:
        columns += _research_user_columns()
        constraints += [
            sa.CheckConstraint(
                "prior_coding_exp IS NULL OR prior_coding_exp IN ('NONE','SOME','MUCH')",
                name='ck_user_prior_exp'),
            sa.CheckConstraint(
                "research_group IS NULL OR research_group IN ('EXP','CTRL')",
                name='ck_user_research_group'),
            sa.UniqueConstraint('participant_code', name='uq_user_participant_code'),
        ]

    tmp = sa.Table('users' + SUFFIX, meta, *(columns + constraints))
    tmp_name = 'users' + SUFFIX
    cols = ', '.join(f'"{c}"' for c in _OLD_USER_COLUMNS)

    op.execute(f'DROP TABLE IF EXISTS "{tmp_name}"')
    op.execute(sa.schema.CreateTable(tmp))
    op.execute(f'INSERT INTO "{tmp_name}" ({cols}) SELECT {cols} FROM "users"')
    op.execute('DROP TABLE "users"')
    op.execute(f'ALTER TABLE "{tmp_name}" RENAME TO "users"')
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    print('  [4.3] สร้าง users ใหม่พร้อมคอลัมน์กลุ่มตัวอย่าง', flush=True)


def _backfill_objective_times():
    """เติมมิติเวลาให้แถวที่มีอยู่ จาก log SKILL:<ชื่อทักษะ> ที่บันทึกไว้จริง

    ไม่เดาข้อมูล — ใช้เวลาแรกสุด/ล่าสุดของ log จริงเท่านั้น
    แถวที่ไม่มี log รองรับก็ปล่อยว่างไว้ตามความจริง
    """
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        'SELECT p.id, p.student_id, p.status, o.name '
        'FROM student_objective_progress p '
        'JOIN learning_objectives o ON o.id = p.objective_id'
    )).fetchall()

    filled = 0
    for progress_id, student_id, status, objective_name in rows:
        action_type = f'SKILL:{objective_name}'[:50]
        stats = conn.execute(sa.text(
            'SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM activity_logs '
            'WHERE user_id = :uid AND action_type = :a'
        ), {'uid': student_id, 'a': action_type}).fetchone()

        count, first_at, last_at = stats[0] or 0, stats[1], stats[2]
        if not count:
            continue

        conn.execute(sa.text(
            'UPDATE student_objective_progress SET clean_run_count = :c, '
            'first_progress_at = :f, mastered_at = :m, updated_at = :u WHERE id = :i'
        ), {
            'c': count,
            'f': first_at,
            'm': last_at if status == 'COMPLETED' else None,
            'u': last_at,
            'i': progress_id,
        })
        filled += 1

    print(f'  [4.4] เติมมิติเวลาให้สถานะทักษะจาก log จริง {filled} แถว', flush=True)


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('assessments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('instrument', sa.String(length=50), nullable=False),
    sa.Column('phase', sa.String(length=20), nullable=False),
    sa.Column('item_scores_json', sa.Text(), nullable=True),
    sa.Column('total', sa.Numeric(precision=6, scale=2), nullable=True),
    sa.Column('max_total', sa.Numeric(precision=6, scale=2), nullable=True),
    sa.Column('administered_at', sa.DateTime(), nullable=False),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('note', sa.String(length=500), nullable=True),
    sa.CheckConstraint("phase IN ('PRE','POST','RETENTION')", name='ck_assessment_phase'),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('student_id', 'instrument', 'phase', name='uq_assessment_student_phase')
    )
    with op.batch_alter_table('assessments', schema=None) as batch_op:
        batch_op.create_index('ix_assessment_student', ['student_id'], unique=False)

    op.create_table('parental_consents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('consent_status', sa.String(length=20), nullable=False),
    sa.Column('consented_by', sa.String(length=120), nullable=True),
    sa.Column('consented_at', sa.DateTime(), nullable=True),
    sa.Column('document_ref', sa.String(length=200), nullable=True),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.CheckConstraint("consent_status IN ('PENDING','GRANTED','DECLINED','WITHDRAWN')", name='ck_consent_status'),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('student_id', name='uq_consent_student')
    )
    op.create_table('ai_conversations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('session_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.Column('turn_index', sa.Integer(), nullable=False),
    sa.Column('role', sa.String(length=10), nullable=False),
    sa.Column('message_text', sa.Text(), nullable=False),
    sa.Column('blockly_xml_snapshot', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.CheckConstraint("role IN ('user','model')", name='ck_ai_role'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('ai_conversations', schema=None) as batch_op:
        batch_op.create_index('ix_ai_session_turn', ['session_id', 'turn_index'], unique=False)
        batch_op.create_index('ix_ai_user_time', ['user_id', 'created_at'], unique=False)

    op.create_table('events',
    sa.Column('event_id', sa.String(length=36), nullable=False),
    sa.Column('session_id', sa.String(length=36), nullable=True),
    sa.Column('correlation_id', sa.String(length=36), nullable=True),
    sa.Column('event_name', sa.String(length=50), nullable=False),
    sa.Column('schema_version', sa.Integer(), nullable=False),
    sa.Column('actor_id', sa.Integer(), nullable=False),
    sa.Column('subject_type', sa.String(length=20), nullable=True),
    sa.Column('subject_id', sa.Integer(), nullable=True),
    sa.Column('classroom_id', sa.Integer(), nullable=True),
    sa.Column('payload_json', sa.Text(), nullable=True),
    sa.Column('occurred_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('event_id')
    )
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.create_index('ix_ev_actor_time', ['actor_id', 'occurred_at'], unique=False)
        batch_op.create_index('ix_ev_classroom_time', ['classroom_id', 'occurred_at'], unique=False)
        batch_op.create_index('ix_ev_name_time', ['event_name', 'occurred_at'], unique=False)

    op.create_table('objective_progress_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('objective_id', sa.Integer(), nullable=False),
    sa.Column('old_status', sa.String(length=20), nullable=True),
    sa.Column('new_status', sa.String(length=20), nullable=False),
    sa.Column('clean_run_count', sa.Integer(), nullable=True),
    sa.Column('changed_by', sa.String(length=10), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('evidence_project_id', sa.Integer(), nullable=True),
    sa.Column('changed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['evidence_project_id'], ['projects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['objective_id'], ['learning_objectives.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('objective_progress_history', schema=None) as batch_op:
        batch_op.create_index('ix_progress_hist_student_time', ['student_id', 'changed_at'], unique=False)

    # เกณฑ์ความเชี่ยวชาญ — ค่าเริ่มต้น 3 เท่าเดิม แต่ตอนนี้แก้ได้ต่อทักษะ (ข้อ 4.5)
    op.add_column('learning_objectives',
                  sa.Column('mastery_threshold', sa.Integer(), nullable=False, server_default='3'))

    # มิติเวลาของทักษะ (ข้อ 4.4)
    for column in (
        sa.Column('first_progress_at', sa.DateTime(), nullable=True),
        sa.Column('mastered_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('clean_run_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('changed_by', sa.String(length=10), nullable=False, server_default='AUTO'),
    ):
        op.add_column('student_objective_progress', column)

    _backfill_objective_times()

    # ข้อมูลกลุ่มตัวอย่างใน users (ข้อ 4.3)
    # ต้องสร้างตารางใหม่เพราะต้องมี CHECK และ unique ของ participant_code จริงๆ
    if op.get_bind().dialect.name == 'sqlite':
        _rebuild_users_sqlite(with_research=True)
    else:
        for column in _research_user_columns():
            op.add_column('users', column)
        op.create_unique_constraint('uq_user_participant_code', 'users', ['participant_code'])
        op.create_check_constraint(
            'ck_user_prior_exp', 'users',
            "prior_coding_exp IS NULL OR prior_coding_exp IN ('NONE','SOME','MUCH')")
        op.create_check_constraint(
            'ck_user_research_group', 'users',
            "research_group IS NULL OR research_group IN ('EXP','CTRL')")


def downgrade():
    if op.get_bind().dialect.name == 'sqlite':
        _rebuild_users_sqlite(with_research=False)
    else:
        op.drop_constraint('ck_user_research_group', 'users', type_='check')
        op.drop_constraint('ck_user_prior_exp', 'users', type_='check')
        op.drop_constraint('uq_user_participant_code', 'users', type_='unique')
        for column in reversed(_research_user_columns()):
            op.drop_column('users', column.name)

    for name in ('changed_by', 'clean_run_count', 'updated_at',
                 'mastered_at', 'first_progress_at'):
        op.drop_column('student_objective_progress', name)

    op.drop_column('learning_objectives', 'mastery_threshold')

    with op.batch_alter_table('objective_progress_history', schema=None) as batch_op:
        batch_op.drop_index('ix_progress_hist_student_time')

    op.drop_table('objective_progress_history')
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_index('ix_ev_name_time')
        batch_op.drop_index('ix_ev_classroom_time')
        batch_op.drop_index('ix_ev_actor_time')

    op.drop_table('events')
    with op.batch_alter_table('ai_conversations', schema=None) as batch_op:
        batch_op.drop_index('ix_ai_user_time')
        batch_op.drop_index('ix_ai_session_turn')

    op.drop_table('ai_conversations')
    op.drop_table('parental_consents')
    with op.batch_alter_table('assessments', schema=None) as batch_op:
        batch_op.drop_index('ix_assessment_student')

    op.drop_table('assessments')
    # ### end Alembic commands ###
