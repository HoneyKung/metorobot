# claude-RoboWeb.md — ผู้ควบคุมและดูแลฝั่งเว็บทั้งหมดของโปรเจค METO

> **บทบาทของเอกสารนี้:** เป็น "สมองฝ่ายเว็บ" ของโปรเจค RoboBlock/METO — Claude หรือผู้พัฒนาคนใดก็ตามที่จะแก้ไข ปรับปรุง หรือเขียนโค้ดฝั่งเว็บ **ต้องอ่านและปฏิบัติตามเอกสารนี้ก่อนเสมอ** ทุกการตัดสินใจด้านโค้ด ดีไซน์ และ UX/UI ต้องสอดคล้องกับเนื้อหาในนี้และรายงานวิจัย

---

## 1. ภาพรวมโปรเจค (ต้องเข้าใจก่อนแตะโค้ด)

**ชื่อโปรเจค:** METO — แพลตฟอร์มหุ่นยนต์นวัตกรรมเพื่อการศึกษาสำหรับการเขียนโค้ดแบบบล็อก
(Innovative Educational Robotics Platform for Block-based Coding)

**บริบท:** วิทยานิพนธ์ปริญญาโท สาขาเทคโนโลยีมีเดียดิจิทัล คณะสถาปัตยกรรมศาสตร์และการออกแบบ มจธ. (KMUTT) ปีการศึกษา 2568

**กลุ่มเป้าหมายผู้ใช้:** นักเรียนมัธยมศึกษา (อายุ 13–22 ปี) ที่**เริ่มต้น**เรียนเขียนโปรแกรม — ไม่จำกัดประสบการณ์ ตั้งแต่ไม่เคยเขียนโค้ดเลย

**จุดเด่น 3 ประการของ METO (ทุกฟีเจอร์เว็บต้องรับใช้ 3 ข้อนี้):**
1. **ปฏิสัมพันธ์เชิงอารมณ์** — หุ่นยนต์แสดงอารมณ์ 9+ แบบบนจอ TFT, ตรวจจับใบหน้าเรียลไทม์ → เว็บต้องสะท้อนความ "มีชีวิต" นี้ (จอที่ 2 = digital twin ของจอ TFT พร้อม idle/กระพริบตาเหมือนหุ่นจริง, FAB แชทเป็นดวงตาหุ่นยนต์)
2. **AI ผู้ช่วยสอนแบบ Scaffolding** — "พี่โรโบ" วิเคราะห์บล็อกโค้ด ให้คำใบ้แบบ Socratic Method **ไม่เฉลยคำตอบ** ตอบสั้น 2–3 ประโยค ภาษาไทยเป็นกันเอง มีอิโมจิ
3. **Block-based Coding ผ่านเว็บ** — Google Blockly, ไม่ต้องติดตั้งอะไร, ส่งคำสั่งไปหุ่นจริง (ESP32) ผ่าน HTTP GET `/run?cmd=...` บน Wi-Fi (mDNS: `http://MDTrobot.local`)

**ขอบเขตที่ห้ามหลุด (จากรายงาน บทที่ 1.3):**
- เว็บเบราว์เซอร์เท่านั้น — **ไม่ทำ mobile app**
- Block-based เท่านั้น — **ไม่มี text-based coding**
- ใช้ LLM ผ่าน API (Gemini) ผ่าน Cloud Server เป็นตัวกลาง (ซ่อน API Key + Rate Limiting) — **ห้ามเรียก LLM API ตรงจาก frontend เด็ดขาด**

**เอกสารอ้างอิงหลัก (อ่านเมื่อสงสัยเรื่อง requirement):**
- `editthesis/วิจัยฉบับเต็ม1-3อัปเดตล่าสุด.txt` — รายงานฉบับเต็มบท 1–3 (แหล่งความจริงสูงสุด)
- `editthesis/ร่างบทที่5_ข้อเสนอแนะ_FutureWork.md` — ทิศทางอนาคต
- `Project/NSC2026_ข้อเสนอโครงการ_Draft.md` — ข้อเสนอโครงการ
- หัวข้อสำคัญในรายงาน: **3.3.4** (สเปคเว็บแอป Block Coding), **3.3.5** (ระบบ AI ผู้ช่วยสอน), **2.2.8–2.2.10** (Blockly, Scaffolding, LLM Architecture)

