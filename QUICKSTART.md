# 🚀 QUICK START - Deploy ke Vercel + Render

## Step-by-Step (Copy-Paste Ready)

### 1️⃣ PUSH KE GITHUB (5 menit)

```bash
# Dari folder project Anda
git add .
git commit -m "feat: ready for production deployment"
git push origin main
```

---

### 2️⃣ DEPLOY BACKEND (Render) - 20 menit

**A. Buka**: https://dashboard.render.com/register

**B. New Web Service**: 
- Connect GitHub → Select `JOKIAN PILMAPRES`

**C. Settings** (Copy exact):
```
Name:           mastavia-backend
Region:         Singapore
Runtime:        Python 3
Build Command:  pip install -r requirements.txt
Start Command:  gunicorn server:app --bind 0.0.0.0:$PORT
Plan:           Free (atau Starter $7/mo)
```

**D. Environment Variables** (Add satu-satu):
```
FIREBASE_ADMIN_SDK_PATH=/etc/secrets/firebase-key.json
FIREBASE_DATABASE_URL=https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/
FLASK_ENV=production
FLASK_DEBUG=False
MODEL_PATH=model_mastitis_mobilenetv2.h5
CORS_ORIGINS=*
```

**E. Secret Files** (PENTING!):
- Path: `/etc/secrets/firebase-key.json`
- Content: Copy dari `mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json`

**F. Deploy** → Wait 5-10 menit

**G. Catat URL**: Contoh `https://mastavia-backend.onrender.com`

---

### 3️⃣ UPDATE FRONTEND CONFIG (2 menit)

```bash
# Edit file: esp32-control/.env.production
# Ganti baris ini:
VITE_API_URL=https://mastavia-backend.onrender.com  # <-- URL dari Render

# Commit
git add esp32-control/.env.production
git commit -m "chore: set production backend URL"
git push
```

---

### 4️⃣ DEPLOY FRONTEND (Vercel) - 15 menit

**A. Buka**: https://vercel.com/signup

**B. New Project**:
- Import `JOKIAN PILMAPRES` dari GitHub

**C. Configure** (PENTING - Root Directory!):
```
Framework:      Vite
Root Directory: esp32-control  ← JANGAN LUPA!
Build Command:  npm run build
Output:         dist
```

**D. Environment Variables** (Copy semua):
```
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

**E. Deploy** → Wait 2-5 menit

**F. Buka URL**: Contoh `https://jokian-pilmapres.vercel.app`

---

### 5️⃣ TEST (10 menit)

**Backend Test**:
```bash
# Di browser, buka:
https://mastavia-backend.onrender.com/
# Harus muncul response (bukan error 404)
```

**Frontend Test**:
1. Buka URL Vercel
2. ✅ Dashboard muncul
3. ✅ Data sapi tampil (dari Firebase)
4. ✅ Upload foto → AI validation works

**Integration Test**:
1. Di dashboard, klik "Validate Image"
2. Upload foto sapi
3. Harus muncul hasil (Normal/Mastitis)

---

## 🚨 JIKA ADA ERROR

### "Failed to fetch" di Frontend
→ Update CORS di Render:
```
CORS_ORIGINS=https://jokian-pilmapres.vercel.app
```

### "Firebase Admin SDK not found" di Render
→ Cek Secret Files sudah diupload dengan benar

### Backend slow/tidak response (Free Tier)
→ Normal, cold start ~60 detik pertama kali

---

## ✅ SELESAI!

**URLs Anda**:
- Frontend: `https://[project-name].vercel.app`
- Backend: `https://[service-name].onrender.com`
- Database: Firebase Console

**Biaya**: $0/bulan (Free tier)

---

**Butuh detail lengkap?** Baca: `DEPLOY_VERCEL_RENDER.md`

**Ada masalah?** Screenshot error + tanya saya!
