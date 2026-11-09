"""
RoboMDT — ตรวจทักษะจากบล็อกจริงฝั่งเซิร์ฟเวอร์

เดิมหน้าเว็บเป็นคนตัดสินว่า "ใช้ทักษะอะไรบ้าง" แล้วส่งรายชื่อมาให้เซิร์ฟเวอร์บันทึกตรงๆ
สมาชิกที่เปิด developer tools เป็นจึงยิง {"skills": ["Loops"]} ซ้ำๆ
แล้วระบบจะบันทึกว่า "เชี่ยวชาญ Loops" ทั้งที่ไม่เคยลากบล็อก loop เลย
ทำให้ข้อมูลที่จะเอาไปใส่เล่มวิจัยเชื่อถือไม่ได้

โมดูลนี้อ่าน blockly_xml ของงานจริงแล้วสรุปทักษะเอง — client ไม่มีสิทธิ์ตัดสินอีกต่อไป
"""

import xml.etree.ElementTree as ET

# บล็อกที่นับเป็น "คำสั่ง" (ตรงกับ BLOCK_LABELS ใน static/script.js)
COMMAND_BLOCKS = {
    'start_program',
    'move_forward', 'move_backward', 'turn_left', 'turn_right',
    'wait_one_sec', 'delay_sec',
    'arm_left_close', 'arm_left_normal', 'arm_left_open',
    'arm_right_close', 'arm_right_normal', 'arm_right_open',
    'hand_left_down', 'hand_left_center', 'hand_left_up',
    'hand_right_down', 'hand_right_center', 'hand_right_up',
    'head_turn_right', 'head_center', 'head_turn_left',
    'face_normal', 'face_look_left', 'face_look_right',
    'face_happy', 'face_sad', 'face_angry',
    'face_shocked', 'face_sleepy', 'face_confused',
    'face_love', 'face_shy',
    'grip_smart', 'grip_release', 'grip_verify', 'grip_percent',
    # บล็อกใหม่ตามเฟิร์มแวร์ 6 พ.ย. 2569 (คำสั่ง fw/bw/tl/tr/x/lift/hand/yaw/tilt/hs/emo/wait)
    'move_timed', 'turn_timed', 'move_stop',
    'arm_lift', 'hand_grip_pct',
    'head_yaw', 'head_tilt', 'head_speed',
    'face_emotion', 'wait_ms',
}

# ทักษะที่โมดูลนี้ตรวจเองได้จากบล็อกจริง — ต้องตรงกับที่ detect_skills() คืนได้
#
# seed_data() ใส่ LearningObjective ไว้ 10 อัน แต่ 'Decomposition' ไม่อยู่ในนี้
# เพราะชุดบล็อกยังไม่มีบล็อกฟังก์ชัน/procedure ที่จะใช้เป็นหลักฐานว่า
# เด็ก "ย่อยงานใหญ่เป็นงานเล็ก" จริง — ทักษะนั้นจึงขึ้นได้จากผู้ดูแลกดให้เท่านั้น
#
# หน้าเว็บใช้ค่านี้แยกว่าดาวดวงไหนระบบให้เองได้ ดาวดวงไหนต้องรอผู้ดูแล
# จะได้ไม่โชว์ดาวที่ค้าง 0/3 ตลอดกาลโดยไม่บอกเหตุผล
DETECTABLE_SKILLS = frozenset({
    'Sequencing',
    'Loops',
    'Conditionals',
    'Variables',
    'Pattern Recognition',
    'Robot Motion',
    'Robot Arms & Gripper',
    'Robot Expressions',
    'Debugging',
})

LOOP_BLOCKS = {'controls_repeat_ext', 'controls_whileUntil', 'controls_forever'}
MOTION_PREFIXES = ('move_', 'turn_')
ARM_PREFIXES = ('arm_', 'hand_', 'grip_')
FACE_PREFIXES = ('face_',)

# ตัดชื่อ namespace ของ Blockly ออก เช่น {https://developers.google.com/blockly/xml}block
def _tag(element):
    tag = element.tag
    return tag.rsplit('}', 1)[-1] if '}' in tag else tag


def _iter_blocks(root):
    """คืน element ของบล็อกทุกอันในเอกสาร (รวม shadow block)"""
    for element in root.iter():
        if _tag(element) in ('block', 'shadow'):
            yield element


def _chain_length(block):
    """นับจำนวนบล็อกที่ต่อกันเป็นสายจากบล็อกนี้ลงไป (ผ่าน <next>)"""
    count = 0
    current = block
    while current is not None:
        count += 1
        nxt = None
        for child in current:
            if _tag(child) == 'next':
                for grandchild in child:
                    if _tag(grandchild) == 'block':
                        nxt = grandchild
                        break
                break
        current = nxt
    return count


