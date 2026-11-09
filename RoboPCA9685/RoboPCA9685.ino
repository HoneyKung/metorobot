/*
 * =====================================================================
 * RoboPCA9685.ino — RoboMDT / METO ตัวสำเร็จ  (รอบวันศุกร์ 6 พ.ย. 2569)
 * =====================================================================
 * ประวัติไฟล์:
 *   ก็อปโครงมาจาก Robo/Robo.ino (v3 No-Lerp Edition)
 *   → แก้ตาม สเปกแก้โค้ด_ไม่ใช้แบต_ESP32_PCA9685_TFT_RoboMDT.md (รอบเซอร์โว)
 *   → 6 ก.ย. 2569 แก้เป็น pin map ชุดใหม่ทั้งชุด ตาม "ข้อ 0" หัวข้อ 16 ของ
 *     ตารางการเชื่อมต่อและบัดกรี_RoboMDT.md และคู่มือต่อสาย WAGO221/XT30
 *   → 5 พ.ย. 2569 รอบวันศุกร์ ตาม Robo/Part Robot/งานโค้ด_2026-11/สเปกเฟิร์มแวร์_วันศุกร์_ล็อก.md
 *     สำรองไฟล์ก่อนแก้ = RoboPCA9685.ino.bak-20261105-ก่อนรอบศุกร์
 *     - มือหนีบ MG90S CH1/CH3 (ดึงฟังก์ชันมือจาก Robo.ino มาทำแบบไม่บล็อก)
 *     - ลิมิตกลางตารางเดียว (JOINT_LIMITS) + ค่าสอบเทียบเก็บใน NVS
 *     - interlock แขน/หัว จากผลจำลองทั้งตัว (meto_interlock_table.h)
 *     - เซอร์โวทุกตัวขยับแบบนุ่ม ไม่บล็อก (เร่ง-ชะลอ จำกัดความเร็ว)
 *     - มอเตอร์ไม่บล็อก + ชะลอก่อนหยุด + กันตก TCRT ซ้าย 13 ขวา 19
 *     - VL53L0X (0x29) รู้ว่ายกของ/ปล่อยของแล้ว · ไม่ต่อเซนเซอร์ก็บูตได้
 *     - MPR121 (0x5A) ทองแดงหัวแผ่นเดียว E0: แตะ แตะสองที กดค้าง → หัวดุ๊กดิ๊กดีใจ (เอียงสลับซ้าย/ขวา) · ไม่ต่อก็บูตได้
 *     - คิวคำสั่งเว็บแบบไม่บล็อก /state ตอบได้ตลอด และ x หยุดกลางคิวได้
 *     - รู้ว่ากล้องหลุดเกิน 5 วิ
 *     ผลทดสอบเดิมข้างล่างยังเป็นของรอบ 7 ก.ย. ส่วนรอบนี้ยังไม่ได้แฟลชลงตัวจริง
 *
 * ⛔ ไฟล์นี้ไม่ใช่โค้ดโปรโตไทป์เก่าแล้ว ผังเก่าถูกลบทิ้ง ไม่ใช่แค่ปิดไว้
 *    ถ้าต้องย้อนกลับ ให้ใช้ RoboPCA9685.ino.bak-20261105-ก่อนรอบศุกร์
 *
 * -------- pin map ที่ใช้จริง (ห้ามเปลี่ยน) --------
 *   Motor  TB6612  PWMA=26 AIN1=27 AIN2=14 | PWMB=25 BIN1=32 BIN2=33
 *                  VCC และ STBY จั๊มรวมกันไป 3V3 ไม่กินขา GPIO
 *   TFT    ST7789  SCLK=18 MOSI=5 MISO=-1 DC=17 RST=16 CS=4   (เรียงติดกัน 5 ขา)
 *                  (ตั้งใน TFT_eSPI/User_Setup.h ไม่ใช่ในไฟล์นี้)
 *   CAM    XIAO    Serial2 RX=23 TX=-1 @9600 — ส่งทางเดียวเข้า ESP32
 *   I2C    PCA9685 SDA=21 SCL=22 @0x40  OE→GND
 *          VL53L0X บัสเดียวกัน @0x29 (ชั้น 1 มองของบนพื้นตรงหน้า)
 *   TCRT           ซ้าย GPIO13  ขวา GPIO19  (ไม่ใช้ GPIO2 เพราะเป็นขา strapping)
 *   Encoder        GPIO34/35/36/39
 *
 * -------- ช่อง PCA9685 --------
 *   CH0 แขนซ้าย MG996R · CH1 มือซ้าย MG90S · CH2 แขนขวา MG996R
 *   CH3 มือขวา MG90S · CH4 หัวหัน SG90 · CH5 หัวก้มเงย SG90
 *
 * -------- ผังไฟ --------
 *   แบต 2S → BMS → ฟิวส์ → XT30 → สวิตช์ → W1/W2 (สายหลัก 18AWG)
 *   W1/W2  → LM2596 5V  → ESP32 VIN, XIAO 5V
 *   W1/W2  → TB6612 VM/GND โดยตรง ไม่ผ่านเบรดบอร์ด (มีคาป 470-1000uF คร่อม)
 *   W1/W2  → UBEC/XH-M401 → PCA9685 ขั้วสกรู V+ / GND (ตอนต่อเซอร์โว)
 *   ห้ามต่อ V+ ของเซอร์โวเข้า 3V3/5V/VIN ของ ESP32 เด็ดขาด GND ต้องร่วมกัน
 *
 * ต้องติดตั้งไลบรารีก่อนคอมไพล์:
 *   Library Manager → "Adafruit PWM Servo Driver Library"
 *   Library Manager → "VL53L0X" ของ Pololu (ไม่ใช่ของ Adafruit)
 *   TFT_eSPI (แก้ User_Setup.h ให้ตรงผังข้างบนแล้ว)
 *   ไฟล์ meto_interlock_table.h ต้องอยู่ในโฟลเดอร์เดียวกับไฟล์นี้
 *
 * -------- ผลทดสอบกับของจริง 7 ก.ย. 2569 --------
 *   ✓ มอเตอร์: เดินหน้า ถอย เลี้ยวซ้าย เลี้ยวขวา ถูกทุกทิศ สายไม่ต้องสลับ
 *   ✓ Encoder: ทำงานที่ 3.3V ได้จริง GPIO36/39 ไม่มีพัลส์หลอก
 *   ✓ สองข้างเร็วต่างกัน 0.9% (PWM 90 → 64.4 กับ 63.8 RPM) เดินตรงได้โดยไม่ต้องทำ PID
 *   ! ENC_CPR_L/R ยังเป็นค่าอ้างอิง 4680 ยังไม่ได้สอบเทียบ
 *     เลข RPM จึงใช้เทียบซ้าย/ขวากันได้ แต่ยังอ้างในรายงานไม่ได้
 *     สอบเทียบด้วย EncoderMotorTest_TT.ino ปุ่ม k แล้วมาแก้ค่าที่หัวไฟล์
 *
 * -------- แป้นพิมพ์บน Serial Monitor 115200 (พิมพ์ H ดูเมนูเต็ม) --------
 *   0     สั่งทุกเซอร์โวไป 90 องศา ทีละตัว     ← ใช้ตอนใส่ก้านเซอร์โว (horn)
 *   T     ทดสอบทั้งหมด กวาดทีละตัวในช่วงที่ interlock ยอมจากท่าพัก
 *   I     ตรวจชนิดเซอร์โวทุกตัว — 180 องศา หรือ หมุนรอบตัว 360 (ถอดก้านออกก่อน)
 *   R     กวาดหาปลายทางจริงของช่องที่เลือก 500-2500us (ถอดก้านออกก่อน)
 *   F     วัดเวลาวาดตา แล้วค้างหน้า Normal 10 วินาที ดูผลทาง Serial และ /state
 *   D     ตรวจสาย I2C + PCA9685 — ใช้ตอนสั่งแล้วเซอร์โวไม่ขยับเลย
 *   V     เปิด/ปิดขาสัญญาณค้างสถานะละ 6 วิ — ไว้เอามัลติมิเตอร์วัดให้ชัด
 *   Q     เลือกช่องถัดไปสำหรับจูน
 *   , .   ช่องที่เลือก -1 / +1 องศา        < >   -5 / +5 องศา (ติด interlock จะไม่ยอม)
 *   /     พิมพ์ตารางมุม + ไมโครวินาที ปัจจุบันทุกช่อง
 *   *     ปล่อยแรง (full-off) ทุกช่อง — แขนจะตก ใช้ตอนไม่มีโหลดเท่านั้น
 *   K     เข้าโหมดสอบเทียบ (แนวนอนแขน กลาง/กาง/หนีบมือ ทิศ) แล้วบันทึกลง NVS
 *   S     พิมพ์สถานะเซนเซอร์ครั้งเดียว     W  เปิด/ปิดพิมพ์สถานะทุก 0.5 วิ
 *   !...  คำสั่งแบบบรรทัด เช่น !cfg  !hv 90  !run w;7;  (พิมพ์ H ดูทั้งหมด)
 *   7 8 9 หัวหัน 50 / 90 / 130      |  r f v  แขนซ้าย ยก/กลาง/ลง (ค่าเดิม 67/91/121)
 *   t g b แขนขวา ยก/กลาง/ลง (118/90/60) |  ; ' \  หัวก้ม / ตรง / เงย
 *   1 2 3 มือขวา กาง/กลาง/หนีบ   4 5 6 มือซ้าย หนีบ/กลาง/กาง   [ ] หนีบฉลาด/ปล่อย  G หนีบ+ยก+ตรวจ
 *   w s a d  เดินหน้า/ถอย/เลี้ยวซ้าย/เลี้ยวขวา 1 วิ   x เว้นวรรค  หยุดทุกอย่าง
 *   E     อ่านค่า Encoder — ตัวนับ RPM และระดับขาทั้งสี่เส้น
 *   Z     ล้างตัวนับ Encoder เป็นศูนย์
 *   N     ตรวจพัลส์หลอก 10 วิ — ห้ามแตะล้อระหว่างทดสอบ
 * =====================================================================
 */

// =====================================================================
// สวิตช์เปิด-ปิดระบบ
// =====================================================================
#define USE_TFT     1   // จอ — ผังใหม่ SCLK18 MOSI5 CS4 DC17 RST16 (แก้ใน User_Setup.h แล้ว)
#define USE_WIFI    1   // WiFi + เว็บ /run /state — อยากบูตไวตอนจูนเซอร์โว ตั้งเป็น 0
#define USE_MOTOR   1   // มอเตอร์ล้อ TB6612 — ทดสอบกับของจริงแล้ว 7 ก.ย.
#define USE_HAND    1   // มือหนีบ MG90S CH1/CH3 — สเปกวันศุกร์ข้อ 2
#define USE_CAMERA  1   // กล้องผ่าน Serial2 RX=23 — ไม่ต่อกล้องก็ไม่พัง แค่ขึ้นว่ากล้องหลุด
#define USE_ENCODER 1   // Encoder ล้อ GPIO34/35/36/39
                        // บอร์ด Encoder มี pull-up ในตัวแล้ว ไม่ต้องเพิ่มภายนอก
#define USE_VL53    1   // VL53L0X ชั้น 1 — ไม่ต่อก็บูตได้ จะลองหาใหม่ทุก 3 วิ
#define USE_CLIFF   1   // TCRT5000 กันตก ซ้าย GPIO13 ขวา GPIO19
#define USE_TOUCH   1   // MPR121 ทองแดงหัวแผ่นเดียว (I2C 0x5A, E0) — ไม่ต่อก็บูตได้ จะลองหาใหม่ทุก 3 วิ

// โหมดหาตำแหน่ง: 1 = ปลดลิมิตมุมให้กวาดได้ 0-180 (ใช้ตอน "ยังไม่ใส่ก้านเซอร์โว")
//                0 = ใช้ตารางลิมิตกลาง JOINT_LIMITS + ค่าสอบเทียบ (รอบวันศุกร์ข้อ 3)
#define CALIB_FREE_RANGE 0

// เดิมใช้สั่ง full-off หัวหลังหยุด ตอนนี้เลิกใช้ ย้ายไปตั้งค่าใน NVS แทน
//   (!hr = หัวหัน, !tr = หัวก้มเงย หน่วย ms, 0 = ไม่ปลดแรง) แขนไม่ปลดแรงเด็ดขาด
#define SERVO_IDLE_RELEASE 0

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Preferences.h>       // NVS เก็บค่าสอบเทียบ
#include <soc/soc.h>
#include <soc/gpio_reg.h>      // ให้ ISR กันตกตัดขามอเตอร์ได้ทันที
#include "meto_interlock_table.h"
#include "meto_emotes.h"        // ท่าอารมณ์ชุดใหม่ (แขน+หัวพร้อมกัน)

#if USE_VL53
  #include <VL53L0X.h>         // Pololu VL53L0X
#endif

#if USE_WIFI
  #include <WiFi.h>
  #include <WebServer.h>
  #include <ESPmDNS.h>     // mDNS: ให้ใช้ชื่อ MDTrobot.local แทน IP
#endif

#if USE_TFT
  #include <SPI.h>
  #include <TFT_eSPI.h>
#endif

// =====================================================================
// WiFi — STA Mode (ต่อ WiFi Router กลาง)
// *** น้องๆ เปลี่ยนชื่อ WiFi และรหัสผ่านตรงนี้ ***
// =====================================================================
#if USE_WIFI
const char* sta_ssid     = "NNNYTAN";      // ← ชื่อ WiFi ที่ต้องการเชื่อมต่อ
const char* sta_password = "14769NoL";     // ← รหัส WiFi
const char* mdns_name    = "MDTrobot";     // → เข้าเว็บที่ http://MDTrobot.local
WebServer server(80);
#endif

// =====================================================================
// อุปกรณ์
// =====================================================================
#if USE_TFT
// ✅ User_Setup.h ของ TFT_eSPI แก้เป็น pin map ชุดใหม่แล้ว (6 ก.ย.) ตามข้อ 0 หัวข้อ 16
//    ของ ตารางการเชื่อมต่อและบัดกรี_RoboMDT.md:
//      #define TFT_MISO -1   (จอไม่ได้ต่อ SDO)
//      #define TFT_MOSI  5   → TFT SDI
//      #define TFT_SCLK 18
//      #define TFT_CS    4
//      #define TFT_DC   17
//      #define TFT_RST  16
//      TFT_BL / TFT_BACKLIGHT_ON ปิดไว้ เพราะ BL ต่อ 3.3V ผ่านตัวต้านทาน ไม่ได้ต่อ GPIO
//    ผังปัจจุบันใช้ MOSI5 CS4 DC17 RST16 โดยไม่ได้ควบคุม BL ผ่าน GPIO
//    ⚠️ ไดรเวอร์ให้คงไว้ที่ ST7789_DRIVER — ของจริงจอขึ้นปกติกับตัวนี้
//       (เอกสารสเปกข้อ 6 เขียนว่า ILI9341_DRIVER ไว้ ซึ่งไม่ตรงกับของจริง อย่าไปเปลี่ยนตาม)
TFT_eSPI tft = TFT_eSPI();
#endif

// PCA9685 — Servo ทุกตัวอยู่บนบอร์ดนี้ ไม่มีตัวไหนต่อ GPIO ตรงแล้ว
#define I2C_SDA_PIN     21
#define I2C_SCL_PIN     22
#define PCA9685_ADDR    0x40
#define SERVO_FREQ_HZ   50      // เซอร์โวอนาล็อกใช้ 50Hz (คาบ 20000us)

Adafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(PCA9685_ADDR);

// =====================================================================
// ช่อง Servo บน PCA9685 — สเปกวันศุกร์ข้อ 1 (ล็อก 5 พ.ย. 2569)
// =====================================================================
constexpr uint8_t SERVO_ARM_LEFT_CH   = 0;   // MG996R แขนซ้าย (ยก)
constexpr uint8_t SERVO_HAND_LEFT_CH  = 1;   // MG90S  มือซ้าย (กาง/หนีบ)
constexpr uint8_t SERVO_ARM_RIGHT_CH  = 2;   // MG996R แขนขวา (ยก)
constexpr uint8_t SERVO_HAND_RIGHT_CH = 6;   // MG90S  มือขวา (กาง/หนีบ) — ย้ายจาก CH3 (ช่อง 3 บน PCA เสีย 9 พ.ย.)
constexpr uint8_t SERVO_HEAD_YAW_CH   = 4;   // SG90 หัวหันซ้าย-ขวา
constexpr uint8_t SERVO_HEAD_TILT_CH  = 5;   // SG90 หัวก้ม-เงย
// ชื่อเดิมของ CH1/CH3 (เคยเป็นช่องสำรอง) เก็บไว้ให้โค้ดเก่าที่อ้างชื่อนี้คอมไพล์ได้
constexpr uint8_t SERVO_SPARE_1_CH    = SERVO_HAND_LEFT_CH;
constexpr uint8_t SERVO_SPARE_3_CH    = SERVO_HAND_RIGHT_CH;

// =====================================================================
// โปรไฟล์เซอร์โวแต่ละตัว
// =====================================================================
// minUs/maxUs      = ช่วงพัลส์ของเซอร์โวรุ่นนั้น (MG996R 500-2500, MG90S/SG90 500-2400)
// minAngle/maxAngle = ลิมิตมุมเซอร์โว — ค่าในตารางนี้เป็นแค่ค่าเริ่ม
//                     ตอนบูตและทุกครั้งที่สอบเทียบ จะคำนวณใหม่จาก JOINT_LIMITS + ค่าใน NVS
//                     (applyLimitsFromConfig) จึงมีตารางลิมิตจริงตารางเดียว
// centerAngle      = มุมเซอร์โวของท่าพัก (มุมเชิงกล 0) คำนวณใหม่เช่นกัน
// ⚠️ ลำดับในตารางนี้ = เลขช่อง = เลขแกน AX_* ข้างล่าง ห้ามสลับ
// =====================================================================
struct ServoCfg {
  uint8_t     ch;
  const char* name;
  int         minUs;
  int         maxUs;
  int         minAngle;
  int         maxAngle;
  int         centerAngle;
};

ServoCfg SERVOS[] = {
  { SERVO_ARM_LEFT_CH,   "CH0 ARM_L   MG996R", 500, 2500,  42, 133, 90 },
  { SERVO_HAND_LEFT_CH,  "CH1 HAND_L  MG90S ", 500, 2400,  60, 118, 90 },
  { SERVO_ARM_RIGHT_CH,  "CH2 ARM_R   MG996R", 500, 2500,  47, 138, 90 },
  { SERVO_HAND_RIGHT_CH, "CH6 HAND_R  MG90S ", 500, 2400,  62, 120, 90 },
  { SERVO_HEAD_YAW_CH,   "CH4 HEAD_Y  SG90  ", 500, 2400,   0, 180, 90 },
  { SERVO_HEAD_TILT_CH,  "CH5 HEAD_T  SG90  ", 500, 2400,  80, 100, 90 },
};
const int SERVO_COUNT = sizeof(SERVOS) / sizeof(SERVOS[0]);

// สถานะล่าสุดของแต่ละช่อง (ใช้พิมพ์ตาราง + ส่งให้เว็บผ่าน /state)
int  servoAngleNow[16];
int  servoUsNow[16];
bool servoLive[16];        // true = ช่องนั้นยังจ่ายพัลส์ค้างอยู่

int  calibIndex = 0;       // ช่องที่กำลังเลือกจูนด้วยปุ่ม , . < >

// true เมื่อเจอ PCA9685 บนสาย I2C จริง
// ถ้าถอดบอร์ดออก (เช่น ยืมสายไปต่อจอ) ตัวนี้จะเป็น false แล้วข้ามการเขียน I2C ทั้งหมด
// ไม่งั้นทุกคำสั่งเซอร์โวจะไปรอ timeout ของ I2C ทำให้จอกระตุกและ loop ช้า
bool pcaOnline = false;

// =====================================================================
// แกนข้อต่อ + ตารางลิมิตกลาง (สเปกวันศุกร์ข้อ 3)
// =====================================================================
// ทุกคำสั่งข้างในคิดเป็น "มุมเชิงกล" (rel) แล้วค่อยแปลงเป็นมุมเซอร์โว
//   มุมเซอร์โว = ศูนย์ + ทิศ × มุมเชิงกล
// เครื่องหมายมุมเชิงกล ตรงกับรายงานจำลอง (sim/รายงาน_จำลอง.md ข้อ 2):
//   แขน  + = ยกขึ้น       (0 = แนวนอน / ท่าพักในผลจำลอง)
//   มือ  + = หนีบเข้าตัว   − = กางออก
//   หัวหัน + = หน้าหัวไปทางแขนซ้าย
//   หัวพยัก + = เงย  − = ก้ม
// ศูนย์และทิศของแต่ละข้อ สอบเทียบได้ในโหมด K แล้วบันทึกลง NVS
// =====================================================================
enum { AX_ARM_L = 0, AX_HAND_L = 1, AX_ARM_R = 2, AX_HAND_R = 3,
       AX_YAW = 4, AX_TILT = 5, AX_N = 6 };

struct JointLimit { const char* name; float relMin; float relMax; };

// ⛔ ตารางลิมิตกลางตารางเดียวของทั้งไฟล์ — แก้ที่นี่ที่เดียว
//   แขน −43…+48 (สเปกแขน_ล็อก ข้อ 5/9) · ท่าที่ชนหัว/ชนตัวกันด้วย interlock
//   มือ −30…+28.5 (แขนรอบ 3 7 พ.ย.: ท่อนแขนยาว 125 · หนีบ +28.5 ปลายท่อนแขนสองข้างห่าง 1.2 มม. · รอบ 2b/2c = +32 แขนยาว 114)
//   หัวหัน ±90 (สเปกคอ ข้อ 13) — กว้างกว่าเดิม 50-130
//   หัวก้มเงย ±10 — แคบกว่าเดิม 60-120 เพราะชนจริง: ผลจำลองหัว rev E ±11 เปลือกแตะแผ่นคอ
//                   (sim/รายงาน_จำลอง.md 1ก แถวหัวหัน×พยัก) = ข้อยกเว้น #248 ข้อ 6
const JointLimit JOINT_LIMITS[AX_N] = {
  { "แขนซ้าย ยก",       -43.0f, 48.0f },
  { "มือซ้าย หนีบ",     -30.0f, 28.5f },
  { "แขนขวา ยก",        -43.0f, 48.0f },
  { "มือขวา หนีบ",      -30.0f, 28.5f },
  { "หัวหัน",           -90.0f, 90.0f },
  { "หัวก้มเงย",        -10.0f, 10.0f },
};

// ค่าสอบเทียบ + ค่าปรับได้ ทั้งหมดเก็บใน NVS ก้อนเดียว
#define CFG_MAGIC 0x4D54
#define CFG_VER   1
struct MetoCfg {
  uint16_t magic;
  uint8_t  ver;
  float    armHz[2];       // มุมเซอร์โวตอนแขนอยู่แนวนอน [0]=ซ้าย CH0 [1]=ขวา CH2
  int8_t   armDir[2];      // +1 = มุมเซอร์โวเพิ่มแล้วแขนยกขึ้น
  float    handCenter[2];  // มุมเซอร์โวตอนมือตรง (มุมเชิงกล 0) [0]=ซ้าย CH1 [1]=ขวา CH3
  float    handOpen[2];    // มุมเชิงกลตอนกางสุด (ติดลบ ไม่ต่ำกว่า −30)
  float    handClose[2];   // มุมเชิงกลตอนหนีบสุด (บวก ไม่เกิน +28.5 · ติดยาง 1–1.5 มม. ตั้ง +27.5)
  int8_t   handDir[2];     // +1 = มุมเซอร์โวเพิ่มแล้วมือหนีบเข้า
  float    yawCenter;      // มุมเซอร์โวตอนหัวมองตรง
  int8_t   yawDir;         // +1 = มุมเซอร์โวเพิ่มแล้วหน้าหัวไปทางแขนซ้าย
  float    tiltCenter;     // มุมเซอร์โวตอนหน้าตรง ไม่ก้มไม่เงย
  int8_t   tiltDir;        // +1 = มุมเซอร์โวเพิ่มแล้วเงย
  float    headVmax;       // องศา/วิ สูงสุดของหัว (ไม่เกิน 200 = 0.3 s/60° ตามผลแรงบิด SG90)
  float    headAcc;        // องศา/วิ² ช่วงเร่ง-ชะลอ (ease-in/out)
  uint16_t yawReleaseMs;   // หัวหันหยุดนิ่งนานเท่านี้แล้วปลดแรง (0 = ไม่ปลด)
  uint16_t tiltReleaseMs;  // หัวก้มเงยหยุดนิ่งนานเท่านี้แล้วปลดแรง (0 = ไม่ปลด)
  float    armVmax, armAcc;
  float    handVmax, handAcc;
  uint8_t  cliffEnable;    // 1 = เปิดกันตก
  uint8_t  cliffEdgeLevel; // ระดับขาที่แปลว่า "เจอขอบ" (TCRT ส่วนใหญ่ = 1 เมื่อไม่มีพื้นสะท้อน)
  uint16_t vlNearMm;       // ใกล้กว่านี้ = มีของอยู่ตรงหน้า
  uint16_t vlJumpMm;       // ระยะกระโดดไกลขึ้นเกินนี้ = ของหายจากหน้าเซนเซอร์
  uint16_t motorRampMs;    // เวลาชะลอล้อก่อนหยุด (ผลจำลอง: ถือของ 340 g ต้อง ≥ 400 ms)
  uint8_t  ilkEnable;      // 1 = เปิด interlock แขน/หัว
};
MetoCfg cfg;

// สถานะแกนที่ขยับนุ่ม — ทุกค่าเป็นมุมเซอร์โว
struct Axis {
  float pos;                     // ตำแหน่งที่สั่งอยู่ตอนนี้
  float vel;                     // ความเร็ว องศา/วิ
  float target;                  // เป้าหมาย
  float vScale;                  // ตัวคูณความเร็วชั่วคราว (หนีบช้า)
  float lastW;                   // มุมที่เขียนลง PCA ล่าสุด
  unsigned long lastMoveMs;
  unsigned long blockedSinceMs;  // ≠0 = interlock กั้นอยู่ตั้งแต่เวลานี้
};
Axis ax[AX_N];

// เฟรมท่าทางแขน (ใช้กับท่าอารมณ์ Happy) — ต้องประกาศก่อนฟังก์ชันแรกของไฟล์
struct GestFrame { int16_t a1; int16_t a2; uint16_t holdMs; };

// =====================================================================
// พิน — ผังเก่าเก็บไว้เป็นเอกสาร แต่รอบนี้ไม่ได้ใช้
// =====================================================================
// ❌ ผังเก่า: SERVO_HAND1=32 HAND2=33 ARM1=25 ARM2=26 HEAD=27
//    สเปกข้อ 7.10 ห้ามใช้ GPIO25/26/27/32 เป็นขา Servo แล้ว — ย้ายขึ้น PCA9685 หมด

// ---------------------------------------------------------------------
// มอเตอร์ล้อ TB6612FNG — pin map ชุดใหม่
// ผังเก่าแบบ L298N (IN1..IN4 + ENA/ENB ที่ 27/14/13/12/26/23) ถูกลบทิ้งแล้ว
// เพราะ GPIO14/27 ตอนนี้เป็นขาสั่ง TB6612 และ GPIO23 เป็น RX ของกล้อง
// TCRT5000 ยังไม่ได้ต่อจริง จึงคืน GPIO17 ให้จอ เหลือ GPIO13 กับ GPIO2 ไว้ให้ TCRT ภายหลัง
// ถ้าเปิดด้วยผังเก่าจะไปดันขา output กับจอและเซนเซอร์พร้อมกัน
// ---------------------------------------------------------------------
#if USE_MOTOR
const int PIN_PWMA = 26;   // มอเตอร์ซ้าย — M03/M04/M05
const int PIN_AIN1 = 27;
const int PIN_AIN2 = 14;
const int PIN_PWMB = 25;   // มอเตอร์ขวา — M06/M07/M08
const int PIN_BIN1 = 32;
const int PIN_BIN2 = 33;
const int PIN_STBY = -1;   // จั๊มรวมกับ VCC ไป 3V3 ตายตัว ไม่กินขา GPIO

#define PWM_FREQ_HZ 20000  // 20kHz นอกช่วงเสียงที่ได้ยิน
#define PWM_BITS    8      // 0-255 ให้ตรงกับตัวเลขในคู่มือ
#define PWM_CH_A    0
#define PWM_CH_B    1
#define PWM_FLOOR   60     // ต่ำกว่านี้มอเตอร์ไม่ออกตัว แค่ครางกินไฟ
#define PWM_CEIL    180    // เพดานแข็งตามคู่มือ ห้ามแก้ให้สูงกว่านี้
#define PWM_DRIVE   110    // ค่าที่ใช้เดินจริง — ปรับตามผล MotorTest_TB6612

// สลับเป็น true ถ้าล้อข้างนั้นหมุนกลับทิศ
// ทางที่ถูกจริงคือปิดไฟแล้วสลับสาย AO1/AO2 หรือ BO1/BO2 ของข้างนั้น
#define INVERT_LEFT  false
#define INVERT_RIGHT false

// LEDC — core 3.x ใช้ ledcAttach/ledcWrite แบบอิงขา ส่วน 2.x อิงช่อง
static void pwmInit(int pin, int ch) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  (void)ch; ledcAttach(pin, PWM_FREQ_HZ, PWM_BITS);
#else
  ledcSetup(ch, PWM_FREQ_HZ, PWM_BITS); ledcAttachPin(pin, ch);
#endif
}
static void pwmWrite(int pin, int ch, int duty) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  (void)ch; ledcWrite(pin, duty);
#else
  (void)pin; ledcWrite(ch, duty);
#endif
}
#endif  // USE_MOTOR

#if USE_CAMERA
// กล้อง XIAO ส่งทางเดียวเข้า RX2
// ⚠️ ต้องระบุขาทุกครั้งที่เรียก Serial2.begin ห้ามเรียกแบบไม่ระบุขา
//    ค่าเริ่มต้นของ TX2 คือ GPIO17 ซึ่งตอนนี้เป็นขา DC ของจอ
//    ถ้าปล่อยให้ UART ยึดขาไป จอจะเพี้ยนทันที ข้อนี้สำคัญกว่าเดิมหลังย้ายผังขา
const int CAM_RX_PIN = 23;
const int CAM_TX_PIN = -1;
#endif

// =====================================================================
// กันตก TCRT5000 — สเปกวันศุกร์ข้อ 6
// ซ้าย GPIO13 ขวา GPIO19 (สองขานี้อยู่ติด GND บนบอร์ด · ไม่ใช้ GPIO2 ที่เป็น strapping)
// ตั้ง INPUT_PULLUP: ถ้าสายหลุด ขาจะอ่านได้ 1 = "เจอขอบ" หุ่นจะไม่ยอมเดินหน้า
//   (เลือกทางปลอดภัย) ถ้าต้องเดโมโดยไม่มีเซนเซอร์ ปิดด้วย !cliff 0
// =====================================================================
const int PIN_CLIFF_L = 13;
const int PIN_CLIFF_R = 19;
bool cliffL = false, cliffR = false;     // หลังกรองสัญญาณแล้ว
volatile bool cliffIsrArmed = false;     // สำเนาของ cfg.cliffEnable ให้ ISR อ่าน
volatile uint8_t cliffEdgeLvlIsr = 1;    // สำเนาของ cfg.cliffEdgeLevel ให้ ISR อ่าน
volatile bool cliffIsrHit = false;
uint32_t cliffEvents = 0;

// =====================================================================
// VL53L0X — สเปกวันศุกร์ข้อ 5 (บัส I2C เดียวกับ PCA9685 ที่ 0x29)
// =====================================================================
#define VL_ADDR       0x29
#define VL_NO_TARGET  2000      // ไกลกว่านี้หรือไม่เจออะไร = 2000 ใน /state
bool    vlOnline = false;
int     vlMm     = -1;          // -1 = ไม่มีเซนเซอร์/ยังไม่มีค่า
enum { OBJ_NONE = 0, OBJ_SEEN = 1, OBJ_HOLD = 2, OBJ_PLACED = 3 };
uint8_t objSt    = OBJ_NONE;    // 0 ไม่มีของ 1 เจอของ 2 ยกอยู่ 3 วางแล้ว(ปล่อยแล้ว)
bool    holding  = false;       // true = ยกของอยู่ (ตัดสินจาก VL53)
int8_t  lastVerify = -1;        // ผล Q/G ล่าสุด: 1 ยกได้ 0 ไม่ได้ยก -1 ยังไม่ตรวจ/ไม่มีเซนเซอร์

// กล้อง: ตัวอักษรล่าสุด และเวลาที่รับได้ล่าสุด (สเปกวันศุกร์ข้อ 7)
char camLast = '-';
unsigned long camLastMs = 0;
bool camOk = false;
#define CAM_LOST_MS 5000
bool camTrkActive = false;      // กำลังหันตามหน้าคน (กล้องติดตาม #530) — ไอเดิลหันหัวต้องหลบให้

// =====================================================================
// Encoder ล้อ — TT Motor 1:90 พร้อม Hall encoder
// ---------------------------------------------------------------------
// GPIO34/35/36/39 เป็นขารับอย่างเดียวและไม่มี pull-up ภายใน
// ---------------------------------------------------------------------
// ✅ ยืนยันแล้ว 7 ก.ย. 2569 จากรูปสเปกบอร์ด Encoder:
//    บอร์ด Encoder "มีตัวต้านทาน pull-up มาในตัวแล้ว" จึงไม่ต้องเพิ่มภายนอก
//    อีก 4 ตัว และไม่ต้องใส่ตัวต้านทานที่สายควบคุม ESP32 → TB6612 ทั้งหกเส้น
//    เมื่อ TB VCC ใช้ 3.3V — ต่อสายตรงได้ทั้งสองชุด
//
// ⚠️ สิ่งที่ยังไม่ยืนยันคือ "แรงดันเลี้ยง Encoder" ที่ขา 02 ของหัว PH2.0-6P
//    ค่า 6V ในตารางสเปกเป็นแรงดันของมอเตอร์ ไม่ใช่ของ Encoder
//    ให้ต่อขา 02 เข้า 3.3V ตามผัง และ "ห้ามเปลี่ยนไปใช้ 5V เอง"
//    เพราะ pull-up ที่อยู่บนบอร์ดจะดันสัญญาณ A/B ขึ้นถึง 5V ตามไฟที่เลี้ยง
//    ซึ่งเข้า GPIO34/35/36/39 ตรง ๆ ไม่ได้ (ไม่ทนแรงดัน 5V)
//    วิธียืนยัน: เลี้ยง 3.3V แล้วหมุนล้อด้วยมือ ถ้า A/B สลับ 0/1 ได้ = ใช้ 3.3V ได้จริง
//    ถ้าค้างระดับเดิมไม่ว่าหมุนยังไง แปลว่าชิปต้องการไฟสูงกว่านี้ ให้หยุดแล้วตรวจรุ่นชิป
//
//    ขา 05 ของหัว PH2.0-6P คือ Encoder GND (ข้อความไทยในรูปชุดก่อนพิมพ์ผิด)
// ---------------------------------------------------------------------
//
// GPIO36/39 (VP/VN) มีอาการพัลส์หลอกที่รู้กันของ ESP32 ถ้าปุ่ม N รายงานว่า
// ฝั่งขวาเดินเองทั้งที่ไม่ได้หมุนล้อ ให้ตั้ง ENC_R_QUADRATURE เป็น 0
// ฝั่งขวาจะเปลี่ยนไปนับเฉพาะขอบขาขึ้นของขา A แล้วเอาทิศจากคำสั่งมอเตอร์แทน
//
// ⚠️ ค่านับต่อรอบล้อข้างล่างเป็นค่าอ้างอิงจากเอกสารเดิม ยังไม่ได้วัดกับล้อชุดนี้
//    ให้สอบเทียบด้วย EncoderMotorTest_TT.ino ปุ่ม k แล้วกลับมาแก้ตัวเลขตรงนี้
// =====================================================================
#define ENC_R_QUADRATURE 1
#define ENC_CPR_L   4680.0f
#if ENC_R_QUADRATURE
  #define ENC_CPR_R 4680.0f
