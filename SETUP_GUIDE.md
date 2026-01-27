# 🚀 MooCare System - Setup Guide untuk Laptop Baru

Panduan lengkap untuk menjalankan sistem MooCare di laptop/komputer lain.

---

## 📋 Persyaratan Sistem

### 1. Software yang Harus Diinstall

#### A. **Python 3.8 atau lebih baru**
- Download: https://www.python.org/downloads/
- ✅ Pastikan centang "Add Python to PATH" saat install
- Verifikasi instalasi:
  ```powershell
  python --version
  ```

#### B. **Node.js (versi 18 atau lebih baru)**
- Download: https://nodejs.org/
- Verifikasi instalasi:
  ```powershell
  node --version
  npm --version
  ```

#### C. **Git** (opsional, untuk clone repository)
- Download: https://git-scm.com/downloads/

#### D. **Ngrok** (untuk tunneling/akses dari luar)
- Download: https://ngrok.com/download
- Extract dan letakkan di folder yang mudah diakses
- Tambahkan ke PATH atau copy `ngrok.exe` ke folder project

---

## 🔧 Langkah-langkah Setup

### Step 1: Clone atau Copy Project

**Jika pakai Git:**
```powershell
git clone https://github.com/JPROGIPB/MASTIVIA-PILMAPRES.git
cd MASTIVIA-PILMAPRES
```

**Atau copy folder project secara manual**

---

### Step 2: Setup Python Virtual Environment (Recommended)

```powershell
# Buat virtual environment
python -m venv .venv

# Aktivasi virtual environment
.\.venv\Scripts\Activate.ps1
```

**Jika muncul error "execution policy":**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Step 3: Install Python Dependencies

```powershell
pip install -r requirements.txt
```

**Jika requirements.txt belum ada atau error, install manual:**
```powershell
pip install flask flask-cors tensorflow pillow numpy requests firebase-admin
```

---

### Step 4: Install Node.js Dependencies (untuk Web App)

```powershell
cd MooCare
npm install
cd ..
```

---

### Step 5: Setup Ngrok (One-time Setup)

1. **Daftar akun Ngrok** (gratis):
   - Kunjungi: https://dashboard.ngrok.com/signup

2. **Get Authtoken**:
   - Login ke: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy authtoken Anda

3. **Setup authtoken**:
   ```powershell
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

---

### Step 6: Setup Firebase (jika diperlukan)

File Firebase credential sudah ada di:
```
MooCare/mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json
```

✅ File ini sudah include dalam project, tidak perlu konfigurasi tambahan.

---

## ▶️ Menjalankan Sistem

### Opsi 1: Jalankan Semua Service Sekaligus (Recommended)

```powershell
.\start-all.ps1
```

**Service yang akan berjalan:**
- ✅ AI Server (Flask) - Port 5000
- ✅ Web Server (Vite/React) - Port 5173
- ✅ Ngrok Tunnels - Public URLs

**Akses:**
- AI Server: http://localhost:5000
- Web App: http://localhost:5173
- Ngrok Dashboard: http://localhost:4040

---

### Opsi 2: Jalankan Manual (Per Service)

**Terminal 1 - AI Server:**
```powershell
python server.py
```

**Terminal 2 - Web Server:**
```powershell
cd MooCare
npm run dev
```

**Terminal 3 - Ngrok:**
```powershell
ngrok start --all --config ngrok.yaml
```

---

## 🛑 Menghentikan Sistem

### Jika pakai start-all.ps1:
```powershell
.\stop-all.ps1
```

### Atau manual:
```powershell
Get-Job | Stop-Job
Get-Job | Remove-Job
Get-Process python, node, ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 📁 Struktur File Penting

```
MASTIVIA-PILMAPRES/
├── server.py                          # AI Server (Flask)
├── model_mastitis_mobilenetv2.h5      # Model AI
├── requirements.txt                   # Python dependencies
├── ngrok.yaml                         # Konfigurasi Ngrok
├── start-all.ps1                      # Script start semua
├── stop-all.ps1                       # Script stop semua
├── MooCare/                           # Web Application
│   ├── package.json                   # Node dependencies
│   ├── src/                           # Source code React
│   └── mastavia-pilmapres-firebase... # Firebase credentials
└── Data kaggle mastitis/              # Dataset untuk training
```

---

## ⚙️ Konfigurasi Penting

### Port yang Digunakan:
- **5000**: AI Server (Flask)
- **5173**: Web Dev Server (Vite)
- **4040**: Ngrok Dashboard

### Ngrok Configuration (ngrok.yaml):
```yaml
version: "2"
tunnels:
  web:
    proto: http
    addr: 127.0.0.1:5173
  ai:
    proto: http
    addr: 8000
```

---

## 🐛 Troubleshooting

### Error: "Module not found flask_cors"
```powershell
pip install flask-cors
```

### Error: "Port 5173 already in use"
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Error: "Ngrok authentication failed"
```powershell
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Error: "Script cannot be run"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### AI Server tidak bisa akses model
✅ Pastikan file `model_mastitis_mobilenetv2.h5` ada di root folder

### Web tidak connect ke AI Server
✅ Cek IP address di Firebase → server_config/ip
✅ Pastikan Flask server running di port 5000

---

## 📝 Checklist Setup Laptop Baru

- [ ] Install Python 3.8+
- [ ] Install Node.js 18+
- [ ] Install Ngrok
- [ ] Clone/Copy project ke laptop
- [ ] Buat virtual environment Python
- [ ] Install Python dependencies (`pip install -r requirements.txt`)
- [ ] Install Node dependencies (`cd MooCare && npm install`)
- [ ] Setup ngrok authtoken
- [ ] Test run dengan `.\start-all.ps1`
- [ ] Cek semua service di localhost
- [ ] Cek ngrok dashboard untuk public URLs

---

## 🔗 Links Penting

- **Python**: https://www.python.org/downloads/
- **Node.js**: https://nodejs.org/
- **Ngrok**: https://ngrok.com/download
- **Ngrok Dashboard**: https://dashboard.ngrok.com/
- **Firebase Console**: https://console.firebase.google.com/

---

## 📞 Support

Jika ada masalah saat setup, cek:
1. Semua software sudah terinstall dengan benar
2. Virtual environment sudah diaktifkan
3. Semua dependencies terinstall
4. Port tidak konflik dengan aplikasi lain
5. Ngrok authtoken sudah di-setup

---

## 🎯 Status AI Model

Model saat ini menggunakan **3 tingkat klasifikasi**:

| Status | Confidence | Keterangan |
|--------|-----------|------------|
| **Normal** | > 70% | Sapi sehat, tidak ada masalah |
| **Waspada** | 30-70% | Perlu perhatian khusus |
| **Bahaya** | < 30% | Terdeteksi mastitis kuat |

---

**Last Updated**: January 27, 2026
**Version**: 1.0
