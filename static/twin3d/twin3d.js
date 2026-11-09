// METO ทวิน 3D — หุ่นตัวสำเร็จ บังคับด้วยคีย์บอร์ด
// ชิ้นส่วน/จุดหมุน: สร้างจาก sim/simlib.py scene() ด้วย build_models.py (หน่วย mm, แกน Z ขึ้น, +Y = หน้าหุ่น, +X = ขวาของหุ่น)
// interlock: แปลงจาก RoboPCA9685/meto_interlock_table.h ตารางเดียวกับเฟิร์มแวร์ และตรรกะเดียวกับ ilkHitArmR/axTrySet/axesUpdate
import * as THREE from 'three';
import { STLLoader } from 'three/addons/STLLoader.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { ARR, SETS, REST_LIFT } from './emotes.js';   // ท่าทุกชุด จาก RoboPCA9685/meto_emotes.h (tools/gen_emotes_js.py)

const $ = (s) => document.querySelector(s);
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- ค่าคงที่ของหุ่น
// ความเร็ว/ความเร่งเซอร์โว = ค่าเริ่มของเฟิร์มแวร์ (cfg.headVmax 90 / armVmax 90 / handVmax 120 °/วิ)
const AX = { ARM_L: 0, HAND_L: 1, ARM_R: 2, HAND_R: 3, YAW: 4, TILT: 5 };
const AXDEF = [
  { name: 'แขนซ้าย', min: -43, max: 48, vmax: 90, acc: 240 },
  { name: 'มือซ้าย', min: -30, max: 28.5, vmax: 120, acc: 480 },   // แขนรอบ 3: ท่อนแขนยาว 125 หนีบ +28.5 ปลายแขนห่าง 1.2 (รอบ 2b/2c +32)
  { name: 'แขนขวา', min: -43, max: 48, vmax: 90, acc: 240 },
  { name: 'มือขวา', min: -30, max: 28.5, vmax: 120, acc: 480 },
  { name: 'หัวหัน', min: -90, max: 90, vmax: 90, acc: 240 },
  { name: 'ก้มเงย', min: -10, max: 10, vmax: 90, acc: 240 },
];
const ORDER = [AX.TILT, AX.HAND_L, AX.HAND_R, AX.ARM_L, AX.ARM_R, AX.YAW];   // ลำดับเดียวกับ axesUpdate()
const GRIP_OPEN = -30, GRIP_CLOSE = 28.5;                                      // มือ 0% = −30° กางสุด, 100% = +28.5° หนีบสุด (แขนรอบ 3 · รอบ 2b/2c +32)
const relToPct = (r) => Math.round((r - GRIP_OPEN) / (GRIP_CLOSE - GRIP_OPEN) * 100);
const pctToRel = (p) => GRIP_OPEN + (GRIP_CLOSE - GRIP_OPEN) * p / 100;

// ล้อ: TT 1:48 ล้อ Ø41 · PWM_DRIVE 110/255 → ราว 0.18 ม./วิ (สมมติ ดูรายงาน) · ชะลอหยุด 0.4 วิ เท่าเฟิร์มแวร์
const WHEEL_R = 20.5, DRIVE_V = 180, TRACK = 117, RAMP_S = 0.4;
const TURN_W = 2 * DRIVE_V / TRACK;   // rad/s ตอนเลี้ยวอยู่กับที่

const EMOS = [
  { key: '1', code: 'N', th: 'ปกติ' }, { key: '2', code: 'H', th: 'ดีใจ' }, { key: '3', code: 'S', th: 'เศร้า' },
  { key: '4', code: 'A', th: 'โกรธ' }, { key: '5', code: 'O', th: 'ตกใจ' }, { key: '6', code: 'Z', th: 'ง่วง' },
  { key: '7', code: 'C', th: 'งง' }, { key: '8', code: 'V', th: 'รัก' }, { key: '9', code: 'B', th: 'เขิน' },
];

const COLORS = { body: 0xd9dde4, head: 0xf3e6c8, arm: 0xf08a2c, device: 0x2f6fd0, wheel: 0x222428 };
const COLOR_TH = { body: 'ตัว', head: 'หัว', arm: 'แขน', device: 'อุปกรณ์', wheel: 'ล้อ' };
const PART_COLOR = { h_display: 0x111317, h_scr_disp: 0x111317, b_balls: 0x9aa0a8, b_rods: 0x8a8f96, devices: 0x2e8b57,
                     arm_cable: 0xc23b3b, h_copper: 0xc07030, h_magnets: 0x777777, b_tt: 0xe8c21a,
                     // เปลือกตัว v9 สองสี (ล่าง Z<47 เทาเข้ม · บนครีม) + ประตู/หมวกเสา สีเข้ม
                     v9_front_lo: 0x3d3f45, v9_back_lo: 0x3d3f45, v9_front_hi: 0xf0e8d6, v9_back_hi: 0xf0e8d6,
                     v9_door_L: 0x3d3f45, v9_door_R: 0x3d3f45, v9_post_cap_L: 0x3d3f45, v9_post_cap_R: 0x3d3f45 };
// ของสวมหัว: พิกัด STL จุดกำเนิด = กลางผิวบนหัว, +Y = หน้า, Z ขึ้น · วางตรงผิวบนเปลือกหัว (h_shell) ใน groups.headM
const HATS = [
  { key: 'cat', th: 'หูแมว', file: 'hat_cat.stl', color: 0x5c5c66 },
  { key: 'bear', th: 'หูหมี', file: 'hat_bear.stl', color: 0x946645 },
  { key: 'ant', th: 'หนวดมด', file: 'hat_ant.stl', color: 0x383840 },
  { key: 'straw', th: 'หมวกฟาง', file: 'hat_straw.stl', color: 0xdeba6e },
];
const hatMeshes = {};
let hatMode = 'none';

// ---------------------------------------------------------------- interlock
let ILK = null;
function loadIlk(j) {
  const maps = j.maps.map((b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  ILK = { d: j.defs, lifts: j.lifts, idx: j.idx, maps };
}
function bracket(v, v0, step, n) {
  const f = (v - v0) / step;
  if (f <= 0) return [0];
  if (f >= n - 1) return [n - 1];
  const j = Math.floor(f), fr = f - j;
  if (fr < 1e-3) return [j];
  if (fr > 1 - 1e-3) return [j + 1];
  return [j, j + 1];
}
function bracketLift(v) {
  const L = ILK.lifts, n = L.length;
  if (v <= L[0]) return [0];
  if (v >= L[n - 1]) return [n - 1];
  for (let j = 0; j < n - 1; j++) {
    if (v >= L[j] && v <= L[j + 1]) {
      if (Math.abs(v - L[j]) < 1e-3) return [j];
      if (Math.abs(v - L[j + 1]) < 1e-3) return [j + 1];
      return [j, j + 1];
    }
  }
  return [n - 1];
}
function ilkHitArmR(yaw, nod, lift, grip) {
  const d = ILK.d;
  const yi = bracket(yaw, d.ILK_YAW0, d.ILK_YAW_STEP, d.ILK_NY);
  const ni = bracket(nod, d.ILK_NOD0, d.ILK_NOD_STEP, d.ILK_NN);
  const li = bracketLift(lift);
  const ci = bracket(grip, d.ILK_CLAMP0, d.ILK_CLAMP_STEP, d.ILK_NC);
  for (const a of yi) for (const b of ni) {
    const m = ILK.maps[ILK.idx[a][b]];
    for (const c of li) for (const e of ci) {
      const bit = c * d.ILK_NC + e;
      if ((m[bit >> 3] >> (bit & 7)) & 1) return true;
    }
  }
  return false;
}
let ilkEnabled = true, ilkCount = 0;
function poseOK(r) {
  if (!ilkEnabled || !ILK) return true;
  if (ilkHitArmR(r[AX.YAW], r[AX.TILT], r[AX.ARM_R], r[AX.HAND_R])) return false;
  if (ilkHitArmR(-r[AX.YAW], r[AX.TILT], r[AX.ARM_L], r[AX.HAND_L])) return false;
  return true;
}
// ใครชนกับอะไร (ไว้เขียนข้อความเตือน)
function whoHits(r) {
  const out = [];
  if (ilkHitArmR(r[AX.YAW], r[AX.TILT], r[AX.ARM_R], r[AX.HAND_R])) out.push('แขนขวา');
  if (ilkHitArmR(-r[AX.YAW], r[AX.TILT], r[AX.ARM_L], r[AX.HAND_L])) out.push('แขนซ้าย');
  return out;
}

// ---------------------------------------------------------------- แกนขยับนุ่ม (ตามเฟิร์มแวร์ axesUpdate)
const ax = AXDEF.map((d, i) => { const r = (i === 0 || i === 2) ? -30 : 0; return { pos: r, vel: 0, target: r, blocked: false }; });   // เริ่มที่ท่าพัก R: แขนลง −30 (= REST_LIFT ใน meto_emotes.h)
let userTilt = 0;          // ก้มเงยที่ผู้ใช้ต้องการ (ใช้คืนค่าหลังหลบตอนหัวหัน)
let tiltDuck = false;
const targetsArr = () => ax.map((a) => a.target);
const posArr = () => ax.map((a) => a.pos);

function setRaw(i, v) { ax[i].target = clamp(v, AXDEF[i].min, AXDEF[i].max); }
// เหมือน axTrySet: คืน true ถ้าได้ตามสั่ง
function trySet(i, v, quiet) {
  v = clamp(v, AXDEF[i].min, AXDEF[i].max);
  const P = targetsArr(); P[i] = v;
  if (poseOK(P)) { setRaw(i, v); return true; }
  if (i === AX.YAW) {
    const n0 = P[AX.TILT];
    for (let d = 1; d <= 20; d++) for (const sg of [-1, 1]) {
      const n = n0 + sg * d;
      if (n < AXDEF[AX.TILT].min || n > AXDEF[AX.TILT].max) continue;
      P[AX.TILT] = n;
      if (poseOK(P)) {
        setRaw(AX.TILT, n); setRaw(AX.YAW, v); ilkCount++; tiltDuck = true;
        if (!quiet) toast(`ระบบกันชน: หัวหัน ${v.toFixed(0)}° ต้อง${n > n0 ? 'เงย' : 'ก้ม'}หลบเป็น ${n.toFixed(0)}° ไม่ให้ชนแขน`, 'info');
        return true;
      }
    }
  }
  ilkCount++;
  if (!quiet) {
    const P2 = targetsArr(); P2[i] = v;
    const who = whoHits(P2);
    toast(`ระบบกันชน: ${AXDEF[i].name} ไปต่อไม่ได้ — ${who.join(' และ ')}จะชนหัว (ตารางจากผลจำลอง)`);
  }
  return false;
}

function axesUpdate(dt) {
  const P = posArr();
  const curOK = poseOK(P);
  let yawBlocked = false, yawCand = 0;
  for (const i of ORDER) {
    const a = ax[i], def = AXDEF[i];
    const err = a.target - a.pos;
    if (Math.abs(err) < 0.05 && Math.abs(a.vel) < 2) { a.pos = a.target; a.vel = 0; a.blocked = false; continue; }
    let vdes = Math.min(Math.sqrt(2 * def.acc * Math.abs(err)), def.vmax);
    if (err < 0) vdes = -vdes;
    const dv = def.acc * dt;
    let nv = a.vel + clamp(vdes - a.vel, -dv, dv);
    let np = a.pos + nv * dt;
    if ((err > 0 && np > a.target) || (err < 0 && np < a.target)) { np = a.target; nv = 0; }
    const keep = P[i]; P[i] = np;
    if (!curOK || poseOK(P)) { a.pos = np; a.vel = nv; a.blocked = false; }
    else {
      P[i] = keep; a.vel = 0; a.blocked = true;
      if (i === AX.YAW) { yawBlocked = true; yawCand = np; }
    }
  }
  if (yawBlocked) {               // หัวหันติดช่วงชน → ก้มเงยหลบชั่วคราว (tiltDuck)
    const Q = P.slice(); Q[AX.YAW] = yawCand;
    for (let d = 0; d <= 20; d++) {
      let found = null;
      for (const sg of [-1, 1]) {
        const n = P[AX.TILT] + sg * d;
        if (n < -10 || n > 10) continue;
        Q[AX.TILT] = n;
        if (poseOK(Q)) { found = n; break; }
      }
      if (found !== null) { tiltDuck = true; setRaw(AX.TILT, found); break; }
    }
  } else if (tiltDuck && Math.abs(ax[AX.YAW].target - ax[AX.YAW].pos) < 0.05 && !held.yaw) {
    tiltDuck = false;
    trySet(AX.TILT, userTilt, true);
  }
}

// ---------------------------------------------------------------- three.js ฉาก
const view = $('#view');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);   // #461 ขอพื้นฉากขาว
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 5, 20000);
camera.up.set(0, 0, 1);
camera.position.set(420, 520, 360);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 80);

scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(300, 400, 800); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 10, far: 3000 });
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xbfd4ff, 0.6); fill.position.set(-500, -300, 300); scene.add(fill);

// พื้น 2 × 2 ม. ตาราง 10 ซม.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.18 }));
floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(4000, 40, 0xc9ced6, 0xe3e6eb);
grid.rotation.x = Math.PI / 2; grid.position.z = 0.3; scene.add(grid);

// โครงหุ่น
const robotRoot = new THREE.Group(); scene.add(robotRoot);          // ตำแหน่งบนพื้น + ทิศ (หมุนรอบกึ่งกลางเพลาล้อ)
const model = new THREE.Group(); robotRoot.add(model);
let PIV = null;
const groups = {};
const mats = {};
const meshesByCat = { body: [], head: [], arm: [], device: [], wheel: [] };
const shellMeshes = [];

function pivotGroup(parent, p) {   // group ที่จุดหมุน p และ group ลูกที่ชดเชยกลับ
  const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); parent.add(g);
  const inner = new THREE.Group(); inner.position.set(-p[0], -p[1], -p[2]); g.add(inner);
  return { g, inner };
}

function buildRig() {
  const P = PIV;
  model.position.set(0, -P.TT_SHAFT[1], 0);       // กึ่งกลางเพลาล้อหลัง = จุดหมุนตอนเลี้ยว
  groups.body = new THREE.Group(); model.add(groups.body);
  // หัว: Rz(yaw) รอบ YAW_O แล้ว Rx(nod) รอบ PIVOT_L (พิกัดหัว)
  groups.yaw = new THREE.Group(); groups.yaw.position.set(...P.YAW_O); model.add(groups.yaw);
  groups.headF = groups.yaw;
  const nod = pivotGroup(groups.yaw, P.PIVOT_L);
  groups.nod = nod.g; groups.headM = nod.inner;
  // แขน: Rx(lift) รอบเส้น ARM_AX แล้ว Rz(clamp) รอบแกน MG90S
  const arm = (parent) => {
    const L = pivotGroup(parent, P.ARM_AX);
    const C = pivotGroup(L.inner, [P.CLAMP_AX_R[0], P.CLAMP_AX_R[1], 0]);
    return { lift: L.g, armU: L.inner, clamp: C.g, armC: C.inner };
  };
  groups.R = arm(model);
  const mirror = new THREE.Group(); mirror.scale.set(-1, 1, 1); model.add(mirror);
  groups.L = arm(mirror);
  groups.mirrorBody = mirror;
  // ล้อ: หมุนรอบเส้นแกน X ผ่านปลายเพลา TT
  groups.wheelR = pivotGroup(model, [0, P.TT_SHAFT[1], P.TT_SHAFT[2]]);
  groups.wheelL = pivotGroup(model, [0, P.TT_SHAFT[1], P.TT_SHAFT[2]]);
}

function material(cat, name) {
  const key = cat + ':' + name;
  const color = PART_COLOR[name.replace(/_[RL]$/, '')] ?? COLORS[cat];
  const m = new THREE.MeshStandardMaterial({ color, roughness: cat === 'device' ? 0.5 : 0.7, metalness: cat === 'device' ? 0.2 : 0.05,
                                             side: THREE.DoubleSide });
  mats[key] = m; return m;
}

function addMesh(parent, geo, part, extra) {
  const m = new THREE.Mesh(geo, material(part.cat, part.name));
  m.castShadow = true; m.receiveShadow = true; m.userData.part = part.name + (extra || '');
  parent.add(m);
  meshesByCat[part.cat].push(m);
  if (part.shell) shellMeshes.push(m);
  return m;
}

// ---------------------------------------------------------------- หน้าจอหุ่น (ภาพตา)
const faceCanvas = document.createElement('canvas');
faceCanvas.width = 320; faceCanvas.height = 240;
const faceTex = new THREE.CanvasTexture(faceCanvas);
faceTex.colorSpace = THREE.SRGBColorSpace;
let emo = 'N', blinkT = 0, emoSince = 0, faceOv = null, nextBlink = 3;   // faceOv = หน้าในจังหวะท่า (L R - h หรืออารมณ์)

