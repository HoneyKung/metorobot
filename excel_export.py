# -*- coding: utf-8 -*-
"""ส่งออกข้อมูลห้องเป็นไฟล์ Excel (.xlsx) ให้ครู (8 พ.ย. 2569)

ไฟล์นี้มีชื่อจริงของสมาชิก จึงตั้งใจใส่เฉพาะข้อมูลการเรียนในห้องนี้
ห้ามเพิ่มข้อมูลวิจัย (เพศ ปีเกิด กลุ่มทดลอง ความยินยอม คะแนนก่อน-หลัง บทสนทนา AI)
ของวิจัยส่งออกแยกที่ research.py เหมือนเดิม

ไม่ใช้ _classroom_rows ของ research.py เพราะ: มีข้อมูลวิจัยปน · นับคะแนนข้ามทุกห้อง
(Grade ไม่ได้กรองห้อง) · รวมเด็กที่ออกจากห้องไปแล้ว
"""
import io
from datetime import timedelta

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from models import (
    Assignment, AssignmentSubmission, Grade, LearningObjective, StudentObjectiveProgress,
)

# ชื่อทักษะภาษาไทย ชุดเดียวกับ SKILL_STYLE ใน static/dashboard-player.js
SKILL_TH = {
    'Sequencing': 'เรียงลำดับคำสั่ง',
    'Loops': 'สั่งวนซ้ำ',
    'Conditionals': 'ตั้งเงื่อนไข',
    'Variables': 'ใช้ตัวแปร',
    'Pattern Recognition': 'มองเห็นรูปแบบซ้ำ',
    'Robot Motion': 'บังคับหุ่นเคลื่อนที่',
    'Robot Arms & Gripper': 'บังคับแขนและมือจับ',
    'Robot Expressions': 'สั่งหุ่นแสดงอารมณ์',
    'Debugging': 'แก้บั๊ก',
    'Decomposition': 'ย่อยงานใหญ่เป็นงานเล็ก',
}

HEAD_FILL = PatternFill('solid', fgColor='3A53A4')
HEAD_FONT = Font(bold=True, color='FFFFFF')
TH = timedelta(hours=7)   # ฐานข้อมูลเก็บเวลา UTC


def _th_time(dt):
    return (dt + TH).strftime('%d/%m/%Y %H:%M') if dt else ''


