// ==================== เว็บรอบ 3 (9 พ.ย. 2569) ====================
// ตามภาพตัวอย่าง mockups/แดชบอร์ด_ตัวอย่าง_รอบ3.html ที่ผ่านผู้ทดสอบจำลองแล้ว
//
// กติกาที่เจ้าของสั่ง:
//   - บัญชีเดียว ไม่มีบทบาท บทบาทผูกกับห้องเท่านั้น
//   - เว็บทั่วไป ห้ามคำว่าครู/นักเรียน ใช้คำกลาง (ผู้สอน สมาชิก)
//   - ชื่อห้องผู้ใช้ตั้งเอง ไม่มีชื่อประเภทห้อง เลือกแค่ว่าในห้องนี้ "ให้คะแนน" หรือ "ทุกคนเท่ากัน"
//   - ไม่มีอีโมจิ ไอคอนเป็น SVG
//
// เส้นทางใหม่:
//   #/dashboard                หน้าบ้าน (renderHub)
//   #/dashboard/new            สร้างห้อง
//   #/dashboard/room/<id>      ห้องแบบทุกคนเท่ากัน -> renderEqualRoom (ทั้งเจ้าของและสมาชิก)
//   #/dashboard/room/<id>/code ฉายรหัสขึ้นจอ (เจ้าของห้องเท่านั้น)
//   ?room=<รหัส>               ลิงก์เชิญ เข้าห้องให้เลย ถ้ายังไม่มีบัญชีเปิดฟอร์มสมัครพร้อมรหัส

const W3_ICON = {
    robot: '<rect x="5" y="8" width="22" height="17" rx="4"/><rect x="15" y="2" width="2" height="6"/><circle cx="16" cy="2.5" r="2.5"/><circle cx="11.5" cy="16" r="3" fill="#fff"/><circle cx="20.5" cy="16" r="3" fill="#fff"/><rect x="2" y="13" width="3" height="7" rx="1"/><rect x="27" y="13" width="3" height="7" rx="1"/>',
    board: '<rect x="3" y="4" width="26" height="18" rx="2"/><rect x="6" y="7" width="20" height="12" fill="#fff" opacity=".35"/><rect x="9" y="22" width="3" height="7"/><rect x="20" y="22" width="3" height="7"/>',
    star: '<path d="M16 2l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4L16 23.6 7.6 28l1.6-9.4L2.4 12l9.4-1.4z"/>',
    plus: '<rect x="14" y="4" width="4" height="24" rx="2"/><rect x="4" y="14" width="24" height="4" rx="2"/>',
    users: '<circle cx="11" cy="11" r="6"/><circle cx="22" cy="12" r="5"/><path d="M0 29a11 11 0 0 1 22 0z"/><path d="M18 29a9 9 0 0 1 14-7.5V29z"/>',
    key: '<circle cx="10" cy="16" r="7"/><circle cx="10" cy="16" r="3" fill="#fff"/><rect x="15" y="14" width="15" height="4"/><rect x="24" y="18" width="3" height="5"/>',
    screen: '<rect x="2" y="4" width="28" height="19" rx="2"/><rect x="13" y="23" width="6" height="4"/><rect x="8" y="27" width="16" height="2"/>',
    flag: '<rect x="5" y="3" width="3" height="27"/><path d="M8 4h17l-4 6 4 6H8z"/>',
    map: '<path d="M2 6l9-3 10 3 9-3v23l-9 3-10-3-9 3z"/><path d="M11 3v23M21 6v23" stroke="#fff" stroke-width="2"/>',
    check: '<circle cx="16" cy="16" r="15"/><path d="M9 16.5l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
};
const w3ic = (name, size, color) =>
    `<svg viewBox="0 0 32 32" width="${size || 22}" height="${size || 22}" fill="${color || 'currentColor'}" aria-hidden="true" style="vertical-align:-0.18em;flex:0 0 auto">${W3_ICON[name] || ''}</svg>`;

// ชื่อด่านสั้น ๆ บนแผนที่ (ลำดับตาม id ของทักษะในฐานข้อมูล เหมือนหน้าห้องเดิม)
const W3_LEVEL_TH = {
    'Sequencing': 'ลำดับ', 'Loops': 'วนซ้ำ', 'Conditionals': 'เงื่อนไข', 'Variables': 'ตัวแปร',
    'Pattern Recognition': 'รูปแบบ', 'Robot Motion': 'เคลื่อนที่', 'Robot Arms & Gripper': 'แขน',
    'Robot Expressions': 'อารมณ์', 'Debugging': 'แก้บั๊ก',
};
// เกณฑ์ที่ระบบตรวจเองได้ (คีย์เดียวกับ GOAL_BLOCK_CHOICES ใน dashboard.py) — เลือกเฉพาะที่เข้าใจง่าย
const W3_GOAL_LABEL = {
    'move_forward': 'เดินหน้า', 'move_backward': 'ถอยหลัง', 'turn_': 'เลี้ยว',
    'arm_': 'คำสั่งแขน', 'grip_': 'คำสั่งที่หนีบ', 'face_': 'คำสั่งหน้าตา',
    'sensor_': 'บล็อกเซนเซอร์', 'controls_repeat_ext': 'บล็อก repeat', 'controls_if': 'บล็อก if',
    'variables_set': 'ตัวแปร',
};
// เงื่อนไขเหรียญเป็นภาษาไทย (ชื่อเหรียญคงเป็นอังกฤษตามฐานข้อมูล)
const W3_MEDAL_TH = {
    'First Steps': 'ทำภารกิจแรกจบ', 'Hello Robot': 'กด Run ครั้งแรก', 'Block Builder': 'บันทึกงาน 5 ชิ้น',
    'Loop Master': 'ใช้ repeat ใน 3 งาน', 'Bug Squasher': 'แก้ข้อผิดพลาด 10 ครั้ง', 'Persistent Coder': 'เข้าใช้ 7 วันติด',
    'AI Whisperer': 'ถามผู้ช่วย AI 20 ครั้ง', 'Perfect Score': 'ได้คะแนนเต็ม',
};
const W3_ROOM_COLORS = ['#4C97FF', '#9966FF', '#FF8C1A', '#00B4AB', '#FF6680', '#59C059'];
const W3_PIN_COLORS = ['#9966FF', '#FF6680', '#00B4AB', '#FF8C1A', '#59C059', '#d81b60', '#5c6bc0'];

// ตัดชื่อเป็น 1–2 ตัวอักษรให้ใส่วงกลมได้ โดยไม่ตัดสระ/วรรณยุกต์ไทยหลุดจากพยัญชนะ
const w3Initials = n => {
    const m = String(n || '?').match(/^.[ัิ-ฺ็-๎]*(.[ัิ-ฺ็-๎]*)?/);
    return m ? m[0] : '?';
};

