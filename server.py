from flask import Flask, request, jsonify, send_from_directory
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
import time  # Untuk performance monitoring

app = Flask(__name__)
CORS(app) # Allow CORS for all domains

# --- AUTO DISCOVERY (AUTO IP) ---
# Mengambil IP Address laptop secara otomatis dan upload ke Firebase
# agar ESP32 tidak perlu ganti kodingan saat ganti WiFi.

SERVICE_ACCOUNT_KEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'MooCare', 'mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json')
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
        
        # Cek apakah ada ngrok_url yang sudah tersimpan
        existing_ngrok = ref.child('ngrok_url').get() or ""
        
        server_config = {
            'ip': current_ip,
            'port': 5000,
            'last_active': {'.sv': 'timestamp'},
            'ngrok_url': existing_ngrok  # Pertahankan ngrok URL yang ada
        }
        
        ref.update(server_config)
        print(">> SUKSES: IP Server berhasil di-upload ke Firebase.")
        print(">> ESP32 sekarang akan otomatis mengambil IP ini.")
        if existing_ngrok:
            print(f">> Ngrok URL: {existing_ngrok}")
            print(f">> TIPS: Untuk update ngrok URL, jalankan: python update_ngrok_url.py <ngrok_url>")
        else:
            print(f">> INFO: Ngrok URL belum di-set. Server berjalan di mode LOCAL.")
            print(f">> TIPS: Untuk enable ngrok, jalankan: python update_ngrok_url.py <ngrok_url>")
        print()
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
# Update path ke folder MooCare (bukan esp32-control lagi)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'MooCare', 'public', 'assets', 'images', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"DEBUG: Folder Upload siap di: {UPLOAD_FOLDER}")

