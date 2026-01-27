"""
Script untuk upload 100 data sapi ke Firebase Realtime Database
"""

import firebase_admin
from firebase_admin import credentials, db
import os

# Path ke Firebase Admin SDK
SERVICE_ACCOUNT_KEY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'esp32-control', 'mastavia-pilmapres-firebase-adminsdk-fbsvc-ee6ea4e483.json')
DB_URL = 'https://mastavia-pilmapres-default-rtdb.asia-southeast1.firebasedatabase.app/'

# Initialize Firebase Admin
cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
firebase_admin.initialize_app(cred, {'databaseURL': DB_URL})

# Data 100 sapi (ID format angka 1-100)
cow_data = [
    {"id": "1", "breed": "Holstein", "gender": "Betina", "age": "24", "weight": "582", "cage": "A1"},
    {"id": "2", "breed": "Limousin", "gender": "Jantan", "age": "36", "weight": "810", "cage": "A2"},
    {"id": "3", "breed": "Sapi Bali", "gender": "Betina", "age": "18", "weight": "290", "cage": "A3"},
    {"id": "4", "breed": "Simmental", "gender": "Jantan", "age": "30", "weight": "745", "cage": "A4"},
    {"id": "5", "breed": "Jersey", "gender": "Betina", "age": "22", "weight": "415", "cage": "A5"},
    {"id": "6", "breed": "Angus", "gender": "Jantan", "age": "28", "weight": "690", "cage": "B1"},
    {"id": "7", "breed": "Holstein", "gender": "Betina", "age": "42", "weight": "610", "cage": "B2"},
    {"id": "8", "breed": "Brahman", "gender": "Jantan", "age": "48", "weight": "720", "cage": "B3"},
    {"id": "9", "breed": "Sapi Bali", "gender": "Jantan", "age": "24", "weight": "385", "cage": "B4"},
    {"id": "10", "breed": "Madura", "gender": "Betina", "age": "30", "weight": "310", "cage": "B5"},
    {"id": "S-011", "breed": "Limousin", "gender": "Jantan", "age": "20", "weight": "540", "cage": "C1"},
    {"id": "S-012", "breed": "Simmental", "gender": "Betina", "age": "15", "weight": "420", "cage": "C2"},
    {"id": "S-013", "breed": "Jersey", "gender": "Betina", "age": "36", "weight": "450", "cage": "C3"},
    {"id": "S-014", "breed": "Holstein", "gender": "Betina", "age": "28", "weight": "595", "cage": "C4"},
    {"id": "S-015", "breed": "PO (Ongole)", "gender": "Jantan", "age": "40", "weight": "615", "cage": "C5"},
    {"id": "S-016", "breed": "Angus", "gender": "Betina", "age": "24", "weight": "510", "cage": "D1"},
    {"id": "S-017", "breed": "Brahman", "gender": "Betina", "age": "32", "weight": "490", "cage": "D2"},
    {"id": "S-018", "breed": "Sapi Bali", "gender": "Jantan", "age": "12", "weight": "210", "cage": "D3"},
    {"id": "S-019", "breed": "Holstein", "gender": "Betina", "age": "50", "weight": "630", "cage": "D4"},
    {"id": "S-020", "breed": "Simmental", "gender": "Jantan", "age": "18", "weight": "515", "cage": "D5"},
    {"id": "S-021", "breed": "Limousin", "gender": "Betina", "age": "26", "weight": "580", "cage": "E1"},
    {"id": "S-022", "breed": "Jersey", "gender": "Betina", "age": "14", "weight": "320", "cage": "E2"},
    {"id": "S-023", "breed": "Madura", "gender": "Jantan", "age": "22", "weight": "345", "cage": "E3"},
    {"id": "S-024", "breed": "Brahman", "gender": "Jantan", "age": "36", "weight": "680", "cage": "E4"},
    {"id": "S-025", "breed": "Angus", "gender": "Jantan", "age": "42", "weight": "820", "cage": "E5"},
    {"id": "S-026", "breed": "Holstein", "gender": "Betina", "age": "30", "weight": "605", "cage": "F1"},
    {"id": "S-027", "breed": "PO (Ongole)", "gender": "Betina", "age": "24", "weight": "410", "cage": "F2"},
    {"id": "S-028", "breed": "Sapi Bali", "gender": "Betina", "age": "36", "weight": "320", "cage": "F3"},
    {"id": "S-029", "breed": "Simmental", "gender": "Jantan", "age": "48", "weight": "910", "cage": "F4"},
    {"id": "S-030", "breed": "Limousin", "gender": "Jantan", "age": "12", "weight": "390", "cage": "F5"},
    {"id": "S-031", "breed": "Jersey", "gender": "Betina", "age": "40", "weight": "470", "cage": "G1"},
    {"id": "S-032", "breed": "Holstein", "gender": "Betina", "age": "18", "weight": "490", "cage": "G2"},
    {"id": "S-033", "breed": "Brahman", "gender": "Betina", "age": "28", "weight": "510", "cage": "G3"},
    {"id": "S-034", "breed": "Angus", "gender": "Betina", "age": "30", "weight": "560", "cage": "G4"},
    {"id": "S-035", "breed": "Madura", "gender": "Jantan", "age": "18", "weight": "295", "cage": "G5"},
    {"id": "S-036", "breed": "Sapi Bali", "gender": "Jantan", "age": "42", "weight": "430", "cage": "H1"},
    {"id": "S-037", "breed": "Simmental", "gender": "Betina", "age": "22", "weight": "530", "cage": "H2"},
    {"id": "S-038", "breed": "Holstein", "gender": "Betina", "age": "36", "weight": "620", "cage": "H3"},
    {"id": "S-039", "breed": "PO (Ongole)", "gender": "Jantan", "age": "30", "weight": "580", "cage": "H4"},
    {"id": "S-040", "breed": "Limousin", "gender": "Betina", "age": "15", "weight": "410", "cage": "H5"},
    {"id": "S-041", "breed": "Jersey", "gender": "Betina", "age": "24", "weight": "430", "cage": "I1"},
    {"id": "S-042", "breed": "Angus", "gender": "Jantan", "age": "32", "weight": "750", "cage": "I2"},
    {"id": "S-043", "breed": "Brahman", "gender": "Jantan", "age": "20", "weight": "520", "cage": "I3"},
    {"id": "S-044", "breed": "Sapi Bali", "gender": "Betina", "age": "48", "weight": "350", "cage": "I4"},
    {"id": "S-045", "breed": "Holstein", "gender": "Betina", "age": "12", "weight": "380", "cage": "I5"},
    {"id": "S-046", "breed": "Simmental", "gender": "Jantan", "age": "36", "weight": "840", "cage": "J1"},
    {"id": "S-047", "breed": "Limousin", "gender": "Jantan", "age": "24", "weight": "670", "cage": "J2"},
    {"id": "S-048", "breed": "Madura", "gender": "Betina", "age": "42", "weight": "330", "cage": "J3"},
    {"id": "S-049", "breed": "Jersey", "gender": "Betina", "age": "30", "weight": "460", "cage": "J4"},
    {"id": "S-050", "breed": "PO (Ongole)", "gender": "Betina", "age": "36", "weight": "480", "cage": "J5"},
    {"id": "S-051", "breed": "Angus", "gender": "Jantan", "age": "18", "weight": "530", "cage": "K1"},
    {"id": "S-052", "breed": "Brahman", "gender": "Betina", "age": "24", "weight": "470", "cage": "K2"},
    {"id": "S-053", "breed": "Holstein", "gender": "Betina", "age": "40", "weight": "615", "cage": "K3"},
    {"id": "S-054", "breed": "Sapi Bali", "gender": "Jantan", "age": "30", "weight": "405", "cage": "K4"},
    {"id": "S-055", "breed": "Simmental", "gender": "Betina", "age": "28", "weight": "590", "cage": "K5"},
    {"id": "S-056", "breed": "Limousin", "gender": "Jantan", "age": "48", "weight": "950", "cage": "L1"},
    {"id": "S-057", "breed": "Jersey", "gender": "Betina", "age": "12", "weight": "305", "cage": "L2"},
    {"id": "S-058", "breed": "Madura", "gender": "Jantan", "age": "36", "weight": "390", "cage": "L3"},
    {"id": "S-059", "breed": "PO (Ongole)", "gender": "Jantan", "age": "12", "weight": "310", "cage": "L4"},
    {"id": "S-060", "breed": "Angus", "gender": "Betina", "age": "36", "weight": "580", "cage": "L5"},
    {"id": "S-061", "breed": "Brahman", "gender": "Jantan", "age": "50", "weight": "740", "cage": "M1"},
    {"id": "S-062", "breed": "Holstein", "gender": "Betina", "age": "22", "weight": "560", "cage": "M2"},
    {"id": "S-063", "breed": "Sapi Bali", "gender": "Betina", "age": "20", "weight": "285", "cage": "M3"},
    {"id": "S-064", "breed": "Simmental", "gender": "Jantan", "age": "24", "weight": "680", "cage": "M4"},
    {"id": "S-065", "breed": "Limousin", "gender": "Betina", "age": "42", "weight": "640", "cage": "M5"},
    {"id": "S-066", "breed": "Jersey", "gender": "Betina", "age": "32", "weight": "455", "cage": "N1"},
    {"id": "S-067", "breed": "Madura", "gender": "Betina", "age": "24", "weight": "315", "cage": "N2"},
    {"id": "S-068", "breed": "Angus", "gender": "Jantan", "age": "36", "weight": "790", "cage": "N3"},
    {"id": "S-069", "breed": "PO (Ongole)", "gender": "Jantan", "age": "48", "weight": "710", "cage": "N4"},
    {"id": "S-070", "breed": "Brahman", "gender": "Betina", "age": "18", "weight": "440", "cage": "N5"},
    {"id": "S-071", "breed": "Holstein", "gender": "Betina", "age": "30", "weight": "600", "cage": "O1"},
    {"id": "S-072", "breed": "Sapi Bali", "gender": "Jantan", "age": "28", "weight": "395", "cage": "O2"},
    {"id": "S-073", "breed": "Simmental", "gender": "Jantan", "age": "15", "weight": "480", "cage": "O3"},
    {"id": "S-074", "breed": "Limousin", "gender": "Betina", "age": "30", "weight": "595", "cage": "O4"},
    {"id": "S-075", "breed": "Jersey", "gender": "Betina", "age": "48", "weight": "480", "cage": "O5"},
    {"id": "S-076", "breed": "Madura", "gender": "Jantan", "age": "12", "weight": "270", "cage": "P1"},
    {"id": "S-077", "breed": "Angus", "gender": "Betina", "age": "12", "weight": "390", "cage": "P2"},
    {"id": "S-080", "breed": "Holstein", "gender": "Betina", "age": "34", "weight": "610", "cage": "P5"},
    {"id": "S-081", "breed": "Sapi Bali", "gender": "Betina", "age": "15", "weight": "270", "cage": "Q1"},
    {"id": "S-082", "breed": "Simmental", "gender": "Jantan", "age": "42", "weight": "890", "cage": "Q2"},
    {"id": "S-083", "breed": "Limousin", "gender": "Jantan", "age": "30", "weight": "720", "cage": "Q3"},
    {"id": "S-084", "breed": "Jersey", "gender": "Betina", "age": "20", "weight": "400", "cage": "Q4"},
    {"id": "S-085", "breed": "Madura", "gender": "Betina", "age": "36", "weight": "340", "cage": "Q5"},
    {"id": "S-086", "breed": "Angus", "gender": "Jantan", "age": "24", "weight": "650", "cage": "R1"},
    {"id": "S-087", "breed": "PO (Ongole)", "gender": "Jantan", "age": "30", "weight": "590", "cage": "R2"},
    {"id": "S-088", "breed": "Brahman", "gender": "Betina", "age": "42", "weight": "530", "cage": "R3"},
    {"id": "S-089", "breed": "Holstein", "gender": "Betina", "age": "26", "weight": "585", "cage": "R4"},
    {"id": "S-090", "breed": "Sapi Bali", "gender": "Jantan", "age": "36", "weight": "415", "cage": "R5"},
    {"id": "S-091", "breed": "Simmental", "gender": "Betina", "age": "36", "weight": "620", "cage": "S1"},
    {"id": "S-092", "breed": "Limousin", "gender": "Betina", "age": "18", "weight": "460", "cage": "S2"},
    {"id": "S-093", "breed": "Jersey", "gender": "Betina", "age": "24", "weight": "425", "cage": "S3"},
    {"id": "S-094", "breed": "Madura", "gender": "Jantan", "age": "48", "weight": "410", "cage": "S4"},
    {"id": "S-095", "breed": "Angus", "gender": "Betina", "age": "42", "weight": "610", "cage": "S5"},
    {"id": "S-096", "breed": "PO (Ongole)", "gender": "Betina", "age": "18", "weight": "380", "cage": "T1"},
    {"id": "S-097", "breed": "Brahman", "gender": "Jantan", "age": "12", "weight": "340", "cage": "T2"},
    {"id": "S-098", "breed": "Holstein", "gender": "Betina", "age": "48", "weight": "640", "cage": "T3"},
    {"id": "S-099", "breed": "Sapi Bali", "gender": "Betina", "age": "30", "weight": "335", "cage": "T4"},
    {"id": "S-100", "breed": "Simmental", "gender": "Jantan", "age": "20", "weight": "560", "cage": "T5"},
]

def upload_cows_to_firebase():
    """Upload 100 cow data to Firebase"""
    
    print("=" * 60)
    print("MooCare - Upload 100 Data Sapi ke Firebase")
    print("=" * 60)
    
    ref = db.reference('cows')
    
    success_count = 0
    fail_count = 0
    
    for cow in cow_data:
        try:
            # Push data dengan key otomatis dari Firebase
            new_ref = ref.push(cow)
            success_count += 1
            print(f"✓ {cow['id']} - {cow['breed']} ({cow['gender']}, {cow['age']} bulan) → {new_ref.key}")
        except Exception as e:
            fail_count += 1
            print(f"✗ {cow['id']} - GAGAL: {e}")
    
    print("=" * 60)
    print(f"Upload Selesai!")
    print(f"Berhasil: {success_count} sapi")
    print(f"Gagal: {fail_count} sapi")
    print("=" * 60)

if __name__ == "__main__":
    upload_cows_to_firebase()
