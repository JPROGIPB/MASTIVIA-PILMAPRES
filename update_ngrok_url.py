# Script untuk update Ngrok URL ke Firebase
# Cara pakai:
# 1. Manual: python update_ngrok_url.py https://abc123.ngrok-free.app
# 2. Auto (ambil dari ngrok API): python update_ngrok_url.py

import sys
import requests
import json
import firebase_admin
from firebase_admin import credentials, db
import os

# Firebase config
SERVICE_ACCOUNT_KEY = os.path.join(os.path.dirname(__file__), 'MooCare', 'mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json')
DB_URL = 'https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/'

print("=== Update Ngrok URL ke Firebase ===\n")

ngrok_url = None

try:
    # Cek apakah ada argumen URL manual
    if len(sys.argv) > 1:
        ngrok_url = sys.argv[1]
        print(f"[MODE] Manual URL: {ngrok_url}")
    else:
        # Auto-detect dari Ngrok API
        print("[MODE] Auto-detect dari Ngrok API...")
        response = requests.get('http://127.0.0.1:4040/api/tunnels', timeout=3)
        data = response.json()
        
        # Cari tunnel bernama 'ai' (Flask server) atau tunnel pertama
        for tunnel in data['tunnels']:
            if tunnel['name'] == 'ai' or 'flask' in tunnel['name'].lower():
                ngrok_url = tunnel['public_url']
                break
        
        # Fallback: ambil tunnel pertama yang protokolnya https
        if not ngrok_url:
            for tunnel in data['tunnels']:
                if tunnel['public_url'].startswith('https://'):
                    ngrok_url = tunnel['public_url']
                    break
        
        if not ngrok_url:
            print("❌ Error: Tidak ada tunnel Ngrok aktif!")
            print("   Pastikan ngrok sudah running dengan: ngrok http 5000")
            sys.exit(1)
        
        print(f"✅ Ngrok URL ditemukan: {ngrok_url}")
    
    # Validasi format URL
    if not (ngrok_url.startswith('http://') or ngrok_url.startswith('https://')):
        print("❌ Error: URL harus diawali dengan http:// atau https://")
        sys.exit(1)
    
    # Upload ke Firebase
    print("\n[FIREBASE] Updating...")
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        firebase_admin.initialize_app(cred, {'databaseURL': DB_URL})
    
    ref = db.reference('server_config')
    ref.update({
        'ngrok_url': ngrok_url,
        'ngrok_updated': {'.sv': 'timestamp'}
    })
    
    print(f"✅ Berhasil update Firebase!")
    print(f"\n{'='*60}")
    print(f" NGROK URL: {ngrok_url}")
    print(f"{'='*60}")
    print("\nESP32-CAM akan otomatis menggunakan URL ini.")
    print("Jika ESP32 sudah aktif, kirim perintah 'REFRESH' via Serial untuk update config.\n")
    
except requests.exceptions.RequestException:
    print("❌ Error: Tidak dapat terhubung ke Ngrok API (http://127.0.0.1:4040)")
    print("   Pastikan Ngrok sudah running atau gunakan mode manual:")
    print("   python update_ngrok_url.py https://your-ngrok-url.app")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

