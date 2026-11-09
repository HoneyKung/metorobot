// Auth — handles login, register, modal auth, JWT management
const Auth = {
    token: null,
    refreshToken: null,
    user: null,
    API_URL: '', // same origin

    // สัญญาว่า "เช็ค session ตอนเปิดเว็บเสร็จแล้ว" — resolve เสมอ ไม่เคย reject
    // โค้ดตรงไหนที่คำตอบต่างกันระหว่าง guest กับคนที่ล็อกอินอยู่ ให้ await ตัวนี้
    // ก่อนถาม isLoggedIn() ไม่งั้นจะได้คำตอบตอนที่ยังไม่รู้ว่าใครเป็นใคร
    ready: Promise.resolve(),

    // สาเหตุที่ fetchMe() ล่าสุดไม่สำเร็จ: 'auth' (เซิร์ฟเวอร์ปฏิเสธ token) | 'network' (ไปไม่ถึง)
    _sessionFailure: null,

    init() {
        this.setupEventListeners();
        this.installFetchInterceptor();

        // Check for saved token
        this.token = localStorage.getItem('meto_token');
        this.refreshToken = localStorage.getItem('meto_refresh');

        // เดิมยิง fetchMe() ทิ้งไว้แบบไม่รอ แล้ว navigate ต่อทันที
        // onShow ของ route จึงทำงานตอน this.user ยังเป็น null → isLoggedIn() คืน false
        // สมาชิกที่ล็อกอินอยู่เลยถูกพาไปเส้นทาง guest (Tutorial ไปอ่าน flag ในเครื่อง
        // แทนความคืบหน้าจริงจากเซิร์ฟเวอร์ / Dashboard ขึ้นหน้า "ยังไม่ได้ล็อกอิน")
        //
        // ทำไมไม่ await ตรงนี้ก่อน navigate: เน็ตโรงเรียนช้า จะได้จอขาวค้างหลายวินาที
        // ทั้งที่หน้า workspace ลากบล็อกเล่นได้โดยไม่ต้องรู้ว่าใครล็อกอิน
        // จึงเปิดหน้าให้เห็นทันที แล้วย้ายการรอไปไว้เฉพาะจุดที่คำตอบขึ้นกับสถานะล็อกอินจริง ๆ
        // (route handler ท้ายไฟล์นี้ await Auth.ready ให้แล้ว)
        if (this.token) {
            this.ready = this.fetchMe().then(ok => {
                if (ok) {
                    this.updateHeaderState();
                } else if (this._sessionFailure === 'auth') {
                    // เซิร์ฟเวอร์ปฏิเสธ token จริง ๆ → ล้างทิ้ง ให้ล็อกอินใหม่
                    this.logout();
                }
                // ถ้าเป็น 'network' เก็บ token ไว้ก่อน — WiFi กระตุกทีเดียว
                // ไม่ควรเตะเด็กออกจากระบบทั้งห้องแล้วให้พิมพ์รหัสผ่านใหม่หมด
            });
        }
        // Always show workspace as default
        Router.navigate('#/workspace');
    },

    // ==================== Modal Methods ====================

    showLoginModal() {
        const modal = document.getElementById('auth-modal');
        modal.style.display = 'flex';
        document.getElementById('modal-login').style.display = 'block';
        document.getElementById('modal-register').style.display = 'none';
        // Clear previous errors
        const err = document.getElementById('login-error');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
        // Focus first input
        const input = document.getElementById('login-username');
        if (input) setTimeout(() => input.focus(), 100);
    },

    showRegisterForm() {
        document.getElementById('modal-login').style.display = 'none';
        document.getElementById('modal-register').style.display = 'block';
        this.ensureInviteCodeField();
        // Clear previous errors
        const err = document.getElementById('register-error');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
        // Focus first input
        const input = document.getElementById('reg-username');
        if (input) setTimeout(() => input.focus(), 100);
    },

    // ช่อง "รหัสห้อง" ในฟอร์มสมัคร — สร้างด้วย JS เพราะ index.html เป็นของงานอื่นอยู่
    // (ถ้าย้ายเข้า index.html ได้เมื่อไหร่ ให้ลบฟังก์ชันนี้แล้วใส่ input id เดิมแทน)
    //
    // ทำไมต้องมี: หลังบ้านรับ invite_code ตั้งแต่ตอนสมัครอยู่แล้ว แต่ฟอร์มไม่เคยส่งไป
    // เด็กทั้งห้อง 35 คนจึงต้องสมัครเสร็จ → เปิด Dashboard → กรอกรหัสอีกรอบ คนละ 3 คลิก
    // ผู้ดูแลเสียเวลาต้นคาบไล่บอกทีละคนว่าต้องไปกรอกที่ไหนต่อ
    ensureInviteCodeField() {
        if (document.getElementById('reg-invite-code')) return;

        const form = document.getElementById('register-form');
        if (!form) return;

        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', 'reg-invite-code');
        label.textContent = 'รหัสห้อง (ถ้าผู้ดูแลให้มา)';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'reg-invite-code';
        input.placeholder = 'เช่น AB12CD';
        input.autocomplete = 'off';
        input.maxLength = 8;          // เท่าความยาวสูงสุดของ invite_code ในฐานข้อมูล
        input.style.textTransform = 'uppercase';  // รหัสเป็นตัวใหญ่เสมอ ให้ตาเห็นตรงกับที่ส่งจริง
        // ไม่ใส่ required — เด็กที่ยังไม่มีห้องต้องสมัครผ่านได้ตามปกติ

        group.appendChild(label);
        group.appendChild(input);

        // วางไว้เหนือกล่องข้อความผิดพลาด เพื่อให้ข้อความยังติดกับปุ่มสมัครเหมือนเดิม
        const errorEl = document.getElementById('register-error');
        const anchor = errorEl || form.querySelector('button[type="submit"]');
        if (anchor) form.insertBefore(group, anchor);
        else form.appendChild(group);
    },

    showLoginForm() {
        document.getElementById('modal-login').style.display = 'block';
        document.getElementById('modal-register').style.display = 'none';
        // Clear previous errors
        const err = document.getElementById('login-error');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
    },

    closeModal() {
        const modal = document.getElementById('auth-modal');
        modal.style.display = 'none';
        // Reset forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.reset();
        // Hide errors
        const loginErr = document.getElementById('login-error');
        if (loginErr) { loginErr.style.display = 'none'; loginErr.textContent = ''; }
        const regErr = document.getElementById('register-error');
        if (regErr) { regErr.style.display = 'none'; regErr.textContent = ''; }
    },

    // ==================== Auth Methods ====================

    // อ่านคำตอบเป็น JSON แบบไม่ล้ม
    // เซิร์ฟเวอร์ตอบเป็น HTML ได้ (หน้า error มาตรฐานของ Flask) แล้ว res.json() จะ throw
    // ของเดิม throw ตรงนั้นทีเดียวเด้งไปถึง catch ซึ่งเป็นช่องของ "เน็ตไปไม่ถึงเซิร์ฟเวอร์"
    // เด็กเลยได้อ่านคำวินิจฉัยผิดตัว ผู้ดูแลก็ไปไล่แก้ WiFi ทั้งที่เซิร์ฟเวอร์ตอบอยู่
    async _readJson(res) {
        try {
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // แปลง response ที่ไม่ ok ให้เป็นข้อความไทยที่บอกได้ว่าต้องทำอะไรต่อ
    // ใช้ข้อความจากเซิร์ฟเวอร์ก่อนเสมอ (auth.py เขียนเป็นไทยไว้แล้ว)
    // ที่เหลือคือกรณีที่เซิร์ฟเวอร์ตอบไม่เป็น JSON — ต้องเดาจากรหัสสถานะแทน
    _errorMessage(res, data, fallback) {
        if (data && data.error) return data.error;
        if (res.status === 429) {
            // คนใช้พร้อมกันเยอะจนชนเพดาน ไม่ใช่ความผิดของคนที่กดปุ่ม — ต้องไม่บอกว่ากรอกผิด
            return 'ตอนนี้มีคนใช้ระบบพร้อมกันเยอะ รอสัก 1 นาทีแล้วลองใหม่นะ';
        }
        if (res.status >= 500) {
            return 'ระบบขัดข้องชั่วคราว รอสักครู่แล้วลองใหม่นะ ถ้ายังไม่ได้ ลองใหม่อีกครั้งภายหลัง';
        }
        return fallback;
    },

    // แถบแจ้งเตือนลอยกลางบน — ใช้คลาสเดียวกับที่ script.js ใช้ (.meto-snackbar)
    // ใช้ id เดียวกันด้วย เพื่อให้มีแถบเดียวบนจอเสมอ ไม่ซ้อนกันจนบังงาน
    _toast(message, type) {
        const old = document.getElementById('meto-snackbar');
        if (old) old.remove();

        const bar = document.createElement('div');
        bar.id = 'meto-snackbar';
        bar.className = 'meto-snackbar ' + (type === 'warn' ? 'snackbar-warn' : 'snackbar-success');
        bar.textContent = message;
        document.body.appendChild(bar);

        // เตือนเรื่องรหัสห้องต้องค้างนานกว่าปกติ เพราะเด็กต้องอ่านแล้วจำไปทำต่อ
        const stay = (type === 'warn') ? 6500 : 4000;
        requestAnimationFrame(() => bar.classList.add('show'));
        setTimeout(() => {
            bar.classList.remove('show');
            setTimeout(() => bar.remove(), 400);
        }, stay);
    },

    async register(username, password, displayName, role, inviteCode) {
        const errorEl = document.getElementById('register-error');
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        try {
            const res = await fetch(this.API_URL + '/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    display_name: displayName,
                    role: role,
                    invite_code: inviteCode || undefined
                })
            });

            const data = await this._readJson(res);

            if (!res.ok) {
                errorEl.textContent = this._errorMessage(
                    res, data, 'สมัครสมาชิกไม่สำเร็จ ลองกดสมัครอีกครั้งนะ'
                );
                errorEl.style.display = 'block';
                return false;
            }

            // ตอบ 2xx แต่ไม่มี token = คำตอบไม่ใช่รูปแบบที่ตกลงกันไว้ ห้ามเดินต่อแบบครึ่ง ๆ
            if (!data || !data.token) {
                errorEl.textContent = 'สมัครสมาชิกไม่สำเร็จ ลองกดสมัครอีกครั้งนะ';
                errorEl.style.display = 'block';
                return false;
            }

            // Auto-login after register
            this.saveTokens(data.token, data.refresh_token);
            this.user = data.user;
            this._sessionFailure = null;
            this.ready = Promise.resolve();
            // บัญชีใหม่ต้องไม่พก id โปรเจกต์ของบัญชีเก่าที่เคยใช้เครื่องนี้
            if (typeof ProjectStore !== 'undefined') ProjectStore.resetIdentity();
            if (typeof refreshAISession === 'function') refreshAISession();
            this.closeModal();
            this.updateHeaderState();
            Router.navigate('#/workspace');
            this._reportClassroomResult(data.classroom, inviteCode);
            return true;
        } catch (e) {
            errorEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ เช็คสัญญาณเน็ตแล้วลองใหม่นะ';
            errorEl.style.display = 'block';
            return false;
        }
    },

    // บอกผลของรหัสห้องหลังสมัครผ่านแล้ว
    // รหัสผิดต้องไม่ทำให้สมัครไม่สำเร็จ (auth.py คืนมาเป็น warning ไม่ใช่ error อยู่แล้ว)
    // แต่ถ้าเงียบไปเฉย ๆ เด็กจะนึกว่าเข้าห้องแล้ว ผู้ดูแลมาเช็คตอนท้ายคาบถึงรู้ว่าไม่มีชื่อ
    _reportClassroomResult(classroom, inviteCode) {
        if (!inviteCode) return;

        if (classroom && classroom.warning) {
            this._toast(
                'สมัครสมาชิกเรียบร้อยแล้ว ส่วนรหัสห้อง: ' + classroom.warning +
                ' (เข้าห้องทีหลังได้ที่หน้า Dashboard)',
                'warn'
            );
            return;
        }

        if (classroom && classroom.name) {
            this._toast('สมัครสมาชิกเรียบร้อย เข้าห้อง "' + classroom.name + '" ให้แล้ว');
        }
    },

    async login(username, password) {
        const errorEl = document.getElementById('login-error');
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        try {
            const res = await fetch(this.API_URL + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                errorEl.textContent = data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
                errorEl.style.display = 'block';
                return false;
            }

            this.saveTokens(data.token, data.refresh_token);
            this.user = data.user;
            // สลับบัญชี → ล้าง id โปรเจกต์ของบัญชีก่อนหน้า (กันเซฟทับ/404)
            if (typeof ProjectStore !== 'undefined') ProjectStore.resetIdentity();
            if (typeof refreshAISession === 'function') refreshAISession();
            this.closeModal();
            this.updateHeaderState();
            Router.navigate('#/workspace');
            return true;
        } catch (e) {
            errorEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
            errorEl.style.display = 'block';
            return false;
        }
    },

    async fetchMe() {
        try {
            const res = await fetch(this.API_URL + '/api/auth/me', {
                headers: this.getHeaders()
            });

            if (!res.ok) return false;

            const data = await res.json();
            this.user = data.user;
            this.updateHeaderState();
            return true;
        } catch (e) {
            return false;
        }
    },

    async logout() {
        // แจ้งหลังบ้านก่อนล้าง token — ทำให้มีแถว LOGOUT ในฐานข้อมูลจริง
        // (ใช้คำนวณความยาว session ในเล่มวิจัย) ล้มเหลวก็ต้องออกจากระบบต่อได้
        if (this.token) {
            try {
                await fetch(this.API_URL + '/api/auth/logout', {
                    method: 'POST',
                    headers: this.getHeaders(),
                    __skipAuthRetry: true,
                });
            } catch (e) {
                console.warn('[Auth] logout endpoint ไม่ตอบ:', e.message);
            }
        }

        this.clearTokens();
        this.user = null;
        // ออกจากระบบ → ตัดความผูกพันกับโปรเจกต์ของบัญชีนี้
        if (typeof ProjectStore !== 'undefined') ProjectStore.resetIdentity();
        if (typeof refreshAISession === 'function') refreshAISession();
        this.updateHeaderState();
        // If on dashboard, go back to workspace
        if (Router.getCurrentPage() === 'page-dashboard') {
            Router.navigate('#/workspace');
        }
    },

    // ==================== Token Management ====================

    saveTokens(accessToken, refreshToken) {
        this.token = accessToken || null;
        if (this.token) localStorage.setItem('meto_token', this.token);
        else localStorage.removeItem('meto_token');

        if (refreshToken) {
            this.refreshToken = refreshToken;
            localStorage.setItem('meto_refresh', refreshToken);
        }
    },

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('meto_token');
        localStorage.removeItem('meto_refresh');
    },

    // ขอ access token ใบใหม่ — คืน true ถ้าได้ใบใหม่
    // เก็บ promise ไว้ตัวเดียว เพื่อไม่ให้หลาย request ที่โดน 401 พร้อมกันแย่งกันต่ออายุ
    async renewAccessToken() {
        if (!this.refreshToken) return false;
        if (this._renewPromise) return this._renewPromise;

        this._renewPromise = (async () => {
            try {
                const res = await fetch(this.API_URL + '/api/auth/refresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.refreshToken,
                    },
                    __skipAuthRetry: true,
                });
                if (!res.ok) {
                    this.clearTokens();
                    return false;
                }
                const data = await res.json();
                if (!data.token) return false;
                this.saveTokens(data.token, null);
                return true;
            } catch (e) {
                return false;
            } finally {
                this._renewPromise = null;
            }
        })();

        return this._renewPromise;
    },

    // ดัก 401 ของ API ตัวเอง → ต่ออายุ token แล้วยิงซ้ำหนึ่งครั้ง
    // ทำที่ชั้น fetch เพื่อไม่ต้องแก้จุดเรียก API ทุกจุดในเว็บ
    installFetchInterceptor() {
        if (window.__metoFetchPatched) return;
        window.__metoFetchPatched = true;

        const originalFetch = window.fetch.bind(window);
        const OWN_API = /^\/(api\/|analyze|new_session|clear_session)/;

        window.fetch = async (input, init) => {
            const res = await originalFetch(input, init);
            // 401 = token หมดอายุ / ไม่มี token, 422 = token ใช้ไม่ได้
            // ทั้งสองกรณีลองต่ออายุด้วย refresh token หนึ่งครั้ง
            if (res.status !== 401 && res.status !== 422) return res;

            const raw = (typeof input === 'string') ? input : (input && input.url) || '';
            const path = raw.startsWith(window.location.origin)
                ? raw.slice(window.location.origin.length)
                : raw;

            const opts = init || (typeof input === 'object' ? input : null) || {};
            if (opts.__skipAuthRetry) return res;
            if (!OWN_API.test(path)) return res;
            if (path.indexOf('/api/auth/') === 0) return res;
            if (!this.refreshToken) return res;

            const renewed = await this.renewAccessToken();
            if (!renewed) return res;

            // ยิงซ้ำด้วย token ใบใหม่
            const headers = {};
            const given = opts.headers;
            if (given) {
                if (typeof Headers !== 'undefined' && given instanceof Headers) {
                    given.forEach((v, k) => { headers[k] = v; });
                } else {
                    Object.assign(headers, given);
                }
            }
            headers['Authorization'] = 'Bearer ' + this.token;

            const retryInit = Object.assign({}, opts, { headers, __skipAuthRetry: true });
            return originalFetch(path, retryInit);
        };
    },

    // ==================== UI State ====================

    updateHeaderState() {
        const guestEl = document.getElementById('header-guest');
        const userEl = document.getElementById('header-user');
        const usernameEl = document.getElementById('header-username');

        if (this.isLoggedIn()) {
            if (guestEl) guestEl.style.display = 'none';
            if (userEl) userEl.style.display = 'flex';
            if (usernameEl) {
                usernameEl.textContent = this.user.display_name || this.user.username;
            }
        } else {
            if (guestEl) guestEl.style.display = 'flex';
            if (userEl) userEl.style.display = 'none';
            if (usernameEl) usernameEl.textContent = '';
        }
    },

    // ==================== Helpers ====================

    isLoggedIn() {
        return !!this.token && !!this.user;
    },

    isGuest() {
        return !this.token;
    },

    getRole() {
        return this.user ? this.user.role : null;
    },

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = 'Bearer ' + this.token;
        }
        return headers;
    },

    // ==================== Event Listeners ====================

    setupEventListeners() {
        // Login form submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                if (username && password) {
                    const btn = loginForm.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.textContent = 'กำลังเข้าสู่ระบบ...';
                    await this.login(username, password);
                    btn.disabled = false;
                    btn.textContent = 'เข้าสู่ระบบ';
                }
            });
        }

        // Register form submit
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('reg-username').value.trim();
                const displayName = document.getElementById('reg-display-name').value.trim();
                const password = document.getElementById('reg-password').value;
                const confirm = document.getElementById('reg-confirm').value;

                // Validation
                const errorEl = document.getElementById('register-error');

                if (!username || !displayName || !password) {
                    errorEl.textContent = 'กรุณากรอกข้อมูลให้ครบ';
                    errorEl.style.display = 'block';
                    return;
                }

                if (password.length < 6) {
                    errorEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
                    errorEl.style.display = 'block';
                    return;
                }

                if (password !== confirm) {
                    errorEl.textContent = 'รหัสผ่านไม่ตรงกัน';
                    errorEl.style.display = 'block';
                    return;
                }

                const btn = registerForm.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'กำลังสมัคร...';
                await this.register(username, password, displayName, 'USER', '');
                btn.disabled = false;
                btn.textContent = 'สมัครสมาชิก';
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('auth-modal');
                if (modal && modal.style.display !== 'none') {
                    this.closeModal();
                }
            }
        });
    }
};

// ==================== Route Registration ====================

Router.register('#/workspace', 'page-workspace', () => {
    // Lazy-init Blockly workspace
    if (typeof initWorkspace === 'function') {
        initWorkspace();
    }
    // Auto-start tutorial ครั้งแรก — ทั้ง guest (localStorage) และผู้ใช้ล็อกอิน (เซิร์ฟเวอร์)
    if (typeof Tutorial !== 'undefined') {
        Tutorial.watchRouteChange();
        Tutorial.checkAutoStart();
    }
});

Router.register('#/dashboard', 'page-dashboard', () => {
    if (typeof Dashboard !== 'undefined') {
        if (Auth.isLoggedIn()) {
            Dashboard.load();
        } else {
            Dashboard.showGuestState();
        }
    }
});

// Start router and auth
Router.init();
Auth.init();
