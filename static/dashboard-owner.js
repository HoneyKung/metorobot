// ==================== หน้าห้องของผู้ดูแล (ครู) — ธีม A เครื่องมือ (8 พ.ย. 2569) ====================
//
// แผน: แผนแดชบอร์ดใหม่_8พย.md · ของเดิมอยู่ที่ _backup_20261108_ก่อนแดชบอร์ดใหม่/
// หน้านี้ตอบคำถามเดียว "ตอนนี้ต้องจัดการอะไร" เรียงจากบนลงล่าง:
//   หัวห้อง (รหัส · ส่งออก Excel · เมนู ⋯) → รอตรวจ + ควรเข้าไปดู → ภารกิจ → ตารางสมาชิก → ภาพรวมทักษะ (พับไว้)
//
// ครูไม่ใช้ธีมเกม: ใช้คลาส ow-* ของ owner.css ทั้งหมด จึงไม่โดนกรอบพิกเซลของ game-ui.css
// เอาออกจากหน้านี้ (ข้อมูลยังเก็บในฐานข้อมูลเหมือนเดิม):
//   แถบสถิติ 4 ช่อง (รัน/ถาม AI วันนี้) · ฟอร์มให้คะแนนแยกที่กางตลอด (ย้ายเข้าเมนู ⋯) · ปุ่มกลับ (ใช้ปุ่ม Dashboard บนแถบหัว)