// วาดตาตามเฟิร์มแวร์ RoboPCA9685.ino ตรงตัว (drawEyes_* · จอ 320×240 setRotation(1) พื้นขาว ตาดำ)
const SLEEPY_RUNS = [[131,126,129],[131,202,206],[132,121,129],[132,202,210],[133,117,130],[133,201,215],[134,112,130],[134,201,220],[135,103,130],[135,201,228],[136,99,130],[136,201,233],[137,94,130],[137,201,237],[138,89,131],[138,201,242],[139,82,131],[139,201,250],[140,77,131],[140,201,255],[141,72,131],[141,200,260],[142,68,132],[142,200,264],[143,59,132],[143,200,272],[144,54,132],[144,200,277],[145,50,132],[145,200,281],[146,42,132],[146,199,290],[147,37,132],[147,199,294],[148,33,132],[148,199,299],[149,32,132],[149,199,299],[150,32,132],[150,199,299],[151,32,133],[151,198,299],[152,33,133],[152,198,298],[153,33,133],[153,198,298],[154,33,133],[154,198,298],[155,33,134],[155,198,298],[156,33,134],[156,197,298],[157,34,134],[157,198,297],[158,34,134],[158,198,297],[159,34,134],[159,197,297],[160,34,135],[160,197,297],[161,34,132],[161,199,297],[162,35,124],[162,208,297],[163,35,119],[163,212,297],[164,35,114],[164,217,297],[165,35,109],[165,222,296],[166,35,102],[166,230,296],[167,36,97],[167,235,296],[168,36,93],[168,240,296],[169,36,88],[169,244,296],[170,36,79],[170,252,295],[171,36,75],[171,256,295],[172,36,70],[172,261,295],[173,36,65],[173,266,295],[174,36,57],[174,274,295],[175,37,52],[175,279,294],[176,37,48],[176,284,294],[177,37,40],[177,292,294]];   // หน้าง่วง #515 ตามภาพที่ 14 ในรายงาน (ชุดเดียวกับเฟิร์มแวร์)
const SHOCK_RUNS = [[16,279,289],[17,278,290],[18,278,291],[19,278,292],[20,278,293],[21,278,294],[22,279,282],[22,285,294],[23,287,294],[23,311,312],[24,288,294],[24,309,313],[25,288,294],[25,309,314],[26,288,294],[26,308,314],[27,288,294],[27,308,314],[28,287,294],[28,308,314],[29,287,294],[29,308,314],[30,286,294],[30,308,314],[31,284,293],[31,308,314],[32,284,292],[32,308,314],[33,283,291],[33,308,314],[34,282,291],[34,308,314],[35,282,290],[35,308,314],[36,282,289],[36,308,314],[37,282,288],[37,308,314],[38,282,287],[38,308,314],[39,282,288],[39,308,314],[40,282,288],[40,308,314],[41,282,288],[41,308,313],[42,282,289],[42,308,314],[43,283,289],[43,308,314],[44,247,253],[44,283,289],[44,308,314],[45,245,256],[45,283,289],[45,308,314],[46,245,259],[46,283,289],[46,308,314],[47,244,261],[47,284,289],[47,308,314],[48,245,263],[48,284,289],[48,308,314],[49,245,265],[49,285,288],[49,308,314],[50,247,267],[50,308,314],[51,253,268],[51,307,313],[52,255,270],[52,307,313],[53,258,271],[53,307,313],[54,53,55],[54,260,273],[54,307,312],[55,51,57],[55,262,275],[55,307,312],[56,50,58],[56,263,276],[56,307,312],[57,49,58],[57,265,276],[57,308,311],[58,49,58],[58,267,276],[59,47,58],[59,268,276],[60,46,57],[60,270,276],[61,46,55],[61,271,275],[62,45,53],[62,291,292],[63,44,52],[63,288,295],[64,43,51],[64,287,296],[65,43,51],[65,287,296],[66,42,50],[66,286,296],[67,41,49],[67,286,296],[68,40,49],[68,287,296],[69,40,48],[69,287,296],[69,303,305],[70,39,47],[70,288,296],[70,302,307],[71,39,46],[71,289,296],[71,301,308],[72,38,45],[72,290,295],[72,301,309],[73,38,44],[73,292,294],[73,301,309],[74,37,44],[74,301,309],[75,36,44],[75,301,309],[76,35,43],[76,301,309],[77,35,42],[77,302,309],[78,35,42],[78,303,309],[79,35,42],[79,305,307],[80,35,41],[81,35,40],[82,35,40],[83,36,39],[84,37,37],[186,285,288],[187,32,37],[187,284,289],[188,31,37],[188,284,289],[189,31,38],[189,283,289],[190,31,39],[190,282,289],[191,31,40],[191,282,289],[192,32,42],[192,282,289],[193,33,43],[193,281,288],[194,34,44],[194,280,288],[195,35,45],[195,279,287],[196,36,46],[196,278,287],[197,37,47],[197,277,286],[198,38,48],[198,276,285],[199,39,49],[199,275,284],[200,40,50],[200,274,283],[201,20,25],[201,41,51],[201,274,282],[202,19,26],[202,42,52],[202,273,281],[203,18,27],[203,43,53],[203,272,280],[204,18,27],[204,45,54],[204,271,279],[205,18,28],[205,47,55],[205,270,278],[206,19,29],[206,48,56],[206,269,278],[207,20,29],[207,49,58],[207,269,277],[208,22,29],[208,51,57],[208,268,277],[209,23,29],[209,267,276],[210,23,29],[210,266,275],[211,23,29],[211,266,274],[212,22,29],[212,266,273],[213,22,29],[213,267,272],[214,21,28],[214,267,272],[215,21,28],[215,268,271],[216,20,27],[217,19,35],[218,18,36],[219,17,37],[220,14,38],[220,41,49],[221,14,49],[222,13,50],[223,14,50],[224,13,27],[224,32,50],[225,14,25],[225,32,49],[226,15,21],[226,32,48],[227,31,41],[228,32,40],[229,33,38],[230,34,35]];   // หน้าตกใจ #513 ลอกจากภาพเจ้าของ 79: แถวพิกเซล [y, x0, x1] (ชุดเดียวกับเฟิร์มแวร์)
function drawFace(t) {
  const c = faceCanvas.getContext('2d'), W = 320, H = 240;
  const WHITE = '#ffffff', BLACK = '#000000', RED = '#ff0000';
  const TEAR = '#0098ff', HEART = 'rgb(220,20,60)', BLUSH = 'rgb(255,130,150)';
  const LX = W / 2 - 80, RX = W / 2 + 80, EY = H / 2 - 10;
  const el = (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const tri = (x0, y0, x1, y1, x2, y2, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill(); };
  c.fillStyle = WHITE; c.fillRect(0, 0, W, H);
  // กระพริบตา (เหมือน updateBlink ในเฟิร์มแวร์): ทุก 2–5 วิ หลับ 0.15 วิ · ไม่กระพริบตอนหัวใจ/ง่วง/หลับตาอยู่แล้ว
  let f = faceOv || emo;
  if (t > nextBlink + 0.15) nextBlink = t + 2 + Math.random() * 3;
  if (t >= nextBlink && !'VZ-h'.includes(f)) f = '-';
  switch (f) {
    case 'L': for (const X of [LX, RX]) { el(X, EY, 55, 60, BLACK); el(X - 15, EY - 20, 30, 20, WHITE); } break;   // drawEyes_LookLeft
    case 'R': for (const X of [LX, RX]) { el(X, EY, 55, 60, BLACK); el(X + 15, EY - 20, 30, 20, WHITE); } break;   // drawEyes_LookRight
    case '-': c.fillStyle = BLACK; for (const X of [LX, RX]) c.fillRect(X - 55, EY + 20, 110, 4); break;           // drawEyes_Closed
    case 'h': for (const X of [LX, RX]) el(X, EY + 15, 55, 20, BLACK); break;                                    // drawEyes_HalfClosed
    case 'H':   // drawEyes_Happy
      for (const X of [LX, RX]) { el(X, EY + 20, 55, 60, BLACK); el(X, EY, 30, 20, WHITE); el(X, EY + 70, 55, 20, WHITE); }
      break;
    case 'S': { // drawEyes_Sad
      el(LX, EY + 20, 55, 60, BLACK); el(LX, EY + 50, 30, 20, WHITE);
      tri(LX - 60, EY - 45, LX + 60, EY - 45, LX - 60, EY + 30, WHITE);
      const tx = LX - 35, ty = EY + 75, ts = 10;
      tri(tx, ty, tx - ts, ty + 15, tx + ts, ty + 15, TEAR);
      c.fillStyle = TEAR; c.beginPath(); c.arc(tx, ty + 15, ts, 0, Math.PI * 2); c.fill();
      el(RX, EY + 20, 55, 60, BLACK); el(RX, EY + 50, 30, 20, WHITE);
      tri(RX - 60, EY - 45, RX + 60, EY - 45, RX + 60, EY + 30, WHITE);
      break;
    }
    case 'A':   // drawEyes_Angry (ภาพวาดเดิม Robo.ino)
      el(LX, EY + 20, 55, 60, BLACK); el(LX, EY + 50, 30, 20, WHITE);
      tri(LX - 70, EY - 50, LX + 70, EY - 50, LX + 70, EY + 15, WHITE);
      el(RX, EY + 20, 55, 60, BLACK); el(RX, EY + 50, 30, 20, WHITE);
      tri(RX - 70, EY - 50, RX + 70, EY - 50, RX - 70, EY + 15, WHITE);
      break;
    case 'O': { // drawEyes_Shocked (#513 ลอกจากภาพเจ้าของวาด 79)
      for (const X of [85, 237]) { el(X, 135, 54, 80, BLACK); el(X, 162, 24, 17, WHITE); }
      c.fillStyle = BLACK; for (const [y, x0, x1] of SHOCK_RUNS) c.fillRect(x0, y, x1 - x0 + 1, 1);
      break;
    }
    case 'Z':   // drawEyes_Sleepy (#515 ตามภาพที่ 14 ในรายงาน: ขีดหนาเอียง 2 เส้น)
      c.fillStyle = BLACK; for (const [y, x0, x1] of SLEEPY_RUNS) c.fillRect(x0, y, x1 - x0 + 1, 1);
      break;
    case 'C':   // drawEyes_Confused (ภาพวาดเดิม Robo.ino)
      el(LX, EY, 55, 60, BLACK); el(LX + 10, EY - 10, 30, 20, WHITE);
      el(RX, EY, 55, 60, BLACK); el(RX - 10, EY + 15, 30, 20, WHITE);
      c.fillStyle = BLACK; c.font = 'bold 32px monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('?', RX + 45, EY - 55);
      break;
    case 'V': { // drawHeart (ภาพวาดเดิม Robo.ino) — เต้นแบบ heartbeatPhase: 800 ms ใหญ่ แล้วสลับ 150 ms
      const ph = (t * 1000) % 1250, sz = ph < 800 ? 2 : (ph < 950 || ph >= 1100 ? 1 : 2);
      const cx = W / 2, cy = H / 2 - 5, r = 28 + sz * 4, gap = r - 4, triW = gap + r + 5, triH = r + 20 + sz * 6;
      c.fillStyle = HEART;
      c.beginPath(); c.arc(cx - gap, cy - 10, r, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + gap, cy - 10, r, 0, Math.PI * 2); c.fill();
      tri(cx - triW, cy, cx + triW, cy, cx, cy + triH, HEART);
      break;
    }
    case 'B': { // drawEyes_Shy (ภาพวาดเดิม Robo.ino)
      for (const X of [LX, RX]) { el(X, EY + 10, 55, 45, BLACK); el(X + 12, EY + 28, 25, 18, WHITE); c.fillStyle = WHITE; c.fillRect(X - 60, EY - 35, 120, 25); }
      const by = EY + 58, len = 14, gp = 10;
      c.strokeStyle = BLUSH; c.lineWidth = 3; c.beginPath();
      for (const [x0, x1] of [[LX - gp - len, LX - gp], [LX - gp + 6 - len, LX - gp + 6], [RX + gp, RX + gp + len], [RX + gp + 6, RX + gp + 6 + len]]) { c.moveTo(x0, by - len); c.lineTo(x1, by); }
      c.stroke();
      break;
    }
    default:    // drawEyes_Normal
      for (const X of [LX, RX]) { el(X, EY, 55, 60, BLACK); el(X, EY + 20, 30, 20, WHITE); }
  }
  faceTex.needsUpdate = true;
}

function addScreen() {
  // จอ: ชิ้น h_display (พิกัดหัว) X −44.5…41.5 · Y หน้าจอ 46.6 · Z −0.5…49.5 → พื้นที่แสดงผลวางตรงกลางหน้าจอ
  const geo = new THREE.PlaneGeometry(64, 46);
  const mat = new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false });
  const scr = new THREE.Mesh(geo, mat);
  scr.position.set(-1.5, 46.9, 24.5 + 2.5);   // หัวยก 2.5
  scr.rotateZ(Math.PI); scr.rotateX(Math.PI / 2);
  groups.headM.add(scr);
  groups.screen = scr;
  meshesByCat.device.push(scr);   // จอเป็นอุปกรณ์ แต่ให้แสดงเสมอ (ดู setDevices)
}

