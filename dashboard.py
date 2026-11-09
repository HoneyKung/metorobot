"""
RoboMDT Dashboard API Blueprint
Universal-user dashboard, projects, classrooms, grades, achievements, objectives, activity

ระบบผู้ใช้แบบ Universal User:
  - ทุกคนเป็น USER เท่ากัน ไม่มี role ระดับระบบ
  - ผู้ใช้คนใดก็ได้สร้างห้อง → เป็น "ผู้ดูแล" (เจ้าของ) ของห้องนั้น
  - ผู้ใช้คนใดก็ได้เข้าร่วมห้องด้วยรหัสเชิญ → เป็น "สมาชิก" ของห้องนั้น
  - สิทธิ์ทุกอย่างตรวจจากความเป็นเจ้าของห้อง ไม่ใช่จาก User.role
"""

import json
import secrets
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from models import (
    db, User, ClassRoom, ClassMembership, Project, ProjectVersion, ActivityLog,
    TutorialProgress, AchievementDefinition, UserAchievement,
    Grade, LearningObjective, StudentObjectiveProgress, ObjectiveProgressHistory,
    Assignment, AssignmentSubmission, SkillFocus, generate_unique_invite_code,
)
from extensions import limiter
from eventlog import record_event, CLIENT_EVENT_NAMES
from skills import detect_skills, analyze_workspace, DETECTABLE_SKILLS, skills_for_goal

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')


# ชื่อกิจกรรมที่หน้าเว็บได้รับอนุญาตให้บันทึกผ่าน POST /api/activity
# เป็นตัวนับการใช้งานล้วนๆ ไม่ใช่หลักฐานความสามารถ
# ส่วน SKILL:* / LOOP_USAGE / ERRORS_FIXED เซิร์ฟเวอร์บันทึกเองจากบล็อกจริง
# และ REGISTER / LOGIN / LOGOUT / PROFILE_UPDATE บันทึกใน auth.py
CLIENT_ALLOWED_ACTIONS = {'RUN_CODE', 'BLOCK_COUNT', 'ASK_AI'}

# ตัวเลขหลักของแต่ละเหตุการณ์อยู่ในคีย์ไหนของ metadata — เก็บลงคอลัมน์ value เพื่อ SUM (ข้อ 3.8)
ACTION_VALUE_KEYS = {
    'BLOCK_COUNT': 'count',
    'RUN_CODE': 'block_count',
}

# เก็บประวัติเวอร์ชันของงานไว้กี่เวอร์ชันล่าสุดต่อโปรเจกต์ (ข้อ 3.5)
MAX_PROJECT_VERSIONS = 30


# ==================== PRESET TASKS ====================
# ชุดภารกิจ 3 ระดับจากรายงานวิจัย (ตารางที่ 8): Sequential → If/Else → Loop
# ออกแบบตามหลัก Scaffolding — เริ่มง่าย ค่อยๆ ยาก
#
# goal = เกณฑ์ที่เซิร์ฟเวอร์ใช้ตรวจว่า "ทำภารกิจได้ตามเป้า" หรือยัง (ข้อ 4.5)
#   เดิมคำว่า "สำเร็จ" หมายถึงแค่ "รันแล้วไม่ขึ้น error" ซึ่งกดรันโค้ดว่างๆ ก็ผ่าน
#   ตอนนี้ตรวจจากบล็อกจริงในงานที่ส่ง — เป็นเกณฑ์ขั้นต่ำที่ตรวจด้วยเครื่องได้
#   ไม่ได้แทนการตรวจของผู้ดูแล แต่ทำให้ตัวเลข "ทำได้ตามภารกิจ" ในเล่มวิจัยมีนิยามที่ชัดเจน
#     required_blocks : ชนิดบล็อกที่ต้องมี (ระบุเป็น prefix ได้)
#     min_commands    : จำนวนบล็อกคำสั่งขั้นต่ำ
#     needs_loop_body : ต้องมี loop ที่ข้างในมีคำสั่งอย่างน้อยกี่บล็อก
# หน้าหุ่น 11 แบบ — ตรงกับบล็อกหมวด Face ใน index.html และ WEB_TO_EMO ใน robot-sim.js
FACE_BLOCKS = [
    ('face_normal', 'ปกติ'), ('face_look_left', 'เหลือบซ้าย'), ('face_look_right', 'เหลือบขวา'),
    ('face_happy', 'ยิ้ม'), ('face_sad', 'เศร้า'), ('face_angry', 'โมโห'),
    ('face_shocked', 'ตกใจ'), ('face_sleepy', 'ง่วง'), ('face_confused', 'งง'),
    ('face_love', 'รัก'), ('face_shy', 'เขิน'),
]
_FACE_KEYS = {k for k, _ in FACE_BLOCKS}

# ชนิดบล็อกที่ผู้ดูแลตั้งเป็นเกณฑ์ผ่านได้ (required_blocks) — key ลงท้าย _ = นับเป็น prefix
# ต้องตรงกับ BLOCK_CHOICES ใน static/demo.js และค่าสำรองใน static/dashboard.js / Mission.LABELS ใน script.js
# (เดิมตัวแปรนี้ถูกอ้างถึง 3 ที่แต่ไม่มีบรรทัดประกาศ → /api/tasks/blocks, /api/assignments/objectives
#  และการตรวจเกณฑ์ภารกิจจะ NameError ทันทีที่ถูกเรียก)
GOAL_BLOCK_CHOICES = [
    ('start_program', 'บล็อก START PROGRAM'),
    ('move_forward', 'เดินหน้า'),
    ('move_backward', 'ถอยหลัง'),
    ('turn_', 'เลี้ยว (ซ้ายหรือขวา)'),
    ('move_timed', 'เดิน/ถอยตามเวลา'),
    ('arm_', 'คำสั่งแขน'),
    ('hand_', 'คำสั่งมือ'),
    ('head_', 'คำสั่งหัว'),
    ('face_', 'คำสั่งหน้าตา'),
    ('grip_', 'คำสั่งที่หนีบ'),
    ('sensor_', 'บล็อกเซนเซอร์ (ถือของ / ขอบโต๊ะ / หน้าคน)'),
    ('controls_if', 'บล็อก if'),
    ('controls_repeat_ext', 'บล็อก repeat'),
    ('controls_whileUntil', 'บล็อก while'),
    ('controls_forever', 'บล็อก repeat forever'),
    ('logic_operation', 'บล็อก and / or'),
    ('variables_set', 'ตั้งค่าตัวแปร'),
]


def _unlock_faces_from(user, blockly_xml):
    """ปลดล็อกหน้าหุ่นจากบล็อกที่เด็กใช้จริงในงานที่รัน

    คืนลิสต์ของหน้าที่ "เพิ่งได้รอบนี้" (ว่าง = ไม่มีอันใหม่)
    ไม่ commit เอง — ให้ปลายทางจัดการ transaction
    """
    info = analyze_workspace(blockly_xml or '')
    if not info:
        return []

    used = {t for t in info['types'] if t in _FACE_KEYS}
    if not used:
        return []

    have = set(user.unlocked_face_list())
    fresh = sorted(used - have)
    if not fresh:
        return []

    user.unlocked_faces = json.dumps(sorted(have | used), ensure_ascii=False)
    return fresh


def _check_task_goal(assignment, blockly_xml, sim_ok=None):
    """ตรวจว่างานที่ส่งเข้าเกณฑ์ขั้นต่ำของภารกิจหรือยัง (ข้อ 4.5)

    เกณฑ์มาจากภารกิจที่ผู้ดูแลตั้งเองเป็นหลัก (assignment.goal_json)
    ถ้าผู้ดูแลไม่ได้ตั้ง และภารกิจนั้นหยิบมาจากตัวอย่าง ก็ใช้เกณฑ์ของตัวอย่างแทน
    ไม่มีเกณฑ์เลย = ผู้ดูแลตรวจเอง (คืน None) ซึ่งเป็นเรื่องปกติ ไม่ใช่ความผิดพลาด

    รับได้ทั้ง Assignment object และ task_key (string) เพื่อความเข้ากันได้
    """
    goal = assignment.goal_dict() if hasattr(assignment, 'goal_dict') else None
    if not goal:
        return None

    info = analyze_workspace(blockly_xml or '')
    if info is None:
        return {'met': False, 'missing': ['อ่านผังบล็อกไม่ได้']}

    types = info['types']
    missing = []

    labels = dict(GOAL_BLOCK_CHOICES)
    for required in goal.get('required_blocks', []):
        if not any(t == required or t.startswith(required) for t in types):
            missing.append(labels.get(required, required))

    if info['command_count'] < goal.get('min_commands', 0):
        missing.append(f"ต้องมีคำสั่งอย่างน้อย {goal['min_commands']} บล็อก")

    if goal.get('needs_loop_body') and info['max_loop_body'] < goal['needs_loop_body']:
        missing.append(f"ต้องมี loop ที่ข้างในมีคำสั่งอย่างน้อย {goal['needs_loop_body']} บล็อก")

    if goal.get('needs_sim_ok') and not sim_ok:
        missing.append('กด Run ให้หุ่นจำลองทำจนจบ (ไม่หยุดกลางคัน) ก่อนส่ง')

    return {'met': not missing, 'missing': missing}


def _clean_goal(raw):
    """ตรวจเกณฑ์ผ่านที่ส่งมาจากฟอร์ม คืน (goal_dict หรือ None, ข้อความผิดพลาด หรือ None)

    9 พ.ย. 2569: create_assignment เรียกฟังก์ชันนี้มานานแล้วแต่ตัวฟังก์ชันหายไป
    ทำให้สั่งภารกิจใหม่ไม่ได้ (NameError) — เขียนคืนตามรูปแบบที่ _check_task_goal อ่าน
    """
    if not raw:
        return None, None
    if not isinstance(raw, dict):
        return None, 'รูปแบบเกณฑ์ผ่านไม่ถูกต้อง'
    allowed = {k for k, _ in GOAL_BLOCK_CHOICES}
    goal = {}
    blocks = raw.get('required_blocks') or []
    if not isinstance(blocks, list) or any(b not in allowed for b in blocks):
        return None, 'บล็อกที่ต้องใช้ไม่ถูกต้อง'
    if blocks:
        goal['required_blocks'] = list(dict.fromkeys(blocks))
    if raw.get('needs_sim_ok'):
        goal['needs_sim_ok'] = True
    for key, top in (('min_commands', 50), ('needs_loop_body', 20)):
        if raw.get(key) in (None, '', 0):
            continue
        try:
            n = int(raw[key])
        except (TypeError, ValueError):
            return None, 'ตัวเลขในเกณฑ์ผ่านไม่ถูกต้อง'
        if not 0 <= n <= top:
            return None, f'ตัวเลขในเกณฑ์ผ่านต้องอยู่ระหว่าง 0 ถึง {top}'
        if n:
            goal[key] = n
    return (goal or None), None


# ==================== HELPERS ====================

def _get_current_user():
    """Get the current authenticated user from JWT."""
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def _owned_classroom_ids(user):
    """IDs of classrooms this user created (is teacher of)."""
    return [c.id for c in ClassRoom.query.filter_by(teacher_id=user.id).all()]


def _count_blocks(blockly_xml):
    """นับจำนวนบล็อกในผัง — ใช้โชว์ในรายการเวอร์ชันให้เห็นว่างานโตขึ้นแค่ไหน"""
    info = analyze_workspace(blockly_xml or '')
    if not info:
        return None
    return sum(info['types'].values())


