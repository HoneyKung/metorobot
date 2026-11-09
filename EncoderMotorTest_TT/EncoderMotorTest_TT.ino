/*
 * =====================================================================
 * EncoderMotorTest_TT.ino — ทดสอบ Encoder ของมอเตอร์ TT 1:90 + วัด RPM
 * =====================================================================
 * ใช้ต่อจาก MotorTest_TB6612.ino เมื่อมอเตอร์ทั้งสองข้างหมุนถูกทิศแล้ว
 * สเก็ตช์นี้เพิ่ม Encoder เข้ามา จึงตอบได้ว่า
 *   - Encoder ต่อถูกไหม อ่านได้จริงไหม
 *   - นับกี่ครั้งต่อการหมุนล้อหนึ่งรอบ (โหมด k)
 *   - ขา GPIO36/39 มีพัลส์หลอกตามอาการที่รู้กันของ ESP32 หรือไม่ (โหมด n)
 *   - PWM ต่ำสุดที่ล้อเริ่มออกตัวจริงคือเท่าไร (โหมด m)
 *   - ที่ PWM แต่ละระดับได้ RPM เท่าไร ซ้ายกับขวาต่างกันแค่ไหน (โหมด t)
 *
 * -------- สายที่ต้องต่อเพิ่มจากสเก็ตช์มอเตอร์ --------
 *   Encoder ซ้าย  A → GPIO34    B → GPIO35
 *   Encoder ขวา   A → GPIO36    B → GPIO39
 *   Encoder VCC   → 3.3V     Encoder GND → GND ร่วม
 *
 *   ✅ ยืนยันแล้ว 7 ก.ย. 2569: บอร์ด Encoder มี pull-up มาในตัวแล้ว
 *      ไม่ต้องเพิ่มตัวต้านทานภายนอกอีก 4 ตัว แม้ว่า GPIO34/35/36/39
 *      จะไม่มี pull-up ภายในก็ตาม สายควบคุม ESP32 → TB6612 หกเส้นก็ต่อตรงได้
 *      เมื่อ TB VCC ใช้ 3.3V
 *
 *   ⚠️ ที่ยังไม่ยืนยันคือแรงดันเลี้ยง Encoder ที่ขา 02 ของหัว PH2.0-6P
 *      ค่า 6V ในตารางสเปกเป็นแรงดันของมอเตอร์ ไม่ใช่ของ Encoder
 *      ต่อขา 02 เข้า 3.3V ตามผัง และ "ห้ามเปลี่ยนไปใช้ 5V เอง"
 *      เพราะ pull-up บนบอร์ดจะดัน A/B ขึ้นตามไฟที่เลี้ยง กลายเป็น 5V เข้า ESP32 ตรง ๆ
 *      วิธียืนยัน: เลี้ยง 3.3V แล้วกด h หมุนล้อด้วยมือ
 *      ถ้า A/B สลับ 0/1 ได้ = ใช้ 3.3V ได้จริง ถ้าค้างระดับเดิม ให้หยุดแล้วตรวจรุ่นชิป
 *
 *   ขา 05 ของหัว PH2.0-6P คือ Encoder GND (ข้อความไทยในรูปชุดก่อนพิมพ์ผิด)
 *
 *   ℹ️ ขา ADC1 มีแค่หกขา (32/33/34/35/36/39) มอเตอร์กิน 32/33 ไปแล้ว
 *      เหลือสี่ขาพอดีให้ Encoder ซึ่งสเก็ตช์นี้ใช้ครบทั้งสี่
 *      ผลพลอยได้คือ "ไม่มีขาเหลือให้วัดแรงดันแบตด้วย ADC ของ ESP32 อีกแล้ว"
 *      รอบนี้จึงตัดเรื่องแบตบนจอออกไปก่อน ถ้าจะทำจริงต้องใช้โมดูล ADS1115
 *      ต่อบนสาย I2C เส้นเดิม (SDA=21 SCL=22) แล้วอ่านแรงดันผ่าน I2C แทน
 *
 * -------- ปุ่มบน Serial Monitor 115200 --------
 *   y       ปลดล็อกมอเตอร์ (ยืนยันว่ายกล้อพ้นพื้นแล้ว)
 *   0       ล้างตัวนับทั้งสองข้างเป็นศูนย์
 *   p       พิมพ์ค่านับดิบ + ระดับลอจิกปัจจุบันของทั้งสี่ขา
 *   h       โหมดหมุนด้วยมือ — พิมพ์ค่านับทุก 0.5 วิ กดปุ่มใดก็ได้เพื่อออก
 *   n       ทดสอบพัลส์หลอก 10 วิ โดยห้ามแตะล้อ (ตรวจ GPIO36/39 และสายลอย)
 *   k       สอบเทียบจำนวนนับต่อล้อหนึ่งรอบ (กด k → หมุนมือ 1 รอบ → กด k อีกที)
 *   m       หาค่า PWM ต่ำสุดที่ล้อเริ่มหมุนจริง ทีละข้าง
 *   t       ตารางเทียบ PWM กับ RPM ที่ 80/100/120/140/160/180
 *   w s a d q z e c   สั่งมอเตอร์เหมือนสเก็ตช์ MotorTest
 *   x เว้นวรรค  หยุด          b  เบรก
 *   + -     PWM +/- 10       [ ] เวลาสั่ง -/+ 500ms
 *   f g     สลับทิศซ้าย / ขวา ในซอฟต์แวร์
 *   i       สถานะ            ?  เมนู
 * =====================================================================
 */

