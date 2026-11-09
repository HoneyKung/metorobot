# อธิบายโค้ด FullCam.ino v7 ทีละบรรทัด

โค้ดนี้ทำงานบนบอร์ด **XIAO ESP32S3 Sense** ทำหน้าที่ตรวจจับใบหน้า วิเคราะห์อารมณ์ แล้วส่งรหัสไปยัง ESP32 ตัวหลัก (Robo.ino)

---

## ภาพรวมการทำงาน

```
กล้อง 240×240 (ไม่มี delay)
    │
    ├── Stage 1: MSR01 จับหน้า
    │
    ├── Stage 2: MNP01 หา 5 keypoints
    │
    ├── คำนวณ ratio (m, n, d)
    │
    ├── EMA Smoothing (กรอง noise)
    │
    ├── เทียบกับ adaptive baseline
    │
    ├── จำแนก H/S/N
    │
    └── Hysteresis: 2 เฟรมติด + hold 0.5 วิ → ส่ง Serial1
```

---

## ส่วนที่ 1: Header + Library (บรรทัด 1-20)

```cpp
#include "esp_camera.h"                    // ควบคุมกล้อง OV2640 ตรง (ไม่ผ่าน wrapper)
#include "human_face_detect_msr01.hpp"     // ESP-DL: Stage 1 จับตำแหน่งใบหน้า
#include "human_face_detect_mnp01.hpp"     // ESP-DL: Stage 2 หา 5 keypoints (ตา, จมูก, ปาก)
#include <cmath>                           // sqrt(), pow() สำหรับคำนวณระยะทาง
```

- **`esp_camera.h`** = driver กล้องทางการจาก Espressif ใช้กับ board v3.0.7
- **`human_face_detect_msr01.hpp`** = neural network model สำหรับจับใบหน้า (bounding box)
- **`human_face_detect_mnp01.hpp`** = neural network model สำหรับหา keypoints 5 จุดบนใบหน้า
- ทั้ง MSR01 และ MNP01 มาจาก **ESP-DL** (ESP Deep Learning Library) ของ Espressif

> **ทำไมเปลี่ยนจาก EloquentEsp32cam?**
> EloquentEsp32cam ล็อค board v2.0.14, ใช้ ESP-DL ตรงได้กับ board v3.0.7 + เร็วกว่า 3 เท่า

---

## ส่วนที่ 2: Camera Pins (บรรทัด 22-40)

```cpp
#define PWDN_GPIO_NUM     -1    // Power Down pin (ไม่มี)
#define RESET_GPIO_NUM    -1    // Reset pin (ไม่มี)
#define XCLK_GPIO_NUM     10    // Clock ให้กล้อง 20MHz
#define SIOD_GPIO_NUM     40    // I2C data (ตั้งค่ากล้อง)
#define SIOC_GPIO_NUM     39    // I2C clock (ตั้งค่ากล้อง)
#define Y9_GPIO_NUM       48    // data bit 7
#define Y8_GPIO_NUM       11    // data bit 6
#define Y7_GPIO_NUM       12    // data bit 5
#define Y6_GPIO_NUM       14    // data bit 4
#define Y5_GPIO_NUM       16    // data bit 3
#define Y4_GPIO_NUM       18    // data bit 2
#define Y3_GPIO_NUM       17    // data bit 1
#define Y2_GPIO_NUM       15    // data bit 0
#define VSYNC_GPIO_NUM    38    // Vertical sync (เริ่มเฟรมใหม่)
#define HREF_GPIO_NUM     47    // Horizontal reference (เริ่มบรรทัดใหม่)
#define PCLK_GPIO_NUM     13    // Pixel clock
#define MAIN_TX_PIN       43    // Serial1 TX → ส่งไป ESP32 หลัก
#define MAIN_RX_PIN       44    // Serial1 RX (ไม่ได้ใช้รับ)
```

