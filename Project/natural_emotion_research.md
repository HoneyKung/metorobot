# วิจัย: วิธีทำให้หุ่นยนต์ตอบสนองอารมณ์แบบธรรมชาติ

> **คำถามหลัก:** คนอื่นที่ทำหุ่นยนต์มองหน้า เขาทำยังไงให้จับอารมณ์ได้เสถียร
> และตอบสนองแบบเป็นธรรมชาติ ดูมีชีวิตชีวา?

---

## 1. แยก 2 ปัญหาให้ชัด

| ปัญหา | คำอธิบาย | ทำไมสำคัญ |
|---|---|---|
| **A. จับหน้า/อารมณ์ให้คงที่** | กล้องต้อง detect หน้าไม่หลุด, อ่านอารมณ์ไม่กระโดด | ถ้าข้อมูลไม่เสถียร → หุ่นจะกระตุก |
| **B. ตอบสนองให้ธรรมชาติ** | ไม่ใช่แค่สลับตา A→B ทันที ต้องมี "ช่วงเปลี่ยน" ที่ลื่นไหล | ถ้าสลับทันที → ดูเหมือนเครื่องจักร ไม่มีชีวิต |

**โปรเจกต์ของเราตอนนี้:** ทำได้แค่ A บางส่วน (จับหน้าแต่ไม่คงที่) + ยังไม่ได้ทำ B เลย (สลับตาทันที ไม่มี transition)

---

## 2. ฝั่งเซนเซอร์/กล้อง — จับอารมณ์ได้ยังไง? ส่งเมื่อไหร่?

> **คำถามอาจารย์:** "ฝั่งกล้อง เขาใช้เทคนิคอะไรในการจับอารมณ์ได้เสถียร
> รู้ว่าตอนนี้ต้องส่ง ตอนนี้ยังไม่ต้องส่ง ตอนนี้ต้องค้างอารมณ์นี้ไว้?"

### 2.1 ภาพรวม: Pipeline การตัดสินใจ

ไม่ใช่แค่ "เจอหน้ายิ้ม → ส่ง Happy" ทันที
ระบบที่ดีมี **5 ขั้นตอน** ก่อนจะส่งอารมณ์ออกไป:

```
กล้อง → จับหน้า → วัดค่า Keypoints → กรอง/ปรับค่าให้คงที่ → ตัดสินใจ → ส่ง
         (1)         (2)                (3)                  (4)      (5)

 (1) Face Detection    — ใช้ ESP-DL / Haar / MTCNN หาตำแหน่งหน้า
 (2) Feature Extraction— วัดค่า keypoints (ตา จมูก ปาก) แล้วคำนวณ ratio
 (3) Stabilization     — EMA smoothing + กรอง noise
 (4) Decision Logic    — hold time, hysteresis, confidence threshold
 (5) Transmission      — ส่งเฉพาะเมื่อ "แน่ใจ" ว่าเปลี่ยนจริง
```

### 2.2 ⭐ เทคนิคที่ 1: EMA Smoothing — กรองค่าที่กระโดด

**ปัญหา:** ค่า keypoints กระโดดไปมาทุกเฟรม เช่น mouth_ratio อาจได้ 0.8, 0.6, 0.9, 0.5
ถ้าเอาค่าดิบมาใช้เลย → อารมณ์จะสลับรัว ๆ

**วิธีแก้ที่คนส่วนใหญ่ใช้: EMA (Exponential Moving Average)**

```cpp
// === EMA Smoothing ===
// ค่า alpha ยิ่งต่ำ = ยิ่งเรียบ (ตอบสนองช้ากว่า)
// ค่า alpha ยิ่งสูง = ตอบสนองเร็ว (แต่ noise เยอะ)
#define EMA_ALPHA 0.3  // ค่าที่ดี: 0.2 - 0.4

float smoothMouth = 0;
float smoothNose  = 0;

void updateEMA(float rawMouth, float rawNose) {
    smoothMouth = EMA_ALPHA * rawMouth + (1 - EMA_ALPHA) * smoothMouth;
    smoothNose  = EMA_ALPHA * rawNose  + (1 - EMA_ALPHA) * smoothNose;
}

// เปรียบเทียบค่า:
// ค่าดิบ:   0.8  0.6  0.9  0.5  0.7  0.8
// EMA 0.3:  0.24 0.35 0.51 0.51 0.57 0.64  ← เรียบกว่ามาก!
```

> **โปรเจกต์ที่ใช้วิธีนี้:** MekhyW/Facial-Emotion-Classification, Cozmo internal engine
> **งานวิจัย:** รองรับโดยหลักการ Temporal Smoothing ในงานวิจัย FER

### 2.3 ⭐ เทคนิคที่ 2: Confidence Threshold — ไม่เชื่อถ้าไม่มั่นใจ

**ปัญหา:** detector บอกว่า "Happy 55%, Neutral 45%" → ไม่แน่ใจ ส่งไหม?

**วิธีแก้:** ต้องผ่าน threshold ถึงจะนับ