// ---------------------------------------------------------------- โหลดชิ้นส่วน
async function loadAll() {
  const [parts, ilk] = await Promise.all([
    fetch('models/parts.json').then((r) => r.json()),
    fetch('models/interlock.json').then((r) => r.json()),
  ]);
  loadIlk(ilk);
  PIV = parts.pivots;
  GOBJ = await fetch('models/grip_objs.json').then((r) => r.json()).catch(() => null);
  buildRig();
  const loader = new STLLoader();
  let done = 0;
  let headTopZ = 63 + (parts.head_raise_mm || 0);
  const N = parts.parts.length + HATS.length;
  await Promise.all([
    ...parts.parts.map(async (p) => {
      const geo = await loader.loadAsync('models/' + p.file);
      geo.computeVertexNormals();
      switch (p.frame) {
        case 'body':
          addMesh(groups.body, geo, p);
          if (p.name === 'mg996') addMesh(groups.mirrorBody, geo, p, '_L');
          break;
        case 'wheel':
          addMesh((p.name === 'wheel_R' ? groups.wheelR : groups.wheelL).inner, geo, p); break;
        case 'headF': addMesh(groups.headF, geo, p); break;
        case 'headM':
          if (parts.head_raise_mm) geo.translate(0, 0, parts.head_raise_mm);   // หัวยก 2.5 (tilt_mount ใหม่)
          if (p.name === 'h_shell') { geo.computeBoundingBox(); headTopZ = geo.boundingBox.max.z; }
          addMesh(groups.headM, geo, p);
          break;
        case 'armU': addMesh(groups.R.armU, geo, p, '_R'); addMesh(groups.L.armU, geo, p, '_L'); break;
        case 'armC': addMesh(groups.R.armC, geo, p, '_R'); addMesh(groups.L.armC, geo, p, '_L'); break;
      }
      done++;
      $('#loading').textContent = `กำลังโหลดชิ้นส่วนหุ่น ${done}/${N}`;
    }),
    ...HATS.map(async (h) => {
      const geo = await loader.loadAsync('models/' + h.file);
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: h.color, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true; m.visible = (hatMode === h.key);
      m.userData.part = 'hat_' + h.key;
      hatMeshes[h.key] = m;
      done++;
      $('#loading').textContent = `กำลังโหลดชิ้นส่วนหุ่น ${done}/${N}`;
    }),
  ]);
  groups.hat = new THREE.Group();
  groups.hat.position.set(0, 0, headTopZ);   // กลางผิวบนเปลือกหัว (h_shell)
  groups.headM.add(groups.hat);
  for (const h of HATS) groups.hat.add(hatMeshes[h.key]);
  addScreen();
  $('#loading').remove();
  window.__twinReady = true;
}

// ---------------------------------------------------------------- สถานะการเดิน
const drive = { x: 0, y: 0, h: 0, v: 0, w: 0, wheelL: 0, wheelR: 0 };
function driveUpdate(dt, cmdV, cmdW) {
  // เร่ง/ชะลอเชิงเส้น ถึงความเร็วเต็มใน RAMP_S วินาที (เฟิร์มแวร์ชะลอหยุด 400 ms)
  const aV = DRIVE_V / RAMP_S, aW = TURN_W / RAMP_S;
  drive.v += clamp(cmdV - drive.v, -aV * dt, aV * dt);
  drive.w += clamp(cmdW - drive.w, -aW * dt, aW * dt);
  drive.h += drive.w * dt;
  drive.x += -Math.sin(drive.h) * drive.v * dt;
  drive.y += Math.cos(drive.h) * drive.v * dt;
  // ความเร็วผิวล้อ: ซ้าย = v − w·T/2, ขวา = v + w·T/2 · เดินหน้า = หมุนรอบ X ทางลบ
  const vl = drive.v - drive.w * TRACK / 2, vr = drive.v + drive.w * TRACK / 2;
  drive.wheelL -= vl / WHEEL_R * dt; drive.wheelR -= vr / WHEEL_R * dt;
}

// ---------------------------------------------------------------- คีย์บอร์ด
const keys = new Set();
const held = { yaw: false };
const AXIS_KEYS = [
  ['KeyQ', AX.ARM_L, +1], ['KeyZ', AX.ARM_L, -1],
  ['KeyE', AX.ARM_R, +1], ['KeyC', AX.ARM_R, -1],
  ['KeyF', AX.HAND_L, +1], ['KeyV', AX.HAND_L, -1],
  ['KeyG', AX.HAND_R, +1], ['KeyB', AX.HAND_R, -1],
  ['ArrowLeft', AX.YAW, +1], ['ArrowRight', AX.YAW, -1],     // + = หันไปทางแขนซ้าย
  ['ArrowUp', AX.TILT, +1], ['ArrowDown', AX.TILT, -1],      // + = เงย
];
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyR', 'KeyX', 'KeyT', 'KeyY', 'KeyU', 'Home', 'KeyH', ...AXIS_KEYS.map((k) => k[0])]);
let lastBlockToast = 0;

function stopAll() {
  for (const a of ax) { a.target = a.pos; a.vel = 0; }
  drive.v = 0; drive.w = 0;
  userTilt = ax[AX.TILT].pos;
  real.queue({ stop: true });
}
function resetPose() {
  for (let i = 0; i < 6; i++) setRaw(i, (i === AX.ARM_L || i === AX.ARM_R) ? REST_LIFT : 0);   // ท่าพัก R: แขนลง (#516)
  userTilt = 0; tiltDuck = false; faceOv = null;
  real.queue({ reset: true });
  toast(`ท่าเริ่มต้น R: แขนลง ${REST_LIFT}° หัวตรง มือกลาง`, 'info');
}
function setEmo(code, fromReal) {
  emo = code; emoSince = performance.now();
  if (!fromReal) { real.queue({ emo: code }); emoPlay(code); }
}

