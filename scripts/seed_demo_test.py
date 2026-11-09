# -*- coding: utf-8 -*-
"""สร้างข้อมูลจำลองให้บัญชี `test` — เพื่อดู UI ครบทุกสถานะโดยไม่ต้องกรอกมือ

ทำไมต้องมี:
  หน้าแดชบอร์ดมี state เยอะมาก (ยังไม่ส่ง / ส่งแล้วรอตรวจ / ได้คะแนนแล้ว / ส่งช้า /
  ดาว 0-1-2-3 / ครูเล็งภารกิจ / เด็กเลือกเอง / เด็กหายไปนาน / ทักษะตามหลังห้อง)
  ถ้าไม่มีข้อมูลก็เห็นแต่ empty state แล้วตัดสินไม่ได้ว่าเลย์เอาต์ใช้ได้จริงไหม

`test` จะได้เห็นทั้งสองบทบาทพร้อมกัน:
  เป็นครู   ของห้อง "Test"  -> นักเรียน 6 คนสถานะต่างกัน + โจทย์ 3 ข้อ + คะแนน
  เป็นนักเรียน ในห้อง "ttt" -> ภารกิจ 3 ข้อ (ยังไม่ส่ง/รอตรวจ/ได้คะแนน) + ครูเล็งภารกิจให้

รันซ้ำได้ — ลบของจำลองเดิมก่อนเสมอ (ดูที่ DEMO_PREFIX)
    python scripts/seed_demo_test.py            สร้าง
    python scripts/seed_demo_test.py --clean    ลบทิ้งอย่างเดียว
"""
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server                                        # noqa: E402
from models import (                                 # noqa: E402
    db, User, ClassRoom, ClassMembership, Project, ActivityLog, Grade,
    Assignment, AssignmentSubmission, LearningObjective,
    StudentObjectiveProgress, SkillFocus,
)
from werkzeug.security import generate_password_hash  # noqa: E402

# ทุกอย่างที่สคริปต์นี้สร้างจะขึ้นต้นด้วยคำนี้ เพื่อให้ลบคืนได้แม่นยำ
DEMO_PREFIX = 'demo_'
TEACHER_USERNAME = 'test'


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def clean():
    """ลบเฉพาะของที่สคริปต์นี้สร้าง ไม่แตะข้อมูลจริง"""
    demo_users = User.query.filter(User.username.like(DEMO_PREFIX + '%')).all()
    ids = [u.id for u in demo_users]
    removed = 0
    if ids:
        # ลบตามลำดับที่ FK ยอม: คะแนน -> งานที่ส่ง -> ที่เหลือ
        removed += Grade.query.filter(Grade.student_id.in_(ids)).delete(synchronize_session=False)
        removed += AssignmentSubmission.query.filter(
            AssignmentSubmission.student_id.in_(ids)).delete(synchronize_session=False)
        removed += SkillFocus.query.filter(SkillFocus.student_id.in_(ids)).delete(synchronize_session=False)
        removed += StudentObjectiveProgress.query.filter(
            StudentObjectiveProgress.student_id.in_(ids)).delete(synchronize_session=False)
        removed += ActivityLog.query.filter(ActivityLog.user_id.in_(ids)).delete(synchronize_session=False)
        removed += Project.query.filter(Project.user_id.in_(ids)).delete(synchronize_session=False)
        removed += ClassMembership.query.filter(
            ClassMembership.student_id.in_(ids)).delete(synchronize_session=False)
        for u in demo_users:
            db.session.delete(u)
            removed += 1

    # โจทย์จำลอง + ของที่ผูกกับบัญชี test เอง
    teacher = User.query.filter_by(username=TEACHER_USERNAME).first()
    if teacher:
        demo_asg = Assignment.query.filter(Assignment.title.like(DEMO_PREFIX + '%')).all()
        for a in demo_asg:
            AssignmentSubmission.query.filter_by(assignment_id=a.id).delete()
            db.session.delete(a)
            removed += 1
        removed += SkillFocus.query.filter_by(student_id=teacher.id).delete(synchronize_session=False)
        removed += StudentObjectiveProgress.query.filter_by(
            student_id=teacher.id).delete(synchronize_session=False)
        removed += Grade.query.filter_by(student_id=teacher.id).delete(synchronize_session=False)
        removed += ActivityLog.query.filter(
            ActivityLog.user_id == teacher.id,
            ActivityLog.action_type.like('SKILL:%')).delete(synchronize_session=False)
        removed += Project.query.filter(
            Project.user_id == teacher.id,
            Project.title.like(DEMO_PREFIX + '%')).delete(synchronize_session=False)

    db.session.commit()
    return removed


