"""
ชุดตรวจก่อน deploy — ตามภาคผนวก ค ของ แผนแก้ไขฐานข้อมูล.md

รันแบบอ่านอย่างเดียว ไม่มีการเขียนใดๆ

    python scripts/predeploy_check.py [path/to/robomdt.db]

คืน exit code 1 ถ้ามีข้อไหนไม่ผ่าน — เอาไปต่อ CI ได้
บน Windows ถ้าเจอ UnicodeEncodeError ให้ตั้ง PYTHONIOENCODING=utf-8 ก่อนรัน
"""

import os
import sqlite3
import sys

DEFAULT_DB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'instance', 'robomdt.db',
)

# คู่คอลัมน์ที่ต้องไม่ซ้ำ
UNIQUE_PAIRS = [
    ('user_achievements', ('user_id', 'achievement_id')),
    ('class_memberships', ('classroom_id', 'student_id')),
    ('assignment_submissions', ('assignment_id', 'student_id')),
    ('student_objective_progress', ('student_id', 'objective_id')),
    ('assignments', ('classroom_id', 'task_key')),
]

# คอลัมน์ที่ค่าต้องอยู่ในชุดที่กำหนด
ENUM_COLUMNS = [
    ('users', 'role', ('USER',)),
    ('student_objective_progress', 'status', ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    ('assignments', 'level', ('Sequential', 'If/Else', 'Loop')),
]

# query หลักที่ต้องไม่ full scan
HOT_QUERIES = [
    ('นับกิจกรรมรายชนิด',
     "select count(id) from activity_logs where user_id=1 and action_type='RUN_CODE'"),
    ('กราฟกิจกรรม / ใช้งานล่าสุด',
     "select created_at from activity_logs where user_id=1 and created_at>='2026-01-01'"),
    ('ตรวจเหรียญ', "select id from user_achievements where user_id=1"),
    ('รายชื่อสมาชิกห้อง', "select id from class_memberships where classroom_id=1"),
    ('ห้องของนักเรียน', "select id from class_memberships where student_id=1"),
    ('ทักษะรายคน', "select id from student_objective_progress where student_id=1"),
    ('งานที่ส่ง',
     "select id from assignment_submissions where assignment_id=1 and student_id=1"),
    ('โปรเจกต์ของผู้ใช้',
     "select id from projects where user_id=1 order by updated_at desc"),
    ('ค้นคะแนน', "select id from grades where student_id=1 and project_id=1"),
]

failures = []


def report(name, ok, detail=''):
    print(f'  {"ok " if ok else "ไม่ผ่าน"}  {name}{(" — " + detail) if detail else ""}')
    if not ok:
        failures.append(name)


def main(db_path):
    if not os.path.exists(db_path):
        print(f'ไม่พบไฟล์ฐานข้อมูล: {db_path}')
        return 1

    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    conn.execute('PRAGMA foreign_keys=ON')

    print(f'ตรวจฐานข้อมูล: {db_path}')
    version = conn.execute('select version_num from alembic_version').fetchone()
    print(f'revision ปัจจุบัน: {version[0] if version else "ไม่มี — ยังไม่ได้ตั้ง migration"}')

    print()
    print('1. แถวกำพร้า (PRAGMA foreign_key_check)')
    orphans = conn.execute('PRAGMA foreign_key_check').fetchall()
    report('ไม่มีแถวกำพร้า', not orphans, f'{len(orphans)} แถว' if orphans else '')

    print()
    print('2. ข้อมูลซ้ำในคู่ที่ต้อง unique')
    for table, cols in UNIQUE_PAIRS:
        group_by = ', '.join(cols)
        dups = conn.execute(
            f'select {group_by}, count(*) from {table} group by {group_by} having count(*) > 1'
        ).fetchall()
        report(f'{table} ({group_by})', not dups, f'{len(dups)} คู่ซ้ำ' if dups else '')

    print()
    print('3. ค่านอกชุดที่กำหนด')
    for table, column, allowed in ENUM_COLUMNS:
        placeholders = ', '.join('?' for _ in allowed)
        bad = conn.execute(
            f'select distinct {column} from {table} where {column} not in ({placeholders})',
            allowed,
        ).fetchall()
        report(f'{table}.{column}', not bad, f'พบ {[b[0] for b in bad]}' if bad else '')

    print()
    print('4. คะแนนอยู่ในช่วง 0 ถึง max_score')
    bad_scores = conn.execute(
        'select id, score, max_score from grades '
        'where max_score <= 0 or score < 0 or score > max_score'
    ).fetchall()
    report('คะแนนทุกแถวอยู่ในช่วง', not bad_scores,
           f'{len(bad_scores)} แถวผิด' if bad_scores else '')

    print()
    print('5. แผนการทำงานของ query หลัก (ต้องไม่ full scan)')
    for name, sql in HOT_QUERIES:
        plan = conn.execute('EXPLAIN QUERY PLAN ' + sql).fetchall()
        details = [row[3] for row in plan]
        full_scan = any(d.startswith('SCAN') and 'USING' not in d for d in details)
        report(name, not full_scan, details[0] if full_scan else '')

    conn.close()

    print()
    if failures:
        print(f'สรุป: ไม่ผ่าน {len(failures)} ข้อ — {", ".join(failures)}')
        return 1
    print('สรุป: ผ่านทุกข้อ')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB))
