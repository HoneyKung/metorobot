"""
RoboMDT Research Blueprint — สิ่งที่เล่มวิจัยต้องใช้ (ช่วงที่ 4 ของแผน)

  4.1  อ่าน transcript บทสนทนากับ AI
  4.2  บันทึกคะแนนแบบทดสอบก่อน/หลัง/คงทน
  4.3  ข้อมูลกลุ่มตัวอย่าง + ความยินยอมผู้ปกครอง + สิทธิในการถูกลบข้อมูล
  4.6  ส่งออกข้อมูลเป็น CSV

สิทธิ์ทุก endpoint ตรวจจาก "ความเป็นเจ้าของห้อง" เหมือนส่วนอื่นของระบบ
ไม่มี role นักวิจัยแยก — ผู้ดูแลห้องคือคนที่เข้าถึงข้อมูลสมาชิกของตัวเองได้
"""

import csv
import io
import json
import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from models import (
    db, User, ClassRoom, ClassMembership, Project, ActivityLog,
    LearningObjective, StudentObjectiveProgress, Grade,
    Assignment, AssignmentSubmission, AIConversation, Assessment,
    ParentalConsent, TutorialProgress,
)
from eventlog import record_event

research_bp = Blueprint('research', __name__, url_prefix='/api')


VALID_PHASES = ('PRE', 'POST', 'RETENTION')
VALID_CONSENT = ('PENDING', 'GRANTED', 'DECLINED', 'WITHDRAWN')
VALID_PRIOR_EXP = ('NONE', 'SOME', 'MUCH')
VALID_GROUPS = ('EXP', 'CTRL')


# ==================== HELPERS ====================

def _current_user():
    return db.session.get(User, int(get_jwt_identity()))


def _owned_classroom_ids(user):
    return [c.id for c in ClassRoom.query.filter_by(teacher_id=user.id).all()]


def _teaches(user, student_id):
    owned = _owned_classroom_ids(user)
    if not owned:
        return False
    return ClassMembership.query.filter(
        ClassMembership.student_id == student_id,
        ClassMembership.classroom_id.in_(owned),
    ).first() is not None


def _require_teacher_of(student_id):
    """คืน (user, error_response) — error_response ไม่ใช่ None ถ้าไม่มีสิทธิ์"""
    user = _current_user()
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    if not _teaches(user, student_id):
        return None, (jsonify({'error': 'ไม่ใช่สมาชิกในห้องของคุณ'}), 403)
    return user, None


def _now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_datetime(raw):
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


