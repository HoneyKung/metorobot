"""
RoboMDT AI Backend Server
เชื่อมต่อ Gemini 2.5 Pro สำหรับ AI ผู้ช่วยสอน Block-based Coding
"""

import os
import re
import uuid
from datetime import timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_migrate import Migrate
from google import genai
from dotenv import load_dotenv
from sqlalchemy import func
from models import db, seed_data, AIConversation
from extensions import limiter
from eventlog import record_event
from auth import auth_bp
from dashboard import dashboard_bp
from account import account_bp
# research.py ไม่ได้ถูก register แล้ว — งานวิจัยต้องเป็นสคริปต์แยกที่ควบคุมได้เอง
# ไม่ใช่ endpoint เปิดอยู่บนเว็บที่ผู้ใช้จริงใช้

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# โหลดตัวแปรจากไฟล์ keyAPI.env (อ้างจากโฟลเดอร์ของ server.py ไม่ใช่ cwd)
# ถ้าตั้งค่าตัวแปรสภาพแวดล้อมไว้แล้ว (เช่นบน Render) ไฟล์นี้ไม่จำเป็น
load_dotenv(os.path.join(BASE_DIR, "keyAPI.env"))

# static_folder ต้องเป็นโฟลเดอร์ static/ เท่านั้น
# ถ้าชี้ที่ '.' Flask จะเสิร์ฟทั้งโปรเจกต์ให้ดาวน์โหลด รวมถึง instance/robomdt.db และ keyAPI.env
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static',
)

IS_PRODUCTION = bool(os.environ.get('RENDER'))

# CORS — ระบุ origin ที่อนุญาตเท่านั้น ไม่เปิดให้ทุกเว็บเรียก API ของเด็ก
# ตั้งค่าผ่าน CORS_ORIGINS (คั่นด้วยจุลภาค) เช่น "https://robomdt.onrender.com"
_cors_env = os.environ.get('CORS_ORIGINS', '').strip()
if _cors_env:
    CORS_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()]
elif IS_PRODUCTION:
    CORS_ORIGINS = []  # production ที่ไม่ได้ตั้งค่า = อนุญาตเฉพาะ same-origin
else:
    CORS_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']

CORS(app, origins=CORS_ORIGINS, supports_credentials=False)

# Database & JWT Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///robomdt.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# กุญแจเซ็น token — บน production ต้องมีค่าจริงเสมอ
# ถ้าถอยไปใช้ค่า dev เงียบๆ ใครอ่านโค้ดก็ปลอม token เป็นผู้ดูแลได้
JWT_SECRET = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError('JWT_SECRET_KEY is required in production')
    JWT_SECRET = 'dev-only-secret'
    print('[WARNING] JWT_SECRET_KEY is not set — using dev-only secret (local development only)')

app.config['JWT_SECRET_KEY'] = JWT_SECRET
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

db.init_app(app)
migrate = Migrate(app, db, render_as_batch=True)  # batch mode = ALTER TABLE บน SQLite ได้
jwt = JWTManager(app)
limiter.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(account_bp)


# ==================== ERROR HANDLERS ====================

@app.errorhandler(429)
def handle_rate_limit(err):
    """โดน rate limit — ต้องตอบเป็น JSON ภาษาไทยเสมอ

    ค่าเริ่มต้นของ Flask ตอบ 429 เป็นหน้า HTML ฝั่งเว็บเรียก res.json() แล้ว throw
    เด้งเข้า catch ซึ่งเป็นช่องของ "เน็ตไปไม่ถึงเซิร์ฟเวอร์" เด็กจึงเห็น
    "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" ทั้งที่เซิร์ฟเวอร์ตอบอยู่ดี ๆ
    ผู้ดูแลก็ไปนั่งไล่แก้ WiFi ทั้งคาบโดยที่ปัญหาอยู่คนละที่

    บอกให้ตรงว่ากำลังทำอะไรอยู่ตอนโดน เด็กจะได้รู้ว่าต้อง "รอ" ไม่ใช่ "กรอกผิด"
    """
    path = request.path or ''
    if path.endswith('/register'):
        message = 'ตอนนี้มีคนสมัครพร้อมกันเยอะ รอสัก 1 นาทีแล้วลองใหม่นะ'
    elif path.endswith('/login'):
        message = 'ลองเข้าสู่ระบบถี่ไปหน่อย พักสัก 1 นาทีแล้วลองใหม่นะ ถ้าจำรหัสไม่ได้ ให้ผู้ดูแลห้องช่วยตั้งใหม่ให้ได้'
    else:
        message = 'ตอนนี้มีคนใช้ระบบพร้อมกันเยอะ รอสักครู่แล้วลองใหม่นะ'

    return jsonify({'error': message}), 429