#else
  #define ENC_CPR_R 1170.0f
#endif

// ประกาศไว้นอก #if เพื่อให้ /state อ้างถึงได้เสมอ แม้ปิด USE_ENCODER
float encRpmL = 0.0f;
float encRpmR = 0.0f;

#if USE_ENCODER
const int ENC_L_A = 34;
const int ENC_L_B = 35;
const int ENC_R_A = 36;
const int ENC_R_B = 39;

#define ENC_SAMPLE_MS 200   // คาบสุ่มตัวอย่างสำหรับคำนวณ RPM
#define ENC_STALL_MS  600   // สั่งเดินแล้วตัวนับนิ่งเกินนี้ = ล้อติดขัด ให้หยุดเอง

portMUX_TYPE encMux = portMUX_INITIALIZER_UNLOCKED;
volatile int32_t encCountL = 0;
volatile int32_t encCountR = 0;
volatile uint8_t encStateL = 0;
volatile uint8_t encStateR = 0;
volatile int8_t  encCmdDirR = 1;   // ใช้เฉพาะโหมดนับขอบเดียวฝั่งขวา
int encCmdL = 0;                   // ความเร็วที่สั่งล่าสุด ใช้ตรวจอาการล้อติดขัด
int encCmdR = 0;

// เวลาล่าสุดที่ตัวนับขยับ ใช้ตัดสินว่าล้อติดขัด
// ต้องประกาศไว้ตรงนี้ ไม่ใช่ในบล็อกฟังก์ชันข้างล่าง เพราะ driveMotor() ต้องรีเซ็ตค่านี้
// ทุกครั้งที่เริ่มสั่งเดิน ไม่งั้นค่าจะค้างจากครั้งก่อนแล้วหุ่นจะหยุดเองทันทีที่สั่ง
unsigned long encLastMoveMsL = 0;
unsigned long encLastMoveMsR = 0;

// ตารางถอดรหัส quadrature: index = (สถานะก่อน << 2) | สถานะใหม่
// สถานะ = (A << 1) | B   ช่องที่เป็น 0 คือกระโดดข้ามขั้น = สัญญาณรบกวน

// ---------------------------------------------------------------------
// เครื่องหมายของตัวนับ — ยืนยันกับของจริงแล้ว 7 ก.ย. 2569
// มอเตอร์สองตัวติดหันหลังชนกัน ตอนหุ่นเดินหน้าเพลาจึงหมุนคนละทิศโดยธรรมชาติ
// Encoder ที่เกาะเพลาก็เลยนับคนละเครื่องหมาย ซึ่งไม่ใช่อาการเสีย
// ทดสอบแล้วว่าเดินหน้า ถอย เลี้ยวซ้าย เลี้ยวขวา ถูกทุกทิศ สายมอเตอร์จึงถูกทั้งชุด
// เหลือแค่กลับเครื่องหมายฝั่งซ้ายให้ "เดินหน้า = นับบวก" เหมือนกันทั้งสองข้าง
//
// แก้ที่แฟล็กนี้แทนการสลับเลขขา เพื่อให้ ENC_L_A/ENC_L_B ในโค้ด
// ยังตรงกับสาย E03/E04/E07/E08 ในเอกสารต่อสาย อ่านเทียบกันได้ตรง ๆ
// ---------------------------------------------------------------------
#define ENC_INVERT_LEFT  true    // วัดแล้ว: สั่ง +90 ได้ -64 RPM จึงกลับเครื่องหมาย
#define ENC_INVERT_RIGHT false   // วัดแล้ว: สั่ง +90 ได้ +64 RPM ถูกอยู่แล้ว

static const int8_t ENC_SIGN_L = ENC_INVERT_LEFT  ? -1 : 1;
static const int8_t ENC_SIGN_R = ENC_INVERT_RIGHT ? -1 : 1;

// ตารางถอดรหัส quadrature: index = (สถานะก่อน << 2) | สถานะใหม่
static const int8_t ENC_QDEC[16] = {
   0, -1,  1,  0,
   1,  0,  0, -1,
  -1,  0,  0,  1,
   0,  1, -1,  0
};

void IRAM_ATTR encIsrLeft() {
  uint8_t st = (uint8_t)((digitalRead(ENC_L_A) << 1) | digitalRead(ENC_L_B));
  portENTER_CRITICAL_ISR(&encMux);
  encStateL = (uint8_t)(((encStateL << 2) | st) & 0x0F);
  encCountL += ENC_SIGN_L * ENC_QDEC[encStateL];
  portEXIT_CRITICAL_ISR(&encMux);
}

#if ENC_R_QUADRATURE
void IRAM_ATTR encIsrRight() {
  uint8_t st = (uint8_t)((digitalRead(ENC_R_A) << 1) | digitalRead(ENC_R_B));
  portENTER_CRITICAL_ISR(&encMux);
  encStateR = (uint8_t)(((encStateR << 2) | st) & 0x0F);
  encCountR += ENC_SIGN_R * ENC_QDEC[encStateR];
  portEXIT_CRITICAL_ISR(&encMux);
}
#else
void IRAM_ATTR encIsrRight() {
  portENTER_CRITICAL_ISR(&encMux);
  encCountR += encCmdDirR;   // โหมดขอบเดียว ทิศมาจากคำสั่งอยู่แล้ว ไม่ต้องใช้ ENC_SIGN_R
  portEXIT_CRITICAL_ISR(&encMux);
}
#endif
#endif  // USE_ENCODER

// =====================================================================
// Gripper Config — ค่าจาก Robo.ino (โปรโตไทป์ 1)
// ตัวสำเร็จไม่ใช้มุมพวกนี้สั่งเซอร์โวตรงแล้ว ใช้แค่แปลงค่าเดิม → เปอร์เซ็นต์หนีบ
// (moveHand1/moveHand2 ที่รับมุมแบบเดิม) มุมจริงมาจากค่าสอบเทียบใน NVS
// =====================================================================
#define HAND1_OPEN      160
#define HAND1_CENTER    130
#define HAND1_CLOSE     105
#define HAND2_OPEN       80
#define HAND2_CENTER     50
#define HAND2_CLOSE      25
#define GRIP_STEP         2
#define GRIP_STEP_DELAY  30
#define GRIP_SAFE_BACK    3     // ถอยกลับ 3% × 2 หลังหนีบ กันเซอร์โว stall
#define GRIP_HOLD_MS    300
#define GRIP_SLOW_SCALE 0.3f    // หนีบช้า = 30% ของความเร็วมือปกติ (แทนการหนีบทีละ 3%)

int currentHand1Angle = 90;     // มุมเซอร์โวจริงของ CH1 (ให้ /state)
int currentHand2Angle = 90;     // มุมเซอร์โวจริงของ CH3

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
// หน้าที่อยู่บนจอจริงตอนนี้ ใช้ให้เว็บตามจอ ไม่ใช่ให้จอตามเว็บ
// ต่างจาก currentEmotion ตรงที่ตัวนั้นเปลี่ยนเฉพาะตอนสั่งผ่านระบบอารมณ์
// ส่วนคำสั่งจากเว็บอย่าง "h;" เรียก drawEyes_Happy() ตรง ๆ โดยไม่แตะ currentEmotion
// เว็บจึงไม่เคยเห็นหน้าเปลี่ยนเลย ตัวแปรนี้แก้ตรงนั้น
char lastDrawnEyes = 'N';
uint32_t eyeDrawCount = 0;

// โหมด F ค้างภาพจริง 10 วินาที โดยยังบริการเว็บและตรวจล้อติดขัดใน loop()
bool faceDiagnosticActive = false;
const unsigned long FACE_DIAGNOSTIC_HOLD_MS = 10000;
unsigned long faceDiagnosticStartedMs = 0;
unsigned long faceDiagnosticFillUs = 0;
unsigned long faceDiagnosticNormalUs = 0;
unsigned long faceDiagnosticRevertRemainingMs = 0;
uint32_t faceDiagnosticHoldDraws = 0;

uint16_t HEART_COLOR = 0xF800;  // สีแดงหัวใจ (ตั้งจริงใน setup เมื่อเปิดจอ)
uint16_t BLUSH_PINK  = 0xFDB8;  // สีชมพูแก้ม (ตั้งจริงใน setup เมื่อเปิดจอ)

// =====================================================================
// Forward declarations
// =====================================================================
void doBodyGesture(char emo);
void drawEyesForEmotion(char emo);
void setServoAngle(uint8_t ch, int angle);
void moveArm1(int angle);
void moveArm2(int angle);
void moveHead(int angle);
void moveHeadTilt(int angle);
void setServoMicroseconds(uint8_t ch, int us);
void centerAllServos();
void axesSyncFromHw();
void cmdAbort(const char* why);
void printServoTable();

// =====================================================================
// ===== แกนกลาง: สั่งมุมผ่าน PCA9685 (สเปกข้อ 8) =====
// =====================================================================
// แปลง ไมโครวินาที → tick 12 บิต ของ PCA9685
//   คาบที่ 50Hz = 1000000/50 = 20000 us  ต่อ 4096 tick
//   tick = us * 4096 / 20000
// =====================================================================
uint16_t usToTicks(int us) {
  long ticks = ((long)us * 4096L) / (1000000L / SERVO_FREQ_HZ);
  if (ticks < 0)    ticks = 0;
  if (ticks > 4095) ticks = 4095;
  return (uint16_t)ticks;
}

// หา config ของ channel (คืน nullptr ถ้าไม่มีในตาราง)
ServoCfg* findServo(uint8_t ch) {
  for (int i = 0; i < SERVO_COUNT; i++) {
    if (SERVOS[i].ch == ch) return &SERVOS[i];
  }
  return nullptr;
}

// --- เขียนมุมดิบ 0-180 ไม่สนลิมิตกลไก (ใช้เฉพาะโหมดสอบเทียบ K) ---
void setServoRawF(uint8_t ch, float angle) {
  ServoCfg* s = findServo(ch);
  if (s == nullptr) { Serial.printf("[SERVO] ไม่รู้จัก CH%u — ข้าม\n", ch); return; }
  angle = constrain(angle, 0.0f, 180.0f);
  int us = (int)lroundf(s->minUs + (s->maxUs - s->minUs) * angle / 180.0f);
  servoAngleNow[ch] = (int)lroundf(angle);
  servoUsNow[ch]    = us;
  if (!pcaOnline) return;          // ไม่มีบอร์ด PCA9685 อยู่ ไม่ต้องเสียเวลาเขียน I2C
  pca.setPWM(ch, 0, usToTicks(us));
  servoLive[ch] = true;
}

// --- สั่งมุมเซอร์โว (ทศนิยม) โดยบีบตามลิมิตของช่องนั้น ---
void setServoAngleF(uint8_t ch, float angle) {
  ServoCfg* s = findServo(ch);
  if (s == nullptr) { Serial.printf("[SERVO] ไม่รู้จัก CH%u — ข้าม\n", ch); return; }
#if CALIB_FREE_RANGE
  angle = constrain(angle, 0.0f, 180.0f);                          // โหมดหาตำแหน่ง
#else
  angle = constrain(angle, (float)s->minAngle, (float)s->maxAngle); // โหมดใช้งานจริง
#endif
  setServoRawF(ch, angle);
}

// --- สั่งมุมเซอร์โวหนึ่งช่อง (ชื่อเดิม) ---
void setServoAngle(uint8_t ch, int angle) { setServoAngleF(ch, (float)angle); }

// --- แทน .detach() ของเดิม: สั่ง full-off ---
// ⚠️ สเปกข้อ 8: ใช้ได้เฉพาะกลไกที่ไม่ต้องใช้แรงค้างตำแหน่ง
//    ถ้าแขนรับน้ำหนักอยู่แล้ว full-off แขนจะตก
void releaseServoChannel(uint8_t ch) {
  if (!pcaOnline) return;
  pca.setPWM(ch, 0, 4096);   // bit 12 ของ OFF = full-off
  servoLive[ch] = false;
}

void releaseAllServos() {
  Serial.println("[SERVO] full-off ทุกช่อง — ระวังแขนตก");
  for (int i = 0; i < SERVO_COUNT; i++) releaseServoChannel(SERVOS[i].ch);
}

// =====================================================================
// ค่าสอบเทียบ (NVS)
// =====================================================================
Preferences prefs;

void cfgDefaults() {
  memset(&cfg, 0, sizeof(cfg));
  cfg.magic = CFG_MAGIC; cfg.ver = CFG_VER;
  // แขน: ค่าเริ่ม = 90 เป็นแนวนอน ต้องสอบเทียบกับตัวจริง (โหมด K ปุ่ม h)
  //   ทิศเริ่มต้นตามโค้ดเดิม: แขนซ้าย 67 = ยก (มุมลด = ยก) แขนขวา 118 = ยก (มุมเพิ่ม = ยก)
  cfg.armHz[0] = 90;  cfg.armDir[0] = -1;
  cfg.armHz[1] = 90;  cfg.armDir[1] = +1;
  // มือ: กลาง 90 กาง −30 หนีบ +28.5 (แขนรอบ 3) · สองข้างติดกลับด้านกัน (สมมติ) ต้องสอบเทียบ
  cfg.handCenter[0] = 90; cfg.handOpen[0] = -30; cfg.handClose[0] = 28.5; cfg.handDir[0] = +1;
  cfg.handCenter[1] = 90; cfg.handOpen[1] = -30; cfg.handClose[1] = 28.5; cfg.handDir[1] = -1;
  cfg.yawCenter  = 90; cfg.yawDir  = +1;
  cfg.tiltCenter = 90; cfg.tiltDir = +1;   // โค้ดเดิม: 80 = "หัวก้มนิด" → มุมเพิ่ม = เงย
  cfg.headVmax = 90;   cfg.headAcc = 240;  // สเปกข้อ 4: ราว 90°/วิ
  cfg.yawReleaseMs = 2000; cfg.tiltReleaseMs = 2000;
  cfg.armVmax  = 90;   cfg.armAcc  = 240;
  cfg.handVmax = 120;  cfg.handAcc = 480;
  cfg.cliffEnable = 1; cfg.cliffEdgeLevel = 1;
  cfg.vlNearMm = 150;  cfg.vlJumpMm = 100;
  cfg.motorRampMs = 400;
  cfg.ilkEnable = 1;
}

// ตรวจไม่ให้ค่าที่โหลด/ตั้ง หลุดช่วงที่ปลอดภัย
void cfgSanitize() {
  for (int s = 0; s < 2; s++) {
    cfg.armHz[s]      = constrain(cfg.armHz[s], 0.0f, 180.0f);
    cfg.armDir[s]     = (cfg.armDir[s] >= 0) ? 1 : -1;
    cfg.handCenter[s] = constrain(cfg.handCenter[s], 0.0f, 180.0f);
    cfg.handOpen[s]   = constrain(cfg.handOpen[s], JOINT_LIMITS[AX_HAND_L].relMin, -5.0f);
    cfg.handClose[s]  = constrain(cfg.handClose[s], 5.0f, JOINT_LIMITS[AX_HAND_L].relMax);
    cfg.handDir[s]    = (cfg.handDir[s] >= 0) ? 1 : -1;
  }
  cfg.yawCenter  = constrain(cfg.yawCenter, 0.0f, 180.0f);  cfg.yawDir  = (cfg.yawDir  >= 0) ? 1 : -1;
  cfg.tiltCenter = constrain(cfg.tiltCenter, 0.0f, 180.0f); cfg.tiltDir = (cfg.tiltDir >= 0) ? 1 : -1;
  cfg.headVmax = constrain(cfg.headVmax, 10.0f, 200.0f);    // 200°/s = 0.3 s/60° เพดานแรงบิด SG90
  cfg.headAcc  = constrain(cfg.headAcc, 30.0f, 2000.0f);
  cfg.armVmax  = constrain(cfg.armVmax, 10.0f, 300.0f);
  cfg.armAcc   = constrain(cfg.armAcc, 30.0f, 3000.0f);
  cfg.handVmax = constrain(cfg.handVmax, 10.0f, 400.0f);
  cfg.handAcc  = constrain(cfg.handAcc, 30.0f, 5000.0f);
  cfg.cliffEnable = cfg.cliffEnable ? 1 : 0;
  cfg.cliffEdgeLevel = cfg.cliffEdgeLevel ? 1 : 0;
  cfg.vlNearMm = constrain(cfg.vlNearMm, (uint16_t)30, (uint16_t)1000);
  cfg.vlJumpMm = constrain(cfg.vlJumpMm, (uint16_t)20, (uint16_t)1500);
  cfg.motorRampMs = constrain(cfg.motorRampMs, (uint16_t)0, (uint16_t)2000);
  cfg.ilkEnable = cfg.ilkEnable ? 1 : 0;
}

bool cfgLoad() {
  bool ok = false;
  if (prefs.begin("meto", true)) {
    if (prefs.getBytesLength("cfg") == sizeof(MetoCfg)) {
      MetoCfg t;
      prefs.getBytes("cfg", &t, sizeof(t));
      if (t.magic == CFG_MAGIC && t.ver == CFG_VER) { cfg = t; ok = true; }
    }
    prefs.end();
  }
  if (!ok) cfgDefaults();
  cfgSanitize();
  return ok;
}

bool cfgSave() {
  cfgSanitize();
  if (!prefs.begin("meto", false)) return false;
  size_t w = prefs.putBytes("cfg", &cfg, sizeof(cfg));
  prefs.end();
  return w == sizeof(cfg);
}

void cfgPrint() {
  Serial.println("---------- ค่าสอบเทียบ / ค่าตั้ง (NVS) ----------");
  Serial.printf(" แขนซ้าย  CH0 แนวนอน=%.1f ทิศยก=%+d   แขนขวา CH2 แนวนอน=%.1f ทิศยก=%+d\n",
                cfg.armHz[0], cfg.armDir[0], cfg.armHz[1], cfg.armDir[1]);
  Serial.printf(" มือซ้าย  CH1 กลาง=%.1f กาง=%.1f หนีบ=%.1f ทิศหนีบ=%+d\n",
                cfg.handCenter[0], cfg.handOpen[0], cfg.handClose[0], cfg.handDir[0]);
  Serial.printf(" มือขวา   CH6 กลาง=%.1f กาง=%.1f หนีบ=%.1f ทิศหนีบ=%+d\n",
                cfg.handCenter[1], cfg.handOpen[1], cfg.handClose[1], cfg.handDir[1]);
  Serial.printf(" หัวหัน   CH4 ตรง=%.1f ทิศ(ไปทางแขนซ้าย)=%+d   หัวก้มเงย CH5 ตรง=%.1f ทิศเงย=%+d\n",
                cfg.yawCenter, cfg.yawDir, cfg.tiltCenter, cfg.tiltDir);
  Serial.printf(" หัว ความเร็ว=%.0f°/s เร่ง=%.0f°/s² ปลดแรงหัน=%u ms ปลดแรงก้มเงย=%u ms\n",
                cfg.headVmax, cfg.headAcc, cfg.yawReleaseMs, cfg.tiltReleaseMs);
  Serial.printf(" แขน ความเร็ว=%.0f เร่ง=%.0f   มือ ความเร็ว=%.0f เร่ง=%.0f\n",
                cfg.armVmax, cfg.armAcc, cfg.handVmax, cfg.handAcc);
  Serial.printf(" กันตก=%s ระดับขอบ=%u   VL53 ใกล้=%u mm กระโดด=%u mm   ชะลอล้อ=%u ms   interlock=%s\n",
                cfg.cliffEnable ? "เปิด" : "ปิด", cfg.cliffEdgeLevel, cfg.vlNearMm, cfg.vlJumpMm,
                cfg.motorRampMs, cfg.ilkEnable ? "เปิด" : "ปิด");
  Serial.println("--------------------------------------------------");
}

// =====================================================================
// แปลงมุมเชิงกล ↔ มุมเซอร์โว
// =====================================================================
float axCenter(int i) {
  switch (i) {
    case AX_ARM_L:  return cfg.armHz[0];
    case AX_ARM_R:  return cfg.armHz[1];
    case AX_HAND_L: return cfg.handCenter[0];
    case AX_HAND_R: return cfg.handCenter[1];
    case AX_YAW:    return cfg.yawCenter;
    default:        return cfg.tiltCenter;
  }
}
int axDir(int i) {
  switch (i) {
    case AX_ARM_L:  return cfg.armDir[0];
    case AX_ARM_R:  return cfg.armDir[1];
    case AX_HAND_L: return cfg.handDir[0];
    case AX_HAND_R: return cfg.handDir[1];
    case AX_YAW:    return cfg.yawDir;
    default:        return cfg.tiltDir;
  }
}
float relToServo(int i, float r) { return axCenter(i) + axDir(i) * r; }
float servoToRel(int i, float s) { return (s - axCenter(i)) * axDir(i); }

// ช่วงมุมเชิงกลที่สั่งได้ — มือใช้ค่า กาง/หนีบ ที่สอบเทียบไว้ (อยู่ในลิมิตกลางเสมอ)
float axRelMin(int i) {
  if (i == AX_HAND_L) return cfg.handOpen[0];
  if (i == AX_HAND_R) return cfg.handOpen[1];
  return JOINT_LIMITS[i].relMin;
}
float axRelMax(int i) {
  if (i == AX_HAND_L) return cfg.handClose[0];
  if (i == AX_HAND_R) return cfg.handClose[1];
  return JOINT_LIMITS[i].relMax;
}

// คำนวณลิมิตมุมเซอร์โวของทุกช่องจากตารางลิมิตกลาง + ค่าสอบเทียบ
void applyLimitsFromConfig() {
  for (int i = 0; i < AX_N; i++) {
    float a = relToServo(i, JOINT_LIMITS[i].relMin);
    float b = relToServo(i, JOINT_LIMITS[i].relMax);
    float lo = constrain(min(a, b), 0.0f, 180.0f);
    float hi = constrain(max(a, b), 0.0f, 180.0f);
    SERVOS[i].minAngle    = (int)ceilf(lo - 0.001f);
    SERVOS[i].maxAngle    = (int)floorf(hi + 0.001f);
    SERVOS[i].centerAngle = (int)lroundf(constrain(relToServo(i, 0), lo, hi));
  }
  cliffIsrArmed   = cfg.cliffEnable != 0;
  cliffEdgeLvlIsr = cfg.cliffEdgeLevel;
}

// =====================================================================
// INTERLOCK แขน/หัว — สเปกวันศุกร์ข้อ 3
// ที่มา: sim/รายงาน_จำลอง.md ข้อ 2 + json/05_cross_R.npz (ตารางชน 4 มิติ
//        หัน×พยัก×ยก×หนีบ ทีละ 2°) แปลงเป็น meto_interlock_table.h ด้วย gen_ilk.py
//        ขยายเขตชนแล้ว 1 ช่องตาราง (= หักเผื่อ 2° ทุกแกน ตามระยะคลอนเฟือง)
// แขนซ้ายใช้ตารางแขนขวาโดยกลับเครื่องหมายมุมหัน (ตรวจแล้วตรงกับตาราง L ทุกช่อง)
// ค่าระหว่างจุดตาราง: ตรวจทุกจุดตารางที่ล้อมรอบ ถ้าจุดไหนชน = ชน
// อยากเปลี่ยนตาราง: รัน gen_ilk.py ใหม่ แล้วแทนไฟล์ .h — โค้ดนี้ไม่ต้องแก้
// =====================================================================
static int ilkBracket(float v, float v0, float step, int n, int out[2]) {
  float f = (v - v0) / step;
  if (f <= 0.0f)            { out[0] = 0;     return 1; }
  if (f >= (float)(n - 1))  { out[0] = n - 1; return 1; }
  int j = (int)floorf(f);
  float fr = f - j;
  if (fr < 1e-3f)           { out[0] = j;     return 1; }
  if (fr > 1.0f - 1e-3f)    { out[0] = j + 1; return 1; }
  out[0] = j; out[1] = j + 1; return 2;
}
static int ilkBracketLift(float v, int out[2]) {
  if (v <= ILK_LIFTS[0])          { out[0] = 0;          return 1; }
  if (v >= ILK_LIFTS[ILK_NL - 1]) { out[0] = ILK_NL - 1; return 1; }
  for (int j = 0; j < ILK_NL - 1; j++) {
    if (v >= ILK_LIFTS[j] && v <= ILK_LIFTS[j + 1]) {
      if (fabsf(v - ILK_LIFTS[j]) < 1e-3f)     { out[0] = j;     return 1; }
      if (fabsf(v - ILK_LIFTS[j + 1]) < 1e-3f) { out[0] = j + 1; return 1; }
      out[0] = j; out[1] = j + 1; return 2;
    }
  }
  out[0] = ILK_NL - 1; return 1;
}
// true = ท่านี้ของแขนขวาชนหัว (พิกัดตามตาราง: หัน, พยัก, ยก, หนีบ)
bool ilkHitArmR(float yaw, float nod, float lift, float grip) {
  int yi[2], ni[2], li[2], ci[2];
  int ny = ilkBracket(yaw,  ILK_YAW0,   ILK_YAW_STEP,   ILK_NY, yi);
  int nn = ilkBracket(nod,  ILK_NOD0,   ILK_NOD_STEP,   ILK_NN, ni);
  int nl = ilkBracketLift(lift, li);
  int nc = ilkBracket(grip, ILK_CLAMP0, ILK_CLAMP_STEP, ILK_NC, ci);
  for (int a = 0; a < ny; a++)
    for (int b = 0; b < nn; b++) {
      uint8_t m = pgm_read_byte(&ILK_IDX[yi[a]][ni[b]]);
      for (int c = 0; c < nl; c++)
        for (int d = 0; d < nc; d++) {
          int bit = li[c] * ILK_NC + ci[d];
          if ((pgm_read_byte(&ILK_MAPS[m][bit >> 3]) >> (bit & 7)) & 1) return true;
        }
    }
  return false;
}
// ท่าทั้งตัว (มุมเชิงกลทุกแกน) ปลอดภัยไหม — ต้องผ่านทั้งสองแขน
bool poseOK(const float r[AX_N]) {
  if (!cfg.ilkEnable) return true;
  if (ilkHitArmR( r[AX_YAW], r[AX_TILT], r[AX_ARM_R], r[AX_HAND_R])) return false;
  if (ilkHitArmR(-r[AX_YAW], r[AX_TILT], r[AX_ARM_L], r[AX_HAND_L])) return false;
  return true;
}

// =====================================================================
// แกนขยับนุ่ม (สเปกวันศุกร์ข้อ 4) — ใช้กับเซอร์โวทุกตัว ไม่ใช่แค่หัว
//   ความเร็วเข้าหาเป้าแบบจำกัดทั้งความเร็วและความเร่ง = ease-in/out
//   เปลี่ยนเป้ากลางทางได้โดยไม่กระชาก (ความเร็วต่อเนื่อง) ไม่มี delay
// =====================================================================
#define AX_TICK_MS 20
unsigned long axLastTick = 0;
bool  tiltDuck = false;        // หัวก้ม/เงยหลบชั่วคราวเพื่อให้หัวหันผ่านช่วงที่ชน
float tiltSavedRel = 0;
uint32_t ilkClampCount = 0;    // จำนวนครั้งที่ interlock ตัดเป้าคำสั่ง

bool axMoving(int i) { return fabsf(ax[i].target - ax[i].pos) > 0.05f || ax[i].vel != 0.0f; }

void axPosesRel(float out[AX_N], bool targets) {
  for (int i = 0; i < AX_N; i++) out[i] = servoToRel(i, targets ? ax[i].target : ax[i].pos);
}

float axVmax(int i) {
  float v = (i == AX_YAW || i == AX_TILT) ? cfg.headVmax
          : (i == AX_ARM_L || i == AX_ARM_R) ? cfg.armVmax : cfg.handVmax;
  return v * ax[i].vScale;
}
float axAcc(int i) {
  return (i == AX_YAW || i == AX_TILT) ? cfg.headAcc
       : (i == AX_ARM_L || i == AX_ARM_R) ? cfg.armAcc : cfg.handAcc;
}

// ตั้งเป้าตรง ๆ (บีบตามลิมิต ไม่เช็ก interlock)
void axSetTargetRaw(int i, float rel) {
  rel = constrain(rel, axRelMin(i), axRelMax(i));
  float s = relToServo(i, rel);
  ax[i].target = constrain(s, (float)SERVOS[i].minAngle, (float)SERVOS[i].maxAngle);
}

// ตั้งเป้าแบบผ่าน interlock — ทุกคำสั่ง (เว็บ ปุ่ม กล้อง ท่าอารมณ์) เข้าทางนี้ทางเดียว
//   1) บีบตามลิมิตกลาง
//   2) ถ้าท่าปลายทาง (รวมเป้าของแกนอื่น) ชน:
//      - หัวหัน: ลองขยับเป้าก้มเงยให้ใกล้สุดที่ไม่ชนก่อน (ให้หันได้ตามสั่ง)
//      - อื่น ๆ: ถอยเป้ากลับทางตำแหน่งเดิมทีละ 1° จนไม่ชน
// คืนค่า true ถ้าได้ตามที่สั่งพอดี
bool axTrySet(int i, float rel, bool verbose = true) {
  rel = constrain(rel, axRelMin(i), axRelMax(i));
  float P[AX_N];
  axPosesRel(P, true);
  P[i] = rel;
  if (poseOK(P)) { axSetTargetRaw(i, rel); return true; }

  if (i == AX_YAW) {
    float n0 = P[AX_TILT];
    for (int d = 1; d <= 20; d++) {
      for (int sg = -1; sg <= 1; sg += 2) {
        float n = n0 + sg * d;
        if (n < JOINT_LIMITS[AX_TILT].relMin || n > JOINT_LIMITS[AX_TILT].relMax) continue;
        P[AX_TILT] = n;
        if (poseOK(P)) {
          axSetTargetRaw(AX_TILT, n);
          axSetTargetRaw(AX_YAW, rel);
          ilkClampCount++;
          if (verbose) Serial.printf("[ILK] หันหัว %.0f ต้องปรับก้มเงยเป็น %.0f กันชนแขน\n", rel, n);
          return true;
        }
      }
    }
    P[AX_TILT] = n0;
  }

  float cur = servoToRel(i, ax[i].target);
  float step = (cur > rel) ? 1.0f : -1.0f;
  for (float v = rel + step; (step > 0) ? (v < cur) : (v > cur); v += step) {
    P[i] = v;
    if (poseOK(P)) {
      axSetTargetRaw(i, v);
      ilkClampCount++;
      if (verbose) Serial.printf("[ILK] %s สั่ง %.0f ได้แค่ %.0f (กันชนตามผลจำลอง)\n",
                                 JOINT_LIMITS[i].name, rel, v);
      return false;
    }
  }
  P[i] = cur;
  if (poseOK(P)) {                       // ไปไม่ได้เลยสักองศา = อยู่ที่เดิม
    ilkClampCount++;
    if (verbose) Serial.printf("[ILK] %s สั่ง %.0f ไม่ได้ — ท่าตอนนี้ชนถ้าขยับไปทางนั้น\n",
                               JOINT_LIMITS[i].name, rel);
    return false;
  }
  // ท่าเดิมก็ชนอยู่แล้ว (เช่น เพิ่งสอบเทียบ) ยอมให้ขยับออก
  axSetTargetRaw(i, rel);
  if (verbose) Serial.printf("[ILK] ⚠️ ท่าปัจจุบันอยู่ในเขตชนตามตาราง ยอมให้ %s ไป %.0f\n",
                             JOINT_LIMITS[i].name, rel);
  return false;
}

// ทุกรอบ loop: เดินแกนไปหาเป้า + ตัวกั้น interlock ระหว่างทาง + ปลดแรงหัว
void axesUpdate() {
  unsigned long now = millis();
  if (now - axLastTick < AX_TICK_MS) return;
  float dt = (now - axLastTick) / 1000.0f;
  axLastTick = now;
  if (dt > 0.1f) dt = 0.1f;            // loop ค้าง (เช่นวาดจอ) ไม่ให้กระโดดไกล

  float P[AX_N];
  axPosesRel(P, false);
  bool curOK = poseOK(P);
  static const int ORDER[AX_N] = { AX_TILT, AX_HAND_L, AX_HAND_R, AX_ARM_L, AX_ARM_R, AX_YAW };
  bool yawBlocked = false;
  float yawCand = 0;

  for (int k = 0; k < AX_N; k++) {
    int i = ORDER[k];
    Axis& a = ax[i];
    float err = a.target - a.pos;
    if (fabsf(err) < 0.05f && fabsf(a.vel) < 2.0f) {
      a.pos = a.target; a.vel = 0; a.blockedSinceMs = 0;
      continue;
    }
    float vmax = axVmax(i), acc = axAcc(i);
    float vdes = sqrtf(2.0f * acc * fabsf(err));     // ชะลอให้ทันหยุดพอดีเป้า
    if (vdes > vmax) vdes = vmax;
    if (err < 0) vdes = -vdes;
    float dv = acc * dt;
    float nv = a.vel + constrain(vdes - a.vel, -dv, dv);
    float np = a.pos + nv * dt;
    if ((err > 0 && np > a.target) || (err < 0 && np < a.target)) { np = a.target; nv = 0; }

    float keep = P[i];
    P[i] = servoToRel(i, np);
    if (!curOK || poseOK(P)) {
      a.pos = np; a.vel = nv; a.lastMoveMs = now; a.blockedSinceMs = 0;
    } else {                                         // ก้าวนี้จะชน → หยุดรอ
      P[i] = keep; a.vel = 0;
      if (a.blockedSinceMs == 0) a.blockedSinceMs = now;
      if (i == AX_YAW) { yawBlocked = true; yawCand = servoToRel(i, np); }
    }
  }

  // หัวหันติดช่วงชน → ก้มเงยหลบชั่วคราว แล้วค่อยคืนค่าเมื่อหันเสร็จ
  if (yawBlocked) {
    float Q[AX_N];
    memcpy(Q, P, sizeof(Q));
    Q[AX_YAW] = yawCand;
    bool found = false; float best = 0;
    for (int d = 0; d <= 20 && !found; d++) {
      for (int sg = -1; sg <= 1 && !found; sg += 2) {
        float n = P[AX_TILT] + sg * d;
        if (n < JOINT_LIMITS[AX_TILT].relMin || n > JOINT_LIMITS[AX_TILT].relMax) continue;
        Q[AX_TILT] = n;
        if (poseOK(Q)) { found = true; best = n; }
      }
    }
    if (found) {
      if (!tiltDuck) { tiltDuck = true; tiltSavedRel = servoToRel(AX_TILT, ax[AX_TILT].target); }
      axSetTargetRaw(AX_TILT, best);
    }
  } else if (tiltDuck && !axMoving(AX_YAW)) {
    tiltDuck = false;
    axTrySet(AX_TILT, tiltSavedRel, false);
  }

  // เขียนลง PCA เฉพาะช่องที่เปลี่ยน + ปลดแรงหัวเมื่อหยุดนิ่งนาน
  for (int i = 0; i < AX_N; i++) {
    Axis& a = ax[i];
    uint8_t ch = SERVOS[i].ch;
    if (isnan(a.lastW) || fabsf(a.pos - a.lastW) > 0.04f) {
      setServoAngleF(ch, a.pos);
      a.lastW = a.pos;
    }
    if (i == AX_YAW || i == AX_TILT) {
      uint16_t relMs = (i == AX_YAW) ? cfg.yawReleaseMs : cfg.tiltReleaseMs;
      if (relMs > 0 && servoLive[ch] && !axMoving(i) && now - a.lastMoveMs > relMs) {
        releaseServoChannel(ch);
      }
    }
  }
}