// =====================================================================
// พิน
// =====================================================================
const int PIN_PWMA = 26;   // มอเตอร์ซ้าย — M03/M04/M05
const int PIN_AIN1 = 27;
const int PIN_AIN2 = 14;
const int PIN_PWMB = 25;   // มอเตอร์ขวา — M06/M07/M08
const int PIN_BIN1 = 32;
const int PIN_BIN2 = 33;
const int PIN_STBY = -1;   // ต่อ 3V3 ตายตัวตามคู่มือ

const int ENC_L_A = 34;
const int ENC_L_B = 35;
const int ENC_R_A = 36;
const int ENC_R_B = 39;

// 1 = ถอดรหัส quadrature เต็ม x4 ทั้งสองข้าง (ค่าเริ่มต้น)
// 0 = ฝั่งขวานับเฉพาะขา A ขอบขาขึ้น แล้วเอาทิศจากคำสั่งมอเตอร์
//     ใช้เมื่อโหมด n บอกว่า GPIO36/39 มีพัลส์หลอกจนนับเพี้ยน
#define ENC_R_QUADRATURE 1

// จำนวนนับต่อการหมุน "ล้อ" หนึ่งรอบ — ค่าอ้างอิงจากเอกสารเดิม
// x4 ได้ประมาณ 4680 ส่วนแบบนับขอบเดียวได้ประมาณ 1170
// อย่าเชื่อค่านี้ก่อนวัด ให้ใช้โหมด k สอบเทียบกับล้อจริงแล้วค่อยแก้ตัวเลข
#define COUNTS_PER_REV_L 4680.0f
#if ENC_R_QUADRATURE
  #define COUNTS_PER_REV_R 4680.0f
#else
  #define COUNTS_PER_REV_R 1170.0f
#endif

// สเปกมอเตอร์ไว้เทียบผล: TT 1:90 ที่ 6V หมุนเปล่าราว 175 RPM
#define RPM_REFERENCE 175.0f

// =====================================================================
// ค่าตั้ง PWM — กติกาเดียวกับ MotorTest_TB6612.ino
// =====================================================================
#define PWM_FREQ_HZ  20000
#define PWM_BITS     8
#define PWM_CH_A     0
#define PWM_CH_B     1
#define PWM_START    90
#define PWM_FLOOR    60
#define PWM_CEIL     180
#define RUN_MS_START 1500
#define RUN_MS_MIN   500
#define RUN_MS_MAX   5000

