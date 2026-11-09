// Tutorial — Spotlight overlay onboarding system
//
// ติวสั้น ๆ 5 จอ = อ่าน 3 + ลงมือทำจริง 2 (กดหมวด Control / ลาก START ลงกระดาน)
// ของเดิมเป็นสไลด์ให้อ่านล้วน 6 จอ เด็กกด "ถัดไป" รวดเดียวจบแล้วยังหาบล็อก START
// ไม่เจออยู่ดี — ข้อมูลชิ้นที่จำเป็นที่สุด ("START อยู่หมวดไหน") กลับไม่ติดตัวไปเลย
// จึงเปลี่ยนเป็นให้ "ทำ" ตรงจุดนั้นจริง ๆ แล้วค่อยปลดล็อกปุ่มถัดไป
const Tutorial = {
    currentStep: 0,
    isActive: false,
    overlayEl: null,

    // นับจาก steps เสมอ — เดิม hard-code 6 ไว้ พอเพิ่ม/ลดขั้นแล้วจุดนับหน้าเพี้ยน
    get totalSteps() {
        return this.steps.length;
    },

    // 9 พ.ย. 2569 (เว็บรอบ 3): เปลี่ยนจากทัวร์ 5 จอเป็น "ภารกิจแรก" 3 ขั้นที่ทำจริงจนหุ่นขยับ
    // ผู้ทดสอบจำลองบอกว่าทัวร์เดิมจบแล้วไม่มีโจทย์แรก และขั้นลาก START ซ้ำกับที่วางไว้บนกระดานอยู่แล้ว
    // ทัวร์เดิมเก็บไว้ที่ Tutorial.oldSteps ย้อนได้โดยสลับชื่อ
    steps: [
        {
            targetFn: () => Tutorial._findCategory('motion', 0),
            title: 'ภารกิจแรก · ให้หุ่นเดินหน้า',
            text: 'ขั้น 1 จาก 3 · ใช้เวลา 1 นาที\nกดหมวด Motion (สีฟ้า แถบซ้ายบนสุด)',
            position: 'right',
            waitFor: {
                hint: 'กดหมวด Motion ในกรอบเรืองแสง',
                done: 'เปิดแล้ว! บล็อก forward คือเดินหน้า',
                check: () => Tutorial._flyoutHas('move_forward')
            }
        },
        {
            // ส่องที่บล็อก START (ไม่ใช่ทั้งกระดาน) กล่องข้อความจะได้ไปอยู่ข้าง ๆ ไม่ทับจุดที่ต้องวาง
            targetFn: () => Tutorial._startSvg(),
            // เปิดหมวดแล้วกระดานเลื่อนตาม START ไปหลบหลังกล่องหุ่นจำลองได้ — เลื่อนกลับมากลางจอก่อน
            onShow: () => { Tutorial._centerStart(); Tutorial._ringOn('move_forward'); },
            title: 'ลากบล็อก forward มาต่อใต้ START',
            text: 'ขั้น 2 จาก 3\nกดค้างที่บล็อก forward อันบนสุด (เดินหน้า) แล้วลากไปต่อใต้บล็อก START PROGRAM ให้ติดกัน',
            position: 'below',
            gap: 110,   // ใต้ START คือที่ที่ต้องวางบล็อก เว้นที่ไว้ ไม่ให้กล่องทับ
            waitFor: {
                hint: 'ลากไปวางใต้ START PROGRAM จนได้ยินเสียงติดกัน',
                done: 'ต่อติดแล้ว! หุ่นจะเดินหน้าตามคำสั่งนี้',
                check: () => Tutorial._forwardUnderStart()
            }
        },
        {
            target: '#run-btn',
            title: 'กด Run แล้วดูหุ่น',
            text: 'ขั้น 3 จาก 3\nกดปุ่ม Run สีเขียวมุมขวาบน แล้วดูหุ่นในกล่องหุ่นจำลองด้านขวา\nไม่ต้องมีหุ่นจริง',
            position: 'below',
            waitFor: {
                hint: 'กดปุ่ม Run ในกรอบเรืองแสง',
                done: 'หุ่นเดินแล้ว! เขียนโปรแกรมแรกสำเร็จ ต่อไปฝึกด่านอื่นได้ที่ "เส้นทางของฉัน" ปุ่ม Dashboard ด้านบน (สมัครก่อนเพื่อเก็บดาว) ติดตรงไหนถามผู้ช่วย AI ปุ่มกลมมุมขวาล่าง',
                check: () => Tutorial._ranOnce === true
            }
        }
    ],

    // วงเรืองแสง + ป้าย "ลากอันนี้" ที่บล็อกต้นทางใน flyout (กรอบหลักอยู่ที่ START ปลายทาง)
    // ผู้ทดสอบหาบล็อกที่ต้องลากไม่เจอเมื่อมีกรอบที่ START อย่างเดียว · อยู่เหนือชั้นมืดของทัวร์ ไม่รับคลิก
    _ringOn(type) {
        this._ringOff();
        const ring = document.createElement('div');
        ring.id = 'tut-src-ring';
        ring.innerHTML = '<span>ลากอันนี้</span>';
        document.body.appendChild(ring);
        const place = () => {
            let el = null;
            try {
                const fly = workspace.getFlyout && workspace.getFlyout();
                if (fly && (!fly.isVisible || fly.isVisible())) {
                    const blk = fly.getWorkspace().getTopBlocks(false).find(x => x.type === type);
                    if (blk) el = blk.getSvgRoot();
                }
            } catch (e) { }
            if (!el) { ring.style.display = 'none'; return; }
            const r = el.getBoundingClientRect();
            ring.style.display = 'block';
            ring.style.left = (r.left - 6) + 'px';
            ring.style.top = (r.top - 6) + 'px';
            ring.style.width = (r.width + 12) + 'px';
            ring.style.height = (r.height + 12) + 'px';
        };
        place();
        this._ringTimer = setInterval(place, 300);
    },

    _ringOff() {
        clearInterval(this._ringTimer);
        this._ringTimer = null;
        const ring = document.getElementById('tut-src-ring');
        if (ring) ring.remove();
    },

    _startSvg() {
        try {
            const start = workspace.getAllBlocks(false).find(b => b.type === 'start_program');
            return start ? start.getSvgRoot() : document.getElementById('blocklyDiv');
        } catch (e) {
            return document.getElementById('blocklyDiv');
        }
    },

    _centerStart() {
        try {
            const start = workspace.getAllBlocks(false).find(b => b.type === 'start_program');
            if (!start) return;
            workspace.centerOnBlock(start.id);
            // ยก START ขึ้นไปส่วนบน เหลือที่ใต้ START ให้วางบล็อก และให้กล่องข้อความอยู่ห่างลงมา
            workspace.scroll(workspace.scrollX, workspace.scrollY - Math.round(workspace.getMetrics().viewHeight * 0.25));
        } catch (e) { }
    },

    _findCategory(name, fallbackIndex) {
        const cats = document.querySelectorAll('.blocklyToolboxCategory');
        for (let i = 0; i < cats.length; i++) {
            if ((cats[i].textContent || '').trim().toLowerCase() === name) return cats[i];
        }
        return cats[fallbackIndex] || null;
    },

    _flyoutHas(type) {
        try {
            const fly = workspace && workspace.getFlyout && workspace.getFlyout();
            if (!fly || (fly.isVisible && !fly.isVisible())) return false;
            return fly.getWorkspace().getTopBlocks(false).some(b => b.type === type);
        } catch (e) {
            return false;
        }
    },

    // บล็อกเดินหน้าบนกระดานที่ต่ออยู่ใต้ START (ไล่ขึ้นไปหาบล็อกบนสุดของกอง)
    _forwardUnderStart() {
        try {
            return workspace.getAllBlocks(false).some(b => {
                if (b.type !== 'move_forward' && b.type !== 'move_timed') return false;
                const root = b.getRootBlock();
                return root && root.type === 'start_program' && root !== b;
            });
        } catch (e) {
            return false;
        }
    },

    oldSteps: [
        {
            target: null, // full screen
            title: 'สวัสดี! มาลองเขียนโปรแกรมกัน',
            text: 'เมโต้จะพาทัวร์สั้น ๆ แค่ 5 จอ\nระหว่างทางจะมีให้ลองลากบล็อกจริง ๆ ด้วยนะ\nกด "ข้าม" มุมล่างซ้ายได้ตลอดเวลาเลย',
            position: 'center'
        },
        {
            // ขั้นนี้ต้องชี้ที่ "ปุ่มหมวด Control" ไม่ใช่ toolbox ทั้งแถบ
            // ของเดิมขั้นนี้กับขั้นก่อนหน้าส่องไฟกรอบเดียวกันเป๊ะ เด็กเลยไม่รู้ว่าต้องกดตรงไหน
            targetFn: () => Tutorial._findControlCategory(),
            title: 'บล็อก START อยู่ในหมวด Control',
            text: 'บล็อกคำสั่งถูกแบ่งเป็นหมวด ๆ อยู่แถบซ้าย\nบล็อก START PROGRAM ซ่อนอยู่ในหมวด "Control" หมวดที่ 7 นับจากบน',
            position: 'right',
            waitFor: {
                hint: 'ลองกดหมวด Control ในกรอบเรืองแสงดูสิ',
                done: 'นั่นแหละ! เห็นบล็อก START PROGRAM อยู่บนสุดใช่ไหม',
                check: () => Tutorial._isControlOpen()
            }
        },
        {
            target: '#blocklyDiv',
            title: 'ลาก START ลงกระดาน',
            text: 'ทุกโปรแกรมต้องเริ่มจากบล็อก START PROGRAM\nลากมันออกมาวางบนกระดาน แล้วค่อยต่อคำสั่งอื่นไว้ใต้มัน',
            position: 'right',
            waitFor: {
                hint: 'ลากบล็อก START PROGRAM มาวางบนกระดานได้เลย',
                done: 'เยี่ยมมาก! มีบล็อก START อยู่บนกระดานแล้ว',
                check: () => Tutorial._hasStartOnBoard()
            }
        },
        {
            target: '#run-btn',
            title: 'กด Run เพื่อสั่งหุ่นยนต์',
            text: 'เขียนเสร็จเมื่อไหร่ กดปุ่มนี้ได้เลย\nคำสั่งจะถูกส่งไปให้หุ่นยนต์ทำตามทันที',
            position: 'below'
        },
        {
            target: '#chat-fab',
            title: 'ติดตรงไหน ถามเมโต้ได้',
            text: 'ปุ่มกลมมุมขวาล่างคือผู้ช่วย AI\nถามได้ทุกเรื่อง ไม่มีคำถามไหนโง่นะ',
            position: 'above'
        }
    ],

    // ==================== ตัวช่วยหาเป้าหมายในหน้าจอ ====================

    // หาปุ่มหมวด Control — ลองจากข้อความก่อน เผื่อวันหลังมีคนสลับ/แทรกหมวด
    // แล้วค่อยถอยไปใช้คลาส cat-6 กับลำดับที่ 7 ตาม toolbox ใน index.html
    _findControlCategory() {
        const cats = document.querySelectorAll('.blocklyToolboxCategory');
        if (!cats.length) return null;
        for (let i = 0; i < cats.length; i++) {
            if ((cats[i].textContent || '').trim().toLowerCase() === 'control') return cats[i];
        }
        return document.querySelector('.blocklyToolboxCategory.cat-6') || cats[6] || null;
    },

    // เด็ก "เปิด" หมวด Control แล้วหรือยัง — เช็กหลายทางเพราะชื่อคลาส/API
    // ของ Blockly เปลี่ยนไปมาระหว่างเวอร์ชัน ถ้าทางใดทางหนึ่งพัง เด็กจะติดค้าง
    _isControlOpen() {
        const cat = this._findControlCategory();
        if (cat && (cat.getAttribute('aria-selected') === 'true' ||
            cat.className.indexOf('Selected') !== -1 ||
            cat.querySelector('[aria-selected="true"]'))) {
            return true;
        }
        try {
            const tb = (typeof workspace !== 'undefined') && workspace && workspace.getToolbox && workspace.getToolbox();
            const item = tb && tb.getSelectedItem && tb.getSelectedItem();
            const name = item && item.getName ? String(item.getName()) : '';
            if (name.toLowerCase() === 'control') return true;
        } catch (e) { }
        // ทางสุดท้าย: flyout เปิดอยู่แล้วมีบล็อก START ให้ลาก = มาถูกหมวดแล้ว
        return this._flyoutHasStart();
    },

    _flyoutHasStart() {
        try {
            const fly = workspace && workspace.getFlyout && workspace.getFlyout();
            if (!fly || (fly.isVisible && !fly.isVisible())) return false;
            const blocks = fly.getWorkspace().getTopBlocks(false);
            return blocks.some(b => b.type === 'start_program');
        } catch (e) {
            return false;
        }
    },

    // บล็อกใน flyout อยู่คนละ workspace กับกระดาน — ตรงนี้จึงนับเฉพาะของจริงบนกระดาน
    _hasStartOnBoard() {
        try {
            return workspace.getAllBlocks(false).some(b => b.type === 'start_program');
        } catch (e) {
            return false;
        }
    },

    // ==================== เริ่ม / ปิด ====================

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentStep = 0;
        this._progressUnsupported = false;
        this._ranOnce = false;
        if (!this._runHooked) {
            this._runHooked = true;
            const runBtn = document.getElementById('run-btn');
            if (runBtn) runBtn.addEventListener('click', () => { Tutorial._ranOnce = true; }, true);
        }
        this.createOverlay();
        this._watchWorkspace();
        this._startTicking();
        this.showStep(0);
    },

    // CSS ของติวส่วนใหญ่อยู่ใน style.css แล้ว — ที่เพิ่มใหม่ต้อง inject จากที่นี่
    // เพราะไฟล์ CSS มีคนอื่นถืออยู่ระหว่างนี้ แก้พร้อมกันแล้วจะชนกัน
    // (ถ้าวันหลังไฟล์ว่างแล้ว ย้ายก้อนนี้ไป style.css ได้เลย ไม่มีอะไรผูกกับ JS)
    _injectStyles() {
        if (document.getElementById('tutorial-runtime-style')) return;
        const style = document.createElement('style');
        style.id = 'tutorial-runtime-style';
        style.textContent = `
/* คำใบ้ "ให้ทำอะไร" ของขั้นลงมือทำ */
.tutorial-hint {
    display: none;
    font-size: 13px; line-height: 1.55; color: #4a5a17;
    background: #f4f9de; border: 1px solid #d7e7a0;
    border-radius: 10px; padding: 10px 12px; margin: -8px 0 16px;
    white-space: pre-line;
}
.tutorial-hint.is-shown { display: block; }
.tutorial-hint.is-done { color: #22603a; background: #e7f7ec; border-color: #b3e3c4; }
.tutorial-hint.is-escape { color: #6b6b6b; background: #f6f6f6; border-color: #e4e4e4; }

/* ปุ่มถัดไปตอนยังไม่ได้ลงมือ หรี่ไว้เฉย ๆ ไม่ใช่ดุ และปลดล็อกเองเสมอเมื่อรอนาน */
.tutorial-skip-btn { white-space: nowrap; }
#tut-src-ring { position: fixed; z-index: 10002; pointer-events: none; border: 3px solid #BED73B; border-radius: 10px;
    box-shadow: 0 0 0 4px rgba(190,215,59,.35); animation: tutRing 1.2s ease-in-out infinite; }
#tut-src-ring span { position: absolute; left: 100%; top: 50%; transform: translate(8px,-50%); white-space: nowrap;
    background: #BED73B; color: #1f2a52; font: 700 13px var(--font-ui, 'Prompt'), sans-serif; padding: 3px 10px; border-radius: 12px; }
@keyframes tutRing { 50% { box-shadow: 0 0 0 9px rgba(190,215,59,.15); } }
.tutorial-next-btn.is-locked,
.tutorial-next-btn.is-locked:hover {
    background: #ccd3e6; color: #ffffff; cursor: default;
    transform: none; box-shadow: none;
}
.tutorial-next-btn.is-ready { animation: tutorialNextPulse 1.1s ease-in-out 3; }
@keyframes tutorialNextPulse {
    0%, 100% { box-shadow: 0 2px 5px rgba(0,0,0,0.12); }
    50%      { box-shadow: 0 2px 5px rgba(0,0,0,0.12), 0 0 0 8px rgba(190,215,59,0.4); }
}

/* กรอบส่องไฟของขั้นลงมือทำ ให้กะพริบเรียกสายตา */
.tutorial-spotlight.is-action { animation: tutorialSpotPulse 1.6s ease-out infinite; }
@keyframes tutorialSpotPulse {
    0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 0 rgba(190,215,59,0.75); }
    50%      { box-shadow: 0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 12px rgba(190,215,59,0); }
}

/* ลูกศรต้องชี้ "ตรงเป้า" จริง ๆ เดิมตรึงไว้ที่ 30px/40px พอกล่องถูกดันหนีขอบจอ
   ลูกศรเลยชี้ไปที่ว่าง เด็กก็ยังไม่รู้ว่าให้ดูตรงไหน */
.tutorial-tooltip.pos-right::before,
.tutorial-tooltip.pos-left::after { top: var(--tut-arrow-top, 30px); }
.tutorial-tooltip.pos-below::before { left: var(--tut-arrow-left, 40px); }
.tutorial-tooltip.pos-above::after {
    content: ''; position: absolute; bottom: -8px;
    left: var(--tut-arrow-left, 40px);
    border: 8px solid transparent; border-top-color: white;
}
.tutorial-tooltip.no-arrow::before,
.tutorial-tooltip.no-arrow::after { display: none; }
`;
        document.head.appendChild(style);
    },

    createOverlay() {
        this._injectStyles();

        const old = document.getElementById('tutorial-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-spotlight"></div>
            <div class="tutorial-tooltip">
                <div class="tutorial-tooltip-title"></div>
                <div class="tutorial-tooltip-text"></div>
                <div class="tutorial-hint"></div>
                <div class="tutorial-tooltip-footer">
                    <button class="tutorial-skip-btn" onclick="Tutorial.skip()">ข้าม ฉันลองเอง</button>
                    <div class="tutorial-dots"></div>
                    <button class="tutorial-next-btn" onclick="Tutorial.next()">ถัดไป →</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // ปล่อยให้คลิก/ลากทะลุ overlay ไปโดนของจริงได้
        // ของเดิม backdrop กินคลิกเต็มจอ → ระหว่างติวเด็กลากบล็อกไม่ได้เลยแม้แต่ครั้งเดียว
        // ติวเลยกลายเป็นแค่สไลด์ให้อ่าน (ตั้งจาก JS เพราะไฟล์ CSS มีคนอื่นถืออยู่)
        overlay.style.pointerEvents = 'none';
        overlay.querySelector('.tutorial-backdrop').style.pointerEvents = 'none';
        overlay.querySelector('.tutorial-tooltip').style.pointerEvents = 'auto';

        this.overlayEl = overlay;
    },

    // ==================== แสดงผลแต่ละขั้น ====================

    showStep(index) {
        if (index < 0 || index >= this.totalSteps) {
            this.complete();
            return;
        }

        this._endWait();
        this.currentStep = index;
        const step = this.steps[index];
        const overlay = this.overlayEl;
        if (!overlay) return;

        overlay.querySelector('.tutorial-tooltip-title').textContent = step.title;
        overlay.querySelector('.tutorial-tooltip-text').textContent = step.text;

        let dotsHTML = '';
        for (let i = 0; i < this.totalSteps; i++) {
            dotsHTML += `<span class="tutorial-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}"></span>`;
        }
        overlay.querySelector('.tutorial-dots').innerHTML = dotsHTML;

        const nextBtn = overlay.querySelector('.tutorial-next-btn');
        nextBtn.classList.remove('is-locked', 'is-ready');
        nextBtn.disabled = false;
        nextBtn.textContent = index === this.totalSteps - 1 ? 'เสร็จ' : 'ถัดไป →';

        this._ringOff();
        if (typeof step.onShow === 'function') { try { step.onShow(); } catch (e) { } }

        // วาดใหม่แบบบังคับ (ข้ามแคช rect เดิม) แล้วค่อยเล่นอนิเมชัน
        this._stepIsAction = !!step.waitFor;
        this._reflow();

        const tooltip = overlay.querySelector('.tutorial-tooltip');
        tooltip.style.animation = 'none';
        tooltip.offsetHeight; // force reflow
        tooltip.style.animation = 'tutorialFadeIn 0.3s ease-out forwards';

        if (step.waitFor) this._beginWait(step);

        this.saveProgress(index);
    },

    // หาองค์ประกอบเป้าหมาย — และยืนยันว่ามันถูกวาดจริงแล้ว
    // เคส "ส่องไฟไปที่ว่าง" เกิดจากวัดตอน layout ยังไม่นิ่ง (rect เป็น 0 หรือค้างของเก่า)
    // ถ้ายังไม่พร้อมให้คืน null ไปก่อน แล้ว _tick() จะวัดซ้ำให้เองในไม่กี่ร้อยมิลลิวินาที
    _resolveTarget(step) {
        let el = null;
        try {
            if (step.targetFn) el = step.targetFn();
            else if (step.target) el = document.querySelector(step.target);
        } catch (e) {
            el = null;
        }
        if (!el || !el.getBoundingClientRect) return null;

        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return null;
        try {
            if (getComputedStyle(el).visibility === 'hidden') return null;
        } catch (e) { }
        return el;
    },

    // บังคับวาดใหม่ — ใช้ตอนเปลี่ยนขั้น หรือตอนความสูงกล่องเปลี่ยน (คำใบ้โผล่/หาย)
    _reflow() {
        this._lastRectKey = null;
        this._render();
    },

    // วาดกรอบ + กล่องข้อความตามตำแหน่งล่าสุดของเป้าหมาย
    // เรียกซ้ำได้ถี่ ๆ — จะทำงานจริงเฉพาะตอนผังหน้าจอขยับ (เช่น เปิด flyout, ย่อ/ขยายจอ)
    _render() {
        const overlay = this.overlayEl;
        const step = this.steps[this.currentStep];
        if (!overlay || !step) return;

        const spotlight = overlay.querySelector('.tutorial-spotlight');
        const tooltip = overlay.querySelector('.tutorial-tooltip');

        const targetEl = step.position === 'center' ? null : this._resolveTarget(step);
        const rect = targetEl ? targetEl.getBoundingClientRect() : null;
        // สิ่งกีดขวางต้องอยู่ในคีย์ด้วย ไม่ใช่แค่ rect ของเป้าหมาย
        // เพราะ flyout เปิดทีหลังโดยที่ปุ่มหมวดไม่ขยับเลย — ถ้าไม่วัดซ้ำ
        // กล่องข้อความจะค้างทับบล็อก START ที่เพิ่งโผล่มาพอดี
        const obstacles = rect ? this._obstacleRects(targetEl) : [];
        const key = (rect
            ? [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)].join(',')
            : 'none') + '|' + obstacles.map(o =>
                Math.round(o.left) + ',' + Math.round(o.top) + ',' + Math.round(o.right) + ',' + Math.round(o.bottom)
            ).join(';');
        if (key === this._lastRectKey) return;
        this._lastRectKey = key;

        if (rect) {
            const padding = 8;
            spotlight.style.display = 'block';
            spotlight.classList.toggle('is-action', !!this._stepIsAction);
            spotlight.style.left = (rect.left - padding) + 'px';
            spotlight.style.top = (rect.top - padding) + 'px';
            spotlight.style.width = (rect.width + padding * 2) + 'px';
            spotlight.style.height = (rect.height + padding * 2) + 'px';
            // พารามิเตอร์ที่ 5 คือ "เป้าหมาย" (ตัวที่ _obstacleRects ใช้ข้าม) ไม่ใช่รายการสิ่งกีดขวาง
            // เดิมส่ง obstacles ไป → el.contains(array) พัง กล่องข้อความไม่ถูกวางเลย ค้างมุมซ้ายบน
            this._placeTooltip(tooltip, rect, step.position, padding, targetEl);
        } else {
            // ไม่มีเป้า (จอต้อนรับ) หรือเป้ายังไม่ถูกวาด → ไม่ต้องมีกรอบ ให้กล่องอยู่กลางจอ
            // จัดกลางด้วยพิกเซลจริง ไม่ใช้ transform เพราะ animation tutorialFadeIn
            // (forwards) จะเขียนทับ transform ทำให้กล่องหลุดไปมุมขวาล่าง
            spotlight.style.display = 'none';
            spotlight.classList.remove('is-action');
            tooltip.classList.remove('pos-right', 'pos-left', 'pos-below', 'pos-above');
            tooltip.classList.add('pos-center', 'no-arrow');
            tooltip.style.transform = 'none';
            const tw = tooltip.offsetWidth;
            const th = tooltip.offsetHeight;
            tooltip.style.left = Math.max(16, (window.innerWidth - tw) / 2) + 'px';
            tooltip.style.top = Math.max(16, (window.innerHeight - th) / 2) + 'px';
        }
    },

    // ปุ่ม/แถบที่กล่องข้อความห้ามไปทับ — ทับแล้วเด็กกดของจริงไม่ได้
    // (ขั้นสุดท้ายเคยวางทับปุ่มถังขยะพอดี เพราะเดิมหลบแค่กรอบส่องไฟอย่างเดียว)
    // toolbox กับ flyout อยู่ในลิสต์ด้วย เพราะขั้น "ลาก START" ต้องเห็นบล็อกต้นทางตลอด
    OBSTACLES: [
        '#header-container', '#custom-toolbar', '#chat-bar-container', '#mission-bar',
        '.blocklyToolbox, .blocklyToolboxDiv', '.blocklyFlyout',
        // ภารกิจแรกขั้น 3 บอกให้ดูหุ่นในกล่องนี้ — ห้ามวางการ์ดทับ
        '#twin-panel'
    ],

    _obstacleRects(targetEl) {
        const pad = 8;
        const out = [];
        for (const sel of this.OBSTACLES) {
            const el = document.querySelector(sel);
            if (!el) continue;
            // ข้ามเฉพาะตัวที่ "ห่อ" เป้าหมายอยู่ — กรอบส่องไฟคุมให้แล้ว
            // แต่ถ้าเป้าหมายเป็นตัวห่อเสียเอง (เช่น #blocklyDiv ที่คลุม toolbox ทั้งแถบ)
            // ยังต้องนับของข้างในเป็นสิ่งกีดขวาง ไม่งั้นกล่องจะไปทับ toolbox
            if (targetEl && (el === targetEl || el.contains(targetEl))) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) continue;
            out.push({ left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad });
        }
        return out;
    },

    // วางกล่องข้างเป้าหมาย โดยเลี่ยงทั้งกรอบส่องไฟและปุ่มอื่น ๆ
    // ให้คะแนนทุกด้านตามพื้นที่ที่ทับ แล้วเลือกด้านที่ทับน้อยที่สุด
    // (ของเดิมเลือก "ด้านแรกที่ไม่ทับกรอบ" ซึ่งไปทับปุ่มอื่นได้สบาย ๆ)
    _placeTooltip(tooltip, rect, preferred, padding, targetEl) {
        const gap = (this.steps[this.currentStep] || {}).gap || 16;   // ระยะห่างจากขอบ spotlight
        const margin = 16;   // ระยะขอบจอ
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // ขนาดจริงของ tooltip (รวม padding — ไม่ใช่เลข hard-code)
        tooltip.style.transform = 'none';
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;

        // กรอบ spotlight (เป้าหมาย + padding + เส้นขอบ)
        const spot = {
            left: rect.left - padding - 3,
            top: rect.top - padding - 3,
            right: rect.right + padding + 3,
            bottom: rect.bottom + padding + 3,
        };

        const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
        const midX = clamp(rect.left + rect.width / 2 - tw / 2, margin, Math.max(margin, vw - tw - margin));
        const midY = clamp(rect.top + rect.height / 2 - th / 2, margin, Math.max(margin, vh - th - margin));

        const candidates = {
            right: { left: spot.right + gap, top: midY },
            left: { left: spot.left - gap - tw, top: midY },
            below: { left: midX, top: spot.bottom + gap },
            above: { left: midX, top: spot.top - gap - th },
            center: { left: (vw - tw) / 2, top: (vh - th) / 2 },
        };

        const order = [preferred, 'left', 'right', 'above', 'below', 'center']
            .filter(v => candidates[v])
            .filter((v, i, arr) => arr.indexOf(v) === i);

        const area = (a, b) => {
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            return (w > 0 && h > 0) ? w * h : 0;
        };

        // เป้าหมายที่ใหญ่เกินครึ่งจอ (เช่น กระดานทั้งผืน) ยังไงก็ต้องวางทับ
        // จะได้ไม่ต้องเสียคะแนนให้เรื่องที่เลี่ยงไม่ได้ แล้วไปโฟกัสการเลี่ยงปุ่มแทน
        const spotWeight = (rect.width * rect.height) > (vw * vh * 0.5) ? 0 : 4;
        const obstacles = this._obstacleRects(targetEl);

        let best = null;
        order.forEach((side, i) => {
            const c = candidates[side];
            const l = clamp(c.left, margin, Math.max(margin, vw - tw - margin));
            const t = clamp(c.top, margin, Math.max(margin, vh - th - margin));
            const box = { left: l, top: t, right: l + tw, bottom: t + th };
            let score = area(box, spot) * spotWeight;
            for (const ob of obstacles) score += area(box, ob);
            score += i; // คะแนนเท่ากันให้ด้านที่ขอมาชนะ
            if (!best || score < best.score) best = { side, left: l, top: t, score };
        });

        tooltip.classList.remove('pos-center', 'pos-right', 'pos-left', 'pos-below', 'pos-above', 'no-arrow');
        tooltip.classList.add('pos-' + best.side);
        tooltip.style.left = best.left + 'px';
        tooltip.style.top = best.top + 'px';

        // ขยับลูกศรให้ชี้กลางเป้าหมายจริง ถ้าชี้ไม่ถึงก็ซ่อนไปเลย ดีกว่าชี้ผิดที่
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (best.side === 'left' || best.side === 'right') {
            const at = cy - best.top - 8;
            if (at < 8 || at > th - 24) tooltip.classList.add('no-arrow');
            else tooltip.style.setProperty('--tut-arrow-top', at + 'px');
        } else if (best.side === 'above' || best.side === 'below') {
            const al = cx - best.left - 8;
            if (al < 12 || al > tw - 28) tooltip.classList.add('no-arrow');
            else tooltip.style.setProperty('--tut-arrow-left', al + 'px');
        } else {
            tooltip.classList.add('no-arrow');
        }
    },

    // ==================== ขั้นลงมือทำ (waitFor) ====================

    // เผื่อเด็กทำไม่สำเร็จ — ปลดล็อกปุ่มให้เองหลังเท่านี้ ห้ามปล่อยให้ติดค้าง
    ESCAPE_MS: 15000,

    _beginWait(step) {
        const overlay = this.overlayEl;
        if (!overlay) return;
        const hintEl = overlay.querySelector('.tutorial-hint');
        const nextBtn = overlay.querySelector('.tutorial-next-btn');

        this._waiting = step.waitFor;

        // ถ้าเด็กทำไว้ก่อนแล้ว (หรือโหลดงานเก่าที่มี START อยู่) อย่าไปบังคับให้ทำซ้ำ
        if (this._safeCheck()) {
            this._passWait();
            return;
        }

        hintEl.textContent = step.waitFor.hint;
        hintEl.className = 'tutorial-hint is-shown';
        nextBtn.classList.add('is-locked');
        nextBtn.disabled = true;
        nextBtn.textContent = 'ทำตามกรอบก่อนนะ';

        this._escapeTimer = setTimeout(() => this._escapeWait(), this.ESCAPE_MS);
    },

    _safeCheck() {
        if (!this._waiting || typeof this._waiting.check !== 'function') return false;
        try {
            return !!this._waiting.check();
        } catch (e) {
            // เช็กไม่ได้ = ถือว่าผ่าน ดีกว่าปล่อยเด็กติดค้างเพราะบั๊กของเรา
            console.warn('[Tutorial] เช็กความคืบหน้าไม่ได้:', e.message);
            return true;
        }
    },

    _checkWait() {
        if (!this._waiting) return;
        if (this._safeCheck()) this._passWait();
    },

    // ทำสำเร็จ — ชมแล้วปลดล็อกปุ่ม (ไม่เลื่อนหน้าเอง เด็กจะได้คุมจังหวะตัวเอง)
    _passWait() {
        const overlay = this.overlayEl;
        this._waiting = null;
        clearTimeout(this._escapeTimer);
        this._escapeTimer = null;
        if (!overlay) return;

        const step = this.steps[this.currentStep];
        const hintEl = overlay.querySelector('.tutorial-hint');
        const nextBtn = overlay.querySelector('.tutorial-next-btn');
        hintEl.textContent = (step && step.waitFor && step.waitFor.done) || 'เยี่ยม!';
        hintEl.className = 'tutorial-hint is-shown is-done';
        nextBtn.classList.remove('is-locked');
        nextBtn.classList.add('is-ready');
        nextBtn.disabled = false;
        nextBtn.textContent = this.currentStep === this.totalSteps - 1 ? 'เสร็จ' : 'ถัดไป →';
        overlay.querySelector('.tutorial-spotlight').classList.remove('is-action');
    },

    // ยังทำไม่ได้ก็ไม่เป็นไร — เปิดทางออกให้เสมอ ห้ามให้ความผิดพลาดกลายเป็นกำแพง
    _escapeWait() {
        const overlay = this.overlayEl;
        // ไม่ล้าง _waiting — ทำสำเร็จทีหลังก็ยังได้คำชมและปุ่มถัดไป (เดิมพ้นเวลาแล้วทำได้ก็ไม่นับ)
        this._escapeTimer = null;
        if (!overlay) return;

        const hintEl = overlay.querySelector('.tutorial-hint');
        const nextBtn = overlay.querySelector('.tutorial-next-btn');
        hintEl.textContent = 'ยังไม่เจอใช่ไหม ไม่เป็นไรเลย เดี๋ยวค่อยลองใหม่ก็ได้\nกด "ข้ามขั้นนี้" ไปดูขั้นต่อไปก่อนได้เลย';
        hintEl.className = 'tutorial-hint is-shown is-escape';
        nextBtn.classList.remove('is-locked');
        nextBtn.classList.add('is-ready');
        nextBtn.disabled = false;
        nextBtn.textContent = 'ข้ามขั้นนี้ →';
    },

    _endWait() {
        this._waiting = null;
        clearTimeout(this._escapeTimer);
        this._escapeTimer = null;
        if (this.overlayEl) {
            const hintEl = this.overlayEl.querySelector('.tutorial-hint');
            hintEl.textContent = '';
            hintEl.className = 'tutorial-hint';
        }
    },

    // ฟังการเปลี่ยนแปลงบนกระดาน — ผูกครั้งเดียวตอนเริ่มติว
    // (ถ้าผูกทุกขั้นจะซ้อนกันหลายตัวแล้วถอดไม่ครบ)
    _watchWorkspace() {
        if (this._wsListener) return;
        if (typeof workspace === 'undefined' || !workspace || !workspace.addChangeListener) return;
        this._wsListener = () => this._checkWait();
        try {
            workspace.addChangeListener(this._wsListener);
        } catch (e) {
            this._wsListener = null;
        }
    },

    _unwatchWorkspace() {
        if (!this._wsListener) return;
        try { workspace.removeChangeListener(this._wsListener); } catch (e) { }
        this._wsListener = null;
    },

    // จังหวะเต้นเดียวคุมสองเรื่อง: วัดตำแหน่งเป้าหมายซ้ำ + เช็กว่าเด็กทำสำเร็จหรือยัง
    // การวัดซ้ำจำเป็นจริง เพราะ layout ขยับได้ระหว่างติว (เปิด flyout, ย่อจอ, แถบภารกิจโผล่)
    // ถ้าวัดครั้งเดียวตอนเปิดขั้น กรอบจะค้างอยู่ที่เก่า = "ส่องไฟไปที่ว่าง"
    _startTicking() {
        if (this._tickTimer) return;
        this._tickTimer = setInterval(() => {
            if (!this.isActive) return;
            this._render();
            this._checkWait();
        }, 200);
        this._onResize = () => { this._lastRectKey = null; this._render(); };
        window.addEventListener('resize', this._onResize);
    },

    _stopTicking() {
        clearInterval(this._tickTimer);
        this._tickTimer = null;
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
    },

    // ==================== ปุ่มควบคุม ====================

    next() {
        if (this._waiting) return; // ยังล็อกอยู่ (กันเรียกจากนอกจอ)
        this.showStep(this.currentStep + 1);
    },

    skip() {
        this.saveSkip();
        this.close();
    },

    complete() {
        this.saveComplete();
        this.close();
    },

    // immediate = ปิดทันทีไม่ต้องจางออก (ตอนเปลี่ยนหน้า — จาง 0.3 วิทับหน้าใหม่ดูเหมือนมีสองหน้าซ้อนกัน)
    close(immediate) {
        this.isActive = false;
        this._ringOff();
        this._endWait();
        this._stopTicking();
        this._unwatchWorkspace();
        this._lastRectKey = null;
        if (this.overlayEl && immediate) {
            this.overlayEl.remove();
            this.overlayEl = null;
        } else if (this.overlayEl) {
            this.overlayEl.classList.add('tutorial-closing');
            setTimeout(() => {
                if (this.overlayEl) {
                    this.overlayEl.remove();
                    this.overlayEl = null;
                }
            }, 300);
        }
    },

    // ==================== บันทึกความคืบหน้า ====================

    // หมายเหตุ: ฝั่งเซิร์ฟเวอร์ยังไม่มี endpoint นี้ (dashboard.py มีแค่ status/complete/skip)
    // ต้องเพิ่ม POST /api/tutorial/progress รับ {last_step_seen, total_steps}
    // ไม่งั้นแดชบอร์ดผู้ดูแลจะไม่มีวันขึ้นสถานะ 'in_progress' เลย เพราะ dashboard.py
    // ตัดสินจาก (tutorial.last_step_seen or 0) > 0 ซึ่งไม่มีใครเขียนค่าให้
    // ระหว่างที่ยังไม่มี: ยิงแล้วเจอ 404 ก็เงียบ ๆ แล้วเลิกยิง ไม่ให้ console รก
    PROGRESS_URL: '/api/tutorial/progress',
    _progressUnsupported: false,
    _progressTimer: null,
    _pendingStep: null,

    // หน่วงไว้ก่อน — เด็กกดถัดไปรัว ๆ ได้ ไม่ต้องยิงทุกขั้น
    saveProgress(stepIndex) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        if (this._progressUnsupported) return;
        this._pendingStep = stepIndex;
        clearTimeout(this._progressTimer);
        this._progressTimer = setTimeout(() => this._postProgress(), 1500);
    },

    // ยิงทันทีโดยไม่รอ debounce — ใช้ตอนกำลังจะปิดติว จะได้ไม่ตกหล่น
    _flushProgress() {
        if (this._pendingStep === null) return Promise.resolve();
        clearTimeout(this._progressTimer);
        this._progressTimer = null;
        return this._postProgress();
    },

    async _postProgress() {
        const stepIndex = this._pendingStep;
        this._pendingStep = null;
        if (stepIndex === null) return;
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        if (this._progressUnsupported) return;
        try {
            const res = await fetch(this.PROGRESS_URL, {
                method: 'POST',
                headers: Auth.getHeaders(),
                // นับแบบ 1-based: เห็นจอแรกแล้ว = 1 ขั้น เพื่อให้ค่ามากกว่า 0 จริง
                // (ถ้าส่ง index ดิบ จอแรกจะเป็น 0 แล้วผู้ดูแลก็ยังเห็นเป็น not_started อยู่ดี)
                body: JSON.stringify({
                    last_step_seen: stepIndex + 1,
                    total_steps: this.totalSteps,
                })
            });
            if (res.status === 404 || res.status === 405) {
                this._progressUnsupported = true;
                console.info('[Tutorial] ยังไม่มี ' + this.PROGRESS_URL + ' บนเซิร์ฟเวอร์ ข้ามการบันทึกความคืบหน้าไปก่อน');
            }
        } catch (e) {
            // เน็ตห้องหลุดบ่อย — ห้ามให้เรื่องบันทึกสถิติไปทำให้ติวพัง
            this._progressUnsupported = true;
            console.warn('[Tutorial] บันทึกความคืบหน้าไม่สำเร็จ:', e.message);
        }
    },

    // flag ในเครื่อง — ต้องผูกกับ "คน" ไม่ใช่ "เครื่อง"
    // ห้องคอมพิวเตอร์ใช้เครื่องซ้ำทุกคาบ ของเดิมใช้คีย์เดียวทั้งเครื่อง
    // สมาชิกคนแรกที่กด "ข้าม" ทำให้คาบต่อ ๆ ไปไม่มีใครได้เห็นติวอีกเลย
    LOCAL_KEY_PREFIX: 'meto_tutorial_done_',

    localKey() {
        const uid = (typeof Auth !== 'undefined' && Auth.user && Auth.user.id) ? Auth.user.id : 'guest';
        return this.LOCAL_KEY_PREFIX + uid;
    },

    async saveComplete() {
        try { localStorage.setItem(this.localKey(), 'completed'); } catch (e) { }
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        await this._flushProgress();
        try {
            await fetch('/api/tutorial/complete', {
                method: 'POST',
                headers: Auth.getHeaders()
            });
        } catch (e) {
            console.warn('[Tutorial] Could not save completion:', e.message);
        }
    },

    async saveSkip() {
        try { localStorage.setItem(this.localKey(), 'skipped'); } catch (e) { }
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        // ส่งขั้นล่าสุดก่อนเสมอ — ผู้ดูแลจะได้รู้ว่าเด็กกดข้ามตอนไหน ไม่ใช่แค่ว่า "ข้าม"
        await this._flushProgress();
        try {
            await fetch('/api/tutorial/skip', {
                method: 'POST',
                headers: Auth.getHeaders()
            });
        } catch (e) {
            console.warn('[Tutorial] Could not save skip:', e.message);
        }
    },

    // ออกจากหน้า workspace เมื่อไหร่ให้ปิดทัวร์ทันที
    // เดิม overlay ค้างข้ามหน้าไปทับ Dashboard จนกดอะไรไม่ได้
    watchRouteChange() {
        if (this._routeWatchBound) return;
        this._routeWatchBound = true;
        window.addEventListener('hashchange', () => {
            if (this.isActive && Router.getCurrentPage() !== 'page-workspace') this.close(true);
        });
    },

    // Check if should auto-start — ทั้งผู้ใช้ล็อกอิน (ครั้งแรกจากเซิร์ฟเวอร์)
    // และ guest (ครั้งแรกของเครื่องนี้ จาก localStorage)
    async checkAutoStart() {
        // ต้องรู้ก่อนว่าใครเป็นใคร ไม่งั้นคนที่ล็อกอินอยู่จะถูกพาไปเส้นทาง guest
        // (ตอน init เพิ่งยิง fetchMe() ทิ้งไว้ this.user ยังเป็น null อยู่)
        // แล้วไปอ่าน flag ในเครื่องแทนความคืบหน้าจริงจากเซิร์ฟเวอร์
        try { await Auth.ready; } catch (e) { }

        // เริ่มหลังหน่วง 1 วิ — แต่ต้องยังอยู่หน้า workspace ตอนเวลามาถึง
        // (กันเคสผู้ใช้สลับไป Dashboard ก่อน timer ทำงาน แล้ว popup ไปโผล่ผิดหน้า)
        const startIfOnWorkspace = () => {
            if (Router.getCurrentPage() === 'page-workspace') this.start();
        };

        // --- Guest: ดู flag ในเครื่อง ---
        if (!Auth.isLoggedIn()) {
            let seen = null;
            try { seen = localStorage.getItem(this.localKey()); } catch (e) { }
            if (!seen) {
                setTimeout(startIfOnWorkspace, 1000);
            }
            return;
        }

        // --- Logged in: ดูสถานะจากเซิร์ฟเวอร์ ---
        try {
            const res = await fetch('/api/tutorial/status', {
                headers: Auth.getHeaders()
            });
            if (!res.ok) return;
            const data = await res.json();
            const progress = data.tutorial_progress;
            if (progress && !progress.is_completed && !progress.skipped) {
                // First time — auto start after a short delay
                setTimeout(startIfOnWorkspace, 1000);
            }
        } catch (e) {
            console.warn('[Tutorial] Could not check status:', e.message);
        }
    }
};