# Endpoint untuk serve gambar (agar Vite bisa akses)
@app.route('/images/<filename>', methods=['GET'])
def serve_image(filename):
    """Serve uploaded images dari Flask server"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/upload', methods=['POST'])
def upload_file():
    print("\n>>> [DEBUG] Menerima request upload dari ESP32...")
    print(f">>> [DEBUG] Content-Type: {request.content_type}")
    
    # CASE 1: ESP32-CAM mengirim raw JPEG (Content-Type: image/jpeg)
    if request.content_type and 'image/jpeg' in request.content_type:
        print(">>> [MODE] ESP32-CAM Raw JPEG")
        
        # Ambil cow_id dari query parameter (ESP32 akan kirim: /upload?id=S001)
        cow_id = request.args.get('id', 'unknown')
        
        # Baca raw data dari request body
        image_data = request.data
        
        if not image_data:
            print(">>> [ERROR] Gagal: Data gambar kosong.")
            return jsonify({'error': 'No image data'}), 400
        
        try:
            # Generate unique filename
            timestamp = int(time.time())
            filename = f"capture_{cow_id}_{timestamp}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            print(f">>> [DEBUG] Menyimpan file ke: {filepath} (Cow ID: {cow_id})")
            
            # Save raw JPEG data
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            if os.path.exists(filepath):
                print(f">>> [SUCCESS] File Tersimpan! Ukuran: {os.path.getsize(filepath)} bytes")
            else:
                print(">>> [ERROR] File write gagal.")
                return jsonify({'error': 'File write failed'}), 500

            # Return URL relative to public folder
            web_url = f"/assets/images/uploads/{filename}"
            
            # Update Firebase
            try:
                print(f">>> [FIREBASE] Attempting to update profile for ID: {cow_id}")
                cows_ref = db.reference('cows')
                snapshot = cows_ref.order_by_child('id').equal_to(cow_id).get()
                
                # Retry dengan format alternatif
                if not snapshot and cow_id.isdigit():
                    alt_id = f"S{cow_id}"
                    print(f">>> [FIREBASE] ID '{cow_id}' not found. Trying '{alt_id}'...")
                    snapshot = cows_ref.order_by_child('id').equal_to(alt_id).get()
                
                if snapshot:
                    for key, val in snapshot.items():
                        updates = {'iotImage': web_url}
                        cows_ref.child(key).update(updates)
                        print(f">>> [FIREBASE] SUCCESS! Updated iotImage for {cow_id} (key: {key})")
                else:
                    print(f">>> [FIREBASE] Warning: Cow ID '{cow_id}' not found in database.")
                    
            except Exception as fb_err:
                print(f">>> [FIREBASE ERROR] Failed to update DB: {fb_err}")
            
            return jsonify({
                'message': 'File uploaded successfully', 
                'url': web_url,
                'cow_id': cow_id,
                'size': len(image_data)
            }), 200
            
        except Exception as e:
            print(f">>> [EXCEPTION] Error saat save: {e}")
            return jsonify({'error': str(e)}), 500
    
    # CASE 2: Upload dari Web (multipart/form-data)
    elif 'image' not in request.files:
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
            timestamp = int(time.time())
            filename = f"capture_{cow_id}_{timestamp}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            print(f">>> [DEBUG] Menyimpan file ke: {filepath} (Cow ID: {cow_id})")
            file.save(filepath)
            
            if os.path.exists(filepath):
                 print(f">>> [SUCCESS] File Tersimpan! Ukuran: {os.path.getsize(filepath)} bytes")
            else:
                 print(">>> [ERROR] File.save() jalan tapi file tidak muncul.")

            # Return URL LENGKAP ke Flask server (bukan relative path)
            current_ip = get_local_ip()
            web_url = f"http://{current_ip}:5000/images/{filename}"
            
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
                        updates = {'iotImage': web_url}
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
    start_time = time.time()
    print("\n" + "="*60)
    print(f"[⏱️ TIMING] Request received at {time.strftime('%H:%M:%S')}")
    
    global model
    if model is None:
        t0 = time.time()
        load_model()
        print(f"[⏱️ TIMING] Model loading took: {time.time()-t0:.2f}s")
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

    if 'image' not in request.files and 'imageUrl' not in request.form:
         return jsonify({'error': 'No image provided'}), 400

    img = None
    
    try:
        # 1. Handle File Upload
        t1 = time.time()
        if 'image' in request.files:
            file = request.files['image']
            img = Image.open(file)
            print(f"[⏱️ TIMING] Image upload processed: {time.time()-t1:.2f}s")
            
        # 2. Handle Image URL
        elif 'imageUrl' in request.form:
            url = request.form['imageUrl']
            print(f"[📥 URL] Fetching from: {url[:80]}...")
            
            # If it's a relative path from the React app (starting with /assets)
            if url.startswith('/'):
                 # Construct absolute path pointing to the public folder in MooCare
                 base_dir = os.path.dirname(os.path.abspath(__file__))
                 # Combine base_dir + MooCare + public + url
                 file_path = os.path.join(base_dir, 'MooCare', 'public', url.lstrip('/'))
                 
                 if os.path.exists(file_path):
                     img = Image.open(file_path)
                     print(f"[⏱️ TIMING] Local file loaded: {time.time()-t1:.2f}s")
                 else:
                     return jsonify({'error': f'File not found at {file_path}'}), 404

            # If it's a local filesystem path (absolute)
            elif os.path.exists(url):
                 img = Image.open(url)
                 print(f"[⏱️ TIMING] Local file loaded: {time.time()-t1:.2f}s")
            else:
                # Assuming it's a web URL
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, stream=True, timeout=10)
                response.raise_for_status()
                img = Image.open(BytesIO(response.content))
                print(f"[⏱️ TIMING] URL download took: {time.time()-t1:.2f}s")
        
        if img is None:
             return jsonify({'error': 'Failed to process image'}), 400

        # Preprocess for MobileNetV2 (224x224, normalized 0-1)
        t2 = time.time()
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        img = img.resize((224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
        
        # PENTING: Gunakan preprocess_input agar sama dengan training (range -1 s/d 1)
        # Jangan pakai manual division / 255.0 lagi.
        img_array = preprocess_input(img_array)
        print(f"[⏱️ TIMING] Image preprocessing: {time.time()-t2:.2f}s")

        # Predict
        t3 = time.time()
        prediction = model.predict(img_array, verbose=0)
        print(f"[⏱️ TIMING] AI Prediction took: {time.time()-t3:.2f}s")
        
        # Decode prediction
        # Class 0: Mastitis
        # Class 1: Normal Teats (Alphabetical: m < n)
        score = float(prediction[0][0])
        
        # Status dengan 3 tingkat: Normal, Waspada, Bahaya
        # score > 0.5 = lebih condong ke Normal
        # score < 0.5 = lebih condong ke Mastitis
        
        if score > 0.7:
            # Sangat yakin Normal   
            result = "Normal"
            confidence = score
        elif score > 0.5:
            # Masih Normal tapi perlu diwaspadai
            result = "Waspada"
            confidence = score
        elif score > 0.3:
            # Condong Mastitis, perlu waspada tinggi
            result = "Waspada"
            confidence = 1.0 - score
        else:
            # Sangat yakin Mastitis - Bahaya
            result = "Bahaya"
            confidence = 1.0 - score
        
        total_time = time.time() - start_time
        print(f"[✅ RESULT] {result} ({confidence*100:.1f}%)")
        print(f"[⏱️ TOTAL] Request completed in: {total_time:.2f}s")
        print("="*60 + "\n")
        
        return jsonify({
            'result': result,
            'confidence': f"{confidence*100:.1f}%",
            'raw_score': score,
            'processing_time': f"{total_time:.2f}s"
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 500

# Load model saat startup server (bukan saat request pertama)
print("\n=== LOADING AI MODEL ===")
load_model()
if model is not None:
    print("=== MODEL READY ===\n")
else:
    print("=== WARNING: Model tidak berhasil di-load ===\n")

if __name__ == '__main__':
    # host='0.0.0.0' artinya: Buka akses untuk SEMUA perangkat di WiFi
    # debug=False dan use_reloader=False agar model TIDAK di-load ulang
    # Model hanya di-load SEKALI saat server pertama kali jalan
    # Server hanya restart kalau Anda Ctrl+C dan jalankan lagi manual
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