def _parse_datetime(raw):
    """แปลงวันเวลาที่รับจากหน้าเว็บเป็น datetime (naive UTC) — คืน None ถ้าแปลงไม่ได้

    รับได้ทั้ง '2026-08-15T16:30' (input type=datetime-local) และ ISO เต็มรูปแบบ
    """
    if not raw:
        return None
    text = str(raw).strip()
    if text.endswith('Z'):
        text = text[:-1] + '+00:00'
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _now_naive():
    """เวลาปัจจุบันแบบไม่มี timezone — ให้เทียบกับค่าที่เก็บใน SQLite ได้ตรงๆ"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _active_members(classroom_id=None, student_id=None):
    """query สมาชิกที่ยังอยู่ในห้องจริงๆ (ไม่รวมคนที่ถูกเอาออก/ย้ายไปแล้ว)"""
    q = ClassMembership.query.filter(ClassMembership.status == 'ACTIVE')
    if classroom_id is not None:
        q = q.filter(ClassMembership.classroom_id == classroom_id)
    if student_id is not None:
        q = q.filter(ClassMembership.student_id == student_id)
    return q


def _user_teaches_student(user, student_id):
    """True if student_id is a member of any classroom owned by user.

    รวมคนที่ออกจากห้องไปแล้วด้วย — ผู้ดูแลยังต้องเปิดดูงานเก่าและแก้คะแนนย้อนหลังได้
    """
    owned_ids = _owned_classroom_ids(user)
    if not owned_ids:
        return False
    return ClassMembership.query.filter(
        ClassMembership.student_id == student_id,
        ClassMembership.classroom_id.in_(owned_ids),
    ).first() is not None


def _resolve_grade_classroom(user, student_id, submission, requested_id):
    """หาว่าคะแนนก้อนนี้ควรสังกัดห้องไหน — คืน id ห้อง หรือ None ถ้าตอบไม่ได้แน่ชัด

    ลำดับความน่าเชื่อถือ:
      1. งานที่ส่ง  — ภารกิจรู้ห้องของตัวเองอยู่แล้ว ถือเป็นคำตอบที่ถูกที่สุด
      2. ห้องที่ผู้ดูแลระบุมา — ต้องเป็นห้องของผู้ดูแลคนนี้ และเด็กต้องเคยอยู่ห้องนั้นจริง
      3. เดาจากห้องเดียวที่เด็กอยู่ร่วมกับผู้ดูแล — ใช้ได้เฉพาะตอนที่มีห้องเดียวเท่านั้น

    ผู้ดูแลคนเดียวสอนหลายห้องได้ ถ้าเด็กอยู่หลายห้องของผู้ดูแลคนเดียวกันแล้วเดา
    คะแนนจะไปโผล่ผิดห้อง — กรณีนั้นคืน None ปล่อยให้เป็นคะแนนที่ไม่สังกัดห้องดีกว่าผิด
    """
    if submission is not None:
        assignment = Assignment.query.get(submission.assignment_id)
        return assignment.classroom_id if assignment else None

    owned_ids = _owned_classroom_ids(user)
    if not owned_ids:
        return None

    if requested_id:
        requested_id = int(requested_id)
        if requested_id in owned_ids and ClassMembership.query.filter_by(
            classroom_id=requested_id, student_id=student_id
        ).first():
            return requested_id
        return None

    shared = [
        m.classroom_id for m in ClassMembership.query.filter(
            ClassMembership.student_id == student_id,
            ClassMembership.classroom_id.in_(owned_ids),
        ).all()
    ]
    return shared[0] if len(set(shared)) == 1 else None


def _activity_count(user_id, action_type):
    """Count activities of a specific type for a user."""
    return db.session.query(func.count(ActivityLog.id)).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.action_type == action_type,
    ).scalar() or 0


def _activity_sum(user_id, action_type):
    """ผลรวมของ 'ตัวเลขในเหตุการณ์' ไม่ใช่จำนวนแถว (ข้อ 3.8)

    ช่องที่เขียนว่า "บล็อกที่ใช้" เคยแสดงจำนวนแถว log ซึ่งจริงๆ คือ "จำนวนครั้งที่กดรัน"
    ตัวเลขนี้ถ้าเอาไปใส่เล่มวิจัยจะผิด (ของจริงต่างกัน 17 กับ 68)
    """
    return db.session.query(func.coalesce(func.sum(ActivityLog.value), 0)).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.action_type == action_type,
    ).scalar() or 0


def _activity_chart(user_id, days=7):
    """Return activity counts per day for the last N days.

    ดึงครั้งเดียวแล้วนับในหน่วยความจำ — เดิมยิงวันละ 1 query (7 query ต่อการเปิดหน้า)
    ไม่ใช้ date() ใน SQL เพราะ SQLite กับ PostgreSQL เขียนไม่เหมือนกัน
    """
    today = datetime.now(timezone.utc).date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=days - 1)

    rows = db.session.query(ActivityLog.created_at).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.created_at >= start,
    ).all()

    counts = {}
    for (created,) in rows:
        if created is None:
            continue
        day = created.date()
        counts[day] = counts.get(day, 0) + 1

    chart = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        chart.append({'date': day.isoformat(), 'count': counts.get(day, 0)})
    return chart


def _last_run_had_errors(user_id, before):
    """รันครั้งล่าสุดก่อนหน้านี้มี error หรือไม่ — ดูจาก log ของเซิร์ฟเวอร์เอง

    ใช้ตัดสินทักษะ Debugging (ล้มแล้วแก้จนผ่าน) แทนการเชื่อ flag ที่หน้าเว็บส่งมา
    """
    last_run = ActivityLog.query.filter(
        ActivityLog.user_id == user_id,
        ActivityLog.action_type == 'RUN_CODE',
        ActivityLog.created_at < before,
    ).order_by(ActivityLog.created_at.desc()).first()

    if not last_run or not last_run.metadata_json:
        return False

    try:
        payload = json.loads(last_run.metadata_json)
    except (ValueError, TypeError):
        return False

    return bool(isinstance(payload, dict) and payload.get('had_errors'))


def _log_derived_activity(user_id, action_type, now, payload=None):
    """บันทึกกิจกรรมที่เซิร์ฟเวอร์สรุปเอง (ไม่รับจาก client)
    มีหน้าต่างกันนับซ้ำ 60 วินาทีเหมือนการนับทักษะ"""
    recent = ActivityLog.query.filter(
        ActivityLog.user_id == user_id,
        ActivityLog.action_type == action_type,
        ActivityLog.created_at >= now - timedelta(seconds=60),
    ).first()
    if recent:
        return False

    db.session.add(ActivityLog(
        user_id=user_id,
        action_type=action_type,
        metadata_json=json.dumps(payload) if payload else None,
    ))
    return True


def _status_key(status):
    """Map DB objective status to frontend keys."""
    return {
        'COMPLETED': 'mastered',
        'IN_PROGRESS': 'in_progress',
        'NOT_STARTED': 'not_started',
    }.get(status, 'not_started')


def _check_and_award_achievements(user_id):
    """Check all achievement conditions and award any newly qualified ones."""
    user = User.query.get(user_id)
    if not user:
        return []

    already_unlocked = {
        ua.achievement_id
        for ua in UserAchievement.query.filter_by(user_id=user_id).all()
    }

    definitions = AchievementDefinition.query.all()
    newly_awarded = []

    for defn in definitions:
        if defn.id in already_unlocked:
            continue

        qualified = False
        ctype = defn.condition_type
        cval = defn.condition_value

        if ctype == 'TUTORIAL_COMPLETE':
            tp = TutorialProgress.query.filter_by(user_id=user_id).first()
            qualified = tp is not None and tp.is_completed

        elif ctype == 'PROGRAMS_RUN':
            count = _activity_count(user_id, 'RUN_CODE')
            qualified = count >= cval

        elif ctype == 'PROJECTS_CREATED':
            count = db.session.query(func.count(Project.id)).filter(
                Project.user_id == user_id
            ).scalar() or 0
            qualified = count >= cval

        elif ctype == 'AI_QUESTIONS':
            count = _activity_count(user_id, 'ASK_AI')
            qualified = count >= cval

        elif ctype == 'LOGIN_STREAK':
            qualified = _check_login_streak(user_id, cval)

        elif ctype == 'PERFECT_GRADE':
            perfect = db.session.query(func.count(Grade.id)).filter(
                Grade.student_id == user_id,
                Grade.score == Grade.max_score,
            ).scalar() or 0
            qualified = perfect >= cval

        # Generic count-based types (LOOP_USAGE, ERRORS_FIXED, etc.)
        elif ctype in ('LOOP_USAGE', 'ERRORS_FIXED'):
            count = _activity_count(user_id, ctype)
            qualified = count >= cval

        if qualified:
            # "แทรกแล้วดักข้อผิดพลาด" แทน "อ่านก่อนเขียน"
            # หน้าเว็บยิง RUN_CODE กับ BLOCK_COUNT พร้อมกัน ทั้งสอง request
            # อ่านเจอ "ยังไม่มีเหรียญ" พร้อมกันแล้วแทรกซ้อน — เคยเกิดจริงห่างกัน 2 ms
            # ตอนนี้ unique constraint จะปัดใบที่สองทิ้งเอง
            try:
                with db.session.begin_nested():
                    db.session.add(UserAchievement(user_id=user_id, achievement_id=defn.id))
                newly_awarded.append(defn.to_dict())
            except IntegrityError:
                # อีก request ให้เหรียญนี้ไปแล้ว — ไม่ใช่ข้อผิดพลาด
                # savepoint ถูกย้อนให้อัตโนมัติ ของที่ค้างในรอบก่อนหน้ายังอยู่ครบ
                pass

    if newly_awarded:
        db.session.commit()

    return newly_awarded


def _check_login_streak(user_id, required_days):
    """Check if user has logged in for N consecutive days (including today).

    ดึงครั้งเดียวแล้วเช็คในหน่วยความจำ — เดิมยิงวันละ 1 query
    และถูกเรียกทุกครั้งที่ตรวจเหรียญ (7 query ต่อรอบ)
    """
    today = datetime.now(timezone.utc).date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=required_days - 1)

    rows = db.session.query(ActivityLog.created_at).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.action_type == 'LOGIN',
        ActivityLog.created_at >= start,
    ).all()

    days_with_login = {created.date() for (created,) in rows if created is not None}
    return all((today - timedelta(days=i)) in days_with_login for i in range(required_days))


def _days_played(user_id):
    """นับ "จำนวนวันที่มาเล่น" — เลขสะสมที่ไม่มีวันลดลง

    ทำไมไม่ใช้ streak รายวันแบบ Duolingo:
      เด็กเรียนวิชานี้คาบเดียวต่อสัปดาห์ streak รายวันจะขาดตั้งแต่วันที่สอง
      แล้วกลายเป็นการลงโทษแทนที่จะเป็นแรงจูงใจ ซึ่งขัดกฎห้ามลงโทษเด็ก
      เลขสะสมที่ขึ้นอย่างเดียวให้ความรู้สึก "สะสมได้" โดยไม่มีอะไรให้เสีย

    นับจากวันที่มี ActivityLog อะไรก็ได้ ไม่ใช่เฉพาะ LOGIN
    เพราะเด็กที่เล่นแบบ guest ไม่มี LOGIN แต่มี RUN_CODE
    """
    rows = db.session.query(func.date(ActivityLog.created_at)).filter(
        ActivityLog.user_id == user_id
    ).distinct().all()
    return len({r[0] for r in rows if r[0]})


# ภารกิจประจำวัน — สุ่มจากทักษะที่ยังไม่เชี่ยวชาญ ไม่ใช่สุ่มมั่ว
# ใช้วันที่เป็น seed เพื่อให้ทั้งวันได้ข้อเดิม (เด็กรีเฟรชแล้วไม่เปลี่ยน)
# และเด็กแต่ละคนได้คนละข้อ เพราะ seed รวม user_id ด้วย
def _daily_quest(user_id):
    objectives = LearningObjective.query.order_by(LearningObjective.id).all()
    if not objectives:
        return None

    done = {p.objective_id for p in StudentObjectiveProgress.query.filter_by(
        student_id=user_id, status='COMPLETED').all()}
    pool = [o for o in objectives if o.id not in done] or objectives

    today = datetime.now(timezone.utc).date()
    seed = (today.toordinal() * 1000003 + (user_id or 0) * 7919) % len(pool)
    target = pool[seed]

    progress = StudentObjectiveProgress.query.filter_by(
        student_id=user_id, objective_id=target.id).first()
    return {
        'objective_id': target.id,
        'objective_name': target.name,
        'clean_runs': progress.clean_run_count if progress else 0,
        'mastery_threshold': target.mastery_threshold or 3,
        'date': today.isoformat(),
    }


def _get_classroom_students_with_stats(classroom_id):
    """Get flat list of students in a classroom with their stats (frontend shape).

    ยิง query คงที่ 5 ตัวไม่ว่าห้องจะมีสมาชิกกี่คน
    เดิมวนทีละคน คนละ ~6 query — ห้อง 35 คน = ~210 query ต่อการเปิดหน้า 1 ครั้ง
    """
    rows = db.session.query(User, ClassMembership).join(
        ClassMembership, ClassMembership.student_id == User.id
    ).filter(
        ClassMembership.classroom_id == classroom_id,
        ClassMembership.status == 'ACTIVE',
    ).all()

    if not rows:
        return []

    students = [user for user, _ in rows]
    membership_by_student = {m.student_id: m for _, m in rows}
    student_ids = [s.id for s in students]
    total_objectives = LearningObjective.query.count() or 1

    # 1) จำนวนครั้งที่กด Run และถาม AI — นับรวมทีเดียวทั้งห้อง
    action_counts = {}
    rows = db.session.query(
        ActivityLog.user_id,
        ActivityLog.action_type,
        func.count(ActivityLog.id),
    ).filter(
        ActivityLog.user_id.in_(student_ids),
        ActivityLog.action_type.in_(('RUN_CODE', 'ASK_AI')),
    ).group_by(ActivityLog.user_id, ActivityLog.action_type).all()
    for uid, action, n in rows:
        action_counts[(uid, action)] = n

    # 2) เวลาที่ใช้งานล่าสุดของแต่ละคน
    last_active_map = dict(
        db.session.query(
            ActivityLog.user_id,
            func.max(ActivityLog.created_at),
        ).filter(
            ActivityLog.user_id.in_(student_ids)
        ).group_by(ActivityLog.user_id).all()
    )

    # 3) จำนวนทักษะที่ผ่านแล้วของแต่ละคน
    completed_map = dict(
        db.session.query(
            StudentObjectiveProgress.student_id,
            func.count(StudentObjectiveProgress.id),
        ).filter(
            StudentObjectiveProgress.student_id.in_(student_ids),
            StudentObjectiveProgress.status == 'COMPLETED',
        ).group_by(StudentObjectiveProgress.student_id).all()
    )

    # 4) สถานะ tutorial ของแต่ละคน
    tutorial_map = {
        tp.user_id: tp
        for tp in TutorialProgress.query.filter(
            TutorialProgress.user_id.in_(student_ids)
        ).all()
    }

    # 5) ภารกิจโฟกัสของห้องนี้ + ดาวที่เก็บได้จริง — 2 query คงที่ ไม่วนต่อคน
    #    ผู้ดูแลต้องเห็นว่าใครถูกเล็งไว้แล้ว จะได้ไม่เล็งซ้ำหรือทับของตัวเอง
    focus_by_student = {
        f.student_id: f
        for f in SkillFocus.query.filter(
            SkillFocus.student_id.in_(student_ids),
            SkillFocus.classroom_id == classroom_id,
            SkillFocus.status == 'ACTIVE',
        ).all()
    }
    focus_stars = {}
    if focus_by_student:
        wanted = {(f.student_id, f.objective_id) for f in focus_by_student.values()}
        rows = StudentObjectiveProgress.query.filter(
            StudentObjectiveProgress.student_id.in_([s for s, _ in wanted]),
            StudentObjectiveProgress.objective_id.in_([o for _, o in wanted]),
        ).all()
        for row in rows:
            threshold = (row.objective.mastery_threshold if row.objective else 3) or 3
            focus_stars[(row.student_id, row.objective_id)] = (
                threshold if row.status == 'COMPLETED'
                else min(row.clean_run_count or 0, threshold)
            )

    # 6) จำนวนภารกิจของห้องนี้ที่แต่ละคนส่งแล้ว — query เดียว
    submitted_map = dict(
        db.session.query(
            AssignmentSubmission.student_id,
            func.count(AssignmentSubmission.id),
        ).join(Assignment, Assignment.id == AssignmentSubmission.assignment_id).filter(
            Assignment.classroom_id == classroom_id,
            AssignmentSubmission.student_id.in_(student_ids),
        ).group_by(AssignmentSubmission.student_id).all()
    )

    # 7) ด่านที่แต่ละคนอยู่บนแผนที่ (ทักษะแรกที่ดาวยังไม่ครบ) — คอลัมน์ "ตอนนี้" ของหน้าผู้สอน
    level_objs = [o for o in LearningObjective.query.order_by(LearningObjective.id).all()
                  if o.name in DETECTABLE_SKILLS]
    runs = {(r.student_id, r.objective_id): (r.clean_run_count or 0, r.status)
            for r in StudentObjectiveProgress.query.filter(
                StudentObjectiveProgress.student_id.in_(student_ids)).all()}

    def _level_of(sid):
        for i, o in enumerate(level_objs):
            n, st = runs.get((sid, o.id), (0, None))
            if st != 'COMPLETED' and n < (o.mastery_threshold or 3):
                return i, o.name
        return (len(level_objs) - 1, level_objs[-1].name) if level_objs else (0, None)

    # เกณฑ์ "ตามหลังห้อง" เทียบกับค่าเฉลี่ยของห้องเอง ไม่ใช่เลขตายตัว
    # ห้องที่เพิ่งเริ่มเรียนทุกคนได้ 0 เท่ากัน — ไม่ควรมีใครโดนตราหน้าว่าตามหลัง
    room_avg_skills = (sum(completed_map.get(s.id, 0) for s in students) / len(students))
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    students_data = []
    for student in students:
        sid = student.id

        last_active_dt = last_active_map.get(sid)
        obj_completed = completed_map.get(sid, 0)

        # --- สัญญาณว่าควรเข้าไปดูเด็กคนนี้ ---
        # ผู้ดูแลเปิดห้อง 35 คนแล้วไล่อ่านทีละแถวไม่ไหว ระบบต้องชี้ให้ว่าใครก่อน
        days_idle = (now_utc - last_active_dt).days if last_active_dt else None
        attention = []
        if last_active_dt is None:
            attention.append('ยังไม่เคยเข้าใช้เลย')
        elif days_idle >= 7:
            attention.append(f'หายไป {days_idle} วัน')
        if room_avg_skills >= 1 and obj_completed < room_avg_skills - 1:
            attention.append('ทักษะตามหลังห้อง')

        tutorial = tutorial_map.get(sid)
        tutorial_status = 'not_started'
        if tutorial:
            if tutorial.is_completed:
                tutorial_status = 'completed'
            elif tutorial.skipped:
                tutorial_status = 'skipped'
            elif (tutorial.last_step_seen or 0) > 0:
                tutorial_status = 'in_progress'

        membership = membership_by_student.get(sid)
        students_data.append({
            'id': sid,
            'username': student.username,
            'display_name': student.display_name,
            'student_no': membership.student_no if membership else None,
            'joined_at': membership.joined_at.isoformat() if membership and membership.joined_at else None,
            'last_active': last_active_dt.isoformat() if last_active_dt else None,
            'run_count': action_counts.get((sid, 'RUN_CODE'), 0),
            'ai_count': action_counts.get((sid, 'ASK_AI'), 0),
            'skill_progress': round(obj_completed * 100 / total_objectives),
            'objectives_completed': obj_completed,
            'tutorial_status': tutorial_status,
            'days_idle': days_idle,
            'submitted_count': submitted_map.get(sid, 0),
            'level_index': _level_of(sid)[0],
            'level_name': _level_of(sid)[1],
            'attention': attention,
            'focus': (
                focus_by_student[sid].to_dict(
                    earned_stars=focus_stars.get(
                        (sid, focus_by_student[sid].objective_id), 0))
                if sid in focus_by_student else None
            ),
        })

    return students_data


def _skill_overview_for_students(student_ids):
    """Aggregate objective progress across a set of students.

    query เดียวจบ — เดิมยิง 2 query ต่อทักษะหนึ่งอัน (ทักษะ 10 อัน = 20 query)
    """
    objectives = LearningObjective.query.all()

    counts = {}
    if student_ids:
        rows = db.session.query(
            StudentObjectiveProgress.objective_id,
            StudentObjectiveProgress.status,
            func.count(StudentObjectiveProgress.id),
        ).filter(
            StudentObjectiveProgress.student_id.in_(student_ids)
        ).group_by(
            StudentObjectiveProgress.objective_id,
            StudentObjectiveProgress.status,
        ).all()
        for objective_id, status, n in rows:
            counts[(objective_id, status)] = n

    overview = []
    for obj in objectives:
        mastered = counts.get((obj.id, 'COMPLETED'), 0)
        in_progress = counts.get((obj.id, 'IN_PROGRESS'), 0)
        overview.append({
            'name': obj.name,
            'mastered': mastered,
            'in_progress': in_progress,
            'not_started': max(len(student_ids) - mastered - in_progress, 0),
        })
    return overview


# ====================================================================
# UNIFIED DASHBOARD (universal user)
# ====================================================================

# 1. GET /api/dashboard — everything in one call
@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def unified_dashboard():
    """
    Dashboard สำหรับ universal user:
      - ส่วนตัว: stats, projects, achievements, skills, grades, activity chart (ทุกคน)
      - ห้องที่เข้าร่วม (joined_classrooms)
      - ห้องที่ตัวเองสร้าง (owned_classrooms) + ข้อมูลผู้ดูแล (students, teacher_stats,
        skill_overview) — เฉพาะเมื่อเป็นเจ้าของห้องอย่างน้อย 1 ห้อง
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    uid = user.id

    # ---------- Personal section (everyone) ----------
    stats = {
        'run_count': _activity_count(uid, 'RUN_CODE'),
        # ผลรวมจำนวนบล็อกจริง ไม่ใช่จำนวนครั้งที่กดรัน (ข้อ 3.8)
        'block_count': _activity_sum(uid, 'BLOCK_COUNT'),
        'ai_count': _activity_count(uid, 'ASK_AI'),
        'project_count': db.session.query(func.count(Project.id)).filter(
            Project.user_id == uid
        ).scalar() or 0,
    }

    recent_projects = Project.query.filter_by(user_id=uid).order_by(
        Project.updated_at.desc()
    ).limit(5).all()
    projects = [{
        'id': p.id,
        'title': p.title,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None,
    } for p in recent_projects]

    # Achievements (with unlock date)
    all_defs = AchievementDefinition.query.all()
    unlocked_map = {
        ua.achievement_id: ua.unlocked_at
        for ua in UserAchievement.query.filter_by(user_id=uid).all()
    }
    achievements = []
    for d in all_defs:
        item = d.to_dict()
        item['unlocked'] = d.id in unlocked_map
        ts = unlocked_map.get(d.id)
        item['unlocked_at'] = ts.isoformat() if ts else None
        achievements.append(item)

    # Skills / objectives
    all_objectives = LearningObjective.query.all()
    progress_map = {
        sp.objective_id: sp
        for sp in StudentObjectiveProgress.query.filter_by(student_id=uid).all()
    }
    skills = []
    for obj in all_objectives:
        prog = progress_map.get(obj.id)
        skills.append({
            'id': obj.id,
            'name': obj.name,
            'description': obj.description,
            'category': obj.category,
            'status': _status_key(prog.status if prog else 'NOT_STARTED'),
            # --- ตัวเลขที่หน้าเกมเอาไปแปลงเป็นดาว ---
            # clean_run_count / mastery_threshold มีในฐานข้อมูลอยู่แล้ว (ข้อ 4.4, 4.5)
            # แต่เดิมถูกตัดทิ้งตรงนี้ หน้าเว็บเลยรู้แค่ผ่าน/ไม่ผ่าน บอกไม่ได้ว่า "เหลืออีกกี่ครั้ง"
            # ฝั่งเด็กแสดงเป็นดาว ฝั่งผู้ดูแลแสดงเป็น 2/3 — ตัวเลขเดียวกัน คนละการนำเสนอ
            'clean_run_count': prog.clean_run_count if prog else 0,
            'mastery_threshold': obj.mastery_threshold or 3,
            'mastered_at': prog.mastered_at.isoformat() if prog and prog.mastered_at else None,
            'first_progress_at': (
                prog.first_progress_at.isoformat() if prog and prog.first_progress_at else None
            ),
            # False = ระบบตรวจให้เองไม่ได้ ต้องรอผู้ดูแลกดให้ (ตอนนี้มีแค่ Decomposition)
            # หน้าเกมใช้ค่านี้แยกการ์ด จะได้ไม่โชว์ดาวที่ค้าง 0/3 ตลอดกาลเฉยๆ
            'auto_detectable': obj.name in DETECTABLE_SKILLS,
        })

    # Grades received (enrich with project title + teacher name + ห้องที่ให้คะแนน)
    # classroom_id มาจาก to_dict() แล้ว — หน้าห้องใช้กรองเอาเฉพาะคะแนนของห้องนั้น
    # ส่วนคะแนนที่ classroom_id เป็น NULL (ให้ตรงๆ ไม่ผ่านการส่งงาน) ไปอยู่หน้าโปรไฟล์
    grades = []
    for g in Grade.query.filter_by(student_id=uid).order_by(Grade.created_at.desc()).all():
        item = g.to_dict()
        item['project_title'] = g.project.title if g.project else None
        item['teacher_name'] = g.teacher.display_name if g.teacher else None
        item['classroom_name'] = g.classroom.name if g.classroom else None
        grades.append(item)

    activity = _activity_chart(uid, 7)

    # ---------- Joined classrooms + ภารกิจที่ได้รับ ----------
    joined = []
    my_assignments = []
    now_naive = _now_naive()
    for m in _active_members(student_id=uid).all():
        c = m.classroom
        if not c or not c.is_active:
            continue
        joined.append({
            'id': c.id,
            'name': c.name,
            'teacher_name': c.teacher.display_name if c.teacher else '-',
            'joined_at': m.joined_at.isoformat() if m.joined_at else None,
            'student_no': m.student_no,
            'academic_year': c.academic_year,
            'semester': c.semester,
            'room_mode': c.room_mode or 'graded',
            'invite_code': c.invite_code if (c.room_mode or 'graded') == 'equal' else None,
            'member_count': _active_members(classroom_id=c.id).count(),
        })
        # ภารกิจของห้องนี้ + สถานะการส่งของฉัน
        for a in Assignment.query.filter_by(classroom_id=c.id).order_by(Assignment.created_at.desc()).all():
            item = a.to_dict()
            item['classroom_name'] = c.name
            sub = AssignmentSubmission.query.filter_by(
                assignment_id=a.id, student_id=uid
            ).first()
            item['submitted'] = sub is not None
            item['submitted_at'] = sub.submitted_at.isoformat() if sub else None
            item['submitted_project_id'] = sub.project_id if sub else None
            item['submission_id'] = sub.id if sub else None
            item['attempt_no'] = sub.attempt_no if sub else 0
            item['is_late'] = bool(sub.is_late) if sub else False
            item['grade'] = _grade_for_submission(sub)
            # เหลือเวลาอีกเท่าไร / เลยกำหนดหรือยัง (ข้อ 3.1)
            item['overdue'] = bool(a.due_date and not sub and now_naive > a.due_date)
            # ภารกิจข้อนี้ตั้งใจให้ฝึกทักษะอะไร — ใช้บอกว่า "ห้องนี้กำลังฝึกอะไร"
            # ซึ่งเป็นข้อมูลของห้องจริงๆ ต่างจากดาวที่เป็นของสมาชิกรายคน
            item['target_skills'] = skills_for_goal(a.goal_dict())
            # เกณฑ์ผ่านที่เด็กควรเห็นตั้งแต่ตอนทำ ไม่ใช่รู้ตอนโดนตีกลับ
            # เดิมส่งให้เฉพาะฝั่งผู้ดูแล เด็กจึงไม่มีทางรู้ว่ายังขาดอะไร
            item['goal'] = a.goal_dict()
            my_assignments.append(item)

    # ---------- Owned classrooms (teacher section) ----------
    owned_rooms = ClassRoom.query.filter_by(teacher_id=uid).order_by(
        ClassRoom.is_active.desc(), ClassRoom.created_at.desc()
    ).all()
    owned = []
    for c in owned_rooms:
        item = c.to_dict()
        item['student_count'] = _active_members(classroom_id=c.id).count()
        owned.append(item)
        # ห้องแบบทุกคนเท่ากัน: เจ้าของห้องเล่นโจทย์ท้าเหมือนสมาชิก จึงต้องเห็นโจทย์ในรายการภารกิจของตัวเองด้วย
        if c.is_active and (c.room_mode or 'graded') == 'equal':
            for a in Assignment.query.filter_by(classroom_id=c.id).order_by(Assignment.created_at.desc()).all():
                a_item = a.to_dict()
                a_item['classroom_name'] = c.name
                sub = AssignmentSubmission.query.filter_by(assignment_id=a.id, student_id=uid).first()
                a_item['submitted'] = sub is not None
                a_item['submitted_at'] = sub.submitted_at.isoformat() if sub else None
                a_item['submitted_project_id'] = sub.project_id if sub else None
                a_item['submission_id'] = sub.id if sub else None
                a_item['attempt_no'] = sub.attempt_no if sub else 0
                a_item['is_late'] = False
                a_item['grade'] = None
                a_item['overdue'] = False
                a_item['target_skills'] = skills_for_goal(a.goal_dict())
                a_item['goal'] = a.goal_dict()
                my_assignments.append(a_item)

    teacher_data = None
    if owned_rooms:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # Selected classroom (query param or first) — เลือกห้องที่ยังเปิดอยู่ก่อน
        selected_id = request.args.get('classroom_id', type=int)
        if not selected_id or selected_id not in [c.id for c in owned_rooms]:
            active_rooms = [c for c in owned_rooms if c.is_active]
            selected_id = (active_rooms or owned_rooms)[0].id

        # นับเฉพาะสมาชิกของ "ห้องที่เลือกอยู่" ให้ตรงกับรายชื่อสมาชิกที่แสดงข้างล่าง
        # เดิมนับรวมทุกห้องที่เป็นเจ้าของ — ผู้ดูแลที่มีหลายห้องจะเห็นตัวเลขบนหัวไม่ตรงกับรายชื่อในห้อง
        sids = [m.student_id for m in _active_members(classroom_id=selected_id).all()]

        def _count_today(action_type=None):
            if not sids:
                return 0
            q = db.session.query(func.count(ActivityLog.id)).filter(
                ActivityLog.user_id.in_(sids),
                ActivityLog.created_at >= today_start,
            )
            if action_type:
                q = q.filter(ActivityLog.action_type == action_type)
            return q.scalar() or 0

        active_today = 0
        if sids:
            active_today = db.session.query(
                func.count(func.distinct(ActivityLog.user_id))
            ).filter(
                ActivityLog.user_id.in_(sids),
                ActivityLog.created_at >= today_start,
            ).scalar() or 0

        # ภารกิจที่มอบไปแล้ว (ทุกห้องที่เป็นเจ้าของ) + จำนวนงานที่ส่งเข้ามา
        teacher_assignments = []
        for c in owned_rooms:
            room_students = _active_members(classroom_id=c.id).count()
            for a in Assignment.query.filter_by(classroom_id=c.id).order_by(Assignment.created_at.desc()).all():
                item = a.to_dict()
                item['classroom_name'] = c.name
                item['submission_count'] = AssignmentSubmission.query.filter_by(
                    assignment_id=a.id
                ).count()
                item['late_count'] = AssignmentSubmission.query.filter_by(
                    assignment_id=a.id, is_late=True
                ).count()
                # รอตรวจ = งานส่งที่ยังไม่มีคะแนน หรือเด็กส่งใหม่หลังครูให้คะแนนไปแล้ว
                ungraded = 0
                for sub in AssignmentSubmission.query.filter_by(assignment_id=a.id).all():
                    g = Grade.query.filter_by(submission_id=sub.id).first()
                    if not g or (g.updated_at and sub.submitted_at and sub.submitted_at > g.updated_at):
                        ungraded += 1
                item['ungraded_count'] = ungraded
                item['overdue'] = bool(a.due_date and now_naive > a.due_date)
                item['total_students'] = room_students
                teacher_assignments.append(item)

        teacher_data = {
            'stats': {
                'total_students': len(sids),
                'active_today': active_today,
                'runs_today': _count_today('RUN_CODE'),
                'ai_today': _count_today('ASK_AI'),
            },
            'selected_classroom_id': selected_id,
            'students': _get_classroom_students_with_stats(selected_id),
            'skill_overview': _skill_overview_for_students(sids),
            'assignments': teacher_assignments,
        }

    return jsonify({
        'user': user.to_dict(),
        'stats': stats,
        'projects': projects,
        'achievements': achievements,
        'skills': skills,
        'grades': grades,
        'activity': activity,
        'joined_classrooms': joined,
        'owned_classrooms': owned,
        'assignments': my_assignments,
        'teacher': teacher_data,
        # ภารกิจที่กำลังเก็บ — ส่วนตัว (classroom_id ว่าง) + ของแต่ละห้องที่ผู้ดูแลเล็งให้
        'focuses': _active_focuses(user.id),
        # เหตุผลให้กลับมาพรุ่งนี้ — เลขสะสมที่ไม่มีวันหาย + ภารกิจประจำวัน
        # จงใจไม่ใช้ streak รายวันแบบ Duolingo เพราะเด็กเรียนคาบเดียวต่อสัปดาห์
        # streak จะขาดตั้งแต่วันที่สองแล้วกลายเป็นการลงโทษ
        'days_played': _days_played(user.id),
        'daily_quest': _daily_quest(user.id),
    }), 200


