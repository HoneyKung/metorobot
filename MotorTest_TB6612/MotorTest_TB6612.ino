/*
 * =====================================================================
 * MotorTest_TB6612.ino — ทดสอบมอเตอร์ล้อ 2 ตัวผ่าน TB6612FNG
 * =====================================================================
 * ใช้ pin map ชุดใหม่ตาม "คู่มือต่อสาย RoboMDT ล้อ+จอ+กล้อง (6 ก.ย. 2569)"
 * และ "แพลนบัดกรี_Phase1_Motor.md" หัวข้อ 6
 *
 * สเก็ตช์นี้ทดสอบ "มอเตอร์อย่างเดียว" ยังไม่ต้องต่อ Encoder จอ หรือกล้อง
 * ตรงกับลำดับทดสอบข้อ 7-8 ของคู่มือ (ต่อ TB6612 ก่อน แล้วค่อยเสียบมอเตอร์ทีละตัว)
 *
 * -------- สายที่ต้องต่อก่อนแฟลช --------
 *   TB6612 VM   → RAW+ จากจุดพักไฟ/WAGO W1 โดยตรง (ไม่ผ่านเบรดบอร์ด)
 *   TB6612 GND  → RAW- จากจุดพักไฟ/WAGO W2 โดยตรง
 *   TB6612 VCC  → แถว 3V3 จาก ESP32
 *   TB6612 STBY → แถว 3V3 จาก ESP32   (ถ้าต่อเข้า GPIO ให้ตั้ง PIN_STBY ข้างล่าง)
 *   PWMA=26  AIN1=27  AIN2=14   (M03/M04/M05)
 *   PWMB=25  BIN1=32  BIN2=33   (M06/M07/M08)
 *   AO1/AO2 → มอเตอร์ซ้าย   BO1/BO2 → มอเตอร์ขวา
 *   คาปาซิเตอร์ 470-1000uF 16V คร่อม VM/GND ระวังขั้ว
 *
 * -------- กติกาความปลอดภัยของรอบนี้ (มาจากคู่มือ ไม่ใช่ค่าที่ตั้งเอง) --------
 *   1. ยกล้อพ้นพื้นเสมอ สเก็ตช์นี้ไม่ได้ออกแบบให้วิ่งบนโต๊ะ
 *   2. VM รับแรงดันแบต 2S ตรง ๆ สูงสุด 8.4V แต่มอเตอร์เป็นรุ่น 6V
 *      การจำกัด PWM ไม่ใช่ตัวลดแรงดัน จึงทดสอบเป็นช่วงสั้น ๆ เท่านั้น
 *   3. เริ่มที่ PWM 80-100/255 และห้ามเกิน 180/255 (โค้ดบังคับเพดานให้แล้ว)
 *   4. ทุกคำสั่งจะหยุดเองเมื่อครบเวลา RUN_MS ไม่มีคำสั่งไหนวิ่งค้างไม่มีกำหนด
 *   5. เจอสายร้อน กลิ่นไหม้ ล้อค้าง หรือ ESP32 รีบูต ให้ปิดสวิตช์ทันที
 *
 * -------- ปุ่มบน Serial Monitor 115200 (ตั้ง Newline เป็นอะไรก็ได้) --------
 *   y       ปลดล็อกก่อนสั่งมอเตอร์ครั้งแรก (ยืนยันว่ายกล้อพ้นพื้นแล้ว)
 *   w s     เดินหน้า / ถอยหลัง ทั้งสองล้อ
 *   a d     เลี้ยวซ้าย / เลี้ยวขวา (หมุนอยู่กับที่)
 *   q z     ล้อซ้ายอย่างเดียว เดินหน้า / ถอย
 *   e c     ล้อขวาอย่างเดียว เดินหน้า / ถอย
 *   x เว้นวรรค  หยุดแบบปล่อยฟรี (coast)
 *   b       เบรกไฟฟ้า (short brake)
 *   + -     เพิ่ม / ลด PWM ทีละ 10
 *   [ ]     ลด / เพิ่มเวลาสั่งงานต่อครั้ง ทีละ 500 ms
 *   r       ramp test ล้อซ้ายแล้วล้อขวา ไล่ PWM 80→180 ทีละ 20
 *   f       สลับทิศทางล้อซ้ายในซอฟต์แวร์ (ใช้ชั่วคราวถ้าหมุนกลับทิศ)
 *   g       สลับทิศทางล้อขวาในซอฟต์แวร์
 *   i       พิมพ์สถานะปัจจุบัน
 *   ?       พิมพ์เมนูนี้อีกครั้ง
 * =====================================================================
 */

// =====================================================================
// พิน — ตรงกับ pin map ชุดใหม่ ห้ามใช้ผังเก่าที่ 25/26/27/32 เป็นเซอร์โว
// =====================================================================
const int PIN_PWMA = 26;   // มอเตอร์ซ้าย — M03/M04/M05
const int PIN_AIN1 = 27;
const int PIN_AIN2 = 14;

