# Quick Start Checklist - Print this for laptop setup

## 📋 CHECKLIST SETUP LAPTOP BARU

### A. Download & Install Software
- [ ] Python 3.8+ dari https://www.python.org/downloads/
      ✅ Centang "Add Python to PATH"
- [ ] Node.js 18+ dari https://nodejs.org/
- [ ] Ngrok dari https://ngrok.com/download
- [ ] Git (opsional) dari https://git-scm.com/downloads/

### B. Persiapan File
- [ ] Copy folder MASTIVIA-PILMAPRES ke laptop baru
      ATAU
      Clone: git clone https://github.com/JPROGIPB/MASTIVIA-PILMAPRES.git
- [ ] Pastikan file model AI ada: model_mastitis_mobilenetv2.h5
- [ ] Pastikan Firebase credential ada: MooCare/mastavia-pilmapres-firebase...json

### C. Setup Otomatis
- [ ] Buka PowerShell di folder project
- [ ] Jalankan: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
- [ ] Jalankan: .\setup.ps1
- [ ] Tunggu sampai semua dependencies terinstall

### D. Konfigurasi Ngrok (One-time)
- [ ] Buka https://dashboard.ngrok.com/signup
- [ ] Daftar/Login
- [ ] Copy authtoken dari https://dashboard.ngrok.com/get-started/your-authtoken
- [ ] Jalankan: ngrok config add-authtoken TOKEN_ANDA

### E. Test Run
- [ ] Jalankan: .\start-all.ps1
- [ ] Buka browser: http://localhost:5173 (Web App)
- [ ] Buka browser: http://localhost:5000 (AI Server)
- [ ] Buka browser: http://localhost:4040 (Ngrok Dashboard)
- [ ] Cek apakah semua berjalan normal

### F. Stop System
- [ ] Jalankan: .\stop-all.ps1
      ATAU
      Get-Job | Stop-Job; Get-Job | Remove-Job

---

## 🚀 COMMAND CEPAT

### Install semua dependencies:
```powershell
.\setup.ps1
```

### Start semua service:
```powershell
.\start-all.ps1
```

### Stop semua service:
```powershell
.\stop-all.ps1
```

---

## 🔧 TROUBLESHOOTING

### Error: "flask_cors module not found"
```powershell
pip install flask-cors
```

### Error: "Port already in use"
```powershell
Get-Process node, python -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Error: "Script cannot be run"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "Ngrok authentication failed"
```powershell
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

## 📞 PORTS YANG DIGUNAKAN

- 5000 → AI Server (Flask)
- 5173 → Web Server (Vite/React)
- 4040 → Ngrok Dashboard

---

## ⏱️ ESTIMASI WAKTU SETUP

- Download software: ~10 menit
- Install dependencies: ~5-10 menit
- Konfigurasi: ~2 menit
- Total: ~15-20 menit

---

## ✅ VERIFIKASI INSTALASI

Semua command ini harus berhasil:
```powershell
python --version        # Python 3.8+
node --version          # v18+
npm --version           # 9+
ngrok version           # ngrok version
pip list | findstr flask    # flask, flask-cors
```

---

Print halaman ini untuk referensi saat setup laptop baru!