Object.assign(Dashboard, {

    // ---------- ตัดสินว่าจะวาดหน้าไหน (ต่อจาก getView เดิม) ----------
    _w3View() {
        const hash = window.location.hash || '';
        if (hash.startsWith('#/dashboard/new')) return { w3: 'NEW' };
        const m = hash.match(/^#\/dashboard\/room\/(\d+)(\/code)?/);
        if (!m || !this.data) return null;
        const id = parseInt(m[1], 10);
        const owned = (this.data.owned_classrooms || []).find(c => c.id === id);
        const joined = (this.data.joined_classrooms || []).find(c => c.id === id);
        const room = owned || joined;
        if (!room) return null;
        if (m[2] && owned) return { w3: 'CODE', room, owned: true };
        if ((room.room_mode || 'graded') === 'equal') return { w3: 'EQUAL', room, owned: !!owned };
        if (joined && !owned) return { w3: 'MEMBER', room };
        return null;
    },

    _w3Color(id) {
        return W3_ROOM_COLORS[(id || 0) % W3_ROOM_COLORS.length];
    },

    _w3AutoSkills() {
        return (this.data.skills || []).filter(s => s.auto_detectable);
    },

    _w3Medals(achievements) {
        if (!achievements.length) return '';
        const sorted = achievements.slice().sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
        return `
            <div class="w3-sec">เหรียญ <span class="w3-sub">รางวัลพิเศษเวลาทำได้ตามเงื่อนไข</span></div>
            <div class="w3-medals">${sorted.map(a => `
                <div class="w3-medal-l" title="${this._esc(a.description || '')}">
                    <span class="w3-medal ${a.unlocked ? '' : 'off'}">${MetoIcons.achievement(a.condition_type)}</span>
                    ${this._esc(a.name)}
                    ${W3_MEDAL_TH[a.name] ? `<span class="w3-medal-how">${W3_MEDAL_TH[a.name]}</span>` : ''}
                </div>`).join('')}
            </div>`;
    },

    // ===================== หน้าบ้าน =====================
    renderHub() {
        const d = this.data;
        const user = d.user || Auth.user || {};
        const displayName = user.display_name || user.username || '';
        const owned = (d.owned_classrooms || []).filter(c => c.is_active !== false);
        const archived = (d.owned_classrooms || []).filter(c => c.is_active === false);
        const joined = d.joined_classrooms || [];
        const teacher = d.teacher || {};
        const projects = d.projects || [];
        const achievements = d.achievements || [];
        const unlocked = achievements.filter(a => a.unlocked).length;
        const stars = this._starTotals(d.skills || []);

        const auto = this._w3AutoSkills();
        const nextIdx = auto.findIndex(s => this._starsOf(s).earned < this._starsOf(s).max);
        const nextSkill = auto[nextIdx < 0 ? auto.length - 1 : nextIdx];
        const nextStars = nextSkill ? this._starsOf(nextSkill) : { earned: 0, max: 3 };
        const starRow = (n, max) => Array.from({ length: max }, (_, k) => w3ic('star', 14, k < n ? '#FFBF00' : '#d8c9a6')).join('');

        const toGrade = id => (teacher.assignments || [])
            .filter(a => a.classroom_id === id)
            .reduce((n, a) => n + (a.ungraded_count || 0), 0);
        const nextQuest = id => (d.assignments || [])
            .filter(a => a.classroom_id === id && !a.submitted)
            .sort((a, b) => (a.due_date || '9') < (b.due_date || '9') ? -1 : 1)[0];

        const card = (r, mine) => {
            const c = this._w3Color(r.id);
            const equal = (r.room_mode || 'graded') === 'equal';
            const count = mine ? (r.student_count || 0) : (r.member_count || 0);
            let role, what, sub, btn;
            if (mine && !equal) {
                const n = toGrade(r.id);
                role = 'ฉันสอน';
                what = n ? `รอตรวจ: <b>${n} งาน</b>` : 'ไม่มีงานรอตรวจ';
                sub = `สมาชิก ${count} คน`;
                btn = n ? `<button class="w3-b1" style="background:${c}" onclick="Dashboard.goTo('#/dashboard/room/${r.id}')">ตรวจงาน</button>`
                        : `<button class="w3-b2" style="color:${c}" onclick="Dashboard.goTo('#/dashboard/room/${r.id}')">เข้าห้อง</button>`;
            } else if (equal) {
                role = mine ? 'ฉันสร้างห้องนี้ · ไม่มีคะแนน' : 'สมาชิก · ไม่มีคะแนน';
                what = 'ทุกคนเท่ากัน';
                sub = mine ? `${count + 1} คน` : `${this._esc(r.teacher_name)} สร้างห้อง · ${count + 1} คน`;
                btn = `<button class="w3-b2" style="color:${c}" onclick="Dashboard.goTo('#/dashboard/room/${r.id}')">เข้าห้อง</button>`;
            } else {
                const q = nextQuest(r.id);
                role = 'สมาชิก';
                what = q ? `ภารกิจถัดไป: <b>${this._esc(q.title)}</b>` : 'ยังไม่มีภารกิจค้าง';
                sub = (q && q.due_date ? `ส่งภายใน ${new Date(q.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · ` : '') + `ผู้สอน: ${this._esc(r.teacher_name)}`;
                btn = `<button class="w3-b2" style="color:${c}" onclick="Dashboard.goTo('#/dashboard/room/${r.id}')">เข้าห้อง</button>`;
            }
            return `
                <div class="w3-room">
                    <div class="w3-room-top" style="background:${c}">
                        <div class="w3-rn">${this._esc(r.name)}</div>
                        <span class="w3-role">${role}</span>
                        <span class="w3-ico">${w3ic(mine && !equal ? 'board' : equal ? 'users' : 'robot', 34, '#fff')}</span>
                    </div>
                    <div class="w3-room-body">
                        <div class="w3-what">${what}<div class="w3-sub w3-small">${sub}</div></div>
                        <div class="w3-row">${btn}</div>
                    </div>
                </div>`;
        };

        const rooms = owned.map(r => card(r, true)).concat(joined.map(r => card(r, false)));

        document.getElementById('dashboard-content').innerHTML = `
            <div class="w3-wrap">
                <h1 class="w3-h1">สวัสดี ${this._esc(displayName)}</h1>
                <div class="w3-sub">${w3ic('star', 16, '#FFBF00')} ดาว ${stars.earned}/${stars.max} (ฝึกทักษะ) · เหรียญ ${unlocked}/${achievements.length} (รางวัลพิเศษ)</div>

                <div class="w3-sec">เริ่มจากตรงนี้</div>
                <div class="w3-starts">
                    <div class="w3-start main">
                        <div class="w3-start-h">${w3ic('map', 30, '#4C97FF')}<b>เส้นทางของฉัน</b></div>
                        <div>${nextSkill ? `ด่านถัดไป: <b>ด่าน ${(nextIdx < 0 ? auto.length - 1 : nextIdx) + 1} ${this._esc(W3_LEVEL_TH[nextSkill.name] || nextSkill.name)}</b> ${starRow(nextStars.earned, nextStars.max)}` : 'เริ่มด่านแรกได้เลย'}</div>
                        <button class="w3-b1" onclick="Router.navigate('#/workspace')">ฝึกต่อ</button>
                    </div>
                    <div class="w3-start">
                        <div class="w3-start-h">${w3ic('plus', 26, '#3A53A4')}<b>สร้างห้อง</b></div>
                        <div class="w3-sub">ตั้งชื่อเอง ชวนคนอื่นเข้าด้วยรหัส</div>
                        <button class="w3-b2" onclick="Dashboard.goTo('#/dashboard/new')">สร้างห้อง</button>
                    </div>
                    <div class="w3-start">
                        <div class="w3-start-h">${w3ic('key', 26, '#00B4AB')}<b>เข้าห้องด้วยรหัส</b></div>
                        <form class="w3-join" onsubmit="Dashboard.joinClassroom(event)">
                            <input type="text" id="join-code-input" placeholder="รหัสห้อง 6 ตัว" maxlength="8" autocomplete="off">
                            <button type="submit" class="w3-b2" style="color:#00897b">เข้าห้อง</button>
                        </form>
                        <span id="join-status" class="grade-status"></span>
                    </div>
                </div>

                ${rooms.length ? `
                <div class="w3-sec">ห้องของฉัน <span class="w3-sub">ป้ายบนห้องบอกว่าคุณเป็นอะไรในห้องนั้น</span></div>
                <div class="w3-rooms">${rooms.join('')}</div>` : ''}
                ${archived.length ? `
                <details class="w3-archived"><summary>ห้องที่เก็บแล้ว (${archived.length})</summary>
                    ${archived.map(r => `<button class="w3-b3" onclick="Dashboard.goTo('#/dashboard/room/${r.id}')">${this._esc(r.name)}</button>`).join(' · ')}
                </details>` : ''}

                <div class="w3-sec">ผลงานของฉัน</div>
                ${projects.length ? `<div class="w3-works">${projects.map(p => `
                    <div class="w3-work">
                        <b>${this._esc(p.title || 'ไม่มีชื่อ')}</b>
                        <span class="w3-sub w3-small">${this._formatDate(p.updated_at || p.created_at)}</span>
                        <div class="w3-row">
                            <button class="w3-b2" onclick="Dashboard.openProject(${p.id})">เปิด</button>
                            <details class="hub-more">
                                <summary title="เพิ่มเติม" aria-label="เพิ่มเติม">⋯</summary>
                                <div class="hub-more-list">
                                    <button onclick="Dashboard.viewProjectVersions(${p.id})">ประวัติ / กู้งานเก่า</button>
                                    <button class="is-danger" onclick="Dashboard.deleteProject(${p.id}, this)">ลบ</button>
                                </div>
                            </details>
                        </div>
                    </div>`).join('')}</div>`
                : '<div class="w3-empty">ยังไม่มีผลงาน กด "บันทึก" ในหน้าเขียนโค้ดแล้วงานจะมาอยู่ตรงนี้</div>'}

                ${this._w3Medals(achievements)}
            </div>`;
    },

    // ===================== สร้างห้อง =====================
    renderCreateRoom() {
        document.getElementById('dashboard-content').innerHTML = `
            <div class="w3-wrap">
                <form class="w3-form-card" onsubmit="Dashboard.createClassroom(event)">
                    <h1 class="w3-h1" style="font-size:26px">สร้างห้อง</h1>
                    <label class="w3-field"><b>ชื่อห้อง</b>
                        <input type="text" id="new-classroom-name" placeholder="ตั้งชื่ออะไรก็ได้" maxlength="200" required
                               oninput="Dashboard._w3CheckCreate()"></label>
                    <div class="w3-label">ในห้องนี้</div>
                    <div class="w3-typecards" role="radiogroup">
                        <button type="button" class="w3-typecard" data-mode="graded" role="radio" aria-checked="false"
                                onclick="Dashboard._w3PickMode('graded')">
                            ${w3ic('board', 30, '#FF8C1A')}<b>ฉันสั่งงานและให้คะแนน</b>
                            <ul><li>ฉันเป็นผู้สอนของห้องนี้</li><li>สั่งภารกิจ ตรวจงาน ส่งออก Excel</li></ul>
                        </button>
                        <button type="button" class="w3-typecard" data-mode="equal" role="radio" aria-checked="false"
                                onclick="Dashboard._w3PickMode('equal')">
                            ${w3ic('users', 30, '#9966FF')}<b>ทุกคนเท่ากัน ไม่มีคะแนน</b>
                            <ul><li>ฉันเล่นด้วย เหมือนสมาชิกคนอื่น</li><li>เห็นดาวและด่านของกันและกัน</li></ul>
                        </button>
                    </div>
                    <button type="submit" class="w3-b1 w3-block" id="w3-create-btn" disabled>สร้างแล้วรับรหัสห้อง</button>
                    <button type="button" class="w3-b3" onclick="Dashboard.goTo('#/dashboard')">ยกเลิก</button>
                </form>
            </div>`;
        this._w3Mode = null;
        document.getElementById('new-classroom-name').focus();
    },

    _w3PickMode(mode) {
        this._w3Mode = mode;
        document.querySelectorAll('.w3-typecard').forEach(el => {
            const on = el.dataset.mode === mode;
            el.classList.toggle('on', on);
            el.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        this._w3CheckCreate();
    },

    _w3CheckCreate() {
        const btn = document.getElementById('w3-create-btn');
        const name = (document.getElementById('new-classroom-name') || {}).value || '';
        if (btn) btn.disabled = !(name.trim() && this._w3Mode);
    },

    // แทนของเดิมใน dashboard.js (ฟอร์มเดิมมีเทอม/ปีการศึกษา ซึ่งเป็นคำของโรงเรียน)
    showCreateClassroom() {
        this.goTo('#/dashboard/new');
    },

    async createClassroom(e) {
        e.preventDefault();
        const name = (document.getElementById('new-classroom-name').value || '').trim();
        if (!name || !this._w3Mode) return;
        const btn = document.getElementById('w3-create-btn');
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/api/classrooms', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ name, room_mode: this._w3Mode }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.classroom && data.classroom.id) {
                this.goTo(`#/dashboard/room/${data.classroom.id}`);
            } else {
                alert(data.error || 'สร้างห้องไม่สำเร็จ');
                if (btn) btn.disabled = false;
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            if (btn) btn.disabled = false;
        }
    },

    // ===================== แผนที่ 9 ด่าน =====================
    // levels: [{ label, stars, max }] · current: ด่านที่ฉันอยู่ · pins: [{ idx, label, color }]
    _w3RoadMap(levels, current, pins, clickable) {
        const pts = [[70,150],[190,95],[320,140],[450,85],[580,150],[710,95],[840,145],[970,90],[1100,140]].slice(0, levels.length);
        if (!pts.length) return '';
        let d = `M ${pts[0][0]} ${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
            d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
        }
        const star = (x, y, on) => `<path transform="translate(${x},${y}) scale(.55)" d="M0,-12 L3.5,-4 L12,-4 L5,1.5 L7.5,10 L0,5 L-7.5,10 L-5,1.5 L-12,-4 L-3.5,-4 Z" fill="${on ? '#FFBF00' : '#ffffff'}" stroke="${on ? '#b8860b' : '#c9b98e'}" stroke-width="2"/>`;
        const pin = (x, y, n, c) => `<g transform="translate(${x},${y})"><title>${this._esc(n)}</title><circle r="15" fill="${c}" stroke="#fff" stroke-width="3"/><text y="5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Prompt">${this._esc(w3Initials(n))}</text></g>`;
        // วงกลมคนที่อยู่ด่านเดียวกันเรียงกันไม่ทับ
        const perLevel = {};
        const pinSvg = (pins || []).map(p => {
            const i = Math.max(0, Math.min(pts.length - 1, p.idx));
            const k = perLevel[i] = (perLevel[i] || 0) + 1;
            const [x, y] = pts[i];
            // หุ่นยืนกลางด่าน วงกลมคนวางข้างหุ่นซ้ายขวาสลับกัน
            const off = [-34, 34, -66, 66, -98, 98][(k - 1) % 6];
            return pin(x + off, y - 66, p.label, p.color);
        }).join('');
        const [cx, cy] = pts[Math.max(0, Math.min(pts.length - 1, current))];
        return `<svg viewBox="0 0 1180 250" role="img" aria-label="แผนที่ด่าน">
            <defs><linearGradient id="w3sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3f2"/><stop offset="1" stop-color="#d9f0fb"/></linearGradient></defs>
            <rect width="1180" height="250" fill="url(#w3sk)"/>
            <g fill="#fff" opacity=".9"><ellipse cx="160" cy="40" rx="46" ry="14"/><ellipse cx="195" cy="32" rx="30" ry="14"/><ellipse cx="820" cy="36" rx="54" ry="15"/><ellipse cx="860" cy="28" rx="30" ry="13"/></g>
            <path d="M0 120 Q 150 70 300 115 T 600 110 T 900 105 T 1180 100 V250 H0 Z" fill="#a5d66f"/>
            <path d="M0 160 Q 200 120 400 160 T 800 150 T 1180 160 V250 H0 Z" fill="#8ec95a"/>
            <path d="${d}" fill="none" stroke="#c9a36a" stroke-width="26" stroke-linecap="round"/>
            <path d="${d}" fill="none" stroke="#e8cf9e" stroke-width="16" stroke-linecap="round"/>
            <path d="${d}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="10 12" opacity=".8"/>
            ${pts.map(([x, y], i) => {
                const L = levels[i];
                const full = L.stars >= L.max;
                return `<g ${clickable ? `class="w3-node" role="button" tabindex="0" onclick="Dashboard._w3ShowLevel(${i})"` : ''}>
                    <circle cx="${x}" cy="${y}" r="22" fill="${i === current ? '#BED73B' : full || L.stars ? '#ffd54f' : '#ffffff'}" stroke="#3A53A4" stroke-width="4"/>
                    <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#3A53A4" font-family="Prompt">${i + 1}</text>
                    ${[0, 1, 2].map(k => star(x - 16 + k * 16, y - 34, k < L.stars)).join('')}
                    <text x="${x}" y="${y + 44}" text-anchor="middle" font-size="14" font-weight="600" fill="#2b3a14" font-family="Prompt">${this._esc(L.label)}</text>
                </g>`;
            }).join('')}
            <g transform="translate(${cx - 18},${cy - 92})">
                <rect x="0" y="0" width="36" height="28" rx="6" fill="#4C97FF" stroke="#26356b" stroke-width="3"/>
                <circle cx="11" cy="13" r="4" fill="#fff"/><circle cx="25" cy="13" r="4" fill="#fff"/>
                <line x1="18" y1="0" x2="18" y2="-8" stroke="#26356b" stroke-width="3"/><circle cx="18" cy="-10" r="3" fill="#ff5252"/>
            </g>
            ${pinSvg}
        </svg>`;
    },

    _w3InviteLink(code) {
        return `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
    },

    async _w3Copy(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            if (btn) { const t = btn.textContent; btn.textContent = 'คัดลอกแล้ว'; setTimeout(() => { btn.textContent = t; }, 1500); }
        } catch {
            prompt('คัดลอกตรงนี้', text);
        }
    },

    // ===================== ห้องแบบทุกคนเท่ากัน =====================
    renderEqualRoom(v) {
        const room = v.room;
        const code = room.invite_code || '';
        const auto = this._w3AutoSkills();
        const myIdx = Math.max(0, auto.findIndex(s => this._starsOf(s).earned < this._starsOf(s).max));
        const levels = auto.map(s => ({ label: W3_LEVEL_TH[s.name] || s.name, stars: this._starsOf(s).earned, max: this._starsOf(s).max }));
        const memberCount = v.owned ? (room.student_count || 0) + 1 : (room.member_count || 0) + 1;

        document.getElementById('dashboard-content').innerHTML = `
            <div class="w3-wrap">
                <div class="w3-roomhead">
                    <div>
                        <h1 class="w3-h1">${this._esc(room.name)}</h1>
                        <div class="w3-sub">${memberCount} คน · ทุกคนเท่ากัน${code ? ` · รหัสห้อง <b>${this._esc(code)}</b>
                            <button class="w3-b3" onclick="Dashboard._w3Copy('${this._esc(code)}', this)">คัดลอก</button>
                            <button class="w3-b3" onclick="Dashboard._w3Copy(Dashboard._w3InviteLink('${this._esc(code)}'), this)">คัดลอกลิงก์เชิญ</button>` : ''}
                        </div>
                    </div>
                    <div class="w3-row" style="gap:10px">
                        <button class="w3-b1" onclick="Dashboard._w3ChallengeForm(${room.id})">+ ตั้งโจทย์ท้า</button>
                        <button class="w3-b2" onclick="Router.navigate('#/workspace')">ฝึกต่อ</button>
                        ${v.owned ? `
                        <div class="ow-menu">
                            <button class="w3-b2 ow-menu-btn" onclick="Dashboard._owToggleMenu(this)" aria-label="ตั้งค่าห้อง" title="ตั้งค่าห้อง">⋯</button>
                            <div class="ow-menu-list" hidden>
                                <button onclick="Dashboard._w3Rename(${room.id})">เปลี่ยนชื่อห้อง</button>
                                <button onclick="Dashboard.setClassroomFlag(${room.id}, 'is_open', ${!room.is_open})">${room.is_open ? 'ปิดรับคนใหม่' : 'เปิดรับคนใหม่'}</button>
                                <button onclick="Dashboard.setClassroomFlag(${room.id}, 'is_active', false)">เก็บห้อง</button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                <div class="w3-mapcard" id="w3-map">${this._w3RoadMap(levels, myIdx, [])}</div>
                <div class="w3-keyrow"><span><b>วงกลมสี</b> = แต่ละคนอยู่ด่านไหน (สีฟ้า = ฉัน)</span>
                    <span><b>โจทย์ท้า</b> = ใครก็ตั้งได้ ระบบตรวจบล็อกที่ใช้ และดูว่าหุ่นจำลองทำจนจบ ส่วนรายละเอียดอื่นช่วยกันดูเอง</span>
                    <span><b>คนสร้างห้อง</b> เล่นเท่ากับทุกคน ได้เพิ่มแค่เปลี่ยนชื่อหรือเก็บห้อง</span></div>
                <div class="w3-card" style="margin-top:20px">
                    <div class="w3-card-t">โจทย์ท้า</div>
                    <div id="w3-chal"><div class="w3-sub">กำลังโหลด...</div></div>
                </div>
                <div class="w3-card" style="margin-top:20px">
                    <div class="w3-card-t">ดาวของแต่ละคน</div>
                    <div id="w3-peers"><div class="w3-sub">กำลังโหลด...</div></div>
                </div>
            </div>`;
        this._w3LoadPeers(room.id, levels, myIdx);
        this._w3LoadChallenges(room.id);
    },

    async _w3LoadChallenges(roomId) {
        const box = document.getElementById('w3-chal');
        try {
            const res = await fetch(`/api/classrooms/${roomId}/challenges`, { headers: Auth.getHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '');
            if (!document.getElementById('w3-chal')) return;
            const list = data.challenges || [];
            box.innerHTML = list.length ? list.map(c => `
                <div class="w3-chal-row">
                    <span class="w3-chal-ico" style="background:${c.me_passed ? '#e8f5e9' : '#f0e8ff'}">${w3ic(c.me_passed ? 'star' : 'flag', 20, c.me_passed ? '#2e7d32' : '#7a4dd6')}</span>
                    <div class="w3-chal-tx">
                        <b>${this._esc(c.title)}</b>
                        ${c.description ? `<div class="w3-sub w3-small">${this._esc(c.description)}</div>` : ''}
                        <div class="w3-sub w3-small">จาก ${c.by_me ? 'ฉัน' : this._esc(c.author_name)} · ทำได้แล้ว ${c.passed_count}/${c.people} คน${c.goal && (c.goal.required_blocks || []).length ? ' · ต้องใช้: ' + c.goal.required_blocks.map(b => this._esc(W3_GOAL_LABEL[b] || b)).join(', ') : ''}${c.goal && c.goal.needs_sim_ok ? ' · หุ่นจำลองต้องทำจนจบ' : ''}</div>
                    </div>
                    ${c.me_passed ? '<span class="w3-chal-done">ผ่านแล้ว</span>'
                        : `<button class="w3-b1" onclick="Dashboard.goMission(${c.id}, ${roomId})">รับคำท้า</button>`}
                </div>`).join('')
                : '<div class="w3-sub">ยังไม่มีโจทย์ กด "+ ตั้งโจทย์ท้า" แล้วชวนคนในห้องมาลองทำ</div>';
        } catch (e) {
            box.innerHTML = '<div class="w3-sub">โหลดโจทย์ท้าไม่สำเร็จ ลองรีเฟรชอีกครั้ง</div>';
        }
    },

    _w3ChallengeForm(roomId) {
        const chips = Object.entries(W3_GOAL_LABEL).map(([k, t]) => `
            <label class="w3-chip"><input type="checkbox" value="${k}"> ${this._esc(t)}</label>`).join('');
        this._openModal(`
            <h2 class="modal-title">ตั้งโจทย์ท้า</h2>
            <form class="w3-chal-form" onsubmit="Dashboard._w3SaveChallenge(event, ${roomId})">
                <label class="w3-field"><b>โจทย์</b>
                    <input type="text" id="w3c-title" maxlength="200" required placeholder="เช่น เดินซิกแซก 3 รอบ"></label>
                <label class="w3-field"><b>อธิบายเพิ่ม <span class="w3-sub" style="font-weight:400">(ไม่ใส่ก็ได้ · ระบบไม่ตรวจข้อนี้ ช่วยกันดูเอง)</span></b>
                    <input type="text" id="w3c-desc" maxlength="500" placeholder="เช่น ห้ามชนขอบ"></label>
                <div class="w3-label">ระบบตรวจให้เอง <span class="w3-sub" style="font-weight:400">(ไม่เลือกอะไรเลย = ส่งแล้วผ่านทันที)</span></div>
                <div class="w3-sub w3-small">ต้องใช้บล็อกเหล่านี้</div>
                <div class="w3-chips" id="w3c-blocks">${chips}</div>
                <label class="w3-check"><input type="checkbox" id="w3c-sim" checked> หุ่นจำลองต้องทำจนจบ (กด Run แล้วไม่หยุดกลางคัน) ก่อนส่ง</label>
                <label class="w3-field"><b>ใช้คำสั่งอย่างน้อยกี่บล็อก</b>
                    <input type="number" id="w3c-min" min="0" max="50" value="0" style="width:120px"></label>
                <div id="w3c-err" class="w3-err" hidden></div>
                <button type="submit" class="w3-b1 w3-block">ตั้งโจทย์</button>
            </form>`);
        setTimeout(() => { const i = document.getElementById('w3c-title'); if (i) i.focus(); }, 50);
    },

    async _w3SaveChallenge(e, roomId) {
        e.preventDefault();
        const err = document.getElementById('w3c-err');
        const blocks = [...document.querySelectorAll('#w3c-blocks input:checked')].map(i => i.value);
        const min = parseInt(document.getElementById('w3c-min').value, 10) || 0;
        const goal = {};
        if (blocks.length) goal.required_blocks = blocks;
        if (min > 0) goal.min_commands = min;
        if (document.getElementById('w3c-sim').checked) goal.needs_sim_ok = true;
        try {
            const res = await fetch('/api/assignments', {
                method: 'POST', headers: Auth.getHeaders(),
                body: JSON.stringify({
                    classroom_id: roomId,
                    title: document.getElementById('w3c-title').value.trim(),
                    description: document.getElementById('w3c-desc').value.trim(),
                    goal: Object.keys(goal).length ? goal : null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { err.textContent = data.error || 'ตั้งโจทย์ไม่สำเร็จ'; err.hidden = false; return; }
            this._closeModal();
            this._w3LoadChallenges(roomId);
        } catch {
            err.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'; err.hidden = false;
        }
    },

    async _w3LoadPeers(roomId, levels, myIdx) {
        const box = document.getElementById('w3-peers');
        try {
            const res = await fetch(`/api/classrooms/${roomId}/peers`, { headers: Auth.getHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '');
            if (!document.getElementById('w3-peers')) return;   // ออกจากหน้าไปแล้ว
            const max = data.max_stars || 27;
            let k = 0;
            const peers = data.peers.map(p => ({ ...p, color: p.is_me ? '#4C97FF' : W3_PIN_COLORS[(k++) % W3_PIN_COLORS.length] }));
            const pins = peers.map(p => ({ idx: p.level_index, label: p.is_me ? 'ฉัน' : p.display_name, color: p.color }));
            document.getElementById('w3-map').innerHTML = this._w3RoadMap(levels, myIdx, pins);
            box.innerHTML = peers.map(p => `
                <div class="w3-peer">
                    <span class="w3-dot" style="background:${p.color}">${this._esc(w3Initials(p.is_me ? 'ฉัน' : p.display_name))}</span>
                    <b class="w3-peer-n">${p.is_me ? 'ฉัน' : this._esc(p.display_name)}</b>
                    <div class="w3-bar"><i style="width:${Math.round(p.stars / max * 100)}%"></i></div>
                    <span class="w3-peer-s">${w3ic('star', 14, '#FFBF00')} ${p.stars}</span>
                </div>`).join('') + `
                <div class="w3-sub w3-small" style="margin-top:6px">อยู่ด่าน: ${peers.map(p => `${p.is_me ? 'ฉัน' : this._esc(p.display_name)} ${p.level_index + 1}`).join(' · ')}</div>`;
        } catch (e) {
            box.innerHTML = '<div class="w3-sub">โหลดดาวของคนในห้องไม่สำเร็จ ลองรีเฟรชอีกครั้ง</div>';
        }
    },

    async _w3Rename(roomId) {
        const name = (prompt('ชื่อห้องใหม่') || '').trim();
        if (!name) return;
        try {
            const res = await fetch(`/api/classrooms/${roomId}`, {
                method: 'PATCH', headers: Auth.getHeaders(), body: JSON.stringify({ name }),
            });
            if (res.ok) this.load();
            else alert((await res.json()).error || 'เปลี่ยนชื่อไม่สำเร็จ');
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ===================== ห้องแบบให้คะแนน ฝั่งสมาชิก =====================
    // แผนที่ด่าน (ดาวของฉัน) + กระดานโน้ตภารกิจของห้อง · ปุ่มเด่นปุ่มเดียว "ลุยเลย" ที่ภารกิจถัดไป
    // หน้าเดิม (ธีมเกม _renderRoom ใน dashboard-player.js) ยังอยู่ ย้อนได้โดยเอาบรรทัด MEMBER ใน _w3View ออก
    renderMemberRoom(v) {
        const d = this.data;
        const room = v.room;
        const auto = this._w3AutoSkills();
        const levels = auto.map(s => ({ label: W3_LEVEL_TH[s.name] || s.name, stars: this._starsOf(s).earned, max: this._starsOf(s).max }));
        let cur = auto.findIndex(s => this._starsOf(s).earned < this._starsOf(s).max);
        if (cur < 0) cur = Math.max(0, auto.length - 1);
        const totals = this._starTotals(d.skills || []);

        const list = (d.assignments || []).filter(a => a.classroom_id === room.id);
        const todo = list.filter(a => !a.submitted)
            .sort((a, b) => (a.due_date || '9') < (b.due_date || '9') ? -1 : 1);
        const done = list.filter(a => a.submitted)
            .sort((a, b) => (b.submitted_at || '') < (a.submitted_at || '') ? -1 : 1);
        const notes = todo.concat(done);
        const colors = ['#fff59d', '#b3e5fc', '#ffccbc', '#c8e6c9', '#e1bee7', '#ffe0b2'];
        const tilt = [-2.5, 3, -1.5, 2, -3, 1.5];
        const thDate = iso => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const skillTag = a => {
            const n = a.objective_name || (a.target_skills || [])[0];
            return n ? `<span class="w3-skilltag">ฝึก: ${this._esc(W3_LEVEL_TH[n] || n)}</span>` : '';
        };

        const note = (a, i) => {
            const first = i === 0 && !a.submitted;
            let stamp = '';
            if (a.submitted) {
                stamp = a.grade
                    ? `<span class="w3-stamp ok">${a.grade.score}/${a.grade.max_score}</span>`
                    : `<span class="w3-stamp wait">รอตรวจ</span>`;
            }
            const when = a.submitted
                ? `ส่งแล้ว ${a.submitted_at ? thDate(a.submitted_at) : ''}`
                : (a.due_date ? `ส่งภายใน ${thDate(a.due_date)}${a.overdue ? ' (เลยกำหนดแล้ว)' : ''}` : 'ไม่มีกำหนดส่ง');
            return `
                <div class="w3-note ${first ? 'next' : ''}" style="background:${colors[i % colors.length]};transform:rotate(${tilt[i % tilt.length]}deg)">
                    ${first ? '<span class="w3-ribbon">ทำอันนี้ก่อน</span>' : ''}
                    <div class="w3-nt">${this._esc(a.title)}</div>
                    <div class="w3-nd">${when}</div>
                    ${skillTag(a)}
                    ${!a.submitted && a.description ? `<div class="w3-nd">${this._esc(a.description)}</div>` : ''}
                    ${a.grade && a.grade.comment ? `<div class="w3-fb">ผู้สอน: ${this._esc(a.grade.comment)}</div>` : ''}
                    ${stamp}
                    ${a.submitted
                        ? (a.submitted_project_id ? `<button class="w3-b3" onclick="Dashboard.openProject(${a.submitted_project_id})">เปิดดู</button>` : '')
                        : `<button class="${first ? 'w3-b1' : 'w3-b2'}" onclick="Dashboard.goMission(${a.id}, ${room.id})">${first ? 'ลุยเลย' : 'ทำภารกิจนี้'}</button>`}
                </div>`;
        };

        this._w3Levels = { auto, levels, cur };
        document.getElementById('dashboard-content').innerHTML = `
            <div class="w3-wrap">
                <div class="w3-roomhead">
                    <div>
                        <h1 class="w3-h1">${this._esc(room.name)}</h1>
                        <div class="w3-sub">ผู้สอน: ${this._esc(room.teacher_name)}</div>
                    </div>
                    <div class="w3-mystars">${w3ic('star', 16, '#FFBF00')} ดาวของฉัน ${totals.earned}/${totals.max}</div>
                </div>
                <div class="w3-mapcard w3-mapwrap">
                    ${this._w3RoadMap(levels, cur, [], true)}
                    <div class="w3-levelpop" id="w3-levelpop" hidden></div>
                </div>
                <div class="w3-keyrow">
                    <span><b>แตะด่าน</b> เพื่อดูวิธีได้ดาว</span>
                    <span><b>ด่าน</b> = ทักษะ ฝึกแล้วได้ดาว (ระบบนับให้เอง)</span>
                    <span><b>ภารกิจ</b> = งานจากห้อง ส่งแล้วผู้สอนให้คะแนน</span>
                    <span>ทุกด่านเล่นได้ ไม่มีด่านล็อก</span>
                </div>
                <div class="w3-board">
                    <div class="w3-board-title">${w3ic('flag', 18, '#e53935')} ภารกิจของห้อง · ส่งแล้ว ${done.length}/${list.length}</div>
                    ${notes.length ? `<div class="w3-notes">${notes.map(note).join('')}</div>`
                        : '<div class="w3-board-empty">ยังไม่มีภารกิจ ระหว่างนี้ฝึกตามแผนที่เก็บดาวได้เลย</div>'}
                </div>
            </div>`;
    },

    _w3ShowLevel(i) {
        const L = this._w3Levels;
        const box = document.getElementById('w3-levelpop');
        if (!L || !box || !L.auto[i]) return;
        const sk = L.auto[i];
        const st = this._starsOf(sk);
        const desc = {
            'Sequencing': 'เรียงคำสั่งให้หุ่นทำทีละขั้นตามลำดับ',
            'Loops': 'ใช้บล็อก repeat ให้หุ่นทำซ้ำ ไม่ต้องวางบล็อกเดิมหลายอัน',
            'Conditionals': 'ใช้บล็อก if ให้หุ่นตัดสินใจเอง เช่น ถ้าเจอของให้หยุด',
            'Variables': 'เก็บตัวเลขไว้ในตัวแปร แล้วเอาไปใช้ต่อ',
            'Pattern Recognition': 'เห็นส่วนที่ซ้ำกันแล้วเขียนให้สั้นลง',
            'Robot Motion': 'สั่งหุ่นเดิน ถอย หันซ้ายขวา',
            'Robot Arms & Gripper': 'ยกแขน ขยับมือ หนีบของ',
            'Robot Expressions': 'เปลี่ยนหน้าตาและท่าทางของหุ่น',
            'Debugging': 'หาจุดที่ผิดในโค้ดแล้วแก้ให้หุ่นทำงานได้',
        }[sk.name] || (sk.description || '');
        const row = (n, t) => `<div>${w3ic('star', 16, n <= st.earned ? '#FFBF00' : '#d8c9a6')} ${t}</div>`;
        box.innerHTML = `
            <button class="w3-pop-x" onclick="document.getElementById('w3-levelpop').hidden=true" aria-label="ปิด">×</button>
            <div class="w3-sub w3-small">ด่าน ${i + 1} · ได้แล้ว ${st.earned} ดาว</div>
            <div class="w3-pop-t">${this._esc(L.levels[i].label)}</div>
            <div class="w3-sub">${this._esc(desc)}</div>
            <div class="w3-crit">
                ${row(1, 'ใช้บล็อกของทักษะนี้แล้วกด Run ได้โดยไม่มีข้อผิดพลาด 1 ครั้ง')}
                ${row(2, 'ทำแบบนั้นครบ 2 ครั้ง')}
                ${row(3, 'ครบ 3 ครั้ง = ผ่านด่าน')}
            </div>
            <button class="w3-b1" onclick="Router.navigate('#/workspace')">เริ่มด่านนี้</button>`;
        box.hidden = false;
    },

    // ===================== ฉายรหัสขึ้นจอ =====================
    renderProjector(v) {
        const room = v.room;
        const code = room.invite_code || '';
        document.getElementById('dashboard-content').innerHTML = `
            <div class="w3-proj">
                <button class="w3-proj-close" onclick="Dashboard.goTo('#/dashboard/room/${room.id}')">ปิดจอนี้</button>
                <div class="w3-proj-main">
                    <div class="w3-proj-t">เข้าห้อง <b>${this._esc(room.name)}</b></div>
                    ${/^(localhost|127\.|\[::1\])/.test(location.host) ? '' : `<div class="w3-proj-url">${this._esc(location.host)}</div>`}
                    <div class="w3-proj-how">เปิดเว็บนี้ แล้วใส่รหัสห้องที่ช่อง "เข้าห้องด้วยรหัส" หรือตอนสมัคร</div>
                    <div class="w3-proj-code">${this._esc(code)}</div>
                    <div class="w3-proj-count" id="w3-proj-count">อยู่ในห้องแล้ว ${room.student_count || 0} คน</div>
                </div>
                <div class="w3-proj-qr" id="w3-proj-qr" hidden><div id="w3-proj-qr-img"></div><div>หรือสแกนด้วยมือถือ</div></div>
            </div>`;
        // QR ทำที่เซิร์ฟเวอร์ (ต้องส่ง token จึงใช้ <img src> ตรง ๆ ไม่ได้)
        fetch(`/api/classrooms/${room.id}/qr.svg`, { headers: Auth.getHeaders() })
            .then(r => r.ok ? r.text() : '')
            .then(svg => {
                const box = document.getElementById('w3-proj-qr');
                if (!svg || !box) return;
                document.getElementById('w3-proj-qr-img').innerHTML = svg;
                box.hidden = false;
            })
            .catch(() => { /* ไม่มี QR ก็ยังพิมพ์รหัสเข้าได้ */ });
        // นับคนที่เข้าห้องแล้วใหม่ทุก 10 วินาที ระหว่างที่จอนี้ยังเปิดอยู่
        clearTimeout(this._w3ProjTimer);
        const here = window.location.hash;
        const tick = async () => {
            if (window.location.hash !== here) return;
            try {
                const res = await fetch('/api/dashboard', { headers: Auth.getHeaders() });
                const d = await res.json();
                const r = (d.owned_classrooms || []).find(c => c.id === room.id);
                const el = document.getElementById('w3-proj-count');
                if (r && el) el.textContent = `อยู่ในห้องแล้ว ${r.student_count || 0} คน`;
            } catch { /* เน็ตกระตุก รอรอบหน้า */ }
            this._w3ProjTimer = setTimeout(tick, 10000);
        };
        this._w3ProjTimer = setTimeout(tick, 10000);
    },
});

// ---------- ต่อเข้ากับตัวแจกงานเดิม ----------
(function () {
    const baseRender = Dashboard.render;
    Dashboard.render = function () {
        const v = this._w3View();
        const hash = window.location.hash || '';
        const isHub = !v && this.getView().mode === 'HUB';
        const w3 = !!v || isHub;
        document.body.classList.toggle('mode-w3', w3);
        if (!w3) return baseRender.call(this);
        document.body.classList.remove('mode-player', 'mode-hub', 'mode-owner');
        let out;
        if (isHub) out = this.renderHub();
        else if (v.w3 === 'NEW') out = this.renderCreateRoom();
        else if (v.w3 === 'EQUAL') out = this.renderEqualRoom(v);
        else if (v.w3 === 'CODE') out = this.renderProjector(v);
        else if (v.w3 === 'MEMBER') out = this.renderMemberRoom(v);
        this._paintFaces(document.getElementById('dashboard-content'));
        return out;
    };
})();

// ---------- ลิงก์เชิญ ?room=รหัส ----------
(function () {
    const params = new URLSearchParams(location.search);
    const code = (params.get('room') || '').trim().toUpperCase();
    if (!code) return;
    // เอาออกจากแถบที่อยู่ ไม่ให้รีเฟรชแล้วเข้าซ้ำ
    params.delete('room');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    window.addEventListener('load', async () => {
        await Auth.ready;
        if (Auth.isLoggedIn && Auth.isLoggedIn()) {
            try {
                const res = await fetch('/api/classrooms/join', {
                    method: 'POST', headers: Auth.getHeaders(), body: JSON.stringify({ invite_code: code }),
                });
                const data = await res.json().catch(() => ({}));
                const id = (data.classroom && data.classroom.id) || data.classroom_id;
                if (!res.ok && !/already|อยู่แล้ว/i.test(data.error || '')) alert(data.error || 'เข้าห้องไม่สำเร็จ');
                Router.navigate(id ? `#/dashboard/room/${id}` : '#/dashboard');
            } catch {
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
        } else {
            Auth.showLoginModal();
            Auth.showRegisterForm();
            const input = document.getElementById('reg-invite-code');
            if (input) input.value = code;
        }
    });
})();