// =====================================================================
// ตัวนับ Encoder
// =====================================================================
portMUX_TYPE encMux = portMUX_INITIALIZER_UNLOCKED;
volatile int32_t encL = 0;
volatile int32_t encR = 0;
volatile uint8_t stateL = 0;
volatile uint8_t stateR = 0;
volatile int8_t  cmdDirR = 1;   // ใช้เฉพาะโหมดนับขอบเดียวฝั่งขวา

// ตารางถอดรหัส quadrature: index = (สถานะก่อน << 2) | สถานะใหม่
// สถานะ = (A << 1) | B  ช่องที่เป็น 0 คือกระโดดข้ามขั้น = สัญญาณรบกวน

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

static const int8_t QDEC[16] = {
   0, -1,  1,  0,
   1,  0,  0, -1,
  -1,  0,  0,  1,
   0,  1, -1,  0
};

void IRAM_ATTR isrLeft() {
  uint8_t s = (uint8_t)((digitalRead(ENC_L_A) << 1) | digitalRead(ENC_L_B));
  portENTER_CRITICAL_ISR(&encMux);
  stateL = (uint8_t)(((stateL << 2) | s) & 0x0F);
  encL += ENC_SIGN_L * QDEC[stateL];
  portEXIT_CRITICAL_ISR(&encMux);
}

#if ENC_R_QUADRATURE
void IRAM_ATTR isrRight() {
  uint8_t s = (uint8_t)((digitalRead(ENC_R_A) << 1) | digitalRead(ENC_R_B));
  portENTER_CRITICAL_ISR(&encMux);
  stateR = (uint8_t)(((stateR << 2) | s) & 0x0F);
  encR += ENC_SIGN_R * QDEC[stateR];
  portEXIT_CRITICAL_ISR(&encMux);
}
#else
void IRAM_ATTR isrRight() {
  portENTER_CRITICAL_ISR(&encMux);
  encR += cmdDirR;   // โหมดขอบเดียว ทิศมาจากคำสั่งอยู่แล้ว ไม่ต้องใช้ ENC_SIGN_R
  portEXIT_CRITICAL_ISR(&encMux);
}
#endif

int32_t readEncL() {
  portENTER_CRITICAL(&encMux);
  int32_t v = encL;
  portEXIT_CRITICAL(&encMux);
  return v;
}

int32_t readEncR() {
  portENTER_CRITICAL(&encMux);
  int32_t v = encR;
  portEXIT_CRITICAL(&encMux);
  return v;
}

void zeroEncoders() {
  portENTER_CRITICAL(&encMux);
  encL = 0;
  encR = 0;
  portEXIT_CRITICAL(&encMux);
}

// =====================================================================
// สถานะทั่วไป
// =====================================================================
int  pwmLevel = PWM_START;
int  runMs    = RUN_MS_START;
bool armed    = false;
bool invertL  = false;
bool invertR  = false;
unsigned long stopAtMs = 0;
int  lastSpeedL = 0;
int  lastSpeedR = 0;

// วัด RPM แบบสุ่มตัวอย่างทุก 200 ms
unsigned long lastSampleMs = 0;
int32_t lastCountL = 0;
int32_t lastCountR = 0;
float rpmL = 0.0f;
float rpmR = 0.0f;

// =====================================================================
// LEDC — รองรับ ESP32 core 2.x และ 3.x
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
// ขับมอเตอร์ — เหมือน MotorTest_TB6612.ino
// =====================================================================
void driveMotor(bool isLeft, int speed) {
  const int pinPwm = isLeft ? PIN_PWMA : PIN_PWMB;
  const int pinIn1 = isLeft ? PIN_AIN1 : PIN_BIN1;
  const int pinIn2 = isLeft ? PIN_AIN2 : PIN_BIN2;
  const int ch     = isLeft ? PWM_CH_A : PWM_CH_B;

  if (isLeft ? invertL : invertR) speed = -speed;

  if (!isLeft && speed != 0) cmdDirR = (speed > 0) ? 1 : -1;

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

  if (isLeft) lastSpeedL = speed; else lastSpeedR = speed;
}

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