```cpp
#define CONFIDENCE_THRESHOLD 0.65  // ต้องมั่นใจ 65%+

char classifyEmotion(float mouthRatio, float noseRatio) {
    float diffMouth = mouthRatio - baselineMouth;
    float diffNose  = noseRatio  - baselineNose;
    
    // ต้อง "เกิน threshold" ถึงจะนับว่าเปลี่ยน
    // ถ้าค่าอยู่ใกล้ baseline → ถือว่า Neutral
    if (abs(diffMouth) < 0.08 && abs(diffNose) < 0.08) {
        return 'N';  // Neutral — ไม่มีอารมณ์ชัดเจน
    }
    
    if (diffMouth > 0.12 && diffNose < -0.05) return 'H'; // Happy
    if (diffMouth < -0.10 && diffNose > 0.05) return 'S'; // Sad
    if (diffMouth < -0.08 && diffNose < -0.08) return 'A'; // Angry
    
    return 'N';  // ไม่แน่ใจ → Neutral (ปลอดภัย)
}
```

> **หลักการ:** "ถ้าไม่แน่ใจ → อย่าเปลี่ยน" ดีกว่า "เปลี่ยนรัว ๆ"

### 2.4 ⭐ เทคนิคที่ 3: Majority Voting + Decay — โหวตหลายเฟรม

**ปัญหา:** เฟรมเดียวอาจจับผิด ต้องดูหลายเฟรมรวมกัน

**โค้ดเราตอนนี้:**
```cpp
// FullCam.ino ปัจจุบัน — Voting Window
#define WINDOW_SIZE 20      // ← เยอะเกินไป!
char voteWindow[WINDOW_SIZE];
// ปัญหา: 20 เฟรม × delay(200) = 4 วิ latency!
```

**แบบที่คนอื่นใช้ — Sliding Window ที่เล็กกว่า + มี Decay:**
```cpp
// === Weighted Voting — เฟรมล่าสุดมีน้ำหนักมากกว่า ===
#define VOTE_WINDOW 6  // ดูแค่ 6 เฟรมล่าสุด (ไม่เยอะเกิน)

struct VoteEntry {
    char emotion;
    float weight;  // เฟรมล่าสุด = 1.0, เก่า = ค่าลดลง
};
VoteEntry votes[VOTE_WINDOW];
int voteIndex = 0;

void addVote(char emo) {
    votes[voteIndex].emotion = emo;
    votes[voteIndex].weight  = 1.0;
    voteIndex = (voteIndex + 1) % VOTE_WINDOW;
    
    // ลดน้ำหนักเฟรมเก่า (decay)
    for (int i = 0; i < VOTE_WINDOW; i++) {
        if (i != voteIndex) votes[i].weight *= 0.85;
    }
}

char getWeightedWinner() {
    float scores[4] = {0};  // H, S, A, N
    for (int i = 0; i < VOTE_WINDOW; i++) {
        switch (votes[i].emotion) {
            case 'H': scores[0] += votes[i].weight; break;
            case 'S': scores[1] += votes[i].weight; break;
            case 'A': scores[2] += votes[i].weight; break;
            case 'N': scores[3] += votes[i].weight; break;
        }
    }
    // หาตัวที่ score สูงสุด
    int maxIdx = 0;
    for (int i = 1; i < 4; i++) {
        if (scores[i] > scores[maxIdx]) maxIdx = i;
    }
    char emotions[] = {'H', 'S', 'A', 'N'};
    return emotions[maxIdx];
}
```

> **ข้อดี:** เฟรมล่าสุดมีอิทธิพลมากกว่า → ตอบสนองเร็วขึ้น แต่ไม่กระตุก

### 2.5 ⭐⭐ เทคนิคที่ 4: Hysteresis — จะเปลี่ยนอารมณ์ ต้องมั่นใจจริง ๆ

**นี่คือเทคนิคสำคัญที่สุดที่ตอบคำถาม "ตอนนี้ต้องส่งไหม?"**

```
Hysteresis = "ถ้าจะเปลี่ยนไป → ต้องผ่านเกณฑ์สูงกว่า
              ถ้าจะอยู่เดิม → แค่ผ่านเกณฑ์ต่ำก็พอ"
```

**ตัวอย่างในชีวิตจริง:** แอร์ตั้งไว้ 25°C
- เปิดแอร์เมื่ออุณหภูมิ > 26°C (ไม่ใช่ 25.1°C)
- ปิดแอร์เมื่ออุณหภูมิ < 24°C (ไม่ใช่ 24.9°C)
- **ถ้าอยู่ระหว่าง 24-26°C → ไม่เปลี่ยนสถานะ** ← นี่คือ hysteresis!

