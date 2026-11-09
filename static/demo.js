// ============================================================
// DEMO MODE — ให้ frontend ทำงานครบทุกหน้าโดยไม่ต้องมี backend
// เปิดใช้เมื่อ: เปิดไฟล์ตรงๆ (file://) หรือใส่ ?demo=1 ท้าย URL
// บนเซิร์ฟเวอร์จริง (http/https ปกติ) โหมดนี้ปิดเอง → ใช้ backend จริง
//
// วิธีทำงาน: ดักทุก fetch ที่ยิงไป /api/* /analyze /new_session
// แล้วตอบด้วยข้อมูลจำลอง — ไฟล์ frontend อื่นไม่รู้ตัวว่าไม่มี server
// ============================================================
(function () {
    'use strict';

    var params = new URLSearchParams(location.search);
    var DEMO = location.protocol === 'file:' || params.get('demo') === '1' || window.METO_FORCE_DEMO === true;
    window.METO_DEMO = DEMO;
    if (!DEMO) return; // ไม่ใช่โหมด demo → ปล่อย fetch จริงทำงานปกติ

    console.log('%c[DEMO MODE] เปิดใช้งานโหมดตัวอย่าง — ข้อมูลทั้งหมดเป็นข้อมูลจำลอง', 'color:#3A53A4;font-weight:bold');

    // ล็อกอินอัตโนมัติ "ทันที" (ก่อน auth.js อ่าน token) เพื่อให้เข้า Dashboard ได้เลย
    try {
        if (!localStorage.getItem('meto_token')) localStorage.setItem('meto_token', 'demo-token');
    } catch (e) { }

    // ---------- ข้อมูลจำลอง ----------
    var DEMO_USER = {
        id: 1, username: 'demo', display_name: 'ผู้ใช้ตัวอย่าง', role: 'USER',
        // หน้าหุ่นที่ปลดล็อก/เลือกไว้ — ค่าจริงมาจาก demoUnlocked/demoChosenFace ตอน route
        get unlocked_faces() { return demoUnlocked; },
        get avatar_face() { return demoChosenFace; },
        get avatar_url() { return demoAvatar; }
    };

    function daysAgoISO(n) {
        var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
    }
    function last7() {
        var arr = [], counts = [2, 5, 3, 8, 4, 6, 7];
        for (var i = 6; i >= 0; i--) {
            var d = new Date(); d.setDate(d.getDate() - i);
            arr.push({ date: d.toISOString().split('T')[0], count: counts[6 - i] });
        }
        return arr;
    }

    var ACHIEVEMENTS = [
        { id: 1, name: 'First Steps', description: 'จบบทเรียนเริ่มต้น', condition_type: 'TUTORIAL_COMPLETE', unlocked: true, unlocked_at: daysAgoISO(6) },
        { id: 2, name: 'Hello Robot', description: 'รันโปรแกรมครั้งแรก', condition_type: 'PROGRAMS_RUN', unlocked: true, unlocked_at: daysAgoISO(6) },
        { id: 3, name: 'Block Builder', description: 'สร้าง 5 โปรเจกต์', condition_type: 'PROJECTS_CREATED', unlocked: true, unlocked_at: daysAgoISO(3) },
        { id: 4, name: 'Loop Master', description: 'ใช้ loop ใน 3 โปรเจกต์', condition_type: 'LOOP_USAGE', unlocked: true, unlocked_at: daysAgoISO(2) },
        { id: 5, name: 'Bug Squasher', description: 'แก้บั๊ก 10 ครั้ง', condition_type: 'ERRORS_FIXED', unlocked: false, unlocked_at: null },
        { id: 6, name: 'Persistent Coder', description: 'ล็อกอิน 7 วันติด', condition_type: 'LOGIN_STREAK', unlocked: false, unlocked_at: null },
        { id: 7, name: 'AI Whisperer', description: 'ถาม AI 20 ครั้ง', condition_type: 'AI_QUESTIONS', unlocked: true, unlocked_at: daysAgoISO(1) },
        { id: 8, name: 'Perfect Score', description: 'ได้คะแนนเต็ม', condition_type: 'PERFECT_GRADE', unlocked: false, unlocked_at: null }
    ];

    // รูปร่างต้องตรงกับที่ dashboard.py ส่งจริง (บรรทัด ~715-733) ไม่งั้นหน้าเดโมโล่งเปล่า
    //   auto_detectable   ระบบตรวจให้เองได้ไหม (Decomposition ตัวเดียวที่ต้องรอผู้ดูแลกด)
    //   clean_run_count   นับจาก StudentObjectiveProgress -> หน้าเกมแปลงเป็นดาว
    //   mastery_threshold ดาวเต็มของทักษะนั้น
    // เดิมเดโมมีแค่ name/category/status ทำให้ autoSkills กรองแล้วว่าง แผนที่เลยไม่ขึ้นเลย
    var SKILLS = [
        { id: 1, name: 'Sequencing', category: 'FUNDAMENTALS', status: 'mastered', auto_detectable: true, clean_run_count: 3, mastery_threshold: 3 },
        { id: 2, name: 'Loops', category: 'FUNDAMENTALS', status: 'mastered', auto_detectable: true, clean_run_count: 3, mastery_threshold: 3 },
        { id: 3, name: 'Conditionals', category: 'FUNDAMENTALS', status: 'in_progress', auto_detectable: true, clean_run_count: 1, mastery_threshold: 3 },
        { id: 4, name: 'Variables', category: 'FUNDAMENTALS', status: 'not_started', auto_detectable: true, clean_run_count: 0, mastery_threshold: 3 },
        { id: 5, name: 'Debugging', category: 'PROBLEM_SOLVING', status: 'in_progress', auto_detectable: true, clean_run_count: 2, mastery_threshold: 3 },
        { id: 6, name: 'Decomposition', category: 'PROBLEM_SOLVING', status: 'not_started', auto_detectable: false, clean_run_count: 0, mastery_threshold: 3 },
        { id: 7, name: 'Pattern Recognition', category: 'PROBLEM_SOLVING', status: 'mastered', auto_detectable: true, clean_run_count: 3, mastery_threshold: 3 },
        { id: 8, name: 'Robot Motion', category: 'ROBOTICS', status: 'mastered', auto_detectable: true, clean_run_count: 3, mastery_threshold: 3 },
        { id: 9, name: 'Robot Arms & Gripper', category: 'ROBOTICS', status: 'in_progress', auto_detectable: true, clean_run_count: 1, mastery_threshold: 3 },
        { id: 10, name: 'Robot Expressions', category: 'ROBOTICS', status: 'not_started', auto_detectable: true, clean_run_count: 0, mastery_threshold: 3 }
    ];

    var PROJECTS = [
        { id: 101, title: 'หุ่นเดินสี่เหลี่ยม', created_at: daysAgoISO(3), updated_at: daysAgoISO(1) },
        { id: 102, title: 'ทักทายด้วยหน้ายิ้ม', created_at: daysAgoISO(2), updated_at: daysAgoISO(2) },
        { id: 103, title: 'เต้นวนซ้ำ 3 รอบ', created_at: daysAgoISO(5), updated_at: daysAgoISO(4) }
    ];

    var STUDENTS = [
        { id: 11, username: 'student_a', display_name: 'สมชาย ใจดี', last_active: daysAgoISO(0), run_count: 24, ai_count: 8, skill_progress: 70, objectives_completed: 7, tutorial_status: 'completed' },
        { id: 12, username: 'student_b', display_name: 'สมหญิง เก่งกล้า', last_active: daysAgoISO(0), run_count: 31, ai_count: 12, skill_progress: 90, objectives_completed: 9, tutorial_status: 'completed' },
        { id: 13, username: 'student_c', display_name: 'อนุชา ตั้งใจ', last_active: daysAgoISO(2), run_count: 9, ai_count: 3, skill_progress: 30, objectives_completed: 3, tutorial_status: 'in_progress' }
    ];

    var SKILL_OVERVIEW = SKILLS.map(function (s) {
        var m = s.status === 'mastered' ? 2 : 1;
        return { name: s.name, mastered: m, in_progress: 1, not_started: 3 - m - 1 };
    });

    var DASHBOARD = {
        user: DEMO_USER,
        stats: { run_count: 42, block_count: 128, ai_count: 15, project_count: 3 },
        projects: PROJECTS,
        achievements: ACHIEVEMENTS,
        skills: SKILLS,
        grades: [
            { project_title: 'หุ่นเดินสี่เหลี่ยม', score: 9, max_score: 10, teacher_name: 'พี่วิทยา', comment: 'ทำได้ดีมาก ลองเพิ่มการวนซ้ำดูนะ' },
            { project_title: 'ทักทายด้วยหน้ายิ้ม', score: 10, max_score: 10, teacher_name: 'พี่วิทยา', comment: 'สมบูรณ์แบบ!' }
        ],
        activity: last7(),
        joined_classrooms: [
            { id: 201, name: 'ห้อง ม.2/1 วิชาหุ่นยนต์', teacher_name: 'พี่วิทยา', joined_at: daysAgoISO(10) }
        ],
        owned_classrooms: [
            { id: 202, name: 'ชมรมโค้ดดิ้ง (ตัวอย่าง)', invite_code: 'DEMO01', student_count: 3 }
        ],
        assignments: [
            { id: 301, task_key: 'task_a1b2c3', title: 'พาหุ่นเดินอ้อมกล่อง', description: 'วางกล่องไว้ข้างหน้าหุ่น แล้วเขียนโปรแกรมให้หุ่นเดินอ้อมกล่องไปให้ได้', classroom_name: 'ห้อง ม.2/1 วิชาหุ่นยนต์', goal: {}, submitted: true, submitted_at: daysAgoISO(1), submitted_project_id: 101, grade: { score: 9, max_score: 10, comment: 'ทำได้ดีมาก' } },
            { id: 302, task_key: 'task_d4e5f6', title: 'หุ่นทักทายเพื่อน', description: 'ให้หุ่นยกมือแล้วทำหน้ายิ้ม เว้นจังหวะให้เห็นชัด ๆ ด้วย', classroom_name: 'ห้อง ม.2/1 วิชาหุ่นยนต์', goal: { required_blocks: ['start_program', 'hand_', 'face_'], min_commands: 4 }, submitted: false, submitted_at: null, submitted_project_id: null, grade: null }
        ],
        teacher: {
            stats: { total_students: 3, active_today: 2, runs_today: 18, ai_today: 6 },
            selected_classroom_id: 202,
            students: STUDENTS,
            skill_overview: SKILL_OVERVIEW,
            assignments: [
                { id: 401, task_key: 'task_a1b2c3', title: 'พาหุ่นเดินอ้อมกล่อง', classroom_name: 'ชมรมโค้ดดิ้ง (ตัวอย่าง)', submission_count: 2, total_students: 3 },
                { id: 402, task_key: 'task_d4e5f6', title: 'หุ่นทักทายเพื่อน', classroom_name: 'ชมรมโค้ดดิ้ง (ตัวอย่าง)', submission_count: 1, total_students: 3 }
            ]
        }
    };

    // ชนิดบล็อกที่ตั้งเป็นเกณฑ์ผ่านได้ — ต้องตรงกับ GOAL_BLOCK_CHOICES ใน dashboard.py
    var BLOCK_CHOICES = [
        { key: 'start_program', label: 'บล็อก START PROGRAM' },
        { key: 'move_forward', label: 'เดินหน้า' },
        { key: 'move_backward', label: 'ถอยหลัง' },
        { key: 'turn_', label: 'เลี้ยว (ซ้ายหรือขวา)' },
        { key: 'move_timed', label: 'เดิน/ถอยตามเวลา' },
        { key: 'arm_', label: 'คำสั่งแขน' },
        { key: 'hand_', label: 'คำสั่งมือ' },
        { key: 'head_', label: 'คำสั่งหัว' },
        { key: 'face_', label: 'คำสั่งหน้าตา' },
        { key: 'grip_', label: 'คำสั่งที่หนีบ' },
        { key: 'sensor_', label: 'บล็อกเซนเซอร์ (ถือของ / ขอบโต๊ะ / หน้าคน)' },
        { key: 'controls_if', label: 'บล็อก if' },
        { key: 'controls_repeat_ext', label: 'บล็อก repeat' },
        { key: 'controls_whileUntil', label: 'บล็อก while' },
        { key: 'controls_forever', label: 'บล็อก repeat forever' },
        { key: 'logic_operation', label: 'บล็อก and / or' },
        { key: 'variables_set', label: 'ตั้งค่าตัวแปร' }
    ];

    var OBJECTIVES = [
        { id: 1, name: 'สั่งงานตามลำดับ', mastery_threshold: 3 },
        { id: 2, name: 'สั่งวนซ้ำ', mastery_threshold: 3 },
        { id: 3, name: 'สั่งแบบมีเงื่อนไข', mastery_threshold: 3 },
        { id: 4, name: 'ใช้ตัวแปร', mastery_threshold: 3 }
    ];

    // หน้าหุ่น 11 แบบ — ต้องตรงกับ FACE_BLOCKS ใน dashboard.py
    var FACE_LIST = [
        { key: 'face_normal', label: 'ปกติ' }, { key: 'face_look_left', label: 'เหลือบซ้าย' },
        { key: 'face_look_right', label: 'เหลือบขวา' }, { key: 'face_happy', label: 'ยิ้ม' },
        { key: 'face_sad', label: 'เศร้า' }, { key: 'face_angry', label: 'โมโห' },
        { key: 'face_shocked', label: 'ตกใจ' }, { key: 'face_sleepy', label: 'ง่วง' },
        { key: 'face_confused', label: 'งง' }, { key: 'face_love', label: 'รัก' },
        { key: 'face_shy', label: 'เขิน' }
    ];
    var demoUnlocked = ['face_normal', 'face_happy', 'face_sad', 'face_love'];
    var demoChosenFace = 'face_happy';
    var demoAvatar = 'face:happy';   // 'face:xxx' | 'data:image/...' | null

    // คำตอบ AI แบบ Socratic (สุ่ม) — เลียนแบบเมโต้
    var AI_REPLIES = [
        'ลองสังเกตดูนะ ถ้าอยากให้หุ่นเดินเป็นสี่เหลี่ยม ต้องเลี้ยวกี่ครั้ง?',
        'เก่งมาก! โค้ดนี้ทำงานได้ ลองท้าทายตัวเองด้วยการใช้ loop ดูไหม?',
        'ใกล้แล้ว! ลองเช็กว่าบล็อก START PROGRAM อยู่บนสุดหรือยังนะ',
        'คำสั่งซ้ำๆ แบบนี้ ถ้าใช้ repeat จะสั้นลงเยอะเลย ลองดูสิ!',
        'ดีมาก ที่ใช้ if แล้ว ลองคิดว่าถ้าเงื่อนไขไม่เป็นจริง หุ่นจะทำอะไรต่อ?'
    ];
    var aiIndex = 0;

    // ---------- ตัวช่วยสร้าง Response จำลอง ----------
    function jsonResp(obj, status) {
        return new Response(JSON.stringify(obj), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // เก็บโปรเจกต์ที่ "บันทึก" ในโหมด demo ไว้ในหน่วยความจำ
    var savedProjects = PROJECTS.slice();
    var nextId = 500;

    function route(method, path, body) {
        // ----- Auth -----
        if (path.endsWith('/api/auth/login') || path.endsWith('/api/auth/register')) {
            var name = (body && body.display_name) || (body && body.username) || DEMO_USER.display_name;
            return jsonResp({ token: 'demo-token', user: Object.assign({}, DEMO_USER, { display_name: name, username: (body && body.username) || 'demo' }) }, path.indexOf('register') > -1 ? 201 : 200);
        }
        if (path.endsWith('/api/auth/me')) {
            return jsonResp({ user: DEMO_USER, tutorial_progress: { is_completed: true, skipped: false, last_step_seen: 6 } });
        }
        if (path.endsWith('/api/auth/logout')) return jsonResp({ message: 'ok' });
        if (path.endsWith('/api/auth/profile') && method === 'PUT') {
            if (body && 'avatar_url' in body) {
                demoAvatar = body.avatar_url || null;
                demoChosenFace = (demoAvatar && demoAvatar.indexOf('face:') === 0)
                    ? 'face_' + demoAvatar.slice(5) : null;
            }
            return jsonResp({ user: DEMO_USER });
        }
        if (path.endsWith('/api/auth/profile')) return jsonResp({ user: DEMO_USER });

        // ----- Dashboard -----
        if (path.indexOf('/api/dashboard') > -1) return jsonResp(Object.assign({}, DASHBOARD, {
            // เหตุผลให้กลับมาพรุ่งนี้ — เลขสะสมที่ไม่มีวันหาย ไม่ใช่ streak ที่ขาดแล้วเสียหาย
            days_played: 12,
            daily_quest: {
                objective_id: 3, objective_name: 'สั่งวนซ้ำ (Loops)',
                clean_runs: 1, mastery_threshold: 3,
                date: new Date().toISOString().slice(0, 10)
            }
        }));

        // ----- Projects -----
        if (path.endsWith('/api/projects') && method === 'GET') return jsonResp({ projects: savedProjects, total: savedProjects.length, page: 1, pages: 1 });
        if (path.endsWith('/api/projects') && method === 'POST') {
            var p;
            if (body && body.id) {
                p = { id: body.id, title: body.title, blockly_xml: body.blockly_xml, created_at: daysAgoISO(1), updated_at: new Date().toISOString(), user_id: 1 };
            } else {
                p = { id: nextId++, title: body ? body.title : 'โปรเจกต์', blockly_xml: body ? body.blockly_xml : '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 1 };
                savedProjects.unshift({ id: p.id, title: p.title, created_at: p.created_at, updated_at: p.updated_at });
            }
            return jsonResp({ project: p }, body && body.id ? 200 : 201);
        }
        var projMatch = path.match(/\/api\/projects\/(\d+)/);
        if (projMatch) {
            var pid = parseInt(projMatch[1], 10);
            if (method === 'DELETE') {
                savedProjects = savedProjects.filter(function (x) { return x.id !== pid; });
                return jsonResp({ message: 'deleted' });
            }
            return jsonResp({ project: { id: pid, title: 'โปรเจกต์ตัวอย่าง', blockly_xml: '<xml xmlns="https://developers.google.com/blockly/xml"><block type="start_program" x="40" y="40"><next><block type="move_forward"/></next></block></xml>', user_id: 1, created_at: daysAgoISO(1), updated_at: daysAgoISO(1) } });
        }

        // ----- Skills / Activity / Tutorial -----
        if (path.endsWith('/api/skills/auto')) return jsonResp({ results: [] });
        if (path.endsWith('/api/activity')) return jsonResp({ activity: {}, new_achievements: [] }, 201);
        if (path.indexOf('/api/activity/chart') > -1) return jsonResp({ activity_chart: last7() });
        if (path.indexOf('/api/tutorial/status') > -1) return jsonResp({ tutorial_progress: { is_completed: true, skipped: false, last_step_seen: 6 } });
        if (path.indexOf('/api/tutorial/') > -1) return jsonResp({ tutorial_progress: { is_completed: true }, new_achievements: [] });

        // ----- Classrooms -----
        if (path.endsWith('/api/classrooms') && method === 'POST') return jsonResp({ classroom: { id: 999, name: body ? body.name : 'ห้องใหม่', invite_code: 'NEW001', student_count: 0 } }, 201);
        if (path.endsWith('/api/classrooms') && method === 'GET') return jsonResp({ classrooms: DASHBOARD.owned_classrooms });
        if (path.endsWith('/api/classrooms/join')) return jsonResp({ message: 'joined', classroom: { id: 201, name: 'ห้อง ม.2/1 วิชาหุ่นยนต์', invite_code: 'ABC123' } });

        // ----- Assignments -----
        if (path.indexOf('/api/assignments/objectives') > -1) return jsonResp({
            objectives: OBJECTIVES,
            blocks: BLOCK_CHOICES
        });
        if (path.indexOf('/api/tasks/blocks') > -1) return jsonResp({ blocks: BLOCK_CHOICES });

        // เพื่อนในห้องอยู่ด่านไหน — ไม่มีชื่อ ไม่มีอันดับ มีแค่จำนวนคนต่อด่าน
        if (/\/api\/classrooms\/\d+\/map/.test(path)) return jsonResp({
            nodes: [1, 0, 3, 2, 0, 1, 0, 0, 0],
            total_students: 7,
            my_index: 2
        });

        // ----- หน้าหุ่นเป็นของสะสม -----
        if (path.indexOf('/api/faces/chosen') > -1 && method === 'PUT') {
            demoChosenFace = (body && body.face) || null;
            demoAvatar = demoChosenFace ? 'face:' + demoChosenFace.slice(5) : null;
            return jsonResp({ chosen: demoChosenFace });
        }
        if (path.indexOf('/api/faces') > -1) return jsonResp({
            faces: FACE_LIST.map(function (f) {
                return { key: f.key, label: f.label, unlocked: demoUnlocked.indexOf(f.key) !== -1 };
            }),
            chosen: demoChosenFace
        });
        if (path.match(/\/api\/assignments\/\d+\/submissions/)) return jsonResp({ assignment: DASHBOARD.teacher.assignments[0], total_students: 3, submissions: [{ id: 1, student_id: 11, student_name: 'สมชาย ใจดี', project_id: 101, project_title: 'หุ่นเดินสี่เหลี่ยม', submitted_at: daysAgoISO(1), grade: { score: 9, max_score: 10, comment: '' } }, { id: 2, student_id: 12, student_name: 'สมหญิง เก่งกล้า', project_id: 102, project_title: 'สี่เหลี่ยมสวยงาม', submitted_at: daysAgoISO(0), grade: null }] });
        if (path.match(/\/api\/assignments\/\d+\/submit/)) return jsonResp({ submission: { id: 1, submitted_at: new Date().toISOString() } });
        if (path.endsWith('/api/assignments') && method === 'POST') return jsonResp({ assignment: { id: 500, title: 'ภารกิจใหม่', level: 'Sequential' } }, 201);
        if (path.match(/\/api\/assignments\/\d+/) && method === 'DELETE') return jsonResp({ message: 'deleted' });

        // ----- Student detail (ผู้ดูแลดูสมาชิก) -----
        var stuMatch = path.match(/\/api\/students\/(\d+)\/detail/);
        if (stuMatch) {
            var s = STUDENTS.find(function (x) { return x.id === parseInt(stuMatch[1], 10); }) || STUDENTS[0];
            return jsonResp({
                student: s,
                projects: PROJECTS.slice(0, 2),
                activities: [],
                objectives: SKILLS.map(function (sk, i) { return { id: i + 1, name: sk.name, status: sk.status }; }),
                grades: DASHBOARD.grades,
                activity_chart: last7()
            });
        }
        if (path.match(/\/api\/students\/\d+\/projects/)) return jsonResp({ projects: PROJECTS.slice(0, 2) });
        if (path.endsWith('/api/grades')) return jsonResp({ grade: { id: 1, score: body ? body.score : 10, max_score: 10 } }, 201);
        if (path.match(/\/api\/objectives\/.+\/override/)) return jsonResp({ progress: { status: body ? body.status : 'COMPLETED' } });

        // ----- AI ผู้ช่วยสอน -----
        if (path.indexOf('/new_session') > -1) return jsonResp({ session_id: 'demo-session' });
        if (path.indexOf('/clear_session') > -1) return jsonResp({ message: 'cleared' });
        if (path.indexOf('/analyze') > -1) {
            var reply = AI_REPLIES[aiIndex % AI_REPLIES.length]; aiIndex++;
            return jsonResp({ reply: reply, session_id: 'demo-session' });
        }
        if (path.indexOf('/health') > -1) return jsonResp({ status: 'ok', demo: true });

        // ไม่รู้จัก → ตอบว่างแบบสำเร็จ กัน frontend พัง
        return jsonResp({});
    }

    // ---------- ดัก window.fetch ----------
    var origFetch = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = function (url, opts) {
        var u = typeof url === 'string' ? url : (url && url.url) || '';
        opts = opts || {};
        var method = (opts.method || 'GET').toUpperCase();

        // จับเฉพาะ API ของระบบ (รวมทั้ง path ตรงและ absolute URL ที่ origin เดียวกัน)
        var isApi = u.indexOf('/api/') > -1 || u.indexOf('/analyze') > -1 ||
            u.indexOf('/new_session') > -1 || u.indexOf('/clear_session') > -1 ||
            u.indexOf('/health') > -1;

        if (isApi) {
            var body = null;
            try { if (opts.body) body = JSON.parse(opts.body); } catch (e) { }
            // หน่วงนิดให้เหมือนเรียกเซิร์ฟเวอร์จริง (loading spinner ทำงาน)
            return new Promise(function (resolve) {
                setTimeout(function () { resolve(route(method, u, body)); }, 180);
            });
        }

        // ปล่อยของจริงไป (เช่น โหลดหุ่นsprite, CDN) — ถ้า file:// ไม่มี origFetch ก็เดี้ยงเงียบ
        if (u.indexOf('mdtrobot.local') > -1) {
            return Promise.reject(new Error('demo: no robot')); // หุ่นจริงไม่มีในโหมด demo
        }
        return origFetch ? origFetch(url, opts) : Promise.reject(new Error('fetch unavailable'));
    };

    // ไม่แสดงป้ายใดๆ — ให้หน้าตาเหมือนเว็บจริงทุกประการ
    // (บอกว่าเป็นโหมด demo ผ่าน console เท่านั้น สำหรับ dev)
})();