// ---------------------------------------------------------------- ท่าทาง (ตรรกะเดียวกับเฟิร์มแวร์ gestTick/emoPlaySet/onHeadTouch/idleTick)
// ทุกจังหวะสั่งทุกแกนพร้อมกันผ่าน trySet (interlock เดียวกัน) 2 รอบ แล้วรอตามเวลา ms · เวลาเดินตาม simulate()
let simT = 0, play = null, stroke = null, lastAct = 0, idleGap = 20, idleOn = false;
const lastVar = {};
const holdingObj = () => typeof gob !== 'undefined' && gob && gob.mode === 'held';
function playSeq(name, arms, rel) { play = { seq: ARR[name], name, i: 0, next: simT, arms, rel }; lastAct = simT; faceOv = null; }
function playSet(code, arms) {
  const list = SETS[code]; if (!list) return;
  let v = 0;
  if (list.length > 1) { v = Math.floor(Math.random() * (list.length - 1)); if (v >= (lastVar[code] ?? -1)) v++; }
  lastVar[code] = v; playSeq(list[v], arms);
  const info = $('#gest-info'); if (info) info.textContent = `กำลังเล่น ${list[v]} (แบบ ${v + 1}/${list.length})`;
}
function emoPlay(code) { stroke = null; playSet(SETS[code] ? code : 'N', !holdingObj()); }
function setFace(code) { emo = code; emoSince = performance.now(); faceOv = null; }
function revertFaceLater(ms) { const t0 = emoSince; setTimeout(() => { if (emoSince === t0 && !play && !stroke) emo = 'N'; }, ms); }
// evt: 1 แตะ (สุ่ม 1 ใน 5) · 2 แตะสองที · 3 ลูบค้าง (holdMs)
function touchHead(evt, holdMs = 2000) {
  if (holdingObj()) { toast('กำลังหนีบของ — ไม่ทำท่าดีใจ', 'info'); return; }
  setFace('H'); lastAct = simT;
  if (evt === 3) { play = null; stroke = { until: simT + holdMs / 1000, next: simT, sw: false }; return; }
  stroke = null;
  if (evt === 2) playSeq('TOUCH_DBL', true); else playSet('t', true);
  revertFaceLater(3000);
}
// ท่าเหตุการณ์ (ดูตัวอย่าง): หน้า + ท่า
const EVENTS = { lift: ['l', 'H'], cliff: ['c', 'O'], done: ['d', 'H'], bug: ['b', 'C'], noobj: ['n', 'C'] };   // ชุดละ 3 แบบ สุ่ม
function playEvent(key) {
  const [set, face] = EVENTS[key]; stroke = null; setFace(face);
  playSet(set, !holdingObj()); revertFaceLater(3000);
}
function applyKey(k, pass) {
  if (play.arms) {
    if (k.liftL !== null) trySet(AX.ARM_L, k.liftL === 'R' ? REST_LIFT : k.liftL, true);
    if (k.liftR !== null) trySet(AX.ARM_R, k.liftR === 'R' ? REST_LIFT : k.liftR, true);
    [[AX.HAND_L, k.handL], [AX.HAND_R, k.handR]].forEach(([i, v]) => {
      if (v === null) return;
      trySet(i, v === 'R' ? 0 : pctToRel(v), true);
    });
  }
  const r = play.rel;   // ชุดเขิน 's': มุมเทียบทิศหน้าคน (เหมือน emoRel ในเฟิร์มแวร์)
  if (k.tilt !== null) trySet(AX.TILT, r ? r.tilt + k.tilt : k.tilt, true);
  if (k.yaw !== null) trySet(AX.YAW, r ? r.yaw + (r.flip ? -k.yaw : k.yaw) : k.yaw, true);
  userTilt = ax[AX.TILT].target;
}
function playerTick(dt) {
  simT += dt;
  if (keys.size) lastAct = simT;
  if (stroke) {                                   // ลูบ: โยกหัวซ้าย–ขวา ±12° ทุก 0.6 วิ จนปล่อย แล้วกลับท่าพัก
    lastAct = simT;
    if (simT >= stroke.until) { stroke = null; for (const i of [AX.TILT, AX.YAW]) trySet(i, 0, true); for (const i of [AX.ARM_L, AX.ARM_R]) trySet(i, REST_LIFT, true); userTilt = 0; revertFaceLater(1500); return; }
    if (simT >= stroke.next) { stroke.sw = !stroke.sw; stroke.next = simT + 0.6; trySet(AX.TILT, 2, true); trySet(AX.YAW, stroke.sw ? 12 : -12, true); }
    return;
  }
  if (play) {
    if (simT < play.next) return;
    if (play.i >= play.seq.length) { play = null; return; }
    const k = play.seq[play.i++];
    applyKey(k); applyKey(k);                     // 2 รอบเหมือน emoApply()
    if (k.face) faceOv = (play.rel && play.rel.flip && 'LR'.includes(k.face)) ? (k.face === 'L' ? 'R' : 'L') : k.face;   // หน้าในจังหวะ (เหมือน drawFaceCode)
    lastAct = simT;
    if (k.ms === 0) play = null; else play.next = simT + k.ms / 1000;
    return;
  }
  // ไอเดิล: ว่างเกิน 15–30 วิ (หน้าปกติ ไม่เดิน ไม่หนีบ) → สุ่ม 1 ใน 5 ท่า · ไม่หมุนล้อ · จบที่ท่าพัก
  const moving = Math.abs(drive.v) > 1 || Math.abs(drive.w) > 0.01;
  if (moving || holdingObj() || emo !== 'N' || !$('#idle-on')?.checked) { if (moving) lastAct = simT; return; }
  if (simT - lastAct >= idleGap) { playSet('i', true); idleGap = 15 + Math.random() * 15; }
}
// ---------------------------------------------------------------- จำลองหน้าคน (กล้องติดตาม #530) — ตรรกะ/ค่าเดียวกับ camTrackTick ในเฟิร์มแวร์
// คนเดินไปมาหน้าหุ่น (มุมเทียบตัวหุ่น) ทุก 40 วิ หายไป 6 วิ · กล้องอยู่บนหัว → x = มุมคลาดจากทิศหัว ส่ง 10 ครั้ง/วิ
const TRK = { HFOV: 50, VFOV: 50, KP: 0.45, EMA: 0.5, DX: 8, DY: 14, SY: 6, ST: 1.5, YL: 60, TL: 8, HOLD: 0.5, LOST: 3,
  EX: 30, EY: 40, EW: 8, GAP: 0.6, SHY: [2, 3], COOL: [8, 15] };
const fs = { t: 0, next: 0, last: -99, fx: 0, fy: 0, fw: 0, fresh: false, active: false, eye0: 0, eyeOk: 0, need: 2.5, cool: 0, shy: false, n: 0 };
const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
function faceSimTick(dt) {
  const on = $('#face-sim')?.checked;
  if (!on) { if (fs.active) { fs.active = false; } return; }
  fs.t += dt;
  const cyc = fs.t % 40, here = cyc < 34;
  const ang = 35 * Math.sin(fs.t * 0.35) + (cyc > 12 && cyc < 22 ? 0 : 10 * Math.sin(fs.t * 1.1)), up = 5 * Math.sin(fs.t * 0.25);
  if (simT >= fs.next) {                                      // "กล้อง" ส่งบรรทัด F
    fs.next = simT + 0.1;
    const x = -(ang - ax[AX.YAW].pos) / (TRK.HFOV / 2) * 100, y = -(up - ax[AX.TILT].pos) / (TRK.VFOV / 2) * 100;
    if (here && Math.abs(x) <= 100 && Math.abs(y) <= 100) {
      const fresh = simT - fs.last >= TRK.HOLD;
      fs.fx = fresh ? x : fs.fx + TRK.EMA * (x - fs.fx); fs.fy = fresh ? y : fs.fy + TRK.EMA * (y - fs.fy);
      fs.fw = 20; fs.last = simT; fs.fresh = true;
    }
  }
  const seen = simT - fs.last < TRK.HOLD;
  if (fs.shy && !play) { fs.shy = false; faceOv = null; fs.cool = simT + rnd(TRK.COOL); fs.eye0 = 0; }
  if (!seen) fs.eye0 = 0;
  if (seen) {
    lastAct = simT;
    if (play && play.name.startsWith('IDLE')) { play = null; for (const i of [AX.ARM_L, AX.ARM_R]) trySet(i, REST_LIFT, true); for (const i of [AX.HAND_L, AX.HAND_R]) trySet(i, 0, true); faceOv = null; }
    fs.active = true;
  } else if (fs.active && !play && !stroke && simT - fs.last > TRK.LOST) {
    fs.active = false; trySet(AX.TILT, 0, true); trySet(AX.YAW, 0, true); userTilt = 0; lastAct = simT; return;
  }
  if (play || stroke || !fs.fresh) return;
  fs.fresh = false;
  if (Math.abs(fs.fx) > TRK.DX) trySet(AX.YAW, clamp(ax[AX.YAW].pos + clamp(TRK.KP * -fs.fx / 100 * TRK.HFOV / 2, -TRK.SY, TRK.SY), -TRK.YL, TRK.YL), true);
  if (Math.abs(fs.fy) > TRK.DY && !tiltDuck) { trySet(AX.TILT, clamp(ax[AX.TILT].pos + clamp(TRK.KP * -fs.fy / 100 * TRK.VFOV / 2, -TRK.ST, TRK.ST), -TRK.TL, TRK.TL), true); userTilt = ax[AX.TILT].target; }
  const eye = Math.abs(fs.fx) <= TRK.EX && Math.abs(fs.fy) <= TRK.EY && fs.fw >= TRK.EW;
  if (eye) { if (!fs.eye0) { fs.eye0 = simT; fs.need = rnd(TRK.SHY); } fs.eyeOk = simT; }
  else if (fs.eye0 && simT - fs.eyeOk > TRK.GAP) fs.eye0 = 0;
  if (fs.eye0 && simT - fs.eye0 >= fs.need && simT >= fs.cool && (emo === 'N' || emo === 'H')) {
    const yaw = ax[AX.YAW].pos, list = SETS.s, v = Math.floor(Math.random() * list.length);
    playSeq(list[v], !holdingObj(), { yaw, tilt: ax[AX.TILT].pos, flip: yaw > 10 ? true : yaw < -10 ? false : Math.random() < 0.5 });
    fs.shy = true; fs.n++; fs.eye0 = 0;
  }
}
function faceSimInfo() {
  const el = $('#face-info'); if (!el) return;
  el.textContent = $('#face-sim')?.checked
    ? `หน้า x=${Math.round(fs.fx)} · ${simT - fs.last < TRK.HOLD ? 'เห็น' : 'ไม่เห็น'} · ${fs.shy ? 'กำลังเขิน ' + (play ? play.name : '') : fs.eye0 ? 'สบตา ' + (simT - fs.eye0).toFixed(1) + ' วิ' : simT < fs.cool ? 'พักเขิน' : ''} · เขินแล้ว ${fs.n} ครั้ง` : '';
}
document.querySelectorAll('[data-touch]').forEach((b) => b.addEventListener('click', () => touchHead(+b.dataset.touch)));
document.querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', () => playEvent(b.dataset.ev)));
$('#idle-now')?.addEventListener('click', () => { if (emo === 'N' && !holdingObj()) playSet('i', true); });

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
  const code = e.code;
  if (/^Digit[1-9]$/.test(code) || /^Numpad[1-9]$/.test(code)) {
    const n = +code.slice(-1); setEmo(EMOS[n - 1].code); flashKey('Digit' + n); e.preventDefault(); return;
  }
  if (!GAME_KEYS.has(code)) return;
  e.preventDefault();
  if (e.repeat) return;
  keys.add(code); markKey(code, true);
  switch (code) {
    case 'Space': stopAll(); break;
    case 'KeyR': resetPose(); break;
    case 'Home': drive.x = drive.y = drive.h = 0; drive.v = drive.w = 0; break;
    case 'KeyX': cycleShell(); break;
    case 'KeyT': setView('front'); break;
    case 'KeyY': setView('side'); break;
    case 'KeyU': setView('top'); break;
    case 'KeyH': document.body.classList.toggle('min'); break;
  }
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code); markKey(e.code, false);
  // ปล่อยปุ่มแกน → หยุดที่ระยะเบรกจากความเร็วตอนนี้ (นุ่ม ไม่ไหลเกิน)
  const k = AXIS_KEYS.find((x) => x[0] === e.code);
  if (k && !realFollowing() && !AXIS_KEYS.some((x) => x[1] === k[1] && keys.has(x[0]))) {
    const a = ax[k[1]], def = AXDEF[k[1]];
    const stopAt = a.pos + a.vel * Math.abs(a.vel) / (2 * def.acc);
    if ((stopAt - a.target) * k[2] < 0) trySet(k[1], stopAt, true);
    if (k[1] === AX.TILT) userTilt = ax[AX.TILT].target;
    real.queue({ axis: k[1] });
  }
});
window.addEventListener('blur', () => { for (const k of keys) markKey(k, false); keys.clear(); });