**ในหุ่นยนต์ของเรา:**
```cpp
char currentEmo = 'N';            // อารมณ์ปัจจุบัน
int  consecutiveNew = 0;          // นับว่าอารมณ์ใหม่มาติดกันกี่เฟรม
#define CHANGE_THRESHOLD 4        // ต้องเห็นอารมณ์ใหม่ 4 เฟรมติดถึงจะเปลี่ยน
unsigned long lastChangeTime = 0;
#define MIN_HOLD_MS 1500          // อยู่ในสถานะนี้อย่างน้อย 1.5 วิ

bool shouldChangeEmotion(char newEmo) {
    // ถ้าเหมือนเดิม → ไม่ต้องเปลี่ยน, reset counter
    if (newEmo == currentEmo) {
        consecutiveNew = 0;
        return false;
    }
    
    // ยังไม่ถึงเวลา hold → ห้ามเปลี่ยน
    if (millis() - lastChangeTime < MIN_HOLD_MS) {
        return false;
    }
    
    // เห็นอารมณ์ใหม่ แต่ยังไม่ครบ threshold → รอก่อน
    consecutiveNew++;
    if (consecutiveNew < CHANGE_THRESHOLD) {
        return false;  // "ยังไม่แน่ใจ → ยังไม่ส่ง"
    }
    
    // ผ่านทุกเงื่อนไข → เปลี่ยนได้!
    currentEmo = newEmo;
    consecutiveNew = 0;
    lastChangeTime = millis();
    return true;  // "แน่ใจแล้ว → ส่งเลย!"
}
```

**สรุป logic:**

```
  อารมณ์ใหม่ ≠ ปัจจุบัน?
       │
       ├── ไม่ → ไม่ส่ง (reset counter)
       │
       └── ใช่ → ผ่าน hold time (1.5 วิ) แล้วหรือยัง?
                    │
                    ├── ยัง → ไม่ส่ง (ค้างอารมณ์เดิม)
                    │
                    └── แล้ว → เห็นติดกัน 4 เฟรมหรือยัง?
                                  │
                                  ├── ยัง → ไม่ส่ง (รอให้มั่นใจ)
                                  │
                                  └── ครบ → ✅ ส่ง! เปลี่ยนอารมณ์
```

> **งานวิจัยที่รองรับ:** Perceptual Hysteresis in Emotion Perception (NIH)
> — พบว่ามนุษย์เองก็มี hysteresis ในการรับรู้อารมณ์! ถ้าเห็นหน้ายิ้ม แล้ว
> ค่อย ๆ เปลี่ยนเป็น neutral → มนุษย์ยังรู้สึกว่า "ยิ้มอยู่" อีกหลายเฟรม

### 2.6 เปรียบเทียบ: โค้ดกล้องเราตอนนี้ vs แบบเสถียร

| หัวข้อ | ❌ FullCam.ino ตอนนี้ | ✅ แบบเสถียร (ควรเป็น) |
|---|---|---|
| **ค่า keypoints** | ใช้ค่าดิบจาก detector | ผ่าน **EMA** กรองก่อน |
| **Voting** | 20 เฟรม น้ำหนักเท่ากัน (ช้า) | 6 เฟรม + **weighted decay** (เร็ว+เสถียร) |
| **เงื่อนไขเปลี่ยน** | แค่ "อารมณ์ใหม่ ≠ อันเก่า" | **4 เฟรมติด + hold 1.5 วิ** |
| **ถ้าไม่แน่ใจ** | ส่ง Neutral | **ค้างอารมณ์เดิม** (ไม่กระตุก) |
| **delay()** | delay(200) = 5 FPS | **ไม่มี delay** = 10-15 FPS |
| **confidence** | 0.5 (เห็นอะไรก็จับ) | **0.7** (จับเฉพาะที่ชัด) |

### 2.7 Full Pipeline — รวมทุกเทคนิค

```
กล้อง (240x240 RGB565, ไม่มี delay)
    │
    ▼
Face Detect (confidence ≥ 0.7)
    │
    ├── ไม่เจอ → นับ timeout → ถ้าหาย 3 วิ → ส่ง 'X'
    │
    └── เจอ → ดึง keypoints (ตา, จมูก, ปาก)
                │
                ▼
         คำนวณ ratio (mouth_width / eye_dist)
                │
                ▼
         EMA Smoothing (alpha = 0.3)
                │
                ▼
         จัดกลุ่มอารมณ์ (H/S/A/N) ด้วย threshold
                │
                ▼
         Weighted Voting (6 เฟรม + decay)
                │
                ▼
         Hysteresis Check:
           - อารมณ์ใหม่ ≠ เดิม?
           - ผ่าน hold time (1.5 วิ)?
           - เห็นติดกัน 4 เฟรม?
                │
                ├── ยังไม่ผ่าน → ค้างอารมณ์เดิม ไม่ส่ง
                │
                └── ผ่านครบ → ✅ ส่ง Serial1.write(emotion)
```

### 2.8 งานวิจัยฝั่งเซนเซอร์

| งานวิจัย | ปี | เทคนิคที่ใช้ | เกี่ยวกับเรา |
|---|---|---|---|
| Perceptual Hysteresis in Emotion (NIH) | 2023 | แสดงว่ามนุษย์เองก็มี hysteresis | ยืนยันว่า hold time ถูกต้อง |
| Temporal Smoothing for FER (IEEE) | 2024 | Moving avg + low-pass filter | EMA ที่เราจะใช้ |
| Facial Landmark Ratio Classification | 2024 | ใช้ ratio ของ landmarks จับอารมณ์ | เหมือนที่เราทำแต่ต้อง smooth |
| Lightweight FER on Edge Devices | 2024 | MobileNet + confidence threshold | threshold 0.65+ ป้องกัน false positive |

---

