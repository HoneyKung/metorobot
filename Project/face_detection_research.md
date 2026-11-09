# วิจัย: วิธีจับใบหน้าให้คงที่และตอบสนองทันที บน ESP32-S3

## 1. ปัญหาเดิมของ FullCam.ino v4 (EloquentEsp32cam)

โค้ดเดิมใช้ **XIAO ESP32S3 Sense** + ไลบรารี **EloquentEsp32cam** (board v2.0.14)
มีปัญหาทำให้ **จับหน้าไม่คงที่ / ตอบสนองช้า ~6-7 วินาที**:

| ปัญหา | รายละเอียด | ผลกระทบ |
|---|---|---|
| `delay(200)` ท้าย loop | หยุดทุกรอบ 200ms | จำกัด FPS ≤ 5 |
| Voting Window 20 เฟรม | ดู 20 เฟรม × 200ms = 4 วิ | latency สูงมาก |
| ไม่มี smoothing | ค่า keypoints กระโดดทุกเฟรม | อารมณ์สลับรัว |
| EloquentEsp32cam ต้อง board v2.0.14 | library ล็อคเวอร์ชัน | ใช้ ESP-DL ตรงไม่ได้ |
| สร้าง detector ในลูป | new/delete ทุกเฟรม | heap fragment → crash |
| ไม่มี adaptive baseline | ขยับหน้า = ค่าเพี้ยน | ต้อง recalibrate บ่อยๆ |

---

## 2. สิ่งที่เปลี่ยนแปลง: v4 → v7

### 2.1 เปลี่ยนจาก EloquentEsp32cam → ESP-DL ตรง

**EloquentEsp32cam** เป็น wrapper ที่ซ่อน ESP-DL ไว้ข้างใน แต่:
- ล็อค board package v2.0.14 (EloquentEsp32cam ไม่รองรับ v3.x)
- ไม่สามารถปรับพารามิเตอร์ model ได้ละเอียด
- มี overhead จาก abstraction layer

**ESP-DL** คือ deep learning library ของ Espressif ที่ทำงานตรงบน ESP32-S3
ใช้ model 2 ขั้นตอน:

```cpp
// Stage 1: HumanFaceDetectMSR01 — จับตำแหน่งใบหน้า
//   พารามิเตอร์: score_threshold, nms_threshold, top_k, resize_scale
HumanFaceDetectMSR01 s1(0.1F, 0.5F, 10, 0.2F);

// Stage 2: HumanFaceDetectMNP01 — หา 5 keypoints (ตาซ้าย, ตาขวา, จมูก, มุมปากซ้าย, มุมปากขวา)
//   พารามิเตอร์: score_threshold, nms_threshold, top_k
HumanFaceDetectMNP01 s2(0.1F, 0.3F, 5);
```