# ====================================================================
# SKILL AUTO-DETECT
# ====================================================================

# POST /api/skills/auto — เว็บเรียกหลัง "รันสะอาด" (ผ่าน validation ไม่มี error)
@dashboard_bp.route('/skills/auto', methods=['POST'])
@jwt_required()
def skills_auto():
    """
    อัปเดตความคืบหน้าทักษะอัตโนมัติจากบล็อกที่ใช้ในรันที่ไม่มี error:
      - รันสะอาดครั้งแรกที่ใช้ทักษะ  → IN_PROGRESS (กำลังเรียน)
      - รันสะอาดครบ 3 ครั้ง          → COMPLETED (เชี่ยวชาญ)
    กติกา:
      - ไม่แตะทักษะที่ผู้ดูแล override เอง (updated_by_teacher_id ไม่ว่าง)
      - ไม่ลดสถานะลง (COMPLETED คงอยู่ตลอด)
      - กันปั๊มคะแนน: ทักษะเดิมนับซ้ำได้ไม่เกิน 1 ครั้ง/นาที

    Body JSON (อย่างใดอย่างหนึ่ง):
      - project_id  : โปรเจกต์ของตัวเอง — เซิร์ฟเวอร์อ่าน blockly_xml ที่บันทึกไว้
      - blockly_xml : ผังบล็อกของงานที่เพิ่งรัน (กรณียังไม่ได้บันทึกเป็นโปรเจกต์)

    **ไม่รับรายชื่อทักษะจาก client อีกต่อไป** — เซิร์ฟเวอร์อ่านบล็อกจริงแล้วตัดสินเอง
    เดิมยิง {"skills": ["Loops"]} ซ้ำๆ ก็ได้ "เชี่ยวชาญ Loops" ทั้งที่ไม่เคยลากบล็อก loop
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    blockly_xml = None
    evidence_project_id = None
    project_id = data.get('project_id')
    if project_id:
        project = Project.query.get(int(project_id))
        if not project or project.user_id != user.id:
            return jsonify({'error': 'Project not found'}), 404
        blockly_xml = project.blockly_xml
        evidence_project_id = project.id
    elif isinstance(data.get('blockly_xml'), str):
        blockly_xml = data['blockly_xml'][:200000]  # กันส่งก้อนใหญ่ผิดปกติ

    if not blockly_xml:
        return jsonify({'error': 'project_id หรือ blockly_xml อย่างใดอย่างหนึ่ง'}), 400

    now = datetime.now(timezone.utc)
    now_naive = _now_naive()

    # Debugging ต้องพิสูจน์จาก log ของเซิร์ฟเวอร์เอง ไม่ใช่เชื่อ flag ที่ client ส่งมา
    previous_run_had_errors = _last_run_had_errors(user.id, before=now)

    # ปลดล็อกหน้าหุ่นที่เด็กใช้จริงในงานนี้ — ทำก่อนเช็คทักษะ
    # เพราะแม้จะยังไม่เข้าเกณฑ์ทักษะไหนเลย การได้หน้าใหม่ก็ควรนับ
    newly_unlocked = _unlock_faces_from(user, blockly_xml)

    detected = detect_skills(blockly_xml, previous_run_had_errors=previous_run_had_errors)
    if not detected:
        db.session.commit()
        return jsonify({'results': [], 'newly_unlocked_faces': newly_unlocked}), 200

    # บล็อกจริงบอกว่ามี loop → นับ LOOP_USAGE ให้เอง (เดิม client เป็นคนยิง จึงปั๊มได้)
    if 'Loops' in detected:
        _log_derived_activity(user.id, 'LOOP_USAGE', now, {'source': 'workspace'})
    if 'Debugging' in detected:
        _log_derived_activity(user.id, 'ERRORS_FIXED', now, {'source': 'workspace'})

    results = []

    for name in detected:
        objective = LearningObjective.query.filter_by(name=name).first()
        if not objective:
            continue

        action_type = f'SKILL:{objective.name}'[:50]

        # กันปั๊ม: ข้ามถ้าทักษะนี้เพิ่งถูกนับภายใน 60 วินาที
        recent = ActivityLog.query.filter(
            ActivityLog.user_id == user.id,
            ActivityLog.action_type == action_type,
            ActivityLog.created_at >= now - timedelta(seconds=60),
        ).first()
        if recent:
            continue

        # บันทึกการใช้ทักษะครั้งนี้
        db.session.add(ActivityLog(user_id=user.id, action_type=action_type))
        db.session.flush()

        clean_runs = _activity_count(user.id, action_type)

        progress = StudentObjectiveProgress.query.filter_by(
            student_id=user.id, objective_id=objective.id
        ).first()

        # ผู้ดูแล override แล้ว → ระบบอัตโนมัติไม่แตะ
        if progress and progress.updated_by_teacher_id:
            continue

        old_status = progress.status if progress else 'NOT_STARTED'
        # เกณฑ์มาจากคอลัมน์ ไม่ใช่เลข 3 ที่ฝังในโค้ด (ข้อ 4.5)
        threshold = objective.mastery_threshold or 3
        new_status = 'COMPLETED' if clean_runs >= threshold else 'IN_PROGRESS'

        # ไม่ลดสถานะ
        if old_status == 'COMPLETED':
            new_status = 'COMPLETED'

        if not progress:
            progress = StudentObjectiveProgress(
                student_id=user.id,
                objective_id=objective.id,
                status=new_status,
                first_progress_at=now_naive,
            )
            db.session.add(progress)
        else:
            progress.status = new_status
            if progress.first_progress_at is None:
                progress.first_progress_at = now_naive

        # มิติเวลา (ข้อ 4.4) — ตอบได้ว่าผ่านทักษะนี้ "เมื่อไหร่"
        progress.clean_run_count = clean_runs
        progress.changed_by = 'AUTO'
        progress.updated_at = now_naive
        progress.evidence_project_id = evidence_project_id
        newly_completed = old_status != 'COMPLETED' and new_status == 'COMPLETED'
        if newly_completed:
            progress.mastered_at = now_naive

        if old_status != new_status:
            db.session.add(ObjectiveProgressHistory(
                student_id=user.id,
                objective_id=objective.id,
                old_status=old_status,
                new_status=new_status,
                clean_run_count=clean_runs,
                changed_by='AUTO',
                evidence_project_id=evidence_project_id,
                changed_at=now_naive,
            ))
            record_event(
                'skill.mastered' if newly_completed else 'skill.demonstrated',
                user.id,
                subject_type='objective', subject_id=objective.id,
                payload={'clean_run_index': clean_runs,
                         'mastery_threshold': threshold,
                         'old_status': old_status, 'new_status': new_status},
            )

        # --- โฟกัสถึงเป้าหรือยัง ---
        # วัดจาก clean_runs ซึ่งเป็นตัวนับกลางของ user ไม่ใช่ของห้อง
        # เด็กฝึกในเวิร์กสเปซตอนไหนก็นับ ไม่ต้องอยู่ในห้องของผู้ดูแลที่เล็งไว้
        # เด็กอยู่หลายห้อง ผู้ดูแลหลายคนเล็งทักษะเดียวกันได้ -> ปิดจ็อบให้ทุกอันพร้อมกัน
        reached_focuses = SkillFocus.query.filter(
            SkillFocus.student_id == user.id,
            SkillFocus.objective_id == objective.id,
            SkillFocus.status == 'ACTIVE',
            SkillFocus.target_stars <= clean_runs,
        ).all()
        for focus in reached_focuses:
            focus.status = 'REACHED'
            focus.reached_at = now_naive
            record_event(
                'focus.reached', user.id,
                subject_type='objective', subject_id=objective.id,
                payload={'focus_id': focus.id, 'classroom_id': focus.classroom_id,
                         'target_stars': focus.target_stars, 'clean_runs': clean_runs,
                         'source': focus.source},
            )

        results.append({
            'name': objective.name,
            'status': _status_key(new_status),
            'clean_runs': clean_runs,
            'mastery_threshold': threshold,
            'newly_completed': newly_completed,
            'focus_reached': [f.to_dict(earned_stars=clean_runs) for f in reached_focuses],
        })

    try:
        db.session.commit()
    except IntegrityError:
        # อีก request สร้างแถวสถานะทักษะเดียวกันไปก่อนแล้ว — unique constraint กันซ้ำให้
        db.session.rollback()
        return jsonify({'results': results, 'newly_unlocked_faces': newly_unlocked}), 200

    return jsonify({'results': results, 'newly_unlocked_faces': newly_unlocked}), 200


# GET /api/faces — หน้าหุ่นทั้งหมด + อันที่ปลดล็อกแล้ว + อันที่เลือกอยู่
@dashboard_bp.route('/faces', methods=['GET'])
@jwt_required()
def list_faces():
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'ไม่พบผู้ใช้'}), 404
    unlocked = set(user.unlocked_face_list())
    return jsonify({
        'faces': [
            {'key': k, 'label': label, 'unlocked': k in unlocked}
            for k, label in FACE_BLOCKS
        ],
        'chosen': user.chosen_face(),
    }), 200


# PUT /api/faces/chosen — เลือกหน้าที่ปลดล็อกแล้วเป็นรูปโปรไฟล์
@dashboard_bp.route('/faces/chosen', methods=['PUT'])
@jwt_required()
def choose_face():
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'ไม่พบผู้ใช้'}), 404

    data = request.get_json() or {}
    key = (data.get('face') or '').strip()

    # ล้างรูปโปรไฟล์ = กลับไปใช้ตัวอักษรแรกของชื่อ
    if not key:
        if user.avatar_url and user.avatar_url.startswith('face:'):
            user.avatar_url = None
        db.session.commit()
        return jsonify({'chosen': None}), 200

    if key not in _FACE_KEYS:
        return jsonify({'error': 'ไม่รู้จักหน้านี้'}), 400
    if key not in set(user.unlocked_face_list()):
        return jsonify({'error': 'ยังไม่ได้ปลดล็อกหน้านี้ — ลองใช้บล็อกนี้ในงานแล้วกด Run ดูนะ'}), 403

    user.avatar_url = 'face:' + key
    db.session.commit()
    return jsonify({'chosen': key}), 200


# GET /api/classrooms/<id>/map — เพื่อนในห้องอยู่ด่านไหนกันบ้าง
#
# ตั้งใจให้ "ไม่มีชื่อ ไม่มีอันดับ" — คืนแค่จำนวนคนต่อด่าน
# เหตุผล: ห้อง 40 คนคละพื้นฐานหนัก การเรียงอันดับจะฆ่าเด็กครึ่งล่างภายใน 5 นาที
#        แต่การ "รู้ว่ามีคนอยู่แถวนี้ด้วย" ทำให้ไม่รู้สึกเล่นคนเดียว
# เด็กเห็นแค่หมุดเล็ก ๆ ว่าแถวนี้มีเพื่อนกี่คน ไม่รู้ว่าใครและไม่รู้ว่าใครนำใคร
@dashboard_bp.route('/classrooms/<int:classroom_id>/map', methods=['GET'])
@jwt_required()
def classroom_map(classroom_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'ไม่พบผู้ใช้'}), 404

    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom:
        return jsonify({'error': 'ไม่พบห้อง'}), 404

    # ต้องเป็นคนในห้อง (สมาชิกหรือผู้ดูแลเจ้าของ) ถึงจะดูได้
    is_member = ClassMembership.query.filter_by(
        classroom_id=classroom_id, student_id=user.id, status='ACTIVE').first()
    if not is_member and classroom.teacher_id != user.id:
        return jsonify({'error': 'ไม่มีสิทธิ์ดูห้องนี้'}), 403

    objectives = LearningObjective.query.order_by(LearningObjective.id).all()
    if not objectives:
        return jsonify({'nodes': [], 'total_students': 0}), 200
    order = {o.id: i for i, o in enumerate(objectives)}

    members = ClassMembership.query.filter_by(
        classroom_id=classroom_id, status='ACTIVE').all()
    student_ids = [m.student_id for m in members]
    if not student_ids:
        return jsonify({'nodes': [0] * len(objectives), 'total_students': 0}), 200

    # ดึงสถานะทุกคนทีเดียว ไม่วนยิงทีละคน (ห้อง 40 คน = 1 query ไม่ใช่ 40)
    rows = StudentObjectiveProgress.query.filter(
        StudentObjectiveProgress.student_id.in_(student_ids),
        StudentObjectiveProgress.status == 'COMPLETED',
    ).all()
    done_by_student = {}
    for r in rows:
        done_by_student.setdefault(r.student_id, set()).add(r.objective_id)

    counts = [0] * len(objectives)
    for sid in student_ids:
        done = done_by_student.get(sid, set())
        # ด่านปัจจุบัน = ด่านแรกที่ยังไม่ครบ · ครบหมดแล้วให้ยืนที่ด่านสุดท้าย
        idx = next((order[o.id] for o in objectives if o.id not in done), len(objectives) - 1)
        counts[idx] += 1

    return jsonify({
        'nodes': counts,
        'total_students': len(student_ids),
        'my_index': next(
            (order[o.id] for o in objectives
             if o.id not in done_by_student.get(user.id, set())),
            len(objectives) - 1),
    }), 200


# ====================================================================
# SKILL FOCUS — "ตอนนี้กำลังเก็บทักษะไหน"
# ====================================================================
#
# ไม่ล็อกด่าน ไม่บังคับลำดับ ทุกทักษะยังฝึกได้อิสระเหมือนเดิม
# ตารางนี้แค่ปักหมุดว่าเล็งอันไหน เพื่อให้แผนที่ชี้ทางได้และแชทบอทเชียร์ถูกเรื่อง
#
# ขอบเขต = ห้อง: เด็กอยู่หลายห้อง ผู้ดูแลแต่ละคนเล็งคนละทักษะได้โดยไม่ทับกัน
#                classroom_id = NULL คือโฟกัสส่วนตัวที่เด็กตั้งเองจากแดชบอร์ดผู้ใช้
# ความคืบหน้า  = ตัวนับกลาง: เด็กฝึกในเวิร์กสเปซตอนไหนก็นับ ไม่ต้องอยู่ในห้อง


def _earned_stars_map(student_id):
    """objective_id -> จำนวนดาวที่เก็บได้จริง (ตัวนับกลาง)"""
    rows = StudentObjectiveProgress.query.filter_by(student_id=student_id).all()
    out = {}
    for row in rows:
        threshold = (row.objective.mastery_threshold if row.objective else 3) or 3
        out[row.objective_id] = (
            threshold if row.status == 'COMPLETED' else min(row.clean_run_count or 0, threshold)
        )
    return out


def _active_focuses(student_id):
    """โฟกัสที่ยังทำอยู่ทั้งหมดของเด็กคนนี้ (ส่วนตัว + ของแต่ละห้อง)"""
    rows = SkillFocus.query.filter_by(student_id=student_id, status='ACTIVE').all()
    stars = _earned_stars_map(student_id)
    return [f.to_dict(earned_stars=stars.get(f.objective_id, 0)) for f in rows]


# ทักษะที่ "เด่น" ของภารกิจ — Sequencing ติดมากับภารกิจเกือบทุกข้อ จึงไม่ใช่คำตอบที่มีประโยชน์
# เรียงจากเฉพาะเจาะจงไปหากว้าง แล้วหยิบตัวแรกที่ภารกิจนั้นมี
_SKILL_SPECIFICITY = (
    'Loops', 'Conditionals', 'Variables', 'Pattern Recognition',
    'Robot Arms & Gripper', 'Robot Expressions', 'Robot Motion',
    'Debugging', 'Sequencing',
)


def _primary_skill(names):
    for candidate in _SKILL_SPECIFICITY:
        if candidate in (names or []):
            return candidate
    return (names or [None])[0]


def _focus_in_room(student_id, classroom_id, teacher):
    """ภารกิจของเด็กคนนี้ในห้องที่ผู้ดูแลกำลังดูอยู่

    ไม่ระบุห้องมา ให้เดาจากห้องแรกของผู้ดูแลที่เด็กคนนี้อยู่ —
    ผู้ดูแลเปิดโมดัลจากหน้าโปรไฟล์ (ยังไม่ได้เลือกห้อง) ก็ต้องเห็นอะไรบ้าง
    ผู้ดูแลคนอื่นเล็งอะไรไว้ในห้องของเขาไม่เกี่ยวกับเรา จึงไม่ส่งมาให้
    """
    owned = _owned_classroom_ids(teacher)
    if not owned:
        return None
    if classroom_id and classroom_id in owned:
        room_ids = [classroom_id]
    else:
        room_ids = owned

    focus = SkillFocus.query.filter(
        SkillFocus.student_id == student_id,
        SkillFocus.classroom_id.in_(room_ids),
        SkillFocus.status == 'ACTIVE',
    ).first()
    if not focus:
        return None
    return focus.to_dict(
        earned_stars=_earned_stars_map(student_id).get(focus.objective_id, 0))


def _resolve_focus_target(objective, requested):
    """เป้าดาว 1-3 — ไม่ระบุก็ใช้เกณฑ์เชี่ยวชาญของทักษะนั้น"""
    if requested in (None, ''):
        return (objective.mastery_threshold or 3)
    try:
        target = int(requested)
    except (TypeError, ValueError):
        return None
    return target if 1 <= target <= 3 else None


def _set_focus(student_id, objective_id, classroom_id, target_stars, source,
               set_by_id=None, note=None):
    """ตั้งโฟกัสใหม่ในช่องของห้องนั้น — ของเดิมในช่องเดียวกันถูกยกเลิก

    คืน (focus, error_message)
    """
    objective = db.session.get(LearningObjective, objective_id)
    if not objective:
        return None, 'ไม่พบทักษะนี้'

    target = _resolve_focus_target(objective, target_stars)
    if target is None:
        return None, 'เป้าหมายต้องเป็น 1 ถึง 3 ดาว'

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # หนึ่งช่องมีโฟกัสที่ยังทำอยู่ได้อันเดียว — ของเดิมกลายเป็นประวัติ
    existing = SkillFocus.query.filter_by(
        student_id=student_id, classroom_id=classroom_id, status='ACTIVE'
    ).first()
    if existing:
        existing.status = 'CANCELLED'
        existing.cancelled_at = now

    focus = SkillFocus(
        student_id=student_id, objective_id=objective_id, classroom_id=classroom_id,
        target_stars=target, source=source, set_by_id=set_by_id,
        note=(note or '').strip()[:300] or None,
        status='ACTIVE', created_at=now,
    )
    db.session.add(focus)
    db.session.flush()

    # ตั้งเป้าที่เด็กทำถึงอยู่แล้ว -> ปิดจ็อบทันที ไม่ต้องรอให้รันอีกรอบ
    earned = _earned_stars_map(student_id).get(objective_id, 0)
    if earned >= target:
        focus.status = 'REACHED'
        focus.reached_at = now

    record_event(
        'focus.set', set_by_id or student_id,
        subject_type='objective', subject_id=objective_id,
        payload={'focus_id': focus.id, 'student_id': student_id,
                 'classroom_id': classroom_id, 'target_stars': target,
                 'source': source, 'earned_at_set': earned},
    )
    return focus, None


# GET /api/focus — โฟกัสที่ยังทำอยู่ทั้งหมดของฉัน
@dashboard_bp.route('/focus', methods=['GET'])
@jwt_required()
def list_my_focus():
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'focuses': _active_focuses(user.id)}), 200


# POST /api/focus — ฉันเลือกภารกิจของตัวเอง (ช่องส่วนตัว classroom_id = NULL)
@dashboard_bp.route('/focus', methods=['POST'])
@jwt_required()
def set_my_focus():
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    objective_id = data.get('objective_id')
    if not objective_id:
        return jsonify({'error': 'ต้องระบุทักษะที่จะโฟกัส'}), 400

    focus, error = _set_focus(
        student_id=user.id, objective_id=objective_id, classroom_id=None,
        target_stars=data.get('target_stars'), source='SELF',
    )
    if error:
        db.session.rollback()
        return jsonify({'error': error}), 400

    db.session.commit()
    stars = _earned_stars_map(user.id).get(focus.objective_id, 0)
    return jsonify({'focus': focus.to_dict(earned_stars=stars)}), 201


# DELETE /api/focus/<id> — ยกเลิกโฟกัส
@dashboard_bp.route('/focus/<int:focus_id>', methods=['DELETE'])
@jwt_required()
def cancel_focus(focus_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    focus = db.session.get(SkillFocus, focus_id)
    if not focus or focus.status != 'ACTIVE':
        return jsonify({'error': 'ไม่พบภารกิจที่กำลังทำอยู่'}), 404

    is_owner = focus.student_id == user.id
    # ผู้ดูแลมีสิทธิ์เฉพาะภารกิจ "ในห้องของตัวเอง" เท่านั้น
    # เดิมใช้ _user_teaches_student ซึ่งตอบแค่ "เด็กคนนี้อยู่ห้องใดห้องหนึ่งของเราไหม"
    # ผลคือเด็กอยู่ห้อง A+B แล้วผู้ดูแลห้อง A ยกเลิกภารกิจที่ผู้ดูแลห้อง B เล็งไว้ได้
    # และยกเลิกโฟกัสส่วนตัวของเด็ก (classroom_id ว่าง) ได้ด้วย
    # สิทธิ์ต้องอยู่ระดับ "ห้อง" ให้ตรงกับที่ข้อมูลสังกัด ไม่ใช่ระดับ "คน"
    is_teacher = (
        focus.classroom_id is not None
        and focus.classroom_id in _owned_classroom_ids(user)
    )
    if not is_owner and not is_teacher:
        return jsonify({'error': 'ไม่ใช่ภารกิจในห้องของคุณ'}), 403

    # ผู้ดูแลเล็งไว้ = เด็กปลดเองไม่ได้จนกว่าจะถึงเป้า — ผู้ดูแลเท่านั้นที่ยกเลิกให้ได้
    # (จุดนี้คือหัวใจของ "กำลังดำเนินการภารกิจนี้ เปลี่ยนไม่ได้")
    if focus.is_locked and not is_teacher:
        return jsonify({
            'error': 'ผู้ดูแลเป็นคนตั้งภารกิจนี้ ต้องเก็บให้ถึง '
                     f'{focus.target_stars} ดาวก่อนถึงจะเปลี่ยนได้'
        }), 403

    focus.status = 'CANCELLED'
    focus.cancelled_at = datetime.now(timezone.utc).replace(tzinfo=None)
    record_event('focus.cancelled', user.id,
                 subject_type='objective', subject_id=focus.objective_id,
                 payload={'focus_id': focus.id, 'student_id': focus.student_id,
                          'by_teacher': bool(is_teacher and not is_owner)})
    db.session.commit()
    return jsonify({'message': 'ยกเลิกภารกิจแล้ว'}), 200


# POST /api/students/<id>/focus — ผู้ดูแลเล็งภารกิจให้สมาชิกในห้องตัวเอง
# ไม่ใช่การสั่งงาน: ไม่มีงานให้ส่ง ไม่มีเดดไลน์ แค่บอกว่า "เอาอันนี้ก่อนนะ"
@dashboard_bp.route('/students/<int:student_id>/focus', methods=['POST'])
@jwt_required()
def set_student_focus(student_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not _user_teaches_student(user, student_id):
        return jsonify({'error': 'ไม่ใช่สมาชิกในห้องของคุณ'}), 403

    data = request.get_json() or {}
    objective_id = data.get('objective_id')
    classroom_id = data.get('classroom_id')
    if not objective_id:
        return jsonify({'error': 'ต้องระบุทักษะที่จะให้เน้น'}), 400
    if not classroom_id:
        return jsonify({'error': 'ต้องระบุห้อง — โฟกัสของผู้ดูแลสังกัดห้อง'}), 400

    # ผู้ดูแลเล็งได้เฉพาะในห้องของตัวเอง และเด็กต้องอยู่ในห้องนั้นจริง
    if int(classroom_id) not in _owned_classroom_ids(user):
        return jsonify({'error': 'ไม่ใช่ห้องของคุณ'}), 403
    member = ClassMembership.query.filter_by(
        classroom_id=classroom_id, student_id=student_id).first()
    if not member:
        return jsonify({'error': 'สมาชิกคนนี้ไม่ได้อยู่ในห้องนั้น'}), 400

    focus, error = _set_focus(
        student_id=student_id, objective_id=objective_id, classroom_id=int(classroom_id),
        target_stars=data.get('target_stars'), source='TEACHER',
        set_by_id=user.id, note=data.get('note'),
    )
    if error:
        db.session.rollback()
        return jsonify({'error': error}), 400

    db.session.commit()
    stars = _earned_stars_map(student_id).get(focus.objective_id, 0)
    return jsonify({'focus': focus.to_dict(earned_stars=stars)}), 201


# ====================================================================
# PROJECTS (universal user)
# ====================================================================

# 2. GET /api/projects — List user's projects (paginated)
@dashboard_bp.route('/projects', methods=['GET'])
@jwt_required()
def list_projects():
    """List authenticated user's projects, paginated, sorted by updated_at desc."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 100)  # cap

    pagination = Project.query.filter_by(user_id=user.id).order_by(
        Project.updated_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'projects': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


# 3. POST /api/projects — Save/update project
@dashboard_bp.route('/projects', methods=['POST'])
@jwt_required()
def save_project():
    """Create or update a project."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    project_id = data.get('id')
    title = (data.get('title') or 'Untitled Project').strip()
    blockly_xml = data.get('blockly_xml', '')
    generated_code = data.get('generated_code', '')

    previous_xml = None

    if project_id:
        # Update existing
        project = Project.query.get(project_id)
        if not project or project.user_id != user.id:
            return jsonify({'error': 'Project not found'}), 404
        previous_xml = project.blockly_xml
        project.title = title
        project.blockly_xml = blockly_xml
        project.generated_code = generated_code
        project.updated_at = _now_naive()
    else:
        # Create new
        project = Project(
            user_id=user.id,
            title=title,
            blockly_xml=blockly_xml,
            generated_code=generated_code,
        )
        db.session.add(project)

    db.session.flush()

    # เก็บเวอร์ชันไว้ทุกครั้งที่เนื้อหาเปลี่ยน (ข้อ 3.5)
    # เดิมการบันทึกเขียนทับแถวเดิม เด็กแก้งานแล้วพังจึงกู้กลับไม่ได้เลย
    version = _snapshot_project_version(project, previous_xml)

    record_event('project.saved' if project_id else 'project.created', user.id,
                 subject_type='project', subject_id=project.id,
                 payload={'block_count': _count_blocks(blockly_xml),
                          'version_no': version.version_no if version else None,
                          'title_length': len(title)})

    db.session.commit()

    # Saving projects can unlock PROJECTS_CREATED achievements
    _check_and_award_achievements(user.id)

    payload = project.to_dict()
    payload['version_no'] = version.version_no if version else None
    return jsonify({'project': payload}), 200 if project_id else 201


def _snapshot_project_version(project, previous_xml):
    """บันทึกเวอร์ชันใหม่ถ้าผังบล็อกเปลี่ยนจริง

    เก็บไม่เกิน MAX_PROJECT_VERSIONS เวอร์ชันล่าสุดต่อโปรเจกต์
    (ห้อง 35 คน × เซฟวันละหลายรอบ ถ้าเก็บไม่จำกัดฐานข้อมูลจะบวมเร็วมาก)
    """
    if previous_xml is not None and previous_xml == project.blockly_xml:
        return None   # กดเซฟซ้ำโดยไม่ได้แก้อะไร — ไม่ต้องเก็บเวอร์ชันซ้ำ

    last_no = db.session.query(func.coalesce(func.max(ProjectVersion.version_no), 0)).filter(
        ProjectVersion.project_id == project.id
    ).scalar() or 0

    version = ProjectVersion(
        project_id=project.id,
        version_no=last_no + 1,
        blockly_xml=project.blockly_xml,
        generated_code=project.generated_code,
        block_count=_count_blocks(project.blockly_xml),
    )
    db.session.add(version)
    db.session.flush()

    # ตัดเวอร์ชันเก่าที่เกินโควตาทิ้ง
    old_ids = [
        row[0] for row in db.session.query(ProjectVersion.id).filter(
            ProjectVersion.project_id == project.id
        ).order_by(ProjectVersion.version_no.desc()).offset(MAX_PROJECT_VERSIONS).all()
    ]
    if old_ids:
        ProjectVersion.query.filter(ProjectVersion.id.in_(old_ids)).delete(
            synchronize_session=False
        )

    return version


# 4. GET /api/projects/<id>
@dashboard_bp.route('/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get a single project (owner, or teacher of the owner)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    if project.user_id != user.id and not _user_teaches_student(user, project.user_id):
        return jsonify({'error': 'Project not found'}), 404

    return jsonify({'project': project.to_dict()}), 200


# GET /api/projects/<id>/versions — ประวัติเวอร์ชันของงาน (ข้อ 3.5)
@dashboard_bp.route('/projects/<int:project_id>/versions', methods=['GET'])
@jwt_required()
def project_versions(project_id):
    """รายการเวอร์ชันของโปรเจกต์ (เจ้าของ หรือผู้ดูแลของเจ้าของ)"""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    if project.user_id != user.id and not _user_teaches_student(user, project.user_id):
        return jsonify({'error': 'Project not found'}), 404

    versions = ProjectVersion.query.filter_by(project_id=project.id).order_by(
        ProjectVersion.version_no.desc()
    ).all()

    return jsonify({
        'project': {'id': project.id, 'title': project.title},
        'versions': [v.to_dict() for v in versions],
    }), 200


# GET /api/projects/<id>/versions/<version_id> — เนื้อหาของเวอร์ชันหนึ่ง
@dashboard_bp.route('/projects/<int:project_id>/versions/<int:version_id>', methods=['GET'])
@jwt_required()
def project_version_detail(project_id, version_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    if project.user_id != user.id and not _user_teaches_student(user, project.user_id):
        return jsonify({'error': 'Project not found'}), 404

    version = ProjectVersion.query.filter_by(id=version_id, project_id=project.id).first()
    if not version:
        return jsonify({'error': 'ไม่พบเวอร์ชันนี้'}), 404

    return jsonify({'version': version.to_dict(include_xml=True)}), 200


# POST /api/projects/<id>/versions/<version_id>/restore — กู้งานกลับ (เจ้าของเท่านั้น)
@dashboard_bp.route('/projects/<int:project_id>/versions/<int:version_id>/restore', methods=['POST'])
@jwt_required()
def restore_project_version(project_id, version_id):
    """ย้อนโปรเจกต์กลับไปเวอร์ชันก่อนหน้า

    ของปัจจุบันถูกเก็บเป็นเวอร์ชันใหม่ก่อนเสมอ — กู้แล้วยังกู้กลับได้อีก
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.get(project_id)
    if not project or project.user_id != user.id:
        return jsonify({'error': 'Project not found'}), 404

    version = ProjectVersion.query.filter_by(id=version_id, project_id=project.id).first()
    if not version:
        return jsonify({'error': 'ไม่พบเวอร์ชันนี้'}), 404

    previous_xml = project.blockly_xml
    project.blockly_xml = version.blockly_xml
    project.generated_code = version.generated_code
    project.updated_at = _now_naive()

    new_version = _snapshot_project_version(project, previous_xml)
    db.session.commit()

    return jsonify({
        'project': project.to_dict(),
        'restored_from': version.version_no,
        'version_no': new_version.version_no if new_version else None,
    }), 200


# 5. DELETE /api/projects/<id>
@dashboard_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project (must belong to the authenticated user)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    project = Project.query.get(project_id)
    if not project or project.user_id != user.id:
        return jsonify({'error': 'Project not found'}), 404

    # โปรเจกต์ที่ถูกให้คะแนนหรือถูกส่งเป็นงานแล้ว = หลักฐานทางการศึกษา ห้ามลบ
    # ก่อนหน้านี้ลบผ่านเงียบๆ บน SQLite แล้วเหลือคะแนนลอยที่ชี้ไปหาโปรเจกต์ที่ไม่มีแล้ว
    # ส่วนบน PostgreSQL จะเด้ง IntegrityError 500 ให้ผู้ใช้เห็นดิบๆ
    graded = db.session.query(func.count(Grade.id)).filter(
        Grade.project_id == project.id
    ).scalar() or 0
    submitted = db.session.query(func.count(AssignmentSubmission.id)).filter(
        AssignmentSubmission.project_id == project.id
    ).scalar() or 0

    if graded or submitted:
        reason = []
        if submitted:
            reason.append('ถูกส่งเป็นงานแล้ว')
        if graded:
            reason.append('มีคะแนนของผู้ดูแลอยู่')
        return jsonify({
            'error': 'ลบโปรเจกต์นี้ไม่ได้เพราะ' + 'และ'.join(reason)
                     + ' ถ้าต้องการเริ่มใหม่ให้สร้างโปรเจกต์ใหม่แทน',
            'graded': graded,
            'submitted': submitted,
        }), 409

    # ทักษะที่อ้างโปรเจกต์นี้เป็นหลักฐาน ปล่อยให้ ON DELETE SET NULL จัดการ
    record_event('project.deleted', user.id,
                 subject_type='project', subject_id=project.id,
                 payload={'title_length': len(project.title or '')})
    db.session.delete(project)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'ลบโปรเจกต์นี้ไม่ได้เพราะยังมีข้อมูลอื่นอ้างอยู่'}), 409

    return jsonify({'message': 'Project deleted'}), 200


