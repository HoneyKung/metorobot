/*
 * FullCam.ino v8 (กล้องติดตาม 8 พ.ย.) — XIAO ESP32S3 Sense
 * ตรวจจับใบหน้า + อารมณ์ → ส่งไป ESP32 หลัก
 *
 * ==== Board ====
 * esp32 v3.0.7 | XIAO_ESP32S3 | OPI PSRAM | Huge APP | USB CDC
 *
 * ==== รหัสที่ส่ง ====
 * ตำแหน่ง: L C R (ตัวเดียว ส่งตอนเปลี่ยน — ของเดิม เฟิร์มแวร์หลักรุ่นเก่ายังใช้ได้)
 * ตำแหน่งละเอียด (v8 กล้องติดตาม 8 พ.ย.): บรรทัด "F<x>,<y>,<w>\n" ไม่เกิน ~10 ครั้ง/วิ เฉพาะตอนเห็นหน้า
 *   x = −100..100 กลางกรอบหน้าเทียบกลางภาพ (ลบ = ซ้ายของภาพ) · y = −100..100 (ลบ = บนของภาพ)
 *   w = ความกว้างกรอบหน้า % ของภาพ (0..100) · หลายหน้า = เลือกหน้าที่ใหญ่สุด
 *   ไม่เห็นหน้า = ไม่ส่ง F (ฝั่งหลักนับเวลาเอง) · เฟิร์มแวร์หลักรุ่นเก่าจะข้ามบรรทัดนี้ทั้งบรรทัด (ไม่มีตัว L C R H S A N X ในบรรทัด)
 * อารมณ์:  H(ยิ้ม) S(เศร้า) N(ปกติ)
 * ไม่เจอหน้า: X (หลัง 5 วินาที)
 *
 * ==== สาย ====
 * XIAO D6(TX/GPIO43) → ESP32 GPIO35(RX), GND → GND
 *
 * ==== v9 กล้องขั้น 2 (8 พ.ย.) — ส่งภาพผ่าน WiFi ให้คอมดู (ไม่บังคับ) ====
 * CAM_WIFI 0 = เหมือน v8 ทุกอย่าง ไม่เปิด WiFi
 * CAM_WIFI 1 = ต่อฮอตสปอตเดียวกับหุ่น (ไม่รอ ต่อไม่ได้ก็ตรวจหน้าบนบอร์ดต่อตามเดิม)
 *   http://metocam.local/          หน้าดูภาพ + สถานะ
 *   http://metocam.local/capture   ภาพนิ่ง 1 ใบ (ใช้ได้ทุกโหมด)
 *   http://metocam.local:81/stream MJPEG สด (คอมใช้ตัวนี้)
 *   http://metocam.local/mode?m=detect|both|stream    /status = JSON
 * โหมด (สั่งทางเว็บ หรือพิมพ์ D/B/W ใน Serial Monitor USB):
 *   detect  = v8 เดิม ตรวจหน้าบนบอร์ด ไม่ส่งภาพสด
 *   both    = (ค่าเริ่ม) ตรวจหน้าบนบอร์ด + ส่งภาพ 240×240 ที่บีบ JPEG ด้วยซอฟต์แวร์
 *             บีบเฉพาะตอนมีคนดู /stream · เซนเซอร์ส่งได้ทีละรูปแบบ (ตัวตรวจหน้าต้องใช้ RGB565)
 *             จึงได้แค่ 240×240 และเฟรมช้าลง
 *   stream  = เซนเซอร์เป็น JPEG VGA 640×480 เต็มความเร็ว **พักตัวตรวจหน้าบนบอร์ด**
 *             ไม่ส่ง F/L/C/R/H/S/X ไปบอร์ดหลัก → คอมเป็นคนสั่งหันหัวผ่าน /run แทน
 *
 * ==== v10 กล้องแทนทองแดง + VL53 (9 พ.ย.) ====
 * ย่อภาพเป็นตาราง 24×24 ช่อง (ช่องละ 10×10 พิกเซล) ทุกเฟรม แล้วทำ 2 อย่าง (เฉพาะโหมด detect/both):
 *   P  = ลูบหัว: มือเข้ามาใกล้หน้ากล้อง (ภาพเปลี่ยน ≥ PET_NEAR %) แล้วเลื่อนขึ้นออกขอบบนภายใน PET_WIN_MS
 *        ส่งตัวเดียว 'P' (เฟิร์มแวร์หลักรุ่นเก่าข้ามเอง)
 *   "O<x>,<y>,<a>,<b>\n" ทุก 200 ms = ของที่เด่นที่สุดตรงหน้า (สีต่างจากค่ากลางของแถวเดียวกัน)
 *        x,y = −100..100 กลางของเทียบกลางภาพ (y ลบ = บน) · a = พื้นที่ % ของแถบกลางภาพ
 *        b = ขอบล่างของของ 0..100 (100 = แตะขอบล่างภาพ) · ไม่เห็นของ = O0,0,0,0
 *        บอร์ดหลักใช้ตอนหนีบ (ก้มหน้า) แทน VL53: เข้าหาระยะหนีบ + ตรวจว่ายกแล้ว
 * Serial USB: V = เปิด/ปิดพิมพ์ค่าตาราง (ไว้จูน)
 */