// อ่านมุมที่เครื่องมือตรวจ (T, R, จูน , .) เขียนลงไปตรง ๆ กลับมาเป็นตำแหน่งแกน
void axesSyncFromHw() {
  for (int i = 0; i < AX_N; i++) {
    float s = (float)servoAngleNow[SERVOS[i].ch];
    ax[i].pos = ax[i].target = s;
    ax[i].vel = 0; ax[i].lastW = s; ax[i].vScale = 1.0f;
    ax[i].blockedSinceMs = 0; ax[i].lastMoveMs = millis();
  }
  tiltDuck = false;
}

// =====================================================================
// มุมปัจจุบัน (ให้เว็บอ่านผ่าน /state — Digital Twin) — อัปเดตจากแกนทุกครั้งที่อ่าน
// =====================================================================
int currentArm1Angle     = 90;
int currentArm2Angle     = 90;
int currentHeadCmdAngle  = 90;
int currentHeadTiltAngle = 90;

void refreshCompatAngles() {
  currentArm1Angle     = (int)lroundf(ax[AX_ARM_L].pos);
  currentArm2Angle     = (int)lroundf(ax[AX_ARM_R].pos);
  currentHand1Angle    = (int)lroundf(ax[AX_HAND_L].pos);
  currentHand2Angle    = (int)lroundf(ax[AX_HAND_R].pos);
  currentHeadCmdAngle  = (int)lroundf(ax[AX_YAW].pos);
  currentHeadTiltAngle = (int)lroundf(ax[AX_TILT].pos);
}

// =====================================================================
// คำสั่งข้อต่อ — ชื่อเดิมทั้งหมดยังอยู่ แต่ไม่บล็อกแล้ว (แค่ตั้งเป้า)
// =====================================================================
// หัวหัน: รับมุมแบบเดิม (50/90/130) = ขยับจากมุมตรงไป −40/0/+40 องศาเซอร์โว
//   คงทิศเซอร์โวแบบเดิมไว้ ให้กล้อง/ปุ่ม 7 8 9 หันทางเดียวกับที่เคยทดสอบ
void moveHead(int angle) {
  float servo = cfg.yawCenter + (angle - 90);
  axTrySet(AX_YAW, servoToRel(AX_YAW, servo));
}
// หัวหันแบบมุมเชิงกล (+ = ไปทางแขนซ้าย) — คำสั่งใหม่ yaw:
void headYawRel(float rel) { axTrySet(AX_YAW, rel); }
// หัวก้มเงยแบบมุมเชิงกล (+ = เงย)
void headTiltRel(float rel) { tiltDuck = false; axTrySet(AX_TILT, rel); }
// หัวก้มเงย รับมุมแบบเดิม (60/90/120): ต่ำกว่า 90 = ก้ม สูงกว่า = เงย แล้วบีบที่ ±10
void moveHeadTilt(int angle) { headTiltRel((float)(angle - 90)); }

// แขน: มุมเชิงกล องศาจากแนวนอน (+ = ยก)
void armSetLift(int side, float lift) { axTrySet(side ? AX_ARM_R : AX_ARM_L, lift); }
// ชื่อเดิม รับมุมแบบเดิมของโค้ด 7 ก.ย. — แปลงเป็นท่าเดียวกันเมื่อยังไม่สอบเทียบ
//   แขนซ้าย 67/91/121 = ยก +23 / −1 / −31     แขนขวา 118/90/60 = ยก +28 / 0 / −30
void moveArm1(int angle) { armSetLift(0, (float)(90 - angle)); }
void moveArm2(int angle) { armSetLift(1, (float)(angle - 90)); }

// มือ: เปอร์เซ็นต์หนีบ 0 = กางสุด 100 = หนีบสุด (ตามค่า กาง/หนีบ ที่สอบเทียบ)
float handPctToRel(int side, float pct) {
  pct = constrain(pct, 0.0f, 100.0f);
  return cfg.handOpen[side] + (cfg.handClose[side] - cfg.handOpen[side]) * pct / 100.0f;
}
float handPctNow(int side) {
  int i = side ? AX_HAND_R : AX_HAND_L;
  float rel = servoToRel(i, ax[i].pos);
  float span = cfg.handClose[side] - cfg.handOpen[side];
  if (span < 1.0f) return 0;
  return constrain((rel - cfg.handOpen[side]) * 100.0f / span, 0.0f, 100.0f);
}
void handSetPct(int side, float pct, float vScale = 1.0f) {
  int i = side ? AX_HAND_R : AX_HAND_L;
#if USE_HAND
  ax[i].vScale = vScale;
  axTrySet(i, handPctToRel(side, pct));
#else
  (void)i; (void)vScale;
  Serial.printf("[HAND] ปิดอยู่ (USE_HAND 0) — ข้ามคำสั่งมือ %d%%\n", (int)pct);
#endif
}
void handCenterSide(int side) {
#if USE_HAND
  int i = side ? AX_HAND_R : AX_HAND_L;
  ax[i].vScale = 1.0f;
  axTrySet(i, 0);
#else
  (void)side;
#endif
}
// ชื่อเดิม รับมุมแบบโปรโตไทป์ (มือซ้าย 160 กาง → 105 หนีบ, มือขวา 80 กาง → 25 หนีบ)
void moveHand1(int angle) {
  handSetPct(0, (HAND1_OPEN - angle) * 100.0f / (HAND1_OPEN - HAND1_CLOSE));
}
void moveHand2(int angle) {
  handSetPct(1, (HAND2_OPEN - angle) * 100.0f / (HAND2_OPEN - HAND2_CLOSE));
}

// ช่วงมุมเชิงกลที่ไปได้จากท่าพัก (แกนอื่นอยู่ 0) โดยไม่ชน — ใช้กับปุ่ม T
void axValidRangeFromRest(int i, float& lo, float& hi) {
  float P[AX_N] = { 0, 0, 0, 0, 0, 0 };
  lo = 0; hi = 0;
  for (float v = 0; v <= axRelMax(i) + 0.01f; v += 1.0f) { P[i] = v; if (!poseOK(P)) break; hi = v; }
  for (float v = 0; v >= axRelMin(i) - 0.01f; v -= 1.0f) { P[i] = v; if (!poseOK(P)) break; lo = v; }
}

// =====================================================================
// ===== โหมดหาตำแหน่ง 90 องศา + ทดสอบทั้งหมด =====
// =====================================================================

void printServoTable() {
  Serial.println("---------------------------------------------------------");
  Serial.println(" ช่อง / ชื่อ            มุม     พัลส์    ลิมิต       สถานะ");
  Serial.println("---------------------------------------------------------");
  for (int i = 0; i < SERVO_COUNT; i++) {
    ServoCfg& s = SERVOS[i];
    Serial.printf(" %s %s  %3d deg %5d us  %3d-%3d   %s\n",
      (i == calibIndex) ? ">" : " ",
      s.name,
      servoAngleNow[s.ch], servoUsNow[s.ch],
      s.minAngle, s.maxAngle,
      servoLive[s.ch] ? "จ่ายไฟ" : "full-off");
  }
  Serial.printf("---------------------------------------------------------\n");
  Serial.printf(" กำลังเลือกจูน: %s   (Q=เปลี่ยนช่อง  , .=1 องศา  < >=5 องศา)\n",
                SERVOS[calibIndex].name);
#if CALIB_FREE_RANGE
  Serial.println(" CALIB_FREE_RANGE = 1 → กวาดได้ 0-180 (ยังไม่ใส่ก้านเซอร์โว)");
#else
  Serial.println(" CALIB_FREE_RANGE = 0 → จำกัดตามลิมิตกลไกจริง");
#endif
}

// --- สั่งทุกเซอร์โวไป 90 องศาดิบ ทีละตัว (ปุ่ม 0 — ใช้ตอนใส่ก้านเซอร์โว) ---
// สเปกข้อ 9: ห้ามสั่งพร้อมกันทีเดียว ต้องเว้นช่วงระหว่างช่อง
// ⚠️ บล็อกราว 3.6 วิ — เป็นเครื่องมือตอนประกอบ ไม่ได้อยู่ในเส้นทางใช้งานปกติ
void centerAllServos() {
  Serial.println("\n===== สั่งทุกเซอร์โวไป 90 องศา (ทีละตัว) =====");
  Serial.println("ใส่ก้านเซอร์โว (horn) ตอนนี้ได้เลย — เซอร์โวจะค้างแรงไว้ที่ 90");
  for (int i = 0; i < SERVO_COUNT; i++) {
    ServoCfg& s = SERVOS[i];
    setServoAngle(s.ch, 90);
    Serial.printf("  %s → %d deg = %d us\n", s.name, servoAngleNow[s.ch], servoUsNow[s.ch]);
    delay(600);            // เว้นช่วง ไม่ให้กระชากพร้อมกัน
  }
  axesSyncFromHw();
  Serial.println("===== ครบทุกตัวแล้ว =====\n");
  printServoTable();
}

// --- ท่าพักตามค่าสอบเทียบ (มุมเชิงกล 0 ทุกแกน = ท่าพักในผลจำลอง) — ใช้ตอนบูต ---
void homePoseAll(bool stagger) {
  for (int i = 0; i < AX_N; i++) {
    float rest = (i == AX_ARM_L || i == AX_ARM_R) ? REST_LIFT : 0;   // ท่าพัก R: แขนลง (#516)
    float s = constrain(relToServo(i, rest), (float)SERVOS[i].minAngle, (float)SERVOS[i].maxAngle);
    setServoAngleF(SERVOS[i].ch, s);
    ax[i].pos = ax[i].target = s;
    ax[i].vel = 0; ax[i].lastW = s; ax[i].vScale = 1.0f;
    ax[i].blockedSinceMs = 0; ax[i].lastMoveMs = millis();
    Serial.printf("  %s → ท่าพัก %.1f deg\n", SERVOS[i].name, s);
    if (stagger) delay(400);   // บูตเท่านั้น
  }
  tiltDuck = false;
}

// --- ค่อยๆ กวาดจากมุมหนึ่งไปอีกมุม (นุ่ม ไม่กระชาก) ---
void sweepServo(uint8_t ch, int fromAngle, int toAngle, int stepDelayMs = 15) {
  int step = (toAngle >= fromAngle) ? 1 : -1;
  for (int a = fromAngle; a != toAngle; a += step) {
    setServoAngle(ch, a);
    delay(stepDelayMs);
  }
  setServoAngle(ch, toAngle);
}

// --- ทดสอบทั้งหมด: ทีละตัว ท่าพัก → ต่ำสุด → ท่าพัก → สูงสุด → ท่าพัก ---
// ช่วงที่กวาด = ช่วงที่ interlock ยอมเมื่อแกนอื่นอยู่ท่าพัก (ไม่กวาดจนชนหัว/ตัว)
// ⚠️ บล็อกระหว่างทดสอบ — เครื่องมือตอนประกอบ
void testAllServos() {
  Serial.println("\n===== ทดสอบเซอร์โวทั้งหมด (ทีละตัว) =====");
  Serial.println("⚠️ ประคองแขนไว้ หรือถอดกลไกออกก่อนทดสอบครั้งแรก");

  for (int i = 0; i < AX_N; i++) setServoAngleF(SERVOS[i].ch, relToServo(i, 0));
  delay(500);

  for (int i = 0; i < SERVO_COUNT; i++) {
    ServoCfg& s = SERVOS[i];
    float rlo, rhi;
    axValidRangeFromRest(i, rlo, rhi);
    int c  = (int)lroundf(relToServo(i, 0));
    int a  = (int)lroundf(relToServo(i, rlo));
    int b  = (int)lroundf(relToServo(i, rhi));
    int lo = min(a, b), hi = max(a, b);

    Serial.printf("\n[TEST] %s   มุมเชิงกล %.0f…%.0f = เซอร์โว %d-%d deg\n", s.name, rlo, rhi, lo, hi);

    setServoAngle(s.ch, c);
    Serial.printf("   พัก   %3d deg = %4d us\n", servoAngleNow[s.ch], servoUsNow[s.ch]);
    delay(700);

    sweepServo(s.ch, c, lo);
    Serial.printf("   ต่ำสุด %3d deg = %4d us\n", servoAngleNow[s.ch], servoUsNow[s.ch]);
    delay(500);

    sweepServo(s.ch, lo, c);
    delay(300);

    sweepServo(s.ch, c, hi);
    Serial.printf("   สูงสุด %3d deg = %4d us\n", servoAngleNow[s.ch], servoUsNow[s.ch]);
    delay(500);

    sweepServo(s.ch, hi, c);
    Serial.printf("   กลับพัก %3d deg = %4d us  → ผ่าน\n",
                  servoAngleNow[s.ch], servoUsNow[s.ch]);
    delay(700);
  }

  axesSyncFromHw();
  Serial.println("\n===== ทดสอบครบทุกตัวแล้ว =====");
  printServoTable();
}

// --- จูนทีละองศาด้วยปุ่ม , . < > (ช่องที่เลือก) — ไม่ยอมถ้าจะชนตาม interlock ---
void nudgeSelectedServo(int deltaDeg) {
  ServoCfg& s = SERVOS[calibIndex];
  int i = calibIndex;                       // ลำดับตาราง = เลขแกน
  float target = (float)servoAngleNow[s.ch] + deltaDeg;
  target = constrain(target, (float)s.minAngle, (float)s.maxAngle);
  float P[AX_N];
  axPosesRel(P, false);
  P[i] = servoToRel(i, target);
  if (!poseOK(P)) {
    Serial.printf("[จูน] %s ไป %.0f deg ไม่ได้ — ชนตาม interlock (ปิดชั่วคราวได้ด้วย !ilk 0)\n",
                  s.name, target);
    return;
  }
  setServoAngleF(s.ch, target);
  ax[i].pos = ax[i].target = ax[i].lastW = target; ax[i].vel = 0;
  Serial.printf("[จูน] %s  %3d deg = %4d us  (มุมเชิงกล %.1f)\n",
                s.name, servoAngleNow[s.ch], servoUsNow[s.ch], servoToRel(i, target));
}

void selectNextServo() {
  calibIndex = (calibIndex + 1) % SERVO_COUNT;
  ServoCfg& s = SERVOS[calibIndex];
  Serial.printf("[จูน] เลือก %s  (ตอนนี้ %d deg = %d us)\n",
                s.name, servoAngleNow[s.ch], servoUsNow[s.ch]);
}

// =====================================================================
// ===== ตรวจชนิดเซอร์โว: 180 องศา หรือ หมุนรอบตัว (360/continuous) =====
// =====================================================================
// ไม่มีฟีดแบ็กกลับมาจากเซอร์โว → ต้องดูด้วยตา แล้วสรุปเอง
//
//   เซอร์โว 180 องศา (positional)
//     พัลส์ 1 ค่า = 1 ตำแหน่ง  → ขยับไปแล้ว "หยุดนิ่ง" ค้างอยู่ตรงนั้น
//     1500us = กลาง, 500us = สุดข้างหนึ่ง, 2500us = สุดอีกข้าง
//
//   เซอร์โวหมุนรอบตัว (360 / continuous)
//     พัลส์ 1 ค่า = 1 ความเร็ว  → "หมุนไม่หยุด" ตราบใดที่ยังจ่ายพัลส์อยู่
//     1500us = หยุด, ต่ำกว่า 1500 = หมุนทางหนึ่ง, สูงกว่า 1500 = หมุนอีกทาง
//
// ⚠️ ถอดก้านเซอร์โว (horn) และกลไกออกก่อนทดสอบ
//    ถ้าเป็นแบบหมุนรอบตัวแล้วยังใส่แขนอยู่ แขนจะหมุนชนตัวหุ่นทันที
// =====================================================================

// --- สั่งพัลส์ดิบเป็นไมโครวินาที (ข้ามการแปลงมุม) ---
void setServoMicroseconds(uint8_t ch, int us) {
  if (!pcaOnline) return;
  us = constrain(us, 400, 2600);
  pca.setPWM(ch, 0, usToTicks(us));
  servoUsNow[ch] = us;
  servoLive[ch]  = true;

  ServoCfg* s = findServo(ch);
  if (s != nullptr) servoAngleNow[ch] = map(us, s->minUs, s->maxUs, 0, 180);
}

// --- รอให้กดปุ่มอะไรก็ได้ใน Serial Monitor แล้วกด Enter ---
void waitForKey(const char* prompt) {
  Serial.println(prompt);
  while (Serial.available()) Serial.read();     // ล้างค้างเก่า
  while (!Serial.available()) delay(20);
  while (Serial.available()) { Serial.read(); delay(2); }
}

// --- ตรวจชนิดเซอร์โวหนึ่งตัว ---
void identifyServoType(int idx) {
  ServoCfg& s = SERVOS[idx];

  Serial.printf("\n========== ตรวจชนิด: %s ==========\n", s.name);
  Serial.println("จ้องที่แกนเซอร์โวตัวนี้ตัวเดียว ตัวอื่นจะไม่ขยับ");

  Serial.println("\n[1] 1500us = จุดกลาง / จุดหยุด — รอ 2 วิ");
  setServoMicroseconds(s.ch, 1500);
  delay(2000);

  Serial.println("\n[2] 1200us — ดูให้ดี 5 วินาที");
  Serial.println("      หมุนไปเรื่อยๆ ไม่หยุด  = หมุนรอบตัว (360)");
  Serial.println("      ขยับนิดเดียวแล้วหยุดนิ่ง = 180 องศา");
  setServoMicroseconds(s.ch, 1200);
  delay(5000);

  Serial.println("\n[3] กลับ 1500us");
  setServoMicroseconds(s.ch, 1500);
  delay(2000);

  Serial.println("\n[4] 1800us — ดูอีก 5 วินาที (ต้องไปคนละทางกับข้อ 2)");
  setServoMicroseconds(s.ch, 1800);
  delay(5000);

  Serial.println("\n[5] กลับ 1500us");
  setServoMicroseconds(s.ch, 1500);
  delay(2000);

  Serial.printf("\nสรุปเอง: %s เป็นแบบไหน?\n", s.name);
  Serial.println("     หมุนไม่หยุดทั้งข้อ 2 และ 4  → หมุนรอบตัว 360 (ใช้กับแขน/หัวไม่ได้)");
  Serial.println("     ขยับแล้วหยุดค้างทั้ง 2 ข้อ  → 180 องศา (ถูกต้อง ใช้ได้)");
}

// --- ตรวจชนิดทุกตัว ทีละตัว หยุดรอให้ดูก่อนไปตัวถัดไป ---
void identifyAllServoTypes() {
  Serial.println("\n\n############################################");
  Serial.println("#  ตรวจชนิดเซอร์โวทุกตัว (180 หรือ 360)     #");
  Serial.println("############################################");
  Serial.println("⚠️ ถอดก้านเซอร์โวและกลไกออกให้หมดก่อน");
  waitForKey("พร้อมแล้วพิมพ์อะไรก็ได้ + Enter เพื่อเริ่ม...");

  for (int i = 0; i < SERVO_COUNT; i++) {
    identifyServoType(i);
    if (i < SERVO_COUNT - 1) {
      waitForKey("\n--- พิมพ์อะไรก็ได้ + Enter เพื่อไปตัวถัดไป ---");
    }
  }

  Serial.println("\n############ ตรวจครบทุกตัวแล้ว ############");
  Serial.println("ถ้าเจอตัวไหนหมุนรอบตัว = สั่งซื้อผิดรุ่น ต้องเปลี่ยนเป็นรุ่น 180 องศา");
  Serial.println("(MG996R และ SG90 มีทั้งรุ่น 180 และรุ่น continuous ที่หน้าตาเหมือนกัน)");
  centerAllServos();
}

// --- กวาดหาปลายทางจริง: ดูว่าเป็น 180 หรือ 270 องศา ---
// ค่อยๆ ไล่พัลส์ทีละ 100us แล้วดูว่าแกนหยุดขยับที่ค่าไหน = ปลายทางจริง
void rangeScanServo(int idx) {
  ServoCfg& s = SERVOS[idx];

  Serial.printf("\n========== กวาดหาช่วงจริง: %s ==========\n", s.name);
  Serial.println("⚠️ ต้องถอดก้านเซอร์โวออกก่อน ไม่งั้นชนกลไกแล้วเซอร์โวไหม้");
  Serial.println("ดูว่าแกนหยุดขยับที่พัลส์เท่าไหร่ = ปลายทางจริงของตัวนี้");
  Serial.println("ถ้าแกนหมุนตลอดไม่มีปลายทาง = เป็นแบบหมุนรอบตัว ไม่ใช่ 180");
  waitForKey("พิมพ์อะไรก็ได้ + Enter เพื่อเริ่ม...");

  setServoMicroseconds(s.ch, 1500);
  delay(1000);

  Serial.println("\n--- ไล่ลง 1500 -> 500 us ---");
  for (int us = 1500; us >= 500; us -= 100) {
    setServoMicroseconds(s.ch, us);
    Serial.printf("   %4d us   (ถ้าเป็น 180 องศา = %3d deg)\n", us, servoAngleNow[s.ch]);
    delay(800);
  }

  Serial.println("\n--- กลับกลาง ---");
  setServoMicroseconds(s.ch, 1500);
  delay(1500);

  Serial.println("\n--- ไล่ขึ้น 1500 -> 2500 us ---");
  for (int us = 1500; us <= 2500; us += 100) {
    setServoMicroseconds(s.ch, us);
    Serial.printf("   %4d us   (ถ้าเป็น 180 องศา = %3d deg)\n", us, servoAngleNow[s.ch]);
    delay(800);
  }

  Serial.println("\n--- กลับกลาง ---");
  setServoMicroseconds(s.ch, 1500);
  delay(1500);

  Serial.printf("\nจดค่าปลายทางจริงที่เห็น แล้วเอาไปแก้ minUs/maxUs ของ %s ในตาราง SERVOS\n", s.name);
}

// =====================================================================
// ===== ตรวจสาย I2C + PCA9685: ใช้ตอนสั่งแล้วเซอร์โวไม่ขยับเลย =====
// =====================================================================
// แยกให้ชัดว่าปัญหาอยู่ที่ "สายสัญญาณ I2C" หรือ "ไฟเลี้ยงเซอร์โว"
// เพราะสองอย่างนี้อาการเหมือนกันเป๊ะ คือโค้ดพิมพ์ครบแต่เซอร์โวนิ่งสนิท
// =====================================================================
// =====================================================================
// ===== ทดสอบขาสัญญาณแบบวัดง่าย (ปุ่ม V) =====
// =====================================================================
// พัลส์เซอร์โวมีดิวตี้แค่ 7.5% ที่ 50Hz มัลติมิเตอร์ราคาถูกส่วนใหญ่
// อ่านค่าเฉลี่ยแบบนี้ไม่ออก จะขึ้น 0.00 ทั้งที่สัญญาณมาครบ
// ฟังก์ชันนี้สั่งขาให้เป็นไฟค้าง 100% ไปเลย มิเตอร์ตัวไหนก็อ่านชัด
// =====================================================================
void outputPinTest() {
  ServoCfg& s = SERVOS[calibIndex];

  Serial.printf("\n\n========== ทดสอบขาสัญญาณ %s ==========\n", s.name);
  Serial.println("ถอดหัวเซอร์โวออกจากช่องนี้ก่อน จะได้จิ้มมิเตอร์ถนัด");
  Serial.println("");
  Serial.println("หาแถวขา S ยังไง — ที่หัว 3 ขาของช่องเดียวกัน วัดเทียบ GND:");
  Serial.println("   แถวที่ได้ ~5V        = V+   (แถวกลาง)");
  Serial.println("   แถวที่ได้ 0V ตลอด    = GND");
  Serial.println("   แถวที่เหลือ          = S สัญญาณ  <-- ใช้แถวนี้วัด");
  Serial.println("");
  Serial.println("ค้างสถานะละ 6 วินาที สลับ 3 รอบ ค่อยๆ อ่านตัวเลขบนมิเตอร์");

  for (int r = 1; r <= 3; r++) {
    Serial.printf("\n  รอบ %d\n", r);
    pca.setPWM(s.ch, 4096, 0);      // full ON ค้าง
    Serial.println("    เปิดค้าง 100%   -> ขา S ควรอ่านได้ ~3.3V");
    delay(6000);
    pca.setPWM(s.ch, 0, 4096);      // full OFF ค้าง
    Serial.println("    ปิดค้าง         -> ขา S ควรอ่านได้ 0V");
    delay(6000);
  }

  setServoMicroseconds(s.ch, 1500);

  Serial.println("\n========== อ่านผลยังไง ==========");
  Serial.println("  เปิดได้ 3.3V / ปิดได้ 0V");
  Serial.println("     = ขาเอาต์พุตทำงานปกติ OE ไม่มีปัญหา สัญญาณออกครบ");
  Serial.println("     -> ปัญหาอยู่ที่ตัวเซอร์โว หรือไฟเลี้ยงเซอร์โวไม่ถึงหัวเสียบ");
  Serial.println("");
  Serial.println("  เปิดก็ 0V ปิดก็ 0V");
  Serial.println("     = เอาต์พุตถูกสั่งปิดอยู่ ทั้งที่ทะเบียนข้างในถูกหมด");
  Serial.println("     -> เหลืออย่างเดียวคือขา OE");
  Serial.println("     -> วัดขา OE เทียบ GND ต้องได้ 0V");
  Serial.println("        ถ้าได้ 3.3V หรือค่าลอยไปมา = OE ยังไม่ได้ลง GND จริง");
  Serial.println("        OE สูงเมื่อไหร่ = ปิดเอาต์พุตทั้ง 16 ช่องทันที");
}

// ทะเบียนของ PCA9685 (จากดาต้าชีต)
#define PCA_MODE1      0x00
#define PCA_MODE2      0x01
#define PCA_LED0_ON_L  0x06
#define PCA_PRESCALE   0xFE

uint8_t pcaRead8(uint8_t reg) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission() != 0) return 0xFF;
  Wire.requestFrom((uint8_t)PCA9685_ADDR, (uint8_t)1);
  return Wire.available() ? Wire.read() : 0xFF;
}

void pcaWrite8(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

// อ่าน tick ที่ค้างอยู่จริงในทะเบียนของช่องนั้น
uint16_t pcaReadChannelOff(uint8_t ch) {
  uint8_t base = PCA_LED0_ON_L + 4 * ch;
  uint16_t lo = pcaRead8(base + 2);
  uint16_t hi = pcaRead8(base + 3);
  return (hi << 8) | lo;
}

void i2cDiagnostics() {
  Serial.println("\n\n========== ตรวจระบบ I2C + PCA9685 ==========");

  // --- 1) สแกนหาอุปกรณ์ทุกตัวบนสาย I2C ---
  Serial.printf("\n[1] สแกนสาย I2C (SDA=GPIO%d  SCL=GPIO%d)\n", I2C_SDA_PIN, I2C_SCL_PIN);
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("    เจออุปกรณ์ที่ 0x%02X%s\n", addr,
                    (addr == PCA9685_ADDR) ? "   <<< PCA9685" : "");
      if (addr == PCA9685_ADDR) pcaOnline = true;   // เสียบกลับแล้วตรวจเจอ ไม่ต้องรีบูต
      found++;
    }
  }
  if (found == 0) {
    Serial.println("    ไม่เจออะไรเลยบนสาย I2C");
    Serial.println("    => ปัญหาอยู่ที่สายสัญญาณ ไม่ใช่ไฟเลี้ยงเซอร์โว");
    Serial.println("       - SDA กับ SCL สลับกันหรือเปล่า (SDA=21, SCL=22)");
    Serial.println("       - VCC ของ PCA9685 ได้ 3V3 จริงไหม");
    Serial.println("       - GND ของ ESP32 ต่อถึง PCA9685 จริงไหม");
    Serial.println("       - ถ้าใช้เบรดบอร์ด ลองขยับรูใหม่ รูหลวมเจอบ่อยมาก");
    return;
  }

  // --- 2) อ่านค่ากลับ พิสูจน์ว่าเขียนแล้วติดจริง ---
  Serial.println("\n[2] อ่านค่ากลับจาก PCA9685");
  uint8_t prescale = pca.readPrescale();
  Serial.printf("    PRESCALE ที่อ่านได้ = %u\n", prescale);
  Serial.println("    50Hz ควรได้ประมาณ 121 (osc 25MHz) ถึง 131 (osc 27MHz)");
  if (prescale < 100 || prescale > 145) {
    Serial.println("    ค่าผิดปกติ => ตั้งความถี่ไม่ติด หรืออ่านกลับไม่ได้");
    Serial.println("       ลองลดความเร็ว I2C: เปลี่ยน Wire.setClock เป็น 100000");
  } else {
    Serial.println("    OK => PCA9685 รับคำสั่งและตอบกลับได้จริง");
    Serial.println("    ถ้ามาถึงตรงนี้แล้วเซอร์โวยังนิ่ง = ปัญหาอยู่ที่ไฟเลี้ยงเซอร์โว");
  }

  // --- 2b) อ่านทะเบียนควบคุม: สองบิตนี้ทำให้ "ตอบ I2C ปกติแต่ไม่มีสัญญาณออก" ได้ ---
  Serial.println("\n[2b] อ่านทะเบียนควบคุม");
  uint8_t mode1 = pcaRead8(PCA_MODE1);
  uint8_t mode2 = pcaRead8(PCA_MODE2);
  Serial.printf("    MODE1 = 0x%02X   MODE2 = 0x%02X\n", mode1, mode2);

  bool sleeping   = (mode1 & 0x10) != 0;   // bit4 SLEEP  = 1 คือหลับ ไม่มี PWM ออกเลย
  bool totemPole  = (mode2 & 0x04) != 0;   // bit2 OUTDRV = 0 คือ open-drain ดันขาขึ้นไม่ได้
  bool invertOut  = (mode2 & 0x10) != 0;   // bit4 INVRT

  Serial.printf("    SLEEP  = %d  %s\n", sleeping ? 1 : 0,
                sleeping ? "<<< ชิปหลับอยู่ ไม่มีสัญญาณออกสักช่อง" : "OK ตื่นอยู่");
  Serial.printf("    OUTDRV = %d  %s\n", totemPole ? 1 : 0,
                totemPole ? "OK totem-pole สั่งเซอร์โวได้" : "<<< open-drain สั่งเซอร์โวไม่ได้");
  Serial.printf("    INVRT  = %d  %s\n", invertOut ? 1 : 0,
                invertOut ? "<<< สัญญาณกลับขั้ว เซอร์โวจะอ่านผิด" : "OK");

  // ซ่อมให้เลยถ้าเจอบิตผิด
  if (sleeping || !totemPole || invertOut) {
    Serial.println("\n    เจอบิตผิด -> แก้ให้อัตโนมัติแล้วลองใหม่");
    pcaWrite8(PCA_MODE1, mode1 & ~0x10);   // ปลุกให้ตื่น
    delay(5);
    pcaWrite8(PCA_MODE2, 0x04);            // totem-pole, ไม่กลับขั้ว
    delay(5);
    pcaWrite8(PCA_MODE1, (pcaRead8(PCA_MODE1) & ~0x10) | 0x80);  // RESTART
    delay(5);
    Serial.printf("    หลังแก้: MODE1 = 0x%02X  MODE2 = 0x%02X\n",
                  pcaRead8(PCA_MODE1), pcaRead8(PCA_MODE2));
  }

  // --- 2c) อ่าน tick ที่ค้างอยู่จริงในช่องเซอร์โว ---
  Serial.println("\n[2c] ค่าที่ค้างอยู่จริงในทะเบียนของแต่ละช่อง");
  Serial.println("     สั่ง 1500us ที่ 50Hz ควรได้ประมาณ 307 tick");
  for (int i = 0; i < SERVO_COUNT; i++) {
    ServoCfg& sc = SERVOS[i];
    setServoMicroseconds(sc.ch, 1500);
    delay(10);
    uint16_t back = pcaReadChannelOff(sc.ch);
    Serial.printf("    %s  สั่ง %u tick  อ่านกลับได้ %u tick  %s\n",
                  sc.name, usToTicks(1500), back,
                  (back == usToTicks(1500)) ? "ตรงกัน" : "<<< ไม่ตรง");
  }

  // --- 3) ขยับช่องที่เลือกแรงๆ ให้เห็นชัด ---
  ServoCfg& s = SERVOS[calibIndex];
  Serial.printf("\n[3] สั่ง %s สลับไปมา 3 รอบ — จ้องที่แกนเซอร์โว\n", s.name);
  for (int r = 0; r < 3; r++) {
    setServoMicroseconds(s.ch, 1200); Serial.println("    1200 us"); delay(800);
    setServoMicroseconds(s.ch, 1800); Serial.println("    1800 us"); delay(800);
  }
  setServoMicroseconds(s.ch, 1500);
  Serial.println("    กลับ 1500 us");

  // --- 4) สรุปทางเดินต่อ ---
  Serial.println("\n========== ถ้าเจอ PCA9685 แล้วแต่ยังไม่ขยับ ==========");
  Serial.println(" ไล่ตามนี้ ใช้มัลติมิเตอร์วัด:");
  Serial.println("  1. ขั้วสกรู V+ เทียบ GND ต้องได้ ~5V");
  Serial.println("     ถ้าได้ 0V = USB ก้อนที่เลี้ยงเซอร์โวไม่จ่ายไฟ นี่คือสาเหตุที่เจอบ่อยที่สุด");
  Serial.println("  2. ขา OE ต้องต่อ GND จริง — OE ลอยอยู่ = ปิดเอาต์พุตทุกช่องทันที");
  Serial.println("  3. GND ของ USB ก้อนเซอร์โว ต้องต่อถึง GND ของ ESP32");
  Serial.println("     วัดโหมดต่อเนื่อง (beep) ระหว่างสอง GND ตอนปิดไฟ ต้องร้อง");
  Serial.println("  4. หัวเซอร์โวเสียบถูกแถวไหม — S ตรงกับ PWM, แดงตรง V+, น้ำตาลตรง GND");
  Serial.println("     เสียบกลับด้าน เซอร์โวจะนิ่งสนิทเหมือนไม่มีไฟ");
  Serial.println("  5. ลองย้ายเซอร์โวไปเสียบ CH0 ตัวเดียว เผื่อช่องใดช่องหนึ่งเสีย");
  Serial.println("");
  Serial.println("  6. วัดขา S (สัญญาณ) ของ CH0 เทียบ GND ด้วยมัลติมิเตอร์โหมด DC โวลต์");
  Serial.println("     ตอนสั่ง 1500us ควรอ่านได้ประมาณ 0.25V (ค่าเฉลี่ยของพัลส์ 7.5%)");
  Serial.println("     อ่านได้ 0V นิ่งสนิท = ไม่มีสัญญาณออกจากชิป ปัญหาอยู่ที่ OE หรือตัวชิป");
  Serial.println("     อ่านได้ ~0.25V = สัญญาณออกครบ ปัญหาอยู่ที่ไฟเซอร์โวหรือตัวเซอร์โวเอง");
  Serial.println("");
  Serial.println("  7. VCC ของ PCA9685 ต่อจาก 3V3 -> สัญญาณ S สูงแค่ 3.3V");
  Serial.println("     MG996R บางล็อตต้องการสัญญาณเกิน 3.5V ถึงจะรับ");
  Serial.println("     ถ้าข้ออื่นผ่านหมดแล้วยังนิ่ง ให้ลองย้าย VCC ไปรับ 5V แทน");
  Serial.println("     (ทำได้ แต่ต้องเข้าใจว่า pull-up ของ I2C จะกลายเป็น 5V เข้าขา ESP32)");
}

