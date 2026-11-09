// ==================== หน้าเลือกแดชบอร์ด + กติกาว่าจะแสดงมุมมองไหน ====================
//
// ระบบเป็น universal user — ทุกคน role = 'USER' เท่ากันหมด
// บทบาทผู้ดูแล/สมาชิกไม่ใช่คุณสมบัติของคน แต่เป็น "ความสัมพันธ์กับห้อง"
//   เจ้าของห้อง (ClassRoom.teacher_id) = ผู้ดูแลของห้องนั้น
//   สมาชิกห้อง  (ClassMembership)      = สมาชิกของห้องนั้น
//
// คนคนเดียวเป็นได้ทั้งสองอย่างพร้อมกัน (ผู้ดูแลที่ไปเข้าห้องผู้ดูแลคนอื่น / เด็กที่สร้างห้องติวเอง)
// จึงไม่ใช้ปุ่มสลับโหมดแบบ global เพราะนั่นคือการแกล้งทำเป็นว่าบทบาทเป็นของคน
// ใช้ "หน้าเลือกแดชบอร์ด" แทน — เลือกห้องไหนก็ได้บทบาทของห้องนั้น ตรงกับฐานข้อมูล
//
// เส้นทาง:
//   #/dashboard              เลือกให้อัตโนมัติ (hub / เกม / ปกติ)
//   #/dashboard/me           โปรไฟล์ของฉัน — ดาว โปรเจกต์ เหรียญ สถิติ (ข้อมูลที่ไม่ผูกกับห้อง)
//   #/dashboard/room/<id>    ห้องนั้น — บทบาทขึ้นกับว่าเราเป็นเจ้าของห้องหรือสมาชิก