#include "esp_camera.h"
#include "human_face_detect_msr01.hpp"
#include "human_face_detect_mnp01.hpp"
#include <cmath>

#define CAM_WIFI 1                      // 0 = ปิด WiFi ทั้งหมด (เหมือน v8)
#if CAM_WIFI
#include <WiFi.h>
#include <ESPmDNS.h>
#include "esp_http_server.h"
#include "img_converters.h"
const char* WIFI_SSID = "NNNYTAN";      // ฮอตสปอตเดียวกับหุ่น (คัดจาก RoboPCA9685.ino)
const char* WIFI_PASS = "14769NoL";
const char* CAM_HOST  = "metocam";      // → http://metocam.local
#define STREAM_FRAMESIZE FRAMESIZE_VGA  // โหมด stream: VGA 640×480 (ช้า/หลุด → FRAMESIZE_QVGA)
#define STREAM_JPEG_Q    12             // 10–20 · เลขน้อย = ชัดแต่ไฟล์ใหญ่
#define BOTH_JPEG_Q      80             // โหมด both: คุณภาพ frame2jpg 0–100
#define BOTH_ENC_MS      100            // โหมด both: บีบภาพถี่สุดทุก 100 ms
#define JPG_BUF_MAX      (160 * 1024)
#endif
enum CamMode { MODE_DETECT = 0, MODE_BOTH = 1, MODE_STREAM = 2 };
volatile int reqMode = CAM_WIFI ? MODE_BOTH : MODE_DETECT;
int curMode = MODE_DETECT;              // โหมดที่กล้องตั้งอยู่จริง (setup ตั้ง)

// Camera Pins — XIAO ESP32S3 Sense
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     10
#define SIOD_GPIO_NUM     40
#define SIOC_GPIO_NUM     39
#define Y9_GPIO_NUM       48
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       12
#define Y6_GPIO_NUM       14
#define Y5_GPIO_NUM       16
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM       17
#define Y2_GPIO_NUM       15
#define VSYNC_GPIO_NUM    38
#define HREF_GPIO_NUM     47
#define PCLK_GPIO_NUM     13
#define MAIN_TX_PIN       43
#define MAIN_RX_PIN       44

// รหัสอารมณ์
#define EMO_HAPPY   'H'
#define EMO_SAD     'S'
#define EMO_NEUTRAL 'N'
#define EMO_NOFACE  'X'

// ============================================================
// ปรับค่าตรงนี้
// ============================================================
#define EMA_ALPHA      0.5f     // ความไวต่อค่าใหม่
#define TH_HAPPY       0.020f   // m > 0.02 = ยิ้ม
#define TH_SAD_N       0.035f   // n > 0.04 = เศร้า (nose-mouth)
#define TH_SAD_D       0.035f   // d > 0.04 = เศร้า (droop)
#define CONSEC_NEED    2        // เห็นอารมณ์ใหม่ 2 เฟรมถึงเปลี่ยน
#define MIN_HOLD_MS    500      // ค้างอารมณ์ 0.5 วินาที
#define ADAPT_RATE     0.003f   // baseline ปรับทุกเฟรม (ช้ามาก)
#define FACE_TIMEOUT   5000     // ไม่เจอหน้า 5 วิ → X
#define POS_PERIOD_MS  100      // ส่งบรรทัด F ถี่สุดทุก 100 ms (~10 Hz · 9600 baud รับได้ ~70 บรรทัด/วิ)

// v10 ลูบหัว (P) — ค่าเป็นช่องตาราง 24×24 · แก้ตรงนี้แล้วแฟลชกล้องใหม่ · ดูค่าจริงด้วย V ใน Serial USB
#define PET_DIFF       28       // ช่องที่ความสว่าง (หักค่าเฉลี่ยทั้งภาพแล้ว) ต่างจากฉากหลังเกินนี้ = เปลี่ยน
#define PET_NEAR       35       // ภาพเปลี่ยน ≥ 35% = มือมาใกล้ตรงหน้า
#define PET_GONE       10       // เปลี่ยน < 10% = มือออกไปแล้ว
#define PET_RISE       4        // จุดกลางมือต้องเลื่อนขึ้น ≥ 4 แถว (~17% ของภาพ) หรือไปกองอยู่ครึ่งบน
#define PET_WIN_MS     2000     // ตั้งแต่มือมาใกล้จนออกขอบบน ต้องไม่เกิน 2 วิ
#define PET_COOL_MS    1500     // ส่ง P แล้วพักก่อนรับครั้งใหม่
// v10 ของตรงหน้า (O)
#define OBJ_DIFF       60       // |ΔR|+|ΔG|+|ΔB| ต่างจากค่ากลางของแถวเกินนี้ = เป็นของ (น้อย = ไวขึ้น)
#define OBJ_X0         3        // ใช้เฉพาะคอลัมน์ 3..20 (ตัดขอบซ้ายขวาข้างละ 12% กันแขนเข้าภาพ)
#define OBJ_X1         21
#define OBJ_PERIOD_MS  200      // ส่ง O ทุก 200 ms (~5 Hz)

