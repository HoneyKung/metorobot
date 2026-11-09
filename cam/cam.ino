#include "esp_camera.h"

// ⚙️ ตั้งค่ากล้อง (AI Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define MOTION_THRESHOLD 40 

uint8_t* prev_frame = NULL;
int frame_len = 0;

void setup() {
  Serial.begin(9600);
  
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size = FRAMESIZE_QQVGA;
  config.fb_count = 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera Init Failed");
    return;
  }
}

void loop() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) return;

  if (prev_frame == NULL) {
    frame_len = fb->len;
    prev_frame = (uint8_t*)malloc(frame_len);
    memcpy(prev_frame, fb->buf, frame_len);
    esp_camera_fb_return(fb);
    return;
  }

  long diff_left = 0;
  long diff_right = 0;
  long diff_center = 0;

  int w = fb->width;
  int h = fb->height;

  for (int i = 0; i < frame_len; i++) {
    int diff = abs(fb->buf[i] - prev_frame[i]);
    
    if (diff > MOTION_THRESHOLD) {
      int x = i % w;
      
      if (x < w / 3) {
        diff_right++;
      } else if (x > (w * 2 / 3)) {
        diff_left++;
      } else {
        diff_center++;
      }
    }
  }

  memcpy(prev_frame, fb->buf, frame_len);
  esp_camera_fb_return(fb);


  int sensitive = 150; 

  if (diff_center > sensitive) {
    Serial.write('H');
  } else if (diff_left > sensitive && diff_left > diff_right) {
    Serial.write('L');
  } else if (diff_right > sensitive && diff_right > diff_left) {
    Serial.write('R');
  } else {
    Serial.write('N');
  }

  delay(100);
}