- ขา camera เฉพาะ XIAO ESP32S3 Sense (เปลี่ยนไม่ได้)
- **GPIO43 (TX)** ต่อสายไปที่ GPIO35 (RX) ของ ESP32 หลัก + GND เชื่อมกัน

---

## ส่วนที่ 3: รหัสอารมณ์ + ค่าปรับจูน (บรรทัด 42-58)

### รหัสที่ส่ง
```cpp
#define EMO_HAPPY   'H'    // ยิ้ม
#define EMO_SAD     'S'    // เศร้า
#define EMO_NEUTRAL 'N'    // ปกติ
#define EMO_NOFACE  'X'    // ไม่เจอหน้า
```

> **v4 มี Angry ('A') ด้วย** แต่ v7 ลบออกเพราะ 5 keypoints ไม่มี "คิ้ว" ตรวจโกรธไม่ได้จริง

### ค่าปรับจูน (⚙️ แก้ตรงนี้ได้)

```cpp
#define EMA_ALPHA      0.5f     // ค่า 0-1: ยิ่งสูง = ไวต่อค่าใหม่ (แต่ noise เยอะ)
                                // 0.3 = เรียบมาก, 0.5 = สมดุล, 0.7 = ไวมาก

#define TH_HAPPY       0.020f   // ปากกว้างกว่า baseline > 0.02 = ยิ้ม
#define TH_SAD_N       0.035f   // จมูก-ปาก ห่างกว่า baseline > 0.035 = เศร้า
#define TH_SAD_D       0.035f   // ปากตกกว่า baseline > 0.035 = เศร้า

#define CONSEC_NEED    2        // ต้องเห็นอารมณ์ใหม่ 2 เฟรมติดกันถึงเปลี่ยน
#define MIN_HOLD_MS    500      // ค้างอารมณ์ปัจจุบันอย่างน้อย 0.5 วินาที
#define ADAPT_RATE     0.003f   // baseline ปรับช้ามาก (ใช้ ~100 เฟรม ≈ 6 วิ)
#define FACE_TIMEOUT   5000     // ไม่เจอหน้า 5 วินาที → ส่ง X
```

| ค่า | ลดลง = | เพิ่มขึ้น = |
|-----|--------|------------|
| `EMA_ALPHA` | เรียบขึ้น ตอบสนองช้า | ไวขึ้น แต่ noise เยอะ |
| `TH_HAPPY` | ยิ้มนิดเดียวก็จับ | ต้องยิ้มกว้างมากถึงจับ |
| `TH_SAD_N/D` | เศร้าง่าย (false positive) | ต้องเศร้ามากถึงจะจับ |
| `CONSEC_NEED` | เปลี่ยนเร็ว (อาจสั่น) | เปลี่ยนช้า (แต่นิ่งกว่า) |
| `MIN_HOLD_MS` | เปลี่ยนอารมณ์ได้ถี่ขึ้น | ค้างอารมณ์นานขึ้น |
| `ADAPT_RATE` | baseline ปรับช้า (คงที่) | ปรับเร็ว (อาจกิน emotion) |
| `FACE_TIMEOUT` | ส่ง X เร็ว | รอนานก่อนส่ง X |

---

## ส่วนที่ 4: Detectors — Global (บรรทัด 60-64)

```cpp
HumanFaceDetectMSR01 detector_s1(0.1F, 0.5F, 10, 0.2F);
//                                │     │     │    │
//                                │     │     │    └─ resize_scale: ย่อภาพก่อน detect (เร็วขึ้น)
//                                │     │     └────── top_k: จับหน้าได้สูงสุด 10 คน
//                                │     └──────────── nms_threshold: กันซ้ำ (Non-Max Suppression)
//                                └────────────────── score_threshold: ความมั่นใจขั้นต่ำ 10%

HumanFaceDetectMNP01 detector_s2(0.1F, 0.3F, 5);
//                                │     │     │
//                                │     │     └────── top_k: หา keypoints สูงสุด 5 หน้า
//                                │     └──────────── nms_threshold: 0.3
//                                └────────────────── score_threshold: ความมั่นใจขั้นต่ำ 10%
```

