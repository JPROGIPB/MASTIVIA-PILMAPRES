from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
import os
import requests
from io import BytesIO
from PIL import Image
import socket
import firebase_admin
from firebase_admin import credentials, db

app = Flask(__name__)
CORS(app) # Allow CORS for all domains

# --- AUTO DISCOVERY (AUTO IP) ---
# Mengambil IP Address laptop secara otomatis dan upload ke Firebase
# agar ESP32 tidak perlu ganti kodingan saat ganti WiFi.

SERVICE_ACCOUNT_KEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'esp32-control', 'mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json')
DB_URL = 'https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/'

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80)) # Dummy connection to Google DNS to get route
        IP = s.getsockname()[0]
        s.close()
        return IP
    except:
        return '127.0.0.1'

try:
    # Cek file credential
    if os.path.exists(SERVICE_ACCOUNT_KEY):
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        firebase_admin.initialize_app(cred, {'databaseURL': DB_URL})
        
        current_ip = get_local_ip()
        print(f"==========================================")
        print(f" DETECTED SERVER IP: {current_ip}")
        print(f"==========================================")
        
        # Upload ke Firebase path: /server_config/ip
        ref = db.reference('server_config')
        ref.update({
            'ip': current_ip,
            'port': 5000,
            'last_active': {'.sv': 'timestamp'}
        })
        print(">> SUKSES: IP Server berhasil di-upload ke Firebase.")
        print(">> ESP32 sekarang akan otomatis mengambil IP ini.\n")
    else:
        print(f"Warning: File credential tidak ditemukan di {SERVICE_ACCOUNT_KEY}")

except Exception as e:
    print(f"Warning: Gagal sync IP ke Firebase. Error: {e}")


MODEL_PATH = 'model_mastitis_mobilenetv2.h5'
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print("Model file not found. Please train the model first.")

# --- NEW: UPLOAD ENDPOINT FOR ESP32-CAM ---
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'esp32-control', 'public', 'assets', 'images', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"DEBUG: Folder Upload siap di: {UPLOAD_FOLDER}")

