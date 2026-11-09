/*
 * ServoCenter — ตั้งเซอร์โวทุกตัวไว้ตำแหน่งกลาง (90°) ไว้ใส่ฮอร์น/ประกอบให้ตรง ไม่เบี้ยว
 * ใช้: แฟลชลง ESP32 หลัก → เปิดไฟเซอร์โว (UBEC) → เซอร์โวทุกช่องหมุนไปกลางแล้วค้างไว้
 *      ใส่ฮอร์นตอนนี้ ให้แขน/มือ/หัวอยู่ท่ากลาง แล้วค่อยแฟลช RoboPCA9685 กลับ
 * ช่อง (ตรงกับ RoboPCA9685.ino):
 *   CH0 แขนซ้าย MG996R (ยก)   CH1 มือซ้าย MG90S (กาง/หนีบ)
 *   CH2 แขนขวา MG996R (ยก)   CH3 มือขวา MG90S (กาง/หนีบ)
 *   CH4 หัวหัน SG90           CH5 หัวพยัก SG90
 * กลาง = 90° ของช่วงพัลส์รุ่นนั้น: MG996R 500–2500 → 1500 us · MG90S/SG90 500–2400 → 1450 us
 * Serial 115200: พิมพ์ "c" = ส่งกลางซ้ำ · "0"–"5" = ขยับช่องนั้นไป ±20° แล้วกลับกลาง (เช็กว่าต่อถูกช่อง) · "x" = ปล่อยทุกช่อง (ไม่จ่ายพัลส์)
 * ไลบรารี: Adafruit PWM Servo Driver · I2C SDA 21 SCL 22 · PCA9685 0x40
 */
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca(0x40);
const int FREQ = 50;
struct S { uint8_t ch; const char* name; int minUs, maxUs; };
const S SV[] = {
  { 0, "CH0 แขนซ้าย MG996R", 500, 2500 },
  { 1, "CH1 มือซ้าย MG90S",  500, 2400 },
  { 2, "CH2 แขนขวา MG996R", 500, 2500 },
  { 6, "CH6 มือขวา MG90S",  500, 2400 },
  { 4, "CH4 หัวหัน SG90",    500, 2400 },
  { 5, "CH5 หัวพยัก SG90",   500, 2400 },
};
const int N = sizeof(SV) / sizeof(SV[0]);

int degToUs(const S& s, int deg) { return s.minUs + (long)(s.maxUs - s.minUs) * deg / 180; }
void writeUs(uint8_t ch, int us) { pca.setPWM(ch, 0, (long)us * 4096L / (1000000L / FREQ)); }

void centerAll() {
  for (int i = 0; i < N; i++) {
    int us = degToUs(SV[i], 90);
    writeUs(SV[i].ch, us);
    Serial.printf("  %s → 90° (%d us)\n", SV[i].name, us);
    delay(1500);                      // ทีละตัว เว้น 1.5 วิ ดูทันว่าตัวไหนขยับ
  }
  Serial.println("[กลาง] ทุกช่องอยู่ 90° แล้ว — ใส่ฮอร์นได้");
}

void rampTo(int i, int from, int to) {          // ขยับช้า ๆ ทีละ 1° ทุก 30 ms
  int st = to > from ? 1 : -1;
  for (int a = from; a != to; a += st) { writeUs(SV[i].ch, degToUs(SV[i], a)); delay(30); }
  writeUs(SV[i].ch, degToUs(SV[i], to));
}

void wiggle(int i) {
  Serial.printf("[เช็ก] %s ขยับช้า ๆ ±20°\n", SV[i].name);
  rampTo(i, 90, 70); rampTo(i, 70, 110); rampTo(i, 110, 90);
}

void setup() {
  Serial.begin(115200); delay(300);
  Wire.begin(21, 22);
  Wire.beginTransmission(0x40);
  if (Wire.endTransmission() != 0) Serial.println("[ผิด] ไม่เจอ PCA9685 ที่ 0x40 — เช็กสาย SDA21 SCL22 3V3 GND");
  pca.begin();
  pca.setOscillatorFrequency(27000000);
  pca.setPWMFreq(FREQ);
  delay(10);
  for (int i = 0; i < N; i++) pca.setPWM(SV[i].ch, 0, 4096);   // เปิดเครื่องยังไม่จ่ายพัลส์ เซอร์โวไม่กระตุก
  Serial.println("\nServoCenter — ยังไม่จ่ายพัลส์ · พิมพ์ c = ไปกลางทีละตัว (เว้น 1.5 วิ)");
  Serial.println("คำสั่ง: c = กลาง · 0–5 = ขยับช้า ๆ เช็กช่อง · x = ปล่อยทุกช่อง");
}

void loop() {
  if (!Serial.available()) return;
  char c = Serial.read();
  if (c == 'c') centerAll();
  else if (c >= '0' && c < '0' + N) wiggle(c - '0');
  else if (c >= '6' && c <= '9') {                 // ช่องสำรอง CH6–CH9 (โปรไฟล์ MG90S/SG90) ไว้ทดสอบเซอร์โวตัวใหม่
    S g = { (uint8_t)(c - '0'), "ช่องสำรอง", 500, 2400 };
    Serial.printf("[เช็ก] CH%d ขยับช้า ๆ 90→70→110→90\n", c - '0');
    for (int a = 90; a >= 70; a--)  { writeUs(g.ch, degToUs(g, a)); delay(30); }
    for (int a = 70; a <= 110; a++) { writeUs(g.ch, degToUs(g, a)); delay(30); }
    for (int a = 110; a >= 90; a--) { writeUs(g.ch, degToUs(g, a)); delay(30); }
  }
  else if (c == 'x') { for (int i = 0; i < N; i++) pca.setPWM(SV[i].ch, 0, 4096); Serial.println("[ปล่อย] ไม่จ่ายพัลส์แล้ว"); }
}
