# สเปกแก้โค้ด RoboMDT: ไม่ใช้แบตเตอรี่ ใช้ ESP32 + PCA9685 + TFT

เอกสารนี้คือฉบับหลักสำหรับแก้โค้ดรอบปัจจุบัน ให้ยกเลิกผังที่ต่อ Servo ตรงกับ GPIO25, GPIO26, GPIO27 และ GPIO32 เพราะ Servo ทุกตัวต้องเสียบอยู่บน PCA9685

## 1. ขอบเขตฮาร์ดแวร์รอบนี้

ต่อเฉพาะ:

- ESP32 DevKit 38 pin รับไฟจาก USB
- จอแดง ST7789 ใช้เฉพาะส่วนแสดงผล; ขา touch ยังไม่ใช้
- PCA9685
- MG996R สองตัวสำหรับแขน
- SG90 สองตัวสำหรับหัวหันและหัวก้มเงย
- แหล่งจ่าย USB 5V แยกสำหรับ Servo

ยังไม่ต่อแบตเตอรี่, BMS, สวิตช์, LM2596, XH-M401, TB6612, มอเตอร์ล้อ, XIAO และเซนเซอร์

## 2. ผังไฟแบบไม่ใช้แบตเตอรี่

```text
USB จากคอมพิวเตอร์ → ESP32

แหล่งจ่าย USB 5V แยก ขั้ว + → PCA9685 ขั้วสกรู V+
แหล่งจ่าย USB 5V แยก ขั้ว - → PCA9685 ขั้วสกรู GND

ESP32 3V3 → PCA9685 ขา Logic VCC
ESP32 GND → PCA9685 ขา Logic GND
```

ขั้วสกรู GND และขา Logic GND บน PCA9685 เป็น GND เดียวกัน ควรตรวจด้วยมัลติมิเตอร์โหมดต่อเนื่องขณะปิดไฟก่อนใช้งาน

ห้ามต่อขั้วสกรู `V+` เข้ากับ ESP32 `3V3`, `5V` หรือ `VIN` และห้ามใช้ USB ของ ESP32 เลี้ยง Servo

## 3. PCA9685 ต่อกับ ESP32

| PCA9685 | ESP32 |
|---|---:|
| `VCC` | `3V3` |
| Logic `GND` | `GND` |
| `SDA` | GPIO21 |
| `SCL` | GPIO22 |
| `OE` | GND |
| ขั้วสกรู `V+` | 5V จากแหล่งจ่าย Servo แยก |
| ขั้วสกรู `GND` | GND จากแหล่งจ่าย Servo แยก |

I2C address ใช้ค่าเริ่มต้น `0x40`

## 4. ช่อง Servo ที่ยืนยันใช้

| ช่อง PCA9685 | Servo | หน้าที่ |
|---:|---|---|
| CH0 | MG996R | แขนซ้าย |
| CH1 | ไม่เสียบ | สำรอง |
| CH2 | MG996R | แขนขวา |
| CH3 | ไม่เสียบ | สำรอง |
| CH4 | SG90 | หัวหันซ้าย–ขวา |
| CH5 | SG90 | หัวก้ม–เงย |

การเสียบหัว Servo ที่ PCA9685:

```text
สายส้ม/เหลือง/ขาว → Signal
สายแดง             → V+
สายน้ำตาล/ดำ        → GND
```

ต้องตรวจสัญลักษณ์ `S`, `+`, `-` ที่บอร์ดจริงก่อนเสียบ เพราะสีสายบางยี่ห้ออาจต่างกัน

## 5. TFT ต่อแบบสายเรียงไม่ไขว้

ลำดับขาจอจริงคือ `SCK, SDI, DC, RST, CS` และเรียงตรงกับ GPIO ฝั่ง ESP32 ดังนี้:

```text
TFT SCK → GPIO18
TFT SDI → GPIO5
TFT DC  → GPIO17
TFT RST → GPIO16
TFT CS  → GPIO4
```

เมื่อมองย้อนทิศจาก GPIO18 จะตรงกับลำดับขาบอร์ด:

```text
GPIO18 — GPIO5 — GPIO17 — GPIO16 — GPIO4
  SCK       SDI       DC        RST       CS
```

ขาอื่นของจอ:

| TFT | ESP32 |
|---|---|
| `VCC` | `3V3` |
| `GND` | `GND` |
| `SDO/MISO` | ไม่ต่อ |
| `LED/BL` | 3V3 ผ่าน R 100Ω หากบอร์ดไม่มี R จำกัดกระแส |
| ขา Touch ทั้งหมด | ยังไม่ต่อ |

## 6. ค่าที่ต้องแก้ใน TFT_eSPI

แก้ไฟล์ setup ที่ถูกเลือกใช้งานจริงของ TFT_eSPI ให้เป็น:

