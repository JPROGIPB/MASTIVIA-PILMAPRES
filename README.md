# MASTIVIA IoT System

Sistem deteksi dini mastitis pada sapi perah menggunakan sensor suhu & konduktivitas, dilengkapi dengan AI image classification.

## 📁 Struktur Proyek

```
.
├── esp32-control/          # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── dashboard.jsx   # Main dashboard UI
│   │   ├── firebase.js     # Firebase client config
│   │   └── main.jsx
│   ├── public/
│   │   └── assets/images/uploads/  # Upload folder ESP32-CAM
│   ├── .env                # Environment variables (local)
│   ├── .env.production     # Production config
│   ├── package.json
│   └── vite.config.js
│
├── server.py               # Flask backend (AI prediction + upload)
├── model_mastitis_mobilenetv2.h5  # TensorFlow model
├── train_mastitis_model.py # Model training script
├── esp8266.cpp             # Master node (ESP8266)
├── esp32cam.cpp            # Camera node (ESP32-CAM)
├── requirements.txt        # Python dependencies
├── .env                    # Backend environment variables
├── DEPLOYMENT.md           # Panduan deployment
└── README.md               # This file
```

## 🚀 Quick Start (Development)

### 1. Setup Backend
```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run Flask server
python server.py
```
Server berjalan di: http://localhost:5000

### 2. Setup Frontend
```bash
cd esp32-control

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev
```
Frontend berjalan di: http://localhost:5173

### 3. Setup Firebase
1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. Enable Realtime Database
3. Download Admin SDK JSON → simpan di `esp32-control/`
4. Update `.env` dengan Firebase credentials

## 🔧 Hardware Setup

### ESP8266 (Master Node)
- **Display:** ST7735 TFT LCD
- **Sensor:** MLX90614 (Infrared Temperature), TDS Sensor
- **Keypad:** 4x4 Matrix via PCF8574
- **Buzzer:** GPIO16

### ESP32-CAM (Photo Node)
- **Camera:** OV2640
- **Communication:** Serial dengan ESP8266

## 📊 Features

✅ Real-time monitoring suhu & konduktivitas susu  
✅ AI-powered image classification (Normal/Mastitis)  
✅ Firebase Realtime Database integration  
✅ Responsive web dashboard dengan analytics  
✅ Offline mode untuk ESP8266  
✅ Auto IP discovery untuk ESP32  
✅ Export data ke PDF  
✅ Multi-language status (Indonesia)  

## 🌐 Deployment

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan lengkap deploy ke production.

**Platform yang digunakan:**
- **Frontend:** Vercel
- **Backend:** Render.com
- **Database:** Firebase Realtime Database
- **Hardware:** ESP8266 + ESP32-CAM

## 📱 Tech Stack

### Frontend
- React 19
- Vite 7
- TailwindCSS 4
- Recharts (Charts)
- Lucide React (Icons)
- Firebase JS SDK

### Backend
- Flask (Python)
- TensorFlow/Keras
- Firebase Admin SDK
- Pillow (Image processing)

### Hardware
- ESP8266 (NodeMCU)
- ESP32-CAM
- MLX90614 Temperature Sensor
- TDS Sensor
- ST7735 TFT Display

## 📄 License

Educational Project - PILMAPRES 2026

## 👥 Contributors

- **Julman Waruwu** - Developer

---

**Last Updated:** January 2026