const int PIN_PWMB = 25;   // มอเตอร์ขวา — M06/M07/M08
const int PIN_BIN1 = 32;
const int PIN_BIN2 = 33;

// STBY ต่อ 3V3 ตายตัวตามคู่มือ จึงตั้งเป็น -1
// ถ้าย้ายไปต่อ GPIO เพื่อสั่งตัดไฟไดรเวอร์ ให้ใส่เลขขาแทน -1
const int PIN_STBY = -1;

// =====================================================================
// ค่าตั้ง PWM
// =====================================================================
#define PWM_FREQ_HZ   20000   // 20kHz อยู่นอกช่วงเสียงที่ได้ยิน
                              // ถ้ามอเตอร์ไม่ยอมออกตัวที่ PWM ต่ำ ให้ลองลดเป็น 1000
#define PWM_BITS      8       // 8 บิต = 0-255 ให้ตัวเลขตรงกับที่คู่มือเขียน
#define PWM_CH_A      0
#define PWM_CH_B      1

#define PWM_START     90      // ค่าเริ่มต้น อยู่ในช่วง 80-100 ตามคู่มือ
#define PWM_FLOOR     60      // ต่ำกว่านี้มอเตอร์มักไม่ออกตัว แค่ครางกินไฟ
#define PWM_CEIL      180     // เพดานแข็งตามคู่มือ ห้ามแก้ให้สูงกว่านี้ในรอบทดสอบ

#define RUN_MS_START  1500    // สั่งครั้งหนึ่งวิ่งกี่มิลลิวินาทีแล้วหยุดเอง
#define RUN_MS_MIN    500
#define RUN_MS_MAX    5000

// =====================================================================
// ตัวแปรสถานะ
// =====================================================================
int  pwmLevel   = PWM_START;
int  runMs      = RUN_MS_START;
bool armed      = false;      // ต้องกด y ก่อนหนึ่งครั้งต่อการบูตหนึ่งรอบ
bool invertL    = false;      // สลับทิศในซอฟต์แวร์ (ทางที่ถูกคือสลับสาย AO1/AO2)
bool invertR    = false;
unsigned long stopAtMs = 0;   // 0 = ไม่มีคำสั่งค้างอยู่
int  lastSpeedL = 0;
int  lastSpeedR = 0;

// =====================================================================
// LEDC — รองรับทั้ง ESP32 core 2.x และ 3.x
// core 3.x เปลี่ยน API เป็น ledcAttach(pin, freq, bits) และ ledcWrite(pin, duty)
// =====================================================================
void pwmInit(int pin, int ch) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  (void)ch;
  ledcAttach(pin, PWM_FREQ_HZ, PWM_BITS);
#else
  ledcSetup(ch, PWM_FREQ_HZ, PWM_BITS);
  ledcAttachPin(pin, ch);
#endif
}

void pwmWrite(int pin, int ch, int duty) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  (void)ch;
  ledcWrite(pin, duty);
#else
  (void)pin;
  ledcWrite(ch, duty);
#endif
}