// ---------- หน้าแรกของคนที่เข้าเว็บครั้งแรก (ยังไม่ล็อกอิน) ----------
// ผู้ทดสอบที่หลงเข้ามาปิดเว็บใน 40 วินาที เพราะเปิดมาเจอทัวร์ลากบล็อกทันที ไม่รู้ว่าเว็บนี้คืออะไร
// จึงบอกก่อนใน 5 วินาที: ทำอะไรได้ ใครทำ ฟรี ไม่ต้องมีหุ่นจริง · ปุ่มหลักปุ่มเดียว
const W3_WELCOME_KEY = 'meto_seen_welcome';
const W3Welcome = {
    render() {
        const page = document.getElementById('page-welcome');
        const tick = t => `<span>${w3ic('check', 20, '#2f9e44')} ${t}</span>`;
        const demo = ['ลำดับ', 'วนซ้ำ', 'เงื่อนไข', 'ตัวแปร', 'แก้บั๊ก', 'รูปแบบ', 'เคลื่อนที่', 'แขน', 'อารมณ์']
            .map((label, i) => ({ label, stars: [3, 2, 1][i] || 0, max: 3 }));
        page.innerHTML = `
            <div class="w3-wrap">
                <div class="w3-hero">
                    <div>
                        <h1 class="w3-hero-h">ฝึกเขียนโปรแกรม<br>สั่งหุ่นยนต์ด้วยการต่อบล็อก</h1>
                        <p class="w3-hero-p">ลากบล็อกคำสั่งมาต่อกัน กด Run แล้วดูหุ่น METO ทำตาม เหมาะกับคนเพิ่งเริ่ม ไม่เคยเขียนโค้ดก็ได้</p>
                        <div class="w3-ticks">
                            ${tick('ใช้ฟรี ไม่ต้องติดตั้งอะไร')}
                            ${tick('ไม่มีหุ่นจริงก็ลองได้ มีหุ่นจำลองบนจอ')}
                            ${tick('ผู้ช่วย AI ตอบเฉพาะเรื่องบล็อกและหุ่น')}
                        </div>
                        <div class="w3-hero-btns">
                            <button class="w3-b1 w3-b1-big" onclick="W3Welcome.tryNow()">ลองเลย ไม่ต้องสมัคร</button>
                            <button class="w3-b2" onclick="W3Welcome.done(); Auth.showLoginModal()">เข้าสู่ระบบ / สมัคร</button>
                            <button class="w3-b3" onclick="W3Welcome.haveCode()">มีรหัสห้อง? ใส่รหัสตรงนี้</button>
                        </div>
                        <div class="w3-sub w3-small" style="margin-top:14px">โครงงานวิทยานิพนธ์ ภาควิชาเทคโนโลยีมีเดีย มจธ. · เก็บเฉพาะชื่อผู้ใช้และผลงานที่บันทึก ไม่ขออีเมลหรือเบอร์โทร</div>
                    </div>
                    <div class="w3-mapcard">${Dashboard._w3RoadMap.call(Dashboard, demo, 2, [])}</div>
                </div>
                <div class="w3-who">
                    <div class="w3-card3">${w3ic('map', 30, '#4C97FF')}<h3>ฝึกตามแผนที่</h3><div class="w3-sub">9 ด่าน เก็บดาวทีละทักษะ ระบบตรวจให้เอง</div></div>
                    <div class="w3-card3">${w3ic('users', 30, '#9966FF')}<h3>สร้างห้อง ชวนคนอื่น</h3><div class="w3-sub">ตั้งชื่อเอง แชร์รหัส เห็นดาวและด่านของกันและกัน</div></div>
                    <div class="w3-card3">${w3ic('board', 30, '#FF8C1A')}<h3>สั่งงานและให้คะแนน</h3><div class="w3-sub">เปิดในห้องที่สร้าง ตรวจงาน ส่งออก Excel</div></div>
                </div>
                <div class="w3-foot">METO เป็นโครงงานวิทยานิพนธ์ ภาควิชาเทคโนโลยีมีเดีย มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)</div>
            </div>`;
    },
    done() {
        try { localStorage.setItem(W3_WELCOME_KEY, '1'); } catch (e) { }
    },
    tryNow() {
        this.done();
        Router.navigate('#/workspace');
    },
    haveCode() {
        this.done();
        Auth.showLoginModal();
        Auth.showRegisterForm();
        const input = document.getElementById('reg-invite-code');
        if (input) setTimeout(() => input.focus(), 120);
    },
};

