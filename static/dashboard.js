// Dashboard — unified dashboard for universal users
// ทุกคนเป็น USER: ส่วนตัว (ทุกคน) + ส่วนผู้ดูแล (เฉพาะคนที่สร้างห้องเอง)
// ไอคอนทั้งหมดวาดด้วยโค้ด (inline SVG) — ไม่ใช้อีโมจิ

// ==================== SVG ICONS (code-drawn) ====================
const MetoIcons = {
    // ---- Achievement icons (keyed by condition_type) ----
    // วาดใน viewBox 48x48 พื้นวงกลมสี + สัญลักษณ์ขาว
    _badge(bg, inner) {
        return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="${bg}"/>
            <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="2"/>
            ${inner}
        </svg>`;
    },

    achievement(conditionType) {
        switch (conditionType) {
            case 'TUTORIAL_COMPLETE': // First Steps — ธงเริ่มต้น
                return this._badge('#4C97FF', `
                    <path d="M18 12 v24" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                    <path d="M18 13 h13 l-4 5 4 5 h-13 z" fill="#fff"/>`);
            case 'PROGRAMS_RUN': // Hello Robot — ปุ่ม play
                return this._badge('#4CAF50', `
                    <path d="M19 15 l14 9 -14 9 z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`);
            case 'PROJECTS_CREATED': // Block Builder — บล็อกซ้อนกัน
                return this._badge('#FF8C1A', `
                    <rect x="13" y="26" width="10" height="8" rx="2" fill="#fff"/>
                    <rect x="25" y="26" width="10" height="8" rx="2" fill="#fff" opacity="0.85"/>
                    <rect x="19" y="15" width="10" height="8" rx="2" fill="#fff" opacity="0.95"/>`);
            case 'LOOP_USAGE': // Loop Master — ลูกศรวนซ้ำ
                return this._badge('#9966FF', `
                    <path d="M31.8 18.5 a11 11 0 1 0 3.2 8" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
                    <path d="M32.5 11.5 v8 h-8 z" fill="#fff"/>`);
            case 'ERRORS_FIXED': // Bug Squasher — แมลง + เครื่องหมายถูก
                return this._badge('#CF63CF', `
                    <ellipse cx="21" cy="24" rx="7" ry="9" fill="#fff"/>
                    <circle cx="21" cy="14.5" r="4" fill="#fff"/>
                    <path d="M12 19 l-4 -3 M12 25 h-5 M12 31 l-4 3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M28 30 l3.5 3.5 L38 26" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
            case 'LOGIN_STREAK': // Persistent Coder — เปลวไฟ
                return this._badge('#FF6680', `
                    <path d="M24 10 c1 6 8 8 8 15 a8 8 0 0 1 -16 0 c0 -4 2 -6 4 -8 c0 3 1.5 4 3 4.5 c-1 -4 0 -8 1 -11.5 z" fill="#fff"/>`);
            case 'AI_QUESTIONS': // AI Whisperer — กล่องแชท
                return this._badge('#00B4AB', `
                    <path d="M12 15 a4 4 0 0 1 4 -4 h16 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 l-7 6 v-6 a4 4 0 0 1 -1 -1 z" fill="#fff"/>
                    <circle cx="19" cy="21" r="2" fill="#00B4AB"/>
                    <circle cx="25" cy="21" r="2" fill="#00B4AB"/>
                    <circle cx="31" cy="21" r="2" fill="#00B4AB"/>`);
            case 'PERFECT_GRADE': // Perfect Score — ดาว
                return this._badge('#FFBF00', `
                    <path d="M24 11 l4 8.4 9 1.3 -6.5 6.4 1.5 9 -8 -4.3 -8 4.3 1.5 -9 -6.5 -6.4 9 -1.3 z" fill="#fff"/>`);
            default: // สำรอง — เหรียญรางวัล
                return this._badge('#3A53A4', `
                    <circle cx="24" cy="20" r="8" fill="#fff"/>
                    <path d="M19 26 l-3 11 8 -4 8 4 -3 -11" fill="#fff" opacity="0.85"/>`);
        }
    },

    // ---- Small UI icons (24x24, stroke-based, สีตาม currentColor) ----
    _ui(inner) {
        return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
    },

    play()    { return this._ui(`<path d="M7 5 l12 7 -12 7 z" fill="currentColor" stroke="none"/>`); },
    blocks()  { return this._ui(`<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><rect x="8" y="3" width="8" height="8" rx="1.5"/>`); },
    chat()    { return this._ui(`<path d="M4 6 a2 2 0 0 1 2 -2 h12 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 h-9 l-5 4 z"/>`); },
    folder()  { return this._ui(`<path d="M3 7 a2 2 0 0 1 2 -2 h4 l2 2 h8 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 z"/>`); },
    users()   { return this._ui(`<circle cx="9" cy="8" r="3.5"/><path d="M3 20 c0 -4 3 -6 6 -6 s6 2 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5 c2.8 0.3 4.5 2.2 4.5 5.5"/>`); },
    active()  { return this._ui(`<circle cx="12" cy="12" r="8"/><path d="M12 8 v4 l3 2"/>`); },
    door()    { return this._ui(`<path d="M14 4 h-8 v16 h8"/><path d="M14 4 l6 2 v12 l-6 2 z" fill="currentColor" stroke="none" opacity="0.3"/><path d="M14 4 l6 2 v12 l-6 2"/><circle cx="16.5" cy="12" r="1" fill="currentColor" stroke="none"/>`); },
    crown()   { return this._ui(`<path d="M4 17 l-1 -9 5 4 4 -7 4 7 5 -4 -1 9 z"/><path d="M4 20 h16"/>`); },
    lock()    { return this._ui(`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 v3"/>`); },
    teacherStar() { return this._ui(`<path d="M12 4 l2.3 4.7 5.2 0.8 -3.75 3.65 0.9 5.15 -4.65 -2.45 -4.65 2.45 0.9 -5.15 -3.75 -3.65 5.2 -0.8 z"/><path d="M3 21 h18"/>`); },

    // ---- ดาวความคืบหน้าทักษะ ----
    // accent (#BED73B) = ได้แล้ว · border (#e8ecf4) = ยังไม่ได้ — อยู่ในพาเลตของ THEME.md
    // ห้ามใช้อีโมจิรูปดาว เพราะธีมกำหนดให้ไอคอน UI เป็น inline SVG เท่านั้น
    star(filled, size) {
        const px = size || 20;
        return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true"
            class="star-mark ${filled ? 'star-on' : 'star-off'}">
            <path d="M12 3 l2.6 5.3 5.9 0.85 -4.25 4.15 1 5.8 -5.25 -2.75 -5.25 2.75 1 -5.8 -4.25 -4.15 5.9 -0.85 z"
                fill="${filled ? '#BED73B' : '#e8ecf4'}"
                stroke="${filled ? '#a8c22e' : '#dde3f0'}" stroke-width="1" stroke-linejoin="round"/>
        </svg>`;
    },
};

// ==================== DASHBOARD ====================
const Dashboard = {
    data: null,

    showGuestState() {
        const container = document.getElementById('dashboard-content');
        container.innerHTML = `
            <div class="dashboard-section" style="text-align:center; padding: 60px 20px;">
                <h2 style="color:#333; margin-bottom:12px;">Dashboard</h2>
                <p style="color:#666; margin-bottom:24px;">สมัครสมาชิกเพื่อบันทึกผลงาน สร้างหรือเข้าร่วมห้อง และดูสถิติการเรียนรู้ของคุณ</p>
                <button class="btn-primary" onclick="Auth.showLoginModal()" style="margin-right:8px;">เข้าสู่ระบบ</button>
                <button class="btn-primary" onclick="Auth.showLoginModal(); setTimeout(()=>Auth.showRegisterForm(), 100);" style="background:#80C781;">สมัครสมาชิก</button>
            </div>`;
    },

    async load() {
        const container = document.getElementById('dashboard-content');
        container.innerHTML = `
            <div class="meto-load meto-load--page"><div class="meto-spin"></div><p>กำลังโหลดข้อมูล...</p></div>`;

        try {
            // อยู่หน้าห้องไหน ให้เซิร์ฟเวอร์ส่งรายชื่อสมาชิกของห้องนั้นมาเลย
            const view = this.getView();
            const query = view.classroomId ? `?classroom_id=${view.classroomId}` : '';
            const res = await fetch('/api/dashboard' + query, { headers: Auth.getHeaders() });

            if (!res.ok) {
                container.innerHTML = `
                    <div class="meto-error">
                        <i class="material-icons">cloud_off</i>
                        <p>ไม่สามารถโหลดข้อมูลได้ (${res.status})</p>
                        <button class="btn-primary" onclick="Dashboard.load()">ลองใหม่</button>
                    </div>`;
                return;
            }

            this.data = await res.json();
        } catch (e) {
            container.innerHTML = `
                <div class="meto-error">
                    <i class="material-icons">cloud_off</i>
                    <p>ต่อเซิร์ฟเวอร์ไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วกดลองใหม่</p>
                    <button class="btn-primary" onclick="Dashboard.load()">ลองใหม่</button>
                </div>`;
            return;
        }

        // แยก try ของการวาดออกจากการโหลด
        // เดิมรวมกัน ทำให้บั๊กตอนวาดหน้าไปขึ้นข้อความ "ต่อเซิร์ฟเวอร์ไม่ได้"
        // ผู้ดูแลจะไปไล่แก้ WiFi ทั้งที่เซิร์ฟเวอร์ตอบ 200 ปกติ
        try {
            this.render();
        } catch (e) {
            console.error('[Dashboard] วาดหน้าไม่สำเร็จ:', e);
            container.innerHTML = `
                <div class="meto-error">
                    <i class="material-icons">report_problem</i>
                    <p>แสดงหน้านี้ไม่สำเร็จ ข้อมูลโหลดมาแล้วแต่วาดไม่ได้</p>
                    <button class="btn-primary" onclick="Dashboard.load()">ลองใหม่</button>
                </div>`;
        }
    },

    // ตัวแจกงาน — เลือกว่าจะวาดหน้าไหน (รายละเอียดกติกาอยู่ใน dashboard-hub.js)
    //   HUB    หน้าเลือกแดชบอร์ด — เฉพาะคนที่มีห้องที่สร้างเอง
    //   PLAYER หน้าเกม — คนที่เป็นสมาชิกในห้องคนอื่น
    //   NORMAL แดชบอร์ดปกติ — ผู้ดูแลในห้องของตัวเอง และคนที่ยังไม่มีห้องเลย
    render() {
        const view = this.getView();
        document.body.classList.toggle('mode-player', view.mode === 'PLAYER');
        document.body.classList.toggle('mode-hub', view.mode === 'HUB');
        // หน้าของเจ้าของห้อง = ร่างที่เรียบร้อยกว่าของธีมเกมเดียวกัน (ไม่ใช่คนละธีม)
        // เกณฑ์คือ "เราเป็นเจ้าของห้องนี้" ไม่ใช่ "อยู่หน้าแดชบอร์ด"
        // เพราะหน้าแดชบอร์ดของสมาชิกก็อยู่ใต้ #/dashboard เหมือนกัน
        document.body.classList.toggle(
            'mode-owner',
            view.mode === 'NORMAL' && !!view.room &&
            (this.data.owned_classrooms || []).some(c => c.id === view.classroomId)
        );

        let out;
        if (view.mode === 'HUB') out = this.renderHub(view);
        else if (view.mode === 'PLAYER') out = this.renderPlayer(view);
        // หน้าห้องของครู = ธีม A แบบใหม่ (dashboard-owner.js) · renderNormal เดิมยังใช้กับหน้าโปรไฟล์
        else if (view.room && document.body.classList.contains('mode-owner') && this.renderOwnerRoom) out = this.renderOwnerRoom(view);
        else out = this.renderNormal(view);

        // รูปโปรไฟล์ที่เป็นหน้าหุ่นวาดลง canvas — ต้องวาดหลังใส่ DOM แล้ว
        this._paintFaces(document.getElementById('dashboard-content'));
        return out;
    },

    renderNormal(view) {
        const container = document.getElementById('dashboard-content');
        const d = this.data;
        const user = d.user || Auth.user || {};
        const displayName = user.display_name || user.username || 'เพื่อนใหม่';

        const stats = d.stats || {};
        const projects = d.projects || [];
        const activity = d.activity || [];
        const achievements = d.achievements || [];
        const skills = d.skills || [];
        const joined = d.joined_classrooms || [];
        const owned = d.owned_classrooms || [];
        const teacher = d.teacher; // null ถ้ายังไม่มีห้องของตัวเอง

        // ตัวช่วยฝั่งผู้ดูแล — ตั้งก่อนวาด เพราะใช้ทั้งคอลัมน์ซ้าย (งาน) และขวา (รายชื่อสมาชิก)
        if (teacher) {
            this._teacherStudents = teacher.students || [];
            this._ownedRooms = owned;
            // ห้องที่กำลังแสดงรายชื่ออยู่ — ใช้ตอนเอาสมาชิกออก/ตั้งเลขที่
            this._selectedClassroomId = teacher.selected_classroom_id || (owned[0] && owned[0].id);
        }

        // ภารกิจกับคะแนนสังกัดห้องเสมอ — หน้านี้จึงแสดงได้เฉพาะตอนเปิดห้องอยู่
        //
        // เดิมใช้ `!roomId || a.classroom_id === roomId` ซึ่งตอนอยู่หน้าโปรไฟล์ (roomId เป็น null)
        // เงื่อนไขแรกเป็นจริงเสมอ = ผ่านหมดทุกห้อง เด็กที่เรียน 2 ห้องจึงเห็นภารกิจและคะแนน
        // ของทั้งสองห้องกองรวมกันโดยไม่มีอะไรบอกว่าอันไหนของห้องไหน
        // และหน้านี้คือบทบาท "ผู้ใช้" ซึ่งประกาศตัวเองว่าไม่ผูกกับห้องไหน (dashboard-hub.js)
        const roomId = view && view.classroomId;
        const room = (view && view.room) || null;
        const grades = roomId
            ? (d.grades || []).filter(g => g.classroom_id === roomId)
            : [];
        const myAssignments = roomId
            ? (d.assignments || []).filter(a => a.classroom_id === roomId)
            : [];
        // ค้างงานกี่ห้อง — ใช้บอกทางกลับไปหน้าห้องแทนการยกกระดานภารกิจมาทั้งดุ้น
        const pendingRooms = roomId ? [] : [...new Set(
            (d.assignments || []).filter(a => !a.submitted).map(a => a.classroom_id)
        )];

        container.innerHTML = `
            ${this._backToHub('เลือกแดชบอร์ดอื่น')}

            <!-- Greeting (เต็มความกว้าง) -->
            <div class="dashboard-greeting" style="animation: fadeInUp 0.4s ease-out;">
                <div class="greeting-avatar" onclick="Dashboard.showFacePicker()"
                     title="เปลี่ยนรูปโปรไฟล์เป็นหน้าหุ่นที่ปลดล็อกแล้ว" role="button" tabindex="0"
                     >${this._avatar(displayName, (this.data && this.data.user && this.data.user.avatar_url) || null)}</div>
                <div class="greeting-text">
                    ${room ? `
                        <h1>${this._esc(room.name)}</h1>
                        <p>ห้องที่คุณเป็นผู้ดูแล ดูสมาชิก ให้คะแนน และสั่งภารกิจได้ที่นี่</p>
                    ` : `
                        <h1>สวัสดี ${this._esc(displayName)}!</h1>
                        <p>ยินดีต้อนรับกลับมา มาดูความก้าวหน้าของคุณกันเถอะ</p>
                    `}
                </div>
            </div>

            <!-- รหัสเข้าร่วม ต้องอยู่บนสุดของหน้าห้อง ผู้ดูแลจะได้ชวนสมาชิกเข้าห้องได้ทันที -->
            ${this._roomCodeBar(room)}

            <!-- แถวสถิติ ใช้ "แถบเตี้ย" ทั้งสองหน้าแล้ว
                 เดิมหน้าโปรไฟล์ใช้การ์ดใหญ่ 4 ใบ ด้วยเหตุผลว่า "ที่นั่นสถิติคือเนื้อหาหลัก"
                 วัดจริงแล้วไม่จริง: เดสก์ท็อป 182px = 25% ของจอแรก
                 มือถือ 652px = 87% ของจอแรก (การ์ดเรียงตั้ง 4 ใบ) รวมคำทักทายเป็น 108%
                 คือกินจอแรกหมดก่อนจะได้เห็นผลงานหรือทักษะสักอัน
                 ตัวเลขพวกนี้กดต่อไม่ได้ เป็นของ "รู้ไว้" ไม่ควรแย่งที่ของที่กดได้
                 ใช้ลายเดียวกับหน้าห้องผู้ดูแลยังได้ผลพลอยได้ว่าไม่ต้องเรียนรู้ใหม่ -->
            ${room && teacher ? this._roomStatsStrip(teacher) : this._myStatsStrip(stats)}

            <!-- 2 คอลัมน์: ซ้าย = ส่วนใช้งาน / ขวา = ส่วนติดตามผล -->
            <div class="dash-columns">
                <div class="dash-main">
                    <!-- Classrooms: join + create (ทุกคนทำได้)
                         หน้าห้องเฉพาะห้องไม่ต้องแสดงรายการห้องทั้งหมดซ้ำ -->
                    <!-- "ห้องของฉัน" ถูกตัดออกจากหน้านี้แล้ว
                         มันซ้ำกับหน้าเลือก (HUB) แบบคำต่อคำ ทั้งฟอร์มกรอกรหัส
                         ปุ่มสร้างห้อง และรายการห้อง กิน 493px บนเดสก์ท็อป / 697px บนมือถือ
                         ผู้ใช้เพิ่งผ่านหน้าเลือกมาก่อนกดเข้ามาที่นี่เสมอ (getView คืน HUB เสมอแล้ว) -->

                    <!-- กระดานภารกิจเป็นของหน้าห้อง ไม่ใช่ของหน้านี้
                         ยกมาทั้งดุ้นแล้วซ้ำกับธีมเกม และเด็ก 2 ห้องจะเห็นปนกัน
                         เหลือไว้แค่ทางกลับไปหาที่ที่มันอยู่จริง -->
                    ${pendingRooms.length ? `
                    <div class="notice-box notice-inline">
                        มีภารกิจที่ยังไม่ได้ส่งใน ${pendingRooms.length} ห้อง
                        ${pendingRooms.map(cid => {
                            const c = joined.find(x => x.id === cid);
                            return c ? `<button class="project-btn"
                                onclick="Dashboard.goTo('#/dashboard/room/${cid}')"
                                >ไปที่ ${this._esc(c.name)}</button>` : '';
                        }).join('')}
                    </div>` : ''}

                    <!-- มุมผู้ดูแล เฉพาะตอนเปิดห้องที่เราเป็นเจ้าของ
                         เดิมเช็คแค่ teacher ทำให้ #/dashboard/me มีบล็อกของห้องโผล่มา 5 อัน
                         ทั้งที่หน้านั้นประกาศตัวเองว่า "ข้อมูลที่ไม่ผูกกับห้อง" (dashboard-hub.js)
                         และห้องที่โผล่คือห้องที่เซิร์ฟเวอร์เลือกให้เอง โดยหน้าเว็บไม่บอกชื่อห้องเลย
                         ผู้ดูแลเข้าห้องผ่านหน้าเลือก (HUB) อยู่แล้ว ไม่ต้องมีทางลัดที่นี่ -->
                    ${teacher && room ? this._teacherSection(teacher, owned, room) : ''}

                    <!-- โปรเจกต์ส่วนตัว หน้าห้องคือ "งานของห้อง" ไม่ใช่งานของเรา
                         (บล็อกข้างเคียงอย่างกราฟ/คะแนน/ทักษะ มี guard นี้อยู่แล้ว อันนี้ตกหล่น) -->
                    ${roomId ? '' : `
                    <div class="dashboard-section" style="animation: fadeInUp 0.6s ease-out;">
                        <div class="section-title">โปรเจกต์ล่าสุด</div>
                        <div class="projects-list">
                            ${projects.length > 0 ? projects.map(p => `
                                <div class="project-item">
                                    <div class="project-info">
                                        <div class="project-title">${this._esc(p.title || 'ไม่มีชื่อ')}</div>
                                        <div class="project-date">${this._formatDate(p.updated_at || p.created_at)}</div>
                                    </div>
                                    <div style="display:flex; align-items:center;">
                                        <button class="project-btn" onclick="Dashboard.openProject(${p.id})">เปิด</button>
                                        <button class="project-btn" onclick="Dashboard.viewProjectVersions(${p.id})"
                                            title="ดูเวอร์ชันเก่าและกู้งานกลับ">ประวัติ</button>
                                        <button class="project-btn project-btn-danger" onclick="Dashboard.deleteProject(${p.id}, this)">ลบ</button>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-state">ยังไม่มีโปรเจกต์ กดปุ่ม "บันทึก" ในหน้า Workspace เพื่อเก็บผลงานของคุณ</div>'}
                        </div>
                    </div>`}
                </div>

                <div class="dash-side">
                    <!-- หน้าห้อง: ฝั่งขวาเป็นของ "คน" รายชื่อสมาชิกยาวลงมา + ภาพรวมทักษะของห้อง
                         ฝั่งซ้ายเป็นของ "งาน" สั่งภารกิจ ให้คะแนน โปรเจกต์
                         ส่วนกราฟ/คะแนน/ทักษะ/เหรียญ ข้างล่างเป็นข้อมูล "ของผู้ดูแลเอง"
                         ไม่ใช่ของห้อง จึงโผล่เฉพาะหน้าโปรไฟล์ -->
                    ${room && teacher ? this._teacherRoster(teacher) : ''}
                    ${room && teacher ? this._skillOverviewSection(teacher) : ''}

                    ${room ? '' : `
                    <!-- Activity Chart -->
                    <div class="dashboard-section" style="animation: fadeInUp 0.7s ease-out;">
                        <div class="section-title">กิจกรรม 7 วันล่าสุด</div>
                        <div class="chart-container" id="activity-chart">
                            ${this._buildActivityChart(activity)}
                        </div>
                    </div>

                    <!-- ตาราง "คะแนนจากผู้ดูแลห้อง" ถูกตัดออกจากหน้านี้แล้ว
                         คะแนนสังกัดห้อง (Grade.classroom_id) แต่หน้านี้เป็นบทบาท "ผู้ใช้"
                         ที่ไม่ผูกกับห้องไหน ตารางเดิมจึงเอาคะแนนทุกห้องมากองรวมกัน
                         โดยไม่มีคอลัมน์บอกว่าคะแนนไหนของห้องไหน
                         และเมื่อยังไม่มีคะแนนก็เหลือกล่องเปล่าที่บอกแค่ "ยังไม่มีคะแนน"
                         ซึ่งผิดกติกา empty state ของโปรเจกต์เอง
                         ดูคะแนนได้ที่หน้าห้อง ซึ่งบอกชัดว่าเป็นคะแนนของห้องไหน -->
                    ${roomId && grades.length > 0 ? `
                    <div class="dashboard-section" style="animation: fadeInUp 0.75s ease-out;">
                        <div class="section-title">คะแนนในห้องนี้</div>
                        <div class="table-responsive">
                            <table class="grades-table">
                                <thead>
                                    <tr><th>โปรเจกต์</th><th>คะแนน</th><th>ความคิดเห็น</th></tr>
                                </thead>
                                <tbody>
                                    ${grades.map(g => `
                                        <tr>
                                            <td>${this._esc(g.project_title || '-')}</td>
                                            <td><span class="grade-badge">${g.score}/${g.max_score}</span></td>
                                            <td>${this._esc(g.comment || '-')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>` : ''}

                    <!-- Skills / Learning Objectives -->
                    <div class="dashboard-section" style="animation: fadeInUp 0.8s ease-out;">
                        <div class="section-title">ทักษะและวัตถุประสงค์การเรียนรู้</div>

                        <!-- ภารกิจส่วนตัว — ช่องของตัวเอง ไม่ผูกกับห้องไหน
                             ผู้ดูแลเล็งให้ในห้องได้ต่างหาก สองอย่างไม่ทับกัน -->
                        ${this._myFocusSection(skills)}

                        <div class="skills-list">
                            ${skills.length > 0 ? skills.map(s => `
                                <div class="skill-item">
                                    <div class="skill-name">${this._esc(s.name)}</div>
                                    <span class="skill-status ${this._skillClass(s.status)}">${this._skillLabel(s.status)}</span>
                                    ${s.auto_detectable ? `
                                    <button class="project-btn"
                                        onclick="Dashboard.setFocus(${s.id}, null)"
                                        title="ตั้งเป็นภารกิจที่จะเก็บต่อไป">เน้นอันนี้</button>` : ''}
                                </div>
                            `).join('') : '<div class="empty-state">ยังไม่มีข้อมูลทักษะ กด Run ที่ Workspace หนึ่งครั้ง ระบบจะเริ่มนับให้</div>'}
                        </div>
                    </div>

                    <!-- Achievements -->
                    <div class="dashboard-section" style="animation: fadeInUp 0.9s ease-out;">
                        <div class="section-title">ความสำเร็จ</div>
                        <div class="achievements-grid">
                            ${achievements.length > 0 ? achievements.map(a => `
                                <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" title="${this._esc(a.description || '')}">
                                    <div class="achievement-icon">${MetoIcons.achievement(a.condition_type)}</div>
                                    <div class="achievement-name">${this._esc(a.name)}</div>
                                    ${a.unlocked && a.unlocked_at ? `<div class="achievement-date">${this._formatDate(a.unlocked_at)}</div>` : ''}
                                </div>
                            `).join('') : '<div class="empty-state">ยังไม่มีความสำเร็จ บันทึกงานชิ้นแรกเพื่อปลดเหรียญใบแรก</div>'}
                        </div>
                    </div>`}
                </div>
            </div>
        `;

        this._animateStatValues();
        this._animateChartBars();

        // Grading form hook (teacher section)
        const studentSelect = document.getElementById('grade-student');
        if (studentSelect) {
            studentSelect.addEventListener('change', () => this._loadStudentProjects());
        }
    },

    // ===================== รหัสเข้าร่วมห้อง (หน้าห้องที่ตัวเองเป็นผู้ดูแล) =====================
    // ผู้ดูแลต้องเห็นรหัสทุกครั้งที่เปิดห้อง ไม่ใช่เห็นแค่ตอนสร้างครั้งเดียว
    // ไม่งั้นสร้างห้องเสร็จแล้วบอกรหัสให้สมาชิกไม่ได้ ห้องก็ว่างเปล่าตลอดไป
    // ปุ่มเปิด/ปิดรับสมาชิกกับเก็บถาวรมาอยู่ตรงนี้ด้วย เพราะหน้านี้ไม่แสดงรายการห้องทั้งหมด
    _roomCodeBar(room) {
        if (!room || !room.invite_code) return '';
        const code = this._esc(room.invite_code);
        const usable = room.is_active && room.is_open;
        const hint = usable
            ? 'ให้สมาชิกเข้าหน้าแดชบอร์ด แล้วกรอกรหัสนี้ในช่อง "เข้าร่วมห้อง"'
            : (room.is_active
                ? 'ตอนนี้ปิดรับสมาชิก รหัสนี้จะยังใช้เข้าห้องไม่ได้จนกว่าจะกดเปิดรับสมาชิก'
                : 'ห้องนี้เก็บถาวรแล้ว ต้องเปิดห้องอีกครั้งก่อนจึงจะรับสมาชิกใหม่ได้');

        return `
            <div class="room-code-bar ${usable ? '' : 'room-code-closed'}" style="animation: fadeInUp 0.45s ease-out;">
                <div class="room-code-main">
                    <span class="room-code-label">รหัสเข้าร่วมห้องนี้</span>
                    <span class="room-code-value">${code}</span>
                    <button class="copy-btn room-code-copy" onclick="Dashboard.copyCode('${code}', this)"
                        title="คัดลอกรหัสไปชวนสมาชิก">คัดลอกรหัส</button>
                </div>
                <div class="room-code-hint">${hint}</div>
                <div class="room-code-actions">
                    ${room.is_active ? `
                        <button class="project-btn" onclick="Dashboard.setClassroomFlag(${room.id}, 'is_open', ${!room.is_open})">
                            ${room.is_open ? 'ปิดรับสมาชิก' : 'เปิดรับสมาชิก'}
                        </button>
                        <button class="project-btn" onclick="Dashboard.setClassroomFlag(${room.id}, 'is_active', false)"
                            title="เก็บห้องนี้ไว้เป็นประวัติ ข้อมูลยังอยู่ครบ">เก็บถาวร</button>
                    ` : `
                        <button class="project-btn" onclick="Dashboard.setClassroomFlag(${room.id}, 'is_active', true)">เปิดห้องอีกครั้ง</button>
                    `}
                </div>
            </div>`;
    },

    // ===================== แถบสถิติของห้อง (หน้าห้องของผู้ดูแล) =====================
    // การ์ดใหญ่ 4 ใบสูงเกือบ 300px กินครึ่งจอแรกไปกับตัวเลขที่แค่ "รู้ไว้"
    // ผู้ดูแลเปิดหน้าห้องมาเพื่อสั่งงาน/ให้คะแนน/ดูรายชื่อ — ของพวกนั้นต้องอยู่ในจอแรก
    // จึงย่อเหลือแถบเดียวสูง ~70px ใช้ลายเดียวกับ .mini-stat ที่มีอยู่แล้ว
    /** สถิติของตัวเอง — แถบเตี้ยแบบเดียวกับหน้าห้องผู้ดูแล (65px แทนการ์ดใหญ่ 154px) */
    _myStatsStrip(stats) {
        const s = stats || {};
        return `
            <div class="stats-row" style="animation: fadeInUp 0.45s ease-out;">
                ${this._miniStatItem(MetoIcons.play(), 'รันโค้ด', s.run_count || 0, 'tone-1')}
                ${this._miniStatItem(MetoIcons.blocks(), 'บล็อกที่ใช้', s.block_count || 0, 'tone-2')}
                ${this._miniStatItem(MetoIcons.chat(), 'ถาม AI', s.ai_count || 0, 'tone-3')}
                ${this._miniStatItem(MetoIcons.folder(), 'โปรเจกต์', s.project_count || 0, 'tone-4')}
            </div>`;
    },

    _miniStatItem(icon, label, value, tone) {
        return `
            <div class="mini-stat ${tone}">
                <span class="mini-stat-icon">${icon}</span>
                <div>
                    <div class="mini-stat-value">${value}</div>
                    <div class="mini-stat-label">${label}</div>
                </div>
            </div>`;
    },

    _roomStatsStrip(teacher) {
        const s = (teacher && teacher.stats) || {};
        const item = (icon, label, value, tone) => `
            <div class="mini-stat ${tone}">
                <span class="mini-stat-icon">${icon}</span>
                <div>
                    <div class="mini-stat-value">${value}</div>
                    <div class="mini-stat-label">${label}</div>
                </div>
            </div>`;
        return `
            <div class="stats-row" style="animation: fadeInUp 0.45s ease-out;">
                ${item(MetoIcons.users(), 'สมาชิกในห้อง', s.total_students || 0, 'tone-1')}
                ${item(MetoIcons.active(), 'เข้าใช้วันนี้', s.active_today || 0, 'tone-2')}
                ${item(MetoIcons.play(), 'รันโค้ดวันนี้', s.runs_today || 0, 'tone-3')}
                ${item(MetoIcons.chat(), 'ถาม AI วันนี้', s.ai_today || 0, 'tone-4')}
            </div>`;
    },

    // ===================== รายชื่อสมาชิก แบบคอลัมน์ขวา =====================
    // ตารางเดิม 8 คอลัมน์กว้างเกินกว่าจะยัดลงคอลัมน์ขวา จึงยุบเป็นรายการแนวตั้ง
    // ของที่ต้องใช้ตอนเช็คชื่อยังอยู่ครบ: เลขที่แก้ได้ในบรรทัด · กดที่แถวเพื่อดูรายละเอียด · เอาออก
    _teacherRoster(teacher) {
        const students = teacher.students || [];
        return `
            <div class="dashboard-section" style="animation: fadeInUp 0.55s ease-out;">
                <div class="section-title-row">
                    <div class="section-title">
                        รายชื่อสมาชิก
                        <span class="roster-count">${students.length} คน</span>
                    </div>
                    ${students.length > 1 ? `
                    <select class="roster-sort" onchange="Dashboard.sortTable(this.value)"
                            title="เรียงลำดับรายชื่อ">
                        <option value="student_no">เรียงตามเลขที่</option>
                        <option value="display_name">เรียงตามชื่อ</option>
                        <option value="last_active">เข้าใช้ล่าสุด</option>
                        <option value="skill_progress">ความคืบหน้าทักษะ</option>
                    </select>` : ''}
                </div>
                ${students.length > 0 ? `
                <div class="roster-list">
                    ${students.map((s, i) => `
                        <div class="roster-row" onclick="Dashboard.viewStudentDetail(${s.id})" title="กดเพื่อดูรายละเอียดสมาชิก">
                            <input class="student-no-input roster-no" type="text" maxlength="10"
                                value="${this._esc(s.student_no || '')}" placeholder="${i + 1}"
                                title="เลขที่ในห้อง พิมพ์แล้วกด Enter เพื่อบันทึก"
                                onclick="event.stopPropagation()"
                                onkeydown="if(event.key==='Enter'){Dashboard.saveStudentNo(${s.id}, this.value, this)}"
                                onblur="Dashboard.saveStudentNo(${s.id}, this.value, this)">
                            <div class="roster-body">
                                <div class="roster-name">
                                    ${this._esc(s.display_name || s.username)}
                                    ${this._focusChip(s.focus)}
                                </div>
                                <div class="roster-meta">
                                    <span>${this._formatDate(s.last_active)}</span>
                                    <span>Run ${s.run_count || 0}</span>
                                    <span>AI ${s.ai_count || 0}</span>
                                    <span class="tutorial-badge ${this._tutorialClass(s.tutorial_status)}">${this._tutorialLabel(s.tutorial_status)}</span>
                                    ${(s.attention || []).map(a =>
                                        `<span class="attention-chip">${this._esc(a)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="roster-skill" title="ความคืบหน้าทักษะ ${s.skill_progress || 0}%">
                                <div class="skill-bar-mini">
                                    <div class="skill-bar-fill" style="width: ${s.skill_progress || 0}%"></div>
                                </div>
                                <span class="skill-pct">${s.skill_progress || 0}%</span>
                            </div>
                            <button class="roster-remove"
                                onclick="event.stopPropagation(); Dashboard.removeStudent(${s.id}, '${this._esc(s.display_name || s.username)}')"
                                title="เอาออกจากห้อง งานและคะแนนเดิมยังอยู่ครบ">&times;</button>
                        </div>
                    `).join('')}
                </div>` : '<div class="empty-state">ยังไม่มีสมาชิกในห้อง แชร์รหัสเข้าร่วมด้านบนให้สมาชิกของคุณ</div>'}
            </div>`;
    },

    // ภาพรวมทักษะของทั้งห้อง — เป็นข้อมูล "ของสมาชิก" จึงอยู่คอลัมน์เดียวกับรายชื่อ
    _skillOverviewSection(teacher) {
        const skillOverview = teacher.skill_overview || [];
        if (!skillOverview.length) return '';
        return `
            <div class="dashboard-section" style="animation: fadeInUp 0.65s ease-out;">
                <div class="section-title">ภาพรวมทักษะสมาชิก</div>
                <div class="table-responsive">
                    <table class="skill-overview-table grades-table">
                        <thead>
                            <tr>
                                <th>วัตถุประสงค์</th>
                                <th class="text-center">เชี่ยวชาญ</th>
                                <th class="text-center">กำลังเรียน</th>
                                <th class="text-center">ยังไม่เริ่ม</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skillOverview.map(s => `
                                <tr>
                                    <td>${this._esc(s.name)}</td>
                                    <td class="text-center"><span class="count-mastered">${s.mastered || 0}</span></td>
                                    <td class="text-center"><span class="count-progress">${s.in_progress || 0}</span></td>
                                    <td class="text-center"><span class="count-not-started">${s.not_started || 0}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    // ===================== CLASSROOM SECTION (ทุกคน) =====================
    _classroomSection(joined, owned) {
        return `
            <div class="dashboard-section" style="animation: fadeInUp 0.5s ease-out;">
                <div class="section-title-row">
                    <div class="section-title">ห้องของฉัน</div>
                    <button class="btn-add" onclick="Dashboard.showCreateClassroom()">+ สร้างห้อง</button>
                </div>
                <div id="create-classroom-area"></div>

                <!-- Join by code -->
                <form class="join-classroom-form" onsubmit="Dashboard.joinClassroom(event)">
                    <span class="join-icon">${MetoIcons.door()}</span>
                    <input type="text" id="join-code-input" placeholder="กรอกรหัสเข้าร่วมห้อง เช่น AB12CD" maxlength="6" autocomplete="off">
                    <button type="submit" class="btn-primary btn-sm">เข้าร่วม</button>
                    <span id="join-status" class="grade-status"></span>
                </form>

                ${owned.length > 0 ? `
                <div class="room-group-label">${MetoIcons.crown()} ห้องที่ฉันสร้าง (ฉันดูแลเอง)</div>
                <div class="classrooms-list">
                    ${owned.map(c => `
                        <div class="classroom-card owned ${c.is_active ? '' : 'archived'}">
                            <div class="classroom-info">
                                <div class="classroom-name">
                                    ${this._esc(c.name)}
                                    ${this._termLabel(c) ? `<span class="due-chip">${this._termLabel(c)}</span>` : ''}
                                    ${c.is_active ? '' : '<span class="due-chip">เก็บถาวรแล้ว</span>'}
                                    ${c.is_active && !c.is_open ? '<span class="due-chip due-soon">ปิดรับสมาชิก</span>' : ''}
                                </div>
                                <div class="classroom-meta">
                                    <span class="classroom-students">${c.student_count || 0} คน</span>
                                    <!-- โชว์รหัสเสมอ แม้ห้องปิดรับสมาชิก ผู้ดูแลต้องหารหัสห้องตัวเองเจอตลอด
                                         สถานะห้องบอกด้วยชิปข้างชื่อห้องอยู่แล้ว -->
                                    <span class="classroom-code">
                                        รหัสเข้าร่วม: <strong>${this._esc(c.invite_code)}</strong>
                                        <button class="copy-btn" onclick="Dashboard.copyCode('${this._esc(c.invite_code)}', this)" title="คัดลอกรหัส">คัดลอก</button>
                                    </span>
                                </div>
                            </div>
                            <div class="classroom-actions">
                                ${c.is_active ? `
                                    <button class="project-btn" onclick="Dashboard.setClassroomFlag(${c.id}, 'is_open', ${!c.is_open})">
                                        ${c.is_open ? 'ปิดรับสมาชิก' : 'เปิดรับสมาชิก'}
                                    </button>
                                    <button class="project-btn" onclick="Dashboard.setClassroomFlag(${c.id}, 'is_active', false)"
                                        title="เก็บห้องนี้ไว้เป็นประวัติ ข้อมูลยังอยู่ครบ">เก็บถาวร</button>
                                ` : `
                                    <button class="project-btn" onclick="Dashboard.setClassroomFlag(${c.id}, 'is_active', true)">เปิดห้องอีกครั้ง</button>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                ${joined.length > 0 ? `
                <div class="room-group-label">${MetoIcons.users()} ห้องที่ฉันเข้าร่วม (ฉันเป็นสมาชิก)</div>
                <div class="classrooms-list">
                    ${joined.map(c => `
                        <div class="classroom-card">
                            <div class="classroom-info">
                                <div class="classroom-name">
                                    ${this._esc(c.name)}
                                    ${this._termLabel(c) ? `<span class="due-chip">${this._termLabel(c)}</span>` : ''}
                                    ${c.student_no ? `<span class="due-chip">เลขที่ ${this._esc(c.student_no)}</span>` : ''}
                                </div>
                                <div class="classroom-meta">
                                    <span>ผู้ดูแล: ${this._esc(c.teacher_name)}</span>
                                    <span class="project-date">เข้าร่วมเมื่อ ${this._formatDate(c.joined_at)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                ${(owned.length === 0 && joined.length === 0) ?
                    '<div class="empty-state">ยังไม่มีห้อง สร้างห้องเพื่อเป็นผู้ดูแล หรือกรอกรหัสเพื่อเข้าร่วมเป็นสมาชิก</div>' : ''}
            </div>`;
    },

    // ===================== STUDENT ASSIGNMENTS (ภารกิจจากผู้ดูแล) =====================
    // ป้ายระดับ — ตอนนี้เป็นข้อมูลเสริมที่ผู้ดูแลจะใส่หรือไม่ใส่ก็ได้
    // ผู้ดูแลที่เขียนภารกิจเองส่วนใหญ่ไม่ได้แบ่งบทเรียนเป็น 3 ระดับแบบชุดตัวอย่าง
    // ไม่มีค่า = ไม่ต้องแสดงป้ายเปล่า ๆ
    _levelBadge(level) {
        if (!level) return '';
        const map = {
            'Sequential': { label: 'ระดับ 1 · เรียงลำดับ', cls: 'level-seq' },
            'If/Else': { label: 'ระดับ 2 · เงื่อนไข', cls: 'level-if' },
            'Loop': { label: 'ระดับ 3 · วนซ้ำ', cls: 'level-loop' },
        };
        const m = map[level] || { label: level, cls: 'level-seq' };
        return `<span class="level-badge ${m.cls}">${m.label}</span>`;
    },

    _studentAssignmentsSection(assignments, projects) {
        return `
            <div class="dashboard-section" style="animation: fadeInUp 0.55s ease-out;">
                <div class="section-title">ภารกิจจากผู้ดูแล</div>
                <div class="assignments-list">
                    ${assignments.map(a => `
                        <div class="assignment-card ${a.submitted ? 'submitted' : ''}">
                            <div class="assignment-head">
                                ${this._levelBadge(a.level)}
                                <span class="assignment-room">${this._esc(a.classroom_name)}</span>
                                ${this._dueBadge(a)}
                            </div>
                            <div class="assignment-title">${this._esc(a.title)}</div>
                            <div class="assignment-desc">${this._esc(a.description || '')}</div>
                            <div class="assignment-foot">
                                ${a.grade ? `
                                    <span class="grade-badge">ได้ ${a.grade.score}/${a.grade.max_score}</span>
                                    ${a.grade.comment ? `<span class="assignment-comment">"${this._esc(a.grade.comment)}"</span>` : ''}
                                ` : a.submitted ? `
                                    <span class="skill-status in-progress">ส่งแล้ว · รอผู้ดูแลตรวจ</span>
                                    <span class="project-date">${this._formatDate(a.submitted_at)}</span>
                                ` : `
                                    <span class="skill-status not-started">ยังไม่ส่ง</span>
                                `}
                                ${this._lateBadge(a.is_late)}
                                ${this._attemptBadge(a.attempt_no)}
                                <span style="flex:1;"></span>
                                <button class="project-btn" onclick="Router.navigate('#/workspace')">ทำภารกิจ</button>
                                <select id="submit-select-${a.id}" class="submit-select">
                                    <option value="">${projects.length ? 'เลือกงานที่จะส่ง' : 'ยังไม่มีงานที่บันทึกไว้'}</option>
                                    ${projects.map(p => `<option value="${p.id}" ${a.submitted_project_id === p.id ? 'selected' : ''}>${this._esc(p.title)}</option>`).join('')}
                                </select>
                                <button class="project-btn" onclick="Dashboard.submitAssignment(${a.id})">${a.submitted ? 'ส่งใหม่' : 'ส่งงาน'}</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    async submitAssignment(assignmentId) {
        const sel = document.getElementById('submit-select-' + assignmentId);
        const projectId = sel ? sel.value : '';
        if (!projectId) {
            alert('เลือกโปรเจกต์ที่จะส่งก่อนนะ (ถ้ายังไม่มี กดปุ่ม "บันทึก" ในหน้า Workspace ก่อน)');
            return;
        }
        try {
            const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ project_id: parseInt(projectId, 10) })
            });
            const data = await res.json();
            if (res.ok) {
                this.load();
            } else {
                alert(data.error || 'ส่งงานไม่สำเร็จ');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ===================== TEACHER SECTION — ฝั่งซ้าย "งาน" =====================
    // room = ห้องที่กำลังเปิดอยู่ (null ถ้าอยู่หน้าโปรไฟล์)
    // อยู่หน้าห้อง: ตัวเลขภาพรวมไปอยู่แถบบนสุด · รายชื่อสมาชิกกับภาพรวมทักษะไปอยู่คอลัมน์ขวา
    //              เหลือไว้ตรงนี้เฉพาะ "งาน" — สั่งภารกิจ กับ ให้คะแนน
    // หน้าโปรไฟล์: ไม่มีคอลัมน์ของห้อง จึงแสดงครบเหมือนเดิมทั้งก้อน
    _teacherSection(teacher, owned, room) {
        const stats = teacher.stats || {};
        const students = teacher.students || [];
        // กรองภารกิจตามห้องที่เปิดอยู่ — เซิร์ฟเวอร์ส่งภารกิจของทุกห้องที่เราเป็นเจ้าของมา
        // (dashboard.py วนทุกห้องใน owned) เดิมวาดทั้งก้อน ผู้ดูแลเปิดห้อง A เห็นภารกิจห้อง B ปนอยู่
        // ฝั่งสมาชิกกรองถูกมาตลอด — ไฟล์เดียวกันใช้กฎคนละแบบ
        const roomId = room && room.id;
        const assignments = (teacher.assignments || []).filter(
            a => !roomId || a.classroom_id === roomId
        );

        return `
            <!-- Teacher Stats เฉพาะหน้าโปรไฟล์ที่ยังไม่ได้เลือกห้อง -->
            ${room ? '' : `
            <div class="dashboard-section" style="animation: fadeInUp 0.55s ease-out;">
                <div class="section-title">มุมผู้ดูแล ภาพรวมห้องของฉัน</div>
                <div class="stats-grid stats-grid-flat">
                    ${this._miniStat(MetoIcons.users(), 'สมาชิกทั้งหมด', stats.total_students || 0)}
                    ${this._miniStat(MetoIcons.active(), 'เข้าใช้วันนี้', stats.active_today || 0)}
                    ${this._miniStat(MetoIcons.play(), 'รันโค้ดวันนี้', stats.runs_today || 0)}
                    ${this._miniStat(MetoIcons.chat(), 'ถาม AI วันนี้', stats.ai_today || 0)}
                </div>
            </div>`}

            <!-- Student Table หน้าห้องย้ายไปเป็นรายชื่อคอลัมน์ขวาแล้ว (_teacherRoster) -->
            ${room ? '' : `
            <div class="dashboard-section" style="animation: fadeInUp 0.6s ease-out;">
                <div class="section-title">รายชื่อสมาชิก</div>
                ${students.length > 0 ? `
                <div class="table-responsive">
                    <table class="student-table" id="student-table">
                        <thead>
                            <tr>
                                <th>เลขที่</th>
                                <th class="sortable" onclick="Dashboard.sortTable('display_name')">ชื่อ</th>
                                <th class="sortable" onclick="Dashboard.sortTable('last_active')">เข้าใช้</th>
                                <th class="sortable" onclick="Dashboard.sortTable('run_count')">Run</th>
                                <th class="sortable" onclick="Dashboard.sortTable('ai_count')">AI</th>
                                <th class="sortable" onclick="Dashboard.sortTable('skill_progress')">ทักษะ</th>
                                <th>สถานะบทเรียน</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.map((s, i) => `
                                <tr class="clickable-row" onclick="Dashboard.viewStudentDetail(${s.id})" title="คลิกดูรายละเอียด">
                                    <td onclick="event.stopPropagation()">
                                        <input class="student-no-input" type="text" maxlength="10"
                                            value="${this._esc(s.student_no || '')}" placeholder="${i + 1}"
                                            title="เลขที่ในห้อง พิมพ์แล้วกด Enter เพื่อบันทึก"
                                            onkeydown="if(event.key==='Enter'){Dashboard.saveStudentNo(${s.id}, this.value, this)}"
                                            onblur="Dashboard.saveStudentNo(${s.id}, this.value, this)">
                                    </td>
                                    <td><span class="student-name-link">${this._esc(s.display_name || s.username)}</span></td>
                                    <td>${this._formatDate(s.last_active)}</td>
                                    <td>${s.run_count || 0}</td>
                                    <td>${s.ai_count || 0}</td>
                                    <td>
                                        <div class="skill-bar-mini">
                                            <div class="skill-bar-fill" style="width: ${s.skill_progress || 0}%"></div>
                                        </div>
                                        <span class="skill-pct">${s.skill_progress || 0}%</span>
                                    </td>
                                    <td><span class="tutorial-badge ${this._tutorialClass(s.tutorial_status)}">${this._tutorialLabel(s.tutorial_status)}</span></td>
                                    <td onclick="event.stopPropagation()" style="white-space:nowrap;">
                                        <button class="project-btn project-btn-danger"
                                            onclick="Dashboard.removeStudent(${s.id}, '${this._esc(s.display_name || s.username)}')"
                                            title="เอาออกจากห้อง งานและคะแนนเดิมยังอยู่ครบ">เอาออก</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : '<div class="empty-state">ยังไม่มีสมาชิกในห้อง แชร์รหัสเข้าร่วมให้เพื่อนหรือสมาชิกของคุณ</div>'}
            </div>`}

            <!-- Assignments (teacher) -->
            <div class="dashboard-section" style="animation: fadeInUp 0.65s ease-out;">
                <div class="section-title-row">
                    <div class="section-title">ภารกิจที่มอบหมาย</div>
                    <button class="btn-add" onclick="Dashboard.showAssignTaskForm()">+ มอบภารกิจใหม่</button>
                </div>
                <div id="assign-task-area"></div>
                <div class="assignments-list">
                    ${assignments.length > 0 ? assignments.map(a => `
                        <div class="assignment-card">
                            <div class="assignment-head">
                                ${this._levelBadge(a.level)}
                                <span class="assignment-room">${this._esc(a.classroom_name)}</span>
                                ${a.due_date ? `<span class="due-chip ${a.overdue ? 'due-over' : ''}">กำหนดส่ง ${this._formatDateTime(a.due_date)}</span>` : ''}
                            </div>
                            <div class="assignment-title">${this._esc(a.title)}</div>
                            <div class="assignment-foot">
                                <span class="skill-status ${a.submission_count >= a.total_students && a.total_students > 0 ? 'mastered' : 'in-progress'}">
                                    ส่งแล้ว ${a.submission_count}/${a.total_students} คน
                                </span>
                                ${a.late_count > 0 ? `<span class="due-chip due-over">ส่งช้า ${a.late_count} คน</span>` : ''}
                                <span style="flex:1;"></span>
                                <!-- ให้คะแนนอยู่ที่การ์ดภารกิจเลย เพราะที่นี่คือที่ที่ผู้ดูแลรู้บริบทครบ
                                     (ภารกิจข้อไหน ใครส่งแล้ว ส่งช้าไหม) — ไม่ต้องไปเลือกจาก dropdown ลอย -->
                                <button class="btn-primary btn-sm"
                                    onclick="Dashboard.viewSubmissions(${a.id})"
                                    ${a.submission_count ? '' : 'disabled title="ยังไม่มีใครส่งงาน"'}
                                    >ตรวจ &amp; ให้คะแนน${a.submission_count ? ` (${a.submission_count})` : ''}</button>
                                <button class="project-btn project-btn-danger" onclick="Dashboard.deleteAssignment(${a.id})">ยกเลิกภารกิจ</button>
                            </div>
                        </div>
                    `).join('') : '<div class="empty-state">ยังไม่มีภารกิจ กด "มอบภารกิจใหม่" แล้วเขียนภารกิจของห้องนี้ได้เลย</div>'}
                </div>
            </div>

            ${students.length > 0 ? `
            <!-- ฟอร์มให้คะแนนลอย — ยุบไว้หลังปุ่ม
                 ทางนี้บังคับให้ผู้ดูแลเลือก สมาชิก -> โปรเจกต์ จาก dropdown
                 โดยไม่รู้ว่าโปรเจกต์ชิ้นไหนคืองานที่ส่งเข้าภารกิจข้อไหน ส่งตรงเวลาไหม
                 ทางที่ควรใช้คือกด "ดูงานที่ส่ง" ในการ์ดภารกิจ ซึ่งให้คะแนนได้ในตารางเลย
                 มีบริบทครบทั้งชื่อภารกิจ เวลาส่ง ครั้งที่ส่ง และสำเนางาน ณ เวลาส่ง
                 เก็บไว้เพราะยังจำเป็นตอนให้คะแนนงานที่ไม่ได้ส่งผ่านภารกิจ -->
            <div class="dashboard-section" style="animation: fadeInUp 0.7s ease-out;">
                <div class="section-title-row">
                    <div class="section-title">ให้คะแนน</div>
                    <button class="btn-add" onclick="Dashboard.toggleGradeForm(this)">+ ให้คะแนนแยก</button>
                </div>
                <div id="grade-form-area" class="hidden">
                <form class="grading-form" id="grading-form" onsubmit="Dashboard.submitGrade(event)">
                    <div class="form-row">
                        <div class="form-group-inline">
                            <label>สมาชิก</label>
                            <select id="grade-student" required>
                                <option value="">เลือกสมาชิก</option>
                                ${students.map(s => `<option value="${s.id}">${this._esc(s.display_name || s.username)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group-inline">
                            <label>โปรเจกต์</label>
                            <select id="grade-project" required>
                                <option value="">เลือกโปรเจกต์</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group-inline">
                            <label>คะแนน</label>
                            <div class="score-input-group">
                                <input type="number" id="grade-score" min="0" placeholder="0" required>
                                <span class="score-separator">/</span>
                                <input type="number" id="grade-max" min="1" value="10" required>
                            </div>
                        </div>
                        <div class="form-group-inline flex-grow">
                            <label>ความคิดเห็น</label>
                            <input type="text" id="grade-comment" placeholder="เขียนความคิดเห็น...">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary btn-submit">บันทึกคะแนน</button>
                        <span id="grade-status" class="grade-status"></span>
                    </div>
                </div>
            </div>

            <!-- Skill Overview — หน้าห้องย้ายไปคอลัมน์ขวาใต้รายชื่อแล้ว -->
            ${room ? '' : this._skillOverviewSection(teacher)}` : ''}
        `;
    },

    // ===================== HELPER METHODS =====================

    _esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _avatar(name, avatar) {
        // รูปโปรไฟล์ 3 แบบในค่าเดียว (ดูคอมเมนต์ที่ User.avatar_url)
        //   data:image/... = รูปที่ผู้ใช้อัปโหลดเอง
        //   face:xxx       = หน้าหุ่นที่ปลดล็อกแล้ว
        //   ว่าง           = ตัวอักษรแรกของชื่อ
        if (avatar && avatar.indexOf('data:image/') === 0) {
            return `<div class="avatar-circle avatar-photo"><img src="${avatar}" alt=""></div>`;
        }
        const face = avatar && avatar.indexOf('face:') === 0
            ? 'face_' + avatar.slice(5) : (avatar || null);
        if (face && face.indexOf('face_') === 0) {
            return `<div class="avatar-circle avatar-face">${this._faceCanvas(face)}</div>`;
        }
        const initial = (name || '?').charAt(0).toUpperCase();
        // สีหมวดบล็อกตาม THEME.md ข้อ 2.3 — เดิมใช้ม่วง/ชมพู/ฟ้านีออนซึ่งอยู่นอกพาเลต
        const colors = ['#4C97FF', '#9966FF', '#CF63CF', '#FFBF00', '#FF6680', '#00B4AB', '#59C059', '#FF8C1A'];
        const color = colors[initial.charCodeAt(0) % colors.length];
        return `<div class="avatar-circle" style="background: ${color};">${initial}</div>`;
    },

    // หน้าหุ่นแบบย่อ — ใช้ "โค้ดวาดหน้าหุ่นตัวจริง" จาก robot-sim.js
    // (renderRobotFace วาดด้วย FaceFrames ชุดเดียวกับจอ TFT ของหุ่นจริง)
    // ห้ามวาดอาร์ตชุดใหม่ ไม่งั้นจะกลายเป็นคนละหน้ากับที่เด็กเห็นในเกม
    // canvas ขนาดคงที่ 4:3 ตามจอ TFT จริง — ให้ CSS เป็นคนจัดว่าจะครอปหรือใส่พอดี
    // (รูปโปรไฟล์ = ครอปเต็มวง / ในตู้สะสม = เห็นทั้งหน้า) เหมือนรูปโปรไฟล์ทั่วไป
    _faceCanvas(key) {
        return `<canvas class="face-canvas" data-face="${key}" width="320" height="240"></canvas>`;
    },

    // วาดหน้าลงทุก canvas ที่เพิ่งใส่เข้า DOM
    _paintFaces(root) {
        if (typeof window.renderRobotFace !== 'function') return;
        (root || document).querySelectorAll('canvas.face-canvas').forEach(c => {
            if (c.dataset.painted) return;
            window.renderRobotFace(c, window.faceBlockToFrame(c.dataset.face));
            c.dataset.painted = '1';
        });
    },

    // ย่อรูปเป็นสี่เหลี่ยมจัตุรัสก่อนส่ง — ครอปตรงกลางแบบรูปโปรไฟล์ทั่วไป
    // ทำที่ฝั่งเว็บเพื่อไม่ต้องส่งไฟล์กล้อง 4MB ขึ้นเซิร์ฟเวอร์ผ่านเน็ตโรงเรียน
    _squareResize(file, size) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const side = Math.min(img.width, img.height);
                    const sx = (img.width - side) / 2;
                    const sy = (img.height - side) / 2;
                    const c = document.createElement('canvas');
                    c.width = c.height = size;
                    const g = c.getContext('2d');
                    g.imageSmoothingQuality = 'high';
                    g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                    resolve(c.toDataURL('image/jpeg', 0.72));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    },

    async _saveAvatar(value) {
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ avatar_url: value })
            });
            const d = await res.json();
            if (!res.ok) { alert(d.error || 'บันทึกรูปไม่สำเร็จ'); return false; }
            if (d.user && typeof Auth !== 'undefined') Auth.user = d.user;
            return true;
        } catch {
            alert('ต่อเซิร์ฟเวอร์ไม่ได้');
            return false;
        }
    },

    // ===================== หน้าหุ่นเป็นของสะสม =====================
    async showFacePicker() {
        const old = document.getElementById('face-picker');
        if (old) old.remove();

        let data = null;
        try {
            const res = await fetch('/api/faces', { headers: Auth.getHeaders() });
            if (res.ok) data = await res.json();
        } catch { /* ต่อไม่ได้ */ }
        if (!data || !data.faces) return;

        const gotCount = data.faces.filter(f => f.unlocked).length;
        const wrap = document.createElement('div');
        wrap.id = 'face-picker';
        wrap.className = 'modal-overlay';
        wrap.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content face-picker-box">
                <button class="modal-close" aria-label="ปิด">&times;</button>
                <h2 class="modal-title">รูปโปรไฟล์</h2>

                <div class="avatar-upload">
                    <label class="btn-secondary btn-sm avatar-upload-btn">
                        <i class="material-icons">photo_camera</i> ใช้รูปของฉัน
                        <input type="file" accept="image/*" hidden id="avatar-file">
                    </label>
                    <button class="btn-cancel btn-sm" id="avatar-clear">ใช้ตัวอักษรแทน</button>
                    <span class="avatar-upload-hint">รูปจะถูกย่อเป็นสี่เหลี่ยมจัตุรัสให้อัตโนมัติ</span>
                </div>

                <h3 class="face-section-title">หรือเลือกหน้าหุ่นที่ปลดล็อกแล้ว</h3>
                <p class="face-picker-hint">
                    ปลดล็อกแล้ว ${gotCount}/${data.faces.length} ใช้บล็อกหน้าไหนในงานแล้วกด Run จะได้หน้านั้นเก็บไว้
                </p>
                <div class="face-grid">
                    ${data.faces.map(f => `
                        <button class="face-item${f.unlocked ? '' : ' is-locked'}${data.chosen === f.key ? ' is-on' : ''}"
                                data-key="${f.key}" ${f.unlocked ? '' : 'disabled'}
                                title="${f.unlocked ? 'เลือกเป็นรูปโปรไฟล์' : 'ยังไม่ปลดล็อก'}">
                            <span class="face-item-art">${this._faceCanvas(f.key)}</span>
                            <span class="face-item-label">${this._esc(f.label)}</span>
                        </button>`).join('')}
                </div>
            </div>`;
        document.body.appendChild(wrap);
        this._paintFaces(wrap);

        const close = () => wrap.remove();
        wrap.querySelector('.modal-close').onclick = close;
        wrap.querySelector('.modal-backdrop').onclick = close;

        // อัปโหลดรูปของตัวเอง
        const fileInput = wrap.querySelector('#avatar-file');
        if (fileInput) {
            fileInput.onchange = async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                if (!/^image\//.test(file.type)) { alert('เลือกได้เฉพาะไฟล์รูปนะ'); return; }
                try {
                    const dataUri = await this._squareResize(file, 160);
                    await this._saveAvatar(dataUri);
                    close();
                    this.load();
                } catch (e) {
                    alert('อ่านรูปไม่สำเร็จ ลองรูปอื่นดูนะ');
                }
            };
        }
        const clearBtn = wrap.querySelector('#avatar-clear');
        if (clearBtn) {
            clearBtn.onclick = async () => {
                await this._saveAvatar('');
                close();
                this.load();
            };
        }
        wrap.querySelectorAll('.face-item:not(.is-locked)').forEach(btn => {
            btn.onclick = async () => {
                const key = btn.dataset.key === data.chosen ? '' : btn.dataset.key;
                try {
                    await fetch('/api/faces/chosen', {
                        method: 'PUT', headers: Auth.getHeaders(),
                        body: JSON.stringify({ face: key })
                    });
                } catch { /* ต่อไม่ได้ */ }
                close();
                this.load();
            };
        });
    },

    // ===================== PHASE 3 HELPERS =====================

    // ป้ายกำหนดส่ง (ข้อ 3.1) — ใช้ชิปตาม THEME.md ข้อ 5.5 ไม่ใช้แดงดุกับเด็ก
    _dueBadge(assignment) {
        if (!assignment.due_date) return '';
        const due = this._toDate(assignment.due_date);
        if (!due) return '';
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const left = Math.ceil((due - now) / dayMs);
        const text = this._formatDateTime(assignment.due_date);

        if (assignment.submitted) {
            return `<span class="due-chip due-done">กำหนดส่ง ${text}</span>`;
        }
        if (left < 0) {
            return `<span class="due-chip due-over">เลยกำหนดแล้ว · ${text}</span>`;
        }
        if (left <= 2) {
            return `<span class="due-chip due-soon">เหลืออีก ${left === 0 ? 'วันนี้' : left + ' วัน'} · ${text}</span>`;
        }
        return `<span class="due-chip">กำหนดส่ง ${text}</span>`;
    },

    _lateBadge(isLate) {
        return isLate ? '<span class="due-chip due-over">ส่งช้า</span>' : '';
    },

    _attemptBadge(attemptNo) {
        return (attemptNo && attemptNo > 1)
            ? `<span class="due-chip">ส่งครั้งที่ ${attemptNo}</span>` : '';
    },

    // ป้ายบอกว่างานเข้าเกณฑ์ขั้นต่ำของภารกิจแล้วหรือยัง (ข้อ 4.5)
    // เป็นตัวช่วยผู้ดูแล ไม่ใช่การตัดสินแทนผู้ดูแล — จึงใช้โทนเตือน ไม่ใช่แดงดุ
    _goalBadge(goalCheck) {
        if (!goalCheck) return '';
        if (goalCheck.met) return '<span class="due-chip due-done">ตรงเกณฑ์ภารกิจ</span>';
        const missing = (goalCheck.missing || []).join(', ');
        return `<span class="due-chip due-soon" title="ยังขาด: ${this._esc(missing)}">ยังไม่ครบเกณฑ์</span>`;
    },

    _termLabel(c) {
        const parts = [];
        if (c.semester) parts.push(`เทอม ${this._esc(c.semester)}`);
        if (c.academic_year) parts.push(`ปี ${this._esc(c.academic_year)}`);
        return parts.join(' · ');
    },

    // เซิร์ฟเวอร์เก็บเวลาเป็น UTC แบบไม่มี timezone ต่อท้าย
    // ถ้าโยนเข้า new Date() ตรงๆ เบราว์เซอร์จะอ่านเป็นเวลาท้องถิ่น → เพี้ยนไป 7 ชั่วโมง
    _toDate(iso) {
        if (!iso) return null;
        const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso);
        const d = new Date(hasZone ? iso : iso + 'Z');
        return isNaN(d) ? null : d;
    },

    // แปลงค่าจาก <input type="datetime-local"> (เวลาท้องถิ่น) เป็น UTC ISO ก่อนส่งขึ้นเซิร์ฟเวอร์
    _localInputToUtc(value) {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d) ? null : d.toISOString();
    },

    _formatDateTime(iso) {
        const d = this._toDate(iso);
        if (!d) return '-';
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
            + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    },

    // toneClass = tone-1..4 (โทนสีตาม THEME.md ข้อ 5.3 — วงกลมสีบนการ์ดขาว)
    _statCard(iconSvg, label, value, toneClass, index) {
        return `
            <div class="stat-card ${toneClass}" style="animation: fadeInUp ${0.3 + index * 0.1}s ease-out;">
                <div class="stat-icon">${iconSvg}</div>
                <div class="stat-value" data-target="${value}">0</div>
                <div class="stat-label">${label}</div>
            </div>`;
    },

    _miniStat(iconSvg, label, value) {
        return `
            <div class="mini-stat">
                <span class="mini-stat-icon">${iconSvg}</span>
                <div>
                    <div class="mini-stat-value">${value}</div>
                    <div class="mini-stat-label">${label}</div>
                </div>
            </div>`;
    },

    _formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = this._toDate(dateStr);
            if (!d) return '-';
            const now = new Date();
            const diffMs = now - d;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'เมื่อสักครู่';
            if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        } catch {
            return dateStr;
        }
    },

    _buildActivityChart(activity) {
        const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = activity.find(a => a.date === dateStr);
            chartData.push({
                label: days[date.getDay()],
                count: found ? found.count : 0,
                dateStr: dateStr
            });
        }

        const maxCount = Math.max(...chartData.map(c => c.count), 1);

        return chartData.map(c => {
            const heightPct = Math.max((c.count / maxCount) * 100, 4);
            return `
                <div class="chart-col">
                    <div class="chart-value">${c.count}</div>
                    <div class="chart-bar" data-height="${heightPct}" style="height: 0%;" title="${c.dateStr}: ${c.count} ครั้ง"></div>
                    <div class="chart-label">${c.label}</div>
                </div>`;
        }).join('');
    },

    _skillClass(status) {
        if (status === 'mastered') return 'mastered';
        if (status === 'in_progress') return 'in-progress';
        return 'not-started';
    },

    _skillLabel(status) {
        if (status === 'mastered') return 'เชี่ยวชาญ';
        if (status === 'in_progress') return 'กำลังเรียน';
        return 'ยังไม่เริ่ม';
    },

    /** ความคืบหน้าสู่เกณฑ์เชี่ยวชาญ แบบที่ผู้ดูแลอ่านได้ — "2/3" + แถบ
     *
     * ตัวเลขชุดเดียวกับที่ฝั่งสมาชิกแสดงเป็นดาว (clean_run_count / mastery_threshold)
     * ผู้ดูแลต้องเห็นเป็นตัวเลขเพราะเอาไปกรอกเล่มและตัดสินใจสอนซ่อมได้ ไม่ใช่ดูสวย
     */
    _masteryMeter(objective) {
        if (!objective || objective.clean_run_count === undefined) return '';
        const max = objective.mastery_threshold || 3;
        const done = objective.status === 'mastered';
        const count = done ? max : Math.max(0, Math.min(objective.clean_run_count || 0, max));
        const pct = max ? Math.round((count / max) * 100) : 0;

        // ทักษะที่ระบบตรวจเองไม่ได้ ไม่มีตัวนับให้ดู บอกไปตรงๆ ว่าผู้ดูแลเป็นคนประเมิน
        if (objective.auto_detectable === false) {
            return `<span class="mastery-meter mastery-manual">ผู้ดูแลประเมินเอง</span>`;
        }

        return `
            <span class="mastery-meter" title="รันสำเร็จ ${count} จาก ${max} ครั้งที่ใช้เป็นเกณฑ์">
                <span class="mastery-bar"><span style="width:${pct}%"></span></span>
                <span class="mastery-count">${count}/${max}</span>
                ${objective.changed_by === 'TEACHER' ? '<span class="mastery-by">ผู้ดูแลปรับเอง</span>' : ''}
            </span>`;
    },

    _tutorialClass(status) {
        if (status === 'completed') return 'completed';
        if (status === 'in_progress') return 'in-progress';
        return 'not-started';
    },

    _tutorialLabel(status) {
        if (status === 'completed') return 'เสร็จแล้ว';
        if (status === 'in_progress') return 'กำลังทำ';
        if (status === 'skipped') return 'ข้ามไป';
        return 'ยังไม่เริ่ม';
    },

    // ===================== ANIMATIONS =====================

    _animateStatValues() {
        document.querySelectorAll('.stat-value[data-target]').forEach(el => {
            const target = parseInt(el.dataset.target, 10) || 0;
            if (target === 0) { el.textContent = '0'; return; }
            const duration = 1200;
            const startTime = performance.now();
            const animate = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - (1 - progress) * (1 - progress);
                el.textContent = Math.floor(eased * target);
                if (progress < 1) requestAnimationFrame(animate);
                else el.textContent = target;
            };
            requestAnimationFrame(animate);
        });
    },

    _animateChartBars() {
        setTimeout(() => {
            document.querySelectorAll('.chart-bar[data-height]').forEach((bar, i) => {
                setTimeout(() => {
                    bar.style.height = bar.dataset.height + '%';
                }, i * 80);
            });
        }, 300);
    },

    // ===================== ACTIONS =====================

    async openProject(projectId) {
        // โหลดโปรเจกต์เข้า Workspace (ฟังก์ชันอยู่ใน script.js)
        if (typeof ProjectStore !== 'undefined') {
            await ProjectStore.openFromServer(projectId);
        } else {
            Router.navigate('#/workspace');
        }
    },

    async deleteProject(projectId, btn) {
        if (!confirm('ลบโปรเจกต์นี้ใช่ไหม? ลบแล้วกู้คืนไม่ได้นะ')) return;
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: Auth.getHeaders()
            });
            if (res.ok) {
                this.load();
            } else {
                alert('ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    async copyCode(code, btn) {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'คัดลอกแล้ว!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        }
    },

    showCreateClassroom() {
        const area = document.getElementById('create-classroom-area');
        if (area.innerHTML.trim()) {
            area.innerHTML = '';
            return;
        }
        // ปีการศึกษาไทย = ค.ศ. + 543
        const thaiYear = new Date().getFullYear() + 543;
        area.innerHTML = `
            <form class="create-classroom-form" onsubmit="Dashboard.createClassroom(event)">
                <input type="text" id="new-classroom-name" placeholder="ชื่อห้อง" required>
                <label class="inline-field-label" for="new-classroom-semester">เทอม</label>
                <select id="new-classroom-semester" class="inline-field">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="">ไม่ระบุ</option>
                </select>
                <label class="inline-field-label" for="new-classroom-year">ปีการศึกษา</label>
                <input type="text" id="new-classroom-year" class="inline-field" style="width:76px;"
                       value="${thaiYear}" maxlength="4" inputmode="numeric">
                <button type="submit" class="btn-primary btn-sm">สร้าง</button>
                <button type="button" class="btn-cancel" onclick="document.getElementById('create-classroom-area').innerHTML=''">ยกเลิก</button>
            </form>`;
        document.getElementById('new-classroom-name').focus();
    },

    async createClassroom(e) {
        e.preventDefault();
        const name = document.getElementById('new-classroom-name').value.trim();
        if (!name) return;
        const semesterEl = document.getElementById('new-classroom-semester');
        const yearEl = document.getElementById('new-classroom-year');

        try {
            const res = await fetch('/api/classrooms', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    name,
                    semester: semesterEl ? semesterEl.value : '',
                    academic_year: yearEl ? yearEl.value.trim() : '',
                })
            });
            if (res.ok) {
                // เข้าไปหน้าห้องที่เพิ่งสร้างเลย — ผู้ดูแลจะได้เห็นรหัสเข้าร่วมทันทีโดยไม่ต้องไปตามหา
                const data = await res.json().catch(() => ({}));
                const newRoom = data.classroom || {};
                if (newRoom.id) this.goTo(`#/dashboard/room/${newRoom.id}`);
                else this.load(); // Reload dashboard — คุณกลายเป็นผู้ดูแลของห้องนี้แล้ว
            } else {
                const data = await res.json();
                alert(data.error || 'ไม่สามารถสร้างห้องได้');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // เก็บ/เปิดห้อง หรือเปิด-ปิดรับสมาชิก (ข้อ 3.7)
    async setClassroomFlag(classroomId, field, value) {
        if (field === 'is_active' && value === false) {
            if (!confirm('เก็บห้องนี้เข้าที่เก็บถาวรใช่ไหม? สมาชิกจะไม่เห็นห้องนี้แล้ว แต่ข้อมูลทั้งหมดยังอยู่ครบ และเปิดห้องกลับมาใช้ใหม่ได้ทุกเมื่อ')) return;
        }
        try {
            const res = await fetch(`/api/classrooms/${classroomId}`, {
                method: 'PATCH',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) this.load();
            else alert((await res.json()).error || 'แก้ไขไม่สำเร็จ');
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // เอาสมาชิกออกจากห้อง (ข้อ 3.6)
    async removeStudent(studentId, displayName) {
        const roomId = this._selectedClassroomId;
        if (!roomId) { alert('ยังไม่ได้เลือกห้อง'); return; }
        if (!confirm(`เอา "${displayName}" ออกจากห้องนี้ใช่ไหม?\n\nงานที่ส่งและคะแนนเดิมยังอยู่ครบ ถ้าเข้าห้องใหม่ด้วยรหัสเดิมจะกลับมาที่เดิม`)) return;
        try {
            const res = await fetch(`/api/classrooms/${roomId}/students/${studentId}`, {
                method: 'DELETE',
                headers: Auth.getHeaders()
            });
            if (res.ok) this.load();
            else alert((await res.json()).error || 'เอาออกไม่สำเร็จ');
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ตั้งเลขที่ในห้อง (ข้อ 3.6)
    async saveStudentNo(studentId, value, inputEl) {
        const roomId = this._selectedClassroomId;
        if (!roomId) return;
        const trimmed = (value || '').trim();
        if (inputEl && inputEl.dataset.saved === trimmed) return;
        try {
            const res = await fetch(`/api/classrooms/${roomId}/students/${studentId}`, {
                method: 'PATCH',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ student_no: trimmed })
            });
            if (res.ok && inputEl) {
                inputEl.dataset.saved = trimmed;
                inputEl.classList.add('saved-flash');
                setTimeout(() => inputEl.classList.remove('saved-flash'), 600);
            }
        } catch { /* เงียบ — ไม่รบกวนการกรอกทั้งห้อง */ }
    },

    async joinClassroom(e) {
        e.preventDefault();
        const input = document.getElementById('join-code-input');
        const statusEl = document.getElementById('join-status');
        const code = (input.value || '').trim().toUpperCase();
        if (!code) return;

        statusEl.textContent = 'กำลังเข้าร่วม...';
        statusEl.className = 'grade-status saving';

        try {
            const res = await fetch('/api/classrooms/join', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ invite_code: code })
            });
            const data = await res.json();
            if (res.ok) {
                statusEl.textContent = 'เข้าร่วมสำเร็จ!';
                statusEl.className = 'grade-status success';
                setTimeout(() => this.load(), 600);
            } else {
                statusEl.textContent = data.error || 'เข้าร่วมไม่สำเร็จ';
                statusEl.className = 'grade-status error';
            }
        } catch {
            statusEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
            statusEl.className = 'grade-status error';
        }
    },

    // Sort student table
    _sortField: null,
    _sortAsc: true,
    _teacherStudents: [],

    sortTable(field) {
        if (this._sortField === field) {
            this._sortAsc = !this._sortAsc;
        } else {
            this._sortField = field;
            this._sortAsc = true;
        }

        // เทียบเป็นตัวเลขเฉพาะค่าที่เป็นตัวเลขล้วนทั้งคู่ (เลขที่เก็บเป็นข้อความ '2' กับ '10')
        // ใช้ regex เข้ม ไม่ใช่ parseFloat เพราะวันที่ '2026-08-06...' จะกลายเป็น 2026 หมด
        const isNum = v => /^-?\d+(\.\d+)?$/.test(String(v == null ? '' : v).trim());

        const students = [...(this.data.teacher?.students || [])];
        students.sort((a, b) => {
            let va = a[field], vb = b[field];
            // คนที่ยังไม่ได้ตั้งค่า (เช่น ยังไม่มีเลขที่) ไปท้ายเสมอ ไม่ว่าจะเรียงขึ้นหรือลง
            const ea = va == null || va === '';
            const eb = vb == null || vb === '';
            if (ea || eb) return ea && eb ? 0 : (ea ? 1 : -1);
            if (isNum(va) && isNum(vb)) return this._sortAsc ? va - vb : vb - va;
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return this._sortAsc ? -1 : 1;
            if (va > vb) return this._sortAsc ? 1 : -1;
            return 0;
        });

        this.data.teacher.students = students;
        this.render();
    },

    async _loadStudentProjects() {
        const studentId = document.getElementById('grade-student').value;
        const projectSelect = document.getElementById('grade-project');
        projectSelect.innerHTML = '<option value="">กำลังโหลด...</option>';

        if (!studentId) {
            projectSelect.innerHTML = '<option value="">เลือกสมาชิกก่อน</option>';
            return;
        }

        try {
            const res = await fetch(`/api/students/${studentId}/projects`, {
                headers: Auth.getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                const projects = data.projects || [];
                projectSelect.innerHTML = '<option value="">เลือกโปรเจกต์</option>' +
                    projects.map(p => `<option value="${p.id}">${this._esc(p.title || 'ไม่มีชื่อ')}</option>`).join('');
            } else {
                projectSelect.innerHTML = '<option value="">ไม่พบโปรเจกต์</option>';
            }
        } catch {
            projectSelect.innerHTML = '<option value="">เกิดข้อผิดพลาด</option>';
        }
    },

    // ===================== MODAL SYSTEM =====================

    _openModal(html) {
        this._closeModal();
        const overlay = document.createElement('div');
        overlay.id = 'dash-modal';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-backdrop" onclick="Dashboard._closeModal()"></div>
            <div class="modal-content dash-modal-content">
                <button class="modal-close" onclick="Dashboard._closeModal()">&times;</button>
                ${html}
            </div>`;
        document.body.appendChild(overlay);
    },

    _closeModal() {
        const m = document.getElementById('dash-modal');
        if (m) m.remove();
    },

    // ===================== TEACHER: ASSIGN TASK =====================

    async showAssignTaskForm() {
        const area = document.getElementById('assign-task-area');
        if (area.innerHTML.trim()) { area.innerHTML = ''; return; }

        area.innerHTML = '<div class="meto-load meto-load--inline"><span class="meto-spin"></span><span>กำลังโหลด...</span></div>';
        try {
            const res = await fetch('/api/assignments/objectives', { headers: Auth.getHeaders() });
            const data = await res.json();
            const objectives = data.objectives || [];
            const rooms = this._ownedRooms;

            // ชนิดบล็อกที่ตั้งเป็นเกณฑ์ผ่านได้ — เซิร์ฟเวอร์เป็นเจ้าของรายการนี้
            // (ค่าสำรองด้านล่างใช้ตอนเซิร์ฟเวอร์ไม่ส่งมา เช่นโหมด demo)
            const blockChoices = (data.blocks && data.blocks.length)
                ? data.blocks.map(b => [b.key, b.label])
                : [
                ['start_program', 'บล็อก START PROGRAM'],
                ['move_forward', 'เดินหน้า'],
                ['move_backward', 'ถอยหลัง'],
                ['turn_', 'เลี้ยว (ซ้ายหรือขวา)'],
                ['arm_', 'คำสั่งแขน'],
                ['hand_', 'คำสั่งมือ'],
                ['head_', 'คำสั่งหัว'],
                ['face_', 'คำสั่งหน้าตา'],
                ['grip_', 'คำสั่งที่หนีบ'],
                ['sensor_', 'บล็อกเซนเซอร์ (ถือของ / ขอบโต๊ะ / หน้าคน)'],
                ['controls_if', 'บล็อก if'],
                ['controls_repeat_ext', 'บล็อก repeat'],
                ['controls_whileUntil', 'บล็อก while'],
                ['controls_forever', 'บล็อก repeat forever'],
                ['variables_set', 'ตั้งค่าตัวแปร'],
            ];

            area.innerHTML = `
                <form class="create-classroom-form assign-form assign-form-full" onsubmit="Dashboard.createAssignment(event)">
                    <!-- เลือกห้องที่ผู้ดูแลเปิดอยู่ไว้ให้ เดิมไม่มี selected ค่าเริ่มต้นจึงเป็น
                         ห้องแรกในลิสต์ ผู้ดูแลอยู่หน้าห้อง B กดมอบภารกิจแล้วภารกิจเข้าห้อง A โดยไม่รู้ตัว -->
                    <div class="assign-row">
                        <label class="inline-field-label" for="assign-room">ห้อง</label>
                        <select id="assign-room" class="inline-field" required>
                            ${rooms.map(r => `<option value="${r.id}"
                                ${r.id === this._selectedClassroomId ? 'selected' : ''}
                                >${this._esc(r.name)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- ผู้ดูแลเขียนภารกิจเองทั้งหมด ตัวอย่างเป็นแค่ปุ่มลัดให้กรอกฟอร์มให้ -->
                    <div class="assign-row">
                        <label class="inline-field-label" for="assign-title">หัวข้อภารกิจ</label>
                        <input type="text" id="assign-title" class="inline-field" maxlength="200" required
                               placeholder="เช่น ให้หุ่นเดินอ้อมสิ่งกีดขวางแล้วกลับมาที่เดิม">
                    </div>
                    <div class="assign-row">
                        <label class="inline-field-label" for="assign-desc">คำอธิบาย / คำใบ้</label>
                        <textarea id="assign-desc" class="inline-field" rows="3" maxlength="500"
                                  placeholder="อธิบายให้เด็กเข้าใจว่าต้องทำอะไร จะใส่คำใบ้ด้วยก็ได้ (ไม่ใส่ก็ได้)"></textarea>
                    </div>

                    <div class="assign-row">
                        <label class="inline-field-label" for="assign-due">กำหนดส่ง</label>
                        <input type="datetime-local" id="assign-due" class="inline-field"
                               title="เว้นว่างได้ถ้าภารกิจนี้ไม่มีเดดไลน์">
                    </div>

                    <!-- เกณฑ์ผ่านอัตโนมัติ ไม่ตั้งก็ได้ ผู้ดูแลตรวจเอง -->
                    <details class="assign-goal-box">
                        <summary>เกณฑ์ผ่านอัตโนมัติ <span class="assign-optional">(ไม่ตั้งก็ได้ ผู้ดูแลตรวจเอง)</span></summary>
                        <div class="assign-goal-hint">
                            ตั้งไว้แล้วเด็กจะเห็นเช็กลิสต์ติ๊กเขียวเองตอนลากบล็อกในหน้า Workspace
                            และระบบจะบอกผู้ดูแลว่างานที่ส่งมาผ่านเกณฑ์หรือยัง
                        </div>
                        <div class="assign-block-grid">
                            ${blockChoices.map(([k, label]) => `<label class="assign-block-check">
                                <input type="checkbox" class="assign-req-block" value="${k}"> ${label}</label>`).join('')}
                        </div>
                        <div class="research-grid">
                            <label class="inline-field-label" for="assign-min-cmd">จำนวนคำสั่งขั้นต่ำ</label>
                            <input type="number" id="assign-min-cmd" class="inline-field" min="0" max="100" placeholder="ไม่กำหนด">
                            <label class="inline-field-label" for="assign-loop-body">คำสั่งใน loop อย่างน้อย</label>
                            <input type="number" id="assign-loop-body" class="inline-field" min="0" max="50" placeholder="ไม่กำหนด">
                        </div>
                    </details>

                    <!-- เป้าหมายทักษะของภารกิจ เดิมระบบเดาเอง ผู้ดูแลไม่เคยได้พูด
                         ติ๊กช่องล่างแล้วเด็กทั้งห้องจะเห็นภารกิจนี้บนแผนที่ทันที -->
                    <details class="assign-goal-box">
                        <summary>ภารกิจข้อนี้ฝึกทักษะอะไร <span class="assign-optional">(ไม่ระบุก็ได้)</span></summary>
                        <div class="research-grid">
                            <label class="inline-field-label" for="assign-objective">ทักษะ</label>
                            <select class="inline-field" id="assign-objective">
                                <option value="">ไม่ระบุ ให้ระบบเดาจากบล็อกที่ต้องใช้</option>
                                ${objectives.map(o =>
                                    `<option value="${o.id}">${this._esc(o.name)}</option>`).join('')}
                            </select>

                            <label class="inline-field-label" for="assign-stars">เป้าหมาย</label>
                            <select class="inline-field" id="assign-stars">
                                <option value="1">1 ดาว แค่ให้ลองใช้เป็น</option>
                                <option value="2">2 ดาว ใช้ได้คล่องขึ้น</option>
                                <option value="3" selected>3 ดาว เชี่ยวชาญ</option>
                            </select>
                        </div>
                        <label class="assign-focus-check">
                            <input type="checkbox" id="assign-set-focus">
                            ตั้งเป็นภารกิจให้สมาชิกทั้งห้องด้วย
                            <span class="assign-focus-hint">
                                เด็กจะเห็นภารกิจนี้บนแผนที่และเปลี่ยนเองไม่ได้จนกว่าจะเก็บดาวถึงเป้า ทับภารกิจเดิมของห้องนี้ที่เด็กตั้งไว้
                            </span>
                        </label>
                    </details>

                    <div class="assign-actions">
                        <button type="submit" class="btn-primary btn-sm">มอบหมาย</button>
                        <button type="button" class="btn-cancel" onclick="document.getElementById('assign-task-area').innerHTML=''">ยกเลิก</button>
                    </div>
                </form>`;

        } catch {
            area.innerHTML = '<div class="empty-state">โหลดฟอร์มไม่สำเร็จ</div>';
        }
    },

    async createAssignment(e) {
        e.preventDefault();
        const classroomId = document.getElementById('assign-room').value;
        const title = (document.getElementById('assign-title').value || '').trim();
        const description = (document.getElementById('assign-desc').value || '').trim();
        if (!title) { alert('ใส่หัวข้อภารกิจด้วยนะ'); return; }

        const dueEl = document.getElementById('assign-due');
        // ผู้ดูแลกรอกเป็นเวลาท้องถิ่น ต้องแปลงเป็น UTC ก่อนส่ง ไม่งั้นเดดไลน์เลื่อนไป 7 ชั่วโมง
        const dueDate = dueEl ? this._localInputToUtc(dueEl.value) : null;
        const objectiveId = (document.getElementById('assign-objective') || {}).value || '';
        const stars = (document.getElementById('assign-stars') || {}).value || '';
        const setFocus = !!(document.getElementById('assign-set-focus') || {}).checked;

        // เกณฑ์ผ่าน — ไม่ติ๊กอะไรเลยก็ส่ง null ไป แปลว่าผู้ดูแลตรวจเอง
        const reqBlocks = Array.from(document.querySelectorAll('.assign-req-block'))
            .filter(cb => cb.checked).map(cb => cb.value);
        const minCmd = parseInt((document.getElementById('assign-min-cmd') || {}).value, 10);
        const loopBody = parseInt((document.getElementById('assign-loop-body') || {}).value, 10);
        const goal = {};
        if (reqBlocks.length) goal.required_blocks = reqBlocks;
        if (minCmd > 0) goal.min_commands = minCmd;
        if (loopBody > 0) goal.needs_loop_body = loopBody;

        try {
            const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    classroom_id: parseInt(classroomId, 10),
                    title: title,
                    description: description || null,
                    goal: Object.keys(goal).length ? goal : null,
                    due_date: dueDate,
                    objective_id: objectiveId ? parseInt(objectiveId, 10) : null,
                    target_stars: stars ? parseInt(stars, 10) : null,
                    // ไม่ระบุทักษะก็เล็งภารกิจให้ใครไม่ได้ — เซิร์ฟเวอร์เช็คซ้ำอยู่แล้ว
                    set_focus_for_class: setFocus && !!objectiveId,
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.focused_students) {
                    ProjectStore._toast
                        ? ProjectStore._toast(`ตั้งภารกิจให้สมาชิก ${data.focused_students} คนแล้ว`)
                        : alert(`ตั้งภารกิจให้สมาชิก ${data.focused_students} คนแล้ว`);
                }
                this.load();
            } else {
                alert(data.error || 'มอบภารกิจไม่สำเร็จ');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    async deleteAssignment(assignmentId) {
        if (!confirm('ยกเลิกภารกิจนี้ใช่ไหม? งานที่สมาชิกส่งมาแล้วจะหายไปด้วย')) return;
        try {
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: Auth.getHeaders()
            });
            if (res.ok) this.load();
            else alert('ยกเลิกไม่สำเร็จ');
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ===================== TEACHER: VIEW SUBMISSIONS =====================

    async viewSubmissions(assignmentId) {
        try {
            const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดข้อมูลไม่สำเร็จ'); return; }
            const data = await res.json();
            const a = data.assignment;
            const subs = data.submissions || [];

            this._openModal(`
                <h2 class="modal-title">${this._esc(a.title)}</h2>
                <p class="assignment-desc" style="margin-bottom:16px;">${this._esc(a.description || '')}
                   <br>ส่งแล้ว ${subs.length}/${data.total_students} คน
                   ${a.due_date ? `· กำหนดส่ง ${this._formatDateTime(a.due_date)}` : ''}</p>
                ${subs.length > 0 ? `
                <div class="table-responsive">
                    <table class="grades-table">
                        <thead><tr><th>สมาชิก</th><th>งาน</th><th>ส่งเมื่อ</th><th>คะแนน</th><th></th></tr></thead>
                        <tbody>
                            ${subs.map(s => `
                                <tr>
                                    <td>${this._esc(s.student_name)}</td>
                                    <td>
                                        ${this._esc(s.project_title)}
                                        ${this._attemptBadge(s.attempt_no)}
                                    </td>
                                    <td>
                                        ${this._formatDateTime(s.submitted_at)}
                                        ${this._lateBadge(s.is_late)}
                                        ${this._goalBadge(s.goal_check)}
                                    </td>
                                    <td>
                                        <span class="score-input-group">
                                            <input type="number" min="0" step="0.5" id="sub-score-${s.id}"
                                                value="${s.grade ? s.grade.score : ''}" placeholder="0" style="width:56px;">
                                            <span class="score-separator">/</span>
                                            <input type="number" min="1" step="0.5" id="sub-max-${s.id}"
                                                value="${s.grade ? s.grade.max_score : 10}" style="width:52px;">
                                        </span>
                                    </td>
                                    <td style="white-space:nowrap;">
                                        <button class="project-btn" onclick="Dashboard.viewSubmissionSnapshot(${s.id}, ${assignmentId})"
                                            title="ดูผังบล็อก ณ เวลาที่สมาชิกกดส่ง">ดูงานที่ส่ง</button>
                                        <button class="project-btn" style="margin-left:6px;"
                                            onclick="Dashboard.gradeSubmission(${s.id}, ${s.student_id}, ${s.project_id}, ${assignmentId})">
                                            ${s.grade ? 'แก้คะแนน' : 'ให้คะแนน'}</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : '<div class="empty-state">ยังไม่มีใครส่งงาน</div>'}
            `);
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ดูสิ่งที่สมาชิก "กดส่ง" จริง ไม่ใช่สิ่งที่แก้ล่าสุด (ข้อ 3.4)
    async viewSubmissionSnapshot(submissionId, assignmentId) {
        try {
            const res = await fetch(`/api/submissions/${submissionId}/snapshot`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดงานที่ส่งไม่สำเร็จ'); return; }
            const d = await res.json();
            const s = d.submission || {};
            const xml = s.blockly_xml_snapshot;

            this._openModal(`
                <h2 class="modal-title">งานที่ส่ง: ${this._esc(d.project_title || '')}</h2>
                <div class="assignment-desc" style="margin-bottom:14px;">
                    ส่งเมื่อ ${this._formatDateTime(s.submitted_at)}
                    ${this._attemptBadge(s.attempt_no)} ${this._lateBadge(s.is_late)}
                </div>
                ${d.project_changed_after_submit ? `
                    <div class="notice-box notice-warn">
                        สมาชิกแก้โปรเจกต์ต่อหลังกดส่ง ด้านล่างคือผังบล็อก
                        <strong>ณ เวลาที่กดส่ง</strong> ซึ่งเป็นสิ่งที่ควรใช้ตรวจ
                    </div>` : ''}
                ${xml ? `
                    <div class="snapshot-summary">${this._snapshotSummary(xml)}</div>
                    <details class="snapshot-raw">
                        <summary>ดูผังบล็อกแบบเต็ม (XML)</summary>
                        <pre>${this._esc(xml)}</pre>
                    </details>
                ` : `
                    <div class="notice-box">
                        งานชิ้นนี้ส่งก่อนระบบเก็บสำเนาจะเริ่มใช้ จึงไม่มีสำเนา ณ เวลาส่ง
                        เปิดดูโปรเจกต์ปัจจุบันแทนได้ แต่อาจถูกแก้ไปแล้ว
                    </div>`}
                <div class="form-actions" style="margin-top:16px;">
                    <button class="project-btn" onclick="Dashboard.openStudentProject(${s.project_id})">เปิดโปรเจกต์ปัจจุบัน</button>
                    <button class="btn-cancel" onclick="Dashboard.viewSubmissions(${assignmentId})">กลับไปรายชื่อ</button>
                </div>
            `);
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // เส้นทางพัฒนาการทักษะรายบุคคล (ข้อ 4.4)
    async viewObjectiveHistory(studentId, studentName) {
        try {
            const res = await fetch(`/api/students/${studentId}/objectives/history`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดประวัติไม่สำเร็จ'); return; }
            const history = (await res.json()).history || [];

            this._openModal(`
                <h2 class="modal-title">เส้นทางทักษะ: ${this._esc(studentName)}</h2>
                <div class="notice-box">
                    ตารางสถานะบอกได้แค่ "ตอนนี้อยู่ตรงไหน" ตารางนี้บอกว่า "เดินทางมายังไง"
                    ใช้ดูว่าสมาชิกคนนี้ติดอยู่ที่ทักษะไหนนานผิดปกติหรือเปล่า
                </div>
                ${history.length > 0 ? `
                <div class="table-responsive">
                    <table class="grades-table">
                        <thead><tr><th>เมื่อ</th><th>ทักษะ</th><th>เปลี่ยนเป็น</th><th>รันสะอาด</th><th>โดย</th></tr></thead>
                        <tbody>
                            ${history.map(h => `
                                <tr>
                                    <td>${this._formatDateTime(h.changed_at)}</td>
                                    <td>${this._esc(h.objective_name || '-')}</td>
                                    <td><span class="skill-status ${this._skillClass(this._statusKey(h.new_status))}">
                                        ${this._skillLabel(this._statusKey(h.new_status))}</span></td>
                                    <td>${h.clean_run_count ?? '-'}</td>
                                    <td><span class="due-chip">${h.changed_by === 'TEACHER' ? 'ผู้ดูแลปรับเอง' : 'ระบบตรวจอัตโนมัติ'}</span></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>` : '<div class="empty-state">ยังไม่มีการเปลี่ยนสถานะทักษะ</div>'}
                <div class="form-actions" style="margin-top:16px;">
                    <button class="btn-cancel" onclick="Dashboard.viewStudentDetail(${studentId})">กลับ</button>
                </div>
            `);
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    _statusKey(status) {
        return { COMPLETED: 'mastered', IN_PROGRESS: 'in_progress', NOT_STARTED: 'not_started' }[status]
            || 'not_started';
    },

    // บทสนทนากับผู้ช่วย AI (ข้อ 4.1)
    async viewConversations(studentId, studentName) {
        try {
            const res = await fetch(`/api/students/${studentId}/ai-conversations`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดบทสนทนาไม่สำเร็จ'); return; }
            const d = await res.json();
            const sessions = d.sessions || [];

            this._openModal(`
                <h2 class="modal-title">บทสนทนา AI: ${this._esc(studentName)}</h2>
                <div class="assignment-desc" style="margin-bottom:14px;">
                    ${d.session_count} ครั้งที่คุย · ${d.turn_count} ข้อความ
                </div>
                ${sessions.length > 0 ? sessions.map((s, i) => `
                    <details class="snapshot-raw" ${i === sessions.length - 1 ? 'open' : ''}>
                        <summary>ครั้งที่ ${i + 1} · ${s.turns.length} ข้อความ ·
                            ${this._formatDateTime(s.turns[0] && s.turns[0].created_at)}</summary>
                        <div class="transcript">
                            ${s.turns.map(t => `
                                <div class="transcript-turn transcript-${t.role}">
                                    <span class="due-chip">${t.role === 'user' ? 'สมาชิก' : 'เมโต้'}</span>
                                    <div class="transcript-text">${this._esc(t.message_text)}</div>
                                </div>`).join('')}
                        </div>
                    </details>`).join('')
                : '<div class="empty-state">ยังไม่เคยคุยกับผู้ช่วย AI</div>'}
                <div class="form-actions" style="margin-top:16px;">
                    <button class="btn-cancel" onclick="Dashboard.viewStudentDetail(${studentId})">กลับ</button>
                </div>
            `);
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // สรุปว่าในสำเนามีบล็อกชนิดไหนกี่อัน — อ่านง่ายกว่าอ่าน XML ดิบ
    _snapshotSummary(xml) {
        try {
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            if (doc.querySelector('parsererror')) return 'อ่านผังบล็อกไม่ได้';
            const counts = {};
            doc.querySelectorAll('block').forEach(b => {
                const t = b.getAttribute('type');
                if (t) counts[t] = (counts[t] || 0) + 1;
            });
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (!entries.length) return 'ไม่มีบล็อกในงานชิ้นนี้';
            const total = entries.reduce((n, [, c]) => n + c, 0);
            return `<div class="snapshot-total">ทั้งหมด ${total} บล็อก</div>`
                + entries.map(([t, c]) => `<span class="due-chip">${this._esc(t)} × ${c}</span>`).join('');
        } catch {
            return 'อ่านผังบล็อกไม่ได้';
        }
    },

    async gradeSubmission(submissionId, studentId, projectId, assignmentId) {
        const input = document.getElementById('sub-score-' + submissionId);
        const maxInput = document.getElementById('sub-max-' + submissionId);
        const score = input ? parseFloat(input.value) : NaN;
        const maxScore = maxInput ? parseFloat(maxInput.value) : 10;
        if (isNaN(score)) { alert('ใส่คะแนนก่อนนะ'); return; }
        if (isNaN(maxScore) || maxScore <= 0) { alert('คะแนนเต็มต้องมากกว่า 0'); return; }
        if (score > maxScore) { alert('คะแนนมากกว่าคะแนนเต็มไม่ได้นะ'); return; }
        try {
            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    student_id: studentId,
                    project_id: projectId,
                    // ผูกคะแนนกับงานที่ส่งชิ้นนี้ ไม่ใช่แค่โปรเจกต์ (ข้อ 3.2)
                    submission_id: submissionId,
                    score: score,
                    max_score: maxScore,
                    comment: '',
                })
            });
            if (res.ok) {
                this.viewSubmissions(assignmentId); // refresh modal
            } else {
                const data = await res.json();
                alert(data.error || 'ให้คะแนนไม่สำเร็จ');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    openStudentProject(projectId) {
        this._closeModal();
        if (typeof ProjectStore !== 'undefined') {
            ProjectStore.openFromServer(projectId);
        }
    },

    // ===================== ประวัติเวอร์ชันของงาน (ข้อ 3.5) =====================

    async viewProjectVersions(projectId) {
        try {
            const res = await fetch(`/api/projects/${projectId}/versions`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดประวัติไม่สำเร็จ'); return; }
            const d = await res.json();
            const versions = d.versions || [];

            this._openModal(`
                <h2 class="modal-title">ประวัติงาน: ${this._esc(d.project.title || '')}</h2>
                <p class="assignment-desc" style="margin-bottom:14px;">
                    ทุกครั้งที่กดบันทึกแล้วบล็อกเปลี่ยน ระบบจะเก็บสำเนาไว้ให้
                    แก้งานแล้วพังก็กดกู้กลับได้
                </p>
                ${versions.length > 0 ? `
                <div class="table-responsive">
                    <table class="grades-table">
                        <thead><tr><th>เวอร์ชัน</th><th>บันทึกเมื่อ</th><th>จำนวนบล็อก</th><th></th></tr></thead>
                        <tbody>
                            ${versions.map((v, i) => `
                                <tr>
                                    <td>
                                        <strong>v${v.version_no}</strong>
                                        ${i === 0 ? '<span class="due-chip due-done">ล่าสุด</span>' : ''}
                                    </td>
                                    <td>${this._formatDateTime(v.created_at)}</td>
                                    <td>${v.block_count == null ? '-' : v.block_count}</td>
                                    <td style="white-space:nowrap;">
                                        ${i === 0 ? '' : `<button class="project-btn"
                                            onclick="Dashboard.restoreProjectVersion(${projectId}, ${v.id}, ${v.version_no})">กู้กลับ</button>`}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : '<div class="empty-state">ยังไม่มีประวัติ บันทึกงานอีกครั้งแล้วจะเริ่มเก็บให้</div>'}
            `);
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    async restoreProjectVersion(projectId, versionId, versionNo) {
        if (!confirm(`กู้งานกลับไปเป็นเวอร์ชัน v${versionNo} ใช่ไหม?\n\nงานปัจจุบันจะถูกเก็บเป็นเวอร์ชันใหม่ก่อน กู้แล้วยังย้อนกลับได้อีก`)) return;
        try {
            const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, {
                method: 'POST',
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert((await res.json()).error || 'กู้กลับไม่สำเร็จ'); return; }
            this._closeModal();
            this.load();
            // แจ้งผลด้วย snackbar ลอยกลางบน ตาม THEME.md ข้อ 5.8
            if (typeof ProjectStore !== 'undefined' && ProjectStore._toast) {
                ProjectStore._toast(`กู้งานกลับเป็น v${versionNo} แล้ว`);
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    // ===================== TEACHER: STUDENT DETAIL =====================

    async viewStudentDetail(studentId) {
        try {
            // ส่งห้องที่กำลังเปิดไปด้วย ภารกิจจะได้เป็นของห้องนี้ ไม่ใช่ห้องอื่นของเรา
            const roomQuery = this._selectedClassroomId
                ? `?classroom_id=${this._selectedClassroomId}` : '';
            const res = await fetch(`/api/students/${studentId}/detail${roomQuery}`, {
                headers: Auth.getHeaders()
            });
            if (!res.ok) { alert('โหลดข้อมูลสมาชิกไม่สำเร็จ'); return; }
            const d = await res.json();
            const st = d.student || {};
            const objectives = d.objectives || [];
            const projects = d.projects || [];
            const grades = d.grades || [];

            const stats = d.stats || {};
            const name = st.display_name || st.username;

            this._openModal(`
                <h2 class="modal-title">${this._esc(name)}</h2>

                <div class="export-actions" style="margin-bottom:16px;">
                    <span class="due-chip">รันโค้ด ${stats.run_count || 0} ครั้ง</span>
                    <span class="due-chip">ใช้บล็อกรวม ${stats.block_count || 0}</span>
                    <span class="due-chip">ถาม AI ${stats.ai_count || 0} ครั้ง</span>
                    <span style="flex:1;"></span>
                    <button class="project-btn" onclick="Dashboard.viewObjectiveHistory(${studentId}, '${this._esc(name)}')"
                        title="ดูว่าผ่านทักษะแต่ละอันเมื่อไหร่">เส้นทางทักษะ</button>
                    <button class="project-btn" onclick="Dashboard.viewConversations(${studentId}, '${this._esc(name)}')"
                        title="บทสนทนากับผู้ช่วย AI">บทสนทนา AI</button>
                    <button class="project-btn project-btn-danger"
                        onclick="Dashboard._closeModal(); Dashboard.removeStudent(${studentId}, '${this._esc(name)}')"
                        title="เอาออกจากห้อง งานและคะแนนเดิมยังอยู่ครบ">เอาออกจากห้อง</button>
                </div>

                <div class="section-title" style="font-size:15px;">กิจกรรม 7 วันล่าสุด</div>
                <div class="chart-container" style="height:110px; margin-bottom:18px;">
                    ${this._buildActivityChart(d.activity_chart || [])}
                </div>

                ${this._focusEditor(studentId, objectives, d.focus)}

                <div class="section-title" style="font-size:15px;">ทักษะ (กดเพื่อปรับสถานะ)</div>
                <div class="notice-box">
                    การกดปรับสถานะที่นี่คือ "ตัดสินแทนระบบ" ทักษะนั้นจะหยุดนับดาวอัตโนมัติถาวร
                    ถ้าแค่อยากให้เด็กไปเน้นทักษะไหน ให้ตั้งภารกิจข้างบนแทน ระบบจะยังนับดาวให้เอง
                </div>
                <div class="skills-list" style="margin-bottom:18px;">
                    ${objectives.map(o => `
                        <div class="skill-item">
                            <div class="skill-name">
                                ${this._esc(o.name)}
                                ${this._masteryMeter(o)}
                            </div>
                            <div class="override-group">
                                ${['not_started', 'in_progress', 'mastered'].map(sKey => `
                                    <button class="override-btn ${o.status === sKey ? 'active ' + this._skillClass(sKey) : ''}"
                                        onclick="Dashboard.overrideObjective(${studentId}, ${o.id}, '${sKey}', this)">
                                        ${this._skillLabel(sKey)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="section-title" style="font-size:15px;">โปรเจกต์ (${projects.length})</div>
                <div class="projects-list" style="margin-bottom:18px; max-height:180px; overflow-y:auto;">
                    ${projects.length > 0 ? projects.map(p => `
                        <div class="project-item">
                            <div class="project-info">
                                <div class="project-title">${this._esc(p.title)}</div>
                                <div class="project-date">${this._formatDate(p.updated_at)}</div>
                            </div>
                            <button class="project-btn" onclick="Dashboard.openStudentProject(${p.id})">ดูงาน</button>
                        </div>
                    `).join('') : '<div class="empty-state">ยังไม่มีโปรเจกต์</div>'}
                </div>

                <div class="section-title" style="font-size:15px;">คะแนนที่เคยได้</div>
                ${grades.length > 0 ? `
                    <div>${grades.map(g => `<span class="grade-badge" style="margin:0 6px 6px 0; display:inline-block;">${g.score}/${g.max_score}</span>`).join('')}</div>
                ` : '<div class="empty-state">ยังไม่มีคะแนน</div>'}
            `);

            this._animateChartBars();
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    /** ภารกิจของฉัน — ทั้งที่ตั้งเอง และที่ผู้ดูแลแต่ละห้องเล็งให้
     *  ธีมปกติจึงไม่มีแผนที่ ใช้กล่องสรุปแทน (แผนที่เป็นของธีมเกม/หน้าห้องสมาชิก) */
    _myFocusSection(skills) {
        // แยกสองกลุ่มให้ชัด — เดิมรวมกันแล้วเกิดสองปัญหา:
        //   1. เด็กที่ผู้ดูแลเล็งให้แล้วแต่ยังไม่ได้เลือกเอง จะไม่เห็นคำชวนให้เลือกเลย
        //      เพราะ all.length ไม่เป็นศูนย์ ทั้งที่ช่องส่วนตัวยังว่าง
        //   2. ภารกิจของห้องปนกับภารกิจส่วนตัวในหน้าที่เป็นของบทบาท "ผู้ใช้"
        // ของผู้ดูแลยังโชว์อยู่แต่เป็นแบบอ่านอย่างเดียว เพราะเวิร์กสเปซไม่รู้ว่าเราอยู่ห้องไหน
        // เด็กต้องเห็นได้ที่เดียวว่ากำลังถูกเล็งอะไรอยู่บ้าง
        const all = this.data.focuses || [];
        const mine = all.filter(f => !f.classroom_id);
        const fromTeachers = all.filter(f => f.classroom_id);

        const emptyMine = `<div class="notice-box">
            ยังไม่ได้เลือกภารกิจของตัวเอง กด "เน้นอันนี้" ที่ทักษะไหนก็ได้ข้างล่าง
            แล้วผู้ช่วย AI จะช่วยเชียร์เรื่องนั้นเป็นพิเศษตอนเราเขียนโค้ด
        </div>`;

        const cards = list => `<div class="focus-list">
            ${list.map(f => {
                const pct = f.target_stars
                    ? Math.round((f.earned_stars || 0) / f.target_stars * 100) : 0;
                return `
                <div class="focus-card ${f.source === 'TEACHER' ? 'is-locked' : ''}">
                    <div class="focus-card-head">
                        <strong>${this._esc(f.objective_name)}</strong>
                        <span class="due-chip">${f.earned_stars || 0}/${f.target_stars} ดาว</span>
                        <span style="flex:1"></span>
                        ${f.source === 'TEACHER'
                            ? `<span class="due-chip">ผู้ดูแล${this._esc(f.set_by_name || '')} · ${this._esc(f.classroom_name || '')}</span>`
                            : `<button class="project-btn" onclick="Dashboard.cancelFocus(${f.id})">ยกเลิก</button>`}
                    </div>
                    <div class="skill-bar-mini"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
                    ${f.note ? `<div class="focus-note">ผู้ดูแลฝากบอก: "${this._esc(f.note)}"</div>` : ''}
                </div>`;
            }).join('')}
        </div>`;

        return `
            ${mine.length ? cards(mine) : emptyMine}
            ${fromTeachers.length ? `
                <div class="section-title" style="font-size:14px; margin-top:16px;">
                    ภารกิจจากผู้ดูแล
                </div>
                <div class="notice-box">
                    ตั้งจากห้อง เปลี่ยนที่นี่ไม่ได้ เข้าไปที่ห้องนั้นเพื่อดูแผนที่เต็ม
                </div>
                ${cards(fromTeachers)}` : ''}`;
    },

    /** ป้ายบอกว่าเด็กคนนี้ถูกเล็งภารกิจอะไรไว้ — ผู้ดูแลจะได้ไม่เล็งซ้ำหรือทับของตัวเอง */
    _focusChip(focus) {
        if (!focus) return '';
        const th = (typeof SKILL_STYLE !== 'undefined' && SKILL_STYLE[focus.objective_name])
            ? SKILL_STYLE[focus.objective_name].th : focus.objective_name;
        return `<span class="focus-chip" title="ทักษะที่เน้นให้คนนี้ฝึก: ได้ดาวแล้ว / ดาวที่ตั้งเป้าไว้">
            ${this._esc(th)} ${focus.earned_stars || 0}/${focus.target_stars}
        </span>`;
    },

    // ===================== ภารกิจโฟกัส (ฝั่งผู้ดูแล) =====================
    //
    // ไม่ใช่การสั่งงาน — ไม่มีงานให้ส่ง ไม่มีเดดไลน์ ไม่มีคะแนน
    // แค่บอกเด็กว่า "เอาอันนี้ก่อนนะ" แล้วล็อกไว้จนกว่าจะเก็บดาวถึงเป้า
    // ต่างจากปุ่มปรับสถานะตรงที่ระบบยังนับดาวเองเหมือนเดิม ผู้ดูแลไม่ได้ตัดสินแทน

    _focusEditor(studentId, objectives, current) {
        const roomId = this._selectedClassroomId;
        if (!roomId) return '';

        const cur = current || null;
        const opts = (objectives || []).map(o =>
            `<option value="${o.id}" ${cur && cur.objective_id === o.id ? 'selected' : ''}>
                ${this._esc(o.name)}</option>`).join('');

        return `
            <div class="section-title" style="font-size:15px;">ภารกิจที่ให้เน้น</div>
            ${cur ? `
            <div class="notice-box">
                กำลังเน้น <strong>${this._esc(cur.objective_name)}</strong>
                ได้ ${cur.earned_stars || 0}/${cur.target_stars} ดาว
                ${cur.source === 'TEACHER' ? '(ผู้ดูแลตั้ง เด็กเปลี่ยนเองไม่ได้)' : '(เด็กตั้งเอง)'}
                <button class="project-btn" style="margin-left:10px;"
                        onclick="Dashboard.clearStudentFocus(${cur.id}, ${studentId})">ยกเลิกภารกิจ</button>
            </div>` : `
            <div class="notice-box">ยังไม่ได้ตั้งภารกิจให้สมาชิกคนนี้ในห้องนี้</div>`}
            <div class="research-grid" style="margin-bottom:8px;">
                <label class="inline-field-label">ทักษะ</label>
                <select class="inline-field" id="focus-objective">${opts}</select>

                <label class="inline-field-label">เป้าหมาย</label>
                <select class="inline-field" id="focus-stars">
                    <option value="1">1 ดาว แค่ให้ลองใช้เป็น</option>
                    <option value="2">2 ดาว ใช้ได้คล่องขึ้น</option>
                    <option value="3" selected>3 ดาว เชี่ยวชาญ</option>
                </select>

                <label class="inline-field-label">ฝากบอก</label>
                <input class="inline-field" id="focus-note" type="text" maxlength="300"
                       placeholder="เช่น ลองใช้ลูปแทนการก๊อปบล็อกนะ (ไม่บังคับ)">
            </div>
            <div class="form-actions" style="margin-bottom:18px;">
                <button class="btn-primary btn-sm"
                        onclick="Dashboard.saveStudentFocus(${studentId})">ตั้งเป็นภารกิจ</button>
                <span id="focus-status" class="grade-status"></span>
            </div>`;
    },

    async saveStudentFocus(studentId) {
        const value = id => (document.getElementById(id) || {}).value || '';
        const status = document.getElementById('focus-status');
        try {
            const res = await fetch(`/api/students/${studentId}/focus`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    objective_id: parseInt(value('focus-objective'), 10),
                    classroom_id: this._selectedClassroomId,
                    target_stars: parseInt(value('focus-stars'), 10),
                    note: value('focus-note'),
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (status) status.textContent = body.error || 'ตั้งภารกิจไม่สำเร็จ';
                return;
            }
            this.viewStudentDetail(studentId);
            this.load();
        } catch {
            if (status) status.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
        }
    },

    async clearStudentFocus(focusId, studentId) {
        try {
            const res = await fetch(`/api/focus/${focusId}`, {
                method: 'DELETE', headers: Auth.getHeaders()
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { alert(body.error || 'ยกเลิกไม่สำเร็จ'); return; }
            this.viewStudentDetail(studentId);
            this.load();
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    async overrideObjective(studentId, objectiveId, statusKey, btn) {
        const statusMap = { not_started: 'NOT_STARTED', in_progress: 'IN_PROGRESS', mastered: 'COMPLETED' };
        try {
            const res = await fetch(`/api/objectives/${studentId}/${objectiveId}/override`, {
                method: 'PUT',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ status: statusMap[statusKey] })
            });
            if (res.ok) {
                // อัปเดตปุ่มในกลุ่มเดียวกัน
                const group = btn.closest('.override-group');
                group.querySelectorAll('.override-btn').forEach(b => b.className = 'override-btn');
                btn.className = 'override-btn active ' + this._skillClass(statusKey);
            } else {
                alert('ปรับสถานะไม่สำเร็จ');
            }
        } catch {
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    },

    /** เปิด/ปิดฟอร์มให้คะแนนแยก — ทางร้อนคือ "ดูงานที่ส่ง" ในการ์ดภารกิจ */
    toggleGradeForm(btn) {
        const area = document.getElementById('grade-form-area');
        if (!area) return;
        const open = area.classList.toggle('hidden');
        btn.textContent = open ? '+ ให้คะแนนแยก' : 'ปิด';
    },

    async submitGrade(e) {
        e.preventDefault();
        const studentId = document.getElementById('grade-student').value;
        const projectId = document.getElementById('grade-project').value;
        const score = document.getElementById('grade-score').value;
        const maxScore = document.getElementById('grade-max').value;
        const comment = document.getElementById('grade-comment').value;
        const statusEl = document.getElementById('grade-status');

        if (!studentId || !projectId) {
            statusEl.textContent = 'กรุณาเลือกสมาชิกและโปรเจกต์';
            statusEl.className = 'grade-status error';
            return;
        }

        statusEl.textContent = 'กำลังบันทึก...';
        statusEl.className = 'grade-status saving';

        try {
            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    student_id: parseInt(studentId, 10),
                    project_id: parseInt(projectId, 10),
                    // parseFloat ไม่ใช่ parseInt — คอลัมน์เป็น Numeric(5,2)
                    // ผู้ดูแลกรอก 7.5 แล้วกลายเป็น 7 เงียบๆ (อีกฟอร์มใช้ parseFloat อยู่แล้ว)
                    score: parseFloat(score),
                    max_score: parseFloat(maxScore),
                    // บอกห้องไปด้วย ไม่งั้นเซิร์ฟเวอร์ต้องเดา และเดาไม่ออกเมื่อเด็ก
                    // อยู่ 2 ห้องของผู้ดูแลคนเดียวกัน -> classroom_id เป็น NULL
                    // -> หน้าห้องกรองด้วย g.classroom_id === roomId -> คะแนนไม่โผล่เลย
                    classroom_id: this._selectedClassroomId || null,
                    comment: comment
                })
            });

            if (res.ok) {
                statusEl.textContent = 'บันทึกเรียบร้อย!';
                statusEl.className = 'grade-status success';
                document.getElementById('grading-form').reset();
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            } else {
                const data = await res.json();
                statusEl.textContent = (data.error || 'บันทึกไม่สำเร็จ');
                statusEl.className = 'grade-status error';
            }
        } catch {
            statusEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
            statusEl.className = 'grade-status error';
        }
    }
};