void command(int speedL, int speedR, const char* label) {
  if (!armed) {
    Serial.println("[ล็อกอยู่] ยกล้อพ้นพื้นแล้วกด y ก่อนหนึ่งครั้ง");
    return;
  }
  driveMotor(true,  speedL);
  driveMotor(false, speedR);
  stopAtMs = millis() + runMs;
  Serial.printf("[สั่ง] %-10s L=%+4d R=%+4d  หยุดเองใน %d ms\n",
                label, speedL, speedR, runMs);
}

// อ่าน RPM แบบวัดเป็นช่วง — ใช้ในโหมด m และ t
// คืนค่า RPM เฉลี่ยจากจำนวนนับที่เดินไปในช่วง windowMs
void measureRpm(int windowMs, float* outL, float* outR) {
  int32_t c0L = readEncL();
  int32_t c0R = readEncR();
  unsigned long t0 = millis();
  delay(windowMs);
  int32_t dL = readEncL() - c0L;
  int32_t dR = readEncR() - c0R;
  float dt = (float)(millis() - t0) / 1000.0f;
  if (dt <= 0.0f) dt = 0.001f;
  *outL = (dL / COUNTS_PER_REV_L) / dt * 60.0f;
  *outR = (dR / COUNTS_PER_REV_R) / dt * 60.0f;
}

// =====================================================================
// โหมดทดสอบ
// =====================================================================

// พิมพ์ค่านับดิบและระดับลอจิก — ใช้ดูว่าสายมาถึงจริงไหม
void printRaw() {
  Serial.printf("[ดิบ] L=%-8ld R=%-8ld | ระดับขา  LA=%d LB=%d RA=%d RB=%d\n",
                (long)readEncL(), (long)readEncR(),
                digitalRead(ENC_L_A), digitalRead(ENC_L_B),
                digitalRead(ENC_R_A), digitalRead(ENC_R_B));
}

// หมุนล้อด้วยมือแล้วดูค่าเดิน
void handTurnMode() {
  Serial.println("\n[โหมดมือ] หมุนล้อช้า ๆ ด้วยมือ ค่าต้องเดินขึ้นทางเดียวเมื่อหมุนทางเดียว");
  Serial.println("          หมุนกลับทางแล้วค่าต้องลด ถ้าค่ากระโดดสองทางแปลว่าสัญญาณรบกวน");
  Serial.println("          กดปุ่มใดก็ได้เพื่อออก");
  while (!Serial.available()) {
    printRaw();
    delay(500);
  }
  while (Serial.available()) Serial.read();
  Serial.println("[โหมดมือ] ออกแล้ว");
}

// ตรวจพัลส์หลอก — มอเตอร์ดับสนิท ห้ามแตะล้อ 10 วินาที
void noiseTest() {
  stopAll(nullptr);
  Serial.println("\n[ทดสอบพัลส์หลอก] อย่าแตะล้อ 10 วินาที กำลังนับ...");
  delay(300);
  int32_t a = readEncL();
  int32_t b = readEncR();
  for (int s = 10; s > 0; s--) {
    delay(1000);
    Serial.printf("   เหลือ %2d วิ  ค่าเดินไป L=%+ld R=%+ld\n",
                  s - 1, (long)(readEncL() - a), (long)(readEncR() - b));
  }
  int32_t dL = readEncL() - a;
  int32_t dR = readEncR() - b;
  Serial.println("   --------------------------------------------");
  Serial.printf("   สรุป: ซ้ายเดินไป %+ld  ขวาเดินไป %+ld\n", (long)dL, (long)dR);
  if (dL == 0 && dR == 0) {
    Serial.println("   ผ่าน — ไม่มีพัลส์หลอก");
  } else {
    if (labs(dL) > 0)
      Serial.println("   ซ้าย (GPIO34/35) มีค่าเดินเอง — ตรวจสายหลวม กราวนด์ร่วม และสายมอเตอร์ที่เดินชิดสายสัญญาณ");
    if (labs(dR) > 0)
      Serial.println("   ขวา (GPIO36/39) มีค่าเดินเอง — นี่คืออาการพัลส์หลอกที่รู้กันของ ESP32");
    Serial.println("   แก้ที่สายก่อน (บอร์ดมี pull-up มาในตัวแล้ว) หรือ");
    Serial.println("   ตั้ง ENC_R_QUADRATURE เป็น 0 แล้วนับขอบเดียวฝั่งขวา");
  }
  Serial.println("   ระดับขาค้างที่ค่าเดิมแม้หมุนล้อ = Encoder ไม่มีไฟ สายขาด หรือชิปต้องการไฟสูงกว่า 3.3V");
}

