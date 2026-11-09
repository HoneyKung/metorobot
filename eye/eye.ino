#include <SPI.h>
#include <TFT_eSPI.h>

// 2. อุปกรณ์และการตั้งค่า Pin
TFT_eSPI tft = TFT_eSPI();

// 3. ระบบตา (Eye Logic)

#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240
#define EYE_Y (SCREEN_HEIGHT / 2) - 10
#define EYE_R_X (SCREEN_WIDTH / 2) + 80
#define EYE_L_X (SCREEN_WIDTH / 2) - 80
#define EYE_RADIUS 60
#define PUPIL_RADIUS 20

void drawEyes_Normal() {
tft.fillScreen(TFT_BLACK);

  // รัศมีตาดำ 
  int eye_rx = 55;
  int eye_ry = 60;
  
  // รัศมีตาขาวประกาย
  int pupil_rx = 30;
  int pupil_ry = 20;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_L_X, EYE_Y-20, pupil_rx, pupil_ry, TFT_BLACK);

  // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y-20, pupil_rx, pupil_ry, TFT_BLACK);
}

void drawEyes_Shocked() {
  tft.fillScreen(TFT_BLACK);

  // ขนาดตาขาวเท่าเดิมเพื่อให้โครงหน้าไม่เปลี่ยน
  int eye_rx = 55;
  int eye_ry = 60;
  
  // ขนาดวงรีสีแดง (ขอบตาแดง)
  int red_rx = 35;
  int red_ry = 30;

  // รูม่านตาเล็กลงกว่าปกติ (เพื่อให้ดูช็อก)
  int pupil_rx = 15;
  int pupil_ry = 10;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // พื้นตาขาว
  tft.fillEllipse(EYE_L_X, EYE_Y, red_rx, red_ry, TFT_RED);   // วงแดง
  tft.fillEllipse(EYE_L_X, EYE_Y, pupil_rx, pupil_ry, TFT_BLACK); // รูม่านตาหดเล็ก

  // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // พื้นตาขาว
  tft.fillEllipse(EYE_R_X, EYE_Y, red_rx, red_ry, TFT_RED);   // วงแดง
  tft.fillEllipse(EYE_R_X, EYE_Y, pupil_rx, pupil_ry, TFT_BLACK); // รูม่านตาหดเล็ก
}

void drawEyes_LookLeft() {
  tft.fillScreen(TFT_BLACK);

  int eye_rx = 55;
  int eye_ry = 60;
  int pupil_rx = 30;
  int pupil_ry = 20;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // ตาขาว (พื้นหลัง)
  // ขยับลูกตาดำไปทางซ้าย (EYE_L_X - 20)
  tft.fillEllipse(EYE_L_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_BLACK);

  // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // ตาขาว (พื้นหลัง)
  // ขยับลูกตาดำไปทางซ้าย (EYE_R_X - 20)
  tft.fillEllipse(EYE_R_X - 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_BLACK);
}

void drawEyes_LookRight() {
tft.fillScreen(TFT_BLACK);

  int eye_rx = 55;
  int eye_ry = 60;
  int pupil_rx = 30;
  int pupil_ry = 20;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // ตาขาว (พื้นหลัง)
  // ขยับลูกตาดำไปทางซ้าย (EYE_L_X + 20)
  tft.fillEllipse(EYE_L_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_BLACK);

  // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y, eye_rx, eye_ry, TFT_WHITE); // ตาขาว (พื้นหลัง)
  // ขยับลูกตาดำไปทางซ้าย (EYE_R_X + 20)
  tft.fillEllipse(EYE_R_X + 15, EYE_Y - 20, pupil_rx, pupil_ry, TFT_BLACK);
}

void drawEyes_Happy() {
tft.fillScreen(TFT_BLACK);

  // รัศมีตาดำ 
  int eye_rx = 55;
  int eye_ry = 60;
  
  // รัศมีตาขาวประกาย
  int pupil_rx = 30;
  int pupil_ry = 20;

  int hpy_rx = 55;
  int hpy_ry = 20;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_L_X, EYE_Y+20-20, pupil_rx, pupil_ry, TFT_BLACK);
  tft.fillEllipse(EYE_L_X, EYE_Y+20+50, hpy_rx, hpy_ry, TFT_BLACK);

    // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y+20-20, pupil_rx, pupil_ry, TFT_BLACK);
  tft.fillEllipse(EYE_R_X, EYE_Y+20+50, hpy_rx, hpy_ry, TFT_BLACK);
}

// --- กำหนดสีน้ำตาเอง (เพื่อแก้ปัญหาสีเพี้ยน) ---
// 0x04DF คือรหัสสีฟ้าสว่าง (Sky Blue) ในรูปแบบ RGB565
// ถ้าจอยังแสดงสีเพี้ยนอีก ให้ลองเปลี่ยนเป็น 0xF800 (แดงสด) ดูครับ
// เพราะบางทีจอที่สลับสีกัน สีแดงจะกลายเป็นสีฟ้าครับ
#define TEAR_COLOR 0x04DF 