# ==================== CONFIG ====================
API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = "gemini-2.5-pro"  # Stable, long-context ดี

# จำนวนข้อความเก่าที่เก็บไว้ต่อ session (เก็บ user+model สลับกัน)
MAX_HISTORY_TURNS = 20  # 20 messages = 10 รอบสนทนา

# System Prompt — กำหนดบทบาท AI เป็น "ผู้ช่วยสอน" ไม่ใช่ "ผู้เฉลย"
SYSTEM_PROMPT = """คุณคือ ผู้ช่วยสอน Block-based Coding สำหรับหุ่นยนต์ RoboMDT

บล็อกที่มีในเว็บ (ชื่อตรงกับที่ผู้เรียนเห็น):
🔵 Motion: forward (เดินหน้า), backward (ถอยหลัง), left (เลี้ยวซ้าย), right (เลี้ยวขวา),
   forward/backward for N ms (เดิน/ถอยตามเวลา 100–5000 ms), turn left/right for N ms, stop (หยุดล้อ),
   เซนเซอร์: edge detected left/right? (เจอขอบโต๊ะไหม)
🟣 Arm: Left Arm: Up/Middle/Down, Right Arm: Up/Middle/Down,
   Left Arm/Right Arm/Both Arms lift to N° (−43 ถึง 48 องศาจากแนวนอน ค่าบวก = ยก)
💗 Hand (มือหนีบ): Right Hand: กาง/กลาง/หนีบ, Left Hand: กาง/กลาง/หนีบ,
   Left Hand/Right Hand/Both Hands หนีบ N% (0 = กางสุด 100 = หนีบสุด)
🟡 Head: Head: Turn Right/Center/Turn Left, Head: turn to N° (−90 ถึง 90 ค่าบวก = หันไปทางแขนซ้าย),
   Head: tilt N° (−10 ถึง 10 ค่าบวก = เงย), Head speed N°/s (10–200)
🔴 Face: Normal/Look Left/Look Right/Happy/Sad/Angry/Shocked/Sleepy/Confused/Love/Shy,
   Emotion: X (ตา + ท่าทาง ค้าง 2.5 วิแล้วกลับปกติ), เซนเซอร์: face seen is Happy/Sad/Normal/any face/no face?
🟦 Gripper: Grip: Smart Grab, Grip: Release, Grip: Grab & Lift, Grip: N%,
   เซนเซอร์: holding something? (ถือของอยู่ไหม), Grab & Lift worked? (ยกได้จริงไหม)
🟠 Control: START PROGRAM, delay 1 sec, Wait N seconds, wait N ms, repeat N times, repeat forever,
   while/until, if/else, if/else if
🟢 Operator: ตัวเปรียบเทียบ (= ≠ < > ≤ ≥), and/or, not, true/false, ตัวเลข, บวกลบคูณหาร, สุ่มตัวเลข
🟤 Variables: สร้างตัวแปรใหม่ ตั้งค่า (set) เพิ่มค่า (change) อ่านค่า

บล็อกเซนเซอร์ใช้ใส่ในช่องเงื่อนไขของ if / while / repeat until — หุ่นจะทำคำสั่งก่อนหน้าให้เสร็จก่อนแล้วค่อยอ่านเซนเซอร์

รูปแบบโค้ดที่จะได้รับ:
- โค้ดจะมาเป็น "กลุ่ม" (block groups) แยกกัน เช่น:
  [กลุ่ม 1] START PROGRAM → forward → left → forward → left
  [กลุ่ม 2] (บล็อกลอย) → Face: Happy → delay 1 sec
- กลุ่มที่ขึ้นต้นด้วย START PROGRAM คือโปรแกรมหลักที่จะรัน
- กลุ่มอื่นๆ คือบล็อกที่ผู้เรียนกำลังเตรียม/ทดลอง
- ถ้ามี repeat/if/while จะแสดงเป็นโครงสร้างซ้อน เช่น:
  repeat 4 times { forward → left }

กฎสำคัญ:
1. ห้ามเฉลยคำตอบ — ให้คำใบ้และถามกลับเพื่อกระตุ้นให้คิด
2. ถ้าเด็กทำถูก → ชมเชย + ให้ภารกิจท้าทายเพิ่ม
3. ถ้าเด็กทำผิด → ชี้ว่าผิดตรงไหน + ให้คำใบ้ให้ลองแก้เอง
4. ตอบสั้น 2-3 ประโยค ภาษาไทย เป็นกันเอง ใช้อิโมจิได้
5. ถ้าโค้ดว่าง ให้แนะนำให้เริ่มลากบล็อก START PROGRAM ก่อน
6. ใช้ชื่อบล็อกเป็นภาษาอังกฤษตามที่แสดงในเว็บ
7. ถ้ามีหลายกลุ่มบล็อก ให้วิเคราะห์แต่ละกลุ่มแยกกัน

⚠️ ตรวจสอบ error เหล่านี้ทุกครั้งก่อนตอบ (สำคัญมาก):
- ❌ ไม่มี START PROGRAM → บอกว่า "ลองเพิ่ม START PROGRAM ก่อนนะ ไม่งั้นหุ่นยนต์จะไม่รู้ว่าเริ่มจากตรงไหน"
- ❌ มีบล็อกลอย (ไม่ต่อ START) → บอกว่า "มีบล็อกกลุ่มนี้ลอยอยู่ ลองต่อเข้ากับ START PROGRAM ดูนะ"
- ❌ repeat/while/if ว่าง (ไม่มีคำสั่งข้างใน) → บอกว่า "มี loop/if ว่างอยู่ ลองใส่คำสั่งข้างในดูนะ"
- ❌ if (...) ไม่มีเงื่อนไข → บอกว่า "if ยังไม่มีเงื่อนไข ลองใส่บล็อก true/false หรือตัวเปรียบเทียบเข้าไปนะ"
- ❌ คำสั่งแขน/มือ เปลี่ยนเร็วไม่มี delay คั่น → บอกว่า "คำสั่งรันเร็วมาก ลองเพิ่ม delay คั่นดูไหม"
- ❌ repeat 0 times หรือ repeat 1 times → บอกว่า "ทำซ้ำ 0/1 ครั้งอาจไม่ได้ผลตามที่คาดหวัง"
- ❌ ใช้ตัวแปรที่ยังไม่ได้ set → บอกว่า "ตัวแปรนี้ยังไม่ได้กำหนดค่า ลอง set ก่อนนะ"
- ❌ คำสั่งซ้ำโดยไม่จำเป็น (เช่น forward forward forward forward) → แนะนำว่า "ลองใช้ repeat block แทนจะสั้นกว่า"

ถ้าไม่พบ error ใดๆ ค่อยชมเชยและให้ภารกิจท้าทายเพิ่ม"""