// ============================================================
// Detectors — สร้างครั้งเดียว ใช้ซ้ำทุกเฟรม (ไม่ leak!)
// ============================================================
HumanFaceDetectMSR01 detector_s1(0.1F, 0.5F, 10, 0.2F);
HumanFaceDetectMNP01 detector_s2(0.1F, 0.3F, 5);

// ============================================================
// State
// ============================================================
float smM = 0, smN = 0, smD = 0;
bool emaOk = false;

float bM = 0, bN = 0, bD = 0;
int calCnt = 0;
bool calOk = false;

char curEmo = EMO_NOFACE;
char pendEmo = EMO_NOFACE;
int consecCnt = 0;
unsigned long lastChange = 0;

char lastPos = 0;
unsigned long lastPosT = 0, lastFaceT = 0, lastFT = 0;
unsigned long fpsT = 0;
int fpsCnt = 0;

// ============================================================
// Helpers
// ============================================================
struct Rat { float m, n, d; bool ok; };

Rat calcRat(int lex, int ley, int rex, int rey,
            int nx, int ny, int mlx, int mly, int mrx, int mry) {
    Rat r = {0, 0, 0, false};
    float ed = sqrt(pow(rex - lex, 2) + pow(rey - ley, 2));
    if (ed < 1) return r;
    r.m = sqrt(pow(mrx - mlx, 2) + pow(mry - mly, 2)) / ed;
    float cx = (mlx + mrx) / 2.0, cy = (mly + mry) / 2.0;
    r.n = sqrt(pow(cx - nx, 2) + pow(cy - ny, 2)) / ed;
    r.d = ((mly + mry) / 2.0 - ny) / ed;
    r.ok = true;
    return r;
}

void emaUp(float rm, float rn, float rd) {
    if (!emaOk) { smM = rm; smN = rn; smD = rd; emaOk = true; return; }
    smM = EMA_ALPHA * rm + (1 - EMA_ALPHA) * smM;
    smN = EMA_ALPHA * rn + (1 - EMA_ALPHA) * smN;
    smD = EMA_ALPHA * rd + (1 - EMA_ALPHA) * smD;
}

bool tryChange(char e) {
    if (e == curEmo) { consecCnt = 0; return false; }
    if (millis() - lastChange < MIN_HOLD_MS) return false;
    if (e == pendEmo) consecCnt++; else { pendEmo = e; consecCnt = 1; }
    if (consecCnt >= CONSEC_NEED) {
        curEmo = e; consecCnt = 0; lastChange = millis();
        return true;
    }
    return false;
}

// ============================================================
// v10 ตาราง 24×24 → ลูบหัว (P) + ของตรงหน้า (O)
// ============================================================
#define GN 24
#define GC (GN * GN)
uint8_t gR[GC], gG[GC], gB[GC], gY[GC], gM[GC];
uint16_t bgY[GC];                       // ฉากหลังความสว่าง ×16
bool bgOk = false, dbgV = false;
int petSt = 0, petCy0 = 0, petCyMin = 0, petA = 0, petCy = 0;
bool petUp = false;
unsigned long petT0 = 0, petCoolT = 0, lastOT = 0, lastDbgT = 0;
int oX = 0, oY = 0, oA = 0, oB = 0;

// RGB565 ในบัฟเฟอร์กล้องเรียงไบต์สูงก่อน · เก็บทีละ 2 พิกเซล (เร็วพอ)
void gridFrom(camera_fb_t *fb) {
    const int W = fb->width, cw = fb->width / GN, ch = fb->height / GN;
    for (int gy = 0; gy < GN; gy++) for (int gx = 0; gx < GN; gx++) {
        uint32_t sr = 0, sg = 0, sb = 0, n = 0;
        for (int y = gy * ch; y < (gy + 1) * ch; y += 2) {
            const uint8_t *q = fb->buf + (y * W + gx * cw) * 2;
            for (int x = 0; x < cw; x += 2, q += 4) {
                uint16_t v = (q[0] << 8) | q[1];
                sr += v >> 11; sg += (v >> 5) & 63; sb += v & 31; n++;
            }
        }
        int i = gy * GN + gx;
        gR[i] = sr * 255 / (31 * n); gG[i] = sg * 255 / (63 * n); gB[i] = sb * 255 / (31 * n);
        gY[i] = (gR[i] * 77 + gG[i] * 150 + gB[i] * 29) >> 8;
    }
}