Object.assign(Dashboard, {

    renderOwnerRoom(view) {
        const container = document.getElementById('dashboard-content');
        const d = this.data;
        const teacher = d.teacher || {};
        const room = view.room;
        const owned = d.owned_classrooms || [];
        const students = teacher.students || [];
        const assignments = (teacher.assignments || []).filter(a => a.classroom_id === room.id);
        const stats = teacher.stats || {};

        // ตัวช่วยที่ฟังก์ชันเดิมใช้ (ตรวจงาน · มอบภารกิจ · ตั้งเลขที่ · เอาออก)
        this._teacherStudents = students;
        this._ownedRooms = owned;
        this._selectedClassroomId = room.id;

        const ungraded = assignments.reduce((n, a) => n + (a.ungraded_count || 0), 0);
        const firstToGrade = assignments.find(a => a.ungraded_count > 0);
        const watch = students.filter(s => (s.attention || []).length);

        container.innerHTML = `
            <div class="ow-page">
                ${this._owHead(room, students.length, stats.active_today || 0)}

                <div class="ow-now">
                    <div class="ow-card ow-now-card ${ungraded ? 'is-todo' : ''}">
                        <div class="ow-now-num">${ungraded}</div>
                        <div class="ow-now-body">
                            <div class="ow-now-title">งานรอตรวจ</div>
                            <div class="ow-muted">${ungraded ? 'งานที่ส่งมาแล้วยังไม่ได้ให้คะแนน' : 'ตรวจครบทุกงานแล้ว'}</div>
                        </div>
                        ${firstToGrade ? `<button class="ow-btn ow-btn-primary" onclick="Dashboard.viewSubmissions(${firstToGrade.id})">ตรวจเลย</button>` : ''}
                    </div>
                    <div class="ow-card ow-now-card ${watch.length ? 'is-watch' : ''}">
                        <div class="ow-now-num">${watch.length}</div>
                        <div class="ow-now-body">
                            <div class="ow-now-title">ควรเข้าไปดู</div>
                            ${watch.length ? `<div class="ow-chips">${watch.slice(0, 8).map(s => `
                                <button class="ow-chip ow-chip-warn" onclick="Dashboard.viewStudentDetail(${s.id})"
                                    title="${this._esc((s.attention || []).join(' · '))}">${this._esc(s.display_name || s.username)}</button>`).join('')}
                                ${watch.length > 8 ? `<span class="ow-muted">อีก ${watch.length - 8} คน ดูในตาราง</span>` : ''}</div>`
                            : '<div class="ow-muted">ทุกคนไปได้ดี ไม่มีใครหายไปหรือตามหลังห้อง</div>'}
                        </div>
                    </div>
                </div>

                ${this._owAssignments(assignments)}
                ${this._owRoster(students, assignments.length)}

                ${(teacher.skill_overview || []).length ? `
                <details class="ow-card ow-fold">
                    <summary>ภาพรวมทักษะของห้อง</summary>
                    ${this._skillOverviewSection(teacher)}
                </details>` : ''}
            </div>`;
        this._owStartLive(room.id);
    },

    _owHead(room, memberCount, activeToday) {
        const code = this._esc(room.invite_code || '');
        const usable = room.is_active && room.is_open;
        const note = usable ? '' : (room.is_active
            ? 'ปิดรับสมาชิกอยู่ รหัสนี้ยังใช้เข้าห้องไม่ได้'
            : 'ห้องนี้เก็บถาวรแล้ว');
        return `
            <div class="ow-card ow-head">
                <div class="ow-head-main">
                    <h1 class="ow-title">${this._esc(room.name)}</h1>
                    <div class="ow-muted">สมาชิก ${memberCount} คน · เข้าใช้วันนี้ ${activeToday} คน</div>
                </div>
                <div class="ow-head-side">
                    ${code ? `
                    <div class="ow-code ${usable ? '' : 'is-closed'}" title="ให้สมาชิกกรอกรหัสนี้ที่หน้า Dashboard ช่องเข้าร่วมห้อง">
                        <span class="ow-muted">รหัสเข้าห้อง</span>
                        <b>${code}</b>
                        <button class="ow-btn ow-btn-ghost ow-btn-sm" onclick="Dashboard.copyCode('${code}', this)">คัดลอก</button>
                        <button class="ow-btn ow-btn-ghost ow-btn-sm" onclick="Dashboard._w3Copy(Dashboard._w3InviteLink('${code}'), this)">คัดลอกลิงก์เชิญ</button>
                    </div>` : ''}
                    ${code && usable ? `<button class="ow-btn ow-btn-secondary" onclick="Dashboard.goTo('#/dashboard/room/${room.id}/code')">ฉายรหัสขึ้นจอ</button>` : ''}
                    <button class="ow-btn ow-btn-secondary" onclick="Dashboard.exportExcel(${room.id}, this)">ส่งออก Excel</button>
                    <div class="ow-menu">
                        <button class="ow-btn ow-btn-ghost ow-menu-btn" onclick="Dashboard._owToggleMenu(this)" title="ตั้งค่าห้อง" aria-label="ตั้งค่าห้อง">⋯</button>
                        <div class="ow-menu-list" hidden>
                            ${room.is_active ? `
                                <button onclick="Dashboard.setClassroomFlag(${room.id}, 'is_open', ${!room.is_open})">${room.is_open ? 'ปิดรับสมาชิก' : 'เปิดรับสมาชิก'}</button>
                                <button onclick="Dashboard.setClassroomFlag(${room.id}, 'is_active', false)">เก็บห้องถาวร</button>
                            ` : `<button onclick="Dashboard.setClassroomFlag(${room.id}, 'is_active', true)">เปิดห้องอีกครั้ง</button>`}
                            <button onclick="Dashboard.showLooseGradeForm()">ให้คะแนนงานนอกภารกิจ</button>
                        </div>
                    </div>
                </div>
                ${note ? `<div class="ow-note">${note}</div>` : ''}
            </div>`;
    },

    _owAssignments(assignments) {
        return `
            <div class="ow-card">
                <div class="ow-sec-head">
                    <h2 class="ow-h2">ภารกิจ</h2>
                    <button class="ow-btn ow-btn-primary ow-btn-sm" onclick="Dashboard.showAssignTaskForm()">+ มอบภารกิจใหม่</button>
                </div>
                <div id="assign-task-area"></div>
                ${assignments.length ? `<div class="ow-list">${assignments.map(a => `
                    <div class="ow-row">
                        <div class="ow-row-main">
                            <div class="ow-row-title">${this._esc(a.title)}</div>
                            <div class="ow-row-meta">
                                ${a.due_date ? `<span class="ow-chip ${a.overdue ? 'ow-chip-warn' : ''}">ส่ง ${this._formatDateTime(a.due_date)}</span>` : ''}
                                <span class="ow-chip">ส่งแล้ว ${a.submission_count}/${a.total_students}</span>
                                ${a.late_count ? `<span class="ow-chip ow-chip-warn">ส่งช้า ${a.late_count}</span>` : ''}
                                ${a.ungraded_count ? `<span class="ow-chip ow-chip-todo">รอตรวจ ${a.ungraded_count}</span>` : ''}
                            </div>
                        </div>
                        <div class="ow-row-actions">
                            <button class="ow-btn ${a.ungraded_count ? 'ow-btn-primary' : 'ow-btn-secondary'} ow-btn-sm"
                                onclick="Dashboard.viewSubmissions(${a.id})"
                                ${a.submission_count ? '' : 'disabled title="ยังไม่มีใครส่ง"'}>ตรวจงาน</button>
                            <button class="ow-btn ow-btn-ghost ow-btn-sm ow-danger" onclick="Dashboard.deleteAssignment(${a.id})"
                                title="ยกเลิกภารกิจนี้">ยกเลิก</button>
                        </div>
                    </div>`).join('')}</div>`
                : '<div class="ow-empty">ยังไม่มีภารกิจ กด "มอบภารกิจใหม่" แล้วเขียนภารกิจของห้องนี้ได้เลย</div>'}
            </div>`;
    },

    _owRoster(students, assignmentCount) {
        const sortBtn = (field, label) => `<th><button class="ow-sort ${this._sortField === field ? 'is-on' : ''}"
            onclick="Dashboard.sortTable('${field}')">${label}</button></th>`;
        return `
            <div class="ow-card">
                <div class="ow-sec-head">
                    <h2 class="ow-h2">สมาชิก <span class="ow-muted">${students.length} คน</span></h2>
                    <span class="ow-muted" id="ow-live-mark"><span class="ow-live" id="ow-live-count">ใช้อยู่ตอนนี้ ${students.filter(s => s.last_active && (Date.now() - new Date(s.last_active + (/[zZ]|[+-]\d\d:?\d\d$/.test(s.last_active) ? '' : 'Z')).getTime()) < 600000).length} คน</span> · อัปเดตเองทุก 15 วินาที</span>
                </div>
                ${students.length ? `
                <div class="ow-table-wrap">
                    <table class="ow-table">
                        <thead><tr>
                            ${sortBtn('student_no', 'ลำดับ')}
                            ${sortBtn('display_name', 'ชื่อ')}
                            ${sortBtn('last_active', 'ตอนนี้ (อยู่ด่านไหน)')}
                            ${sortBtn('submitted_count', 'ส่งภารกิจ')}
                            ${sortBtn('skill_progress', 'ทักษะ')}
                            <th>ข้อสังเกต</th>
                        </tr></thead>
                        <tbody>${students.map((s, i) => `
                            <tr onclick="Dashboard.viewStudentDetail(${s.id})" title="กดเพื่อดูรายละเอียด ให้ภารกิจ หรือเอาออกจากห้อง">
                                <td onclick="event.stopPropagation()">
                                    <input class="ow-no" type="text" maxlength="10" value="${this._esc(s.student_no || '')}" placeholder="${i + 1}"
                                        title="ลำดับในห้อง พิมพ์แล้วกด Enter"
                                        onkeydown="if(event.key==='Enter'){Dashboard.saveStudentNo(${s.id}, this.value, this)}"
                                        onblur="Dashboard.saveStudentNo(${s.id}, this.value, this)">
                                </td>
                                <td class="ow-name">${this._esc(s.display_name || s.username)} ${this._focusChip(s.focus)}</td>
                                <td id="ow-now-${s.id}">${this._owNowCell(s)}</td>
                                <td>${s.submitted_count || 0}/${assignmentCount}</td>
                                <td><div class="ow-bar"><span style="width:${s.skill_progress || 0}%"></span></div>
                                    <span class="ow-muted">${s.skill_progress || 0}%</span></td>
                                <td>${(s.attention || []).map(a => `<span class="ow-chip ow-chip-warn">${this._esc(a)}</span>`).join('')}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>` : '<div class="ow-empty">ยังไม่มีสมาชิก ส่งรหัสเข้าห้องด้านบนให้สมาชิกกรอกที่หน้า Dashboard</div>'}
            </div>`;
    },

    // คอลัมน์ "ตอนนี้": อยู่ด่านไหน + กำลังใช้อยู่ไหม (ใช้ภายใน 10 นาที = กำลังใช้)
    _owNowCell(s) {
        const lv = (typeof W3_LEVEL_TH !== 'undefined' && s.level_name) ? (W3_LEVEL_TH[s.level_name] || s.level_name) : '';
        const where = s.level_name ? `ด่าน ${(s.level_index || 0) + 1} ${this._esc(lv)}` : '';
        if (!s.last_active) return `<span class="ow-muted">ยังไม่เคยเข้าใช้</span>`;
        const mins = (Date.now() - new Date(s.last_active + (/[zZ]|[+-]\d\d:?\d\d$/.test(s.last_active) ? '' : 'Z')).getTime()) / 60000;
        const live = mins < 10;
        return `${where ? `<div>${where}</div>` : ''}<span class="${live ? 'ow-live' : 'ow-muted'}">${live ? 'กำลังใช้อยู่' : 'เข้าล่าสุด ' + this._formatDate(s.last_active)}</span>`;
    },

    // อัปเดตคอลัมน์ "ตอนนี้" ทุก 15 วินาทีระหว่างเปิดหน้าห้องนี้ค้างไว้ (ไม่วาดทั้งหน้าใหม่ จะได้ไม่กระพริบ)
    _owStartLive(roomId) {
        clearTimeout(this._owLiveTimer);
        const here = window.location.hash;
        const tick = async () => {
            if (window.location.hash !== here || !document.getElementById('ow-live-mark')) return;
            try {
                const res = await fetch('/api/dashboard?classroom_id=' + roomId, { headers: Auth.getHeaders() });
                const d = await res.json();
                let live = 0;
                ((d.teacher && d.teacher.students) || []).forEach(s => {
                    const td = document.getElementById('ow-now-' + s.id);
                    if (td) td.innerHTML = this._owNowCell(s);
                    if (this._owNowCell(s).includes('กำลังใช้อยู่')) live++;
                });
                const c = document.getElementById('ow-live-count');
                if (c) c.textContent = `ใช้อยู่ตอนนี้ ${live} คน`;
            } catch { /* เน็ตกระตุก รอรอบหน้า */ }
            this._owLiveTimer = setTimeout(tick, 15000);
        };
        this._owLiveTimer = setTimeout(tick, 15000);
    },

    _owToggleMenu(btn) {
        const list = btn.nextElementSibling;
        const open = list.hasAttribute('hidden');
        document.querySelectorAll('.ow-menu-list').forEach(l => l.setAttribute('hidden', ''));
        if (open) {
            list.removeAttribute('hidden');
            setTimeout(() => document.addEventListener('click', function close(e) {
                if (!list.contains(e.target) && e.target !== btn) {
                    list.setAttribute('hidden', '');
                    document.removeEventListener('click', close);
                }
            }), 0);
        }
    },

    // ให้คะแนนงานที่ไม่ได้ส่งผ่านภารกิจ — ฟอร์มเดิม (submitGrade) ย้ายมาอยู่ในหน้าต่าง เปิดจากเมนู ⋯
    showLooseGradeForm() {
        document.querySelectorAll('.ow-menu-list').forEach(l => l.setAttribute('hidden', ''));
        const students = this._teacherStudents || [];
        this._openModal(`
            <h2 class="modal-title">ให้คะแนนงานนอกภารกิจ</h2>
            <p class="ow-muted" style="margin-top:0;">งานที่ส่งผ่านภารกิจ ให้คะแนนที่ปุ่ม "ตรวจงาน" ของภารกิจนั้นจะเห็นบริบทครบกว่า</p>
            <form class="grading-form" id="grading-form" onsubmit="Dashboard.submitGrade(event)">
                <div class="form-row">
                    <div class="form-group-inline"><label>สมาชิก</label>
                        <select id="grade-student" required>
                            <option value="">เลือกสมาชิก</option>
                            ${students.map(s => `<option value="${s.id}">${this._esc(s.display_name || s.username)}</option>`).join('')}
                        </select></div>
                    <div class="form-group-inline"><label>โปรเจกต์</label>
                        <select id="grade-project" required><option value="">เลือกสมาชิกก่อน</option></select></div>
                </div>
                <div class="form-row">
                    <div class="form-group-inline"><label>คะแนน</label>
                        <div class="score-input-group">
                            <input type="number" id="grade-score" min="0" placeholder="0" required>
                            <span class="score-separator">/</span>
                            <input type="number" id="grade-max" min="1" value="10" required>
                        </div></div>
                    <div class="form-group-inline flex-grow"><label>ความคิดเห็น</label>
                        <input type="text" id="grade-comment" placeholder="เขียนความคิดเห็น..."></div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="ow-btn ow-btn-primary">บันทึกคะแนน</button>
                    <span id="grade-status" class="grade-status"></span>
                </div>
            </form>`);
        const sel = document.getElementById('grade-student');
        if (sel) sel.addEventListener('change', () => this._loadStudentProjects());
    },

    // ส่งออก Excel — endpoint ต้องแนบสิทธิ์ (Bearer) ลิงก์ธรรมดาโหลดไม่ได้ จึงดึงเป็นไฟล์แล้วค่อยบันทึก
    async exportExcel(roomId, btn) {
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'กำลังสร้างไฟล์…'; }
        try {
            const res = await fetch(`/api/classrooms/${roomId}/export.xlsx`, { headers: Auth.getHeaders() });
            const type = res.headers.get('Content-Type') || '';
            if (!res.ok || type.indexOf('spreadsheet') === -1) throw new Error('bad');
            const blob = await res.blob();
            let name = `classroom_${roomId}.xlsx`;
            const cd = res.headers.get('Content-Disposition') || '';
            const m = cd.match(/filename\*=UTF-8''([^;]+)/);
            if (m) { try { name = decodeURIComponent(m[1]); } catch (e) { } }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e) {
            if (typeof ProjectStore !== 'undefined') ProjectStore._toast('ส่งออกไม่สำเร็จ ลองใหม่อีกครั้งนะ', 'warn');
        }
        if (btn) { btn.disabled = false; btn.textContent = label; }
    },
});
