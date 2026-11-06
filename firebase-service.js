/**
 * =============================================================================
 * FIREBASE INTEGRATION SERVICE - PRODUCTION GRADE MODULAR SDK (v10.12.0)
 * =============================================================================
 * Fitur Utama:
 * 1. Environment Variable & Runtime Config Detection (Vite, Next.js, CRA, Window, Fallback)
 * 2. Singleton Initialization Pattern (Kebal crash HMR / duplicate app instance)
 * 3. Modular SDK Pure Architecture (Tree-shakeable, bebas sintaks v8 namespace)
 * 4. Anonymous Auth Gatekeeper (Memenuhi Security Rules tanpa login paksa)
 * 5. Deep Payload Sanitization (Mencegah runtime exception "Unsupported field value: undefined")
 * 6. Structured Error Diagnostics & Security Rules Logging
 * 7. Long Polling Auto-detection & Mobile Wake-up Resilience (Anti-stuck UI)
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// -----------------------------------------------------------------------------
// 1. CONFIG RESOLUTION & RUNTIME VALIDATION
// -----------------------------------------------------------------------------
function resolveFirebaseConfig() {
  const runtimeEnv = (typeof window !== 'undefined' && window.__ENV__) || {};
  const procEnv = (typeof process !== 'undefined' && process.env) || {};
  let viteEnv = {};
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      viteEnv = import.meta.env;
    }
  } catch (_) {}

  return {
    apiKey: viteEnv.VITE_FIREBASE_API_KEY || procEnv.NEXT_PUBLIC_FIREBASE_API_KEY || procEnv.REACT_APP_FIREBASE_API_KEY || runtimeEnv.FIREBASE_API_KEY || "AIzaSyC82Gdng1O2o1IluxYMekduvX1PnoTI1PE",
    authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || procEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || procEnv.REACT_APP_FIREBASE_AUTH_DOMAIN || runtimeEnv.FIREBASE_AUTH_DOMAIN || "smartgrocery-1f9cb.firebaseapp.com",
    projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || procEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || procEnv.REACT_APP_FIREBASE_PROJECT_ID || runtimeEnv.FIREBASE_PROJECT_ID || "smartgrocery-1f9cb",
    storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || procEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || procEnv.REACT_APP_FIREBASE_STORAGE_BUCKET || runtimeEnv.FIREBASE_STORAGE_BUCKET || "smartgrocery-1f9cb.firebasestorage.app",
    messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || procEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || procEnv.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || runtimeEnv.FIREBASE_MESSAGING_SENDER_ID || "522355385292",
    appId: viteEnv.VITE_FIREBASE_APP_ID || procEnv.NEXT_PUBLIC_FIREBASE_APP_ID || procEnv.REACT_APP_FIREBASE_APP_ID || runtimeEnv.FIREBASE_APP_ID || "1:522355385292:web:6bec97bc5e8caf1c18b369"
  };
}

function validateConfig(config) {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter(k => !config[k] || typeof config[k] !== 'string' || !config[k].trim());
  if (missing.length > 0) {
    console.warn(`[FirebaseConfig] ⚠️ PERINGATAN: Konfigurasi Firebase tidak lengkap! Key yang kosong: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// 2. RECURSIVE DATA SANITIZATION (PREVENT "UNDEFINED" VALUE CRASHES)
// -----------------------------------------------------------------------------
function deepSanitize(val) {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    return val.map(item => deepSanitize(item));
  }
  if (typeof val === 'object') {
    const res = {};
    for (const key of Object.keys(val)) {
      const cleaned = deepSanitize(val[key]);
      res[key] = cleaned === undefined ? null : cleaned;
    }
    return res;
  }
  return null;
}

// -----------------------------------------------------------------------------
// 3. FIREBASE SINGLETON SERVICE CLASS
// -----------------------------------------------------------------------------
class FirebaseSharedService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.isAuthReady = Promise.resolve(null);
    this.syncStatus = 'connecting'; // 'connected' | 'syncing' | 'offline' | 'error'
    this.unsubscribers = [];
    
    // Identifikasi unik setiap sesi perangkat untuk mencegah self-echo loop
    this.deviceId = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sg_device_id')) || '';
    if (!this.deviceId) {
      this.deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('sg_device_id', this.deviceId);
        }
      } catch (_) {}
    }

    // Melacak timestamp dokumen cloud terakhir yang diketahui
    this.lastKnownCartUpdatedAt = null;
    this.lastKnownSessionUpdatedAt = null;
    this.lastKnownPriceHistoryUpdatedAt = null;
    this.lastKnownSettingsUpdatedAt = null;
    this.lastKnownHistoryUpdatedAt = null;
    this.lastKnownPantryUpdatedAt = null;
    this.lastKnownQuickSelectUpdatedAt = null;

    // Antrean tulis jika dipanggil sebelum Firebase siap
    this.pendingCartSync = null;
    this.pendingSessionSync = null;
    this.pendingPriceHistorySync = null;
    this.pendingSettingsSync = null;
    this.pendingHistorySync = null;
    this.pendingPantrySync = null;
    this.pendingQuickSelectSync = null;

    // Heartbeat timer untuk mengatasi sleep mode di mobile browser
    this.heartbeatTimer = null;
  }

  /**
   * Inisialisasi Singleton dengan Validasi & Fallback Stabilitas
   */
  async init() {
    if (this.isInitialized && this.db) {
      return true;
    }

    this.updateStatus('connecting', 'Menghubungkan ke Realtime Database...');
    const config = resolveFirebaseConfig();

    if (!validateConfig(config)) {
      this.updateStatus('error', 'Konfigurasi Firebase Tidak Lengkap');
      return false;
    }

    try {
      // 1. Singleton App Initialization (Mencegah duplicate app crash)
      const existingApps = getApps();
      this.app = existingApps.length > 0 ? getApp() : initializeApp(config);

      // 2. Singleton Firestore Initialization dengan Auto-detect Long Polling
      try {
        this.db = initializeFirestore(this.app, {
          experimentalAutoDetectLongPolling: true
        });
      } catch (_) {
        this.db = getFirestore(this.app);
      }

      // 3. Singleton Auth & Gatekeeper Resolving
      try {
        this.auth = getAuth(this.app);
        this.isAuthReady = new Promise((resolve) => {
          onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            if (user) {
              console.log(`[FirebaseSync] Terautentikasi (UID: ${user.uid})`);
              resolve(user);
            } else {
              signInAnonymously(this.auth)
                .then(cred => {
                  this.currentUser = cred.user;
                  console.log(`[FirebaseSync] Berhasil masuk sebagai Anonim (UID: ${cred.user.uid})`);
                  resolve(cred.user);
                })
                .catch(authErr => {
                  console.warn('[FirebaseSync] Mode Anonim tidak aktif di console (berjalan dalam mode publik/tamu):', authErr.message);
                  resolve(null);
                });
            }
          });
        });
      } catch (authInitErr) {
        console.warn('[FirebaseSync] Auth initialization fallback:', authInitErr.message);
        this.isAuthReady = Promise.resolve(null);
      }

      // Tunggu hingga status auth awal teratasi
      await this.isAuthReady;

      this.isInitialized = true;
      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      console.log(`[FirebaseSync] Terhubung sebagai Client ID: ${this.deviceId}`);

      // Dispatch event bahwa Firebase siap digunakan oleh modul lain
      window.dispatchEvent(new CustomEvent('firebase-ready', {
        detail: { deviceId: this.deviceId, user: this.currentUser }
      }));

      // 4. Jalankan realtime listener (WebSocket / onSnapshot)
      this.startRealtimeSync();

      // 5. Jalankan background fallback & wake-up handler untuk HP
      this.setupMobileWakeupHandlers();

      // 6. Eksekusi antrean pending jika ada
      this.flushPendingSyncs();

      return true;
    } catch (error) {
      console.warn('[FirebaseSync] Inisialisasi error:', error);
      this.handleFirestoreError(error, 'init', 'system');
      return false;
    }
  }

  flushPendingSyncs() {
    if (this.pendingCartSync) {
      const q = this.pendingCartSync;
      this.pendingCartSync = null;
      this.syncCart(q);
    }
    if (this.pendingSessionSync) {
      const q = this.pendingSessionSync;
      this.pendingSessionSync = null;
      this.syncSessionState(q);
    }
    if (this.pendingPriceHistorySync) {
      const q = this.pendingPriceHistorySync;
      this.pendingPriceHistorySync = null;
      this.syncPriceHistory(q);
    }
    if (this.pendingSettingsSync) {
      const q = this.pendingSettingsSync;
      this.pendingSettingsSync = null;
      this.syncSettings(q);
    }
    if (this.pendingHistorySync) {
      const q = this.pendingHistorySync;
      this.pendingHistorySync = null;
      this.syncHistory(q);
    }
    if (this.pendingPantrySync) {
      const q = this.pendingPantrySync;
      this.pendingPantrySync = null;
      this.syncPantry(q);
    }
    if (this.pendingQuickSelectSync) {
      const q = this.pendingQuickSelectSync;
      this.pendingQuickSelectSync = null;
      this.syncQuickSelect(q);
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
      id: String(item?.id || ('cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6))),
      name: String(item?.name || 'Barang'),
      category: String(item?.category || 'LAINNYA'),
      unit: String(item?.unit || 'Satuan'),
      qty: Math.max(1, Number(item?.qty) || 1),
      price: Math.max(0, Number(item?.price) || 0),
      discount: (item?.discount && typeof item.discount === 'object') ? {
        mode: String(item.discount.mode || 'none'),
        value: Number(item.discount.value) || 0,
        buyQty: Number(item.discount.buyQty) || 0,
        freeQty: Number(item.discount.freeQty) || 0
      } : { mode: 'none' },
      store: String(item?.store || 'Super Indo'),
      isEssential: item?.isEssential !== false,
      checked: true
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
    try {
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
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/active_cart'));
      this.unsubscribers.push(unsubCart);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/active_cart');
    }

    // 2. Realtime Listener: Lokasi Toko & Konteks Sesi Belanja (Session State)
    try {
      const sessionDocRef = doc(this.db, 'grocery_data', 'session_state');
      const unsubSession = onSnapshot(sessionDocRef, { includeMetadataChanges: false }, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.senderDeviceId === this.deviceId) {
          this.lastKnownSessionUpdatedAt = data.updatedAt;
          return;
        }
        if (data.updatedAt && data.updatedAt === this.lastKnownSessionUpdatedAt) return;
        this.lastKnownSessionUpdatedAt = data.updatedAt;

        window.dispatchEvent(new CustomEvent('cloud-session-update', {
          detail: {
            selectedStore: data.selectedStore,
            selectedDate: data.selectedDate,
            userCoords: data.userCoords,
            liveNearbyStores: data.liveNearbyStores,
            activeCategoryFilter: data.activeCategoryFilter,
            updatedAt: data.updatedAt
          }
        }));
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/session_state'));
      this.unsubscribers.push(unsubSession);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/session_state');
    }

    // 3. Realtime Listener: Database Riwayat Fluktuasi Harga Toko (Price History)
    try {
      const priceDocRef = doc(this.db, 'grocery_data', 'price_history');
      const unsubPrice = onSnapshot(priceDocRef, { includeMetadataChanges: false }, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.senderDeviceId === this.deviceId) {
          this.lastKnownPriceHistoryUpdatedAt = data.updatedAt;
          return;
        }
        if (data.updatedAt && data.updatedAt === this.lastKnownPriceHistoryUpdatedAt) return;
        this.lastKnownPriceHistoryUpdatedAt = data.updatedAt;

        window.dispatchEvent(new CustomEvent('cloud-price-history-update', {
          detail: {
            history: data.history || {},
            updatedAt: data.updatedAt
          }
        }));
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/price_history'));
      this.unsubscribers.push(unsubPrice);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/price_history');
    }

    // 4. Realtime Listener: Pengaturan Anggaran & Emergency Freeze
    try {
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
            isFrozen: data.isFrozen,
            appliedVoucher: data.appliedVoucher,
            soundEnabled: data.soundEnabled,
            colorTheme: data.colorTheme,
            lightMode: data.lightMode,
            isBentoFluid: data.isBentoFluid,
            updatedAt: data.updatedAt
          }
        }));
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/settings'));
      this.unsubscribers.push(unsubSettings);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/settings');
    }

    // 5. Realtime Listener: Riwayat Struk Belanja & Transaksi Selesai
    try {
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
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/shopping_history'));
      this.unsubscribers.push(unsubHistory);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/shopping_history');
    }

    // 6. Realtime Listener: Stok Pantry Rumah Tangga
    try {
      const pantryDocRef = doc(this.db, 'grocery_data', 'pantry_items');
      const unsubPantry = onSnapshot(pantryDocRef, { includeMetadataChanges: false }, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.senderDeviceId === this.deviceId) {
          this.lastKnownPantryUpdatedAt = data.updatedAt;
          return;
        }
        if (data.updatedAt && data.updatedAt === this.lastKnownPantryUpdatedAt) return;
        this.lastKnownPantryUpdatedAt = data.updatedAt;

        window.dispatchEvent(new CustomEvent('cloud-pantry-update', {
          detail: { items: Array.isArray(data.items) ? data.items : [] }
        }));
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/pantry_items'));
      this.unsubscribers.push(unsubPantry);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/pantry_items');
    }

    // 7. Realtime Listener: Quick-Select Items & Custom Catalog
    try {
      const quickDocRef = doc(this.db, 'grocery_data', 'quick_select');
      const unsubQuick = onSnapshot(quickDocRef, { includeMetadataChanges: false }, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.senderDeviceId === this.deviceId) {
          this.lastKnownQuickSelectUpdatedAt = data.updatedAt;
          return;
        }
        if (data.updatedAt && data.updatedAt === this.lastKnownQuickSelectUpdatedAt) return;
        this.lastKnownQuickSelectUpdatedAt = data.updatedAt;

        window.dispatchEvent(new CustomEvent('cloud-quick-select-update', {
          detail: { customItems: Array.isArray(data.customItems) ? data.customItems : [] }
        }));
      }, (err) => this.handleFirestoreError(err, 'onSnapshot', 'grocery_data/quick_select'));
      this.unsubscribers.push(unsubQuick);
    } catch (e) {
      this.handleFirestoreError(e, 'setupListener', 'grocery_data/quick_select');
    }
  }

  /**
   * 🛡️ WAKE-UP & HEARTBEAT FALLBACK UNTUK BROWSER MOBILE (HP)
   */
  setupMobileWakeupHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndPullLatest();
      }
    });

    window.addEventListener('focus', () => {
      this.checkAndPullLatest();
    });

    window.addEventListener('online', () => {
      console.log('[FirebaseSync] Jaringan online kembali. Menghubungkan ulang...');
      this.updateStatus('connecting', 'Menyambungkan kembali...');
      this.checkAndPullLatest();
      this.flushPendingSyncs();
    });

    window.addEventListener('offline', () => {
      this.updateStatus('offline', 'Offline (Disimpan di Lokal)');
    });

    // Heartbeat berkala (setiap 3 detik) untuk menjamin pembaruan cepat
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isInitialized && this.db && document.visibilityState === 'visible') {
        this.checkAndPullLatest();
      }
    }, 3000);
  }

  /**
   * Cek manual ke cloud apakah ada timestamp yang lebih baru dari perangkat lain
   */
  async checkAndPullLatest() {
    if (!this.isInitialized || !this.db) return;
    try {
      const [cartSnap, sessionSnap, priceSnap, settingsSnap, historySnap, pantrySnap, quickSnap] = await Promise.all([
        getDoc(doc(this.db, 'grocery_data', 'active_cart')),
        getDoc(doc(this.db, 'grocery_data', 'session_state')),
        getDoc(doc(this.db, 'grocery_data', 'price_history')),
        getDoc(doc(this.db, 'grocery_data', 'settings')),
        getDoc(doc(this.db, 'grocery_data', 'shopping_history')),
        getDoc(doc(this.db, 'grocery_data', 'pantry_items')),
        getDoc(doc(this.db, 'grocery_data', 'quick_select'))
      ]);

      if (cartSnap.exists()) {
        const data = cartSnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownCartUpdatedAt) {
          this.lastKnownCartUpdatedAt = data.updatedAt;
          const cleanItems = this.sanitizeCart(data.items || []);
          window.dispatchEvent(new CustomEvent('cloud-cart-update', {
            detail: { items: cleanItems, updatedAt: data.updatedAt }
          }));
        }
      }

      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownSessionUpdatedAt) {
          this.lastKnownSessionUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-session-update', {
            detail: {
              selectedStore: data.selectedStore,
              selectedDate: data.selectedDate,
              userCoords: data.userCoords,
              liveNearbyStores: data.liveNearbyStores,
              activeCategoryFilter: data.activeCategoryFilter,
              updatedAt: data.updatedAt
            }
          }));
        }
      }

      if (priceSnap.exists()) {
        const data = priceSnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownPriceHistoryUpdatedAt) {
          this.lastKnownPriceHistoryUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-price-history-update', {
            detail: { history: data.history || {}, updatedAt: data.updatedAt }
          }));
        }
      }

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownSettingsUpdatedAt) {
          this.lastKnownSettingsUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-settings-update', {
            detail: {
              budgetLimit: data.budgetLimit,
              isFrozen: data.isFrozen,
              appliedVoucher: data.appliedVoucher,
              soundEnabled: data.soundEnabled,
              colorTheme: data.colorTheme,
              lightMode: data.lightMode,
              isBentoFluid: data.isBentoFluid,
              updatedAt: data.updatedAt
            }
          }));
        }
      }

      if (historySnap.exists()) {
        const data = historySnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownHistoryUpdatedAt) {
          this.lastKnownHistoryUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-history-update', {
            detail: { trips: Array.isArray(data.trips) ? data.trips : [] }
          }));
        }
      }

      if (pantrySnap.exists()) {
        const data = pantrySnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownPantryUpdatedAt) {
          this.lastKnownPantryUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-pantry-update', {
            detail: { items: Array.isArray(data.items) ? data.items : [] }
          }));
        }
      }

      if (quickSnap.exists()) {
        const data = quickSnap.data();
        if (data.senderDeviceId !== this.deviceId && data.updatedAt && data.updatedAt !== this.lastKnownQuickSelectUpdatedAt) {
          this.lastKnownQuickSelectUpdatedAt = data.updatedAt;
          window.dispatchEvent(new CustomEvent('cloud-quick-select-update', {
            detail: { customItems: Array.isArray(data.customItems) ? data.customItems : [] }
          }));
        }
      }
    } catch (err) {
      if (err?.code === 'permission-denied') {
        this.handleFirestoreError(err, 'checkAndPullLatest', 'grocery_data/*');
      }
    }
  }

  /**
   * 📤 SIMPAN DATA TROLI KE CLOUD
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

      const payload = deepSanitize({
        items: cleanCart,
        totalItems: cleanCart.length,
        totalQty: cleanCart.reduce((sum, it) => sum + (it.qty || 1), 0),
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const cartRef = doc(this.db, 'grocery_data', 'active_cart');
      await setDoc(cartRef, payload, { merge: false });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/active_cart');
      return false;
    }
  }

  /**
   * 📤 SIMPAN KONTEKS SESI TOKO & LOKASI
   */
  async syncSessionState(session) {
    if (!this.isInitialized || !this.db) {
      this.pendingSessionSync = session;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Sesi Toko...');
      const nowIso = new Date().toISOString();
      this.lastKnownSessionUpdatedAt = nowIso;

      const payload = deepSanitize({
        selectedStore: String(session?.selectedStore || ''),
        selectedDate: String(session?.selectedDate || ''),
        userCoords: session?.userCoords || null,
        liveNearbyStores: Array.isArray(session?.liveNearbyStores) ? session.liveNearbyStores : [],
        activeCategoryFilter: String(session?.activeCategoryFilter || 'ALL'),
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const sessionRef = doc(this.db, 'grocery_data', 'session_state');
      await setDoc(sessionRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/session_state');
      return false;
    }
  }

  /**
   * 📤 SIMPAN RIWAYAT FLUKTUASI HARGA
   */
  async syncPriceHistory(priceHistory) {
    if (!this.isInitialized || !this.db) {
      this.pendingPriceHistorySync = priceHistory;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Riwayat Harga...');
      const nowIso = new Date().toISOString();
      this.lastKnownPriceHistoryUpdatedAt = nowIso;

      const payload = deepSanitize({
        history: (priceHistory && typeof priceHistory === 'object') ? priceHistory : {},
        itemCount: Object.keys(priceHistory || {}).length,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const priceRef = doc(this.db, 'grocery_data', 'price_history');
      await setDoc(priceRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/price_history');
      return false;
    }
  }

  /**
   * 📤 SIMPAN PENGATURAN ANGGARAN & FITUR
   */
  async syncSettings(settings) {
    if (!this.isInitialized || !this.db) {
      this.pendingSettingsSync = settings;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Anggaran...');
      const nowIso = new Date().toISOString();
      this.lastKnownSettingsUpdatedAt = nowIso;

      const payload = deepSanitize({
        budgetLimit: Number(settings?.budgetLimit) || 800000,
        isFrozen: Boolean(settings?.isFrozen),
        appliedVoucher: settings?.appliedVoucher || null,
        soundEnabled: settings?.soundEnabled !== false,
        colorTheme: String(settings?.colorTheme || 'emerald'),
        lightMode: String(settings?.lightMode || 'dark'),
        isBentoFluid: Boolean(settings?.isBentoFluid),
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const settingsRef = doc(this.db, 'grocery_data', 'settings');
      await setDoc(settingsRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/settings');
      return false;
    }
  }

  /**
   * 📤 SIMPAN RIWAYAT STRUK BELANJA
   */
  async syncShoppingHistory(trips) {
    if (!this.isInitialized || !this.db) {
      this.pendingHistorySync = trips;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Riwayat Struk...');
      const nowIso = new Date().toISOString();
      this.lastKnownHistoryUpdatedAt = nowIso;

      const payload = deepSanitize({
        trips: Array.isArray(trips) ? trips : [],
        totalTrips: (trips || []).length,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const historyRef = doc(this.db, 'grocery_data', 'shopping_history');
      await setDoc(historyRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/shopping_history');
      return false;
    }
  }

  /**
   * 📤 SIMPAN INVENTARIS PANTRY
   */
  async syncPantry(pantryItems) {
    if (!this.isInitialized || !this.db) {
      this.pendingPantrySync = pantryItems;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Pantry...');
      const nowIso = new Date().toISOString();
      this.lastKnownPantryUpdatedAt = nowIso;

      const payload = deepSanitize({
        items: Array.isArray(pantryItems) ? pantryItems : [],
        totalItems: (pantryItems || []).length,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const pantryRef = doc(this.db, 'grocery_data', 'pantry_items');
      await setDoc(pantryRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/pantry_items');
      return false;
    }
  }

  /**
   * 📤 SIMPAN QUICK-SELECT & TEMPLATE KATALOG
   */
  async syncQuickSelect(customItems) {
    if (!this.isInitialized || !this.db) {
      this.pendingQuickSelectSync = customItems;
      return true;
    }

    try {
      this.updateStatus('syncing', 'Menyinkronkan Pilihan Cepat...');
      const nowIso = new Date().toISOString();
      this.lastKnownQuickSelectUpdatedAt = nowIso;

      const payload = deepSanitize({
        customItems: Array.isArray(customItems) ? customItems : [],
        totalItems: (customItems || []).length,
        senderDeviceId: this.deviceId,
        updatedAt: nowIso
      });

      const quickRef = doc(this.db, 'grocery_data', 'quick_select');
      await setDoc(quickRef, payload, { merge: true });

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');
      return true;
    } catch (err) {
      this.handleFirestoreError(err, 'setDoc', 'grocery_data/quick_select');
      return false;
    }
  }

  // Alias kompatibilitas
  async syncBenchmarks(benchmarks) {
    return this.syncPriceHistory(benchmarks);
  }

  async syncHistory(trips) {
    return this.syncShoppingHistory(trips);
  }

  /**
   * Tarik seluruh data dari Cloud (Hydration)
   */
  async pullAllSharedData() {
    if (!this.isInitialized || !this.db) return null;
    try {
      this.updateStatus('syncing', 'Mengambil data cloud...');

      const [cartSnap, sessionSnap, priceSnap, settingsSnap, historySnap, pantrySnap, quickSnap] = await Promise.all([
        getDoc(doc(this.db, 'grocery_data', 'active_cart')),
        getDoc(doc(this.db, 'grocery_data', 'session_state')),
        getDoc(doc(this.db, 'grocery_data', 'price_history')),
        getDoc(doc(this.db, 'grocery_data', 'settings')),
        getDoc(doc(this.db, 'grocery_data', 'shopping_history')),
        getDoc(doc(this.db, 'grocery_data', 'pantry_items')),
        getDoc(doc(this.db, 'grocery_data', 'quick_select'))
      ]);

      this.updateStatus('connected', 'Sinkronisasi Realtime Aktif');

      const cartData = cartSnap.exists() ? cartSnap.data() : null;
      if (cartData?.updatedAt) this.lastKnownCartUpdatedAt = cartData.updatedAt;

      const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;
      if (sessionData?.updatedAt) this.lastKnownSessionUpdatedAt = sessionData.updatedAt;

      const priceData = priceSnap.exists() ? priceSnap.data() : null;
      if (priceData?.updatedAt) this.lastKnownPriceHistoryUpdatedAt = priceData.updatedAt;

      const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
      if (settingsData?.updatedAt) this.lastKnownSettingsUpdatedAt = settingsData.updatedAt;

      const historyData = historySnap.exists() ? historySnap.data() : null;
      if (historyData?.updatedAt) this.lastKnownHistoryUpdatedAt = historyData.updatedAt;

      const pantryData = pantrySnap.exists() ? pantrySnap.data() : null;
      if (pantryData?.updatedAt) this.lastKnownPantryUpdatedAt = pantryData.updatedAt;

      const quickData = quickSnap.exists() ? quickSnap.data() : null;
      if (quickData?.updatedAt) this.lastKnownQuickSelectUpdatedAt = quickData.updatedAt;

      return {
        cart: cartData ? this.sanitizeCart(cartData.items || []) : null,
        session: sessionData,
        priceHistory: priceData?.history || null,
        settings: settingsData,
        history: historyData?.trips || null,
        pantry: pantryData?.items || null,
        quickSelect: quickData?.customItems || null
      };
    } catch (err) {
      this.handleFirestoreError(err, 'pullAllSharedData', 'grocery_data/*');
      return null;
    }
  }

  /**
   * 🛡️ DIAGNOSTIC LOGGER & SECURITY RULES ADVISOR
   */
  handleFirestoreError(err, operation = 'unknown', targetDoc = '') {
    const code = err?.code || 'unknown';
    const msg = err?.message || String(err);
    const authStatus = this.currentUser ? `Authenticated (UID: ${this.currentUser.uid})` : 'Unauthenticated (Guest)';

    console.group(`[Firebase Diagnostic] ⚠️ Masalah pada operasi '${operation}'`);
    console.warn(`Target Document : ${targetDoc || 'N/A'}`);
    console.warn(`Error Code      : ${code}`);
    console.warn(`Error Message   : ${msg}`);
    console.warn(`Auth State      : ${authStatus}`);

    if (code === 'permission-denied' || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      console.error(
        `[Firebase Security Rules Alert]\n` +
        `Operasi ke '${targetDoc}' ditolak oleh Security Rules!\n` +
        `• Status Autentikasi Pengguna: ${authStatus}\n` +
        `• Catatan: Jika masa berlaku 30 hari test mode Firestore telah habis (misal: if request.time < timestamp.date(...)),\n` +
        `  buka Firebase Console > Firestore Database > Rules, dan perbarui aturannya.`
      );
      this.updateStatus('error', 'Izin Ditolak (Periksa Security Rules)');
    } else if (code === 'unavailable' || msg.includes('network') || msg.includes('Failed to fetch')) {
      console.warn('[Firebase Offline] Koneksi jaringan terputus atau diblokir. Menyimpan perubahan secara offline.');
      this.updateStatus('offline', 'Offline (Disimpan di Lokal)');
    } else if (code === 'not-found') {
      this.updateStatus('error', 'Dokumen Belum Dibuat');
    } else {
      this.updateStatus('error', 'Gagal Sinkronisasi');
    }
    console.groupEnd();

    window.dispatchEvent(new CustomEvent('firebase-diagnostic', {
      detail: { operation, targetDoc, code, message: msg, authStatus }
    }));
  }

  /**
   * Cleanup method untuk unmount / refresh
   */
  destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.unsubscribers.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    this.unsubscribers = [];
    this.isInitialized = false;
  }
}

// -----------------------------------------------------------------------------
// 4. SINGLETON INSTANCE EXPORT & AUTO-BOOT
// -----------------------------------------------------------------------------
const firebaseSync = new FirebaseSharedService();
if (typeof window !== 'undefined') {
  window.FirebaseSync = firebaseSync;
}

// Otomatis jalankan inisialisasi
firebaseSync.init();

export default firebaseSync;