// =====================================================================
// สั่งมอเตอร์หนึ่งตัว
//   speed > 0 = เดินหน้า, speed < 0 = ถอย, speed == 0 = ปล่อยฟรี
//   ค่าจะถูกบีบให้อยู่ในช่วง PWM_FLOOR..PWM_CEIL เสมอ
// =====================================================================
void driveMotor(bool isLeft, int speed) {
  const int pinPwm = isLeft ? PIN_PWMA : PIN_PWMB;
  const int pinIn1 = isLeft ? PIN_AIN1 : PIN_BIN1;
  const int pinIn2 = isLeft ? PIN_AIN2 : PIN_BIN2;
  const int ch     = isLeft ? PWM_CH_A : PWM_CH_B;

  if (isLeft ? invertL : invertR) speed = -speed;

  if (speed == 0) {                 // coast: ปล่อยให้ล้อหมุนฟรี
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

  if (isLeft) lastSpeedL = speed; else lastSpeedR = speed;
}

// เบรกไฟฟ้า: IN1 กับ IN2 สูงพร้อมกัน แล้วให้ PWM เต็ม
void brakeMotor(bool isLeft) {
  const int pinPwm = isLeft ? PIN_PWMA : PIN_PWMB;
  const int pinIn1 = isLeft ? PIN_AIN1 : PIN_BIN1;
  const int pinIn2 = isLeft ? PIN_AIN2 : PIN_BIN2;
  const int ch     = isLeft ? PWM_CH_A : PWM_CH_B;
  digitalWrite(pinIn1, HIGH);
  digitalWrite(pinIn2, HIGH);
  pwmWrite(pinPwm, ch, (1 << PWM_BITS) - 1);
  if (isLeft) lastSpeedL = 0; else lastSpeedR = 0;
}

void stopAll(const char* why) {
  driveMotor(true, 0);
  driveMotor(false, 0);
  stopAtMs = 0;
  if (why) Serial.printf("[หยุด] %s\n", why);
}

void brakeAll() {
  brakeMotor(true);
  brakeMotor(false);
  stopAtMs = 0;
  Serial.println("[เบรก] ค้างเบรกไว้ กด x เพื่อปล่อยฟรี");
}

// สั่งเดินพร้อมตั้งเวลาหยุดอัตโนมัติ
void command(int speedL, int speedR, const char* label) {
  if (!armed) {
    Serial.println("[ล็อกอยู่] ยกล้อพ้นพื้นแล้วกด y ก่อนหนึ่งครั้ง");
    return;
  }
  driveMotor(true,  speedL);
  driveMotor(false, speedR);
  stopAtMs = millis() + runMs;
  Serial.printf("[สั่ง] %-10s L=%+4d R=%+4d  จะหยุดเองใน %d ms\n",
                label, speedL, speedR, runMs);
}

// =====================================================================
// ramp test — ไล่ PWM ทีละขั้นเพื่อหาว่าล้อเริ่มหมุนที่เท่าไร
// ไม่มี Encoder ในสเก็ตช์นี้ ต้องใช้ตาดูและมือแตะเบา ๆ ว่าเริ่มหมุนขั้นไหน
// =====================================================================
void rampTest(bool isLeft) {
  Serial.printf("\n[ramp] ล้อ%s — ดูว่าเริ่มหมุนจริงที่ PWM เท่าไร\n",
                isLeft ? "ซ้าย" : "ขวา");
  for (int p = 80; p <= PWM_CEIL; p += 20) {
    Serial.printf("   PWM %3d ... ", p);
    Serial.flush();
    driveMotor(isLeft, p);
    delay(900);
    driveMotor(isLeft, 0);
    Serial.println("หยุด");
    delay(400);
    if (Serial.available()) {           // กดปุ่มอะไรก็ได้เพื่อยกเลิกกลางคัน
      while (Serial.available()) Serial.read();
      Serial.println("   ยกเลิก ramp");
      break;
    }
  }
  stopAll(nullptr);
}

// =====================================================================
void printHelp() {
  Serial.println();
  Serial.println("=========== MotorTest TB6612 ===========");
  Serial.println(" y      ปลดล็อก (ยืนยันว่ายกล้อพ้นพื้นแล้ว)");
  Serial.println(" w s    เดินหน้า / ถอยหลัง");
  Serial.println(" a d    เลี้ยวซ้าย / เลี้ยวขวา");
  Serial.println(" q z    ล้อซ้าย เดินหน้า / ถอย");
  Serial.println(" e c    ล้อขวา เดินหน้า / ถอย");
  Serial.println(" x _    หยุดปล่อยฟรี      b  เบรก");
  Serial.println(" + -    PWM +/- 10        [ ] เวลาสั่ง -/+ 500ms");
  Serial.println(" r      ramp test 80-180  f g สลับทิศซ้าย / ขวา");
  Serial.println(" i      สถานะ             ?  เมนูนี้");
  Serial.println("========================================");
}

void printStatus() {
  Serial.printf("[สถานะ] PWM=%d  เวลาสั่ง=%dms  ปลดล็อก=%s  invert L/R=%s/%s\n",
                pwmLevel, runMs, armed ? "แล้ว" : "ยังไม่",
                invertL ? "ใช่" : "ไม่", invertR ? "ใช่" : "ไม่");
  Serial.printf("        ความเร็วล่าสุด L=%+d R=%+d  %s\n",
                lastSpeedL, lastSpeedR,
                stopAtMs ? "กำลังวิ่ง" : "หยุดอยู่");
}

// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_AIN1, OUTPUT);
  pinMode(PIN_AIN2, OUTPUT);
  pinMode(PIN_BIN1, OUTPUT);
  pinMode(PIN_BIN2, OUTPUT);
  digitalWrite(PIN_AIN1, LOW);
  digitalWrite(PIN_AIN2, LOW);
  digitalWrite(PIN_BIN1, LOW);
  digitalWrite(PIN_BIN2, LOW);

  pwmInit(PIN_PWMA, PWM_CH_A);
  pwmInit(PIN_PWMB, PWM_CH_B);
  pwmWrite(PIN_PWMA, PWM_CH_A, 0);
  pwmWrite(PIN_PWMB, PWM_CH_B, 0);

  if (PIN_STBY >= 0) {
    pinMode(PIN_STBY, OUTPUT);
    digitalWrite(PIN_STBY, HIGH);      // ปลุกไดรเวอร์ ถ้าต่อ 3V3 ตายตัวไม่ต้องใช้
  }

  Serial.println();
  Serial.println("================================================");
  Serial.println(" MotorTest TB6612 — RoboMDT");
  Serial.printf ("  PWMA=%d AIN1=%d AIN2=%d | PWMB=%d BIN1=%d BIN2=%d\n",
                 PIN_PWMA, PIN_AIN1, PIN_AIN2, PIN_PWMB, PIN_BIN1, PIN_BIN2);
  Serial.printf ("  STBY=%s  PWM %dHz %d บิต เพดาน %d\n",
                 PIN_STBY < 0 ? "ต่อ 3V3 ตายตัว" : String(PIN_STBY).c_str(),
                 PWM_FREQ_HZ, PWM_BITS, PWM_CEIL);
  Serial.println("------------------------------------------------");
  Serial.println(" ตรวจก่อนสั่ง: ล้อลอยพ้นพื้น / VM มาจากจุดพักไฟตรง");
  Serial.println(" ไม่ผ่านเบรดบอร์ด / คาปาซิเตอร์ VM ใส่ถูกขั้ว");
  Serial.println(" ตอนนี้ล้อต้องนิ่งสนิท ถ้ากระตุกเองแปลว่าขาควบคุมลอย");
  Serial.println("================================================");
  printHelp();
  Serial.println("\nกด y เมื่อยกล้อพ้นพื้นแล้ว");
}