# ====================================================================
# CLASSROOMS (any user can create / join)
# ====================================================================

# 6. POST /api/classrooms — Create classroom (any user → becomes its teacher)
@dashboard_bp.route('/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    """สร้างห้อง/กลุ่มใหม่ — ผู้สร้างเป็นผู้ดูแลของห้องนั้นโดยอัตโนมัติ"""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Classroom name is required'}), 400
    room_mode = data.get('room_mode') if data.get('room_mode') in ('graded', 'equal') else 'graded'

    classroom = ClassRoom(
        name=name,
        teacher_id=user.id,
        room_mode=room_mode,
        invite_code=generate_unique_invite_code(),
        academic_year=(data.get('academic_year') or '').strip() or None,
        semester=(data.get('semester') or '').strip() or None,
    )
    db.session.add(classroom)
    try:
        db.session.commit()
    except IntegrityError:
        # รหัสเชิญชนกันพอดีตอน commit — สุ่มใหม่แล้วลองอีกครั้ง ไม่ปล่อย error หลุดหน้าเว็บ
        db.session.rollback()
        classroom = ClassRoom(
            name=name,
            teacher_id=user.id,
            room_mode=room_mode,
            invite_code=generate_unique_invite_code(7),
            academic_year=(data.get('academic_year') or '').strip() or None,
            semester=(data.get('semester') or '').strip() or None,
        )
        db.session.add(classroom)
        db.session.commit()

    record_event('classroom.created', user.id,
                 subject_type='classroom', subject_id=classroom.id,
                 classroom_id=classroom.id,
                 payload={'academic_year': classroom.academic_year,
                          'semester': classroom.semester}, commit=True)

    print(f"[DASHBOARD] Classroom created: {classroom.name} (code: {classroom.invite_code}) by user={user.id}")

    return jsonify({'classroom': classroom.to_dict()}), 201