function handleHeldKeys(dt) {
  held.yaw = false;
  for (const [code, i, dir] of AXIS_KEYS) {
    if (!keys.has(code)) continue;
    if (realFollowing()) continue;            // โหมดตามหุ่นจริง: โมเดลขยับตาม /state เท่านั้น (คีย์ยังส่งไปหุ่น)
    const a = ax[i], def = AXDEF[i];
    if (i === AX.YAW) held.yaw = true;
    // เป้าวิ่งนำตำแหน่งจริงได้ไม่เกินระยะเบรก (ปล่อยปุ่มแล้วหยุดใกล้ที่ตาเห็น แต่ยังวิ่งได้เต็ม vmax)
    const lead = clamp(a.pos + dir * (def.vmax * def.vmax / (2 * def.acc) + 2), def.min, def.max);
    let nt = a.target + dir * def.vmax * dt;
    nt = dir > 0 ? Math.min(nt, lead) : Math.max(nt, lead);
    nt = clamp(nt, def.min, def.max);
    if (Math.abs(nt - a.target) < 1e-6) continue;
    const now = performance.now();
    const ok = trySet(i, nt, now - lastBlockToast < 1200);
    if (!ok && now - lastBlockToast >= 1200) lastBlockToast = now;
    if (i === AX.TILT && ok) userTilt = ax[AX.TILT].target;
  }
  for (const [code, i, dir] of AXIS_KEYS) if (keys.has(code)) real.queue({ axis: i });
  let v = 0, w = 0;
  if (keys.has('KeyW')) v += DRIVE_V;
  if (keys.has('KeyS')) v -= DRIVE_V;
  if (keys.has('KeyA')) w += TURN_W;
  if (keys.has('KeyD')) w -= TURN_W;
  if (v && w) w *= 0.5;                                 // เดินพร้อมเลี้ยว = โค้งกว้าง
  if (!realFollowing()) driveCmd = { v, w };
  if (v || w) real.queue({ drive: v > 0 ? 'fw' : v < 0 ? 'bw' : w > 0 ? 'tl' : 'tr' });
}
let driveCmd = { v: 0, w: 0 };

// ---------------------------------------------------------------- หุ่นจริง
const real = {
  inflight: false, lastSend: 0, sent: {}, wantDrive: null, wantEmo: null, wantStop: false, wantReset: false, dirty: new Set(),
  ok: 0, busy: 0, fail: 0, lastMsg: '', state: null, stateOk: false, polling: false,
  queue(o) {
    if (!$('#real-on').checked) return;
    if (o.stop) this.wantStop = true;
    if (o.reset) this.wantReset = true;
    if (o.emo) this.wantEmo = o.emo;
    if (o.drive) this.wantDrive = o.drive;
    if (o.axis !== undefined) this.dirty.add(o.axis);
  },
  host() { return $('#real-host').value.trim().replace(/\/+$/, ''); },
  async get(path, ms = 1500) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(this.host() + path, { signal: ctl.signal, cache: 'no-store' }); }
    finally { clearTimeout(t); }
  },
  // ยิงไม่ถี่เกิน 1 ครั้ง / 250 ms และไม่ซ้อนกัน · 409 BUSY = ข้ามรอบนี้
  async tick() {
    if (!$('#real-on').checked) return;
    const now = performance.now();
    if (this.wantStop) {               // x รับได้แม้คิวกำลังรัน → ยิงทันที
      this.wantStop = false; this.wantDrive = null; this.dirty.clear();
      this.send('x;'); return;
    }
    if (this.inflight || now - this.lastSend < 250) return;
    const cmds = [], axes = [];
    const hadReset = this.wantReset;
    if (this.wantReset) { this.wantReset = false; cmds.push('yaw:0', 'tilt:0', 'lift:0', 'hand:' + relToPct(0)); this.dirty.clear(); }
    if (this.wantEmo) { cmds.push('emo:' + this.wantEmo); this.wantEmo = null; }
    const names = { [AX.YAW]: 'yaw', [AX.TILT]: 'tilt', [AX.ARM_L]: 'lift1', [AX.ARM_R]: 'lift2', [AX.HAND_L]: 'hand1', [AX.HAND_R]: 'hand2' };
    for (const i of this.dirty) {
      let v = ax[i].target;
      v = (i === AX.HAND_L || i === AX.HAND_R) ? relToPct(v) : Math.round(v);
      if (this.sent[i] !== v) { cmds.push(names[i] + ':' + v); this.sent[i] = v; axes.push(i); }
    }
    this.dirty.clear();
    if (this.wantDrive) { cmds.push(this.wantDrive + ':400'); this.wantDrive = null; }
    if (!cmds.length) return;
    this.send(cmds.join(';') + ';', { axes, reset: hadReset });
  },
  // 409 BUSY = ข้ามรอบนี้ แต่จำแกนไว้ส่งเป้าล่าสุดรอบถัดไป (ปล่อยปุ่มแล้วหุ่นยังไปถึงท่าสุดท้าย) · ล้อ/อารมณ์ไม่ส่งซ้ำ
  async send(cmd, retry) {
    this.inflight = true; this.lastSend = performance.now();
    try {
      const r = await this.get('/run?cmd=' + encodeURIComponent(cmd));
      if (r.status === 409) {
        this.busy++; this.lastMsg = `409 ${await r.text()} → ข้าม: ${cmd}`;
        if (retry) { for (const i of retry.axes) { delete this.sent[i]; this.dirty.add(i); } if (retry.reset) this.wantReset = true; }
      }
      else if (r.ok) { this.ok++; this.lastMsg = 'ส่งแล้ว: ' + cmd; this.status('ok', 'ต่อหุ่นได้'); }
      else { this.fail++; this.lastMsg = `HTTP ${r.status}: ${cmd}`; }
    } catch (err) {
      this.fail++; this.sent = {};
      this.lastMsg = 'ส่งไม่ถึงหุ่น: ' + cmd; this.status('bad', 'ติดต่อหุ่นไม่ได้ (ต้องอยู่วงเน็ตเดียวกัน)');
    } finally { this.inflight = false; }
    $('#real-last').textContent = `${this.lastMsg} · สำเร็จ ${this.ok} · BUSY ${this.busy} · พลาด ${this.fail}`;
  },
  async poll() {
    if (!$('#real-follow').checked || this.polling) return;
    this.polling = true;
    try {
      const r = await this.get('/state', 1200);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const s = await r.json();
      this.state = s; this.stateOk = true; this.status('ok', 'อ่าน /state ได้ · โมเดลขยับตามหุ่นจริง');
      applyRealState(s);
    } catch (err) {
      this.stateOk = false; this.status('bad', 'อ่าน /state ไม่ได้ — ใช้โมเดลคุมเอง');
    } finally { this.polling = false; }
  },
  status(kind, text) {
    $('#real-status .dot').className = 'dot ' + kind; $('#real-text').textContent = text;
  },
};
function realFollowing() { return $('#real-follow').checked && real.stateOk; }
function applyRealState(s) {
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const map = [[AX.YAW, num(s.yaw)], [AX.TILT, num(s.tiltRel)], [AX.ARM_L, num(s.lift1)], [AX.ARM_R, num(s.lift2)],
               [AX.HAND_L, num(s.grip1) === null ? null : pctToRel(s.grip1)], [AX.HAND_R, num(s.grip2) === null ? null : pctToRel(s.grip2)]];
  for (const [i, v] of map) if (v !== null) setRaw(i, v);       // ค่าจาก /state ผ่าน interlock ของหุ่นมาแล้ว
  if (typeof s.emo === 'string' && EMOS.some((e) => e.code === s.emo) && s.emo !== emo) setEmo(s.emo, true);
  if (typeof s.idleOn === 'number') $('#idle-on').checked = s.idleOn !== 0;
  const md = s.motDir;
  driveCmd = md === 'F' ? { v: DRIVE_V, w: 0 } : md === 'B' ? { v: -DRIVE_V, w: 0 } : md === 'L' ? { v: 0, w: TURN_W } : md === 'R' ? { v: 0, w: -TURN_W } : { v: 0, w: 0 };
}
setInterval(() => real.tick(), 50);
setInterval(() => real.poll(), 300);