# ==================== Gemini Client ====================
client = None

def get_client():
    global client
    if client is None:
        if not API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable is not set!")
        client = genai.Client(api_key=API_KEY)
    return client

# ==================== Conversation History ====================
# เก็บลงตาราง ai_conversations ไม่ใช่ dict ในหน่วยความจำอีกแล้ว (ข้อ 4.1)
#   - รีสตาร์ตเซิร์ฟเวอร์แล้วประวัติไม่หาย
#   - gunicorn หลาย worker เห็นประวัติชุดเดียวกัน (เดิมไม่แชร์ตัวแปรกัน)
#   - มี transcript ให้วิเคราะห์ผลของ Scaffolding ในบทที่ 3 ได้จริง

def _normalize_session_id(session_id):
    """session_id ที่ใช้จริง — ผูกกับเจ้าของเสมอ กันคนเดา id ของคนอื่นแล้วอ่านบทสนทนา"""
    return (session_id or 'default').strip()[:64] or 'default'


def _session_key(user_id, session_id):
    return f"{user_id}:{_normalize_session_id(session_id)}"


def get_history(user_id, session_id):
    """ดึงบทสนทนาล่าสุดของ session นี้จากฐานข้อมูล (รูปแบบที่ Gemini ต้องการ)"""
    rows = AIConversation.query.filter_by(
        user_id=int(user_id),
        session_id=_normalize_session_id(session_id),
    ).order_by(AIConversation.turn_index.desc()).limit(MAX_HISTORY_TURNS).all()

    return [
        {"role": row.role, "parts": [{"text": row.message_text}]}
        for row in reversed(rows)
    ]


