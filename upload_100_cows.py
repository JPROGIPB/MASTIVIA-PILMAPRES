"""
Script untuk upload 100 data sapi dengan ID angka 1-100
"""

import firebase_admin
from firebase_admin import credentials, db
import os

# Path ke Firebase Admin SDK
SERVICE_ACCOUNT_KEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'esp32-control', 'mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json')
DB_URL = 'https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/'

# Initialize Firebase Admin (cek jika sudah diinisialisasi)
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred, {'databaseURL': DB_URL})

# Data mapping dari tabel asli
data_mapping = [
    ("1", "Holstein", "Betina", "24", "582"),
    ("2", "Limousin", "Jantan", "36", "810"),
    ("3", "Sapi Bali", "Betina", "18", "290"),
    ("4", "Simmental", "Jantan", "30", "745"),
    ("5", "Jersey", "Betina", "22", "415"),
    ("6", "Angus", "Jantan", "28", "690"),
    ("7", "Holstein", "Betina", "42", "610"),
    ("8", "Brahman", "Jantan", "48", "720"),
    ("9", "Sapi Bali", "Jantan", "24", "385"),
    ("10", "Madura", "Betina", "30", "310"),
    ("11", "Limousin", "Jantan", "20", "540"),
    ("12", "Simmental", "Betina", "15", "420"),
    ("13", "Jersey", "Betina", "36", "450"),
    ("14", "Holstein", "Betina", "28", "595"),
    ("15", "PO (Ongole)", "Jantan", "40", "615"),
    ("16", "Angus", "Betina", "24", "510"),
    ("17", "Brahman", "Betina", "32", "490"),
    ("18", "Sapi Bali", "Jantan", "12", "210"),
    ("19", "Holstein", "Betina", "50", "630"),
    ("20", "Simmental", "Jantan", "18", "515"),
    ("21", "Limousin", "Betina", "26", "580"),
    ("22", "Jersey", "Betina", "14", "320"),
    ("23", "Madura", "Jantan", "22", "345"),
    ("24", "Brahman", "Jantan", "36", "680"),
    ("25", "Angus", "Jantan", "42", "820"),
    ("26", "Holstein", "Betina", "30", "605"),
    ("27", "PO (Ongole)", "Betina", "24", "410"),
    ("28", "Sapi Bali", "Betina", "36", "320"),
    ("29", "Simmental", "Jantan", "48", "910"),
    ("30", "Limousin", "Jantan", "12", "390"),
    ("31", "Jersey", "Betina", "40", "470"),
    ("32", "Holstein", "Betina", "18", "490"),
    ("33", "Brahman", "Betina", "28", "510"),
    ("34", "Angus", "Betina", "30", "560"),
    ("35", "Madura", "Jantan", "18", "295"),
    ("36", "Sapi Bali", "Jantan", "42", "430"),
    ("37", "Simmental", "Betina", "22", "530"),
    ("38", "Holstein", "Betina", "36", "620"),
    ("39", "PO (Ongole)", "Jantan", "30", "580"),
    ("40", "Limousin", "Betina", "15", "410"),
    ("41", "Jersey", "Betina", "24", "430"),
    ("42", "Angus", "Jantan", "32", "750"),
    ("43", "Brahman", "Jantan", "20", "520"),
    ("44", "Sapi Bali", "Betina", "48", "350"),
    ("45", "Holstein", "Betina", "12", "380"),
    ("46", "Simmental", "Jantan", "36", "840"),
    ("47", "Limousin", "Jantan", "24", "670"),
    ("48", "Madura", "Betina", "42", "330"),
    ("49", "Jersey", "Betina", "30", "460"),
    ("50", "PO (Ongole)", "Betina", "36", "480"),
    ("51", "Angus", "Jantan", "18", "530"),
    ("52", "Brahman", "Betina", "24", "470"),
    ("53", "Holstein", "Betina", "40", "615"),
    ("54", "Sapi Bali", "Jantan", "30", "405"),
    ("55", "Simmental", "Betina", "28", "590"),
    ("56", "Limousin", "Jantan", "48", "950"),
    ("57", "Jersey", "Betina", "12", "305"),
    ("58", "Madura", "Jantan", "36", "390"),
    ("59", "PO (Ongole)", "Jantan", "12", "310"),
    ("60", "Angus", "Betina", "36", "580"),
    ("61", "Brahman", "Jantan", "50", "740"),
    ("62", "Holstein", "Betina", "22", "560"),
    ("63", "Sapi Bali", "Betina", "20", "285"),
    ("64", "Simmental", "Jantan", "24", "680"),
    ("65", "Limousin", "Betina", "42", "640"),
    ("66", "Jersey", "Betina", "32", "455"),
    ("67", "Madura", "Betina", "24", "315"),
    ("68", "Angus", "Jantan", "36", "790"),
    ("69", "PO (Ongole)", "Jantan", "48", "710"),
    ("70", "Brahman", "Betina", "18", "440"),
    ("71", "Holstein", "Betina", "30", "600"),
    ("72", "Sapi Bali", "Jantan", "28", "395"),
    ("73", "Simmental", "Jantan", "15", "480"),
    ("74", "Limousin", "Betina", "30", "595"),
    ("75", "Jersey", "Betina", "48", "480"),
    ("76", "Madura", "Jantan", "12", "270"),
    ("77", "Angus", "Betina", "12", "390"),
    ("78", "Brahman", "Jantan", "22", "550"),  # DITAMBAHKAN
    ("79", "PO (Ongole)", "Betina", "28", "420"),  # DITAMBAHKAN
    ("80", "Holstein", "Betina", "34", "610"),
    ("81", "Sapi Bali", "Betina", "15", "270"),
    ("82", "Simmental", "Jantan", "42", "890"),
    ("83", "Limousin", "Jantan", "30", "720"),
    ("84", "Jersey", "Betina", "20", "400"),
    ("85", "Madura", "Betina", "36", "340"),
    ("86", "Angus", "Jantan", "24", "650"),
    ("87", "PO (Ongole)", "Jantan", "30", "590"),
    ("88", "Brahman", "Betina", "42", "530"),
    ("89", "Holstein", "Betina", "26", "585"),
    ("90", "Sapi Bali", "Jantan", "36", "415"),
    ("91", "Simmental", "Betina", "36", "620"),
    ("92", "Limousin", "Betina", "18", "460"),
    ("93", "Jersey", "Betina", "24", "425"),
    ("94", "Madura", "Jantan", "48", "410"),
    ("95", "Angus", "Betina", "42", "610"),
    ("96", "PO (Ongole)", "Betina", "18", "380"),
    ("97", "Brahman", "Jantan", "12", "340"),
    ("98", "Holstein", "Betina", "48", "640"),
    ("99", "Sapi Bali", "Betina", "30", "335"),
    ("100", "Simmental", "Jantan", "20", "560"),
]

