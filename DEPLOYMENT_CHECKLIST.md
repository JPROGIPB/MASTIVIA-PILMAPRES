# 🚀 DEPLOYMENT QUICK REFERENCE

## ✅ PRE-DEPLOYMENT CHECKLIST

### Keamanan
- [x] API Keys di environment variables
- [x] `.gitignore` sudah exclude `.env` dan `*-adminsdk-*.json`
- [x] Build test sukses (Frontend)
- [ ] Test backend lokal running
- [ ] Firebase Rules sudah di-review

### Files yang TIDAK boleh di-commit:
```
.env
.env.local
*-adminsdk-*.json
node_modules/
dist/
__pycache__/
*.h5 (model besar >100MB)
```

---

## 📦 DEPLOYMENT ORDER

```
1. Deploy Backend (Render)  →  Dapat URL
2. Update Frontend .env     →  Tambahkan backend URL
3. Deploy Frontend (Vercel) →  Dapat URL
4. Update ESP32/ESP8266     →  Gunakan backend URL
```

---

## 🌐 FRONTEND - VERCEL

### Commands
```bash
cd esp32-control
npm install
npm run build    # Test lokal
npm run preview  # Preview build
```

### Vercel Settings
| Field | Value |
|-------|-------|
| Framework | Vite |
| Root Directory | `esp32-control` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node Version | 18.x |

### Environment Variables (Vercel Dashboard)
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

---

## 🖥️ BACKEND - RENDER

### Commands (Test Lokal)
```bash
pip install -r requirements.txt
python server.py
```

### Render Settings
| Field | Value |
|-------|-------|
| Environment | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn server:app --bind 0.0.0.0:$PORT` |
| Plan | Free (atau Starter $7/mo) |

### Environment Variables (Render Dashboard)
```env
FIREBASE_ADMIN_SDK_PATH=/etc/secrets/firebase-key.json
FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/
FLASK_ENV=production
FLASK_DEBUG=False
PORT=10000
```

### Secret File (Render Dashboard)
**Path:** `/etc/secrets/firebase-key.json`  
**Content:** Copy isi `mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json`

### Install Gunicorn (Add to requirements.txt)
```bash
echo "gunicorn==21.2.0" >> requirements.txt
```

---

## 🔥 FIREBASE SETUP

### Realtime Database Rules
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "cows": {
      ".indexOn": ["id"]
    }
  }
}
```

### Paths yang digunakan:
```
/cows/              - Data sapi
/detections/        - History deteksi
/daily_logs/        - Log harian (prevent duplicate)
/control/           - Active cow ID
/server_config/     - Backend IP & port
```

---

## 🔧 HARDWARE UPDATE (Setelah Deploy)

### Option 1: Auto Discovery (Recommended)
Backend `server.py` otomatis upload IP ke Firebase `/server_config/ip`  
ESP8266 baca dari path tersebut.

### Option 2: Manual Update
Update di Firebase Console → `/server_config/`:
```json
{
  "ip": "mastavia-backend.onrender.com",
  "port": 443,
  "protocol": "https"
}
```

### Option 3: Hardcode (Not Recommended)
Edit `esp8266.cpp` line 31:
```cpp
const char* serverURL = "https://mastavia-backend.onrender.com";
```

---

## 📊 MONITORING

### Frontend (Vercel)
- Dashboard: https://vercel.com/dashboard
- Real-time logs
- Auto-deploy on git push

### Backend (Render)
- Dashboard: https://dashboard.render.com
- Logs tab untuk debugging
- ⚠️ Free tier sleep after 15 min idle

### Firebase
- Console: https://console.firebase.google.com
- Database tab untuk data monitoring
- Usage tab untuk quota

---

## 🚨 COMMON ISSUES

### Frontend tidak konek Backend
```bash
# Check VITE_API_URL di Vercel
# Check CORS di server.py (allow origin)
```

### Backend error "Firebase Admin SDK not found"
```bash
# Upload Secret File di Render Dashboard
# Path: /etc/secrets/firebase-key.json
```

### ESP32 tidak bisa upload foto
```bash
# Test: curl -X POST https://backend-url.onrender.com/upload
# Check Firebase /server_config/ip
# Render free tier: server mungkin sedang sleep
```

### Model AI tidak load
```bash
# Check file model_mastitis_mobilenetv2.h5 exist
# Size >100MB: Use Git LFS atau upload manual
```

---

## 💰 COST ESTIMATE

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB/mo | $20/mo |
| Render | 750h/mo (sleep) | $7/mo (always-on) |
| Firebase | 1GB storage | Pay-as-you-go |
| **TOTAL** | **$0** | **~$27/mo** |

---

## 🎯 DEPLOYMENT TIMELINE

1. **Persiapan** (30 menit)
   - Copy .env files
   - Test build lokal
   - Commit & push ke GitHub

2. **Deploy Backend** (15 menit)
   - Setup Render account
   - Deploy service
   - Upload Firebase SDK
   - Catat URL backend

3. **Deploy Frontend** (10 menit)
   - Setup Vercel account
   - Import GitHub repo
   - Set environment vars
   - Deploy

4. **Testing** (20 menit)
   - Test frontend → backend connection
   - Test Firebase sync
   - Test ESP32 upload (jika ada)

**Total:** ~1.5 jam (pertama kali)

---

## 📞 SUPPORT LINKS

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Vite Docs: https://vitejs.dev
- Flask Docs: https://flask.palletsprojects.com

---

**Version:** 1.0  
**Last Updated:** January 2026