Object.assign(Dashboard, {

    /** อ่าน hash + ข้อมูลที่โหลดมา แล้วสรุปว่าจะวาดหน้าไหน
     *
     * คืน { mode, classroomId, room }
     *   mode: 'HUB' | 'PLAYER' | 'NORMAL'
     *
     * ต้องทำงานได้ตั้งแต่ก่อน data มา (load() เรียกก่อน fetch เพื่อรู้ว่าจะขอห้องไหน)
     * ตอนนั้นให้ตอบเท่าที่ hash บอกได้ แล้วค่อยตอบเต็มตอน render()
     */
    getView() {
        const hash = window.location.hash || '';
        const roomMatch = hash.match(/^#\/dashboard\/room\/(\d+)/);
        const wantsProfile = hash.startsWith('#/dashboard/me');
        const d = this.data;

        if (!d) {
            return {
                mode: 'NORMAL',
                classroomId: roomMatch ? parseInt(roomMatch[1], 10) : null,
                room: null,
            };
        }

        const owned = d.owned_classrooms || [];
        const joined = d.joined_classrooms || [];

        if (roomMatch) {
            const id = parseInt(roomMatch[1], 10);
            const ownedRoom = owned.find(c => c.id === id);
            // เป็นเจ้าของห้อง → มุมมองผู้ดูแลของห้องนั้น
            if (ownedRoom) return { mode: 'NORMAL', classroomId: id, room: ownedRoom };
            // เป็นสมาชิกห้อง → มุมมองสมาชิก = โหมดเกม
            const joinedRoom = joined.find(c => c.id === id);
            if (joinedRoom) return { mode: 'PLAYER', classroomId: id, room: joinedRoom };
            // ห้องที่ไม่เกี่ยวกับเรา — ตกลงมาใช้ค่าเริ่มต้น ไม่แสดงอะไรของห้องนั้น
        }

        if (wantsProfile) {
            // 8 พ.ย. 2569: รวมหน้าโปรไฟล์เข้าหน้าบ้านแล้ว (ผลงาน + เหรียญอยู่ที่หน้าบ้าน)
            // ลิงก์เก่า #/dashboard/me ยังเปิดได้ แต่ได้หน้าบ้าน
            return { mode: 'HUB', classroomId: null, room: null };
            // โปรไฟล์ของฉัน = "แดชบอร์ดผู้ใช้" — ธีมปกติเสมอ
            //
            // ธีมเกมเป็นของ "บทบาทสมาชิกในห้องของผู้ดูแล" เท่านั้น ไม่ใช่ของคนที่กำลังเรียน
            // เพราะบทบาทเกิดจากความสัมพันธ์กับห้อง ไม่ใช่จากกิจกรรมที่ทำ
            // เดิมเช็ค joined.length > 0 ทำให้คนคนเดียวเห็นหน้าโปรไฟล์ตัวเองคนละธีม
            // ก่อนกับหลังกรอกรหัสเข้าห้อง ทั้งที่เป็นหน้าเดียวกันและข้อมูลชุดเดียวกัน
            return { mode: 'NORMAL', classroomId: null, room: null };
        }

        // ค่าเริ่มต้นของ #/dashboard = หน้าเลือกเสมอ
        //
        // เดิมมีเงื่อนไข "ถ้ายังไม่มีห้องเลยให้เข้าแดชบอร์ดตัวเองตรงๆ" ซึ่งสร้างปัญหา 2 ข้อ:
        //   1. ปุ่ม Dashboard บน header พาไปคนละหน้าก่อน/หลังเข้าห้องแรก
        //      ผู้ใช้ต้องเรียนรู้ใหม่ทั้งที่กดปุ่มเดิม
        //   2. บังคับให้ #/dashboard/me ต้องมีฟอร์มสร้าง/เข้าร่วมห้องติดไว้ด้วย
        //      ไม่งั้นคนที่ยังไม่มีห้องจะเข้าห้องไม่ได้เลย — ซึ่งซ้ำกับหน้านี้คำต่อคำ
        //
        // ให้หน้าเลือกขึ้นเสมอแล้วปัญหาทั้งคู่หายพร้อมกัน
        // คนที่ยังไม่มีห้องจะเห็นการ์ด "แดชบอร์ดของฉัน" ใบเดียว + กล่องสร้าง/เข้าร่วมห้อง
        // ซึ่งตรงกับสิ่งที่เขาทำได้จริงตอนนั้นพอดี
        return { mode: 'HUB', classroomId: null, room: null };
    },

    /** ไปหน้าย่อยแล้วโหลดใหม่ — hashchange จะเรียก onShow ให้เอง */
    goTo(hash) {
        if (window.location.hash === hash) {
            this.load();
            return;
        }
        window.location.hash = hash;
    },

    // ===================== หน้าเลือกแดชบอร์ด =====================
    renderHub() {
        const d = this.data;
        const user = d.user || Auth.user || {};
        const displayName = user.display_name || user.username || 'เพื่อนใหม่';
        const owned = d.owned_classrooms || [];
        const joined = d.joined_classrooms || [];
        const skills = d.skills || [];
        const stars = this._starTotals(skills);

        const teacher = d.teacher || {};
        const projects = d.projects || [];
        const achievements = d.achievements || [];
        const unlocked = achievements.filter(a => a.unlocked);

        // บอกแค่เรื่องเดียวที่ต้องทำของแต่ละห้อง (8 พ.ย. 2569 · แผนแดชบอร์ดใหม่_8พย.md)
        const toGrade = id => (teacher.assignments || [])
            .filter(a => a.classroom_id === id)
            .reduce((n, a) => n + (a.ungraded_count || 0), 0);
        const nextQuest = id => (d.assignments || [])
            .filter(a => a.classroom_id === id && !a.submitted)
            .sort((a, b) => (a.due_date || '9') < (b.due_date || '9') ? -1 : 1)[0];
        const roomCount = id => (d.assignments || []).filter(a => a.classroom_id === id).length;

        const container = document.getElementById('dashboard-content');
        container.innerHTML = `
            <div class="dashboard-greeting" style="animation: fadeInUp 0.4s ease-out;">
                <div class="greeting-avatar" onclick="Dashboard.showFacePicker()"
                     title="เปลี่ยนรูปโปรไฟล์เป็นหน้าหุ่นที่ปลดล็อกแล้ว" role="button" tabindex="0"
                     >${this._avatar(displayName, (this.data && this.data.user && this.data.user.avatar_url) || null)}</div>
                <div class="greeting-text">
                    <h1>สวัสดี ${this._esc(displayName)}!</h1>
                    <p>${owned.length || joined.length ? 'เลือกห้องที่จะเข้าไป' : 'เริ่มจากกรอกรหัสเข้าห้อง หรือสร้างห้องของตัวเอง'}
                       · ${MetoIcons.star(true)} ดาวของฉัน ${stars.earned}/${stars.max}</p>
                </div>
            </div>

            ${owned.length || joined.length ? `
            <div class="hub-grid">
                ${owned.map(c => {
                    const n = toGrade(c.id);
                    return `
                <button class="hub-card hub-card-teach ${c.is_active ? '' : 'archived'}"
                        onclick="Dashboard.goTo('#/dashboard/room/${c.id}')">
                    <span class="hub-icon tone-4">${MetoIcons.crown()}</span>
                    <span class="hub-body">
                        <span class="hub-title">
                            ${this._esc(c.name)}
                            <span class="hub-role hub-role-teacher">ฉันดูแล</span>
                        </span>
                        <span class="hub-desc">${n ? `<b>รอตรวจ ${n} งาน</b>` : 'ไม่มีงานรอตรวจ'}</span>
                        <span class="hub-meta">
                            ${MetoIcons.users()} ${c.student_count || 0} คน
                            ${c.is_active ? '' : ' · เก็บถาวรแล้ว'}
                        </span>
                    </span>
                </button>`; }).join('')}

                ${joined.map(c => {
                    const q = nextQuest(c.id);
                    return `
                <button class="hub-card hub-card-learn"
                        onclick="Dashboard.goTo('#/dashboard/room/${c.id}')">
                    <span class="hub-icon tone-3">${MetoIcons.door()}</span>
                    <span class="hub-body">
                        <span class="hub-title">
                            ${this._esc(c.name)}
                            <span class="hub-role hub-role-student">ฉันเป็นสมาชิก</span>
                        </span>
                        <span class="hub-desc">${q ? `ภารกิจถัดไป: <b>${this._esc(q.title)}</b>`
                            : roomCount(c.id) ? 'ส่งครบทุกภารกิจแล้ว' : 'ยังไม่มีภารกิจ ไปเก็บดาวบนแผนที่ได้'}</span>
                        <span class="hub-meta">ผู้ดูแล: ${this._esc(c.teacher_name)}</span>
                    </span>
                </button>`; }).join('')}
            </div>` : ''}

            <div class="dashboard-section hub-join-row" style="animation: fadeInUp 0.5s ease-out;">
                <form class="join-classroom-form" onsubmit="Dashboard.joinClassroom(event)">
                    <span class="join-icon">${MetoIcons.door()}</span>
                    <input type="text" id="join-code-input" placeholder="กรอกรหัสเข้าห้อง เช่น AB12CD" maxlength="6" autocomplete="off">
                    <button type="submit" class="btn-primary btn-sm">เข้าร่วม</button>
                    <span id="join-status" class="grade-status"></span>
                </form>
                <button class="btn-add" onclick="Dashboard.showCreateClassroom()">+ สร้างห้อง</button>
                <div id="create-classroom-area"></div>
            </div>

            <div class="dashboard-section" style="animation: fadeInUp 0.6s ease-out;">
                <div class="section-title">ผลงานของฉัน</div>
                <div class="projects-list">
                    ${projects.length ? projects.map(p => `
                        <div class="project-item">
                            <div class="project-info">
                                <div class="project-title">${this._esc(p.title || 'ไม่มีชื่อ')}</div>
                                <div class="project-date">${this._formatDate(p.updated_at || p.created_at)}</div>
                            </div>
                            <div class="hub-project-actions">
                                <button class="project-btn" onclick="Dashboard.openProject(${p.id})">เปิด</button>
                                <details class="hub-more">
                                    <summary title="เพิ่มเติม" aria-label="เพิ่มเติม">⋯</summary>
                                    <div class="hub-more-list">
                                        <button onclick="Dashboard.viewProjectVersions(${p.id})">ประวัติ / กู้งานเก่า</button>
                                        <button class="is-danger" onclick="Dashboard.deleteProject(${p.id}, this)">ลบ</button>
                                    </div>
                                </details>
                            </div>
                        </div>`).join('')
                    : '<div class="empty-state">ยังไม่มีผลงาน กด "บันทึก" ในหน้า Workspace แล้วงานจะมาอยู่ตรงนี้</div>'}
                </div>
            </div>

            ${achievements.length ? `
            <div class="dashboard-section" style="animation: fadeInUp 0.7s ease-out;">
                <div class="section-title">เหรียญ <span class="roster-count">${unlocked.length}/${achievements.length}</span></div>
                <div class="hub-badges">
                    ${achievements.slice().sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0)).map(a => `
                        <span class="hub-badge ${a.unlocked ? 'unlocked' : 'locked'}"
                              title="${this._esc(a.name)}${a.description ? ': ' + this._esc(a.description) : ''}">
                            ${MetoIcons.achievement(a.condition_type)}
                        </span>`).join('')}
                </div>
            </div>` : ''}`;
    },

    /** แถบกลับไปหน้าเลือก — หน้าเลือกมีอยู่เสมอแล้ว จึงแสดงทุกกรณี
     *  (เดิมซ่อนตอนไม่มีห้อง เพราะสมัยนั้น #/dashboard ไม่ได้เป็นหน้าเลือกเสมอ) */
    // 8 พ.ย. 2569: เลิกใช้ ซ้ำกับปุ่ม Dashboard บนแถบหัวซึ่งไปที่เดียวกัน
    _backToHub(label) {
        return '';
    },
});
