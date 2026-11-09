// ==================== ธีม B — หน้าเกมของสมาชิก ====================
//
// อ่าน THEME.md ส่วนที่ 2 (ข้อ 8-15) ก่อนแก้ไฟล์นี้ · สไตล์อยู่ที่ static/game-ui.css
//
// รอบแรกทำเป็นกริดการ์ดขาวติดดาว ผลคือ "ดูเหมือนเกม 2/10 · น่าเบื่อ 8/10"
// รอบนี้รื้อใหม่เป็น "ฉาก" จริง — แผนที่ผจญภัยที่มีเส้นทาง มีหุ่นยืนอยู่ มีของขยับตลอดเวลา
//
// สิ่งที่เปลี่ยนแนวคิดจากรอบแรก:
//   กริดการ์ด 9 ใบ  ->  เส้นทางเดียวคดเคี้ยวผ่าน 9 ด่าน (กริด = สเปรดชีต · เส้นทาง = แผนที่)
//   ตัวหนังสือ 27 บรรทัดบนการ์ด  ->  บนโหนดมีแค่ไอคอนกับดาว ชื่อโผล่ตอนเลือก
//   ไม่มีตัวละคร  ->  หุ่น METO ยืนบนด่านปัจจุบัน ขยับตลอดเวลา
//   เงียบสนิท  ->  เสียงสังเคราะห์จาก sfx.js
//
// ตัวเลขดาวยังเป็นชุดเดียวกับที่ผู้ดูแลเห็นเป็น 2/3 เสมอ (clean_run_count / mastery_threshold)
// เปลี่ยนแค่การนำเสนอ ข้อมูลวิจัยไม่กระทบ

// สีประจำทักษะ — สีหมวดบล็อกจาก THEME.md ข้อ 2.3 "ห้ามเปลี่ยนค่า" (ผูกกับรายงาน 3.3.4)
const SKILL_STYLE = {
    'Sequencing':           { color: '#59C059', th: 'เรียงลำดับคำสั่ง' },
    'Loops':                { color: '#4C97FF', th: 'สั่งวนซ้ำ' },
    'Conditionals':         { color: '#FFBF00', th: 'ตั้งเงื่อนไข' },
    'Variables':            { color: '#FF8C1A', th: 'ใช้ตัวแปร' },
    'Pattern Recognition':  { color: '#9966FF', th: 'มองเห็นรูปแบบซ้ำ' },
    'Robot Motion':         { color: '#4C97FF', th: 'บังคับหุ่นเคลื่อนที่' },
    'Robot Arms & Gripper': { color: '#00B4AB', th: 'บังคับแขนและมือจับ' },
    'Robot Expressions':    { color: '#FF6680', th: 'สั่งหุ่นแสดงอารมณ์' },
    'Debugging':            { color: '#CF63CF', th: 'แก้บั๊ก' },
    'Decomposition':        { color: '#3A53A4', th: 'ย่อยงานใหญ่เป็นงานเล็ก' },
};

// สัญลักษณ์บนโหนด — ซิลูเอตทึบ ไม่ใช่เส้นบาง (เส้นบาง = ภาษาไอคอนของแอดมินแพเนล)
const SKILL_GLYPH = {
    'Sequencing':           `<rect x="6" y="9" width="20" height="3"/><rect x="6" y="15" width="20" height="3"/><rect x="6" y="21" width="13" height="3"/>`,
    'Loops':                `<path d="M16 6 a10 10 0 1 1 -9.5 13 l3.8 -1.2 a6 6 0 1 0 5.7 -7.8 z"/><path d="M13 3 l6 3.5 -6 3.5 z"/>`,
    'Conditionals':         `<rect x="14" y="5" width="4" height="9"/><path d="M16 13 l-9 8 3 3 6 -6 6 6 3 -3 z"/><rect x="4" y="23" width="7" height="6"/><rect x="21" y="23" width="7" height="6"/>`,
    'Variables':            `<rect x="4" y="11" width="24" height="11"/><rect x="8" y="15" width="6" height="3" fill="#000" opacity=".45"/><rect x="18" y="15" width="4" height="3" fill="#000" opacity=".45"/>`,
    'Pattern Recognition':  `<rect x="5" y="5" width="9" height="9"/><rect x="18" y="5" width="9" height="9"/><rect x="5" y="18" width="9" height="9"/><rect x="18" y="18" width="9" height="9" opacity=".4"/>`,
    'Robot Motion':         `<rect x="3" y="14" width="16" height="4"/><path d="M17 8 l11 8 -11 8 z"/>`,
    'Robot Arms & Gripper': `<rect x="6" y="16" width="4" height="12"/><rect x="6" y="16" width="13" height="4"/><rect x="20" y="4" width="4" height="9"/><rect x="27" y="6" width="4" height="9"/><rect x="14" y="12" width="8" height="8"/>`,
    'Robot Expressions':    `<rect x="4" y="8" width="24" height="17"/><rect x="9" y="13" width="4" height="5" fill="#000" opacity=".55"/><rect x="19" y="13" width="4" height="5" fill="#000" opacity=".55"/><rect x="11" y="21" width="10" height="2" fill="#000" opacity=".55"/>`,
    'Debugging':            `<rect x="11" y="9" width="10" height="15"/><rect x="13" y="4" width="6" height="6"/><rect x="3" y="12" width="7" height="3"/><rect x="3" y="19" width="7" height="3"/><rect x="22" y="12" width="7" height="3"/><rect x="22" y="19" width="7" height="3"/>`,
    'Decomposition':        `<rect x="11" y="3" width="10" height="7"/><rect x="2" y="22" width="10" height="7"/><rect x="20" y="22" width="10" height="7"/><rect x="15" y="10" width="2" height="5"/><rect x="6" y="15" width="20" height="2"/><rect x="6" y="15" width="2" height="7"/><rect x="24" y="15" width="2" height="7"/>`,
};

// ตำแหน่งด่านบนแผนที่ — คดเคี้ยวขึ้นไปทางขวา ห้ามสมมาตร
// ความไม่สมมาตรคือสิ่งที่ทำให้ตาอ่านว่า "สถานที่" แทน "ตาราง"
const NODE_POS = [
    { x:  70, y: 322 }, { x: 186, y: 262 }, { x: 300, y: 330 },
    { x: 416, y: 250 }, { x: 524, y: 168 }, { x: 642, y: 238 },
    { x: 752, y: 156 }, { x: 858, y: 248 }, { x: 944, y: 148 },
];

const PLAYER_RANKS = [
    { min: 0,  label: 'ผู้ฝึกหัดใหม่' },
    { min: 1,  label: 'นักบังคับหุ่นมือใหม่' },
    { min: 7,  label: 'นักเขียนโค้ดฝึกหัด' },
    { min: 14, label: 'นักบังคับหุ่นชำนาญ' },
    { min: 21, label: 'ยอดนักโปรแกรม' },
    { min: 27, label: 'ครบทุกดาวแล้ว!' },
];

