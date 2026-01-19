import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.utils.class_weight import compute_class_weight
import numpy as np
import os
import matplotlib.pyplot as plt

# --- KONFIGURASI ---
BATCH_SIZE = 32
IMG_SIZE = (224, 224) # MobileNetV2 membutuhkan input 224x224
EPOCHS = 30 # Tambah epoch agar belajar lebih lama pada data minoritas
LEARNING_RATE = 0.0001
DATA_DIR = r'Data kaggle mastitis/Data'

# Pastikan path dataset benar
if not os.path.exists(DATA_DIR):
    print(f"Error: Folder dataset tidak ditemukan di {DATA_DIR}")
    exit()

print("Menyiapkan dataset...")

# --- DATA AUGMENTATION & LOADING ---
# PENTING: Gunakan preprocess_input bawaan MobileNetV2 (bukan rescale=1./255)
# MobileNetV2 mengharapkan input -1 s/d 1.
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input, # Ganti rescale dengan ini
    rotation_range=30,          
    width_shift_range=0.2,      
    height_shift_range=0.2,     
    shear_range=0.2,            
    zoom_range=0.3,             
    horizontal_flip=True,       
    vertical_flip=True,         # Tambah flip vertikal
    fill_mode='nearest',        
    validation_split=0.2        
)

# Load Data Training (80%)
train_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',        
    subset='training',
    shuffle=True
)

# Load Data Validasi (20%)
validation_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='validation'
)

# --- MENANGANI CLASS IMBALANCE ---
# Karena Mastitis (170) >> Normal (10), model akan cenderung bias ke Mastitis.
# Kita hitung class weights untuk memberi bobot lebih besar pada data 'Normal' (minoritas).

classes = train_generator.classes
unique_classes = np.unique(classes)
class_weights_arr = compute_class_weight(
    class_weight='balanced',
    classes=unique_classes,
    y=classes
)
class_weights = dict(enumerate(class_weights_arr))

print("Kelas mapping:", train_generator.class_indices)
print(f"Distribusi data latih: {len(classes)} images")
print(f"Class Weights yang akan digunakan: {class_weights}")
# Mastitis (0) akan punya weight kecil (~0.5), Normal (1) akan punya weight besar (~9.0)

# --- MEMBANGUN MODEL (MobileNetV2) ---
# Kita gunakan Transfer Learning dengan MobileNetV2 karena ringan (Compact)
# dan kompatibel untuk deployment (misal ke ESP32 nantinya).
base_model = MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights='imagenet')

# Unfreeze beberapa layer terakhir agar model bisa "beradaptasi" lebih baik
base_model.trainable = True
# Bekukan layer awal (fitur dasar), latih layer akhir (fitur spesifik)
for layer in base_model.layers[:-20]:
    layer.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.4),  # Perbesar Dropout agar tidak overfitting pada data normal yang sedikit
    layers.Dense(1, activation='sigmoid') 
])

model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
              loss='binary_crossentropy',
              metrics=['accuracy'])

model.summary()

# --- TRAINING ---
print("\nMulai Training...")
history = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    epochs=EPOCHS,
    validation_data=validation_generator,
    validation_steps=validation_generator.samples // BATCH_SIZE,
    class_weight=class_weights # Gunakan bobot kelas untuk menangani ketidakseimbangan!
)

# --- PLOT HASIL TRAINING ---
acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
loss = history.history['loss']
val_loss = history.history['val_loss']

plt.figure(figsize=(8, 8))
plt.subplot(2, 1, 1)
plt.plot(acc, label='Training Accuracy')
plt.plot(val_acc, label='Validation Accuracy')
plt.legend(loc='lower right')
plt.ylabel('Accuracy')
plt.title('Training and Validation Accuracy')

plt.subplot(2, 1, 2)
plt.plot(loss, label='Training Loss')
plt.plot(val_loss, label='Validation Loss')
plt.legend(loc='upper right')
plt.ylabel('Cross Entropy')
plt.title('Training and Validation Loss')
plt.xlabel('epoch')
plt.savefig('training_result.png')
print("Grafik hasil training disimpan sebagai 'training_result.png'")

# --- SIMPAN MODEL ---
model_save_path = 'model_mastitis_mobilenetv2.h5'
model.save(model_save_path)
print(f"Model disimpan di {model_save_path}")

# Konversi ke TFLite (Optional, bagus untuk ESP32/Mobile)
# converter = tf.lite.TFLiteConverter.from_keras_model(model)
# tflite_model = converter.convert()
# with open('model_mastitis.tflite', 'wb') as f:
#   f.write(tflite_model)
# print("Model TFLite disimpan (opsional)")