> ⚠️ **สำคัญมาก:** ประกาศเป็น **global** สร้างครั้งเดียวตอนบูต
> เดิม v4-v6 สร้างในลูปทุกเฟรม → heap fragmentation → ช้าลงเรื่อยๆ → crash
> แก้โดยย้ายมาเป็น global = **ไม่ leak memory อีก**

---

## ส่วนที่ 5: State Variables (บรรทัด 66-84)

### EMA Smoothing State
```cpp
float smM = 0, smN = 0, smD = 0;   // ค่า ratio หลังผ่าน EMA (m=ปาก, n=จมูก-ปาก, d=ปากตก)
bool emaOk = false;                  // เฟรมแรกยังไม่มีค่า EMA (ใช้ค่าดิบแทน)
```

### Calibration State
```cpp
float bM = 0, bN = 0, bD = 0;      // baseline (ค่าเฉลี่ยหน้าปกติ)
int calCnt = 0;                      // นับว่า calibrate ไปแล้วกี่เฟรม (เป้าหมาย 10)
bool calOk = false;                  // calibrate เสร็จหรือยัง
```

### Emotion State (Hysteresis)
```cpp
char curEmo = EMO_NOFACE;           // อารมณ์ที่ยืนยันแล้ว (ส่งไปแล้ว)
char pendEmo = EMO_NOFACE;          // อารมณ์ "รอดู" ที่กำลังนับ consecutive
int consecCnt = 0;                   // จำนวนเฟรมติดกันที่เห็นอารมณ์ใหม่
unsigned long lastChange = 0;        // เวลาที่เปลี่ยนอารมณ์ครั้งล่าสุด (ms)
```

### Timing + FPS
```cpp
char lastPos = 0;                    // ตำแหน่งล่าสุดที่ส่ง (L/C/R) — ส่งเฉพาะตอนเปลี่ยน
unsigned long lastPosT = 0;          // เวลาที่ส่งตำแหน่งครั้งล่าสุด
unsigned long lastFaceT = 0;         // เวลาที่เจอหน้าครั้งล่าสุด (ใช้ timeout)
unsigned long fpsT = 0;              // เวลาเริ่มนับ FPS
int fpsCnt = 0;                      // จำนวนเฟรมที่นับ
```

---

## ส่วนที่ 6: ฟังก์ชันช่วย (บรรทัด 86-120)

### struct Rat — เก็บ ratio 3 ค่า
```cpp
struct Rat { float m, n, d; bool ok; };
// m = mouth_width / eye_dist      → ปากกว้างเท่าไหร่
// n = nose_to_mouth / eye_dist    → จมูก-ปาก ห่างเท่าไหร่
// d = (mouth_Y - nose_Y) / eye_dist → ปากตกเท่าไหร่
// ok = คำนวณสำเร็จหรือไม่
```

### calcRat() — คำนวณ ratio จาก 5 keypoints

**Keypoint 5 จุดที่ MNP01 ให้มา:**
```
      ตาซ้าย [0,1]                    ตาขวา [6,7]

                      จมูก [4,5]

      มุมปากซ้าย [2,3]           มุมปากขวา [8,9]
```

**คำนวณ:**

| ค่า | สูตร | ความหมาย |
|-----|-------|----------|
| `ed` | √((ตาขวาX - ตาซ้ายX)² + (ตาขวาY - ตาซ้ายY)²) | ระยะห่างตา (ตัวหาร) |
| `m` | √((ปากขวาX - ปากซ้ายX)² + (ปากขวาY - ปากซ้ายY)²) ÷ ed | ปากกว้าง (ratio) |
| `n` | √((กลางปากX - จมูกX)² + (กลางปากY - จมูกY)²) ÷ ed | จมูก-ปาก (ratio) |
| `d` | (กลางปากY - จมูกY) ÷ ed | ปากตก (ratio) — ค่าบวก = ตก |