```cpp
#define TFT_MISO -1
#define TFT_MOSI 5
#define TFT_SCLK 18
#define TFT_CS   4
#define TFT_DC   17
#define TFT_RST  16
```

ต้องเปิด `ST7789_DRIVER`, ใช้ `TFT_HEIGHT 320`, ลำดับสี `TFT_BGR` และตรวจว่าไม่มี driver ตัวอื่นถูกเปิดซ้ำ ค่า native คือ 240×320 พิกเซล และ `setRotation(1)` ทำให้ใช้งานเป็น 320×240 พิกเซล

## 7. สิ่งที่ต้องแก้ใน Robo.ino

โค้ดปัจจุบันใช้ `ESP32Servo` และสั่ง Servo ตรงผ่าน GPIO จึงไม่ตรงกับวงจรจริง ต้องแก้ดังนี้:

1. เลิกใช้ `#include <ESP32Servo.h>` และเลิกประกาศวัตถุ `Servo` แบบเดิม
2. เพิ่ม `Wire` และไลบรารี `Adafruit_PWMServoDriver`
3. เริ่ม I2C ด้วย `Wire.begin(21, 22)`
4. เริ่ม PCA9685 address `0x40` และตั้ง PWM `50Hz`
5. เปลี่ยนทุกจุดที่ใช้ `.attach()`, `.write()`, `.detach()` ให้เรียกฟังก์ชันสั่งมุมผ่าน PCA9685
6. ใช้ channel constants ตามนี้:

```cpp
constexpr uint8_t SERVO_ARM_LEFT_CH   = 0;
constexpr uint8_t SERVO_ARM_RIGHT_CH  = 2;
constexpr uint8_t SERVO_HEAD_YAW_CH   = 4;
constexpr uint8_t SERVO_HEAD_TILT_CH  = 5;
```

7. แมปตัวแปรเดิมดังนี้:

```text
servoArm1 / moveArm1 → CH0 แขนซ้าย
servoArm2 / moveArm2 → CH2 แขนขวา
servoHead / moveHead → CH4 หัวหันซ้าย–ขวา
เพิ่ม moveHeadTilt   → CH5 หัวก้ม–เงย
```

8. ปิดการใช้งาน `servoHand1`, `servoHand2`, `moveHand1`, `moveHand2`, `gripSync`, `gripRelease` และคำสั่งมือทั้งหมด เพราะรอบนี้ไม่มี Servo มือ
9. ปิดการตั้งขาและคำสั่งมอเตอร์ทั้งหมด เพราะรอบนี้ไม่ต่อ TB6612 หรือมอเตอร์ล้อ
10. ห้ามใช้ GPIO25, GPIO26, GPIO27 และ GPIO32 เป็นขา Servo อีก

## 8. รูปแบบฟังก์ชัน PCA9685 ที่ต้องมี

Claude ต้องสร้างฟังก์ชันกลางที่รับ channel, angle, minUs และ maxUs แล้วแปลงไมโครวินาทีเป็น tick 12-bit ของ PCA9685 ที่ 50Hz ก่อนเรียก `setPWM()` ต้องจำกัดมุมให้อยู่ในช่วงปลอดภัยของ Servo แต่ละตัว

การแทน `.detach()` ให้ใช้วิธีสั่ง channel นั้นเป็น full-off เฉพาะเมื่อกลไกไม่ต้องใช้แรงค้างตำแหน่ง หากแขนต้องรับน้ำหนัก ห้าม full-off เพราะแขนอาจตก

## 9. พฤติกรรมตอนเปิดเครื่อง

- ห้ามสั่ง Servo ทั้งสี่ตัวกระชากพร้อมกันใน `setup()`
- เริ่มจากตรวจพบ PCA9685 ที่ `0x40`
- ตั้งตำแหน่งปลอดภัยทีละช่อง โดยเว้นช่วงระหว่างช่อง
- การทดสอบครั้งแรกต้องถอดกลไกหรือประคองแขนไม่ให้ติดขัด
- ระหว่างสาธิตให้เคลื่อน Servo ทีละตัว

## 10. Pin map สรุปสำหรับโค้ด

```text
TFT: SCLK=18 MOSI=5 MISO=-1 CS=4 DC=17 RST=16
I2C: SDA=21 SCL=22 PCA9685=0x40
PCA Servo: CH0=ArmLeft CH2=ArmRight CH4=HeadYaw CH5=HeadTilt
Direct Servo GPIO: ไม่ใช้
Motor GPIO: ไม่ใช้ในรอบนี้
Camera UART: ไม่ใช้ในรอบนี้
```

เอกสารหรือโค้ดเดิมที่ระบุให้ Servo ต่อ GPIO25, GPIO26, GPIO27, GPIO32 หรือใช้ `ESP32Servo` โดยตรง ถือว่าเป็นผังเก่าและห้ามใช้กับการต่อรอบนี้
