# MooCare - Deployment Guide

## 🚀 Panduan Deploy Production

Proyek ini terdiri dari 3 komponen yang harus di-deploy terpisah:
1. **Frontend (React + Vite)** → Vercel/Netlify
2. **Backend (Flask + TensorFlow)** → Render/Railway
3. **Database (Firebase)** → Sudah cloud (tidak perlu deploy)

---

## 📦 PERSIAPAN SEBELUM DEPLOY

### ✅ Checklist Keamanan
- [x] API Keys dipindah ke environment variables
- [x] `.env` files dibuat (tidak di-commit ke git)
- [x] `.gitignore` updated untuk exclude secrets
- [x] Admin SDK JSON tidak ter-commit
- [ ] Test build lokal berhasil

### 🔧 Test Lokal Sebelum Deploy

#### Frontend Test:
```bash
cd esp32-control
npm install
npm run build
npm run preview
```
Buka http://localhost:4173

#### Backend Test:
```bash
pip install -r requirements.txt
python server.py
```
Test endpoint: http://localhost:5000/upload

---

## 🌐 DEPLOYMENT FRONTEND (Vercel)

### Step 1: Push ke GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy ke Vercel
1. Login ke [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import repository GitHub Anda
4. **Framework Preset:** Vite
5. **Root Directory:** `esp32-control`
6. **Build Command:** `npm run build`
7. **Output Directory:** `dist`

### Step 3: Set Environment Variables di Vercel
Di Vercel Dashboard > Settings > Environment Variables, tambahkan:

```
VITE_FIREBASE_API_KEY=AIzaSyDO4_3JBqotWXGatX3okXIEJ-3XbLyhQ9o
VITE_FIREBASE_AUTH_DOMAIN=mastavia-pilmapres.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=mastavia-pilmapres
VITE_FIREBASE_STORAGE_BUCKET=mastavia-pilmapres.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=721288253094
VITE_FIREBASE_APP_ID=1:721288253094:web:381575fb2a8d136a1cee67
VITE_FIREBASE_MEASUREMENT_ID=G-JEGDCVC4VD
VITE_API_URL=https://your-backend-url.onrender.com
```

**⚠️ PENTING:** Ganti `VITE_API_URL` dengan URL backend setelah deploy backend!

### Step 4: Deploy
Click **"Deploy"** dan tunggu proses selesai.

---

## 🖥️ DEPLOYMENT BACKEND (Render.com)

### Persiapan File

Buat file baru: `render.yaml` (optional, untuk automated deploy)
```yaml
services:
  - type: web
    name: mastavia-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn server:app
    envVars:
      - key: FIREBASE_DATABASE_URL
        value: https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/
      - key: FLASK_ENV
        value: production
```

### Step 1: Signup di Render
1. Login ke [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository

### Step 2: Konfigurasi Service
- **Name:** mastavia-backend
- **Environment:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn server:app --bind 0.0.0.0:$PORT`
- **Plan:** Free (atau Starter $7/month untuk production)

### Step 3: Environment Variables
Tambahkan di Render Dashboard:
```
FIREBASE_ADMIN_SDK_PATH=/etc/secrets/firebase-key.json
FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/
FLASK_ENV=production
PORT=10000
```

### Step 4: Upload Firebase Admin SDK
Di Render Dashboard > Settings > Secret Files:
- **Filename:** `/etc/secrets/firebase-key.json`
- **Content:** Copy-paste isi file `mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json`

### Step 5: Deploy
Click **"Create Web Service"**

Catat URL backend yang diberikan (contoh: `https://mastavia-backend.onrender.com`)

---

## 🔗 UPDATE SETELAH BACKEND DEPLOY

### Update Frontend
1. Di Vercel Dashboard → Settings → Environment Variables
2. Update `VITE_API_URL` dengan URL backend Render
3. Redeploy frontend (Vercel akan auto-rebuild)

### Update ESP32/ESP8266
File `server.py` sudah ada auto IP discovery via Firebase.
ESP akan otomatis ambil IP dari path: `server_config/ip`

Untuk production, update manual di Firebase Console:
```
/server_config/
  ip: "mastavia-backend.onrender.com"
  port: 443
  protocol: "https"
```

Atau update kode ESP8266 line 31:
```cpp
const char* dbBaseURL = "https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/";
```

---

## 🔒 FIREBASE SECURITY RULES

Update Firebase Rules untuk production:

```json
{
  "rules": {
    "cows": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id"]
    },
    "detections": {
      ".read": true,
      ".write": true
    },
    "daily_logs": {
      ".read": true,
      ".write": true
    },
    "control": {
      ".read": true,
      ".write": true
    },
    "server_config": {
      ".read": true,
      ".write": true
    }
  }
}
```

**⚠️ PRODUCTION:** Sebaiknya tambahkan authentication!

---

## 📊 MONITORING & MAINTENANCE

### Vercel (Frontend)
- Dashboard: https://vercel.com/dashboard
- Logs: Real-time di Dashboard
- Auto-deploy: Setiap git push ke main branch

### Render (Backend)
- Dashboard: https://dashboard.render.com
- Logs: Real-time di Service → Logs tab
- Auto-deploy: Setiap git push (jika enabled)

### Firebase
- Console: https://console.firebase.google.com
- Database: Realtime Database → Data tab
- Monitoring: Usage tab untuk quota

---

## 🚨 TROUBLESHOOTING

### Frontend tidak konek ke Backend
✅ Cek `VITE_API_URL` di Vercel environment variables
✅ Cek CORS di `server.py` (pastikan allow origin = *)

### Backend error 500
✅ Cek Render logs
✅ Pastikan Firebase Admin SDK file sudah di-upload
✅ Cek dependencies di `requirements.txt`

### ESP32 tidak bisa upload
✅ Cek Firebase path `/server_config/ip`
✅ Test endpoint: `https://backend-url.onrender.com/upload`
✅ Pastikan server running (Render free tier sleep setelah 15 menit idle)

### Model AI tidak load
✅ Pastikan file `model_mastitis_mobilenetv2.h5` ada di repository
✅ Cek size model (jika >100MB, gunakan Git LFS atau upload manual)
✅ Alternative: Host model di cloud storage (Google Drive, S3)

---

## 💰 ESTIMASI BIAYA

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| **Vercel** | 100GB bandwidth/month | $20/month (Pro) |
| **Render** | 750 jam/month (sleep after 15min idle) | $7/month (always-on) |
| **Firebase** | 1GB storage, 10GB download/month | Pay as you go |
| **TOTAL** | $0 (dengan batasan) | ~$27/month (production-ready) |

---

## 📝 NEXT STEPS (PRODUCTION READY)

1. [ ] Setup custom domain (opsional)
2. [ ] Enable Firebase Authentication
3. [ ] Add rate limiting di backend
4. [ ] Setup monitoring (Sentry, LogRocket)
5. [ ] Backup Firebase data reguler
6. [ ] Add SSL certificate (auto di Vercel & Render)
7. [ ] Implement caching untuk model predictions

---

## 📞 SUPPORT

Jika ada masalah:
1. Cek logs di Vercel/Render dashboard
2. Cek Firebase Console untuk database issues
3. Test endpoints dengan Postman/curl
4. Review dokumentasi platform:
   - Vercel: https://vercel.com/docs
   - Render: https://render.com/docs
   - Firebase: https://firebase.google.com/docs

---

**Last Updated:** January 2026
**Version:** 1.0.0
