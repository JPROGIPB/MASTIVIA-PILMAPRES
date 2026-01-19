# 🚀 DEPLOYMENT GUIDE: Vercel + Render

## Arsitektur Deployment

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│  ESP32/ESP8266  │──────▶│  Render (Flask)  │◀─────▶│  Firebase   │
│   (Hardware)    │       │   AI + Upload    │       │  (Database) │
└─────────────────┘       └──────────────────┘       └─────────────┘
                                  ▲                          ▲
                                  │                          │
                          ┌───────┴────────┐                 │
                          │  Vercel (React)│─────────────────┘
                          │   Dashboard    │
                          └────────────────┘
```

---

## 📋 CHECKLIST PERSIAPAN

- [x] Environment variables created
- [x] .gitignore updated
- [x] Firebase config refactored
- [x] Build test sukses
- [ ] GitHub repository ready
- [ ] Render account created
- [ ] Vercel account created

---

## PART 1: DEPLOY BACKEND KE RENDER 🖥️

### Step 1: Persiapan File

Pastikan file ini ada di root project:
```
✓ server.py
✓ requirements.txt
✓ model_mastitis_mobilenetv2.h5
✓ .env.production
✓ mastavia-pilmapres-firebase-adminsdk-*.json (untuk upload nanti)
```

### Step 2: Push ke GitHub

```bash
# Di root folder project
git add .
git commit -m "feat: prepare backend for Render deployment"
git push origin main
```

### Step 3: Deploy ke Render

1. **Login/Signup**: https://dashboard.render.com/register
   - Bisa pakai GitHub account (recommended)

2. **Create New Web Service**:
   - Click **"New +"** → **"Web Service"**
   - Connect GitHub repository
   - Select: `JOKIAN PILMAPRES`

3. **Configure Service**:
   ```
   Name:              mastavia-backend
   Region:            Singapore (closest to Jakarta)
   Branch:            main
   Root Directory:    (leave empty - use root)
   Runtime:           Python 3
   Build Command:     pip install -r requirements.txt
   Start Command:     gunicorn server:app --bind 0.0.0.0:$PORT
   ```

4. **Select Plan**:
   - **Free** (untuk testing) - Server sleep setelah 15 menit idle
   - **Starter ($7/mo)** (untuk production) - Always-on, faster

5. **Environment Variables**:
   
   Click **"Advanced"** → **"Add Environment Variable"**:
   
   ```env
   FIREBASE_ADMIN_SDK_PATH=/etc/secrets/firebase-key.json
   FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/
   FLASK_ENV=production
   FLASK_DEBUG=False
   PORT=10000
   MODEL_PATH=model_mastitis_mobilenetv2.h5
   CORS_ORIGINS=*
   ```

6. **Upload Firebase Admin SDK** (PENTING!):
   
   **Sebelum klik "Create Web Service"**, scroll ke bawah:
   
   - Click **"Secret Files"**
   - **File Path**: `/etc/secrets/firebase-key.json`
   - **Contents**: Copy-paste seluruh isi file `mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json`
   
   Format JSON harus valid (cek bracket, comma, quotes)

7. **Create Web Service**:
   - Click **"Create Web Service"**
   - Tunggu ~5-10 menit (deploy pertama kali)
   - Monitor di tab **"Logs"**

8. **Catat URL Backend**:
   ```
   Contoh: https://mastavia-backend.onrender.com
   ```
   **SIMPAN URL INI** - dibutuhkan untuk frontend!

### Step 4: Test Backend

Test di browser atau Postman:
```bash
# Health check
https://mastavia-backend.onrender.com/