**ทำไมหารด้วยระยะห่างตา?** → ให้ค่าเป็นสัดส่วน ไม่ขึ้นกับระยะห่างจากกล้อง
(หน้าไกล = ทุกค่าเล็ก, หน้าใกล้ = ทุกค่าใหญ่ → หารแล้วเท่ากัน)

### emaUp() — กรอง noise ด้วย EMA

```cpp
void emaUp(float rm, float rn, float rd) {
    if (!emaOk) {
        // เฟรมแรก: ใช้ค่าดิบเลย (ยังไม่มีค่าเก่า)
        smM = rm; smN = rn; smD = rd;
        emaOk = true;
        return;
    }
    // เฟรมถัดไป: ผสมค่าใหม่ 50% + ค่าเก่า 50%
    smM = 0.5 * rm + 0.5 * smM;   // ค่าดิบ: 0.8  0.6  0.9  0.5
    smN = 0.5 * rn + 0.5 * smN;   // EMA:   0.80 0.70 0.80 0.65  ← เรียบกว่า!
    smD = 0.5 * rd + 0.5 * smD;
}
```

### tryChange() — Hysteresis (ไม่เปลี่ยนอารมณ์ง่ายๆ)

```cpp
bool tryChange(char e) {
    // 1. ถ้าเหมือนเดิม → ไม่ต้องเปลี่ยน reset counter
    if (e == curEmo) { consecCnt = 0; return false; }

    // 2. ยังไม่ถึง hold time (0.5 วิ) → ห้ามเปลี่ยน
    if (millis() - lastChange < MIN_HOLD_MS) return false;

    // 3. นับ consecutive frames
    if (e == pendEmo) consecCnt++;    // เห็นซ้ำ → นับต่อ
    else { pendEmo = e; consecCnt = 1; }  // เปลี่ยนใหม่ → เริ่มนับ 1

    // 4. ครบ 2 เฟรมติด → เปลี่ยนจริง!
    if (consecCnt >= 2) {
        curEmo = e; consecCnt = 0; lastChange = millis();
        return true;    // → ส่ง Serial1
    }
    return false;       // → ยังไม่แน่ใจ ค้างอารมณ์เดิม
}
```

**ทำไมไม่เปลี่ยนทันทีเลย?** → ป้องกัน "กระตุก" — เฟรมเดียวอาจจับผิด
ต้องเห็น 2 เฟรมติดกัน + รอ 0.5 วิหลังจากเปลี่ยนครั้งก่อน

---

## ส่วนที่ 7: Setup (บรรทัด 122-156)

```cpp
Serial.begin(115200);     // USB debug ดูใน Serial Monitor
Serial1.begin(9600, SERIAL_8N1, MAIN_RX_PIN, MAIN_TX_PIN);
                          // Serial1 ส่งไป ESP32 หลัก — 9600 baud, 8N1
```

### ตั้งค่ากล้อง
```cpp
camera_config_t cfg;
cfg.xclk_freq_hz = 20000000;         // Clock 20MHz ให้กล้อง
cfg.pixel_format = PIXFORMAT_RGB565;  // RGB565: 2 bytes/pixel (ESP-DL ต้องใช้)
cfg.frame_size = FRAMESIZE_240X240;   // 240×240 = ขนาดเหมาะสำหรับ face detection
cfg.fb_location = CAMERA_FB_IN_PSRAM; // เก็บ frame buffer ใน PSRAM (8MB)
cfg.fb_count = 2;                     // double buffer (ถ่ายเฟรมถัดไประหว่าง process)
cfg.grab_mode = CAMERA_GRAB_LATEST;   // เอาเฟรมล่าสุดเสมอ (ไม่เอาเฟรมเก่าค้าง)
```