// ลูบหัว: มือเข้ามาใกล้ (ภาพเปลี่ยนเยอะ) → เลื่อนขึ้น → ออกขอบบน = ส่ง P
void petTick(unsigned long now) {
    if (!bgOk) { for (int i = 0; i < GC; i++) bgY[i] = gY[i] << 4; bgOk = true; return; }
    int mY = 0, mB = 0;
    for (int i = 0; i < GC; i++) { mY += gY[i]; mB += bgY[i] >> 4; }
    mY /= GC; mB /= GC;                                      // หักค่าเฉลี่ย = ไม่สนกล้องปรับแสงเองทั้งภาพ
    int cnt = 0, top = 0, bot = 0; long sy = 0;
    for (int i = 0; i < GC; i++) {
        int d = (gY[i] - mY) - ((bgY[i] >> 4) - mB);
        bool c = abs(d) > PET_DIFF;
        int row = i / GN;
        if (c) { cnt++; sy += row; if (row < GN / 3) top++; else if (row >= GN * 2 / 3) bot++; }
        int sh = petSt ? 6 : (c ? 5 : 3);                    // มีมืออยู่ = ฉากหลังตามช้ามาก
        bgY[i] += ((int)(gY[i] << 4) - (int)bgY[i]) >> sh;
    }
    petA = cnt * 100 / GC; petCy = cnt ? sy / cnt : GN / 2;
    if (petSt == 0) {
        if (petA >= PET_NEAR && (long)(now - petCoolT) >= 0) {
            petSt = 1; petT0 = now; petCy0 = petCyMin = petCy; petUp = false;
            Serial.printf("[PET] มือใกล้ %d%% แถว %d\n", petA, petCy);
        }
    } else if (petSt == 1) {
        if (petA >= PET_GONE) {
            if (petCy < petCyMin) petCyMin = petCy;
            if (top >= GN * 2 && top > bot * 2) petUp = true;  // มือไปกองครึ่งบน
        }
        bool risen = petUp || petCy0 - petCyMin >= PET_RISE;
        if (petA < PET_GONE) {
            if (risen && now - petT0 <= PET_WIN_MS) {
                Serial1.write('P');
                Serial.printf(">>> SEND: P (ลูบหัว ขึ้น %d แถว %lu ms) <<<\n", petCy0 - petCyMin, now - petT0);
            } else Serial.println("[PET] มือออกไปแต่ไม่ได้เลื่อนขึ้น — ไม่นับ");
            petSt = 0; petCoolT = now + PET_COOL_MS;
        } else if (now - petT0 > PET_WIN_MS) petSt = 2;
    } else if (petA < PET_GONE) petSt = 0;                   // รอภาพนิ่งก่อนรับรอบใหม่
    else if (now - petT0 > 4000) { bgOk = false; petSt = 0; } // ฉากเปลี่ยนถาวร (หัวหัน) → เริ่มฉากหลังใหม่
}

// ของตรงหน้า: ช่องที่สีต่างจากค่ากลางของแถวเดียวกัน → ก้อนที่ติดกันใหญ่สุด
void objTick(unsigned long now) {
    uint8_t t[3][GN];
    for (int r = 0; r < GN; r++) {
        for (int c = 0; c < GN; c++) { int i = r * GN + c; t[0][c] = gR[i]; t[1][c] = gG[i]; t[2][c] = gB[i]; }
        for (int k = 0; k < 3; k++)                          // เรียง 24 ค่า เอาตัวกลาง
            for (int a = 1; a < GN; a++) { uint8_t v = t[k][a]; int b = a - 1; while (b >= 0 && t[k][b] > v) { t[k][b + 1] = t[k][b]; b--; } t[k][b + 1] = v; }
        for (int c = 0; c < GN; c++) {
            int i = r * GN + c;
            gM[i] = (c >= OBJ_X0 && c < OBJ_X1 &&
                     abs(gR[i] - t[0][GN / 2]) + abs(gG[i] - t[1][GN / 2]) + abs(gB[i] - t[2][GN / 2]) > OBJ_DIFF) ? 1 : 0;
        }
    }
    static uint16_t q[GC];
    int bestN = 0, bx = 0, by = 0, bb = 0;
    for (int s = 0; s < GC; s++) {
        if (gM[s] != 1) continue;
        int h = 0, tl = 0, n = 0, sx = 0, sy = 0, mb = 0;
        q[tl++] = s; gM[s] = 2;
        while (h < tl) {
            int i = q[h++], r = i / GN, c = i % GN;
            n++; sx += c; sy += r; if (r > mb) mb = r;
            int nb[4] = { r > 0 ? i - GN : -1, r < GN - 1 ? i + GN : -1, c > 0 ? i - 1 : -1, c < GN - 1 ? i + 1 : -1 };
            for (int k = 0; k < 4; k++) if (nb[k] >= 0 && gM[nb[k]] == 1) { gM[nb[k]] = 2; q[tl++] = nb[k]; }
        }
        if (n > bestN) { bestN = n; bx = sx; by = sy; bb = mb; }
    }
    if (bestN >= 2) {
        oX = ((bx * 2 + bestN) * 100 / GN) / bestN - 100;    // จุดกลางช่อง → −100..100
        oY = ((by * 2 + bestN) * 100 / GN) / bestN - 100;
        oA = bestN * 100 / (GN * (OBJ_X1 - OBJ_X0));
        oB = (bb + 1) * 100 / GN;
    } else oX = oY = oA = oB = 0;
    if (now - lastOT >= OBJ_PERIOD_MS) { lastOT = now; Serial1.printf("O%d,%d,%d,%d\n", oX, oY, oA, oB); }
}

