"""
RoboMDT — บัญชีผู้ใช้และบทสนทนา AI

สองอย่างนี้เคยอยู่ใน research.py เพราะบังเอิญถูกทำขึ้นในช่วงเดียวกับงานวิจัย
แต่มันไม่ใช่ของงานวิจัย — เป็นฟีเจอร์ของเว็บที่ผู้ใช้จริงต้องมี:

  ลบบัญชีตัวเอง      สิทธิตาม PDPA ผู้ใช้ต้องลบข้อมูลตัวเองได้โดยไม่ต้องขอใคร
  อ่านแชท AI         ผู้ดูแลดูได้ว่าเด็กถามอะไรไป จะได้รู้ว่าเด็กติดตรงไหน

ส่วนที่เป็นงานวิจัยล้วนๆ (แบบทดสอบก่อน/หลัง, กลุ่มทดลอง/ควบคุม, ความยินยอมผู้ปกครอง,
ส่งออก CSV นิรนาม) ถูกถอดออกจากเว็บแล้ว — โค้ดเดิมยังอยู่ที่ research.py
แต่ไม่ได้ถูก register เข้าแอป เอาไว้ยกไปทำสคริปต์แยกที่ควบคุมได้เอง

สิทธิ์ตรวจจาก "ความเป็นเจ้าของห้อง" เหมือนส่วนอื่นของระบบ
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import (
    db, User, ClassRoom, ClassMembership, Grade,
    AssignmentSubmission, AIConversation,
)
from eventlog import record_event

account_bp = Blueprint('account', __name__, url_prefix='/api')


def _current_user():
    return db.session.get(User, int(get_jwt_identity()))


def _teaches(user, student_id):
    """user เป็นผู้ดูแลของ student_id หรือเปล่า — ดูจากห้องที่ user เป็นเจ้าของ"""
    owned = [c.id for c in ClassRoom.query.filter_by(teacher_id=user.id).all()]
    if not owned:
        return False
    return ClassMembership.query.filter(
        ClassMembership.student_id == student_id,
        ClassMembership.classroom_id.in_(owned),
    ).first() is not None


@account_bp.route('/students/<int:student_id>/ai-conversations', methods=['GET'])
@jwt_required()
def student_conversations(student_id):
    """อ่าน transcript บทสนทนากับ AI (เจ้าของ หรือผู้ดูแลของเจ้าของ)

    เดิมประวัติอยู่ใน dict ในหน่วยความจำ รีสตาร์ตแล้วหาย
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


@account_bp.route('/account', methods=['DELETE'])
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