def seed():
    teacher = User.query.filter_by(username=TEACHER_USERNAME).first()
    if not teacher:
        raise SystemExit('ไม่พบบัญชี "%s" — สร้างบัญชีนี้ก่อน' % TEACHER_USERNAME)

    own_room = ClassRoom.query.filter_by(teacher_id=teacher.id).first()
    if not own_room:
        raise SystemExit('บัญชี "%s" ยังไม่ได้เป็นเจ้าของห้องไหนเลย' % TEACHER_USERNAME)

    joined = ClassMembership.query.filter_by(
        student_id=teacher.id, status='ACTIVE').first()
    learn_room = db.session.get(ClassRoom, joined.classroom_id) if joined else None

    objectives = {o.name: o for o in LearningObjective.query.all()}
    now = _now()

    # ---------- ฝั่งครู: นักเรียน 6 คน สถานะต่างกันครบ ----------
    # (ชื่อ, จำนวนรัน, ถาม AI, เข้าใช้ล่าสุดกี่วันก่อน, ทักษะที่ผ่าน)
    ROSTER = [
        ('เก่งที่สุดในห้อง',   40, 12,  0, ['Sequencing', 'Loops', 'Conditionals', 'Robot Motion']),
        ('ปานกลาง',            18,  4,  1, ['Sequencing', 'Robot Motion']),
        ('เพิ่งเริ่ม',          5,  1,  2, ['Sequencing']),
        ('ตามหลังห้อง',         2,  0,  3, []),
        ('หายไปสองสัปดาห์',    9,  2, 15, ['Sequencing']),
        ('ยังไม่เคยเข้าใช้',    0,  0, None, []),
    ]
    students = []
    for i, (name, runs, ai, idle_days, passed) in enumerate(ROSTER, start=1):
        uname = '%s%02d' % (DEMO_PREFIX, i)
        u = User(username=uname, display_name=name,
                 password_hash=generate_password_hash('demo-not-for-login'))
        db.session.add(u)
        db.session.flush()
        students.append(u)

        db.session.add(ClassMembership(
            classroom_id=own_room.id, student_id=u.id,
            status='ACTIVE', student_no=str(i)))

        if idle_days is not None:
            seen = now - timedelta(days=idle_days)
            for _ in range(runs):
                db.session.add(ActivityLog(user_id=u.id, action_type='RUN_CODE', created_at=seen))
            for _ in range(ai):
                db.session.add(ActivityLog(user_id=u.id, action_type='ASK_AI', created_at=seen))
            db.session.add(ActivityLog(user_id=u.id, action_type='BLOCK_COUNT',
                                       value=runs * 6, created_at=seen))

        for sk in passed:
            obj = objectives.get(sk)
            if not obj:
                continue
            db.session.add(StudentObjectiveProgress(
                student_id=u.id, objective_id=obj.id, status='COMPLETED',
                clean_run_count=obj.mastery_threshold or 3,
                first_progress_at=now - timedelta(days=20), mastered_at=now - timedelta(days=3),
                updated_at=now, changed_by='AUTO'))

        # ทักษะที่กำลังทำอยู่ 1 อัน ให้เห็นดาวครึ่งๆ
        if runs > 3:
            obj = objectives.get('Loops')
            if obj and 'Loops' not in passed:
                db.session.add(StudentObjectiveProgress(
                    student_id=u.id, objective_id=obj.id, status='IN_PROGRESS',
                    clean_run_count=1, first_progress_at=now - timedelta(days=5),
                    updated_at=now, changed_by='AUTO'))

        db.session.add(Project(user_id=u.id, title='%sงานของ%s' % (DEMO_PREFIX, name),
                               blockly_xml='<xml xmlns="https://developers.google.com/blockly/xml"/>',
                               created_at=now - timedelta(days=4), updated_at=now - timedelta(days=1)))

    db.session.flush()

    # ---------- โจทย์ 3 ข้อ สถานะต่างกัน ----------
    presets = [
        ('seq_l_walk', 'เดินเป็นตัว L', 'Sequential', 'Sequencing', None),
        ('loop_square', 'เดินเป็นสี่เหลี่ยม', 'Loop', 'Loops', 2),
        ('cond_pick', 'เจอของแล้วหยิบ', 'If/Else', 'Conditionals', 3),
    ]
    made = []
    for k, (key, title, level, skill, stars) in enumerate(presets):
        obj = objectives.get(skill)
        a = Assignment(
            classroom_id=own_room.id, task_key=key,
            title='%s%s' % (DEMO_PREFIX, title),
            description='โจทย์จำลองสำหรับดูหน้าจอ',
            level=level,
            objective_id=obj.id if obj else None,
            target_stars=stars,
            due_date=now + timedelta(days=[5, -1, 12][k]),   # ข้อ 2 เลยกำหนดส่งแล้ว
            created_at=now - timedelta(days=7))
        db.session.add(a)
        made.append(a)
    db.session.flush()

    # ส่งงาน: ข้อ 1 ส่ง 4 คน (ตรวจแล้ว 2) · ข้อ 2 ส่ง 2 คน (ส่งช้า 1) · ข้อ 3 ยังไม่มีใครส่ง
    xml = '<xml xmlns="https://developers.google.com/blockly/xml"/>'
    for idx, st in enumerate(students[:4]):
        pj = Project.query.filter_by(user_id=st.id).first()
        sub = AssignmentSubmission(
            assignment_id=made[0].id, student_id=st.id, project_id=pj.id,
            blockly_xml_snapshot=xml, attempt_no=1,
            submitted_at=now - timedelta(days=2))
        db.session.add(sub)
        db.session.flush()
        if idx < 2:      # ตรวจแล้ว 2 คน
            db.session.add(Grade(
                student_id=st.id, teacher_id=teacher.id, project_id=pj.id,
                classroom_id=own_room.id, submission_id=sub.id,
                score=[9, 7.5][idx], max_score=10,
                comment=['เรียบร้อยมาก', 'ถูกแล้ว แต่ลองใช้ลูปให้สั้นลงได้อีก'][idx],
                created_at=now - timedelta(days=1), updated_at=now - timedelta(days=1)))

    for idx, st in enumerate(students[:2]):
        pj = Project.query.filter_by(user_id=st.id).first()
        db.session.add(AssignmentSubmission(
            assignment_id=made[1].id, student_id=st.id, project_id=pj.id,
            blockly_xml_snapshot=xml, attempt_no=1 + idx,
            # คนที่สองส่งหลังกำหนด = ส่งช้า
            submitted_at=now - timedelta(days=2) if idx == 0 else now))

    # ---------- ครูเล็งภารกิจให้เด็ก 2 คน ----------
    loops = objectives.get('Loops')
    if loops:
        db.session.add(SkillFocus(
            student_id=students[3].id, objective_id=loops.id, classroom_id=own_room.id,
            target_stars=2, source='TEACHER', set_by_id=teacher.id,
            note='ลองใช้ลูปแทนการก๊อปบล็อกซ้ำนะ', status='ACTIVE', created_at=now))
        db.session.add(SkillFocus(
            student_id=students[4].id, objective_id=loops.id, classroom_id=own_room.id,
            target_stars=1, source='TEACHER', set_by_id=teacher.id,
            status='ACTIVE', created_at=now))

    # ---------- ฝั่งนักเรียน: ตัวบัญชี test เองในห้องที่ไปเรียน ----------
    if learn_room:
        # ดาวของตัวเอง: เต็ม 1 · ครึ่ง 1 · เพิ่งเริ่ม 1
        for skill, runs, status in (('Sequencing', 3, 'COMPLETED'),
                                    ('Loops', 2, 'IN_PROGRESS'),
                                    ('Robot Motion', 1, 'IN_PROGRESS')):
            obj = objectives.get(skill)
            if not obj:
                continue
            db.session.add(StudentObjectiveProgress(
                student_id=teacher.id, objective_id=obj.id, status=status,
                clean_run_count=runs, first_progress_at=now - timedelta(days=10),
                mastered_at=now - timedelta(days=2) if status == 'COMPLETED' else None,
                updated_at=now, changed_by='AUTO'))
            for _ in range(runs):
                db.session.add(ActivityLog(
                    user_id=teacher.id, action_type=('SKILL:' + obj.name)[:50],
                    created_at=now - timedelta(days=3)))

        # ภารกิจส่วนตัวที่ตัวเองเลือก (ช่อง classroom_id ว่าง)
        cond = objectives.get('Conditionals')
        if cond:
            db.session.add(SkillFocus(
                student_id=teacher.id, objective_id=cond.id, classroom_id=None,
                target_stars=3, source='SELF', status='ACTIVE', created_at=now))

        # ผลงานของตัวเอง 3 ชิ้น
        for i in range(3):
            db.session.add(Project(
                user_id=teacher.id, title='%sผลงานชิ้นที่ %d' % (DEMO_PREFIX, i + 1),
                blockly_xml=xml,
                created_at=now - timedelta(days=6 - i), updated_at=now - timedelta(days=i)))

    db.session.commit()
    return {
        'ห้องที่สอน': own_room.name,
        'นักเรียนที่สร้าง': len(students),
        'โจทย์': len(made),
        'ห้องที่เรียน': learn_room.name if learn_room else '(ไม่มี)',
    }


if __name__ == '__main__':
    with server.app.app_context():
        n = clean()
        if '--clean' in sys.argv:
            print('ลบข้อมูลจำลอง %d รายการ' % n)
        else:
            info = seed()
            print('ลบของเดิม %d รายการ แล้วสร้างใหม่:' % n)
            for k, v in info.items():
                print('  %-18s %s' % (k, v))