# Test upload endpoint (akan return error karena no file, tapi OK jika tidak 404)
https://mastavia-backend.onrender.com/upload
```

---

## PART 2: DEPLOY FRONTEND KE VERCEL 📱

### Step 1: Update Backend URL

Edit file: `esp32-control/.env.production`

```env
# Ganti URL ini dengan URL dari Render
VITE_API_URL=https://mastavia-backend.onrender.com
```

Commit perubahan:
```bash
git add esp32-control/.env.production
git commit -m "chore: update backend URL for production"
git push origin main
```

### Step 2: Login ke Vercel

1. **Signup/Login**: https://vercel.com/signup
   - Gunakan GitHub account (recommended)
   - Vercel akan minta akses ke repository

### Step 3: Import Project

1. **New Project**:
   - Click **"Add New..."** → **"Project"**
   - Select repository: `JOKIAN PILMAPRES`
   - Click **"Import"**

2. **Configure Project**:
   ```
   Framework Preset:        Vite
   Root Directory:          esp32-control  ← PENTING!
   Build Command:           npm run build
   Output Directory:        dist
   Install Command:         npm install
   ```

3. **Environment Variables**:
   
   Click **"Environment Variables"**, tambahkan satu per satu:
   
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyDO4_3JBqotWXGatX3okXIEJ-3XbLyhQ9o
   VITE_FIREBASE_AUTH_DOMAIN=mastavia-pilmapres.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=mastavia-pilmapres
   VITE_FIREBASE_STORAGE_BUCKET=mastavia-pilmapres.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=721288253094
   VITE_FIREBASE_APP_ID=1:721288253094:web:381575fb2a8d136a1cee67
   VITE_FIREBASE_MEASUREMENT_ID=G-JEGDCVC4VD
   VITE_API_URL=https://mastavia-backend.onrender.com
   ```
   
   **Apply to**: Production, Preview, Development

4. **Deploy**:
   - Click **"Deploy"**
   - Tunggu ~2-5 menit
   - Monitor build logs

5. **Dapatkan URL**:
   ```
   Contoh: https://jokian-pilmapres.vercel.app
   ```

### Step 4: Test Frontend

1. Buka URL Vercel di browser
2. Test fitur:
   - ✅ Dashboard muncul
   - ✅ Data sapi dari Firebase tampil
   - ✅ Grafik statistik muncul
   - ✅ AI Validation (upload foto) berfungsi

---

## PART 3: KONFIGURASI CORS (Jika Error) 🔧

Jika frontend tidak bisa akses backend, update CORS di Render:

1. Buka Render Dashboard → mastavia-backend
2. Environment Variables → Edit `CORS_ORIGINS`
3. Ganti dengan URL Vercel:
   ```
   CORS_ORIGINS=https://jokian-pilmapres.vercel.app
   ```
4. Save → Redeploy

---

## PART 4: UPDATE HARDWARE (ESP32/ESP8266) 🔧

### Option A: Auto Discovery (Backend Update Firebase)

Backend `server.py` sudah otomatis upload IP ke Firebase.

Di Firebase Console, cek path: `/server_config/ip`

Seharusnya ada:
```json
{
  "ip": "mastavia-backend.onrender.com",
  "port": 443,
  "protocol": "https"
}
```

### Option B: Manual Update Kode ESP

Edit `esp8266.cpp` dan `esp32cam.cpp`:

```cpp
// Ganti localhost dengan URL Render
const char* serverURL = "https://mastavia-backend.onrender.com";
```

Upload ulang ke hardware.

---

## 🎯 VERIFIKASI DEPLOYMENT

### ✅ Checklist Akhir

**Backend (Render)**:
- [ ] URL backend accessible
- [ ] Endpoint `/upload` return response (bukan 404)
- [ ] Endpoint `/predict` return response
- [ ] Logs tidak ada error critical
- [ ] Firebase sync working (cek server_config/ip)

**Frontend (Vercel)**:
- [ ] Dashboard loading
- [ ] Data Firebase tampil (cows, detections)
- [ ] AI validation bisa upload gambar
- [ ] Chart/graph muncul
- [ ] No console errors (critical)

**Integration**:
- [ ] Frontend → Backend (AI prediction works)
- [ ] Frontend → Firebase (real-time data)
- [ ] Backend → Firebase (IP sync)
- [ ] ESP32 → Backend (foto upload - jika ada hardware)

---

## 🚨 TROUBLESHOOTING

### Frontend Error: "Failed to fetch"
**Cause**: CORS atau backend URL salah