---

## 2. สถาปัตยกรรมฝั่งเว็บ

```
Browser (SPA hash-router)
 ├── index.html          ← หน้าเดียว: workspace + dashboard + auth modal + toolbox XML
 ├── style.css           ← สไตล์ทั้งหมด (Scratch 3.0-style toolbox, chat, modal, dashboard)
 ├── router.js           ← Hash router (#/workspace, #/dashboard) — โหลดก่อนไฟล์อื่น
 ├── auth.js             ← Auth object: login/register/logout modal, session
 ├── dashboard.js        ← Dashboard นักเรียน/ครู: stats, projects, achievements, chart
 ├── tutorial.js         ← Tutorial object: onboarding วิธีใช้งาน
 ├── robot-sim.js        ← Digital Twin 2 จอ: เวที top view + จอหน้าหุ่น (twin ของ TFT)
 │                          + TwinLink (อ่าน /state จากหุ่นจริง) + RobotLog + chat FAB icon
 └── script.js           ← หัวใจหลัก: Blockly blocks/theme, runCode, validation,
                            AI debounce analysis, chat UI, activity logging

Flask Backend (server.py — deploy บน Render, ดู render.yaml/Procfile)
 ├── server.py            ← /analyze (AI พี่โรโบ ผ่าน Gemini), /health, serve static
 ├── auth.py              ← Blueprint /api/auth/* (register, login, logout, me, profile)
 ├── dashboard.py         ← Blueprint /api/* (dashboard/student, dashboard/teacher,
 │                           projects CRUD, achievements, grades, objectives, classrooms)
 └── models.py            ← SQLAlchemy models (users, projects, activity, achievements…)

Hardware (นอกขอบเขตไฟล์นี้ แต่เว็บต้องคุยด้วย)
 └── ESP32 @ http://MDTrobot.local
      ├── GET /run?cmd=w;a;w;a;   → สั่งงาน (ทางเดียว)
      └── GET /state              → อ่านสถานะเรียลไทม์ (JSON) ← จอที่ 2 ใช้ทำ Digital Twin
```

**ลำดับโหลดสคริปต์ใน index.html (ห้ามสลับ):** `demo.js → router.js → auth.js → dashboard.js → tutorial.js → robot-sim.js → script.js`

**โหมด Demo (`demo.js`):** เปิดอัตโนมัติเมื่อรันแบบ `file://` หรือใส่ `?demo=1` — ดัก `window.fetch` ตอบ `/api/*` `/analyze` ด้วยข้อมูลจำลอง + auto-login ให้ frontend ทำงานครบทุกหน้าโดยไม่ต้องมี backend (ใช้ส่งอาจารย์ที่ขอ frontend อย่างเดียว) **ไม่มีป้าย/แบนเนอร์ใดๆ — หน้าตาเหมือนเว็บจริงเป๊ะ** (บอกสถานะผ่าน console เท่านั้น) บนเซิร์ฟเวอร์จริง (http/https) โหมดนี้ปิดเอง ไม่กระทบระบบจริง / เพิ่ม mock endpoint ใหม่ต้องอัปเดต `route()` ใน demo.js ด้วย

**ชุดส่งอาจารย์ (`mockup_ส่งอาจารย์/`):** frontend + vendor + sprites แบบ standalone สมบูรณ์ — ดับเบิลคลิก `index.html` ทำงานครบทุกหน้าโดยไม่ต้องต่อเน็ต/ไม่ต้องมี server (README.txt เป็นภาษาอังกฤษ) รีบิลด์เมื่อแก้ frontend: ก๊อป js/css/index.html + sprites/ + vendor/ ไปโฟลเดอร์นี้