def _csv_response(rows, header, filename):
    """สร้างไฟล์ CSV ให้ดาวน์โหลด

    ใส่ BOM ไว้ข้างหน้าเพื่อให้ Excel บนเครื่องไทยอ่านภาษาไทยออกโดยไม่ต้องตั้งค่า
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)

    return Response(
        '﻿' + buffer.getvalue(),
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


def _ensure_participant_code(user):
    """ตั้งรหัสนิรนามให้ผู้ใช้ถ้ายังไม่มี — ใช้แทนชื่อจริงตอนเผยแพร่ผล"""
    if user.participant_code:
        return user.participant_code
    for _ in range(20):
        code = 'P' + secrets.token_hex(3).upper()
        if not User.query.filter_by(participant_code=code).first():
            user.participant_code = code
            return code
    return None


# ==================== 4.1 TRANSCRIPT ====================

@research_bp.route('/students/<int:student_id>/ai-conversations', methods=['GET'])
@jwt_required()
def student_conversations(student_id):
    """อ่าน transcript บทสนทนากับ AI (เจ้าของ หรือผู้ดูแลของเจ้าของ)

    เดิมประวัติอยู่ใน dict ในหน่วยความจำ รีสตาร์ตแล้วหาย — วิเคราะห์ Scaffolding ไม่ได้เลย
    """
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if student_id != user.id and not _teaches(user, student_id):
        return jsonify({'error': 'ไม่ใช่สมาชิกในห้องของคุณ'}), 403

    session_id = request.args.get('session_id')
    query = AIConversation.query.filter_by(user_id=student_id)
    if session_id:
        query = query.filter_by(session_id=session_id)

    rows = query.order_by(
        AIConversation.session_id, AIConversation.turn_index
    ).limit(2000).all()

    sessions = {}
    for row in rows:
        sessions.setdefault(row.session_id, []).append(row.to_dict())

    return jsonify({
        'student_id': student_id,
        'session_count': len(sessions),
        'turn_count': len(rows),
        'sessions': [
            {'session_id': sid, 'turns': turns} for sid, turns in sessions.items()
        ],
    }), 200


# ==================== 4.2 แบบทดสอบก่อน/หลังเรียน ====================

@research_bp.route('/assessments', methods=['POST'])
@jwt_required()
def record_assessment():
    """บันทึกคะแนนแบบวัดผลมาตรฐาน (ผู้ดูแลห้องเท่านั้น)

    บันทึกซ้ำที่ (สมาชิก, เครื่องมือ, ระยะ) เดิม = แก้ค่าเดิม ไม่สร้างแถวใหม่
    """
    data = request.get_json() or {}
    student_id = data.get('student_id')
    if not student_id:
        return jsonify({'error': 'student_id is required'}), 400

    user, error = _require_teacher_of(int(student_id))
    if error:
        return error

    instrument = (data.get('instrument') or '').strip()[:50]
    phase = (data.get('phase') or '').strip().upper()
    if not instrument:
        return jsonify({'error': 'ระบุชื่อเครื่องมือวัดผลด้วย เช่น CT-test หรือ Bebras'}), 400
    if phase not in VALID_PHASES:
        return jsonify({'error': f'ระยะต้องเป็นอย่างใดอย่างหนึ่งใน {VALID_PHASES}'}), 400

    def _decimal(value):
        if value in (None, ''):
            return None
        try:
            return Decimal(str(value)).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError

    try:
        total = _decimal(data.get('total'))
        max_total = _decimal(data.get('max_total'))
    except ValueError:
        return jsonify({'error': 'คะแนนต้องเป็นตัวเลข'}), 400

    if total is not None and total < 0:
        return jsonify({'error': 'คะแนนติดลบไม่ได้'}), 400
    if max_total is not None and max_total <= 0:
        return jsonify({'error': 'คะแนนเต็มต้องมากกว่า 0'}), 400
    if total is not None and max_total is not None and total > max_total:
        return jsonify({'error': 'คะแนนมากกว่าคะแนนเต็มไม่ได้'}), 400

    item_scores = data.get('item_scores')
    item_scores_json = None
    if item_scores is not None:
        try:
            item_scores_json = json.dumps(item_scores, ensure_ascii=False)[:20000]
        except (TypeError, ValueError):
            return jsonify({'error': 'คะแนนรายข้อต้องเป็น JSON ที่ถูกต้อง'}), 400

    administered_at = _parse_datetime(data.get('administered_at')) or _now_naive()

    assessment = Assessment.query.filter_by(
        student_id=int(student_id), instrument=instrument, phase=phase
    ).first()
    created = assessment is None
    if created:
        assessment = Assessment(
            student_id=int(student_id), instrument=instrument, phase=phase
        )
        db.session.add(assessment)

    assessment.total = total
    assessment.max_total = max_total
    assessment.item_scores_json = item_scores_json
    assessment.administered_at = administered_at
    assessment.recorded_by_id = user.id
    assessment.note = (data.get('note') or '').strip()[:500] or None

    record_event('assessment.recorded', user.id,
                 subject_type='assessment', subject_id=assessment.id,
                 payload={'student_id': int(student_id), 'instrument': instrument,
                          'phase': phase, 'created': created})

    db.session.commit()
    return jsonify({'assessment': assessment.to_dict(), 'created': created}), (201 if created else 200)


@research_bp.route('/students/<int:student_id>/assessments', methods=['GET'])
@jwt_required()
def student_assessments(student_id):
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if student_id != user.id and not _teaches(user, student_id):
        return jsonify({'error': 'ไม่ใช่สมาชิกในห้องของคุณ'}), 403

    rows = Assessment.query.filter_by(student_id=student_id).order_by(
        Assessment.instrument, Assessment.administered_at
    ).all()
    return jsonify({'student_id': student_id,
                    'assessments': [a.to_dict() for a in rows]}), 200


@research_bp.route('/assessments/<int:assessment_id>', methods=['DELETE'])
@jwt_required()
def delete_assessment(assessment_id):
    assessment = db.session.get(Assessment, assessment_id)
    if not assessment:
        return jsonify({'error': 'ไม่พบรายการนี้'}), 404

    user, error = _require_teacher_of(assessment.student_id)
    if error:
        return error

    db.session.delete(assessment)
    db.session.commit()
    return jsonify({'message': 'ลบรายการแล้ว'}), 200


# ==================== 4.3 ตัวแปรควบคุม + ความยินยอม ====================

@research_bp.route('/students/<int:student_id>/research-profile', methods=['GET', 'PUT'])
@jwt_required()
def research_profile(student_id):
    """ข้อมูลกลุ่มตัวอย่างของสมาชิกหนึ่งคน (ผู้ดูแลห้องเท่านั้น)

    ไม่มีข้อมูลพวกนี้ = เขียนตารางคุณลักษณะกลุ่มตัวอย่าง และแบ่งกลุ่มทดลอง/ควบคุมไม่ได้
    """
    user, error = _require_teacher_of(student_id)
    if error:
        return error

    student = db.session.get(User, student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if request.method == 'GET':
        consent = ParentalConsent.query.filter_by(student_id=student_id).first()
        return jsonify({
            'student': student.to_dict(include_research=True),
            'consent': consent.to_dict() if consent else None,
        }), 200

    data = request.get_json() or {}

    if 'birth_year' in data:
        raw = data.get('birth_year')
        if raw in (None, ''):
            student.birth_year = None
        else:
            try:
                year = int(raw)
            except (TypeError, ValueError):
                return jsonify({'error': 'ปีเกิดต้องเป็นตัวเลข'}), 400
            # รับได้ทั้ง พ.ศ. และ ค.ศ. — เก็บเป็น ค.ศ. เสมอ
            if year > 2400:
                year -= 543
            if not 1900 <= year <= datetime.now().year:
                return jsonify({'error': 'ปีเกิดไม่อยู่ในช่วงที่เป็นไปได้'}), 400
            student.birth_year = year

    for field in ('gender', 'grade_level', 'school_code'):
        if field in data:
            setattr(student, field, (str(data.get(field) or '')).strip()[:20] or None)

    if 'prior_coding_exp' in data:
        value = (str(data.get('prior_coding_exp') or '')).strip().upper() or None
        if value and value not in VALID_PRIOR_EXP:
            return jsonify({'error': f'ประสบการณ์เดิมต้องเป็น {VALID_PRIOR_EXP}'}), 400
        student.prior_coding_exp = value

    if 'research_group' in data:
        value = (str(data.get('research_group') or '')).strip().upper() or None
        if value and value not in VALID_GROUPS:
            return jsonify({'error': f'กลุ่มต้องเป็น {VALID_GROUPS}'}), 400
        student.research_group = value

    if data.get('generate_participant_code') and not student.participant_code:
        _ensure_participant_code(student)

    db.session.commit()
    return jsonify({'student': student.to_dict(include_research=True)}), 200


@research_bp.route('/students/<int:student_id>/consent', methods=['PUT'])
@jwt_required()
def update_consent(student_id):
    """บันทึกความยินยอมของผู้ปกครอง (ผู้ดูแลห้องเท่านั้น)"""
    user, error = _require_teacher_of(student_id)
    if error:
        return error

    data = request.get_json() or {}
    status = (data.get('consent_status') or '').strip().upper()
    if status not in VALID_CONSENT:
        return jsonify({'error': f'สถานะต้องเป็น {VALID_CONSENT}'}), 400

    consent = ParentalConsent.query.filter_by(student_id=student_id).first()
    if not consent:
        consent = ParentalConsent(student_id=student_id)
        db.session.add(consent)

    consent.consent_status = status
    consent.consented_by = (data.get('consented_by') or '').strip()[:120] or None
    consent.document_ref = (data.get('document_ref') or '').strip()[:200] or None
    consent.recorded_by_id = user.id
    consent.consented_at = (
        _parse_datetime(data.get('consented_at')) or _now_naive()
    ) if status == 'GRANTED' else None

    record_event('consent.updated', user.id,
                 subject_type='user', subject_id=student_id,
                 payload={'consent_status': status})

    db.session.commit()
    return jsonify({'consent': consent.to_dict()}), 200


@research_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_own_account():
    """ลบบัญชีตัวเองพร้อมข้อมูลลูกทั้งหมด — รองรับสิทธิในการถูกลบข้อมูล (PDPA)

    ต้องพิมพ์ชื่อผู้ใช้ยืนยันใน body เพื่อกันกดพลาด
    หลักฐานทางการศึกษา (คะแนน/งานที่ส่ง) ถูกป้องกันด้วย ON DELETE RESTRICT
    ถ้ายังมีอยู่จะบอกให้ผู้ดูแลเป็นคนจัดการก่อน แทนที่จะลบเงียบๆ
    """
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    if (data.get('confirm_username') or '').strip().lower() != user.username:
        return jsonify({'error': 'พิมพ์ชื่อผู้ใช้ของคุณเพื่อยืนยันการลบบัญชี'}), 400

    owned = ClassRoom.query.filter_by(teacher_id=user.id).count()
    if owned:
        return jsonify({
            'error': f'คุณยังเป็นเจ้าของห้อง {owned} ห้อง — โอนหรือลบห้องก่อนจึงจะลบบัญชีได้'
        }), 409

    graded = Grade.query.filter(
        (Grade.student_id == user.id) | (Grade.teacher_id == user.id)
    ).count()
    submitted = AssignmentSubmission.query.filter_by(student_id=user.id).count()
    if graded or submitted:
        return jsonify({
            'error': 'บัญชีนี้มีคะแนนหรืองานที่ส่งซึ่งเป็นหลักฐานทางการศึกษา '
                     'ให้ผู้ดูแลห้องลบข้อมูลส่วนนั้นก่อน แล้วค่อยลบบัญชี',
            'grades': graded,
            'submissions': submitted,
        }), 409

    username = user.username
    record_event('user.account_deleted', user.id,
                 subject_type='user', subject_id=user.id, commit=True)

    # แถวลูกที่เหลือหายตาม ON DELETE CASCADE ที่ประกาศไว้ในช่วงที่ 2
    db.session.delete(user)
    db.session.commit()

    print(f'[PDPA] ลบบัญชี {username} พร้อมข้อมูลลูกทั้งหมดแล้ว')
    return jsonify({'message': 'ลบบัญชีและข้อมูลทั้งหมดเรียบร้อย'}), 200


# ==================== 4.6 ส่งออกข้อมูล ====================

def _classroom_rows(classroom, anonymize):
    """หนึ่งแถวต่อสมาชิกหนึ่งคน — ตัวเลขที่ผู้ดูแล/นักวิจัยใช้บ่อยที่สุด"""
    memberships = ClassMembership.query.filter_by(classroom_id=classroom.id).all()
    total_objectives = LearningObjective.query.count() or 1
    rows = []

    for membership in memberships:
        student = db.session.get(User, membership.student_id)
        if not student:
            continue

        runs = db.session.query(func.count(ActivityLog.id)).filter(
            ActivityLog.user_id == student.id,
            ActivityLog.action_type == 'RUN_CODE').scalar() or 0
        blocks = db.session.query(func.coalesce(func.sum(ActivityLog.value), 0)).filter(
            ActivityLog.user_id == student.id,
            ActivityLog.action_type == 'BLOCK_COUNT').scalar() or 0
        ai_asks = db.session.query(func.count(ActivityLog.id)).filter(
            ActivityLog.user_id == student.id,
            ActivityLog.action_type == 'ASK_AI').scalar() or 0
        mastered = db.session.query(func.count(StudentObjectiveProgress.id)).filter(
            StudentObjectiveProgress.student_id == student.id,
            StudentObjectiveProgress.status == 'COMPLETED').scalar() or 0
        projects = db.session.query(func.count(Project.id)).filter(
            Project.user_id == student.id).scalar() or 0
        submissions = db.session.query(func.count(AssignmentSubmission.id)).filter(
            AssignmentSubmission.student_id == student.id).scalar() or 0
        late = db.session.query(func.count(AssignmentSubmission.id)).filter(
            AssignmentSubmission.student_id == student.id,
            AssignmentSubmission.is_late.is_(True)).scalar() or 0
        ai_turns = db.session.query(func.count(AIConversation.id)).filter(
            AIConversation.user_id == student.id,
            AIConversation.role == 'user').scalar() or 0

        grade_rows = Grade.query.filter_by(student_id=student.id).all()
        avg_pct = None
        if grade_rows:
            ratios = [float(g.score) / float(g.max_score) for g in grade_rows if g.max_score]
            if ratios:
                avg_pct = round(sum(ratios) / len(ratios) * 100, 2)

        tutorial = TutorialProgress.query.filter_by(user_id=student.id).first()
        consent = ParentalConsent.query.filter_by(student_id=student.id).first()
        assessments = {
            f'{a.phase}': (float(a.total) if a.total is not None else None)
            for a in Assessment.query.filter_by(student_id=student.id).all()
        }

        if anonymize:
            identity = [_ensure_participant_code(student) or f'U{student.id}']
        else:
            identity = [student.id, student.username, student.display_name]

        rows.append(identity + [
            membership.student_no or '',
            membership.status,
            classroom.name,
            classroom.academic_year or '',
            classroom.semester or '',
            student.birth_year or '',
            student.gender or '',
            student.grade_level or '',
            student.prior_coding_exp or '',
            student.research_group or '',
            consent.consent_status if consent else 'PENDING',
            runs, blocks, ai_asks, ai_turns, projects,
            submissions, late,
            mastered, total_objectives,
            avg_pct if avg_pct is not None else '',
            assessments.get('PRE', ''),
            assessments.get('POST', ''),
            assessments.get('RETENTION', ''),
            'yes' if (tutorial and tutorial.is_completed) else 'no',
        ])

    return rows


_COMMON_HEADER = [
    'student_no', 'membership_status', 'classroom', 'academic_year', 'semester',
    'birth_year', 'gender', 'grade_level', 'prior_coding_exp', 'research_group',
    'consent_status',
    'run_count', 'block_total', 'ai_ask_count', 'ai_turn_count', 'project_count',
    'submission_count', 'late_submission_count',
    'objectives_mastered', 'objectives_total',
    'avg_grade_percent', 'assessment_pre', 'assessment_post', 'assessment_retention',
    'tutorial_completed',
]


@research_bp.route('/classrooms/<int:classroom_id>/export.csv', methods=['GET'])
@jwt_required()
def export_classroom_csv(classroom_id):
    """ส่งออกข้อมูลห้องเป็น CSV สำหรับผู้ดูแล (มีชื่อจริง)"""
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    rows = _classroom_rows(classroom, anonymize=False)
    db.session.commit()   # เผื่อมีการตั้ง participant_code ระหว่างทาง

    record_event('data.exported', user.id,
                 subject_type='classroom', subject_id=classroom.id,
                 classroom_id=classroom.id,
                 payload={'kind': 'classroom', 'rows': len(rows)}, commit=True)

    header = ['student_id', 'username', 'display_name'] + _COMMON_HEADER
    return _csv_response(rows, header, f'classroom_{classroom_id}.csv')


@research_bp.route('/research/export.csv', methods=['GET'])
@jwt_required()
def export_research_csv():
    """ส่งออกข้อมูลทุกห้องที่ตัวเองเป็นเจ้าของ แบบไม่ระบุตัวตน

    ใช้ participant_code แทนชื่อจริง — เอาไปแนบเล่มหรือส่งให้ที่ปรึกษาได้
    """
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classrooms = ClassRoom.query.filter_by(teacher_id=user.id).all()
    if not classrooms:
        return jsonify({'error': 'คุณยังไม่มีห้องของตัวเอง'}), 404

    rows = []
    for classroom in classrooms:
        rows.extend(_classroom_rows(classroom, anonymize=True))
    db.session.commit()

    record_event('data.exported', user.id,
                 payload={'kind': 'research', 'rows': len(rows),
                          'classrooms': len(classrooms)}, commit=True)

    header = ['participant_code'] + _COMMON_HEADER
    return _csv_response(rows, header, 'research_export.csv')


@research_bp.route('/classrooms/<int:classroom_id>/events.csv', methods=['GET'])
@jwt_required()
def export_events_csv(classroom_id):
    """ส่งออกเหตุการณ์ดิบของสมาชิกในห้อง — ใช้วิเคราะห์พฤติกรรมละเอียด (ข้อ 4.7)"""
    from models import Event   # นำเข้าตรงนี้เพื่อไม่ให้ import วนกันตอนโหลดโมดูล

    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    classroom = db.session.get(ClassRoom, classroom_id)
    if not classroom or classroom.teacher_id != user.id:
        return jsonify({'error': 'Classroom not found'}), 404

    student_ids = [m.student_id for m in
                   ClassMembership.query.filter_by(classroom_id=classroom_id).all()]
    if not student_ids:
        return _csv_response([], ['occurred_at', 'participant_code', 'event_name',
                                  'subject_type', 'subject_id', 'payload'],
                             f'events_{classroom_id}.csv')

    codes = {}
    for student in User.query.filter(User.id.in_(student_ids)).all():
        codes[student.id] = _ensure_participant_code(student) or f'U{student.id}'
    db.session.commit()

    events = Event.query.filter(
        Event.actor_id.in_(student_ids)
    ).order_by(Event.occurred_at).limit(50000).all()

    rows = [[
        e.occurred_at.isoformat() if e.occurred_at else '',
        codes.get(e.actor_id, ''),
        e.event_name, e.subject_type or '', e.subject_id or '',
        e.payload_json or '',
    ] for e in events]

    record_event('data.exported', user.id,
                 subject_type='classroom', subject_id=classroom.id,
                 classroom_id=classroom.id,
                 payload={'kind': 'events', 'rows': len(rows)}, commit=True)

    return _csv_response(rows, ['occurred_at', 'participant_code', 'event_name',
                                'subject_type', 'subject_id', 'payload'],
                         f'events_{classroom_id}.csv')
