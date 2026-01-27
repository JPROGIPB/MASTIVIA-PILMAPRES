# 🔌 MooCare - WIRING DIAGRAM TERBARU (SoftwareSerial)

## ⚠️ SOLUSI KONFLIK SERIAL MONITOR

**MASALAH SEBELUMNYA:**  
ESP8266 dan ESP32-CAM menggunakan **hardware Serial yang sama** untuk:
- Komunikasi dengan komputer (Serial Monitor via USB)
- Komunikasi antar device (RX/TX pins)

Ketika Serial Monitor terbuka, data **ditangkap komputer** bukan device lain!

**SOLUSI:**
- **ESP8266**: Gunakan **SoftwareSerial** (pin D6/D7) untuk komunikasi dengan ESP32-CAM
- **ESP32-CAM**: Gunakan **Serial2** (GPIO14/15) untuk komunikasi dengan ESP8266
- **Serial Monitor**: Tetap bisa digunakan untuk debugging di kedua device!

---

## 📐 WIRING DIAGRAM BARU

```
╔═══════════════════════════════════════════════════════════════════════════╗
║           ESP8266 NodeMCU ←→ ESP32-CAM (Updated Wiring)                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

                    ESP8266 NodeMCU                  ESP32-CAM AI Thinker
                  ┌─────────────────┐              ┌──────────────────┐
                  │                 │              │                  │
                  │   [ANTENNA]     │              │   [ANTENNA]      │
                  │                 │              │                  │
                  │  ┌───────────┐  │              │  ┌────────────┐  │
                  │  │ ESP8266EX │  │              │  │  ESP32-S   │  │
                  │  │  WiFi SoC │  │              │  │  WiFi SoC  │  │
                  │  └───────────┘  │              │  └────────────┘  │
                  │                 │              │                  │
   USB Serial ────┤ GPIO1 (TX)      │              │   U0TXD (IO1)    │──── USB Serial
   (DEBUG)    ────┤ GPIO3 (RX)      │              │   U0RXD (IO3)    │──── (DEBUG)
                  │                 │              │                  │
 SoftwareSerial   │                 │              │   Serial2        │
   TX       ──────┤ GPIO12 (D6) ●───┼──────────────┼───● GPIO14       │──── RX
                  │                 │   🟡 KUNING   │                  │
   RX       ──────┤ GPIO13 (D7) ●───┼──────────────┼───● GPIO15       │──── TX
                  │                 │   🟢 HIJAU    │                  │
                  │                 │              │                  │
   GROUND   ──────┤ GND         ●───┼──────────────┼───● GND          │
                  │                 │   ⚫ HITAM    │                  │
                  │                 │              │                  │
                  │   3V3  5V       │              │   3V3  5V  GND   │
                  │    │   │        │              │    │   │   │    │
                  │    ●   ●        │              │    ●   ●   ●    │
                  └────┼───┼────────┘              └────┼───┼───┼────┘
                       │   │                            │   │   │
                   ┌───┴───┴────┐                   ┌───┴───┴───┴───┐
                   │ USB Power  │                   │  USB or 5V DC │
                   │  Supply    │                   │  Power Supply │
                   └────────────┘                   └───────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                         KONEKSI LENGKAP                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ESP8266 PIN        │  WARNA   │  ESP32-CAM PIN  │  KETERANGAN           ║
╠═════════════════════╪══════════╪═════════════════╪═══════════════════════╣
║  GPIO12 (D6) TX     │  🟡 KUNING│  GPIO14 (RX)    │  Data ESP8266→ESP32   ║
║  GPIO13 (D7) RX     │  🟢 HIJAU │  GPIO15 (TX)    │  Data ESP32→ESP8266   ║
║  GND                │  ⚫ HITAM │  GND            │  Ground Common        ║
╠═════════════════════╧══════════╧═════════════════╧═══════════════════════╣
║  GPIO1 (TX) - Untuk USB Serial Monitor (DEBUGGING)                       ║
║  GPIO3 (RX) - Untuk USB Serial Monitor (DEBUGGING)                       ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🔧 KONFIGURASI SOFTWARE

### **ESP8266 (esp8266.cpp)**

```cpp
#include <SoftwareSerial.h>

#define ESP32_RX_PIN  13  // D7 - Connect to ESP32-CAM GPIO15 (TX)
#define ESP32_TX_PIN  12  // D6 - Connect to ESP32-CAM GPIO14 (RX)

SoftwareSerial esp32Serial(ESP32_RX_PIN, ESP32_TX_PIN); // RX, TX

void setup() {
  Serial.begin(115200);        // Untuk Serial Monitor (debugging)
  esp32Serial.begin(9600);     // Untuk komunikasi dengan ESP32-CAM
  
  Serial.println("[ESP8266] MooCare MASTER NODE STARTING");
  Serial.println("[ESP8266] SoftwareSerial initialized (D7=RX, D6=TX, 9600 baud)");
}

void loop() {
  // Kirim perintah ke ESP32-CAM
  esp32Serial.println("SNAP:1");
  
  // Terima response dari ESP32-CAM
  if (esp32Serial.available()) {
    String response = esp32Serial.readStringUntil('\n');
    Serial.println("Received: " + response); // Debug di Serial Monitor
  }
}
```

### **ESP32-CAM (esp32cam.cpp)**

```cpp
#define ESP8266_RX_PIN 14  // Connect to ESP8266 D6 (TX)
#define ESP8266_TX_PIN 15  // Connect to ESP8266 D7 (RX)