// ============================================================
// กล้อง: jpeg=false → RGB565 240×240 (ตัวตรวจหน้า) · jpeg=true → JPEG VGA (โหมด stream)
// ============================================================
bool camInit(bool jpeg) {
    camera_config_t cfg;
    cfg.ledc_channel = LEDC_CHANNEL_0; cfg.ledc_timer = LEDC_TIMER_0;
    cfg.pin_d0 = Y2_GPIO_NUM;  cfg.pin_d1 = Y3_GPIO_NUM;
    cfg.pin_d2 = Y4_GPIO_NUM;  cfg.pin_d3 = Y5_GPIO_NUM;
    cfg.pin_d4 = Y6_GPIO_NUM;  cfg.pin_d5 = Y7_GPIO_NUM;
    cfg.pin_d6 = Y8_GPIO_NUM;  cfg.pin_d7 = Y9_GPIO_NUM;
    cfg.pin_xclk = XCLK_GPIO_NUM; cfg.pin_pclk = PCLK_GPIO_NUM;
    cfg.pin_vsync = VSYNC_GPIO_NUM; cfg.pin_href = HREF_GPIO_NUM;
    cfg.pin_sccb_sda = SIOD_GPIO_NUM; cfg.pin_sccb_scl = SIOC_GPIO_NUM;
    cfg.pin_pwdn = PWDN_GPIO_NUM; cfg.pin_reset = RESET_GPIO_NUM;
    cfg.xclk_freq_hz = 20000000;
    cfg.pixel_format = PIXFORMAT_RGB565;
    cfg.frame_size = FRAMESIZE_240X240;
    cfg.fb_location = CAMERA_FB_IN_PSRAM;
    cfg.fb_count = 2;
    cfg.grab_mode = CAMERA_GRAB_LATEST;
    cfg.jpeg_quality = 12;
#if CAM_WIFI
    if (jpeg) {
        cfg.pixel_format = PIXFORMAT_JPEG;
        cfg.frame_size = STREAM_FRAMESIZE;
        cfg.jpeg_quality = STREAM_JPEG_Q;
    }
#else
    (void)jpeg;
#endif
    return esp_camera_init(&cfg) == ESP_OK;
}

// ============================================================
// WiFi + เว็บ (เฉพาะ CAM_WIFI 1)
//   กล้องมีเจ้าของคนเดียวคือ loop() · loop วางภาพ JPEG ล่าสุดไว้ใน jpgBuf
//   เว็บแค่คัดลอกออกไปส่ง (มี mutex) → ไม่มีสองงานแย่ง frame buffer กัน
// ============================================================
#if CAM_WIFI
uint8_t *jpgBuf = nullptr;
size_t jpgLen = 0;
volatile uint32_t jpgSeq = 0;
SemaphoreHandle_t jpgMutex = nullptr;
volatile int streamClients = 0;
volatile bool snapReq = false;
unsigned long lastEncT = 0;
float lastFps = 0;
bool mdnsOk = false;
httpd_handle_t ctrlHttpd = nullptr, streamHttpd = nullptr;

const char *modeName(int m) { return m == MODE_STREAM ? "stream" : m == MODE_BOTH ? "both" : "detect"; }

void publishJpg(const uint8_t *buf, size_t len) {
    if (!jpgBuf || len == 0 || len > JPG_BUF_MAX) return;
    if (xSemaphoreTake(jpgMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;
    memcpy(jpgBuf, buf, len); jpgLen = len; jpgSeq++;
    xSemaphoreGive(jpgMutex);
}

// คัดลอกภาพล่าสุดที่ใหม่กว่า seen → คืนขนาด (0 = ยังไม่มีภาพใหม่)
size_t copyLatest(uint8_t *dst, uint32_t &seen) {
    size_t n = 0;
    if (xSemaphoreTake(jpgMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        if (jpgSeq != seen && jpgLen > 0) { memcpy(dst, jpgBuf, jpgLen); n = jpgLen; seen = jpgSeq; }
        xSemaphoreGive(jpgMutex);
    }
    return n;
}

static esp_err_t streamHandler(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    if (reqMode == MODE_DETECT) {
        httpd_resp_set_status(req, "409 Conflict");
        return httpd_resp_sendstr(req, "mode=detect -> /mode?m=both or /mode?m=stream");
    }
    uint8_t *local = (uint8_t *)ps_malloc(JPG_BUF_MAX);
    if (!local) return httpd_resp_send_500(req);
    httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=metoframe");
    streamClients++;
    uint32_t seen = jpgSeq;
    unsigned long lastSend = millis();
    esp_err_t res = ESP_OK;
    while (res == ESP_OK) {
        size_t n = copyLatest(local, seen);
        if (!n) {
            if (millis() - lastSend > 5000) break;          // ไม่มีภาพ 5 วิ (เช่น เปลี่ยนเป็น detect) → ปิด
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }
        char hdr[100];
        int hl = snprintf(hdr, sizeof(hdr),
            "\r\n--metoframe\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", (unsigned)n);
        res = httpd_resp_send_chunk(req, hdr, hl);
        if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)local, n);
        lastSend = millis();
    }
    streamClients--;
    free(local);
    return res;
}

static esp_err_t captureHandler(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    uint8_t *local = (uint8_t *)ps_malloc(JPG_BUF_MAX);
    if (!local) return httpd_resp_send_500(req);
    uint32_t seen = jpgSeq;
    snapReq = true;                                          // ขอให้ loop บีบภาพถัดไป 1 ใบ (ใช้ได้แม้โหมด detect)
    size_t n = 0;
    for (int i = 0; i < 150 && !n; i++) { n = copyLatest(local, seen); if (!n) vTaskDelay(pdMS_TO_TICKS(10)); }
    esp_err_t res;
    if (n) { httpd_resp_set_type(req, "image/jpeg"); res = httpd_resp_send(req, (const char *)local, n); }
    else   res = httpd_resp_send_500(req);
    free(local);
    return res;
}

static esp_err_t statusHandler(httpd_req_t *req) {
    char b[300];
    snprintf(b, sizeof(b),
        "{\"mode\":\"%s\",\"ip\":\"%s\",\"rssi\":%d,\"fps\":%.1f,\"heap\":%u,\"psram\":%u,"
        "\"clients\":%d,\"jpgLen\":%u,\"seq\":%u,\"face\":%d}",
        modeName(curMode), WiFi.localIP().toString().c_str(), (int)WiFi.RSSI(), lastFps,
        (unsigned)esp_get_free_heap_size(), (unsigned)ESP.getFreePsram(),
        (int)streamClients, (unsigned)jpgLen, (unsigned)jpgSeq,
        (millis() - lastFaceT < 500 && lastFaceT) ? 1 : 0);
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_type(req, "application/json");
    return httpd_resp_sendstr(req, b);
}

static esp_err_t modeHandler(httpd_req_t *req) {
    char q[40], v[12];
    if (httpd_req_get_url_query_str(req, q, sizeof(q)) == ESP_OK &&
        httpd_query_key_value(q, "m", v, sizeof(v)) == ESP_OK) {
        if      (!strcmp(v, "detect")) reqMode = MODE_DETECT;
        else if (!strcmp(v, "both"))   reqMode = MODE_BOTH;
        else if (!strcmp(v, "stream")) reqMode = MODE_STREAM;
    }
    return statusHandler(req);                               // ตอบสถานะ (mode จะเปลี่ยนในรอบ loop ถัดไป)
}

static esp_err_t rootHandler(httpd_req_t *req) {
    static const char html[] =
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
        "<title>METO cam</title><body style='background:#111;color:#eee;font-family:sans-serif'>"
        "<h3>METO cam</h3><p><a href='/mode?m=detect'>detect</a> | <a href='/mode?m=both'>both</a> | "
        "<a href='/mode?m=stream'>stream</a> | <a href='/status'>status</a> | <a href='/capture'>capture</a></p>"
        "<img id=v style='max-width:100%'><script>v.src=location.protocol+'//'+location.hostname+':81/stream'</script>";
    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, html, sizeof(html) - 1);
}