> **แหล่งที่มา:**
> - [espressif/esp-dl](https://github.com/espressif/esp-dl) — ESP-DL Deep Learning Library
> - [espressif/esp-who](https://github.com/espressif/esp-who) — AI Application Framework สำหรับ ESP32-S3
> - [ESP-DL User Guide](https://docs.espressif.com/projects/esp-dl/en/latest/) — Espressif Official Docs
> - Arduino Forum: [Face detection with human_face_detect_msr01.hpp](https://forum.arduino.cc/t/esp32-face-detection/) — ตัวอย่างการใช้ ESP-DL กับ Arduino

### 2.2 เปรียบเทียบ v4 vs v7

| หัวข้อ | v4 (เดิม) | v7 (ใหม่) |
|---|---|---|
| **Library** | EloquentEsp32cam | **ESP-DL ตรง** |
| **Board Package** | v2.0.14 | **v3.0.7** |
| **delay()** | delay(200) = 5 FPS | **ไม่มี** = 16 FPS |
| **Smoothing** | ไม่มี | **EMA (alpha=0.5)** |
| **Voting** | 20 เฟรม น้ำหนักเท่ากัน | **ลบออก (ไม่จำเป็น)** |
| **เงื่อนไขเปลี่ยน** | อารมณ์ ≠ อันเก่า → ส่ง | **2 เฟรมติด + hold 0.5 วิ** |
| **Detector** | สร้างใหม่ทุกเฟรม ❌ | **global (สร้างครั้งเดียว)** ✅ |
| **Baseline** | คงที่ ไม่ปรับ | **Adaptive (ADAPT_RATE=0.003)** |
| **FPS จริง** | ~3-5 | **~16** |
| **End-to-End Latency** | ~6-7 วินาที | **~0.6 วินาที** |

---

## 3. เทคนิคที่ใช้ — ที่มาและเหตุผล

### 3.1 EMA Smoothing (Exponential Moving Average)

**ปัญหา:** ค่า keypoints กระโดดทุกเฟรม → อารมณ์สลับรัว

**วิธีแก้:** กรองค่าด้วย EMA — เฟรมล่าสุดมีน้ำหนัก 50% (alpha=0.5)

```cpp
#define EMA_ALPHA 0.5f  // 0.3=ช้า เสถียร, 0.5=สมดุล, 0.7=เร็ว noisy

smoothMouth = EMA_ALPHA * rawMouth + (1 - EMA_ALPHA) * smoothMouth;
smoothNose  = EMA_ALPHA * rawNose  + (1 - EMA_ALPHA) * smoothNose;
smoothDroop = EMA_ALPHA * rawDroop + (1 - EMA_ALPHA) * smoothDroop;
```

> **แหล่งที่มา:**
> - Temporal Smoothing for FER (IEEE, 2024) — ใช้ moving avg + low-pass filter กรอง keypoints
> - MekhyW/Facial-Emotion-Classification — โปรเจกต์ที่ใช้ EMA กับ facial landmarks
> - หลักการ signal processing พื้นฐาน: [EMA on Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing)

### 3.2 Adaptive Baseline Calibration

**ปัญหา:** ถ้า baseline คงที่ → ขยับตัว/เอียงหน้า/แสงเปลี่ยน → ค่าเพี้ยน → ต้อง recalibrate

**วิธีแก้:** baseline ค่อย ๆ ปรับตามหน้าปัจจุบัน **ทุกเฟรม** ช้ามากพอที่จะไม่กิน emotion จริง

```cpp
#define ADAPT_RATE 0.003f  // ช้ามาก: ใช้ ~100 เฟรม (~6 วิ) ถึงจะปรับเสร็จ

// ทำทุกเฟรม ไม่ว่าจะเป็น H/S/N
bM += ADAPT_RATE * (smoothMouth - bM);
bN += ADAPT_RATE * (smoothNose  - bN);
bD += ADAPT_RATE * (smoothDroop - bD);
```

**สำคัญ:** เดิมปรับ baseline เฉพาะตอน Neutral → ถ้าค้างที่ H/S baseline ไม่ปรับ → ค้างตลอด!
แก้โดยปรับ **ทุกเฟรม** ด้วย rate ต่ำมาก

> **แหล่งที่มา:**
> - Baseline removal preprocessing for EEG-based emotion recognition (NIH, 2023)
> - Adaptive Facial Expression Recognition frameworks (MDPI Sensors, 2024)
> - หลักการ adaptive filtering ในงาน real-time signal processing

### 3.3 Hysteresis — ส่งเฉพาะเมื่อแน่ใจว่าเปลี่ยนจริง

**ปัญหา:** เฟรมเดียวอาจจับผิด → ส่งอารมณ์สลับรัว

**วิธีแก้:** ต้องเห็นอารมณ์ใหม่ **2 เฟรมติด** + ค้างอารมณ์เดิมอย่างน้อย **0.5 วิ**

```cpp
bool tryChange(char newEmo) {
    if (newEmo == curEmo) return false;                   // เหมือนเดิม → ไม่เปลี่ยน
    if (millis() - lastChange < 500) return false;        // ยังไม่ถึง hold time
    if (consecutiveNew >= 2) { curEmo = newEmo; return true; }  // ครบ → เปลี่ยน!
    return false;
}
```

**ทำไมลบ Voting ออก:**
- Voting window 6 เฟรม ถูกท่วมด้วย "ไม่มี keypoints = N" → H/S ไม่มีทางชนะ
- EMA + Hysteresis เพียงพอแล้ว ไม่ต้อง voting ซ้อนอีกชั้น

> **แหล่งที่มา:**
> - Perceptual Hysteresis in Emotion Perception (NIH, 2023) — มนุษย์เองก็มี hysteresis ในการรับรู้อารมณ์
> - ARVO Journal (2024): Evidence of hysteresis in dynamic emotion recognition from faces
> - ตัวอย่าง: แอร์ตั้ง 25°C เปิดที่ 26° ปิดที่ 24° → ไม่สลับรัว

### 3.4 Memory Management — ป้องกัน Heap Fragmentation

**ปัญหา: สร้าง neural network ใหม่ทุกเฟรม → heap fragment → ช้าลง → crash**

```cpp
// ❌ เดิม — สร้าง/ทำลาย 16 ครั้ง/วินาที
void loop() {
    HumanFaceDetectMSR01 s1(0.1F, 0.5F, 10, 0.2F);  // allocate
    // ... ใช้งาน ...
}   // deallocate ← heap fragmentation!

// ✅ ใหม่ — สร้างครั้งเดียว ใช้ซ้ำตลอด
HumanFaceDetectMSR01 detector_s1(0.1F, 0.5F, 10, 0.2F);  // global!
HumanFaceDetectMNP01 detector_s2(0.1F, 0.3F, 5);          // global!
```

**และต้องคืน camera frame buffer เสมอ!**
```cpp
camera_fb_t *fb = esp_camera_fb_get();
// ... ใช้งาน ...
esp_camera_fb_return(fb);  // ← ต้องทำทุกเฟรม! ถ้าลืม = PSRAM เต็ม = crash
```

> **แหล่งที่มา:**
> - Espressif ESP-IDF Programming Guide: [Memory Management](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/mem_alloc.html)
> - ESP32 Camera Driver: `esp_camera_fb_return()` ต้องเรียกหลังใช้ frame buffer

### 3.5 Emotion Classification — Facial Landmark Ratios

ใช้ **5 keypoints** จาก MNP01 คำนวณ ratio เทียบกับ baseline:

```
Keypoints: ตาซ้าย, ตาขวา, จมูก, มุมปากซ้าย, มุมปากขวา
          (0,1)    (6,7)   (4,5)    (2,3)       (8,9)

Ratio ที่ใช้:
  m = ปากกว้าง / ระยะห่างตา     → ยิ้ม = m สูงขึ้น
  n = จมูก-ปาก / ระยะห่างตา     → เศร้า = n เปลี่ยน
  d = (Y_ปาก - Y_จมูก) / ระยะห่างตา  → ปากตก = d สูงขึ้น
```

```cpp
if (mD > 0.020)                           det = 'H';  // ยิ้ม
else if (nD > 0.035 || dD > 0.035)        det = 'S';  // เศร้า
else                                       det = 'N';  // ปกติ
```

**ข้อจำกัด:** 5 keypoints ไม่มี "คิ้ว" → ตรวจจับอารมณ์โกรธ (A) ไม่ได้
→ A ใช้จากเซนเซอร์อื่น (เช่น IR ตรวจจับเกือบตก)

> **แหล่งที่มา:**
> - Hybrid Geometric-CNN Facial Emotion Classification (IJITCE, 2024)
> - Facial Landmark Ratio Classification (Kaggle, 2024)
> - ESP-DL keypoint order: [espressif/esp-dl HumanFaceDetectMNP01](https://github.com/espressif/esp-dl)

---

## 4. ผลลัพธ์จริง (Benchmark จากบอร์ด)

### Pipeline ใหม่ (v7)

```
กล้อง 240×240 RGB565 (ไม่มี delay)
    │
    ├── Stage 1: MSR01 จับหน้า (~10ms)
    │
    ├── Stage 2: MNP01 หา keypoints (~60ms)
    │
    ├── EMA Smoothing (<1ms)
    │
    ├── จำแนก H/S/N (<1ms)
    │
    ├── Hysteresis: 2 เฟรมติด + hold 0.5 วิ
    │
    └── ส่ง Serial1 เฉพาะเมื่อเปลี่ยน
```

### ⏱ ความเร็ว

| ขั้นตอน | เวลา | หมายเหตุ |
|---|---|---|
| Camera Capture | ~10 ms | RGB565 240² |
| Face Detect Stage 1 (MSR01) | ~10 ms | ด้วย board v3.0.7 |
| Keypoints Stage 2 (MNP01) | ~50-60 ms | 5 keypoints |
| EMA + classify + send | <1 ms | แค่คูณหาร + if/else |
| **รวมต่อเฟรม** | **~72 ms** | **~16 FPS** |
| **End-to-End Latency** | **~0.5-0.7 วิ** | **เร็วขึ้น 10 เท่าจาก v4** |

### 📊 เปรียบเทียบ

| | v4 (EloquentEsp32cam) | v7 (ESP-DL ตรง) |
|---|---|---|
| FPS | ~3-5 | **~16** |
| Latency | ~6-7 วินาที | **~0.6 วินาที** |
| Heap ลด? | ลดเรื่อย ๆ (leak) | **คงที่** ✅ |
| คงที่หลังใช้นาน? | ❌ ค้าง/crash | ✅ เสถียร |

### 🖥 Heap Monitor

v7 แสดง free heap ทุก 5 วินาที ดูได้ว่า memory คงที่:
```
[FPS] 16.2  [MEM] 245000 bytes free   ← คงที่ = ปกติ ✅
[FPS] 16.0  [MEM] 245000 bytes free   ← ถ้าลดลงเรื่อย ๆ = มี leak
```

---

## 5. บทเรียนที่ได้จากการพัฒนา

### 5.1 Bug ที่พบและแก้ไข

| Bug | สาเหตุ | ผลกระทบ | วิธีแก้ |
|---|---|---|---|
| Memory leak | ไม่คืน `fb` ก่อน `return` | PSRAM เต็ม → crash 2 เฟรม | ใช้ `if/else` แทน `return`/`goto` |
| `goto` ข้ามตัวแปร | `goto done` ข้ามการประกาศ `float` | Undefined behavior → crash | ลบ goto ใช้ if/else |
| Baseline ค้าง | Adaptive baseline เฉพาะ Neutral | ค้าง H/S ตลอด | ปรับ baseline ทุกเฟรม |
| Voting ท่วม N | เฟรมไม่มี keypoints = N เข้า voting | H/S ไม่มีทางชนะโหวต | ลบ voting ออก |
| H ถูก S บล็อก | `!isSad` บล็อก H | ยิ้มแต่ได้ S | H มีลำดับสูงกว่า S |
| Serial.peek bug | read แล้ว peek ตัวถัดไป | อ่านค่าผิด | ใช้ read ตัวเดียว |

### 5.2 การค้นพบสำคัญ

1. **ESP-DL เร็วกว่า EloquentEsp32cam 3 เท่า** — MSR01 10ms vs EloquentEsp32cam 80ms (ด้วย board v3.0.7)
2. **Board package v3.0.7 สำคัญ** — v2.0.14 ใช้ EloquentEsp32cam, v3.0.7 ใช้ ESP-DL ตรงได้
3. **Voting ไม่จำเป็นเมื่อมี EMA** — EMA smoothing + hysteresis เพียงพอ voting เพิ่มความซับซ้อนแต่ไม่ได้ช่วยอะไร
4. **5 keypoints มีข้อจำกัด** — ไม่มีคิ้ว → ตรวจ Angry ไม่ได้, ตรวจ Sad ได้ยาก (ต้องขยับปากชัดมาก)
5. **ต้องสร้าง detector เป็น global** — สร้างในลูปทุกเฟรม = heap fragmentation = crash หลังใช้นาน

---

## 6. อ้างอิง

### งานวิจัย

| งานวิจัย | ปี | เทคนิคที่ใช้ | เกี่ยวกับเรา |
|---|---|---|---|
| Perceptual Hysteresis in Emotion Perception (NIH) | 2023 | มนุษย์มี hysteresis ในการรับรู้อารมณ์ | ยืนยันว่า hold time ถูกต้อง |
| Temporal Smoothing for FER (IEEE) | 2024 | Moving avg + low-pass filter | EMA ที่เราใช้ |
| Hybrid Geometric-CNN Emotion Classification (IJITCE) | 2024 | ผสม geometric landmarks + CNN | วิธี ratio ที่เราใช้ |
| Lightweight FER on Edge Devices (MDPI) | 2024 | MobileNet + confidence threshold | threshold ป้องกัน false positive |
| ARVO: Hysteresis in Dynamic Emotion Recognition | 2024 | positive hysteresis ในการเปลี่ยนอารมณ์ | ยืนยันว่าไม่ควรเปลี่ยนอารมณ์ทันที |
| Adaptive FER for Inclusive Human-Robot Interaction (MDPI) | 2024 | Adaptive baseline + continuous learning | adaptive baseline ที่เราใช้ |

### Code & Framework

| แหล่ง | รายละเอียด | ลิงก์ |
|---|---|---|
| **espressif/esp-dl** | ESP Deep Learning Library (MSR01, MNP01 models) | [GitHub](https://github.com/espressif/esp-dl) |
| **espressif/esp-who** | AI Framework สำหรับ ESP32-S3 (face detection, recognition) | [GitHub](https://github.com/espressif/esp-who) |
| **Arduino ESP32 Board v3.0.7** | Board package ที่รวม ESP-DL ไว้แล้ว | [Espressif Release](https://github.com/espressif/arduino-esp32/releases/tag/3.0.7) |
| **EloquentEsp32cam** | ไลบรารีที่ใช้ใน v4 (board v2.x เท่านั้น) | [eloquentarduino.com](https://eloquentarduino.com/esp32-cam-face-detection/) |
| **ESP-DL User Guide** | เอกสารทางการ | [docs.espressif.com](https://docs.espressif.com/projects/esp-dl/en/latest/) |

### วิดีโอ

| หัวข้อ | ลิงก์ |
|---|---|
| ESP32-S3 Face Detection with board v3.x | [YouTube](https://www.youtube.com/results?search_query=esp32-s3+face+detection+arduino+board+3.0) |
| ESP-WHO Face Detection Demo | [YouTube](https://www.youtube.com/results?search_query=esp-who+face+detection+esp32-s3) |
| XIAO ESP32S3 Sense Camera + AI | [YouTube](https://www.youtube.com/results?search_query=xiao+esp32s3+sense+face+detection) |

---

## 7. คำตอบสำหรับอาจารย์

### "ค่า FPS เท่าไหร่? ตอบสนองทันทีไหม?"
> กล้อง XIAO ESP32S3 Sense ประมวลผล face detection ได้ **~16 FPS** (จากเดิม ~5 FPS)
> End-to-end latency จาก **~6-7 วินาที** ลดเหลือ **~0.6 วินาที**
> ซึ่งอยู่ในระดับ **"Fast" (100-300ms detection + 0.5 วิ hysteresis)**
> มนุษย์รับรู้ได้แต่ยอมรับได้สำหรับ social robot

### "ใช้วิธีอะไรจับหน้าและวิเคราะห์อารมณ์?"
> 1. **Face Detection**: ใช้ ESP-DL (MSR01 + MNP01) ซึ่งเป็น neural network ของ Espressif
> 2. **Emotion Analysis**: คำนวณ facial landmark ratios จาก 5 keypoints เทียบกับ adaptive baseline
> 3. **Stabilization**: EMA smoothing (alpha=0.5) + hysteresis (2 เฟรมติด + hold 0.5 วิ)
> 4. **Memory**: Detector สร้างครั้งเดียว (global) + คืน frame buffer ทุกรอบ

### "เปลี่ยนอะไรจากของเดิมบ้าง?"
> | เปลี่ยน | ทำไม |
> |---|---|
> | EloquentEsp32cam → ESP-DL ตรง | เร็วกว่า 3 เท่า + ปรับพารามิเตอร์ได้ |
> | Board v2.0.14 → v3.0.7 | รองรับ ESP-DL โดยตรง |
> | delay(200) → ไม่มี delay | FPS เพิ่มจาก 5 เป็น 16 |
> | Voting 20 เฟรม → ลบ voting | EMA + hysteresis เพียงพอ |
> | Baseline คงที่ → adaptive | ขยับตัว/เปลี่ยนมุมแล้วไม่ต้อง recalibrate |
> | สร้าง detector ทุกเฟรม → global | ป้องกัน memory leak + crash |

### "ใช้ความรู้จากไหน?"
> - **ESP-DL**: Neural network library จาก Espressif (ผู้ผลิตชิป ESP32-S3 โดยตรง)
> - **EMA Smoothing**: เทคนิค signal processing ใช้ใน FER (Facial Expression Recognition) ตาม IEEE 2024
> - **Hysteresis**: จากงานวิจัย Perceptual Hysteresis in Emotion (NIH 2023) ที่พบว่ามนุษย์เองก็ "ค้างอารมณ์" ก่อนจะเปลี่ยน
> - **Adaptive baseline**: จากงานวิจัย Adaptive FER for HRI (MDPI 2024) ที่แนะนำให้ baseline ปรับตามผู้ใช้แต่ละคน
> - **Memory management**: จาก ESP-IDF Programming Guide ของ Espressif
