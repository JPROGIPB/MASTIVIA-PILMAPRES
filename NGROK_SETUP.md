# 🌐 Panduan Setup Ngrok untuk MooCare

## 📋 Daftar Isi
1. [Penjelasan Sistem](#penjelasan-sistem)
2. [Setup Ngrok](#setup-ngrok)
3. [Cara Menggunakan](#cara-menggunakan)
4. [Troubleshooting](#troubleshooting)

---

## 🔧 Penjelasan Sistem

### Arsitektur Komunikasi
```
ESP8266 (Master) --[Serial TX/RX]--> ESP32-CAM
       |                                  |
       |                                  |
   [WiFi]                             [WiFi]
       |                                  |
       v                                  v
   Firebase <--- Internet ---> Ngrok --> Flask Server (Laptop)
```

### Mode Operasi

**Mode 1: LOCAL (Default)**
- ESP32-CAM terhubung ke Flask Server melalui WiFi lokal
- Config otomatis dari Firebase: `server_config/ip` dan `server_config/port`
- Cocok untuk development & testing di jaringan lokal

**Mode 2: NGROK (Internet)**
- ESP32-CAM terhubung ke Flask Server melalui Ngrok tunnel
- Config otomatis dari Firebase: `server_config/ngrok_url`
- Cocok untuk deployment & akses dari mana saja

---

## 🚀 Setup Ngrok

### 1. Install Ngrok
Download dari: https://ngrok.com/download

### 2. Jalankan Flask Server
```powershell
python server.py
```

### 3. Jalankan Ngrok Tunnel
**Opsi A: Command Line Simple**
```powershell
ngrok http 5000
```

**Opsi B: Menggunakan Config File (Recommended)**
Edit file `ngrok.yaml` jika belum ada:
```yaml
version: "2"
authtoken: YOUR_NGROK_AUTH_TOKEN

tunnels:
  flask:
    addr: 5000
    proto: http
```

Jalankan:
```powershell
ngrok start flask
```

### 4. Update Ngrok URL ke Firebase

**Opsi A: Auto-detect dari Ngrok API**
```powershell
python update_ngrok_url.py
```

**Opsi B: Manual (jika Ngrok API tidak bisa diakses)**
```powershell
python update_ngrok_url.py https://abc123.ngrok-free.app
```

---

## 💡 Cara Menggunakan

### Startup Sequence

1. **Start Flask Server**
   ```powershell
   python server.py
   ```
   Server akan otomatis update IP lokal ke Firebase.

2. **Start Ngrok (Optional - untuk akses internet)**
   ```powershell
   ngrok http 5000
   ```

3. **Update Ngrok URL**
   ```powershell
   python update_ngrok_url.py
   ```

4. **Upload ESP8266 & ESP32-CAM**
   - ESP8266 akan otomatis konek WiFi dan ambil config dari Firebase
   - ESP32-CAM akan otomatis konek WiFi dan ambil config dari Firebase
   - ESP32-CAM akan pilih Ngrok URL jika tersedia, fallback ke IP lokal

### Komunikasi Serial ESP8266 → ESP32-CAM

ESP8266 mengirim perintah via Serial (TX/RX):

**Format Perintah:**
```
SNAP:S001        → Ambil foto sapi ID S001
CONFIG:URL       → Set server URL manual
REFRESH          → Reload config dari Firebase
STATUS           → Cek status koneksi
```

**Wiring Serial:**
```
ESP8266 TX (D4/GPIO2) → ESP32-CAM RX
ESP8266 RX (D3/GPIO0) → ESP32-CAM TX
GND                    → GND
```

---

## 🔍 Troubleshooting

### ESP32-CAM tidak terdeteksi ngrok URL

**Solusi:**
1. Cek Firebase apakah `server_config/ngrok_url` sudah terisi
2. Kirim perintah `REFRESH` via Serial Monitor ke ESP32-CAM
3. Restart ESP32-CAM

### Upload foto gagal (HTTP Error)

**Penyebab:**
- Ngrok timeout (lebih lambat dari lokal)
- Firebase config salah

**Solusi:**
1. Cek koneksi WiFi ESP32-CAM
2. Kirim perintah `STATUS` via Serial Monitor
3. Pastikan Flask server running
4. Test manual: buka `https://your-ngrok-url.app/upload` di browser

### ESP8266 tidak kirim perintah SNAP

**Solusi:**
1. Cek wiring Serial (TX ↔ RX)
2. Pastikan baud rate sama (115200)
3. Cek Serial Monitor ESP8266 untuk debug

### Ngrok URL berubah terus

**Penyebab:** Ngrok free tier memberikan random URL setiap restart

**Solusi:**
1. Upgrade Ngrok ke plan berbayar (fixed domain)
2. Atau jalankan `python update_ngrok_url.py` setiap kali Ngrok restart

---

## 📝 Checklist Deployment

- [ ] Flask server running
- [ ] Ngrok tunnel active
- [ ] Ngrok URL sudah di-update ke Firebase (`python update_ngrok_url.py`)
- [ ] ESP32-CAM sudah upload & connected WiFi
- [ ] ESP8266 sudah upload & connected WiFi
- [ ] Wiring Serial sudah benar (TX ↔ RX)
- [ ] Test foto dari keypad ESP8266

---

## 🎯 Test Flow

1. **Test Local (tanpa Ngrok):**
   ```
   ESP8266 Keypad → Tekan [C] (CAM Mode) 
   → Input ID sapi → Tekan [A] (Capture)
   → ESP32-CAM upload ke Flask (local IP)
   ```

2. **Test Ngrok:**
   ```
   Jalankan: ngrok http 5000
   Update URL: python update_ngrok_url.py
   Kirim REFRESH ke ESP32-CAM via Serial
   Test capture dari ESP8266
   ```

---

## 🔗 Link Penting

- Ngrok Dashboard: http://127.0.0.1:4040
- Flask Server: http://localhost:5000
- Firebase Console: https://console.firebase.google.com

---

**Dibuat:** 2026-01-28  
**Versi:** 1.0 - Ngrok Ready