void loop() {
  // นาฬิกาหยุดอัตโนมัติ — กันคำสั่งค้างวิ่งไม่มีกำหนด
  if (stopAtMs && (long)(millis() - stopAtMs) >= 0) {
    stopAll("ครบเวลา");
  }

  if (!Serial.available()) return;
  char k = Serial.read();
  if (k == '\r' || k == '\n') return;

  switch (k) {
    case 'y': case 'Y':
      armed = true;
      Serial.println("[ปลดล็อก] สั่งมอเตอร์ได้แล้ว — ยังต้องยกล้อพ้นพื้นตลอดการทดสอบ");
      break;

    case 'w': command( pwmLevel,  pwmLevel, "เดินหน้า"); break;
    case 's': command(-pwmLevel, -pwmLevel, "ถอยหลัง");  break;
    case 'a': command(-pwmLevel,  pwmLevel, "เลี้ยวซ้าย"); break;
    case 'd': command( pwmLevel, -pwmLevel, "เลี้ยวขวา"); break;
    case 'q': command( pwmLevel,  0, "ซ้ายหน้า"); break;
    case 'z': command(-pwmLevel,  0, "ซ้ายถอย"); break;
    case 'e': command( 0,  pwmLevel, "ขวาหน้า"); break;
    case 'c': command( 0, -pwmLevel, "ขวาถอย"); break;

    case 'x': case 'X': case ' ':
      stopAll("สั่งหยุด");
      break;

    case 'b': case 'B':
      if (armed) brakeAll();
      break;

    case '+': case '=':
      pwmLevel += 10;
      if (pwmLevel > PWM_CEIL) pwmLevel = PWM_CEIL;
      Serial.printf("[PWM] %d\n", pwmLevel);
      break;

    case '-': case '_':
      pwmLevel -= 10;
      if (pwmLevel < PWM_FLOOR) pwmLevel = PWM_FLOOR;
      Serial.printf("[PWM] %d\n", pwmLevel);
      break;

    case ']':
      runMs += 500;
      if (runMs > RUN_MS_MAX) runMs = RUN_MS_MAX;
      Serial.printf("[เวลาสั่ง] %d ms\n", runMs);
      break;

    case '[':
      runMs -= 500;
      if (runMs < RUN_MS_MIN) runMs = RUN_MS_MIN;
      Serial.printf("[เวลาสั่ง] %d ms\n", runMs);
      break;

    case 'r': case 'R':
      if (!armed) { Serial.println("[ล็อกอยู่] กด y ก่อน"); break; }
      rampTest(true);
      delay(500);
      rampTest(false);
      break;

    case 'f': case 'F':
      invertL = !invertL;
      Serial.printf("[invert ซ้าย] %s — ทางที่ถูกจริงคือปิดไฟแล้วสลับสาย AO1/AO2\n",
                    invertL ? "เปิด" : "ปิด");
      break;

    case 'g': case 'G':
      invertR = !invertR;
      Serial.printf("[invert ขวา] %s — ทางที่ถูกจริงคือปิดไฟแล้วสลับสาย BO1/BO2\n",
                    invertR ? "เปิด" : "ปิด");
      break;

    case 'i': case 'I': printStatus(); break;
    case '?': case 'h': printHelp();   break;

    default:
      Serial.printf("[ไม่รู้จักปุ่ม '%c'] กด ? ดูเมนู\n", k);
      break;
  }
}