@app.route('/upload', methods=['POST'])
def upload_file():
    print("\n>>> [DEBUG] Menerima request upload dari ESP32...")
    
    if 'image' not in request.files:
        print(">>> [ERROR] Gagal: Key 'image' tidak ditemukan di request.")
        print(f">>> [DEBUG] Header: {request.headers}")
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        print(">>> [ERROR] Gagal: Nama file kosong.")
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        try:
            # EXTRACT COW ID (From "S001.jpg" -> "S001")
            # ESP32 sends filename as "{id}.jpg"
            original_filename = file.filename
            cow_id = original_filename.split('.')[0] # Simple split
            
            # Generate unique filename on disk
            import time
            timestamp = int(time.time())
            filename = f"capture_{cow_id}_{timestamp}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            print(f">>> [DEBUG] Menyimpan file ke: {filepath} (Cow ID: {cow_id})")
            file.save(filepath)
            
            if os.path.exists(filepath):
                 print(f">>> [SUCCESS] File Tersimpan! Ukuran: {os.path.getsize(filepath)} bytes")
            else:
                 print(">>> [ERROR] File.save() jalan tapi file tidak muncul.")

            # Return URL relative to public folder (for Vite/React)
            web_url = f"/assets/images/uploads/{filename}"
            
            # --- AUTO UPDATE FIREBASE (SERVER SIDE RELIABILITY) ---
            # Update Firebase directly from Server to ensure UI sync
            try:
                print(f">>> [FIREBASE] Attempting to update profile for ID: {cow_id}")
                cows_ref = db.reference('cows')
                # Find cow by ID field
                snapshot = cows_ref.order_by_child('id').equal_to(cow_id).get()
                
                # RETRY LOGIC: If Keypad sends "001" but DB has "S001"
                if not snapshot and cow_id.isdigit():
                     alt_id = f"S{cow_id}"
                     print(f">>> [FIREBASE] ID '{cow_id}' not found. Trying '{alt_id}'...")
                     snapshot = cows_ref.order_by_child('id').equal_to(alt_id).get()

                if snapshot:
                    for key, val in snapshot.items():
                        # FIX LOGIC: Hapus profil photo jika itu adalah bekas capture lama
                        # Tapi lebih aman kita update iotImage saja.
                        # Agar user yakin, kita print log yang sangat jelas
                        
                        updates = {'iotImage': web_url}
                        
                        # OPTIONAL: Jika Anda ingin "membersihkan" profilePhoto yang terlanjur salah (berisi capture_)
                        # Anda bisa uncomment baris di bawah ini, tapi hati-hati menghapus foto asli user.
                        # if val.get('profilePhoto', '').startswith('/assets/images/uploads/capture_'):
                        #    updates['profilePhoto'] = None 
                        
                        cows_ref.child(key).update(updates)
                        print(f">>> [FIREBASE] SUCCESS! Updated iotImage for {cow_id} (key: {key})")
                        print(f">>> [DEBUG] URL: {web_url}")
                else:
                     print(f">>> [FIREBASE] Warning: Cow ID '{cow_id}' not found in database.")
                     
            except Exception as fb_err:
                print(f">>> [FIREBASE ERROR] Failed to update DB: {fb_err}")
            # -------------------------------------------------------
            
            return jsonify({
                'message': 'File uploaded successfully', 
                'url': web_url,
                'cow_id': cow_id
            }), 200
        except Exception as e:
            print(f">>> [EXCEPTION] Error saat save: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    global model
    if model is None:
        load_model()
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

    if 'image' not in request.files and 'imageUrl' not in request.form:
         return jsonify({'error': 'No image provided'}), 400

    img = None
    
    try:
        # 1. Handle File Upload
        if 'image' in request.files:
            file = request.files['image']
            img = Image.open(file)
            
        # 2. Handle Image URL
        elif 'imageUrl' in request.form:
            url = request.form['imageUrl']
            # If it's a relative path from the React app (starting with /assets)
            if url.startswith('/'):
                 # Construct absolute path pointing to the public folder in esp32-control
                 base_dir = os.path.dirname(os.path.abspath(__file__))
                 # Combine base_dir + esp32-control + public + url
                 file_path = os.path.join(base_dir, 'esp32-control', 'public', url.lstrip('/'))
                 
                 if os.path.exists(file_path):
                     img = Image.open(file_path)
                 else:
                     return jsonify({'error': f'File not found at {file_path}'}), 404

            # If it's a local filesystem path (absolute)
            elif os.path.exists(url):
                 img = Image.open(url)
            else:
                # Assuming it's a web URL
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, stream=True)
                response.raise_for_status()
                img = Image.open(BytesIO(response.content))
        
        if img is None:
             return jsonify({'error': 'Failed to process image'}), 400

        # Preprocess for MobileNetV2 (224x224, normalized 0-1)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        img = img.resize((224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
        
        # PENTING: Gunakan preprocess_input agar sama dengan training (range -1 s/d 1)
        # Jangan pakai manual division / 255.0 lagi.
        img_array = preprocess_input(img_array)

        # Predict
        prediction = model.predict(img_array)
        
        # Decode prediction
        # Class 0: Mastitis
        # Class 1: Normal Teats (Alphabetical: m < n)
        score = float(prediction[0][0])
        
        if score > 0.5:
            result = "Normal"
            confidence = score
        else:
            result = "Mastitis"
            confidence = 1.0 - score
        
        return jsonify({
            'result': result,
            'confidence': f"{confidence*100:.1f}%",
            'raw_score': score
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # host='0.0.0.0' artinya: Buka akses untuk SEMUA perangkat di WiFi
    app.run(host='0.0.0.0', port=5000, debug=True)
