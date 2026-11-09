// Router — manages page visibility based on URL hash
const Router = {
    routes: {},
    currentPage: null,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        // Don't auto-navigate here - let auth.js decide
    },

    register(hash, pageId, onShow) {
        this.routes[hash] = { pageId, onShow };
    },

    // หา route ที่ตรงที่สุด — ลองแบบตรงตัวก่อน ไม่เจอค่อยหาอันที่เป็นคำนำหน้า
    // ทำให้ #/dashboard/room/3 กับ #/dashboard/me ใช้หน้าเดียวกับ #/dashboard ได้
    // โดยที่หน้านั้นไปอ่าน hash เองว่าจะแสดงมุมมองไหน (แดชบอร์ดแยกตามห้อง)
    resolve(hash) {
        if (this.routes[hash]) return this.routes[hash];
        let best = null;
        let bestLength = 0;
        for (const key of Object.keys(this.routes)) {
            if (hash.startsWith(key + '/') && key.length > bestLength) {
                best = this.routes[key];
                bestLength = key.length;
            }
        }
        return best;
    },

    navigate(hash) {
        if (hash) window.location.hash = hash;
        const current = window.location.hash || '#/';
        const route = this.resolve(current);

        if (!route) {
            this.navigate('#/workspace');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

        // Show target page
        const page = document.getElementById(route.pageId);
        if (page) {
            page.classList.remove('hidden');
            this.currentPage = route.pageId;
            if (route.onShow) route.onShow();
        }

        // Highlight active nav button in header
        // ใช้คำนำหน้าด้วย เพื่อให้ปุ่ม Dashboard ยังสว่างตอนอยู่หน้าย่อย เช่น #/dashboard/room/3
        document.querySelectorAll('.nav-btn[data-route]').forEach(btn => {
            const target = btn.dataset.route;
            btn.classList.toggle('active', current === target || current.startsWith(target + '/'));
        });

        // ชื่อโปรเจกต์ใน header เป็นของหน้า workspace เท่านั้น
        const onDashboard = current === '#/dashboard' || current.startsWith('#/dashboard/');
        document.body.classList.toggle('on-dashboard', onDashboard);
        // คลาสธีมของหน้าแดชบอร์ด (dashboard.js ใส่ตอนวาด) ต้องหลุดเมื่อออกจากแดชบอร์ด
        // เดิมค้างอยู่ — กลับมา Workspace จากหน้าห้องนักเรียนแล้วธีมเกมไปทับกระดานบล็อก (พื้นฟ้า)
        if (!onDashboard) document.body.classList.remove('mode-player', 'mode-hub', 'mode-owner');
    },

    getCurrentPage() {
        return this.currentPage;
    }
};
