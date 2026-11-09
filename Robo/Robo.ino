/*
 * Robo.ino v3 — Natural Emotion (No-Lerp Edition)
 * 
 * แนวคิด: ใช้ drawEyes แบบเดิม (วาดครั้งเดียว ไม่กระพริบ)
 * แต่เพิ่มระบบจัดการอารมณ์จากงานวิจัย:
 *   1. HOLD EMOTION  — ค้างอารมณ์อย่างน้อย 2 วิก่อนเปลี่ยน
 *   2. IDLE ALWAYS   — กระพริบ + เหลือบมอง (เหมือนเดิมแต่เพิ่ม glance)
 *   3. BODY + FACE   — เซอร์โวหัว lerp ราบรื่น (servo ไม่มีปัญหา flicker)
 *   4. ADD NOISE     — random variation เวลาเปลี่ยนอารมณ์ (ไม่ redraw ทุกเฟรม)
 * 
 * กล้อง FullCam.ino v7 ส่ง: L/C/R (ตำแหน่ง) + H/S/N/X (อารมณ์)
 *
 * Web API:
 *   GET /run?cmd=w;a;w;   → รันคำสั่งจาก Blockly
 *   GET /state            → JSON สถานะปัจจุบัน (อารมณ์/หัว/แขน/busy)
 *                           เว็บใช้ทำ "จอที่ 2" (Digital Twin ของจอ TFT) แบบเรียลไทม์
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>     // mDNS: ให้ใช้ชื่อ MDTrobot.local แทน IP
#include <ESP32Servo.h> 
#include <SPI.h>
#include <TFT_eSPI.h>

// =====================================================================
// WiFi — STA Mode (ต่อ WiFi Router กลาง)
// *** น้องๆ เปลี่ยนชื่อ WiFi และรหัสผ่านตรงนี้ ***
// =====================================================================
const char* sta_ssid     = "NNNYTAN";      // ← ชื่อ WiFi ที่ต้องการเชื่อมต่อ
const char* sta_password = "14769NoL";     // ← รหัส WiFi
const char* mdns_name    = "MDTrobot";     // → เข้าเว็บที่ http://MDTrobot.local
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

// =====================================================================
// Gripper Config — ค่ามุมแขนหนีบ (ปรับตามแขนใหม่ที่มีโค้งเว้า)
// =====================================================================
// Hand1 (ซ้าย): 100=หนีบสุด, 130=กลาง, 160=เปิดสุด
// Hand2 (ขวา):  80=เปิดสุด,  50=กลาง,  20=หนีบสุด (กลับทิศ)
// =====================================================================
#define HAND1_OPEN      160   // เปิดสุด
#define HAND1_CENTER    130   // กลาง
#define HAND1_CLOSE     105   // หนีบสุด (เผื่อ 5° ไม่กดสุด)
#define HAND2_OPEN       80   // เปิดสุด
#define HAND2_CENTER     50   // กลาง
#define HAND2_CLOSE      25   // หนีบสุด (เผื่อ 5° ไม่กดสุด)

#define GRIP_STEP         2   // หนีบทีละ 2°
#define GRIP_STEP_DELAY  30   // ms ระหว่างแต่ละ step
#define GRIP_SAFE_BACK    3   // ถอยกลับ 3° หลังจับ (ป้องกัน stall)
#define GRIP_HOLD_MS    300   // ms รอให้ servo เสถียรก่อนเช็ค

// ตัวแปรเก็บมุมหนีบปัจจุบัน
int currentHand1Angle = HAND1_CENTER;
int currentHand2Angle = HAND2_CENTER;

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
// ค่าจอตา
// =====================================================================
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240
#define EYE_Y (SCREEN_HEIGHT / 2) - 10
#define EYE_R_X (SCREEN_WIDTH / 2) + 80
#define EYE_L_X (SCREEN_WIDTH / 2) - 80
#define EYE_RADIUS 60
#define PUPIL_RADIUS 20
#define TEAR_COLOR  0x04DF
// === สีที่ปรับได้ (ตั้งค่าจริงใน setup — ใช้ tft.color565 แก้ปัญหาสีเพี้ยน) ===
uint16_t HEART_COLOR = 0xF800;  // สีแดงหัวใจ (จะตั้งใน setup)
uint16_t BLUSH_PINK  = 0xFDB8;  // สีชมพูแก้ม (จะตั้งใน setup)

// =====================================================================
// ===== แสดงตา (เหมือนเดิมทุกประการ — วาดครั้งเดียว ไม่กระพริบ) =====
// =====================================================================

void drawEyes_Normal() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20, pupil_rx, pupil_ry, TFT_WHITE);
}

void drawEyes_HalfClosed() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y + 15, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y + 15, eye_rx, eye_ry, TFT_BLACK);
}

void drawEyes_Closed() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55;
  tft.fillRect(EYE_L_X - eye_rx, EYE_Y + 20, eye_rx * 2, 4, TFT_BLACK);
  tft.fillRect(EYE_R_X - eye_rx, EYE_Y + 20, eye_rx * 2, 4, TFT_BLACK);
}

void drawEyes_Shocked() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int red_rx = 35, red_ry = 30;
  int pupil_rx = 15, pupil_ry = 10;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y, red_rx, red_ry, TFT_RED);
  tft.fillEllipse(EYE_L_X, EYE_Y, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y, red_rx, red_ry, TFT_RED);
  tft.fillEllipse(EYE_R_X, EYE_Y, pupil_rx, pupil_ry, TFT_WHITE);
}

void drawEyes_LookLeft() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
}

void drawEyes_LookRight() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
}

void drawEyes_Happy() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  int hpy_rx = 55, hpy_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20-20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_L_X, EYE_Y+20+50, hpy_rx, hpy_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20-20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y+20+50, hpy_rx, hpy_ry, TFT_WHITE);
}

void drawEyes_Sad() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20+30, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillTriangle(EYE_L_X - 60, EYE_Y+20-65, 
                   EYE_L_X + 60, EYE_Y+20-65, 
                   EYE_L_X - 60, EYE_Y+20+10, TFT_WHITE);
  int tx = EYE_L_X - 35, ty = EYE_Y+20+55, ts = 10;
  tft.fillTriangle(tx, ty, tx-ts, ty+15, tx+ts, ty+15, TEAR_COLOR);
  tft.fillCircle(tx, ty+15, ts, TEAR_COLOR);
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20+30, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillTriangle(EYE_R_X - 60, EYE_Y+20-65, 
                   EYE_R_X + 60, EYE_Y+20-65, 
                   EYE_R_X + 60, EYE_Y+20+10, TFT_WHITE);
}

void drawEyes_Angry() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20+30, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillTriangle(EYE_L_X-70, EYE_Y+20-70,
                   EYE_L_X+70, EYE_Y+20-70,
                   EYE_L_X+70, EYE_Y+20-5, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20+30, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillTriangle(EYE_R_X-70, EYE_Y+20-70,
                   EYE_R_X+70, EYE_Y+20-70,
                   EYE_R_X-70, EYE_Y+20-5, TFT_WHITE);
}

// === Sleepy (ตาง่วง หรี่ตา) ===
void drawEyes_Sleepy() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 25;  // ตาหรี่กว่า half-closed
  tft.fillEllipse(EYE_L_X, EYE_Y + 20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y + 25, 20, 12, TFT_WHITE);  // ม่านตาตกล่าง
  tft.fillRect(EYE_L_X - 60, EYE_Y - 5, 120, 20, TFT_WHITE);  // เปลือกตาปิดจากบน
  tft.fillEllipse(EYE_R_X, EYE_Y + 20, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y + 25, 20, 12, TFT_WHITE);
  tft.fillRect(EYE_R_X - 60, EYE_Y - 5, 120, 20, TFT_WHITE);
}

// === Confused (ตางง ม่านตาไม่เท่ากัน) ===
void drawEyes_Confused() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  // ตาซ้าย: ม่านตาเลื่อนขวา-บน
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 10, EYE_Y - 10, pupil_rx, pupil_ry, TFT_WHITE);
  // ตาขวา: ม่านตาเลื่อนซ้าย-ล่าง (ไม่เท่ากัน = งง)
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X - 10, EYE_Y + 15, pupil_rx, pupil_ry, TFT_WHITE);
  // เครื่องหมายคำถาม (?)
  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(4);
  tft.setCursor(EYE_R_X + 45, EYE_Y - 55);
  tft.print("?");
}

// === Love (หัวใจกลางจอ — เต้นกระเพื่อม) ===
void drawHeart(int sz) {
  // วาดหัวใจ 1 ดวงกลางจอ ขนาด sz (ปกติ=1, ใหญ่=2)
  tft.fillScreen(TFT_WHITE);
  int cx = SCREEN_WIDTH / 2;
  int cy = SCREEN_HEIGHT / 2 - 5;
  int r = 28 + sz * 4;       // รัศมีวงกลมบน
  int gap = r - 4;           // ระยะห่างจากกลาง
  int triW = gap + r + 5;    // ความกว้างสามเหลี่ยม
  int triH = r + 20 + sz * 6; // ความสูงปลายหัวใจ
  // วงกลมซ้าย-ขวาบน
  tft.fillCircle(cx - gap, cy - 10, r, HEART_COLOR);
  tft.fillCircle(cx + gap, cy - 10, r, HEART_COLOR);
  // สามเหลี่ยมล่าง (ปลายหัวใจ)
  tft.fillTriangle(cx - triW, cy, cx + triW, cy, cx, cy + triH, HEART_COLOR);
}

void drawEyes_Love() {
  drawHeart(1);  // ขนาดปกติ
}

// === Shy / เขินอาย (ตาเบือน + แก้มแดง) ===
void drawEyes_Shy() {
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 45;  // ตาแคบลงนิด (อาย)
  int pupil_rx = 25, pupil_ry = 18;
  // ตาซ้าย — มองล่าง-ขวา (หลบตา)
  tft.fillEllipse(EYE_L_X, EYE_Y + 10, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 12, EYE_Y + 28, pupil_rx, pupil_ry, TFT_WHITE);
  // เปลือกตาบนปิดนิด
  tft.fillRect(EYE_L_X - 60, EYE_Y - 35, 120, 25, TFT_WHITE);
  // ตาขวา — มองล่าง-ขวา (หลบตา)
  tft.fillEllipse(EYE_R_X, EYE_Y + 10, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X + 12, EYE_Y + 28, pupil_rx, pupil_ry, TFT_WHITE);
  // เปลือกตาบนปิดนิด
  tft.fillRect(EYE_R_X - 60, EYE_Y - 35, 120, 25, TFT_WHITE);
  // แก้มเขิน (ขีดเฉียง // ใต้ตา — สไตล์อนิเมะ)
  int blushY = EYE_Y + 58;   // ตำแหน่ง Y ใต้ตา
  int blushLen = 14;          // ความยาวขีด
  int blushGap = 10;          // ระยะห่างระหว่าง 2 เส้น
  // แก้มซ้าย — ขีดเฉียง 2 เส้น
  for (int t = -1; t <= 1; t++) {  // วาด 3 เส้นซ้อนให้หนา
    tft.drawLine(EYE_L_X - blushGap - blushLen, blushY - blushLen + t, EYE_L_X - blushGap, blushY + t, BLUSH_PINK);
    tft.drawLine(EYE_L_X - blushGap + 6 - blushLen, blushY - blushLen + t, EYE_L_X - blushGap + 6, blushY + t, BLUSH_PINK);
  }
  // แก้มขวา — ขีดเฉียง 2 เส้น
  for (int t = -1; t <= 1; t++) {
    tft.drawLine(EYE_R_X + blushGap, blushY - blushLen + t, EYE_R_X + blushGap + blushLen, blushY + t, BLUSH_PINK);
    tft.drawLine(EYE_R_X + blushGap + 6, blushY - blushLen + t, EYE_R_X + blushGap + 6 + blushLen, blushY + t, BLUSH_PINK);
  }
}

// =====================================================================
// ฟังก์ชันวาดตาตาม char อารมณ์
// =====================================================================
void drawEyesForEmotion(char emo) {
  switch (emo) {
    case 'H': drawEyes_Happy(); break;
    case 'S': drawEyes_Sad(); break;
    case 'A': drawEyes_Angry(); break;
    case 'O': drawEyes_Shocked(); break;
    case 'Z': drawEyes_Sleepy(); break;
    case 'C': drawEyes_Confused(); break;
    case 'V': drawEyes_Love(); break;
    case 'B': drawEyes_Shy(); break;
    case 'N': default: drawEyes_Normal(); break;
  }
}

// =====================================================================
// Emotion State Machine — HOLD EMOTION (จากงานวิจัย)
// =====================================================================
// ค้างอารมณ์อย่างน้อย 2 วิ ก่อนเปลี่ยน — ป้องกันกระตุก
// =====================================================================
char currentEmotion = 'N';
unsigned long emoChangeTime = 0;
bool isExecutingCommand = false;
unsigned long emoAutoRevertTime = 0;  // เวลาที่ต้องกลับ Normal (0=ไม่ต้องกลับ)

#define EMO_HOLD_MS 2000
#define EMO_REVERT_MS 2500  // อารมณ์ค้าง 2.5 วิ แล้วกลับ Normal

// เปลี่ยนอารมณ์ — เช็ค hold time + วาดตาทันที + ท่าทาง BODY+FACE
void requestEmotionChange(char newEmo) {
  if (newEmo == currentEmotion) return;
  if (millis() - emoChangeTime < EMO_HOLD_MS) return;
  
  currentEmotion = newEmo;
  emoChangeTime = millis();
  doBodyGesture(newEmo);  // BODY+FACE: วาดตา + ท่าทางประกอบอารมณ์
  
  Serial.printf("[EMO] → %c\n", newEmo);
}

// บังคับเปลี่ยนทันที (ใช้ใน keyboard — ค้างแล้วกลับ Normal)
void forceEmotionChange(char newEmo) {
  currentEmotion = newEmo;
  emoChangeTime = millis();
  doBodyGesture(newEmo);
  // ตั้งเวลา auto-revert (ยกเว้น Normal และ Love)
  if (newEmo != 'N' && newEmo != 'V') {
    emoAutoRevertTime = millis() + EMO_REVERT_MS;
  } else {
    emoAutoRevertTime = 0;  // Normal/Love ไม่ต้อง revert
  }
}

// =====================================================================
// Servo Lerp System — หันหัวราบรื่น (servo ไม่มีปัญหา flicker)
// =====================================================================
float lerpf(float a, float b, float t) {
  return a + (b - a) * t;
}

float currentHeadAngle = 90;
float targetHeadAngle = 90;
unsigned long lastServoMoveTime = 0;
#define SERVO_LERP_SPEED 0.18f   // ยิ่งสูง = หัวหันเร็ว
#define SERVO_DETACH_DELAY 2000  // detach หลังหยุด 2 วิ

void updateServoLerp() {
  float prev = currentHeadAngle;
  currentHeadAngle = lerpf(currentHeadAngle, targetHeadAngle, SERVO_LERP_SPEED);
  
  if (fabsf(currentHeadAngle - targetHeadAngle) < 0.5f) {
    currentHeadAngle = targetHeadAngle;
  }
  
  if (fabsf(currentHeadAngle - prev) > 0.3f) {
    if (!servoHead.attached()) servoHead.attach(SERVO_HEAD_PIN, 500, 2400);
    servoHead.write((int)currentHeadAngle);
    lastServoMoveTime = millis();
  }
  
  if (servoHead.attached() && (millis() - lastServoMoveTime > SERVO_DETACH_DELAY)) {
    servoHead.detach();
  }
}

// =====================================================================
// BODY + FACE — ท่าทางประกอบอารมณ์ (หัว + แขน)
// =====================================================================
// ค่า servo ที่ปลอดภัย (จาก Blockly commands):
//   Head:  50-130  (center=90) ← ซ้าย-ขวา (ไม่ใช่ก้ม-เงย!)
//   Hand1: 100-160 (center=130)  [left hand]
//   Hand2: 20-80   (center=50)   [right hand]
//   Arm1:  67-121  (center=91)
//   Arm2:  60-118  (center=90)
// =====================================================================

// --- Heartbeat (หัวใจเต้น — เฉพาะ Love mode) ---
unsigned long lastHeartbeatTime = 0;
int heartbeatPhase = 0;

void doBodyGesture(char emo) {
  drawEyesForEmotion(emo);  // แสดงตาตามอารมณ์
  switch (emo) {
    case 'H': {  // Happy (ขี้อาย): โบกมือเบาๆ 2 ครั้ง
      targetHeadAngle = 85;  // หันเฉียงนิด
      servoArm1.attach(SERVO_ARM_1_PIN, 500, 2500);
      servoArm2.attach(SERVO_ARM_2_PIN, 500, 2500);
      servoHand1.attach(SERVO_HAND_1_PIN, 500, 2400);
      servoHand2.attach(SERVO_HAND_2_PIN, 500, 2400);
      servoArm1.write(100); servoArm2.write(80);  // กางแขนไม่เต็มที่ (อายๆ)
      delay(300);
      // โบกมือเบาๆ 2 ครั้ง (สั้นๆ เขินๆ)
      for (int i = 0; i < 2; i++) {
        servoHand1.write(150); servoHand2.write(30);
        delay(200);
        servoHand1.write(125); servoHand2.write(55);
        delay(200);
      }
      servoHand1.write(130); servoHand2.write(50);
      delay(150);
      servoArm1.detach(); servoArm2.detach();
      servoHand1.detach(); servoHand2.detach();
      break;
    }
      
    case 'S':  // Sad (ขี้อาย): แขนกอดตัว + หันหัวหนี
      targetHeadAngle = 75;  // หันหัวหนี
      moveArm1(78);   // แขนหุบกอดตัว
      moveArm2(102);  // แขนหุบกอดตัว
      break;
      
    case 'A':  // Angry (ขี้อาย): น้อยใจ/ตุ่ย หันหัวหนีนิด
      targetHeadAngle = 80;  // หันหนีหน่อย (ไม่สู้หน้า)
      moveArm1(82);   // หุบเบาๆ (ไม่เกร็งมาก)
      moveArm2(98);   // หุบเบาๆ
      break;
      
    case 'O':  // Shocked (ขี้อาย): ตกใจกลัว→ดึงแขนเข้าตัว
      targetHeadAngle = 85;
      moveArm1(75);   // แขนดึงเข้าตัว (กลัว)
      moveArm2(105);  // แขนดึงเข้าตัว
      moveHand1(150); // มือยกป้องตัว
      moveHand2(30);  // มือยกป้องตัว
      break;
      
    case 'Z':  // Sleepy: แขนกลาง + หัวตรง
      targetHeadAngle = 90;
      moveArm1(91);
      moveArm2(90);
      break;
      
    case 'C':  // Confused (ขี้อาย): แขนกลาง + หันหัวหนี
      targetHeadAngle = 75;
      moveArm1(85);
      moveArm2(95);
      break;
      
    case 'V':  // Love: กางแขนออก + หันหัวนิด
      targetHeadAngle = 85;
      moveArm1(105); moveArm2(75);
      lastHeartbeatTime = millis();  // reset heartbeat
      heartbeatPhase = 0;
      break;
      
    case 'B':  // Shy: หันหัวหนี + แขนหุบชิดตัว
      targetHeadAngle = 70;  // หันหนีไปทางซ้าย
      moveArm1(75);   // แขนหุบเข้าตัวเล็กน้อย
      moveArm2(105);  // แขนหุบเข้าตัวเล็กน้อย
      moveHand1(115); // มือพับเข้านิด
      moveHand2(65);  // มือพับเข้านิด
      break;
      
    case 'N':  // Normal: กลับท่าปกติ + หัวตรง
    default:
      targetHeadAngle = 90;
      moveArm1(91);
      moveArm2(90);
      moveHand1(130);
      moveHand2(50);
      break;
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
// เซอร์โว — เหมือนเดิม
// =====================================================================
void moveServo(Servo& srv, int pin, int angle, int minUs, int maxUs, int waitMs = 300) {
  srv.attach(pin, minUs, maxUs);
  srv.write(angle);
  delay(waitMs);
  srv.detach();
}
// มุมปัจจุบันของแขน/หัว — เก็บไว้ให้เว็บอ่านผ่าน /state (Digital Twin)
// หมายเหตุ: บันทึกค่าเท่านั้น ไม่เปลี่ยนพฤติกรรมเซอร์โวเดิม
int currentArm1Angle = 91;
int currentArm2Angle = 90;
int currentHeadCmdAngle = 90;   // มุมหัวจากคำสั่ง Blockly/คีย์บอร์ดล่าสุด

void moveHand1(int angle) { moveServo(servoHand1, SERVO_HAND_1_PIN, angle, 500, 2400); currentHand1Angle = angle; }
void moveHand2(int angle) { moveServo(servoHand2, SERVO_HAND_2_PIN, angle, 500, 2400); currentHand2Angle = angle; }
void moveArm1(int angle)  { moveServo(servoArm1, SERVO_ARM_1_PIN, angle, 500, 2500); currentArm1Angle = angle; }
void moveArm2(int angle)  { moveServo(servoArm2, SERVO_ARM_2_PIN, angle, 500, 2500); currentArm2Angle = angle; }
void moveHead(int angle)  { moveServo(servoHead, SERVO_HEAD_PIN, angle, 500, 2400); currentHeadCmdAngle = angle; }

// =====================================================================
// Gripper Functions — จับของโดยไม่ใช้ spring-loaded
// =====================================================================

// --- gripSync: สั่ง Hand1+Hand2 พร้อมกัน (สมมาตร) ---
// percent: 0=เปิดสุด, 100=หนีบสุด
void gripSync(int percent) {
  percent = constrain(percent, 0, 100);
  int h1 = map(percent, 0, 100, HAND1_OPEN, HAND1_CLOSE);
  int h2 = map(percent, 0, 100, HAND2_OPEN, HAND2_CLOSE);
  
  servoHand1.attach(SERVO_HAND_1_PIN, 500, 2400);
  servoHand2.attach(SERVO_HAND_2_PIN, 500, 2400);
  servoHand1.write(h1);
  servoHand2.write(h2);
  currentHand1Angle = h1;
  currentHand2Angle = h2;
  delay(GRIP_HOLD_MS);
}

// --- gripRelease: ปล่อยของ + detach servo ---
void gripRelease() {
  gripSync(0);  // เปิดสุด
  delay(200);
  servoHand1.detach();
  servoHand2.detach();
  Serial.println("Released");
}

// --- smartGrip: ค่อยๆ หนีบทีละ step (Incremental Grip) ---
// ไม่มี spring-loaded → ต้องค่อยๆ หนีบเพื่อหาจุดที่แน่นพอ
// แล้วถอยกลับนิด ป้องกัน servo stall
void smartGrip() {
  Serial.println("Smart grip...");
  
  // เปิดแขนก่อน
  gripSync(0);
  delay(500);
  
  // ค่อยๆ หนีบทีละ GRIP_STEP %
  for (int pct = 0; pct <= 100; pct += 3) {
    gripSync(pct);
    delay(GRIP_STEP_DELAY);
    
    // TODO: ถ้ามี current sensor สามารถเช็คกระแสได้ที่นี่
    // if (readCurrent() > STALL_THRESHOLD) break;
  }
  
  // ถอยกลับ GRIP_SAFE_BACK% — ไม่กดจน stall
  int safePct = constrain(100 - (GRIP_SAFE_BACK * 2), 0, 100);
  gripSync(safePct);
  
  Serial.printf("Holding at %d%%\n", safePct);
}

// --- safeGrip: จับที่ % ที่กำหนด แล้วถอยนิด ---
void safeGrip(int targetPercent) {
  gripSync(targetPercent);
  delay(GRIP_HOLD_MS);
  
  // ถอย GRIP_SAFE_BACK% เพื่อไม่ให้ stall
  int safePct = constrain(targetPercent - GRIP_SAFE_BACK * 2, 0, 100);
  gripSync(safePct);
  
  Serial.printf("Safe grip at %d%% (target was %d%%)\n", safePct, targetPercent);
}

// --- liftArms: ยกแขนขึ้น (Arm1+Arm2) ---
void liftArms() {
  moveArm1(67);   // ยกแขนซ้ายขึ้น
  moveArm2(118);  // ยกแขนขวาขึ้น
  Serial.println("Arms lifted");
}

// --- lowerArms: วางแขนลง (Arm1+Arm2) ---
void lowerArms() {
  moveArm1(91);   // แขนซ้ายกลาง
  moveArm2(90);   // แขนขวากลาง
  Serial.println("Arms lowered");
}

// --- gripAndVerify: จับ → ยก → เช็คว่าจับได้จริง ---
// ใช้ ultrasonic/IR sensor (ถ้ามี) หรือ retry เพิ่มแรง
void gripAndVerify() {
  Serial.println("Grip & verify...");
  
  // ลดแขนลงตำแหน่งจับ
  lowerArms();
  delay(300);
  
  // หนีบแบบ smart
  smartGrip();
  delay(500);
  
  // ยกขึ้น
  liftArms();
  delay(500);
  
  // TODO: เช็คด้วย sensor ว่าจับได้จริง
  // if (getDistance() < 10) {
  //   Serial.println("[GRIP] Object dropped! Retrying...");
  //   lowerArms();
  //   safeGrip(100);  // หนีบแน่นขึ้น
  //   liftArms();
  // }
  
  Serial.println("[GRIP] Grip & verify done");
}

// =====================================================================
// Idle Behavior Variables (ประกาศก่อนใช้ใน executeCommandString)
// =====================================================================
unsigned long lastBlinkTime = 0;
unsigned long nextBlinkInterval = 3000;
bool inBlinkSequence = false;
int blinkPhase = 0;
int blinkPatternType = 0;
unsigned long blinkPhaseStart = 0;

unsigned long nextGlanceTime = 0;
bool inGlance = false;
int glancePhase = 0;
unsigned long glancePhaseStart = 0;

unsigned long nextSighTime = 0;
bool inSigh = false;
int sighPhase = 0;
unsigned long sighPhaseStart = 0;

// --- Head Look (ใหม่ — หันหัวซ้าย-ขวาเบาๆ) ---
unsigned long nextHeadLookTime = 0;
bool inHeadLook = false;
int headLookPhase = 0;
unsigned long headLookPhaseStart = 0;
float headLookTarget = 90;  // เป้าหมายชั่วคราว

// =====================================================================
// รันคำสั่ง Blockly — เหมือนเดิม
// =====================================================================
void executeCommandString(String cmdString) {
  isExecutingCommand = true;
  int i = 0;
  while (i < cmdString.length()) {
    int delimiterIndex = cmdString.indexOf(';', i);
    if (delimiterIndex == -1) break;
    String cmd = cmdString.substring(i, delimiterIndex);
    cmd.trim();
    
    if (cmd == "w") { drawEyes_Normal(); goForward(); delay(1000); stopMotors(); } 
    else if (cmd == "s") { drawEyes_Normal(); goBackward(); delay(1000); stopMotors(); }
    else if (cmd == "a") { drawEyes_LookLeft(); goLeft(); delay(1000); stopMotors(); drawEyes_Normal(); }
    else if (cmd == "d") { drawEyes_LookRight(); goRight(); delay(1000); stopMotors(); drawEyes_Normal(); }
    else if (cmd == "x") { stopMotors(); }
    else if (cmd == "z") { delay(1000); }
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
    else if (cmd == "y") { drawEyes_LookLeft(); delay(300); }
    else if (cmd == "u") { drawEyes_Normal(); delay(300); }
    else if (cmd == "i") { drawEyes_LookRight(); delay(300); }
    else if (cmd == "o") { drawEyes_Shocked(); delay(300); }
    else if (cmd == "h") { drawEyes_Happy(); delay(300); }
    else if (cmd == "j") { drawEyes_Sad(); delay(300); }
    else if (cmd == "k") { drawEyes_Angry(); delay(300); }
    else if (cmd == "n") { drawEyes_Sleepy(); delay(300); }
    else if (cmd == "c") { drawEyes_Confused(); delay(300); }
    else if (cmd == "l") { drawEyes_Love(); delay(300); }
    else if (cmd == "e") { drawEyes_Shy(); delay(300); }
    // Gripper commands (Blockly)
    else if (cmd == "G") { smartGrip(); }           // จับของ
    else if (cmd == "P") { gripRelease(); }          // ปล่อยของ
    else if (cmd == "Q") { gripAndVerify(); }        // จับ+ยก+เช็ค
    else if (cmd.startsWith("grip:")) {               // จับที่ % เช่น "grip:70"
      int pct = cmd.substring(5).toInt();
      safeGrip(pct);
    }

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
// IDLE Behaviors — กระพริบ + เหลือบมอง (ไม่ redraw ทุกเฟรม!)
// =====================================================================
// ทุก behavior วาดตาเฉพาะตอนเปลี่ยน state — ไม่ loop redraw
// (ตัวแปรประกาศไว้ด้านบนแล้ว)
// =====================================================================

void initIdleTimers() {
  lastBlinkTime = millis();
  nextBlinkInterval = random(1500, 3500);  // ขี้อาย: กระพริบถี่ขึ้น (ประหม่า)
  nextGlanceTime = millis() + random(4000, 10000);  // หลบตาบ่อยขึ้น
  nextSighTime = millis() + random(15000, 30000);  // ถอนหายใจเขินๆ บ่อยขึ้น
  nextHeadLookTime = millis() + random(6000, 15000);
}

void updateBlink() {
  unsigned long t = millis();
  
  if (!inBlinkSequence && (t - lastBlinkTime >= nextBlinkInterval)) {
    inBlinkSequence = true;
    blinkPhase = 0;
    blinkPhaseStart = t;
    blinkPatternType = random(0, 5);
    if (blinkPatternType <= 2) blinkPatternType = 0;       // 60% เดี่ยว
    else if (blinkPatternType == 3) blinkPatternType = 1;   // 20% คู่
    else blinkPatternType = 2;                              // 20% สามครั้ง
  }
  
  if (!inBlinkSequence) return;
  
  unsigned long e = t - blinkPhaseStart;
  
  if (blinkPatternType == 0) {  // เดี่ยว
    if (blinkPhase == 0 && e >= 0)  { drawEyes_HalfClosed(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 60) { drawEyes_Closed(); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 80) { drawEyes_HalfClosed(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 60) { drawEyesForEmotion(currentEmotion); inBlinkSequence = false; lastBlinkTime = t; nextBlinkInterval = random(1500, 3500); }
  }
  else if (blinkPatternType == 1) {  // คู่
    if (blinkPhase == 0 && e >= 0)   { drawEyes_Closed(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 100) { drawEyesForEmotion(currentEmotion); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 180) { drawEyes_Closed(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 100) { drawEyesForEmotion(currentEmotion); inBlinkSequence = false; lastBlinkTime = t; nextBlinkInterval = random(2000, 4000); }
  }
  else if (blinkPatternType == 2) {  // สามครั้ง
    if (blinkPhase == 0 && e >= 0)   { drawEyes_Closed(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 80)  { drawEyesForEmotion(currentEmotion); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 120) { drawEyes_Closed(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 80)  { drawEyesForEmotion(currentEmotion); blinkPhase = 4; blinkPhaseStart = t; }
    else if (blinkPhase == 4 && e >= 120) { drawEyes_Closed(); blinkPhase = 5; blinkPhaseStart = t; }
    else if (blinkPhase == 5 && e >= 80)  { drawEyesForEmotion(currentEmotion); inBlinkSequence = false; lastBlinkTime = t; nextBlinkInterval = random(2500, 5000); }
  }
}

void updateGlance() {
  unsigned long t = millis();
  
  if (!inGlance && t >= nextGlanceTime) {
    inGlance = true;
    glancePhase = 0;
    glancePhaseStart = t;
  }
  
  if (!inGlance) return;
  
  unsigned long e = t - glancePhaseStart;
  
  if (glancePhase == 0) {
    // เหลือบมอง (สุ่มซ้าย/ขวา)
    if (random(0, 2) == 0) drawEyes_LookLeft();
    else drawEyes_LookRight();
    glancePhase = 1;
    glancePhaseStart = t;
  }
  else if (glancePhase == 1 && e >= 500) {
    // กลับตาปกติ (อารมณ์ปัจจุบัน)
    drawEyesForEmotion(currentEmotion);
    glancePhase = 2;
    glancePhaseStart = t;
  }
  else if (glancePhase == 2 && e >= 200) {
    inGlance = false;
    nextGlanceTime = t + random(4000, 10000);  // ขี้อาย: หลบตาบ่อย
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
    drawEyes_HalfClosed();
    sighPhase = 1;
    sighPhaseStart = t;
  }
  else if (sighPhase == 1 && e >= 600) {
    // กลับปกติ
    drawEyesForEmotion(currentEmotion);
    sighPhase = 2;
    sighPhaseStart = t;
  }
  else if (sighPhase == 2 && e >= 300) {
    inSigh = false;
    nextSighTime = t + random(15000, 30000);  // ขี้อาย: ถอนหายใจบ่อยขึ้น
  }
}

// --- Head Look: หันหัวซ้าย-ขวาเบาๆ (ผ่าน servo lerp) ---
void updateHeadLook() {
  unsigned long t = millis();
  
  if (!inHeadLook && t >= nextHeadLookTime) {
    inHeadLook = true;
    headLookPhase = 0;
    headLookPhaseStart = t;
    // ขี้อาย: หันแค่นิดๆ (83-97 แคบกว่าเดิม)
    headLookTarget = random(83, 98);
  }
  
  if (!inHeadLook) return;
  
  unsigned long e = t - headLookPhaseStart;
  
  if (headLookPhase == 0) {
    // หันหัวไปทาง (ผ่าน servo lerp ราบรื่น)
    targetHeadAngle = headLookTarget;
    headLookPhase = 1;
    headLookPhaseStart = t;
  }
  else if (headLookPhase == 1 && e >= 2000) {
    // ค้าง 2 วิ แล้วกลับกลาง
    targetHeadAngle = 90;
    headLookPhase = 2;
    headLookPhaseStart = t;
  }
  else if (headLookPhase == 2 && e >= 1500) {
    inHeadLook = false;
    nextHeadLookTime = t + random(4000, 12000);  // ขี้อาย: หันหัวบ่อยขึ้น
  }
}

// --- Heartbeat: หัวใจเต้น เฉพาะ Love mode ---
void updateHeartbeat() {
  if (currentEmotion != 'V') return;
  unsigned long t = millis();
  unsigned long e = t - lastHeartbeatTime;
  // จังหวะ: เล็ก → ใหญ่ → เล็ก → ใหญ่ (lub-dub) → พัก
  switch (heartbeatPhase) {
    case 0: if (e >= 800)  { drawHeart(2); heartbeatPhase = 1; lastHeartbeatTime = t; } break; // พัก → ขยาย
    case 1: if (e >= 150)  { drawHeart(1); heartbeatPhase = 2; lastHeartbeatTime = t; } break; // ขยาย → ปกติ
    case 2: if (e >= 150)  { drawHeart(2); heartbeatPhase = 3; lastHeartbeatTime = t; } break; // ปกติ → ขยาย (dub)
    case 3: if (e >= 150)  { drawHeart(1); heartbeatPhase = 0; lastHeartbeatTime = t; } break; // ขยาย → ปกติ + พัก
  }
}

void updateIdleBehaviors() {
  if (isExecutingCommand) return;
  
  // หัวใจเต้นตลอดเวลาใน Love mode (ไม่หยุดตอน blink)
  if (currentEmotion == 'V' && !inBlinkSequence) {
    updateHeartbeat();
    return;  // ไม่ต้องทำ idle อื่นตอน Love
  }
  
  if (inBlinkSequence) { updateBlink(); return; }
  if (inGlance) { updateGlance(); return; }
  if (inSigh) { updateSigh(); return; }
  if (inHeadLook) { updateHeadLook(); return; }
  
  updateBlink();
  if (!inBlinkSequence) updateGlance();
  if (!inGlance) updateSigh();
  if (!inSigh) updateHeadLook();
}

// =====================================================================
// Setup
// =====================================================================
void setup() {
  Serial.begin(115200);

  tft.init(); tft.setRotation(1); tft.fillScreen(TFT_WHITE);
  drawEyes_Normal();

  // เซอร์โวเริ่มต้น
  servoHand1.attach(SERVO_HAND_1_PIN, 500, 2400); servoHand2.attach(SERVO_HAND_2_PIN, 500, 2400);
  servoArm1.attach(SERVO_ARM_1_PIN, 500, 2500);   servoArm2.attach(SERVO_ARM_2_PIN, 500, 2500);
  servoHead.attach(SERVO_HEAD_PIN, 500, 2400);
  
  // มอเตอร์
  pinMode(MOTOR_ENA_PIN, OUTPUT); pinMode(MOTOR_IN1_PIN, OUTPUT); 
  pinMode(MOTOR_IN2_PIN, OUTPUT); pinMode(MOTOR_EMB_PIN, OUTPUT); 
  pinMode(MOTOR_IN3_PIN, OUTPUT); pinMode(MOTOR_IN4_PIN, OUTPUT); 
  pinMode(SENSOR_LEFT_PIN, INPUT); pinMode(SENSOR_RIGHT_PIN, INPUT);

  // WiFi — STA Mode (ต่อ WiFi Router กลาง)
  WiFi.mode(WIFI_STA);
  WiFi.begin(sta_ssid, sta_password);
  Serial.printf("กำลังเชื่อมต่อ WiFi: %s", sta_ssid);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("✅ เชื่อมต่อ WiFi สำเร็จ! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("❌ เชื่อมต่อ WiFi ไม่สำเร็จ — ลองตรวจสอบชื่อ/รหัส WiFi");
  }
  
  // mDNS — ตั้งชื่อให้เข้าถึงได้ง่าย: http://MDTrobot.local
  if (MDNS.begin(mdns_name)) {
    Serial.printf("✅ mDNS: เข้าเว็บได้ที่ http://%s.local\n", mdns_name);
  } else {
    Serial.println("❌ mDNS เริ่มไม่สำเร็จ");
  }

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

  // =================================================================
  // /state — ให้เว็บอ่านสถานะหุ่นแบบเรียลไทม์ (Digital Twin จอที่ 2)
  // =================================================================
  // เว็บ (robot-sim.js → TwinLink) ยิงทุก 300 ms แล้วเอาค่ามาแสดง:
  //   emo   = อารมณ์ที่แสดงบนจอ TFT (N H S A O Z C V B)
  //   head  = มุมหัวเป้าหมายของระบบ lerp (กล้อง/idle สั่ง) 50=ขวา 90=ตรง 130=ซ้าย
  //   headCmd = มุมหัวจากคำสั่ง Blockly/คีย์บอร์ดล่าสุด
  //   arm1/arm2/hand1/hand2 = มุมเซอร์โวแขน-มือล่าสุด
  //   busy  = 1 ระหว่างรันคำสั่งชุดจาก Blockly (เว็บจะไม่ทับอนิเมชันตัวเอง)
  //   up    = uptime (ms) ใช้เช็คว่าหุ่นรีบูตหรือยัง
  // ตอบเป็น JSON + CORS เปิด (เว็บอยู่ origin อื่น)
  // ⚠️ แก้ฟิลด์ที่นี่ ต้องแก้ applyLiveState() ใน robot-sim.js ให้ตรงกันด้วย
  // =================================================================
  server.on("/state", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    char buf[240];
    snprintf(buf, sizeof(buf),
      "{\"emo\":\"%c\",\"head\":%d,\"headCmd\":%d,"
      "\"arm1\":%d,\"arm2\":%d,\"hand1\":%d,\"hand2\":%d,"
      "\"busy\":%d,\"blink\":%d,\"up\":%lu}",
      currentEmotion,
      (int)targetHeadAngle, currentHeadCmdAngle,
      currentArm1Angle, currentArm2Angle, currentHand1Angle, currentHand2Angle,
      isExecutingCommand ? 1 : 0, inBlinkSequence ? 1 : 0,
      millis());
    server.send(200, "application/json", buf);
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
  
  // === ตั้งค่าสี (User_Setup.h: TFT_INVERSION_OFF + TFT_BGR — ใส่ RGB ปกติได้เลย) ===
  HEART_COLOR = tft.color565(220, 20, 60);   // สีแดงหัวใจ (Crimson Red)
  BLUSH_PINK  = tft.color565(255, 130, 150); // สีชมพูแก้มเขิน (Blush Pink)
  Serial.printf("HEART=0x%04X  BLUSH=0x%04X\n", HEART_COLOR, BLUSH_PINK);

  Serial.println("Robo v4 — Shy Character Ready! (Serial 'c'=color test)");
}

// =====================================================================
// Loop
// =====================================================================
void loop() {
  // รับคำสั่ง WiFi
  server.handleClient(); 

  // รับคำสั่งคีย์บอร์ด
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
      case 'u': forceEmotionChange('N'); break;  // Normal
      case 'i': drawEyes_LookRight(); break;
      case 'o': forceEmotionChange('O'); break;  // Shocked
      case 'h': forceEmotionChange('H'); break;  // Happy
      case 'j': forceEmotionChange('S'); break;  // Sad
      case 'k': forceEmotionChange('A'); break;  // Angry
      case 'l': forceEmotionChange('Z'); break;  // Sleepy
      case 'n': forceEmotionChange('C'); break;  // Confused
      case 'm': forceEmotionChange('V'); break;  // Love
      case 'p': forceEmotionChange('B'); break;  // Shy/เขินอาย
      case 'c': {  // Color test — แสดง 4 แถบสีบนจอ
        tft.fillScreen(TFT_WHITE);
        tft.fillRect(0,   0, 80, 120, tft.color565(255,0,0));   // R
        tft.fillRect(80,  0, 80, 120, tft.color565(0,255,0));   // G
        tft.fillRect(160, 0, 80, 120, tft.color565(0,0,255));   // B
        tft.fillRect(240, 0, 80, 120, HEART_COLOR);             // Heart
        tft.fillRect(0, 120, 160, 120, BLUSH_PINK);             // Blush
        tft.setTextColor(TFT_BLACK); tft.setTextSize(1);
        tft.setCursor(5,5);   tft.print("RED");
        tft.setCursor(85,5);  tft.print("GRN");
        tft.setCursor(165,5); tft.print("BLU");
        tft.setCursor(245,5); tft.print("HEART");
        tft.setCursor(5,125); tft.print("BLUSH");
        Serial.println("[COLOR TEST] Check display!");
        delay(5000);
        drawEyesForEmotion(currentEmotion);
        break;
      }
      // --- Gripper keyboard shortcuts ---
      case '[': {  // จับของ (smart grip)
        Serial.println("[KEY] Smart Grip");
        smartGrip();
        break;
      }
      case ']': {  // ปล่อยของ
        Serial.println("[KEY] Release");
        gripRelease();
        break;
      }
      case '\\': {  // จับ+ยก+เช็ค
        Serial.println("[KEY] Grip & Verify");
        gripAndVerify();
        break;
      }
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
        // ตำแหน่ง → หันหัว (servo lerp — ราบรื่น ไม่กระตุก)
        case 'L': targetHeadAngle = 130; break;
        case 'C': targetHeadAngle = 90;  break;
        case 'R': targetHeadAngle = 50;  break;

        // อารมณ์ → เปลี่ยนตา (ผ่าน hold — ค้าง 2 วิก่อนเปลี่ยน)
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

  // === Auto-revert: อารมณ์จากปุ่มค้าง 2.5 วิ แล้วกลับ Normal ===
  if (emoAutoRevertTime > 0 && millis() >= emoAutoRevertTime) {
    emoAutoRevertTime = 0;
    currentEmotion = 'N';
    emoChangeTime = millis();
    doBodyGesture('N');
    Serial.println("[EMO] auto-revert → N");
  }

  // === Idle + Servo Update ===
  if (!isExecutingCommand) {
    updateIdleBehaviors();
    updateServoLerp();
  }
}