> **เดิม v4 ใช้** `camera.pinout.xiao()` + `camera.resolution.face()` (ผ่าน EloquentEsp32cam)
> **v7 ตั้งค่าตรง** = ควบคุมได้ละเอียดกว่า + ไม่ต้องพึ่ง library

### หลัง init สำเร็จ
```cpp
Serial.printf("[MEM] Free heap: %d bytes\n", esp_get_free_heap_size());
// แสดง memory เหลือเท่าไหร่ตอนบูต — ใช้เทียบกับตอน run เพื่อดูว่า leak ไหม
```

---

## ส่วนที่ 8: Loop — หัวใจหลัก (บรรทัด 158-278)

### ขั้นตอน 1: Re-calibrate ผ่าน Serial (บรรทัด 162-171)
```cpp
while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'R' || c == 'r') {
        // reset ทุกอย่าง กลับไป calibrate ใหม่
        calOk = false; calCnt = 0;
        bM = 0; bN = 0; bD = 0;
        emaOk = false;
    }
}
```

> พิมพ์ **R** ใน Serial Monitor เพื่อ recalibrate (เช่น เปลี่ยนคน/มุม)

### ขั้นตอน 2: จับภาพ (บรรทัด 173-175)
```cpp
camera_fb_t *fb = esp_camera_fb_get();   // ถ่าย 1 เฟรม จาก OV2640
if (!fb) { delay(10); return; }          // ถ้าไม่ได้ → ข้ามเฟรมนี้
```

### ขั้นตอน 3: Stage 1 — จับใบหน้า (บรรทัด 177-180)
```cpp
int sh[3] = {(int)fb->height, (int)fb->width, 3};  // shape: [240, 240, 3]
std::vector<int> shape(sh, sh + 3);                  // ESP-DL ต้องเป็น vector
auto &r1 = detector_s1.infer((uint16_t *)fb->buf, shape);
// r1 = รายการ bounding box ของใบหน้าที่เจอ
```

> **`detector_s1` เป็น global** — ไม่สร้างใหม่ทุกเฟรม (ป้องกัน memory leak)

### ขั้นตอน 4: Stage 2 — หา Keypoints (บรรทัด 182-189)
```cpp
if (r1.size() > 0) {                                // เจอหน้าอย่างน้อย 1 คน
    lastFaceT = millis();                             // จำเวลาที่เจอ (ใช้ timeout)
    auto &r2 = detector_s2.infer((uint16_t *)fb->buf, shape, r1);
    // r2 = รายการ keypoints ของแต่ละหน้า

    if (!r2.empty() && r2.front().keypoint.size() >= 10) {
        auto &f = r2.front();   // f = หน้าแรก (เอาแค่คนเดียว)
        // f.box = [x1, y1, x2, y2]       ← กรอบใบหน้า
        // f.keypoint = [x0,y0,...,x4,y4]  ← 5 จุด × 2 = 10 ค่า
```

### ขั้นตอน 5: ส่งตำแหน่ง L/C/R (บรรทัด 191-199)
```cpp
int cx = (f.box[0] + f.box[2]) / 2;   // จุด X กลางกรอบหน้า
int w = fb->width;                      // ความกว้างภาพ = 240

char p = (cx < w/3) ? 'L' : (cx > w*2/3) ? 'R' : 'C';
//        ← 0-79 →   ← 80-159 → ← 160-240 →
//         ซ้าย L      กลาง C      ขวา R

if (p != lastPos) { Serial1.write(p); lastPos = p; }
// ส่งเฉพาะเมื่อตำแหน่งเปลี่ยน (หันจาก L → C เป็นต้น)
```

> ส่งทุก 300ms (ไม่ส่งรัวเกิน) และ**เฉพาะเมื่อเปลี่ยน**