def _sheet(wb, title, header, rows, first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = title
    ws.append(header)
    for r in rows:
        ws.append(r)
    for c in ws[1]:
        c.fill = HEAD_FILL
        c.font = HEAD_FONT
        c.alignment = Alignment(vertical='center', wrap_text=True)
    ws.freeze_panes = 'A2'
    for i, h in enumerate(header, start=1):
        width = max([len(str(h))] + [len(str(r[i - 1])) for r in rows if i - 1 < len(r)] + [6])
        ws.column_dimensions[get_column_letter(i)].width = min(width + 3, 40)
    return ws


def _submission_state(sub, grade):
    """ช่องในตารางคะแนน: 8/10 · รอตรวจ · ไม่ส่ง (+ ส่งช้า)"""
    if not sub:
        return 'ไม่ส่ง'
    if grade and (not grade.updated_at or not sub.submitted_at or grade.updated_at >= sub.submitted_at):
        text = '%g/%g' % (grade.score, grade.max_score)
    else:
        text = 'รอตรวจ'
    return text + (' (ช้า)' if sub.is_late else '')


def build_classroom_xlsx(classroom, students, exported_at):
    """students = ผลของ _get_classroom_students_with_stats (เฉพาะสมาชิกที่ยังอยู่ในห้อง)"""
    students = sorted(students, key=lambda s: (
        int(s['student_no']) if str(s.get('student_no') or '').isdigit() else 9999,
        s.get('display_name') or ''))
    sids = [s['id'] for s in students]

    assignments = Assignment.query.filter_by(classroom_id=classroom.id) \
        .order_by(Assignment.created_at).all()
    subs = {}
    for sub in AssignmentSubmission.query.filter(
            AssignmentSubmission.assignment_id.in_([a.id for a in assignments] or [0])).all():
        subs[(sub.assignment_id, sub.student_id)] = sub
    grade_by_sub = {g.submission_id: g for g in Grade.query.filter(
        Grade.submission_id.in_([s.id for s in subs.values()] or [0])).all()}

    objectives = LearningObjective.query.order_by(LearningObjective.id).all()
    progress = {(p.student_id, p.objective_id): p for p in StudentObjectiveProgress.query.filter(
        StudentObjectiveProgress.student_id.in_(sids or [0])).all()}

    wb = Workbook()

    # ---- 1. สรุปรายคน ----
    rows = []
    for s in students:
        mine = [subs.get((a.id, s['id'])) for a in assignments]
        sent = [x for x in mine if x]
        graded = [grade_by_sub.get(x.id) for x in sent if grade_by_sub.get(x.id)]
        avg = round(sum(g.score / g.max_score * 100 for g in graded if g.max_score) / len(graded)) if graded else ''
        last = s.get('last_active')
        rows.append([
            s.get('student_no') or '', s.get('display_name') or '', s.get('username') or '',
            (s.get('joined_at') or '')[:10],
            _th_time(_parse(last)) if last else 'ยังไม่เคยเข้าใช้',
            '%d/%d' % (len(sent), len(assignments)),
            sum(1 for x in sent if x.is_late),
            avg,
            '%d/%d' % (s.get('objectives_completed') or 0, len(objectives)),
            ' · '.join(s.get('attention') or []),
        ])
    _sheet(wb, 'สรุปรายคน', ['เลขที่', 'ชื่อ', 'ชื่อผู้ใช้', 'เข้าร่วมเมื่อ', 'เข้าใช้ล่าสุด',
                             'ส่งภารกิจ', 'ส่งช้า (ครั้ง)', 'คะแนนเฉลี่ย %', 'ทักษะที่ผ่าน', 'ข้อสังเกต'],
           rows, first=True)

    # ---- 2. คะแนนภารกิจ (แถว = คน · คอลัมน์ = ภารกิจ) ----
    head = ['เลขที่', 'ชื่อ'] + [
        a.title + (' (ส่ง %s)' % (a.due_date + TH).strftime('%d/%m') if a.due_date else '')
        for a in assignments]
    rows = []
    for s in students:
        row = [s.get('student_no') or '', s.get('display_name') or '']
        for a in assignments:
            sub = subs.get((a.id, s['id']))
            row.append(_submission_state(sub, grade_by_sub.get(sub.id) if sub else None))
        rows.append(row)
    _sheet(wb, 'คะแนนภารกิจ', head, rows)

    # ---- 3. รายละเอียดการส่ง ----
    name = {s['id']: s for s in students}
    rows = []
    for a in assignments:
        for sid in sids:
            sub = subs.get((a.id, sid))
            if not sub:
                continue
            g = grade_by_sub.get(sub.id)
            rows.append([
                a.title, name[sid].get('student_no') or '', name[sid].get('display_name') or '',
                _th_time(sub.submitted_at), sub.attempt_no or 1, 'ช้า' if sub.is_late else '',
                ('%g' % g.score) if g else '', ('%g' % g.max_score) if g else '',
                (g.comment or '') if g else '',
            ])
    _sheet(wb, 'รายละเอียดการส่ง', ['ภารกิจ', 'เลขที่', 'ชื่อ', 'ส่งเมื่อ', 'ส่งครั้งที่', 'ส่งช้า',
                                     'คะแนน', 'เต็ม', 'ความเห็นครู'], rows)

    # ---- 4. ทักษะ ----
    head = ['เลขที่', 'ชื่อ'] + [SKILL_TH.get(o.name, o.name) for o in objectives]
    rows = []
    for s in students:
        row = [s.get('student_no') or '', s.get('display_name') or '']
        for o in objectives:
            p = progress.get((s['id'], o.id))
            thr = o.mastery_threshold or 3
            if p and p.status == 'COMPLETED':
                row.append('ผ่าน')
            elif p and (p.clean_run_count or 0) > 0:
                row.append('กำลังฝึก %d/%d' % (min(p.clean_run_count, thr), thr))
            else:
                row.append('')
        rows.append(row)
    _sheet(wb, 'ทักษะ', head, rows)

    # ---- 5. ข้อมูลห้อง ----
    _sheet(wb, 'ข้อมูลห้อง', ['รายการ', 'ค่า'], [
        ['ชื่อห้อง', classroom.name],
        ['ปีการศึกษา', classroom.academic_year or ''],
        ['ภาคเรียน', classroom.semester or ''],
        ['จำนวนสมาชิก', len(students)],
        ['จำนวนภารกิจ', len(assignments)],
        ['ส่งออกเมื่อ', _th_time(exported_at)],
    ])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _parse(iso):
    from datetime import datetime
    try:
        return datetime.fromisoformat(iso)
    except (TypeError, ValueError):
        return None