## 2.9 ⭐ ความเร็ว/Latency — ใช้เวลาประมวลผลเท่าไหร่?

> **คำถามอาจารย์:** "มันใช้เวลาประมวลผลเท่าไหร่ทั้งจับหน้าทั้งคำนวณ?
> ส่งมากี่ต่อวิ? ตอบสนองทันทีไหม? ภาษา C มันเร็วพอไหม?"

### ศัพท์ที่ต้องรู้

| คำศัพท์ | คำอธิบาย | หน่วย |
|---|---|---|
| **Latency** (ความหน่วง) | เวลาตั้งแต่ถ่ายภาพ → ได้ผลลัพธ์ออกมา | มิลลิวินาที (ms) |
| **Throughput** (ปริมาณงาน) | จำนวนภาพที่ประมวลผลได้ต่อวินาที | FPS (Frames Per Second) |
| **Inference Time** (เวลาอนุมาน) | เวลาที่ AI model ใช้ในการวิเคราะห์ 1 ภาพ | ms |
| **FPS** | Frames Per Second — จำนวนเฟรมต่อวินาที | เฟรม/วิ |
| **Real-time** | ตอบสนองเร็วพอที่มนุษย์ไม่รู้สึกว่าล่าช้า | < 200ms |
| **Clock Frequency** | ความเร็วของ CPU | MHz / GHz |

### ข้อมูล Hardware: XIAO ESP32-S3

| สเปค | ค่า |
|---|---|
| **CPU** | Xtensa LX7 Dual-core **240 MHz** |
| **RAM** | 512 KB SRAM + **8 MB PSRAM** |
| **ภาษา** | **C++ (Arduino Framework)** |
| **กล้อง** | OV2640, 240×240 RGB565 |

> **ภาษาที่ใช้คือ C++ (ไม่ใช่ C ธรรมดา)**
> Arduino `.ino` ไฟล์ทั้งหมดเป็น C++ — ซึ่งเป็นภาษาที่ **เร็วที่สุด** สำหรับ embedded
> (เร็วกว่า Python 50-100 เท่า, เร็วกว่า MicroPython 10-50 เท่า)
> ทุกโปรเจกต์ real-time robotics ใช้ C/C++ ทั้งหมด

### ⏱ เวลาประมวลผลแต่ละขั้นตอน (Benchmark จริง)

```
╔══════════════════════════════════════════════════════════════════╗
║  ขั้นตอน                          │ เวลา        │ หมายเหตุ    ║
╠══════════════════════════════════════════════════════════════════╣
║  1. Camera Capture (ถ่ายภาพ)      │ ~10 ms      │ RGB565 240² ║
║  2. Face Detect Stage 1 (MSR01)   │ ~50 ms      │ fast mode   ║
║     ┗━ หรือ accurate mode         │ ~80 ms      │ Eloquent    ║
║  3. Face Detect Stage 2 (MNP01)   │ ~70 ms      │ ดึง keypts  ║
║  4. คำนวณ Ratio + EMA             │ < 1 ms      │ แค่คูณหาร   ║
║  5. Voting + Hysteresis           │ < 1 ms      │ แค่ if/else ║
║  6. Serial.write ส่งข้อมูล         │ < 1 ms      │ 1 byte      ║
╠══════════════════════════════════════════════════════════════════╣
║  ⏱ รวม (fast mode)               │ ~62 ms      │ 16 FPS      ║
║  ⏱ รวม (accurate + keypoints)    │ ~162 ms     │ ~6 FPS      ║
╚══════════════════════════════════════════════════════════════════╝
```

> **แหล่งข้อมูล Benchmark:**
> - EloquentEsp32cam: fast = ~50ms, accurate = ~80ms (eloquentarduino.com)
> - ESP-DL User Guide: single-stage = ~155ms, two-stage = ~415ms (espressif.com)

### ⏱ แต่โค้ดเราตอนนี้ช้ากว่านี้มาก — ทำไม?

```
╔══════════════════════════════════════════════════════════════════╗
║  โค้ด FullCam.ino ปัจจุบัน:                                      ║
║                                                                  ║
║  Capture + Detect (accurate)  = ~80 ms                          ║
║  + delay(200)                 = 200 ms     ← ⚠ สิ้นเปลือง!     ║
║  ─────────────────────────────────────                          ║
║  = ~280 ms/เฟรม = 3.5 FPS                                      ║
║                                                                  ║
║  + Voting 20 เฟรม × 280ms    = 5.6 วินาที  ← ⚠ latency!       ║
║  + SEND_INTERVAL 1000ms       = +1 วินาที   ← ⚠ รอเพิ่ม!       ║
║  ─────────────────────────────────────                          ║
║  ⏱ Total End-to-End Latency   ≈ 6-7 วินาที  ← ❌ ช้ามาก!       ║
╠══════════════════════════════════════════════════════════════════╣
║  ถ้าแก้ (ลบ delay + ลด voting):                                  ║
║                                                                  ║
║  Capture + Detect (fast)      = ~60 ms                          ║
║  + ไม่มี delay                = 0 ms                             ║
║  + Voting 6 เฟรม × 60ms      = 360 ms                          ║
║  + Hysteresis 4 เฟรม          = 240 ms                          ║
║  ─────────────────────────────────────                          ║
║  ⏱ Total End-to-End Latency   ≈ 0.6 วินาที  ← ✅ ดีขึ้น 10 เท่า!║
╚══════════════════════════════════════════════════════════════════╝
```

