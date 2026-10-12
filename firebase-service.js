/**
 * Firebase Integration Service for Smart Grocery & Budget Safety Tracker
 * Menggunakan Firebase Web SDK v10 (Modular ES Module)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  enableNetwork,
  disableNetwork
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Konfigurasi Firebase dari Pengguna
const firebaseConfig = {
  apiKey: "AIzaSyC82Gdng1O2o1IluxYMekduvX1PnoTI1PE",
  authDomain: "smartgrocery-1f9cb.firebaseapp.com",
  projectId: "smartgrocery-1f9cb",
  storageBucket: "smartgrocery-1f9cb.firebasestorage.app",
  messagingSenderId: "522355385292",
  appId: "1:522355385292:web:6bec97bc5e8caf1c18b369"
};

class FirebaseSyncService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.syncStatus = 'connecting'; // 'connected' | 'offline' | 'error' | 'syncing'
    this.userId = this.getOrCreateUserId();
    this.onStatusChangeCallback = null;
  }

  getOrCreateUserId() {
    let uid = localStorage.getItem('sg_firebase_user_id');
    if (!uid) {
      uid = 'test_student_anak_rantau';
      localStorage.setItem('sg_firebase_user_id', uid);
    }
    return uid;
  }

  setUserId(newUid) {
    if (!newUid || !newUid.trim()) return;
    this.userId = newUid.trim();
    localStorage.setItem('sg_firebase_user_id', this.userId);
  }

  async init(onStatusChange) {
    this.onStatusChangeCallback = onStatusChange;
    this.updateStatus('connecting', 'Menghubungkan ke Firebase...');

    try {
      this.app = initializeApp(firebaseConfig);
      
      // Mengaktifkan auto-detect long polling agar stabil di GitHub Pages & jaringan sekolah/kampus
      try {
        this.db = initializeFirestore(this.app, {
          experimentalAutoDetectLongPolling: true
        });
      } catch (e) {
        this.db = getFirestore(this.app);
      }

      this.isInitialized = true;
      this.updateStatus('connected', 'Firebase Terhubung ☁️');
      console.log('Firebase initialized successfully for user:', this.userId);

      // Verifikasi koneksi awal ke Firestore
      this.testConnection();
      return true;
    } catch (error) {
      console.warn('Firebase initialization error:', error);
      this.handleFirestoreError(error);
      return false;
    }
  }

  async testConnection() {
    try {
      const pingRef = doc(this.db, 'users', this.userId, 'settings', 'config');
      await getDoc(pingRef);
      this.updateStatus('connected', 'Firebase Terhubung ☁️');
    } catch (err) {
      console.warn('Firebase connection test warning:', err);
      this.handleFirestoreError(err);
    }
  }

  updateStatus(status, message) {
    this.syncStatus = status;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status, message);
    }
    window.dispatchEvent(new CustomEvent('firebase-status-change', {
      detail: { status, message, userId: this.userId }
    }));
  }

  /**
   * 1. Sinkronisasi Keranjang Belanja Aktif (Cart)
   */
  async syncCart(cart) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyimpan Troli...');
      const cartRef = doc(this.db, 'users', this.userId, 'active_cart', 'current');
      await setDoc(cartRef, {
        items: cart,
        totalItems: cart.length,
        totalQty: cart.reduce((sum, it) => sum + (it.qty || 1), 0),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Tersinkron ☁️');
      return true;
    } catch (err) {
      console.warn('Gagal sinkronisasi cart ke Firebase:', err);
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * 2. Sinkronisasi Limit Anggaran & Preferensi (Settings)
   */
  async syncSettings(settings) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyimpan Anggaran...');
      const settingsRef = doc(this.db, 'users', this.userId, 'settings', 'config');
      await setDoc(settingsRef, {
        budgetLimit: settings.budgetLimit || 800000,
        soundEnabled: settings.soundEnabled !== false,
        activeCategoryFilter: settings.activeCategoryFilter || 'ALL',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Tersinkron ☁️');
      return true;
    } catch (err) {
      console.warn('Gagal sinkronisasi settings ke Firebase:', err);
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * 3. Sinkronisasi Database Harga Pembanding Bulan Lalu (Benchmarks)
   */
  async syncBenchmarks(benchmarks) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyimpan Patokan Harga...');
      const benchRef = doc(this.db, 'users', this.userId, 'price_benchmarks', 'catalog');
      await setDoc(benchRef, {
        catalog: benchmarks,
        itemCount: Object.keys(benchmarks).length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Tersinkron ☁️');
      return true;
    } catch (err) {
      console.warn('Gagal sinkronisasi benchmarks ke Firebase:', err);
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * 4. Simpan Riwayat Belanja ke Koleksi Cloud (Shopping History)
   */
  async saveHistoryTrip(trip) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyimpan Struk ke Cloud...');
      const tripRef = doc(this.db, 'users', this.userId, 'shopping_history', trip.id);
      await setDoc(tripRef, {
        ...trip,
        syncedAt: new Date().toISOString()
      });
      this.updateStatus('connected', 'Struk Tersimpan ☁️');
      return true;
    } catch (err) {
      console.warn('Gagal menyimpan trip history ke Firebase:', err);
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * Tarik Data dari Cloud saat pertama kali buka aplikasi di perangkat baru
   */
  async pullDataFromCloud() {
    if (!this.isInitialized || !this.db) return null;
    try {
      this.updateStatus('syncing', 'Mengambil data cloud...');

      // 1. Ambil Settings
      const settingsRef = doc(this.db, 'users', this.userId, 'settings', 'config');
      const settingsSnap = await getDoc(settingsRef);
      const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;

      // 2. Ambil Active Cart
      const cartRef = doc(this.db, 'users', this.userId, 'active_cart', 'current');
      const cartSnap = await getDoc(cartRef);
      const cartData = cartSnap.exists() ? cartSnap.data() : null;

      // 3. Ambil Benchmarks
      const benchRef = doc(this.db, 'users', this.userId, 'price_benchmarks', 'catalog');
      const benchSnap = await getDoc(benchRef);
      const benchData = benchSnap.exists() ? benchSnap.data() : null;

      // 4. Ambil History
      const historyCol = collection(this.db, 'users', this.userId, 'shopping_history');
      const historySnap = await getDocs(historyCol);
      const historyList = [];
      historySnap.forEach(docSnap => {
        historyList.push(docSnap.data());
      });
      // Sort descending by timestamp
      historyList.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      this.updateStatus('connected', 'Data Cloud Dimuat ☁️');

      return {
        settings: settingsData,
        cart: cartData?.items || null,
        benchmarks: benchData?.catalog || null,
        history: historyList.length > 0 ? historyList : null
      };
    } catch (err) {
      console.warn('Gagal mengambil data dari Firebase:', err);
      this.handleFirestoreError(err);
      return null;
    }
  }

  handleFirestoreError(err) {
    const msg = err?.message || String(err);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      this.updateStatus('error', 'Izin Ditolak (Cek Security Rules)');
    } else if (msg.includes('NOT_FOUND') || msg.includes('does not exist')) {
      this.updateStatus('error', 'Database Belum Dibuat di Console');
    } else if (msg.includes('unavailable') || msg.includes('network') || msg.includes('Failed to fetch')) {
      this.updateStatus('offline', 'Offline (Disimpan di HP)');
    } else {
      this.updateStatus('error', 'Gagal Sync Cloud');
    }
  }
}

// Inisialisasi Singleton & ekspos ke global window
const firebaseSync = new FirebaseSyncService();
window.FirebaseSync = firebaseSync;

// Auto-init saat module siap
firebaseSync.init();

export default firebaseSync;