// ---------------------------------------------------------------- UI
function markKey(code, on) { document.querySelectorAll(`kbd[data-k="${code}"]`).forEach((k) => k.classList.toggle('on', on)); }
function flashKey(code) { markKey(code, true); setTimeout(() => markKey(code, false), 180); }
let toastTimer = 0;
function toast(msg, kind) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = kind || ''; }, 2200);
}

const emoTable = $('#emo-table');
for (let r = 0; r < 3; r++) {
  const tr = document.createElement('tr');
  for (let c = 0; c < 3; c++) {
    const e = EMOS[r * 3 + c];
    tr.innerHTML += `<td class="k"><kbd data-k="Digit${e.key}">${e.key}</kbd></td><td>${e.th}</td>`;
  }
  emoTable.appendChild(tr);
}
const jointsEl = $('#joints');
const jointRows = AXDEF.map((d, i) => {
  const row = document.createElement('div'); row.className = 'j';
  row.innerHTML = `<span>${d.name}</span><div class="bar"><b></b><i></i></div><span class="v"></span>`;
  jointsEl.appendChild(row);
  const zero = (0 - d.min) / (d.max - d.min) * 100;
  row.querySelector('b').style.left = zero + '%';
  return row;
});
const legend = $('#legend');
for (const k of ['body', 'head', 'arm', 'device']) {
  legend.innerHTML += `<span><span class="dot" style="background:#${COLORS[k].toString(16).padStart(6, '0')}"></span>${COLOR_TH[k]}</span>`;
}
function updateUI() {
  AXDEF.forEach((d, i) => {
    const row = jointRows[i], a = ax[i];
    row.querySelector('i').style.left = `calc(${(a.pos - d.min) / (d.max - d.min) * 100}% - 1px)`;
    row.querySelector('.bar').classList.toggle('blocked', a.blocked);
    row.querySelector('.v').textContent = (i === AX.HAND_L || i === AX.HAND_R) ? `${relToPct(a.pos)}%` : `${a.pos.toFixed(0)}°`;
  });
  $('#drive-info').textContent = `ความเร็ว ${(drive.v / 1000).toFixed(2)} ม./วิ · หันตัว ${((drive.h / D2R) % 360).toFixed(0)}° · ห่างจุดเริ่ม ${(Math.hypot(drive.x, drive.y) / 10).toFixed(0)} ซม.`;
  $('#ilk-info').textContent = `ตัดท่าแล้ว ${ilkCount} ครั้ง` + (ax.some((a) => a.blocked) ? ' · ตอนนี้มีแกนถูกกั้น' : '');
}

let shellMode = 'solid';
function applyShell() {
  for (const m of shellMeshes) {
    m.visible = shellMode !== 'hide';
    m.material.transparent = shellMode === 'ghost';
    m.material.opacity = shellMode === 'ghost' ? 0.18 : 1;
    m.material.depthWrite = shellMode !== 'ghost';
    m.castShadow = shellMode === 'solid';
  }
  document.querySelectorAll('[data-shell]').forEach((b) => b.classList.toggle('sel', b.dataset.shell === shellMode));
}
function cycleShell() { shellMode = { solid: 'ghost', ghost: 'hide', hide: 'solid' }[shellMode]; applyShell(); }
document.querySelectorAll('[data-shell]').forEach((b) => b.addEventListener('click', () => { shellMode = b.dataset.shell; applyShell(); }));
function setHat(key) {
  hatMode = hatMeshes[key] ? key : 'none';
  for (const [k, m] of Object.entries(hatMeshes)) m.visible = (k === hatMode);
  document.querySelectorAll('[data-hat]').forEach((b) => b.classList.toggle('sel', b.dataset.hat === hatMode));
}
document.querySelectorAll('[data-hat]').forEach((b) => b.addEventListener('click', () => setHat(b.dataset.hat)));
$('#show-dev').addEventListener('change', (e) => {
  for (const m of meshesByCat.device) if (m !== groups.screen) m.visible = e.target.checked;
});
$('#ilk-on').addEventListener('change', (e) => { ilkEnabled = e.target.checked; toast(ilkEnabled ? 'เปิดระบบกันชน' : 'ปิดระบบกันชน (เฉพาะในจอ — หุ่นจริงยังกันชนเอง)', 'info'); });
$('#idle-on').addEventListener('change', (e) => {
  const on = e.target.checked;
  if (!on && play && (play.name === 'i' || play.name === 'j')) { play = null; for (const i of [AX.YAW, AX.TILT, AX.ARM_L, AX.ARM_R]) trySet(i, 0, true); }
  if ($('#real-on').checked) real.send(on ? '!idle 1' : '!idle 0');
  toast(on ? 'เปิดท่าไอเดิลอัตโนมัติ' : 'ปิดท่าไอเดิลอัตโนมัติ', 'info');
});
$('#real-on').addEventListener('change', (e) => {
  real.status(e.target.checked ? 'wait' : '', e.target.checked ? 'เปิดอยู่ · รอส่งคำสั่งแรก' : 'ปิดอยู่');
  real.sent = {};
});
$('#real-follow').addEventListener('change', (e) => { if (!e.target.checked) { real.stateOk = false; driveCmd = { v: 0, w: 0 }; } });
$('#hide-ui').addEventListener('click', () => document.body.classList.toggle('min'));
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
renderer.domElement.addEventListener('pointerdown', () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });

// ---------------------------------------------------------------- กล้อง
const tmpV = new THREE.Vector3();
function robotCenter(out) {   // กลางตัวหุ่น (โลก)
  return model.localToWorld(out.set(0, -60, 90));
}
function setView(kind) {
  robotCenter(tmpV);
  const h = drive.h, f = new THREE.Vector3(-Math.sin(h), Math.cos(h), 0), r = new THREE.Vector3(Math.cos(h), Math.sin(h), 0);
  let off;
  if (kind === 'front') off = f.clone().multiplyScalar(780).add(new THREE.Vector3(0, 0, 40));
  else if (kind === 'side') off = r.clone().multiplyScalar(780).add(new THREE.Vector3(0, 0, 40));
  else if (kind === 'top') off = f.clone().multiplyScalar(-1).add(new THREE.Vector3(0, 0, 720));
  else off = f.clone().multiplyScalar(430).add(r.clone().multiplyScalar(380)).add(new THREE.Vector3(0, 0, 320));
  controls.target.copy(tmpV);
  camera.position.copy(tmpV).add(off);
  controls.update();
}
const lastCenter = new THREE.Vector3();

// ---------------------------------------------------------------- ลูป
function applyPose() {
  robotRoot.position.set(drive.x, drive.y, 0);
  robotRoot.rotation.z = drive.h;
  groups.yaw.rotation.z = ax[AX.YAW].pos * D2R;
  groups.nod.rotation.x = ax[AX.TILT].pos * D2R;
  groups.R.lift.rotation.x = ax[AX.ARM_R].pos * D2R;
  groups.R.clamp.rotation.z = ax[AX.HAND_R].pos * D2R;
  groups.L.lift.rotation.x = ax[AX.ARM_L].pos * D2R;
  groups.L.clamp.rotation.z = ax[AX.HAND_L].pos * D2R;
  groups.wheelR.g.rotation.x = drive.wheelR;
  groups.wheelL.g.rotation.x = drive.wheelL;
}

