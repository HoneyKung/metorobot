"""
RoboMDT — ตัวบันทึกเหตุการณ์ (ข้อ 4.7 ของแผนแก้ไขฐานข้อมูล)

ตาราง activity_logs เดิมมีจุดเขียนแค่ 3 จุดทั้งระบบ และ 47% ของแถวไม่มี payload เลย
เหตุการณ์สำคัญอย่าง "สร้างงาน / ลบงาน / เข้าห้อง / ให้คะแนน / ส่งงาน /
จบ tutorial / error ที่ระบบตรวจเจอ" ไม่ถูกบันทึกสักครั้ง

โมดูลนี้บันทึกลงตาราง events ซึ่งต่างจาก activity_logs ตรงที่
  - ผูกกับ "สิ่งที่ถูกกระทำ" (subject_type + subject_id) ไม่ใช่เอาข้อมูลไปต่อท้ายชื่อเหตุการณ์
  - มี correlation_id ร้อยเหตุการณ์ที่เกิดจากการกดครั้งเดียวกันเข้าด้วยกัน
  - payload เป็น JSON ที่มีโครงสร้างชัดเจนต่อชื่อเหตุการณ์
"""

import json
import uuid

from models import db, Event

# ชื่อเหตุการณ์ทั้งหมดที่ระบบรู้จัก — ชื่อนอกรายการนี้ถูกปฏิเสธ
# ใช้รูปแบบ <สิ่งของ>.<กริยาอดีต> เพื่อให้เรียงกลุ่มได้ตอนทำสถิติ
EVENT_NAMES = {
    # ผู้ใช้
    'user.registered', 'user.logged_in', 'user.logged_out', 'user.profile_updated',
    'user.account_deleted',
    # งานของสมาชิก
    'project.created', 'project.saved', 'project.deleted', 'project.restored',
    'program.executed', 'workspace.block_changed', 'errors.detected',
    # ห้อง
    'classroom.created', 'classroom.joined', 'classroom.left', 'classroom.archived',
    'classroom.member_removed',
    # ภารกิจและคะแนน
    'assignment.created', 'assignment.deleted', 'assignment.submitted',
    'grade.given', 'grade.updated',
    # ทักษะและบทเรียน
    'skill.demonstrated', 'skill.mastered', 'skill.overridden',
    'skill.override_cleared',
    'tutorial.completed', 'tutorial.skipped',
    # ภารกิจที่กำลังเก็บ (SkillFocus)
    # ตารางนี้ถูกสร้างมาเพื่อตอบว่า "ผู้ดูแลเล็งให้ใครเมื่อไหร่ เด็กใช้เวลากี่วันถึงเป้า"
    # ถ้าไม่มีชื่อในรายการนี้ record_event จะคืน None เงียบๆ แล้วเขียน 0 แถว
    'focus.set', 'focus.reached', 'focus.cancelled',
    # ผู้ช่วย AI
    'ai.asked', 'ai.answered',
    # งานวิจัย
    'assessment.recorded', 'consent.updated', 'data.exported',
}

# เหตุการณ์ที่หน้าเว็บได้รับอนุญาตให้ส่งเอง
# ที่เหลือเซิร์ฟเวอร์บันทึกเองตอนทำงานจริง จะได้ปลอมไม่ได้
CLIENT_EVENT_NAMES = {
    'program.executed',
    'workspace.block_changed',
    'errors.detected',
}

# ขนาด payload สูงสุด (ตัวอักษรหลังแปลงเป็น JSON) — กันยิงก้อนใหญ่ผิดปกติ
MAX_PAYLOAD_CHARS = 4000


def record_event(event_name, actor_id, *, subject_type=None, subject_id=None,
                 classroom_id=None, payload=None, session_id=None,
                 correlation_id=None, occurred_at=None, commit=False):
    """บันทึกเหตุการณ์หนึ่งรายการ

    ตั้งใจให้ "ไม่มีวันทำให้ request หลักพัง" — ถ้าบันทึกไม่ได้ก็ข้ามไป
    เพราะการเก็บสถิติต้องไม่สำคัญกว่าการที่เด็กใช้งานเว็บได้
    """
    if event_name not in EVENT_NAMES:
        # เดิมคืน None เงียบๆ — ผลคือฟีเจอร์ SkillFocus ทั้งฟีเจอร์เขียน event 0 แถว
        # อยู่หลายรอบโดยไม่มีใครรู้ เพราะไม่มีสัญญาณอะไรเลย
        # ยังไม่ raise (บันทึกสถิติต้องไม่ทำให้ request หลักพัง) แต่ต้องส่งเสียง
        print(f'[EVENT] ชื่อเหตุการณ์ "{event_name}" ไม่อยู่ใน EVENT_NAMES — ไม่ได้บันทึก')
        return None

    try:
        payload_json = None
        if payload:
            payload_json = json.dumps(payload, ensure_ascii=False)[:MAX_PAYLOAD_CHARS]

        event = Event(
            event_id=str(uuid.uuid4()),
            session_id=(session_id or None),
            correlation_id=(correlation_id or None),
            event_name=event_name,
            actor_id=actor_id,
            subject_type=subject_type,
            subject_id=subject_id,
            classroom_id=classroom_id,
            payload_json=payload_json,
        )
        if occurred_at is not None:
            event.occurred_at = occurred_at

        db.session.add(event)
        if commit:
            db.session.commit()
        return event
    except Exception as exc:      # noqa: BLE001 — บันทึกไม่ได้ต้องไม่ทำให้ request พัง
        print(f'[EVENT] บันทึกเหตุการณ์ {event_name} ไม่สำเร็จ: {exc}')
        try:
            db.session.rollback()
        except Exception:         # noqa: BLE001
            pass
        return None