**กติกาโค้ด:**
- Vanilla JS ทั้งหมด — **ไม่เพิ่ม framework/build step** (โปรเจคตั้งใจให้เรียบง่าย เปิดไฟล์รันได้เลย)
- **Blockly + ฟอนต์ฝังในเครื่องที่ `vendor/`** (ไม่พึ่ง CDN แล้ว) — `vendor/blockly.min.js` (v13.1.1, ห้ามอัปเวอร์ชันมั่วเพราะ v13 เปลี่ยน `.blocklyToolboxDiv` → `.blocklyToolbox`), `vendor/material-icons.css` + `vendor/prompt.css` (ฟอนต์ base64 inline — เปิด `file://` ก็ทำงานไม่ต้องต่อเน็ต) เหมาะกับห้องเรียนเน็ตไม่เสถียรตามบริบทงานวิจัย / ถ้าอัป Blockly ต้องทดสอบ toolbox styling + tutorial + ProjectStore ก่อน
- แผน UX/persona ของ Dashboard อยู่ที่ `แผน_Dashboard_UX.md` — ฟีเจอร์แดชบอร์ดใหม่ต้องอิงแผนนี้
- Global objects ที่มีอยู่: `Router`, `Auth`, `Dashboard`, `Tutorial`, `RobotSim`, `workspace` (Blockly)
- ข้อความ UI ทั้งหมดเป็น**ภาษาไทย** (ยกเว้นศัพท์เทคนิค เช่น Run, Dashboard, ชื่อบล็อก)
- AI endpoint ใช้ `AI_SERVER_URL = window.location.origin` — frontend กับ backend serve จากที่เดียวกัน

---

## 3. ธีมสีและ Design System (บังคับใช้ทุกหน้า)

> ⚠️ **รายละเอียดเต็ม + token + ลาย component + checklist อยู่ที่ [`THEME.md`](THEME.md) — แก้ UI ต้องอ่านก่อน**
> ต้นแบบธีมทั้งเว็บคือ **หน้า `index.html` → Workspace** ห้ามคิดสไตล์ใหม่แยกเป็นหน้าๆ
> หัวข้อนี้เก็บไว้เป็นสรุปพาเลต (ค่าสีต้องตรงกับ THEME.md เสมอ)

### 3.1 สีหลักของแบรนด์ METO

| บทบาท | สี | ใช้กับ |
|---|---|---|
| **Primary (น้ำเงินคราม)** | `#3A53A4` | Header, ปุ่มหลัก, ลิงก์, หัวข้อ dashboard, focus ring |
| Primary hover/เข้ม | `#4a6ad4` | hover state ของ primary |
| **Accent (เขียวมะนาว)** | `#BED73B` | โลโก้ "METO Robot", ไฮไลต์, จุดเน้นบนพื้นน้ำเงิน |
| Success/Run | `#4CAF50`, `#80C781` | ปุ่ม Run, สถานะสำเร็จ |
| พื้นอ่อน primary | `#f0f4ff`, `#f8f9fc` | พื้นหลัง card/section |
| Gradient ตกแต่ง | `#667eea → #764ba2` | greeting banner ใน dashboard |
| เตือน/คำใบ้ | `#fff8e1` / `#f57f17` | กล่อง warning จาก AI |
| สำเร็จอ่อน | `#e8f5e9` / `#2e7d32` | badge สำเร็จ |
| Online / Offline | `#00ff00` / `#ff4444` | status dot การเชื่อมต่อหุ่น |
| ข้อความ | `#333` (หลัก), `#666` (รอง), `#999` (จาง) | ตัวอักษรบนพื้นขาว |
| เส้น/พื้นเทา | `#e8e8e8`, `#f0f0f0`, `#f5f5f5` | border, พื้น toolbox |

### 3.2 สีหมวดบล็อก (ตรงกับตารางในรายงาน 3.3.4 — ห้ามเปลี่ยนโดยไม่แก้รายงาน)

| หมวด | สี | Hex | border เข้ม |
|---|---|---|---|
| Motion | น้ำเงิน | `#4C97FF` | `#3373CC` |
| Arm | ม่วง | `#9966FF` | `#774DCB` |
| Hand | ชมพู | `#CF63CF` | `#BD42BD` |
| Head | เหลือง | `#FFBF00` | `#E6AC00` |
| Face | แดงอ่อน/ชมพูแดง | `#FF6680` | `#CD3333` |
| Gripper | เขียวอมฟ้า | `#00B4AB` | — |
| Control | ส้มแดง (Blockly hue `20`) | — | — |
| Operator | เขียว | `#59C059` | — |
| Variables | ส้ม | `#FF8C1A` | — |