// =====================================================================
// ===== แสดงตา — ปิดไว้ทั้งชุดเมื่อ USE_TFT 0 =====
// =====================================================================
// ตัวฟังก์ชันยังอยู่ครบ แค่เนื้อในถูกตัดออกตอนคอมไพล์
// พอเสียบจอเสร็จ เปลี่ยน USE_TFT เป็น 1 อย่างเดียว ตาทั้งหมดกลับมาทำงานเหมือนเดิม
// =====================================================================

void drawEyes_Normal() {
  lastDrawnEyes = 'N';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20, pupil_rx, pupil_ry, TFT_WHITE);
#endif
}

void drawEyes_HalfClosed() {
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y + 15, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y + 15, eye_rx, eye_ry, TFT_BLACK);
#endif
}

void drawEyes_Closed() {
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55;
  tft.fillRect(EYE_L_X - eye_rx, EYE_Y + 20, eye_rx * 2, 4, TFT_BLACK);
  tft.fillRect(EYE_R_X - eye_rx, EYE_Y + 20, eye_rx * 2, 4, TFT_BLACK);
#endif
}

// ตกใจ (#513 ลอกจากภาพที่เจ้าของวาด 79 ตรง ๆ · Robo/Part Robot/ภาพเจ้าของ/79_หน้าตกใจ_เจ้าของวาด.png)
//   ตาวงรีตั้ง 54×80 ศูนย์ (85,135) (237,135) · ประกายขาว 24×17 ล่างกลางตา
//   · ขีดโค้งรอบตา + ขยุกขยิกซ้ายล่าง + "?!" ขวาบน = ลายเส้นจากภาพ เก็บเป็นแถวพิกเซล {y, x0, x1} (scratchpad/face/trace79b.py)
static const int16_t SHOCK_RUNS[][3] = { {16,279,289},{17,278,290},{18,278,291},{19,278,292},{20,278,293},{21,278,294},{22,279,282},{22,285,294},{23,287,294},{23,311,312},{24,288,294},{24,309,313},{25,288,294},{25,309,314},{26,288,294},{26,308,314},{27,288,294},{27,308,314},{28,287,294},{28,308,314},{29,287,294},{29,308,314},{30,286,294},{30,308,314},{31,284,293},{31,308,314},{32,284,292},{32,308,314},{33,283,291},{33,308,314},{34,282,291},{34,308,314},{35,282,290},{35,308,314},{36,282,289},{36,308,314},{37,282,288},{37,308,314},{38,282,287},{38,308,314},{39,282,288},{39,308,314},{40,282,288},{40,308,314},{41,282,288},{41,308,313},{42,282,289},{42,308,314},{43,283,289},{43,308,314},{44,247,253},{44,283,289},{44,308,314},{45,245,256},{45,283,289},{45,308,314},{46,245,259},{46,283,289},{46,308,314},{47,244,261},{47,284,289},{47,308,314},{48,245,263},{48,284,289},{48,308,314},{49,245,265},{49,285,288},{49,308,314},{50,247,267},{50,308,314},{51,253,268},{51,307,313},{52,255,270},{52,307,313},{53,258,271},{53,307,313},{54,53,55},{54,260,273},{54,307,312},{55,51,57},{55,262,275},{55,307,312},{56,50,58},{56,263,276},{56,307,312},{57,49,58},{57,265,276},{57,308,311},{58,49,58},{58,267,276},{59,47,58},{59,268,276},{60,46,57},{60,270,276},{61,46,55},{61,271,275},{62,45,53},{62,291,292},{63,44,52},{63,288,295},{64,43,51},{64,287,296},{65,43,51},{65,287,296},{66,42,50},{66,286,296},{67,41,49},{67,286,296},{68,40,49},{68,287,296},{69,40,48},{69,287,296},{69,303,305},{70,39,47},{70,288,296},{70,302,307},{71,39,46},{71,289,296},{71,301,308},{72,38,45},{72,290,295},{72,301,309},{73,38,44},{73,292,294},{73,301,309},{74,37,44},{74,301,309},{75,36,44},{75,301,309},{76,35,43},{76,301,309},{77,35,42},{77,302,309},{78,35,42},{78,303,309},{79,35,42},{79,305,307},{80,35,41},{81,35,40},{82,35,40},{83,36,39},{84,37,37},{186,285,288},{187,32,37},{187,284,289},{188,31,37},{188,284,289},{189,31,38},{189,283,289},{190,31,39},{190,282,289},{191,31,40},{191,282,289},{192,32,42},{192,282,289},{193,33,43},{193,281,288},{194,34,44},{194,280,288},{195,35,45},{195,279,287},{196,36,46},{196,278,287},{197,37,47},{197,277,286},{198,38,48},{198,276,285},{199,39,49},{199,275,284},{200,40,50},{200,274,283},{201,20,25},{201,41,51},{201,274,282},{202,19,26},{202,42,52},{202,273,281},{203,18,27},{203,43,53},{203,272,280},{204,18,27},{204,45,54},{204,271,279},{205,18,28},{205,47,55},{205,270,278},{206,19,29},{206,48,56},{206,269,278},{207,20,29},{207,49,58},{207,269,277},{208,22,29},{208,51,57},{208,268,277},{209,23,29},{209,267,276},{210,23,29},{210,266,275},{211,23,29},{211,266,274},{212,22,29},{212,266,273},{213,22,29},{213,267,272},{214,21,28},{214,267,272},{215,21,28},{215,268,271},{216,20,27},{217,19,35},{218,18,36},{219,17,37},{220,14,38},{220,41,49},{221,14,49},{222,13,50},{223,14,50},{224,13,27},{224,32,50},{225,14,25},{225,32,49},{226,15,21},{226,32,48},{227,31,41},{228,32,40},{229,33,38},{230,34,35} };
void drawEyes_Shocked() {
  lastDrawnEyes = 'O';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  static const int16_t E[2][2] = { {85, 135}, {237, 135} };
  for (int k = 0; k < 2; k++) {
    tft.fillEllipse(E[k][0], E[k][1], 54, 80, TFT_BLACK);
    tft.fillEllipse(E[k][0], E[k][1] + 27, 24, 17, TFT_WHITE);
  }
  for (const auto& r : SHOCK_RUNS) tft.drawFastHLine(r[1], r[0], r[2] - r[1] + 1, TFT_BLACK);
#endif
}

void drawEyes_LookLeft() {
  lastDrawnEyes = 'L';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
#endif
}

void drawEyes_LookRight() {
  lastDrawnEyes = 'R';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_WHITE);
#endif
}

void drawEyes_Happy() {
  lastDrawnEyes = 'H';
#if USE_TFT
  ++eyeDrawCount;
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
#endif
}

void drawEyes_Sad() {
  lastDrawnEyes = 'S';
#if USE_TFT
  ++eyeDrawCount;
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
#endif
}

void drawEyes_Angry() {               // ตามภาพวาดเดิม Robo.ino
  lastDrawnEyes = 'A';
#if USE_TFT
  ++eyeDrawCount;
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
#endif
}

// === Sleepy (ตาง่วง หรี่ตา) ===
// ง่วง (#515 ตามภาพที่ 14 "ภาพการออกแบบดวงตา 9 แบบ" ในรายงาน): ขีดหนาเอียง 2 เส้น (หลับตา)
//   ลอกจากภาพในรายงาน เก็บเป็นแถวพิกเซล {y, x0, x1} — ทวิน/เว็บใช้ชุดเดียวกัน
static const int16_t SLEEPY_RUNS[][3] = { {131,126,129},{131,202,206},{132,121,129},{132,202,210},{133,117,130},{133,201,215},{134,112,130},{134,201,220},{135,103,130},{135,201,228},{136,99,130},{136,201,233},{137,94,130},{137,201,237},{138,89,131},{138,201,242},{139,82,131},{139,201,250},{140,77,131},{140,201,255},{141,72,131},{141,200,260},{142,68,132},{142,200,264},{143,59,132},{143,200,272},{144,54,132},{144,200,277},{145,50,132},{145,200,281},{146,42,132},{146,199,290},{147,37,132},{147,199,294},{148,33,132},{148,199,299},{149,32,132},{149,199,299},{150,32,132},{150,199,299},{151,32,133},{151,198,299},{152,33,133},{152,198,298},{153,33,133},{153,198,298},{154,33,133},{154,198,298},{155,33,134},{155,198,298},{156,33,134},{156,197,298},{157,34,134},{157,198,297},{158,34,134},{158,198,297},{159,34,134},{159,197,297},{160,34,135},{160,197,297},{161,34,132},{161,199,297},{162,35,124},{162,208,297},{163,35,119},{163,212,297},{164,35,114},{164,217,297},{165,35,109},{165,222,296},{166,35,102},{166,230,296},{167,36,97},{167,235,296},{168,36,93},{168,240,296},{169,36,88},{169,244,296},{170,36,79},{170,252,295},{171,36,75},{171,256,295},{172,36,70},{172,261,295},{173,36,65},{173,266,295},{174,36,57},{174,274,295},{175,37,52},{175,279,294},{176,37,48},{176,284,294},{177,37,40},{177,292,294} };
void drawEyes_Sleepy() {
  lastDrawnEyes = 'Z';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  for (const auto& r : SLEEPY_RUNS) tft.drawFastHLine(r[1], r[0], r[2] - r[1] + 1, TFT_BLACK);
#endif
}

// === Confused (ตางง ม่านตาไม่เท่ากัน) ===
void drawEyes_Confused() {            // ตามภาพวาดเดิม Robo.ino (ม่านตาไม่เท่ากัน + ?)
  lastDrawnEyes = 'C';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 60;
  int pupil_rx = 30, pupil_ry = 20;
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 10, EYE_Y - 10, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X - 10, EYE_Y + 15, pupil_rx, pupil_ry, TFT_WHITE);
  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(4);
  tft.setCursor(EYE_R_X + 45, EYE_Y - 55);
  tft.print("?");
#endif
}

// === Love (หัวใจกลางจอ — เต้นกระเพื่อม) ===
void drawHeart(int sz) {              // ตามภาพวาดเดิม Robo.ino (ปกติ 1 ใหญ่ 2)
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int cx = SCREEN_WIDTH / 2;
  int cy = SCREEN_HEIGHT / 2 - 5;
  int r = 28 + sz * 4;
  int gap = r - 4;
  int triW = gap + r + 5;
  int triH = r + 20 + sz * 6;
  tft.fillCircle(cx - gap, cy - 10, r, HEART_COLOR);
  tft.fillCircle(cx + gap, cy - 10, r, HEART_COLOR);
  tft.fillTriangle(cx - triW, cy, cx + triW, cy, cx, cy + triH, HEART_COLOR);
#endif
}

void drawEyes_Love() {
  lastDrawnEyes = 'V';
  drawHeart(1);
}

// === Shy / เขินอาย (ตาเบือน + แก้มแดง) ===
void drawEyes_Shy() {                 // ตามภาพวาดเดิม Robo.ino (หลบตาล่างขวา + แก้มขีดเฉียง)
  lastDrawnEyes = 'B';
#if USE_TFT
  ++eyeDrawCount;
  tft.fillScreen(TFT_WHITE);
  int eye_rx = 55, eye_ry = 45;
  int pupil_rx = 25, pupil_ry = 18;
  tft.fillEllipse(EYE_L_X, EYE_Y + 10, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X + 12, EYE_Y + 28, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillRect(EYE_L_X - 60, EYE_Y - 35, 120, 25, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y + 10, eye_rx, eye_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X + 12, EYE_Y + 28, pupil_rx, pupil_ry, TFT_WHITE);
  tft.fillRect(EYE_R_X - 60, EYE_Y - 35, 120, 25, TFT_WHITE);
  int blushY = EYE_Y + 58, blushLen = 14, blushGap = 10;
  for (int t = -1; t <= 1; t++) {
    tft.drawLine(EYE_L_X - blushGap - blushLen, blushY - blushLen + t, EYE_L_X - blushGap, blushY + t, BLUSH_PINK);
    tft.drawLine(EYE_L_X - blushGap + 6 - blushLen, blushY - blushLen + t, EYE_L_X - blushGap + 6, blushY + t, BLUSH_PINK);
    tft.drawLine(EYE_R_X + blushGap, blushY - blushLen + t, EYE_R_X + blushGap + blushLen, blushY + t, BLUSH_PINK);
    tft.drawLine(EYE_R_X + blushGap + 6, blushY - blushLen + t, EYE_R_X + blushGap + 6 + blushLen, blushY + t, BLUSH_PINK);
  }
#endif
}

// =====================================================================
// ฟังก์ชันวาดตาตาม char อารมณ์
// =====================================================================
void drawEyesForEmotion(char emo) {
#if USE_TFT
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
#else
  // จอปิดอยู่ — พิมพ์แทน จะได้เห็นว่าอารมณ์เปลี่ยนจริงบน Serial Monitor
  Serial.printf("[จอปิด] อารมณ์ = %c\n", emo);
#endif
}

// =====================================================================
// Emotion State Machine — HOLD EMOTION (จากงานวิจัย)
// =====================================================================
char currentEmotion = 'N';
unsigned long emoChangeTime = 0;
bool isExecutingCommand = false;
unsigned long emoAutoRevertTime = 0;

#define EMO_HOLD_MS 2000
#define EMO_REVERT_MS 2500

void requestEmotionChange(char newEmo) {
  if (newEmo == currentEmotion) return;
  if (millis() - emoChangeTime < EMO_HOLD_MS) return;

  currentEmotion = newEmo;
  emoChangeTime = millis();
  doBodyGesture(newEmo);

  Serial.printf("[EMO] -> %c\n", newEmo);
}

void forceEmotionChange(char newEmo) {
  currentEmotion = newEmo;
  emoChangeTime = millis();
  doBodyGesture(newEmo);
  if (newEmo != 'N' && newEmo != 'V') {
    emoAutoRevertTime = millis() + EMO_REVERT_MS;
  } else {
    emoAutoRevertTime = 0;
  }
}

// =====================================================================
// ระบบ lerp หัวแบบเดิม (updateServoLerp) ถูกแทนด้วย axesUpdate() แล้ว
// เดิม: lerp แบบเอกซ์โปเนนเชียล ออกตัวเร็วสุดตอนเริ่ม = สะบัด และปุ่ม 7/8/9 จากเว็บ
// สั่ง moveHead() ตรงโดยไม่แก้ target ทำให้หัวดีดกลับ ตอนนี้ทุกทางตั้งเป้าที่เดียวกัน
// =====================================================================
float lerpf(float a, float b, float t) {
  return a + (b - a) * t;
}

// =====================================================================
// BODY + FACE — ท่าทางประกอบอารมณ์ (หัว + แขน) — ไม่บล็อกแล้ว
// =====================================================================
// มุมในท่าเป็นค่าเดิมของโค้ด 7 ก.ย. (แปลงเป็นมุมเชิงกลใน moveArm1/2 / moveHead)
// ถ้ากำลังหนีบ/ยกของอยู่ ท่าอารมณ์จะไม่ขยับแขน กันของหล่นและกันชน
// =====================================================================
unsigned long lastHeartbeatTime = 0;
int heartbeatPhase = 0;

// ---------- ตัวเล่นท่า (meto_emotes.h) — ไม่บล็อก ----------
// ทุกจังหวะสั่งทุกแกนพร้อมกันในรอบ loop เดียว แล้วรอแค่ตามเวลา ms ของจังหวะ ไม่รอแกนถึงเป้า
// (ความนุ่มมาจาก axesUpdate: จำกัดความเร็ว + เร่ง/ชะลอ อยู่แล้ว) · ER = แขนกาง/หนีบ กลับ 0 (ท่าพัก R)
const EmoKey* emoSeq = nullptr;
int emoLen = 0, emoIdx = 0;
unsigned long emoNextMs = 0;
bool emoArms = true;
uint8_t emoLastVar[24] = { 0 };          // แบบล่าสุดของแต่ละชุด (ไม่สุ่มซ้ำติดกัน)
unsigned long lastActivityMs = 0;        // ใช้นับเวลาว่างก่อนเล่นไอเดิล

bool gripHoldingSomething();
void emoStop() { emoSeq = nullptr; }
bool emoBusy() { return emoSeq != nullptr; }
// ท่าแบบมุมเทียบ (ชุดเขิน 's'): yaw/tilt ในแถว = มุมเทียบทิศหน้าคน · flip = กลับทิศ yaw + สลับหน้า L/R
bool emoRel = false, emoRelFlip = false;
float emoBaseYaw = 0, emoBaseTilt = 0;
void emoStart(const EmoKey* k, int n, bool arms) {
  emoSeq = k; emoLen = n; emoIdx = 0; emoNextMs = millis(); emoArms = arms;
  emoRel = false;
  lastActivityMs = millis();
}
// เล่นชุดท่าตามรหัส (อารมณ์ H S A O Z C V B N · 't' แตะหัว · 'i' ไอเดิล) สุ่ม 1 แบบ ไม่ซ้ำแบบก่อนหน้า
bool emoPlaySet(char code, bool arms) {
  for (int i = 0; i < (int)(sizeof(EMO_SETS) / sizeof(EMO_SETS[0])); i++) {
    const EmoSet& st = EMO_SETS[i];
    if (st.code != code) continue;
    uint8_t v = 0;
    if (st.count > 1) { v = random(st.count - 1); if (v >= emoLastVar[i]) v++; }
    emoLastVar[i] = v;
    emoStart(st.v[v], st.n[v], arms);
    Serial.printf("[EMO] ท่า %c แบบ %u/%u\n", code, v + 1, st.count);
    return true;
  }
  return false;
}
// สั่งทุกแกนของจังหวะ 2 รอบ: interlock เช็กเทียบเป้าของแกนอื่น — แกนที่ติดรอบแรก (เช่น ยกแขนก่อนเงย)
// ได้ลองใหม่หลังแกนอื่นตั้งเป้าแล้ว ลำดับในแถวจึงไม่มีผล
bool emoApplyOnce(const EmoKey& k) {
  bool ok = true;
  if (emoArms) {
    if (k.liftL != EK) ok &= axTrySet(AX_ARM_L, k.liftL == ER ? REST_LIFT : k.liftL, false);
    if (k.liftR != EK) ok &= axTrySet(AX_ARM_R, k.liftR == ER ? REST_LIFT : k.liftR, false);
#if USE_HAND
    const int8_t hv[2] = { k.handL, k.handR };
    for (int sd = 0; sd < 2; sd++) {
      if (hv[sd] == EK) continue;
      if (hv[sd] == ER) { ax[sd ? AX_HAND_R : AX_HAND_L].vScale = 1.0f; axTrySet(sd ? AX_HAND_R : AX_HAND_L, 0, false); }
      else handSetPct(sd, hv[sd]);
    }
#endif
  }
  float ty = k.tilt, yy = k.yaw;
  if (emoRel) { ty = emoBaseTilt + k.tilt; yy = emoBaseYaw + (emoRelFlip ? -k.yaw : k.yaw); }
  if (k.tilt != EK) ok &= axTrySet(AX_TILT, ty, false);
  if (k.yaw != EK)  ok &= axTrySet(AX_YAW, yy, false);
  return ok;
}
// หน้าในจังหวะ: อารมณ์ N H S A O Z C V B · 'L' เหลือบซ้าย · 'R' เหลือบขวา · '-' หลับตา · 'h' ตาปรือ (ไม่เปลี่ยน currentEmotion)
void drawFaceCode(char f) {
  switch (f) {
    case 'L': drawEyes_LookLeft(); break;
    case 'R': drawEyes_LookRight(); break;
    case '-': drawEyes_Closed(); break;
    case 'h': drawEyes_HalfClosed(); break;
    default:  drawEyesForEmotion(f); break;
  }
}
void emoApply(const EmoKey& k) {
  if (!emoApplyOnce(k)) emoApplyOnce(k);
  char f = k.face;
  if (emoRel && emoRelFlip) f = (f == 'L') ? 'R' : (f == 'R') ? 'L' : f;
  if (f) drawFaceCode(f);
}
void gestTick() {
  if (emoSeq == nullptr) return;
  unsigned long now = millis();
  if ((long)(now - emoNextMs) < 0) return;
  if (emoIdx >= emoLen) { emoSeq = nullptr; return; }
  const EmoKey& k = emoSeq[emoIdx++];
  emoApply(k);
  lastActivityMs = now;
  if (k.ms == 0) emoSeq = nullptr; else emoNextMs = now + k.ms;
}
#define EMO_PLAY(arr, arms) emoStart(arr, sizeof(arr) / sizeof(arr[0]), arms)
// ท่าพัก R: แขนลง REST_LIFT (#516) หัวตรง มือกลาง · ถือของอยู่ = คืนแค่หัว
void setRestPose(bool arms) {
  if (arms) {
    axTrySet(AX_ARM_L, REST_LIFT, false); axTrySet(AX_ARM_R, REST_LIFT, false);
    for (int i : { AX_HAND_L, AX_HAND_R }) { ax[i].vScale = 1.0f; axTrySet(i, 0, false); }
  }
  axTrySet(AX_TILT, 0, false); axTrySet(AX_YAW, 0, false);
  if (arms) { axTrySet(AX_ARM_L, REST_LIFT, false); axTrySet(AX_ARM_R, REST_LIFT, false); }   // รอบ 2 กัน interlock ติดลำดับ
}
bool atRestPose() {
  for (int i = 0; i < AX_N; i++) {
    float want = (i == AX_ARM_L || i == AX_ARM_R) ? REST_LIFT : 0;
    if (fabsf(servoToRel(i, ax[i].target) - want) > 1.0f || axMoving(i)) return false;
  }
  return true;
}

bool gripHoldingSomething() {
  return holding || handPctNow(0) > 30.0f || handPctNow(1) > 30.0f;
}

void trCancel();
void doBodyGesture(char emo) {
  drawEyesForEmotion(emo);
  bool arms = !gripHoldingSomething();
  if (!arms) Serial.println("[EMO] กำลังหนีบของ — ท่าอารมณ์ไม่ขยับแขน");
  trCancel();                                            // ท่าแตะหัวที่ค้างอยู่ หยุดให้ท่าอารมณ์
  if (!emoPlaySet(strchr("HSAOZCVB", emo) ? emo : 'N', arms)) EMO_PLAY(EMO_N, arms);
  if (emo == 'V') { lastHeartbeatTime = millis(); heartbeatPhase = 0; }
}
// ท่าเหตุการณ์: หน้า + ท่า (ไม่ยุ่งคิวคำสั่ง)
// ท่าเหตุการณ์ (สุ่ม 1 ใน 3 แบบ): 'l' ยกสำเร็จ · 'c' เจอขอบ · 'd' โค้ดจบ · 'b' บัค · 'n' ไม่เจอของ
void playEvent(char set, char face) {
  trCancel();
  currentEmotion = face; emoChangeTime = millis(); drawEyesForEmotion(face);
  emoPlaySet(set, !gripHoldingSomething());
  if (face != 'N') emoAutoRevertTime = millis() + 3000;
}
#define EVENT(set, face) playEvent(set, face)

// =====================================================================
// มอเตอร์ล้อ TB6612FNG
// ชั้นนี้ยกมาจาก MotorTest_TB6612.ino ที่ทดสอบกับของจริงแล้ว
// speed: -255..255  บวก = เดินหน้า  ลบ = ถอย  0 = ปล่อยฟรี
// ค่าถูกบีบให้อยู่ใน PWM_FLOOR..PWM_CEIL เสมอ เพดาน 180 เป็น clamp จริง
// =====================================================================
#if USE_MOTOR
void driveMotor(bool isLeft, int speed) {
  const int pinPwm = isLeft ? PIN_PWMA : PIN_PWMB;
  const int pinIn1 = isLeft ? PIN_AIN1 : PIN_BIN1;
  const int pinIn2 = isLeft ? PIN_AIN2 : PIN_BIN2;
  const int ch     = isLeft ? PWM_CH_A : PWM_CH_B;

  if (isLeft ? INVERT_LEFT : INVERT_RIGHT) speed = -speed;

  if (speed == 0) {
    digitalWrite(pinIn1, LOW);
    digitalWrite(pinIn2, LOW);
    pwmWrite(pinPwm, ch, 0);
  } else {
    int duty = abs(speed);
    if (duty < PWM_FLOOR) duty = PWM_FLOOR;
    if (duty > PWM_CEIL)  duty = PWM_CEIL;
    digitalWrite(pinIn1, speed > 0 ? HIGH : LOW);
    digitalWrite(pinIn2, speed > 0 ? LOW  : HIGH);
    pwmWrite(pinPwm, ch, duty);
  }

#if USE_ENCODER
  // จำความเร็วที่สั่งไว้ ให้ encoderTick() ตรวจได้ว่าสั่งแล้วล้อหมุนจริงไหม
  // รีเซ็ตนาฬิกาตรวจล้อติดขัดทุกครั้งที่เริ่มสั่งเดิน
  // ถ้าไม่รีเซ็ต ค่าจะค้างจากครั้งที่ล้อขยับล่าสุด (อาจเป็นหลายนาทีก่อน)
  // แล้ว encoderTick() รอบแรกจะเห็นว่า "เกิน 600 ms แล้วยังไม่ขยับ" ทั้งที่มอเตอร์
  // เพิ่งเริ่มออกตัว → สั่งหยุดทันที อาการคือกดเดินแล้วล้อกระตุกแล้วดับ
  if (isLeft) {
    if (speed != 0 && encCmdL == 0) encLastMoveMsL = millis();
    encCmdL = speed;
  } else {
    if (speed != 0 && encCmdR == 0) encLastMoveMsR = millis();
    encCmdR = speed;
    if (speed != 0) encCmdDirR = (speed > 0) ? 1 : -1;
  }
#endif
}

// ตั้งขาให้ปลอดภัยก่อนอย่างอื่นทั้งหมด — เรียกเป็นบรรทัดแรกของ setup()
void motorInit() {
  pinMode(PIN_AIN1, OUTPUT); pinMode(PIN_AIN2, OUTPUT);
  pinMode(PIN_BIN1, OUTPUT); pinMode(PIN_BIN2, OUTPUT);
  digitalWrite(PIN_AIN1, LOW); digitalWrite(PIN_AIN2, LOW);
  digitalWrite(PIN_BIN1, LOW); digitalWrite(PIN_BIN2, LOW);
  pwmInit(PIN_PWMA, PWM_CH_A);
  pwmInit(PIN_PWMB, PWM_CH_B);
  pwmWrite(PIN_PWMA, PWM_CH_A, 0);
  pwmWrite(PIN_PWMB, PWM_CH_B, 0);
  if (PIN_STBY >= 0) { pinMode(PIN_STBY, OUTPUT); digitalWrite(PIN_STBY, HIGH); }
}
#else
void motorInit() {}
#endif

#ifndef PWM_FLOOR
  #define PWM_FLOOR 60
#endif
#ifndef PWM_DRIVE
  #define PWM_DRIVE 110
#endif

// =====================================================================
// สถานะมอเตอร์แบบไม่บล็อก (ใบงานค้าง Codex ข้อ 1 + สเปกวันศุกร์ข้อ 6)
//   สั่งเดิน = ตั้งนาฬิกาหยุดเอง (MOTOR_TIMEOUT_MS) แล้วกลับ loop ทันที
//   หยุดปกติ = ชะลอ PWM ลงถึงเพดานล่างใน cfg.motorRampMs แล้วค่อยปล่อย
//     (ผลจำลอง ข้อ 4: ถือ 340 g แขนตรง ถ้าหยุดกะทันหันหุ่นคว่ำหน้า ต้องชะลอ ≥ 0.4 วิ)
//   หยุดกันตก = เบรกสั้นทันที (เร็วที่สุด) แล้วถอยเล็กน้อย
// =====================================================================
enum { MOT_STOP = 0, MOT_FWD, MOT_BACK, MOT_LEFT, MOT_RIGHT, MOT_RAMP, MOT_CLIFF_BRAKE, MOT_CLIFF_BACK };
volatile uint8_t motMode = MOT_STOP;
unsigned long motUntil = 0, motRampStart = 0;
volatile int motSpdL = 0, motSpdR = 0; int motRampL = 0, motRampR = 0;   // ISR อ่าน motSpd (#562)
#define MOTOR_TIMEOUT_MS 1000   // w/s/a/d เดิน 1 วิ เท่าโค้ดเดิม
#define CLIFF_BRAKE_MS    180   // #562 รวมช่วงเบรกนุ่ม 114 ms + เบรกช็อตค้างจนนิ่ง แล้วค่อยถอย
// เบรกนุ่มกันตก (#562 ชั้น 1 BMS41x8: ลูกล้อ Y −8 · IR Y +10.25 ห่าง 18.25)
//   หน่วงคงที่ ~1.58 m/s² = 85% ของค่าเบรกคะมำตอนถือขวด → ระยะหยุด ~14 มม. ที่ 180 มม./วิ
//   ** ค่าจากแบบจำลอง ต้องจูนกับหุ่นจริง: วิ่งเข้าขอบ (ถือขวด) ระยะเลยจุดเห็นขอบ ≤ 15 มม. และล้อหลังไม่ยก
//      หยุดไกลเกิน → เพิ่ม |BRK_D1| / ลด BRK_D0 · หัวทิ่ม/ล้อยก → ทำกลับกัน **
#define PWM_FWD     PWM_DRIVE   // เดินหน้า 180 มม./วิ เท่าเดิม
#define BRK_D0       71         // duty เริ่มเบรก (เดินหน้าต่ำกว่าแรงย้อน = เบรกคืนไฟ ไม่กระชาก)
#define BRK_D1      -39         // duty ปลายทาง (ถอยเบา ๆ ให้หน่วงคงที่ตอนช้าลง)
#define BRK_T_MS    114         // ไล่ duty เส้นตรง BRK_D0 → BRK_D1
#define CLIFF_BACK_MS     300   // ถอยหลังเล็กน้อยหลังเจอขอบ

void motorSet(int l, int r) {
  motSpdL = l; motSpdR = r;
#if USE_MOTOR
  driveMotor(true, l);
  driveMotor(false, r);
#endif
}

// หยุดทันที (ปล่อยล้อ) — ใช้ตอนล้อติดขัด หมดชะลอ และโหมดตรวจ
// ---------- จำทางเดิน (#501): เก็บทุกช่วงที่ล้อหมุนตั้งแต่เริ่มโปรแกรม (ทิศ + เวลาที่หมุนจริง) ----------
//   "back;" = ย้อนกลับจุดเริ่ม: เล่นย้อนลำดับ กลับทิศ เวลาเท่าเดิม (นับตามเวลา · มีชะลอหยุดเท่ากันทั้งไปและกลับ)
#define PATH_MAX 48
uint8_t pathMode[PATH_MAX]; uint16_t pathMs[PATH_MAX]; int pathN = 0;
bool pathRec = false; uint8_t pathRecMode = 0; unsigned long pathRecStart = 0; int pathSkip = 0;
void pathClear() { pathN = 0; pathRec = false; pathSkip = 0; }
void pathEnd() {
  if (!pathRec) return;
  pathRec = false;
  unsigned long d = millis() - pathRecStart;
  if (d < 30) return;
  if (pathN < PATH_MAX) { pathMode[pathN] = pathRecMode; pathMs[pathN] = (uint16_t)min(d, 60000UL); pathN++; }
}
void stopMotors() {
  pathEnd();
  motorSet(0, 0);
  motMode = MOT_STOP;
  motUntil = 0;
}

// เบรกสั้น TB6612 (IN1=IN2=HIGH) — กันตกเท่านั้น
void motorBrake() {
  pathEnd();
  motorSet(0, 0);
#if USE_MOTOR
  digitalWrite(PIN_AIN1, HIGH); digitalWrite(PIN_AIN2, HIGH);
  digitalWrite(PIN_BIN1, HIGH); digitalWrite(PIN_BIN2, HIGH);
#endif
}

bool motorBusy() { return motMode != MOT_STOP; }
char motDirChar() {
  switch (motMode) {
    case MOT_FWD: return 'F'; case MOT_BACK: return 'B';
    case MOT_LEFT: return 'L'; case MOT_RIGHT: return 'R';
    case MOT_RAMP: return 'r';
    case MOT_CLIFF_BRAKE: case MOT_CLIFF_BACK: return 'C';
    default: return 'S';
  }
}

bool cliffBlocked() {
#if USE_CLIFF
  return cfg.cliffEnable && (cliffL || cliffR);
#else
  return false;
#endif
}

// หยุดแบบชะลอ (ใช้กับ x และตอนหมดเวลาเดิน)
void motorSoftStop() {
  if (motMode == MOT_STOP || motMode == MOT_RAMP) return;
  if (motMode == MOT_CLIFF_BRAKE || motMode == MOT_CLIFF_BACK) return;   // กันตกจัดการเอง
  pathEnd();
  if (cfg.motorRampMs == 0 || (motSpdL == 0 && motSpdR == 0)) { stopMotors(); return; }
  motRampL = motSpdL; motRampR = motSpdR;
  motRampStart = millis();
  motMode = MOT_RAMP;
}

static int rampVal(int v, float f) {
  if (v == 0) return 0;
  int m = abs(v);
  float mm = m - (m - PWM_FLOOR) * f;
  int r = (int)mm;
  return v > 0 ? r : -r;
}

// เริ่มเดิน ms มิลลิวินาที แล้วกลับทันที — คืน false ถ้าไม่ยอมเดิน
bool motorGo(uint8_t mode, unsigned long ms) {
#if !USE_MOTOR
  (void)mode; (void)ms;
  Serial.println("[MOTOR] ปิดอยู่ (USE_MOTOR 0) — ข้ามคำสั่งเดิน");
  return false;
#else
  if (motMode == MOT_CLIFF_BRAKE || motMode == MOT_CLIFF_BACK) return false;
  if (mode == MOT_FWD && cliffBlocked()) {
    Serial.printf("[CLIFF] เจอขอบอยู่ (ซ้าย=%d ขวา=%d) — ไม่เดินหน้า\n", cliffL, cliffR);
    return false;
  }
  int l = 0, r = 0;
  switch (mode) {
    case MOT_FWD:   l =  PWM_FWD;   r =  PWM_FWD;   break;
    case MOT_BACK:  l = -PWM_DRIVE; r = -PWM_DRIVE; break;
    case MOT_LEFT:  l = -PWM_DRIVE; r =  PWM_DRIVE; break;
    case MOT_RIGHT: l =  PWM_DRIVE; r = -PWM_DRIVE; break;
    default: return false;
  }
  cliffIsrHit = false;
  pathEnd();
  motorSet(l, r);
  motMode = mode;
  motUntil = millis() + ms;
  if (pathSkip > 0) pathSkip--;                          // ช่วงที่กำลังย้อนทาง ไม่จำซ้ำ
  else if (isExecutingCommand) { pathRec = true; pathRecMode = mode; pathRecStart = millis(); }
  return true;
#endif
}

// ชื่อเดิม — ตอนนี้ไม่บล็อก เดิน 1 วิ แล้วชะลอหยุดเอง
void goForward()  { motorGo(MOT_FWD,   MOTOR_TIMEOUT_MS); }
void goBackward() { motorGo(MOT_BACK,  MOTOR_TIMEOUT_MS); }
void goLeft()     { motorGo(MOT_LEFT,  MOTOR_TIMEOUT_MS); }
void goRight()    { motorGo(MOT_RIGHT, MOTOR_TIMEOUT_MS); }

void cliffEvent(const char* how) {
  cliffEvents++;
#if USE_CLIFF && USE_MOTOR
  pathEnd(); motSpdL = motSpdR = 0;     // #562 งานเบรกนุ่ม (brakeTask) คุมล้อเอง — motorBrake() เดิมหน่วงแรงเกินค่าคะมำ
#else
  motorBrake();
#endif
  motMode = MOT_CLIFF_BRAKE;
  motUntil = millis() + CLIFF_BRAKE_MS;
  Serial.printf("[CLIFF] ⚠️ เจอขอบ (%s) ซ้าย=%d ขวา=%d → หยุดทันทีแล้วถอย %d ms\n",
                how, cliffL, cliffR, CLIFF_BACK_MS);
  cmdAbort("เจอขอบโต๊ะ");
  EVENT('c', 'O');                                  // ท่าเจอขอบ: หน้าตกใจ เงยผงะ (ล้อถอยหยุดเองแล้ว)
}

// เรียกทุกรอบ loop
void motorTick() {
  unsigned long now = millis();
  switch (motMode) {
    case MOT_FWD: case MOT_BACK: case MOT_LEFT: case MOT_RIGHT:
      if ((long)(now - motUntil) >= 0) motorSoftStop();
      break;
    case MOT_RAMP: {
      unsigned long e = now - motRampStart;
      if (e >= cfg.motorRampMs) { stopMotors(); break; }
      float f = (float)e / (float)cfg.motorRampMs;
      motorSet(rampVal(motRampL, f), rampVal(motRampR, f));
      break;
    }
    case MOT_CLIFF_BRAKE:
      if ((long)(now - motUntil) >= 0) {
        motorSet(-PWM_DRIVE / 2, -PWM_DRIVE / 2);   // #562 ถอยเบา (ล้อนิ่งแล้ว)
        motMode = MOT_CLIFF_BACK;
        motUntil = now + CLIFF_BACK_MS;
      }
      break;
    case MOT_CLIFF_BACK:
      if ((long)(now - motUntil) >= 0) stopMotors();
      break;
    default: break;
  }
}

// =====================================================================
// กันตก TCRT5000 ซ้าย 13 ขวา 19
//   ISR: เจอขอบระหว่างเดินหน้า → ตัดขาทิศมอเตอร์ทั้งสี่เส้นทันทีด้วยรีจิสเตอร์
//        (ไม่ต้องรอ loop ที่อาจค้างวาดจอเกือบ 100 ms)
//   loop: กรองสัญญาณ 2 ครั้งติด (10 ms) ยืนยันแล้วเบรก + ถอย
//         ถ้า ISR โดนสัญญาณกระตุกหลอก ให้เดินต่อ
// =====================================================================
#if USE_CLIFF
unsigned long cliffLastMs = 0;
uint8_t cliffCntL = 0, cliffCntR = 0, cliffClrL = 0, cliffClrR = 0;

// ตัวขับ duty ดิบ (ไม่ผ่าน PWM_FLOOR — ช่วงเบรกต้องใช้ duty ต่ำ)
void driveRaw(bool isLeft, int d) {
  if (isLeft ? INVERT_LEFT : INVERT_RIGHT) d = -d;
  digitalWrite(isLeft ? PIN_AIN1 : PIN_BIN1, d >= 0 ? HIGH : LOW);
  digitalWrite(isLeft ? PIN_AIN2 : PIN_BIN2, d >= 0 ? LOW : HIGH);
  pwmWrite(isLeft ? PIN_PWMA : PIN_PWMB, isLeft ? PWM_CH_A : PWM_CH_B, abs(d));
}
// งานเบรกนุ่ม: รันบน core 0 ลำดับสูง ไม่ค้างตามจอ TFT ใน loop · รอสัญญาณจาก ISR/polling
TaskHandle_t brakeTaskH = nullptr;
volatile bool brakeCancel = false;
void brakeTask(void*) {
  for (;;) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    brakeCancel = false;
    uint32_t t0 = millis();
    while (!brakeCancel) {
      uint32_t t = millis() - t0;
      if (t >= BRK_T_MS) break;
      int d = BRK_D0 + (BRK_D1 - BRK_D0) * (int)t / BRK_T_MS;
      driveRaw(true, d); driveRaw(false, d);
      vTaskDelay(1);
    }
    if (!brakeCancel) motorBrake();      // เบรกช็อตค้างจนครบ CLIFF_BRAKE_MS แล้ว motorTick ถอยเบา
  }
}
bool movingFwd() { return motSpdL > 0 && motSpdR > 0 && (motMode == MOT_FWD || motMode == MOT_RAMP); }