# GET /api/classrooms/<id>/challenges — โจทย์ท้าในห้องแบบทุกคนเท่ากัน
# "ผ่าน" = ส่งแล้วบล็อกเข้าเกณฑ์ของโจทย์ (ระบบตรวจเอง ไม่มีคนให้คะแนน) · โจทย์ไม่มีเกณฑ์ = ส่งแล้วถือว่าผ่าน
@dashboard_bp.route('/classrooms/<int:classroom_id>/challenges', methods=['GET'])
@jwt_required()
def classroom_challenges(classroom_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom or (classroom.room_mode or 'graded') != 'equal':
        return jsonify({'error': 'Classroom not found'}), 404
    member_ids = [m.student_id for m in _active_members(classroom_id=classroom_id).all()]
    if user.id != classroom.teacher_id and user.id not in member_ids:
        return jsonify({'error': 'Not in this classroom'}), 403
    everyone = len(set(member_ids) | {classroom.teacher_id})

    out = []
    for a in Assignment.query.filter_by(classroom_id=classroom_id).order_by(Assignment.created_at.desc()).all():
        passed = set()
        for sub in AssignmentSubmission.query.filter_by(assignment_id=a.id).all():
            check = _check_task_goal(a, sub.blockly_xml_snapshot, sub.sim_ok)
            if check is None or check['met']:
                passed.add(sub.student_id)
        author = db.session.get(User, a.author_id) if a.author_id else classroom.teacher
        item = a.to_dict()
        item.update({
            'author_name': (author.display_name or author.username) if author else '-',
            'by_me': bool(author and author.id == user.id),
            'passed_count': len(passed),
            'people': everyone,
            'me_passed': user.id in passed,
        })
        out.append(item)
    return jsonify({'challenges': out})


# GET /api/classrooms/<id>/peers — ทุกคนในห้องแบบ "ทุกคนเท่ากัน" เห็นดาวกับด่านของกันและกัน
# ห้องแบบให้คะแนนไม่เปิดตรงนี้ เจ้าของห้องดูผ่านหน้าผู้สอนอยู่แล้ว สมาชิกไม่ควรเห็นของกันเอง
@dashboard_bp.route('/classrooms/<int:classroom_id>/peers', methods=['GET'])
@jwt_required()
def classroom_peers(classroom_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    classroom = ClassRoom.query.get(classroom_id)
    if not classroom:
        return jsonify({'error': 'Classroom not found'}), 404
    member_ids = [m.student_id for m in _active_members(classroom_id=classroom_id).all()]
    if user.id != classroom.teacher_id and user.id not in member_ids:
        return jsonify({'error': 'Not in this classroom'}), 403
    if (classroom.room_mode or 'graded') != 'equal':
        return jsonify({'error': 'Only for equal rooms'}), 403

    objectives = [o for o in LearningObjective.query.order_by(LearningObjective.id).all()
                  if o.name in DETECTABLE_SKILLS]
    ids = [classroom.teacher_id] + [i for i in member_ids if i != classroom.teacher_id]
    progress = {}
    for sp in StudentObjectiveProgress.query.filter(StudentObjectiveProgress.student_id.in_(ids)).all():
        progress[(sp.student_id, sp.objective_id)] = sp.clean_run_count or 0
    peers = []
    for u in User.query.filter(User.id.in_(ids)).all():
        stars, level = 0, None
        for i, o in enumerate(objectives):
            need = o.mastery_threshold or 3
            got = min(progress.get((u.id, o.id), 0), need)
            stars += got
            if level is None and got < need:
                level = i
        peers.append({
            'id': u.id,
            'display_name': u.display_name or u.username,
            'avatar_url': u.avatar_url,
            'stars': stars,
            'level_index': level if level is not None else max(0, len(objectives) - 1),
            'is_owner': u.id == classroom.teacher_id,
            'is_me': u.id == user.id,
        })
    peers.sort(key=lambda p: -p['stars'])
    return jsonify({'peers': peers, 'max_stars': sum((o.mastery_threshold or 3) for o in objectives)})


# PATCH /api/classrooms/<id> — แก้ข้อมูลห้อง / เก็บถาวร / ปิดรับสมาชิก (ข้อ 3.7)
@dashboard_bp.route('/classrooms/<int:classroom_id>', methods=['PATCH'])
@jwt_required()
def update_classroom(classroom_id):
    """เจ้าของห้องแก้ชื่อ/เทอม/ปีการศึกษา หรือเก็บห้องถาวรเมื่อจบเทอม"""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = ClassRoom.query.get(classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    data = request.get_json() or {}

    if 'name' in data:
        new_name = (data.get('name') or '').strip()
        if not new_name:
            return jsonify({'error': 'ชื่อห้องว่างไม่ได้'}), 400
        classroom.name = new_name

    if 'academic_year' in data:
        classroom.academic_year = (data.get('academic_year') or '').strip() or None
    if 'semester' in data:
        classroom.semester = (data.get('semester') or '').strip() or None
    if 'is_active' in data:
        classroom.is_active = bool(data['is_active'])
    if 'is_open' in data:
        classroom.is_open = bool(data['is_open'])

    if 'invite_expires_at' in data:
        raw = data.get('invite_expires_at')
        if not raw:
            classroom.invite_expires_at = None
        else:
            parsed = _parse_datetime(raw)
            if parsed is None:
                return jsonify({'error': 'รูปแบบวันหมดอายุรหัสเชิญไม่ถูกต้อง'}), 400
            classroom.invite_expires_at = parsed

    db.session.commit()
    return jsonify({'classroom': classroom.to_dict()}), 200


# DELETE /api/classrooms/<id>/students/<student_id> — เอาสมาชิกออกจากห้อง (ข้อ 3.6)
@dashboard_bp.route('/classrooms/<int:classroom_id>/students/<int:student_id>', methods=['DELETE'])
@jwt_required()
def remove_student_from_classroom(classroom_id, student_id):
    """เอาสมาชิกออกจากห้อง — ไม่ลบแถวทิ้ง แค่เปลี่ยนสถานะเป็น LEFT

    ถ้าลบแถวจริง งานที่เคยส่งและคะแนนที่เคยได้จะกลายเป็นกำพร้า
    และแยกไม่ออกระหว่าง "ไม่เคยอยู่" กับ "เคยอยู่แล้วออกไป"
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = ClassRoom.query.get(classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    membership = ClassMembership.query.filter_by(
        classroom_id=classroom_id, student_id=student_id
    ).first()
    if not membership or membership.status != 'ACTIVE':
        return jsonify({'error': 'ไม่พบสมาชิกคนนี้ในห้อง'}), 404

    membership.status = 'LEFT'
    membership.left_at = _now_naive()
    record_event('classroom.member_removed', user.id,
                 subject_type='user', subject_id=student_id,
                 classroom_id=classroom_id)
    db.session.commit()

    return jsonify({'message': 'เอาสมาชิกออกจากห้องแล้ว', 'membership': membership.to_dict()}), 200


# PATCH /api/classrooms/<id>/students/<student_id> — ตั้งเลขที่ / รับกลับเข้าห้อง
@dashboard_bp.route('/classrooms/<int:classroom_id>/students/<int:student_id>', methods=['PATCH'])
@jwt_required()
def update_membership(classroom_id, student_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = ClassRoom.query.get(classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    membership = ClassMembership.query.filter_by(
        classroom_id=classroom_id, student_id=student_id
    ).first()
    if not membership:
        return jsonify({'error': 'ไม่พบสมาชิกคนนี้ในห้อง'}), 404

    data = request.get_json() or {}

    if 'student_no' in data:
        membership.student_no = (str(data.get('student_no') or '')).strip()[:10] or None

    if data.get('status') == 'ACTIVE':
        membership.status = 'ACTIVE'
        membership.left_at = None

    db.session.commit()
    return jsonify({'membership': membership.to_dict()}), 200


# 7. GET /api/classrooms — List classrooms the user owns
@dashboard_bp.route('/classrooms', methods=['GET'])
@jwt_required()
def list_classrooms():
    """List all classrooms owned by the current user."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classrooms = ClassRoom.query.filter_by(teacher_id=user.id).all()
    result = []
    for c in classrooms:
        item = c.to_dict()
        item['student_count'] = _active_members(classroom_id=c.id).count()
        result.append(item)

    return jsonify({'classrooms': result}), 200


# 8. POST /api/classrooms/join — Join by invite code (any user)
@dashboard_bp.route('/classrooms/join', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour', key_func=get_jwt_identity)
def join_classroom():
    """เข้าร่วมห้องด้วยรหัสเชิญ — เป็นสมาชิกของห้องนั้น"""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    invite_code = (data.get('invite_code') or '').strip().upper()
    if not invite_code:
        return jsonify({'error': 'invite_code is required'}), 400

    classroom = ClassRoom.query.filter_by(invite_code=invite_code).first()
    if not classroom:
        return jsonify({'error': 'ไม่พบห้องจากรหัสนี้'}), 404

    if classroom.teacher_id == user.id:
        return jsonify({'error': 'คุณเป็นเจ้าของห้องนี้อยู่แล้ว'}), 409

    # ห้องที่เก็บถาวร / ปิดรับ / รหัสเชิญหมดอายุ เข้าไม่ได้ (ข้อ 3.7)
    if not classroom.is_active:
        return jsonify({'error': 'ห้องนี้ปิดแล้ว (ผู้ดูแลเก็บถาวรไปแล้ว)'}), 409
    if not classroom.is_open:
        return jsonify({'error': 'ห้องนี้ปิดรับสมาชิกใหม่แล้ว'}), 409
    if not classroom.invite_is_usable():
        return jsonify({'error': 'รหัสเชิญหมดอายุแล้ว ขอรหัสใหม่จากผู้ดูแลนะ'}), 409

    # Check if already a member
    existing = ClassMembership.query.filter_by(
        classroom_id=classroom.id, student_id=user.id
    ).first()
    if existing:
        if existing.status == 'ACTIVE':
            return jsonify({'error': 'คุณอยู่ในห้องนี้อยู่แล้ว'}), 409
        # เคยอยู่แล้วถูกเอาออก → รับกลับเข้าห้องเดิม ไม่สร้างแถวใหม่
        existing.status = 'ACTIVE'
        existing.left_at = None
        db.session.commit()
        return jsonify({
            'message': 'กลับเข้าห้องแล้ว',
            'classroom': classroom.to_dict(),
        }), 200

    membership = ClassMembership(
        classroom_id=classroom.id,
        student_id=user.id,
    )
    db.session.add(membership)
    try:
        db.session.commit()
    except IntegrityError:
        # กดพร้อมกันสองครั้ง — unique constraint ปัดใบที่สองทิ้ง ตอบเหมือนกรณีเป็นสมาชิกอยู่แล้ว
        db.session.rollback()
        return jsonify({'error': 'คุณอยู่ในห้องนี้อยู่แล้ว'}), 409

    record_event('classroom.joined', user.id,
                 subject_type='classroom', subject_id=classroom.id,
                 classroom_id=classroom.id, commit=True)

    return jsonify({
        'message': 'Joined classroom successfully',
        'classroom': classroom.to_dict(),
    }), 200


# 9. GET /api/classrooms/<id>/students
@dashboard_bp.route('/classrooms/<int:classroom_id>/students', methods=['GET'])
@jwt_required()
def classroom_students(classroom_id):
    """List students in a classroom with their stats (owner only)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = ClassRoom.query.get(classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    students_data = _get_classroom_students_with_stats(classroom_id)
    return jsonify({
        'classroom': classroom.to_dict(),
        'students': students_data,
    }), 200


# ====================================================================
# TEACHER-OF-STUDENT ROUTES (ownership-based)
# ====================================================================

# 10. GET /api/students/<id>/projects — for grading form
@dashboard_bp.route('/students/<int:student_id>/projects', methods=['GET'])
@jwt_required()
def student_projects(student_id):
    """List a student's projects (must be teacher of that student)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not _user_teaches_student(user, student_id):
        return jsonify({'error': 'Student not in your classroom'}), 403

    projects = Project.query.filter_by(user_id=student_id).order_by(
        Project.updated_at.desc()
    ).all()
    return jsonify({'projects': [p.to_dict() for p in projects]}), 200


# 11. GET /api/students/<id>/detail
@dashboard_bp.route('/students/<int:student_id>/detail', methods=['GET'])
@jwt_required()
def student_detail(student_id):
    """Detailed view of a student (must be teacher of that student)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    student = User.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if not _user_teaches_student(user, student_id):
        return jsonify({'error': 'Student not in your classroom'}), 403

    # Projects
    projects = [p.to_dict() for p in Project.query.filter_by(user_id=student_id).order_by(
        Project.updated_at.desc()
    ).all()]

    # Recent activity (last 50)
    activities = [a.to_dict() for a in ActivityLog.query.filter_by(user_id=student_id).order_by(
        ActivityLog.created_at.desc()
    ).limit(50).all()]

    # Objectives
    all_objectives = LearningObjective.query.all()
    progress_map = {
        sp.objective_id: sp
        for sp in StudentObjectiveProgress.query.filter_by(student_id=student_id).all()
    }
    objectives = []
    for obj in all_objectives:
        item = obj.to_dict()
        prog = progress_map.get(obj.id)
        item['status'] = _status_key(prog.status if prog else 'NOT_STARTED')
        item['evidence_project_id'] = prog.evidence_project_id if prog else None
        # ตัวเลขเดียวกับที่ฝั่งเด็กแสดงเป็นดาว — ผู้ดูแลเห็นเป็น 2/3 พร้อมวันที่ผ่านเกณฑ์
        # ผู้ดูแลจะได้รู้ว่าเด็ก "ใกล้จะผ่านแล้ว" ไม่ใช่เห็นแค่ ผ่าน/ไม่ผ่าน
        item['clean_run_count'] = prog.clean_run_count if prog else 0
        item['mastered_at'] = prog.mastered_at.isoformat() if prog and prog.mastered_at else None
        item['changed_by'] = prog.changed_by if prog else 'AUTO'
        item['auto_detectable'] = obj.name in DETECTABLE_SKILLS
        objectives.append(item)

    # Grades — เฉพาะคะแนนในห้องของผู้ดูแลคนที่ขอเท่านั้น
    #
    # เดิมดึงทุกคะแนนของเด็กคนนี้ เด็กที่เรียน 2 ห้องจะทำให้ผู้ดูแลห้อง A
    # เห็นคะแนนและคอมเมนต์ที่ผู้ดูแลห้อง B ให้ในห้องของผู้ดูแล B
    # (ยืนยันด้วยการยิง API จริง: ผู้ดูแลเอเห็น [(60,'ห้องบีให้'), (80,'ห้องเอให้')])
    #
    # _user_teaches_student ข้างบนตอบแค่ "เด็กคนนี้อยู่ห้องใดห้องหนึ่งของเราไหม"
    # ซึ่งเป็นสิทธิ์ระดับ "คน" แต่คะแนนสังกัด "ห้อง" — ต้องกรองซ้ำตามห้องที่เราเป็นเจ้าของ
    # คะแนนเก่าที่ classroom_id เป็น NULL (ให้ก่อนมีคอลัมน์นี้) ยังแสดงให้ผู้ดูแลทุกคนเห็น
    # เพราะบอกไม่ได้ว่าเป็นของห้องไหน — ตัดทิ้งจะทำให้ผู้ดูแลหาคะแนนเดิมไม่เจอ
    owned_ids = _owned_classroom_ids(user)
    grades = [
        g.to_dict() for g in Grade.query.filter(
            Grade.student_id == student_id,
            db.or_(Grade.classroom_id.in_(owned_ids), Grade.classroom_id.is_(None)),
        ).order_by(Grade.updated_at.desc(), Grade.created_at.desc()).all()
    ]

    # Activity chart
    chart = _activity_chart(student_id, 7)

    return jsonify({
        'student': student.to_dict(),
        'projects': projects,
        'activities': activities,
        'objectives': objectives,
        'grades': grades,
        'activity_chart': chart,
        'stats': {
            'run_count': _activity_count(student_id, 'RUN_CODE'),
            'block_count': _activity_sum(student_id, 'BLOCK_COUNT'),
            'ai_count': _activity_count(student_id, 'ASK_AI'),
        },
        # ภารกิจของเด็กคนนี้ในห้องที่ผู้ดูแลกำลังเปิดอยู่ — ผู้ดูแลคนอื่นเล็งอะไรไว้ไม่เกี่ยวกับเรา
        'focus': _focus_in_room(student_id, request.args.get('classroom_id', type=int), user),
    }), 200


# 12. POST /api/grades — Give grade
@dashboard_bp.route('/grades', methods=['POST'])
@jwt_required()
def give_grade():
    """Give a grade to a student's project (must be teacher of that student)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    student_id = data.get('student_id')
    project_id = data.get('project_id')
    submission_id = data.get('submission_id')
    score = data.get('score')
    max_score = data.get('max_score', 100.0)
    comment = data.get('comment', '')

    if not student_id or not project_id or score is None:
        return jsonify({'error': 'student_id, project_id, and score are required'}), 400

    student_id = int(student_id)
    project_id = int(project_id)

    # ตรวจช่วงคะแนนก่อนถึงฐานข้อมูล — เดิมแปลง float ตรงๆ ให้ 999 หรือ -50 ก็ผ่าน
    try:
        score = Decimal(str(score)).quantize(Decimal('0.01'))
        max_score = Decimal(str(max_score)).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError, TypeError):
        return jsonify({'error': 'คะแนนต้องเป็นตัวเลข'}), 400

    if max_score <= 0 or max_score > Decimal('999.99'):
        return jsonify({'error': 'คะแนนเต็มต้องมากกว่า 0 และไม่เกิน 999.99'}), 400

    if score < 0 or score > max_score:
        return jsonify({'error': f'คะแนนต้องอยู่ระหว่าง 0 ถึง {max_score}'}), 400

    # Validate student exists and is in one of grader's classrooms
    student = User.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if not _user_teaches_student(user, student_id):
        return jsonify({'error': 'Student not in your classroom'}), 403

    # Validate project exists and belongs to student
    project = Project.query.get(project_id)
    if not project or project.user_id != student_id:
        return jsonify({'error': 'Project not found or does not belong to student'}), 404

    # --- ผูกคะแนนกับ "งานที่ส่ง" ถ้าระบุมา (ข้อ 3.2) ---
    submission = None
    if submission_id:
        submission = AssignmentSubmission.query.get(int(submission_id))
        if not submission or submission.student_id != student_id:
            return jsonify({'error': 'ไม่พบงานที่ส่งชิ้นนี้'}), 404
        assignment = Assignment.query.get(submission.assignment_id)
        if not assignment or assignment.classroom_id not in _owned_classroom_ids(user):
            return jsonify({'error': 'งานชิ้นนี้ไม่ได้อยู่ในห้องของคุณ'}), 403
        # ให้คะแนนตามโปรเจกต์ที่เด็กกดส่งจริง ไม่ใช่ชิ้นที่ผู้ดูแลเผลอเลือก
        project_id = submission.project_id

    # --- แทรกหรืออัปเดต ไม่สร้างแถวใหม่ทุกครั้ง (ข้อ 3.3) ---
    # เดิมผู้ดูแลให้คะแนนผิดแล้วให้ใหม่จะได้ 2 แถว แถวที่ผิดคาอยู่ในฐานข้อมูลตลอดไป
    if submission:
        grade = Grade.query.filter_by(submission_id=submission.id).first()
    else:
        grade = Grade.query.filter_by(
            student_id=student_id, project_id=project_id, submission_id=None
        ).order_by(Grade.created_at.desc()).first()

    # หาห้องให้เสร็จ "ก่อน" สร้างแถวใหม่
    # _resolve_grade_classroom ยิง query ข้างใน ถ้าเรียกหลัง db.session.add()
    # SQLAlchemy จะ autoflush แถวที่ยังตั้งค่าไม่ครบ -> INSERT ที่ score เป็น NULL -> 500
    # เดิมไม่เจอเพราะหน้าเว็บไม่เคยส่ง classroom_id มา เลยไม่เคยเข้าทางที่ query
    classroom_id = _resolve_grade_classroom(
        user, student_id, submission, data.get('classroom_id')
    )

    created = grade is None
    if created:
        grade = Grade(student_id=student_id, project_id=project_id)
        db.session.add(grade)

    grade.teacher_id = user.id
    grade.project_id = project_id
    grade.submission_id = submission.id if submission else None
    # คะแนนต้องรู้ว่าตัวเองอยู่ห้องไหน ไม่งั้นหน้าห้องดึงคะแนนของห้องตัวเองไม่ได้
    grade.classroom_id = classroom_id
    grade.score = score
    grade.max_score = max_score
    grade.comment = comment
    grade.updated_at = _now_naive()

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'งานชิ้นนี้มีคะแนนอยู่แล้ว ลองรีเฟรชหน้าแล้วแก้อีกครั้ง'}), 409

    record_event('grade.given' if created else 'grade.updated', user.id,
                 subject_type='project', subject_id=project_id,
                 payload={'student_id': student_id, 'score': float(score),
                          'max_score': float(max_score),
                          'submission_id': submission.id if submission else None},
                 commit=True)

    # Check if this triggers PERFECT_GRADE achievement for student
    _check_and_award_achievements(student_id)

    print(f"[DASHBOARD] Grade {'given' if created else 'updated'}: "
          f"student={student_id} project={project_id} score={score}/{max_score}")

    return jsonify({'grade': grade.to_dict(), 'created': created}), (201 if created else 200)


# 13. PUT /api/objectives/<student_id>/<objective_id>/override
@dashboard_bp.route('/objectives/<int:student_id>/<int:objective_id>/override', methods=['PUT'])
@jwt_required()
def override_objective(student_id, objective_id):
    """Override a student's objective status (must be teacher of that student)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not _user_teaches_student(user, student_id):
        return jsonify({'error': 'Student not in your classroom'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    new_status = (data.get('status') or '').strip().upper()

    objective = LearningObjective.query.get(objective_id)
    if not objective:
        return jsonify({'error': 'Objective not found'}), 404

    # --- คืนทักษะให้ระบบนับเอง ---
    # ผู้ดูแลกดปรับสถานะครั้งเดียว = ทักษะนั้นหยุดนับดาวอัตโนมัติถาวร (ดู _log_derived_activity)
    # เดิมไม่มีทางกลับเลย ทั้ง repo ไม่มีที่ไหนเซ็ต updated_by_teacher_id = None
    # และเพราะทักษะเป็นของ user ไม่ใช่ของห้อง ผู้ดูแลห้อง A จึงแช่แข็งดาว
    # ที่ผู้ดูแลห้อง B ใช้วัดผลอยู่ได้ — ต้องมีปุ่มถอนคืน
    if new_status == 'AUTO':
        progress = StudentObjectiveProgress.query.filter_by(
            student_id=student_id, objective_id=objective_id
        ).first()
        if not progress or not progress.updated_by_teacher_id:
            return jsonify({'message': 'ทักษะนี้ระบบนับให้อยู่แล้ว'}), 200

        threshold = objective.mastery_threshold or 3
        runs = _activity_count(student_id, f'SKILL:{objective.name}'[:50])
        progress.updated_by_teacher_id = None
        progress.changed_by = 'AUTO'
        progress.clean_run_count = runs
        progress.status = 'COMPLETED' if runs >= threshold else (
            'IN_PROGRESS' if runs > 0 else 'NOT_STARTED')
        progress.updated_at = _now_naive()
        record_event('skill.override_cleared', user.id,
                     subject_type='objective', subject_id=objective_id,
                     payload={'student_id': student_id, 'recomputed_status': progress.status,
                              'clean_runs': runs}, commit=True)
        return jsonify({'progress': progress.to_dict()}), 200

    if new_status not in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'):
        return jsonify({
            'error': 'Status must be NOT_STARTED, IN_PROGRESS, COMPLETED, or AUTO'
        }), 400

    # Find or create progress record
    progress = StudentObjectiveProgress.query.filter_by(
        student_id=student_id, objective_id=objective_id
    ).first()

    now_naive = _now_naive()
    old_status = progress.status if progress else 'NOT_STARTED'

    if progress:
        progress.status = new_status
        progress.updated_by_teacher_id = user.id
    else:
        progress = StudentObjectiveProgress(
            student_id=student_id,
            objective_id=objective_id,
            status=new_status,
            updated_by_teacher_id=user.id,
            first_progress_at=now_naive,
        )
        db.session.add(progress)

    # มิติเวลา + ร่องรอยว่าใครแก้ (ข้อ 4.4)
    progress.changed_by = 'TEACHER'
    progress.updated_at = now_naive
    if new_status == 'COMPLETED' and progress.mastered_at is None:
        progress.mastered_at = now_naive
    if new_status != 'COMPLETED':
        progress.mastered_at = None

    if old_status != new_status:
        db.session.add(ObjectiveProgressHistory(
            student_id=student_id,
            objective_id=objective_id,
            old_status=old_status,
            new_status=new_status,
            clean_run_count=progress.clean_run_count,
            changed_by='TEACHER',
            teacher_id=user.id,
            changed_at=now_naive,
        ))
        record_event('skill.overridden', user.id,
                     subject_type='objective', subject_id=objective_id,
                     payload={'student_id': student_id,
                              'old_status': old_status, 'new_status': new_status})

    db.session.commit()

    return jsonify({'progress': progress.to_dict()}), 200


# GET /api/students/<id>/objectives/history — เส้นทางพัฒนาการรายบุคคล (ข้อ 4.4)
@dashboard_bp.route('/students/<int:student_id>/objectives/history', methods=['GET'])
@jwt_required()
def objective_history(student_id):
    """ประวัติการเปลี่ยนสถานะทักษะทั้งหมดของสมาชิกคนหนึ่ง

    ตอบคำถามที่ตารางสถานะตอบไม่ได้: เด็กผ่านทักษะนี้เมื่อไหร่ ใช้เวลานานแค่ไหน
    และผู้ดูแลเข้าไปแก้ผลประเมินตอนไหนบ้าง
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if student_id != user.id and not _user_teaches_student(user, student_id):
        return jsonify({'error': 'Student not in your classroom'}), 403

    objective_names = {o.id: o.name for o in LearningObjective.query.all()}
    rows = ObjectiveProgressHistory.query.filter_by(student_id=student_id).order_by(
        ObjectiveProgressHistory.changed_at.asc()
    ).all()

    history = []
    for row in rows:
        item = row.to_dict()
        item['objective_name'] = objective_names.get(row.objective_id)
        history.append(item)

    return jsonify({'student_id': student_id, 'history': history}), 200


# ====================================================================
# ASSIGNMENTS (ภารกิจ 3 ระดับ)
# ====================================================================

def _grade_payload(g):
    """แปลงแถวคะแนนเป็นข้อมูลที่ส่งออกหน้าเว็บได้"""
    if not g:
        return None
    # score เป็น Numeric → Decimal ซึ่ง jsonify แปลงไม่ได้ ต้องเป็น float ก่อนส่งออก
    return {
        'id': g.id,
        'score': float(g.score),
        'max_score': float(g.max_score),
        'comment': g.comment,
        'submission_id': g.submission_id,
        'updated_at': g.updated_at.isoformat() if g.updated_at else None,
    }


def _grade_for_submission(submission):
    """คะแนนของงานที่ส่งชิ้นนี้ (ข้อ 3.2)

    ค้นด้วย submission_id ก่อน — ผูกกับภารกิจข้อนั้นตรงๆ
    ถ้าไม่เจอค่อยถอยไปหาคะแนนเก่าที่ผูกไว้แค่กับโปรเจกต์ (ข้อมูลก่อนมีคอลัมน์นี้)
    เดิมค้นด้วย (student_id, project_id) อย่างเดียว ทำให้
      - เด็กส่งงานใหม่ด้วยโปรเจกต์คนละชิ้น แล้วคะแนนเดิมหายจากหน้าจอ
      - โปรเจกต์ชิ้นเดียวส่ง 2 ห้อง แล้วคะแนนของสองภารกิจโชว์ตัวเลขเดียวกัน
    """
    if not submission:
        return None

    g = Grade.query.filter_by(submission_id=submission.id).first()
    if g:
        return _grade_payload(g)

    g = Grade.query.filter_by(
        student_id=submission.student_id,
        project_id=submission.project_id,
        submission_id=None,
    ).order_by(Grade.created_at.desc()).first()
    payload = _grade_payload(g)
    if payload:
        payload['legacy'] = True   # คะแนนเก่าที่ยังไม่ได้ผูกกับงานที่ส่ง
    return payload


def _grade_for_project(student_id, project_id):
    """คะแนนล่าสุดของโปรเจกต์ (ใช้ตอนผู้ดูแลให้คะแนนโปรเจกต์ที่ไม่ได้ส่งเป็นงาน)"""
    g = Grade.query.filter_by(student_id=student_id, project_id=project_id).order_by(
        Grade.updated_at.desc(), Grade.created_at.desc()
    ).first()
    return _grade_payload(g)


# GET /api/tasks/blocks — รายการบล็อกที่ตั้งเป็นเกณฑ์ผ่านได้
#
# ใช้สองที่:
#   - ฟอร์มผู้ดูแล: ทำเป็นเช็กบ็อกซ์ให้ติ๊กว่าภารกิจข้อนี้ต้องใช้บล็อกอะไรบ้าง
#   - หน้า Workspace: แปลง required_blocks เป็นข้อความไทยในเช็กลิสต์ของเด็ก
# เปิดให้ทุกคนดึงได้ ไม่ต้องล็อกอิน เพราะเป็นแค่ตารางแปลชื่อ ไม่ใช่ข้อมูลของใคร
@dashboard_bp.route('/tasks/blocks', methods=['GET'])
def task_block_choices():
    return jsonify({
        'blocks': [{'key': k, 'label': label} for k, label in GOAL_BLOCK_CHOICES],
    }), 200


# GET /api/assignments/objectives — ทักษะที่ผู้ดูแลเลือกเป็นเป้าหมายของภารกิจได้
@dashboard_bp.route('/assignments/objectives', methods=['GET'])
@jwt_required()
def assignment_objectives():
    return jsonify({
        'objectives': [
            {'id': o.id, 'name': o.name, 'mastery_threshold': o.mastery_threshold or 3}
            for o in LearningObjective.query.all()
        ],
        'blocks': [{'key': k, 'label': label} for k, label in GOAL_BLOCK_CHOICES],
    }), 200


# POST /api/assignments — ผู้ดูแลมอบภารกิจให้ห้อง (เจ้าของห้องเท่านั้น)
@dashboard_bp.route('/assignments', methods=['POST'])
@jwt_required()
def create_assignment():
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    classroom_id = data.get('classroom_id')
    task_key = (data.get('task_key') or '').strip()

    classroom = ClassRoom.query.get(classroom_id) if classroom_id else None
    if not classroom:
        return jsonify({'error': 'Classroom not found'}), 404
    # ห้องแบบทุกคนเท่ากัน (9 พ.ย. 2569): สมาชิกทุกคนตั้งโจทย์ท้ากันได้ ไม่มีกำหนดส่ง ไม่มีคะแนน
    is_equal = (classroom.room_mode or 'graded') == 'equal'
    if classroom.teacher_id != user.id and not (
            is_equal and _active_members(classroom_id=classroom.id, student_id=user.id).first()):
        return jsonify({'error': 'Classroom not found'}), 404
    if is_equal:
        data['due_date'] = None
        data['objective_id'] = None
        data['set_focus_for_class'] = False

    # ผู้ดูแลเขียนภารกิจเองทั้งหมด — ไม่มีชุดภารกิจสำเร็จรูปให้เลือกแล้ว
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'ใส่หัวข้อภารกิจด้วยนะ'}), 400
    if len(title) > 200:
        return jsonify({'error': 'หัวข้อภารกิจยาวเกิน 200 ตัวอักษร'}), 400

    description = (data.get('description') or '').strip() or None
    if description and len(description) > 500:
        return jsonify({'error': 'คำอธิบายภารกิจยาวเกิน 500 ตัวอักษร'}), 400

    # ระดับเป็นข้อมูลเสริม ไม่บังคับ (หน้าเด็กไม่แสดงป้ายระดับแล้ว)
    level = (data.get('level') or '').strip() or None

    # เกณฑ์ผ่านอัตโนมัติ — ผู้ดูแลตั้งเองได้ ไม่ตั้งก็ได้ (ว่าง = ผู้ดูแลตรวจเอง)
    goal, goal_error = _clean_goal(data.get('goal'))
    if goal_error:
        return jsonify({'error': goal_error}), 400

    # ทุกภารกิจเป็นของผู้ดูแลเอง จึงต้องมีคีย์ของตัวเอง ไม่งั้นสั่งได้ห้องละข้อเดียว
    task_key = 'task_' + secrets.token_hex(6)

    # กำหนดส่ง (ข้อ 3.1) — ไม่ใส่ก็ได้ แปลว่าภารกิจนี้ไม่มีเดดไลน์
    due_date = None
    if data.get('due_date'):
        due_date = _parse_datetime(data['due_date'])
        if due_date is None:
            return jsonify({'error': 'รูปแบบกำหนดส่งไม่ถูกต้อง'}), 400

    # กันมอบภารกิจเดิมซ้ำในห้องเดียวกัน
    existing = Assignment.query.filter_by(
        classroom_id=classroom.id, task_key=task_key
    ).first()
    if existing:
        return jsonify({'error': 'ภารกิจนี้ถูกมอบให้ห้องนี้แล้ว'}), 409

    # ผู้ดูแลประกาศเองว่าภารกิจนี้ฝึกทักษะอะไร ไม่ใส่ก็ปล่อยให้ระบบเดาจาก required_blocks เหมือนเดิม
    objective_id = data.get('objective_id')
    objective = db.session.get(LearningObjective, objective_id) if objective_id else None
    if objective_id and not objective:
        return jsonify({'error': 'ไม่พบทักษะที่ระบุ'}), 400

    target_stars = None
    if objective:
        target_stars = _resolve_focus_target(objective, data.get('target_stars'))
        if target_stars is None:
            return jsonify({'error': 'เป้าหมายต้องเป็น 1 ถึง 3 ดาว'}), 400

    assignment = Assignment(
        classroom_id=classroom.id,
        task_key=task_key,
        title=title,
        description=description,
        level=level,
        goal_json=json.dumps(goal, ensure_ascii=False) if goal else None,
        due_date=due_date,
        objective_id=objective.id if objective else None,
        target_stars=target_stars,
        author_id=user.id,
    )
    db.session.add(assignment)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'ภารกิจนี้ถูกมอบให้ห้องนี้แล้ว'}), 409

    # เล็งภารกิจให้ทั้งห้องในคลิกเดียว — ยังเป็นคนละเรื่องกับการสั่งงาน
    # ภารกิจ = มีงานให้ส่ง มีเดดไลน์ · ภารกิจ = แค่ชี้ว่าเก็บทักษะไหนก่อน ไม่ต้องส่งอะไร
    # ผู้ดูแลที่อยากสั่งภารกิจเฉยๆ ไม่ต้องติ๊ก จะได้ไม่ไปล็อกภารกิจที่เด็กเลือกเองอยู่
    focused_count = 0
    if objective and data.get('set_focus_for_class'):
        members = ClassMembership.query.filter_by(
            classroom_id=classroom.id, status='ACTIVE').all()
        for member in members:
            _, error = _set_focus(
                student_id=member.student_id, objective_id=objective.id,
                classroom_id=classroom.id, target_stars=target_stars,
                source='TEACHER', set_by_id=user.id,
                note=f'จากภารกิจ "{title}"',
            )
            if not error:
                focused_count += 1
        db.session.commit()

    record_event('assignment.created', user.id,
                 subject_type='assignment', subject_id=assignment.id,
                 classroom_id=classroom.id,
                 payload={'task_key': task_key, 'level': level,
                          'has_due_date': bool(due_date),
                          'objective_id': assignment.objective_id,
                          'target_stars': target_stars,
                          'focused_students': focused_count}, commit=True)

    return jsonify({
        'assignment': assignment.to_dict(),
        'focused_students': focused_count,
    }), 201


