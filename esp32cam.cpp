/**
 * MASTAVIA - ESP32-CAM (LIGHTWEIGHT CLIENT)
 * Tugas: Hanya memotret & kirim ke Laptop.
 * TIDAK ADA FIREBASE DI SINI (Hemat Memori).
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// --- KONFIGURASI WIFI ---
const char* ssid = "iQOO Z9 5G";
const char* password = "11223344";

// --- KONFIGURASI SERVER LAPTOP ---
// Ganti dengan IP Laptop Anda (Cek di server.py saat dijalankan)
String serverIP = "10.127.199.244"; 
int serverPort = 5000;

// Pin AI Thinker
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
#define FLASH_GPIO_NUM     4

void setup() {
  Serial.begin(115200); 
  pinMode(FLASH_GPIO_NUM, OUTPUT); digitalWrite(FLASH_GPIO_NUM, LOW);

  // 1. Konek WiFi
  WiFi.begin(ssid, password);
  Serial.print("WiFi Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP ESP32: "); Serial.println(WiFi.localIP());

  // 2. Init Kamera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0; config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM; config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM; config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM; config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM; config.pin_sscb_sda = SIOD_GPIO_NUM; config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000; config.pixel_format = PIXFORMAT_JPEG;
  
  // Karena beban ringan, kita bisa coba resolusi agak tinggi
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA; // Resolusi Tinggi (1600x1200)
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA; // Resolusi Sedang (800x600)
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera Init Failed: 0x%x", err);
    return;
  }
  
  // Flash Kedip 3x Tanda Siap
  for(int i=0; i<3; i++) { digitalWrite(FLASH_GPIO_NUM, HIGH); delay(100); digitalWrite(FLASH_GPIO_NUM, LOW); delay(100); }
  Serial.println("SIAP! Menunggu perintah SNAP:ID dari Serial...");
}

String sendPhotoToLaptop(camera_fb_t * fb, String id) {
  HTTPClient http;
  http.setTimeout(10000); // 10 Detik timeout

  String url = "http://" + serverIP + ":" + String(serverPort) + "/upload";
  String boundary = "---ESP32CAM-BOUNDARY";
  
  // Header Multipart
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"" + id + ".jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";
  
  uint32_t totalLen = fb->len + head.length() + tail.length();
  
  Serial.println("Connecting to Laptop: " + url);
  
  if (http.begin(url)) {
      http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
      
      // Alokasi Buffer untuk kirim data
      uint8_t *payload = (uint8_t *)malloc(totalLen);
      if(!payload) {
         // Jika malloc gagal (jarang terjadi di sini), coba PSRAM
         payload = (uint8_t *)ps_malloc(totalLen);
      }
      
      if(payload) {
          memcpy(payload, head.c_str(), head.length());
          memcpy(payload + head.length(), fb->buf, fb->len);
          memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());
          
          int httpCode = http.POST(payload, totalLen);
          String response = http.getString();
          
          free(payload); 
          http.end();
          
          if (httpCode == 200) {
              return response; // Sukses
          } else {
              Serial.print("HTTP Error: "); Serial.println(httpCode);
          }
      } else {
          Serial.println("Gagal Alokasi Memori Buffer!");
      }
  } else {
      Serial.println("Gagal Connect ke Laptop (Cek IP/Firewall)");
  }
  return "";
}

void loop() {
  // Cek apakah ada data masuk di kabel Serial
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim(); // Hapus spasi/enter di awal & akhir
    
    // --- TAMBAHAN DEBUGGING (Supaya Anda tahu data masuk) ---
    Serial.print("➡️ DATA MASUK: [");
    Serial.print(data);
    Serial.println("]");
    // -------------------------------------------------------

    if (data.startsWith("SNAP:")) {
      String cowID = data.substring(5);
      Serial.println("✅ FORMAT BENAR. Memproses ID: " + cowID);
      
      // Ambil Foto
      camera_fb_t * fb = esp_camera_fb_get();
      if (!fb) { Serial.println("❌ Gagal Ambil Foto (Kamera Error)"); return; }
      
      // Nyalakan Flash tanda sedang upload
      digitalWrite(FLASH_GPIO_NUM, HIGH); 
      String result = sendPhotoToLaptop(fb, cowID);
      digitalWrite(FLASH_GPIO_NUM, LOW);
      
      esp_camera_fb_return(fb); 
      
      if (result != "") Serial.println("🚀 SUKSES UPLOAD & UPDATE FIREBASE!");
      else Serial.println("⚠️ GAGAL UPLOAD ke Laptop.");
      
    } else {
      // Notifikasi jika data masuk tapi format salah
      Serial.println("⚠️ FORMAT SALAH/DIABAIKAN. Harus diawali 'SNAP:'");
    }
  }
}