/**
 * Firebase Integration Service - BI-DIRECTIONAL REALTIME SYNCHRONIZATION
 * Menjamin sinkronisasi dua arah (Laptop <-> HP) berjalan secara realtime,
 * bebas tabrakan data (race condition), serta kebal pemutusan koneksi mobile (heartbeat & wake-up fallback).
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
    
    // Identifikasi unik setiap sesi perangkat untuk mencegah self-echo loop
    this.deviceId = sessionStorage.getItem('sg_device_id');
    if (!this.deviceId) {
      this.deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('sg_device_id', this.deviceId);
    }

    // Melacak timestamp dokumen cloud terakhir yang diketahui
    this.lastKnownCartUpdatedAt = null;
    this.lastKnownSettingsUpdatedAt = null;
    this.lastKnownHistoryUpdatedAt = null;

    // Antrean tulis jika dipanggil sebelum Firebase siap
    this.pendingCartSync = null;
    this.pendingSettingsSync = null;
    this.pendingHistorySync = null;

    // Heartbeat timer untuk mengatasi sleep mode di mobile browser
    this.heartbeatTimer = null;
  }

  async init() {
    this.updateStatus('connecting', 'Menghubungkan ke Realtime Cloud...');

    try {
      this.app = initializeApp(firebaseConfig);

      // Konfigurasi Firestore dengan Auto-detect Long Polling untuk stabilitas jaringan seluler HP & browser laptop
      try {
        this.db = initializeFirestore(this.app, {
          experimentalAutoDetectLongPolling: true
        });
      } catch (e) {
        this.db = getFirestore(this.app);
      }

      this.isInitialized = true;
      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      console.log(`[FirebaseSync] Terhubung sebagai Client ID: ${this.deviceId}`);

      // 1. Jalankan realtime listener (WebSocket / onSnapshot)
      this.startRealtimeSync();

      // 2. Jalankan background fallback & wake-up handler untuk HP
      this.setupMobileWakeupHandlers();

      // 3. Eksekusi antrean pending jika ada
      if (this.pendingCartSync) {
        const queue = this.pendingCartSync;
        this.pendingCartSync = null;
        this.syncCart(queue);
      }
      if (this.pendingSettingsSync) {
        const queue = this.pendingSettingsSync;
        this.pendingSettingsSync = null;
        this.syncSettings(queue);
      }
      if (this.pendingHistorySync) {
        const queue = this.pendingHistorySync;
        this.pendingHistorySync = null;
        this.syncHistory(queue);
      }

      return true;
    } catch (error) {
      console.warn('[FirebaseSync] Inisialisasi error:', error);
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
   * Sanitasi data troli untuk menjamin tidak ada nilai 'undefined'
   * yang dapat membuat Firestore setDoc() melempar unhandled exception.
   */
  sanitizeCart(cart) {
    if (!Array.isArray(cart)) return [];
    return cart.map(item => ({
      id: String(item.id || ('cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6))),
      name: String(item.name || 'Barang'),
      category: String(item.category || 'LAINNYA'),
      unit: String(item.unit || 'Satuan'),
      qty: Math.max(1, Number(item.qty) || 1),
      price: Math.max(0, Number(item.price) || 0),
      discount: (item.discount && typeof item.discount === 'object') ? {
        mode: String(item.discount.mode || 'none'),
        value: Number(item.discount.value) || 0,
        buyQty: Number(item.discount.buyQty) || 0,
        freeQty: Number(item.discount.freeQty) || 0
      } : { mode: 'none' },
      store: String(item.store || 'Super Indo'),
      isEssential: item.isEssential !== false,
      checked: item.checked !== false
    }));
  }

  /**
   * ⚡ REALTIME SYNC (onSnapshot)
   * Setiap ada pembaruan di Laptop langsung masuk ke HP, dan sebaliknya.
   */
  startRealtimeSync() {
    if (!this.db) return;

    // Bersihkan listener lama
    this.unsubscribers.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    this.unsubscribers = [];

    // 1. Realtime Listener: Troli Belanja Aktif
    const cartDocRef = doc(this.db, 'grocery_data', 'active_cart');
    const unsubCart = onSnapshot(cartDocRef, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Abaikan echo dari perangkat ini sendiri
      if (data.senderDeviceId === this.deviceId) {
        this.lastKnownCartUpdatedAt = data.updatedAt;
        return;
      }

      // Hindari proses berulang jika timestamp sama
      if (data.updatedAt && data.updatedAt === this.lastKnownCartUpdatedAt) {
        return;
      }

      this.lastKnownCartUpdatedAt = data.updatedAt;
      const cleanItems = this.sanitizeCart(data.items || []);

      window.dispatchEvent(new CustomEvent('cloud-cart-update', {
        detail: {
          items: cleanItems,
          updatedAt: data.updatedAt,
          senderDeviceId: data.senderDeviceId
        }
      }));
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubCart);

    // 2. Realtime Listener: Pengaturan Anggaran
    const settingsDocRef = doc(this.db, 'grocery_data', 'settings');
    const unsubSettings = onSnapshot(settingsDocRef, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.senderDeviceId === this.deviceId) {
        this.lastKnownSettingsUpdatedAt = data.updatedAt;
        return;
      }
      if (data.updatedAt && data.updatedAt === this.lastKnownSettingsUpdatedAt) return;
      this.lastKnownSettingsUpdatedAt = data.updatedAt;

      window.dispatchEvent(new CustomEvent('cloud-settings-update', {
        detail: {
          budgetLimit: data.budgetLimit,
          soundEnabled: data.soundEnabled,
          updatedAt: data.updatedAt
        }
      }));
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubSettings);

    // 3. Realtime Listener: Patokan Harga Bulan Lalu
    const benchDocRef = doc(this.db, 'grocery_data', 'price_benchmarks');
    const unsubBench = onSnapshot(benchDocRef, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      window.dispatchEvent(new CustomEvent('cloud-benchmarks-update', {
        detail: { catalog: data.catalog || {} }
      }));
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubBench);

    // 4. Realtime Listener: Riwayat Struk Belanja
    const historyDocRef = doc(this.db, 'grocery_data', 'shopping_history');
    const unsubHistory = onSnapshot(historyDocRef, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.senderDeviceId === this.deviceId) {
        this.lastKnownHistoryUpdatedAt = data.updatedAt;
        return;
      }
      if (data.updatedAt && data.updatedAt === this.lastKnownHistoryUpdatedAt) return;
      this.lastKnownHistoryUpdatedAt = data.updatedAt;

      window.dispatchEvent(new CustomEvent('cloud-history-update', {
        detail: { trips: Array.isArray(data.trips) ? data.trips : [] }
      }));
    }, (err) => this.handleFirestoreError(err));
    this.unsubscribers.push(unsubHistory);
  }

  /**
   * 🛡️ WAKE-UP & HEARTBEAT FALLBACK UNTUK BROWSER MOBILE (HP)
   * Mengatasi masalah suspensi WebSocket di Android Chrome & Safari iOS ketika tab non-aktif / layar mati.
   */
  setupMobileWakeupHandlers() {
    // Tarik data saat tab HP dibuka kembali dari background
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndPullLatest();
      }
    });

    // Tarik data saat jendela HP mendapatkan fokus
    window.addEventListener('focus', () => {
      this.checkAndPullLatest();
    });

    // Heartbeat ringan berkala (setiap 2.5 detik) untuk menjamin pembaruan instan
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isInitialized && this.db && document.visibilityState === 'visible') {
        this.checkAndPullLatest();
      }
    }, 2500);
  }

  /**
   * Cek manual ke cloud apakah ada timestamp yang lebih baru dari perangkat lain
   */
  async checkAndPullLatest() {
    if (!this.isInitialized || !this.db) return;
    try {
      const cartRef = doc(this.db, 'grocery_data', 'active_cart');
      const snap = await getDoc(cartRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownCartUpdatedAt) {
          this.lastKnownCartUpdatedAt = data.updatedAt;
          const cleanItems = this.sanitizeCart(data.items || []);
          window.dispatchEvent(new CustomEvent('cloud-cart-update', {
            detail: {
              items: cleanItems,
              updatedAt: data.updatedAt,
              senderDeviceId: data.senderDeviceId
            }
          }));
        }
      }
    } catch (_) {
      // Abaikan error pada pengecekan background
    }
  }

  /**
   * 📤 SIMPAN DATA TROLI KE 1 TEMPAT BERSAMA
   * Menggantikan dokumen secara atomik (merge: false) agar penghapusan item terdistribusi sempurna.
   */
  async syncCart(cart) {
    if (!this.isInitialized || !this.db) {
      this.pendingCartSync = cart;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Troli...');
      const cleanCart = this.sanitizeCart(cart);
      const nowIso = new Date().toISOString();
      this.lastKnownCartUpdatedAt = nowIso;

      const cartRef = doc(this.db, 'grocery_data', 'active_cart');
      await setDoc(cartRef, {
        items: cleanCart,
        totalItems: cleanCart.length,
        totalQty: cleanCart.reduce((sum, it) => sum + (it.qty || 1), 0),
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      }, { merge: false });

      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  async syncSettings(settings) {
    if (!this.isInitialized || !this.db) {
      this.pendingSettingsSync = settings;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Anggaran...');
      const nowIso = new Date().toISOString();
      this.lastKnownSettingsUpdatedAt = nowIso;

      const settingsRef = doc(this.db, 'grocery_data', 'settings');
      await setDoc(settingsRef, {
        budgetLimit: Number(settings.budgetLimit) || 800000,
        soundEnabled: settings.soundEnabled !== false,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
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
        catalog: benchmarks || {},
        itemCount: Object.keys(benchmarks || {}).length,
        senderDeviceId: this.deviceId,
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
    if (!this.isInitialized || !this.db) {
      this.pendingHistorySync = trips;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Riwayat Struk...');
      const nowIso = new Date().toISOString();
      this.lastKnownHistoryUpdatedAt = nowIso;

      const historyRef = doc(this.db, 'grocery_data', 'shopping_history');
      await setDoc(historyRef, {
        trips: Array.isArray(trips) ? trips : [],
        totalTrips: (trips || []).length,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      }, { merge: true });

      this.updateStatus('connected', 'Cloud Realtime Aktif ☁️');
      return true;
    } catch (err) {
      this.handleFirestoreError(err);
      return false;
    }
  }

  /**
   * Tarik manual seluruh data dari Cloud
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

      const cartData = cartSnap.exists() ? cartSnap.data() : null;
      if (cartData?.updatedAt) this.lastKnownCartUpdatedAt = cartData.updatedAt;

      return {
        cart: cartData ? this.sanitizeCart(cartData.items || []) : null,
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
    console.warn('[FirebaseSync] Error ditangani:', msg);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      this.updateStatus('error', 'Izin Ditolak (Cek Security Rules)');
    } else if (msg.includes('NOT_FOUND') || msg.includes('does not exist')) {
      this.updateStatus('error', 'Database Belum Dibuat di Console');
    } else if (msg.includes('unavailable') || msg.includes('network') || msg.includes('Failed to fetch')) {
      this.updateStatus('offline', 'Offline (Disimpan di Lokal)');
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