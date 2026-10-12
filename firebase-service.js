/**
 * Firebase Integration Service - SINGLE SHARED REALTIME DATABASE
 * Semua perangkat (HP, laptop, tablet) terhubung ke 1 tempat & 1 data yang sama secara realtime.
 * Tidak ada pemisahan ID User.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Konfigurasi Firebase Proyek
const firebaseConfig = {
  apiKey: "AIzaSyC82Gdng1O2o1IluxYMekduvX1PnoTI1PE",
  authDomain: "smartgrocery-1f9cb.firebaseapp.com",
  projectId: "smartgrocery-1f9cb",
  storageBucket: "smartgrocery-1f9cb.firebasestorage.app",
  messagingSenderId: "522355385292",
  appId: "1:522355385292:web:6bec97bc5e8caf1c18b369"
};

class FirebaseSharedService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.syncStatus = 'connecting'; // 'connected' | 'syncing' | 'offline' | 'error'
    this.unsubscribers = [];
    this.isSyncingLocally = false;
  }

  async init() {
    this.updateStatus('connecting', 'Menghubungkan ke Realtime Cloud...');

    try {
      this.app = initializeApp(firebaseConfig);

      // Auto-detect long polling agar stabil di mobile browser & GitHub Pages
      try {
        this.db = initializeFirestore(this.app, {
          experimentalAutoDetectLongPolling: true
        });
      } catch (e) {
        this.db = getFirestore(this.app);
      }

      this.isInitialized = true;
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      console.log('Firebase Shared Realtime Database Initialized (1 Tempat 1 Data).');

      // Aktifkan Realtime Listeners ke 1 Data Bersama
      this.startRealtimeSync();
      return true;
    } catch (error) {
      console.warn('Firebase init error:', error);
      this.handleFirestoreError(error);
      return false;
    }
  }

  updateStatus(status, message) {
    this.syncStatus = status;
    window.dispatchEvent(new CustomEvent('firebase-status-change', {
      detail: { status, message }
    }));
  }

  /**
   * ⚡ REALTIME SYNC (onSnapshot)
   * Setiap ada perubahan di perangkat A, perangkat B langsung otomatis terupdate seketika!
   */
  startRealtimeSync() {
    if (!this.db) return;

    // Bersihkan listener lama jika ada
    this.unsubscribers.forEach(unsub => unsub && unsub());
    this.unsubscribers = [];

    // 1. Realtime Listener: Troli Belanja Aktif (Shared Cart)
    const cartDocRef = doc(this.db, 'grocery_data', 'active_cart');
    const unsubCart = onSnapshot(cartDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        window.dispatchEvent(new CustomEvent('cloud-cart-update', {
          detail: { items: data.items || [], updatedAt: data.updatedAt }
        }));
      }
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubCart);

    // 2. Realtime Listener: Pengaturan Anggaran (Shared Settings)
    const settingsDocRef = doc(this.db, 'grocery_data', 'settings');
    const unsubSettings = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        window.dispatchEvent(new CustomEvent('cloud-settings-update', {
          detail: { budgetLimit: data.budgetLimit, soundEnabled: data.soundEnabled }
        }));
      }
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubSettings);

    // 3. Realtime Listener: Patokan Harga Bulan Lalu (Shared Benchmarks)
    const benchDocRef = doc(this.db, 'grocery_data', 'price_benchmarks');
    const unsubBench = onSnapshot(benchDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        window.dispatchEvent(new CustomEvent('cloud-benchmarks-update', {
          detail: { catalog: data.catalog || {} }
        }));
      }
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubBench);

    // 4. Realtime Listener: Riwayat Struk Belanja (Shared History)
    const historyDocRef = doc(this.db, 'grocery_data', 'shopping_history');
    const unsubHistory = onSnapshot(historyDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        window.dispatchEvent(new CustomEvent('cloud-history-update', {
          detail: { trips: data.trips || [] }
        }));
      }
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubHistory);
  }

  /**
   * 📤 SIMPAN DATA KE 1 TEMPAT BERSAMA
   */
  async syncCart(cart) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyinkronkan Troli...');
      const cartRef = doc(this.db, 'grocery_data', 'active_cart');
      await setDoc(cartRef, {
        items: cart,
        totalItems: cart.length,
        totalQty: cart.reduce((sum, it) => sum + (it.qty || 1), 0),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  async syncSettings(settings) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyinkronkan Anggaran...');
      const settingsRef = doc(this.db, 'grocery_data', 'settings');
      await setDoc(settingsRef, {
        budgetLimit: settings.budgetLimit || 800000,
        soundEnabled: settings.soundEnabled !== false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  async syncBenchmarks(benchmarks) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyinkronkan Patokan Harga...');
      const benchRef = doc(this.db, 'grocery_data', 'price_benchmarks');
      await setDoc(benchRef, {
        catalog: benchmarks,
        itemCount: Object.keys(benchmarks).length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  async syncHistory(trips) {
    if (!this.isInitialized || !this.db) return false;
    try {
      this.updateStatus('syncing', 'Menyinkronkan Riwayat Struk...');
      const historyRef = doc(this.db, 'grocery_data', 'shopping_history');
      await setDoc(historyRef, {
        trips: trips,
        totalTrips: trips.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * Tarik manual semua data jika dibutuhkan
   */
  async pullAllSharedData() {
    if (!this.isInitialized || !this.db) return null;
    try {
      this.updateStatus('syncing', 'Mengambil data cloud...');

      const [cartSnap, settingsSnap, benchSnap, historySnap] = await Promise.all([
        getDoc(doc(this.db, 'grocery_data', 'active_cart')),
        getDoc(doc(this.db, 'grocery_data', 'settings')),
        getDoc(doc(this.db, 'grocery_data', 'price_benchmarks')),
        getDoc(doc(this.db, 'grocery_data', 'shopping_history'))
      ]);

      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');

      return {
        cart: cartSnap.exists() ? cartSnap.data().items : null,
        settings: settingsSnap.exists() ? settingsSnap.data() : null,
        benchmarks: benchSnap.exists() ? benchSnap.data().catalog : null,
        history: historySnap.exists() ? historySnap.data().trips : null
      };
    } catch (err) {
      this.handleFirestoreError(err);
      return null;
    }
  }

  handleFirestoreError(err) {
    const msg = err?.message || String(err);
    console.warn('Firestore error handled:', msg);
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

// Inisialisasi Singleton
const firebaseSync = new FirebaseSharedService();
window.FirebaseSync = firebaseSync;

// Otomatis aktifkan saat modul dimuat
firebaseSync.init();

export default firebaseSync;