### 3.3 Typography
- **ฟอนต์หลัก:** `'Prompt'` (Google Fonts, น้ำหนัก 300–700) สำหรับ UI ภาษาไทย
- Fallback: `'Segoe UI', 'Roboto', sans-serif`
- โลโก้ header: 24px / สีเขียว `#BED73B` บนพื้นน้ำเงิน

### 3.4 รูปทรงและองค์ประกอบ
- มุมโค้งเยอะ เป็นมิตรกับเด็ก: ปุ่มกลม `border-radius: 20px`, pill-shaped status, FAB วงกลม
- เงานุ่ม: `box-shadow: 0 2px 5px rgba(0,0,0,0.2)`
- Toolbox สไตล์ **Scratch 3.0**: แถบซ้ายแคบ 90px, วงกลมสีหมวดด้านบน + ชื่อด้านล่าง
- Header สูง 60px คงที่, Blockly div = `calc(100vh - 60px)`
- Chat UI สไตล์ **livestream/gaming**: bubble ลอยซ้อนบน workspace, FAB เป็นดวงตาหุ่นยนต์ (canvas)

---

## 4. หลัก UX/UI (สำคัญที่สุด — ผู้ใช้คือเด็กมือใหม่)

1. **ลดภาระการเรียนรู้ (Low Floor):** ทุกอย่างต้องใช้ได้โดยไม่ต้องอ่านคู่มือ — ลากบล็อก → กด Run → เห็นผลทันทีใน simulator แม้ไม่ต่อหุ่นจริง
2. **Feedback ทันทีและเป็นรูปธรรม:** ทุก action ต้องมีการตอบสนองที่มองเห็น (simulator ขยับ, status dot เปลี่ยนสี, block warning เรียลไทม์, loading spinner)
3. **ภาษาเด็กเข้าใจ:** ข้อความ error/แนะนำต้องเป็นภาษาไทยง่ายๆ ไม่มีศัพท์เทคนิคดิบๆ ("เชื่อมต่อหุ่นยนต์ไม่ได้ ลองเช็ค Wi-Fi นะ" ไม่ใช่ "HTTP 500 fetch failed")
4. **พี่โรโบต้องเป็นพี่ ไม่ใช่เฉลย:** UI แชทต้องส่งเสริม Scaffolding — คำใบ้ทีละขั้น, ชมเมื่อทำถูก, ไม่มีปุ่ม "เฉลยคำตอบ" เด็ดขาด
5. **ห้ามลงโทษความผิดพลาด:** การลบบล็อก การรันโค้ดผิด ต้องไม่มี toast สีแดงน่ากลัว — ใช้โทนเหลือง warning + คำแนะนำเชิงบวก
6. **Validation ก่อน Run:** เช็คเสมอ — มี START PROGRAM ไหม, บล็อกลอย (orphan), Loop ว่าง, If ไม่มีเงื่อนไข (ตรงกับกฎ AI ข้อ 5 ในรายงาน)
7. **Progressive disclosure:** ผู้ใช้ guest ใช้ workspace ได้เต็มที่ทันที — login เป็นตัวเลือกเสริม (เก็บโปรเจค, achievements) ไม่ใช่กำแพง
8. **Gamification เบาๆ:** achievements, login streak, activity chart ใน dashboard — เสริมแรงจูงใจตามงานวิจัย Belpaeme et al. (2018) แต่ไม่รกหน้าจอ
9. **Responsive ระดับ tablet ขึ้นไป:** ใช้ในห้องเรียนผ่านคอม/แท็บเล็ต (viewport ล็อก scale, ไม่ต้องรีด mobile จ๋าเพราะนอกขอบเขตงานวิจัย)
10. **โจทย์ฝึก 3 ระดับ** (Sequential → If/Else → Loop ตามตารางที่ 8 ในรายงาน) — feature ใดที่เกี่ยวกับแบบฝึกหัด ต้องเรียงลำดับความยากตามหลัก Scaffolding นี้

---

## 5. API Contract (frontend ↔ backend)