void webStart() {
    httpd_config_t c = HTTPD_DEFAULT_CONFIG();
    c.core_id = 0;                                           // core 1 เป็นของตัวตรวจหน้า (loop)
    c.server_port = 80; c.ctrl_port = 32768;
    httpd_uri_t u1 = {"/", HTTP_GET, rootHandler, nullptr};
    httpd_uri_t u2 = {"/capture", HTTP_GET, captureHandler, nullptr};
    httpd_uri_t u3 = {"/status", HTTP_GET, statusHandler, nullptr};
    httpd_uri_t u4 = {"/mode", HTTP_GET, modeHandler, nullptr};
    if (httpd_start(&ctrlHttpd, &c) == ESP_OK) {
        httpd_register_uri_handler(ctrlHttpd, &u1); httpd_register_uri_handler(ctrlHttpd, &u2);
        httpd_register_uri_handler(ctrlHttpd, &u3); httpd_register_uri_handler(ctrlHttpd, &u4);
    }
    c.server_port = 81; c.ctrl_port = 32769;                 // /stream แยก server — ไม่บล็อก /mode /status
    httpd_uri_t u5 = {"/stream", HTTP_GET, streamHandler, nullptr};
    if (httpd_start(&streamHttpd, &c) == ESP_OK) httpd_register_uri_handler(streamHttpd, &u5);
}

void wifiTick() {
    static bool wasUp = false;
    bool up = WiFi.status() == WL_CONNECTED;
    if (up && !wasUp) {
        Serial.printf("[WIFI] ต่อ %s แล้ว IP %s → http://%s.local  (stream :81/stream)\n",
                      WIFI_SSID, WiFi.localIP().toString().c_str(), CAM_HOST);
        if (!mdnsOk) { mdnsOk = MDNS.begin(CAM_HOST); if (mdnsOk) MDNS.addService("http", "tcp", 80); }
    } else if (!up && wasUp) Serial.println("[WIFI] หลุด — ตรวจหน้าบนบอร์ดต่อตามปกติ");
    wasUp = up;
}

// เปลี่ยนโหมด (เรียกจาก loop เท่านั้น) · detect↔both ไม่ต้องเริ่มกล้องใหม่
void applyMode(int m) {
    bool needJpeg = (m == MODE_STREAM), isJpeg = (curMode == MODE_STREAM);
    if (needJpeg != isJpeg) {
        esp_camera_deinit();
        delay(50);
        if (!camInit(needJpeg)) {
            Serial.println("[MODE] เริ่มกล้องใหม่ไม่ได้ — กลับ detect");
            camInit(false); m = MODE_DETECT; reqMode = MODE_DETECT;
        }
        lastFaceT = 0; lastPos = 0; emaOk = false; bgOk = false; petSt = 0;
    }
    curMode = m;
    Serial.printf("[MODE] %s%s\n", modeName(m), m == MODE_STREAM ? " — พักตัวตรวจหน้าบนบอร์ด (ไม่ส่ง F ไปบอร์ดหลัก)" : "");
}
#endif

