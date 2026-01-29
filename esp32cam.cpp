/**
 * MooCare - ESP32-CAM (NGROK READY)
 * Auto-detect server URL dari Firebase (ngrok atau local)
 * Komunikasi Serial dengan ESP8266 Master Node
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- KONFIGURASI WIFI ---
const char* ssid = "iQOO Z9 5G";
const char* password = "11223344";

// --- KONFIGURASI FIREBASE ---
const char* firebaseHost = "mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* firebasePath = "/server_config.json";

// --- KONFIGURASI SERVER ---
String serverURL = "http://192.168.1.10:5000";  // Default fallback
bool useNgrok = false;

// --- DEBOUNCE VARIABLES ---
unsigned long lastSnapTime = 0;
String lastSnapID = "";
unsigned long lastWiFiTime = 0;
String lastWiFiSSID = "";

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

// ================= FUNGSI AUTO CONFIG DARI FIREBASE =================
void autoConfigFromFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String("https://") + firebaseHost + firebasePath;
  
  Serial.println(">>> Fetching server config from Firebase...");
  
  http.begin(url);
  http.setTimeout(10000);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    // Parse JSON
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      // Prioritas: gunakan ngrok_url jika ada, fallback ke IP lokal
      if (doc.containsKey("ngrok_url") && doc["ngrok_url"].as<String>() != "") {
        serverURL = doc["ngrok_url"].as<String>();
        useNgrok = true;
        Serial.println(">>> Using Ngrok URL: " + serverURL);
      } 
      else if (doc.containsKey("ip") && doc.containsKey("port")) {
        String ip = doc["ip"];
        int port = doc["port"];
        serverURL = "http://" + ip + ":" + String(port);
        useNgrok = false;
        Serial.println(">>> Using Local IP: " + serverURL);
      }
    } else {
      Serial.println(">>> JSON parse error");
    }
  } else {
    Serial.printf(">>> HTTP error: %d\n", httpCode);
  }
  
  http.end();
}

// ================= FUNGSI UPLOAD FOTO =================
void uploadPhoto(String cowId) {
  // Nyalakan flash
  digitalWrite(FLASH_GPIO_NUM, HIGH);
  delay(150);
  
  // Ambil foto
  camera_fb_t* fb = esp_camera_fb_get();
  
  // Matikan flash
  digitalWrite(FLASH_GPIO_NUM, LOW);
  
  if (!fb) {
    Serial.println(">>> Camera capture failed!");
    return;
  }
  
  Serial.printf(">>> Photo captured: %d bytes\n", fb->len);
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Build URL dengan query parameter
    String url = serverURL + "/upload?id=" + cowId;
    
    Serial.println(">>> Uploading to: " + url);
    
    http.begin(url);
    http.addHeader("Content-Type", "image/jpeg");
    
    // Timeout lebih lama untuk ngrok
    http.setTimeout(useNgrok ? 20000 : 10000);
    
    int httpCode = http.POST(fb->buf, fb->len);
    
    if (httpCode > 0) {
      Serial.printf(">>> Upload response: %d\n", httpCode);
      String response = http.getString();
      Serial.println(">>> Server: " + response);
    } else {
      Serial.printf(">>> Upload failed: %s\n", http.errorToString(httpCode).c_str());
    }
    
    http.end();
  } else {
    Serial.println(">>> WiFi Disconnected!");
  }
  
  esp_camera_fb_return(fb);
  Serial.println(">>> Upload complete\n");
}

void setup() {
  Serial.begin(115200); 
  pinMode(FLASH_GPIO_NUM, OUTPUT); 
  digitalWrite(FLASH_GPIO_NUM, LOW);

  Serial.println("\n=== MooCare ESP32-CAM ===");

  // 1. Konek WiFi
  WiFi.begin(ssid, password);
  Serial.print("WiFi Connecting");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP ESP32: "); 
  Serial.println(WiFi.localIP());

  // 2. Init Kamera
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
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Resolusi sedang untuk stabilitas
  if(psramFound()){
    config.frame_size = FRAMESIZE_SVGA; // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 1;
  } else {
    config.frame_size = FRAMESIZE_VGA; // 640x480
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera Init Failed: 0x%x\n", err);
    return;
  }
  
  // 3. Auto-detect server URL dari Firebase
  autoConfigFromFirebase();
  
  // Flash Kedip 3x Tanda Siap
  for(int i=0; i<3; i++) { 
    digitalWrite(FLASH_GPIO_NUM, HIGH); 
    delay(100); 
    digitalWrite(FLASH_GPIO_NUM, LOW); 
    delay(100); 
  }
  
  Serial.println("\n======================");
  Serial.println("ESP32-CAM READY!");
  Serial.println("Server: " + serverURL);
  Serial.println("Mode: " + String(useNgrok ? "NGROK (Internet)" : "LOCAL (WiFi)"));
  Serial.println("======================");
  Serial.println("Menunggu perintah SNAP:ID atau CONFIG:URL dari Serial...\n");
}

void loop() {
  // Cek apakah ada data masuk di kabel Serial
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim(); // Hapus spasi/enter di awal & akhir
    
    Serial.print(">>> DATA MASUK: [");
    Serial.print(data);
    Serial.println("]");

    // WiFi Auto Share dari ESP8266
    if (data.startsWith("WIFI:")) {
      int commaIdx = data.indexOf(',');
      String newSSID, newPASS;
      
      if (commaIdx > 0) {
        // Format: WIFI:ssid,password (secured network)
        newSSID = data.substring(5, commaIdx);
        newPASS = data.substring(commaIdx + 1);
        newPASS.trim(); // Trim password
      } else {
        // Format: WIFI:ssid (open network tanpa koma)
        newSSID = data.substring(5);
        newPASS = "";
      }
      
      newSSID.trim(); // Trim SSID juga
      
      // Debounce: Ignore jika SSID sama dalam 10 detik
      unsigned long currentTime = millis();
      if (newSSID == lastWiFiSSID && (currentTime - lastWiFiTime) < 10000) {
        Serial.println(">>> WIFI command ignored (debounce)");
        // JANGAN PAKAI return! Itu keluar dari loop()!
      } else {
        // HANYA jalankan WiFi connect jika TIDAK debounce
        lastWiFiTime = currentTime;
        lastWiFiSSID = newSSID;
        
        Serial.println(">>> WiFi Auto-Share dari ESP8266");
        Serial.println(">>> SSID: " + newSSID);
        
        WiFi.disconnect();
        delay(500);
        
        // Bedakan OPEN vs SECURED
        if (newPASS.length() > 0) {
          Serial.println(">>> Type: SECURED (WPA/WPA2)");
          Serial.println(">>> PASS length: " + String(newPASS.length()));
          WiFi.begin(newSSID.c_str(), newPASS.c_str());
        } else {
          Serial.println(">>> Type: OPEN (No password)");
          WiFi.begin(newSSID.c_str());
        }
        
        Serial.print(">>> Connecting");
        unsigned long startTime = millis();
        while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < 15000) {
          delay(500);
          Serial.print(".");
        }
        
        if (WiFi.status() == WL_CONNECTED) {
          Serial.println("\n>>> WiFi Connected!");
          Serial.println(">>> IP: " + WiFi.localIP().toString());
          autoConfigFromFirebase();
        } else {
          Serial.println("\n>>> WiFi Connect FAILED! Rollback...");
          WiFi.disconnect();
          delay(500);
          WiFi.begin(ssid, password);
          
          Serial.print(">>> Rollback connecting");
          startTime = millis();
          while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < 10000) {
            delay(500);
            Serial.print(".");
          }
          
          if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\n>>> Rollback OK! IP: " + WiFi.localIP().toString());
            autoConfigFromFirebase();
          } else {
            Serial.println("\n>>> Rollback FAILED!");
          }
        }
      }  // Tutup else dari debounce check
    }
    
    // Refresh config dari Firebase
    else if (data == "REFRESH") {
      Serial.println(">>> Refreshing config from Firebase...");
      autoConfigFromFirebase();
    }
    
    // Manual config (override Firebase)
    else if (data.startsWith("CONFIG:")) {
      String cfg = data.substring(7);
      if (cfg.startsWith("http://") || cfg.startsWith("https://")) {
        serverURL = cfg;
        useNgrok = serverURL.indexOf("ngrok") > 0;
        Serial.println(">>> Manual URL set: " + serverURL);
      } else {
        int colonIdx = cfg.indexOf(':');
        if (colonIdx > 0) {
          String ip = cfg.substring(0, colonIdx);
          String port = cfg.substring(colonIdx + 1);
          serverURL = "http://" + ip + ":" + port;
          useNgrok = false;
          Serial.println(">>> Server set: " + serverURL);
        }
      }
    }
    
    // Ambil foto dan upload
    else if (data.startsWith("SNAP:")) {
      String cowID = data.substring(5);
      
      // Debounce: Ignore jika ID sama dalam 5 detik
      unsigned long currentTime = millis();
      if (cowID == lastSnapID && (currentTime - lastSnapTime) < 5000) {
        Serial.println(">>> SNAP ignored (debounce) - ID: " + cowID);
        // JANGAN return! Itu keluar dari loop()!
      } else {
        // HANYA upload jika TIDAK debounce
        lastSnapTime = currentTime;
        lastSnapID = cowID;
        
        Serial.println(">>> FORMAT BENAR. Memproses ID: " + cowID);
        uploadPhoto(cowID);
      }
    } 
    
    // Status check
    else if (data == "STATUS") {
      Serial.println("=== STATUS ===");
      Serial.println("WiFi: " + WiFi.localIP().toString());
      Serial.println("Server: " + serverURL);
      Serial.println("Mode: " + String(useNgrok ? "NGROK" : "LOCAL"));
      Serial.println("==============");
    }
    
    else {
      Serial.println(">>> FORMAT SALAH. Perintah: WIFI:ssid[,pass], SNAP:ID, CONFIG:url, REFRESH, STATUS");
    }
  }
  
  delay(10);
}
