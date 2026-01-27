# 🔧 MooCare - Panduan Debug Komunikasi Serial ESP8266 ↔ ESP32-CAM

## ⚠️ PROBLEM: Tidak Ada Data Serial Masuk ke ESP32-CAM

### 🔍 LANGKAH DEBUGGING

#### **1. CEK KONEKSI HARDWARE (PALING PENTING!)**

Pastikan kabel jumper terpasang dengan benar:

```
ESP8266          ESP32-CAM
---------        ----------
TX (GPIO1)  -->  RX (GPIO3)
RX (GPIO3)  <--  TX (GPIO1)
GND         -->  GND
```

⚠️ **CATATAN PENTING:**
- Jangan silang TX-TX atau RX-RX
- Gunakan kabel jumper berkualitas baik (tidak putus)
- GND HARUS terhubung!

---

#### **2. CEK BAUDRATE**

Kedua device harus menggunakan baudrate yang SAMA:

**ESP8266** (esp8266.cpp line 200):
```cpp
Serial.begin(115200);
```

**ESP32-CAM** (esp32cam.cpp line 42):
```cpp
Serial.begin(115200);
```

✅ Sudah sama = 115200 baud

---

#### **3. MONITOR SERIAL KEDUA DEVICE**

Buka **2 Serial Monitor** secara bersamaan:

**Terminal 1 - ESP8266:**
```
[ESP8266] MooCare MASTER NODE STARTING
[ESP8266] ✅ SERIAL TX → ESP32-CAM: [UPDATE_SERVER:10.127.199.244:5000]
[ESP8266] ✅ SERIAL TX → ESP32-CAM: [SNAP:1]
```

**Terminal 2 - ESP32-CAM:**
```
[ESP32-CAM] 💚 READY - Waiting for Serial commands from ESP8266...
[ESP32-CAM] ➡️ RX FROM ESP8266: [UPDATE_SERVER:10.127.199.244:5000]
[ESP32-CAM] ➡️ RX FROM ESP8266: [SNAP:1]
```

---

#### **4. SKENARIO MASALAH DAN SOLUSI**

##### ❌ **SKENARIO A: ESP8266 kirim tapi ESP32-CAM tidak terima**

**Gejala:**
- ESP8266 Serial Monitor menampilkan `✅ SERIAL TX → ESP32-CAM: [SNAP:1]`
- ESP32-CAM **TIDAK** menampilkan `➡️ RX FROM ESP8266:`

**Penyebab:**
1. Kabel TX ESP8266 tidak terhubung ke RX ESP32-CAM
2. Kabel rusak/putus
3. GND tidak terhubung

**Solusi:**
- Periksa ulang koneksi fisik
- Ganti kabel jumper
- Test kontinuitas kabel dengan multimeter

---

##### ❌ **SKENARIO B: ESP32-CAM terima tapi format salah**

**Gejala:**
```
[ESP32-CAM] ➡️ RX FROM ESP8266: []
[ESP32-CAM] ⚠️ FORMAT SALAH/DIABAIKAN
```

**Penyebab:**
- Noise di jalur Serial
- Baudrate tidak match
- Data corrupt

**Solusi:**
- Tambahkan resistor pull-up 10kΩ di line RX/TX
- Perpendek kabel jumper (max 20cm)
- Cek ground loop

---

##### ❌ **SKENARIO C: Tidak ada output sama sekali**

**Gejala:**
- Serial Monitor ESP8266 kosong
- Serial Monitor ESP32-CAM kosong

**Penyebab:**
- Port Serial salah dipilih
- Driver USB belum terinstall
- Device tidak booting

**Solusi:**
- Cek Device Manager → Ports (COM & LPT)
- Install driver CH340 (untuk ESP8266) atau CP2102 (untuk ESP32-CAM)
- Tekan tombol RESET di kedua board

---

#### **5. TEST KOMUNIKASI SEDERHANA**