// สอบเทียบจำนวนนับต่อล้อหนึ่งรอบ
bool calibRunning = false;
int32_t calibStartL = 0;
int32_t calibStartR = 0;

void calibToggle() {
  if (!calibRunning) {
    calibStartL = readEncL();
    calibStartR = readEncR();
    calibRunning = true;
    Serial.println("\n[สอบเทียบ] เริ่มนับแล้ว");
    Serial.println("  1. ติดเทปหนึ่งจุดที่ยาง และอีกจุดที่ตัวถัง เล็งให้สองจุดตรงกันก่อนเริ่ม");
    Serial.println("  2. หมุนล้อด้วยมือ 10 รอบ นับจำนวนครั้งที่เทปผ่านจุดเดิม");
    Serial.println("  3. หยุดตอนเทปกลับมาตรงกันพอดี แล้วกด k อีกครั้ง");
    Serial.println("  หมุนหลายรอบแล้วหารเอา คลาดเคลื่อนน้อยกว่าหมุนรอบเดียว 10 เท่า");
    Serial.println("  ทำทีละล้อก็ได้ อีกล้อที่ไม่หมุนจะได้ค่าใกล้ 0");
  } else {
    calibRunning = false;
    int32_t dL = readEncL() - calibStartL;
    int32_t dR = readEncR() - calibStartR;
    Serial.printf("[สอบเทียบ] นับรวมทั้งหมด ซ้าย %+ld  ขวา %+ld\n", (long)dL, (long)dR);
    Serial.println("  เลือกบรรทัดที่ตรงกับจำนวนรอบที่หมุนจริง แล้วเอาเลขนั้นไปใส่:");
    const int turnTable[] = {1, 2, 5, 10, 20};
    for (unsigned ti = 0; ti < sizeof(turnTable)/sizeof(turnTable[0]); ti++) {
      int t = turnTable[ti];
      Serial.printf("     หมุน %2d รอบ  →  L=%7.0f   R=%7.0f\n",
                    t, fabsf((float)dL)/t, fabsf((float)dR)/t);
    }
    Serial.printf("  ค่าที่โค้ดใช้อยู่ตอนนี้คือ L=%.0f R=%.0f\n",
                  COUNTS_PER_REV_L, COUNTS_PER_REV_R);
    Serial.println("  ถ้าต่างจากนี้ ให้แก้ COUNTS_PER_REV_L/R ที่หัวไฟล์แล้วแฟลชใหม่");
    Serial.println("  เครื่องหมายไม่ต้องสนใจ ตารางนี้คิดจากค่าสัมบูรณ์ให้แล้ว");
  }
}

// หา PWM ต่ำสุดที่ล้อออกตัวจริง
void findMinPwm(bool isLeft) {
  const char* name = isLeft ? "ซ้าย" : "ขวา";
  Serial.printf("\n[หา PWM ต่ำสุด] ล้อ%s\n", name);
  int found = -1;
  for (int p = PWM_FLOOR; p <= PWM_CEIL; p += 5) {
    driveMotor(isLeft, p);
    delay(150);                       // รอให้ออกตัว
    float a, b;
    measureRpm(350, &a, &b);
    float rpm = isLeft ? a : b;
    driveMotor(isLeft, 0);
    Serial.printf("   PWM %3d → %6.1f RPM\n", p, rpm);
    if (found < 0 && fabsf(rpm) > 5.0f) {
      found = p;
      Serial.printf("   ↑ ออกตัวที่ PWM %d\n", p);
      break;
    }
    delay(200);
    if (Serial.available()) { while (Serial.available()) Serial.read(); break; }
  }
  stopAll(nullptr);
  if (found < 0)
    Serial.printf("   ล้อ%s ไม่ออกตัวเลยจนถึง PWM %d — ตรวจสาย Encoder หรือมอเตอร์ก่อน\n",
                  name, PWM_CEIL);
}