### ขั้นตอน 6: คำนวณ Ratio + EMA (บรรทัด 201-210)
```cpp
Rat rat = calcRat(
    (int)f.keypoint[0], (int)f.keypoint[1],   // left eye   (x, y)
    (int)f.keypoint[6], (int)f.keypoint[7],   // right eye  (x, y)
    (int)f.keypoint[4], (int)f.keypoint[5],   // nose       (x, y)
    (int)f.keypoint[2], (int)f.keypoint[3],   // mouth L    (x, y)
    (int)f.keypoint[8], (int)f.keypoint[9]);  // mouth R    (x, y)

if (rat.ok) {
    emaUp(rat.m, rat.n, rat.d);  // กรอง noise ด้วย EMA
}
```

### ขั้นตอน 7: Calibration — 10 เฟรมแรก (บรรทัด 212-223)
```
เฟรม 1: smM=0.52 → สะสม bM += 0.52
เฟรม 2: smM=0.51 → สะสม bM += 0.51
...
เฟรม 10: smM=0.53 → สะสม bM += 0.53

bM /= 10 → baseline = 0.52  ← "ค่าปกติ" ของคนนี้
```

> ตอนเปิดเครื่อง Serial จะขึ้น `[CAL 1/10]` ถึง `[CAL 10/10]` แล้ว `=== READY! ===`
> ระหว่างนี้ **ทำหน้าปกติ** ไม่ยิ้ม ไม่เศร้า

### ขั้นตอน 8: จำแนกอารมณ์ (บรรทัด 224-252)
```cpp
// หาผลต่างจาก baseline
float mD = smM - bM;   // ปากกว้างกว่าปกติเท่าไหร่ (+= กว้างขึ้น)
float nD = smN - bN;   // จมูก-ปาก เปลี่ยนเท่าไหร่
float dD = smD - bD;   // ปากตกเท่าไหร่ (+= ตกลง)

// Adaptive baseline — ปรับทุกเฟรม ช้ามาก
bM += 0.003 * (smM - bM);  // baseline ค่อยๆ ตามหน้าจริง
bN += 0.003 * (smN - bN);  // ป้องกัน: ขยับตัว/เปลี่ยนมุม → baseline เพี้ยน
bD += 0.003 * (smD - bD);  // ช้ามากพอที่ emotion จริงจะไม่ถูกกิน
```

**ตารางจำแนก:**

| mD (ปากกว้าง) | nD (จมูก-ปาก) | dD (ปากตก) | ผล | เหตุผล |
|:-:|:-:|:-:|:-:|---|
| > +0.020 | — | — | 😊 **H** | ปากกว้างขึ้น = ยิ้ม |
| ≤ 0.020 | > +0.035 | — | 😢 **S** | จมูก-ปาก ห่างขึ้น = ทำปากเศร้า |
| ≤ 0.020 | — | > +0.035 | 😢 **S** | ปากตกลง = มุมปากตก |
| อื่นๆ | อื่นๆ | อื่นๆ | 😐 **N** | ไม่เปลี่ยนจากปกติ |

> **Happy มีลำดับสูงสุด** — ถ้าปากกว้าง = ยิ้มเสมอ ไม่สนค่าอื่น

### ขั้นตอน 9: Hysteresis + ส่ง (บรรทัด 247-251)
```cpp
if (tryChange(det)) {               // ผ่าน 2 เฟรมติด + hold 0.5 วิ?
    Serial1.write(curEmo);           // ส่งไป ESP32 หลัก
    Serial.printf(">>> SEND: %c <<<\n", curEmo);
}
```

### ขั้นตอน 10: เฟรมไม่มี keypoints → ข้าม (บรรทัด 254-255)

```cpp
// ไม่มี keypoints → ข้ามเลย ไม่นับ
```

> **สำคัญมาก** — เดิม v5/v6 นับว่า "ไม่มี keypoints = Neutral" → N ท่วม voting → H/S ไม่มีทางชนะ
> v7 ข้ามเลย ไม่ส่งผลต่อ emotion

### ขั้นตอน 11: Face Timeout → X (บรรทัด 258-264)
```cpp
if (millis() - lastFaceT > 5000 && curEmo != EMO_NOFACE) {
    curEmo = EMO_NOFACE;
    Serial1.write(EMO_NOFACE);    // ส่ง 'X' → บอกว่าไม่มีคนแล้ว
}
```