(function () {
    const page = document.createElement('div');
    page.id = 'page-welcome';
    page.className = 'page hidden';
    const ws = document.getElementById('page-workspace');
    if (ws && ws.parentNode) ws.parentNode.insertBefore(page, ws);
    else document.body.appendChild(page);
    Router.register('#/welcome', 'page-welcome', () => {
        document.body.classList.add('mode-w3');
        W3Welcome.render();
    });
    // ออกจากหน้าแรกแล้วเอาธีมรอบ 3 ออก (หน้าแดชบอร์ดใส่กลับเองตอนวาด)
    window.addEventListener('hashchange', () => {
        // หน้าต่างลอย (ตั้งโจทย์ ตรวจงาน ฯลฯ) เป็นของหน้าที่เปิดมัน ย้ายหน้าแล้วต้องปิด
        if (Dashboard._closeModal) Dashboard._closeModal();
        if (location.hash !== '#/welcome' && !location.hash.startsWith('#/dashboard')) document.body.classList.remove('mode-w3');
    });

    Auth.ready.then(() => {
        let seen = null;
        try { seen = localStorage.getItem(W3_WELCOME_KEY); } catch (e) { }
        const atDefault = !location.hash || location.hash === '#/' || location.hash === '#/workspace';
        if (!Auth.isLoggedIn() && !seen && atDefault && !new URLSearchParams(location.search).get('room')) {
            Router.navigate('#/welcome');
        }
    });
})();