# DELETE /api/assignments/<id> — ยกเลิกภารกิจ (เจ้าของห้อง)
@dashboard_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
@jwt_required()
def delete_assignment(assignment_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    assignment = Assignment.query.get(assignment_id)
    if not assignment or assignment.classroom.teacher_id != user.id:
        return jsonify({'error': 'Assignment not found'}), 404

    # คะแนนที่ให้ไปแล้วต้องอยู่ต่อ — ปลดสายจากงานที่ส่งก่อนลบ
    # ถึง FK จะเป็น SET NULL แล้ว แต่ปลดเองตรงนี้ด้วยเพื่อ (1) นับได้ว่ากระทบกี่ก้อน
    # (2) ไม่ต้องพึ่ง ON DELETE ของฐานข้อมูลปลายทางว่ารองรับครบ
    submission_ids = [
        s.id for s in AssignmentSubmission.query.filter_by(assignment_id=assignment.id).all()
    ]
    kept_grades = 0
    if submission_ids:
        kept_grades = Grade.query.filter(Grade.submission_id.in_(submission_ids)).update(
            {'submission_id': None}, synchronize_session=False)

    record_event('assignment.deleted', user.id,
                 subject_type='assignment', subject_id=assignment.id,
                 classroom_id=assignment.classroom_id,
                 payload={'task_key': assignment.task_key,
                          'submissions_removed': len(submission_ids),
                          'grades_kept': kept_grades})

    AssignmentSubmission.query.filter_by(assignment_id=assignment.id).delete()
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({
        'message': 'Assignment deleted',
        'submissions_removed': len(submission_ids),
        'grades_kept': kept_grades,
    }), 200


# GET /api/classrooms/<id>/qr.svg — QR ของลิงก์เชิญ ไว้ขึ้นจอฉายรหัส (เจ้าของห้องเท่านั้น)
@dashboard_bp.route('/classrooms/<int:classroom_id>/qr.svg', methods=['GET'])
@jwt_required()
def classroom_qr(classroom_id):
    import io
    import segno
    from urllib.parse import quote
    from flask import Response

    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404
    link = request.host_url + '?room=' + quote(classroom.invite_code)
    buf = io.BytesIO()
    segno.make(link, error='m').save(buf, kind='svg', scale=8, border=2, xmldecl=False, svgns=True)
    return Response(buf.getvalue(), mimetype='image/svg+xml')


# GET /api/classrooms/<id>/export.xlsx — ครูส่งออกข้อมูลห้องเป็น Excel (มีชื่อจริง ไม่มีข้อมูลวิจัย)
@dashboard_bp.route('/classrooms/<int:classroom_id>/export.xlsx', methods=['GET'])
@jwt_required()
def export_classroom_xlsx(classroom_id):
    from urllib.parse import quote
    from flask import Response
    from excel_export import build_classroom_xlsx

    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    students = _get_classroom_students_with_stats(classroom.id)
    now = _now_naive()
    data = build_classroom_xlsx(classroom, students, now)
    record_event('data.exported', user.id,
                 subject_type='classroom', subject_id=classroom.id,
                 classroom_id=classroom.id,
                 payload={'kind': 'classroom_xlsx', 'rows': len(students)}, commit=True)

    safe = ''.join('-' if ch in r'\/:*?"<>|' else ch for ch in classroom.name)
    name = 'METO_%s_%s.xlsx' % (safe, (now + timedelta(hours=7)).strftime('%Y%m%d'))
    return Response(
        data,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': "attachment; filename=\"classroom_%d.xlsx\"; filename*=UTF-8''%s"
                 % (classroom.id, quote(name))},
    )