> ไม่เจอหน้า 5 วินาที → ส่ง X ครั้งเดียว (ไม่ส่งซ้ำ)

### ขั้นตอน 12: คืน Frame Buffer (บรรทัด 266-267)
```cpp
esp_camera_fb_return(fb);
```

> ⚠️ **ต้องทำทุกเฟรม!** ถ้าลืม = PSRAM เต็ม = crash หลังแค่ 2 เฟรม
> v6 มี bug ที่ `return` ก่อน `fb_return` → crash

### ขั้นตอน 13: FPS + Heap Monitor (บรรทัด 269-277)
```cpp
fpsCnt++;
if (millis() - fpsT >= 5000) {   // ทุก 5 วินาที
    float fps = fpsCnt / ((millis() - fpsT) / 1000.0);
    Serial.printf("[FPS] %.1f  [MEM] %d bytes free\n", fps, esp_get_free_heap_size());
    //             ↑ FPS จริง    ↑ memory เหลือ — ถ้าลดเรื่อยๆ = มี leak!
    fpsCnt = 0;
    fpsT = millis();
}
```

---

## Serial Monitor — อ่านค่ายังไง?

### ตอนเริ่มเครื่อง
```
=== FullCam v7 ===
[MEM] Free heap: 3456789 bytes      ← memory ตอนบูต
Camera OK — ทำหน้าปกติ... (R = recalibrate)
```

### ระหว่าง Calibration (10 เฟรมแรก)
```
[CAL 1/10] m=0.520                   ← เก็บค่า mouth ratio เฟรม 1
[CAL 2/10] m=0.518                   ← เก็บค่าเฟรม 2
...
[CAL 10/10] m=0.522

=== READY! base m=0.520 n=0.410 d=0.150 ===    ← baseline พร้อม!
```

### ระหว่างทำงาน
```
[N] m=+0.003 n=-0.001 d=+0.002  base=0.520    ← ปกติ (ค่าไม่เกิน threshold)
[N] m=+0.005 n=+0.002 d=+0.001  base=0.520
[H] m=+0.045 n=-0.010 d=-0.005  base=0.520    ← ยิ้ม! (m > 0.02)
[H] m=+0.048 n=-0.012 d=-0.003  base=0.520    ← เห็น H 2 เฟรมติด!
>>> SEND: H <<<                                 ← ส่ง H ไป ESP32 หลัก

[S] m=-0.010 n=+0.042 d=+0.038  base=0.519    ← เศร้า (n > 0.035)
[S] m=-0.012 n=+0.045 d=+0.040  base=0.519
>>> SEND: S <<<                                 ← ส่ง S
```

### FPS + Memory (ทุก 5 วินาที)
```
[FPS] 16.2  [MEM] 245000 bytes free    ← ถ้า MEM คงที่ = ไม่มี leak ✅
[FPS] 16.0  [MEM] 245000 bytes free    ← ถ้า MEM ลดเรื่อยๆ = มี leak ❌
```

### เมื่อ Recalibrate (พิมพ์ R)
```
=== RECAL ===

[CAL 1/10] m=0.515                   ← เริ่ม calibrate ใหม่
...
```

---

## สรุปข้อมูลที่ส่งออก Serial1 (→ ESP32 หลัก)

| รหัส | ความหมาย | เงื่อนไข | ความถี่สูงสุด |
|:----:|----------|----------|:-------------:|
| **L** | หน้าอยู่ซ้าย | เปลี่ยนจากตำแหน่งก่อน | ทุก 300ms |
| **C** | หน้าอยู่กลาง | เปลี่ยนจากตำแหน่งก่อน | ทุก 300ms |
| **R** | หน้าอยู่ขวา | เปลี่ยนจากตำแหน่งก่อน | ทุก 300ms |
| **H** | ยิ้ม | 2 เฟรมติด + hold 0.5 วิ | ~ทุก 0.5 วิ |
| **S** | เศร้า | 2 เฟรมติด + hold 0.5 วิ | ~ทุก 0.5 วิ |
| **N** | ปกติ | 2 เฟรมติด + hold 0.5 วิ | ~ทุก 0.5 วิ |
| **X** | ไม่เจอหน้า | หลัง timeout 5 วินาที | ครั้งเดียว |

