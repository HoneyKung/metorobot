/*
 * CamTest.ino — ทดสอบกล้อง XIAO ESP32S3 Sense
 * เปิด WiFi แล้วดูภาพจากเบราว์เซอร์
 *
 * ====== วิธีใช้ ======
 * 1. Upload โค้ดนี้ไปที่ XIAO
 * 2. เปิด Serial Monitor (115200)
 * 3. ต่อ WiFi ชื่อ "XIAO-CAM-TEST" (ไม่มีรหัส)
 * 4. เปิดเบราว์เซอร์ไปที่ http://192.168.4.1
 * 5. จะเห็นภาพจากกล้อง (refresh ทุกครั้งที่โหลดหน้า)
 *    หรือไปที่ http://192.168.4.1/stream เพื่อดูแบบ live
 *
 * ====== ตั้งค่า Arduino IDE (เหมือน FullCam) ======
 * Board:     ESP32S3 Dev Module
 * PSRAM:     OPI PSRAM
 * Partition: Huge APP (3MB No OTA/1MB SPIFFS)
 * USB CDC:   Enabled
 */

#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>

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

// === WiFi AP ===
const char* ssid = "XIAO-CAM-TEST";
WebServer server(80);

// === ถ่ายรูป 1 ใบ ===
void handleCapture() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Camera capture failed!");
    return;
  }

  server.sendHeader("Content-Type", "image/jpeg");
  server.sendHeader("Content-Length", String(fb->len));
  server.send(200, "image/jpeg", "");
  WiFiClient client = server.client();
  client.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

// === Stream แบบ MJPEG ===
void handleStream() {
  WiFiClient client = server.client();
  String boundary = "frame";

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: multipart/x-mixed-replace; boundary=" + boundary);
  client.println();

  while (client.connected()) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) continue;

    client.println("--" + boundary);
    client.println("Content-Type: image/jpeg");
    client.println("Content-Length: " + String(fb->len));
    client.println();
    client.write(fb->buf, fb->len);
    client.println();

    esp_camera_fb_return(fb);
    delay(50);
  }
}

// === หน้าแรก ===
void handleRoot() {
  String html = "<html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<title>XIAO CAM TEST</title>";
  html += "<style>body{background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:20px}";
  html += "img{max-width:100%;border:3px solid #0f0;border-radius:8px}";
  html += "a{color:#0f0;font-size:20px}</style></head><body>";
  html += "<h1>XIAO ESP32S3 Sense - Camera Test</h1>";
  html += "<p><a href='/stream'>Live Stream (MJPEG)</a></p>";
  html += "<h3>Single Frame:</h3>";
  html += "<img src='/capture' onclick='this.src=\"/capture?\"+Date.now()'>";
  html += "<p>Click image to refresh</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== XIAO CAM TEST ===");

  // === กล้อง ===
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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;

  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA;   // 320x240
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.fb_count     = 2;
  config.jpeg_quality = 10;
  config.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("CAMERA INIT FAILED! Error: 0x%x\n", err);
    Serial.println("Check:");
    Serial.println("  - PSRAM enabled? (Tools > PSRAM > OPI PSRAM)");
    Serial.println("  - Camera ribbon connected properly?");
    Serial.println("  - Board = ESP32S3 Dev Module?");
    while (true) delay(1000);
  }

  // ทดสอบถ่ายรูป 1 ใบ
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("Camera OK! Frame: %dx%d, %d bytes\n", fb->width, fb->height, fb->len);
    esp_camera_fb_return(fb);
  } else {
    Serial.println("WARNING: Camera init OK but capture failed!");
  }

  // === WiFi AP ===
  WiFi.softAP(ssid);
  Serial.printf("\nWiFi AP: \"%s\"\n", ssid);
  Serial.printf("Open browser: http://%s\n", WiFi.softAPIP().toString().c_str());
  Serial.println("  /         = main page");
  Serial.println("  /capture  = single frame");
  Serial.println("  /stream   = live MJPEG stream");

  // === Web Server ===
  server.on("/", handleRoot);
  server.on("/capture", handleCapture);
  server.on("/stream", handleStream);
  server.begin();

  Serial.println("\n=== Ready! ===");
}

void loop() {
  server.handleClient();
}