# POST /api/assignments/<id>/submit — สมาชิกส่งงาน (เลือกโปรเจกต์ของตัวเอง)
@dashboard_bp.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@jwt_required()
def submit_assignment(assignment_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    # ต้องเป็นสมาชิกห้องที่ภารกิจนี้อยู่ (และยังอยู่จริง ไม่ใช่ถูกเอาออกไปแล้ว)
    member = _active_members(
        classroom_id=assignment.classroom_id, student_id=user.id
    ).first()
    room = assignment.classroom
    plays_own_room = bool(room and room.teacher_id == user.id and (room.room_mode or 'graded') == 'equal')
    if not member and not plays_own_room:
        return jsonify({'error': 'คุณไม่ได้อยู่ในห้องของภารกิจนี้'}), 403

    data = request.get_json()
    project_id = data.get('project_id') if data else None
    project = Project.query.get(project_id) if project_id else None
    if not project or project.user_id != user.id:
        return jsonify({'error': 'เลือกโปรเจกต์ของคุณที่จะส่งก่อนนะ'}), 400

    now = _now_naive()
    # ส่งช้าหรือไม่ ตัดสิน ณ เวลาที่กดส่ง (ข้อ 3.1)
    is_late = bool(assignment.due_date and now > assignment.due_date)

    def _apply(sub, first_time):
        """เก็บสำเนาผังบล็อก ณ เวลาที่กดส่ง (ข้อ 3.4)

        ผูกด้วย project_id อย่างเดียวไม่พอ เพราะเด็กแก้บล็อกต่อได้หลังกดส่ง
        ผู้ดูแลต้องเห็นสิ่งที่เด็ก "กดส่ง" ไม่ใช่สิ่งที่เด็ก "แก้ล่าสุด"
        """
        sub.project_id = project.id
        sub.submitted_at = now
        sub.blockly_xml_snapshot = project.blockly_xml
        sub.is_late = is_late
        sub.attempt_no = 1 if first_time else (sub.attempt_no or 1) + 1
        # ผลหุ่นจำลองที่หน้าเว็บส่งมา (True = รันโค้ดชุดนี้จนจบ) · ไม่ส่งมา = ไม่รู้
        sub.sim_ok = bool(data.get('sim_ok')) if data and 'sim_ok' in data else None

    # ส่งซ้ำได้ — นับเป็นรอบถัดไป และเก็บสำเนาใหม่ทับ
    submission = AssignmentSubmission.query.filter_by(
        assignment_id=assignment.id, student_id=user.id
    ).first()
    if submission:
        _apply(submission, first_time=False)
    else:
        submission = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=user.id,
            project_id=project.id,
        )
        _apply(submission, first_time=True)
        db.session.add(submission)

    try:
        db.session.commit()
    except IntegrityError:
        # กดส่งรัวสองครั้งพร้อมกัน — unique constraint กันแถวที่สอง
        # อ่านแถวที่ชนะกลับมาแล้วอัปเดตทับ ผู้ใช้ไม่ควรเห็น error จากเรื่องนี้
        db.session.rollback()
        submission = AssignmentSubmission.query.filter_by(
            assignment_id=assignment.id, student_id=user.id
        ).first()
        if not submission:
            return jsonify({'error': 'ส่งงานไม่สำเร็จ ลองใหม่อีกครั้ง'}), 500
        _apply(submission, first_time=False)
        db.session.commit()

    # เวลาที่ใช้นับจากได้รับภารกิจ — ตัวเลขที่เล่มวิจัยอยากได้แต่เดิมไม่มีเก็บ
    seconds_since_assigned = None
    if assignment.created_at:
        seconds_since_assigned = int((now - assignment.created_at).total_seconds())

    # "ทำได้ตามภารกิจหรือยัง" ตรวจจากบล็อกจริง ไม่ใช่แค่ "รันแล้วไม่ error" (ข้อ 4.5)
    goal_check = _check_task_goal(assignment, submission.blockly_xml_snapshot, submission.sim_ok)

    record_event('assignment.submitted', user.id,
                 subject_type='assignment', subject_id=assignment.id,
                 classroom_id=assignment.classroom_id,
                 payload={'project_id': project.id,
                          'attempt_no': submission.attempt_no,
                          'is_late': submission.is_late,
                          'seconds_since_assigned': seconds_since_assigned,
                          'goal_met': goal_check['met'] if goal_check else None,
                          'goal_missing': goal_check['missing'] if goal_check else None},
                 commit=True)

    return jsonify({
        'submission': submission.to_dict(),
        # บอกสมาชิกตรงๆ ว่ายังขาดอะไร — ส่งได้อยู่ ไม่บล็อก แต่ให้รู้ตัว
        'goal_check': goal_check,
        'room_mode': (assignment.classroom.room_mode or 'graded') if assignment.classroom else 'graded',
    }), 200