def save_turns(user_id, session_id, turns, project_id=None, blockly_xml=None):
    """บันทึกบทสนทนา (คู่ user + model) ลงฐานข้อมูล

    ล้มเหลวต้องไม่ทำให้เด็กใช้แชทไม่ได้ — เก็บ log ไม่ได้ก็ปล่อยผ่าน
    """
    sid = _normalize_session_id(session_id)
    try:
        last = db.session.query(func.coalesce(func.max(AIConversation.turn_index), -1)).filter(
            AIConversation.user_id == int(user_id),
            AIConversation.session_id == sid,
        ).scalar()
        next_index = (last if last is not None else -1) + 1

        for role, text in turns:
            db.session.add(AIConversation(
                session_id=sid,
                user_id=int(user_id),
                project_id=project_id,
                turn_index=next_index,
                role=role,
                message_text=text,
                # เก็บผังบล็อกไว้กับเทิร์นของผู้เรียน เพื่อดูว่าถามตอนงานอยู่สภาพไหน
                blockly_xml_snapshot=(blockly_xml if role == 'user' else None),
            ))
            next_index += 1

        db.session.commit()
    except Exception as exc:      # noqa: BLE001
        print(f"[AI] บันทึกบทสนทนาไม่สำเร็จ: {exc}")
        db.session.rollback()

def strip_thinking(text):
    """ลบ thinking/reasoning ที่หลุดออกมาจากโมเดล
    เช่น "Draft the Response (Iterative refinement):" หรือ 
    "**Thinking:**..." หรือ "<think>...</think>" """
    if not text:
        return text
    
    # ลบ <think>...</think> tags (multiline)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
    
    # ลบบรรทัดที่เป็น internal reasoning patterns
    lines = text.split('\n')
    clean_lines = []
    skip_mode = False
    for line in lines:
        stripped = line.strip()
        # ข้ามบรรทัดที่เป็น thinking patterns
        if any(pattern in stripped.lower() for pattern in [
            'draft the response', 'iterative refinement',
            'let me think', 'let me analyze', 'my thinking:',
            'step 1:', 'step 2:', 'step 3:',
            'analysis:', 'reasoning:',
        ]):
            skip_mode = True
            continue
        # ถ้าเจอบรรทัดว่างหลัง thinking → หยุด skip
        if skip_mode and stripped == '':
            skip_mode = False
            continue
        # ถ้าเจอเนื้อหาจริงหลัง thinking → หยุด skip
        if skip_mode and not stripped.startswith('*') and not stripped.startswith('-'):
            skip_mode = False
        if not skip_mode:
            clean_lines.append(line)
    
    result = '\n'.join(clean_lines).strip()
    
    # ถ้าลบหมด ให้คืน text เดิม (ป้องกันคำตอบหาย)
    return result if result else text

