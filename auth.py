"""
RoboMDT Authentication Blueprint
Handles user registration, login, profile management via JWT
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, ClassRoom, ClassMembership, ActivityLog, TutorialProgress
from extensions import limiter
from eventlog import record_event

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ข้อความที่ผู้ใช้เห็นต้องเป็นภาษาไทยทุกจุด — คนใช้จริงคือเด็ก ม.ต้น
# ที่อ่านอังกฤษไม่ออก และทุกข้อความต้องบอก "ต้องทำอะไรต่อ" ไม่ใช่แค่ "อะไรผิด"
# ไม่มีน้ำเสียงตำหนิ ความผิดพลาดตอนเรียนเป็นเรื่องปกติ

# token หมดอายุ/ใช้ไม่ได้ — ใช้ข้อความเดียวกันทุกจุด
# เด็กจะได้เห็นทางออกเดิมทุกครั้ง ไม่ต้องเดาว่าแต่ละหน้าให้ทำอะไรไม่เหมือนกัน
SESSION_EXPIRED_MSG = 'ระบบให้ล็อกอินใหม่นะ กดปุ่ม "เข้าสู่ระบบ" ด้านบนขวา'


def _username_key():
    """ใช้ชื่อผู้ใช้เป็นกุญแจนับ rate limit
    ทั้งห้องออกเน็ตผ่าน IP เดียวกัน — ถ้านับที่ IP เด็ก 35 คนจะบล็อกกันเอง
    การเดารหัสผ่านพุ่งเป้าที่ 'บัญชี' อยู่แล้ว จึงนับที่บัญชีตรงกว่า"""
    data = request.get_json(silent=True) or {}
    return (data.get('username') or '').strip().lower() or 'anonymous'


# ==================== HELPERS ====================

def _log_activity(user_id, action_type, metadata_json=None):
    """Log a user activity."""
    log = ActivityLog(
        user_id=user_id,
        action_type=action_type,
        metadata_json=metadata_json,
    )
    db.session.add(log)
    db.session.commit()


# ==================== ROUTES ====================

@auth_bp.route('/register', methods=['POST'])
# นับที่ IP (ค่าเริ่มต้น) เพราะตอนสมัครยังไม่มีบัญชีให้นับ
# แต่ทั้งโรงเรียนออกเน็ตผ่าน IP เดียว — ผู้ดูแลสอน 3 คาบติดใน 1 ชั่วโมง
# คาบละ ~35 คน = ~105 คน เพดานเดิม 100/ชม. จึงตัดคาบสุดท้ายทิ้งทั้งคาบ
# ทั้งที่ทุกคนทำถูก 300/ชม. เผื่อ 3 คาบเต็มบวกคนกรอกผิดแล้วกดซ้ำ
# ส่วนเพดานต่อนาทีไว้กันสคริปต์ยิงรัว — ห้องจริงไม่มีทางแตะ 100 ครั้ง/นาที
@limiter.limit('100 per minute; 300 per hour')
def register():
    """
    Register a new user.
    
    Body JSON:
      - username: str (required)
      - password: str (required)
      - display_name: str (required)
      - invite_code: str (optional — auto-join classroom)

    ทุกคนสมัครเป็น USER (universal user) — บทบาท teacher/student
    เกิดจากการสร้าง/เข้าร่วมห้องภายหลัง

    Returns: JWT token + user info
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'ข้อมูลส่งมาไม่ครบ ลองกดสมัครสมาชิกอีกครั้งนะ'}), 400

    username = (data.get('username') or '').strip().lower()
    password = (data.get('password') or '').strip()
    display_name = (data.get('display_name') or '').strip()
    role = 'USER'  # universal user เสมอ — ไม่รับ role จาก client
    invite_code = (data.get('invite_code') or '').strip().upper()

    # --- Validation ---
    if not username or not password or not display_name:
        return jsonify({'error': 'ยังกรอกไม่ครบ เช็คให้ครบทุกช่องนะ'}), 400

    # บอกจำนวนตัวอักษรที่พิมพ์มาด้วย เด็กจะได้รู้ว่าต้องเติมอีกกี่ตัว ไม่ต้องนั่งนับเอง
    if len(username) < 3:
        return jsonify({
            'error': f'ชื่อผู้ใช้ต้องยาว 3 ตัวขึ้นไป (ตอนนี้ {len(username)} ตัว)'
        }), 400

    if len(password) < 6:
        return jsonify({
            'error': f'รหัสผ่านต้องยาว 6 ตัวขึ้นไป (ตอนนี้ {len(password)} ตัว)'
        }), 400

    # ชื่อซ้ำ — เสนอชื่อที่ใช้ได้ไปเลย เพราะทั้งห้องมักตั้งชื่อคล้ายกัน
    # ถ้าบอกแค่ "ชื่อซ้ำ" เด็กจะนั่งเดาชื่อใหม่ทีละอันจนหมดคาบ
    if User.query.filter_by(username=username).first():
        return jsonify({
            'error': f'ชื่อ "{username}" มีคนใช้แล้ว ลองเติมเลขท้าย เช่น {username}01 ดูนะ'
        }), 409

    # --- Create user ---
    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        display_name=display_name,
        role=role,
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # Create tutorial progress record
    tutorial = TutorialProgress(user_id=user.id)
    db.session.add(tutorial)

    # --- Auto-join classroom if invite_code provided ---
    classroom_info = None
    if invite_code:
        classroom = ClassRoom.query.filter_by(invite_code=invite_code).first()
        # เงื่อนไขต้องตรงกับ POST /api/classrooms/join (dashboard.py) ทุกข้อ
        # เดิมทางนี้เช็คแค่ "มีห้องไหม" ผลคือสมัครใหม่พร้อมรหัสเก่า
        # เข้าห้องที่ผู้ดูแลเก็บถาวร/ปิดรับ/รหัสหมดอายุไปแล้วได้ ทั้งที่อีกทางเข้าไม่ได้
        if not classroom:
            # ไม่ล้มการสมัคร แค่บอกให้รู้ — เข้าห้องทีหลังได้
            classroom_info = {'warning': 'ไม่พบห้องจากรหัสนี้ — เข้าร่วมทีหลังได้'}
        elif not classroom.is_active:
            classroom_info = {'warning': 'ห้องนี้ปิดแล้ว (ผู้ดูแลเก็บถาวรไปแล้ว)'}
        elif not classroom.is_open:
            classroom_info = {'warning': 'ห้องนี้ปิดรับสมาชิกใหม่แล้ว'}
        elif not classroom.invite_is_usable():
            classroom_info = {'warning': 'รหัสเชิญหมดอายุแล้ว ขอรหัสใหม่จากผู้ดูแลนะ'}
        else:
            membership = ClassMembership(
                classroom_id=classroom.id,
                student_id=user.id,
            )
            db.session.add(membership)
            classroom_info = classroom.to_dict()
            db.session.flush()
            record_event('classroom.joined', user.id,
                         subject_type='classroom', subject_id=classroom.id,
                         classroom_id=classroom.id,
                         payload={'via': 'register_with_invite_code'})

    db.session.commit()

    # Log activity
    _log_activity(user.id, 'REGISTER')
    record_event('user.registered', user.id,
                 payload={'joined_classroom': bool(invite_code and classroom_info
                                                   and 'warning' not in classroom_info)},
                 commit=True)

    # Create JWT token
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
        'classroom': classroom_info,
    }), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute; 50 per hour', key_func=_username_key)