Upload kode test ini ke **ESP8266**:
```cpp
void loop() {
  Serial.println("TEST_FROM_ESP8266");
  delay(1000);
}
```

Upload kode test ini ke **ESP32-CAM**:
```cpp
void loop() {
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    Serial.println("RECEIVED: " + data);
  }
}
```

Jika ESP32-CAM print `RECEIVED: TEST_FROM_ESP8266` setiap 1 detik, komunikasi **BERHASIL**.

---

#### **6. CEK VOLTAGE LEVEL**

ESP8266 = **3.3V logic**  
ESP32-CAM = **3.3V logic**

✅ Kompatibel langsung, tidak perlu level shifter

---

## 📊 CHECKLIST TROUBLESHOOTING

- [ ] Kabel TX ESP8266 → RX ESP32-CAM terpasang
- [ ] Kabel RX ESP8266 ← TX ESP32-CAM terpasang
- [ ] Kabel GND ESP8266 — GND ESP32-CAM terpasang
- [ ] Baudrate kedua device = 115200
- [ ] Serial Monitor ESP8266 menampilkan "SERIAL TX"
- [ ] Serial Monitor ESP32-CAM menampilkan "RX FROM ESP8266"
- [ ] Kabel jumper panjang < 30cm
- [ ] Tidak ada kabel power yang melintas di atas kabel serial

---

## 🔧 DEBUG FEATURES SUDAH DITAMBAHKAN

### **ESP8266** (esp8266.cpp)
- ✅ Print startup banner di Serial Monitor
- ✅ Print setiap perintah yang dikirim: `[ESP8266] ✅ SERIAL TX → ESP32-CAM: [...]`
- ✅ Print URL foto yang diterima kembali

### **ESP32-CAM** (esp32cam.cpp)
- ✅ Heartbeat setiap 10 detik: `💚 READY - Waiting for Serial commands...`
- ✅ Print setiap data yang diterima: `[ESP32-CAM] ➡️ RX FROM ESP8266: [...]`
- ✅ Validasi format perintah dengan pesan error jelas

---

## 📝 OUTPUT YANG BENAR

**Saat Boot:**
```
[ESP8266] MooCare MASTER NODE STARTING
[ESP8266] ✅ SERIAL TX → ESP32-CAM: [UPDATE_SERVER:10.127.199.244:5000]
[ESP8266] Server IP synced: 10.127.199.244:5000
```

**Saat Foto (Mode B/C):**
```
[ESP8266] ✅ SERIAL TX → ESP32-CAM: [SNAP:1]
[ESP8266] Photo URL received: /assets/images/uploads/capture_1_1768584000.jpg
```

**Di ESP32-CAM:**
```
[ESP32-CAM] 💚 READY - Waiting for Serial commands from ESP8266...
[ESP32-CAM] ➡️ RX FROM ESP8266: [UPDATE_SERVER:10.127.199.244:5000]
✅ SERVER UPDATED:
   IP: 10.127.199.244
   Port: 5000
[ESP32-CAM] ➡️ RX FROM ESP8266: [SNAP:1]
✅ FORMAT BENAR. Memproses ID: 1
🚀 SUKSES UPLOAD & UPDATE FIREBASE!
```

---

## ⚡ QUICK FIX

Jika masih tidak berfungsi setelah semua langkah di atas:

1. **Swap kabel TX/RX** - Coba balik TX↔RX (kadang label pin salah di board clone)
2. **Gunakan SoftwareSerial** - Jika hardware Serial bentrok dengan USB
3. **Cek dengan Logic Analyzer** - Untuk debugging level tinggi
4. **Test dengan Arduino lain** - Eliminasi kemungkinan board rusak

---

## 📞 CONTACT

Jika masalah berlanjut, capture output Serial Monitor kedua device dan konsultasikan dengan tim teknis.

**Dibuat:** 20 Januari 2026  
**Versi:** 1.0  
**Sistem:** MooCare PILMAPRES IoT Mastitis Detection