void IRAM_ATTR cliffIsr() {
#if USE_MOTOR
  if (!cliffIsrArmed || motSpdL <= 0 || motSpdR <= 0) return;      // #562 เดินหน้าทุกโหมด รวมช่วงชะลอ (RAMP)
  uint32_t in = REG_READ(GPIO_IN_REG);
  bool l = ((in >> PIN_CLIFF_L) & 1U) == cliffEdgeLvlIsr;
  bool r = ((in >> PIN_CLIFF_R) & 1U) == cliffEdgeLvlIsr;
  if (l || r) {
    REG_WRITE(GPIO_OUT_W1TS_REG,  (1UL << PIN_AIN1) | (1UL << PIN_AIN2));              // #562 เบรกทันที ≤1 ms
    REG_WRITE(GPIO_OUT1_W1TS_REG, (1UL << (PIN_BIN1 - 32)) | (1UL << (PIN_BIN2 - 32)));
    cliffIsrHit = true;
    if (brakeTaskH) { BaseType_t w = pdFALSE; vTaskNotifyGiveFromISR(brakeTaskH, &w); portYIELD_FROM_ISR(w); }   // เริ่มเบรกนุ่ม
  }
#endif
}

void cliffInit() {
  pinMode(PIN_CLIFF_L, INPUT_PULLUP);
  pinMode(PIN_CLIFF_R, INPUT_PULLUP);
  xTaskCreatePinnedToCore(brakeTask, "brk", 2048, nullptr, configMAX_PRIORITIES - 2, &brakeTaskH, 0);
  attachInterrupt(digitalPinToInterrupt(PIN_CLIFF_L), cliffIsr, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_CLIFF_R), cliffIsr, CHANGE);
}

bool cliffRawL() { return digitalRead(PIN_CLIFF_L) == cfg.cliffEdgeLevel; }
bool cliffRawR() { return digitalRead(PIN_CLIFF_R) == cfg.cliffEdgeLevel; }

void cliffTick() {
  unsigned long now = millis();
  if (cliffIsrHit) {
    cliffIsrHit = false;
    if (movingFwd()) {
      if (cfg.cliffEnable && (cliffRawL() || cliffRawR())) {
        cliffL = cliffRawL(); cliffR = cliffRawR();
        cliffEvent("ISR");
      } else {
        brakeCancel = true;
        motorSet(motSpdL, motSpdR);        // สัญญาณกระตุกหลอก เดินต่อ
      }
    }
  }
  if (now - cliffLastMs < 5) return;
  cliffLastMs = now;
  bool rl = cliffRawL(), rr = cliffRawR();
  if (rl) { cliffClrL = 0; if (cliffCntL < 10) cliffCntL++; } else { cliffCntL = 0; if (cliffClrL < 10) cliffClrL++; }
  if (rr) { cliffClrR = 0; if (cliffCntR < 10) cliffCntR++; } else { cliffCntR = 0; if (cliffClrR < 10) cliffClrR++; }
  if (cliffCntL >= 2) cliffL = true; else if (cliffClrL >= 3) cliffL = false;
  if (cliffCntR >= 2) cliffR = true; else if (cliffClrR >= 3) cliffR = false;
  if (cfg.cliffEnable && movingFwd() && (cliffL || cliffR)) { if (brakeTaskH) xTaskNotifyGive(brakeTaskH); cliffEvent("polling"); }
}
#else
void cliffInit() {}
void cliffTick() {}
bool cliffRawL() { return false; }
bool cliffRawR() { return false; }
#endif

// =====================================================================
// Encoder — อ่านค่า คำนวณ RPM และหยุดเองเมื่อสั่งเดินแล้วล้อไม่หมุน
// =====================================================================
#if USE_ENCODER
static unsigned long encLastSampleMs = 0;
static int32_t encPrevL = 0;
static int32_t encPrevR = 0;

int32_t encGetL() {
  portENTER_CRITICAL(&encMux); int32_t v = encCountL; portEXIT_CRITICAL(&encMux); return v;
}
int32_t encGetR() {
  portENTER_CRITICAL(&encMux); int32_t v = encCountR; portEXIT_CRITICAL(&encMux); return v;
}

void encoderZero() {
  portENTER_CRITICAL(&encMux); encCountL = 0; encCountR = 0; portEXIT_CRITICAL(&encMux);
  encPrevL = 0; encPrevR = 0;
  Serial.println("[ENC] ล้างตัวนับเป็นศูนย์แล้ว");
}

void encoderInit() {
  // GPIO34-39 ขอ pull-up ภายในไม่ได้ — ใช้ pull-up ที่มากับบอร์ด Encoder แทน
  pinMode(ENC_L_A, INPUT); pinMode(ENC_L_B, INPUT);
  pinMode(ENC_R_A, INPUT); pinMode(ENC_R_B, INPUT);

  encStateL = (uint8_t)((digitalRead(ENC_L_A) << 1) | digitalRead(ENC_L_B));
  encStateR = (uint8_t)((digitalRead(ENC_R_A) << 1) | digitalRead(ENC_R_B));

  attachInterrupt(digitalPinToInterrupt(ENC_L_A), encIsrLeft,  CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_L_B), encIsrLeft,  CHANGE);
#if ENC_R_QUADRATURE
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), encIsrRight, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_R_B), encIsrRight, CHANGE);
#else
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), encIsrRight, RISING);
#endif

  unsigned long now = millis();
  encLastSampleMs = now; encLastMoveMsL = now; encLastMoveMsR = now;
  Serial.printf("[ENC] พร้อม — ซ้าย A=%d B=%d | ขวา A=%d B=%d | ฝั่งขวา %s\n",
                ENC_L_A, ENC_L_B, ENC_R_A, ENC_R_B,
                ENC_R_QUADRATURE ? "quadrature x4" : "นับขอบเดียว");
}

// เรียกทุกรอบ loop — ไม่บล็อก คำนวณทุก ENC_SAMPLE_MS
void encoderTick() {
  unsigned long now = millis();
  if (now - encLastSampleMs < ENC_SAMPLE_MS) return;

  int32_t cL = encGetL();
  int32_t cR = encGetR();
  float dt = (now - encLastSampleMs) / 1000.0f;
  if (dt <= 0.0f) dt = 0.001f;

  encRpmL = ((cL - encPrevL) / ENC_CPR_L) / dt * 60.0f;
  encRpmR = ((cR - encPrevR) / ENC_CPR_R) / dt * 60.0f;

  if (cL != encPrevL) encLastMoveMsL = now;
  if (cR != encPrevR) encLastMoveMsR = now;

  encPrevL = cL; encPrevR = cR;
  encLastSampleMs = now;

  // ล้อติดขัด: สั่งเดินอยู่แต่ตัวนับไม่ขยับเลย หยุดกันเฟืองพลาสติกใน TT Motor รูด
  bool stallL = (encCmdL != 0) && (now - encLastMoveMsL > ENC_STALL_MS);
  bool stallR = (encCmdR != 0) && (now - encLastMoveMsR > ENC_STALL_MS);
  if (stallL || stallR) {
    stopMotors();
    Serial.printf("[ENC] หยุดอัตโนมัติ — ล้อ%s สั่งแล้วไม่หมุน "
                  "ตรวจล้อติด สายมอเตอร์ หรือสาย Encoder\n",
                  (stallL && stallR) ? "ซ้ายและขวา" : (stallL ? "ซ้าย" : "ขวา"));
  }
}

void encoderReport() {
  Serial.printf("[ENC] นับ L=%ld R=%ld | RPM L=%.1f R=%.1f | ระดับขา LA=%d LB=%d RA=%d RB=%d\n",
                (long)encGetL(), (long)encGetR(), encRpmL, encRpmR,
                digitalRead(ENC_L_A), digitalRead(ENC_L_B),
                digitalRead(ENC_R_A), digitalRead(ENC_R_B));
  Serial.printf("      นับต่อรอบที่ใช้อยู่ L=%.0f R=%.0f — สอบเทียบด้วย EncoderMotorTest_TT ปุ่ม k\n",
                ENC_CPR_L, ENC_CPR_R);
  Serial.println("      ระดับขาค้างที่ค่าเดิมแม้หมุนล้อ = Encoder ไม่มีไฟ สายขาด "
                 "หรือชิปต้องการไฟสูงกว่า 3.3V (pull-up อยู่บนบอร์ดแล้ว ไม่ใช่สาเหตุ)");
}

// ตรวจพัลส์หลอก 10 วิ — บล็อกจริง ใช้ตอนตรวจเท่านั้น ห้ามแตะล้อระหว่างนี้
void encoderNoiseTest() {
  stopMotors();
  Serial.println("[ENC] ตรวจพัลส์หลอก อย่าแตะล้อ 10 วินาที...");
  delay(300);
  int32_t a = encGetL(), b = encGetR();
  for (int sec = 10; sec > 0; sec--) {
    delay(1000);
    Serial.printf("      เหลือ %2d วิ  เดินไป L=%+ld R=%+ld\n",
                  sec - 1, (long)(encGetL() - a), (long)(encGetR() - b));
  }
  int32_t dL = encGetL() - a, dR = encGetR() - b;
  if (dL == 0 && dR == 0) {
    Serial.println("[ENC] ผ่าน — ไม่มีพัลส์หลอก");
  } else {
    if (dL != 0)
      Serial.println("[ENC] ซ้าย (34/35) เดินเอง — ตรวจสายหลวม กราวนด์ร่วม และสายมอเตอร์ที่เดินชิดสายสัญญาณ");
    if (dR != 0)
      Serial.println("[ENC] ขวา (36/39) เดินเอง — อาการพัลส์หลอกของ ESP32 "
                     "ให้ตั้ง ENC_R_QUADRATURE เป็น 0 แล้วแฟลชใหม่");
  }
  // รีเซ็ตฐานเวลา ไม่ให้ tick ถัดไปคิด RPM จากช่วง 10 วิที่เพิ่งบล็อกไป
  encPrevL = encGetL(); encPrevR = encGetR();
  encLastSampleMs = millis();
  encLastMoveMsL = encLastSampleMs; encLastMoveMsR = encLastSampleMs;
}
#else
void encoderInit() {}
void encoderTick() {}
void encoderZero() {}
int32_t encGetL() { return 0; }
int32_t encGetR() { return 0; }
void encoderReport()    { Serial.println("[ENC] ปิดอยู่ (USE_ENCODER 0)"); }
void encoderNoiseTest() { Serial.println("[ENC] ปิดอยู่ (USE_ENCODER 0)"); }
#endif  // USE_ENCODER

// motorRunFor() เดิม (วนรอ 1 วิพร้อม delay(5)) ถูกเอาออกแล้ว
// มอเตอร์ใช้นาฬิกาใน motorTick() แทน encoderTick() ยังถูกเรียกทุกรอบ loop เหมือนเดิม

// =====================================================================
// Gripper — ดึงจาก Robo/Robo.ino (gripSync, gripRelease, smartGrip, safeGrip,
// gripAndVerify) มาใช้กับ MG90S CH1/CH3 — สเปกวันศุกร์ข้อ 2
// ตัวเดิมบล็อกด้วย delay (smartGrip เดิมใช้เวลาราว 11 วิ) ตอนนี้เป็นลำดับขั้นที่เดินใน loop
// =====================================================================
enum { G_END = 0, G_PCT, G_PCT_SLOW, G_WAIT, G_SETTLE, G_RELEASE, G_LOWER, G_LIFT, G_VERIFY, G_APPROACH, G_CAMDOWN, G_CAMREF };
// ---------- กล้องแทน VL53 ตอนหนีบ (9 พ.ย.) — ใช้เองเมื่อ VL53 ออฟไลน์และกล้องส่งข้อมูลอยู่ ----------
// กล้องส่ง "O<x>,<y>,<a>,<b>" ~5 Hz (FullCam v10): ของเด่นสุดตรงหน้า x,y −100..100 · a พื้นที่ % · b ขอบล่าง 0..100
// ก้มหน้า → หาระยะจากมุมฐานของ (ขอบล่าง b) ด้วยเรขาคณิต: ระยะ = สูงกล้อง / tan(มุมก้ม + มุมของใต้กลางภาพ)
// ค่าทั้งหมดจูนผ่าน Serial "!cam <ตัวอักษร> <ค่า>" (ไม่เก็บถาวร) · "!cam" เฉย ๆ = ดูค่า + ข้อมูลกล้องล่าสุด
int camObjX = 0, camObjY = 0, camObjA = 0, camObjB = 0;
unsigned long camObjMs = 0, camHeadMoveMs = 0, camPetMs = 0;
int camGH = 185;      // h สูงเลนส์กล้องจากพื้น มม. (หัวชั้น 5 บนสุด 220 มม. หนา 75 · ประมาณ — วัดจริงแล้วแก้)
int camGD = 70;       // d ระยะแนวนอนจากเลนส์ถึงผิวหน้าของตอนหนีบพอดี มม. (VL ระยะดี 48–56 + เลนส์อยู่หลัง VL ~20)
int camGT = -10;      // t มุมก้มหัวตอนหนีบ (− = ก้ม · แกนจริงก้มได้สุด −10)
int camGV = 50;       // v มุมมองแนวตั้งของภาพ 240×240 องศา (ตรงกับ CAM_VFOV_DEG)
int camGX = 25;       // x ของคลาดกลางภาพเกินนี้ = หมุนตัวเข้าหา
int camGS = 180;      // s ความเร็วเดินหน้า มม./วิ (PWM_FWD)
int camGM = 2;        // m พื้นที่ของน้อยกว่านี้ (%) = ไม่เห็นของ
int camLA = 6;        // a ยกแล้วพื้นที่ของต้องโตขึ้น ≥ 6 จุด % หรือ
int camLY = 12;       // y จุดกลางของต้องขึ้น ≥ 12 (หน่วย −100..100) และ
int camLH = 600;      // k ค้างอย่างนั้นนาน 600 ms (ของไม่ตกกลับ) = ยกได้
#define CAM_X_SIGN_G 1  // ต้องตรงกับ CAM_X_SIGN (ของอยู่ซ้ายภาพ → หมุนตัวไปซ้าย)
bool gCamMode = false, gCamFinal = false, gCamSeen0 = false, gCamEver = false;
int gCamA0 = 0, gCamY0 = 0, gCamBack = 0;
unsigned long gCamUpMs = 0;
bool camObjFresh() { return camObjMs && millis() - camObjMs < 700; }
bool camObjSeen()  { return camObjFresh() && camObjA >= camGM; }
// เข้าหาระยะหนีบ (#501): VL53 อยู่หน้าชั้น 1 · ระยะผิวของที่หนีบพอดี (สมมติจากจำลอง ศูนย์ของ ~65 มม. หน้าตัว ต้องเทียบกับของจริง)
#define GRIP_VL_LO   48     // ใกล้กว่านี้ = ถอยนิด (#517 คำนวณจากโมเดลแขน: ระยะหนีบดี VL 48–56)
#define GRIP_VL_HI   56     // ไกลกว่านี้ = เดินเข้านิด
#define GRIP_VL_SEE 300     // ไกลกว่านี้/ไม่เห็น = ไม่เจอของ
#define GRIP_STEP_MS 120    // เดินทีละช่วงสั้น ๆ
#define GRIP_LOW_LIFT  -43  // หนีบที่แขนต่ำสุด (เจ้าของ #501)
#define GRIP_UP_LIFT   -17  // #524 ยกแค่ −17: ก้นของ Z ≈ 40 (พ้นแนว VL Z 30 + เผื่อของไหลลง 10) · ของเอียงตามแขน ~25° (เดิม −10 = 33°)
struct GStep { uint8_t op; int16_t a; };
#define G_MAX 24
GStep gSeq[G_MAX];
int  gLen = 0, gIdx = 0;
bool gActive = false;
bool gStepStarted = false;
unsigned long gStepStart = 0;

void gClear() { gLen = 0; }
void gAdd(uint8_t op, int16_t a = 0) { if (gLen < G_MAX) { gSeq[gLen].op = op; gSeq[gLen].a = a; gLen++; } }
void gRun()   { gIdx = 0; gStepStarted = false; gActive = gLen > 0; gCamMode = false; }
void gAbort() { gActive = false; gLen = 0; }

// มือและแขนถึงเป้าแล้ว (หรือถูก interlock กั้นนิ่งเกิน 0.3 วิ)
bool limbsSettled() {
  static const int L[4] = { AX_HAND_L, AX_HAND_R, AX_ARM_L, AX_ARM_R };
  unsigned long now = millis();
  for (int k = 0; k < 4; k++) {
    int i = L[k];
    if (axMoving(i) && !(ax[i].blockedSinceMs && now - ax[i].blockedSinceMs > 300)) return false;
  }
  return true;
}

void liftArms()  { armSetLift(0, GRIP_UP_LIFT); armSetLift(1, GRIP_UP_LIFT); Serial.println("Arms lifted"); }   // ยกของ: สองข้างพร้อมกัน (เจ้าของ #501: 0–10°)
void lowerArms() { armSetLift(0, GRIP_LOW_LIFT); armSetLift(1, GRIP_LOW_LIFT); Serial.println("Arms lowered"); }   // หนีบที่แขนต่ำสุด

// --- gripSync: สั่งสองมือพร้อมกัน (สมมาตร) percent 0=กางสุด 100=หนีบสุด — ไม่บล็อก ---
void gripSync(int percent) {
  percent = constrain(percent, 0, 100);
  handSetPct(0, percent);
  handSetPct(1, percent);
}

// smartGrip เดิม: กาง → รอ 0.5 วิ → หนีบทีละ 3% → ถอย GRIP_SAFE_BACK×2 %
// ตอนนี้: กาง → รอ → หนีบด้วยความเร็วต่ำ (ผลเท่ากันแต่นุ่มกว่า) → รอ → ถอยนิด
void gAddSmartGrip() {
  gAdd(G_APPROACH);                                       // เข้าหาระยะหนีบก่อน (ไม่มี VL = ข้าม)
  gAdd(G_PCT, 0);  gAdd(G_SETTLE); gAdd(G_WAIT, 500);
  gAdd(G_PCT_SLOW, 100); gAdd(G_SETTLE); gAdd(G_WAIT, GRIP_HOLD_MS);
  gAdd(G_PCT, constrain(100 - GRIP_SAFE_BACK * 2, 0, 100)); gAdd(G_SETTLE);
}

void smartGrip() {
#if USE_HAND
  Serial.println("Smart grip...");
  gClear(); gAddSmartGrip(); gRun();
#else
  Serial.println("[GRIP] ปิดอยู่ (USE_HAND 0) — ข้าม smartGrip");
#endif
}

// --- gripRelease: กางสุด แล้วปลดแรงมือ (เหมือน detach เดิม) ---
void gripRelease() {
#if USE_HAND
  gClear(); gAdd(G_PCT, 0); gAdd(G_SETTLE); gAdd(G_WAIT, 200); gAdd(G_RELEASE); gRun();
  Serial.println("Release...");
#else
  Serial.println("[GRIP] ปิดอยู่ (USE_HAND 0) — ข้าม gripRelease");
#endif
}

// --- safeGrip: จับที่ % ที่กำหนด แล้วถอยนิด ---
void safeGrip(int targetPercent) {
#if USE_HAND
  targetPercent = constrain(targetPercent, 0, 100);
  gClear();
  gAdd(G_PCT, targetPercent); gAdd(G_SETTLE); gAdd(G_WAIT, GRIP_HOLD_MS);
  gAdd(G_PCT, constrain(targetPercent - GRIP_SAFE_BACK * 2, 0, 100)); gAdd(G_SETTLE);
  gRun();
  Serial.printf("Safe grip %d%%\n", targetPercent);
#else
  Serial.printf("[GRIP] ปิดอยู่ (USE_HAND 0) — ข้าม safeGrip %d%%\n", targetPercent);
#endif
}

// --- gripAndVerify: ลดแขน → หนีบฉลาด → ยก → ตรวจด้วย VL53L0X ว่ายกได้จริง ---
void gripAndVerify() {
#if USE_HAND
  Serial.println("Grip & verify...");
  gClear();
  gAdd(G_CAMDOWN);                                        // ไม่มี VL + มีกล้อง = ก้มหน้าดูของ (มี VL = ข้าม)
  gAdd(G_APPROACH);                                       // เข้าหาระยะหนีบด้วย VL (หรือกล้อง) ก่อน
  gAdd(G_LOWER); gAdd(G_PCT, 0); gAdd(G_SETTLE);         // ลดแขนต่ำสุด + กางมือ พร้อมกัน
  gAdd(G_PCT_SLOW, 100); gAdd(G_SETTLE); gAdd(G_WAIT, GRIP_HOLD_MS);
  gAdd(G_CAMREF);                                         // จำภาพของก่อนยก (โหมดกล้อง)
  gAdd(G_PCT, constrain(100 - GRIP_SAFE_BACK * 2, 0, 100));
  gAdd(G_LIFT); gAdd(G_SETTLE);                          // ถอยมือนิด + ยก พร้อมกัน (เดิมรอ 0.5 วิ)
  gAdd(G_VERIFY, 1500);
  gRun();
#else
  Serial.println("[GRIP] ปิดอยู่ (USE_HAND 0) — ข้าม gripAndVerify");
#endif
}

int gApproachN = 0; unsigned long gApproachNext = 0;
bool gApproachStep(unsigned long now);   // อยู่หลังส่วนคิวคำสั่ง (ใช้สถานะโปรแกรม)

// เดินลำดับขั้นมือ — เรียกทุกรอบ loop
void gripTick() {
  if (!gActive) return;
  if (gIdx >= gLen) { gActive = false; return; }
  unsigned long now = millis();
  GStep& s = gSeq[gIdx];
  if (!gStepStarted) {
    gStepStarted = true;
    gStepStart = now;
    switch (s.op) {
      case G_PCT:      handSetPct(0, s.a); handSetPct(1, s.a); if (!vlOnline && s.a < 30) holding = false; break;
      case G_PCT_SLOW: handSetPct(0, s.a, GRIP_SLOW_SCALE); handSetPct(1, s.a, GRIP_SLOW_SCALE); break;
      case G_RELEASE:  if (!vlOnline) holding = false;     // ยกด้วยกล้อง: ปล่อยมือ = ไม่ถือแล้ว
                       releaseServoChannel(SERVO_HAND_LEFT_CH); releaseServoChannel(SERVO_HAND_RIGHT_CH);
                       Serial.println("Released"); break;
      case G_LOWER:    lowerArms(); break;
      case G_APPROACH: gApproachN = 0; gApproachNext = now; gCamFinal = false; gCamBack = 0; break;
      case G_LIFT:     liftArms(); break;
      case G_CAMDOWN:
        gCamMode = !vlOnline && camOk;
        if (gCamMode) { axTrySet(AX_YAW, 0, false); axTrySet(AX_TILT, camGT, false);
                        Serial.printf("[GRIP] ไม่มี VL53 — ใช้กล้อง ก้มหน้า %d°\n", camGT); }
        break;
      case G_CAMREF:
        gCamSeen0 = camObjSeen(); gCamA0 = gCamSeen0 ? camObjA : 0; gCamY0 = camObjY; gCamUpMs = 0; gCamEver = gCamSeen0;
        if (gCamMode) Serial.printf("[GRIP] กล้องก่อนยก: %s a=%d y=%d b=%d\n", gCamSeen0 ? "เห็นของ" : "ไม่เห็นของ", camObjA, camObjY, camObjB);
        break;
      default: break;
    }
  }
  bool done = true;
  switch (s.op) {
    case G_APPROACH: done = gApproachStep(now); break;
    case G_WAIT:   done = (now - gStepStart) >= (unsigned long)s.a; break;
    case G_SETTLE: done = limbsSettled() || (now - gStepStart) > 4000; break;
    case G_CAMDOWN:                                         // รอหัวนิ่ง + ภาพใหม่
      done = !gCamMode || (now - gStepStart > 600 && !axMoving(AX_TILT) && !axMoving(AX_YAW)) || now - gStepStart > 2500;
      break;
    case G_VERIFY:
      if (!vlOnline && gCamMode) {                          // ตรวจด้วยกล้อง: ของโตขึ้น/ขึ้นสูง และค้างไว้ = ยกได้
        bool seen = camObjSeen();
        if (seen) gCamEver = true;
        bool up = seen && (camObjA >= gCamA0 + camLA || (gCamSeen0 && camObjY <= gCamY0 - camLY));
        if (up) { if (!gCamUpMs) gCamUpMs = now; } else gCamUpMs = 0;
        if (gCamUpMs && now - gCamUpMs >= (unsigned long)camLH) {
          lastVerify = 1; holding = true; done = true;
          Serial.printf("[GRIP] ✓ ยกของได้แล้ว (กล้อง: a %d→%d y %d→%d ค้าง %d ms)\n", gCamA0, camObjA, gCamY0, camObjY, camLH);
          axTrySet(AX_TILT, 0, false);
          EVENT('l', 'H');
        } else if (now - gStepStart >= 3000) {
          done = true; axTrySet(AX_TILT, 0, false);
          if (!gCamEver) { lastVerify = -1; Serial.println("[GRIP] ตรวจไม่ได้ — กล้องไม่เห็นของเลยทั้งก่อนและหลังยก"); }
          else { lastVerify = 0; Serial.printf("[GRIP] ✗ ยังไม่ได้ยก (กล้อง: ของไม่ขึ้น/ตกกลับ a=%d y=%d)\n", camObjA, camObjY); }
        } else done = false;
      } else if (!vlOnline) {
        lastVerify = -1; Serial.println("[GRIP] ตรวจไม่ได้ — ไม่มี VL53L0X"); done = true;
      } else if (holding) {
        lastVerify = 1;  Serial.println("[GRIP] ✓ ยกของได้แล้ว (VL53 เห็นของหายจากพื้น)"); done = true;
        EVENT('l', 'H');                            // ท่ายกสำเร็จ: หน้า + หัว (ไม่แตะแขน)
      } else if ((now - gStepStart) >= (unsigned long)s.a) {
        lastVerify = 0;  Serial.println("[GRIP] ✗ ยังไม่ได้ยก — ของยังอยู่หน้าเซนเซอร์ หรือไม่เคยเห็นของ"); done = true;
      } else done = false;
      break;
    default: done = true; break;
  }
  if (done) {
    gIdx++;
    gStepStarted = false;
    if (gIdx >= gLen) {
      gActive = false;
      ax[AX_HAND_L].vScale = 1.0f; ax[AX_HAND_R].vScale = 1.0f;
      Serial.println("[GRIP] เสร็จ");
    }
  }
}

// =====================================================================
// Idle Behavior Variables
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

unsigned long nextHeadLookTime = 0;
bool inHeadLook = false;
int headLookPhase = 0;
unsigned long headLookPhaseStart = 0;
float headLookTarget = 90;

// =====================================================================
// รันคำสั่ง Blockly — คิวแบบไม่บล็อก (สเปกวันศุกร์ข้อ 9)
// =====================================================================
// /run?cmd=a;b;c;  รับทั้งสาย แล้วทำทีละคำสั่งใน loop
//   - แต่ละคำสั่ง "รอจนเสร็จ" ก่อนไปคำสั่งถัดไป เหมือนโค้ดเดิม (เดิมรอด้วย delay)
//   - ระหว่างนั้น /state ตอบได้ตลอด และ x หยุดได้ทันที (คำสั่งอื่นยังได้ 409 BUSY เหมือนเดิม)
//   - เว้น 50 ms ระหว่างคำสั่งเท่าเดิม
// ตารางคำสั่งทั้งหมดอยู่ในรายงาน รายงานเฟิร์มแวร์_วันศุกร์.md
// =====================================================================
enum { CW_NONE = 0, CW_TIME, CW_MOTOR, CW_AXES, CW_GRIP, CW_EMO };
// สถานะโปรแกรมจากเว็บ (/state "prog"): 0 ว่าง · 1 กำลังรัน · 2 จบครบ · 3 ถูกหยุด/เจอขอบ · 4 ภารกิจหนีบไม่สำเร็จ
uint8_t progSt = 0;
bool lastCmdHome = false;   // #565 คำสั่งสุดท้ายเป็น home; (เก็บแขนเข้าท่าพักแล้ว) = ปลดไอเดิลแค่หัว
unsigned long bugCount = 0;
bool cmdHomeFirst = false, failBack = false;
char lastBug[24] = "";
String cmdQueue;
int cmdPos = 0;
bool cmdInStep = false;
uint8_t cmdWait = CW_NONE;
unsigned long cmdStepStart = 0, cmdWaitMs = 0, cmdGapUntil = 0;
bool cmdPostNormalEyes = false;

