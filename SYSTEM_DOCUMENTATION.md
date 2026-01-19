# MASTAVIA - Dokumentasi Sistem & Operasional
**Sistem Deteksi Dini Mastitis Sapi berbasis IoT & Artificial Intelligence**

---

## 1. Arsitektur Sistem

Sistem ini didesain menggunakan topologi **Dual-Microcontroller** untuk memisahkan beban kerja Sensor/UI dan Kamera/Upload.

### A. Perangkat Keras (Hardware)
1.  **Node Utama (Master): ESP8266**
    *   **Peran:** "Otak" sistem.
    *   **Tugas:**
        *   Manajemen Koneksi WiFi (Utama, Auto-Rescan, Mode Offline).
        *   Antarmuka Pengguna (LCD TFT 1.8", Keypad 4x4, Buzzer, 3x LED).
        *   Pembacaan Sensor (Suhu MLX90614, Konduktivitas TDS).
        *   Validasi Logika Bisnis (Cek Database & Cek Riwayat Harian).
        *   Komunikasi ke Firebase (Data Angka).
        *   Mengirim perintah *trigger* ke Node Kamera.
2.  **Node Kamera (Slave): ESP32-CAM**
    *   **Peran:** "Mata" sistem.
    *   **Tugas:**
        *   Standby menunggu perintah Serial dari ESP8266.
        *   Mengambil foto (Capture).
        *   Mengunggah foto ke Server Python (Backend).
        *   Memperbarui URL gambar di Firebase.

### B. Perangkat Lunak (Software)
1.  **Backend Server (Python Flask):**
    *   Menerima upload gambar dari ESP32-CAM.
    *   Menyimpan gambar di direktori publik web.
    *   Menyediakan API untuk analisis AI (Deep Learning).
2.  **Frontend Dashboard (React + Vite):**
    *   Monitoring data real-time dari Firebase.
    *   Manajemen Data Sapi (CRUD).
    *   Visualisasi status kesehatan (Normal/Waspada/Mastitis).

---

## 2. Alur Inisialisasi & Manajemen Koneksi (Booting Stage)

### Stage 1: Power On & Initial Connect
1.  **Mulai:** Sistem melakukan proses scanning dan booting.
2.  **Cek Koneksi:** Sistem mencoba terhubung ke jaringan WiFi utama.

### Percabangan Koneksi
*   **Jika Ada Koneksi:** Sistem langsung menuju ke **3 MENU UTAMA (Online Mode)**.
*   **Jika Tidak Ada Koneksi:** Sistem masuk ke **MENU OFF (Rescue)** dengan fungsionalitas terbatas.

### Stage 2: Rescue Menu (Jika Koneksi Gagal)
User memiliki opsi:
1.  **RESCAN:** Kembali ke proses scanning/booting.
2.  **AUTO:** Sistem mencari jaringan OPEN (Tanpa Password). Jika berhasil, masuk ke Menu Utama.
3.  **MODE OFFL:** Masuk ke Mode Offline dengan fitur terbatas (Hanya Deteksi Cepat).

---

## 3. Alur Operasional (Operational Workflow)

### Menu Utama (Online Mode)
Terdapat tiga opsi utama:

#### A. Alur DETEKSI CEPAT
1.  Pilih **DETEKSI CEPAT**.
2.  Lakukan proses **UKUR** (Baca Sensor Suhu & TDS).
3.  Hasil ditampilkan (Tanpa Simpan).
4.  Opsi: **UKUR ULANG** atau **KEMBALI** (Menu Awal).

#### B. Alur SAPI (Sistem Identifikasi)
1.  Pilih **SAPI**.
2.  **Input ID:** Masukkan ID Sapi.
3.  **Validasi ID:** Sistem mengecek ke Database.
    *   *Tidak Valid:* Kembali ke input ID.
    *   *Valid:* Muncul pertanyaan "AMBIL FOTO?".
        *   **YA:** Kirim trigger capture ke kamera -> Lanjut UKUR.
        *   **TIDAK:** Langsung lanjut UKUR.
4.  **Proses Ukur:** Baca sensor.
5.  **Hasil & Konfirmasi:** User bisa **UKUR ULANG**, **KIRIM** (Simpan ke DB), atau **KEMBALI**.

#### C. Alur CAM (Foto Only)
1.  Pilih **CAM**.
2.  **Input ID:** Masukkan ID Sapi.
3.  **Validasi ID:** Cek Database.
    *   *Tidak Valid:* Kembali ke input ID.
    *   *Valid:* Tekan tombol untuk **CAPTURE**.
4.  **Konfirmasi:** **KIRIM** atau **FOTO ULANG**.
5.  Setelah kirim, kembali ke Menu Utama.

### Mode Offline (Limited)
Jika masuk via "MODE OFFL", sistem hanya menampilkan menu **DETEKSI CEPAT**. Fitur validasi ID dan Kamera dinonaktifkan.


---

## 4. Indikator Status & Standar Kesehatan

Sistem menggunakan standar berikut untuk menentukan status kesehatan ambing:

| Status | Range Suhu | Range Konduktivitas | LED | Buzzer |
| :--- | :--- | :--- | :--- | :--- |
| **NORMAL** | < 38.1°C | < 6.1 mS/cm | <span style="color:green">**HIJAU**</span> | 1x Nada Naik (Happy) |
| **WASPADA** | 38.1 - 39.0°C | 6.1 - 6.5 mS/cm | <span style="color:orange">**KUNING**</span> | 2x Nada Sedang |
| **MASTITIS** | > 39.0°C | > 6.5 mS/cm | <span style="color:red">**MERAH**</span> | 3x Alarm Cepat (Danger) |

---

## 5. Protokol Komunikasi Antar-Mikrokontroler

Komunikasi antara ESP8266 dan ESP32-CAM menggunakan **UART Serial** (Kabel TX-RX).

*   **ESP8266 (Master) -> ESP32-CAM (Slave):**
    *   Perintah: `CAP:<ID_SAPI>\n` (Contoh: `CAP:01`)
*   **ESP32-CAM (Slave) -> ESP8266 (Master):**
    *   Balasan Sukses: `OK\n`
    *   Balasan Gagal: `FAIL\n`

---

## 6. Struktur Data (Firebase Realtime Database)

```json
{
  "cows": {
    "-KeySapiA...": {
      "id": "01",
      "name": "Sapi A",
      "image": "/assets/images/uploads/cam.jpg" // URL Foto
    }
  },
  "detections": {
    "-KeyDeteksi...": {
      "cowId": "01",
      "date": "2026-01-14 10:00:00",
      "temp": 38.5,
      "conductivity": 6.2,
      "status": "Waspada"
    }
  }
}
```

*Dokumen ini diperbarui otomatis oleh GitHub Copilot sesuai dengan source code terbaru.*