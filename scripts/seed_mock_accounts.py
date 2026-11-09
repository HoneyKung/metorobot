# -*- coding: utf-8 -*-
"""บัญชีจำลองไว้เข้าไปเช็กหน้าแดชบอร์ด (8 พ.ย. 2026) — ใช้กับฐานข้อมูลในเครื่องเท่านั้น

สร้าง 2 บัญชี (รหัสผ่านอยู่ในไฟล์ บัญชีจำลอง_เช็กแดชบอร์ด.md ที่รากโปรเจกต์):
  mock_kru     เจ้าของห้อง "ห้องจำลอง ม.2/1" -> นักเรียนจำลอง 6 คนสถานะต่างกัน + โจทย์ 3 ข้อ + คะแนน
  mock_nakrian สมาชิกห้องนั้น -> ดาว/ภารกิจ/ผลงาน/งานที่ส่งแล้วได้คะแนน (มุมมองนักเรียน)

ใช้ข้อมูลชุดเดียวกับ seed_demo_test.py (ตัวนั้นผูกกับบัญชี test) แต่คนละคำนำหน้า จึงไม่ชนกัน
รันซ้ำได้ — ลบของจำลองเดิมก่อนเสมอ
    python scripts/seed_mock_accounts.py           สร้าง
    python scripts/seed_mock_accounts.py --clean   ลบทิ้งทั้งหมด (รวมสองบัญชีและห้อง)
"""
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import seed_demo_test as base                        # noqa: E402  (import server ให้แล้ว)
from models import (                                 # noqa: E402
    db, User, ClassRoom, ClassMembership, Project, ActivityLog, Grade,
    Assignment, AssignmentSubmission, LearningObjective,
    StudentObjectiveProgress, SkillFocus,
)
from werkzeug.security import generate_password_hash  # noqa: E402

KRU, NAKRIAN = 'mock_kru', 'mock_nakrian'
ROOM_NAME = 'คลาสหุ่นยนต์ A'
CRED_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         'บัญชีจำลอง_เช็กแดชบอร์ด.md')

# ให้ฟังก์ชันของ seed_demo_test ทำงานกับบัญชีชุดนี้แทน test
base.DEMO_PREFIX = 'mockdemo_'
base.TEACHER_USERNAME = KRU


def _read_password():
    """รหัสผ่านเก็บในไฟล์บัญชีจำลอง — รันซ้ำแล้วได้รหัสเดิม"""
    if os.path.exists(CRED_FILE):
        for line in open(CRED_FILE, encoding='utf-8'):
            if line.startswith('- รหัสผ่าน:'):
                return line.split('`')[1]
    import secrets
    return 'meto-' + secrets.token_hex(3)


def clean_all():
    n = base.clean()
    for uname in (NAKRIAN, KRU):
        u = User.query.filter_by(username=uname).first()
        if not u:
            continue
        n += Grade.query.filter((Grade.student_id == u.id) | (Grade.teacher_id == u.id)).delete(synchronize_session=False)
        n += AssignmentSubmission.query.filter_by(student_id=u.id).delete(synchronize_session=False)
        n += SkillFocus.query.filter_by(student_id=u.id).delete(synchronize_session=False)
        n += StudentObjectiveProgress.query.filter_by(student_id=u.id).delete(synchronize_session=False)
        n += ActivityLog.query.filter_by(user_id=u.id).delete(synchronize_session=False)
        n += Project.query.filter_by(user_id=u.id).delete(synchronize_session=False)
        n += ClassMembership.query.filter_by(student_id=u.id).delete(synchronize_session=False)
        for room in ClassRoom.query.filter_by(teacher_id=u.id).all():
            for a in Assignment.query.filter_by(classroom_id=room.id).all():
                AssignmentSubmission.query.filter_by(assignment_id=a.id).delete()
                db.session.delete(a)
            ClassMembership.query.filter_by(classroom_id=room.id).delete()
            db.session.delete(room)
            n += 1
        db.session.flush()
        db.session.delete(u)
        n += 1
    db.session.commit()
    return n


