"""
RoboMDT Database Models
SQLAlchemy models for the full system: login, tutorial, dashboard, classroom, grading
"""

import json
import random
import string
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()


# SQLite ปิดการบังคับคีย์นอกไว้เป็นค่าเริ่มต้น ต้องสั่งเปิดทุกครั้งที่ต่อ connection
# ไม่เปิด = ตอน dev บน SQLite ผ่านเงียบ แต่ขึ้น PostgreSQL บน Render แล้ว IntegrityError 500
# บั๊กแบบนี้จะโผล่ตอนสาธิตหน้ากรรมการพอดี เพราะทดสอบในเครื่องแล้วผ่านตลอด
@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_conn, conn_record):
    if 'sqlite3' in type(dbapi_conn).__module__:
        cursor = dbapi_conn.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()


# ==================== HELPER ====================

def _utcnow():
    """Return current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)


# ตัดตัวที่เด็กจดผิดง่ายออก: 0 กับ O, 1 กับ I, 8 กับ B, 5 กับ S, 2 กับ Z
_INVITE_CHARS = 'ACDEFGHJKLMNPQRTUVWXY34679'


def _generate_invite_code(length=6):
    """สุ่มรหัสเชิญจากตัวอักษรที่อ่านไม่สับสน"""
    return ''.join(random.choices(_INVITE_CHARS, k=length))


def generate_unique_invite_code(length=6, max_tries=20):
    """สุ่มรหัสเชิญที่ยังไม่ถูกใช้ — ลองใหม่เมื่อชนกัน

    เดิมสุ่มครั้งเดียวแล้วปล่อยให้ IntegrityError หลุดออกหน้าเว็บถ้าซ้ำ
    """
    for _ in range(max_tries):
        code = _generate_invite_code(length)
        if not ClassRoom.query.filter_by(invite_code=code).first():
            return code
    # ชนกัน 20 ครั้งติดแปลว่ารหัสความยาวเท่านี้เริ่มเต็ม — ต่อความยาวให้อีกตัว
    return generate_unique_invite_code(length + 1, max_tries)


# ==================== MODELS ====================

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = (
        # ระบบเป็น universal user — role มีค่าเดียวเสมอ
        # ถ้าวันหนึ่งต้องเพิ่มค่าใหม่ ให้เพิ่มที่นี่พร้อม migration จะได้ไม่มีค่าแปลกปลอมหลุดเข้าไป
        db.CheckConstraint("role IN ('USER')", name='ck_user_role'),
        db.CheckConstraint(
            "prior_coding_exp IS NULL OR prior_coding_exp IN ('NONE','SOME','MUCH')",
            name='ck_user_prior_exp',
        ),
        db.CheckConstraint(
            "research_group IS NULL OR research_group IN ('EXP','CTRL')",
            name='ck_user_research_group',
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(120), nullable=False)
    # Universal user — ทุกคนเป็น USER เท่ากัน
    # บทบาท teacher/student เกิดจากความสัมพันธ์กับห้อง:
    #   เจ้าของห้อง (ClassRoom.teacher_id) = teacher ของห้องนั้น
    #   สมาชิกห้อง (ClassMembership)       = student ของห้องนั้น
    role = db.Column(db.String(20), nullable=False, default='USER')
    # รูปโปรไฟล์ — เก็บได้ 3 แบบในคอลัมน์เดียว เพราะมันคือคำตอบเดียวว่า "แสดงอะไร"
    #   "face:happy"            หน้าหุ่นที่ปลดล็อกแล้ว (วาดด้วยโค้ดชุดเดียวกับจอ TFT)
    #   "data:image/jpeg;..."   รูปที่ผู้ใช้อัปโหลดเอง (ย่อเป็นสี่เหลี่ยมจัตุรัสก่อนส่ง)
    #   None                    ตกไปใช้ตัวอักษรแรกของชื่อ
    # เป็น Text เพราะ data URI ยาวเกิน 500 ตัวอักษรแน่นอน
    avatar_url = db.Column(db.Text, nullable=True)

    # หน้าหุ่นที่ปลดล็อกแล้ว (JSON list ของชนิดบล็อก เช่น ["face_happy","face_love"])
    # ปลดล็อกด้วยการ "ใช้บล็อกหน้านั้นในงานที่รันสะอาด" — ไม่ใช่ซื้อ ไม่ใช่สุ่ม
    # เอาไปเลือกเป็นรูปโปรไฟล์ได้ (เก็บตัวที่เลือกไว้ใน avatar_url เป็น "face:happy")
    #
    # ทำไมใช้หน้าหุ่นเป็นของสะสม: เด็กเอา "รูป" ไปอวดเพื่อนได้ เอา "72%" ไปอวดไม่ได้
    # และหน้าทั้ง 11 แบบวาดด้วยโค้ดอยู่แล้วใน robot-sim.js ไม่ต้องวาดอาร์ตใหม่
    unlocked_faces = db.Column(db.Text, nullable=True)

    def unlocked_face_list(self):
        if not self.unlocked_faces:
            return []
        try:
            value = json.loads(self.unlocked_faces)
            return [f for f in value if isinstance(f, str)] if isinstance(value, list) else []
        except (ValueError, TypeError):
            return []

    def chosen_face(self):
        """หน้าที่เลือกเป็นรูปโปรไฟล์ — คืน None ถ้ายังไม่ได้เลือก"""
        if self.avatar_url and self.avatar_url.startswith('face:'):
            return self.avatar_url[5:]
        return None
    created_at = db.Column(db.DateTime, default=_utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)

    # --- ข้อมูลกลุ่มตัวอย่างสำหรับเล่มวิจัย (ข้อ 4.3) ---
    # ไม่มีข้อมูลพวกนี้ = เขียนตารางที่ 1 (คุณลักษณะกลุ่มตัวอย่าง) ไม่ได้
    # และแบ่งกลุ่มทดลอง/กลุ่มควบคุมไม่ได้
    birth_year = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    grade_level = db.Column(db.String(20), nullable=True)
    school_code = db.Column(db.String(20), nullable=True)
    prior_coding_exp = db.Column(db.String(20), nullable=True)   # NONE | SOME | MUCH
    research_group = db.Column(db.String(10), nullable=True)     # EXP | CTRL
    # รหัสนิรนามที่ใช้แทนชื่อจริงตอนเผยแพร่ผล
    participant_code = db.Column(db.String(20), nullable=True, unique=True)

    # Relationships
    # passive_deletes=True — ปล่อยให้ ON DELETE ของฐานข้อมูลทำงาน
    # ไม่ให้ ORM สั่ง UPDATE ... SET user_id=NULL ซึ่งจะพังกับคอลัมน์ NOT NULL
    projects = db.relationship('Project', backref='owner', lazy='dynamic', passive_deletes=True)
    activity_logs = db.relationship('ActivityLog', backref='user', lazy='dynamic', passive_deletes=True)
    tutorial_progress = db.relationship('TutorialProgress', backref='user', uselist=False, passive_deletes=True)
    achievements = db.relationship('UserAchievement', backref='user', lazy='dynamic', passive_deletes=True)

    def to_dict(self, include_research=False):
        data = {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'role': self.role,
            'avatar_url': self.avatar_url,
            'unlocked_faces': self.unlocked_face_list(),
            'avatar_face': self.chosen_face(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        if include_research:
            data.update({
                'birth_year': self.birth_year,
                'gender': self.gender,
                'grade_level': self.grade_level,
                'school_code': self.school_code,
                'prior_coding_exp': self.prior_coding_exp,
                'research_group': self.research_group,
                'participant_code': self.participant_code,
            })
        return data


class ClassRoom(db.Model):
    __tablename__ = 'classrooms'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    # RESTRICT — ลบผู้ดูแลที่ยังมีห้องอยู่ไม่ได้ ต้องย้ายห้องหรือปิดห้องก่อน
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    invite_code = db.Column(db.String(8), unique=True, nullable=False, default=_generate_invite_code)
    created_at = db.Column(db.DateTime, default=_utcnow)

    # --- เทอม/ปีการศึกษา (ข้อ 3.7) ---
    # เปิดเทอมใหม่ให้สร้างห้องใหม่แล้วปิดห้องเก่า ไม่ใช่ปนกันไปเรื่อยๆ
    academic_year = db.Column(db.String(10), nullable=True)   # เช่น '2569'
    semester = db.Column(db.String(10), nullable=True)        # เช่น '1'
    is_active = db.Column(db.Boolean, nullable=False, default=True)   # False = เก็บถาวร (archived)
    is_open = db.Column(db.Boolean, nullable=False, default=True)     # False = ปิดรับสมาชิกใหม่
    invite_expires_at = db.Column(db.DateTime, nullable=True)

    # แบบของห้อง (9 พ.ย. 2569) — เจ้าของเลือกตอนสร้าง ชื่อห้องตั้งเอง ไม่มีชื่อประเภท
    #   graded = เจ้าของห้องสั่งงานและให้คะแนน
    #   equal  = ทุกคนเท่ากัน ไม่มีคะแนน
    room_mode = db.Column(db.String(10), nullable=False, default='graded', server_default='graded')

    # Relationships
    teacher = db.relationship(
        'User', foreign_keys=[teacher_id],
        backref=db.backref('owned_classrooms', passive_deletes=True),
    )
    memberships = db.relationship('ClassMembership', backref='classroom', lazy='dynamic', passive_deletes=True)

    def invite_is_usable(self):
        """รหัสเชิญยังใช้เข้าห้องได้อยู่ไหม"""
        if not self.is_active or not self.is_open:
            return False
        if self.invite_expires_at and self.invite_expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'teacher_id': self.teacher_id,
            'invite_code': self.invite_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'academic_year': self.academic_year,
            'semester': self.semester,
            'is_active': self.is_active,
            'is_open': self.is_open,
            'invite_expires_at': self.invite_expires_at.isoformat() if self.invite_expires_at else None,
            'invite_usable': self.invite_is_usable(),
            'room_mode': self.room_mode or 'graded',
        }


class ClassMembership(db.Model):
    __tablename__ = 'class_memberships'
    __table_args__ = (
        # คนเดียวเข้าห้องเดิมซ้ำไม่ได้ — โค้ดกันไว้ที่ dashboard แต่ auth.register ไม่ได้กัน
        # unique นี้ทำหน้าที่เป็น index ของ classroom_id ไปด้วย (คอลัมน์นำ)
        db.UniqueConstraint('classroom_id', 'student_id', name='uq_membership_class_student'),
        # ค้นจากฝั่งสมาชิก ("ฉันอยู่ห้องไหนบ้าง") ใช้ unique ข้างบนไม่ได้ ต้องมี index แยก
        db.Index('ix_membership_student', 'student_id'),
        db.CheckConstraint("status IN ('ACTIVE','LEFT')", name='ck_membership_status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    # CASCADE ทั้งคู่ — การเป็นสมาชิกไม่มีความหมายถ้าห้องหรือคนหายไป
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    joined_at = db.Column(db.DateTime, default=_utcnow)

    # --- ข้อ 3.6 ---
    # ออกจากห้องแล้วไม่ลบแถวทิ้ง เพราะต้องแยกให้ออกระหว่าง "เคยอยู่" กับ "อยู่ตอนนี้"
    # และงานที่เคยส่ง/คะแนนที่เคยได้ยังต้องอ้างถึงได้
    status = db.Column(db.String(20), nullable=False, default='ACTIVE')  # ACTIVE | LEFT
    left_at = db.Column(db.DateTime, nullable=True)
    student_no = db.Column(db.String(10), nullable=True)   # เลขที่ในห้อง

    # Relationships
    # passive_deletes ต้องอยู่ฝั่ง backref ด้วย ไม่งั้นตอนลบ User ตัว ORM จะสั่ง
    # UPDATE class_memberships SET student_id=NULL ซึ่งชนกับ NOT NULL แทนที่จะปล่อยให้ CASCADE ทำงาน
    student = db.relationship(
        'User', foreign_keys=[student_id],
        backref=db.backref('class_memberships', passive_deletes=True),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'classroom_id': self.classroom_id,
            'student_id': self.student_id,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'status': self.status,
            'left_at': self.left_at.isoformat() if self.left_at else None,
            'student_no': self.student_no,
        }


class Project(db.Model):
    __tablename__ = 'projects'
    __table_args__ = (
        # รายการโปรเจกต์เรียงตามเวลาแก้ล่าสุด — ตัด "USE TEMP B-TREE FOR ORDER BY" ออก
        db.Index('ix_project_user_updated', 'user_id', 'updated_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False, default='Untitled Project')
    blockly_xml = db.Column(db.Text, nullable=True)
    generated_code = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    grades = db.relationship('Grade', backref='project', lazy='dynamic', passive_deletes=True)
    versions = db.relationship('ProjectVersion', backref='project', lazy='dynamic', passive_deletes=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'blockly_xml': self.blockly_xml,
            'generated_code': self.generated_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ProjectVersion(db.Model):
    """สำเนาของโปรเจกต์ทุกครั้งที่กดบันทึก (ข้อ 3.5)

    เดิมการบันทึกเขียนทับแถวเดิม เด็กแก้งานแล้วพังจึงกู้กลับไม่ได้เลย
    และไม่มีทางเห็นว่าเด็กพัฒนางานมายังไง ซึ่งเป็นสิ่งที่งานวิจัยต้องการ
    """
    __tablename__ = 'project_versions'
    __table_args__ = (
        db.Index('ix_ver_project_time', 'project_id', 'created_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    version_no = db.Column(db.Integer, nullable=False, default=1)
    blockly_xml = db.Column(db.Text, nullable=True)
    generated_code = db.Column(db.Text, nullable=True)
    block_count = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def to_dict(self, include_xml=False):
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'version_no': self.version_no,
            'block_count': self.block_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_xml:
            data['blockly_xml'] = self.blockly_xml
            data['generated_code'] = self.generated_code
        return data


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    __table_args__ = (
        # ตารางที่โตเร็วที่สุดและถูก query บ่อยที่สุด — ไม่มี index เลยจะ full scan ทุกครั้ง
        db.Index('ix_log_user_action', 'user_id', 'action_type'),   # _activity_count, ตรวจเหรียญ
        db.Index('ix_log_user_time', 'user_id', 'created_at'),      # _activity_chart, login streak, last_active
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    metadata_json = db.Column(db.Text, nullable=True)
    # ตัวเลขหลักของเหตุการณ์ แยกออกมาให้ SUM ได้ตรงๆ (ข้อ 3.8)
    # BLOCK_COUNT -> จำนวนบล็อกที่ใช้ในรันนั้น · RUN_CODE -> จำนวนบล็อก
    # เดิมหน้าเว็บโชว์ "จำนวนแถว log" แล้วเขียนว่า "บล็อกที่ใช้" ซึ่งคนละความหมายกัน
    value = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'metadata_json': self.metadata_json,
            'value': self.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TutorialProgress(db.Model):
    __tablename__ = 'tutorial_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    skipped = db.Column(db.Boolean, default=False)
    last_step_seen = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_completed': self.is_completed,
            'skipped': self.skipped,
            'last_step_seen': self.last_step_seen,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class AchievementDefinition(db.Model):
    __tablename__ = 'achievement_definitions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(500), nullable=False)
    icon = db.Column(db.String(30), nullable=False, default='star')
    condition_type = db.Column(db.String(50), nullable=False)
    condition_value = db.Column(db.Integer, nullable=False, default=1)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'condition_type': self.condition_type,
            'condition_value': self.condition_value,
        }


class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    __table_args__ = (
        # เหรียญเดียวกันปลดได้ครั้งเดียว — เคยเกิดซ้ำจริงเพราะสอง request แทรกพร้อมกัน
        db.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement_definitions.id', ondelete='CASCADE'), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=_utcnow)

    # Relationships
    achievement = db.relationship(
        'AchievementDefinition', backref=db.backref('user_achievements', passive_deletes=True),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'achievement_id': self.achievement_id,
            'unlocked_at': self.unlocked_at.isoformat() if self.unlocked_at else None,
        }


class Grade(db.Model):
    __tablename__ = 'grades'
    __table_args__ = (
        db.Index('ix_grade_student_project', 'student_id', 'project_id'),
        # "คะแนนของสมาชิกคนนี้ในห้องนี้" เป็นคำถามหลักของแดชบอร์ดแบบแยกตามห้อง
        db.Index('ix_grade_classroom_student', 'classroom_id', 'student_id'),
        # คะแนนต้องอยู่ในช่วงที่เป็นไปได้ — เดิมให้ 999 หรือ -50 ก็ผ่าน
        db.CheckConstraint('max_score > 0', name='ck_grade_max_score_positive'),
        db.CheckConstraint('score >= 0 AND score <= max_score', name='ck_grade_score_range'),
        # งานที่ส่งหนึ่งชิ้นมีคะแนนที่ใช้จริงได้แถวเดียว (NULL ซ้ำได้ = คะแนนที่ไม่ได้ผูกกับงานส่ง)
        db.Index('uq_grade_submission', 'submission_id', unique=True),
    )

    id = db.Column(db.Integer, primary_key=True)
    # RESTRICT ทั้งสามเส้น — คะแนนเป็นหลักฐานทางการศึกษา ห้ามหายเงียบตามการลบอย่างอื่น
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='RESTRICT'), nullable=False)
    # Numeric ไม่ใช่ Float — คะแนนเป็นตัวเลขทศนิยมตายตัว ไม่ควรมีความคลาดเคลื่อนแบบ binary float
    # เงื่อนไขเหรียญ PERFECT_GRADE เทียบ score == max_score ตรงๆ ซึ่งเชื่อถือได้เฉพาะกับ Numeric
    # --- ข้อ 3.2 ผูกคะแนนกับ "งานที่ส่ง" ไม่ใช่แค่โปรเจกต์ ---
    # ผูกแค่ project_id ทำให้แยกไม่ออกว่าคะแนนนี้เป็นของภารกิจข้อไหน
    # เด็กส่งงานใหม่ด้วยโปรเจกต์คนละชิ้น → คะแนนเดิมหายจากหน้าจอ
    # โปรเจกต์ชิ้นเดียวส่ง 2 ห้อง → คะแนนข้ามกัน
    # SET NULL ไม่ใช่ CASCADE — เคยเป็น CASCADE แล้วเกิดเคสนี้:
    #   ผู้ดูแลกดยกเลิกภารกิจ -> submissions ถูกลบ -> คะแนนของสมาชิกทั้งห้องหายตามถาวร
    # ซึ่งขัดกับเหตุผลของ RESTRICT อีกสามเส้นข้างล่างที่เขียนไว้เองว่า
    # "คะแนนเป็นหลักฐานทางการศึกษา ห้ามหายเงียบตามการลบอย่างอื่น"
    # RESTRICT กันไม่ได้เพราะการลบเข้ามาทางฝั่ง submission ไม่ใช่ฝั่ง student/project
    # ตอนนี้ลบภารกิจแล้วคะแนนยังอยู่ แค่ไม่ผูกกับงานที่ส่งอีกต่อไป
    # (student_id / classroom_id / project_id / score / comment ยังครบ)
    submission_id = db.Column(
        db.Integer,
        db.ForeignKey('assignment_submissions.id', ondelete='SET NULL'),
        nullable=True,
    )
    # --- คะแนนสังกัดห้องไหน ---
    # เดิมต้องไล่ submission -> assignment -> classroom_id ถึงจะรู้
    # และคะแนนที่ให้ตรงๆ บนโปรเจกต์ (submission_id เป็น NULL) ไม่สังกัดห้องไหนเลย
    # ทำให้หน้าแดชบอร์ดแยกตามห้องถามว่า "คะแนนของฉันในห้องนี้" ไม่ได้
    # SET NULL — คะแนนเป็นหลักฐานทางการศึกษา ห้ามหายเพราะห้องถูกลบ
    #            (คะแนนที่ผูกกับงานที่ส่งยัง CASCADE ผ่าน submission_id เหมือนเดิม)
    classroom_id = db.Column(
        db.Integer,
        db.ForeignKey('classrooms.id', ondelete='SET NULL'),
        nullable=True,
    )
    score = db.Column(db.Numeric(5, 2), nullable=False)
    max_score = db.Column(db.Numeric(5, 2), nullable=False, default=100.0)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
    # ผู้ดูแลให้คะแนนผิดแล้วให้ใหม่ต้องแก้แถวเดิม ไม่ใช่ทิ้งแถวผิดคาไว้ตลอดไป (ข้อ 3.3)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships — RESTRICT ทั้งคู่ ปล่อยให้ฐานข้อมูลเป็นคนห้ามลบ ไม่ใช่ ORM มา null ทิ้ง
    teacher = db.relationship(
        'User', foreign_keys=[teacher_id],
        backref=db.backref('grades_given', passive_deletes=True),
    )
    student = db.relationship(
        'User', foreign_keys=[student_id],
        backref=db.backref('grades_received', passive_deletes=True),
    )
    submission = db.relationship(
        'AssignmentSubmission', backref=db.backref('grade', passive_deletes=True),
    )
    classroom = db.relationship(
        'ClassRoom', backref=db.backref('grades', lazy='dynamic', passive_deletes=True),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'student_id': self.student_id,
            'project_id': self.project_id,
            'submission_id': self.submission_id,
            'classroom_id': self.classroom_id,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Numeric คืนค่าเป็น Decimal ซึ่ง jsonify แปลงไม่ได้ ต้องแปลงเป็น float ก่อนส่งออก
            'score': float(self.score) if self.score is not None else None,
            'max_score': float(self.max_score) if self.max_score is not None else None,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class LearningObjective(db.Model):
    __tablename__ = 'learning_objectives'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    category = db.Column(db.String(50), nullable=False, default='GENERAL')
    # เกณฑ์ "รันสะอาดกี่ครั้งถึงถือว่าเชี่ยวชาญ" (ข้อ 4.5)
    # เดิมเลข 3 ถูกฝังอยู่ในโค้ด ตอบกรรมการไม่ได้ว่ามาจากไหนและปรับไม่ได้
    mastery_threshold = db.Column(db.Integer, nullable=False, default=3)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'mastery_threshold': self.mastery_threshold,
        }


class StudentObjectiveProgress(db.Model):
    __tablename__ = 'student_objective_progress'
    __table_args__ = (
        # สมาชิกหนึ่งคนมีสถานะต่อทักษะหนึ่งอันได้แถวเดียว
        db.UniqueConstraint('student_id', 'objective_id', name='uq_progress_student_objective'),
        db.CheckConstraint(
            "status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')",
            name='ck_progress_status',
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    objective_id = db.Column(db.Integer, db.ForeignKey('learning_objectives.id', ondelete='RESTRICT'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='NOT_STARTED')  # NOT_STARTED | IN_PROGRESS | COMPLETED
    # SET NULL — เป็นข้อมูลเสริม ลบโปรเจกต์/ผู้ดูแลแล้วสถานะทักษะยังอยู่ได้
    evidence_project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    updated_by_teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # --- มิติเวลา (ข้อ 4.4) ---
    # เดิมตารางนี้ไม่มีคอลัมน์เวลาเลยแม้แต่ตัวเดียว จึงบอกไม่ได้ว่าสมาชิกผ่านทักษะ "เมื่อไหร่"
    # เทียบต้นเทอมกับปลายเทอมไม่ได้ และวาดเส้นพัฒนาการรายบุคคลไม่ได้
    first_progress_at = db.Column(db.DateTime, nullable=True)   # เริ่มใช้ทักษะนี้ครั้งแรก
    mastered_at = db.Column(db.DateTime, nullable=True)         # ผ่านเกณฑ์เมื่อไหร่
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)
    clean_run_count = db.Column(db.Integer, nullable=False, default=0)
    changed_by = db.Column(db.String(10), nullable=False, default='AUTO')   # AUTO | TEACHER

    # Relationships
    student = db.relationship(
        'User', foreign_keys=[student_id],
        backref=db.backref('objective_progress', passive_deletes=True),
    )
    objective = db.relationship(
        'LearningObjective', backref=db.backref('student_progress', passive_deletes=True),
    )
    evidence_project = db.relationship(
        'Project', foreign_keys=[evidence_project_id],
        backref=db.backref('objective_evidence', passive_deletes=True),
    )
    updated_by_teacher = db.relationship('User', foreign_keys=[updated_by_teacher_id])

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'objective_id': self.objective_id,
            'status': self.status,
            'evidence_project_id': self.evidence_project_id,
            'updated_by_teacher_id': self.updated_by_teacher_id,
            'first_progress_at': self.first_progress_at.isoformat() if self.first_progress_at else None,
            'mastered_at': self.mastered_at.isoformat() if self.mastered_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'clean_run_count': self.clean_run_count,
            'changed_by': self.changed_by,
        }


class ObjectiveProgressHistory(db.Model):
    """บันทึกทุกครั้งที่สถานะทักษะเปลี่ยน (ข้อ 4.4)

    ตารางสถานะเก็บแค่ "ตอนนี้อยู่ตรงไหน" ตารางนี้เก็บ "เดินทางมายังไง"
    ซึ่งเป็นสิ่งที่งานวิจัยเรื่องพัฒนาการการเรียนรู้ต้องการที่สุด
    """
    __tablename__ = 'objective_progress_history'
    __table_args__ = (
        db.Index('ix_progress_hist_student_time', 'student_id', 'changed_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    objective_id = db.Column(db.Integer, db.ForeignKey('learning_objectives.id', ondelete='CASCADE'), nullable=False)
    old_status = db.Column(db.String(20), nullable=True)
    new_status = db.Column(db.String(20), nullable=False)
    clean_run_count = db.Column(db.Integer, nullable=True)
    changed_by = db.Column(db.String(10), nullable=False, default='AUTO')   # AUTO | TEACHER
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    evidence_project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    changed_at = db.Column(db.DateTime, default=_utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'objective_id': self.objective_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'clean_run_count': self.clean_run_count,
            'changed_by': self.changed_by,
            'teacher_id': self.teacher_id,
            'evidence_project_id': self.evidence_project_id,
            'changed_at': self.changed_at.isoformat() if self.changed_at else None,
        }


class Assignment(db.Model):
    """ภารกิจที่ผู้ดูแลมอบหมายให้ห้อง

    ผู้ดูแลเขียนภารกิจเองได้ทั้งหมด — หัวข้อ คำอธิบาย และเกณฑ์ผ่าน
    ชุดภารกิจใน PRESET_TASKS เป็นแค่ "ตัวอย่างให้กดหยิบไปแก้ต่อ" ไม่ใช่รายการที่ต้องเลือกจากในนั้น
    (เดิมบังคับให้ผู้ดูแลเลือกได้เฉพาะ 6 ข้อที่ระบบเตรียมไว้ ซึ่งไม่ตรงกับการสอนจริง)
    """
    __tablename__ = 'assignments'
    __table_args__ = (
        # ห้องเดียวกันสั่งภารกิจข้อเดิมซ้ำไม่ได้ (task_key ของภารกิจที่ผู้ดูแลเขียนเองจะสุ่มให้ไม่ซ้ำ)
        db.UniqueConstraint('classroom_id', 'task_key', name='uq_assignment_class_task'),
    )

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False)
    task_key = db.Column(db.String(40), nullable=False)      # 'seq_l_walk' (ตัวอย่าง) หรือ 'custom_xxxxxxxx'
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    # ระดับเป็นข้อมูลเสริม ไม่บังคับ — ผู้ดูแลหลายคนไม่ได้แบ่งบทเรียนเป็น 3 ระดับแบบนี้
    # ว่างไว้ได้ และหน้าเด็กไม่แสดงป้ายระดับ
    level = db.Column(db.String(30), nullable=True)

    # เกณฑ์ผ่านที่ผู้ดูแลตั้งเอง (JSON) — ว่าง = ไม่มีเกณฑ์อัตโนมัติ ผู้ดูแลตรวจเอง
    # โครงเดียวกับ goal ของ PRESET_TASKS: required_blocks / min_commands / needs_loop_body
    goal_json = db.Column(db.Text, nullable=True)
    # ใครตั้งโจทย์นี้ (9 พ.ย. 2569) — ห้องแบบทุกคนเท่ากันให้สมาชิกทุกคนตั้งโจทย์ท้ากันได้
    # ว่าง = ภารกิจเดิมที่เจ้าของห้องสั่ง
    author_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)   # กำหนดส่ง (ข้อ 3.1) — ว่าง = ไม่มีเดดไลน์
    created_at = db.Column(db.DateTime, default=_utcnow)

    # --- ผู้ดูแลประกาศเป้าหมายของภารกิจได้เอง ---
    # เดิมทักษะที่ภารกิจ "พาไป" ถูก *เดา* จาก required_blocks ที่ skills_for_goal
    # ผู้ดูแลไม่เคยได้พูดเองว่าสั่งงานนี้เพื่อฝึกอะไร งานจึงเป็นฟรีสไตล์ที่วัดผลไม่ได้
    # ใส่แล้วสั่งภารกิจ = เล็งโฟกัสให้ทั้งห้องได้ในคลิกเดียว (ดู SkillFocus)
    objective_id = db.Column(
        db.Integer, db.ForeignKey('learning_objectives.id', ondelete='SET NULL'), nullable=True)
    target_stars = db.Column(db.Integer, nullable=True)   # ว่าง = ใช้ mastery_threshold ของทักษะนั้น

    # Relationships
    classroom = db.relationship('ClassRoom', backref='assignments')
    objective = db.relationship('LearningObjective')
    submissions = db.relationship('AssignmentSubmission', backref='assignment', lazy='dynamic', passive_deletes=True)

    def goal_dict(self):
        """เกณฑ์ผ่านที่ผู้ดูแลตั้งไว้ — คืน dict ว่างถ้าไม่ได้ตั้ง"""
        if not self.goal_json:
            return {}
        try:
            value = json.loads(self.goal_json)
            return value if isinstance(value, dict) else {}
        except (ValueError, TypeError):
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'classroom_id': self.classroom_id,
            'task_key': self.task_key,
            'title': self.title,
            'description': self.description,
            'level': self.level,
            'goal': self.goal_dict(),
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'objective_id': self.objective_id,
            'objective_name': self.objective.name if self.objective else None,
            'target_stars': self.target_stars,
            'author_id': self.author_id,
        }


class AssignmentSubmission(db.Model):
    """งานที่สมาชิกส่ง (ผูกโปรเจกต์ของตัวเองเข้ากับภารกิจ)"""
    __tablename__ = 'assignment_submissions'
    __table_args__ = (
        # สมาชิกหนึ่งคนมีงานส่งของภารกิจหนึ่งข้อได้แถวเดียว
        db.UniqueConstraint('assignment_id', 'student_id', name='uq_submission_assignment_student'),
    )

    id = db.Column(db.Integer, primary_key=True)
    # ผู้ดูแลยกเลิกภารกิจ = งานที่ส่งของภารกิจนั้นหายตาม (CASCADE)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False)
    # แต่ห้ามลบสมาชิกหรือโปรเจกต์ทิ้งแล้วให้งานที่ส่งหายเงียบ (RESTRICT)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='RESTRICT'), nullable=False)
    submitted_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    # --- ข้อ 3.4 แช่แข็งงานที่ส่ง ---
    # ผูกด้วย project_id อย่างเดียวไม่พอ เพราะเด็กแก้บล็อกต่อได้หลังกดส่ง
    # สิ่งที่ผู้ดูแลเปิดดูตอนตรวจจึงอาจไม่ใช่สิ่งที่เด็กกดส่ง (พบเคสนี้จริง 1 เคส)
    blockly_xml_snapshot = db.Column(db.Text, nullable=True)
    attempt_no = db.Column(db.Integer, nullable=False, default=1)
    is_late = db.Column(db.Boolean, nullable=False, default=False)
    # 9 พ.ย. 2569: หุ่นจำลองรันโค้ดชุดที่ส่งนี้จนจบไหม (True/False) · ว่าง = ไม่ได้รันก่อนส่ง
    # โจทย์ท้าที่ตั้ง needs_sim_ok ใช้ค่านี้ตัดสินแทนการดูแค่บล็อก
    sim_ok = db.Column(db.Boolean, nullable=True)

    # Relationships — RESTRICT ทั้งคู่ ให้ฐานข้อมูลเป็นคนห้ามลบ
    student = db.relationship(
        'User', backref=db.backref('assignment_submissions', passive_deletes=True),
    )
    project = db.relationship(
        'Project', backref=db.backref('assignment_submissions', passive_deletes=True),
    )

    def to_dict(self, include_snapshot=False):
        data = {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'student_id': self.student_id,
            'project_id': self.project_id,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'attempt_no': self.attempt_no,
            'is_late': self.is_late,
            'has_snapshot': bool(self.blockly_xml_snapshot),
        }
        if include_snapshot:
            data['blockly_xml_snapshot'] = self.blockly_xml_snapshot
        return data


class AIConversation(db.Model):
    """บทสนทนากับผู้ช่วย AI ทุกเทิร์น (ข้อ 4.1)

    เดิมเก็บใน dict ในหน่วยความจำ — รีสตาร์ตเซิร์ฟเวอร์แล้วหายเกลี้ยง
    และ gunicorn หลาย worker ไม่แชร์ตัวแปรกัน เด็กคนเดียวอาจได้ประวัติคนละชุด
    ผลคือ "วิเคราะห์ผลของ Scaffolding" ในบทที่ 3 ทำไม่ได้เลยเพราะไม่มี transcript สักบรรทัด
    """
    __tablename__ = 'ai_conversations'
    __table_args__ = (
        db.Index('ix_ai_user_time', 'user_id', 'created_at'),
        db.Index('ix_ai_session_turn', 'session_id', 'turn_index'),
        db.CheckConstraint("role IN ('user','model')", name='ck_ai_role'),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    turn_index = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(10), nullable=False)          # user | model
    message_text = db.Column(db.Text, nullable=False)
    blockly_xml_snapshot = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def to_dict(self, include_snapshot=False):
        data = {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'turn_index': self.turn_index,
            'role': self.role,
            'message_text': self.message_text,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_snapshot:
            data['blockly_xml_snapshot'] = self.blockly_xml_snapshot
        return data


class Assessment(db.Model):
    """คะแนนแบบวัดผลมาตรฐาน ก่อน/หลัง/คงทน (ข้อ 4.2)

    ตาราง grades เป็นคะแนนที่ผู้ดูแลให้ต่อโปรเจกต์ ไม่ใช่แบบทดสอบ
    ไม่มี baseline = พิสูจน์ไม่ได้ว่าเด็กเก่งขึ้นเพราะสื่อนี้ หรือเพราะโตขึ้น/เรียนพิเศษ
    """
    __tablename__ = 'assessments'
    __table_args__ = (
        db.UniqueConstraint('student_id', 'instrument', 'phase', name='uq_assessment_student_phase'),
        db.Index('ix_assessment_student', 'student_id'),
        db.CheckConstraint("phase IN ('PRE','POST','RETENTION')", name='ck_assessment_phase'),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    instrument = db.Column(db.String(50), nullable=False)     # CT-test | Bebras | Likert
    phase = db.Column(db.String(20), nullable=False)          # PRE | POST | RETENTION
    item_scores_json = db.Column(db.Text, nullable=True)      # คะแนนรายข้อ
    total = db.Column(db.Numeric(6, 2), nullable=True)
    max_total = db.Column(db.Numeric(6, 2), nullable=True)
    administered_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    note = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'instrument': self.instrument,
            'phase': self.phase,
            'item_scores_json': self.item_scores_json,
            'total': float(self.total) if self.total is not None else None,
            'max_total': float(self.max_total) if self.max_total is not None else None,
            'administered_at': self.administered_at.isoformat() if self.administered_at else None,
            'recorded_by_id': self.recorded_by_id,
            'note': self.note,
        }


class ParentalConsent(db.Model):
    """บันทึกความยินยอมของผู้ปกครอง (ข้อ 4.3)

    เก็บข้อมูลพฤติกรรมของผู้เยาว์โดยไม่มีเอกสารยินยอม
    เสี่ยงไม่ผ่านคณะกรรมการจริยธรรมการวิจัย และขัดกับ PDPA
    """
    __tablename__ = 'parental_consents'
    __table_args__ = (
        db.UniqueConstraint('student_id', name='uq_consent_student'),
        db.CheckConstraint(
            "consent_status IN ('PENDING','GRANTED','DECLINED','WITHDRAWN')",
            name='ck_consent_status',
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    consent_status = db.Column(db.String(20), nullable=False, default='PENDING')
    consented_by = db.Column(db.String(120), nullable=True)   # ชื่อผู้ปกครอง
    consented_at = db.Column(db.DateTime, nullable=True)
    document_ref = db.Column(db.String(200), nullable=True)   # เลขที่เอกสาร/ที่เก็บแฟ้ม
    recorded_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'consent_status': self.consent_status,
            'consented_by': self.consented_by,
            'consented_at': self.consented_at.isoformat() if self.consented_at else None,
            'document_ref': self.document_ref,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class SkillFocus(db.Model):
    """ภารกิจที่ "กำลังเก็บอยู่" — ตัวชี้ทางบนแผนที่ทักษะ

    ทำไมต้องมี:
      แผนที่บอกได้แค่ "เก็บดาวไปแล้วเท่าไหร่" แต่ไม่เคยบอกว่า "เอาอันไหนก่อน"
      ทุกด่านเปิดหมดตั้งแต่วันแรกและไม่มีลำดับที่ใครออกแบบ เด็กจึงเดินสุ่ม
      ตารางนี้ไม่ล็อกด่านและไม่บังคับลำดับ — แค่ปักหมุดว่าตอนนี้เล็งอันไหน

    ทำไมผูกกับห้อง (classroom_id):
      เด็กอยู่ได้หลายห้อง ผู้ดูแลแต่ละคนเล็งคนละทักษะได้โดยไม่ทับกัน
      classroom_id = NULL คือโฟกัสส่วนตัวที่เด็กตั้งเองจากแดชบอร์ดผู้ใช้

    ทำไมความคืบหน้าไม่ได้เก็บในตารางนี้:
      ดาวอยู่ที่ StudentObjectiveProgress.clean_run_count ซึ่งเป็นตัวนับกลางของ user
      เด็กฝึกในเวิร์กสเปซตอนไหนก็นับ ไม่ต้องอยู่ในห้องของผู้ดูแล
      ถ้าก๊อปตัวเลขมาไว้ที่นี่ด้วยจะมีเลขสองชุดที่เพี้ยนจากกันได้ — ผู้ดูแลเป็นคน "เล็ง" เท่านั้น
      ไม่ได้เป็นเจ้าของดาว วัดผลจึงอ่านจากตัวนับกลางเสมอ
    """
    __tablename__ = 'skill_focus'
    __table_args__ = (
        db.CheckConstraint("source IN ('SELF','TEACHER')", name='ck_focus_source'),
        db.CheckConstraint(
            "status IN ('ACTIVE','REACHED','CANCELLED')", name='ck_focus_status'),
        db.CheckConstraint('target_stars >= 1 AND target_stars <= 3', name='ck_focus_target'),
        db.Index('ix_focus_student_status', 'student_id', 'status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    objective_id = db.Column(
        db.Integer, db.ForeignKey('learning_objectives.id', ondelete='CASCADE'), nullable=False)
    # ห้องที่โฟกัสนี้สังกัด — NULL = โฟกัสส่วนตัวที่เด็กตั้งเอง
    classroom_id = db.Column(
        db.Integer, db.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=True)

    target_stars = db.Column(db.Integer, nullable=False, default=3)
    source = db.Column(db.String(10), nullable=False, default='SELF')   # SELF | TEACHER
    # ผู้ดูแลคนไหนเล็งให้ — SET NULL เพราะผู้ดูแลลาออกแล้วโฟกัสของเด็กไม่ควรหาย
    set_by_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    note = db.Column(db.String(300), nullable=True)   # ผู้ดูแลฝากบอกอะไรไว้

    status = db.Column(db.String(12), nullable=False, default='ACTIVE')
    created_at = db.Column(db.DateTime, default=_utcnow)
    reached_at = db.Column(db.DateTime, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)

    objective = db.relationship('LearningObjective')
    classroom = db.relationship('ClassRoom')
    set_by = db.relationship('User', foreign_keys=[set_by_id])
    student = db.relationship(
        'User', foreign_keys=[student_id],
        backref=db.backref('skill_focuses', passive_deletes=True),
    )

    @property
    def is_locked(self):
        """ผู้ดูแลเล็งไว้ = เด็กเปลี่ยนเองไม่ได้จนกว่าจะถึงเป้า"""
        return self.source == 'TEACHER' and self.status == 'ACTIVE'

    def to_dict(self, earned_stars=None):
        """earned_stars ส่งมาจากตัวนับกลาง (StudentObjectiveProgress) ไม่ได้เก็บในตารางนี้"""
        return {
            'id': self.id,
            'objective_id': self.objective_id,
            'objective_name': self.objective.name if self.objective else None,
            'classroom_id': self.classroom_id,
            'classroom_name': self.classroom.name if self.classroom else None,
            'target_stars': self.target_stars,
            'earned_stars': earned_stars,
            'source': self.source,
            'set_by_name': (
                (self.set_by.display_name or self.set_by.username) if self.set_by else None),
            'note': self.note,
            'status': self.status,
            'is_locked': self.is_locked,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reached_at': self.reached_at.isoformat() if self.reached_at else None,
        }


class Event(db.Model):
    """เหตุการณ์ทุกอย่างที่เกิดในระบบ (ข้อ 4.7)

    ตาราง activity_logs เดิมมีจุดเขียนแค่ 3 จุด และ 47% ของแถวไม่มี payload เลย
    เหตุการณ์สำคัญอย่างสร้าง/ลบงาน เข้าห้อง ให้คะแนน ส่งงาน และ error ที่ระบบตรวจเจอ
    ไม่ถูกบันทึกสักครั้ง ทำให้ตอบคำถามวิเคราะห์ในเล่มวิจัยไม่ได้

    ต่างจาก activity_logs ตรงที่ผูกกับ "สิ่งที่ถูกกระทำ" (subject) และมี correlation_id
    ให้ร้อยเหตุการณ์ที่เกิดจากการกดครั้งเดียวกันเข้าด้วยกันได้
    """
    __tablename__ = 'events'
    __table_args__ = (
        db.Index('ix_ev_actor_time', 'actor_id', 'occurred_at'),
        db.Index('ix_ev_name_time', 'event_name', 'occurred_at'),
        db.Index('ix_ev_classroom_time', 'classroom_id', 'occurred_at'),
    )

    event_id = db.Column(db.String(36), primary_key=True)
    session_id = db.Column(db.String(36), nullable=True)
    correlation_id = db.Column(db.String(36), nullable=True)
    event_name = db.Column(db.String(50), nullable=False)
    schema_version = db.Column(db.Integer, nullable=False, default=1)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subject_type = db.Column(db.String(20), nullable=True)     # project | assignment | objective | classroom
    subject_id = db.Column(db.Integer, nullable=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id', ondelete='SET NULL'), nullable=True)
    payload_json = db.Column(db.Text, nullable=True)
    occurred_at = db.Column(db.DateTime, nullable=False, default=_utcnow)

    def to_dict(self):
        return {
            'event_id': self.event_id,
            'session_id': self.session_id,
            'correlation_id': self.correlation_id,
            'event_name': self.event_name,
            'actor_id': self.actor_id,
            'subject_type': self.subject_type,
            'subject_id': self.subject_id,
            'classroom_id': self.classroom_id,
            'payload_json': self.payload_json,
            'occurred_at': self.occurred_at.isoformat() if self.occurred_at else None,
        }


# ==================== SEED DATA ====================

def seed_data():
    """Create default achievements and learning objectives if they don't exist."""

    # --- Default Achievements ---
    default_achievements = [
        {
            'name': 'First Steps',
            'description': 'Complete the tutorial',
            'icon': 'school',
            'condition_type': 'TUTORIAL_COMPLETE',
            'condition_value': 1,
        },
        {
            'name': 'Hello Robot',
            'description': 'Run your first program',
            'icon': 'play_circle',
            'condition_type': 'PROGRAMS_RUN',
            'condition_value': 1,
        },
        {
            'name': 'Block Builder',
            'description': 'Create 5 projects',
            'icon': 'widgets',
            'condition_type': 'PROJECTS_CREATED',
            'condition_value': 5,
        },
        {
            'name': 'Loop Master',
            'description': 'Use a repeat block in 3 different projects',
            'icon': 'loop',
            'condition_type': 'LOOP_USAGE',
            'condition_value': 3,
        },
        {
            'name': 'Bug Squasher',
            'description': 'Fix 10 code errors detected by the AI',
            'icon': 'build',
            'condition_type': 'ERRORS_FIXED',
            'condition_value': 10,
        },
        {
            'name': 'Persistent Coder',
            'description': 'Log in 7 days in a row',
            'icon': 'event_available',
            'condition_type': 'LOGIN_STREAK',
            'condition_value': 7,
        },
        {
            'name': 'AI Whisperer',
            'description': 'Ask the AI assistant 20 questions',
            'icon': 'chat',
            'condition_type': 'AI_QUESTIONS',
            'condition_value': 20,
        },
        {
            'name': 'Perfect Score',
            'description': 'Receive a perfect grade on a project',
            'icon': 'star',
            'condition_type': 'PERFECT_GRADE',
            'condition_value': 1,
        },
    ]

    for ach_data in default_achievements:
        existing = AchievementDefinition.query.filter_by(name=ach_data['name']).first()
        if not existing:
            achievement = AchievementDefinition(**ach_data)
            db.session.add(achievement)

    # --- Default Learning Objectives ---
    default_objectives = [
        {
            'name': 'Sequencing',
            'description': 'Understand that programs execute instructions in order',
            'category': 'FUNDAMENTALS',
        },
        {
            'name': 'Loops',
            'description': 'Use repeat blocks to avoid code duplication',
            'category': 'FUNDAMENTALS',
        },
        {
            'name': 'Conditionals',
            'description': 'Use if/else blocks to make decisions',
            'category': 'FUNDAMENTALS',
        },
        {
            'name': 'Variables',
            'description': 'Create and use variables to store data',
            'category': 'FUNDAMENTALS',
        },
        {
            'name': 'Debugging',
            'description': 'Identify and fix errors in block programs',
            'category': 'PROBLEM_SOLVING',
        },
        {
            'name': 'Decomposition',
            'description': 'Break complex tasks into smaller steps',
            'category': 'PROBLEM_SOLVING',
        },
        {
            'name': 'Pattern Recognition',
            'description': 'Identify repeating patterns and use loops',
            'category': 'PROBLEM_SOLVING',
        },
        {
            'name': 'Robot Motion',
            'description': 'Control robot movement using motion blocks',
            'category': 'ROBOTICS',
        },
        {
            'name': 'Robot Arms & Gripper',
            'description': 'Control robot arms, hands, and gripper',
            'category': 'ROBOTICS',
        },
        {
            'name': 'Robot Expressions',
            'description': 'Use face blocks to express emotions',
            'category': 'ROBOTICS',
        },
    ]

    for obj_data in default_objectives:
        existing = LearningObjective.query.filter_by(name=obj_data['name']).first()
        if not existing:
            objective = LearningObjective(**obj_data)
            db.session.add(objective)

    db.session.commit()
    print("[OK] Seed data loaded (achievements & learning objectives)")
