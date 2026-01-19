// Import fungsi yang dibutuhkan dari SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Untuk Realtime Database

// --- FIREBASE CONFIGURATION (From Environment Variables) ---
// Values are loaded from .env file using Vite's import.meta.env
// All Firebase client config vars must be prefixed with VITE_

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
if (!firebaseConfig.apiKey) {
  console.error('Firebase configuration missing! Check your .env file.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getDatabase(app);

// Export API URL for backend calls
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default app;