HardwareSerial esp8266Serial(2); // Gunakan Serial2

void setup() {
  Serial.begin(115200);  // Untuk Serial Monitor (debugging)
  
  // Initialize Serial2 untuk komunikasi dengan ESP8266
  esp8266Serial.begin(9600, SERIAL_8N1, ESP8266_RX_PIN, ESP8266_TX_PIN);
  
  Serial.println("[ESP32-CAM] MooCare CAM NODE STARTING");
  Serial.println("[ESP32-CAM] Serial2 initialized (RX=14, TX=15, 9600 baud)");
}

void loop() {
  // Terima perintah dari ESP8266
  if (esp8266Serial.available()) {
    String command = esp8266Serial.readStringUntil('\n');
    Serial.println("Received: " + command); // Debug di Serial Monitor
    
    // Kirim response ke ESP8266
    esp8266Serial.println("PHOTO_URL:/assets/images/uploads/capture_1.jpg");
  }
}
```

---

## ✅ KEUNTUNGAN SOLUSI INI

| **Aspek** | **Sebelumnya** | **Sekarang** |
|-----------|----------------|--------------|
| **Serial Monitor** | ❌ Tidak bisa digunakan saat device berkomunikasi | ✅ Tetap bisa debug di kedua device |
| **Komunikasi Antar Device** | ❌ Terganggu oleh USB Serial | ✅ Jalur terpisah, stabil |
| **Debugging** | ❌ Harus lepas USB untuk test | ✅ Bisa monitor real-time |
| **Pin Conflict** | ❌ GPIO1/3 bentrok | ✅ Pakai pin dedicated |

---

## 📊 BAUDRATE SETTINGS

- **Serial Monitor (USB)**: 115200 baud (cepat untuk debugging)
- **Komunikasi ESP8266 ↔ ESP32-CAM**: 9600 baud (stabil untuk SoftwareSerial)

⚠️ **Catatan:** SoftwareSerial pada ESP8266 **tidak stabil** di baudrate tinggi (>9600). Gunakan 9600 baud untuk komunikasi antar device.

---

## 🧪 TESTING PROCEDURE

### **1. Upload Firmware**
- Upload `esp8266.cpp` ke ESP8266 NodeMCU
- Upload `esp32cam.cpp` ke ESP32-CAM

### **2. Wiring Check**
```
ESP8266 D6 (GPIO12) → ESP32-CAM GPIO14  ✅
ESP8266 D7 (GPIO13) → ESP32-CAM GPIO15  ✅
ESP8266 GND → ESP32-CAM GND             ✅
```

### **3. Serial Monitor Test**

**Buka Serial Monitor ESP8266 (115200 baud):**
```
[ESP8266] MooCare MASTER NODE STARTING
[ESP8266] SoftwareSerial initialized (D7=RX, D6=TX, 9600 baud)
[ESP8266] ✅ TX → ESP32-CAM: [UPDATE_SERVER:10.127.199.244:5000]
[ESP8266] ✅ TX → ESP32-CAM: [SNAP:1]
[ESP8266] 📸 Photo URL received: /assets/images/uploads/capture_1_xxx.jpg
```

**Buka Serial Monitor ESP32-CAM (115200 baud):**
```
[ESP32-CAM] MooCare CAM NODE STARTING
[ESP32-CAM] Serial2 initialized (RX=14, TX=15, 9600 baud)
[ESP32-CAM] 💚 READY - Waiting for commands from ESP8266 (Serial2)...
[ESP32-CAM] ➡️ RX FROM ESP8266: [UPDATE_SERVER:10.127.199.244:5000]
[ESP32-CAM] ➡️ RX FROM ESP8266: [SNAP:1]
[ESP32-CAM] 📤 TX TO ESP8266: PHOTO_URL:/assets/images/uploads/capture_1_xxx.jpg
```

---

## ⚠️ TROUBLESHOOTING

### **Problem: ESP32-CAM tidak terima data**

**Gejala:**
```
[ESP8266] ✅ TX → ESP32-CAM: [SNAP:1]
[ESP32-CAM] 💚 READY - Waiting for commands... (no RX message)
```

**Solusi:**
1. Cek wiring: D6 → GPIO14, D7 → GPIO15
2. Swap TX/RX jika masih gagal (kadang label board salah)
3. Cek continuity kabel dengan multimeter
4. Pastikan GND terhubung

### **Problem: ESP8266 tidak terima response**

**Gejala:**
```
[ESP8266] ⚠️ Timeout waiting for photo URL
```

**Solusi:**
1. Cek ESP32-CAM apakah benar kirim response
2. Pastikan baudrate sama (9600)
3. Tambahkan delay sebelum kirim response di ESP32-CAM
4. Perpendek kabel (max 20cm untuk SoftwareSerial)

---

## 🎯 FINAL CHECKLIST

- [ ] Firmware ESP8266 terupdate (pakai SoftwareSerial)
- [ ] Firmware ESP32-CAM terupdate (pakai Serial2)
- [ ] Wiring: D6→GPIO14, D7→GPIO15, GND→GND
- [ ] Baudrate komunikasi: 9600 baud
- [ ] Serial Monitor keduanya: 115200 baud
- [ ] Kabel panjang < 20cm
- [ ] GND terhubung
- [ ] Kedua device dapat power yang cukup

---

**Dibuat:** 20 Januari 2026  
**Versi:** 2.0 (SoftwareSerial Fix)  
**Sistem:** MooCare PILMAPRES IoT Mastitis Detection