**ลำดับการส่ง:** ตำแหน่ง (L/C/R) ส่งอิสระจากอารมณ์ (H/S/N/X) — ได้รับทั้งคู่
**ไม่ส่งซ้ำ:** ถ้าเป็นอารมณ์/ตำแหน่งเดิม → ไม่ส่ง (ประหยัด bandwidth)

---

## สรุปสิ่งที่เปลี่ยนจากโค้ดเก่า (v4 EloquentEsp32cam)

| หัวข้อ | v4 (เก่า) | v7 (ใหม่) | ทำไม |
|--------|-----------|-----------|------|
| **Library** | EloquentEsp32cam | ESP-DL ตรง (MSR01 + MNP01) | เร็วกว่า 3× + ปรับค่าได้ |
| **Board** | v2.0.14 | v3.0.7 | รองรับ ESP-DL |
| **delay()** | `delay(200)` ทุกรอบ | ไม่มี delay | FPS 5 → 16 |
| **Smoothing** | ไม่มี (ค่าดิบ) | EMA (alpha=0.5) | ลด noise |
| **Voting** | 20 เฟรม น้ำหนักเท่ากัน | ลบออก | EMA+hysteresis เพียงพอ |
| **เปลี่ยนอารมณ์** | อารมณ์ใหม่ ≠ เดิม → ส่งเลย | 2 เฟรมติด + hold 0.5 วิ | ป้องกันกระตุก |
| **Baseline** | คงที่ตลอด | Adaptive (ปรับช้าๆ ทุกเฟรม) | ไม่ต้อง recalibrate |
| **Detector** | สร้างใหม่ทุกเฟรมในลูป | Global (สร้างครั้งเดียว) | ป้องกัน memory leak |
| **Frame buffer** | บางเส้นทางลืมคืน | คืนเสมอ (ไม่มี leak) | ป้องกัน crash |
| **Angry** | มี (A) | ลบออก | 5 keypoints ไม่มีคิ้ว |
| **Ratio** | m (ปาก), n (จมูก-ปาก) | m, n, **d (ปากตก)** | ตรวจ Sad ได้ดีขึ้น |
| **FPS** | ~3-5 | ~16 | ลบ delay + board ใหม่ |
| **Latency** | ~6-7 วินาที | ~0.6 วินาที | เร็วขึ้น 10 เท่า |
| **Heap monitor** | ไม่มี | แสดงทุก 5 วิ | ตรวจ memory leak |

### Bug ที่แก้ไปแล้ว (v4-v6 → v7)

| Bug | เวอร์ชันที่เกิด | สาเหตุ | ผลกระทบ |
|-----|:---------------:|--------|---------|
| Memory leak | v6 | `return` ก่อน `fb_return` | PSRAM เต็ม crash |
| `goto` crash | v7a | `goto` ข้ามตัวแปร float | Undefined behavior |
| Baseline ค้าง | v5-v6 | ปรับ baseline เฉพาะ Neutral | ค้างที่ H/S ตลอด |
| N ท่วม voting | v5-v6 | ไม่มี keypoints = N เข้า vote | H/S ไม่มีทางชนะ |
| H ถูก S บล็อก | v5 | `!isSad` กัน H | ยิ้มแต่ได้ S |
| Serial.peek bug | v7a | peek ตัวถัดไปหลัง read | อ่านค่าผิด |
| Heap fragment | v4-v6 | สร้าง detector ทุกเฟรม | ช้าลงเรื่อยๆ crash |
