// ==================== เสียงเกม สังเคราะห์สด ไม่ใช้ไฟล์เสียง ====================
//
// ทั้งเว็บไม่มีไฟล์เสียงสักไฟล์ และตั้งใจให้เป็นแบบนั้น (THEME.md ข้อ 13)
//   - ไม่มีปัญหา license
//   - ไม่ต้องโหลด ไม่กินแบนด์วิดท์
//   - ปรับจูนได้จากโค้ด ไม่ต้องกลับไปตัดไฟล์ใหม่
//   - เสียงคลื่น square/triangle ให้ฟีล 8-bit ตรงกับธีมพิกเซลพอดี
//
// ข้อบังคับของเบราว์เซอร์: AudioContext เริ่มในสถานะ 'suspended' จนกว่าจะมี user gesture
// จึงห้ามพยายามเล่นเสียงตอนโหลดหน้า — ต้องรอคลิก/แตะครั้งแรกก่อน

const SFX = {
    _ctx: null,
    _master: null,
    enabled: true,

    init() {
        // จำค่าปิดเสียงไว้ข้ามการเข้าใช้
        try {
            this.enabled = localStorage.getItem('robomdt_sfx') !== 'off';
        } catch { this.enabled = true; }

        // ปลุก AudioContext ตอน gesture แรกเท่านั้น แล้วถอด listener ทิ้ง
        const wake = () => {
            this._ensure();
            if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
        };
        ['pointerdown', 'keydown'].forEach(ev =>
            window.addEventListener(ev, wake, { once: true, passive: true }));
    },

    _ensure() {
        if (this._ctx) return this._ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;                 // เบราว์เซอร์เก่า — เงียบไปเฉยๆ ไม่พัง
        this._ctx = new AC();
        this._master = this._ctx.createGain();
        this._master.gain.value = 0.18;       // เบาไว้ก่อน เสียง UI ไม่ควรดัง
        this._master.connect(this._ctx.destination);
        return this._ctx;
    },

    setEnabled(on) {
        this.enabled = !!on;
        try { localStorage.setItem('robomdt_sfx', on ? 'on' : 'off'); } catch { /* โหมดส่วนตัว */ }
        if (on) this.blip(660, 0.06);
    },

    /** โน้ตเดียว — เป็นอิฐก้อนเดียวที่เสียงทุกตัวในไฟล์นี้ใช้ประกอบกัน
     *  freq  เฮิรตซ์ · dur วินาที · type รูปคลื่น · delay หน่วงก่อนเล่น · vol ความดัง
     */
    tone(freq, dur = 0.08, type = 'square', delay = 0, vol = 1) {
        if (!this.enabled) return;
        const ctx = this._ensure();
        if (!ctx || ctx.state === 'suspended') return;

        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        // ซองเสียงสั้นๆ — attack เร็ว decay เป็นเส้นโค้ง กัน "ป๊อป" ตอนตัด
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this._master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    },

    /** เสียงกวาดความถี่ — ใช้กับของที่ "พุ่ง" */
    sweep(from, to, dur = 0.18, type = 'square', delay = 0, vol = 0.8) {
        if (!this.enabled) return;
        const ctx = this._ensure();
        if (!ctx || ctx.state === 'suspended') return;

        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this._master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    },

    /** เสียงซ่า — ใช้ทำเสียงเดินและอนุภาค */
    noise(dur = 0.06, vol = 0.35, delay = 0) {
        if (!this.enabled) return;
        const ctx = this._ensure();
        if (!ctx || ctx.state === 'suspended') return;

        const t = ctx.currentTime + delay;
        const frames = Math.floor(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) {
            // จางลงตามเวลา ไม่งั้นจะฟังเหมือนสัญญาณรบกวนค้าง
            data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
        }

        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 900;

        gain.gain.value = vol;
        src.buffer = buf;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this._master);
        src.start(t);
    },

    // ---------- เสียงที่หน้าเว็บเรียกใช้จริง ----------

    blip(freq = 520, dur = 0.05) { this.tone(freq, dur, 'square', 0, 0.5); },

    /** กดปุ่ม — สองโน้ตติดกันสั้นๆ ให้รู้สึกว่า "คลิกติด" */
    click() {
        this.tone(880, 0.03, 'square', 0, 0.45);
        this.tone(1320, 0.04, 'square', 0.025, 0.3);
    },

    hover() { this.tone(1040, 0.025, 'triangle', 0, 0.18); },

    /** ได้ดาว 1 ดวง — อาร์เพจจิโอไล่ขึ้น 3 โน้ต */
    star() {
        [880, 1174, 1568].forEach((f, i) =>
            this.tone(f, 0.12, 'square', i * 0.06, 0.6));
        this.noise(0.05, 0.15, 0.02);
    },

    /** ผ่านทักษะครบ 3 ดาว — แฟนแฟร์ยาวกว่า จบด้วยโน้ตค้าง */
    skillComplete() {
        [523, 659, 784, 1047].forEach((f, i) =>
            this.tone(f, 0.14, 'square', i * 0.08, 0.65));
        this.tone(1047, 0.4, 'triangle', 0.34, 0.5);
        this.tone(1568, 0.4, 'triangle', 0.34, 0.28);
    },

    /** ปลดล็อกด่านใหม่บนแผนที่ */
    unlock() {
        this.sweep(220, 880, 0.22, 'square', 0, 0.5);
        this.tone(1318, 0.16, 'triangle', 0.2, 0.45);
    },

    /** หุ่นเดินไปด่านถัดไป — เรียกซ้ำทีละก้าว */
    step() { this.noise(0.04, 0.22); this.tone(180, 0.04, 'triangle', 0, 0.25); },

    /** เปิดแผง/หน้าต่าง */
    open()  { this.sweep(400, 780, 0.1, 'triangle', 0, 0.4); },
    close() { this.sweep(780, 400, 0.1, 'triangle', 0, 0.4); },

    /** งานสำเร็จทั่วไป */
    ok()    { this.tone(784, 0.07, 'square', 0, 0.5); this.tone(1047, 0.1, 'square', 0.06, 0.45); },

    /** ผิดพลาด — ต่ำและนุ่ม ห้ามฟังดูเหมือนถูกดุ (THEME.md ข้อ 9 ห้ามลงโทษเด็ก) */
    nope()  { this.tone(300, 0.1, 'triangle', 0, 0.35); this.tone(240, 0.14, 'triangle', 0.08, 0.3); },
};

// ผูกกับ window ด้วย — top-level const อยู่ใน global lexical scope
// เรียก SFX ตรง ๆ ได้ก็จริง แต่โค้ดที่เช็ค `if (window.SFX)` ก่อนใช้จะได้ undefined
// ทำให้เสียงไม่ดังโดยไม่มี error ให้เห็น
window.SFX = SFX;

SFX.init();