extern bool idleHeadOnly;
void cmdFinish() {
  bool ranToEnd = isExecutingCommand && progSt == 1;
  isExecutingCommand = false;
  cmdQueue = ""; cmdPos = 0; cmdInStep = false; cmdWait = CW_NONE; cmdHomeFirst = false;
  Serial.println("เสร็จ!");
  drawEyesForEmotion(currentEmotion);
  lastBlinkTime = millis();
  lastActivityMs = millis();
  idleHeadOnly = !lastCmdHome;                             // #565 หลังโค้ด ไอเดิลไม่ขยับแขน (เว้นแต่จบด้วย home;)
  if (ranToEnd) { progSt = 2; EVENT('d', 'H'); }       // รันครบทุกบล็อก = สำเร็จ
}

void cmdAbort(const char* why) {
  if (!isExecutingCommand) return;
  Serial.printf("[CMD] ยกเลิกคำสั่งที่เหลือในคิว — %s\n", why);
  if (progSt == 1) progSt = 3;
  cmdFinish();
}

// ชื่อเดิม — ตอนนี้แค่รับคิวแล้วกลับทันที
void pathClear();
extern bool idlePlaying;
extern bool idleHeadOnly;
void executeCommandString(String cmdString) {
  // หยุดท่าไอเดิล/อารมณ์/แตะหัวทันที แล้วกลับท่า R ก่อนเริ่มคำสั่งแรก (#501)
  emoStop(); trCancel(); idlePlaying = false;
  cmdHomeFirst = true; failBack = false; progSt = 1; pathClear();
  lastActivityMs = millis();
  cmdQueue = cmdString;
  cmdPos = 0;
  cmdInStep = false;
  cmdGapUntil = millis();
  isExecutingCommand = true;
}

// x / ปุ่มหยุด: ชะลอล้อหยุด ทิ้งคิว หยุดมือ หยุดท่า หยุดเซอร์โวไว้ตรงที่อยู่
void emergencyStop() {
  motorSoftStop();
  gAbort();
  emoStop(); trCancel();
  for (int i = 0; i < AX_N; i++) { ax[i].target = ax[i].pos; ax[i].vel = 0; ax[i].vScale = 1.0f; }
  tiltDuck = false;
  cmdAbort("สั่งหยุด x");
  Serial.println("[STOP] หยุดทุกอย่าง");
}

static bool axesAllSettled() {
  unsigned long now = millis();
  for (int i = 0; i < AX_N; i++) {
    if (axMoving(i) && !(ax[i].blockedSinceMs && now - ax[i].blockedSinceMs > 300)) return false;
  }
  return true;
}

static bool cmdStepDone() {
  unsigned long now = millis();
  switch (cmdWait) {
    case CW_TIME:  return now - cmdStepStart >= cmdWaitMs;
    case CW_MOTOR: return !motorBusy();
    case CW_AXES:  return axesAllSettled() || now - cmdStepStart > 4000;
    case CW_GRIP:  return !gActive;
    case CW_EMO:   return !emoBusy() || now - cmdStepStart > 6000;
    default:       return true;
  }
}

void pathRetrace();
static int argInt(const String& c, int from) { return c.substring(from).toInt(); }
static float argF(const String& c, int from) { return c.substring(from).toFloat(); }

// ทำหนึ่งคำสั่ง — ตั้ง cmdWait บอกว่าต้องรออะไรก่อนไปคำสั่งถัดไป
void runOneCommand(const String& cmd) {
  lastCmdHome = (cmd == "home");
  // ---------- ล้อ (ของเดิม) ----------
  if      (cmd == "w") { drawEyes_Normal();    if (motorGo(MOT_FWD,   MOTOR_TIMEOUT_MS)) cmdWait = CW_MOTOR; }
  else if (cmd == "s") { drawEyes_Normal();    if (motorGo(MOT_BACK,  MOTOR_TIMEOUT_MS)) cmdWait = CW_MOTOR; }
  else if (cmd == "a") { drawEyes_LookLeft();  if (motorGo(MOT_LEFT,  MOTOR_TIMEOUT_MS)) cmdWait = CW_MOTOR; cmdPostNormalEyes = true; }
  else if (cmd == "d") { drawEyes_LookRight(); if (motorGo(MOT_RIGHT, MOTOR_TIMEOUT_MS)) cmdWait = CW_MOTOR; cmdPostNormalEyes = true; }
  else if (cmd == "x") { motorSoftStop(); cmdWait = CW_MOTOR; }
  else if (cmd == "z") { cmdWait = CW_TIME; cmdWaitMs = 1000; }
  // ---------- มือ (ของเดิม) 1-3 มือขวา(hand2)  4-6 มือซ้าย(hand1) ----------
  else if (cmd == "1") { handSetPct(1, 0);   cmdWait = CW_AXES; }   // มือขวา กาง (เดิม 80 = OPEN)
  else if (cmd == "2") { handCenterSide(1);  cmdWait = CW_AXES; }   // มือขวา กลาง (เดิม 50)
  else if (cmd == "3") { handSetPct(1, 100); cmdWait = CW_AXES; }   // มือขวา หนีบ (เดิม 20)
  else if (cmd == "4") { handSetPct(0, 100); cmdWait = CW_AXES; }   // มือซ้าย หนีบ (เดิม 100)
  else if (cmd == "5") { handCenterSide(0);  cmdWait = CW_AXES; }   // มือซ้าย กลาง (เดิม 130)
  else if (cmd == "6") { handSetPct(0, 0);   cmdWait = CW_AXES; }   // มือซ้าย กาง (เดิม 160)
  // ---------- หัวหัน (ของเดิม) ตั้งเป้าที่เดียวกับกล้อง ----------
  else if (cmd == "7") { moveHead(50);  cmdWait = CW_AXES; }
  else if (cmd == "8") { moveHead(90);  cmdWait = CW_AXES; }
  else if (cmd == "9") { moveHead(130); cmdWait = CW_AXES; }
  // ---------- แขน (ของเดิม) ----------
  else if (cmd == "r") { moveArm1(67);  cmdWait = CW_AXES; }
  else if (cmd == "f") { moveArm1(91);  cmdWait = CW_AXES; }
  else if (cmd == "v") { moveArm1(121); cmdWait = CW_AXES; }
  else if (cmd == "t") { moveArm2(118); cmdWait = CW_AXES; }
  else if (cmd == "g") { moveArm2(90);  cmdWait = CW_AXES; }
  else if (cmd == "b") { moveArm2(60);  cmdWait = CW_AXES; }
  // ---------- หัวก้มเงย: T1 ก้มสุด T2 ตรง T3 เงยสุด (±10 ตามลิมิต) ----------
  else if (cmd == "T1") { headTiltRel(-10); cmdWait = CW_AXES; }
  else if (cmd == "T2") { headTiltRel(0);   cmdWait = CW_AXES; }
  else if (cmd == "T3") { headTiltRel(10);  cmdWait = CW_AXES; }
  // ---------- หน้า/ตา (ของเดิม) ค้าง 0.3 วิ ----------
  else if (cmd == "y") { drawEyes_LookLeft();  cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "u") { drawEyes_Normal();    cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "i") { drawEyes_LookRight(); cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "o") { drawEyes_Shocked();   cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "h") { drawEyes_Happy();     cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "j") { drawEyes_Sad();       cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "k") { drawEyes_Angry();     cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "n") { drawEyes_Sleepy();    cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "c") { drawEyes_Confused();  cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "l") { drawEyes_Love();      cmdWait = CW_TIME; cmdWaitMs = 300; }
  else if (cmd == "e") { drawEyes_Shy();       cmdWait = CW_TIME; cmdWaitMs = 300; }
  // ---------- มือหนีบ (ของเดิม) ----------
  else if (cmd == "G") { smartGrip();     cmdWait = CW_GRIP; }
  else if (cmd == "P") { gripRelease();   cmdWait = CW_GRIP; }
  else if (cmd == "Q") { gripAndVerify(); cmdWait = CW_GRIP; }
  else if (cmd.startsWith("grip:"))  { safeGrip(argInt(cmd, 5)); cmdWait = CW_GRIP; }
  // ---------- คำสั่งใหม่รอบวันศุกร์ ----------
  else if (cmd.startsWith("yaw:"))   { headYawRel(argF(cmd, 4));  cmdWait = CW_AXES; }
  else if (cmd.startsWith("tilt:"))  { headTiltRel(argF(cmd, 5)); cmdWait = CW_AXES; }
  else if (cmd.startsWith("lift1:")) { armSetLift(0, argF(cmd, 6)); cmdWait = CW_AXES; }
  else if (cmd.startsWith("lift2:")) { armSetLift(1, argF(cmd, 6)); cmdWait = CW_AXES; }
  else if (cmd.startsWith("lift:"))  { float v = argF(cmd, 5); armSetLift(0, v); armSetLift(1, v); cmdWait = CW_AXES; }
  else if (cmd.startsWith("hand1:")) { handSetPct(0, argF(cmd, 6)); cmdWait = CW_AXES; }
  else if (cmd.startsWith("hand2:")) { handSetPct(1, argF(cmd, 6)); cmdWait = CW_AXES; }
  else if (cmd.startsWith("hand:"))  { float v = argF(cmd, 5); handSetPct(0, v); handSetPct(1, v); cmdWait = CW_AXES; }
  else if (cmd.startsWith("fw:"))    { drawEyes_Normal();    if (motorGo(MOT_FWD,   constrain(argInt(cmd, 3), 100, 5000))) cmdWait = CW_MOTOR; }
  else if (cmd.startsWith("bw:"))    { drawEyes_Normal();    if (motorGo(MOT_BACK,  constrain(argInt(cmd, 3), 100, 5000))) cmdWait = CW_MOTOR; }
  else if (cmd.startsWith("tl:"))    { drawEyes_LookLeft();  if (motorGo(MOT_LEFT,  constrain(argInt(cmd, 3), 100, 5000))) cmdWait = CW_MOTOR; cmdPostNormalEyes = true; }
  else if (cmd.startsWith("tr:"))    { drawEyes_LookRight(); if (motorGo(MOT_RIGHT, constrain(argInt(cmd, 3), 100, 5000))) cmdWait = CW_MOTOR; cmdPostNormalEyes = true; }
  else if (cmd.startsWith("wait:"))  { cmdWait = CW_TIME; cmdWaitMs = constrain(argInt(cmd, 5), 0, 10000); }
  else if (cmd.startsWith("hs:"))    { cfg.headVmax = constrain(argF(cmd, 3), 10.0f, 200.0f);
                                       Serial.printf("[HEAD] ความเร็วหัว %.0f°/s (ยังไม่บันทึก)\n", cfg.headVmax); }
  else if (cmd.startsWith("emo:") && cmd.length() >= 5) {
    char e = cmd.charAt(4);
    if (strchr("NHSAOZCVB", e) != nullptr) { forceEmotionChange(e); cmdWait = CW_EMO; }   // รอท่าจบ (เดิมรอ 300 ms ท่าถัดไปทับ)
    else { cmdWait = CW_TIME; cmdWaitMs = 300; }
  }
  // ---------- รอบ #501 ----------
  else if (cmd == "home")  { setRestPose(!gripHoldingSomething()); cmdWait = CW_AXES; }              // กลับท่า R
  else if (cmd == "back")  { pathRetrace(); }                                                     // ย้อนทางเดินกลับจุดเริ่ม
  else if (cmd.startsWith("failback:")) { failBack = argInt(cmd, 9) != 0; }                       // หนีบไม่สำเร็จ = ย้อนกลับเอง
  else if (cmd.length() > 0) {                       // บัคทั่วไป: ทำหน้างง ส่ายหัว แล้วทำคำสั่งถัดไปต่อ
    Serial.printf("[CMD] ไม่รู้จักคำสั่ง \"%s\" — งงแล้วข้าม\n", cmd.c_str());
    bugCount++; strncpy(lastBug, cmd.c_str(), sizeof(lastBug) - 1); lastBug[sizeof(lastBug) - 1] = 0;
    EVENT('b', 'C'); cmdWait = CW_EMO;
  }
}

// เรียกทุกรอบ loop
void pathRetrace() {
  if (pathN == 0) { Serial.println("[PATH] ยังไม่ได้เดิน — อยู่ที่จุดเริ่มแล้ว"); return; }
  String r; int segs = 0;
  for (int i = pathN - 1; i >= 0; i--) {
    const char* op = pathMode[i] == MOT_FWD ? "bw:" : pathMode[i] == MOT_BACK ? "fw:" : pathMode[i] == MOT_LEFT ? "tr:" : "tl:";
    long left = pathMs[i];
    while (left > 0) { long d = min(left, 5000L); if (d >= 100) { r += op; r += String(d); r += ";"; segs++; } left -= d; }
  }
  Serial.printf("[PATH] ย้อนทาง %d ช่วง: %s\n", pathN, r.c_str());
  pathN = 0; pathSkip = segs;
  cmdQueue = r + cmdQueue.substring(cmdPos); cmdPos = 0;
}

// เข้าหาระยะหนีบ: true = เสร็จขั้นนี้ · ไม่เจอของ = ภารกิจไม่สำเร็จ (หน้างง + ย้อนทาง ถ้าสั่ง failback:1)
void missionFail(const char* why) {
  Serial.printf("[GRIP] ✗ ภารกิจยกไม่สำเร็จ — %s\n", why);
  gAbort(); lastVerify = 0;
  EVENT('n', 'C');
  if (!isExecutingCommand) return;
  progSt = 4;
  if (failBack && pathN > 0) { cmdQueue = ""; cmdPos = 0; pathRetrace(); }   // ย้อนกลับจุดเริ่มแทนคำสั่งที่เหลือ
  else { cmdQueue = cmdQueue.substring(0, cmdPos); }                         // หยุดตรงนี้ รอคำสั่งใหม่
}
// เข้าหาด้วยกล้อง (ก้มหน้า): หมุนให้ของอยู่กลาง → หาระยะจากมุมฐานของ → เดินจนฐานใกล้ขอบล่างภาพ
// → วัดอีกรอบ → เดินช่วงสุดท้าย (ฐานของหลุดใต้ภาพแล้ว เดินตามเวลาที่คำนวณ)
bool gCamApproachStep(unsigned long now) {
  if (motorBusy() || (long)(now - gApproachNext) < 0) return false;
  if (gCamFinal) { Serial.println("[GRIP] กล้อง: เดินช่วงสุดท้ายครบ — ถึงระยะหนีบ (ประมาณจากเรขาคณิต)"); return true; }
  if (!camObjFresh()) { missionFail("กล้องไม่ส่งข้อมูลของ (O)"); return true; }
  if (++gApproachN > 25) { missionFail("เข้าหาระยะหนีบไม่ได้ (กล้อง)"); return true; }
  uint8_t mode = MOT_BACK; long ms = GRIP_STEP_MS;
  if (!camObjSeen() || camObjB >= 96) {                  // ไม่เห็น หรือฐานของหลุดขอบล่าง = ใกล้เกินวัด → ถอยให้เห็นฐาน
    if (++gCamBack > 4) { missionFail("กล้องไม่เห็นของตรงหน้า"); return true; }
    Serial.printf("[GRIP] กล้อง: %s — ถอยนิด\n", camObjSeen() ? "ฐานของหลุดขอบล่าง" : "ไม่เห็นของ");
  } else if (abs(camObjX) > camGX) {
    mode = ((camObjX < 0) == (CAM_X_SIGN_G > 0)) ? MOT_LEFT : MOT_RIGHT; ms = 80;
  } else {
    float tilt = servoToRel(AX_TILT, ax[AX_TILT].pos);
    float down = -tilt + (camObjB / 100.0f - 0.5f) * camGV;           // มุมฐานของใต้แนวนอน
    float downBot = -tilt + camGV * 0.5f;                              // มุมขอบล่างภาพ
    float d = down > 2 ? camGH / tanf(down * DEG_TO_RAD) : 9999;
    float dBot = camGH / tanf(downBot * DEG_TO_RAD);
    float go;
    if (d - dBot > 60) go = min(d - dBot - 30, 400.0f);              // เข้าไปให้ฐานใกล้ขอบล่าง แล้ววัดใหม่
    else { go = d - camGD; gCamFinal = true; }
    Serial.printf("[GRIP] กล้อง: ฐานของ b=%d → ห่าง ~%.0f มม. เดิน %.0f มม.%s\n", camObjB, d, go, gCamFinal ? " (ช่วงสุดท้าย)" : "");
    if (go < 5) { Serial.println("[GRIP] กล้อง: ระยะพอดีแล้ว"); return true; }
    mode = MOT_FWD; ms = (long)(go * 1000.0f / camGS);
  }
  if (mode == MOT_FWD && cliffBlocked()) { missionFail("เจอขอบ เข้าใกล้ไม่ได้"); return true; }
  motorGo(mode, max(ms, 60L));
  gApproachNext = now + max(ms, 60L) + 450;               // รอหยุด + ให้กล้องส่งภาพใหม่
  return false;
}

bool gApproachStep(unsigned long now) {
  if (!vlOnline) return gCamMode ? gCamApproachStep(now) : true;   // ไม่มี VL และไม่มีกล้อง → หนีบตรงนี้เลย
  if (motorBusy() || (long)(now - gApproachNext) < 0) return false;
  int mm = vlMm;
  if (mm < 0 || mm > GRIP_VL_SEE) { missionFail("ไม่เห็นของตรงหน้า"); return true; }
  if (mm >= GRIP_VL_LO && mm <= GRIP_VL_HI) { Serial.printf("[GRIP] ระยะพอดี %d mm\n", mm); return true; }
  if (++gApproachN > 25) { missionFail("เข้าหาระยะหนีบไม่ได้"); return true; }
  bool fwd = mm > GRIP_VL_HI;
  if (fwd && cliffBlocked()) { missionFail("เจอขอบ เข้าใกล้ไม่ได้"); return true; }
  long step = min((long)GRIP_STEP_MS, (long)abs(mm - (GRIP_VL_LO + GRIP_VL_HI) / 2) * 6 + 60);
  motorGo(fwd ? MOT_FWD : MOT_BACK, step);
  gApproachNext = now + step + 250;                       // รอหยุด + ให้ VL วัดใหม่
  return false;
}

void cmdTick() {
  if (!isExecutingCommand) return;
  unsigned long now = millis();
  if (cmdHomeFirst) {                    // กลับท่า R ก่อนเริ่ม (ถือของอยู่ = คืนแค่หัว)
    cmdHomeFirst = false;
    if (!atRestPose()) { setRestPose(!gripHoldingSomething()); cmdWait = CW_AXES; cmdStepStart = now; cmdInStep = true; return; }
  }
  if (cmdInStep) {
    if (!cmdStepDone()) return;
    cmdInStep = false;
    if (cmdPostNormalEyes) { cmdPostNormalEyes = false; drawEyes_Normal(); }
    cmdGapUntil = now + 50;            // เท่า delay(50) ระหว่างคำสั่งเดิม
  }
  if ((long)(now - cmdGapUntil) < 0) return;
  int d = cmdQueue.indexOf(';', cmdPos);
  if (d < 0) { cmdFinish(); return; } // ตัวท้ายที่ไม่มี ; ถูกข้ามเหมือนเดิม
  String c = cmdQueue.substring(cmdPos, d);
  c.trim();
  cmdPos = d + 1;
  cmdWait = CW_NONE;
  cmdPostNormalEyes = false;
  cmdStepStart = now;
  runOneCommand(c);
  cmdInStep = true;
}

// =====================================================================
// IDLE Behaviors — กระพริบ + เหลือบมอง
// =====================================================================
void initIdleTimers() {
  lastBlinkTime = millis();
  nextBlinkInterval = random(1500, 3500);
  nextGlanceTime = millis() + random(4000, 10000);
  nextSighTime = millis() + random(15000, 30000);
  nextHeadLookTime = millis() + random(6000, 15000);
}

// ทดสอบบนสเกตช์ตัวเต็ม โดยคงวิธี fillScreen/fillEllipse เดิมไว้เพื่อวัดก่อนแก้
void startFaceDiagnostic() {
#if USE_TFT
  if (faceDiagnosticActive) return;
  stopMotors();
  inBlinkSequence = false;
  inGlance = false;
  inSigh = false;
  inHeadLook = false;
  blinkPhase = glancePhase = sighPhase = headLookPhase = 0;

  unsigned long now = millis();
  faceDiagnosticRevertRemainingMs = 0;
  if (emoAutoRevertTime != 0) {
    long remaining = (long)(emoAutoRevertTime - now);
    faceDiagnosticRevertRemainingMs = remaining > 0 ? (unsigned long)remaining : 1;
    emoAutoRevertTime = 0;
  }

  Serial.printf("[FACE TEST] width=%d height=%d chip=%s psram=%lu bytes\n",
                tft.width(), tft.height(), ESP.getChipModel(),
                (unsigned long)ESP.getPsramSize());
  // การล้างเพื่อจับเวลานี้นับด้วย จึงเพิ่มรวม 2 ครั้งก่อนเริ่มค้างภาพ
  ++eyeDrawCount;
  unsigned long startedUs = micros();
  tft.fillScreen(TFT_WHITE);
  faceDiagnosticFillUs = micros() - startedUs;
  startedUs = micros();
  drawEyes_Normal();
  faceDiagnosticNormalUs = micros() - startedUs;

  faceDiagnosticHoldDraws = eyeDrawCount;
  faceDiagnosticStartedMs = millis();
  faceDiagnosticActive = true;
  Serial.printf("[FACE TEST] fillScreen_us=%lu drawEyes_Normal_us=%lu draws=%lu hold_ms=%lu\n",
                faceDiagnosticFillUs, faceDiagnosticNormalUs,
                (unsigned long)eyeDrawCount, FACE_DIAGNOSTIC_HOLD_MS);
  Serial.println("[FACE TEST] ค้างหน้า Normal: งดวาดทับ/idle/กล้อง 10 วินาที; /state และหยุดล้อยังใช้ได้");
  Serial.println("[FACE TEST] โปรดดูจอจริง: ตาขึ้นค้างหรือยังขาว ตัวเลขอย่างเดียวบอกภาพจริงไม่ได้");
#else
  Serial.println("[FACE TEST] จอปิดอยู่ (USE_TFT 0)");
#endif
}

void updateFaceDiagnostic() {
  if (!faceDiagnosticActive) return;
  unsigned long heldMs = millis() - faceDiagnosticStartedMs;
  if (heldMs < FACE_DIAGNOSTIC_HOLD_MS) return;

  Serial.printf("[FACE TEST] จบ: held_ms=%lu hold_draw_delta=%lu (ควรเป็น 0)\n",
                heldMs, (unsigned long)(eyeDrawCount - faceDiagnosticHoldDraws));
  faceDiagnosticActive = false;
  // เริ่มรอบ idle ใหม่ ไม่ปล่อยเฟรมเก่าหรือหัวใจที่หมดเวลาระหว่างค้างให้วาดทันที
  initIdleTimers();
  lastHeartbeatTime = millis();
  heartbeatPhase = 0;
  if (faceDiagnosticRevertRemainingMs != 0) {
    emoAutoRevertTime = millis() + faceDiagnosticRevertRemainingMs;
  }
  faceDiagnosticRevertRemainingMs = 0;
  drawEyesForEmotion(currentEmotion);
}

void updateBlink() {
  unsigned long t = millis();

  if (!inBlinkSequence && (t - lastBlinkTime >= nextBlinkInterval)) {
    inBlinkSequence = true;
    blinkPhase = 0;
    blinkPhaseStart = t;
    blinkPatternType = random(0, 5);
    if (blinkPatternType <= 2) blinkPatternType = 0;
    else if (blinkPatternType == 3) blinkPatternType = 1;
    else blinkPatternType = 2;
  }

  if (!inBlinkSequence) return;

  unsigned long e = t - blinkPhaseStart;

  if (blinkPatternType == 0) {
    if (blinkPhase == 0 && e >= 0)  { drawEyes_HalfClosed(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 60) { drawEyes_Closed(); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 80) { drawEyes_HalfClosed(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 60) { drawEyesForEmotion(currentEmotion); inBlinkSequence = false; lastBlinkTime = t; nextBlinkInterval = random(1500, 3500); }
  }
  else if (blinkPatternType == 1) {
    if (blinkPhase == 0 && e >= 0)   { drawEyes_Closed(); blinkPhase = 1; blinkPhaseStart = t; }
    else if (blinkPhase == 1 && e >= 100) { drawEyesForEmotion(currentEmotion); blinkPhase = 2; blinkPhaseStart = t; }
    else if (blinkPhase == 2 && e >= 180) { drawEyes_Closed(); blinkPhase = 3; blinkPhaseStart = t; }
    else if (blinkPhase == 3 && e >= 100) { drawEyesForEmotion(currentEmotion); inBlinkSequence = false; lastBlinkTime = t; nextBlinkInterval = random(2000, 4000); }
  }
  else if (blinkPatternType == 2) {
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
    if (random(0, 2) == 0) drawEyes_LookLeft();
    else drawEyes_LookRight();
    glancePhase = 1;
    glancePhaseStart = t;
  }
  else if (glancePhase == 1 && e >= 500) {
    drawEyesForEmotion(currentEmotion);
    glancePhase = 2;
    glancePhaseStart = t;
  }
  else if (glancePhase == 2 && e >= 200) {
    inGlance = false;
    nextGlanceTime = t + random(4000, 10000);
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
    drawEyes_HalfClosed();
    sighPhase = 1;
    sighPhaseStart = t;
  }
  else if (sighPhase == 1 && e >= 600) {
    drawEyesForEmotion(currentEmotion);
    sighPhase = 2;
    sighPhaseStart = t;
  }
  else if (sighPhase == 2 && e >= 300) {
    inSigh = false;
    nextSighTime = t + random(15000, 30000);
  }
}

// --- Head Look: หันหัวซ้าย-ขวาเบาๆ (ผ่าน servo lerp → PCA9685 CH4) ---
void updateHeadLook() {
  unsigned long t = millis();
  if (camTrkActive) { inHeadLook = false; return; }   // กำลังมองตามหน้าคน — ไม่หันเล่นแย่ง

  if (!inHeadLook && t >= nextHeadLookTime) {
    inHeadLook = true;
    headLookPhase = 0;
    headLookPhaseStart = t;
    headLookTarget = random(83, 98);
  }

  if (!inHeadLook) return;

  unsigned long e = t - headLookPhaseStart;

  if (headLookPhase == 0) {
    moveHead((int)lroundf(headLookTarget));  // ผ่านระบบหัวนุ่ม
    headLookPhase = 1;
    headLookPhaseStart = t;
  }
  else if (headLookPhase == 1 && e >= 2000) {
    moveHead(90);
    headLookPhase = 2;
    headLookPhaseStart = t;
  }
  else if (headLookPhase == 2 && e >= 1500) {
    inHeadLook = false;
    nextHeadLookTime = t + random(4000, 12000);
  }
}

// --- Heartbeat: หัวใจเต้น เฉพาะ Love mode ---
void updateHeartbeat() {
  if (currentEmotion != 'V') return;
  unsigned long t = millis();
  unsigned long e = t - lastHeartbeatTime;
  switch (heartbeatPhase) {
    case 0: if (e >= 800) { drawHeart(2); heartbeatPhase = 1; lastHeartbeatTime = t; } break;
    case 1: if (e >= 150) { drawHeart(1); heartbeatPhase = 2; lastHeartbeatTime = t; } break;
    case 2: if (e >= 150) { drawHeart(2); heartbeatPhase = 3; lastHeartbeatTime = t; } break;
    case 3: if (e >= 150) { drawHeart(1); heartbeatPhase = 0; lastHeartbeatTime = t; } break;
  }
}

// ท่าไอเดิล (#501): ว่างเกิน 15–30 วิ (ไม่มีคิว ไม่เดิน ไม่หนีบ ไม่มีท่าอื่น หน้าปกติ) → สุ่ม 1 ใน 5 ท่า
//   ไม่หมุนล้อเด็ดขาด · ทุกท่าจบที่ท่าพัก R · มีคำสั่งเข้า = หยุดท่าทันทีแล้วกลับ R ก่อนเริ่ม (ดู cmdTick)
extern bool calibMode;
extern bool trHolding;
unsigned long idleGapMs = 20000;
bool idlePlaying = false;
bool idleOn = true;
bool idleHeadOnly = false;   // #565 หลังรันโค้ดจบ (อาจมีของวางข้างตัว) ไอเดิลใช้แค่หัว+หน้า จนสั่ง home; หรือรีบูต
void setIdleOn(bool on) {
  idleOn = on;
  if (!on && idlePlaying) { emoStop(); idlePlaying = false; setRestPose(!gripHoldingSomething()); drawEyesForEmotion(currentEmotion); }
  lastActivityMs = millis();
}
void idleTick() {
  if (!idleOn) return;
  unsigned long now = millis();
  if (idlePlaying && !emoBusy()) idlePlaying = false;
  bool quiet = !isExecutingCommand && !gActive && !emoBusy() && !trHolding && !motorBusy() &&
               !gripHoldingSomething() && currentEmotion == 'N' && !calibMode && !faceDiagnosticActive;
  if (!quiet) { if (!idlePlaying) lastActivityMs = max(lastActivityMs, now - idleGapMs / 2); return; }
  if (now - lastActivityMs < idleGapMs) return;
  bool frontBusy = vlOnline && vlMm > 0 && vlMm < 250;   // มีของตรงหน้า → ไอเดิลแค่หัว+หน้า (#519)
  idlePlaying = emoPlaySet((frontBusy || idleHeadOnly) ? 'j' : 'i', true);
  idleGapMs = random(15000, 30000);
  lastActivityMs = now;
}

void updateIdleBehaviors() {
  if (isExecutingCommand || faceDiagnosticActive) return;

#if USE_TFT
  if (currentEmotion == 'V' && !inBlinkSequence) {
    updateHeartbeat();
    return;
  }

  if (inBlinkSequence) { updateBlink(); return; }
  if (inGlance) { updateGlance(); return; }
  if (inSigh) { updateSigh(); return; }
#endif
  if (inHeadLook) { updateHeadLook(); return; }

#if USE_TFT
  updateBlink();
  if (!inBlinkSequence) updateGlance();
  if (!inGlance) updateSigh();
  if (!inSigh) updateHeadLook();
#else
  // จอปิด → เหลือแต่ท่าหัว ไม่ต้องกระพริบตา
  updateHeadLook();
#endif
}

// =====================================================================
// VL53L0X — รู้ว่ายกของหรือปล่อยของแล้ว (สเปกวันศุกร์ข้อ 5)
// =====================================================================
// เซนเซอร์อยู่ชั้น 1 มองของบนพื้นตรงหน้า:
//   ไม่มีของ ─(ใกล้กว่า vlNearMm 3 ครั้ง)→ เจอของ
//   เจอของ  ─(ระยะกระโดดไกลขึ้น ≥ vlJumpMm หรือหาย 3 ครั้ง + มือหนีบอยู่/แขนยกขึ้น ≥10°)→ ยกอยู่
//           ─(กระโดดไกลแต่ไม่ได้หนีบ/ยก)→ ไม่มีของ (ของถูกเอาออก/หุ่นถอย)
//   ยกอยู่  ─(เห็นของใกล้อีก 3 ครั้ง = วางลงแล้ว)→ วางแล้ว (= ปล่อยแล้ว)
//   วางแล้ว ทำตัวเหมือน "เจอของ" ยกใหม่ได้ · ของหายไปนาน → ไม่มีของ
// ไม่ต่อเซนเซอร์ (ตอนนี้ยังไม่มีของ กำลังซื้อใหม่): บูตต่อได้ ลองหาใหม่ทุก 3 วิ ไม่ค้าง
// อ่านแบบไม่บล็อก: เช็กบิตข้อมูลพร้อมก่อน แล้วค่อยอ่านค่า
// =====================================================================
#if USE_VL53
VL53L0X vl;
#endif
unsigned long vlProbeMs = 0, vlLastDataMs = 0, vlPollMs = 0;
uint8_t vlNearCnt = 0, vlFarCnt = 0, vlGoneCnt = 0;
int   vlSeenMm = 9999;
float vlSeenLift = 0;

float armLiftMaxNow() {
  return max(servoToRel(AX_ARM_L, ax[AX_ARM_L].pos), servoToRel(AX_ARM_R, ax[AX_ARM_R].pos));
}
bool gripClosedAny() { return handPctNow(0) >= 50.0f || handPctNow(1) >= 50.0f; }

const char* objName(uint8_t s) {
  switch (s) { case OBJ_SEEN: return "เจอของ"; case OBJ_HOLD: return "ยกอยู่";
               case OBJ_PLACED: return "วางแล้ว"; default: return "ไม่มีของ"; }
}

void vlGoOffline(const char* why) {
  vlOnline = false; vlMm = -1;
  objSt = OBJ_NONE; holding = false;
  vlNearCnt = vlFarCnt = vlGoneCnt = 0;
  Serial.printf("[VL53] ออฟไลน์ — %s (จะลองหาใหม่ทุก 3 วิ)\n", why);
}

bool vlTryInit() {
#if USE_VL53
  Wire.beginTransmission(VL_ADDR);
  if (Wire.endTransmission() != 0) return false;      // ไม่มีเซนเซอร์ ตอบกลับเร็ว ไม่ค้าง
  vl.setBus(&Wire);
  vl.setTimeout(50);
  if (!vl.init()) { Serial.println("[VL53] เจอที่ 0x29 แต่เริ่มไม่สำเร็จ"); return false; }
  vl.startContinuous(50);                              // วัดเองทุก 50 ms
  vlOnline = true;
  vlLastDataMs = millis();
  vlNearCnt = vlFarCnt = vlGoneCnt = 0;
  objSt = OBJ_NONE; holding = false;
  Serial.println("[VL53] พร้อม — วัดต่อเนื่องทุก 50 ms");
  return true;
#else
  return false;
#endif
}

void vlObjUpdate(int mm) {
  bool nearObj = mm <= (int)cfg.vlNearMm;
  switch (objSt) {
    case OBJ_NONE:
      if (nearObj) {
        if (++vlNearCnt >= 3) {
          objSt = OBJ_SEEN; vlSeenMm = mm; vlSeenLift = armLiftMaxNow();
          vlFarCnt = vlGoneCnt = 0;
          Serial.printf("[OBJ] เจอของตรงหน้า %d mm\n", mm);
        }
      } else vlNearCnt = 0;
      break;

    case OBJ_SEEN:
    case OBJ_PLACED:
      if (nearObj) {
        vlGoneCnt = 0;
        if (mm < vlSeenMm) vlSeenMm = mm;
      } else if (++vlGoneCnt >= 20) {                  // ไม่ใกล้นาน 1 วิ = ไม่มีของแล้ว
        objSt = OBJ_NONE; vlNearCnt = vlFarCnt = vlGoneCnt = 0;
        Serial.println("[OBJ] ไม่มีของตรงหน้าแล้ว");
        break;
      }
      if (mm >= vlSeenMm + (int)cfg.vlJumpMm) {
        if (++vlFarCnt >= 3) {
          vlFarCnt = 0; vlNearCnt = 0; vlGoneCnt = 0;
          if (gripClosedAny() || armLiftMaxNow() >= vlSeenLift + 10.0f) {
            objSt = OBJ_HOLD; holding = true;
            Serial.printf("[OBJ] ✓ ยกแล้ว — ระยะกระโดดจาก %d เป็น %d mm\n", vlSeenMm, mm);
          } else {
            objSt = OBJ_NONE;
            Serial.println("[OBJ] ของหายจากหน้าเซนเซอร์ แต่มือไม่ได้หนีบ/แขนไม่ได้ยก — ไม่นับว่ายก");
          }
        }
      } else vlFarCnt = 0;
      break;

    case OBJ_HOLD:
      if (nearObj) {
        if (++vlNearCnt >= 3) {
          objSt = OBJ_PLACED; holding = false; vlSeenMm = mm; vlSeenLift = armLiftMaxNow();
          vlFarCnt = vlGoneCnt = 0;
          Serial.printf("[OBJ] ✓ วางลงแล้ว เห็นของอีกครั้งที่ %d mm = ปล่อยแล้ว\n", mm);
        }
      } else vlNearCnt = 0;
      break;
  }
}

void vlTick() {
#if USE_VL53
  unsigned long now = millis();
  if (!vlOnline) {
    if (now - vlProbeMs >= 3000) { vlProbeMs = now; vlTryInit(); }
    return;
  }
  if (now - vlPollMs < 15) return;
  vlPollMs = now;
  uint8_t st = vl.readReg(VL53L0X::RESULT_INTERRUPT_STATUS);
  if (vl.last_status != 0 || (st & 0x07) == 0) {
    if (now - vlLastDataMs > 1000) vlGoOffline("ไม่มีข้อมูลเกิน 1 วิ");
    return;
  }
  uint16_t mm = vl.readRangeContinuousMillimeters();  // ข้อมูลพร้อมแล้ว อ่านทันทีไม่ต้องรอ
  if (vl.timeoutOccurred()) return;
  vlLastDataMs = now;
  int v = (mm >= VL_NO_TARGET) ? VL_NO_TARGET : (int)mm;
  vlMm = v;
  vlObjUpdate(v);
#endif
}

// =====================================================================
// MPR121 — แผ่นทองแดงบนหัว 3 แผ่น (ใต้ผิวบนหัว 0.6–0.8 มม.) + ท่าดีใจตามตำแหน่งที่แตะ (#495)
// =====================================================================
// สาย: VCC 3V3 · GND · SDA 21 · SCL 22 · ADDR ไม่ต่อ (0x5A) · IRQ ไม่ใช้ (อ่านเองทุก 20 ms)
// แผ่นเดียวต่อ E0 (#499) — รู้แค่ว่าแตะ/ไม่แตะ ไม่รู้ตำแหน่ง → แตะทีละครั้งเอียงสลับซ้าย/ขวาให้ดูมีชีวิต
//   (ถ้าวันหลังตัด 3 แถบ: ตั้ง MPR_NPAD 3 · E0 ซ้าย E1 กลาง E2 ขวา มองจากหลังหุ่น)
// เขียนรีจิสเตอร์ตรง ไม่ต้องลงไลบรารีเพิ่ม · เปิด autoconfig ให้ชิปหาค่ากระแส/เวลาชาร์จเอง
// เหตุการณ์ (/state "touchEvt"): 1 = แตะ (ปล่อยใน 600 ms) · 2 = แตะสองที (ซ้ำใน 400 ms) · 3 = กดค้าง/ลูบ (> 1 วิ)
// ตำแหน่ง (/state "touchPos"): 0 = ซ้าย · 1 = กลาง · 2 = ขวา · แตะหลายแผ่นพร้อมกัน = กลาง
// ท่าตอบสนอง (หัวมีแค่ หัน + ก้มเงย ไม่มีแกนเอียงข้าง → "เอียง" = หันไปทางนั้น + ก้มนิดเหมือนเอียงหัวคลอเคลียมือ):
//   แตะ         : หันเอียงไปข้างหนึ่ง 28° ดุ๊กดิ๊ก 2 ที ก้มคลอเคลีย 4° แล้วกลับ (ครั้งต่อไปสลับข้าง)
//   (3 แผ่น: แตะซ้าย/ขวา = เอียงไปทางที่แตะ · แตะกลาง = เงย 6° ส่ายหัว ±12° 2 รอบ)
//   แตะสองที    : ดุ๊กดิ๊กแรงขึ้น ±16° 3 รอบ (ดีใจมาก)
//   กดค้าง/ลูบ  : โยกหัวช้า ๆ ซ้าย–ขวา ±12° จนกว่าจะปล่อย
//   ตาเปลี่ยนเป็นดีใจ 'H' ระหว่างท่า แล้วกลับปกติเอง · ไม่ขยับแขน
//   ทุกเป้าผ่าน axTrySet (interlock เดียวกับคำสั่งอื่น) · ไม่ทำท่าถ้ากำลังรันคิวคำสั่ง/หนีบของ
// =====================================================================
#define MPR_ADDR     0x5A
#define MPR_TOUCH_TH 12      // เกณฑ์แตะ (ยิ่งน้อยยิ่งไว) — จูนผ่าน Serial "!tt <ค่า>" ไม่เก็บถาวร
#define MPR_REL_TH   6       // เกณฑ์ปล่อย
#define MPR_NPAD     1       // #499 แผ่นเดียว (E0) · ใส่ 3 = แยก ซ้าย E0 / กลาง E1 / ขวา E2 ได้ ถ้าวันหลังตัดทองแดงเป็น 3 แถบ
uint8_t mprTouchTh = MPR_TOUCH_TH;
bool    touchOnline = false, touchNow = false, touchHoldSent = false;
uint8_t touchEvt = 0, touchPos = 1, touchMask = 0, touchTapPending = 0, touchFail = 0;
unsigned long touchProbeMs = 0, touchPollMs = 0, touchDownMs = 0, touchUpMs = 0, touchCount = 0;
int     touchFilt[3] = { -1, -1, -1 }, touchBase[3] = { -1, -1, -1 };
int8_t  touchAltSide = 1;    // แผ่นเดียวรู้ตำแหน่งไม่ได้ → แตะครั้งละ เอียงสลับ ซ้าย/ขวา

bool mprWrite(uint8_t reg, uint8_t v) {
  Wire.beginTransmission(MPR_ADDR); Wire.write(reg); Wire.write(v);
  return Wire.endTransmission() == 0;
}
bool mprRead(uint8_t reg, uint8_t* buf, uint8_t n) {
  Wire.beginTransmission(MPR_ADDR); Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)MPR_ADDR, (int)n) != n) return false;
  for (uint8_t i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}