// ตารางเทียบ PWM กับ RPM
void rpmTable() {
  const int levels[] = {80, 100, 120, 140, 160, 180};
  Serial.println("\n[ตาราง PWM → RPM] ล้อลอยพ้นพื้น วัดข้างละ 0.6 วิ");
  Serial.println("  PWM |  ซ้าย RPM |  ขวา RPM | ต่าง%");
  Serial.println("  ----+-----------+----------+------");
  for (unsigned i = 0; i < sizeof(levels) / sizeof(levels[0]); i++) {
    int p = levels[i];
    driveMotor(true, p);
    driveMotor(false, p);
    delay(250);
    float a, b;
    measureRpm(600, &a, &b);
    stopAll(nullptr);
    float diff = (fabsf(a) > 1.0f) ? (fabsf(a - b) / fabsf(a) * 100.0f) : 0.0f;
    Serial.printf("  %3d | %9.1f | %8.1f | %4.1f%%\n", p, a, b, diff);
    delay(400);
    if (Serial.available()) { while (Serial.available()) Serial.read(); break; }
  }
  Serial.printf("  อ้างอิง: TT 1:90 ที่ 6V หมุนเปล่าราว %.0f RPM\n", RPM_REFERENCE);
  Serial.println("  เครื่องหมายต่างกันสองข้างเป็นเรื่องปกติ เพราะมอเตอร์สองตัวติดกลับด้านกัน");
  Serial.println("  ให้ดูที่ล้อจริง: ถ้าทั้งสองล้อดันหุ่นไปข้างหน้า = ถูกแล้ว แก้แค่เครื่องหมาย");
  Serial.println("  โดยสลับเลข ENC_?_A กับ ENC_?_B ของข้างที่ติดลบ ไม่ต้องแตะสายมอเตอร์");
  Serial.println("  สองข้างต่างกันเกิน 15% แปลว่าต้องชดเชยในโค้ดเดินตรงภายหลัง");
}

// =====================================================================
void printHelp() {
  Serial.println();
  Serial.println("======= EncoderMotorTest TT 1:90 =======");
  Serial.println(" y    ปลดล็อกมอเตอร์      0  ล้างตัวนับ");
  Serial.println(" p    ค่านับดิบ + ระดับขา  h  โหมดหมุนด้วยมือ");
  Serial.println(" n    ทดสอบพัลส์หลอก 10 วิ k  สอบเทียบนับต่อรอบ");
  Serial.println(" m    หา PWM ต่ำสุด        t  ตาราง PWM → RPM");
  Serial.println(" wsad qzec  สั่งมอเตอร์    x  หยุด    b เบรก");
  Serial.println(" + -  PWM +/-10           [ ] เวลาสั่ง");
  Serial.println(" f g  สลับทิศ ซ้าย/ขวา     i  สถานะ   ? เมนู");
  Serial.println("========================================");
}