// ============================================================
// SETUP
// ============================================================
void setup() {
    Serial.begin(115200);
    Serial1.begin(9600, SERIAL_8N1, MAIN_RX_PIN, MAIN_TX_PIN);
    delay(1000);
    Serial.println("\n=== FullCam v10 (F line + WiFi stream + P ลูบหัว + O ของตรงหน้า) ===");

    if (!camInit(false)) {
        Serial.println("CAM FAIL!");
        while (1) delay(1000);
    }
    curMode = MODE_DETECT;

#if CAM_WIFI
    jpgBuf = (uint8_t *)ps_malloc(JPG_BUF_MAX);
    jpgMutex = xSemaphoreCreateMutex();
    WiFi.mode(WIFI_STA);
    WiFi.setHostname(CAM_HOST);
    WiFi.setSleep(false);                                    // ภาพสดลื่นกว่า
    WiFi.begin(WIFI_SSID, WIFI_PASS);                        // ไม่รอ — ต่อไม่ได้ก็ทำงานต่อ
    webStart();
    Serial.printf("[WIFI] กำลังต่อ %s (ไม่รอ) · Serial: D=detect B=both W=stream I=สถานะ\n", WIFI_SSID);
#endif

    Serial.printf("[MEM] Free heap: %d bytes\n", esp_get_free_heap_size());
    Serial.println("Camera OK — ทำหน้าปกติ... (R = recalibrate)\n");
    fpsT = millis();
}