| Endpoint | Method | หน้าที่ |
|---|---|---|
| `/analyze` | POST | ส่งคำอธิบายบล็อก + ข้อความผู้ใช้ → คำตอบพี่โรโบ (เก็บ history สูงสุด 20 ข้อความ/session) |
| `/new_session`, `/clear_session` | POST | จัดการ session แชท |
| `/health` | GET | เช็คสถานะ server |
| `/api/auth/register,login,logout,me,profile` | POST/GET/PUT | ระบบสมาชิก (ทุกคนสมัครเป็น USER) |
| `/api/dashboard` | GET | Dashboard รวมทุกอย่างใน call เดียว: ส่วนตัว + ห้องที่เข้าร่วม + มุมครู (ถ้าเป็นเจ้าของห้อง) |
| `/api/projects` (+`/<id>`) | GET/POST/DELETE | บันทึก/โหลด/ลบโปรเจคบล็อก (ProjectStore ใน script.js เป็นผู้เรียก) |
| `/api/classrooms` | GET/POST | สร้าง/ดูห้องเรียนของตัวเอง — **ผู้ใช้คนใดก็สร้างได้ ผู้สร้างเป็นครูของห้องนั้น** |
| `/api/classrooms/join` | POST | เข้าห้องด้วยรหัสเชิญ → เป็นนักเรียนของห้องนั้น |
| `/api/classrooms/<id>/students` | GET | รายชื่อนักเรียน + สถิติ (เจ้าของห้องเท่านั้น) |
| `/api/students/<id>/projects`, `/api/students/<id>/detail` | GET | ข้อมูลนักเรียน (ต้องเป็นครูของนักเรียนคนนั้น) |
| `/api/grades` | POST | ให้คะแนน (ต้องเป็นครูของนักเรียนคนนั้น) |
| `/api/skills/auto` | POST | อัปเดตทักษะอัตโนมัติ — เว็บเรียกเฉพาะหลัง "รันสะอาด" (ผ่าน validation ไม่มี ⚠️): 1 รัน = กำลังเรียน, 3 รัน = เชี่ยวชาญ, ไม่แตะทักษะที่ครู override, กันปั๊ม 60 วิ/ทักษะ |
| `/api/assignments/presets` | GET | ชุดโจทย์ 6 ข้อ 3 ระดับ (ตารางที่ 8 ในรายงาน) |
| `/api/assignments` (+`/<id>`) | POST/DELETE | ครูมอบ/ยกเลิกโจทย์ให้ห้อง (เจ้าของห้อง) |
| `/api/assignments/<id>/submit` | POST | นักเรียนส่งงาน (ผูกโปรเจกต์ตัวเอง ส่งซ้ำได้) |
| `/api/assignments/<id>/submissions` | GET | ครูดูงานที่ส่ง + คะแนน |
| `/api/objectives/<sid>/<oid>/override` | PUT | ครูปรับสถานะทักษะรายคน (ผ่าน modal รายละเอียดนักเรียน) |
| `http://MDTrobot.local/run?cmd=...` | GET | ส่งสตริงคำสั่ง (เช่น `w;a;w;a;`) ไปหุ่นจริง |
| `http://MDTrobot.local/state` | GET | อ่านสถานะหุ่นจริง (JSON: `emo, head, headCmd, arm1, arm2, hand1, hand2, busy, blink, up` + ฟิลด์เฟิร์มแวร์ 6 พ.ย. ที่เว็บใช้: `yaw, tiltRel, lift1, lift2, grip1, grip2, holding, verify, cliffL, cliffR, cam, camOk, mot, gripBusy`) — จอที่ 2 poll ทุก 300 ms · บล็อกเซนเซอร์ให้ `MetoRunner` (script.js) อ่านสดระหว่างรัน / เพิ่มฟิลด์ต้องแก้ `applyLiveState()` ใน robot-sim.js ให้ตรงกัน |

**กฎ:** เพิ่ม/แก้ endpoint ต้องอัปเดตตารางนี้ และฝั่ง AI ต้องผ่าน backend เท่านั้น (ซ่อน API Key, rate limit, strip thinking/markdown ก่อนแสดง — กฎ AI ข้อ 7)

**ระบบผู้ใช้ (Universal User):** ไม่มี role ระดับระบบ — `User.role = 'USER'` เสมอ บทบาทเกิดจากห้องเรียน: เจ้าของห้อง (`ClassRoom.teacher_id`) = ครูของห้องนั้น, สมาชิก (`ClassMembership`) = นักเรียน สิทธิ์ backend ตรวจจากความเป็นเจ้าของห้อง (`_user_teaches_student`) ห้ามตรวจจาก `User.role`