# GET /api/assignments/<id>/submissions — ผู้ดูแลดูงานที่ส่งเข้ามา
@dashboard_bp.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
@jwt_required()
def assignment_submissions(assignment_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    assignment = Assignment.query.get(assignment_id)
    if not assignment or assignment.classroom.teacher_id != user.id:
        return jsonify({'error': 'Assignment not found'}), 404

    total_students = _active_members(classroom_id=assignment.classroom_id).count()

    submissions = []
    for s in AssignmentSubmission.query.filter_by(assignment_id=assignment.id).order_by(
        AssignmentSubmission.submitted_at.desc()
    ).all():
        item = s.to_dict()
        item['student_name'] = s.student.display_name if s.student else '-'
        item['project_title'] = s.project.title if s.project else '-'
        item['grade'] = _grade_for_submission(s)
        # ผู้ดูแลเห็นทันทีว่างานชิ้นไหนเข้าเกณฑ์ขั้นต่ำของภารกิจแล้วบ้าง (ข้อ 4.5)
        item['goal_check'] = _check_task_goal(assignment, s.blockly_xml_snapshot, s.sim_ok)
        submissions.append(item)

    return jsonify({
        'assignment': assignment.to_dict(),
        'total_students': total_students,
        'submissions': submissions,
    }), 200


# GET /api/submissions/<id>/snapshot — ผู้ดูแลเปิดดูสิ่งที่เด็ก "กดส่ง" จริง (ข้อ 3.4)
@dashboard_bp.route('/submissions/<int:submission_id>/snapshot', methods=['GET'])
@jwt_required()
def submission_snapshot(submission_id):
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    submission = AssignmentSubmission.query.get(submission_id)
    if not submission:
        return jsonify({'error': 'ไม่พบงานที่ส่งชิ้นนี้'}), 404

    assignment = Assignment.query.get(submission.assignment_id)
    is_owner = submission.student_id == user.id
    is_teacher = assignment and assignment.classroom_id in _owned_classroom_ids(user)
    if not (is_owner or is_teacher):
        return jsonify({'error': 'ไม่มีสิทธิ์ดูงานชิ้นนี้'}), 403

    project = Project.query.get(submission.project_id)
    return jsonify({
        'submission': submission.to_dict(include_snapshot=True),
        # เทียบให้เห็นว่าเด็กแก้ต่อหลังส่งหรือเปล่า
        'project_changed_after_submit': bool(
            project and project.updated_at and submission.submitted_at
            and project.updated_at > submission.submitted_at
        ),
        'project_title': project.title if project else None,
    }), 200


# ====================================================================
# SHARED ROUTES
# ====================================================================

# 14. POST /api/activity — Log activity
@dashboard_bp.route('/activity', methods=['POST'])
@jwt_required()
def log_activity():
    """Log a user activity and check for new achievements."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body'}), 400

    action_type = (data.get('action_type') or '').strip()
    metadata_json = data.get('metadata_json', '')

    if not action_type:
        return jsonify({'error': 'action_type is required'}), 400

    # รับได้เฉพาะชื่อกิจกรรมในรายการนี้
    # เดิมรับข้อความอะไรก็ได้ สมาชิกจึงยิง 'SKILL:Loops' หรือ 'ERRORS_FIXED' มาปลดเหรียญเองได้
    # กิจกรรมที่เป็นหลักฐานความสามารถ (SKILL:*, LOOP_USAGE, ERRORS_FIXED)
    # เซิร์ฟเวอร์เป็นคนบันทึกเองจากบล็อกจริงเท่านั้น — ดู /api/skills/auto
    if action_type not in CLIENT_ALLOWED_ACTIONS:
        return jsonify({'error': 'unknown action_type'}), 400

    # Serialize metadata if it's a dict
    payload = metadata_json if isinstance(metadata_json, dict) else None
    if payload is None and isinstance(metadata_json, str) and metadata_json.strip():
        try:
            parsed = json.loads(metadata_json)
            payload = parsed if isinstance(parsed, dict) else None
        except ValueError:
            payload = None

    if isinstance(metadata_json, dict):
        metadata_json = json.dumps(metadata_json)

    # ดึงตัวเลขหลักออกมาเก็บแยก เพื่อให้ SUM ได้ตรงๆ (ข้อ 3.8)
    value = None
    if payload:
        raw_value = payload.get(ACTION_VALUE_KEYS.get(action_type))
        if isinstance(raw_value, bool):
            raw_value = None
        if isinstance(raw_value, int) and 0 <= raw_value <= 100000:
            value = raw_value

    log = ActivityLog(
        user_id=user.id,
        action_type=action_type,
        metadata_json=metadata_json,
        value=value,
    )
    db.session.add(log)
    db.session.commit()

    # Check and award achievements
    newly_awarded = _check_and_award_achievements(user.id)

    return jsonify({
        'activity': log.to_dict(),
        'new_achievements': newly_awarded,
    }), 201


# POST /api/events — หน้าเว็บส่งเหตุการณ์ที่เกิดในเบราว์เซอร์ (ข้อ 4.7)
@dashboard_bp.route('/events', methods=['POST'])
@jwt_required()
def submit_events():
    """รับเหตุการณ์จากหน้าเว็บทีละชุด (ส่งรวมกันได้เพื่อลดจำนวน request)

    รับได้เฉพาะชื่อใน CLIENT_EVENT_NAMES — เหตุการณ์ที่เป็นหลักฐานความสามารถ
    (ทักษะ คะแนน การส่งงาน) เซิร์ฟเวอร์บันทึกเองตอนทำงานจริงเท่านั้น
    """
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    events = data.get('events')
    if not isinstance(events, list):
        events = [data]

    accepted = 0
    rejected = []
    for item in events[:50]:      # กันยิงชุดใหญ่ผิดปกติ
        if not isinstance(item, dict):
            continue
        name = (item.get('event_name') or '').strip()
        if name not in CLIENT_EVENT_NAMES:
            rejected.append(name)
            continue

        subject_id = item.get('subject_id')
        try:
            subject_id = int(subject_id) if subject_id is not None else None
        except (TypeError, ValueError):
            subject_id = None

        payload = item.get('payload')
        if not isinstance(payload, dict):
            payload = None

        if record_event(
            name, user.id,
            subject_type=(item.get('subject_type') or None),
            subject_id=subject_id,
            payload=payload,
            session_id=(item.get('session_id') or None),
            correlation_id=(item.get('correlation_id') or None),
        ) is not None:
            accepted += 1

    db.session.commit()
    return jsonify({'accepted': accepted, 'rejected': rejected}), 201


# 15. GET /api/activity/chart
@dashboard_bp.route('/activity/chart', methods=['GET'])
@jwt_required()
def get_activity_chart():
    """Get activity chart data (last N days, default 7)."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    days = request.args.get('days', 7, type=int)
    days = min(days, 90)  # cap at 90 days

    chart = _activity_chart(user.id, days)
    return jsonify({'activity_chart': chart}), 200


# 16. GET /api/tutorial/status
@dashboard_bp.route('/tutorial/status', methods=['GET'])
@jwt_required()
def tutorial_status():
    """Get tutorial progress for the current user."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    progress = TutorialProgress.query.filter_by(user_id=user.id).first()
    if not progress:
        # Create default progress
        progress = TutorialProgress(user_id=user.id)
        db.session.add(progress)
        db.session.commit()

    return jsonify({'tutorial_progress': progress.to_dict()}), 200


# 17. POST /api/tutorial/complete
@dashboard_bp.route('/tutorial/complete', methods=['POST'])
@jwt_required()
def tutorial_complete():
    """Mark tutorial as completed."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    progress = TutorialProgress.query.filter_by(user_id=user.id).first()
    if not progress:
        progress = TutorialProgress(user_id=user.id)
        db.session.add(progress)

    progress.is_completed = True
    progress.completed_at = _now_naive()
    record_event('tutorial.completed', user.id)
    db.session.commit()

    # Check for TUTORIAL_COMPLETE achievement
    newly_awarded = _check_and_award_achievements(user.id)

    print(f"[DASHBOARD] Tutorial completed: user={user.id}")

    return jsonify({
        'tutorial_progress': progress.to_dict(),
        'new_achievements': newly_awarded,
    }), 200


# 18. POST /api/tutorial/skip
@dashboard_bp.route('/tutorial/skip', methods=['POST'])
@jwt_required()
def tutorial_skip():
    """Mark tutorial as skipped."""
    user = _get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    progress = TutorialProgress.query.filter_by(user_id=user.id).first()
    if not progress:
        progress = TutorialProgress(user_id=user.id)
        db.session.add(progress)

    progress.skipped = True
    record_event('tutorial.skipped', user.id,
                 payload={'last_step_seen': progress.last_step_seen or 0})
    db.session.commit()

    print(f"[DASHBOARD] Tutorial skipped: user={user.id}")

    return jsonify({'tutorial_progress': progress.to_dict()}), 200