void mprSetThresholds() {
  for (int e = 0; e < MPR_NPAD; e++) { mprWrite(0x41 + 2 * e, mprTouchTh); mprWrite(0x42 + 2 * e, MPR_REL_TH); }
}

// ---------- ท่าดีใจ: ลำดับเป้า (หัน, ก้มเงย) เทียบท่าก่อนแตะ · หัน + = ซ้ายของหุ่น · ก้มเงย + = เงย ----------
// ท่าแตะหัว TOUCH_1..5 / TOUCH_DBL อยู่ใน meto_emotes.h · ลูบค้าง = โยกหัวซ้าย–ขวาช้า ๆ จนปล่อย
bool trHolding = false;
unsigned long trStepMs = 0;
void trFace() {
  currentEmotion = 'H'; emoChangeTime = millis();
  drawEyesForEmotion('H');                                // ตาดีใจ ไม่เรียกท่าแขนของอารมณ์ H
}
bool trAllowed() { return !isExecutingCommand && !gActive && !gripHoldingSomething(); }
void trCancel() { trHolding = false; }
void trHoldStart() {
  if (!trAllowed()) return;
  emoStop(); trHolding = true; trStepMs = 0; trFace();
}
void trHoldEnd() {
  if (!trHolding) return;
  trHolding = false; setRestPose(true);
  emoAutoRevertTime = millis() + 1500;
}
void touchReactTick() {
  if (!trHolding) return;
  unsigned long now = millis();
  if (now - trStepMs >= 600) {                           // โยก ±12° ทุก 0.6 วิ
    static bool sw = false; sw = !sw; trStepMs = now; lastActivityMs = now;
    axTrySet(AX_TILT, 2, false); axTrySet(AX_YAW, sw ? 12 : -12, false);
  }
}

void onHeadTouch(uint8_t evt) {
  const char* nm = evt == 1 ? "แตะ" : evt == 2 ? "แตะสองที" : evt == 3 ? "กดค้าง/ลูบ" : "ลูบหัว (กล้องเห็นมือ)";
  Serial.printf("[TOUCH] %s (ครั้งที่ %lu)\n", nm, touchCount);
  lastActivityMs = millis();
  if (!trAllowed()) { Serial.println("[TOUCH] กำลังทำงานอื่นอยู่ — ไม่ทำท่าดีใจ"); return; }
  if (evt == 3) { trHoldStart(); return; }
  trCancel(); trFace();
  if (evt == 2) EMO_PLAY(TOUCH_DBL, true);
  else emoPlaySet('t', true);                            // สุ่ม 1 ใน 5 ท่า
  emoAutoRevertTime = millis() + 3000;
}

bool touchTryInit() {
#if USE_TOUCH
  Wire.beginTransmission(MPR_ADDR);
  if (Wire.endTransmission() != 0) return false;        // ไม่มีชิป ตอบกลับเร็ว ไม่ค้าง
  mprWrite(0x80, 0x63);                                 // soft reset
  delay(2);
  mprWrite(0x5E, 0x00);                                 // หยุดวัดก่อนตั้งค่า
  uint8_t c2 = 0;
  if (!mprRead(0x5D, &c2, 1) || c2 != 0x24) {
    Serial.printf("[TOUCH] เจอที่ 0x5A แต่ค่าหลังรีเซ็ตไม่ใช่ MPR121 (0x%02X)\n", c2); return false;
  }
  mprSetThresholds();
  static const uint8_t REGS[][2] = {
    {0x2B,0x01},{0x2C,0x01},{0x2D,0x0E},{0x2E,0x00},     // ฟิลเตอร์ฐาน ขาขึ้น (ค่าตามเอกสารผู้ผลิต)
    {0x2F,0x01},{0x30,0x05},{0x31,0x01},{0x32,0x00},     // ขาลง
    {0x33,0x00},{0x34,0x00},{0x35,0x00},                 // ค้าง
    {0x5B,0x11},                                         // debounce แตะ 1 ปล่อย 1
    {0x5C,0x10},{0x5D,0x20},
    {0x7D,0xC9},{0x7E,0x83},{0x7F,0xB5},                 // autoconfig ที่ 3.3 V (USL LSL TL)
    {0x7B,0x0B} };
  for (auto& r : REGS) mprWrite(r[0], r[1]);
  if (!mprWrite(0x5E, 0x80 | MPR_NPAD)) return false;  // เริ่มวัดเฉพาะขาที่ใช้
  touchOnline = true; touchFail = 0; touchNow = false; touchTapPending = 0; touchHoldSent = false;
  Serial.printf("[TOUCH] MPR121 พร้อม — ทองแดงหัว %d แผ่น · เกณฑ์แตะ %u ปล่อย %u\n", MPR_NPAD, mprTouchTh, MPR_REL_TH);
  return true;
#else
  return false;
#endif
}

uint8_t touchPosOf(uint8_t m) {
  if (MPR_NPAD == 1) return 1;                         // แผ่นเดียว = กลางเสมอ
  if (m == 0x01) return 0;
  if (m == 0x04) return 2;
  return 1;                                             // กลาง หรือหลายแผ่นพร้อมกัน
}

void touchTick() {
#if USE_TOUCH
  touchReactTick();
  unsigned long now = millis();
  if (!touchOnline) {
    if (now - touchProbeMs >= 3000) { touchProbeMs = now; touchTryInit(); }
    return;
  }
  // แตะครั้งเดียวที่รอดูว่าจะมีครั้งที่สองไหม — เกิน 400 ms = แตะ
  if (touchTapPending && !touchNow && now - touchUpMs > 400) {
    touchTapPending = 0; touchEvt = 1; touchCount++; onHeadTouch(1);
  }
  if (now - touchPollMs < 20) return;
  touchPollMs = now;
  uint8_t b[2], f[2 * MPR_NPAD], base[MPR_NPAD];
  if (!mprRead(0x00, b, 2) || !mprRead(0x04, f, 2 * MPR_NPAD) || !mprRead(0x1E, base, MPR_NPAD)) {
    if (++touchFail >= 5) {
      touchOnline = false; touchNow = false; trHoldEnd();
      Serial.println("[TOUCH] MPR121 หลุด (อ่านไม่ได้ 5 ครั้ง) — จะลองหาใหม่ทุก 3 วิ");
    }
    return;
  }
  touchFail = 0;
  for (int e = 0; e < MPR_NPAD; e++) { touchFilt[e] = f[2 * e] | ((f[2 * e + 1] & 0x03) << 8); touchBase[e] = (int)base[e] << 2; }
  if (b[1] & 0x80) {                                     // OVCF กระแสเกิน — เริ่มใหม่
    Serial.println("[TOUCH] MPR121 แจ้งกระแสเกิน — เริ่มใหม่"); touchOnline = false; trHoldEnd(); return;
  }
  uint8_t m = b[0] & ((1 << MPR_NPAD) - 1);
  touchMask = m;
  bool t = m != 0;
  if (t && !touchNow) { touchNow = true; touchDownMs = now; touchHoldSent = false; touchPos = touchPosOf(m); }
  else if (t && touchNow) {
    if (MPR_NPAD == 1 || (m != 0x01 && m != 0x04)) touchPos = 1; else if (now - touchDownMs < 150) touchPos = touchPosOf(m);
    if (!touchHoldSent && now - touchDownMs >= 1000) {
      touchHoldSent = true; touchTapPending = 0; touchEvt = 3; touchCount++; onHeadTouch(3);
    }
  } else if (!t && touchNow) {
    touchNow = false; touchUpMs = now;
    if (touchHoldSent) trHoldEnd();
    else if (now - touchDownMs < 600) {
      if (touchTapPending) { touchTapPending = 0; touchEvt = 2; touchCount++; onHeadTouch(2); }
      else touchTapPending = 1;
    }
  }
#endif
}

// =====================================================================
// กล้อง (สเปกวันศุกร์ข้อ 7) — โปรโตคอลเดิม UART 9600 ตัวอักษร L C R H S A N X
//   อ่านทุกตัวที่ค้างใน buffer ทุกรอบ (ไม่ตกหล่นระหว่างรันคำสั่ง) แต่จะทำตามเฉพาะตอนว่าง
//   หันหัวผ่าน moveHead() = ระบบหัวนุ่มตัวเดียวกับปุ่ม 7 8 9
//   ไม่มีข้อมูลเกิน 5 วิ = กล้องหลุด → บอกทาง Serial + /state camOk=0 แล้วหันหัวกลับกลาง
// =====================================================================
// ---------- กล้องติดตามหน้า + เขิน (#530 "หันมองตามแล้วซึน ๆ เขิน") ----------
// โปรโตคอลใหม่ (FullCam v8): บรรทัด "F<x>,<y>,<w>\n" ~10 Hz เฉพาะตอนเห็นหน้า
//   x,y = −100..100 กลางหน้าเทียบกลางภาพ (x ลบ = ซ้ายภาพ, y ลบ = บนภาพ) · w = กว้างหน้า % ของภาพ
//   รับทั้งของเดิม (ตัวเดียว) และของใหม่ · เคยเห็นบรรทัด F แล้ว = เลิกใช้ L/C/R หันหัว 3 จุด
// กล้องติดบนหัว หันตามหัว → ติดตามแบบเทียบ: หันหัวให้หน้าเข้ากลางภาพ (เป้า = มุมหัวตอนนี้ + KP × มุมที่คลาด)
// ⚠️ ค่าด้านล่างเป็นค่าตั้งต้นจากการคำนวณ ยังไม่ได้ลองกับหุ่นจริง (ดูหัวข้อ "ต้องจูนกับหุ่นจริง" ในรายงาน)
#define CAM_HFOV_DEG     50.0f   // มุมมองแนวนอนของภาพ 240×240 (ประมาณ — วัดจริงแล้วแก้)
#define CAM_VFOV_DEG     50.0f   // มุมมองแนวตั้ง
#define CAM_X_SIGN       1       // หน้าอยู่ซ้ายภาพ → หัวหันซ้ายหุ่น (+) · ถ้าหันหนีหน้า ตั้ง −1 (ภาพกลับด้าน)
#define CAM_Y_SIGN       1       // หน้าอยู่บนภาพ → เงย (+) · ถ้าก้มหนี ตั้ง −1
#define TRK_KP           0.45f   // แก้มุมคลาดกี่ส่วนต่อ 1 ภาพ (มากไป = หัวส่ายเลยเป้า)
#define TRK_EMA          0.5f    // กรองตำแหน่งหน้า (1 = ไม่กรอง)
#define TRK_DEAD_X       8       // |x| ≤ 8 (≈2°) ถือว่ากลางแล้ว ไม่หัน
#define TRK_DEAD_Y       14      // |y| ≤ 14 (≈3.5°) ไม่ก้มเงย
#define TRK_STEP_YAW     6.0f    // หันได้ไม่เกิน 6° ต่อภาพ (~60°/วิ ที่ 10 ภาพ/วิ) + ความนุ่มของ axesUpdate
#define TRK_STEP_TILT    1.5f    // ก้มเงยไม่เกิน 1.5° ต่อภาพ
#define TRK_YAW_LIM      60.0f   // หันตามไม่เกิน ±60°
#define TRK_TILT_LIM     8.0f    // ก้มเงยตามไม่เกิน ±8° (แกนจริง ±10)
#define TRK_MIN_W        5       // หน้าเล็กกว่า 5% ของภาพ (ไกลมาก/จับผิด) ไม่สนใจ
#define TRK_HOLD_MS      500     // ไม่มีบรรทัด F เกินนี้ = ตอนนี้ไม่เห็นหน้า (หัวค้างรอ)
#define TRK_LOST_MS      3000    // ไม่เห็นหน้าเกิน 3 วิ = คนไปแล้ว → หัวกลับท่าพัก ไอเดิลกลับมาเล่นได้
#define SHY_EYE_X        30      // "สบตา" = หน้าอยู่กลางภาพ |x| ≤ 30, |y| ≤ 40 และหน้ากว้าง ≥ 8%
#define SHY_EYE_Y        40
#define SHY_EYE_W        8
#define SHY_GAP_MS       600     // หลุดกลางภาพเกินนี้ = เริ่มนับสบตาใหม่
#define SHY_AFTER_MIN    2000    // สบตานิ่ง 2–3 วิ (สุ่ม) → เขิน
#define SHY_AFTER_MAX    3000
#define SHY_COOL_MIN     8000    // เขินแล้วพัก 8–15 วิ (ยังมองตามอยู่) ก่อนเขินรอบใหม่
#define SHY_COOL_MAX     15000

int faceX = 0, faceY = 0, faceW = 0;             // ค่าล่าสุด (กรองแล้ว) — /state faceX
float faceXf = 0, faceYf = 0;
unsigned long faceLastMs = 0;                    // บรรทัด F ล่าสุดที่ใช้ได้
bool faceFresh = false;                          // มีภาพใหม่ยังไม่ได้ใช้หันหัว
bool camNewProto = false;                        // เคยเห็นบรรทัด F = กล้อง v8
uint32_t shyN = 0;                               // จำนวนครั้งที่เขิน — /state shyN
bool shyPlaying = false;
unsigned long eyeStartMs = 0, eyeLastOkMs = 0, shyNeedMs = 2500, shyCoolUntil = 0;
char camLine[24]; int camLineLen = -1;           // −1 = ไม่ได้อยู่ในบรรทัด F/O
bool camLineO = false;                           // บรรทัดปัจจุบันเป็น O (ของตรงหน้า)

bool faceSeenNow() { return faceLastMs != 0 && millis() - faceLastMs < TRK_HOLD_MS; }

void camParseF() {
  camLine[camLineLen] = 0;
  int x, y, w;
  if (sscanf(camLine, "%d,%d,%d", &x, &y, &w) != 3) return;
  if (x < -100 || x > 100 || y < -100 || y > 100 || w < 0 || w > 100) return;
  camNewProto = true;
  if (w < TRK_MIN_W) return;
  unsigned long now = millis();
  bool fresh = !faceSeenNow();                   // เพิ่งเห็นใหม่ = ไม่กรองกับค่าเก่า
  faceXf = fresh ? x : faceXf + TRK_EMA * (x - faceXf);
  faceYf = fresh ? y : faceYf + TRK_EMA * (y - faceYf);
  faceX = (int)lroundf(faceXf); faceY = (int)lroundf(faceYf); faceW = w;
  if (fresh) Serial.printf("[TRK] เห็นหน้า x=%d y=%d w=%d%%\n", x, y, w);
  faceLastMs = now; faceFresh = true;
}

// เริ่มท่าเขิน 's' (มุมเทียบทิศหน้าคน) · หันหลบไปทางด้านหน้าตัวหุ่น
void shyStart() {
  emoBaseYaw  = servoToRel(AX_YAW, ax[AX_YAW].pos);
  emoBaseTilt = servoToRel(AX_TILT, ax[AX_TILT].pos);
  bool flip = (emoBaseYaw > 10) ? true : (emoBaseYaw < -10) ? false : (random(2) == 1);
  bool arms = !gripHoldingSomething();           // ถือของอยู่ = หัว+หน้าเท่านั้น
  trCancel();
  if (!emoPlaySet('s', arms)) return;
  emoRel = true; emoRelFlip = flip;              // emoStart ล้างค่า → ตั้งหลังเรียก
  shyPlaying = true; shyN++; eyeStartMs = 0;
  Serial.printf("[TRK] สบตานานแล้ว — เขิน (ครั้งที่ %lu) หลบไปทาง%s%s\n", (unsigned long)shyN,
                flip ? "ขวา" : "ซ้าย", arms ? "" : " · ถือของอยู่ ไม่ขยับแขน");
}

// ทุกรอบ loop หลัง camTick: หันตามหน้า + นับสบตา + เขิน + คนไปแล้วกลับท่าพัก
void camTrackTick(bool act) {
#if USE_CAMERA
  unsigned long now = millis();
  bool seen = faceSeenNow();
  if (shyPlaying && !emoBusy()) {                // ท่าเขินจบ → คืนหน้าอารมณ์ปัจจุบัน + เริ่มพัก
    shyPlaying = false;
    drawEyesForEmotion(currentEmotion);
    shyCoolUntil = now + random(SHY_COOL_MIN, SHY_COOL_MAX + 1);
    eyeStartMs = 0;
  }
  bool allowed = act && !isExecutingCommand && !gActive && !trHolding && !calibMode && !faceDiagnosticActive;
  if (!allowed) { faceFresh = false; eyeStartMs = 0; if (!shyPlaying) camTrkActive = false; return; }
  if (!seen) eyeStartMs = 0;

  if (seen) {
    lastActivityMs = now;                        // มีคนอยู่ตรงหน้า = ไม่เล่นไอเดิล
    if (idlePlaying) {                           // กำลังเล่นไอเดิลแล้วมีคนมา → หยุด หันมองคน
      emoStop(); idlePlaying = false;
      setRestPose(!gripHoldingSomething());
      drawEyesForEmotion(currentEmotion);
    }
    camTrkActive = true;
  } else if (camTrkActive && !emoBusy() && now - faceLastMs > TRK_LOST_MS) {
    camTrkActive = false;
    axTrySet(AX_TILT, 0, false); axTrySet(AX_YAW, 0, false);
    lastActivityMs = now;
    Serial.println("[TRK] ไม่เห็นหน้าเกิน 3 วิ → หัวกลับท่าพัก");
    return;
  }
  if (emoBusy() || !faceFresh) return;           // ท่าอื่น/ท่าเขินกำลังเล่น หรือยังไม่มีภาพใหม่
  faceFresh = false;

  // หันตาม (เทียบตำแหน่งหัวจริงตอนนี้ เพราะกล้องหันไปกับหัว)
  if (abs(faceX) > TRK_DEAD_X) {
    float err = -CAM_X_SIGN * faceXf / 100.0f * (CAM_HFOV_DEG / 2);    // หน้าอยู่ซ้ายภาพ (x<0) → + (ซ้ายหุ่น)
    float yawNow = servoToRel(AX_YAW, ax[AX_YAW].pos);
    float step = constrain(TRK_KP * err, -TRK_STEP_YAW, TRK_STEP_YAW);
    axTrySet(AX_YAW, constrain(yawNow + step, -TRK_YAW_LIM, TRK_YAW_LIM), false);
  }
  if (abs(faceY) > TRK_DEAD_Y && !tiltDuck) {
    float err = -CAM_Y_SIGN * faceYf / 100.0f * (CAM_VFOV_DEG / 2);    // หน้าอยู่บนภาพ (y<0) → เงย (+)
    float tiltNow = servoToRel(AX_TILT, ax[AX_TILT].pos);
    float step = constrain(TRK_KP * err, -TRK_STEP_TILT, TRK_STEP_TILT);
    axTrySet(AX_TILT, constrain(tiltNow + step, -TRK_TILT_LIM, TRK_TILT_LIM), false);
  }

  // นับสบตา → เขิน (หน้าปกติหรือยิ้มอยู่เท่านั้น)
  bool eye = abs(faceX) <= SHY_EYE_X && abs(faceY) <= SHY_EYE_Y && faceW >= SHY_EYE_W;
  if (eye) {
    if (!eyeStartMs) { eyeStartMs = now; shyNeedMs = random(SHY_AFTER_MIN, SHY_AFTER_MAX + 1); }
    eyeLastOkMs = now;
  } else if (eyeStartMs && now - eyeLastOkMs > SHY_GAP_MS) eyeStartMs = 0;
  if (eyeStartMs && now - eyeStartMs >= shyNeedMs && (long)(now - shyCoolUntil) >= 0 &&
      (currentEmotion == 'N' || currentEmotion == 'H')) shyStart();
#else
  (void)act;
#endif
}

void camHandle(char cam) {
  switch (cam) {
    case 'L': if (!camNewProto) moveHead(130); break;   // กล้อง v8 ส่ง F แล้ว — ใช้ตัวติดตามแทน
    case 'C': if (!camNewProto) moveHead(90);  break;
    case 'R': if (!camNewProto) moveHead(50);  break;
    case 'H': requestEmotionChange('H'); break;
    case 'S': requestEmotionChange('S'); break;
    case 'A': requestEmotionChange('A'); break;
    case 'N':
      if (camTrkActive) {                        // กำลังมองตามคน: เปลี่ยนแค่หน้า ไม่ดึงหัวกลับท่าพัก
        if (currentEmotion != 'N' && millis() - emoChangeTime >= EMO_HOLD_MS && !emoBusy()) {
          currentEmotion = 'N'; emoChangeTime = millis(); drawEyesForEmotion('N');
        }
      } else requestEmotionChange('N');
      break;
    case 'X': requestEmotionChange('N'); if (!camNewProto) moveHead(90); break;
  }
}

// FullCam v10 "O<x>,<y>,<a>,<b>" — ของตรงหน้า (ใช้ตอนหนีบแทน VL53)
void camParseO() {
  camLine[camLineLen] = 0;
  int x, y, a, b;
  if (sscanf(camLine, "%d,%d,%d,%d", &x, &y, &a, &b) != 4) return;
  camObjX = x; camObjY = y; camObjA = a; camObjB = b; camObjMs = millis();
}

// FullCam v10 'P' — กล้องเห็นมือเข้ามาใกล้แล้วเอื้อมขึ้นเหนือหัว = ลูบหัว (ใช้แทนทองแดงเมื่อ MPR121 ออฟไลน์)
void camPet() {
  unsigned long now = millis();
  const char* why = touchOnline ? "มีทองแดงหัวอยู่ ใช้ทองแดงแทน" :
                    (now - camHeadMoveMs < 700) ? "หัวเพิ่งขยับ ภาพไหวเอง" :
                    (camPetMs && now - camPetMs < 2500) ? "เพิ่งลูบไป" : nullptr;
  if (why) { Serial.printf("[CAM] P ลูบหัว — ข้าม (%s)\n", why); return; }
  camPetMs = now; touchEvt = 3; touchCount++; onHeadTouch(4);
}

void camTick(bool act) {
#if USE_CAMERA
  unsigned long now = millis();
  if (axMoving(AX_YAW) || axMoving(AX_TILT)) camHeadMoveMs = now;
  for (int n = 0; n < 128 && Serial2.available() > 0; n++) {
    char c = (char)Serial2.read();
    if (camLineLen >= 0) {                       // อยู่ในบรรทัด F หรือ O
      if (c == '\n' || c == '\r') {
        if (camLineLen > 0) { if (camLineO) camParseO(); else camParseF(); }
        camLineLen = -1; camLastMs = now;
        if (!camOk) { camOk = true; Serial.println("[CAM] รับข้อมูลกล้องได้ (บรรทัด F)"); }
        continue;
      }
      if (((c >= '0' && c <= '9') || c == '-' || c == ',') && camLineLen < (int)sizeof(camLine) - 1) {
        camLine[camLineLen++] = c; continue;
      }
      camLineLen = -1;                           // บรรทัดเสีย → ทิ้ง แล้วอ่านตัวนี้แบบปกติ
    }
    if (c == 'F' || c == 'O') { camLineLen = 0; camLineO = (c == 'O'); continue; }
    if (c == 'P') { camLastMs = now; if (act) camPet(); continue; }
    if (c == 0 || strchr("LCRHSANX", c) == nullptr) continue;
    camLastMs = now;
    if (!camOk) { camOk = true; Serial.println("[CAM] รับข้อมูลกล้องได้"); }
    if (c != camLast) Serial.printf("[CAM] %c\n", c);
    camLast = c;
    if (act && !isExecutingCommand && !gActive) camHandle(c);
  }
  if (camOk && now - camLastMs > CAM_LOST_MS) {
    camOk = false;
    Serial.println("[CAM] ⚠️ กล้องหลุด — ไม่มีข้อมูลเกิน 5 วิ (หันหัวกลับกลาง)");
    if (act && !isExecutingCommand) moveHead(90);
  }
#else
  (void)act;
#endif
}

// =====================================================================
// /state — JSON ให้เว็บ (Digital Twin) สเปกวันศุกร์ข้อ 8
// ฟิลด์เดิมครบทุกตัว ชื่อเดิม ลำดับเดิม แล้วต่อท้ายฟิลด์ใหม่
// ⚠️ แก้ฟิลด์ที่นี่ ต้องแก้ applyLiveState() ใน robot-sim.js ให้ตรงกันด้วย
// =====================================================================
int stateJson(char* buf, size_t n) {
  refreshCompatAngles();
  int ilkMask = 0;
  for (int i = 0; i < AX_N; i++) if (ax[i].blockedSinceMs) ilkMask |= (1 << i);
  return snprintf(buf, n,
    "{\"emo\":\"%c\",\"head\":%d,\"headCmd\":%d,\"tilt\":%d,"
    "\"arm1\":%d,\"arm2\":%d,\"hand1\":%d,\"hand2\":%d,"
    "\"busy\":%d,\"blink\":%d,\"up\":%lu,"
    "\"encL\":%ld,\"encR\":%ld,\"rpmL\":%.1f,\"rpmR\":%.1f,\"face\":\"%c\","
    "\"draws\":%lu,\"faceTest\":%d,\"fillUs\":%lu,\"normalUs\":%lu,"
    "\"vl_mm\":%d,\"vlOk\":%d,\"holding\":%d,\"obj\":%d,\"verify\":%d,"
    "\"cliffL\":%d,\"cliffR\":%d,\"cliffOn\":%d,\"cliffN\":%lu,"
    "\"cam\":\"%c\",\"camOk\":%d,\"mot\":%d,\"motDir\":\"%c\","
    "\"yaw\":%.1f,\"tiltRel\":%.1f,\"lift1\":%.1f,\"lift2\":%.1f,"
    "\"grip1\":%d,\"grip2\":%d,\"gripBusy\":%d,\"ilk\":%d,\"ilkN\":%lu,\"pca\":%d,"
    "\"touchOk\":%d,\"touch\":%d,\"touchEvt\":%d,\"touchN\":%lu,\"touchPos\":%d,\"touchMask\":%d,"
    "\"prog\":%d,\"bugN\":%lu,\"bug\":\"%s\",\"idle\":%d,\"idleOn\":%d,\"pathN\":%d,\"emoBusy\":%d,"
    "\"faceX\":%d,\"faceSeen\":%d,\"shyN\":%lu}",
    currentEmotion,
    (int)lroundf(ax[AX_YAW].target), currentHeadCmdAngle, currentHeadTiltAngle,
    currentArm1Angle, currentArm2Angle, currentHand1Angle, currentHand2Angle,
    isExecutingCommand ? 1 : 0, inBlinkSequence ? 1 : 0,
    millis(),
    (long)encGetL(), (long)encGetR(), encRpmL, encRpmR, lastDrawnEyes,
    (unsigned long)eyeDrawCount, faceDiagnosticActive ? 1 : 0,
    faceDiagnosticFillUs, faceDiagnosticNormalUs,
    vlMm, vlOnline ? 1 : 0, holding ? 1 : 0, (int)objSt, (int)lastVerify,
    cliffL ? 1 : 0, cliffR ? 1 : 0, cfg.cliffEnable ? 1 : 0, (unsigned long)cliffEvents,
    camLast, camOk ? 1 : 0, motorBusy() ? 1 : 0, motDirChar(),
    servoToRel(AX_YAW, ax[AX_YAW].pos), servoToRel(AX_TILT, ax[AX_TILT].pos),
    servoToRel(AX_ARM_L, ax[AX_ARM_L].pos), servoToRel(AX_ARM_R, ax[AX_ARM_R].pos),
    (int)lroundf(handPctNow(0)), (int)lroundf(handPctNow(1)), gActive ? 1 : 0,
    ilkMask, (unsigned long)ilkClampCount, pcaOnline ? 1 : 0,
    touchOnline ? 1 : 0, touchNow ? 1 : 0, (int)touchEvt, touchCount, (int)touchPos, (int)touchMask,
    (int)progSt, bugCount, lastBug, idlePlaying ? 1 : 0, idleOn ? 1 : 0, pathN, emoBusy() ? 1 : 0,
    faceSeenNow() ? faceX : 0, faceSeenNow() ? 1 : 0, (unsigned long)shyN);
}

// =====================================================================
// เมนู Serial
// =====================================================================
bool calibMode = false;
int  calibAxis = AX_ARM_L;
bool lineMode = false;
String lineBuf;
bool monitorOn = false;
unsigned long monitorMs = 0;