void printStatus() {
  Serial.printf("[สถานะ] PWM=%d  เวลาสั่ง=%dms  ปลดล็อก=%s  invert L/R=%s/%s\n",
                pwmLevel, runMs, armed ? "แล้ว" : "ยังไม่",
                invertL ? "ใช่" : "ไม่", invertR ? "ใช่" : "ไม่");
  Serial.printf("        นับ L=%ld R=%ld | RPM L=%.1f R=%.1f | %s\n",
                (long)readEncL(), (long)readEncR(), rpmL, rpmR,
                stopAtMs ? "กำลังวิ่ง" : "หยุดอยู่");
  Serial.printf("        นับต่อรอบที่ใช้อยู่ L=%.0f R=%.0f | ฝั่งขวา %s\n",
                COUNTS_PER_REV_L, COUNTS_PER_REV_R,
                ENC_R_QUADRATURE ? "quadrature x4" : "นับขอบเดียว");
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
    digitalWrite(PIN_STBY, HIGH);
  }

  // GPIO34-39 เป็น input อย่างเดียว ใส่ INPUT เฉย ๆ
  // ขอ pull-up ภายในไม่ได้ — ใช้ pull-up ที่มากับบอร์ด Encoder แทน
  pinMode(ENC_L_A, INPUT);
  pinMode(ENC_L_B, INPUT);
  pinMode(ENC_R_A, INPUT);
  pinMode(ENC_R_B, INPUT);

  stateL = (uint8_t)((digitalRead(ENC_L_A) << 1) | digitalRead(ENC_L_B));
  stateR = (uint8_t)((digitalRead(ENC_R_A) << 1) | digitalRead(ENC_R_B));

  attachInterrupt(digitalPinToInterrupt(ENC_L_A), isrLeft,  CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_L_B), isrLeft,  CHANGE);
#if ENC_R_QUADRATURE
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), isrRight, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_R_B), isrRight, CHANGE);
#else
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), isrRight, RISING);
#endif

  Serial.println();
  Serial.println("================================================");
  Serial.println(" EncoderMotorTest — RoboMDT (TT 1:90)");
  Serial.printf ("  มอเตอร์ PWMA=%d AIN1=%d AIN2=%d | PWMB=%d BIN1=%d BIN2=%d\n",
                 PIN_PWMA, PIN_AIN1, PIN_AIN2, PIN_PWMB, PIN_BIN1, PIN_BIN2);
  Serial.printf ("  Encoder ซ้าย A=%d B=%d | ขวา A=%d B=%d\n",
                 ENC_L_A, ENC_L_B, ENC_R_A, ENC_R_B);
  Serial.println("------------------------------------------------");
  Serial.println(" ลำดับที่แนะนำ:  p → h → n → k → y → m → t");
  Serial.println(" (ดูสาย → หมุนมือ → เช็คพัลส์หลอก → สอบเทียบ → ปลดล็อก → วัด)");
  Serial.println("================================================");
  printHelp();
  printRaw();
  lastSampleMs = millis();
}