void drawEyes_Sad() {
  tft.fillScreen(TFT_BLACK);

  int eye_rx = 55;
  int eye_ry = 60;
  int pupil_rx = 30;
  int pupil_ry = 20;

  // ====== ตาซ้าย (มีน้ำตา) ======
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_L_X, EYE_Y +20+ 30, pupil_rx, pupil_ry, TFT_BLACK);
  
  // เปลือกตาเศร้าซ้าย
  tft.fillTriangle(EYE_L_X - 60, EYE_Y +20- 65, 
                   EYE_L_X + 60, EYE_Y +20- 65, 
                   EYE_L_X - 60, EYE_Y +20+ 10, TFT_BLACK);

  // --- วาดหยดน้ำตาที่ตาซ้าย ---
  // จุดเริ่มต้นของน้ำตา (ขอบล่างของตาซ้าย ค่อนไปทางหางตา)
  int tear_start_x = EYE_L_X - 35; 
  int tear_start_y = EYE_Y +20+ 55;   
  int tear_size = 10; // ขนาดความอ้วนของหยดน้ำ

  // ส่วนที่ 1: สามเหลี่ยมส่วนบน (ยอดแหลมของน้ำตา)
  tft.fillTriangle(tear_start_x, tear_start_y,                 // จุดยอดบนสุด
                   tear_start_x - tear_size, tear_start_y + 15, // จุดซ้ายล่าง
                   tear_start_x + tear_size, tear_start_y + 15, // จุดขวาล่าง
                   TEAR_COLOR);
  
  // ส่วนที่ 2: วงกลมส่วนล่าง (ก้นหยดน้ำให้มนๆ)
  // วาดต่อจากฐานสามเหลี่ยมลงมา
  tft.fillCircle(tear_start_x, tear_start_y + 15, tear_size, TEAR_COLOR);


  // ====== ตาขวา (ไม่มีน้ำตา) ======
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y +20+ 30, pupil_rx, pupil_ry, TFT_BLACK);
  
  // เปลือกตาเศร้าขวา
  tft.fillTriangle(EYE_R_X - 60, EYE_Y +20- 65, 
                   EYE_R_X + 60, EYE_Y +20- 65, 
                   EYE_R_X + 60, EYE_Y +20+ 10, TFT_BLACK);
}

void drawEyes_Angry() {
  tft.fillScreen(TFT_BLACK);

  int eye_rx = 55;
  int eye_ry = 60;
  int pupil_rx = 30;
  int pupil_ry = 20;

  // --- ตาซ้าย ---
  tft.fillEllipse(EYE_L_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_L_X, EYE_Y+20 + 30, pupil_rx, pupil_ry, TFT_BLACK);
  
  // ตัดเฉียงด้านบน: ยอดสามเหลี่ยมกดลงที่ฝั่งขวา (ด้านในใกล้จมูก)
  tft.fillTriangle(EYE_L_X - 70, EYE_Y+20 - 70,  // มุมนอกบน
                   EYE_L_X + 70, EYE_Y+20 - 70,  // มุมในบน
                   EYE_L_X + 70, EYE_Y+20 - 5,   // ยอดแหลมกดลงมาที่หัวตา
                   TFT_BLACK);

  // --- ตาขวา ---
  tft.fillEllipse(EYE_R_X, EYE_Y+20, eye_rx, eye_ry, TFT_WHITE);
  tft.fillEllipse(EYE_R_X, EYE_Y+20 + 30, pupil_rx, pupil_ry, TFT_BLACK);
  
  // ตัดเฉียงด้านบน: ยอดสามเหลี่ยมกดลงที่ฝั่งซ้าย (ด้านในใกล้จมูก)
  tft.fillTriangle(EYE_R_X - 70, EYE_Y+20 - 70,  // มุมในบน
                   EYE_R_X + 70, EYE_Y+20 - 70,  // มุมนอกบน
                   EYE_R_X - 70, EYE_Y+20 - 5,   // ยอดแหลมกดลงมาที่หัวตา
                   TFT_BLACK);
}

// ============================================
// 6. Setup (เริ่มระบบ)
// ============================================
void setup() {
  Serial.begin(115200);

  // เริ่มจอและวาดตา
  tft.init(); tft.setRotation(1); tft.fillScreen(TFT_BLACK);
  drawEyes_Normal();

}

// 7. Loop (หัวใจหลัก: เช็คทั้ง WiFi และ Keyboard)
void loop() {

  //B. เช็คคำสั่งจาก Keyboard (Serial)
  if (Serial.available() > 0) {
    char command = Serial.read();
    
    // แปลงปุ่มกด Keyboard ให้ทำงาน
    switch (command) {

      // สั่งงานตา
      case 'y': drawEyes_LookLeft(); Serial.println("Eye: Left"); break;
      case 'u': drawEyes_Normal(); Serial.println("Eye: Normal"); break;
      case 'i': drawEyes_LookRight(); Serial.println("Eye: Right"); break;
      case 'o': drawEyes_Shocked(); Serial.println("Eye: Shocked"); break;
      case 'h': drawEyes_Happy(); Serial.println("Eye: Happy"); break;
      case 'j': drawEyes_Sad(); Serial.println("Eye: Sad"); break;
      case 'k': drawEyes_Angry(); Serial.println("Eye: Angry"); break;
    }
  }
}