void printSensors() {
  float P[AX_N]; axPosesRel(P, false);
  Serial.printf("[สถานะ] VL53 %s %d mm · ของ=%s holding=%d verify=%d\n",
                vlOnline ? "ต่อ" : "ไม่ต่อ", vlMm, objName(objSt), holding, lastVerify);
  Serial.printf("        ทองแดงหัว %s · แตะ ซ้าย/กลาง/ขวา=%d%d%d · ค่า %d/%d/%d ฐาน %d/%d/%d (แตะแล้วค่าลดลง) · เกณฑ์ %u · ล่าสุด=%u รวม %lu\n",
                touchOnline ? "ต่อ" : "ไม่ต่อ", touchMask & 1, (touchMask >> 1) & 1, (touchMask >> 2) & 1,
                touchFilt[0], touchFilt[1], touchFilt[2], touchBase[0], touchBase[1], touchBase[2], mprTouchTh, touchEvt, touchCount);
#if USE_CLIFF
  Serial.printf("        กันตก %s · ซ้าย GPIO13 ดิบ=%d ขอบ=%d · ขวา GPIO19 ดิบ=%d ขอบ=%d · เจอขอบแล้ว %lu ครั้ง\n",
                cfg.cliffEnable ? "เปิด" : "ปิด", digitalRead(PIN_CLIFF_L), cliffL,
                digitalRead(PIN_CLIFF_R), cliffR, (unsigned long)cliffEvents);
#endif
  Serial.printf("        กล้อง %s ล่าสุด=%c · ล้อ=%c · คิว=%s · มือ=%s\n",
                camOk ? "ปกติ" : "หลุด/ไม่ต่อ", camLast, motDirChar(),
                isExecutingCommand ? "กำลังรัน" : "ว่าง", gActive ? "กำลังทำ" : "ว่าง");
  Serial.printf("        มุมเชิงกล แขนซ้าย=%.1f มือซ้าย=%.1f(%.0f%%) แขนขวา=%.1f มือขวา=%.1f(%.0f%%) หัน=%.1f ก้มเงย=%.1f · ท่านี้ %s\n",
                P[AX_ARM_L], P[AX_HAND_L], handPctNow(0), P[AX_ARM_R], P[AX_HAND_R], handPctNow(1),
                P[AX_YAW], P[AX_TILT], poseOK(P) ? "ไม่ชน" : "อยู่ในเขตชน!");
}

void printHelp() {
  Serial.println("\n=============== เมนู Serial (115200, เลือก Newline) ===============");
  Serial.println(" ตรวจ/ประกอบ: 0 ทุกตัว 90 · T ทดสอบกวาด · I 180/360 · R กวาดช่วง · D I2C · V ขาสัญญาณ");
  Serial.println("             Q เลือกช่อง · , . ±1 · < > ±5 · / ตาราง · * ปล่อยแรงทุกช่อง · F ตาขาว");
  Serial.println(" Encoder:    E อ่าน · Z ล้าง · N พัลส์หลอก 10 วิ");
  Serial.println(" เซนเซอร์:   S สถานะครั้งเดียว · W เปิด/ปิดพิมพ์ทุก 0.5 วิ");
  Serial.println(" สอบเทียบ:   K เข้าโหมดสอบเทียบ (ในโหมดกด ? ดูปุ่ม)");
  Serial.println(" ขยับ:       w s a d เดิน 1 วิ · x/เว้นวรรค หยุด · 7 8 9 หัน · ; ' \\ ก้ม/ตรง/เงย");
  Serial.println("             r f v แขนซ้าย ยก/กลาง/ลง · t g b แขนขวา · 1 2 3 มือขวา กาง/กลาง/หนีบ");
  Serial.println("             4 5 6 มือซ้าย หนีบ/กลาง/กาง · [ หนีบฉลาด · ] ปล่อย · G หนีบ+ยก+ตรวจ VL53");
  Serial.println(" อารมณ์:     u N · h H · j S · k A · o O · l Z · n C · m V · p B · y i มองซ้าย/ขวา · c ทดสีจอ");
  Serial.println(" คำสั่งบรรทัด (ขึ้นต้นด้วย ! แล้ว Enter):");
  Serial.println("   !run w;7;T3;   รันคำสั่งเว็บ    !state  พิมพ์ JSON    !cfg  ค่าทั้งหมด");
  Serial.println("   !hv 90 ความเร็วหัว°/s (≤200)  !ha 240 ความเร่งหัว  !hr 2000 ปลดแรงหัวหัน ms  !tr 2000 ปลดแรงก้มเงย ms");
  Serial.println("   !av 90 ความเร็วแขน  !gv 120 ความเร็วมือ  !ramp 400 ชะลอล้อ ms");
  Serial.println("   !cliff 1/0 เปิด/ปิดกันตก  !clvl 1/0 ระดับที่แปลว่าเจอขอบ");
  Serial.println("   !vln 150 ระยะ 'มีของ' mm  !vlj 100 ระยะกระโดด mm  !ilk 1/0 interlock");
  Serial.println("   !save บันทึก NVS  !load โหลด  !default ค่าเริ่ม (ยังไม่บันทึก)");
  Serial.println("====================================================================\n");
}

static const char* AX_TH[AX_N] = { "แขนซ้าย CH0", "มือซ้าย CH1", "แขนขวา CH2", "มือขวา CH6", "หัวหัน CH4", "หัวก้มเงย CH5" };

void calibHelp() {
  Serial.println("\n---------- โหมดสอบเทียบ (K) ----------");
  Serial.println(" 1 แขนซ้าย  2 มือซ้าย  3 แขนขวา  4 มือขวา  5 หัวหัน  6 หัวก้มเงย   ← เลือกข้อ");
  Serial.println(" , .  ขยับมุมเซอร์โวดิบ ±1     < >  ±5   (ไม่สนลิมิต ระวังชน ขยับทีละน้อย)");
  Serial.println(" h  บันทึกมุมตอนนี้เป็น 'แนวนอน' (แขน) / 'กลาง' (มือ หัวหัน ก้มเงย)");
  Serial.println(" u  บอกทิศบวก: ขยับไปทาง แขนยกขึ้น / มือหนีบเข้า / หัวหันไปทางแขนซ้าย / หัวเงย ≥3° แล้วกด u");
  Serial.println(" o  (มือ) บันทึกมุมตอนนี้เป็น 'กางสุด'     c  (มือ) บันทึกเป็น 'หนีบสุด'");
  Serial.println(" i  กลับทิศ   z ไปมุมเชิงกล 0   + ไปสุดบวก   - ไปสุดลบ (สองปุ่มนี้ผ่าน interlock)");
  Serial.println(" p  พิมพ์ค่า   S บันทึก NVS   L โหลด NVS   X ค่าเริ่ม   q ออก   ? ปุ่ม");
  Serial.println("-------------------------------------");
}

void calibShow() {
  int i = calibAxis;
  Serial.printf("[K] %s · เซอร์โว %.1f deg · มุมเชิงกล %.1f · ศูนย์ %.1f ทิศ %+d · ลิมิตเซอร์โว %d-%d\n",
                AX_TH[i], ax[i].pos, servoToRel(i, ax[i].pos), axCenter(i), axDir(i),
                SERVOS[i].minAngle, SERVOS[i].maxAngle);
}

void calibSetCenter(int i, float v) {
  switch (i) {
    case AX_ARM_L: cfg.armHz[0] = v; break;  case AX_ARM_R: cfg.armHz[1] = v; break;
    case AX_HAND_L: cfg.handCenter[0] = v; break; case AX_HAND_R: cfg.handCenter[1] = v; break;
    case AX_YAW: cfg.yawCenter = v; break;   default: cfg.tiltCenter = v; break;
  }
}
void calibSetDir(int i, int d) {
  int8_t v = (d >= 0) ? 1 : -1;
  switch (i) {
    case AX_ARM_L: cfg.armDir[0] = v; break;  case AX_ARM_R: cfg.armDir[1] = v; break;
    case AX_HAND_L: cfg.handDir[0] = v; break; case AX_HAND_R: cfg.handDir[1] = v; break;
    case AX_YAW: cfg.yawDir = v; break;       default: cfg.tiltDir = v; break;
  }
}

void calibKey(char c) {
  int i = calibAxis;
  bool isHand = (i == AX_HAND_L || i == AX_HAND_R);
  int side = (i == AX_HAND_R || i == AX_ARM_R) ? 1 : 0;
  switch (c) {
    case '1': calibAxis = AX_ARM_L;  calibShow(); break;
    case '2': calibAxis = AX_HAND_L; calibShow(); break;
    case '3': calibAxis = AX_ARM_R;  calibShow(); break;
    case '4': calibAxis = AX_HAND_R; calibShow(); break;
    case '5': calibAxis = AX_YAW;    calibShow(); break;
    case '6': calibAxis = AX_TILT;   calibShow(); break;
    case ',': case '.': case '<': case '>': {
      float d = (c == ',') ? -1 : (c == '.') ? 1 : (c == '<') ? -5 : 5;
      float s = constrain(ax[i].pos + d, 0.0f, 180.0f);
      setServoRawF(SERVOS[i].ch, s);
      ax[i].pos = ax[i].target = ax[i].lastW = s; ax[i].vel = 0;
      calibShow();
      break;
    }
    case 'h':
      calibSetCenter(i, ax[i].pos); cfgSanitize(); applyLimitsFromConfig();
      Serial.printf("[K] %s: ตั้ง %s = %.1f (ยังไม่บันทึก กด S)\n", AX_TH[i],
                    (i == AX_ARM_L || i == AX_ARM_R) ? "แนวนอน" : "กลาง", ax[i].pos);
      break;
    case 'u': {
      float diff = ax[i].pos - axCenter(i);
      if (fabsf(diff) < 3.0f) { Serial.println("[K] ขยับออกจากศูนย์ให้เกิน 3° ไปทางบวกก่อน แล้วกด u"); break; }
      calibSetDir(i, diff > 0 ? 1 : -1); applyLimitsFromConfig();
      Serial.printf("[K] %s: ทิศบวก = มุมเซอร์โว%s\n", AX_TH[i], diff > 0 ? "เพิ่ม" : "ลด");
      break;
    }
    case 'i': calibSetDir(i, -axDir(i)); applyLimitsFromConfig(); calibShow(); break;
    case 'o':
      if (!isHand) { Serial.println("[K] o ใช้กับมือเท่านั้น"); break; }
      cfg.handOpen[side] = servoToRel(i, ax[i].pos); cfgSanitize();
      Serial.printf("[K] %s: กางสุด = มุมเชิงกล %.1f (ช่วงที่ยอม −30…−5)\n", AX_TH[i], cfg.handOpen[side]);
      if (servoToRel(i, ax[i].pos) > 0) Serial.println("[K] ⚠️ มุมกางเป็นบวก แปลว่าทิศกลับ — กด i แล้วตั้งใหม่");
      break;
    case 'c':
      if (!isHand) { Serial.println("[K] c ใช้กับมือเท่านั้น"); break; }
      cfg.handClose[side] = servoToRel(i, ax[i].pos); cfgSanitize();
      Serial.printf("[K] %s: หนีบสุด = มุมเชิงกล %.1f (ช่วงที่ยอม +5…+28.5)\n", AX_TH[i], cfg.handClose[side]);
      if (servoToRel(i, ax[i].pos) < 0) Serial.println("[K] ⚠️ มุมหนีบเป็นลบ แปลว่าทิศกลับ — กด i แล้วตั้งใหม่");
      break;
    case 'z': axTrySet(i, 0); break;
    case '+': axTrySet(i, axRelMax(i)); break;
    case '-': axTrySet(i, axRelMin(i)); break;
    case 'p': cfgPrint(); break;
    case 'S': Serial.println(cfgSave() ? "[K] บันทึกลง NVS แล้ว" : "[K] ❌ บันทึกไม่สำเร็จ"); break;
    case 'L': cfgLoad(); applyLimitsFromConfig(); Serial.println("[K] โหลดจาก NVS แล้ว"); cfgPrint(); break;
    case 'X': cfgDefaults(); cfgSanitize(); applyLimitsFromConfig(); Serial.println("[K] ใช้ค่าเริ่ม (ยังไม่บันทึก)"); break;
    case 'q':
      calibMode = false; applyLimitsFromConfig();
      Serial.println("[K] ออกจากโหมดสอบเทียบ (ค่าที่ยังไม่กด S จะหายตอนรีบูต)");
      break;
    case '?': calibHelp(); break;
    case '\r': case '\n': break;
    default: Serial.println("[K] ไม่รู้จักปุ่มนี้ กด ? ดูปุ่ม"); break;
  }
}

void handleLine(String line) {
  line.trim();
  if (line.startsWith("!")) { line.remove(0, 1); line.trim(); }
  int sp = line.indexOf(' ');
  String k = (sp < 0) ? line : line.substring(0, sp);
  String v = (sp < 0) ? String("") : line.substring(sp + 1);
  v.trim();
  float f = v.toFloat();
  if      (k == "run")   {
    if (isExecutingCommand) Serial.println("[CMD] ไม่ว่าง (BUSY)");
    else { if (!v.endsWith(";")) v += ";"; executeCommandString(v); }
  }
  else if (k == "idle")  { setIdleOn(f != 0); Serial.printf("ไอเดิล %s\n", idleOn ? "เปิด" : "ปิด"); }
  else if (k == "state") { char b[1500]; stateJson(b, sizeof(b)); Serial.println(b); }
  else if (k == "cfg")   cfgPrint();
  else if (k == "hv")    { cfg.headVmax = f; cfgSanitize(); Serial.printf("ความเร็วหัว %.0f°/s\n", cfg.headVmax); }
  else if (k == "ha")    { cfg.headAcc = f;  cfgSanitize(); Serial.printf("ความเร่งหัว %.0f°/s²\n", cfg.headAcc); }
  else if (k == "hr")    { cfg.yawReleaseMs  = (uint16_t)constrain((int)f, 0, 60000); Serial.printf("ปลดแรงหัวหัน %u ms\n", cfg.yawReleaseMs); }
  else if (k == "tr")    { cfg.tiltReleaseMs = (uint16_t)constrain((int)f, 0, 60000); Serial.printf("ปลดแรงก้มเงย %u ms\n", cfg.tiltReleaseMs); }
  else if (k == "av")    { cfg.armVmax = f;  cfgSanitize(); Serial.printf("ความเร็วแขน %.0f°/s\n", cfg.armVmax); }
  else if (k == "gv")    { cfg.handVmax = f; cfgSanitize(); Serial.printf("ความเร็วมือ %.0f°/s\n", cfg.handVmax); }
  else if (k == "ramp")  { cfg.motorRampMs = (uint16_t)constrain((int)f, 0, 2000); Serial.printf("ชะลอล้อ %u ms\n", cfg.motorRampMs); }
  else if (k == "cliff") { cfg.cliffEnable = (f != 0); applyLimitsFromConfig(); Serial.printf("กันตก %s\n", cfg.cliffEnable ? "เปิด" : "ปิด"); }
  else if (k == "clvl")  { cfg.cliffEdgeLevel = (f != 0); applyLimitsFromConfig(); Serial.printf("ขอบ = ขาอ่านได้ %u\n", cfg.cliffEdgeLevel); }
  else if (k == "vln")   { cfg.vlNearMm = (uint16_t)f; cfgSanitize(); Serial.printf("VL53 ใกล้ %u mm\n", cfg.vlNearMm); }
  else if (k == "tt")    { mprTouchTh = (uint8_t)constrain((int)f, 2, 60);
                           if (touchOnline) { mprWrite(0x5E, 0x00); mprSetThresholds(); mprWrite(0x5E, 0x80 | MPR_NPAD); }
                           Serial.printf("ทองแดงหัว เกณฑ์แตะ %u\n", mprTouchTh); }
  else if (k == "vlj")   { cfg.vlJumpMm = (uint16_t)f; cfgSanitize(); Serial.printf("VL53 กระโดด %u mm\n", cfg.vlJumpMm); }
  else if (k == "cam")   {                     // กล้องแทน VL/ทองแดง: !cam <h|d|t|v|x|s|m|a|y|k> <ค่า>
    char n = 0; int x = 0;
    if (sscanf(v.c_str(), "%c %d", &n, &x) == 2) {
      int* p = n=='h' ? &camGH : n=='d' ? &camGD : n=='t' ? &camGT : n=='v' ? &camGV : n=='x' ? &camGX :
               n=='s' ? &camGS : n=='m' ? &camGM : n=='a' ? &camLA : n=='y' ? &camLY : n=='k' ? &camLH : nullptr;
      if (p) *p = x; else Serial.println("ไม่รู้จักตัวนี้");
    }
    Serial.printf("[CAM] h=%d d=%d t=%d v=%d x=%d s=%d m=%d | ยก a=%d y=%d k=%d | O x=%d y=%d a=%d b=%d (%s) ทองแดง=%d VL=%d\n",
                  camGH, camGD, camGT, camGV, camGX, camGS, camGM, camLA, camLY, camLH,
                  camObjX, camObjY, camObjA, camObjB, camObjFresh() ? "สด" : "ไม่มี", touchOnline, vlOnline);
  }
  else if (k == "ilk")   { cfg.ilkEnable = (f != 0); Serial.printf("interlock %s\n", cfg.ilkEnable ? "เปิด" : "⚠️ ปิด"); }
  else if (k == "save")  Serial.println(cfgSave() ? "บันทึกลง NVS แล้ว" : "❌ บันทึกไม่สำเร็จ");
  else if (k == "load")  { cfgLoad(); applyLimitsFromConfig(); cfgPrint(); }
  else if (k == "default") { cfgDefaults(); cfgSanitize(); applyLimitsFromConfig(); Serial.println("ใช้ค่าเริ่ม (ยังไม่บันทึก)"); }
  else Serial.printf("ไม่รู้จัก !%s — พิมพ์ H ดูเมนู\n", k.c_str());
}

void handleKey(char command) {
  // ขณะค้างจอ รับเฉพาะ F ซ้ำ อ่าน Encoder และหยุดล้อ ไม่ให้คำสั่งอื่นวาดทับ
  if (faceDiagnosticActive && command != 'F' && command != 'E' &&
      command != 'x' && command != ' ') {
    if (command != '\r' && command != '\n') Serial.println("[FACE TEST] รอให้ครบ 10 วินาทีก่อนส่งคำสั่งอื่น");
    return;
  }
  switch (command) {
    case 'F': startFaceDiagnostic(); break;
    // ---------- โหมดหาตำแหน่ง / ทดสอบ (เครื่องมือ บล็อกได้) ----------
    case '0': centerAllServos(); break;
    case 'T': testAllServos(); break;
    case 'Q': selectNextServo(); break;
    case ',': nudgeSelectedServo(-1); break;
    case '.': nudgeSelectedServo(+1); break;
    case '<': nudgeSelectedServo(-5); break;
    case '>': nudgeSelectedServo(+5); break;
    case '/': printServoTable(); break;
    case '*': releaseAllServos(); break;
    case 'I': identifyAllServoTypes(); axesSyncFromHw(); break;
    case 'R': rangeScanServo(calibIndex); axesSyncFromHw(); break;
    case 'D': i2cDiagnostics(); axesSyncFromHw(); break;
    case 'V': outputPinTest(); axesSyncFromHw(); break;
    case 'K': calibMode = true; stopMotors(); calibHelp(); calibShow(); break;
    case 'S': printSensors(); break;
    case 'W': monitorOn = !monitorOn; Serial.printf("[สถานะ] พิมพ์ต่อเนื่อง %s\n", monitorOn ? "เปิด" : "ปิด"); break;
    case 'H': printHelp(); break;

    // ---------- Encoder ----------
    case 'E': encoderReport(); break;
    case 'Z': encoderZero(); break;
    case 'N': encoderNoiseTest(); break;

    // ---------- มอเตอร์ — ผ่านคิวเดียวกับเว็บ ----------
    case 'w': case 's': case 'a': case 'd': {
      if (isExecutingCommand) { Serial.println("[CMD] ไม่ว่าง"); break; }
      char b[3] = { command, ';', 0 };
      executeCommandString(String(b));
      break;
    }
    case 'x': case ' ': emergencyStop(); break;

    // ---------- มือ ----------
    case '4': handSetPct(0, 100); break;   // มือซ้าย หนีบ
    case '5': handCenterSide(0); break;    // มือซ้าย กลาง
    case '6': handSetPct(0, 0); break;     // มือซ้าย กาง
    case '3': handSetPct(1, 100); break;   // มือขวา หนีบ
    case '2': handCenterSide(1); break;    // มือขวา กลาง
    case '1': handSetPct(1, 0); break;     // มือขวา กาง

    // ---------- หัวหัน CH4 — ตั้งเป้าเดียวกับเว็บและกล้อง ----------
    case '7': moveHead(50); break;
    case '8': moveHead(90); break;
    case '9': moveHead(130); break;

    // ---------- หัวก้ม-เงย CH5 ----------
    case ';':  headTiltRel(-10); break;
    case '\'': headTiltRel(0); break;
    case '\\': headTiltRel(10); break;

    // ---------- แขน CH0 / CH2 ----------
    case 'r': moveArm1(67); break;
    case 'f': moveArm1(91); break;
    case 'v': moveArm1(121); break;
    case 't': moveArm2(118); break;
    case 'g': moveArm2(90); break;
    case 'b': moveArm2(60); break;

    // ---------- อารมณ์ ----------
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

    case 'c': {  // Color test — ใช้ได้เมื่อเปิดจอเท่านั้น (เครื่องมือ ค้าง 5 วิ)
#if USE_TFT
      stopMotors();
      tft.fillScreen(TFT_WHITE);
      tft.fillRect(0,   0, 80, 120, tft.color565(255,0,0));
      tft.fillRect(80,  0, 80, 120, tft.color565(0,255,0));
      tft.fillRect(160, 0, 80, 120, tft.color565(0,0,255));
      tft.fillRect(240, 0, 80, 120, HEART_COLOR);
      tft.fillRect(0, 120, 160, 120, BLUSH_PINK);
      tft.setTextColor(TFT_BLACK); tft.setTextSize(1);
      tft.setCursor(5,5);   tft.print("RED");
      tft.setCursor(85,5);  tft.print("GRN");
      tft.setCursor(165,5); tft.print("BLU");
      tft.setCursor(245,5); tft.print("HEART");
      tft.setCursor(5,125); tft.print("BLUSH");
      Serial.println("[COLOR TEST] Check display!");
      delay(5000);
      drawEyesForEmotion(currentEmotion);
#else
      Serial.println("[COLOR TEST] จอปิดอยู่ (USE_TFT 0)");
#endif
      break;
    }

    // --- Gripper ---
    case '[': smartGrip(); break;
    case ']': gripRelease(); break;
    case 'G': gripAndVerify(); break;
    default: break;
  }
}

void serialTick() {
  for (int n = 0; n < 64 && Serial.available() > 0; n++) {
    char c = (char)Serial.read();
    if (lineMode) {
      if (c == '\n' || c == '\r') { lineMode = false; handleLine(lineBuf); lineBuf = ""; }
      else if (lineBuf.length() < 160) lineBuf += c;
      continue;
    }
    if (c == '!') { lineMode = true; lineBuf = ""; continue; }
    if (calibMode) { calibKey(c); continue; }
    handleKey(c);
  }
}

void monitorTick() {
  if (!monitorOn) return;
  unsigned long now = millis();
  if (now - monitorMs < 500) return;
  monitorMs = now;
  Serial.printf("[MON] vl=%d ของ=%s hold=%d | cliff L=%d R=%d | cam=%c ok=%d | mot=%c | หัน=%.0f ก้มเงย=%.0f ยก L=%.0f R=%.0f หนีบ L=%.0f%% R=%.0f%%\n",
                vlMm, objName(objSt), holding, cliffL, cliffR, camLast, camOk, motDirChar(),
                servoToRel(AX_YAW, ax[AX_YAW].pos), servoToRel(AX_TILT, ax[AX_TILT].pos),
                servoToRel(AX_ARM_L, ax[AX_ARM_L].pos), servoToRel(AX_ARM_R, ax[AX_ARM_R].pos),
                handPctNow(0), handPctNow(1));
}

// =====================================================================
// Setup
// =====================================================================
void setup() {
  // ตั้งขามอเตอร์เป็น LOW ก่อนทำอย่างอื่นทั้งหมด ไม่งั้นล้อกระตุกตอนบูต
  motorInit();
  encoderInit();

  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n===== RoboPCA9685 — METO ตัวสำเร็จ รอบวันศุกร์ 6 พ.ย. 2569 =====");
  Serial.println("Motor  PWMA=26 AIN1=27 AIN2=14 | PWMB=25 BIN1=32 BIN2=33");
  Serial.println("TFT    SCLK=18 MOSI=5 MISO=-1 DC=17 RST=16 CS=4");
  Serial.println("CAM    Serial2 RX=23 TX=-1 @9600   I2C SDA=21 SCL=22 (PCA 0x40, VL53 0x29, MPR121 0x5A)");
  Serial.println("TCRT   ซ้าย GPIO13 ขวา GPIO19");

  for (int i = 0; i < 16; i++) { servoAngleNow[i] = 90; servoUsNow[i] = 0; servoLive[i] = false; }

  // ---------- ค่าสอบเทียบ ----------
  bool fromNvs = cfgLoad();
  applyLimitsFromConfig();
  Serial.println(fromNvs ? "[CFG] โหลดค่าสอบเทียบจาก NVS แล้ว"
                         : "[CFG] ยังไม่มีค่าใน NVS — ใช้ค่าเริ่ม (ต้องสอบเทียบด้วยปุ่ม K)");
  for (int i = 0; i < AX_N; i++) {
    float s = relToServo(i, 0);
    ax[i].pos = ax[i].target = s; ax[i].vel = 0; ax[i].vScale = 1.0f;
    ax[i].lastW = NAN; ax[i].lastMoveMs = 0; ax[i].blockedSinceMs = 0;
  }

  cliffInit();

  // ---------- จอ ----------
#if USE_TFT
  tft.init(); tft.setRotation(1); tft.fillScreen(TFT_WHITE);
  HEART_COLOR = tft.color565(220, 20, 60);
  BLUSH_PINK  = tft.color565(255, 130, 150);
  drawEyes_Normal();
  Serial.println("[TFT] เปิดใช้งาน");
#else
  Serial.println("[TFT] ปิดอยู่ (USE_TFT 0) — รอบนี้ยังไม่ต่อจอ");
#endif

  // ---------- I2C + PCA9685 ----------
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000);

  // สเปกข้อ 9: ตรวจว่าเจอ PCA9685 ที่ 0x40 ก่อน แล้วค่อยสั่งเซอร์โว
  Wire.beginTransmission(PCA9685_ADDR);
  bool pcaFound = (Wire.endTransmission() == 0);
  pcaOnline = pcaFound;
  if (pcaFound) {
    Serial.printf("[PCA9685] เจอบอร์ดที่ 0x%02X\n", PCA9685_ADDR);
  } else {
    Serial.printf("[PCA9685] ❌ ไม่เจอที่ 0x%02X — เช็ค SDA=%d SCL=%d, VCC 3V3, GND ร่วม\n",
                  PCA9685_ADDR, I2C_SDA_PIN, I2C_SCL_PIN);
  }

  pca.begin();
  // ถ้ามุมเพี้ยนจากที่คำนวณ ลองปรับค่านี้ระหว่าง 23000000-27000000
  pca.setOscillatorFrequency(27000000);
  pca.setPWMFreq(SERVO_FREQ_HZ);
  delay(20);
  Serial.printf("[PCA9685] ตั้ง PWM %d Hz แล้ว\n", SERVO_FREQ_HZ);

  // ---------- VL53L0X (ไม่มีก็ไปต่อ) ----------
#if USE_VL53
  if (!vlTryInit()) Serial.println("[VL53] ไม่เจอที่ 0x29 — บูตต่อ จะลองหาใหม่ทุก 3 วิ");
  vlProbeMs = millis();
#endif
#if USE_TOUCH
  if (!touchTryInit()) Serial.println("[TOUCH] ไม่เจอ MPR121 ที่ 0x5A — บูตต่อ จะลองหาใหม่ทุก 3 วิ");
  touchProbeMs = millis();
#endif

  // ---------- มอเตอร์ ----------
#if USE_MOTOR
  Serial.printf("[MOTOR] TB6612 พร้อม — PWM %dHz เพดาน %d ค่าเดิน %d ชะลอหยุด %u ms\n",
                PWM_FREQ_HZ, PWM_CEIL, PWM_DRIVE, cfg.motorRampMs);
#else
  Serial.println("[MOTOR] ปิดอยู่ (USE_MOTOR 0) — ขามอเตอร์ไม่ถูกแตะเลย");
#endif

  // ---------- WiFi ----------
#if USE_WIFI
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

  if (MDNS.begin(mdns_name)) {
    Serial.printf("✅ mDNS: เข้าเว็บได้ที่ http://%s.local\n", mdns_name);
  } else {
    Serial.println("❌ mDNS เริ่มไม่สำเร็จ");
  }

  server.on("/run", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    String cmd = server.arg("cmd");
    String t = cmd; t.trim();
    bool isStop = (t == "x" || t == "x;");
    // ระหว่าง F อนุญาตเฉพาะหยุดล้อ เพื่อไม่มีคำสั่งอื่นวาดทับหรือบล็อก loop()
    if (faceDiagnosticActive) {
      if (isStop) { stopMotors(); server.send(200, "text/plain", "OK"); }
      else        server.send(409, "text/plain", "FACE_TEST_ACTIVE");
      return;
    }
    // x หยุดได้เสมอ แม้กำลังรันคิวอยู่ (ของใหม่รอบนี้)
    if (isStop) {
      emergencyStop();
      server.send(200, "text/plain", "OK");
      return;
    }
    if (t.startsWith("!idle")) {
      handleLine(t);
      server.send(200, "text/plain", "OK");
      return;
    }
    // ระหว่างสอบเทียบ (K) ไม่รับคำสั่งเว็บ กันแขนขยับใส่มือคน
    if (calibMode) {
      server.send(409, "text/plain", "CALIB_MODE");
      return;
    }
    // กันคำสั่งซ้อนคำสั่ง — เหมือนเดิม
    if (isExecutingCommand) {
      server.send(409, "text/plain", "BUSY");
      return;
    }
    if (server.hasArg("cmd")) {
      Serial.println("Web: " + cmd);
      server.send(200, "text/plain", "OK");
      executeCommandString(cmd);
    } else {
      server.send(400, "text/plain", "Empty");
    }
  });

  server.on("/state", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    static char buf[1500];
    stateJson(buf, sizeof(buf));
    server.send(200, "application/json", buf);
  });

  server.begin();
#else
  Serial.println("[WIFI] ปิดอยู่ (USE_WIFI 0)");
#endif

  // ---------- ท่าเริ่มต้น: ท่าพักตามค่าสอบเทียบ ทีละตัว ----------
  if (pcaFound) {
    Serial.println("[SERVO] ไปท่าพัก (มุมเชิงกล 0 ทุกข้อ) ทีละตัว");
    homePoseAll(true);
  } else {
    Serial.println("[SERVO] ข้ามการตั้งท่าเริ่มต้น เพราะยังไม่เจอ PCA9685");
  }
  axLastTick = millis();

  // ---------- กล้อง ----------
#if USE_CAMERA
  Serial2.begin(9600, SERIAL_8N1, CAM_RX_PIN, CAM_TX_PIN);
#endif

  initIdleTimers();

  Serial.println("พร้อมแล้ว — พิมพ์ H ดูเมนู | K สอบเทียบ | S สถานะเซนเซอร์ | 0 ทุกตัว 90 | / ตาราง");
}

// =====================================================================
// Loop — ไม่มี delay ยาว ทุกระบบเดินด้วยนาฬิกา
// =====================================================================
void loop() {
  updateFaceDiagnostic();
#if USE_WIFI
  server.handleClient();
#endif

  encoderTick();   // อ่าน Encoder + ตรวจล้อติดขัด
  cliffTick();     // กันตก (ต้องมาก่อน motorTick)
  motorTick();     // นาฬิกาหยุดล้อ + ชะลอ + ถอยหลังกันตก

  serialTick();    // เมนู Serial

  if (faceDiagnosticActive) {
    camTick(false);          // ทิ้งข้อมูลกล้องช่วงทดสอบ ไม่เล่นอารมณ์ที่ค้างสะสม
    axesUpdate();
    delay(1);
    return;
  }

  camTick(!calibMode);
  camTrackTick(!calibMode);   // หันตามหน้าคน + เขิน (#530)
  vlTick();
  touchTick();
  gripTick();
  gestTick();
  idleTick();
  cmdTick();

  // === Auto-revert: อารมณ์จากปุ่มค้าง 2.5 วิ แล้วกลับ Normal ===
  //     รอให้คิวคำสั่ง/การหนีบจบก่อน ไม่ให้ท่าอารมณ์ไปแย่งแขนกลางคิว
  if (emoAutoRevertTime > 0 && millis() >= emoAutoRevertTime && !isExecutingCommand && !gActive) {
    emoAutoRevertTime = 0;
    currentEmotion = 'N';
    emoChangeTime = millis();
    doBodyGesture('N');
    Serial.println("[EMO] auto-revert -> N");
  }

  // === Idle + Servo Update ===
  if (!isExecutingCommand && !calibMode) updateIdleBehaviors();
  axesUpdate();
  monitorTick();
}

/*
 * ผลตรวจจอขาว 7 ก.ย. 2569 — ขั้นเก็บหลักฐานก่อนแก้วิธีวาด
 * diff จริง: c -> d ย้ายผังขาและ CAM RX=23; d -> e แก้ล้อ;
 * e -> ตัวก่อนเพิ่ม F เปลี่ยนท้ายคำสั่งวาดตาและเพิ่ม face ใน /state
 * จึงใช้ d เป็นฐานหลังย้ายขา ไม่ใช้ชื่อรุ่นในเอกสารเดิมตัดสินสาเหตุ
 * เพิ่ม F วัด fillScreen/Normal ด้วย micros() แล้วค้าง 10 วินาทีแบบไม่ใช้ delay ยาว
 * /state: draws นับการล้างในกลุ่มตา, faceTest=1 ช่วงค้าง, fillUs/normalUs เป็นผลวัดล่าสุด
 * F เพิ่ม draws สองครั้งก่อนค้าง (ล้างจับเวลา + วาด Normal); ระหว่างค้างต้องเพิ่ม 0
 * คอมไพล์ผ่าน: ESP32 Dev Module (esp32:esp32:esp32), core 3.0.7 ทั้งฐาน d และรุ่นเพิ่ม F
 * รุ่นเพิ่ม F ใช้โปรแกรม 1075617/1310720 ไบต์; ตัวแปรส่วนกลาง 49340/327680 ไบต์
 * ยังไม่ได้แฟลช/วัดเวลาจริง: COM4 ที่พบตอนแรกหายไป และตอนตรวจท้ายงานไม่พบ Serial port
 * สาเหตุจริง: ยังไม่ยืนยัน ต้องเทียบภาพบนบอร์ดและผล F ก่อนเลือกแก้ข้อ ก หรือ ข
 * พบแยกจากจอขาว: h; วาด Happy แล้วท้ายคำสั่งกลับ currentEmotion ซึ่งยังอาจเป็น N
 * ยังไม่แก้วิธีวาดหรือพฤติกรรมนี้ในขั้นวัด เพื่อไม่เปลี่ยนเงื่อนไขก่อนมีผลทดสอบ
  *
 * ===== รอบวันศุกร์ 5 พ.ย. 2569 =====
 * สเปก: Robo/Part Robot/งานโค้ด_2026-11/สเปกเฟิร์มแวร์_วันศุกร์_ล็อก.md
 * รายงาน + ตารางคำสั่ง + วิธีทดสอบ: Robo/Part Robot/งานโค้ด_2026-11/รายงานเฟิร์มแวร์_วันศุกร์.md
 * ยังไม่ได้แฟลชลงตัวจริง — คอมไพล์ผ่านด้วย arduino-cli esp32:esp32:esp32 core 3.0.7
 */