def strip_markdown(text):
    """ลบ markdown formatting ออก เพราะ frontend แสดง plain text
    **bold** → bold, `code` → code, ### header → header, etc."""
    if not text:
        return text
    
    # ลบ **bold** และ *italic*
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    
    # ลบ `code`
    text = re.sub(r'`(.+?)`', r'\1', text)
    
    # ลบ "quoted text" → เอาแค่เนื้อหา
    text = re.sub(r'"(.+?)"', r'\1', text)
    
    # ลบ ### headers → เอาแค่เนื้อหา
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # ลบ bullet markers (- หรือ * ที่ขึ้นต้นบรรทัด)
    text = re.sub(r'^[\-\*]\s+', '• ', text, flags=re.MULTILINE)
    
    # ลบช่องว่างซ้ำที่เหลือจากการ strip
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


# ==================== ภารกิจที่กำลังเก็บ ====================

def _focus_hint(user_id):
    """ต่อท้าย system prompt ด้วยภารกิจที่เด็กคนนี้กำลังเล็งอยู่

    เวิร์กสเปซไม่รู้ว่าเด็กกำลัง "อยู่ห้องไหน" — เปิดมาก็เขียนโค้ดเลย
    จึงดึงโฟกัสที่ยังทำอยู่ทุกช่องมาให้หมด แล้วให้ของผู้ดูแลมาก่อนของตัวเอง
    ผู้ดูแลเป็นคนเล็ง เด็กเลือกเองไม่ได้ ความต้องการของผู้ดูแลจึงสำคัญกว่า

    ต้องไม่พังคำตอบถ้า DB มีปัญหา — แชทเป็นฟีเจอร์หลัก โฟกัสเป็นของเสริม
    """
    try:
        from models import SkillFocus, StudentObjectiveProgress

        rows = SkillFocus.query.filter_by(
            student_id=int(user_id), status='ACTIVE'
        ).all()
        if not rows:
            return ''

        # ของผู้ดูแลขึ้นก่อน
        rows.sort(key=lambda f: 0 if f.source == 'TEACHER' else 1)

        lines = []
        for focus in rows[:3]:
            objective = focus.objective
            if not objective:
                continue
            progress = StudentObjectiveProgress.query.filter_by(
                student_id=int(user_id), objective_id=focus.objective_id
            ).first()
            threshold = objective.mastery_threshold or 3
            earned = (
                threshold if progress and progress.status == 'COMPLETED'
                else min((progress.clean_run_count if progress else 0) or 0, threshold)
            )
            who = (
                f'ผู้ดูแล{focus.set_by.display_name or focus.set_by.username}ตั้งให้'
                if focus.source == 'TEACHER' and focus.set_by else 'เด็กเลือกเอง'
            )
            # note อาจมีเครื่องหมายคำพูดอยู่แล้ว (เช่น 'จากภารกิจ "เดินสี่เหลี่ยม"')
            # ครอบซ้ำจะอ่านยาก ใช้ขีดคั่นแทน
            note = f' — ผู้ดูแลฝากบอก: {focus.note}' if focus.note else ''
            lines.append(
                f'- {objective.name} ({objective.description or "-"}) '
                f'ได้ {earned}/{focus.target_stars} ดาว · {who}{note}'
            )

        if not lines:
            return ''

        return (
            '\n\n=== ภารกิจที่เด็กคนนี้กำลังเก็บอยู่ ===\n'
            + '\n'.join(lines)
            + '\nให้โน้มคำใบ้และภารกิจท้าทายไปทางทักษะข้างบนเมื่อทำได้อย่างเป็นธรรมชาติ\n'
              'ห้ามฝืน — ถ้าเด็กถามเรื่องอื่นให้ตอบเรื่องที่เด็กถามก่อนเสมอ\n'
              'ห้ามเฉลยบล็อกตรงๆ กฎข้อ 1 ยังใช้อยู่\n'
              'ห้ามบอกว่า "ผู้ดูแลสั่งให้ทำ" — ให้ชวนทำเหมือนเป็นภารกิจของเด็กเอง'
        )
    except Exception as exc:      # noqa: BLE001 — โฟกัสพังห้ามทำให้แชทพัง
        print(f'[FOCUS] อ่านภารกิจไม่ได้ ข้ามไป: {exc}')
        return ''