// ============================================================
// LOOP
// ============================================================
void loop() {
    // --- Re-calibrate ผ่าน Serial ---
    while (Serial.available() > 0) {
        char c = Serial.read();
        if (c == 'R' || c == 'r') {
            calOk = false; calCnt = 0;
            bM = 0; bN = 0; bD = 0;
            emaOk = false;
            Serial.println("\n=== RECAL ===\n");
        }
        else if (c == 'V' || c == 'v') { dbgV = !dbgV; Serial.printf("[V] พิมพ์ค่าตาราง %s\n", dbgV ? "เปิด" : "ปิด"); }
#if CAM_WIFI
        else if (c == 'D') reqMode = MODE_DETECT;
        else if (c == 'B') reqMode = MODE_BOTH;
        else if (c == 'W') reqMode = MODE_STREAM;
        else if (c == 'I') Serial.printf("[INFO] mode=%s wifi=%d ip=%s clients=%d\n", modeName(curMode),
                                         WiFi.status() == WL_CONNECTED, WiFi.localIP().toString().c_str(),
                                         (int)streamClients);
#endif
    }

#if CAM_WIFI
    wifiTick();
    if (reqMode != curMode) applyMode(reqMode);

    // --- โหมด stream: เซนเซอร์ให้ JPEG มาเลย วางไว้ให้เว็บ · ไม่ตรวจหน้า ไม่ส่งอะไรทาง Serial1 ---
    if (curMode == MODE_STREAM) {
        if (streamClients == 0 && !snapReq) { delay(20); return; }
        camera_fb_t *jf = esp_camera_fb_get();
        if (!jf) { delay(10); return; }
        publishJpg(jf->buf, jf->len);
        snapReq = false;
        esp_camera_fb_return(jf);
        fpsCnt++;
        if (millis() - fpsT >= 5000) {
            lastFps = fpsCnt / ((millis() - fpsT) / 1000.0);
            Serial.printf("[FPS stream] %.1f  jpg %u B\n", lastFps, (unsigned)jpgLen);
            fpsCnt = 0; fpsT = millis();
        }
        return;
    }
#endif

    // --- จับภาพ ---
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) { delay(10); return; }

    // --- v10 ตาราง 24×24 → ลูบหัว (P) + ของตรงหน้า (O) ---
    if (fb->width >= GN * 2 && fb->height >= GN * 2) {
        unsigned long now = millis();
        gridFrom(fb); petTick(now); objTick(now);
        if (dbgV && now - lastDbgT >= 500) {
            lastDbgT = now;
            Serial.printf("[V] pet st=%d A=%d%% cy=%d | obj x=%d y=%d a=%d b=%d\n", petSt, petA, petCy, oX, oY, oA, oB);
        }
    }

    // --- Stage 1: จับใบหน้า (ใช้ detector ที่สร้างไว้แล้ว) ---
    int sh[3] = {(int)fb->height, (int)fb->width, 3};  // ไม่ใช้ vector!
    std::vector<int> shape(sh, sh + 3);
    auto &r1 = detector_s1.infer((uint16_t *)fb->buf, shape);

    if (r1.size() > 0) {
        lastFaceT = millis();

        // --- ตำแหน่งหน้า (ใช้กรอบจาก stage 1 ไม่ต้องรอ keypoints) — เลือกหน้าที่ใหญ่สุด ---
        {
            const int W = fb->width, Hh = fb->height;
            int bx0 = 0, by0 = 0, bx1 = 0, by1 = 0, bestW = -1;
            for (auto &c : r1) {
                int x0 = constrain(c.box[0], 0, W - 1), x1 = constrain(c.box[2], 0, W - 1);
                int y0 = constrain(c.box[1], 0, Hh - 1), y1 = constrain(c.box[3], 0, Hh - 1);
                if (x1 - x0 > bestW) { bestW = x1 - x0; bx0 = x0; bx1 = x1; by0 = y0; by1 = y1; }
            }
            int cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
            unsigned long now = millis();
            // บรรทัด F ละเอียด ~10 Hz
            if (now - lastFT >= POS_PERIOD_MS) {
                lastFT = now;
                int fx = constrain((cx - W / 2) * 200 / W, -100, 100);
                int fy = constrain((cy - Hh / 2) * 200 / Hh, -100, 100);
                int fw = constrain(bestW * 100 / W, 0, 100);
                Serial1.printf("F%d,%d,%d\n", fx, fy, fw);
            }
            // L/C/R ของเดิม (ส่งตอนเปลี่ยน) — ให้เฟิร์มแวร์หลักรุ่นเก่ายังทำงาน
            if (now - lastPosT >= 300) {
                lastPosT = now;
                char p = (cx < W/3) ? 'L' : (cx > W*2/3) ? 'R' : 'C';
                if (p != lastPos) { Serial1.write(p); lastPos = p; }
            }
        }

        // --- Stage 2: หา keypoints ---
        auto &r2 = detector_s2.infer((uint16_t *)fb->buf, shape, r1);

        if (!r2.empty() && r2.front().keypoint.size() >= 10) {
            auto &f = r2.front();

            // --- Keypoints → Ratio ---
            Rat rat = calcRat(
                (int)f.keypoint[0], (int)f.keypoint[1],   // left eye
                (int)f.keypoint[6], (int)f.keypoint[7],   // right eye
                (int)f.keypoint[4], (int)f.keypoint[5],   // nose
                (int)f.keypoint[2], (int)f.keypoint[3],   // mouth L
                (int)f.keypoint[8], (int)f.keypoint[9]);  // mouth R

            if (rat.ok) {
                emaUp(rat.m, rat.n, rat.d);

                if (!calOk) {
                    // === Calibration ===
                    bM += smM; bN += smN; bD += smD;
                    calCnt++;
                    Serial.printf("[CAL %d/10] m=%.3f\n", calCnt, smM);

                    if (calCnt >= 10) {
                        bM /= 10; bN /= 10; bD /= 10;
                        calOk = true;
                        Serial.printf("\n=== READY! base m=%.3f n=%.3f d=%.3f ===\n\n",
                                      bM, bN, bD);
                    }
                } else {
                    // === จำแนกอารมณ์ ===
                    float mD = smM - bM;
                    float nD = smN - bN;
                    float dD = smD - bD;

                    // Adaptive baseline — ทุกเฟรม ช้ามาก
                    bM += ADAPT_RATE * (smM - bM);
                    bN += ADAPT_RATE * (smN - bN);
                    bD += ADAPT_RATE * (smD - bD);

                    // จำแนก H / S / N
                    char det;
                    if (mD > TH_HAPPY)
                        det = EMO_HAPPY;
                    else if (nD > TH_SAD_N || dD > TH_SAD_D)
                        det = EMO_SAD;
                    else
                        det = EMO_NEUTRAL;

                    Serial.printf("[%c] m=%+.3f n=%+.3f d=%+.3f  base=%.3f\n",
                                  det, mD, nD, dD, bM);

                    // ส่งเฉพาะตอนเปลี่ยน
                    if (tryChange(det)) {
                        Serial1.write(curEmo);
                        Serial.printf(">>> SEND: %c <<<\n\n", curEmo);
                    }
                }
            }
        }
        // ไม่มี keypoints → ข้ามเลย ไม่นับ
    }

    // --- Timeout → X ---
    if (millis() - lastFaceT > FACE_TIMEOUT && curEmo != EMO_NOFACE) {
        curEmo = EMO_NOFACE;
        consecCnt = 0;
        Serial1.write(EMO_NOFACE);
        Serial.println(">>> SEND: X <<<\n");
    }

#if CAM_WIFI
    // --- โหมด both: บีบ RGB565 240×240 เป็น JPEG ด้วยซอฟต์แวร์ เฉพาะตอนมีคนดู (หรือขอ /capture) ---
    if ((curMode == MODE_BOTH && streamClients > 0 && millis() - lastEncT >= BOTH_ENC_MS) || snapReq) {
        lastEncT = millis();
        uint8_t *out = nullptr; size_t outLen = 0;
        if (frame2jpg(fb, BOTH_JPEG_Q, &out, &outLen)) publishJpg(out, outLen);
        if (out) free(out);
        snapReq = false;
    }
#endif

    // --- คืน frame buffer ---
    esp_camera_fb_return(fb);

    // --- FPS + Heap monitor ---
    fpsCnt++;
    if (millis() - fpsT >= 5000) {
        float fps = fpsCnt / ((millis() - fpsT) / 1000.0);
#if CAM_WIFI
        lastFps = fps;
#endif
        Serial.printf("[FPS] %.1f  [MEM] %d bytes free\n",
                      fps, esp_get_free_heap_size());
        fpsCnt = 0;
        fpsT = millis();
    }
}
