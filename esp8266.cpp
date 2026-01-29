/**
 * MOOCARE - Master Node (ESP8266)
 * VERSION STABLE - NO OTA (FULL FIX)
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
#define SDA_PIN    4 // D2
#define SCL_PIN    5 // D1
#define TFT_CS     15
#define TFT_DC     0
#define TFT_RES    2
#define TDS_PIN    A0
#define PCF8574_ADDR 0x20
#define PIN_BUZZER   16

// --- WIFI & FIREBASE ---
const char* def_ssid     = "iQOO Z9 5G";
const char* def_password = "11223344";
const char* dbBaseURL    = "https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/";

String sIP = "";
String sPort = "5000";
#define TZ_OFFSET 7 * 3600

// WARNA UI
#define C_BG 0x0000
#define C_WHITE 0xFFFF
#define C_MOOCARE 0x07E0 
#define C_GRAY 0x8410
#define C_DARK_GRAY 0x4208
#define C_WARN 0xFD20
#define C_ERROR 0xF800
#define C_SUCCESS 0x07E0
#define C_BLUE 0x051F

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RES);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
PCF8574 pcf8574(PCF8574_ADDR);

const int rowPins[4] = {7, 6, 5, 4};
const int colPins[4] = {3, 2, 1, 0};
char keys[4][4] = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};

enum AppState { 
  STATE_BOOT, STATE_MENU, STATE_INPUT_ID, 
  STATE_MEASURE_TEMP, STATE_MEASURE_COND, 
  STATE_PHOTO_ASK, STATE_CAM_MODE, STATE_RESULT 
};
AppState currentState = STATE_BOOT;

int flowType = 0; 
String currentID = "";
float valTemp = 0.0, valCond = 0.0;
bool isOfflineMode = true;

// ===================== PROTOTIPE FUNGSI =====================
void drawMainMenu();
void drawInputUI();
void drawMeasureTempUI();
void drawMeasureCondUI();
void drawResultUI();
void drawPhotoAsk();
void drawCamInterface();
void showBypassMessage(String msg1, String msg2);
void showStatusAnim(bool success);
void fetchServerConfig();
void bootSequence();
void connectAutoOpen();
bool validateIDInDB(String id);
bool checkDailyDuplicate(String id, String type);
void logDailyActivity(String id, String type);
void beepShort();
void beepAlarm();
char readKeypad();
String getFullFormattedTime();
void showLoadingBar(int p);
void drawSignal(int x, int y, uint16_t color);
void drawIconQuick(int x, int y, uint16_t color);
void drawIconCow(int x, int y, uint16_t color);
void drawIconCam(int x, int y, uint16_t color);
void drawIconWiFi(int x, int y, uint16_t color);
void drawIconRescan(int x, int y, uint16_t color);

// ===================== CORE LOGIC =====================

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  delay(1000); 

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000); 
  delay(100);

  if (pcf8574.begin()) {
    for(int i=0; i<8; i++) pcf8574.write(i, HIGH);
  }

  mlx.begin();
  tft.initR(INITR_BLACKTAB); 
  tft.setRotation(3); 
  
  bootSequence();
}

void loop() {
  char key = readKeypad();
  switch(currentState) {
    case STATE_MENU:
      if(key == 'A') { flowType = 0; currentID = "QUICK"; drawMeasureTempUI(); currentState = STATE_MEASURE_TEMP; }
      else if(key == 'B') {
        if(isOfflineMode) connectAutoOpen();
        else { flowType = 1; currentID = ""; drawInputUI(); currentState = STATE_INPUT_ID; }
      }
      else if(key == 'C') {
        if(isOfflineMode) bootSequence();
        else { flowType = 2; currentID = ""; drawInputUI(); currentState = STATE_INPUT_ID; }
      }
      break;

    case STATE_INPUT_ID:
      if (key >= '0' && key <= '9' && currentID.length() < 5) {
        currentID += key; tft.fillRect(15, 35, 130, 30, C_BG); 
        tft.setCursor(25, 40); tft.setTextSize(2); tft.setTextColor(C_MOOCARE); tft.print(currentID); tft.setTextSize(1);
      } else if (key == 'C') { currentID = ""; tft.fillRect(15, 35, 130, 30, C_BG); }
      else if (key == '*') { drawMainMenu(); currentState = STATE_MENU; }
      else if (key == '#' && currentID.length() > 0) {
        tft.setCursor(10, 75); tft.setTextColor(C_WHITE); tft.print("Validating...");
        if (validateIDInDB(currentID)) {
          // Cek duplikasi untuk SEMUA flowType (termasuk CAM only)
          String checkType = (flowType == 1) ? "sensor" : "photo";
          if (checkDailyDuplicate(currentID, checkType)) {
            showBypassMessage("DUPLIKAT", "SUDAH DIPERIKSA"); drawMainMenu(); currentState = STATE_MENU;
          } else {
            if (flowType == 2) { drawCamInterface(); currentState = STATE_CAM_MODE; }
            else { drawMeasureTempUI(); currentState = STATE_MEASURE_TEMP; }
          }
        } else { showBypassMessage("GAGAL", "ID TAK TERDAFTAR"); drawInputUI(); }
      }
      break;

    case STATE_MEASURE_TEMP:
      if(key == 'A') {
        tft.fillRect(10, 70, 140, 30, C_WHITE); tft.setTextColor(C_BG); tft.setCursor(25, 80); tft.print("UKUR SUHU...");
        mlx.readObjectTempC(); delay(100); 
        float ts = 0; int sm = 0;
        for(int i=0; i<20; i++) {
          float t = mlx.readObjectTempC();
          if(!isnan(t) && t < 100.0 && t > 10.0) { ts += t; sm++; }
          delay(50);
        }
        if(sm == 0) { showBypassMessage("ERROR", "SENSOR SUHU GAGAL"); drawMeasureTempUI(); }
        else { valTemp = ts / sm; beepShort(); drawMeasureCondUI(); currentState = STATE_MEASURE_COND; }
      } else if(key == '*') { drawMainMenu(); currentState = STATE_MENU; }
      break;

    case STATE_MEASURE_COND:
      if(key == 'A') {
        tft.fillRect(10, 70, 140, 30, C_WHITE); tft.setTextColor(C_BG); tft.setCursor(20, 80); tft.print("UKUR TDS...");
        float vsSum = 0;
        for(int i=0; i<30; i++) {
          vsSum += (float)analogRead(TDS_PIN) * 3.3 / 1024.0;
          delay(50);
        }
        float avgV = vsSum / 30.0;
        float tdsValue = (133.42 * avgV * avgV * avgV - 255.86 * avgV * avgV + 857.39 * avgV) * 0.5;
        valCond = (tdsValue * 2.0) / 100.0; 
        beepShort();
        if(flowType == 0) { drawResultUI(); currentState = STATE_RESULT; }
        else { drawPhotoAsk(); currentState = STATE_PHOTO_ASK; }
      } else if(key == '*') { drawMainMenu(); currentState = STATE_MENU; }
      break;

    case STATE_PHOTO_ASK:
      if(key == 'A') { drawCamInterface(); currentState = STATE_CAM_MODE; }
      else if(key == 'B') { drawResultUI(); currentState = STATE_RESULT; }
      break;

    case STATE_CAM_MODE:
      if(key == 'A') {
        tft.fillRect(10, 105, 140, 20, C_WHITE); tft.setTextColor(C_BG); tft.setCursor(25, 110); tft.print("CAPTURING...");
        Serial.println("SNAP:" + currentID);
        delay(2000);
        logDailyActivity(currentID, "photo");
        if (flowType == 2) { showStatusAnim(true); drawMainMenu(); currentState = STATE_MENU; }
        else { drawResultUI(); currentState = STATE_RESULT; }
      } else if(key == '*') { drawMainMenu(); currentState = STATE_MENU; }
      break;

    case STATE_RESULT:
      if(key == 'A') { drawMeasureTempUI(); currentState = STATE_MEASURE_TEMP; }
      else if(key == '*') { drawMainMenu(); currentState = STATE_MENU; }
      else if(key == 'B' && flowType == 1) {
        tft.fillScreen(C_BG); tft.setCursor(40, 60); tft.setTextColor(C_WHITE); tft.print("MENGIRIM...");
        WiFiClientSecure cl; cl.setInsecure(); HTTPClient ht;
        String st = "Normal";
        if (valTemp > 39.0 || valCond > 6.5) st = "Bahaya";
        else if ((valTemp >= 38.1 && valTemp <= 39.0) || (valCond >= 6.1 && valCond <= 6.5)) st = "Waspada";
        String js = "{\"cowId\":\""+currentID+"\",\"temp\":"+String(valTemp,1)+",\"conductivity\":"+String(valCond,1)+",\"status\":\""+st+"\",\"date\":\""+getFullFormattedTime()+"\"}";
        ht.begin(cl, String(dbBaseURL)+"detections.json"); int r = ht.POST(js); ht.end();
        if(r == 200) { logDailyActivity(currentID, "sensor"); showStatusAnim(true); drawMainMenu(); currentState = STATE_MENU; }
        else showStatusAnim(false);
      }
      break;
  }
}

// ===================== DEFINISI FUNGSI UI & SYSTEM =====================

void bootSequence() {
  tft.fillScreen(C_BG);
  tft.setCursor(35, 45); tft.setTextSize(2); tft.setTextColor(C_MOOCARE); tft.print("MooCare"); 
  tft.setTextSize(1); tft.setTextColor(C_GRAY); tft.setCursor(30, 65); tft.print("Mastitis Detector");
  WiFi.disconnect(); WiFi.mode(WIFI_STA); delay(500); WiFi.begin(def_ssid, def_password);
  unsigned long st = millis(); 
  while(millis() - st < 15000 && WiFi.status() != WL_CONNECTED) { showLoadingBar(map(millis()-st, 0, 15000, 0, 98)); delay(150); }
  if(WiFi.status() == WL_CONNECTED) { 
    showLoadingBar(100); delay(500); configTime(TZ_OFFSET, 0, "pool.ntp.org");
    isOfflineMode = false; fetchServerConfig();
    // Share WiFi ke ESP32-CAM (secured network dengan password)
    for(int i=0; i<3; i++) { Serial.println("WIFI:" + String(def_ssid) + "," + String(def_password)); delay(100); }
  } else { isOfflineMode = true; }
  drawMainMenu(); currentState = STATE_MENU;
}

void fetchServerConfig() {
  if (isOfflineMode) return;
  WiFiClientSecure cl; cl.setInsecure(); HTTPClient ht;
  ht.begin(cl, String(dbBaseURL) + "server_config.json");
  if (ht.GET() == 200) {
    String p = ht.getString();
    int iS = p.indexOf("\"ip\":\"") + 6, iE = p.indexOf("\"", iS);
    int pS = p.indexOf("\"port\":") + 7, pE = p.indexOf(",", pS);
    if (pE == -1) pE = p.indexOf("}", pS);
    if (iS > 5) {
      sIP = p.substring(iS, iE); sPort = p.substring(pS, pE);
    }
  } ht.end();
}

void drawMainMenu() {
  tft.setTextSize(1); tft.fillScreen(C_BG); tft.fillRect(0, 0, 160, 14, C_DARK_GRAY);
  tft.setTextColor(C_WHITE); tft.setCursor(5, 3); tft.print(isOfflineMode ? "OFFLINE" : "ONLINE");
  if(!isOfflineMode) drawSignal(145, 3, C_SUCCESS);
  int bY = 25;
  tft.fillRoundRect(5, bY, 46, 50, 4, C_DARK_GRAY); drawIconQuick(18, 32, C_WARN); tft.setTextColor(C_WARN); tft.setCursor(13, 60); tft.print("CEPAT"); tft.setCursor(24, 82); tft.print("A"); 
  if(isOfflineMode) {
    tft.fillRoundRect(57, bY, 46, 50, 4, 0x2104); drawIconWiFi(68, 32, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(67, 60); tft.print("AUTO"); tft.setCursor(76, 82); tft.print("B");
    tft.fillRoundRect(109, bY, 46, 50, 4, 0x2104); drawIconRescan(120, 32, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(118, 60); tft.print("SCAN"); tft.setCursor(129, 82); tft.print("C");
  } else {
    tft.fillRoundRect(57, bY, 46, 50, 4, C_BLUE); drawIconCow(68, 32, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(67, 60); tft.print("SAPI"); tft.setCursor(76, 82); tft.print("B");
    tft.fillRoundRect(109, bY, 46, 50, 4, C_BLUE); drawIconCam(119, 32, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(120, 60); tft.print("CAM"); tft.setCursor(129, 82); tft.print("C");
  }
}

void drawInputUI() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(10, 10); tft.print("INPUT ID SAPI:"); tft.drawRoundRect(10, 30, 140, 40, 4, C_WHITE); tft.setCursor(10, 90); tft.setTextColor(C_GRAY); tft.print("[#]OK  [C]CLEAR [*]BATAL"); }
void drawMeasureTempUI() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); tft.print("ID: " + currentID); tft.drawFastHLine(0, 18, 160, C_GRAY); tft.setCursor(35, 40); tft.print("STEP 1: SUHU"); tft.fillRoundRect(10, 70, 140, 30, 4, C_DARK_GRAY); tft.setTextColor(C_WARN); tft.setCursor(35, 80); tft.print("TEKAN [A] UKUR"); }
void drawMeasureCondUI() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); tft.print("ID: " + currentID); tft.drawFastHLine(0, 18, 160, C_GRAY); tft.setCursor(15, 40); tft.print("STEP 2: KONDUKTIVITAS"); tft.fillRoundRect(10, 70, 140, 30, 4, C_DARK_GRAY); tft.setTextColor(C_WARN); tft.setCursor(35, 80); tft.print("TEKAN [A] UKUR"); }
void drawCamInterface() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); tft.print("CAM: " + currentID); tft.drawRect(10, 25, 140, 75, C_WHITE); tft.setCursor(50, 55); tft.print("READY!"); tft.fillRoundRect(10, 105, 140, 20, 3, C_BLUE); tft.setCursor(25, 110); tft.setTextColor(C_WHITE); tft.print("TEKAN [A] CAPTURE"); }
void drawResultUI() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(5, 5); tft.print("ID: " + currentID); String st = "Normal"; uint16_t color = C_SUCCESS; if (valTemp > 39.0 || valCond > 6.5) { st = "Bahaya"; color = C_ERROR; } else if ((valTemp >= 38.1 && valTemp <= 39.0) || (valCond >= 6.1 && valCond <= 6.5)) { st = "Waspada"; color = C_WARN; } tft.setCursor(15, 30); tft.print("TEMP : "); tft.print(valTemp, 1); tft.print(" C"); tft.setCursor(15, 45); tft.print("COND : "); tft.print(valCond, 1); tft.print(" mS"); tft.fillRoundRect(10, 65, 140, 30, 5, color); tft.setTextColor(C_BG); tft.setTextSize(2); tft.setCursor(40, 73); tft.print(st); tft.setTextSize(1); tft.setTextColor(C_WHITE); tft.setCursor(5, 110); if (flowType == 0) tft.print("[A] ULANG   [*] MENU"); else tft.print("[A]ULANG [B]SEND [*]MENU"); }
void drawPhotoAsk() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(30, 20); tft.print("FOTO SAPI?"); tft.fillRoundRect(10, 60, 65, 30, 4, C_MOOCARE); tft.setTextColor(C_BG); tft.setCursor(22, 70); tft.print("[A] YA"); tft.drawRoundRect(85, 60, 65, 30, 4, C_WHITE); tft.setTextColor(C_WHITE); tft.setCursor(97, 70); tft.print("[B] NO"); }
void showBypassMessage(String msg1, String msg2) { tft.fillScreen(C_BG); tft.fillRoundRect(10, 30, 140, 70, 5, C_WHITE); tft.setTextColor(C_DARK_GRAY); tft.setCursor(20, 45); tft.print("INFO:"); tft.setTextColor(C_ERROR); tft.setCursor(20, 65); tft.print(msg1); tft.setCursor(20, 80); tft.print(msg2); beepAlarm(); delay(2000); }
void showStatusAnim(bool success) { tft.fillScreen(C_BG); int cx = 80, cy = 60; for(int r=0; r<=30; r+=6) { tft.fillCircle(cx, cy, r, C_WHITE); delay(20); } if(success) { beepShort(); tft.setCursor(45, 105); tft.setTextColor(C_SUCCESS); tft.print("BERHASIL"); } else { tft.setCursor(55, 105); tft.setTextColor(C_ERROR); tft.print("GAGAL"); } delay(1500); }
void showLoadingBar(int p) { int w = map(p, 0, 100, 0, 120); tft.drawRoundRect(20, 80, 122, 10, 3, C_GRAY); tft.fillRect(21, 81, w, 8, C_MOOCARE); tft.fillRect(70, 95, 40, 10, C_BG); tft.setTextColor(C_WHITE); tft.setCursor(75, 95); tft.print(p); tft.print("%"); }
void beepShort() { digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW); }
void beepAlarm() { for(int i=0; i<3; i++) { digitalWrite(PIN_BUZZER, HIGH); delay(80); digitalWrite(PIN_BUZZER, LOW); delay(50); } }
char readKeypad() { for (int r = 0; r < 4; r++) { for (int i = 0; i < 4; i++) pcf8574.write(rowPins[i], HIGH); pcf8574.write(rowPins[r], LOW); for (int c = 0; c < 4; c++) { if (pcf8574.read(colPins[c]) == LOW) { beepShort(); delay(150); while(pcf8574.read(colPins[c]) == LOW) yield(); return keys[r][c]; } } } return 0; }
bool validateIDInDB(String id) { if (isOfflineMode) return true; WiFiClientSecure cl; cl.setInsecure(); HTTPClient ht; ht.begin(cl, String(dbBaseURL) + "cows.json?orderBy=\"id\"&equalTo=\"" + id + "\""); int code = ht.GET(); String res = ht.getString(); ht.end(); return (code == 200 && res.length() > 5); }
bool checkDailyDuplicate(String id, String type) { if (isOfflineMode) return false; time_t n = time(nullptr); struct tm* t = localtime(&n); char today[12]; strftime(today, sizeof(today), "%Y-%m-%d", t); WiFiClientSecure cl; cl.setInsecure(); HTTPClient ht; ht.begin(cl, String(dbBaseURL) + "daily_logs/" + String(today) + "/" + id + "/" + type + ".json"); int code = ht.GET(); String res = ht.getString(); ht.end(); return (code == 200 && res != "null"); }
void logDailyActivity(String id, String type) { if (isOfflineMode) return; time_t n = time(nullptr); struct tm* t = localtime(&n); char today[12]; strftime(today, sizeof(today), "%Y-%m-%d", t); WiFiClientSecure cl; cl.setInsecure(); HTTPClient ht; ht.begin(cl, String(dbBaseURL) + "daily_logs/" + String(today) + "/" + id + "/" + type + ".json"); ht.PUT("true"); ht.end(); }
String getFullFormattedTime() { time_t n = time(nullptr); struct tm* ti = localtime(&n); char b[20]; strftime(b, sizeof(b), "%Y-%m-%d %H:%M", ti); return String(b); }
void connectAutoOpen() { tft.fillScreen(C_BG); tft.setTextColor(C_WHITE); tft.setCursor(10, 40); tft.print("Scanning WiFi..."); int n = WiFi.scanNetworks(); bool found = false; String connectedSSID = ""; for (int i = 0; i < n; ++i) { if (WiFi.encryptionType(i) == ENC_TYPE_NONE) { connectedSSID = WiFi.SSID(i); tft.setCursor(10, 80); tft.setTextColor(C_MOOCARE); tft.print(connectedSSID); WiFi.begin(connectedSSID.c_str()); unsigned long s = millis(); while(millis() - s < 8000) { if(WiFi.status() == WL_CONNECTED) { found = true; break; } delay(100); } if(found) break; } } if(found) { isOfflineMode = false; configTime(TZ_OFFSET, 0, "pool.ntp.org"); delay(500); fetchServerConfig(); tft.fillScreen(C_BG); tft.setCursor(10, 50); tft.setTextColor(C_WHITE); tft.print("Sharing WiFi..."); for(int i=0; i<3; i++) { Serial.println("WIFI:" + connectedSSID); delay(100); } delay(500); drawMainMenu(); } else { showBypassMessage("FAILED", "NO WIFI"); drawMainMenu(); } }
void drawSignal(int x, int y, uint16_t color) { for(int i=0; i<4; i++) tft.fillRect(x+(i*3), y+(6-(i*2)), 2, 4+(i*2), color); }
void drawIconQuick(int x, int y, uint16_t color) { tft.fillTriangle(x+10, y, x+4, y+10, x+10, y+10, color); tft.fillTriangle(x+8, y+20, x+16, y+8, x+8, y+8, color); }
void drawIconCow(int x, int y, uint16_t color) { tft.fillRoundRect(x, y+4, 22, 14, 3, color); tft.fillCircle(x+2, y+4, 3, color); tft.fillCircle(x+20, y+4, 3, color); tft.fillRect(x+7, y+13, 8, 4, C_BG); }
void drawIconCam(int x, int y, uint16_t color) { tft.fillRoundRect(x, y+4, 24, 15, 2, color); tft.fillRect(x+8, y, 8, 4, color); tft.fillCircle(x+12, y+11, 6, C_BG); tft.fillCircle(x+12, y+11, 2, color); }
void drawIconWiFi(int x, int y, uint16_t color) { tft.fillCircle(x+12, y+15, 3, color); tft.drawCircle(x+12, y+15, 7, color); tft.drawCircle(x+12, y+15, 11, color); }
void drawIconRescan(int x, int y, uint16_t color) { tft.drawCircle(x+12, y+10, 8, color); tft.fillTriangle(x+18, y+2, x+22, y+10, x+14, y+10, color); }