@limiter.limit('200 per minute')
def login():
    """
    Login with username + password.
    
    Body JSON:
      - username: str (required)
      - password: str (required)
    
    Returns: JWT token + user info
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'ข้อมูลส่งมาไม่ครบ ลองกดเข้าสู่ระบบอีกครั้งนะ'}), 400

    username = (data.get('username') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not username or not password:
        return jsonify({'error': 'ยังกรอกไม่ครบ ใส่ทั้งชื่อผู้ใช้และรหัสผ่านนะ'}), 400

    # Find user
    # ตอบข้อความเดียวกันทั้งกรณีไม่มีชื่อนี้และรหัสผิด — ไม่งั้นคนอื่นไล่เดาได้ว่าใครมีบัญชี
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({
            'error': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูก ลองพิมพ์ใหม่ ถ้าจำไม่ได้ ให้ผู้ดูแลห้องช่วยตั้งใหม่ให้ได้'
        }), 401

    # Update last_login_at
    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()

    # Log activity
    _log_activity(user.id, 'LOGIN')
    record_event('user.logged_in', user.id, commit=True)

    # Create JWT token
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    ขอ access token ใบใหม่ด้วย refresh token
    access token อายุสั้น (1 วัน) เพื่อจำกัดความเสียหายถ้าหลุด
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({'error': SESSION_EXPIRED_MSG}), 401

    return jsonify({'token': create_access_token(identity=str(user.id))}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout — บันทึกเวลาออกจากระบบเพื่อคำนวณความยาว session ได้
    (JWT ยังเป็น stateless — ฝั่งหน้าเว็บต้องทิ้ง token ทั้งสองใบ)
    """
    user_id = get_jwt_identity()
    _log_activity(int(user_id), 'LOGOUT')
    record_event('user.logged_out', int(user_id), commit=True)
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """
    Get current authenticated user info.
    Requires: Authorization: Bearer <token>
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': SESSION_EXPIRED_MSG}), 404

    # Include tutorial progress
    tutorial = TutorialProgress.query.filter_by(user_id=user.id).first()

    return jsonify({
        'user': user.to_dict(),
        'tutorial_progress': tutorial.to_dict() if tutorial else None,
    }), 200


# รูปโปรไฟล์รับได้ 3 แบบเท่านั้น — กันคนยัดอะไรก็ได้ลงคอลัมน์นี้
# ค่าที่ใหญ่สุดคือรูปอัปโหลด ซึ่งฝั่งเว็บย่อเป็นจัตุรัส 160px JPEG มาแล้ว
# ปกติได้ 6-12 KB · เผื่อไว้ที่ 200 KB แล้วปฏิเสธถ้าเกิน
AVATAR_MAX_CHARS = 200 * 1024
_ALLOWED_AVATAR_PREFIXES = ('data:image/jpeg;base64,', 'data:image/png;base64,',
                            'data:image/webp;base64,')


def _validate_avatar(value):
    """คืน (ผ่านไหม, ข้อความ error)"""
    if value.startswith('face:'):
        # หน้าหุ่น — ตรวจว่าปลดล็อกแล้วจริงที่ /api/faces/chosen ไม่ใช่ที่นี่
        return (len(value) <= 40, 'ชื่อหน้าหุ่นยาวผิดปกติ')
    if value.startswith(_ALLOWED_AVATAR_PREFIXES):
        if len(value) > AVATAR_MAX_CHARS:
            return False, 'รูปใหญ่เกินไป ลองใช้รูปที่เล็กกว่านี้นะ'
        return True, None
    return False, 'รองรับเฉพาะรูป JPEG/PNG/WebP'


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Update user profile (display_name, avatar_url).
    Requires: Authorization: Bearer <token>
    
    Body JSON:
      - display_name: str (optional)
      - avatar_url: str (optional)
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': SESSION_EXPIRED_MSG}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'ยังไม่มีข้อมูลที่จะบันทึก ลองกรอกแล้วกดบันทึกใหม่นะ'}), 400

    # Update fields if provided
    if 'display_name' in data:
        new_name = (data['display_name'] or '').strip()
        if new_name:
            user.display_name = new_name

    if 'avatar_url' in data:
        value = (data['avatar_url'] or '').strip()
        if not value:
            user.avatar_url = None
        else:
            ok, error = _validate_avatar(value)
            if not ok:
                return jsonify({'error': error}), 400
            user.avatar_url = value

    db.session.commit()

    _log_activity(user.id, 'PROFILE_UPDATE')

    return jsonify({
        'user': user.to_dict(),
    }), 200