void loop() {
  // หยุดอัตโนมัติเมื่อครบเวลา
  if (stopAtMs && (long)(millis() - stopAtMs) >= 0) {
    stopAll("ครบเวลา");
  }

  // วัด RPM ต่อเนื่องทุก 200 ms ไว้ให้คำสั่ง i อ่าน
  unsigned long now = millis();
  if (now - lastSampleMs >= 200) {
    int32_t cL = readEncL();
    int32_t cR = readEncR();
    float dt = (now - lastSampleMs) / 1000.0f;
    rpmL = ((cL - lastCountL) / COUNTS_PER_REV_L) / dt * 60.0f;
    rpmR = ((cR - lastCountR) / COUNTS_PER_REV_R) / dt * 60.0f;
    lastCountL = cL;
    lastCountR = cR;
    lastSampleMs = now;

    // ระหว่างสั่งวิ่ง พิมพ์ RPM สด ๆ ให้เห็นทันทีว่าล้อไหนไม่หมุน
    if (stopAtMs) {
      Serial.printf("   L=%+7.1f RPM  R=%+7.1f RPM\n", rpmL, rpmR);
      if (lastSpeedL > 0 && rpmL < -5.0f)
        Serial.println("   ! ซ้ายนับติดลบ — ดูล้อจริงก่อน ถ้าล้อดันหุ่นไปหน้าอยู่แล้ว");
        Serial.println("     ให้สลับเลข ENC_L_A กับ ENC_L_B ไม่ใช่สลับสายมอเตอร์");
      if (lastSpeedR > 0 && rpmR < -5.0f)
        Serial.println("   ! ขวานับติดลบ — ดูล้อจริงก่อน ถ้าล้อดันหุ่นไปหน้าอยู่แล้ว");
        Serial.println("     ให้สลับเลข ENC_R_A กับ ENC_R_B ไม่ใช่สลับสายมอเตอร์");
      if (lastSpeedL != 0 && fabsf(rpmL) < 1.0f)
        Serial.println("   ⚠ ซ้ายสั่งแล้วแต่นับไม่เดิน — มอเตอร์ไม่หมุน หรือ Encoder ซ้ายไม่ทำงาน");
      if (lastSpeedR != 0 && fabsf(rpmR) < 1.0f)
        Serial.println("   ⚠ ขวาสั่งแล้วแต่นับไม่เดิน — มอเตอร์ไม่หมุน หรือ Encoder ขวาไม่ทำงาน");
    }
  }

  if (!Serial.available()) return;
  char k = Serial.read();
  if (k == '\r' || k == '\n') return;

  switch (k) {
    case 'y': case 'Y':
      armed = true;
      Serial.println("[ปลดล็อก] สั่งมอเตอร์ได้แล้ว — ยกล้อพ้นพื้นตลอดการทดสอบ");
      break;

    case '0': zeroEncoders(); lastCountL = 0; lastCountR = 0;
              Serial.println("[ล้างตัวนับ] เป็นศูนย์ทั้งสองข้าง"); break;
    case 'p': case 'P': printRaw();     break;
    case 'h': case 'H': handTurnMode(); break;
    case 'n': case 'N': noiseTest();    break;
    case 'k': case 'K': calibToggle();  break;

    case 'm': case 'M':
      if (!armed) { Serial.println("[ล็อกอยู่] กด y ก่อน"); break; }
      findMinPwm(true);
      delay(400);
      findMinPwm(false);
      break;

    case 't': case 'T':
      if (!armed) { Serial.println("[ล็อกอยู่] กด y ก่อน"); break; }
      rpmTable();
      break;

    case 'w': command( pwmLevel,  pwmLevel, "เดินหน้า"); break;
    case 's': command(-pwmLevel, -pwmLevel, "ถอยหลัง");  break;
    case 'a': command(-pwmLevel,  pwmLevel, "เลี้ยวซ้าย"); break;
    case 'd': command( pwmLevel, -pwmLevel, "เลี้ยวขวา"); break;
    case 'q': command( pwmLevel,  0, "ซ้ายหน้า"); break;
    case 'z': command(-pwmLevel,  0, "ซ้ายถอย"); break;
    case 'e': command( 0,  pwmLevel, "ขวาหน้า"); break;
    case 'c': command( 0, -pwmLevel, "ขวาถอย"); break;

    case 'x': case 'X': case ' ': stopAll("สั่งหยุด"); break;

    case 'b': case 'B':
      if (armed) { brakeMotor(true); brakeMotor(false); stopAtMs = 0;
                   Serial.println("[เบรก] กด x เพื่อปล่อยฟรี"); }
      break;

    case '+': case '=':
      pwmLevel = min(pwmLevel + 10, PWM_CEIL);
      Serial.printf("[PWM] %d\n", pwmLevel); break;

    case '-': case '_':
      pwmLevel = max(pwmLevel - 10, PWM_FLOOR);
      Serial.printf("[PWM] %d\n", pwmLevel); break;

    case ']':
      runMs = min(runMs + 500, RUN_MS_MAX);
      Serial.printf("[เวลาสั่ง] %d ms\n", runMs); break;

    case '[':
      runMs = max(runMs - 500, RUN_MS_MIN);
      Serial.printf("[เวลาสั่ง] %d ms\n", runMs); break;

    case 'f': case 'F':
      invertL = !invertL;
      Serial.printf("[invert ซ้าย] %s\n", invertL ? "เปิด" : "ปิด"); break;

    case 'g': case 'G':
      invertR = !invertR;
      Serial.printf("[invert ขวา] %s\n", invertR ? "เปิด" : "ปิด"); break;

    case 'i': case 'I': printStatus(); break;
    case '?': printHelp(); break;

    default:
      Serial.printf("[ไม่รู้จักปุ่ม '%c'] กด ? ดูเมนู\n", k);
      break;
  }
}