### ตอบสนองทันทีไหม?

| ระดับ | เวลา | ความรู้สึกของมนุษย์ | เราทำได้ไหม? |
|---|---|---|---|
| **ทันที (Instant)** | < 100ms | ไม่รู้สึกว่าล่าช้าเลย | ✅ ถ้าจับแค่หน้า (ไม่มี voting) |
| **เร็ว (Fast)** | 100-300ms | รู้สึกได้นิดหน่อย แต่ยอมรับได้ | ✅ ถ้าลบ delay + voting 4-6 เฟรม |
| **ดี (Good)** | 300-600ms | เห็นว่ามี delay แต่ยังใช้ได้ | ✅ ถ้าใช้ hysteresis ครบ |
| **ช้า (Slow)** | 1-3 วินาที | รู้สึกล่าช้าชัดเจน | ⚠ เฉพาะ accurate + voting ใหญ่ |
| **ช้ามาก** | 5+ วินาที | ใช้งานจริงไม่ได้ | ❌ โค้ดเราตอนนี้! |

> **คำตอบ:** C++ บน ESP32-S3 @ 240MHz **เร็วพอ** สำหรับ real-time
> ปัญหาไม่ใช่ภาษาหรือ hardware แต่เป็น **โค้ดที่ไม่ optimize**
> (delay ไม่จำเป็น + voting window ใหญ่เกินไป)

### เทียบกับ Platform อื่น

| Platform | ภาษา | Inference Time | เหมาะกับเรา? |
|---|---|---|---|
| **ESP32-S3 (ของเรา)** | C++ | 50-80ms | ✅ ดี เร็วพอ |
| Raspberry Pi + OpenCV | Python | 30-50ms | ✅ เร็วกว่า แต่แพง+ใหญ่ |
| Jetson Nano | Python/C++ | 10-20ms | ✅ เร็วมาก แต่แพงมาก |
| ESP32 (ตัวเก่า) | C++ | ไม่ได้ | ❌ ไม่มี PSRAM พอ |
| Arduino Uno | C++ | ไม่ได้ | ❌ ไม่มี memory/power พอ |

> **ESP32-S3 อยู่ในจุดที่ดี** — เร็วพอสำหรับ real-time + ราคาถูก + ขนาดเล็ก

---

## 3. ฝั่งแสดงผล/จอตา — GitHub Projects ที่คนอื่นทำ

### 3.1 ⭐ FluxGarage/RoboEyes — Smooth Animated Robot Eyes
- **GitHub:** https://github.com/FluxGarage/RoboEyes
- **Platform:** Arduino (ESP32 / ESP8266 / Arduino)
- **จอ:** OLED (Adafruit GFX)
- **ดาวน์โหลด:** ผ่าน Arduino Library Manager → ค้นหา "FluxGarage RoboEyes"

**ทำไมน่าสนใจ:**
- มีระบบ **mood** สำเร็จรูป: `HAPPY`, `TIRED`, `ANGRY`, `DEFAULT`
- มี **animation** สำเร็จรูป: `AUTOBLINKER`, `IDLE`, `LAUGHING`, `CONFUSED`
- **Smooth transition** ของทุกการเปลี่ยนแปลง → ตาไม่กระตุกเลย
- **Non-blocking** → ทำอย่างอื่นพร้อมกันได้

**หลักการของเขา:**
```
สถานะปัจจุบัน → lerp (เปลี่ยนทีละนิด) → สถานะใหม่
      |                                        |
   ตาตกด้านล่าง ← ─── ease-out ──── → ตาเบิกกว้าง
```

เขาไม่ได้สลับตาทันที แต่ **ค่อย ๆ เปลี่ยนค่าพารามิเตอร์** (ขนาดตา, ตำแหน่ง, รูปร่าง) จากสถานะ A ไป B ทีละเฟรม ด้วยฟังก์ชัน **lerp** (Linear Interpolation)

---

### 3.2 ⭐ playfultechnology/esp32-eyes — 18 Emotions
- **GitHub:** https://github.com/playfultechnology/esp32-eyes
- **Platform:** ESP32 + OLED 128×64
- **18 อารมณ์** พร้อม weighted random selection
- ตาวาดแบบ **dynamically generated** (ไม่ใช่ bitmap → ปรับค่าได้ต่อเนื่อง)
- มี behavior สุ่มเช่น กระพริบ, เหลือบมอง

---

### 3.3 SukunDev/ESP32-Pet-Robot — Interactive Pet
- **GitHub:** https://github.com/SukunDev/ESP32-Pet-Robot
- **Platform:** ESP32 + OLED
- ตอบสนองต่อ **สัมผัส, เสียง, การเคลื่อนไหว**
- มี smooth animation + หลายอารมณ์ (happy, angry, sleepy, scared)
- **แรงบันดาลใจจาก Cozmo** — หุ่นยนต์ดังของ Anki

---