def seed(password):
    kru = User(username=KRU, display_name='ผู้สอนจำลอง', password_hash=generate_password_hash(password))
    nak = User(username=NAKRIAN, display_name='สมาชิกจำลอง', password_hash=generate_password_hash(password))
    db.session.add_all([kru, nak])
    db.session.flush()
    room = ClassRoom(name=ROOM_NAME, teacher_id=kru.id, academic_year='2569', semester='2')
    db.session.add(room)
    db.session.flush()
    db.session.add(ClassMembership(classroom_id=room.id, student_id=nak.id, status='ACTIVE', student_no='7'))
    db.session.commit()

    info = base.seed()          # ฝั่งเจ้าของห้อง: นักเรียน 6 คน + โจทย์ 3 ข้อ + คะแนน

    # ตัดคำนำหน้า mockdemo_ ออกจากชื่อที่โชว์บนจอ (clean_all ลบตามห้อง/ตามบัญชีอยู่แล้ว ไม่ต้องพึ่งชื่อ)
    for a in Assignment.query.filter_by(classroom_id=room.id).all():
        a.title = a.title.replace(base.DEMO_PREFIX, '', 1)
    for u in User.query.filter(User.username.like(base.DEMO_PREFIX + '%')).all():
        for p in Project.query.filter_by(user_id=u.id).all():
            p.title = p.title.replace(base.DEMO_PREFIX, '', 1)
    db.session.commit()

    # ---------- ฝั่งนักเรียน: mock_nakrian ----------
    now = base._now()
    objectives = {o.name: o for o in LearningObjective.query.all()}
    xml = '<xml xmlns="https://developers.google.com/blockly/xml"/>'
    for skill, runs, status in (('Sequencing', 3, 'COMPLETED'),
                                ('Loops', 2, 'IN_PROGRESS'),
                                ('Robot Motion', 1, 'IN_PROGRESS')):
        obj = objectives.get(skill)
        if not obj:
            continue
        db.session.add(StudentObjectiveProgress(
            student_id=nak.id, objective_id=obj.id, status=status,
            clean_run_count=runs, first_progress_at=now - timedelta(days=10),
            mastered_at=now - timedelta(days=2) if status == 'COMPLETED' else None,
            updated_at=now, changed_by='AUTO'))
        for _ in range(runs):
            db.session.add(ActivityLog(user_id=nak.id, action_type=('SKILL:' + obj.name)[:50],
                                       created_at=now - timedelta(days=3)))
    for d in range(5):
        db.session.add(ActivityLog(user_id=nak.id, action_type='RUN_CODE', created_at=now - timedelta(days=d)))
    cond = objectives.get('Conditionals')
    if cond:
        db.session.add(SkillFocus(student_id=nak.id, objective_id=cond.id, classroom_id=None,
                                  target_stars=3, source='SELF', status='ACTIVE', created_at=now))
    projects = []
    for i in range(3):
        p = Project(user_id=nak.id, title='ผลงานจำลองชิ้นที่ %d' % (i + 1), blockly_xml=xml,
                    created_at=now - timedelta(days=6 - i), updated_at=now - timedelta(days=i))
        db.session.add(p)
        projects.append(p)
    db.session.flush()
    # ส่งโจทย์ข้อ 1 แล้วได้คะแนน · ข้อ 2 ส่งแล้วรอตรวจ · ข้อ 3 ยังไม่ส่ง
    asg = Assignment.query.filter_by(classroom_id=room.id).order_by(Assignment.id).all()
    if len(asg) >= 2:
        sub = AssignmentSubmission(assignment_id=asg[0].id, student_id=nak.id, project_id=projects[0].id,
                                   blockly_xml_snapshot=xml, attempt_no=1, submitted_at=now - timedelta(days=2))
        db.session.add(sub)
        db.session.flush()
        db.session.add(Grade(student_id=nak.id, teacher_id=kru.id, project_id=projects[0].id,
                             classroom_id=room.id, submission_id=sub.id, score=8, max_score=10,
                             comment='ดีมาก ลองเพิ่มลูปดูนะ',
                             created_at=now - timedelta(days=1), updated_at=now - timedelta(days=1)))
        db.session.add(AssignmentSubmission(assignment_id=asg[1].id, student_id=nak.id, project_id=projects[1].id,
                                            blockly_xml_snapshot=xml, attempt_no=1, submitted_at=now))
    db.session.commit()
    info['รหัสเข้าห้อง'] = room.invite_code
    return info


if __name__ == '__main__':
    with base.server.app.app_context():
        pw = _read_password()
        n = clean_all()
        if '--clean' in sys.argv:
            print('ลบบัญชี/ข้อมูลจำลอง %d รายการ' % n)
        else:
            info = seed(pw)
            with open(CRED_FILE, 'w', encoding='utf-8') as f:
                f.write('# บัญชีจำลอง เช็กแดชบอร์ด (เครื่องนี้เท่านั้น)\n\n'
                        'สร้างโดย `scripts/seed_mock_accounts.py` · ลบทิ้ง: `python scripts/seed_mock_accounts.py --clean`\n\n'
                        '- บัญชีเจ้าของห้อง: `%s`\n- บัญชีสมาชิก: `%s`\n- รหัสผ่าน: `%s` (ใช้ทั้งสองบัญชี)\n'
                        '- ห้อง: %s · รหัสเข้าห้อง `%s`\n\n'
                        'เปิดเว็บด้วย `python server.py` แล้วเข้า http://localhost:5000 แล้วกดเข้าสู่ระบบ\n'
                        % (KRU, NAKRIAN, pw, ROOM_NAME, info['รหัสเข้าห้อง']))
            print('ลบของเดิม %d รายการ แล้วสร้างใหม่:' % n)
            for k, v in info.items():
                print('  %-18s %s' % (k, v))