**Fix**:
1. Cek `VITE_API_URL` di Vercel env vars
2. Update `CORS_ORIGINS` di Render
3. Pastikan backend tidak sleep (Render free tier)

### Backend Error: "Firebase Admin SDK not found"
**Cause**: Secret file tidak ter-upload

**Fix**:
1. Render Dashboard → Environment → Secret Files
2. Add file: `/etc/secrets/firebase-key.json`
3. Paste content dari admin SDK JSON
4. Redeploy (Manual Deploy → "Clear build cache & deploy")

### Backend Error: "Model not found"
**Cause**: File `.h5` tidak ter-commit atau terlalu besar

**Fix**:
```bash
# Cek size model
ls -lh model_mastitis_mobilenetv2.h5

# Jika <100MB, commit normal
git add model_mastitis_mobilenetv2.h5
git commit -m "add model file"
git push

# Jika >100MB, gunakan Git LFS
git lfs track "*.h5"
git add .gitattributes
git add model_mastitis_mobilenetv2.h5
git commit -m "add model with LFS"
git push
```

### Render Free Tier Sleep Issue
**Symptom**: Backend tidak response (cold start 30-60 detik)

**Solutions**:
1. **Upgrade ke Starter ($7/mo)** - Always-on
2. **Keep-alive ping**: Buat cron job ping setiap 10 menit
3. **Accept delay**: User pertama tunggu ~1 menit

---

## 💰 BIAYA AKTUAL

| Service | Plan | Harga | Catatan |
|---------|------|-------|---------|
| **Vercel** | Free | $0 | 100GB bandwidth/mo |
| **Render** | Free | $0 | Sleep after 15min idle |
| **Firebase** | Spark | $0 | 1GB storage, 10GB download |
| **Total** | | **$0/mo** | Cocok untuk demo/testing |

**Untuk Production:**
| Service | Plan | Harga |
|---------|------|-------|
| Vercel | Free | $0 |
| Render | Starter | $7/mo |
| Firebase | Spark | $0 |
| **Total** | | **$7/mo** |

---

## 📱 POST-DEPLOYMENT

### Auto-Deploy Setup

**Vercel**: Otomatis deploy saat `git push` (ke folder esp32-control)

**Render**: 
1. Dashboard → Settings → Build & Deploy
2. Enable "Auto-Deploy" ✅
3. Branch: main

### Custom Domain (Opsional)

**Vercel**:
1. Settings → Domains
2. Add domain: `mastavia.yourdomain.com`
3. Update DNS sesuai instruksi

**Render**:
1. Settings → Custom Domain
2. Add: `api.mastavia.yourdomain.com`

### Monitoring

**Setup Alerts** (Recommended):
- Vercel: Settings → Integrations → Slack/Email
- Render: Settings → Notifications

---

## 🎓 ESTIMATED TIMELINE

```
┌─────────────────────────────────────────┐
│ DEPLOYMENT SCHEDULE                      │
├─────────────────────────────────────────┤
│ 1. Push to GitHub         → 5 min       │
│ 2. Deploy Backend (Render)→ 20 min      │
│    - Setup account                       │
│    - Configure service                   │
│    - Upload secrets                      │
│    - First build                         │
│ 3. Update Frontend Config → 5 min       │
│ 4. Deploy Frontend (Vercel)→ 15 min     │
│    - Setup account                       │
│    - Configure project                   │
│    - Add env vars                        │
│    - Build & deploy                      │
│ 5. Testing & Verification→ 15 min       │
├─────────────────────────────────────────┤
│ TOTAL TIME: ~1 hour                     │
└─────────────────────────────────────────┘
```

---

## ✅ READY TO DEPLOY!

Semua file sudah siap. Langkah selanjutnya:

1. **Commit & Push** ke GitHub
2. **Deploy Backend** ke Render (ikuti Part 1)
3. **Deploy Frontend** ke Vercel (ikuti Part 2)
4. **Test Integration** (ikuti Part 3 & 4)

**Good luck! 🚀**

Jika ada error, lihat bagian Troubleshooting atau tanya saya.

---

**Version:** 1.0 - Vercel + Render Specific  
**Last Updated:** January 19, 2026