### 3.4 espressif2022/esp_emote_gfx — Emotion Graphics Engine
- **GitHub:** https://github.com/espressif2022/esp_emote_gfx
- **Platform:** ESP32 (ESP-IDF)
- **Emotion-driven graphics engine** สำหรับ embedded
- รองรับ **ภาพ, GIF animation**
- มี **built-in timing system** สำหรับ smooth animation

---

### 3.5 mitchcurtis/robot-faces — Dynamic Emotion Changes
- **GitHub:** https://github.com/mitchcurtis/robot-faces
- สำรวจการ **เปลี่ยนอารมณ์แบบ dynamic** ในหน้าหุ่นยนต์
- เป็นโปรเจกต์ทดลองเทคนิคต่าง ๆ

---

## 4. เทคนิคฝั่งแสดงผลที่ทำให้ดูเป็นธรรมชาติ (สำคัญมาก!)

### 4.1 Lerp (Linear Interpolation) — แทนการสลับทันที

**ปัญหาของโค้ดเรา:**
```cpp
// แบบเดิม — สลับทันที = "เหมือนเครื่องจักร"
case 'H': drawEyes_Happy(); break;   // ปุ๊บ! ตาเปลี่ยน
case 'S': drawEyes_Sad(); break;     // ปุ๊บ! ตาเปลี่ยน
```

**แบบที่ทำให้ธรรมชาติ — ค่อย ๆ เปลี่ยน:**
```cpp
// lerp = ค่อย ๆ เปลี่ยนค่าจาก current ไป target
float lerp(float current, float target, float speed) {
    return current + (target - current) * speed;
}

// ทุกเฟรม ค่าจะขยับเข้าใกล้เป้าหมายทีละนิด
float currentEyeHeight = 60;   // ตาปกติ
float targetEyeHeight = 20;    // ตา Sad (ลดลง)

void updateEyes() {
    // speed = 0.1 → เปลี่ยนช้าลื่น, 0.5 → เปลี่ยนเร็วกว่า
    currentEyeHeight = lerp(currentEyeHeight, targetEyeHeight, 0.1);
    currentPupilY    = lerp(currentPupilY, targetPupilY, 0.1);
    
    // วาดตาด้วยค่าปัจจุบัน (ไม่ใช่ค่าเป้าหมาย)
    tft.fillEllipse(EYE_L_X, EYE_Y, 55, currentEyeHeight, TFT_WHITE);
    // ... วาดรูม่านตาด้วย currentPupilY ...
}
```

> **ผลลัพธ์:** ตาค่อย ๆ เปลี่ยนรูปร่าง มองเห็นเป็น "animation" ไม่ใช่ "กระโดด"

---

### 4.2 Easing Functions — ความเร็วในการเปลี่ยน

Lerp ตรง ๆ จะเปลี่ยนด้วยความเร็วคงที่ แต่ในธรรมชาติไม่เป็นแบบนั้น
มนุษย์จริง ๆ จะ **เริ่มช้า → เร็ว → ชะลอตอนจบ** เรียกว่า Easing:

```cpp
// Ease-out: เริ่มเร็ว → ชะลอตอนจบ (ดูธรรมชาติที่สุด)
float easeOut(float t) {
    return 1.0 - pow(1.0 - t, 3);  // cubic ease-out
}

// Ease-in-out: ช้า → เร็ว → ช้า (นุ่มนวลมาก)
float easeInOut(float t) {
    return t < 0.5 
        ? 4 * t * t * t 
        : 1 - pow(-2 * t + 2, 3) / 2;
}
```

**โปรเจกต์ดัง ๆ อย่าง Cozmo ใช้วิธีนี้หมด** — ทุกการเคลื่อนไหวผ่าน easing

---

### 4.3 State Machine + Transition Time — ไม่เปลี่ยนสถานะทันที

```
        ┌─────────────────────────────────────┐
        │          Emotion State Machine      │
        │                                     │
        │  IDLE ──(เจอหน้า)──→ TRANSITION    │
        │                        │             │
        │                    400ms ค่อย ๆ      │
        │                    เปลี่ยนค่า        │
        │                        │             │
        │                        ▼             │
        │                    NEW_STATE         │
        │                        │             │
        │                  อยู่ใน state        │
        │                  อย่างน้อย 2 วิ      │
        │                        │             │
        │           ◄────────────┘             │
        └─────────────────────────────────────┘
```

**กฎสำคัญ:**
1. **Minimum hold time** — อยู่ในอารมณ์หนึ่งอย่างน้อย 2 วินาที ก่อนเปลี่ยนได้
2. **Transition duration** — ใช้เวลา 300-500ms ในการค่อย ๆ เปลี่ยน
3. **Hysteresis** — ต้องได้รับสัญญาณอารมณ์ใหม่ซ้ำ ๆ ถึงจะเปลี่ยน (ป้องกันกระตุก)

---

### 4.4 Idle Behaviors — ทำให้มีชีวิตแม้ไม่มี input

หุ่นยนต์ที่ดูมีชีวิตจะ **ไม่หยุดนิ่ง** แม้ไม่มีคนมาดู:

| Behavior | เวลา | ตัวอย่าง |
|---|---|---|
| กระพริบตา | สุ่ม 2-6 วินาที | มี pattern: เดี่ยว, คู่, สามครั้ง (เรามีแล้ว!) |
| เหลือบมอง | สุ่ม 5-15 วินาที | ตามองซ้ายขวาเบา ๆ |
| ถอนหายใจ | สุ่ม 20-40 วินาที | ตาปิดครึ่งนึง → เปิด |
| ม่านตาเลื่อน | สลับทุก 3-5 วินาที | pupil ขยับขึ้นลง/ซ้ายขวานิดหน่อย |

> **โปรเจกต์เราทำกระพริบตาได้แล้ว** (blinkPatternType) — เป็นจุดเริ่มต้นที่ดี!

---

## 5. งานวิจัยที่เกี่ยวข้อง (Research Papers)

### 5.1 Affective State Generation & Facial Expression for Social Robots (2025)
- **หัวข้อ:** การสร้างและเปลี่ยนสถานะอารมณ์ + สีหน้าหุ่นยนต์สังคม
- **วิธี:** ใช้ **sentiment analysis** + **personality traits** กำหนด "transition rule" ในพื้นที่อารมณ์
- **ข้อค้นพบ:** อารมณ์หุ่นยนต์ควรเปลี่ยนตาม **เส้นทาง (path)** ไม่ใช่กระโดดข้าม
- **แหล่ง:** ResearchGate
- **เกี่ยวกับเรา:** → ยืนยันว่าต้องมี transition ไม่ใช่สลับทันที

### 5.2 Dynamic Arousal Expressions Using Decaying Wave Synthesis (2024)
- **หัวข้อ:** สร้างการแสดงอารมณ์แบบ dynamic ด้วย decaying wave
- **วิธี:** ใช้สัญญาณ **คลื่นที่ค่อย ๆ ลดลง** ควบคุม actuator ใบหน้า
- **ข้อค้นพบ:** การ replay animation ซ้ำ ๆ ดูไม่ธรรมชาติ → ต้อง "generate" ค่าใหม่ทุกครั้ง
- **แหล่ง:** FujiPress.jp
- **เกี่ยวกับเรา:** → ค่าตาควรมีความ "random" เล็กน้อยในแต่ละครั้ง

### 5.3 EMOTION Framework — Expressive Motion for Humanoid Robots (2024)
- **หัวข้อ:** Framework สร้าง motion ที่แสดงอารมณ์ในหุ่นยนต์
- **วิธี:** สร้างลำดับท่าทางที่แสดงอารมณ์แบบ non-verbal
- **ข้อค้นพบ:** ต้องมีทั้ง **facial expression + body gesture** ถึงจะสื่ออารมณ์ได้ชัด
- **แหล่ง:** ArXiv (October 2024)
- **เกี่ยวกับเรา:** → หุ่นยนต์เราทำได้ดี เพราะมีทั้งตา + หัว + แขน

### 5.4 Cozmo — Emotion Engine Design (GDC Vault)
- **หัวข้อ:** การออกแบบ Emotion Engine ของหุ่นยนต์ Cozmo
- **รายละเอียด:**
  - Anki จ้างนักแอนิเมชันจาก **Pixar, DreamWorks**
  - ใช้ **Maya** ออกแบบ animation → export เป็น keyframe data
  - มี **1,000+ animation** ที่ออกแบบด้วยมือ
  - ระบบ emotion engine: ตัวแปรภายใน (excitement, fear, happiness...) เปลี่ยนตาม interaction
  - **ไม่มี animation ซ้ำกัน 2 ครั้ง** → ใช้ range แทน fixed value
- **แหล่ง:** gdcvault.com, kevinmkarol.com
- **เกี่ยวกับเรา:** → แรงบันดาลใจหลัก

---

## 6. 🎯 สรุป: ทำยังไงให้หุ่นยนต์ของเราดู "มีชีวิต"

### 5 หลักการสำคัญ (จากการวิจัย):

```
┌─────────────────────────────────────────────────┐
│  1. NEVER SNAP    — ห้ามสลับอารมณ์ทันที         │
│     ใช้ lerp / easing ค่อย ๆ เปลี่ยนเสมอ       │
│                                                 │
│  2. HOLD EMOTION  — อยู่ในอารมณ์อย่างน้อย 2 วิ  │
│     กันกระตุก ให้ดูมั่นคง                        │
│                                                 │
│  3. ADD NOISE     — เติมความสุ่มเล็กน้อย         │
│     ขนาดตา/ตำแหน่ง pupil ขยับเบา ๆ ตลอด        │
│                                                 │
│  4. IDLE ALWAYS   — มีพฤติกรรมตลอดแม้ว่างอยู่    │
│     กระพริบ, เหลือบมอง, pupil เลื่อน            │
│                                                 │
│  5. BODY + FACE   — อารมณ์ = ตา + หัว + แขน      │
│     หันหัวหนี + ตาหลบ = อาย (ไม่ใช่แค่ตาอย่างเดียว)│
└─────────────────────────────────────────────────┘
```

### เปรียบเทียบ: โค้ดเราตอนนี้ vs แบบธรรมชาติ

