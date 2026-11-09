/*
 * FaceTest307.ino — ทดสอบ face detection ด้วย ESP-DL โดยตรง
 * สำหรับ XIAO ESP32S3 Sense
 *
 * ====== ตั้งค่า Arduino IDE ======
 * Board Package: esp32 by Espressif Systems v3.0.7
 * Board:         XIAO_ESP32S3  (หรือ ESP32S3 Dev Module)
 * PSRAM:         OPI PSRAM
 * Partition:     Huge APP (3MB No OTA / 1MB SPIFFS)
 * USB CDC:       Enabled
 *
 * ====== วัตถุประสงค์ ======
 * ทดสอบว่า board package v3.0.7 + human_face_detect
 * compile ผ่านบน XIAO ESP32S3 Sense หรือไม่
 * ถ้าผ่าน → จะพัฒนาต่อเป็นระบบจับหน้า+อารมณ์เต็มรูปแบบ
 */

#include "esp_camera.h"
#include "human_face_detect_msr01.hpp"
#include "human_face_detect_mnp01.hpp"

// === XIAO ESP32S3 Sense Camera Pins ===
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

// === Serial สำหรับส่งข้อมูลไป ESP32 หลัก ===
#define MAIN_TX_PIN  43
#define MAIN_RX_PIN  44

void setup() {
    Serial.begin(115200);
    Serial1.begin(9600, SERIAL_8N1, MAIN_RX_PIN, MAIN_TX_PIN);
    delay(1000);
    Serial.println("\n=== FaceTest307 — ESP-DL Direct ===");

    // === ตั้งค่ากล้อง ===
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;

    // ใช้ RGB565 เพื่อส่งเข้า face detector ได้โดยตรง
    config.pixel_format = PIXFORMAT_RGB565;
    config.frame_size   = FRAMESIZE_240X240;  // 240x240 เหมาะกับ face detect
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("CAMERA INIT FAILED! Error: 0x%x\n", err);
        while (true) delay(1000);
    }
    Serial.println("Camera OK!");

    // ทดสอบถ่ายรูป 1 ใบ
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
        Serial.printf("Frame: %dx%d, %d bytes, format=%d\n",
                       fb->width, fb->height, fb->len, fb->format);
        esp_camera_fb_return(fb);
    } else {
        Serial.println("WARNING: Capture failed!");
    }

    Serial.println("=== Ready! ===\n");
}

void loop() {
    // จับภาพ
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Capture fail");
        delay(100);
        return;
    }

    unsigned long t0 = millis();

    // === Stage 1: จับตำแหน่งใบหน้า ===
    HumanFaceDetectMSR01 s1(0.1F, 0.5F, 10, 0.2F);
    std::vector<int> shape = {(int)fb->height, (int)fb->width, 3};
    auto &results1 = s1.infer((uint16_t *)fb->buf, shape);

    if (results1.size() > 0) {
        unsigned long t1 = millis();
        Serial.printf("[Stage1] เจอ %d หน้า (%lums)\n", results1.size(), t1 - t0);

        // === Stage 2: หา keypoints (ตา จมูก ปาก) ===
        // ต้องส่ง results1 เข้าไปเป็น candidates ด้วย!
        HumanFaceDetectMNP01 s2(0.5F, 0.3F, 5);
        auto &results2 = s2.infer((uint16_t *)fb->buf, shape, results1);

        unsigned long dt = millis() - t0;

        for (auto &r : results2) {
            // Bounding box
            Serial.printf("[FACE] box=(%d,%d,%d,%d) score=%.2f  %lums\n",
                          r.box[0], r.box[1], r.box[2], r.box[3],
                          r.score, dt);

            // Keypoints: [left_eye_x, left_eye_y, mouth_left_x, mouth_left_y,
            //             nose_x, nose_y, right_eye_x, right_eye_y,
            //             mouth_right_x, mouth_right_y]
            if (r.keypoint.size() >= 10) {
                int lex = (int)r.keypoint[0];
                int ley_v = (int)r.keypoint[1];
                int mlx = (int)r.keypoint[2];
                int mly_v = (int)r.keypoint[3];
                int nx  = (int)r.keypoint[4];
                int ny_v  = (int)r.keypoint[5];
                int rex = (int)r.keypoint[6];
                int rey_v = (int)r.keypoint[7];
                int mrx = (int)r.keypoint[8];
                int mry_v = (int)r.keypoint[9];

                Serial.printf("  LeftEye=(%d,%d) RightEye=(%d,%d)\n", lex, ley_v, rex, rey_v);
                Serial.printf("  Nose=(%d,%d)\n", nx, ny_v);
                Serial.printf("  MouthL=(%d,%d) MouthR=(%d,%d)\n", mlx, mly_v, mrx, mry_v);

                // === คำนวณตำแหน่ง (ซ้าย/กลาง/ขวา) ===
                int faceCx = (r.box[0] + r.box[2]) / 2;
                int frameW = fb->width;
                char pos;
                if (faceCx < frameW / 3)          pos = 'L';
                else if (faceCx > frameW * 2 / 3) pos = 'R';
                else                               pos = 'C';

                Serial.printf("  Position: %c\n", pos);

                // ส่งตำแหน่งไป ESP32 หลัก (ถ้าต่อสายแล้ว)
                Serial1.write(pos);
            }
        }

        if (results2.empty()) {
            Serial.printf("[FACE] detected (no keypoints) %lums\n", millis() - t0);
        }

    } else {
        // ไม่เจอหน้า (print ไม่บ่อย)
        static unsigned long lastNoFacePrint = 0;
        if (millis() - lastNoFacePrint > 2000) {
            Serial.printf("[NO FACE] %lums\n", millis() - t0);
            lastNoFacePrint = millis();
        }
    }

    esp_camera_fb_return(fb);

    // ไม่มี delay → ได้ FPS สูงสุด
}