**ไอคอน:** ไอคอน dashboard ทั้งหมดวาดด้วยโค้ด (inline SVG ใน `MetoIcons` ที่ dashboard.js) — **ห้ามใช้อีโมจิเป็นไอคอน UI**

**ระบบเซฟ:** `ProjectStore` (ท้าย script.js) — ล็อกอิน → เซิร์ฟเวอร์, guest → localStorage, autosave ลง localStorage ทุก 1 วิหลังบล็อกเปลี่ยน / feedback ทุกกรณีใช้ snackbar ลอยกลางบน (`.meto-snackbar`) ที่มองเห็นได้ทุกหน้า — **ห้ามใช้ chat bubble แจ้งผลนอกหน้า workspace** (มองไม่เห็น)

**Layout Dashboard:** 2 คอลัมน์ (`.dash-columns` อัตราส่วน 3:2) — ซ้าย = ส่วนใช้งาน (ห้องเรียน/โจทย์/มุมครู/โปรเจกต์), ขวา = ส่วนติดตามผล (กราฟ/คะแนน/ทักษะ/ความสำเร็จ) / กว้างสุด 1400px / จอ ≤1024px ยุบเป็นคอลัมน์เดียว — เพิ่ม section ใหม่ต้องเลือกคอลัมน์ตามหลักนี้

**Header nav:** โลโก้ METO Robot คลิกกลับ workspace ได้, ปุ่ม Workspace/Dashboard (`.nav-btn`) มี active state อัปเดตโดย router.js

**Digital Twin 2 จอในการ์ดเดียว (✅ ใช้งานแล้ว — 30 ก.ค. 2026):** `#twin-panel` = การ์ดเดียวขนาด/ตำแหน่งเดิมของเวที (320×240 มุมขวา) ข้างในมี 2 ช่อง สลับบทบาทด้วยคลาส `.twin-big` / `.twin-pip` — **คลิกจอเล็กเพื่อสลับเป็นจอใหญ่** (ห้ามกลับไปวางการ์ด 2 ใบเรียงกัน — รกและกินที่ ดู `THEME.md` ข้อ 5.1.1)
- **จอเวที (`#stage-container`):** หุ่น**มุมมองด้านบน (top view)** — หมุนตามทิศแบบ lerp, ลูกศรบอกทิศเดินหน้า, เส้นรอยทางเดิน, ล็อกขอบเวที ±120/±80 px (กริด 40)
- **จอหน้าหุ่น (`#face-container`, canvas 320×240 = ขนาดจอ TFT จริง):** digital twin ของจอ TFT — port `drawEyes_*` จาก `Robo/Robo.ino` มา **1:1** (13 เฟรม) + idle engine (กระพริบ 3 แพทเทิร์น/เหลือบมอง/ถอนหายใจ/หัวใจเต้น) **จังหวะเวลา ms ตรงกับเฟิร์มแวร์** / จบโปรแกรมยิ้ม 1.5 วิแล้วกลับปกติเหมือนหุ่นจริง
- **เชื่อมหุ่นจริง (TwinLink):** ยิง `GET /state` ทุก 300 ms → แมปมุมเซอร์โวกลับเป็นท่าหุ่น, ป้ายสถานะ "ต่อหุ่นจริง / หุ่นจริง · ทำงาน / โหมดจำลอง" · หุ่น busy=1 ไม่เอาค่ามาทับซิม · ไม่มีหุ่นหรือเฟิร์มแวร์เก่า (404) → โหมดจำลองในเบราว์เซอร์ + ถอยจังหวะ poll เอง · **ตำแหน่ง/ทิศทางอ่านจากหุ่นไม่ได้** (ไม่มี odometry) จึงยังคำนวณจากคำสั่ง
- **แก้จอหน้าหุ่นต้องแก้ 2 ที่ให้ตรงกัน:** `FaceFrames` ใน robot-sim.js **และ** `drawEyes_*` ใน Robo.ino ไม่งั้น twin ไม่ตรงของจริง