def _loop_body_length(loop_block):
    """นับจำนวนคำสั่งที่อยู่ข้างใน loop"""
    for child in loop_block:
        if _tag(child) == 'statement' and child.get('name') == 'DO':
            for grandchild in child:
                if _tag(grandchild) == 'block':
                    return _chain_length(grandchild)
    return 0


def analyze_workspace(blockly_xml):
    """อ่าน blockly_xml แล้วสรุปว่ามีบล็อกชนิดไหนอยู่จริงบ้าง

    คืน dict หรือ None ถ้า XML ใช้ไม่ได้
    """
    if not blockly_xml or not blockly_xml.strip():
        return None

    try:
        root = ET.fromstring(blockly_xml)
    except ET.ParseError:
        return None

    types = {}
    loops = []
    for block in _iter_blocks(root):
        block_type = block.get('type')
        if not block_type:
            continue
        types[block_type] = types.get(block_type, 0) + 1
        if block_type in LOOP_BLOCKS:
            loops.append(block)

    command_count = sum(n for t, n in types.items() if t in COMMAND_BLOCKS)

    return {
        'types': types,
        'command_count': command_count,
        'has_loop': any(t in LOOP_BLOCKS for t in types),
        'max_loop_body': max((_loop_body_length(b) for b in loops), default=0),
    }


def skills_for_goal(goal):
    """สรุปว่าภารกิจข้อนี้ตั้งใจให้ฝึกทักษะอะไรบ้าง — อ่านจาก goal ของ PRESET_TASKS

    ใช้ตอบคำถาม "ห้องนี้กำลังฝึกทักษะข้อไหน" ซึ่งเป็นข้อมูลของห้องจริงๆ
    (ต่างจากดาวที่เป็นของสมาชิกรายคนและไม่ผูกกับห้อง)

    กติกาต้องสะท้อน detect_skills() ให้ตรงกัน ไม่งั้นผู้ดูแลจะเห็นว่า "ห้องนี้ฝึก Loops"
    แต่เด็กทำภารกิจผ่านแล้วดาว Loops ไม่ขึ้น

    คืน list ชื่อทักษะ (ตรงกับ LearningObjective.name)
    """
    if not goal:
        return []

    required = goal.get('required_blocks') or []
    skills = []

    def has_prefix(prefixes):
        return any(block.startswith(prefixes) for block in required)

    # ภารกิจที่ต้องวางคำสั่งต่อกันตั้งแต่ 2 บล็อกขึ้นไปถือว่าฝึกการเรียงลำดับ
    if (goal.get('min_commands') or 0) >= 2 or len(required) >= 2:
        skills.append('Sequencing')

    if any(block in LOOP_BLOCKS for block in required):
        skills.append('Loops')

    if 'controls_if' in required:
        skills.append('Conditionals')

    if 'variables_set' in required or 'variables_get' in required:
        skills.append('Variables')

    # ต้องยุบคำสั่งซ้ำเข้า loop ถึงจะผ่าน = ฝึกการมองรูปแบบซ้ำ
    if (goal.get('needs_loop_body') or 0) >= 2:
        skills.append('Pattern Recognition')

    if has_prefix(MOTION_PREFIXES):
        skills.append('Robot Motion')

    if has_prefix(ARM_PREFIXES):
        skills.append('Robot Arms & Gripper')

    if has_prefix(FACE_PREFIXES):
        skills.append('Robot Expressions')

    return skills


def detect_skills(blockly_xml, previous_run_had_errors=False):
    """สรุปรายชื่อทักษะจากบล็อกจริง

    ชื่อที่คืนต้องตรงกับ LearningObjective.name ใน seed_data()
    previous_run_had_errors — ฝั่งเซิร์ฟเวอร์เป็นคนตรวจจาก log ไม่ใช่รับจาก client
    """
    info = analyze_workspace(blockly_xml)
    if info is None:
        return []

    types = info['types']
    skills = []

    def has_prefix(prefixes):
        return any(t.startswith(prefixes) for t in types)

    # Sequencing — มีคำสั่งต่อกันอย่างน้อย 2 บล็อก
    if info['command_count'] >= 2:
        skills.append('Sequencing')

    if info['has_loop']:
        skills.append('Loops')

    if 'controls_if' in types:
        skills.append('Conditionals')

    if 'variables_set' in types or 'variables_get' in types:
        skills.append('Variables')

    # Pattern Recognition — เห็นรูปแบบซ้ำแล้วยุบเป็น loop ที่มีคำสั่งข้างใน ≥ 2 บล็อก
    if info['max_loop_body'] >= 2:
        skills.append('Pattern Recognition')

    if has_prefix(MOTION_PREFIXES):
        skills.append('Robot Motion')

    if has_prefix(ARM_PREFIXES):
        skills.append('Robot Arms & Gripper')

    if has_prefix(FACE_PREFIXES):
        skills.append('Robot Expressions')

    # Debugging — รันก่อนหน้ามี error แล้วครั้งนี้รันผ่าน
    if previous_run_had_errors:
        skills.append('Debugging')

    return skills