Object.assign(Dashboard, {

    // "ลุยเลย" = เปิด Workspace พร้อมภารกิจข้อนี้ของห้องนี้ (เดิมแค่เปลี่ยนหน้า แถบภารกิจต้องเดาเอง)
    goMission(assignmentId, classroomId) {
        try {
            localStorage.setItem('meto_mission', String(assignmentId));
            if (classroomId) localStorage.setItem('meto_mission_room', String(classroomId));
        } catch (e) { }
        Router.navigate('#/workspace');
        if (typeof Mission !== 'undefined') Mission.loadAssignments();
    },

    // ===================== ตัวช่วยเรื่องดาว (ตัวเลขเดียวกับฝั่งผู้ดูแล) =====================

    _starsOf(skill) {
        const max = skill.mastery_threshold || 3;
        // เซิร์ฟเวอร์ส่งคำว่า 'mastered' (ดู _status_key ใน dashboard.py)
        // ของเดิมเทียบกับ 'completed' ซึ่งเป็นชื่อสถานะในฐานข้อมูล ไม่ใช่ชื่อที่ส่งออก API
        // ผลคือผู้ดูแลกดให้ผ่านแล้วดาวไม่ขึ้นเลย ค้างที่ 0 ตลอด ทั้งที่หน้าธีมปกติขึ้น "เชี่ยวชาญ" ถูก
        // รับทั้งสองคำเพื่อกันพังถ้าฝั่งเซิร์ฟเวอร์เปลี่ยนกลับ
        if (skill.status === 'mastered' || skill.status === 'completed') {
            return { earned: max, max };
        }
        return { earned: Math.max(0, Math.min(skill.clean_run_count || 0, max)), max };
    },

    /** นับเฉพาะทักษะที่ระบบตรวจเองได้ (9 อัน)
     *  Decomposition ไม่ถูกนับ ไม่งั้นตัวหารเป็น 30 แล้วเด็กไปไม่ถึงเต็มตลอดกาล */
    _starTotals(skills) {
        let earned = 0, max = 0;
        (skills || []).filter(s => s.auto_detectable).forEach(s => {
            const n = this._starsOf(s);
            earned += n.earned; max += n.max;
        });
        return { earned, max };
    },

    _rankLabel(earned, max) {
        if (max > 0 && earned >= max) return PLAYER_RANKS[PLAYER_RANKS.length - 1].label;
        let label = PLAYER_RANKS[0].label;
        PLAYER_RANKS.forEach(r => { if (earned >= r.min && r.min < 27) label = r.label; });
        return label;
    },

    /** ดาวพิกเซล — สี่เหลี่ยมล้วนบนตะแกรงจำนวนเต็ม ไม่ใช่เส้นโค้ง
     *  วาดแบบนี้เพื่อให้เข้ากับฟอนต์พิกเซลและ crispEdges */
    _pxStar(filled, size) {
        const s = size || 16;
        // ทอง #FFBF00 อยู่ในพาเลตหมวดบล็อก (Head) อยู่แล้ว — ได้ดาวแบบเกมโดยไม่ออกนอกแบรนด์
        const on = filled ? '#FFBF00' : '#e0cca4';
        const edge = filled ? '#b8860b' : '#bda87e';
        return `<svg viewBox="0 0 16 16" width="${s}" height="${s}" shape-rendering="crispEdges"
            class="g-star ${filled ? 'is-on' : ''}" aria-hidden="true">
            <path fill="${edge}" d="M6 1h4v3h2v3h3v3h-3v3h1v2h-3v-2H6v2H3v-2h1v-3H1V7h3V4h2z"/>
            <path fill="${on}"  d="M7 2h2v3h2v2h3v2h-3v3h1v1H9v-1H7v1H5v-1h1V9H3V7h3V5h1z"/>
        </svg>`;
    },

    // ===================== ตัวแจกงานของฝั่งสมาชิก =====================
    //
    // สองหน้านี้ "เนื้อในต้องไม่เหมือนกัน" เพราะข้อมูลคนละชุดกันในฐานข้อมูล
    //
    //   #/dashboard/me        โปรไฟล์ — ของที่ผูกกับ user ไม่ผูกกับห้อง
    //                         ดาว 9 ทักษะ (student_id + objective_id) · ผลงาน (Project.user_id)
    //                         เหรียญ (UserAchievement.user_id)
    //                         เด็กอยู่ 2 ห้องก็เห็นดาวชุดเดียวกัน จึงต้องอยู่ที่โปรไฟล์
    //
    //   #/dashboard/room/<id> ห้อง — ของที่ผูกกับห้องนั้นห้องเดียว
    //                         ภารกิจ (Assignment.classroom_id) · งานที่ส่ง
    //                         คะแนนของห้องนี้ (Grade.classroom_id)
    //                         ผู้ดูแลห้อง · เลขที่ของเราในห้อง
    //
    // เดิมวาดหน้าเดียวกันแล้วแค่กรองภารกิจตามห้อง ทำให้สองหน้าเหมือนกันจนแยกไม่ออก
    // อัปเดต: โหมด PLAYER เข้าได้ทางเดียวคือ #/dashboard/room/<id> ที่เราเป็นสมาชิก
    // ธีมเกม = บทบาทสมาชิกในห้องของผู้ดูแลเท่านั้น (ดู getView ใน dashboard-hub.js)
    // #/dashboard/me เป็นธีมปกติแล้ว _renderProfile จึงเข้าไม่ถึงตอนนี้ —
    // เก็บไว้เพราะแผนที่/HUD ในนั้นเป็นต้นแบบของหน้าโฟกัสภารกิจที่กำลังจะทำ
    renderPlayer(view) {
        return view.classroomId ? this._renderRoom(view) : this._renderProfile(view);
    },

    /** HUD ผู้เล่น — ใช้ร่วมกันทั้งสองหน้า แต่ตัวเลขดาวโชว์เฉพาะหน้าโปรไฟล์
     *  (ดาวเป็นของ user ไม่ใช่ของห้อง เอาไปโชว์ในหน้าห้องจะสื่อผิด) */
    _hud(displayName, totals, showStars, subtitle) {
        const pct = totals.max ? Math.round((totals.earned / totals.max) * 100) : 0;
        return `
            <div class="g-panel g-hud">
                <div class="g-hud-id">
                    <div class="g-title">${this._esc(displayName)}</div>
                    ${showStars
                        ? `<div class="g-hud-rank">${this._esc(this._rankLabel(totals.earned, totals.max))}</div>`
                        : ''}
                    ${subtitle ? `<div class="g-sub">${subtitle}</div>` : ''}
                </div>
                ${showStars ? `
                <div class="g-hud-stars">
                    <div class="g-hud-star-row">
                        ${this._pxStar(true, 28)}
                        <span class="g-num">${totals.earned}</span>
                        <span class="g-sub">/${totals.max}</span>
                    </div>
                    <div class="g-bar" style="width:200px;"><span style="width:${pct}%"></span></div>
                </div>` : ''}
                <button class="g-btn g-sfx-toggle" onclick="Dashboard.toggleSfx(this)"
                        title="เปิด/ปิดเสียง">${SFX.enabled ? 'เสียง: เปิด' : 'เสียง: ปิด'}</button>
            </div>`;
    },

    // ===================== หน้าโปรไฟล์ — แผนที่ทักษะของฉัน =====================
    _renderProfile(view) {
        const d = this.data;
        const user = d.user || Auth.user || {};
        const displayName = user.display_name || user.username || 'เพื่อนใหม่';

        const skills = d.skills || [];
        const projects = d.projects || [];
        const achievements = d.achievements || [];
        const autoSkills = skills.filter(s => s.auto_detectable);
        const teacherSkills = skills.filter(s => !s.auto_detectable);
        const totals = this._starTotals(skills);
        const joined = d.joined_classrooms || [];

        // ด่านปัจจุบัน = ด่านแรกที่ยังไม่ครบดาว (ถ้าครบหมดให้ยืนที่ด่านสุดท้าย)
        let currentIdx = autoSkills.findIndex(s => this._starsOf(s).earned < this._starsOf(s).max);
        if (currentIdx < 0) currentIdx = autoSkills.length - 1;

        const container = document.getElementById('dashboard-content');
        container.innerHTML = `
            ${this._backToHub('เลือกแดชบอร์ดอื่น')}

            ${this._hud(displayName, totals, true, 'แผนที่ทักษะของฉัน ไม่ขึ้นกับห้องไหน')}

            <!-- ===== ฉาก: แผนที่ผจญภัย ===== -->
            <div class="g-scene g-map-wrap">
                ${this._renderMap(autoSkills, currentIdx)}
                <div class="g-map-hint g-sub">แตะด่านเพื่อดูรายละเอียด</div>
            </div>

            <!-- แผงรายละเอียดด่านที่เลือก -->
            <div class="g-panel g-node-detail" id="g-node-detail">
                ${this._nodeDetail(autoSkills[currentIdx], currentIdx)}
            </div>

            ${teacherSkills.length ? `
            <div class="g-panel">
                <div class="g-title" style="font-size:20px;">ตราที่ผู้ดูแลเป็นคนมอบ</div>
                <div class="g-teacher-badges">
                    ${teacherSkills.map(s => {
                        const st = SKILL_STYLE[s.name] || { color: '#3A53A4', th: s.name };
                        const done = this._starsOf(s).earned >= this._starsOf(s).max;
                        return `
                        <div class="g-tbadge ${done ? 'is-done' : ''}">
                            ${this._nodeGlyph(s.name, st.color, 44, done)}
                            <div class="g-label">${this._esc(st.th)}</div>
                            <div class="g-sub">${done ? 'ผู้ดูแลมอบให้แล้ว' : 'รอผู้ดูแลประเมิน'}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>` : ''}

            <div class="g-cols">
                <!-- ===== คลังผลงาน (ของ user ทั้งหมด ไม่แยกห้อง) ===== -->
                <div class="g-panel">
                    <div class="g-title" style="font-size:20px;">คลังผลงาน</div>
                    <div class="g-slots">
                        ${projects.length ? projects.map(p => `
                            <div class="g-slot">
                                <div class="g-slot-name">${this._esc(p.title || 'ไม่มีชื่อ')}</div>
                                <div class="g-sub">${this._formatDate(p.updated_at || p.created_at)}</div>
                                <div class="g-slot-actions">
                                    <button class="g-btn" onclick="Dashboard.openProject(${p.id})">เปิด</button>
                                    <button class="g-btn" onclick="Dashboard.viewProjectVersions(${p.id})">ประวัติ</button>
                                    <button class="g-btn" onclick="Dashboard.deleteProject(${p.id}, this)">ลบ</button>
                                </div>
                            </div>
                        `).join('') : '<div class="g-empty">คลังยังว่าง กด "บันทึก" ที่ Workspace เพื่อเก็บงานชิ้นแรก</div>'}
                    </div>
                </div>

                <div class="g-side">
                    <!-- ===== ตู้เหรียญ ===== -->
                    <div class="g-panel">
                        <div class="g-title" style="font-size:20px;">ตู้เหรียญ</div>
                        <div class="g-medals">
                            ${achievements.map(a => `
                                <div class="g-medal ${a.unlocked ? 'is-on' : ''}" title="${this._esc(a.description || '')}">
                                    ${MetoIcons.achievement(a.condition_type)}
                                    <span class="g-sub">${this._esc(a.name)}</span>
                                </div>`).join('')}
                        </div>
                    </div>

                    <!-- ทางไปห้อง ภารกิจกับคะแนนอยู่ในหน้าห้อง ไม่ใช่หน้านี้ -->
                    ${joined.length ? `
                    <div class="g-panel">
                        <div class="g-title" style="font-size:20px;">ห้องของฉัน</div>
                        <div class="g-sub" style="margin-bottom:12px;">ภารกิจกับคะแนนอยู่ในห้อง กดเข้าไปดูได้</div>
                        <div class="g-room-links">
                            ${joined.map(c => `
                                <button class="g-btn g-btn-primary" onclick="Dashboard.goTo('#/dashboard/room/${c.id}')">
                                    ${this._esc(c.name)}
                                </button>`).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </div>`;

        this._celebrateNewStars(skills);
    },

    // ===================== หน้าห้อง — ภารกิจของห้องนี้ =====================
    _renderRoom(view) {
        const d = this.data;
        const user = d.user || Auth.user || {};
        const displayName = user.display_name || user.username || 'เพื่อนใหม่';
        const room = view.room || {};
        const roomId = view.classroomId;

        const projects = d.projects || [];
        const assignments = (d.assignments || []).filter(a => a.classroom_id === roomId);
        const grades = (d.grades || []).filter(g => g.classroom_id === roomId);
        const totals = this._starTotals(d.skills || []);

        const done = assignments.filter(a => a.submitted).length;
        const pct = assignments.length ? Math.round((done / assignments.length) * 100) : 0;

        // --- ทักษะที่ "ห้องนี้" สั่งฝึกจริง ---
        // มาจาก required_blocks ของภารกิจที่ผู้ดูแลสั่ง (คำนวณฝั่งเซิร์ฟเวอร์ที่ skills_for_goal)
        // นี่เป็นข้อมูลของห้องแท้ๆ ต่างจากดาวที่เป็นของสมาชิกรายคนและไม่ผูกกับห้อง
        // จึงเอามาแสดงในหน้าห้องได้โดยไม่ได้โกหกว่าดาวเป็นของห้อง
        // ผู้ดูแลประกาศเองชนะระบบเดาเสมอ
        // a.objective_name = ผู้ดูแลติ๊กเองตอนสั่งภารกิจ | a.target_skills = ระบบเดาจาก required_blocks
        // เดิมอ่านแต่ค่าที่เดา ผู้ดูแลติ๊ก "Loops" แล้วแผนที่ก็ยังไฮไลต์ตามที่ preset เดาอยู่ดี
        // ทำให้ฟีเจอร์ "ผู้ดูแลประกาศเป้าหมายของภารกิจ" ตายที่หน้าจอทั้งที่ schema/API ครบแล้ว
        const focus = new Set();
        assignments.forEach(a => {
            if (a.objective_name) {
                focus.add(a.objective_name);
            } else {
                (a.target_skills || []).forEach(n => focus.add(n));
            }
        });

        const autoSkills = (d.skills || []).filter(s => s.auto_detectable);
        const roomSkills = autoSkills.filter(s => focus.has(s.name));
        const roomStars = roomSkills.reduce((acc, s) => {
            const n = this._starsOf(s);
            return { earned: acc.earned + n.earned, max: acc.max + n.max };
        }, { earned: 0, max: 0 });

        // ห้องนี้มีภารกิจที่ระบุทักษะหรือยัง — ตัวนี้ตัดสินว่าแผนที่จะหรี่ด่านหรือโชว์หมด
        // แต่ "ไม่ตัดสินว่าจะมีแผนที่ไหม" แผนที่ต้องมีเสมอ (ดูเหตุผลตรงที่วาด)
        const hasRoomFocus = roomSkills.length > 0;
        const showAllNodes = this._roomMapAll || !hasRoomFocus;

        // ภารกิจที่กำลังเก็บของ "ห้องนี้" — ผู้ดูแลเล็งให้ หรือเราตั้งเองในช่องของห้องนี้
        // โฟกัสส่วนตัว (classroom_id ว่าง) ไม่โผล่ที่นี่ มันเป็นของแดชบอร์ดผู้ใช้
        const mission = this._focusFor(roomId);

        // ด่านปัจจุบัน — มีภารกิจก็ยืนที่ภารกิจ ไม่มีก็ทักษะแรกที่ยังไม่ครบดาว
        const notFull = s => this._starsOf(s).earned < this._starsOf(s).max;
        // ธงบนแผนที่ต้องตรงกับการ์ดภารกิจถัดไป: เป้าของห้อง หรือเป้าที่เราเลือกเอง
        const goal = mission || this._focusFor(null);
        let currentIdx = goal
            ? autoSkills.findIndex(s => s.name === goal.objective_name)
            : -1;
        if (currentIdx < 0) {
            currentIdx = hasRoomFocus
                ? autoSkills.findIndex(s => focus.has(s.name) && notFull(s))
                : autoSkills.findIndex(notFull);
        }
        if (currentIdx < 0 && hasRoomFocus) {
            currentIdx = autoSkills.findIndex(s => focus.has(s.name));
        }
        // เก็บครบทุกดาวแล้ว -> ไปยืนด่านสุดท้าย ไม่ใช่เด้งกลับด่านแรก
        if (currentIdx < 0) currentIdx = Math.max(0, autoSkills.length - 1);

        // ===== หน้าห้องแบบใหม่ (8 พ.ย. 2569 · แผนแดชบอร์ดใหม่_8พย.md) =====
        // ตอบคำถามเดียว "ตอนนี้ต้องทำอะไร": HUD → แผนที่ + การ์ดภารกิจถัดไป → รายการภารกิจข้อละบรรทัด
        // เอาออก: ปุ่มกลับ (ใช้ปุ่ม Dashboard บนแถบหัว) · หัว "ทักษะที่ห้องนี้ฝึก" (แผนที่บอกแล้ว)
        //        กล่องคะแนน (คะแนนอยู่บนแถวภารกิจ) · กล่องดาวรวม (อยู่ใน HUD) · ช่องเลือกงาน+ส่ง (ส่งจาก Workspace)
        this._roomCtx = { roomId, assignments, autoSkills, mission, currentIdx };
        const next = this._nextFor(this._roomCtx);
        const looseGrades = grades.filter(g => !g.submission_id);   // คะแนนที่ไม่ติดกับภารกิจไหน

        const container = document.getElementById('dashboard-content');
        container.innerHTML = `
            ${this._hud(room.name || 'ห้อง', totals, false,
                `ผู้ดูแล: ${this._esc(room.teacher_name || '-')}` +
                (room.student_no ? ` · เลขที่ ${this._esc(room.student_no)}` : '') +
                ` · ${this._esc(displayName)} · ดาวของฉัน ${totals.earned}/${totals.max}`)}

            <div class="g-maprow">
                <div class="g-mapcol">
                    <div class="g-scene g-map-wrap">
                        ${this._renderMap(autoSkills, currentIdx, showAllNodes ? null : focus)}
                    </div>
                    <div class="g-map-captions">
                        <div class="g-map-legend g-sub">
                            <svg viewBox="-12 -12 24 24" width="16" height="16"
                                 shape-rendering="crispEdges" aria-hidden="true">
                                ${this._friendHead(0)}
                            </svg>
                            <span>เพื่อนในห้องที่อยู่ด่านนั้น ไม่บอกชื่อ ไม่มีอันดับ</span>
                        </div>
                        <div class="g-map-hint g-sub">
                            <span>${!hasRoomFocus
                                ? 'แตะด่านไหนก็ได้ เพื่อดูดาวและเลือกเป็นเป้า'
                                : this._roomMapAll
                                    ? 'แสดงทักษะทั้งหมด ดาวเป็นของเรา นับรวมทุกห้อง'
                                    : 'ด่านที่จางคือทักษะที่ห้องนี้ยังไม่ได้สั่งฝึก'}</span>
                            ${hasRoomFocus ? `
                            <button class="g-btn" onclick="Dashboard.toggleRoomMap()">
                                ${this._roomMapAll ? 'ดูเฉพาะของห้องนี้' : 'ดูแผนที่เต็ม'}
                            </button>` : ''}
                        </div>
                    </div>
                </div>

                <div class="g-panel g-node-detail g-next" id="g-node-detail">
                    ${this._nextCard(next)}
                </div>
            </div>

            <div class="g-panel">
                <div class="g-title" style="font-size:20px;">
                    ภารกิจของห้อง
                    ${assignments.length
                        ? `<span class="g-sub" style="font-size:14px;"> · ส่งแล้ว ${done}/${assignments.length}</span>`
                        : ''}
                </div>
                ${assignments.length ? `
                <div class="g-bar" style="margin-bottom:12px;">
                    <span style="width:${pct}%"></span>
                </div>
                <div class="g-quest-list">
                    ${assignments.map(a => `
                        <button class="g-quest-row ${next && next.kind === 'assignment' && next.a.id === a.id ? 'is-on' : ''}"
                                onclick="Dashboard.showQuest(${a.id})">
                            <span class="g-label g-quest-title">${this._esc(a.title)}</span>
                            <span class="g-quest-chips">
                                ${this._questState(a)}
                                ${this._lateBadge(a.is_late)}
                                ${a.submitted ? '' : this._dueBadge(a)}
                            </span>
                        </button>`).join('')}
                </div>`
                : '<div class="g-empty">ผู้ดูแลยังไม่ได้สั่งภารกิจในห้องนี้ ระหว่างรอ แตะด่านบนแผนที่แล้วไปเก็บดาวได้เลย</div>'}
            </div>

            ${looseGrades.length ? `
            <div class="g-panel">
                <div class="g-title" style="font-size:20px;">คะแนนอื่นจากผู้ดูแล</div>
                ${looseGrades.map(g => `
                    <div class="g-grade-row">
                        <span class="g-label">${this._esc(g.project_title || '-')}</span>
                        <span class="g-chip is-ok">${g.score}/${g.max_score}</span>
                    </div>`).join('')}
            </div>` : ''}`;

        // ฉลองตอนได้ดาว — เดิมเรียกเฉพาะในหน้าโปรไฟล์ซึ่งเข้าไม่ถึงแล้ว เลยไม่เคยเล่น
        this._celebrateNewStars(d.skills || []);

        // โหลดหมุดเพื่อนหลังวาดแผนที่เสร็จ — ไม่บล็อกการแสดงผล
        this._loadRoomMap(view.classroomId);
    },

    /** หมุดบอกตำแหน่งด่านปัจจุบัน
     *
     *  หมายเหตุสำคัญ: ห้ามเอาสไปรต์ใน static/sprites/ มาใช้เป็นตัวละครในหน้านี้
     *  ชุดนั้นเป็น digital twin ของหุ่นจริง มีไว้ให้เวทีจำลองใช้แสดงสถานะหุ่น
     *  เอามาเป็นมาสคอตประดับ = ใช้ผิดวัตถุประสงค์ (เคยพลาดมาแล้วใน [2.6] และถอดออก)
     *  ถ้าจะมีตัวละครในหน้านี้ ต้องเป็นอาร์ตที่วาดขึ้นมาเพื่อการนี้โดยเฉพาะ */
    /** รูปธงล้วนๆ ในระบบพิกัด 24x32 — ใช้ร่วมกันทั้งไอคอนเดี่ยวและธงบนแผนที่ */
    _markerShapes() {
        return `
            <rect x="10" y="6" width="3" height="24" fill="#0a0e1c"/>
            <path d="M13 4h9v3h-2v3h2v3h-9z" fill="#BED73B"/>
            <path d="M13 4h9v2h-9z" fill="#fff" opacity=".45"/>
            <rect x="7" y="29" width="9" height="3" fill="#0a0e1c" opacity=".5"/>`;
    },

    _marker(size) {
        const s = size || 40;
        return `
            <svg viewBox="0 0 24 32" width="${s}" height="${Math.round(s * 32 / 24)}"
                 shape-rendering="crispEdges" aria-hidden="true">
                ${this._markerShapes()}
            </svg>`;
    },

    /** ไอคอนโหนด — ซิลูเอตทึบบนแผ่นสี */
    /** แผ่นด่านบนแผนที่
     *
     *  ด่านที่ยังไม่เก็บดาว "ห้ามกลายเป็นสีเทา" — เดิมเปลี่ยนเป็น #c9bda3 ทั้งแผ่น
     *  ผลคือเด็กที่เพิ่งเริ่มเห็นแผนที่เป็นกล่องเทา 7 ใน 9 ใบ อ่านว่าพังหรือถูกล็อก
     *  ทั้งที่กติกาของระบบคือไม่ล็อกอะไรเลย ทุกด่านเข้าได้ตั้งแต่วันแรก
     *
     *  ใช้สีหมวดเดิมเสมอ ต่างกันแค่ "ความสด" — ยังไม่เก็บ = จางลงนิดเดียว
     *  ภาพจึงบอกว่า "ยังไม่ได้ไป" ไม่ใช่ "ไปไม่ได้" */
    _nodeGlyph(name, color, size, active) {
        const glyph = SKILL_GLYPH[name] || '';
        return `<svg viewBox="0 0 36 36" width="${size}" height="${size}" shape-rendering="crispEdges"
            class="g-glyph ${active ? 'is-on' : ''}" aria-hidden="true">
            <rect x="0" y="0" width="36" height="36" fill="#3A53A4"/>
            <rect x="2" y="2" width="32" height="32" fill="${color}"
                  opacity="${active ? 1 : 0.78}"/>
            <rect x="2" y="2" width="32" height="3" fill="#fff" opacity=".38"/>
            <rect x="2" y="31" width="32" height="3" fill="#000" opacity=".22"/>
            <g transform="translate(2,2)" fill="#2a2418" opacity="${active ? 1 : 0.7}">${glyph}</g>
        </svg>`;
    },

    /** แผนที่ — เส้นทางเดียวคดเคี้ยวผ่าน 9 ด่าน ไม่ใช่กริด
     *
     *  focus = Set ชื่อทักษะที่ห้องนี้สั่งฝึกจริง (จาก required_blocks ของภารกิจ)
     *          ส่งมาเมื่ออยู่หน้าห้อง → ด่านที่ห้องนี้ไม่ได้ฝึกจะหรี่ลง
     *          ไม่ส่ง (หน้าโปรไฟล์) → แสดงครบทั้ง 9 ด่านเท่ากันหมด */
    // เพื่อนในห้องอยู่ด่านไหนกันบ้าง — ไม่มีชื่อ ไม่มีอันดับ
    // รู้แค่ว่า "มีคนอยู่แถวนี้ด้วย" ก็พอให้ไม่รู้สึกเล่นคนเดียว
    // (leaderboard เรียงคะแนนจะฆ่าเด็กครึ่งล่างของห้องภายใน 5 นาที)
    _roomMap: null,

    async _loadRoomMap(classroomId) {
        if (!classroomId) return;
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/map`, { headers: Auth.getHeaders() });
            if (!res.ok) return;
            const d = await res.json();
            if (!d || !d.nodes) return;
            this._roomMap = d;
            this._paintRoomPins();
        } catch { /* ต่อไม่ได้ก็ไม่ต้องมีหมุดเพื่อน */ }
    },

    // หัวหุ่นพิกเซลหนึ่งหัว = เพื่อนหนึ่งคนที่ยืนอยู่ด่านนั้น
    // ตั้งใจให้บอกแค่ "แถวนี้มีคนอยู่ด้วย" — ไม่มีชื่อ ไม่มีอันดับ ไม่มีใครแพ้ใคร
    _friendHead(x) {
        return `<g transform="translate(${x}, 0)">
            <rect x="-10" y="-10" width="20" height="20" fill="#3A53A4" stroke="#fff" stroke-width="2"/>
            <rect x="-6" y="-4" width="4" height="4" fill="#BED73B"/>
            <rect x="2" y="-4" width="4" height="4" fill="#BED73B"/>
        </g>`;
    },

    _paintRoomPins() {
        const d = this._roomMap;
        if (!d) return;
        document.querySelectorAll('.g-node-friends').forEach(el => {
            const i = parseInt(el.dataset.i, 10);
            let n = d.nodes[i] || 0;
            // ยืนด่านไหนก็ไม่ต้องนับหัวตัวเองซ้ำ หุ่นของเราวาดแยกไว้แล้ว
            if (i === d.my_index) n = Math.max(0, n - 1);
            if (!n) { el.innerHTML = ''; return; }

            const heads = Math.min(n, 3);
            const step = 24;
            const startX = -((heads - 1) * step) / 2;
            let out = '';
            for (let k = 0; k < heads; k++) out += this._friendHead(startX + k * step);
            if (n > 3) {
                out += `<text x="${startX + heads * step}" y="5" text-anchor="middle"
                            font-size="15" font-weight="700" fill="#3A53A4">+${n - 3}</text>`;
            }
            // <title> ใน SVG คือ tooltip ของเบราว์เซอร์ — el.title ใช้กับ SVGElement ไม่ได้
            out += `<title>มีเพื่อนอยู่ด่านนี้ ${n} คน</title>`;
            el.innerHTML = out;
        });
    },

    _renderMap(autoSkills, currentIdx, focus) {
        // ยังไม่มีข้อมูลทักษะ = แผนที่ว่าง ไม่ใช่ข้อผิดพลาด
        // เดิมปล่อยผ่านแล้วไปพังที่ cur.x ตอนท้าย ทำให้ทั้งแดชบอร์ดขึ้น
        // "ต่อเซิร์ฟเวอร์ไม่ได้" ทั้งที่เซิร์ฟเวอร์ตอบ 200 ปกติ
        if (!autoSkills || !autoSkills.length) {
            return `<div class="g-empty">ยังไม่มีข้อมูลทักษะ กด Run ที่ Workspace หนึ่งครั้ง ระบบจะเริ่มนับให้</div>`;
        }
        const pts = NODE_POS.slice(0, autoSkills.length);

        // เส้นทางแยกเป็นช่วงๆ เพื่อระบายสีตามความคืบหน้าได้ทีละช่วง
        const segs = [];
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const dx = (b.x - a.x) * 0.55;
            const done = this._starsOf(autoSkills[i - 1]).earned >= this._starsOf(autoSkills[i - 1]).max;
            segs.push({
                d: `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`,
                done,
                active: i - 1 === currentIdx,
            });
        }

        const nodes = autoSkills.map((s, i) => {
            const p = pts[i];
            const st = SKILL_STYLE[s.name] || { color: '#3A53A4', th: s.name };
            const n = this._starsOf(s);
            const done = n.earned >= n.max;
            const isCurrent = i === currentIdx;
            const reached = done || n.earned > 0 || isCurrent;

            // ดาวลอยเหนือโหนด แบบ Cookie Run / Angry Birds
            // พิกัดต้อง "สัมพัทธ์กับโหนด" เพราะอยู่ใน <g> ที่ translate ไปแล้ว
            // (เคยพลาดใส่ค่าสัมบูรณ์ ทำให้ดาวถูกบวกซ้ำจนหลุดออกนอก viewBox)
            // ดาวใหญ่ขึ้นและยกสูงขึ้นตามแผ่นด่านที่โตจาก 40 เป็น 52
            const sw = 20, gap = 3;
            const rowW = n.max * sw + (n.max - 1) * gap;
            const stars = Array.from({ length: n.max }, (_, k) =>
                `<g transform="translate(${-rowW / 2 + k * (sw + gap)}, -58)">${this._pxStar(k < n.earned, sw)}</g>`
            ).join('');

            // ห้องนี้ไม่ได้สั่งฝึกทักษะนี้ → หรี่ลง แต่ยังกดดูได้ (ไม่ใช่ล็อก)
            const offRoom = focus && !focus.has(s.name);

            return `
                <g class="g-node ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}
                          ${reached ? '' : 'is-locked'} ${offRoom ? 'is-offroom' : ''}"
                   transform="translate(${p.x}, ${p.y})"
                   tabindex="0" role="button"
                   aria-label="${this._esc(st.th)}: ${n.earned} จาก ${n.max} ดาว${offRoom ? ' (ห้องนี้ยังไม่ได้สั่งฝึก)' : ''}"
                   onclick="Dashboard.selectNode(${i})"
                   onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Dashboard.selectNode(${i});}"
                   onmouseenter="SFX.hover()">
                    <ellipse class="g-node-shadow" cx="0" cy="28" rx="26" ry="7" fill="#000" opacity=".18"/>
                    <g transform="translate(-26, -26)">
                        ${this._nodeGlyph(s.name, st.color, 52, reached)}
                    </g>
                    <!-- ดาวขึ้นทุกด่านเสมอ ทั้งที่เก็บแล้วและยังไม่เก็บ
                         เดิมด่านที่ยังไม่เก็บวาด "กุญแจ" แทนดาว ซึ่งโกหกเด็ก ระบบไม่ได้ล็อกด่านไหนเลย ทุกด่านฝึกได้ตั้งแต่วันแรก
                         ดาวเปล่า 3 ดวงบอกว่า "ยังไม่ได้เก็บ" ซึ่งเป็นข้อมูลจริง
                         กุญแจบอกว่า "เข้าไม่ได้" ซึ่งไม่จริงและทำให้เด็กไม่กล้ากด -->
                    <g class="g-node-stars">${stars}</g>
                </g>`;
        }).join('');

        const cur = pts[currentIdx] || pts[0];

        return `
            <svg class="g-map" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet"
                 shape-rendering="crispEdges" role="img" aria-label="แผนที่ทักษะ">
                <!-- ของประดับในทุ่ง พุ่มหญ้ากับก้อนกรวด วาดด้วยรูปทรงล้วน ไม่ใช้ไฟล์
                     กระจายด้วยสูตรคงที่ (ไม่สุ่ม) จะได้ไม่ขยับตำแหน่งทุกครั้งที่ re-render -->
                <g class="g-circuit" opacity=".5">
                    ${Array.from({ length: 14 }, (_, i) => {
                        const x = 40 + (i * 137) % 940;
                        const y = 200 + ((i * 71) % 170);
                        return `<path d="M${x} ${y} l4 -12 l4 12 l4 -9 l4 9 z"/>`;
                    }).join('')}
                    ${Array.from({ length: 9 }, (_, i) =>
                        `<circle cx="${90 + (i * 211) % 880}" cy="${230 + (i * 53) % 150}" r="3"/>`
                    ).join('')}
                </g>

                <!-- เส้นทาง: ชั้นล่างหนาเข้ม (เปลือก) + ชั้นบนบางสว่าง (ร่อง) = ได้ความลึก -->
                ${segs.map(s => `<path class="g-track-base" d="${s.d}"/>`).join('')}
                ${segs.map(s => `
                    <path class="g-track ${s.done ? 'is-done' : ''} ${s.active ? 'g-flow' : ''}" d="${s.d}"/>
                `).join('')}

                ${nodes}

                <!-- ที่ว่างของหมุดเพื่อน _paintRoomPins() มาเติมหลังโหลดเสร็จ
                     ต้องวาดใน <svg> ไม่ใช่ overlay ข้างนอก เพราะ preserveAspectRatio="xMidYMid meet"
                     ย่อภาพและเว้นขอบเอง พิกัดคิดเป็น % ของกล่องนอกจึงเพี้ยนจากตำแหน่งด่านที่ตาเห็น -->
                ${pts.map((p, i) =>
                    `<g class="g-node-friends" data-i="${i}" transform="translate(${p.x}, ${Math.min(p.y + 52, 368)})"></g>`
                ).join('')}

                <!-- ธงปักด่านที่อยู่ตอนนี้ วาดใน <svg> ด้วยเหตุผลเดียวกับหมุดเพื่อน
                     เดิมเป็น div ลอยข้างบน แล้วเจอสองเด้ง: กล่องนอกมี padding 8px
                     ทำให้พิกัด % เลื่อน และ .g-idle-bob สั่ง transform: translateY()
                     ทับ translate(-50%,-100%) ที่ใช้จัดกึ่งกลาง ธงเลยหล่นไปล่างขวาของด่าน -->
                <g transform="translate(${cur.x}, ${cur.y - 62})">
                    <g class="g-idle-bob">
                        <g transform="scale(2.2) translate(-14.5, -32)" shape-rendering="crispEdges">
                            ${this._markerShapes()}
                        </g>
                    </g>
                </g>
            </svg>

`;
    },

    /** แผงรายละเอียดของด่านที่เลือก — ชื่อทักษะอยู่ตรงนี้ ไม่ได้อยู่บนโหนด */
    _nodeDetail(skill, index) {
        if (!skill) return '<div class="g-empty">ยังไม่มีข้อมูลทักษะ กด Run ที่ Workspace หนึ่งครั้ง ระบบจะเริ่มนับให้</div>';
        const st = SKILL_STYLE[skill.name] || { color: '#3A53A4', th: skill.name };
        const n = this._starsOf(skill);
        const done = n.earned >= n.max;

        let hint;
        if (done) hint = 'เก่งมาก! ด่านนี้ครบทุกดาวแล้ว';
        else if (n.earned === 0) hint = 'ยังไม่เคยใช้ทักษะนี้ ลองใส่ในงานของเราดู';
        else hint = `อีก ${n.max - n.earned} ครั้งได้ดาวเพิ่ม`;

        return `
            <div class="g-detail-icon">${this._nodeGlyph(skill.name, st.color, 64, n.earned > 0 || done)}</div>
            <div class="g-detail-body">
                <div class="g-sub">ด่าน ${index + 1}</div>
                <div class="g-title" style="font-size:24px;">${this._esc(st.th)}</div>
                <div class="g-detail-stars">
                    ${Array.from({ length: n.max }, (_, k) => this._pxStar(k < n.earned, 22)).join('')}
                </div>
                <div class="g-label">${this._esc(hint)}</div>
            </div>`;
    },


    // ===================== การ์ด "ภารกิจถัดไป" ของหน้าห้อง =====================
    // ลำดับเดียวกับแถบภารกิจใน Workspace (Mission ใน script.js):
    //   ภารกิจของห้องที่ยังไม่ส่ง กำหนดส่งใกล้สุด → เป้าที่ผู้ดูแลเล็ง/เราเลือก → ด่านที่ดาวยังไม่ครบ
    _nextFor(ctx) {
        const open = ctx.assignments.filter(a => !a.submitted).sort((a, b) => {
            if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
        });
        if (open.length) return { kind: 'assignment', a: open[0] };
        const mine = ctx.mission || this._focusFor(null);
        if (mine) return { kind: 'focus', f: mine };
        const skill = ctx.autoSkills[ctx.currentIdx];
        return skill ? { kind: 'node', skill, idx: ctx.currentIdx } : null;
    },

    _questState(a) {
        if (a.grade) return `<span class="g-chip is-ok">ได้ ${a.grade.score}/${a.grade.max_score}</span>`;
        if (a.submitted) return `<span class="g-chip is-wait">ส่งแล้ว รอตรวจ</span>`;
        return `<span class="g-chip">ยังไม่ส่ง</span>`;
    },

    _nextCard(next) {
        if (!next) return '<div class="g-empty">ยังไม่มีข้อมูลทักษะ กด Run ที่ Workspace หนึ่งครั้ง ระบบจะเริ่มนับให้</div>';

        if (next.kind === 'assignment') {
            const a = next.a;
            return `
                <div class="g-next-body">
                    <div class="g-sub">${a.submitted ? 'ภารกิจของห้อง' : 'ภารกิจถัดไป'}</div>
                    <div class="g-title" style="font-size:24px;">${this._esc(a.title)}</div>
                    ${a.description ? `<div class="g-sub g-next-desc">${this._esc(a.description)}</div>` : ''}
                    <div class="g-next-chips">${this._questState(a)} ${this._dueBadge(a)} ${this._lateBadge(a.is_late)} ${this._attemptBadge(a.attempt_no)}</div>
                    ${a.grade && a.grade.comment
                        ? `<div class="g-sub g-mission-note">ผู้ดูแลบอกว่า: "${this._esc(a.grade.comment)}"</div>` : ''}
                </div>
                <button class="g-btn g-btn-primary g-next-go"
                        onclick="SFX.click();Dashboard.goMission(${a.id}, ${a.classroom_id})">${a.submitted ? 'แก้แล้วส่งใหม่' : 'ลุยเลย'}</button>`;
        }

        if (next.kind === 'focus') {
            const f = next.f;
            const st = SKILL_STYLE[f.objective_name] || { color: '#3A53A4', th: f.objective_name };
            const earned = f.earned_stars || 0;
            const target = f.target_stars || 3;
            const byTeacher = f.source === 'TEACHER';
            return `
                <div class="g-detail-icon">${this._nodeGlyph(f.objective_name, st.color, 64, earned > 0)}</div>
                <div class="g-next-body">
                    <div class="g-sub">${byTeacher ? `เป้าจากผู้ดูแล${this._esc(f.set_by_name || '')}` : 'เป้าที่เราเลือกเอง'}</div>
                    <div class="g-title" style="font-size:24px;">${this._esc(st.th)}</div>
                    <div class="g-detail-stars">
                        ${Array.from({ length: target }, (_, k) => this._pxStar(k < earned, 22)).join('')}
                    </div>
                    ${f.note ? `<div class="g-sub g-mission-note">ผู้ดูแลฝากบอก: "${this._esc(f.note)}"</div>` : ''}
                    ${byTeacher
                        ? `<div class="g-sub">ล็อกไว้จนกว่าจะเก็บดาวถึงเป้า</div>`
                        : `<button class="g-btn g-btn-link" onclick="Dashboard.cancelFocus(${f.id})">เปลี่ยนเป้า</button>`}
                </div>
                <button class="g-btn g-btn-primary g-next-go" onclick="SFX.click();Router.navigate('#/workspace')">ไปฝึกเลย</button>`;
        }

        // ด่านบนแผนที่ — เลือกเป็นเป้าได้ ยกเว้นผู้ดูแลล็อกเป้าของห้องนี้ไว้
        const skill = next.skill;
        const locked = this._roomCtx && this._roomCtx.mission && this._roomCtx.mission.source === 'TEACHER';
        const mine = this._focusFor(null);
        const isMine = mine && mine.objective_id === skill.id;
        return `
            ${this._nodeDetail(skill, next.idx)}
            <div class="g-next-actions">
                <button class="g-btn g-btn-primary g-next-go" onclick="SFX.click();Router.navigate('#/workspace')">ไปฝึกเลย</button>
                ${locked || isMine || !skill.auto_detectable ? ''
                    : `<button class="g-btn" onclick="Dashboard.setFocus(${skill.id}, null)">เลือกเป็นเป้า</button>`}
            </div>`;
    },

    showQuest(assignmentId) {
        SFX.click();
        const ctx = this._roomCtx;
        const a = ctx && ctx.assignments.find(x => x.id === assignmentId);
        if (!a) return;
        this._swapNext({ kind: 'assignment', a });
        document.querySelectorAll('.g-quest-row').forEach(r =>
            r.classList.toggle('is-on', r.getAttribute('onclick').indexOf('(' + assignmentId + ')') !== -1));
    },

    _swapNext(next) {
        const box = document.getElementById('g-node-detail');
        if (!box) return;
        box.innerHTML = this._nextCard(next);
        box.classList.remove('g-pop');
        void box.offsetWidth;                 // บังคับ reflow ให้อนิเมชันเล่นซ้ำได้
        box.classList.add('g-pop');
        if (window.innerWidth < 900) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    selectNode(index) {
        SFX.click();
        const skills = (this.data.skills || []).filter(s => s.auto_detectable);
        if (!skills[index]) return;
        // หน้าห้อง: การ์ดถัดไปกลายเป็นด่านนั้น + ปุ่มเลือกเป็นเป้า
        if (this._roomCtx && document.querySelector('.g-next')) {
            this._swapNext({ kind: 'node', skill: skills[index], idx: index });
            document.querySelectorAll('.g-quest-row').forEach(r => r.classList.remove('is-on'));
            return;
        }
        const box = document.getElementById('g-node-detail');
        if (!box) return;
        box.innerHTML = this._nodeDetail(skills[index], index);
        box.classList.remove('g-pop');
        void box.offsetWidth;                 // บังคับ reflow ให้อนิเมชันเล่นซ้ำได้
        box.classList.add('g-pop');
    },

    toggleSfx(btn) {
        SFX.setEnabled(!SFX.enabled);
        btn.textContent = SFX.enabled ? 'เสียง: เปิด' : 'เสียง: ปิด';
    },

    /** สลับแผนที่ในหน้าห้อง: เฉพาะทักษะที่ห้องนี้สั่งฝึก <-> ทั้งหมดของเรา
     *  วาดใหม่ในที่เดิม ไม่ต้องเปลี่ยนหน้า — แผนที่อยู่ในธีมเกมเท่านั้น */
    toggleRoomMap() {
        SFX.click();
        this._roomMapAll = !this._roomMapAll;
        this.render();
    },

    // ===================== ภารกิจที่กำลังเก็บ =====================

    /** โฟกัสของช่องไหน — roomId เป็นตัวเลข = ช่องของห้องนั้น, null = ช่องส่วนตัว
     *  แยกช่องเพราะเด็กอยู่หลายห้อง ผู้ดูแลแต่ละคนเล็งคนละอันได้โดยไม่ทับกัน */
    _focusFor(roomId) {
        return (this.data.focuses || []).find(
            f => (f.classroom_id || null) === (roomId || null)
        ) || null;
    },

    /** แถบภารกิจ — ของผู้ดูแลล็อกไว้ ของเราเองยกเลิกได้
     *  ตัวเลขดาวมาจากตัวนับกลาง เด็กฝึกที่เวิร์กสเปซตอนไหนก็ขยับ ไม่ต้องอยู่ในห้อง */
    _missionBanner(mission) {
        if (!mission) return '';
        const th = (SKILL_STYLE[mission.objective_name] || {}).th || mission.objective_name;
        const color = (SKILL_STYLE[mission.objective_name] || {}).color || '#3A53A4';
        const earned = mission.earned_stars || 0;
        const target = mission.target_stars || 3;
        const byTeacher = mission.source === 'TEACHER';

        return `
            <div class="g-panel g-mission ${byTeacher ? 'is-locked' : ''}">
                <div class="g-mission-icon">
                    ${this._nodeGlyph(mission.objective_name, color, 52, earned > 0)}
                </div>
                <div class="g-mission-body">
                    <div class="g-sub">
                        ${byTeacher
                            ? `ภารกิจจากผู้ดูแล${this._esc(mission.set_by_name || '')} เปลี่ยนเองไม่ได้จนกว่าจะถึงเป้า`
                            : 'ภารกิจที่เราเลือกเอง'}
                    </div>
                    <div class="g-title" style="font-size:22px;">${this._esc(th)}</div>
                    <div class="g-detail-stars">
                        ${Array.from({ length: target }, (_, k) => this._pxStar(k < earned, 20)).join('')}
                        <span class="g-sub" style="margin-left:8px;">${earned}/${target} ดาว</span>
                    </div>
                    ${mission.note
                        ? `<div class="g-sub g-mission-note">ผู้ดูแลฝากบอก: "${this._esc(mission.note)}"</div>`
                        : ''}
                </div>
                <div class="g-mission-actions">
                    <button class="g-btn g-btn-primary"
                            onclick="SFX.click();Router.navigate('#/workspace')">ไปฝึกเลย</button>
                    ${byTeacher
                        ? `<span class="g-chip is-wait">ล็อกอยู่</span>`
                        : `<button class="g-btn" onclick="Dashboard.cancelFocus(${mission.id})">เปลี่ยนภารกิจ</button>`}
                </div>
            </div>`;
    },

    /** ยกเลิกภารกิจ — เซิร์ฟเวอร์เป็นคนตัดสินว่าทำได้ไหม ไม่ใช่ปุ่มนี้
     *  (ซ่อนปุ่มอย่างเดียวกันคนเปิด devtools ไม่ได้ กติกาต้องอยู่หลังบ้าน) */
    async cancelFocus(focusId) {
        try {
            const res = await fetch(`/api/focus/${focusId}`, {
                method: 'DELETE', headers: Auth.getHeaders()
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { alert(body.error || 'ยกเลิกไม่สำเร็จ'); return; }
            this.load();
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    /** เลือกภารกิจเอง — ใช้ที่แดชบอร์ดผู้ใช้ (ช่องส่วนตัว) และหน้าห้อง (ช่องของห้อง) */
    async setFocus(objectiveId, targetStars) {
        try {
            const res = await fetch('/api/focus', {
                method: 'POST', headers: Auth.getHeaders(),
                body: JSON.stringify({ objective_id: objectiveId, target_stars: targetStars }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { alert(body.error || 'ตั้งภารกิจไม่สำเร็จ'); return; }
            SFX.click();
            this.load();
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ===================== เอฟเฟกต์ตอนได้ดาว =====================

    _starSnapshotKey() {
        const uid = (this.data.user && this.data.user.id) || 'guest';
        return `robomdt_stars_${uid}`;
    },

    /** เทียบกับ snapshot ครั้งก่อน — ครั้งแรกที่เปิดไม่เด้ง ไม่งั้นจะรัวทุกดาวที่มีอยู่แล้ว */
    _celebrateNewStars(skills) {
        let previous = null;
        try { previous = JSON.parse(localStorage.getItem(this._starSnapshotKey()) || 'null'); }
        catch { previous = null; }

        const current = {};
        (skills || []).forEach(s => { current[s.id] = this._starsOf(s).earned; });
        try { localStorage.setItem(this._starSnapshotKey(), JSON.stringify(current)); }
        catch { /* โหมดส่วนตัวเขียนไม่ได้ ก็แค่ไม่มีเอฟเฟกต์ */ }

        if (!previous) return;
        const gained = (skills || []).filter(s => current[s.id] > (previous[s.id] || 0));
        if (!gained.length) return;

        const count = gained.reduce((sum, s) => sum + (current[s.id] - (previous[s.id] || 0)), 0);
        const names = gained.map(s => (SKILL_STYLE[s.name] || {}).th || s.name);
        const levelUp = gained.some(s => this._starsOf(s).earned >= this._starsOf(s).max);
        this._starCelebration(names, count, levelUp);
    },

    /** จอมืด + หุ่นดีใจ + ดาวพุ่ง + อนุภาค + จอสั่น — ต้องกดปิดเอง ห้ามหายเอง
     *  รอบก่อนใช้ toast จิ๋วลอยขึ้น 4 วิ ซึ่งอ่านว่า "แจ้งเตือนบันทึกไฟล์" ไม่ใช่การฉลอง */
    _starCelebration(names, count, levelUp) {
        const old = document.getElementById('g-celebrate');
        if (old) old.remove();

        const wrap = document.createElement('div');
        wrap.id = 'g-celebrate';
        wrap.className = 'g-celebrate';
        wrap.innerHTML = `
            <div class="g-celebrate-box g-panel g-pop">
                <div class="g-title">${levelUp ? 'ผ่านด่านแล้ว!' : `ได้ดาวเพิ่ม ${count} ดวง!`}</div>
                <div class="g-celebrate-stars">
                    ${Array.from({ length: Math.min(count, 5) }, (_, i) =>
                        `<span class="g-fly" style="animation-delay:${i * 0.09}s">${this._pxStar(true, 40)}</span>`
                    ).join('')}
                </div>
                <div class="g-label">${this._esc(names.join(' · '))}</div>
                <button class="g-btn g-btn-primary" onclick="Dashboard.closeCelebration()">เยี่ยม!</button>
            </div>
            <div class="g-particles">
                ${Array.from({ length: 10 }, (_, i) => {
                    const ang = (i / 10) * Math.PI * 2;
                    return `<i style="--dx:${Math.cos(ang) * 140}px; --dy:${Math.sin(ang) * 140}px; animation-delay:${i * 0.02}s"></i>`;
                }).join('')}
            </div>`;
        document.body.appendChild(wrap);

        requestAnimationFrame(() => wrap.classList.add('is-on'));
        document.querySelector('.g-map-wrap')?.classList.add('g-shake');
        setTimeout(() => document.querySelector('.g-map-wrap')?.classList.remove('g-shake'), 400);

        if (levelUp) SFX.skillComplete(); else SFX.star();

        // ปิดด้วย Esc ได้ด้วย ไม่ใช่มีแต่ปุ่ม
        this._celebrateEsc = (e) => { if (e.key === 'Escape') this.closeCelebration(); };
        document.addEventListener('keydown', this._celebrateEsc);
    },

    closeCelebration() {
        SFX.close();
        const el = document.getElementById('g-celebrate');
        if (el) { el.classList.remove('is-on'); setTimeout(() => el.remove(), 250); }
        if (this._celebrateEsc) {
            document.removeEventListener('keydown', this._celebrateEsc);
            this._celebrateEsc = null;
        }
    },
});