// ---------------------------------------------------------------- วัตถุทดลองหนีบ (#461)
// วางกลางระหว่างแขน (x 0) ที่ระยะ y0 ที่เข้ารูปเว้าแขนดีสุด · มุมหนีบที่แตะ = ตารางจากผลจำลอง (ยาง 1.5 มม.) ต่อมุมยก
// มือหนีบเลยจุดแตะไม่ได้ · มือสองข้างแตะครบ = หนีบอยู่ ของยกและเดินตามแขน · มือกางออก = ปล่อย ของตกลงพื้นตั้งตรง
// ไม่ได้จำลองการลื่น (ขวด 600 มล. เต็มลื่นหลุดตามผลจำลองแรง)
let GOBJ = null;
const gob = { def: null, grp: null, mode: 'none', world: new THREE.Matrix4(), cap: [0, 0], liftAt: 0 };
const OBJ_NOTE = {
  glass: 'ยาง 1.5 มม. หนีบอยู่ · ถ้ามีน้ำ ยกเกิน ~8° แก้วเอียงน้ำหก',
  b350: 'ขวดเต็มหนีบอยู่แบบเฉียด ๆ (ไม่ติดยางหลุด)',
  b600: 'ขวดเต็ม: ผลจำลองแรงบอกว่าลื่นหลุด และหุ่นคะมำตอนเบรก · ขวดเปล่าได้',
  can: 'กระป๋องเปล่า/เต็ม ทรงตรง เข้ารูปเว้าแขนดี',
};
function objContact(lift) {
  const t = gob.def.contact, i = clamp(Math.round(lift) - GOBJ.lift0, 0, t.length - 1);
  return t[i];
}
function objBuild(def) {
  const g = new THREE.Group();
  const shell = def.key === 'can'
    ? new THREE.MeshStandardMaterial({ color: 0xc9302c, roughness: 0.35, metalness: 0.6 })
    : new THREE.MeshStandardMaterial({ color: 0x6fb8e6, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false });
  const cyl = (r, h, z0, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), mat);
    m.rotation.x = Math.PI / 2; m.position.z = z0 + h / 2; m.castShadow = true; g.add(m); return m;
  };
  cyl(def.r, def.h, 0, shell);
  if (def.key !== 'can') cyl(def.r - 1.5, def.h * 0.75, 1.5, new THREE.MeshStandardMaterial({ color: 0x2f8fd8, transparent: true, opacity: 0.55, roughness: 0.2 }));
  g.matrixAutoUpdate = false;
  return g;
}
function objPlace() {   // วางหน้าหุ่น + จัดแขนท่าหนีบ (มือกาง)
  if (!gob.def) return;
  robotRoot.updateMatrixWorld(true);
  gob.world.copy(model.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0, gob.def.y0, 0));
  gob.mode = 'floor'; gob.armed = false;          // ยังไม่นับว่าหนีบ จนกว่ามือสองข้างกางพ้นของก่อน
  for (const i of [AX.ARM_L, AX.ARM_R]) trySet(i, gob.def.grip_lift, true);
  for (const i of [AX.HAND_L, AX.HAND_R]) setRaw(i, GRIP_OPEN);   // ถ้าแขนยังสูง มือรอกางจนแขนลดลงพ้นหัว (axesUpdate กั้นเอง)
}
function objSelect(key) {
  if (gob.grp) { scene.remove(gob.grp); gob.grp = null; }
  gob.def = GOBJ && GOBJ.objs.find((o) => o.key === key) || null;
  gob.mode = 'none';
  document.querySelectorAll('[data-obj]').forEach((b) => b.classList.toggle('sel', b.dataset.obj === (gob.def ? key : 'none')));
  if (!gob.def) return;
  gob.grp = objBuild(gob.def); scene.add(gob.grp);
  objPlace();
}
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
function liftMatrix(deg) {   // หมุนรอบเส้นแกนยก ARM_AX (พิกัดโมเดล)
  const A = PIV.ARM_AX;
  return new THREE.Matrix4().makeTranslation(A[0], A[1], A[2])
    .multiply(new THREE.Matrix4().makeRotationX(deg * D2R)).multiply(new THREE.Matrix4().makeTranslation(-A[0], -A[1], -A[2]));
}
function objDrop(msg) {
  gob.world.decompose(_p, _q, _s);
  gob.world.makeRotationZ(drive.h).setPosition(_p.x, _p.y, 0);
  gob.mode = 'floor'; gob.armed = false;
  if (msg) toast(msg, 'info');
}
function capHand(i, c) {
  const a = ax[i];
  if (a.pos > c) { a.pos = c; a.vel = 0; }
  if (a.target > c) a.target = c;
}
function objUpdate() {
  if (!gob.def || gob.mode === 'none') return;
  model.updateMatrixWorld(true);
  const liftL = ax[AX.ARM_L].pos, liftR = ax[AX.ARM_R].pos;
  if (gob.mode === 'floor') {
    // ของอยู่ตรงตำแหน่งวางหน้าหุ่นไหม (หุ่นไม่ได้เดิน/เลี้ยวหนี)
    _m.copy(model.matrixWorld).invert().multiply(gob.world);
    const e = _m.elements;
    const atSpot = Math.abs(e[12]) < 3 && Math.abs(e[13] - gob.def.y0) < 3 && Math.abs(e[14]) < 1 && e[0] > 0.999;
    if (atSpot) {
      const cL0 = objContact(liftL), cR0 = objContact(liftR);
      if (!gob.armed && cL0 !== null && cR0 !== null && ax[AX.HAND_L].pos < cL0 - 3 && ax[AX.HAND_R].pos < cR0 - 3) gob.armed = true;
    }
    if (atSpot && gob.armed) {
      const cL = objContact(liftL), cR = objContact(liftR);
      if (cL !== null && cL > -99) capHand(AX.HAND_L, cL);
      if (cR !== null && cR > -99) capHand(AX.HAND_R, cR);
      const touchL = cL !== null && cL > -99 && ax[AX.HAND_L].pos >= cL - 0.2;
      const touchR = cR !== null && cR > -99 && ax[AX.HAND_R].pos >= cR - 0.2;
      if (touchL && touchR && Math.abs(liftL - liftR) < 2) {
        gob.mode = 'held'; gob.cap = [cL, cR]; gob.liftAt = (liftL + liftR) / 2;
        toast(`หนีบ${gob.def.th.split(' ')[0]}แล้ว · มือแตะที่ ${relToPct(cL)}% · ยกแขนสองข้าง (Q+E) หรือเดินได้`, 'info');
      }
    }
  } else if (gob.mode === 'held') {
    capHand(AX.HAND_L, gob.cap[0]); capHand(AX.HAND_R, gob.cap[1]);
    if (ax[AX.HAND_L].pos < gob.cap[0] - 1.5 || ax[AX.HAND_R].pos < gob.cap[1] - 1.5) objDrop('ปล่อยของแล้ว');
    else if (Math.abs(liftL - liftR) > 4) objDrop('แขนสองข้างยกไม่เท่ากัน ของหลุด');
    else gob.world.copy(model.matrixWorld).multiply(liftMatrix((liftL + liftR) / 2 - gob.liftAt))
      .multiply(new THREE.Matrix4().makeTranslation(0, gob.def.y0, 0));
  }
  gob.grp.matrix.copy(gob.world); gob.grp.matrixWorldNeedsUpdate = true;
  const st = gob.mode === 'held' ? `หนีบอยู่ · ยกขึ้นจากตอนหนีบ ${(((liftL + liftR) / 2) - gob.liftAt).toFixed(0)}°` : 'วางบนพื้น';
  $('#obj-info').textContent = `${gob.def.th} · ${st} · ${OBJ_NOTE[gob.def.key] || ''}`;
}
document.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => objSelect(b.dataset.obj)));
$('#obj-place').addEventListener('click', objPlace);
$('#obj-grip').addEventListener('click', () => { trySet(AX.HAND_L, GRIP_CLOSE, true); trySet(AX.HAND_R, GRIP_CLOSE, true); });
$('#obj-lift').addEventListener('click', () => { for (const i of [AX.ARM_L, AX.ARM_R]) trySet(i, -17, false); });   // #524 หนีบ −43 ยก −17: ก้นของ Z ≈ 40 พ้น VL + เผื่อไหล 10 · เอียง ~25° (เท่า GRIP_UP_LIFT เฟิร์มแวร์)
$('#obj-open').addEventListener('click', () => { trySet(AX.HAND_L, GRIP_OPEN, true); trySet(AX.HAND_R, GRIP_OPEN, true); });

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // เครื่องช้า/เฟรมตก: แบ่งเวลาจริงเป็นก้าวย่อย ≤ 1/60 วิ ความเร็วหุ่นในจอจึงเท่าเดิม (เพดาน 0.25 วิ กันกระโดดตอนสลับแท็บ)
  let el = Math.min(0.25, (now - last) / 1000); last = now;
  const n = Math.max(1, Math.ceil(el / (1 / 60)));
  for (let k = 0; k < n; k++) simulate(el / n);
  present(now);
}
function present(now) {
  if (window.__twinReady) { drawFace(now / 1000); updateUI(); faceSimInfo(); }
  controls.update();
  renderer.render(scene, camera);
}
function simulate(dt) {
  if (window.__twinReady) {
    handleHeldKeys(dt);
    faceSimTick(dt);
    playerTick(dt);
    axesUpdate(dt);
    driveUpdate(dt, driveCmd.v, driveCmd.w);
    applyPose();
    objUpdate();
    // กล้องตามหุ่น: เลื่อนกล้องตามระยะที่ตัวหุ่นเคลื่อน
    robotCenter(tmpV);
    if ($('#follow').checked && lastCenter.lengthSq() > 0) {
      const d = tmpV.clone().sub(lastCenter);
      camera.position.add(d); controls.target.add(d);
    }
    lastCenter.copy(tmpV);
    sun.position.set(drive.x + 300, drive.y + 400, 800); sun.target.position.set(drive.x, drive.y, 0);
  }
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ไว้ทดสอบจากคอนโซล
window.twin = { ax, drive, poseOK, ilkHitArmR, trySet, setEmo, setView, keys, real, touchHead, playEvent, playSet, playSeq, get emo() { return emo; }, get playing() { return !!(play || stroke); }, get playName() { return play && play.name; }, faceSim: fs,
  setShell(m) { shellMode = m; applyShell(); },
  setHat, get hat() { return hatMode; }, hatMeshes,
  // เดินเวลาจำลองเอง (ใช้ทดสอบตอนแท็บอยู่เบื้องหลังและ requestAnimationFrame ไม่วิ่ง)
  step(sec, dt = 1 / 60) { for (let s = 0; s < sec; s += dt) simulate(dt); present(performance.now()); } };

loadAll().then(() => { setView('iso'); requestAnimationFrame(frame); }).catch((err) => {
  console.error(err);
  $('#loading').textContent = 'โหลดโมเดลไม่สำเร็จ: ' + err.message + ' (ต้องเปิดผ่านเซิร์ฟเวอร์ เช่น python devserver.py)';
});