# ==================== ROUTES ====================
@app.route("/analyze", methods=["POST"])
@jwt_required()
def analyze():
    """
    รับโค้ดบล็อกจาก frontend แล้วส่งไป Gemini วิเคราะห์
    ต้องล็อกอินก่อน — กันคนนอกเรียกเผาโควตา Gemini

    Body JSON:
      - code: สตริงคำสั่ง เช่น "w;a;w;a;w;a;w;a;"
      - question: (optional) คำถามจากผู้ใช้
      - session_id: (optional) ID ของ session — ถูกผูกกับ user id ฝั่งเซิร์ฟเวอร์เสมอ
      - project_id / blockly_xml: (optional) บริบทของงานตอนถาม เก็บไว้กับ transcript
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON body"}), 400

    user_id = get_jwt_identity()
    code = data.get("code", "").strip()
    question = data.get("question", "").strip()
    session_id = data.get("session_id")
    session_key = _session_key(user_id, session_id)

    project_id = data.get("project_id")
    try:
        project_id = int(project_id) if project_id else None
    except (TypeError, ValueError):
        project_id = None
    blockly_xml = data.get("blockly_xml")
    if isinstance(blockly_xml, str):
        blockly_xml = blockly_xml[:200000]
    else:
        blockly_xml = None

    # สร้าง user message
    user_parts = []
    
    if code:
        user_parts.append(f"โค้ดปัจจุบันของผู้เรียน:\n{code}")
    else:
        user_parts.append("ผู้เรียนยังไม่ได้วางบล็อกใดๆ")
    
    if question:
        user_parts.append(f"คำถาม: {question}")
    else:
        user_parts.append("(ผู้เรียนเพิ่งเปลี่ยนบล็อก — วิเคราะห์ความคืบหน้าตามบริบทที่คุยกันอยู่ ถ้ายังไม่เคยคุยกัน ให้วิเคราะห์โค้ดทั่วไป)")
    
    user_message = "\n".join(user_parts)
    
    try:
        gemini = get_client()
        
        # ดึง history เก่ามารวม (อ่านจากฐานข้อมูล ไม่ใช่หน่วยความจำของ worker)
        history = get_history(user_id, session_id)
        
        # สร้าง contents: history + message ใหม่
        contents = list(history) + [
            {"role": "user", "parts": [{"text": user_message}]}
        ]
        
        response = gemini.models.generate_content(
            model=MODEL,
            contents=contents,
            config={
                "system_instruction": SYSTEM_PROMPT + _focus_hint(user_id),
                "max_output_tokens": 2000,
                "temperature": 1,
            }
        )
        
        # === Debug Logging ===
        print(f"\n{'='*50}")
        print(f"[DEBUG] Model: {MODEL}")
        print(f"[DEBUG] Session: {session_key}")
        print(f"[DEBUG] History length: {len(history)} messages")
        print(f"[DEBUG] User message: {user_message[:100]}...")
        
        # Log finish reason & safety
        if response.candidates:
            candidate = response.candidates[0]
            print(f"[DEBUG] Finish reason: {candidate.finish_reason}")
            if candidate.safety_ratings:
                for rating in candidate.safety_ratings:
                    print(f"[DEBUG] Safety: {rating.category} = {rating.probability}")
        else:
            print(f"[DEBUG] ⚠️ No candidates! Full response: {response}")
        
        # Log prompt feedback (ถ้ามี)
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
            print(f"[DEBUG] Prompt feedback: {response.prompt_feedback}")
        
        raw_text = response.text if response.text else None
        print(f"[DEBUG] Raw text length: {len(raw_text) if raw_text else 'NULL'}")
        print(f"[DEBUG] Raw text preview: {raw_text[:200] if raw_text else 'NULL'}...")
        print(f"{'='*50}\n")
        
        if raw_text:
            # Strip thinking/reasoning ที่หลุดออกมา + ลบ markdown formatting
            reply = strip_markdown(strip_thinking(raw_text))

            # เก็บ transcript ลงฐานข้อมูล (ข้อ 4.1)
            save_turns(
                user_id, session_id,
                [("user", user_message), ("model", reply)],
                project_id=project_id,
                blockly_xml=blockly_xml,
            )
            record_event('ai.answered', int(user_id),
                         subject_type='project', subject_id=project_id,
                         session_id=_normalize_session_id(session_id),
                         payload={'question_length': len(question),
                                  'reply_length': len(reply),
                                  'has_question': bool(question)},
                         commit=True)
        else:
            reply = "ขอโทษนะ เมโต้คิดไม่ออก ลองถามใหม่ได้นะ 😅"

        return jsonify({"reply": reply})
    
    except Exception as e:
        print(f"[ERROR] Gemini API: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/new_session", methods=["POST"])
@jwt_required()
def new_session():
    """สร้าง session ใหม่ — ใช้เมื่อเริ่มบทเรียนใหม่
    id ถูกสุ่มฝั่งเซิร์ฟเวอร์ ส่วนบทสนทนาผูกกับ user_id ในฐานข้อมูล"""
    session_id = str(uuid.uuid4())
    print(f"[SESSION] New session created for user {get_jwt_identity()}")
    return jsonify({"session_id": session_id})


@app.route("/clear_session", methods=["POST"])
@jwt_required()
def clear_session():
    """เริ่มบทสนทนาใหม่ — ให้ id ใหม่ไปใช้

    **ไม่ลบ transcript เดิมทิ้ง** เพราะเป็นข้อมูลวิจัย
    เด็กแค่ได้เริ่มคุยใหม่จากศูนย์ ประวัติเก่ายังอยู่ในฐานข้อมูลให้วิเคราะห์
    """
    new_id = str(uuid.uuid4())
    print(f"[SESSION] Started fresh session for user {get_jwt_identity()}")
    return jsonify({"status": "cleared", "session_id": new_id})


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "model": MODEL,
    })


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


# ==================== CLI COMMANDS ====================
# ห้ามสร้างตาราง/ใส่ seed ที่ระดับ module
# Procfile ใช้ gunicorn หลาย worker — ทุก worker จะรัน seed_data() พร้อมกันตอนบูต
# แล้วแย่งกันแทรก achievement ชื่อเดียวกันที่มี unique constraint อยู่
# โครงสร้างฐานข้อมูลจัดการด้วย `flask db upgrade` (Flask-Migrate) เท่านั้น

@app.cli.command('init-db')
def init_db():
    """สร้างตารางทั้งหมดจากโมเดล + ใส่ seed (ใช้กับฐานข้อมูลเปล่าเท่านั้น)
    ถ้ามีฐานข้อมูลอยู่แล้วให้ใช้ `flask db upgrade`"""
    db.create_all()
    seed_data()
    print('[OK] init-db เสร็จแล้ว')


@app.cli.command('seed-db')
def seed_db():
    """ใส่ achievement และ learning objective ตั้งต้น (รันซ้ำได้ ไม่สร้างซ้ำ)"""
    seed_data()


if __name__ == "__main__":
    if not API_KEY:
        print("[WARNING] GEMINI_API_KEY is not set!")
        print("   Set it with: set GEMINI_API_KEY=your_api_key_here")
    else:
        print(f"[OK] API Key loaded (starts with {API_KEY[:8]}...)")
    
    # Render.com จะตั้งค่า PORT ให้อัตโนมัติ / ถ้ารันในเครื่องจะใช้ 5000
    port = int(os.environ.get("PORT", 5000))
    is_production = IS_PRODUCTION

    print(f"[SERVER] RoboMDT AI Server starting on port {port}")
    print(f"[MODEL] {MODEL}")
    print(f"[CONFIG] Max output tokens: 2000")
    print(f"[CONFIG] Conversation history: ON (max {MAX_HISTORY_TURNS} messages)")
    app.run(host="0.0.0.0", port=port, debug=not is_production)