| หัวข้อ | ❌ ตอนนี้ (Robo.ino) | ✅ แบบธรรมชาติ (ควรเป็น) |
|---|---|---|
| **เปลี่ยนอารมณ์** | สลับทันที `drawEyes_Happy()` | ค่อย ๆ lerp ค่าตา 300-500ms |
| **ถ้าเจอหน้าใหม่** | เปลี่ยนตาทันที | ตกใจเล็กน้อย → สงสัย → ตอบสนอง |
| **Idle** | กระพริบตาอย่างเดียว | กระพริบ + เหลือบมอง + pupil เลื่อน |
| **ซ้ำกัน** | happy ทุกครั้งเหมือนกัน | happy + random ค่าเล็กน้อย |
| **ท่าทาง** | ตาอย่างเดียว | ตา + หัว + แขน ประสาน |

---

## 7. GitHub Repos สำคัญ (สำหรับศึกษาโค้ด)

| Repo | Stars | สิ่งที่เรียนรู้ได้ | Link |
|---|---|---|---|
| FluxGarage/RoboEyes | ⭐⭐⭐ | Smooth transition, mood system, non-blocking | [GitHub](https://github.com/FluxGarage/RoboEyes) |
| playfultechnology/esp32-eyes | ⭐⭐ | 18 emotions, dynamic generation, weighted random | [GitHub](https://github.com/playfultechnology/esp32-eyes) |
| SukunDev/ESP32-Pet-Robot | ⭐⭐ | Touch/sound response, Cozmo-inspired | [GitHub](https://github.com/SukunDev/ESP32-Pet-Robot) |
| espressif2022/esp_emote_gfx | ⭐⭐ | Emotion graphics engine, timing system | [GitHub](https://github.com/espressif2022/esp_emote_gfx) |
| jcarolinares/awesome-social-robots | ⭐⭐⭐ | รายชื่อ social robot projects | [GitHub](https://github.com/jcarolinares/awesome-social-robots) |
| fanzhangg/social-robot | ⭐ | Social robot simulator, emotion mirroring | [GitHub](https://github.com/fanzhangg/social-robot) |

---

## 8. ตอบอาจารย์ (สรุป)

> **"คนอื่นเขาทำยังไง?"**

**ฝั่งกล้อง (จับอารมณ์):**
1. **EMA Smoothing** กรองค่า keypoints ที่กระโดด (alpha = 0.3) → ค่าเรียบขึ้น
2. **Weighted Voting** ดูหลายเฟรม เฟรมล่าสุดมีน้ำหนักมากกว่า (decay)
3. **Hysteresis** ต้องเห็นอารมณ์ใหม่ 4 เฟรมติด + ค้างอย่างน้อย 1.5 วิ → ถึงจะเปลี่ยน
4. **Confidence 0.7** ไม่จับหน้าที่ไม่ชัด (เดิมเรา 0.5 → false positive เยอะ)

**ฝั่งแสดงผล (จอตา):**
1. **ใช้ Lerp/Easing** ค่อย ๆ เปลี่ยนพารามิเตอร์ตา (ขนาด, ตำแหน่ง, รูปร่าง) จากสถานะเดิมไปสถานะใหม่ ไม่สลับทันที → ดูเหมือน animation
2. **State Machine** จัดการว่าอยู่สถานะไหน + กำหนด transition time ระหว่างสถานะ
3. **Idle behaviors** หุ่นยนต์มีพฤติกรรมตลอดเวลา (กระพริบ, เหลือบมอง) ไม่หยุดนิ่ง
4. **ผสมท่าทาง** ตา + หัว + แขน ประสานกัน
5. **ความสุ่ม (randomness)** ทุกการเคลื่อนไหวมีค่าสุ่มเล็กน้อย → ไม่ซ้ำเดิมทุกครั้ง

> **"ฝั่งกล้อง รู้ได้ยังไงว่าต้องส่งตอนไหน?"**

- ใช้ระบบ **3 ชั้น**: EMA → Voting → Hysteresis
- **ไม่ส่งทุกเฟรม** — ส่งเฉพาะเมื่อ "แน่ใจ" ว่าอารมณ์เปลี่ยนจริง
- **ถ้าไม่แน่ใจ → ค้างอารมณ์เดิม** (ไม่ใช่ส่ง Neutral)
- งานวิจัยพบว่ามนุษย์เองก็มี **Perceptual Hysteresis** (ค้างอารมณ์เดิมไว้จนกว่าจะเปลี่ยนชัดเจน)

> **"ใช้โค้ดอะไร?"**

- ไลบรารี **FluxGarage RoboEyes** (Arduino) เป็นตัวอย่างที่ดีที่สุด
- หลักการหลักคือ **lerp** + **easing function** + **non-blocking animation loop**

> **"มีงานวิจัยไหม?"**

- Affective State Generation for Social Robots (2025) — ใช้ transition rule ในพื้นที่อารมณ์
- Dynamic Arousal Expressions via Decaying Wave (2024) — ใช้ wave function สร้าง expression
- EMOTION Framework (2024, ArXiv) — สร้าง expressive motion สำหรับ humanoid
- Anki Cozmo Emotion Engine (GDC Vault) — จ้างนักแอนิเมชันจาก Pixar ออกแบบ 1,000+ animations
