/**
 * MASTIVIA - Master Node (ESP8266)
 * VERSION 3.7 (FIXED: PHOTO TRIGGER IN MENU B ADDED)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <Adafruit_MLX90614.h>
#include <Wire.h>
#include <PCF8574.h>
#include <time.h> 

// --- PIN CONFIG ---
#define TFT_CS    15   // D8
#define TFT_DC    0    // D3
#define TFT_RES   2    // D4
#define TDS_PIN   A0   
#define SDA_PIN   4    // D2
#define SCL_PIN   5    // D1
#define PCF8574_ADDR 0x20
#define PIN_BUZZER   16  // D0

// --- WIFI & FIREBASE ---
// PASTIKAN SSID & PASSWORD INI SAMA DENGAN YANG DIPAKAI LAPTOP SERVER
const char* def_ssid     = "Rumah_Larosa"; 
const char* def_password = "togalarosa";

// PASTIKAN DIAKHIRI TANDA "/"
const char* dbBaseURL    = "https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/";

// --- SETUP LAINNYA ---
#define NTP_SERVER "pool.ntp.org"
#define TZ_OFFSET 7 * 3600 
#define DST_OFFSET 0

// WARNA UI
#define C_BG 0x0000 
#define C_WHITE 0xFFFF
#define C_MASTIVIA 0x07E0 
#define C_GRAY 0x8410
#define C_DARK_GRAY 0x4208
#define C_WARN 0xFD20 
#define C_ERROR 0xF800 
#define C_SUCCESS 0x07E0 
#define C_BLUE 0x051F

// OBJEK
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RES);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
PCF8574 pcf8574(PCF8574_ADDR);

const int rowPins[4] = {7, 6, 5, 4}; 
const int colPins[4] = {3, 2, 1, 0}; 
char keys[4][4] = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};

enum AppState { STATE_BOOT, STATE_RESCUE, STATE_MENU, STATE_INPUT_ID, STATE_PHOTO_ASK, STATE_CAM_MODE, STATE_MEASURE_READY, STATE_RESULT };
AppState currentState = STATE_BOOT;

int flowType = 0; 
String currentID = "";
float valTemp = 0.0;
float valCond = 0.0;
bool isOfflineMode = false;

// --- HARDWARE HELPER ---
void beepShort() { digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW); }
void beepAlarm() { for(int i=0; i<3; i++) { digitalWrite(PIN_BUZZER, HIGH); delay(80); digitalWrite(PIN_BUZZER, LOW); delay(50); } }

char readKeypad() {
  for (int r = 0; r < 4; r++) {
    for (int i = 0; i < 4; i++) pcf8574.write(rowPins[i], HIGH);
    pcf8574.write(rowPins[r], LOW);
    for (int c = 0; c < 4; c++) {
      if (pcf8574.read(colPins[c]) == LOW) {
        beepShort(); delay(100); while(pcf8574.read(colPins[c]) == LOW) yield(); return keys[r][c];
      }
    }
  } return 0;
}

// --- TIME & LOG ---
void setupTime() { configTime(TZ_OFFSET, DST_OFFSET, NTP_SERVER); }
String getTodayDate() {
  time_t now = time(nullptr); struct tm* timeinfo = localtime(&now);
  char buffer[12]; strftime(buffer, sizeof(buffer), "%Y-%m-%d", timeinfo); return String(buffer);
}
String getFullFormattedTime() {
  time_t now = time(nullptr); struct tm* timeinfo = localtime(&now);
  char buffer[20]; strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M", timeinfo); return String(buffer);
}
bool checkDailyDuplicate(String id, String type) {
  if (isOfflineMode) return false;
  String today = getTodayDate(); if (today.startsWith("1970")) return false; 
  WiFiClientSecure client; client.setInsecure(); HTTPClient http;
  String url = String(dbBaseURL) + "daily_logs/" + today + "/" + id + "/" + type + ".json";
  http.begin(client, url); int httpCode = http.GET(); String payload = http.getString(); http.end();
  return (httpCode == 200 && payload != "null");
}
void logDailyActivity(String id, String type) {
  if (isOfflineMode) return;
  String today = getTodayDate(); WiFiClientSecure client; client.setInsecure(); HTTPClient http;
  String url = String(dbBaseURL) + "daily_logs/" + today + "/" + id + "/" + type + ".json";
  http.begin(client, url); http.PUT("true"); http.end();
}

// --- UI HELPERS ---
void drawSignal(int x, int y, uint16_t color) { for(int i=0; i<4; i++) tft.fillRect(x+(i*3), y+(6-(i*2)), 2, 4+(i*2), color); }
void drawIconQuick(int x, int y, uint16_t color) { tft.fillTriangle(x+10, y, x+4, y+10, x+10, y+10, color); tft.fillTriangle(x+8, y+20, x+16, y+8, x+8, y+8, color); }
void drawIconCow(int x, int y, uint16_t color) { tft.fillRoundRect(x, y+4, 22, 14, 3, color); tft.fillCircle(x+2, y+4, 3, color); tft.fillCircle(x+20, y+4, 3, color); tft.fillRect(x+7, y+13, 8, 4, C_BG); }
void drawIconCam(int x, int y, uint16_t color) { tft.fillRoundRect(x, y+4, 24, 15, 2, color); tft.fillRect(x+8, y, 8, 4, color); tft.fillCircle(x+12, y+11, 6, C_BG); tft.fillCircle(x+12, y+11, 2, color); }
void showLoadingBar(int percent) { int w = map(percent, 0, 100, 0, 100); tft.drawRect(30, 80, 102, 8, C_WHITE); tft.fillRect(31, 81, w, 6, C_WHITE); }

void showStatusAnim(bool success) {
  tft.fillScreen(C_BG); int cx = 80, cy = 60;
  for(int r=0; r<=28; r+=7) { tft.fillCircle(cx, cy, r, C_WHITE); delay(30); }
  if(success) {
    beepShort(); 
    tft.drawLine(cx-10, cy, cx-3, cy+10, C_SUCCESS); tft.drawLine(cx-9, cy, cx-2, cy+10, C_SUCCESS); 
    tft.setCursor(45, 100); tft.setTextColor(C_SUCCESS); tft.print("BERHASIL");
  } else {
    beepAlarm();
    tft.drawLine(cx-10, cy-10, cx+10, cy+10, C_ERROR); tft.drawLine(cx-9, cy-10, cx+11, cy+10, C_ERROR); 
    tft.setCursor(55, 100); tft.setTextColor(C_ERROR); tft.print("GAGAL");
  } delay(1500);
}

void showBypassMessage(String msg1, String msg2) { 
  tft.fillScreen(C_BG); 
  tft.fillRoundRect(10, 30, 140, 70, 5, C_WHITE); 
  tft.setTextColor(C_DARK_GRAY); tft.setTextSize(1); 
  tft.setCursor(20, 45); tft.print("INFO:"); 
  tft.setTextColor(C_ERROR); 
  tft.setCursor(20, 65); tft.print(msg1); 
  tft.setCursor(20, 80); tft.print(msg2); 
  delay(2000); 
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200); 
  pinMode(PIN_BUZZER, OUTPUT); digitalWrite(PIN_BUZZER, LOW);
  
  Wire.begin(SDA_PIN, SCL_PIN); Wire.setClock(100000); 
  pcf8574.begin(); for(int i=0; i<4; i++) pcf8574.write(colPins[i], HIGH);
  mlx.begin();
  tft.initR(INITR_BLACKTAB); tft.setRotation(1);
  
  currentState = STATE_BOOT;
  bootSequence();
}

void loop() {
  char key = readKeypad();
  switch(currentState) {
    case STATE_RESCUE: loopRescue(key); break;
    case STATE_MENU:   loopMenu(key); break;
    case STATE_INPUT_ID: loopInputID(key); break;
    case STATE_PHOTO_ASK: loopPhotoAsk(key); break;
    case STATE_CAM_MODE: loopCamMode(key); break;
    case STATE_MEASURE_READY: loopMeasureReady(key); break; 
    case STATE_RESULT: loopResult(key); break;   
  }
}

// ===================== LOGIC UTAMA =====================
void bootSequence() {
  tft.fillScreen(C_BG); tft.setTextSize(2); tft.setTextColor(C_MASTIVIA); tft.setCursor(35, 50); tft.print("mastivia"); 
  WiFi.mode(WIFI_STA); WiFi.begin(def_ssid, def_password);
  unsigned long startT = millis(); bool connected = false;
  
  // Tunggu 10 detik
  while(millis() - startT < 10000) {
    if(WiFi.status() == WL_CONNECTED) { connected = true; showLoadingBar(100); break; }
    showLoadingBar(map(millis() - startT, 0, 10000, 0, 95)); delay(100);
  }
  
  if(connected) { 
    setupTime(); 
    delay(500); 
    isOfflineMode = false; // ONLINE
    drawMainMenu(); 
    currentState = STATE_MENU; 
  } else { 
    isOfflineMode = true; // OFFLINE
    drawRescueMenu(); 
    currentState = STATE_RESCUE; 
  }
}

// --- RESCUE MENU (Sesuai Permintaan) ---
void drawRescueMenu() {
  tft.fillScreen(C_BG); tft.drawRect(5, 5, 150, 118, C_ERROR); tft.setTextColor(C_WHITE); tft.setTextSize(1);
  tft.setCursor(45, 15); tft.print("CONNECTION"); tft.setCursor(55, 25); tft.print("FAILED");
  tft.setCursor(20, 50); tft.print("1. RESCAN");
  tft.setCursor(20, 70); tft.print("2. AUTO OPEN");
  tft.setCursor(20, 90); tft.print("3. MODE OFFLINE");
}

void connectAutoOpen() {
  tft.fillScreen(C_BG); tft.setTextColor(C_MASTIVIA); tft.setCursor(10, 50); tft.print("Scanning...");
  int n = WiFi.scanNetworks(); bool found = false;
  for (int i = 0; i < n; ++i) {
    if (WiFi.encryptionType(i) == ENC_TYPE_NONE) {
      tft.setCursor(10, 70); tft.print("Try: " + WiFi.SSID(i)); WiFi.begin(WiFi.SSID(i));
      unsigned long s = millis(); while(millis() - s < 8000) { if(WiFi.status() == WL_CONNECTED) { found = true; break; } delay(100); }
    } if(found) break;
  }
  if(found) { isOfflineMode = false; setupTime(); drawMainMenu(); currentState = STATE_MENU; } 
  else { tft.setCursor(10, 90); tft.setTextColor(C_ERROR); tft.print("Gagal!"); delay(1000); drawRescueMenu(); }
}

void loopRescue(char key) {
  if (key == '1') { // RESCAN / REBOOT
    tft.fillScreen(C_BG); tft.setCursor(40,60); tft.print("Rebooting..."); 
    delay(500); ESP.restart(); 
  }
  if (key == '2') { // AUTO OPEN
    connectAutoOpen(); 
  }
  if (key == '3') { // MASUK MODE OFFLINE
    isOfflineMode = true; 
    WiFi.disconnect(); 
    drawMainMenu(); 
    currentState = STATE_MENU; 
  }
}

void drawMainMenu() {
  tft.fillScreen(C_BG); tft.fillRect(0, 0, 160, 14, C_DARK_GRAY);
  tft.setTextSize(1); tft.setTextColor(C_WHITE); tft.setCursor(5, 3); tft.print(isOfflineMode ? "OFFLINE MODE" : "ONLINE");
  if(!isOfflineMode) drawSignal(145, 3, C_SUCCESS);
  
  // ICON TETAP DIGAMBAR
  int boxY = 25, iconY = 32, textInY = 60, keyY = 82;
  tft.fillRoundRect(5, boxY, 46, 50, 4, C_DARK_GRAY); drawIconQuick(18, iconY, C_WARN); tft.setTextColor(C_WARN); tft.setCursor(13, textInY); tft.print("CEPAT"); tft.setCursor(24, keyY); tft.print("A");     
  
  // WARNA BERUBAH JIKA OFFLINE (Visual Feedback)
  uint16_t c_sapi_bg = isOfflineMode ? 0x2104 : C_BLUE; 
  uint16_t c_sapi_fg = isOfflineMode ? C_GRAY : C_WHITE; 
  tft.fillRoundRect(57, boxY, 46, 50, 4, c_sapi_bg); drawIconCow(68, iconY, c_sapi_fg); tft.setTextColor(c_sapi_fg); tft.setCursor(67, textInY); tft.print("SAPI"); tft.setCursor(76, keyY); tft.print("B");
  
  uint16_t c_cam_bg = isOfflineMode ? 0x2104 : C_BLUE; 
  uint16_t c_cam_fg = isOfflineMode ? C_GRAY : C_WHITE;
  tft.fillRoundRect(109, boxY, 46, 50, 4, c_cam_bg); drawIconCam(119, iconY, c_cam_fg); tft.setTextColor(c_cam_fg); tft.setCursor(120, textInY); tft.print("CAM"); tft.setCursor(129, keyY); tft.print("C");
  
  tft.setTextColor(C_GRAY); tft.setCursor(35, 105); tft.print(isOfflineMode ? "Mode Terbatas" : "Pilih Menu");
}

// --- LOGIKA MENU DENGAN PEMBLOKIRAN ---
void loopMenu(char key) {
  if (key == 'A') { 
    flowType = 0; drawMeasureReadyUI(); currentState = STATE_MEASURE_READY; 
  }
  else if (key == 'B') { 
    if (isOfflineMode) {
       showBypassMessage("AKSES DITOLAK", "KONEKSI OFFLINE");
       drawMainMenu(); // Refresh layar
    } else {
       flowType = 1; drawInputUI(); currentState = STATE_INPUT_ID; 
    }
  }
  else if (key == 'C') { 
    if (isOfflineMode) {
       showBypassMessage("AKSES DITOLAK", "KONEKSI OFFLINE");
       drawMainMenu();
    } else {
       flowType = 2; drawInputUI(); currentState = STATE_INPUT_ID; 
    }
  }
}

void drawInputUI() {
  tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(10, 10); tft.print("INPUT ID SAPI:"); tft.drawRoundRect(10, 40, 140, 30, 2, C_WHITE);
  tft.setCursor(10, 90); tft.setTextColor(C_GRAY); tft.print("[#]OK  [C]CLR"); tft.setCursor(10, 105); tft.setTextColor(C_ERROR); tft.print("[*] BATAL");
  currentID = "";
}

// --- PERBAIKAN VALIDASI DATABASE ---
bool validateIDInDB(String id) {
  if (isOfflineMode) return false;

  WiFiClientSecure client; 
  client.setInsecure(); // PENTING: Bypass SSL Check
  HTTPClient http;
  
  // Format Query Firebase: OrderBy & EqualTo
  // Pastikan di Firebase Rules "id" sudah di index (.indexOn)
  String url = String(dbBaseURL) + "cows.json?orderBy=\"id\"&equalTo=\"" + id + "\"";
  
  Serial.println("Cek URL: " + url); // DEBUGGING KE SERIAL
  
  http.begin(client, url); 
  int code = http.GET(); 
  String payload = http.getString(); 
  http.end();
  
  Serial.print("Code: "); Serial.println(code); // DEBUG CODE
  Serial.print("Data: "); Serial.println(payload); // DEBUG DATA

  // SYARAT VALID:
  // 1. Code 200 (OK)
  // 2. Payload bukan "null" string
  // 3. Panjang data > 2 (artinya bukan objek kosong "{}")
  return (code == 200 && payload != "null" && payload.length() > 2);
}

void loopInputID(char key) {
  if (key >= '0' && key <= '9' && currentID.length() < 5) {
    currentID += key; tft.fillRect(12, 45, 136, 20, C_BG); tft.setCursor(15, 48); tft.setTextSize(2); tft.setTextColor(C_WARN); tft.print(currentID); tft.setTextSize(1);
  }
  else if (key == 'C') { currentID = ""; tft.fillRect(12, 45, 136, 20, C_BG); }
  else if (key == '*') { drawMainMenu(); currentState = STATE_MENU; }
  else if (key == '#' && currentID.length() > 0) {
    tft.setCursor(10, 75); tft.setTextColor(C_MASTIVIA); tft.print("Validasi ID...");
    
    // Cek Database
    if (validateIDInDB(currentID)) {
      // Cek Duplikat Harian
      String checkType = (flowType == 1) ? "sensor" : "photo";
      if (checkDailyDuplicate(currentID, checkType)) {
         if (flowType == 1) showBypassMessage("SAPI SUDAH", "DIPERIKSA HARI INI"); else showBypassMessage("FOTO SAPI", "SUDAH TERSEDIA");
         drawMainMenu(); currentState = STATE_MENU; return;
      }
      
      // Lanjut Sesuai Menu
      if (flowType == 1) { drawPhotoAsk(); currentState = STATE_PHOTO_ASK; } 
      else { drawCamInterface(); currentState = STATE_CAM_MODE; }
      
    } else { 
      tft.fillRect(10, 75, 140, 10, C_BG); tft.setCursor(10, 75); tft.setTextColor(C_ERROR); tft.print("ID TIDAK TERDAFTAR!"); 
      delay(1500); drawInputUI(); 
    }
  }
}

void drawPhotoAsk() {
  tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setTextSize(2); tft.setCursor(20, 20); tft.print("CAPTURE?"); tft.setTextSize(1);
  tft.fillRoundRect(10, 60, 65, 30, 4, C_MASTIVIA); tft.setTextColor(C_BG); tft.setCursor(22, 70); tft.print("[A] YA");
  tft.drawRoundRect(85, 60, 65, 30, 4, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(97, 70); tft.print("[B] NO"); tft.setCursor(50, 110); tft.setTextColor(C_ERROR); tft.print("[*] BATAL");
}

// ===============================================
// BAGIAN INI SUDAH DIPERBAIKI (ADDED SERIAL SNAP)
// ===============================================
void loopPhotoAsk(char key) {
  if(key == 'A') { 
    // Tampilkan status di layar
    tft.fillScreen(C_BG); 
    tft.setTextColor(C_WHITE); 
    tft.setCursor(40, 50); 
    tft.print("SIAP FOTO..."); 
    
    // >>> PERBAIKAN: KIRIM PERINTAH KE ESP32 VIA SERIAL <<<
    Serial.println("SNAP:" + currentID); 
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    delay(1000); 
    
    // Efek visual (Shutter)
    tft.fillCircle(80, 64, 40, C_WHITE); 
    delay(100); 
    
    // Catat ke Firebase bahwa hari ini sudah foto
    logDailyActivity(currentID, "photo"); 
    
    // Kembali ke menu ukur
    drawMeasureReadyUI(); 
    currentState = STATE_MEASURE_READY;
  } 
  else if (key == 'B') { 
    drawMeasureReadyUI(); 
    currentState = STATE_MEASURE_READY; 
  }
  else if (key == '*') { 
    drawMainMenu(); 
    currentState = STATE_MENU; 
  } 
}

void drawCamInterface() {
  tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.drawRect(10, 20, 140, 80, C_WHITE); tft.setCursor(60, 55); tft.print("CAM VIEW"); tft.setCursor(10, 110); tft.print("[A] SHOOT   [*] KEMBALI");
}

void loopCamMode(char key) {
  if (key == 'A') {
    beepShort(); 
    tft.fillScreen(C_WHITE); delay(100); tft.fillScreen(C_BG); tft.setCursor(40, 60); tft.setTextColor(C_WHITE); tft.print("Memproses...");
    
    // Kirim Perintah ke ESP32 (Hanya jika Online)
    Serial.println("SNAP:" + currentID);
    
    delay(1000); 
    logDailyActivity(currentID, "photo"); showStatusAnim(true); drawMainMenu(); currentState = STATE_MENU;
  } else if (key == '*') { drawMainMenu(); currentState = STATE_MENU; }
}

void drawMeasureReadyUI() {
  tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); if(flowType == 0) tft.print("DETEKSI CEPAT"); else { tft.print("ID: "); tft.print(currentID); }
  tft.drawFastHLine(0, 20, 160, C_GRAY); tft.setCursor(10, 50); tft.setTextColor(C_WHITE); tft.print("SIAPKAN SENSOR...");
  tft.fillRoundRect(10, 70, 140, 30, 4, C_DARK_GRAY); tft.setCursor(25, 80); tft.setTextColor(C_WARN); tft.print("TEKAN [A] UKUR"); tft.setCursor(10, 110); tft.setTextColor(C_ERROR); tft.print("[*] BATAL");
}

void loopMeasureReady(char key) {
  if (key == 'A') {
    tft.fillRoundRect(10, 70, 140, 30, 4, C_WHITE); tft.setCursor(35, 80); tft.setTextColor(C_BG); tft.print("MENGUKUR...");
    for(int i=0; i<3; i++) { valTemp = mlx.readObjectTempC(); float voltage = analogRead(TDS_PIN) * (3.3 / 1024.0); valCond = voltage * 2.0; delay(50); }
    if(isnan(valTemp) || valTemp > 1000) valTemp = 0.0;
    drawResultUI(); currentState = STATE_RESULT;
  } else if (key == '*') { drawMainMenu(); currentState = STATE_MENU; }
}

void drawResultUI() {
  tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); if(flowType == 0) tft.print("HASIL UKUR"); else { tft.print("ID: "); tft.print(currentID); }
  
  // LOGIC STATUS (SESUAIKAN DENGAN WEB)
  String status = "Normal"; uint16_t color = C_SUCCESS;
  
  if (valTemp > 39.5 || valCond > 6.0) { 
    status = "Terindikasi Mastitis"; // Wajib sama dengan React App
    color = C_ERROR; 
    beepAlarm(); 
  } 
  else if (valTemp > 38.5 || valCond > 5.0) { 
    status = "Waspada"; // Wajib sama dengan React App
    color = C_WARN; 
    beepShort(); 
  }

  // TAMPILAN DI LCD (Bisa disingkat agar muat)
  String displayStatus = (status == "Terindikasi Mastitis") ? "MASTITIS" : (status == "Waspada" ? "WASPADA" : "NORMAL");

  tft.setTextColor(C_WHITE); tft.setCursor(15, 25); tft.print("SUHU:"); tft.setTextSize(2); tft.setCursor(15, 37); tft.print(valTemp, 1); tft.setTextSize(1); tft.print(" C");
  tft.setCursor(85, 25); tft.print("COND:"); tft.setTextSize(2); tft.setCursor(85, 37); tft.print(valCond, 1); tft.setTextSize(1); tft.print(" mS");
  
  tft.fillRoundRect(15, 65, 130, 24, 4, color); tft.setTextColor(C_BG); tft.setTextSize(2); 
  int txtX = 80 - (displayStatus.length()*6); // Center text simple
  tft.setCursor(txtX, 70); tft.print(displayStatus); tft.setTextSize(1);
  
  tft.setTextColor(C_WHITE); tft.setCursor(5, 110); if(flowType == 0) tft.print("[A] UKUR LAGI [*]MENU"); else { tft.print("[A]ULANG  [B]KIRIM"); tft.setCursor(5, 120); tft.print("[*] BATAL"); }
}

void loopResult(char key) {
  if (key == 'A') { drawMeasureReadyUI(); currentState = STATE_MEASURE_READY; }
  else if (key == '*') { drawMainMenu(); currentState = STATE_MENU; }
  else if (key == 'B' && flowType == 1) { 
    if(isOfflineMode) { showBypassMessage("GAGAL KIRIM", "MODE OFFLINE"); return; }
    
    tft.fillScreen(C_BG); tft.setCursor(40, 60); tft.setTextColor(C_WHITE); tft.print("Mengirim...");
    
    WiFiClientSecure client; client.setInsecure(); HTTPClient http;
    
    // RECALCULATE STATUS FOR SENDING
    String status = "Normal";
    if (valTemp > 39.5 || valCond > 6.0) status = "Terindikasi Mastitis";
    else if (valTemp > 38.5 || valCond > 5.0) status = "Waspada";

    String dateStr = getFullFormattedTime();
    
    // JSON SESUAI DASHBOARD.JSX
    String json = "{\"cowId\":\""+currentID+"\",\"temp\":"+String(valTemp)+",\"conductivity\":"+String(valCond)+",\"status\":\""+status+"\",\"date\":\""+dateStr+"\",\"ts\":{\".sv\":\"timestamp\"}}";
    
    http.begin(client, String(dbBaseURL)+"detections.json"); int code = http.POST(json); http.end();
    if(code == 200) { logDailyActivity(currentID, "sensor"); showStatusAnim(true); drawMainMenu(); currentState = STATE_MENU; }
    else { showStatusAnim(false); drawMeasureReadyUI(); currentState = STATE_MEASURE_READY; }
  }
}