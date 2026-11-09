// ============================================================
// METO Digital Twin — 2 จอ
//   จอ 1 (เวที)     : หุ่นมองจากด้านบน (top view) — ตำแหน่ง/ทิศทาง/ท่าแขน
//   จอ 2 (จอหน้าหุ่น): digital twin ของจอ TFT 320x240 บนหุ่นจริง
//                     port drawEyes_* จาก Robo/Robo.ino มา 1:1 + idle เหมือนเฟิร์มแวร์
// เชื่อมหุ่นจริงแบบเรียลไทม์ผ่าน GET http://MDTrobot.local/state (ถ้าเฟิร์มแวร์รองรับ)
// ไม่มีหุ่น/เฟิร์มแวร์เก่า → รัน idle จำลองในเบราว์เซอร์เอง (โหมด SIM)
// สเปคภาพ: sprites/README.md   |   log: window.RobotLog
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // DEBUG TRACE — ตัวช่วยดีบักเวลาต่อหุ่นจริงไม่ติด (ไม่ใช่ฟีเจอร์ในเว็บ)
    // ไม่มี UI ไม่มีไฟล์ ไม่พิมพ์ console เอง — เก็บในหน่วยความจำเฉยๆ
    // ดูเมื่อต้องการ: RobotSim.log.dump()  /  ให้พิมพ์สด: RobotSim.log.echo = true
    // บันทึกการแก้โค้ดของโปรเจค (log file จริงๆ) อยู่ที่ CHANGELOG.md
    // ============================================================
    var RobotLog = {
        entries: [],
        max: 300,
        echo: false,             // true = พิมพ์ลง console ด้วย (ตอน debug)
        add: function (tag, msg, data) {
            var e = { t: new Date(), tag: tag || 'INFO', msg: String(msg) };
            if (data !== undefined) e.data = data;
            this.entries.push(e);
            if (this.entries.length > this.max) this.entries.shift();
            if (this.echo) console.log('[' + e.tag + ']', e.msg, data !== undefined ? data : '');
            return e;
        },
        dump: function () {
            console.log(this.entries.map(function (e) {
                var ts = e.t.toTimeString().slice(0, 8) + '.' +
                    String(e.t.getMilliseconds()).padStart(3, '0');
                return ts + ' [' + e.tag + '] ' + e.msg +
                    (e.data !== undefined ? ' ' + JSON.stringify(e.data) : '');
            }).join('\n'));
        },
        clear: function () { this.entries = []; }
    };
    window.RobotLog = RobotLog;   // ให้ script.js เรียกบันทึกได้ (ไม่แสดงในหน้าเว็บ)

    // ============================================================
    // สถานะหุ่น (ค่าตรรกะ) + สถานะที่แสดง (ค่าที่ lerp ตามให้ลื่น)
    // ============================================================
    var robot = {
        x: 0, y: 0,          // ตำแหน่งบนเวที (px) — +x ขวา, +y ขึ้น
        facing: 0,           // 0=ขึ้น(เหนือ), 1=ขวา, 2=ลง, 3=ซ้าย — top view เริ่มต้นหันขึ้น
        angleTarget: 0,      // องศาต่อเนื่อง (หมุนทางสั้นสุดไม่ต้องคิด wrap) 0=ขึ้น, +=ตามเข็ม
        // ท่าทางเป็นองศาเชิงกลแบบต่อเนื่อง ตรงกับเฟิร์มแวร์รอบ 6 พ.ย. (yaw: tilt: lift: hand:)
        // เดิมเก็บเป็น 3 ท่า (0/1/2) ซึ่งแสดงคำสั่งตามองศาไม่ได้
        yaw: 0,              // หัวหัน องศาเชิงกล + = หันไปทางแขนซ้าย (−90…90)
        tilt: 0,             // ก้มเงย + = เงย (−10…10)
        liftL: 0, liftR: 0,  // แขนซ้าย/ขวา องศาจากแนวนอน + = ยก (−43…48)
        gripL: 50, gripR: 50,// มือซ้าย/ขวา % 0 = กางสุด 100 = หนีบสุด (ท่าพักอยู่กลาง)
        holding: false,      // ซิม: ถือของอยู่ (ไม่มีวัตถุจริง จึงถือว่าหนีบแล้วยกได้)
        verify: -1,          // ซิม: ผลคำสั่ง Q ล่าสุด
        cliffL: false, cliffR: false,   // เจอขอบ (ซิมใช้ขอบเวที / หุ่นจริงใช้ TCRT)
        cam: '-', camOk: false,         // ตัวอักษรล่าสุดจากกล้อง (ซิมไม่มีกล้อง)
        headSpeed: 90,       // hs: องศา/วินาที (มีผลกับซิมแค่ความเร็วหันที่เห็น)
        face: 'normal',
        // ---- รอบ #501 (ตรงกับเฟิร์มแวร์ 8 พ.ย.) ----
        simObj: true,        // ซิม: มีของอยู่ตรงหน้าไหม (ปิดได้ด้วย RobotSim.setSimObject(false) ไว้ลองภารกิจไม่สำเร็จ)
        failback: false,     // failback:1 — หนีบไม่เจอของแล้วย้อนกลับจุดเริ่ม
        path: [],            // ทางล้อที่เดินตั้งแต่เริ่มโปรแกรม [{op:'fw', ms:1000}, ...] ใช้กับ back
        prog: 0,             // 0 ว่าง · 1 กำลังรัน · 2 จบครบ · 3 หยุด/เจอขอบ · 4 ภารกิจหนีบไม่สำเร็จ
        endReq: 0,           // ต้องจบโปรแกรมด้วยสถานะนี้ (3 = ชนขอบ, 4 = ไม่เจอของ) — runSimulation เป็นคนจบ
        bugN: 0, bug: '',    // คำสั่งที่ไม่รู้จัก (หุ่นงงแล้วข้าม)
        touchN: 0, touchEvt: 0,
        idleOn: true         // สวิตช์ท่าไอเดิล (ค่าเริ่ม = เปิด)
    };

    var DIR_UP = 0, DIR_RIGHT = 1, DIR_DOWN = 2, DIR_LEFT = 3;

    // ท่าที่คำสั่งเดิมพาไป (ค่าจากรายงานเฟิร์มแวร์ หัวข้อ 5 ข้อ 3) — ใช้ทั้งซิมและแปลงค่าจากหุ่นเก่า
    var OLD_LIFT_L = { r: 23, f: -1, v: -31 };    // แขนซ้าย ยก / กลาง / ลง
    var OLD_LIFT_R = { t: 28, g: 0, b: -30 };     // แขนขวา ยก / กลาง / ลง
    var GRIP_CENTER = 50;                          // มือ "กลาง" ของคำสั่ง 2 กับ 5

    function clampN(v, lo, hi) { v = Number(v); if (isNaN(v)) v = 0; return Math.max(lo, Math.min(hi, v)); }

    // ค่าที่ใช้วาดจริง (ตามหลัง robot.* แบบนุ่มนวล)
    var view = {
        x: 0, y: 0, angle: 0,
        tilt: 0, liftL: 0, liftR: 0, gripL: 50, gripR: 50,
        headDeg: 0,          // องศาการหันหัวเทียบตัว (+ = ขวาของหุ่น)
        headIdleDeg: 0       // ส่ายหัวเบาๆ ตอน idle (จาก idle engine)
    };

    var isRunning = false;   // กำลังรันโปรแกรมจาก Blockly (= isExecutingCommand ในเฟิร์มแวร์)
    var trail = [];          // รอยทางเดิน (ข้อดีของมุมมองด้านบน)
    var TRAIL_MAX = 60;

    // ขอบเวที (ล็อกให้อยู่บนกริด 40px พอดี)
    var STAGE_W = 320, STAGE_H = 240;
    var BOUND_X = 120, BOUND_Y = 80;
    var STEP = 40;

    var canvas, ctx;
    var stageDirty = true;

    // ===== สีวาดด้วยโค้ด (fallback มุมมองด้านบน) =====
    var C = {
        body: '#7BB3E0', bodyDark: '#5A9BD4', bodyOutline: '#3A7BBF',
        head: '#8EC8F0', headOutline: '#5A9BD4',
        screen: '#333', screenGlass: '#FFFFFF',
        arm: '#6BAED6', armOutline: '#4A8EBF',
        hand: '#FFD180', handOutline: '#E6A040',
        track: '#555', trackDark: '#3d3d3d', wheelOutline: '#333',
        accent: '#BED73B',
        grid: '#e8e8e8', axis: 'rgba(255,200,0,0.35)',
        trail: 'rgba(58,83,164,0.35)'
    };

    // ============================================================
    // SPRITE (มุมมองด้านบน) — ดูสเปค sprites/README.md
    // ผืน 640x640 จัตุรัส, หุ่นหันขึ้น, จุดกลางผืน = จุดหมุนตัว = จุดคอ
    // ชิ้นไหนยังไม่มีภาพ → วาดหุ่นด้วยโค้ด (มุมบนเหมือนกัน) ทั้งตัว
    // ============================================================
    var SPRITE_ROOT = '/static/sprites/';
    var SPRITE_SIZE = 640;       // ผืนจัตุรัส
    var SPRITE_SCALE = 0.20;     // ย่อให้ฐานหุ่นกว้าง ~60px บนเวที (ปรับได้)
    var USE_FACE_SPRITES = false; // true = ใช้ภาพวาดมือในจอที่ 2 (ต้องมีไฟล์ใน sprites/face/)

    // ตัดสินใจแล้ว: หุ่นบนเวทีวาดด้วยโค้ดอย่างเดียว ไม่ใช้ภาพ
    // เหตุผล: ชุดภาพเดิมใน sprites/ (front/back/side) ไม่ตรงกับที่โค้ดวาดจริง
    //         เอามาผสมจะขัดกันเอง — เก็บไฟล์ไว้เฉย ๆ ห้ามเอามาโชว์
    // ผลพลอยได้: เลิกยิงขอ sprites/top/* ที่โฟลเดอร์ว่าง = ตัด 404 ทิ้ง 22 ครั้งต่อการโหลด 1 หน้า
    var USE_TOP_SPRITES = false;

    var ARM_STATES = ['Close', 'Normal', 'Open'];   // armLeft/armRight = 0,1,2
    var HAND_STATES = ['Down', 'Center', 'Up'];     // handLeft/handRight = 0,1,2
    var HEAD_NAMES = ['Left', 'Center', 'Right'];   // robot.head = 0,1,2

    var Sprites = { images: {}, failed: {}, pending: 0, total: 0, ready: false };

    function buildSpriteManifest() {
        var m = {};
        if (USE_TOP_SPRITES) {
            m['top_Base'] = 'top/Base/top_Base.png';
            HEAD_NAMES.forEach(function (h) {
                m['top_Head_' + h] = 'top/Head/top_Head_' + h + '.png';
            });
            ARM_STATES.forEach(function (a) {
                HAND_STATES.forEach(function (h) {
                    m['top_ArmLeft_' + a + '_' + h] = 'top/ArmLeft/top_ArmLeft_' + a + '_' + h + '.png';
                    m['top_ArmRight_' + a + '_' + h] = 'top/ArmRight/top_ArmRight_' + a + '_' + h + '.png';
                });
            });
        }
        if (USE_FACE_SPRITES) {
            Object.keys(FACE_SPRITE_FILES).forEach(function (f) {
                m['face_' + f] = 'face/face_' + f + '.png';
            });
        }
        return m;
    }

    function loadSprites() {
        var manifest = buildSpriteManifest();
        var keys = Object.keys(manifest);
        Sprites.total = keys.length;
        RobotLog.add('SPRITE', 'เริ่มโหลดภาพหุ่น ' + keys.length + ' ไฟล์ จาก ' + SPRITE_ROOT + 'top/');
        keys.forEach(function (key) {
            var im = new Image();
            Sprites.pending++;
            im.onload = function () {
                if (--Sprites.pending === 0) finishSpriteLoad();
                stageDirty = true;
            };
            im.onerror = function () {
                Sprites.failed[key] = true;
                if (--Sprites.pending === 0) finishSpriteLoad();
            };
            im.src = SPRITE_ROOT + manifest[key];
            Sprites.images[key] = im;
        });
        if (keys.length === 0) finishSpriteLoad();
    }

    function finishSpriteLoad() {
        Sprites.ready = true;
        var failed = Object.keys(Sprites.failed).length;
        var ok = Sprites.total - failed;
        stageDirty = true;
        if (failed === 0) {
            RobotLog.add('SPRITE', 'โหลดภาพหุ่นครบ ' + ok + '/' + Sprites.total + ' ไฟล์');
        } else {
            RobotLog.add('SPRITE', 'โหลดได้ ' + ok + '/' + Sprites.total + ' ไฟล์ ที่ขาดจะวาดด้วยโค้ดแทน',
                Object.keys(Sprites.failed));
            console.info('[Sprites] ยังไม่มีภาพ ' + failed + ' ไฟล์ (ดู sprites/top/FILELIST.txt) ใช้ภาพวาดด้วยโค้ดไปก่อน');
        }
    }

    // คืนภาพเฉพาะที่โหลดสำเร็จ (ไม่งั้น null → fallback)
    function spr(key) {
        var im = Sprites.images[key];
        return (im && im.complete && !Sprites.failed[key] && im.naturalWidth > 0) ? im : null;
    }

    function armKey(side, armState, handState) {
        return 'top_' + side + '_' + ARM_STATES[armState] + '_' + HAND_STATES[handState];
    }

    // ============================================================
    // จอ 1 — เวทีมุมมองด้านบน
    // ============================================================
    function initCanvas() {
        var container = document.getElementById('stage-container');
        if (!container) return;
        ['sprite', 'stage-axis', 'robot-sim-canvas'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.remove();
        });

        canvas = document.createElement('canvas');
        canvas.id = 'robot-sim-canvas';
        canvas.width = STAGE_W;
        canvas.height = STAGE_H;
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        container.appendChild(canvas);
        ctx = canvas.getContext('2d');
        stageDirty = true;
        drawStage();
    }

    function drawStage() {
        if (!ctx) return;
        ctx.clearRect(0, 0, STAGE_W, STAGE_H);

        // พื้นเวที: กริด + แกน (มุมบน = มองพื้นห้อง)
        ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5;
        for (var gx = 0; gx <= STAGE_W; gx += STEP / 2) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, STAGE_H); ctx.stroke();
        }
        for (var gy = 0; gy <= STAGE_H; gy += STEP / 2) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(STAGE_W, gy); ctx.stroke();
        }
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, STAGE_H / 2); ctx.lineTo(STAGE_W, STAGE_H / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(STAGE_W / 2, 0); ctx.lineTo(STAGE_W / 2, STAGE_H); ctx.stroke();

        drawTrail();

        var cx = STAGE_W / 2 + view.x;
        var cy = STAGE_H / 2 - view.y;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(view.angle * Math.PI / 180);
        drawHeadingArrow();                       // ลูกศรบอกทิศ "เดินหน้า"
        if (!drawRobotTopSprites()) drawRobotTopFallback();
        // เซนเซอร์กันตกเจอขอบ → ขีดแดงที่มุมหน้าของฝั่งนั้น
        if (robot.cliffL || robot.cliffR) {
            ctx.fillStyle = 'rgba(255,68,68,0.85)';
            if (robot.cliffL) ctx.fillRect(-30, -42, 14, 4);
            if (robot.cliffR) ctx.fillRect(16, -42, 14, 4);
        }
        ctx.restore();

        drawSideInset();

        // ป้ายบอกทิศ (มุมบนขวา) — ชื่อจอ/มุมมองอยู่บนแถบป้ายของการ์ดแล้ว
        var labels = ['หันขึ้น ↑', 'หันขวา →', 'หันลง ↓', 'หันซ้าย ←'];
        ctx.fillStyle = '#8a93ad';
        ctx.font = '10px Prompt, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(labels[robot.facing], STAGE_W - 8, 15);
    }

    function drawTrail() {
        if (trail.length < 2) return;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = 0; i < trail.length; i++) {
            var px = STAGE_W / 2 + trail[i].x, py = STAGE_H / 2 - trail[i].y;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
    }

    // ลูกศรทิศหน้า — วาดใน local coords (หุ่นหันขึ้น) จึงหมุนตามตัวเอง
    function drawHeadingArrow() {
        ctx.save();
        ctx.fillStyle = 'rgba(190,215,59,0.85)';
        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.lineTo(-7, -40);
        ctx.lineTo(7, -40);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ---- วาดจาก sprite (คืน false ถ้าภาพไม่ครบ) ----
    function drawRobotTopSprites() {
        if (!USE_TOP_SPRITES) return false;   // วาดด้วยโค้ดเสมอ (ดูเหตุผลที่ USE_TOP_SPRITES)
        // ชุดภาพมีแค่ 3 ท่า → ปัดองศาให้เป็นท่าที่ใกล้สุด
        var headIdx = robot.yaw > 20 ? 0 : (robot.yaw < -20 ? 2 : 1);
        var armIdx = function (lift) { return lift > 12 ? 0 : (lift < -15 ? 2 : 1); };
        var handIdx = function (g) { return g < 25 ? 0 : (g > 75 ? 2 : 1); };
        var base = spr('top_Base');
        var head = spr('top_Head_' + HEAD_NAMES[headIdx]);
        var aL = spr(armKey('ArmLeft', armIdx(robot.liftL), handIdx(robot.gripL)));
        var aR = spr(armKey('ArmRight', armIdx(robot.liftR), handIdx(robot.gripR)));
        if (!base || !head || !aL || !aR) return false;

        var d = SPRITE_SIZE * SPRITE_SCALE;
        var o = -d / 2;
        ctx.drawImage(base, o, o, d, d);
        ctx.drawImage(aL, o, o, d, d);
        ctx.drawImage(aR, o, o, d, d);

        // หัว: ภาพ 3 ท่าหลัก + หมุนส่วนต่างที่เหลือ (ส่ายหัว idle / มุมจากหุ่นจริง)
        var residual = view.headDeg - (headIdx - 1) * 40;
        ctx.save();
        ctx.rotate(residual * Math.PI / 180);
        ctx.drawImage(head, o, o, d, d);
        ctx.restore();
        return true;
    }

    // ---- วาดด้วยโค้ด (มุมมองด้านบน) — ใช้ตอนภาพยังไม่ครบ ----
    // local coords: หุ่นหันขึ้น (-y = ทิศหน้า), (0,0) = จุดหมุนตัว = จุดคอ
    function drawRobotTopFallback() {
        // ตีนตะขาบซ้าย/ขวา (มองจากบนเห็นเป็นแถบยาวตามทิศเดิน)
        drawTrackTop(-27);
        drawTrackTop(27);

        // ลำตัว
        roundRect(-21, -30, 42, 60, 8, C.body, C.bodyOutline, 2);
        // ร่องระบายอากาศบนฝาหลัง (ท้ายหุ่น)
        ctx.strokeStyle = C.bodyDark; ctx.lineWidth = 1;
        for (var v = 0; v < 3; v++) {
            ctx.beginPath(); ctx.moveTo(-11, 12 + v * 6); ctx.lineTo(11, 12 + v * 6); ctx.stroke();
        }

        // แขน (ไหล่อยู่ค่อนไปด้านหน้าเล็กน้อย)
        drawArmTop(-1, view.liftL, view.gripL);
        drawArmTop(1, view.liftR, view.gripR);

        // หัว (หมุนรอบจุดคอ = (0,0))
        ctx.save();
        ctx.rotate(view.headDeg * Math.PI / 180);
        roundRect(-17, -19, 34, 30, 7, C.head, C.headOutline, 2);
        // ขอบจอ TFT ที่ด้านหน้าหัว — บอกว่าหน้าหันทางไหน
        roundRect(-14, -21, 28, 8, 3, C.screen, '#222', 1);
        ctx.fillStyle = C.screenGlass;
        ctx.fillRect(-11.5, -19.5, 23, 3.2);
        // เสาอากาศ
        ctx.beginPath(); ctx.arc(0, 4, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = C.accent; ctx.fill();
        ctx.restore();
    }

    function drawTrackTop(x) {
        roundRect(x - 8, -34, 16, 68, 4, C.track, C.wheelOutline, 1.5);
        ctx.strokeStyle = C.trackDark; ctx.lineWidth = 1;
        for (var i = 0; i < 8; i++) {
            var ty = -30 + i * 8;
            ctx.beginPath(); ctx.moveTo(x - 8, ty); ctx.lineTo(x + 8, ty); ctx.stroke();
        }
    }

    // มองจากบน: แขนยื่นไปข้างหน้า (-y) เยื้องออกข้างนิดหน่อย
    //   ยก/ลด (lift) = ความยาวที่เห็นหดลงตาม cos (foreshortening) + มือใหญ่ขึ้นเมื่อยกสูง (ใกล้กล้องด้านบน)
    //   ลดต่ำกว่าแนวนอน = มีเงาเยื้องใต้แขน
    //   มือหนีบ (grip %) = ก้ามสองข้างที่ปลายแขน ห่างกันตาม 100 − grip
    function drawArmTop(side, liftDeg, gripPct) {
        var swing = 22;                                       // เยื้องออกข้าง (ไม่ให้ซ้อนใต้ลำตัว)
        var lr = liftDeg * Math.PI / 180;
        var armLen = 32 * Math.max(0.45, Math.cos(lr));
        var handR = 4.2 + 1.4 * (liftDeg / 48);               // ยกสูง = มือใหญ่ขึ้น

        ctx.save();
        ctx.translate(side * 20, -8);                         // จุดไหล่
        ctx.rotate(side * swing * Math.PI / 180);

        if (liftDeg < -3) {   // เงาเยื้องท้ายแขนตอนแขนต่ำกว่าแนวนอน
            ctx.save();
            ctx.globalAlpha = Math.min(0.3, 0.1 + (-liftDeg) / 150);
            roundRect(-3, -armLen + 3, 7, armLen, 3, '#000', null, 0);
            ctx.restore();
        }

        roundRect(-3.5, -armLen, 7, armLen, 3, C.arm, C.armOutline, 1.5);

        // ก้ามหนีบ — 0% = กางสุด, 100% = หนีบชิด
        var gap = 1.2 + (1 - clampN(gripPct, 0, 100) / 100) * (handR + 2.5);
        ctx.strokeStyle = C.handOutline; ctx.lineWidth = 1;
        ctx.fillStyle = C.hand;
        [-1, 1].forEach(function (s) {
            ctx.beginPath();
            ctx.ellipse(s * gap, -armLen - handR * 0.9, handR * 0.45, handR * 1.05, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        });
        if (liftDeg > 15) {   // ไฮไลต์ = ชูขึ้น (ใกล้กล้องด้านบน)
            ctx.beginPath();
            ctx.arc(0, -armLen - 1, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
        }
        ctx.restore();
    }

    // กล่องมุมมองด้านข้าง (มุมล่างซ้ายของเวที) — มุมบนมองก้มเงยกับองศาแขนไม่เห็น
    // จึงวาดเพิ่ม: หัวเอียงตาม tilt · แขนซ้าย (ทึบ) แขนขวา (จาง) ตามองศา · ก้ามตาม grip %
    function drawSideInset() {
        var bx = 4, by = STAGE_H - 70, bw = 84, bh = 66;
        ctx.save();
        roundRect(bx, by, bw, bh, 6, 'rgba(255,255,255,0.88)', '#c9d2e8', 1);
        ctx.fillStyle = '#8a93ad';
        ctx.font = '8px Prompt, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('ด้านข้าง', bx + 4, by + 9);

        // หุ่นหันขวา (ทิศหน้า = +x) — ตัว ตีนตะขาบ หัว
        var ox = bx + 30, oy = by + 56;                          // มุมล่างของลำตัว
        roundRect(ox - 14, oy - 2, 30, 6, 3, C.track, C.wheelOutline, 1);
        roundRect(ox - 12, oy - 22, 24, 20, 4, C.body, C.bodyOutline, 1.2);

        // หัว หมุนรอบคอ (ox, oy-22) · tilt + = เงย = หมุนทวนเข็ม (ตัวหันขวา)
        ctx.save();
        ctx.translate(ox, oy - 22);
        ctx.rotate(-view.tilt * 2 * Math.PI / 180);              // ขยาย 2 เท่าให้มองเห็น (ช่วงจริงแค่ ±10)
        roundRect(-10, -15, 20, 15, 4, C.head, C.headOutline, 1.2);
        fillRectC('#333', 8, -13, 3, 11);                        // จอหน้าอยู่ด้านหน้า (+x)
        ctx.restore();

        // แขน — ไหล่ที่ (ox+8, oy-16) · lift + = ยก = หมุนทวนเข็ม
        function arm(lift, grip, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ox + 8, oy - 16);
            ctx.rotate(-lift * Math.PI / 180);
            roundRect(0, -2.5, 22, 5, 2.5, C.arm, C.armOutline, 1);
            var g = 1 + (1 - clampN(grip, 0, 100) / 100) * 4;
            ctx.strokeStyle = C.handOutline; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(22, -g); ctx.lineTo(28, -g); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(22, g); ctx.lineTo(28, g); ctx.stroke();
            ctx.restore();
        }
        arm(view.liftR, view.gripR, 0.45);
        arm(view.liftL, view.gripL, 1);

        ctx.fillStyle = '#5b6380';
        ctx.font = '7px Prompt, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('ก้มเงย ' + Math.round(robot.tilt) + '°', bx + bw - 3, by + 9);
        ctx.restore();
    }

    function fillRectC(color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

    function roundRect(x, y, w, h, r, fill, stroke, lineW) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW || 1; ctx.stroke(); }
    }

    // ============================================================
    // จอ 2 — จอหน้าหุ่น (digital twin ของจอ TFT 320x240)
    // ค่าพิกัด/รัศมีทุกตัว port ตรงจาก Robo/Robo.ino (drawEyes_*)
    // แก้ที่นี่ต้องแก้ในเฟิร์มแวร์ให้ตรงกันด้วย ไม่งั้น twin ไม่ตรงของจริง
    // ============================================================
    var TFT_W = 320, TFT_H = 240;
    var EYE_Y = (TFT_H / 2) - 10;        // 110
    var EYE_L_X = (TFT_W / 2) - 80;      // 80
    var EYE_R_X = (TFT_W / 2) + 80;      // 240
    var T = {
        white: '#FFFFFF', black: '#000000', red: '#FF0000',
        tear: '#009AFF',       // TEAR_COLOR 0x04DF
        heart: '#DC143C',      // tft.color565(220,20,60)
        blush: '#FF8296'       // tft.color565(255,130,150)
    };

    // อารมณ์ (char เดียวกับเฟิร์มแวร์) → ชื่อเฟรม
    var EMO_FRAME = {
        N: 'Normal', H: 'Happy', S: 'Sad', A: 'Angry', O: 'Shocked',
        Z: 'Sleepy', C: 'Confused', V: 'Love', B: 'Shy'
    };
    // ชื่ออารมณ์ฝั่งเว็บ (robot.face) → char เฟิร์มแวร์
    var WEB_TO_EMO = {
        normal: 'N', happy: 'H', sad: 'S', angry: 'A', shocked: 'O',
        sleepy: 'Z', confused: 'C', love: 'V', shy: 'B'
    };
    var FACE_SPRITE_FILES = {
        Normal: 1, LookLeft: 1, LookRight: 1, Happy: 1, Sad: 1, Angry: 1, Shocked: 1,
        Sleepy: 1, Confused: 1, Love: 1, Shy: 1, HalfClosed: 1, Closed: 1
    };
    var EMO_LABEL_TH = {
        N: 'ปกติ', H: 'ยิ้ม', S: 'เศร้า', A: 'โมโห', O: 'ตกใจ',
        Z: 'ง่วง', C: 'งง', V: 'รัก', B: 'เขิน'
    };

    var FaceTwin = {
        canvas: null, ctx: null,
        emo: 'N',            // อารมณ์ฐาน (currentEmotion ในเฟิร์มแวร์)
        frame: null,         // เฟรมที่วาดอยู่จริง (อาจเป็น Closed/HalfClosed ตอนกระพริบ)
        heartSize: 1,
        dirty: true
    };

    function ensureFaceCanvas() {
        var host = document.getElementById('face-container');
        if (!host) return false;
        var c = document.getElementById('robot-face-canvas');
        if (!c) {
            c = document.createElement('canvas');
            c.id = 'robot-face-canvas';
            host.appendChild(c);
        }
        c.width = TFT_W; c.height = TFT_H;
        FaceTwin.canvas = c;
        FaceTwin.ctx = c.getContext('2d');
        FaceTwin.dirty = true;
        return true;
    }

    function showFrame(name, heartSize) {
        var hs = heartSize || 1;
        if (FaceTwin.frame === name && FaceTwin.heartSize === hs) return;
        FaceTwin.frame = name;
        FaceTwin.heartSize = hs;
        FaceTwin.dirty = true;
    }

    function baseFrame() {
        return EMO_FRAME[FaceTwin.emo] || 'Normal';
    }

    function setEmotion(emo, why) {
        if (!EMO_FRAME[emo]) emo = 'N';
        if (FaceTwin.emo === emo) return;
        FaceTwin.emo = emo;
        showFrame(baseFrame(), 1);
        heartbeatPhase = 0; lastHeartbeatTime = now();
        RobotLog.add('FACE', 'อารมณ์ → ' + (EMO_LABEL_TH[emo] || emo) + ' (' + emo + ')' +
            (why ? ' — ' + why : ''));
    }

    // ---- ตัวช่วยวาดให้เหมือน TFT_eSPI ----
    function fe(g, x, y, rx, ry, color) {   // fillEllipse
        g.beginPath();
        g.ellipse(x, y, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
        g.fillStyle = color; g.fill();
    }
    function fr(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }
    function ftri(g, x1, y1, x2, y2, x3, y3, color) {
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3);
        g.closePath(); g.fillStyle = color; g.fill();
    }
    function fc(g, x, y, r, color) {
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill();
    }
    function fline(g, x1, y1, x2, y2, color) {
        g.strokeStyle = color; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }

    // ---- เฟรมหน้าทั้งหมด (1:1 กับ drawEyes_* ใน Robo.ino) ----
    var FaceFrames = {
        Normal: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y, 55, 60, T.black);
                fe(g, x, EYE_Y + 20, 30, 20, T.white);
            });
        },
        HalfClosed: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y + 15, 55, 20, T.black);
            });
        },
        Closed: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fr(g, x - 55, EYE_Y + 20, 110, 4, T.black);
            });
        },
        Shocked: function (g) {   // #513 ลอกจากภาพเจ้าของวาด 79 (แถวพิกเซลชุดเดียวกับเฟิร์มแวร์)
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [85, 237].forEach(function (x) { fe(g, x, 135, 54, 80, T.black); fe(g, x, 162, 24, 17, T.white); });
            g.fillStyle = T.black;
            [[16,279,289],[17,278,290],[18,278,291],[19,278,292],[20,278,293],[21,278,294],[22,279,282],[22,285,294],[23,287,294],[23,311,312],[24,288,294],[24,309,313],[25,288,294],[25,309,314],[26,288,294],[26,308,314],[27,288,294],[27,308,314],[28,287,294],[28,308,314],[29,287,294],[29,308,314],[30,286,294],[30,308,314],[31,284,293],[31,308,314],[32,284,292],[32,308,314],[33,283,291],[33,308,314],[34,282,291],[34,308,314],[35,282,290],[35,308,314],[36,282,289],[36,308,314],[37,282,288],[37,308,314],[38,282,287],[38,308,314],[39,282,288],[39,308,314],[40,282,288],[40,308,314],[41,282,288],[41,308,313],[42,282,289],[42,308,314],[43,283,289],[43,308,314],[44,247,253],[44,283,289],[44,308,314],[45,245,256],[45,283,289],[45,308,314],[46,245,259],[46,283,289],[46,308,314],[47,244,261],[47,284,289],[47,308,314],[48,245,263],[48,284,289],[48,308,314],[49,245,265],[49,285,288],[49,308,314],[50,247,267],[50,308,314],[51,253,268],[51,307,313],[52,255,270],[52,307,313],[53,258,271],[53,307,313],[54,53,55],[54,260,273],[54,307,312],[55,51,57],[55,262,275],[55,307,312],[56,50,58],[56,263,276],[56,307,312],[57,49,58],[57,265,276],[57,308,311],[58,49,58],[58,267,276],[59,47,58],[59,268,276],[60,46,57],[60,270,276],[61,46,55],[61,271,275],[62,45,53],[62,291,292],[63,44,52],[63,288,295],[64,43,51],[64,287,296],[65,43,51],[65,287,296],[66,42,50],[66,286,296],[67,41,49],[67,286,296],[68,40,49],[68,287,296],[69,40,48],[69,287,296],[69,303,305],[70,39,47],[70,288,296],[70,302,307],[71,39,46],[71,289,296],[71,301,308],[72,38,45],[72,290,295],[72,301,309],[73,38,44],[73,292,294],[73,301,309],[74,37,44],[74,301,309],[75,36,44],[75,301,309],[76,35,43],[76,301,309],[77,35,42],[77,302,309],[78,35,42],[78,303,309],[79,35,42],[79,305,307],[80,35,41],[81,35,40],[82,35,40],[83,36,39],[84,37,37],[186,285,288],[187,32,37],[187,284,289],[188,31,37],[188,284,289],[189,31,38],[189,283,289],[190,31,39],[190,282,289],[191,31,40],[191,282,289],[192,32,42],[192,282,289],[193,33,43],[193,281,288],[194,34,44],[194,280,288],[195,35,45],[195,279,287],[196,36,46],[196,278,287],[197,37,47],[197,277,286],[198,38,48],[198,276,285],[199,39,49],[199,275,284],[200,40,50],[200,274,283],[201,20,25],[201,41,51],[201,274,282],[202,19,26],[202,42,52],[202,273,281],[203,18,27],[203,43,53],[203,272,280],[204,18,27],[204,45,54],[204,271,279],[205,18,28],[205,47,55],[205,270,278],[206,19,29],[206,48,56],[206,269,278],[207,20,29],[207,49,58],[207,269,277],[208,22,29],[208,51,57],[208,268,277],[209,23,29],[209,267,276],[210,23,29],[210,266,275],[211,23,29],[211,266,274],[212,22,29],[212,266,273],[213,22,29],[213,267,272],[214,21,28],[214,267,272],[215,21,28],[215,268,271],[216,20,27],[217,19,35],[218,18,36],[219,17,37],[220,14,38],[220,41,49],[221,14,49],[222,13,50],[223,14,50],[224,13,27],[224,32,50],[225,14,25],[225,32,49],[226,15,21],[226,32,48],[227,31,41],[228,32,40],[229,33,38],[230,34,35]].forEach(function (q) { g.fillRect(q[1], q[0], q[2] - q[1] + 1, 1); });
        },
        LookLeft: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y, 55, 60, T.black);
                fe(g, x - 15, EYE_Y - 20, 30, 20, T.white);
            });
        },
        LookRight: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y, 55, 60, T.black);
                fe(g, x + 15, EYE_Y - 20, 30, 20, T.white);
            });
        },
        Happy: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y + 20, 55, 60, T.black);
                fe(g, x, EYE_Y, 30, 20, T.white);
                fe(g, x, EYE_Y + 70, 55, 20, T.white);
            });
        },
        Sad: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            // ตาซ้าย + เปลือกตาตก + น้ำตา
            fe(g, EYE_L_X, EYE_Y + 20, 55, 60, T.black);
            fe(g, EYE_L_X, EYE_Y + 50, 30, 20, T.white);
            ftri(g, EYE_L_X - 60, EYE_Y - 45, EYE_L_X + 60, EYE_Y - 45,
                EYE_L_X - 60, EYE_Y + 30, T.white);
            var tx = EYE_L_X - 35, ty = EYE_Y + 75, ts = 10;
            ftri(g, tx, ty, tx - ts, ty + 15, tx + ts, ty + 15, T.tear);
            fc(g, tx, ty + 15, ts, T.tear);
            // ตาขวา + เปลือกตาตก (กลับข้าง)
            fe(g, EYE_R_X, EYE_Y + 20, 55, 60, T.black);
            fe(g, EYE_R_X, EYE_Y + 50, 30, 20, T.white);
            ftri(g, EYE_R_X - 60, EYE_Y - 45, EYE_R_X + 60, EYE_Y - 45,
                EYE_R_X + 60, EYE_Y + 30, T.white);
        },
        Angry: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            fe(g, EYE_L_X, EYE_Y + 20, 55, 60, T.black);
            fe(g, EYE_L_X, EYE_Y + 50, 30, 20, T.white);
            ftri(g, EYE_L_X - 70, EYE_Y - 50, EYE_L_X + 70, EYE_Y - 50,
                EYE_L_X + 70, EYE_Y + 15, T.white);
            fe(g, EYE_R_X, EYE_Y + 20, 55, 60, T.black);
            fe(g, EYE_R_X, EYE_Y + 50, 30, 20, T.white);
            ftri(g, EYE_R_X - 70, EYE_Y - 50, EYE_R_X + 70, EYE_Y - 50,
                EYE_R_X - 70, EYE_Y + 15, T.white);
        },
        Sleepy: function (g) {   // #515 ตามภาพที่ 14 ในรายงาน: ขีดหนาเอียง 2 เส้น (แถวพิกเซลชุดเดียวกับเฟิร์มแวร์)
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            g.fillStyle = T.black;
            [[131,126,129],[131,202,206],[132,121,129],[132,202,210],[133,117,130],[133,201,215],[134,112,130],[134,201,220],[135,103,130],[135,201,228],[136,99,130],[136,201,233],[137,94,130],[137,201,237],[138,89,131],[138,201,242],[139,82,131],[139,201,250],[140,77,131],[140,201,255],[141,72,131],[141,200,260],[142,68,132],[142,200,264],[143,59,132],[143,200,272],[144,54,132],[144,200,277],[145,50,132],[145,200,281],[146,42,132],[146,199,290],[147,37,132],[147,199,294],[148,33,132],[148,199,299],[149,32,132],[149,199,299],[150,32,132],[150,199,299],[151,32,133],[151,198,299],[152,33,133],[152,198,298],[153,33,133],[153,198,298],[154,33,133],[154,198,298],[155,33,134],[155,198,298],[156,33,134],[156,197,298],[157,34,134],[157,198,297],[158,34,134],[158,198,297],[159,34,134],[159,197,297],[160,34,135],[160,197,297],[161,34,132],[161,199,297],[162,35,124],[162,208,297],[163,35,119],[163,212,297],[164,35,114],[164,217,297],[165,35,109],[165,222,296],[166,35,102],[166,230,296],[167,36,97],[167,235,296],[168,36,93],[168,240,296],[169,36,88],[169,244,296],[170,36,79],[170,252,295],[171,36,75],[171,256,295],[172,36,70],[172,261,295],[173,36,65],[173,266,295],[174,36,57],[174,274,295],[175,37,52],[175,279,294],[176,37,48],[176,284,294],[177,37,40],[177,292,294]].forEach(function (q) { g.fillRect(q[1], q[0], q[2] - q[1] + 1, 1); });
        },
        Confused: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            fe(g, EYE_L_X, EYE_Y, 55, 60, T.black);
            fe(g, EYE_L_X + 10, EYE_Y - 10, 30, 20, T.white);
            fe(g, EYE_R_X, EYE_Y, 55, 60, T.black);
            fe(g, EYE_R_X - 10, EYE_Y + 15, 30, 20, T.white);
            // setTextSize(4) ≈ สูง 32px วาดจากมุมซ้าย-บน
            g.fillStyle = T.black;
            g.font = 'bold 32px monospace';
            g.textAlign = 'left'; g.textBaseline = 'top';
            g.fillText('?', EYE_R_X + 45, EYE_Y - 55);
        },
        Love: function (g, sz) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            var cx = TFT_W / 2, cy = TFT_H / 2 - 5;
            var r = 28 + sz * 4, gap = r - 4, triW = gap + r + 5, triH = r + 20 + sz * 6;
            fc(g, cx - gap, cy - 10, r, T.heart);
            fc(g, cx + gap, cy - 10, r, T.heart);
            ftri(g, cx - triW, cy, cx + triW, cy, cx, cy + triH, T.heart);
        },
        Shy: function (g) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            [EYE_L_X, EYE_R_X].forEach(function (x) {
                fe(g, x, EYE_Y + 10, 55, 45, T.black);
                fe(g, x + 12, EYE_Y + 28, 25, 18, T.white);
                fr(g, x - 60, EYE_Y - 35, 120, 25, T.white);
            });
            // แก้มเขิน — ขีดเฉียงคู่ (วาด 3 เส้นซ้อนให้หนา เหมือนเฟิร์มแวร์)
            var blushY = EYE_Y + 58, len = 14, gp = 10;
            for (var t = -1; t <= 1; t++) {
                fline(g, EYE_L_X - gp - len, blushY - len + t, EYE_L_X - gp, blushY + t, T.blush);
                fline(g, EYE_L_X - gp + 6 - len, blushY - len + t, EYE_L_X - gp + 6, blushY + t, T.blush);
                fline(g, EYE_R_X + gp, blushY - len + t, EYE_R_X + gp + len, blushY + t, T.blush);
                fline(g, EYE_R_X + gp + 6, blushY - len + t, EYE_R_X + gp + 6 + len, blushY + t, T.blush);
            }
        }
    };

    function drawFaceIfDirty() {
        if (!FaceTwin.ctx || !FaceTwin.dirty) return;
        var g = FaceTwin.ctx;
        var name = FaceTwin.frame || 'Normal';

        // ภาพวาดมือ (ถ้าเปิด USE_FACE_SPRITES และมีไฟล์) — ไม่มีก็ใช้โค้ดวาด
        var img = USE_FACE_SPRITES ? spr('face_' + name) : null;
        if (img) {
            fr(g, 0, 0, TFT_W, TFT_H, T.white);
            if (name === 'Love' && FaceTwin.heartSize === 2) {
                var s = 1.06;
                g.save();
                g.translate(TFT_W / 2, TFT_H / 2); g.scale(s, s);
                g.drawImage(img, -TFT_W / 2, -TFT_H / 2, TFT_W, TFT_H);
                g.restore();
            } else {
                g.drawImage(img, 0, 0, TFT_W, TFT_H);
            }
        } else {
            var fn = FaceFrames[name] || FaceFrames.Normal;
            fn(g, FaceTwin.heartSize);
        }
        FaceTwin.dirty = false;
    }

    // ============================================================
    // IDLE ENGINE — port จาก Robo.ino (updateBlink/Glance/Sigh/HeadLook/Heartbeat)
    // จังหวะเวลา (ms) และความน่าจะเป็นของแพทเทิร์นตรงกับเฟิร์มแวร์ทุกค่า
    // ============================================================
    function now() { return performance.now(); }
    function rnd(a, b) { return Math.floor(a + Math.random() * (b - a)); }  // = Arduino random(a,b)

    var lastBlinkTime = 0, nextBlinkInterval = 3000, inBlinkSequence = false;
    var blinkPhase = 0, blinkPatternType = 0, blinkPhaseStart = 0;
    var nextGlanceTime = 0, inGlance = false, glancePhase = 0, glancePhaseStart = 0;
    var nextSighTime = 0, inSigh = false, sighPhase = 0, sighPhaseStart = 0;
    var nextHeadLookTime = 0, inHeadLook = false, headLookPhase = 0, headLookPhaseStart = 0;
    var headLookTarget = 0;
    var lastHeartbeatTime = 0, heartbeatPhase = 0;

    function initIdleTimers() {
        var t = now();
        lastBlinkTime = t;
        nextBlinkInterval = rnd(1500, 3500);
        nextGlanceTime = t + rnd(4000, 10000);
        nextSighTime = t + rnd(15000, 30000);
        nextHeadLookTime = t + rnd(6000, 15000);
    }

    function updateBlink() {
        var t = now();
        if (!inBlinkSequence && (t - lastBlinkTime >= nextBlinkInterval)) {
            inBlinkSequence = true;
            blinkPhase = 0;
            blinkPhaseStart = t;
            var p = rnd(0, 5);
            blinkPatternType = (p <= 2) ? 0 : (p === 3 ? 1 : 2);   // 60% เดี่ยว / 20% คู่ / 20% สามครั้ง
        }
        if (!inBlinkSequence) return;
        var e = t - blinkPhaseStart;

        if (blinkPatternType === 0) {            // เดี่ยว
            if (blinkPhase === 0) { showFrame('HalfClosed'); blinkPhase = 1; blinkPhaseStart = t; }
            else if (blinkPhase === 1 && e >= 60) { showFrame('Closed'); blinkPhase = 2; blinkPhaseStart = t; }
            else if (blinkPhase === 2 && e >= 80) { showFrame('HalfClosed'); blinkPhase = 3; blinkPhaseStart = t; }
            else if (blinkPhase === 3 && e >= 60) { endBlink(t, rnd(1500, 3500)); }
        } else if (blinkPatternType === 1) {     // คู่
            if (blinkPhase === 0) { showFrame('Closed'); blinkPhase = 1; blinkPhaseStart = t; }
            else if (blinkPhase === 1 && e >= 100) { showFrame(baseFrame()); blinkPhase = 2; blinkPhaseStart = t; }
            else if (blinkPhase === 2 && e >= 180) { showFrame('Closed'); blinkPhase = 3; blinkPhaseStart = t; }
            else if (blinkPhase === 3 && e >= 100) { endBlink(t, rnd(2000, 4000)); }
        } else {                                  // สามครั้ง
            if (blinkPhase === 0) { showFrame('Closed'); blinkPhase = 1; blinkPhaseStart = t; }
            else if (blinkPhase === 1 && e >= 80) { showFrame(baseFrame()); blinkPhase = 2; blinkPhaseStart = t; }
            else if (blinkPhase === 2 && e >= 120) { showFrame('Closed'); blinkPhase = 3; blinkPhaseStart = t; }
            else if (blinkPhase === 3 && e >= 80) { showFrame(baseFrame()); blinkPhase = 4; blinkPhaseStart = t; }
            else if (blinkPhase === 4 && e >= 120) { showFrame('Closed'); blinkPhase = 5; blinkPhaseStart = t; }
            else if (blinkPhase === 5 && e >= 80) { endBlink(t, rnd(2500, 5000)); }
        }
    }

    function endBlink(t, next) {
        showFrame(baseFrame());
        inBlinkSequence = false;
        lastBlinkTime = t;
        nextBlinkInterval = next;
    }

    function updateGlance() {
        var t = now();
        if (!inGlance && t >= nextGlanceTime) { inGlance = true; glancePhase = 0; glancePhaseStart = t; }
        if (!inGlance) return;
        var e = t - glancePhaseStart;
        if (glancePhase === 0) {
            showFrame(rnd(0, 2) === 0 ? 'LookLeft' : 'LookRight');
            glancePhase = 1; glancePhaseStart = t;
        } else if (glancePhase === 1 && e >= 500) {
            showFrame(baseFrame()); glancePhase = 2; glancePhaseStart = t;
        } else if (glancePhase === 2 && e >= 200) {
            inGlance = false; nextGlanceTime = t + rnd(4000, 10000);
        }
    }

    function updateSigh() {
        var t = now();
        if (!inSigh && t >= nextSighTime) { inSigh = true; sighPhase = 0; sighPhaseStart = t; }
        if (!inSigh) return;
        var e = t - sighPhaseStart;
        if (sighPhase === 0) { showFrame('HalfClosed'); sighPhase = 1; sighPhaseStart = t; }
        else if (sighPhase === 1 && e >= 600) { showFrame(baseFrame()); sighPhase = 2; sighPhaseStart = t; }
        else if (sighPhase === 2 && e >= 300) { inSigh = false; nextSighTime = t + rnd(15000, 30000); }
    }

    // ส่ายหัวเบาๆ — เฟิร์มแวร์สุ่มมุมเซอร์โว 83..97 (กลาง 90) → แปลงเป็นองศาที่เห็นบนเวที
    function updateHeadLook() {
        var t = now();
        if (!inHeadLook && t >= nextHeadLookTime) {
            inHeadLook = true; headLookPhase = 0; headLookPhaseStart = t;
            headLookTarget = 90 - rnd(83, 98);
        }
        if (!inHeadLook) return;
        var e = t - headLookPhaseStart;
        if (headLookPhase === 0) {
            view.headIdleDeg = headLookTarget; headLookPhase = 1; headLookPhaseStart = t;
        } else if (headLookPhase === 1 && e >= 2000) {
            view.headIdleDeg = 0; headLookPhase = 2; headLookPhaseStart = t;
        } else if (headLookPhase === 2 && e >= 1500) {
            inHeadLook = false; nextHeadLookTime = t + rnd(4000, 12000);
        }
    }

    function updateHeartbeat() {
        if (FaceTwin.emo !== 'V') return;
        var t = now(), e = t - lastHeartbeatTime;
        switch (heartbeatPhase) {
            case 0: if (e >= 800) { showFrame('Love', 2); heartbeatPhase = 1; lastHeartbeatTime = t; } break;
            case 1: if (e >= 150) { showFrame('Love', 1); heartbeatPhase = 2; lastHeartbeatTime = t; } break;
            case 2: if (e >= 150) { showFrame('Love', 2); heartbeatPhase = 3; lastHeartbeatTime = t; } break;
            case 3: if (e >= 150) { showFrame('Love', 1); heartbeatPhase = 0; lastHeartbeatTime = t; } break;
        }
    }

    function updateIdleBehaviors() {
        // หุ่นกำลังทำงาน หรือปิดสวิตช์ไอเดิลไว้ → ไม่มี idle (ตรงกับเฟิร์มแวร์)
        if (!robot.idleOn || isRunning || TwinLink.busy) return;

        if (FaceTwin.emo === 'V' && !inBlinkSequence) { updateHeartbeat(); return; }

        if (inBlinkSequence) { updateBlink(); return; }
        if (inGlance) { updateGlance(); return; }
        if (inSigh) { updateSigh(); return; }
        if (inHeadLook) { updateHeadLook(); return; }

        updateBlink();
        if (!inBlinkSequence) updateGlance();
        if (!inGlance) updateSigh();
        if (!inSigh) updateHeadLook();
    }

    // ============================================================
    // TWIN LINK — อ่านสถานะหุ่นจริงแบบเรียลไทม์ (GET /state)
    // ต้องใช้ Robo.ino ที่มี endpoint /state (เพิ่มให้แล้วในไฟล์เฟิร์มแวร์)
    // เฟิร์มแวร์เก่า/ไม่มีหุ่น → โหมด SIM (ทุกอย่างจำลองในเบราว์เซอร์)
    // ============================================================
    var TwinLink = {
        host: 'http://MDTrobot.local',
        live: false,
        busy: false,
        supported: null,      // null=ยังไม่รู้, true=มี /state, false=เฟิร์มแวร์เก่า
        pollMs: 300,
        lastPoll: 0,
        fails: 0,
        last: null
    };

    // มุมเซอร์โว → สถานะฝั่งเว็บ (ยึดตาม executeCommandString ใน Robo.ino)
    function nearestIndex(val, table) {
        var best = 0, bestD = Infinity;
        for (var i = 0; i < table.length; i++) {
            var d = Math.abs(val - table[i]);
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    }
    // arm1 ← แขนซ้าย (r/f/v = 67/91/121) | arm2 ← แขนขวา (t/g/b = 118/90/60)
    // hand2 ← มือซ้าย (1/2/3 = 80/50/20) | hand1 ← มือขวา (4/5/6 = 100/130/160)
    var MAP_ARM1 = [67, 91, 121], MAP_ARM2 = [118, 90, 60];
    var MAP_HAND2 = [80, 50, 20], MAP_HAND1 = [100, 130, 160];

    function applyLiveState(s) {
        TwinLink.busy = !!s.busy;
        TwinLink.last = s;
        if (typeof s.idleOn === 'number') setIdleOn(s.idleOn !== 0, true);
        updateBadge();

        // หุ่นกำลังรันคำสั่งชุด → ปล่อยให้ซิมเล่นอนิเมชันของตัวเอง (โพสจริงยังเปลี่ยนอยู่)
        if (TwinLink.busy) return;

        if (typeof s.emo === 'string' && s.emo) {
            var emo = s.emo.charAt(0);
            if (EMO_FRAME[emo] && emo !== FaceTwin.emo) {
                setEmotion(emo, 'จากหุ่นจริง');
                // ให้ face state ฝั่งเว็บตรงกันด้วย (เผื่อโค้ดอื่นอ่าน)
                Object.keys(WEB_TO_EMO).forEach(function (k) {
                    if (WEB_TO_EMO[k] === emo) robot.face = k;
                });
            }
        }
        // ---- หัวหัน: เฟิร์มแวร์ใหม่ส่ง yaw (องศาเชิงกล) มาเลย / ตัวเก่ามีแค่มุมเซอร์โว ----
        var yaw = null;
        if (typeof s.yaw === 'number') yaw = s.yaw;
        else if (typeof s.headCmd === 'number') yaw = s.headCmd - 90;
        else if (typeof s.head === 'number') yaw = s.head - 90;   // 130 = ซ้าย (+40), 50 = ขวา (−40)
        if (yaw !== null) {
            if (Math.abs(yaw - robot.yaw) >= 5) {
                RobotLog.add('LIVE', 'หุ่นจริงหันหัว → ' + Math.round(yaw) + '°');
            }
            robot.yaw = yaw;
            view.headIdleDeg = 0;          // หุ่นจริงส่ายหัวเอง และรายงานมาใน yaw แล้ว
        }
        // ---- ก้มเงย ----
        if (typeof s.tiltRel === 'number') robot.tilt = s.tiltRel;
        // ---- แขน: lift1/lift2 (ใหม่) หรือแปลงจากมุมเซอร์โวแบบเดิม ----
        if (typeof s.lift1 === 'number') robot.liftL = s.lift1;
        else if (typeof s.arm1 === 'number') robot.liftL = [23, -1, -31][nearestIndex(s.arm1, MAP_ARM1)];
        if (typeof s.lift2 === 'number') robot.liftR = s.lift2;
        else if (typeof s.arm2 === 'number') robot.liftR = [28, 0, -30][nearestIndex(s.arm2, MAP_ARM2)];
        // ---- มือ: grip1/grip2 % (ใหม่) — เฟิร์มแวร์เก่าปิดมืออยู่ ค่า hand1/2 เป็นค่าหลอก จึงไม่อ่าน ----
        if (typeof s.grip1 === 'number') robot.gripL = s.grip1;
        if (typeof s.grip2 === 'number') robot.gripR = s.grip2;
        // ---- เซนเซอร์ (ใช้กับบล็อกเงื่อนไข และขีดแดงบนเวที) ----
        if (typeof s.holding === 'number') robot.holding = !!s.holding;
        if (typeof s.verify === 'number') robot.verify = s.verify;
        if (typeof s.cliffL === 'number') robot.cliffL = !!s.cliffL;
        if (typeof s.cliffR === 'number') robot.cliffR = !!s.cliffR;
        if (typeof s.cam === 'string') robot.cam = s.cam;
        if (typeof s.camOk === 'number') robot.camOk = !!s.camOk;
        stageDirty = true;
    }

    // อ่าน /state หนึ่งครั้งทันที (ไม่ผ่านจังหวะ poll) — ใช้ตอนบล็อกเงื่อนไขต้องการค่าสด
    // คืน JSON หรือ null ถ้าต่อไม่ได้
    // apply = true → เอาค่าสดไปทับท่าในซิมทันที (ใช้ตอนตัดสินเงื่อนไข ให้ซิมตรงกับหุ่นจริง)
    // apply = false → แค่อ่าน (ใช้ตอนรอหุ่นทำคิวเสร็จ ไม่ให้ไปแย่งอนิเมชันของซิม)
    function fetchStateOnce(timeoutMs, apply) {
        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 1200) : null;
        return fetch(TwinLink.host + '/state', {
            mode: 'cors', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
            if (timer) clearTimeout(timer);
            if (!res.ok) return null;
            return res.json();
        }).then(function (json) {
            if (json) {
                TwinLink.supported = true;
                TwinLink.fails = 0;
                setLive(true);
                if (apply) {
                    // บังคับใช้ค่าสดแม้หุ่น busy (ใช้ตัดสินเงื่อนไข)
                    var wasBusy = json.busy; json.busy = 0;
                    applyLiveState(json);
                    json.busy = wasBusy;
                }
                TwinLink.busy = !!json.busy;
                TwinLink.last = json;
                updateBadge();
            }
            return json;
        }).catch(function () {
            if (timer) clearTimeout(timer);
            return null;
        });
    }

    // ค่าเซนเซอร์ฝั่งซิม (ตอนไม่ได้ต่อหุ่นจริง) — รูปเดียวกับ /state
    //   ขอบโต๊ะ = ขอบเวที: ถ้าเดินหน้าอีกก้าวแล้วหลุดเวที ถือว่าเจอขอบทั้งสองข้าง
    function simSensorState() {
        var a = robot.angleTarget * Math.PI / 180;
        var nx = robot.x + Math.sin(a) * (STEP / 2), ny = robot.y + Math.cos(a) * (STEP / 2);
        var edge = Math.abs(nx) > BOUND_X + 0.5 || Math.abs(ny) > BOUND_Y + 0.5;
        return {
            holding: robot.holding ? 1 : 0, verify: robot.verify,
            cliffL: edge ? 1 : 0, cliffR: edge ? 1 : 0,
            cam: robot.cam, camOk: robot.camOk ? 1 : 0,
            yaw: robot.yaw, tiltRel: robot.tilt, lift1: robot.liftL, lift2: robot.liftR,
            grip1: robot.gripL, grip2: robot.gripR, busy: isRunning ? 1 : 0, sim: 1,
            // รอบ #501 — ช่องเดียวกับ /state ของเฟิร์มแวร์ 8 พ.ย.
            obj: robot.holding ? 2 : (robot.simObj ? 1 : 0),
            vl_mm: robot.holding ? 30 : (robot.simObj ? 120 : -1),
            prog: robot.prog, bugN: robot.bugN, bug: robot.bug, pathN: robot.path.length,
            touchOk: 1, touchN: robot.touchN, touchEvt: robot.touchEvt, idle: 0, idleOn: robot.idleOn ? 1 : 0, emoBusy: 0
        };
    }

    function syncIdleBtn() {
        var btn = document.getElementById('twin-idle-btn');
        if (!btn) return;
        var on = !!robot.idleOn;
        btn.textContent = on ? 'ไอเดิล: เปิด' : 'ไอเดิล: ปิด';
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function setIdleOn(on, fromLive) {
        on = !!on;
        if (robot.idleOn !== on) {
            robot.idleOn = on;
            if (!on) {
                inBlinkSequence = false; inGlance = false; inSigh = false; inHeadLook = false;
                view.headIdleDeg = 0;
                showFrame(baseFrame());
                stageDirty = true;
            } else {
                initIdleTimers();
            }
        }
        syncIdleBtn();
        if (!fromLive) {
            var cmd = on ? '!idle 1' : '!idle 0';
            RobotLog.add('IDLE', 'สั่งไอเดิล → ' + (on ? 'เปิด' : 'ปิด') + ' (' + cmd + ')');
            fetch(TwinLink.host + '/run?cmd=' + encodeURIComponent(cmd), {
                mode: 'cors', cache: 'no-store'
            }).catch(function () { });
        }
        return robot.idleOn;
    }

    function pollTwin() {
        var t = now();
        // ต่อได้ → ถามถี่ 300ms / ต่อไม่ได้ → ถอยจังหวะ (ไม่รบกวนเน็ตและไม่รก console)
        //
        // ห้องจริงมีหุ่น 5 ตัว เด็ก 40 คน → เครื่องส่วนใหญ่ไม่มีหุ่นให้ต่อเลย
        // เดิมถอยแค่ถึง 3 วินาทีแล้วหยุดถอย = ยิงหา MDTrobot.local ไปเรื่อย ๆ ทั้งคาบ
        // วัดจริงได้ 133 request ใน 3 นาที ทุกอันพัง ERR_NAME_NOT_RESOLVED
        // console เละจนหา error จริงไม่เจอ และเปลืองเน็ตโรงเรียนโดยเปล่าประโยชน์
        //
        // จึงถอยเป็นขั้นบันไดจนถึง 30 วินาที — พอเสียบหุ่นจริงยังเจอภายในครึ่งนาที
        // และปุ่ม "ตรวจการเชื่อมต่อ" (RobotSim.checkNow) ยังสั่งถามทันทีได้เสมอ
        var interval = TwinLink.pollMs;
        if (TwinLink.supported === false) interval = 8000;
        else if (TwinLink.fails >= 20) interval = 30000;
        else if (TwinLink.fails >= 10) interval = 15000;
        else if (TwinLink.fails >= 5) interval = 8000;
        else if (TwinLink.fails >= 3) interval = 3000;
        if (t - TwinLink.lastPoll < interval) return;
        TwinLink.lastPoll = t;

        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 900) : null;

        fetch(TwinLink.host + '/state', {
            mode: 'cors', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
            if (timer) clearTimeout(timer);
            if (res.status === 404) {                       // ต่อหุ่นได้ แต่เฟิร์มแวร์ไม่มี /state
                if (TwinLink.supported !== false) {
                    TwinLink.supported = false;
                    RobotLog.add('LINK', 'หุ่นตอบแต่ไม่มี /state → เฟิร์มแวร์เก่า ใช้โหมดจำลองต่อ ' +
                        '(อัปโหลด Robo.ino เวอร์ชันใหม่เพื่อเปิดโหมดเรียลไทม์)');
                }
                setLive(false);
                return null;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (json) {
            if (!json) return;
            if (TwinLink.supported !== true) {
                TwinLink.supported = true;
                RobotLog.add('LINK', 'พบ /state บนหุ่นจริง → เปิดโหมดเรียลไทม์', json);
            }
            TwinLink.fails = 0;
            setLive(true);
            applyLiveState(json);
        }).catch(function (err) {
            if (timer) clearTimeout(timer);
            TwinLink.fails++;
            if (TwinLink.live && TwinLink.fails >= 3) {
                RobotLog.add('LINK', 'ขาดการเชื่อมต่อหุ่นจริง → กลับโหมดจำลอง (' + err.message + ')');
                setLive(false);
            }
        });
    }

    function setLive(on) {
        if (TwinLink.live === on) { updateBadge(); return; }
        TwinLink.live = on;
        if (on) window.metoHadLive = true;   // เคยต่อหุ่นจริงแล้ว — หลุดตอนกด Run ให้ script.js ถามก่อน
        if (!on) TwinLink.busy = false;
        RobotLog.add('LINK', on ? 'โหมด: ต่อหุ่นจริง (LIVE)' : 'โหมด: จำลอง (SIM)');
        updateBadge();
    }

    var badgeKey = '';
    function updateBadge() {
        var key = (TwinLink.live ? 'L' : 'S') + (TwinLink.busy ? 'B' : '-') + TwinLink.supported;
        if (key === badgeKey) return;          // เขียน DOM เฉพาะตอนสถานะเปลี่ยน
        var b = document.getElementById('twin-link-badge');
        if (!b) return;
        badgeKey = key;
        var live = TwinLink.live;
        b.textContent = live ? (TwinLink.busy ? 'หุ่นจริง · ทำงาน' : 'ต่อหุ่นจริง') : 'โหมดจำลอง';
        b.className = 'twin-badge ' + (live ? 'live' : 'sim');
        b.title = live
            ? 'เชื่อมกับหุ่นจริงแบบเรียลไทม์ (LIVE) อารมณ์/หัว/แขน อ่านจาก http://MDTrobot.local/state'
            : (TwinLink.supported === false
                ? 'หุ่นออนไลน์แต่เฟิร์มแวร์ยังไม่มี /state อัปโหลด Robo.ino เวอร์ชันใหม่เพื่อเปิดโหมดเรียลไทม์'
                : 'ไม่พบหุ่นจริง แสดงผลจากการจำลองในเบราว์เซอร์ (SIM)');
    }

    // ============================================================
    // ลูปวาด (ขับทั้งสองจอ)
    // ============================================================
    var LERP = 0.18;   // ความนุ่มของการเคลื่อน/หมุน (เท่า SERVO_LERP_SPEED ในเฟิร์มแวร์)

    function tick() {
        // 1) อ่านสถานะหุ่นจริง (ถ้ามี)
        pollTwin();

        // 2) idle (จอหน้า + ส่ายหัว) — เฟิร์มแวร์รันเฉพาะตอนไม่ได้ทำงาน
        updateIdleBehaviors();

        // 3) lerp ค่าที่แสดง
        // yaw + = หันไปทางแขนซ้าย = ทวนเข็มบนจอ → headDeg (+ = ขวา) จึงกลับเครื่องหมาย
        var targetHead = -robot.yaw + view.headIdleDeg;
        var headLerp = Math.min(0.6, LERP * (robot.headSpeed || 90) / 90);   // hs: เร็วขึ้น/ช้าลงตามที่สั่ง
        var keys = ['x', 'y', 'angle', 'headDeg', 'tilt', 'liftL', 'liftR', 'gripL', 'gripR'];
        var before = keys.map(function (k) { return view[k]; }).join(',');
        function ease(k, target, f) {
            view[k] += (target - view[k]) * f;
            if (Math.abs(target - view[k]) < 0.3) view[k] = target;
        }
        ease('x', robot.x, LERP);
        ease('y', robot.y, LERP);
        ease('angle', robot.angleTarget, LERP);
        ease('headDeg', targetHead, headLerp);
        ease('tilt', robot.tilt, headLerp);
        ease('liftL', robot.liftL, LERP);
        ease('liftR', robot.liftR, LERP);
        ease('gripL', robot.gripL, LERP);
        ease('gripR', robot.gripR, LERP);
        if (before !== keys.map(function (k) { return view[k]; }).join(',')) stageDirty = true;

        // 4) วาด
        if (stageDirty) { drawStage(); stageDirty = false; }
        drawFaceIfDirty();
        updateBadge();

        requestAnimationFrame(tick);
    }

    // ============================================================
    // COMMAND EXECUTION (โค้ดสั่งเดียวกับที่ส่งหุ่นจริง)
    // ============================================================
    // เดินตามทิศที่หุ่นหันจริง (องศาต่อเนื่อง) — เลี้ยวตามเวลา (tl:/tr:) ทำให้ไม่ได้หันทีละ 90° เสมอ
    // dir = +1 เดินหน้า, -1 ถอยหลัง · steps = กี่ช่อง (1 ช่อง = 1 วินาทีของคำสั่ง w/s)
    function moveRobot(dir, steps) {
        if (steps === undefined) steps = 1;
        var a = robot.angleTarget * Math.PI / 180;     // 0 = ขึ้น, + = ตามเข็ม
        var nx = robot.x + Math.sin(a) * STEP * dir * steps;
        var ny = robot.y + Math.cos(a) * STEP * dir * steps;
        nx = Math.round(nx * 10) / 10; ny = Math.round(ny * 10) / 10;
        var cx = Math.max(-BOUND_X, Math.min(BOUND_X, nx));
        var cy = Math.max(-BOUND_Y, Math.min(BOUND_Y, ny));
        if (cx !== nx || cy !== ny) {
            // หุ่นจริงเจอขอบโต๊ะ = หยุดโปรแกรม (prog 3) แต่เวทีซิมเล็กแค่ ±2 ช่อง ถ้าหยุดด้วย
            // โปรแกรมเดิมของเด็กจะหยุดกลางทางบ่อยมาก — ซิมจึงแค่ชนกำแพงแล้วทำต่อเหมือนเดิม
            RobotLog.add('SIM', 'ชนขอบเวที หุ่นไปต่อทางนี้ไม่ได้');
        }
        if (cx !== robot.x || cy !== robot.y) {
            robot.x = cx; robot.y = cy;
            trail.push({ x: cx, y: cy });
            if (trail.length > TRAIL_MAX) trail.shift();
        }
        updateSimEdge();
        stageDirty = true;
    }

    // หมุนตัว deg องศา (+ = ตามเข็ม = เลี้ยวขวา) · 1 วินาที = 90° เท่ากับคำสั่ง a/d เดิม
    function turnRobot(deg) {
        robot.angleTarget += deg;
        var q = Math.round(robot.angleTarget / 90);
        robot.facing = ((q % 4) + 4) % 4;               // ทิศที่ใกล้สุด ใช้แค่ป้ายบอกทิศ
        updateSimEdge();
        stageDirty = true;
    }

    // ซิมไม่มีโต๊ะ → ใช้ขอบเวทีเป็นขอบโต๊ะ (ขีดแดงที่หัวหุ่นเมื่อก้าวต่อไปจะหลุดเวที)
    function updateSimEdge() {
        if (TwinLink.live) return;   // ต่อหุ่นจริงอยู่ ใช้ค่าจริงจาก /state
        var s = simSensorState();
        robot.cliffL = !!s.cliffL; robot.cliffR = !!s.cliffR;
    }

    function setFace(name) {
        robot.face = name;
        if (name === 'look_left') { showFrame('LookLeft'); RobotLog.add('FACE', 'เหลือบซ้าย'); }
        else if (name === 'look_right') { showFrame('LookRight'); RobotLog.add('FACE', 'เหลือบขวา'); }
        else setEmotion(WEB_TO_EMO[name] || 'N', 'คำสั่งบล็อก');
    }

    // อารมณ์เต็มชุด (emo:X) — ท่าทางตาม doBodyGesture() ในเฟิร์มแวร์ แปลงมุมเซอร์โวเป็นองศาเชิงกลคร่าว ๆ
    //   แขนซ้าย: เซอร์โวลด = ยก (91 = กลาง) · แขนขวา: เซอร์โวเพิ่ม = ยก (90 = กลาง) · หัว: เซอร์โวเพิ่ม = หันซ้าย
    var EMO_POSE = {
        H: { head: 85 }, S: { head: 75, a1: 78, a2: 102 }, A: { head: 80, a1: 82, a2: 98 },
        O: { head: 85, a1: 75, a2: 105 }, Z: { head: 90, a1: 91, a2: 90, tilt: -5 },
        C: { head: 75, a1: 85, a2: 95 }, V: { head: 85, a1: 105, a2: 75 },
        B: { head: 70, a1: 75, a2: 105, tilt: -3 }, N: { head: 90, a1: 91, a2: 90, tilt: 0 }
    };
    var emoReturnTimer = null;
    function applyEmotionPose(e) {
        var p = EMO_POSE[e] || EMO_POSE.N;
        setEmotion(e, 'คำสั่ง emo:');
        robot.face = Object.keys(WEB_TO_EMO).filter(function (k) { return WEB_TO_EMO[k] === e; })[0] || 'normal';
        robot.yaw = p.head - 90;
        var armsFree = !robot.holding && robot.gripL <= 30 && robot.gripR <= 30;   // ถือของอยู่ ท่าไม่ขยับแขน
        if (armsFree && p.a1 !== undefined) robot.liftL = clampN(91 - p.a1, -43, 48);
        if (armsFree && p.a2 !== undefined) robot.liftR = clampN(p.a2 - 90, -43, 48);
        if (p.tilt !== undefined) robot.tilt = p.tilt;
        stageDirty = true;
        // ค้าง 2.5 วิแล้วกลับ N (ยกเว้น N กับ V) — เหมือนเฟิร์มแวร์
        clearTimeout(emoReturnTimer);
        if (e !== 'N' && e !== 'V') {
            emoReturnTimer = setTimeout(function () { applyEmotionPose('N'); }, 2500);
        }
    }

    // ---- รอบ #501: ทางเดิน / ท่าเริ่มต้น / บัค / หนีบไม่เจอของ (ตรงกับ RoboPCA9685.ino) ----
    // จดทางล้อไว้ให้ back ย้อน — คำสั่งที่ขึ้นต้นด้วย ~ คือช่วงย้อนทาง ไม่ต้องจดซ้ำ
    var recordPath = true;
    function recMove(op, ms) { if (recordPath && isRunning) robot.path.push({ op: op, ms: ms }); }

    // ทางย้อนกลับ: กลับลำดับ + กลับทิศ + เวลาเท่าเดิม (เหมือน pathRetrace ในเฟิร์มแวร์)
    function retraceCommands() {
        var inv = { fw: 'bw', bw: 'fw', tl: 'tr', tr: 'tl' };
        var out = [];
        for (var i = robot.path.length - 1; i >= 0; i--) {
            out.push('~' + inv[robot.path[i].op] + ':' + robot.path[i].ms);
        }
        robot.path = [];
        return out;
    }

    // ท่า R (ทุกข้อ 0) — ถือของอยู่ = ไม่ปล่อยมือ ไม่ลดแขน
    function goRestPose() {
        robot.yaw = 0; robot.tilt = 0;
        if (!robot.holding) {
            robot.liftL = robot.liftR = 0;
            robot.gripL = robot.gripR = GRIP_CENTER;
        }
        stageDirty = true;
    }

    function simBug(cmd) {
        robot.bugN++;
        robot.bug = String(cmd).slice(0, 23);
        RobotLog.add('SIM', 'ไม่รู้จักคำสั่ง "' + cmd + '" หุ่นงงแล้วข้าม ทำคำสั่งถัดไปต่อ (เหมือนหุ่นจริง)');
        applyEmotionPose('C');
        if (window.onSimBug) window.onSimBug(robot.bug, robot.bugN);
        return 1500;
    }

    // หนีบแบบใหม่: VL53 เข้าหาระยะก่อน → ไม่เห็นของ = ภารกิจไม่สำเร็จ · เจอ = ลดแขนต่ำสุดแล้วหนีบ
    function simGrab(lift) {
        if (!robot.simObj) {
            robot.verify = 0; robot.holding = false;
            robot.endReq = 4;
            RobotLog.add('SIM', 'ภารกิจยกไม่สำเร็จ ไม่เห็นของตรงหน้า' +
                (robot.failback ? ' → ย้อนทางกลับจุดเริ่ม' : ' → หยุดรอตรงนี้'));
            applyEmotionPose('C');
            return 1500;
        }
        moveRobot(1, 0.3); recMove('fw', 300);           // เข้าหาระยะหนีบ
        robot.liftL = robot.liftR = -43;                 // หนีบที่แขนต่ำสุด
        robot.gripL = robot.gripR = 94; robot.holding = true;
        if (lift) {
            robot.verify = 1;
            setTimeout(function () { robot.liftL = robot.liftR = 8; stageDirty = true; }, 1200);   // ยก +8°
        }
        stageDirty = true;
        return lift ? 2500 : 1800;
    }

    // ทำหนึ่งคำสั่ง (ชุดเดียวกับที่ส่งหุ่นจริง) แล้วคืน "เวลาที่คำสั่งนี้ใช้" หน่วย ms
    // ให้ runSimulation รอเท่ากับหุ่นจริงโดยประมาณ (คำสั่งที่ไม่ระบุเวลา = 600 ms เหมือนเดิม)
    function executeRobotCommand(cmd) {
        cmd = String(cmd || '').trim();
        recordPath = cmd.charAt(0) !== '~';
        if (!recordPath) cmd = cmd.slice(1);
        var dur = 600;
        var c = cmd.indexOf(':');
        if (c > 0) {
            var name = cmd.slice(0, c), arg = cmd.slice(c + 1), n = parseFloat(arg);
            switch (name) {
                case 'yaw': robot.yaw = clampN(n, -90, 90); break;
                case 'tilt': robot.tilt = clampN(n, -10, 10); break;
                case 'lift1': robot.liftL = clampN(n, -43, 48); break;
                case 'lift2': robot.liftR = clampN(n, -43, 48); break;
                case 'lift': robot.liftL = robot.liftR = clampN(n, -43, 48); break;
                case 'hand1': robot.gripL = clampN(n, 0, 100); break;
                case 'hand2': robot.gripR = clampN(n, 0, 100); break;
                case 'hand': robot.gripL = robot.gripR = clampN(n, 0, 100); break;
                case 'grip':   // หนีบ N% แล้วถอยกลับ 6% (ทั้งสองมือ)
                    robot.gripL = robot.gripR = clampN(clampN(n, 0, 100) - 6, 0, 100);
                    robot.holding = n >= 50;
                    dur = 1500; break;
                case 'fw': dur = clampN(n, 100, 5000); recMove('fw', dur); moveRobot(1, dur / 1000); if (window.SFX) window.SFX.step(); break;
                case 'bw': dur = clampN(n, 100, 5000); recMove('bw', dur); moveRobot(-1, dur / 1000); if (window.SFX) window.SFX.step(); break;
                case 'tl': dur = clampN(n, 100, 5000); recMove('tl', dur); turnRobot(-90 * dur / 1000); if (window.SFX) window.SFX.blip(420, 0.05); break;
                case 'tr': dur = clampN(n, 100, 5000); recMove('tr', dur); turnRobot(90 * dur / 1000); if (window.SFX) window.SFX.blip(560, 0.05); break;
                case 'wait': dur = clampN(n, 0, 10000); break;
                case 'hs': robot.headSpeed = clampN(n, 10, 200); dur = 50; break;
                case 'failback': robot.failback = n !== 0; dur = 50;
                    RobotLog.add('SIM', robot.failback ? 'ตั้งไว้: หนีบไม่เจอของ → ย้อนกลับจุดเริ่ม' : 'ยกเลิก failback'); break;
                case 'emo':
                    var e = arg.charAt(0);
                    // เฟิร์มแวร์ 8 พ.ย. รอท่าอารมณ์จบก่อนไปคำสั่งถัดไป (เดิมรอแค่ 300 ms)
                    if ('NHSAOZCVB'.indexOf(e) !== -1 && e) { applyEmotionPose(e); dur = 1800; }
                    else dur = 300;
                    break;
                default: dur = simBug(cmd);
            }
            stageDirty = true;
            RobotLog.add('CMD', 'รันคำสั่ง "' + cmd + '"', snapshot());
            return dur;
        }

        switch (cmd) {
            // ---- การเคลื่อนที่ (เดินหน้าไปตามทิศที่หุ่นหันอยู่) ----
            case 'w': recMove('fw', 1000); moveRobot(1); if (window.SFX) window.SFX.step(); break;
            case 's': recMove('bw', 1000); moveRobot(-1); if (window.SFX) window.SFX.step(); break;
            case 'a': recMove('tl', 1000); turnRobot(-90); if (window.SFX) window.SFX.blip(420, 0.05); break;
            case 'd': recMove('tr', 1000); turnRobot(90); if (window.SFX) window.SFX.blip(560, 0.05); break;
            case 'home': goRestPose(); dur = 800; break;
            case 'back': dur = 50; break;   // ทางย้อนถูกแทรกเข้าคิวใน runSimulation แล้ว
            case 'x': break;   // stop
            case 'z': break;   // delay 1 วิ (ซิมรอ 600 ms เท่าคำสั่งอื่น — คงจังหวะเดิมของโปรแกรมเก่า)

            // ---- แขน: r/t = ยก · f/g = กลาง · v/b = ลง (เฟิร์มแวร์ 6 พ.ย. แปลตามความหมาย) ----
            case 'r': case 'f': case 'v': robot.liftL = OLD_LIFT_L[cmd]; stageDirty = true; break;
            case 't': case 'g': case 'b': robot.liftR = OLD_LIFT_R[cmd]; stageDirty = true; break;

            // ---- มือ: 1/2/3 = มือขวา กาง/กลาง/หนีบ · 4/5/6 = มือซ้าย หนีบ/กลาง/กาง ----
            case '1': robot.gripR = 0; stageDirty = true; break;
            case '2': robot.gripR = GRIP_CENTER; stageDirty = true; break;
            case '3': robot.gripR = 100; stageDirty = true; break;
            case '4': robot.gripL = 100; stageDirty = true; break;
            case '5': robot.gripL = GRIP_CENTER; stageDirty = true; break;
            case '6': robot.gripL = 0; stageDirty = true; break;

            // ---- หัว: 7/8/9 = มุมเซอร์โว 50/90/130 = ขวา 40° / ตรง / ซ้าย 40° ----
            case '7': robot.yaw = -40; stageDirty = true; break;
            case '8': robot.yaw = 0; stageDirty = true; break;
            case '9': robot.yaw = 40; stageDirty = true; break;
            // ---- ก้มเงย: T1 ก้มสุด · T2 ตรง · T3 เงยสุด ----
            case 'T1': robot.tilt = -10; stageDirty = true; break;
            case 'T2': robot.tilt = 0; stageDirty = true; break;
            case 'T3': robot.tilt = 10; stageDirty = true; break;

            // ---- หน้า (แสดงบนจอที่ 2) ----
            case 'u': setFace('normal'); break;
            case 'y': setFace('look_left'); break;
            case 'i': setFace('look_right'); break;
            case 'h': setFace('happy'); break;
            case 'j': setFace('sad'); break;
            case 'k': setFace('angry'); break;
            case 'o': setFace('shocked'); break;
            case 'n': setFace('sleepy'); break;
            case 'c': setFace('confused'); break;
            case 'l': setFace('love'); break;
            case 'e': setFace('shy'); break;

            // ---- มือหนีบสองมือ ----
            // ซิมไม่มีวัตถุจริง: robot.simObj บอกว่ามีของตรงหน้าไหม (ค่าเริ่ม = มี)
            case 'G': dur = simGrab(false); break;
            case 'P': robot.gripL = robot.gripR = 0; robot.holding = false; dur = 1000; stageDirty = true; break;
            case 'Q': dur = simGrab(true); break;
            default:
                if (cmd) dur = simBug(cmd);
        }
        if (cmd) RobotLog.add('CMD', 'รันคำสั่ง "' + cmd + '"', snapshot());
        return dur;
    }

    function snapshot() {
        return {
            x: robot.x, y: robot.y, facing: robot.facing, angle: robot.angleTarget,
            yaw: robot.yaw, tilt: robot.tilt, liftL: robot.liftL, liftR: robot.liftR,
            gripL: robot.gripL, gripR: robot.gripR, holding: robot.holding, face: robot.face
        };
    }

    function resetRobot() {
        robot.x = 0; robot.y = 0;
        robot.facing = DIR_UP; robot.angleTarget = 0;
        robot.yaw = 0; robot.tilt = 0; robot.liftL = 0; robot.liftR = 0;
        robot.gripL = GRIP_CENTER; robot.gripR = GRIP_CENTER;
        robot.holding = false; robot.verify = -1; robot.cliffL = false; robot.cliffR = false;
        robot.headSpeed = 90;
        robot.face = 'normal';
        robot.path = []; robot.failback = false; robot.prog = 0; robot.endReq = 0;
        view.x = 0; view.y = 0; view.angle = 0; view.headDeg = 0; view.headIdleDeg = 0;
        view.tilt = 0; view.liftL = 0; view.liftR = 0; view.gripL = GRIP_CENTER; view.gripR = GRIP_CENTER;
        trail = [];
        setEmotion('N', 'รีเซ็ต');
        showFrame('Normal');
        stageDirty = true;
        RobotLog.add('SIM', 'รีเซ็ตหุ่นกลับจุดเริ่มต้น (กลางเวที หันขึ้น)');
    }

    // ============================================================
    // PUBLIC API (สัญญาเดิม — script.js เรียกใช้อยู่)
    // ============================================================
    window.resetSprite = resetRobot;
    window.updateSprite = function () { stageDirty = true; FaceTwin.dirty = true; };
    window.executeCommand = executeRobotCommand;
    window.initRobotSim = initCanvas;

    // ธงขอหยุด — ปุ่ม "หยุด" บน header เซ็ตค่านี้
    var stopRequested = false;
    window.stopSimulation = function () {
        if (!isRunning) return false;
        stopRequested = true;
        RobotLog.add('RUN', 'เด็กกดหยุดโปรแกรม');
        return true;
    };
    window.isSimRunning = function () { return isRunning; };

    // รอแบบแบ่งช่วง 100 ms — กดหยุดระหว่าง wait:10000 แล้วหยุดทันที ไม่ต้องรอครบ
    async function sleepStoppable(ms) {
        var end = now() + ms;
        while (!stopRequested) {
            var left = end - now();
            if (left <= 0) return;
            await new Promise(function (r) { setTimeout(r, Math.min(100, left)); });
        }
    }

    // เริ่มโปรแกรมใหม่: ล้างทางเดิน/failback แล้วกลับท่า R ก่อนเสมอ (เหมือนเฟิร์มแวร์ #501)
    function beginProgramState() {
        robot.path = []; robot.failback = false; robot.endReq = 0; robot.prog = 1;
        goRestPose();
    }

    // รันต่อจากสถานะปัจจุบัน (ไม่รีเซ็ต)
    //
    // opts.more = true → เป็น "ช่วงหนึ่ง" ของโปรแกรมที่มีบล็อกเซนเซอร์ (MetoRunner ใน script.js)
    //   ไม่จบโปรแกรม ไม่ยิ้มท้าย และรอจนคำสั่งสุดท้ายของช่วงเสร็จ ก่อนให้เบราว์เซอร์อ่านเซนเซอร์
    // ไม่ส่ง opts = แบบเดิมทุกอย่าง (คำสั่งละ 600 ms แล้วยิ้มท้ายโปรแกรม)
    // คืน true ถ้ารันครบ / false ถ้าถูกกดหยุด (หรือจบด้วยเจอขอบ/ไม่เจอของ) — สถานะจริงอยู่ที่ robot.prog

    window.runSimulation = async function (cmdString, opts) {
        opts = opts || {};
        var commands = String(cmdString || '').split(';').filter(function (c) { return c.trim() !== ''; });
        if (commands.length === 0 && !isRunning) return true;

        // กันกด Run ซ้อน — เดิมกด 2 ครั้งติดจะได้ซิม 2 ชุดวิ่งทับกันบนหุ่นตัวเดียว
        // (ช่วงต่อของโปรแกรมเดิม ส่ง opts.cont = true มา จึงผ่านได้)
        if (isRunning && !opts.cont) {
            RobotLog.add('RUN', 'ยังรันอยู่ ไม่เริ่มรอบใหม่ซ้อน');
            return false;
        }

        if (!isRunning) {
            isRunning = true;
            stopRequested = false;
            beginProgramState();
            if (window.onSimRunStateChange) window.onSimRunStateChange(true);
        }
        if (commands.length) {
            RobotLog.add('RUN', (opts.cont ? 'รันช่วงต่อ ' : 'เริ่มรันโปรแกรม ') + commands.length + ' คำสั่ง', { cmd: cmdString });
        }
        // จังหวะ: รอ 600 ms ก่อนทุกคำสั่งเหมือนเดิม แต่ถ้าคำสั่งก่อนหน้าใช้เวลานานกว่า (fw:3000, wait:2000)
        // ให้รอเท่าเวลาของคำสั่งนั้นแทน — คำสั่งเดิมทุกตัวยังเป็น 600 ms เท่าเดิม
        var lastDur = 600, failHandled = false;
        for (var i = 0; i < commands.length; i++) {
            await sleepStoppable(Math.max(600, lastDur));
            if (stopRequested) break;
            var one = commands[i].trim();
            if (one === 'back') {      // แทรกทางย้อนต่อท้ายคำสั่งนี้ (เหมือน pathRetrace)
                var ret = retraceCommands();
                RobotLog.add('SIM', ret.length ? 'ย้อนทางกลับจุดเริ่ม ' + ret.length + ' ช่วง' : 'ยังไม่ได้เดิน อยู่ที่จุดเริ่มแล้ว');
                commands.splice.apply(commands, [i + 1, 0].concat(ret));
            }
            lastDur = executeRobotCommand(one) || 600;
            if (robot.endReq === 4 && !failHandled) {
                // หนีบไม่เจอของ: ทิ้งคำสั่งที่เหลือ · ตั้ง failback:1 ไว้ = ย้อนทางกลับจุดเริ่มแทน
                failHandled = true;
                commands = commands.slice(0, i + 1).concat(robot.failback ? retraceCommands() : []);
            } else if (robot.endReq === 3) break;
        }
        if (!stopRequested && commands.length) {
            await sleepStoppable(opts.more ? lastDur : Math.max(0, lastDur - 600));
        }
        if (robot.endReq) stopRequested = true;           // จบโปรแกรมด้วยสถานะพิเศษ (เจอขอบ / ไม่เจอของ)
        if (opts.more && !stopRequested) return true;     // ยังไม่จบโปรแกรม

        var wasStopped = stopRequested;
        var endSt = robot.endReq || (wasStopped ? 3 : 2);
        robot.prog = endSt; robot.endReq = 0;
        isRunning = false;
        stopRequested = false;
        if (window.onSimRunStateChange) window.onSimRunStateChange(false);
        if (endSt === 4) {
            RobotLog.add('RUN', 'จบโปรแกรม: ภารกิจยกไม่สำเร็จ ไม่เจอของ (prog 4)');
            initIdleTimers();
            return false;
        }
        if (wasStopped) {
            RobotLog.add('RUN', 'หยุดกลางคัน หุ่นค้างที่ท่าปัจจุบัน (prog 3)');
            setEmotion('N', 'หยุดโปรแกรม');
            initIdleTimers();
            return false;
        }
        // ท้ายโปรแกรม: ยิ้ม 1.5 วิ แล้วกลับปกติ — เหมือนเฟิร์มแวร์ (prog 2)
        RobotLog.add('RUN', 'รันโปรแกรมจบ หุ่นยิ้มให้ 1.5 วิ แล้วกลับหน้าปกติ (prog 2)');
        if (window.SFX) window.SFX.ok();
        setEmotion('H', 'จบโปรแกรม');
        await new Promise(function (r) { setTimeout(r, 1500); });
        setEmotion('N', 'จบโปรแกรม');
        initIdleTimers();
        return true;
    };

    // ขอเริ่ม/จบโปรแกรมแบบหลายช่วง (MetoRunner) — ให้ปุ่ม Run/หยุด และ idle รู้ว่ากำลังรัน
    window.simBeginProgram = function () {
        if (isRunning) return false;
        isRunning = true;
        stopRequested = false;
        beginProgramState();
        if (window.onSimRunStateChange) window.onSimRunStateChange(true);
        return true;
    };
    window.simStopRequested = function () { return stopRequested; };

    // ---------- หุ่นตอบสนองสิ่งที่เด็กทำ ----------
    // เดิมหน้าหุ่นเปลี่ยนได้เฉพาะตอนเด็กสั่งบล็อก Face เท่านั้น
    // มันจึงเป็น "ผลลัพธ์" ไม่ใช่ "ตัวละครที่อยู่ด้วย"
    // ตรงนี้ให้มันมีปฏิกิริยาโดยไม่ต้องวาดอาร์ตใหม่สักชิ้น — ใช้ 11 อารมณ์ที่มีอยู่แล้ว
    //
    // กติกา: ตอนโค้ดพังใช้ 'C' (งง) ไม่ใช่ 'S'/'A' (เศร้า/โมโห)
    //        THEME.md ข้อ 9 ห้ามลงโทษความผิดพลาดของเด็ก
    var reactTimer = null;
    window.robotReact = function (kind) {
        if (isRunning) return;              // กำลังรันอยู่ อย่าไปแย่งหน้าหุ่น
        clearTimeout(reactTimer);
        var back = 1200;
        switch (kind) {
            case 'glance-left':  showFrame('LookLeft');  back = 700; break;
            case 'glance-right': showFrame('LookRight'); back = 700; break;
            case 'happy':    setEmotion('H', 'เด็กทำสำเร็จ'); break;
            case 'love':     setEmotion('V', 'เด็กได้ดาว'); back = 1800; break;
            case 'confused': setEmotion('C', 'โค้ดยังไม่พร้อม'); break;
            case 'shocked':  setEmotion('O', 'ลบบล็อก'); back = 800; break;
            case 'sleepy':   setEmotion('Z', 'เด็กหายไปนาน'); back = 0; break;   // ค้างไว้จนกว่าจะขยับ
            default: return;
        }
        if (back > 0) {
            reactTimer = setTimeout(function () {
                if (!isRunning) setEmotion('N', 'กลับหน้าปกติ');
            }, back);
        }
    };

    // นิ่งนานแล้วง่วง — ปลุกเมื่อเด็กขยับอีกครั้ง
    var idleSleepTimer = null;
    window.robotNudgeAwake = function () {
        clearTimeout(idleSleepTimer);
        if (FaceTwin.emo === 'Z' && !isRunning) setEmotion('N', 'เด็กกลับมาแล้ว');
        idleSleepTimer = setTimeout(function () {
            if (!isRunning) window.robotReact('sleepy');
        }, 60000);
    };
    window.robotNudgeAwake();

    // สลับจอใหญ่ ↔ จอเล็ก (คลิกที่จอเล็กเท่านั้น — กันกดพลาดตอนดูจอใหญ่)
    function initTwinSwap() {
        var stage = document.getElementById('stage-container');
        var face = document.getElementById('face-container');
        if (!stage || !face) return;

        function swap() {
            var stageWasBig = stage.classList.contains('twin-big');
            [stage, face].forEach(function (el) {
                el.classList.toggle('twin-big');
                el.classList.toggle('twin-pip');
            });
            stage.title = stageWasBig ? 'เวทีจำลอง คลิกเพื่อสลับเป็นจอใหญ่' : 'เวทีจำลอง มุมมองด้านบน';
            face.title = stageWasBig ? 'จอหน้าหุ่น (จอ TFT ของหุ่นจริง)' : 'จอหน้าหุ่น คลิกเพื่อสลับเป็นจอใหญ่';
            RobotLog.add('UI', 'สลับจอ → จอใหญ่คือ ' + (stageWasBig ? 'จอหน้าหุ่น' : 'เวทีจำลอง'));
            redrawNow();
        }

        [stage, face].forEach(function (el) {
            el.addEventListener('click', function () {
                if (el.classList.contains('twin-pip')) swap();
            });
        });
    }

    // วาดทั้งสองจอทันทีแบบ synchronous (ไม่รอ rAF — เผื่อแท็บถูกซ่อนอยู่)
    function redrawNow() {
        stageDirty = true; FaceTwin.dirty = true;
        drawStage(); stageDirty = false;
        drawFaceIfDirty();
    }

    // วาดหน้าหุ่นลง canvas ที่ส่งมา — ใช้โค้ดวาดชุดเดียวกับจอ TFT ของหุ่นจริง
    //
    // มีไว้ให้หน้าอื่น (เช่น ตู้สะสมหน้าหุ่นในแดชบอร์ด) เอาไปแสดงได้
    // โดยไม่ต้องวาดอาร์ตชุดใหม่ ซึ่งจะกลายเป็นคนละหน้ากับที่เด็กเห็นในเกม
    //
    // frameName = คีย์ของ FaceFrames: Normal / Happy / Sad / Angry / Shocked /
    //             Sleepy / Confused / Love / Shy / LookLeft / LookRight
    window.renderRobotFace = function (canvas, frameName) {
        if (!canvas || !canvas.getContext) return false;
        var fn = FaceFrames[frameName] || FaceFrames.Normal;

        // วาดที่ขนาดจริงของจอ TFT ก่อน แล้วค่อยย่อ — พิกัดทุกจุดใน FaceFrames
        // อ้างอิงระบบพิกัด 320x240 ของ Robo.ino ถ้าวาดตรงลงผืนเล็กจะเพี้ยนหมด
        var buf = document.createElement('canvas');
        buf.width = TFT_W; buf.height = TFT_H;
        fn(buf.getContext('2d'), 1);

        var g = canvas.getContext('2d');
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.imageSmoothingEnabled = true;
        g.drawImage(buf, 0, 0, canvas.width, canvas.height);
        return true;
    };

    // แปลงชนิดบล็อกหมวด Face เป็นชื่อเฟรม
    window.faceBlockToFrame = function (blockType) {
        var map = {
            face_normal: 'Normal', face_look_left: 'LookLeft', face_look_right: 'LookRight',
            face_happy: 'Happy', face_sad: 'Sad', face_angry: 'Angry',
            face_shocked: 'Shocked', face_sleepy: 'Sleepy', face_confused: 'Confused',
            face_love: 'Love', face_shy: 'Shy'
        };
        return map[blockType] || 'Normal';
    };

    // เปิดให้ตรวจสถานะ/ดีบักจากคอนโซล
    window.RobotSim = {
        state: robot, view: view, link: TwinLink, face: FaceTwin,
        log: RobotLog, snapshot: snapshot, reset: resetRobot, redraw: redrawNow,
        // สั่งอ่านสถานะหุ่นจริงทันที (ใช้เช็คการเชื่อมต่อจาก console)
        pollNow: function () { TwinLink.lastPoll = 0; pollTwin(); },
        // ล้างจังหวะที่ถอยไปแล้ว แล้วถามใหม่ทันที — ใช้ตอนคนเพิ่งเสียบหุ่น
        checkNow: function () { TwinLink.fails = 0; TwinLink.lastPoll = 0; pollTwin(); },
        setFaceSprites: function (on) { USE_FACE_SPRITES = !!on; loadSprites(); },
        // ---- ใช้กับบล็อกเซนเซอร์ (MetoRunner ใน script.js) ----
        host: function () { return TwinLink.host; },
        isLive: function () { return TwinLink.live && TwinLink.supported === true; },
        fetchState: fetchStateOnce,          // อ่าน /state สด 1 ครั้ง → Promise<JSON|null>
        simSensorState: simSensorState,      // ค่าเซนเซอร์จำลอง (ตอนไม่ได้ต่อหุ่นจริง)
        // ให้ครูลองบล็อก "หน้าคน" ในซิมได้จากคอนโซล เช่น RobotSim.setSimCam('H')
        setSimCam: function (c) { robot.cam = String(c || '-').charAt(0); robot.camOk = robot.cam !== '-'; },
        // รอบ #501: มีของตรงหน้าไหม (false = ลองภารกิจหนีบไม่สำเร็จ) · จำลองแตะหัว (1 แตะ, 2 แตะสองที, 3 กดค้าง)
        setSimObject: function (on) { robot.simObj = !!on; RobotLog.add('SIM', on ? 'วางของไว้หน้าหุ่น' : 'เอาของออกจากหน้าหุ่น'); },
        simTouch: function (evt) { robot.touchN++; robot.touchEvt = evt || 1; RobotLog.add('SIM', 'มีคนแตะหัว (จำลอง)'); },
        setIdleOn: function (on) { return setIdleOn(on, false); },
        getIdleOn: function () { return !!robot.idleOn; },
        toggleIdle: function () { return setIdleOn(!robot.idleOn, false); }
    };

    // ============================================================
    // Chat FAB Icon — ดวงตาหุ่น (สไตล์จอ TFT)
    // ============================================================
    function drawChatFabIcon() {
        var fab = document.getElementById('chat-fab-canvas');
        if (!fab) return;
        var fc = fab.getContext('2d');
        fc.clearRect(0, 0, 32, 32);
        [[10, 15], [22, 15]].forEach(function (p) {
            fc.beginPath(); fc.ellipse(p[0], p[1], 4.5, 5.5, 0, 0, Math.PI * 2);
            fc.fillStyle = '#222'; fc.fill();
            fc.beginPath(); fc.ellipse(p[0], p[1] + 2, 2.5, 1.8, 0, 0, Math.PI * 2);
            fc.fillStyle = '#fff'; fc.fill();
        });
    }

    // ============================================================
    // INIT
    // ============================================================
    function initAll() {
        RobotLog.add('BOOT', 'เริ่มระบบ Digital Twin (เวทีมุมมองด้านบน + จอหน้าหุ่น)');
        loadSprites();
        initCanvas();
        if (ensureFaceCanvas()) {
            showFrame('Normal');
            RobotLog.add('BOOT', 'จอหน้าหุ่นพร้อม (' + TFT_W + 'x' + TFT_H + ' เท่าจอ TFT จริง)');
        } else {
            RobotLog.add('BOOT', 'ไม่พบ #face-container ข้ามจอหน้าหุ่น (ใช้เฉพาะเวที)');
        }
        drawChatFabIcon();
        initIdleTimers();
        initTwinSwap();
        syncIdleBtn();
        updateBadge();

        redrawNow();               // ให้เห็นภาพทันที ไม่ต้องรอเฟรมแรก
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