**Sprite หุ่น (ชุด top view — วาดใหม่ 22 ภาพ):** `sprites/top/{Base,Head,ArmLeft,ArmRight}` ผืน **640×640 จัตุรัส** หุ่นหันขึ้น จุดกลางผืน = จุดหมุนตัว = จุดคอ — สเปค+ชื่อไฟล์ที่ `sprites/README.md` + เช็กลิสต์ `sprites/top/FILELIST.txt` (ห้ามเปลี่ยน naming โดยไม่แก้ README + `buildSpriteManifest()`) / ซ้าย-ขวายึดมุมมองหุ่น / ภาพไหนยังไม่มี ระบบ fallback วาดหุ่นมุมบนด้วยโค้ดอัตโนมัติ / ขนาดหุ่นบนเวที = `SPRITE_SCALE` / จอหน้าหุ่นไม่ต้องวาดภาพ (โค้ดวาด) — ถ้าจะใช้ภาพวางที่ `sprites/face/` แล้วตั้ง `USE_FACE_SPRITES = true` / โฟลเดอร์ `front/ back/ side(Right)/` เป็น **legacy ไม่ถูกเรียกใช้แล้ว**

**Log การอัปเดตโค้ด:** `CHANGELOG.md` ที่ราก — **แก้โค้ดทุกครั้งต้องจดเพิ่มไว้บนสุด** (แก้อะไร/ทำไม/ไฟล์ที่กระทบ/ทดสอบอะไร/อะไรค้าง) — **หน้าเว็บไม่มีฟีเจอร์ log ให้ผู้ใช้ ห้ามเพิ่ม** / ในโค้ดมี `RobotLog` เป็น debug trace ภายในเท่านั้น (300 event ในหน่วยความจำ ไม่มี UI ไม่พิมพ์ console เอง) ใช้ตอนไล่ปัญหา: `RobotSim.log.dump()`, `RobotSim.log.echo = true`, `RobotSim.pollNow()`, `RobotSim.snapshot()`

**ชื่อโปรเจกต์ใน header (แบบ Tinkercad):** `#project-title-input` แก้ชื่อได้ตรงนั้น (blur/Enter → `ProjectStore.commitTitle` — ถ้าเซฟแล้ว rename บนเซิร์ฟเวอร์ทันที), ปุ่ม `#new-project-btn` เริ่มงานใหม่ (confirm ก่อนถ้ามีบล็อก กัน id เดิมถูกเซฟทับ), ซ่อนบนหน้า Dashboard ผ่าน `body.on-dashboard` — การเซฟไม่ใช้ prompt() แล้ว ชื่อมาจากช่องนี้เท่านั้น

---

## 6. Checklist ก่อนส่งงานทุกครั้ง

- [ ] สีที่ใช้อยู่ในพาเลตข้อ 3 (ไม่เพิ่มสีใหม่โดยไม่มีเหตุผล)
- [ ] ข้อความ UI เป็นภาษาไทยเป็นกันเอง เหมาะกับเด็กมัธยม
- [ ] ฟอนต์ Prompt ถูกใช้กับข้อความไทย
- [ ] ไม่มี framework/dependency ใหม่ ไม่มี build step
- [ ] ทดสอบทั้งสถานะ guest และ logged-in
- [ ] ทดสอบทั้งกรณีหุ่นออนไลน์และออฟไลน์ (simulator ต้องทำงานเสมอ)
- [ ] ไม่หลุดขอบเขตงานวิจัย (ไม่มี text coding, ไม่มี mobile app, AI ผ่าน backend)
- [ ] ฟีเจอร์ใหม่สอดคล้อง/อ้างอิงได้กับรายงานบทที่ 3 — ถ้าขัดกับรายงาน ให้แจ้งผู้ใช้ก่อนทำ
- [ ] Blockly toolbox XML ใน index.html ตรงกับตารางหมวดบล็อกในรายงาน 3.3.4

---

*อัปเดตล่าสุด: 30 กรกฎาคม 2026 (Digital Twin 2 จอ + sprite มุมมองด้านบน — ดูรายละเอียดใน `CHANGELOG.md`) — เมื่อโครงสร้างโปรเจคหรือรายงานเปลี่ยน ให้แก้ไฟล์นี้ทันที*
