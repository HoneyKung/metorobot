/*
 * Robo.ino v2 — Natural Emotion Response System
 * 
 * ปรับปรุงจาก v1:
 *   1. NEVER SNAP  — ใช้ lerp/easing ค่อยๆ เปลี่ยนตา (ไม่สลับทันที)
 *   2. HOLD EMOTION — ค้างอารมณ์อย่างน้อย 2 วิก่อนเปลี่ยน
 *   3. ADD NOISE    — เติม micro-movement ที่ม่านตา + random variation
 *   4. IDLE ALWAYS  — กระพริบ + เหลือบมอง + ม่านตาเลื่อน + ถอนหายใจ
 *   5. BODY + FACE  — เซอร์โวหัว lerp ราบรื่น
 * 
 * กล้อง FullCam.ino v7 ส่ง: L/C/R (ตำแหน่ง) + H/S/N/X (อารมณ์)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h> 
#include <SPI.h>
#include <TFT_eSPI.h>

// =====================================================================
// WiFi
// =====================================================================
const char* ssid = "RobotMDT";  
const char* password = "";         
WebServer server(80);

// =====================================================================
// อุปกรณ์
// =====================================================================
TFT_eSPI tft = TFT_eSPI();
Servo servoHand1, servoHand2, servoArm1, servoArm2, servoHead;

// =====================================================================
// พิน
// =====================================================================
// เซอร์โว
const int SERVO_HAND_1_PIN = 32;
const int SERVO_HAND_2_PIN = 33;
const int SERVO_ARM_1_PIN = 25;
const int SERVO_ARM_2_PIN = 26;
const int SERVO_HEAD_PIN = 27;

// มอเตอร์
const int MOTOR_IN3_PIN = 13; 
const int MOTOR_IN4_PIN = 12; 
const int MOTOR_IN2_PIN = 14;
const int MOTOR_IN1_PIN = 21;  
const int MOTOR_ENA_PIN = 22;  
const int MOTOR_EMB_PIN = 23;  

// เซนเซอร์
const int SENSOR_LEFT_PIN = 15;
const int SENSOR_RIGHT_PIN = 34;   

// กล้อง Serial2
const int CAM_RX_PIN = 35;
const int CAM_TX_PIN = 2;

// =====================================================================
// ค่าจอตา (คงที่)
// =====================================================================
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240
#define EYE_Y_BASE ((SCREEN_HEIGHT / 2) - 10)
#define EYE_R_X ((SCREEN_WIDTH / 2) + 80)
#define EYE_L_X ((SCREEN_WIDTH / 2) - 80)
#define EYE_RX 55           // ความกว้างตา (คงที่)
#define TEAR_COLOR 0x04DF   // สีน้ำตา

// =====================================================================
// Eye Parameter System — ค่าที่ lerp ได้ทุกตัว
// =====================================================================
struct EyeParams {
  float eyeRY;           // ความสูงตาขาว (60=ปกติ, 20=หรี่, 4=ปิด)
  float pupilRX;         // ความกว้างรูม่านตา
  float pupilRY;         // ความสูงรูม่านตา
  float pupilOffX;       // รูม่านตาขยับซ้ายขวา (- = ซ้าย, + = ขวา)
  float pupilOffY;       // รูม่านตาขยับบนล่าง (- = ขึ้น, + = ลง)
  float eyeOffY;         // ตาทั้งดวงขยับขึ้นลง
  float lidAngleL;       // มุมเปลือกตาซ้าย (-1=เศร้า, 0=ปกติ, 1=โกรธ)
  float lidAngleR;       // มุมเปลือกตาขวา
  float lidAmount;       // เปลือกตาปิดเท่าไหร่ (0=เปิด, 1=ปิดเต็ม)
  float happySquint;     // ตาหยีล่าง happy (0=ไม่มี, 1=เต็ม)
  bool  showTear;        // แสดงน้ำตา
  bool  showShock;       // แสดงตาช็อก (วงแดง + ม่านตาเล็ก)
};

// === Emotion Presets ===
// ค่าเริ่มต้นของแต่ละอารมณ์ (จะถูก random variation เล็กน้อยก่อนใช้)
EyeParams getPreset(char emotion) {
  EyeParams p;
  p.showTear = false;
  p.showShock = false;
  p.lidAngleL = 0;
  p.lidAngleR = 0;
  p.lidAmount = 0;
  p.happySquint = 0;
  
  switch (emotion) {
    case 'N': // Normal
      p.eyeRY     = 60;
      p.pupilRX   = 30;
      p.pupilRY   = 20;
      p.pupilOffX = 0;
      p.pupilOffY = 20;   // ม่านตาอยู่กลาง-ล่างนิด
      p.eyeOffY   = 0;
      break;
      
    case 'H': // Happy
      p.eyeRY     = 60;
      p.pupilRX   = 30;
      p.pupilRY   = 20;
      p.pupilOffX = 0;
      p.pupilOffY = 0;
      p.eyeOffY   = 20;   // ตาเลื่อนลง
      p.happySquint = 1.0; // ปิดล่างแบบยิ้ม
      break;
      
    case 'S': // Sad
      p.eyeRY     = 60;
      p.pupilRX   = 30;
      p.pupilRY   = 20;
      p.pupilOffX = 0;
      p.pupilOffY = 30;   // ม่านตาตก
      p.eyeOffY   = 20;
      p.lidAngleL = -1;   // เฉียงเศร้า (ซ้าย: ตกฝั่ง L)
      p.lidAngleR = -1;   // เฉียงเศร้า (ขวา: ตกฝั่ง R)
      p.lidAmount = 0.6;
      p.showTear  = true;
      break;
      
    case 'A': // Angry
      p.eyeRY     = 60;
      p.pupilRX   = 30;
      p.pupilRY   = 20;
      p.pupilOffX = 0;
      p.pupilOffY = 30;
      p.eyeOffY   = 20;
      p.lidAngleL = 1;    // เฉียงโกรธ (ซ้าย: ตกฝั่ง R)
      p.lidAngleR = 1;    // เฉียงโกรธ (ขวา: ตกฝั่ง L)
      p.lidAmount = 0.6;
      break;
      
    case 'O': // Shocked
      p.eyeRY     = 60;
      p.pupilRX   = 15;   // ม่านตาเล็ก
      p.pupilRY   = 10;
      p.pupilOffX = 0;
      p.pupilOffY = 0;    // ม่านตากลาง
      p.eyeOffY   = 0;
      p.showShock = true;
      break;
      
    default: // Fallback = Normal
      return getPreset('N');
  }
  return p;
}

// Eye state
EyeParams currentEye;      // ค่าปัจจุบัน (กำลังแสดงผล)
EyeParams targetEye;       // ค่าเป้าหมาย (จะ lerp ไปหา)

// =====================================================================
// Lerp / Easing
// =====================================================================
float lerpf(float a, float b, float t) {
  return a + (b - a) * t;
}

#define LERP_SPEED 0.12f    // ต่อเฟรม — ~30fps → ~300ms ถึง 95%
#define SNAP_THRESHOLD 0.5f // ถ้าใกล้พอ → snap

void lerpEyeParams() {
  currentEye.eyeRY       = lerpf(currentEye.eyeRY,       targetEye.eyeRY,       LERP_SPEED);
  currentEye.pupilRX     = lerpf(currentEye.pupilRX,     targetEye.pupilRX,     LERP_SPEED);
  currentEye.pupilRY     = lerpf(currentEye.pupilRY,     targetEye.pupilRY,     LERP_SPEED);
  currentEye.pupilOffX   = lerpf(currentEye.pupilOffX,   targetEye.pupilOffX,   LERP_SPEED);
  currentEye.pupilOffY   = lerpf(currentEye.pupilOffY,   targetEye.pupilOffY,   LERP_SPEED);
  currentEye.eyeOffY     = lerpf(currentEye.eyeOffY,     targetEye.eyeOffY,     LERP_SPEED);
  currentEye.lidAngleL   = lerpf(currentEye.lidAngleL,   targetEye.lidAngleL,   LERP_SPEED);
  currentEye.lidAngleR   = lerpf(currentEye.lidAngleR,   targetEye.lidAngleR,   LERP_SPEED);
  currentEye.lidAmount   = lerpf(currentEye.lidAmount,   targetEye.lidAmount,   LERP_SPEED);
  currentEye.happySquint = lerpf(currentEye.happySquint, targetEye.happySquint, LERP_SPEED);
  
  // Snap if close enough
  if (fabsf(currentEye.eyeRY - targetEye.eyeRY) < SNAP_THRESHOLD) currentEye.eyeRY = targetEye.eyeRY;
  if (fabsf(currentEye.lidAmount - targetEye.lidAmount) < 0.01f) currentEye.lidAmount = targetEye.lidAmount;
  if (fabsf(currentEye.happySquint - targetEye.happySquint) < 0.01f) currentEye.happySquint = targetEye.happySquint;
  
  // Boolean states snap immediately
  currentEye.showTear  = targetEye.showTear;
  currentEye.showShock = targetEye.showShock;
}

// =====================================================================
// Emotion State Machine
// =====================================================================
enum EmotionState { EMO_IDLE, EMO_TRANSITIONING, EMO_HOLDING };

EmotionState emoState = EMO_IDLE;
char currentEmotion = 'N';
unsigned long emoChangeTime = 0;
#define EMO_HOLD_MS 2000    // ค้างอารมณ์อย่างน้อย 2 วินาที

void requestEmotionChange(char newEmo) {
  // ถ้าเหมือนเดิม → ไม่ทำอะไร
  if (newEmo == currentEmotion) return;
  
  // ถ้ายังไม่ครบ hold time → ไม่เปลี่ยน
  if (millis() - emoChangeTime < EMO_HOLD_MS && emoState == EMO_HOLDING) return;
  
  // เปลี่ยน!
  currentEmotion = newEmo;
  emoChangeTime = millis();
  emoState = EMO_TRANSITIONING;
  
  // ตั้ง target พร้อม random variation
  targetEye = getPreset(newEmo);
  addEmotionVariation();
  
  Serial.printf("[EMO] → %c\n", newEmo);
}

// เพิ่ม random variation ให้ emotion ไม่ซ้ำกันทุกครั้ง
void addEmotionVariation() {
  targetEye.eyeRY     += random(-2, 3);
  targetEye.pupilOffX += random(-2, 3) * 0.5f;
  targetEye.pupilOffY += random(-2, 3) * 0.5f;
  targetEye.eyeOffY   += random(-1, 2);
}

void updateEmotionFSM() {
  switch (emoState) {
    case EMO_TRANSITIONING:
      // เช็คว่า lerp เสร็จหรือยัง (ดูค่าหลักตัวเดียวก็พอ)
      if (fabsf(currentEye.eyeRY - targetEye.eyeRY) < 1.0f &&
          fabsf(currentEye.lidAmount - targetEye.lidAmount) < 0.05f) {
        emoState = EMO_HOLDING;
      }
      break;
      
    case EMO_HOLDING:
      // แค่รอ — hold time เช็คใน requestEmotionChange()
      break;
      
    case EMO_IDLE:
    default:
      break;
  }
}

// =====================================================================
// Noise — Pupil Micro-Movement
// =====================================================================
float noiseX = 0, noiseY = 0;

void updateNoise() {
  // เปลี่ยน noise ทีละนิด (ไม่กระโดด)  
  float newNoiseX = random(-15, 16) * 0.1f;  // ±1.5
  float newNoiseY = random(-10, 11) * 0.1f;  // ±1.0
  noiseX = lerpf(noiseX, newNoiseX, 0.15f);
  noiseY = lerpf(noiseY, newNoiseY, 0.15f);
}

// =====================================================================
// Idle Behaviors — กระพริบ + เหลือบมอง + ถอนหายใจ
// =====================================================================
bool isExecutingCommand = false;

// --- Blink ---
unsigned long lastBlinkTime = 0;
unsigned long nextBlinkInterval = 3000;
bool inBlinkSequence = false;
int blinkPhase = 0;
int blinkPatternType = 0;
unsigned long blinkPhaseStart = 0;

// เก็บ target ก่อน blink เพื่อกลับไป
EyeParams preBlinkTarget;

// --- Glance ---
unsigned long nextGlanceTime = 0;
bool inGlance = false;
int glancePhase = 0;
unsigned long glancePhaseStart = 0;
float glanceDir = 0;  // -1 = ซ้าย, +1 = ขวา

// --- Sigh ---
unsigned long nextSighTime = 0;
bool inSigh = false;
int sighPhase = 0;
unsigned long sighPhaseStart = 0;

void initIdleTimers() {
  lastBlinkTime = millis();
  nextBlinkInterval = random(2500, 5500);
  nextGlanceTime = millis() + random(5000, 15000);
  nextSighTime = millis() + random(20000, 40000);
}

void updateBlink() {
  unsigned long t = millis();
  
  // เริ่ม blink ใหม่?
  if (!inBlinkSequence && (t - lastBlinkTime >= nextBlinkInterval)) {
    inBlinkSequence = true;
    blinkPhase = 0;
    blinkPhaseStart = t;
    preBlinkTarget = targetEye;  // จำ target เดิม
    
    blinkPatternType = random(0, 5);
    if (blinkPatternType <= 2) blinkPatternType = 0;       // 60% เดี่ยว
    else if (blinkPatternType == 3) blinkPatternType = 1;   // 20% คู่
    else blinkPatternType = 2;                              // 20% สามครั้ง
  }
  
  if (!inBlinkSequence) return;
  
  unsigned long e = t - blinkPhaseStart;
  
  // Helper: ปิดตา
  auto closeLids = [&]() {
    targetEye.eyeRY = 4;
    targetEye.lidAmount = 1.0;
  };
  // Helper: หรี่ตา
  auto halfLids = [&]() {
    targetEye.eyeRY = 20;
    targetEye.lidAmount = 0.5;
  };
  // Helper: เปิดตากลับ
  auto openLids = [&]() {
    targetEye.eyeRY = preBlinkTarget.eyeRY;
    targetEye.lidAmount = preBlinkTarget.lidAmount;
    targetEye.lidAngleL = preBlinkTarget.lidAngleL;
    targetEye.lidAngleR = preBlinkTarget.lidAngleR;
    targetEye.happySquint = preBlinkTarget.happySquint;
  };
  auto finishBlink = [&]() {
    openLids();
    inBlinkSequence = false;
    lastBlinkTime = t;
    nextBlinkInterval = random(2500, 5500);
  };

  if (blinkPatternType == 0) {  // เดี่ยว
    if (blinkPhase == 0 && e >= 0)   { halfLids(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 60)  { closeLids(); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 80)  { halfLids(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 60)  { finishBlink(); }
  }
  else if (blinkPatternType == 1) {  // คู่
    if (blinkPhase == 0 && e >= 0)    { closeLids(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 100) { openLids(); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 180) { closeLids(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 100) { finishBlink(); }
  }
  else if (blinkPatternType == 2) {  // สามครั้ง
    if (blinkPhase == 0 && e >= 0)    { closeLids(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 80)  { openLids(); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 120) { closeLids(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 80)  { openLids(); blinkPhase = 4; blinkPhaseStart = t; }
    else if (blinkPhase == 4 && e >= 120) { closeLids(); blinkPhase = 5; blinkPhaseStart = t; }
    else if (blinkPhase == 5 && e >= 80)  { finishBlink(); }
  }
}

void updateGlance() {
  unsigned long t = millis();
  
  // เริ่ม glance ใหม่?
  if (!inGlance && t >= nextGlanceTime) {
    inGlance = true;
    glancePhase = 0;
    glancePhaseStart = t;
    glanceDir = (random(0, 2) == 0) ? -1.0f : 1.0f;
  }
  
  if (!inGlance) return;
  
  unsigned long e = t - glancePhaseStart;
  float glanceAmount = glanceDir * random(5, 11);  // ±5-10 pixel
  
  if (glancePhase == 0) {
    // ขยับ pupil ไปทาง
    targetEye.pupilOffX = preBlinkTarget.pupilOffX + glanceAmount;
    glancePhase = 1;
    glancePhaseStart = t;
  }
  else if (glancePhase == 1 && e >= 400) {
    // ค้างแป๊บ แล้วกลับ
    targetEye.pupilOffX = preBlinkTarget.pupilOffX;
    glancePhase = 2;
    glancePhaseStart = t;
  }
  else if (glancePhase == 2 && e >= 300) {
    inGlance = false;
    nextGlanceTime = t + random(5000, 15000);
  }
}

void updateSigh() {
  unsigned long t = millis();
  
  if (!inSigh && t >= nextSighTime) {
    inSigh = true;
    sighPhase = 0;
    sighPhaseStart = t;
  }
  
  if (!inSigh) return;
  
  unsigned long e = t - sighPhaseStart;
  
  if (sighPhase == 0) {
    // ตาหรี่ลง
    targetEye.eyeRY = 35;
    targetEye.pupilOffY += 5;
    sighPhase = 1;
    sighPhaseStart = t;
  }
  else if (sighPhase == 1 && e >= 800) {
    // กลับปกติ
    EyeParams base = getPreset(currentEmotion);
    targetEye.eyeRY = base.eyeRY;
    targetEye.pupilOffY = base.pupilOffY;
    sighPhase = 2;
    sighPhaseStart = t;
  }
  else if (sighPhase == 2 && e >= 500) {
    inSigh = false;
    nextSighTime = t + random(20000, 40000);
  }
}

void updateIdleBehaviors() {
  if (isExecutingCommand) return;
  if (emoState == EMO_TRANSITIONING) return;  // กำลัง transition → ไม่ idle
  
  updateBlink();
  updateGlance();
  updateSigh();
}

// =====================================================================
// Draw Parametric Eyes — วาดจาก currentEye + noise
// =====================================================================
void drawParametricEyes() {
  tft.fillScreen(TFT_BLACK);
  
  float drawPupilOffX = currentEye.pupilOffX + noiseX;
  float drawPupilOffY = currentEye.pupilOffY + noiseY;
  
  int eyeY = EYE_Y_BASE + (int)currentEye.eyeOffY;
  int eyeRY = max(2, (int)currentEye.eyeRY);
  int pupilRX = max(2, (int)currentEye.pupilRX);
  int pupilRY = max(2, (int)currentEye.pupilRY);
  
  // ===== วาดตาซ้าย =====
  if (currentEye.showShock) {
    // Shock: ตาขาว + วงแดง + ม่านตาเล็ก
    tft.fillEllipse(EYE_L_X, eyeY, EYE_RX, eyeRY, TFT_WHITE);
    tft.fillEllipse(EYE_L_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, 35, 30, TFT_RED);
    tft.fillEllipse(EYE_L_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, pupilRX, pupilRY, TFT_BLACK);
  } else {
    // ตาขาว
    tft.fillEllipse(EYE_L_X, eyeY, EYE_RX, eyeRY, TFT_WHITE);
    // รูม่านตา
    tft.fillEllipse(EYE_L_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, pupilRX, pupilRY, TFT_BLACK);
  }
  
  // Happy squint (ปิดล่าง)
  if (currentEye.happySquint > 0.05f) {
    int squintRY = (int)(20 * currentEye.happySquint);
    tft.fillEllipse(EYE_L_X, eyeY + 50, EYE_RX, squintRY, TFT_BLACK);
  }
  
  // เปลือกตา (lid) — สามเหลี่ยมปิดจากบน
  if (currentEye.lidAmount > 0.05f) {
    int lidH = (int)(currentEye.lidAmount * (eyeRY + 20));
    if (currentEye.lidAngleL < -0.5f) {
      // เศร้า: เฉียงซ้ายตก (มุมนอกอยู่สูงกว่ามุมใน)
      tft.fillTriangle(EYE_L_X - 60, eyeY - 65,
                       EYE_L_X + 60, eyeY - 65,
                       EYE_L_X - 60, eyeY - 65 + lidH, TFT_BLACK);
    } else if (currentEye.lidAngleL > 0.5f) {
      // โกรธ: เฉียงขวาตก (มุมในอยู่สูงกว่ามุมนอก)
      tft.fillTriangle(EYE_L_X - 70, eyeY - 70,
                       EYE_L_X + 70, eyeY - 70,
                       EYE_L_X + 70, eyeY - 70 + lidH, TFT_BLACK);
    } else {
      // ตรง: ปิดจากบนลงมา
      tft.fillRect(EYE_L_X - 60, eyeY - 65, 120, lidH, TFT_BLACK);
    }
  }
  
  // น้ำตา
  if (currentEye.showTear) {
    int tx = EYE_L_X - 35;
    int ty = eyeY + 55;
    int ts = 10;
    tft.fillTriangle(tx, ty, tx - ts, ty + 15, tx + ts, ty + 15, TEAR_COLOR);
    tft.fillCircle(tx, ty + 15, ts, TEAR_COLOR);
  }
  
  // ===== วาดตาขวา =====
  if (currentEye.showShock) {
    tft.fillEllipse(EYE_R_X, eyeY, EYE_RX, eyeRY, TFT_WHITE);
    tft.fillEllipse(EYE_R_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, 35, 30, TFT_RED);
    tft.fillEllipse(EYE_R_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, pupilRX, pupilRY, TFT_BLACK);
  } else {
    tft.fillEllipse(EYE_R_X, eyeY, EYE_RX, eyeRY, TFT_WHITE);
    tft.fillEllipse(EYE_R_X + (int)drawPupilOffX, eyeY + (int)drawPupilOffY, pupilRX, pupilRY, TFT_BLACK);
  }
  
  // Happy squint (ปิดล่าง)
  if (currentEye.happySquint > 0.05f) {
    int squintRY = (int)(20 * currentEye.happySquint);
    tft.fillEllipse(EYE_R_X, eyeY + 50, EYE_RX, squintRY, TFT_BLACK);
  }
  
  // เปลือกตา (lid) — ขวา (สลับทิศกับซ้าย)
  if (currentEye.lidAmount > 0.05f) {
    int lidH = (int)(currentEye.lidAmount * (eyeRY + 20));
    if (currentEye.lidAngleR < -0.5f) {
      // เศร้า: ตาขวาเฉียงฝั่งขวาตก
      tft.fillTriangle(EYE_R_X - 60, eyeY - 65,
                       EYE_R_X + 60, eyeY - 65,
                       EYE_R_X + 60, eyeY - 65 + lidH, TFT_BLACK);
    } else if (currentEye.lidAngleR > 0.5f) {
      // โกรธ: ตาขวาเฉียงฝั่งซ้ายตก
      tft.fillTriangle(EYE_R_X - 70, eyeY - 70,
                       EYE_R_X + 70, eyeY - 70,
                       EYE_R_X - 70, eyeY - 70 + lidH, TFT_BLACK);
    } else {
      tft.fillRect(EYE_R_X - 60, eyeY - 65, 120, lidH, TFT_BLACK);
    }
  }
}

// =====================================================================
// ฟังก์ชัน drawEyes_* แบบเดิม — เรียกผ่าน preset system
// (ใช้ใน executeCommandString / keyboard เหมือนเดิม)
// =====================================================================
void drawEyes_Normal()    { requestEmotionChange('N'); }
void drawEyes_Happy()     { requestEmotionChange('H'); }
void drawEyes_Sad()       { requestEmotionChange('S'); }
void drawEyes_Angry()     { requestEmotionChange('A'); }
void drawEyes_Shocked()   { requestEmotionChange('O'); }

void drawEyes_LookLeft() {
  targetEye.pupilOffX = -15;
  targetEye.pupilOffY = -20;
}
void drawEyes_LookRight() {
  targetEye.pupilOffX = 15;
  targetEye.pupilOffY = -20;
}
void drawEyes_HalfClosed() {
  targetEye.eyeRY = 20;
  targetEye.lidAmount = 0.5;
}
void drawEyes_Closed() {
  targetEye.eyeRY = 4;
  targetEye.lidAmount = 1.0;
}

// =====================================================================
// Servo Lerp System (หันหัวราบรื่น)
// =====================================================================
float currentHeadAngle = 90;
float targetHeadAngle = 90;
unsigned long lastServoMoveTime = 0;
#define SERVO_LERP_SPEED 0.08f
#define SERVO_DETACH_DELAY 2000  // detach หลังหยุด 2 วิ

void updateServoLerp() {
  float prev = currentHeadAngle;
  currentHeadAngle = lerpf(currentHeadAngle, targetHeadAngle, SERVO_LERP_SPEED);
  
  // Snap
  if (fabsf(currentHeadAngle - targetHeadAngle) < 0.5f) {
    currentHeadAngle = targetHeadAngle;
  }
  
  // ถ้ามีการเปลี่ยนค่า → สั่ง servo
  if (fabsf(currentHeadAngle - prev) > 0.3f) {
    if (!servoHead.attached()) servoHead.attach(SERVO_HEAD_PIN, 500, 2400);
    servoHead.write((int)currentHeadAngle);
    lastServoMoveTime = millis();
  }
  
  // ไม่ได้ขยับนาน → detach ป้องกันสั่น
  if (servoHead.attached() && (millis() - lastServoMoveTime > SERVO_DETACH_DELAY)) {
    servoHead.detach();
  }
}

// =====================================================================
// มอเตอร์ (เหมือนเดิมทุกประการ)
// =====================================================================
void stopMotors() {
  digitalWrite(MOTOR_IN1_PIN, LOW); digitalWrite(MOTOR_IN2_PIN, LOW); 
  digitalWrite(MOTOR_IN3_PIN, LOW); digitalWrite(MOTOR_IN4_PIN, LOW); 
  analogWrite(MOTOR_ENA_PIN, 0); analogWrite(MOTOR_EMB_PIN, 0);
}
void goForward() {
  digitalWrite(MOTOR_IN1_PIN, HIGH); digitalWrite(MOTOR_IN2_PIN, LOW);  
  digitalWrite(MOTOR_IN3_PIN, HIGH); digitalWrite(MOTOR_IN4_PIN, LOW);  
  analogWrite(MOTOR_ENA_PIN, 200); analogWrite(MOTOR_EMB_PIN, 200);
}
void goBackward() {
  digitalWrite(MOTOR_IN1_PIN, LOW);  digitalWrite(MOTOR_IN2_PIN, HIGH);
  digitalWrite(MOTOR_IN3_PIN, LOW);  digitalWrite(MOTOR_IN4_PIN, HIGH); 
  analogWrite(MOTOR_ENA_PIN, 200); analogWrite(MOTOR_EMB_PIN, 200);
}
void goLeft() {
  digitalWrite(MOTOR_IN1_PIN, LOW);  digitalWrite(MOTOR_IN2_PIN, HIGH); 
  digitalWrite(MOTOR_IN3_PIN, HIGH); digitalWrite(MOTOR_IN4_PIN, LOW);  
  analogWrite(MOTOR_ENA_PIN, 200); analogWrite(MOTOR_EMB_PIN, 200);
}
void goRight() {
  digitalWrite(MOTOR_IN1_PIN, HIGH); digitalWrite(MOTOR_IN2_PIN, LOW);  
  digitalWrite(MOTOR_IN3_PIN, LOW);  digitalWrite(MOTOR_IN4_PIN, HIGH); 
  analogWrite(MOTOR_ENA_PIN, 200); analogWrite(MOTOR_EMB_PIN, 200);
}

// =====================================================================
// เซอร์โว (attach → write → delay → detach ป้องกันสั่น) — เหมือนเดิม
// =====================================================================
void moveServo(Servo& srv, int pin, int angle, int minUs, int maxUs, int waitMs = 300) {
  srv.attach(pin, minUs, maxUs);
  srv.write(angle);
  delay(waitMs);
  srv.detach();
}

void moveHand1(int angle) { moveServo(servoHand1, SERVO_HAND_1_PIN, angle, 500, 2400); }
void moveHand2(int angle) { moveServo(servoHand2, SERVO_HAND_2_PIN, angle, 500, 2400); }
void moveArm1(int angle)  { moveServo(servoArm1, SERVO_ARM_1_PIN, angle, 500, 2500); }
void moveArm2(int angle)  { moveServo(servoArm2, SERVO_ARM_2_PIN, angle, 500, 2500); }
void moveHead(int angle)  { moveServo(servoHead, SERVO_HEAD_PIN, angle, 500, 2400); }

// =====================================================================
// รันคำสั่ง Blockly — เหมือนเดิม (ใช้ฟังก์ชันเก่าที่ wrap preset ใหม่)
// =====================================================================
void executeCommandString(String cmdString) {
  isExecutingCommand = true;
  int i = 0;
  while (i < cmdString.length()) {
    int delimiterIndex = cmdString.indexOf(';', i);
    if (delimiterIndex == -1) break;
    String cmd = cmdString.substring(i, delimiterIndex);
    cmd.trim();
    
    // เคลื่อนที่
    if (cmd == "w") { drawEyes_Normal(); goForward(); delay(1000); stopMotors(); } 
    else if (cmd == "s") { drawEyes_Normal(); goBackward(); delay(1000); stopMotors(); }
    else if (cmd == "a") { drawEyes_LookLeft(); goLeft(); delay(1000); stopMotors(); drawEyes_Normal(); }
    else if (cmd == "d") { drawEyes_LookRight(); goRight(); delay(1000); stopMotors(); drawEyes_Normal(); }
    else if (cmd == "x") { stopMotors(); }
    else if (cmd == "z") { delay(1000); }
    // มือ แขน หัว
    else if (cmd == "1") { moveHand2(80); }
    else if (cmd == "2") { moveHand2(50); }
    else if (cmd == "3") { moveHand2(20); }
    else if (cmd == "4") { moveHand1(100); }
    else if (cmd == "5") { moveHand1(130); }
    else if (cmd == "6") { moveHand1(160); }
    else if (cmd == "7") { moveHead(50); }
    else if (cmd == "8") { moveHead(90); }
    else if (cmd == "9") { moveHead(130); }
    else if (cmd == "r") { moveArm1(67); }
    else if (cmd == "f") { moveArm1(91); }
    else if (cmd == "v") { moveArm1(121); }
    else if (cmd == "t") { moveArm2(118); }
    else if (cmd == "g") { moveArm2(90); }
    else if (cmd == "b") { moveArm2(60); }
    // ตา
    else if (cmd == "y") { drawEyes_LookLeft(); delay(300); }
    else if (cmd == "u") { drawEyes_Normal(); delay(300); }
    else if (cmd == "i") { drawEyes_LookRight(); delay(300); }
    else if (cmd == "o") { drawEyes_Shocked(); delay(300); }
    else if (cmd == "h") { drawEyes_Happy(); delay(300); }
    else if (cmd == "j") { drawEyes_Sad(); delay(300); }
    else if (cmd == "k") { drawEyes_Angry(); delay(300); }

    i = delimiterIndex + 1;
    delay(50); 
  }

  Serial.println("เสร็จ!");
  drawEyes_Happy();
  delay(1500);
  drawEyes_Normal();

  isExecutingCommand = false;
  lastBlinkTime = millis();
}

// =====================================================================
// Setup
// =====================================================================
void setup() {
  Serial.begin(115200);

  tft.init(); tft.setRotation(1); tft.fillScreen(TFT_BLACK);
  
  // ตั้งค่าตาเริ่มต้น
  currentEye = getPreset('N');
  targetEye = currentEye;
  drawParametricEyes();

  // เซอร์โวเริ่มต้น
  servoHand1.attach(SERVO_HAND_1_PIN, 500, 2400); servoHand2.attach(SERVO_HAND_2_PIN, 500, 2400);
  servoArm1.attach(SERVO_ARM_1_PIN, 500, 2500);   servoArm2.attach(SERVO_ARM_2_PIN, 500, 2500);
  servoHead.attach(SERVO_HEAD_PIN, 500, 2400);
  
  // มอเตอร์
  pinMode(MOTOR_ENA_PIN, OUTPUT); pinMode(MOTOR_IN1_PIN, OUTPUT); 
  pinMode(MOTOR_IN2_PIN, OUTPUT); pinMode(MOTOR_EMB_PIN, OUTPUT); 
  pinMode(MOTOR_IN3_PIN, OUTPUT); pinMode(MOTOR_IN4_PIN, OUTPUT); 
  pinMode(SENSOR_LEFT_PIN, INPUT); pinMode(SENSOR_RIGHT_PIN, INPUT);

  // WiFi
  WiFi.softAP(ssid, password);
  Serial.print("IP: "); Serial.println(WiFi.softAPIP());

  // Web API
  server.on("/run", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("cmd")) {
      String cmd = server.arg("cmd");
      Serial.println("Web: " + cmd);
      server.send(200, "text/plain", "OK");
      executeCommandString(cmd);
    } else {
      server.send(400, "text/plain", "Empty");
    }
  });
  server.begin();
  
  // ท่าเริ่มต้น
  servoArm2.write(90); servoArm1.write(91); servoHead.write(90);
  servoHand2.write(50); servoHand1.write(130);
  delay(500);
  servoHand1.detach(); servoHand2.detach();
  servoArm1.detach(); servoArm2.detach(); servoHead.detach();

  // กล้อง
  Serial2.begin(9600, SERIAL_8N1, CAM_RX_PIN, CAM_TX_PIN);
  
  // Idle timers
  initIdleTimers();
  
  Serial.println("Robo v2 — Natural Emotion Ready!");
}

// =====================================================================
// Loop
// =====================================================================

// Frame rate control (~30 FPS target)
unsigned long lastFrameTime = 0;
#define FRAME_INTERVAL 33  // ~30fps

void loop() {
  // รับคำสั่ง WiFi
  server.handleClient(); 

  // รับคำสั่งคีย์บอร์ด (เหมือนเดิม)
  if (Serial.available() > 0) {
    char command = Serial.read();
    switch (command) {
      case 'w': goForward(); delay(1000); stopMotors(); break;
      case 's': goBackward(); delay(1000); stopMotors(); break;
      case 'a': drawEyes_LookLeft(); goLeft(); delay(1000); stopMotors(); drawEyes_Normal(); break;
      case 'd': drawEyes_LookRight(); goRight(); delay(1000); stopMotors(); drawEyes_Normal(); break;
      case 'x': case ' ': stopMotors(); break;
      case '4': moveHand1(100); break;
      case '5': moveHand1(130); break;
      case '6': moveHand1(160); break;
      case '3': moveHand2(20); break;
      case '2': moveHand2(50); break;
      case '1': moveHand2(80); break;
      case '7': moveHead(50); break;
      case '8': moveHead(90); break;
      case '9': moveHead(130); break;
      case 'r': moveArm1(67); break;
      case 'f': moveArm1(91); break;
      case 'v': moveArm1(121); break;
      case 't': moveArm2(118); break;
      case 'g': moveArm2(90); break;
      case 'b': moveArm2(60); break;
      case 'y': drawEyes_LookLeft(); break;
      case 'u': drawEyes_Normal(); break;
      case 'i': drawEyes_LookRight(); break;
      case 'o': drawEyes_Shocked(); break;
      case 'h': drawEyes_Happy(); break;
      case 'j': drawEyes_Sad(); break;
      case 'k': drawEyes_Angry(); break;
    }
  }

  // รับข้อมูลกล้อง (L/C/R=ตำแหน่ง H/S/N=อารมณ์ X=ไม่เจอหน้า)
  if (!isExecutingCommand && Serial2.available() > 0) {
    char cam = Serial2.read();

    // กรอง noise
    if (cam != 'L' && cam != 'C' && cam != 'R' &&
        cam != 'H' && cam != 'S' && cam != 'A' && 
        cam != 'N' && cam != 'X') {
      // ไม่ใช่คำสั่งที่รู้จัก → ข้าม
    } else {
      Serial.printf("[CAM] %c\n", cam);

      switch (cam) {
        // ตำแหน่ง → หันหัว (ผ่าน servo lerp)
        case 'L': targetHeadAngle = 130; break;
        case 'C': targetHeadAngle = 90;  break;
        case 'R': targetHeadAngle = 50;  break;

        // อารมณ์ → เปลี่ยนตา (ผ่าน emotion state machine)
        case 'H': requestEmotionChange('H'); break;
        case 'S': requestEmotionChange('S'); break;
        case 'A': requestEmotionChange('A'); break;
        case 'N': requestEmotionChange('N'); break;

        // ไม่เจอหน้า → กลับปกติ + หันหัวกลับ
        case 'X':
          requestEmotionChange('N');
          targetHeadAngle = 90;
          break;
      }
    }
  }

  // === Animation Frame Update (~30 FPS) ===
  unsigned long now = millis();
  if (now - lastFrameTime >= FRAME_INTERVAL) {
    lastFrameTime = now;
    
    if (!isExecutingCommand) {
      // 1. Emotion state machine
      updateEmotionFSM();
      
      // 2. Idle behaviors (blink, glance, sigh)
      updateIdleBehaviors();
      
      // 3. Noise
      updateNoise();
      
      // 4. Servo lerp (หัว)
      updateServoLerp();
      
      // 5. Lerp eye params
      lerpEyeParams();
      
      // 6. Draw!
      drawParametricEyes();
    }
  }
}