def generate_cage(index):
    """Generate cage name based on index"""
    row = chr(65 + (index // 5))  # A, B, C, ...
    col = (index % 5) + 1
    return f"{row}{col}"

def delete_all_cows():
    """Hapus semua data sapi lama"""
    ref = db.reference('cows')
    ref.delete()
    print("✓ Data sapi lama berhasil dihapus")

def upload_cows_to_firebase():
    """Upload 100 cow data to Firebase"""
    
    print("=" * 60)
    print("MooCare - Upload 100 Data Sapi (ID: 1-100)")
    print("=" * 60)
    
    # Hapus data lama dulu
    print("\n[1/2] Menghapus data lama...")
    delete_all_cows()
    
    print("\n[2/2] Upload data baru...")
    ref = db.reference('cows')
    
    success_count = 0
    fail_count = 0
    
    for index, (cow_id, breed, gender, age, weight) in enumerate(data_mapping):
        try:
            cow_data = {
                "id": cow_id,
                "breed": breed,
                "gender": gender,
                "age": age,
                "weight": weight,
                "cage": generate_cage(index)
            }
            
            # Push data dengan key otomatis dari Firebase
            new_ref = ref.push(cow_data)
            success_count += 1
            print(f"✓ ID {cow_id:>3} - {breed:<15} ({gender:>6}, {age:>2} bln, {weight:>3} kg) → {new_ref.key}")
        except Exception as e:
            fail_count += 1
            print(f"✗ ID {cow_id} - GAGAL: {e}")
    
    print("=" * 60)
    print(f"Upload Selesai!")
    print(f"Berhasil: {success_count} sapi")
    print(f"Gagal: {fail_count} sapi")
    print("=" * 60)

if __name__ == "__main__":
    upload_cows_to_firebase()
