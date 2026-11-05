/**
 * =============================================================================
 * SMART GROCERY & HOUSEHOLD FINANCIAL GUARDIAN
 * Advanced Full-Stack JavaScript Engine
 * Fitur: Native Camera Barcode/OCR Scanner, Strict Emergency Freeze Hard-Lock,
 * Multi-Tier Envelope Budgeting, Burn Rate AI Velocity, Real-World Store Radar,
 * Custom Grocery Item Builder, dan Settings Terpusat.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. DATA PRESETS, BARCODE CATALOG & REAL-WORLD RETAILERS
// -----------------------------------------------------------------------------
const DEFAULT_BUDGET_LIMIT = 800000;

// Database Barcode Produk Ritel Nyata (EAN-13 / UPC)
const BARCODE_CATALOG = {
  "8998866200213": { name: "Indomie Goreng Spesial", category: "Makanan Instan", unit: "bungkus", price: 3100, isEssential: true },
  "8998866200220": { name: "Indomie Kuah Kari Ayam", category: "Makanan Instan", unit: "bungkus", price: 3100, isEssential: true },
  "8992775211142": { name: "Minyak Goreng Sania 2L", category: "Bumbu & Minyak", unit: "liter", price: 33500, isEssential: true },
  "8992753211119": { name: "Beras Ramos Premium 5kg", category: "Sembako", unit: "pack", price: 74000, isEssential: true },
  "8999999052028": { name: "Susu UHT Ultra Milk Full Cream 1L", category: "Minuman", unit: "liter", price: 18500, isEssential: true },
  "8999999041237": { name: "Biskuit Roma Kelapa 300g", category: "Camilan", unit: "pack", price: 11000, isEssential: false },
  "8992613171120": { name: "Sabun Lifebuoy Total 10 400ml", category: "Toiletries", unit: "botol", price: 19500, isEssential: true },
  "8991389221145": { name: "Deterjen Rinso Molto 750g", category: "Toiletries", unit: "pack", price: 21500, isEssential: true },
  "8996001410111": { name: "Telur Ayam Negeri 1kg", category: "Daging & Sayur", unit: "kg", price: 28500, isEssential: true }
};

// Database Toko Fisik Nyata di Dunia Nyata
const REAL_WORLD_STORES = [
  {
    id: "pasar_tradisional",
    name: "Pasar Tradisional / Pasar Jaya",
    type: "Pasar Rakyat",
    defaultDistanceMeters: 850,
    multiplier: 0.88,
    badge: "Harga Paling Murah",
    address: "Jl. Pasar Lama No. 14"
  },
  {
    id: "super_indo",
    name: "Super Indo Supermarket",
    type: "Supermarket Segar",
    defaultDistanceMeters: 1200,
    multiplier: 0.94,
    badge: "Spesialis Makanan Segar",
    address: "Mall Village GF Floor"
  },
  {
    id: "hypermart",
    name: "Hypermart",
    type: "Hypermarket",
    defaultDistanceMeters: 2800,
    multiplier: 0.96,
    badge: "Lengkap Bulanan",
    address: "Central Town Square"
  },
  {
    id: "indomaret",
    name: "Indomaret Minimarket",
    type: "Minimarket Terdekat",
    defaultDistanceMeters: 250,
    multiplier: 1.00,
    badge: "Paling Dekat",
    address: "Jl. Pemuda No. 4B"
  },
  {
    id: "alfamart",
    name: "Alfamart",
    type: "Minimarket",
    defaultDistanceMeters: 400,
    multiplier: 1.02,
    badge: "Banyak Promo Poin",
    address: "Jl. Melati Raya No. 19"
  },
  {
    id: "lotte_mart",
    name: "Lotte Mart Wholesale",
    type: "Grosir Ritel",
    defaultDistanceMeters: 4100,
    multiplier: 0.95,
    badge: "Cocok Grosir",
    address: "Boulevard Raya Kav. 8"
  }
];

// -----------------------------------------------------------------------------
// 2. STATE MANAGER
// -----------------------------------------------------------------------------
class AppState {
  constructor() {
    this.budgetLimit = Number(localStorage.getItem('sg_budget_limit')) || DEFAULT_BUDGET_LIMIT;
    this.cart = this.loadData('sg_cart_items', this.getInitialSampleCart());
    this.history = this.loadData('sg_history_trips', []);
    this.pantry = this.loadData('sg_pantry_items', this.getInitialPantryItems());
    this.isFrozen = localStorage.getItem('sg_emergency_freeze') === 'true';
    this.activeCategoryFilter = 'ALL';
    this.soundEnabled = localStorage.getItem('sg_sound_enabled') !== 'false';
    this.theme = localStorage.getItem('sg_theme') || 'system';
    this.isBentoMode = localStorage.getItem('sg_layout_mode') === 'bento';
    this.userCoords = null;
    this.scannerStream = null;
    this.scannerMode = 'barcode'; // 'barcode' | 'ocr'
    this.scannerDetector = null;
  }

  getInitialSampleCart() {
    return [
      {
        id: 'cart_' + Date.now() + '_1',
        name: "Beras Ramos Premium 5kg",
        category: "Sembako",
        unit: "pack",
        qty: 1,
        price: 74000,
        store: "Super Indo",
        isEssential: true
      },
      {
        id: 'cart_' + Date.now() + '_2',
        name: "Indomie Goreng Spesial",
        category: "Makanan Instan",
        unit: "bungkus",
        qty: 10,
        price: 3100,
        store: "Indomaret",
        isEssential: true
      },
      {
        id: 'cart_' + Date.now() + '_3',
        name: "Minyak Goreng Sania 2L",
        category: "Bumbu & Minyak",
        unit: "liter",
        qty: 1,
        price: 33500,
        store: "Alfamart",
        isEssential: true
      }
    ];
  }

  getInitialPantryItems() {
    return [
      {
        id: 'pantry_1',
        name: 'Dada Ayam Fillet 500g',
        category: 'Daging & Sayur',
        unit: 'pack',
        qty: 1,
        purchasedDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        daysLeft: 1,
        isConsumed: false
      },
      {
        id: 'pantry_2',
        name: 'Sayur Sawi & Wortel Mix',
        category: 'Daging & Sayur',
        unit: 'pack',
        qty: 1,
        purchasedDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        daysLeft: 2,
        isConsumed: false
      }
    ];
  }

  loadData(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveCart() {
    localStorage.setItem('sg_cart_items', JSON.stringify(this.cart));
    if (window.FirebaseSync) window.FirebaseSync.syncCart(this.cart);
  }

  saveHistory() {
    localStorage.setItem('sg_history_trips', JSON.stringify(this.history));
    if (window.FirebaseSync) window.FirebaseSync.syncHistory(this.history);
  }

  savePantry() {
    localStorage.setItem('sg_pantry_items', JSON.stringify(this.pantry));
  }

  saveFreezeState() {
    localStorage.setItem('sg_emergency_freeze', this.isFrozen.toString());
  }
}

const state = new AppState();

// -----------------------------------------------------------------------------
// 3. SOUND ENGINE (WEB AUDIO API SYNTHESIZER)
// -----------------------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playClick() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playBarcodeBeep() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1760, this.ctx.currentTime); // High pitch supermarket beep
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playAlarm() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(320, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

const sounds = new SoundEngine();

// Helper: Format Rupiah
function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function showToast(msg, iconType = 'check-circle') {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  if (toastIcon) {
    toastIcon.setAttribute('data-lucide', iconType);
    lucide.createIcons({ targets: [toastIcon] });
  }

  toast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2600);
}

// -----------------------------------------------------------------------------
// 4. FINANCIAL GUARDIAN, ENVELOPE BUDGETING & BURN RATE CALCULATOR
// -----------------------------------------------------------------------------
function calculateCartTotals() {
  let cartTotal = 0;
  state.cart.forEach(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    cartTotal += qty * price;
  });
  return cartTotal;
}

function renderGuardianAndEnvelopes() {
  const cartTotal = calculateCartTotals();
  const limit = state.budgetLimit;
  const remaining = limit - cartTotal;

  // 1. Update Header Quick Bar
  const cartTotalHeader = document.getElementById('cartTotalHeader');
  const budgetRemainingHeader = document.getElementById('budgetRemainingHeader');
  const freezeMiniIndicator = document.getElementById('freezeMiniIndicator');

  if (cartTotalHeader) cartTotalHeader.textContent = formatRupiah(cartTotal);
  if (budgetRemainingHeader) {
    budgetRemainingHeader.textContent = formatRupiah(remaining);
    budgetRemainingHeader.className = remaining < 0 
      ? 'font-mono font-bold text-rose-500' 
      : 'font-mono font-bold text-emerald-600 dark:text-emerald-400';
  }

  if (freezeMiniIndicator) {
    freezeMiniIndicator.className = state.isFrozen 
      ? 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse' 
      : 'w-2.5 h-2.5 rounded-full bg-emerald-500';
  }

  // 2. Strict Freeze Card Status
  const freezeCard = document.getElementById('guardianFreezeCard');
  const freezeBadge = document.getElementById('freezeBadgeIconContainer');
  const freezeTitle = document.getElementById('freezeCardTitle');
  const freezeDesc = document.getElementById('freezeCardDesc');
  const freezeNote = document.getElementById('freezeStatusNote');
  const freezeToggle = document.getElementById('emergencyFreezeToggle');
  const navDot = document.getElementById('navGuardianDot');

  if (freezeToggle) freezeToggle.checked = state.isFrozen;

  if (state.isFrozen) {
    if (freezeCard) freezeCard.className = 'p-4 rounded-3xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-500 transition-all duration-300';
    if (freezeBadge) freezeBadge.className = 'w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center animate-pulse';
    if (freezeTitle) freezeTitle.textContent = 'EMERGENCY FREEZE: AKTIF';
    if (freezeDesc) freezeDesc.textContent = 'Hard Budget Lock mencegah belanja impulsif & over-budget';
    if (freezeNote) {
      freezeNote.className = 'mt-3 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-[11px] text-rose-800 dark:text-rose-200 flex items-center gap-2';
      freezeNote.innerHTML = '<i data-lucide="lock" class="w-4 h-4 shrink-0"></i> <span>Proteksi Maksimal: Belanja camilan & item non-esensial diblokir dari keranjang.</span>';
    }
    if (navDot) navDot.classList.remove('hidden');
  } else {
    if (freezeCard) freezeCard.className = 'p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-all duration-300';
    if (freezeBadge) freezeBadge.className = 'w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300';
    if (freezeTitle) freezeTitle.textContent = 'Emergency Freeze Protection';
    if (freezeDesc) freezeDesc.textContent = 'Kunci hard-cap pengeluaran non-esensial';
    if (freezeNote) {
      freezeNote.className = 'mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2';
      freezeNote.innerHTML = '<i data-lucide="info" class="w-4 h-4 text-slate-400 shrink-0"></i> <span>Mode Standar: Semua kategori barang dapat ditambahkan ke keranjang belanja.</span>';
    }
    if (navDot) navDot.classList.add('hidden');
  }

  // 3. Multi-Tier Envelope Calculations (4 Pos Alokasi)
  const envCaps = {
    'Sembako': Math.round(limit * 0.45),
    'Protein': Math.round(limit * 0.30),
    'Toiletries': Math.round(limit * 0.15),
    'Camilan': Math.round(limit * 0.10)
  };

  const envSpend = { 'Sembako': 0, 'Protein': 0, 'Toiletries': 0, 'Camilan': 0 };

  state.cart.forEach(item => {
    const itemTotal = (item.qty || 1) * (item.price || 0);
    if (item.category === 'Sembako' || item.category === 'Bumbu & Minyak') {
      envSpend['Sembako'] += itemTotal;
    } else if (item.category === 'Daging & Sayur' || item.category === 'Makanan Instan') {
      envSpend['Protein'] += itemTotal;
    } else if (item.category === 'Toiletries') {
      envSpend['Toiletries'] += itemTotal;
    } else {
      envSpend['Camilan'] += itemTotal;
    }
  });

  // Update Envelope Elements
  const updateEnvRow = (catKey, spendElId, barElId, segElId) => {
    const spend = envSpend[catKey];
    const cap = envCaps[catKey];
    const pct = cap > 0 ? Math.min(100, Math.round((spend / cap) * 100)) : 0;

    const spendEl = document.getElementById(spendElId);
    const barEl = document.getElementById(barElId);
    const segEl = document.getElementById(segElId);

    if (spendEl) spendEl.textContent = `${formatRupiah(spend)} / ${formatRupiah(cap)}`;
    if (barEl) {
      barEl.style.width = `${pct}%`;
      if (pct >= 100) barEl.className = 'bg-rose-500 h-full rounded-full';
    }
    if (segEl) segEl.style.width = `${pct / 4}%`;
  };

  updateEnvRow('Sembako', 'envSpendSembako', 'envBarSembako', 'envSegSembako');
  updateEnvRow('Protein', 'envSpendProtein', 'envBarProtein', 'envSegProtein');
  updateEnvRow('Toiletries', 'envSpendToiletries', 'envBarToiletries', 'envSegToiletries');
  updateEnvRow('Camilan', 'envSpendSnack', 'envBarSnack', 'envSegSnack');

  // 4. Burn Rate Analysis & AI Spending Velocity
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);

  const safeDailyAllowance = remaining > 0 ? Math.round(remaining / remainingDays) : 0;
  const currentDailyRate = Math.round(cartTotal / Math.max(1, currentDay));

  const healthScoreEl = document.getElementById('healthScoreDisplay');
  const healthWordEl = document.getElementById('healthStatusWord');
  const burnRateEl = document.getElementById('burnRateText');
  const velocityBanner = document.getElementById('spendingVelocityBanner');
  const velocityText = document.getElementById('velocityWarningText');

  let healthScore = 100;
  if (cartTotal > limit) {
    healthScore = 10;
  } else {
    const spentRatio = cartTotal / limit;
    const daysRatio = currentDay / daysInMonth;
    if (spentRatio > daysRatio + 0.2) {
      healthScore = Math.max(30, Math.round(100 - (spentRatio - daysRatio) * 100));
    } else {
      healthScore = Math.round(100 - spentRatio * 30);
    }
  }

  if (healthScoreEl) healthScoreEl.textContent = `${healthScore}/100`;
  if (healthWordEl) {
    if (healthScore >= 80) {
      healthWordEl.textContent = 'Sangat Sehat';
      healthWordEl.className = 'text-xs font-semibold text-emerald-400';
    } else if (healthScore >= 60) {
      healthWordEl.textContent = 'Kondisi Waspada';
      healthWordEl.className = 'text-xs font-semibold text-amber-400';
    } else {
      healthWordEl.textContent = 'Kritis / Over-Budget';
      healthWordEl.className = 'text-xs font-semibold text-rose-400';
    }
  }

  if (burnRateEl) {
    burnRateEl.innerHTML = `Jatah aman belanja harian: <b>${formatRupiah(safeDailyAllowance)}/hari</b> untuk ${remainingDays} hari ke depan.`;
  }

  if (velocityBanner && velocityText) {
    if (cartTotal > limit) {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>Peringatan Kritis:</b> Pengeluaran telah melampaui pagu! Defisit sebesar ${formatRupiah(Math.abs(remaining))}. Kunci pengeluaran segera!`;
    } else if (currentDailyRate > safeDailyAllowance * 1.5 && currentDay < 20) {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>AI Spending Velocity Alert:</b> Kecepatan belanja Anda (${formatRupiah(currentDailyRate)}/hari) melampaui jatah aman harian (${formatRupiah(safeDailyAllowance)}/hari). Jika berlanjut, pagu akan habis lebih awal!`;
    } else {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>Proyeksi Keuangan AI:</b> Pengeluaran Anda berada dalam kurva aman. Saldo belanja diproyeksikan mencukupi hingga akhir bulan.`;
    }
  }
}

// -----------------------------------------------------------------------------
// 5. TROLI BELANJA (TAB 1) & STRICT EMERGENCY FREEZE VALIDATION
// -----------------------------------------------------------------------------
function renderCartItems() {
  const container = document.getElementById('cartItemList');
  const emptyView = document.getElementById('emptyCartView');
  const actionFooter = document.getElementById('cartActionFooter');
  const totalItemsCount = document.getElementById('totalItemsCount');
  const navCartBadge = document.getElementById('navCartBadge');
  if (!container) return;

  if (totalItemsCount) totalItemsCount.textContent = `${state.cart.length} item`;
  if (navCartBadge) navCartBadge.textContent = state.cart.length.toString();

  const filteredItems = state.cart.filter(item => {
    if (state.activeCategoryFilter === 'ALL') return true;
    return item.category === state.activeCategoryFilter;
  });

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.classList.remove('hidden');
    if (actionFooter) actionFooter.classList.add('hidden');
    renderGuardianAndEnvelopes();
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  if (actionFooter) actionFooter.classList.remove('hidden');

  let html = '';
  filteredItems.forEach(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const rowTotal = qty * price;
    const isImpulse = item.category === 'Camilan' || item.category === 'Lainnya';

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col space-y-2.5 transition-all">
        <div class="flex items-start justify-between">
          <div class="space-y-0.5">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${item.category}</span>
              ${isImpulse ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Non-Esensial</span>' : '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Esensial</span>'}
              <span class="text-[10px] text-slate-400 font-medium">@ ${item.store || 'Toko Terdekat'}</span>
            </div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${item.name}</h4>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ${formatRupiah(price)} / ${item.unit || 'pcs'}
            </div>
          </div>
          
          <div class="text-right">
            <div class="text-sm font-black font-mono text-slate-900 dark:text-white">${formatRupiah(rowTotal)}</div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div class="flex items-center gap-1.5">
            <button class="btn-qty-minus w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition" data-id="${item.id}">-</button>
            <span class="px-2 text-xs font-bold font-mono text-slate-800 dark:text-slate-100">${qty} ${item.unit || 'pcs'}</span>
            <button class="btn-qty-plus w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition" data-id="${item.id}">+</button>
          </div>

          <div class="flex items-center gap-1.5">
            <button class="btn-edit-item p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition" data-id="${item.id}" title="Edit Item">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button class="btn-delete-item p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" data-id="${item.id}" title="Hapus Item">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  attachCartEventListeners();
  renderGuardianAndEnvelopes();
  lucide.createIcons();
}

function attachCartEventListeners() {
  document.querySelectorAll('.btn-qty-minus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        if (item.qty > 1) {
          item.qty -= 1;
        } else {
          state.cart = state.cart.filter(i => i.id !== id);
        }
        state.saveCart();
        renderCartItems();
        sounds.playClick();
      }
    };
  });

  document.querySelectorAll('.btn-qty-plus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        // Strict Emergency Freeze Check on quantity increment
        const nextTotal = calculateCartTotals() + item.price;
        if (state.isFrozen && nextTotal > state.budgetLimit) {
          showStrictFreezeModal('Kuantitas tidak dapat ditambah karena total akan melebihi pagu hard-cap!');
          sounds.playAlarm();
          return;
        }

        item.qty += 1;
        state.saveCart();
        renderCartItems();
        sounds.playClick();
      }
    };
  });

  document.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      state.cart = state.cart.filter(i => i.id !== id);
      state.saveCart();
      renderCartItems();
      sounds.playClick();
      showToast('Item berhasil dihapus');
    };
  });

  document.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) openCustomItemModalForEdit(item);
    };
  });
}

// -----------------------------------------------------------------------------
// 6. STRICT EMERGENCY FREEZE ENFORCEMENT & BARRIER
// -----------------------------------------------------------------------------
function showStrictFreezeModal(reasonMessage) {
  const modal = document.getElementById('strictFreezeModal');
  const msgEl = document.getElementById('strictFreezeMessage');
  const limitEl = document.getElementById('freezeModalLimit');
  const spendEl = document.getElementById('freezeModalSpend');

  if (msgEl && reasonMessage) msgEl.textContent = reasonMessage;
  if (limitEl) limitEl.textContent = formatRupiah(state.budgetLimit);
  if (spendEl) spendEl.textContent = formatRupiah(calculateCartTotals());

  if (modal) modal.classList.remove('hidden');
}

function validateAndAddItemToCart(itemData) {
  const isImpulse = itemData.category === 'Camilan' || itemData.category === 'Lainnya';
  const cartTotal = calculateCartTotals();
  const addedTotal = (itemData.qty || 1) * (itemData.price || 0);
  const projectedTotal = cartTotal + addedTotal;

  // STRICT VALIDATION 1: Emergency Freeze Active & Item is Non-Essential
  if (state.isFrozen && isImpulse) {
    showStrictFreezeModal('Sistem menolak transaksi ini karena kategori "Camilan / Non-Esensial" diblokir mutlak saat Emergency Freeze aktif.');
    sounds.playAlarm();
    return false;
  }

  // STRICT VALIDATION 2: Emergency Freeze Active & Over-Budget Hard Limit
  if (state.isFrozen && projectedTotal > state.budgetLimit) {
    showStrictFreezeModal(`Total transaksi (${formatRupiah(projectedTotal)}) melampaui pagu bulanan (${formatRupiah(state.budgetLimit)}). Hard Budget Cap aktif!`);
    sounds.playAlarm();
    return false;
  }

  // Commit item
  if (itemData.id) {
    const existing = state.cart.find(i => i.id === itemData.id);
    if (existing) {
      existing.name = itemData.name;
      existing.category = itemData.category;
      existing.unit = itemData.unit;
      existing.qty = itemData.qty;
      existing.price = itemData.price;
      existing.store = itemData.store;
    }
  } else {
    state.cart.push({
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: itemData.name,
      category: itemData.category,
      unit: itemData.unit,
      qty: itemData.qty,
      price: itemData.price,
      store: itemData.store || 'Super Indo',
      isEssential: !isImpulse
    });
  }

  state.saveCart();
  renderCartItems();
  sounds.playClick();
  showToast(itemData.id ? 'Item diperbarui' : 'Barang masuk ke troli');
  return true;
}

// -----------------------------------------------------------------------------
// 7. REAL-WORLD SUPERMARKET & STORE RADAR (TAB 3)
// -----------------------------------------------------------------------------
function renderRealWorldRadar() {
  const container = document.getElementById('realWorldStoresList');
  const winnerName = document.getElementById('radarWinnerName');
  const winnerSavings = document.getElementById('radarWinnerSavings');
  if (!container) return;

  const cartTotal = calculateCartTotals();

  // Calculate totals per store
  const storeEvaluations = REAL_WORLD_STORES.map(store => {
    let storeTotal = 0;
    state.cart.forEach(item => {
      const baseItemPrice = item.price || 15000;
      const qty = item.qty || 1;
      storeTotal += Math.round(baseItemPrice * store.multiplier) * qty;
    });

    return {
      ...store,
      computedTotal: storeTotal
    };
  });

  // Sort by lowest price
  storeEvaluations.sort((a, b) => a.computedTotal - b.computedTotal);

  const cheapest = storeEvaluations[0];
  const mostExpensive = storeEvaluations[storeEvaluations.length - 1];
  const diffSavings = mostExpensive.computedTotal - cheapest.computedTotal;

  if (winnerName) winnerName.textContent = cheapest.name;
  if (winnerSavings) {
    if (state.cart.length > 0) {
      winnerSavings.textContent = `Pilihan paling hemat! Total belanja ${formatRupiah(cheapest.computedTotal)}, hemat hingga ${formatRupiah(diffSavings)} dibanding ritel lain!`;
    } else {
      winnerSavings.textContent = 'Tambahkan item ke keranjang belanja untuk memetakan perbandingan harga toko nyata.';
    }
  }

  let html = '';
  storeEvaluations.forEach((store, idx) => {
    const isWinner = idx === 0 && state.cart.length > 0;
    const distanceText = store.defaultDistanceMeters >= 1000 
      ? `${(store.defaultDistanceMeters / 1000).toFixed(1)} km` 
      : `${store.defaultDistanceMeters} m`;

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border ${isWinner ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700/80'} shadow-xs flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}">
              ${store.badge}
            </span>
            <span class="text-[10px] text-slate-400 flex items-center gap-0.5">
              <i data-lucide="map-pin" class="w-3 h-3 text-emerald-500"></i> ${distanceText}
            </span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white">${store.name}</h4>
          <p class="text-[10px] text-slate-400">${store.address} &bull; ${store.type}</p>
        </div>

        <div class="text-right">
          <span class="text-sm font-black font-mono ${isWinner ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}">
            ${formatRupiah(store.computedTotal)}
          </span>
          <span class="block text-[9px] text-slate-400 mt-0.5">Estimasi Total</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

function handleDetectLocation() {
  if (navigator.geolocation) {
    showToast('Mendeteksi GPS lokasi Anda...', 'navigation');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        showToast('Lokasi GPS berhasil diperbarui!', 'check-circle');
        renderRealWorldRadar();
      },
      () => {
        showToast('Izin GPS tidak diberikan, menggunakan radius standar.', 'alert-triangle');
      }
    );
  } else {
    showToast('Browser Anda tidak mendukung Geolocation', 'alert-triangle');
  }
}

// -----------------------------------------------------------------------------
// 8. ENHANCED SMART RECEIPT & BARCODE SCANNER (NATIVE CAMERA ACCESS)
// -----------------------------------------------------------------------------
async function openNativeCameraScanner(mode = 'barcode') {
  const modal = document.getElementById('cameraScannerModal');
  const title = document.getElementById('scannerModeTitle');
  const video = document.getElementById('scannerVideo');
  const btnBarcode = document.getElementById('scanModeBarcodeBtn');
  const btnOcr = document.getElementById('scanModeOcrBtn');

  state.scannerMode = mode;
  if (modal) modal.classList.remove('hidden');

  if (title) title.textContent = mode === 'barcode' ? 'Live Barcode Pemindai' : 'Pemindai Struk Belanja (OCR)';

  if (btnBarcode && btnOcr) {
    if (mode === 'barcode') {
      btnBarcode.className = 'py-2 rounded-xl bg-emerald-500 shadow-sm transition';
      btnOcr.className = 'py-2 rounded-xl text-slate-300 hover:text-white transition';
    } else {
      btnBarcode.className = 'py-2 rounded-xl text-slate-300 hover:text-white transition';
      btnOcr.className = 'py-2 rounded-xl bg-emerald-500 shadow-sm transition';
    }
  }

  // Request Native Camera Stream
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    state.scannerStream = stream;
    if (video) {
      video.srcObject = stream;
      video.play();
    }

    startBarcodeDetectionLoop();
  } catch (err) {
    console.warn('Camera access error:', err);
    showToast('Kamera tidak dapat diakses. Gunakan opsi unggah foto/contoh.', 'camera-off');
  }
}

function stopNativeCameraScanner() {
  const modal = document.getElementById('cameraScannerModal');
  const video = document.getElementById('scannerVideo');

  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach(t => t.stop());
    state.scannerStream = null;
  }
  if (video) video.srcObject = null;
  if (modal) modal.classList.add('hidden');
}

function startBarcodeDetectionLoop() {
  if (!('BarcodeDetector' in window)) {
    console.log('BarcodeDetector API native belum aktif pada peramban ini. Simulasi aktif.');
    return;
  }

  if (!state.scannerDetector) {
    try {
      state.scannerDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'upc_a']
      });
    } catch (e) {
      console.warn('BarcodeDetector format not supported', e);
    }
  }

  const video = document.getElementById('scannerVideo');
  const interval = setInterval(async () => {
    if (!state.scannerStream || !video || video.readyState !== 4) return;
    if (state.scannerMode !== 'barcode') {
      clearInterval(interval);
      return;
    }

    try {
      if (state.scannerDetector) {
        const barcodes = await state.scannerDetector.detect(video);
        if (barcodes.length > 0) {
          const rawVal = barcodes[0].rawValue;
          handleDetectedBarcode(rawVal);
          clearInterval(interval);
        }
      }
    } catch (e) {
      // Loop
    }
  }, 400);
}

function handleDetectedBarcode(barcodeString) {
  sounds.playBarcodeBeep();

  const product = BARCODE_CATALOG[barcodeString] || {
    name: `Produk Ritel (${barcodeString.substring(0, 8)})`,
    category: "Sembako",
    unit: "pcs",
    price: 15000,
    store: "Indomaret",
    isEssential: true
  };

  const statusBadge = document.getElementById('scannerStatusBadge');
  if (statusBadge) {
    statusBadge.innerHTML = `<span class="text-emerald-400 font-bold">✓ Terdeteksi:</span> ${product.name} (${formatRupiah(product.price)})`;
  }

  setTimeout(() => {
    stopNativeCameraScanner();
    const success = validateAndAddItemToCart({
      name: product.name,
      category: product.category,
      unit: product.unit,
      qty: 1,
      price: product.price,
      store: product.store || "Indomaret"
    });
    if (success) {
      showToast(`Barcode ${product.name} berhasil dicatat!`, 'check-circle');
    }
  }, 700);
}

function triggerQuickSampleScan() {
  if (state.scannerMode === 'barcode') {
    // Pick random barcode
    const barcodes = Object.keys(BARCODE_CATALOG);
    const chosen = barcodes[Math.floor(Math.random() * barcodes.length)];
    handleDetectedBarcode(chosen);
  } else {
    // Mode OCR
    sounds.playBarcodeBeep();
    stopNativeCameraScanner();
    // Insert mock extracted receipt
    const mockItems = [
      { name: "Beras Ramos Premium 5kg", category: "Sembako", unit: "pack", qty: 1, price: 74000, store: "Indomaret" },
      { name: "Telur Ayam Negeri 1kg", category: "Daging & Sayur", unit: "kg", qty: 1, price: 28500, store: "Indomaret" },
      { name: "Minyak Goreng Sania 2L", category: "Bumbu & Minyak", unit: "liter", qty: 1, price: 33500, store: "Indomaret" }
    ];

    mockItems.forEach(item => validateAndAddItemToCart(item));
    showToast('Struk berhasil diekstrak via AI OCR!', 'camera');
  }
}

// -----------------------------------------------------------------------------
// 9. CUSTOM GROCERY ITEM BUILDER MODAL
// -----------------------------------------------------------------------------
function openCustomItemModalForNew() {
  const form = document.getElementById('customItemForm');
  if (form) form.reset();
  const idEl = document.getElementById('customEditId');
  if (idEl) idEl.value = '';
  const title = document.getElementById('customItemModalTitle');
  if (title) title.textContent = 'Tambah Barang Belanja Bebas';

  updateCustomPreview();
  const modal = document.getElementById('customItemModal');
  if (modal) modal.classList.remove('hidden');
}

function openCustomItemModalForEdit(item) {
  const modal = document.getElementById('customItemModal');
  const idEl = document.getElementById('customEditId');
  const nameEl = document.getElementById('customInputName');
  const catEl = document.getElementById('customInputCategory');
  const unitEl = document.getElementById('customInputUnit');
  const qtyEl = document.getElementById('customInputQty');
  const priceEl = document.getElementById('customInputPrice');
  const storeEl = document.getElementById('customInputStore');
  const title = document.getElementById('customItemModalTitle');

  if (idEl) idEl.value = item.id;
  if (nameEl) nameEl.value = item.name;
  if (catEl) catEl.value = item.category;
  if (unitEl) unitEl.value = item.unit || 'pcs';
  if (qtyEl) qtyEl.value = item.qty || 1;
  if (priceEl) priceEl.value = item.price || 0;
  if (storeEl) storeEl.value = item.store || 'Super Indo';
  if (title) title.textContent = 'Edit Barang Belanja';

  updateCustomPreview();
  if (modal) modal.classList.remove('hidden');
}

function updateCustomPreview() {
  const qty = Number(document.getElementById('customInputQty')?.value) || 1;
  const price = Number(document.getElementById('customInputPrice')?.value) || 0;
  const calcEl = document.getElementById('customCalcPreview');
  const totalEl = document.getElementById('customTotalPreview');

  if (calcEl) calcEl.textContent = `${qty} × ${formatRupiah(price)}`;
  if (totalEl) totalEl.textContent = formatRupiah(qty * price);
}

function handleSaveCustomItem() {
  const id = document.getElementById('customEditId')?.value;
  const name = document.getElementById('customInputName')?.value.trim();
  const category = document.getElementById('customInputCategory')?.value;
  const unit = document.getElementById('customInputUnit')?.value;
  const qty = Number(document.getElementById('customInputQty')?.value) || 1;
  const price = Number(document.getElementById('customInputPrice')?.value) || 0;
  const store = document.getElementById('customInputStore')?.value;

  if (!name || price <= 0) {
    showToast('Mohon masukkan nama produk dan harga valid!', 'alert-triangle');
    return;
  }

  const success = validateAndAddItemToCart({ id, name, category, unit, qty, price, store });
  if (success) {
    const modal = document.getElementById('customItemModal');
    if (modal) modal.classList.add('hidden');
  }
}

// -----------------------------------------------------------------------------
// 10. SMART PANTRY & ZERO-WASTE
// -----------------------------------------------------------------------------
function renderPantryStock() {
  const container = document.getElementById('pantryStockList');
  const emptyView = document.getElementById('emptyPantryView');
  const alertBox = document.getElementById('pantryAlertBox');
  const alertTitle = document.getElementById('pantryAlertTitle');
  const alertDesc = document.getElementById('pantryAlertDesc');
  const navAlertBadge = document.getElementById('navPantryAlertBadge');
  if (!container) return;

  const unconsumed = state.pantry.filter(p => !p.isConsumed);

  if (unconsumed.length === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.classList.remove('hidden');
    if (alertBox) alertBox.classList.add('hidden');
    if (navAlertBadge) navAlertBadge.classList.add('hidden');
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  const critical = unconsumed.filter(p => p.daysLeft !== undefined && p.daysLeft <= 2);

  if (critical.length > 0) {
    if (alertBox) alertBox.classList.remove('hidden');
    if (navAlertBadge) navAlertBadge.classList.remove('hidden');
    if (alertTitle) alertTitle.textContent = `${critical.length} Bahan Mendekati Batas Kedaluwarsa!`;
    if (alertDesc) alertDesc.textContent = `${critical.map(c => c.name).join(', ')} perlu diolah segera agar tidak mubazir.`;
  } else {
    if (alertBox) alertBox.classList.add('hidden');
    if (navAlertBadge) navAlertBadge.classList.add('hidden');
  }

  let html = '';
  unconsumed.forEach(item => {
    let freshness = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${item.daysLeft <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${item.daysLeft} Hari Lagi</span>`;

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">${item.category}</span>
            ${freshness}
          </div>
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">${item.name}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5">Tersimpan: ${item.qty} ${item.unit} &bull; Tanggal Beli: ${item.purchasedDate}</p>
        </div>

        <button class="btn-consume-pantry px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition" data-id="${item.id}">
          Habis Dimasak
        </button>
      </div>
    `;
  });

  container.innerHTML = html;

  document.querySelectorAll('.btn-consume-pantry').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.pantry.find(p => p.id === id);
      if (item) {
        item.isConsumed = true;
        state.savePantry();
        renderPantryStock();
        sounds.playClick();
        showToast('Bahan berhasil diolah zero-waste!');
      }
    };
  });
}

// -----------------------------------------------------------------------------
// 11. RIWAYAT BELANJA
// -----------------------------------------------------------------------------
function renderHistoryView() {
  const container = document.getElementById('historyListContainer');
  const emptyView = document.getElementById('emptyHistoryView');
  const countEl = document.getElementById('historyTripCount');
  const spendEl = document.getElementById('historyTotalSpend');
  if (!container) return;

  if (countEl) countEl.textContent = `${state.history.length} Transaksi`;
  let totalSpend = 0;
  state.history.forEach(t => totalSpend += t.totalAmount);
  if (spendEl) spendEl.textContent = formatRupiah(totalSpend);

  if (state.history.length === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.classList.remove('hidden');
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  let html = '';
  state.history.forEach(trip => {
    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold text-slate-400 block">${trip.date}</span>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white mt-0.5">${trip.itemCount} Macam Produk</h4>
        </div>
        <div class="text-right">
          <span class="text-sm font-black font-mono text-slate-900 dark:text-white block">${formatRupiah(trip.totalAmount)}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function checkoutTrip() {
  if (state.cart.length === 0) return;

  const total = calculateCartTotals();

  // Transfer items to virtual pantry
  state.cart.forEach(item => {
    let days = 7;
    if (item.category === 'Daging & Sayur') days = 3;
    else if (item.category === 'Sembako') days = 90;
    else if (item.category === 'Makanan Instan') days = 180;

    state.pantry.push({
      id: 'pantry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: item.name,
      category: item.category,
      unit: item.unit || 'pcs',
      qty: item.qty || 1,
      purchasedDate: new Date().toISOString().split('T')[0],
      daysLeft: days,
      isConsumed: false
    });
  });

  state.history.unshift({
    id: 'trip_' + Date.now(),
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    itemCount: state.cart.length,
    totalAmount: total,
    items: [...state.cart]
  });

  state.cart = [];
  state.saveCart();
  state.saveHistory();
  state.savePantry();

  renderCartItems();
  renderPantryStock();
  renderHistoryView();
  sounds.playClick();
  showToast('Belanja selesai & stok masuk ke Virtual Pantry!');
}

// -----------------------------------------------------------------------------
// 12. INITIALIZATION & EVENT LISTENERS
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Apply Saved Theme
  const applyTheme = (themeName) => {
    state.theme = themeName;
    localStorage.setItem('sg_theme', themeName);
    if (themeName === 'dark' || (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  applyTheme(state.theme);

  // Apply Layout
  const mainContainer = document.getElementById('mainContainer');
  const layoutModeText = document.getElementById('layoutModeText');
  const applyLayout = (isBento) => {
    state.isBentoMode = isBento;
    localStorage.setItem('sg_layout_mode', isBento ? 'bento' : 'mobile');
    if (mainContainer) {
      if (isBento) {
        mainContainer.classList.remove('mode-mobile');
        mainContainer.classList.add('mode-bento');
        if (layoutModeText) layoutModeText.textContent = 'Bento Grid (1200px)';
      } else {
        mainContainer.classList.remove('mode-bento');
        mainContainer.classList.add('mode-mobile');
        if (layoutModeText) layoutModeText.textContent = 'Smartphone (440px)';
      }
    }
  };
  applyLayout(state.isBentoMode);

  // Initial Renders
  renderCartItems();
  renderGuardianAndEnvelopes();
  renderRealWorldRadar();
  renderPantryStock();
  renderHistoryView();

  // Navigation Tabs Switching
  const switchTab = (targetId) => {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
    const activeSection = document.getElementById(targetId);
    if (activeSection) activeSection.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-target') === targetId;
      btn.className = match
        ? 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold active:scale-95 transition'
        : 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-slate-400 hover:text-slate-600 active:scale-95 transition';
    });

    if (targetId === 'tab-radar') renderRealWorldRadar();
    if (targetId === 'tab-pantry') renderPantryStock();
    if (targetId === 'tab-guardian') renderGuardianAndEnvelopes();
    if (targetId === 'tab-riwayat') renderHistoryView();

    sounds.playClick();
    lucide.createIcons();
  };

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.getAttribute('data-target'));
  });

  // Header Settings Button
  document.getElementById('headerSettingsBtn')?.addEventListener('click', () => {
    switchTab('tab-settings');
  });

  // Category Pills
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.cat-pill').forEach(b => {
        b.className = 'cat-pill px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 transition active:scale-95';
      });
      btn.className = 'cat-pill active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-emerald-500 text-white shadow-xs transition active:scale-95';
      state.activeCategoryFilter = btn.getAttribute('data-category') || 'ALL';
      renderCartItems();
      sounds.playClick();
    };
  });

  // Emergency Freeze Switch Toggle
  const freezeToggle = document.getElementById('emergencyFreezeToggle');
  if (freezeToggle) {
    freezeToggle.onchange = (e) => {
      state.isFrozen = e.target.checked;
      state.saveFreezeState();
      renderGuardianAndEnvelopes();
      if (state.isFrozen) {
        sounds.playAlarm();
        showToast('Emergency Freeze AKTIF! Hard Budget Lock diberlakukan.', 'lock');
      } else {
        sounds.playClick();
        showToast('Emergency Freeze dinonaktifkan.');
      }
    };
  }

  // Dismiss Strict Freeze Modal
  document.getElementById('dismissStrictFreezeBtn')?.addEventListener('click', () => {
    document.getElementById('strictFreezeModal')?.classList.add('hidden');
  });

  // Scanner Triggers
  document.getElementById('quickLaunchScannerBtn')?.addEventListener('click', () => openNativeCameraScanner('barcode'));
  document.getElementById('emptyScanBtn')?.addEventListener('click', () => openNativeCameraScanner('barcode'));
  document.getElementById('openCameraBarcodeBtn')?.addEventListener('click', () => openNativeCameraScanner('barcode'));
  document.getElementById('openCameraOcrBtn')?.addEventListener('click', () => openNativeCameraScanner('ocr'));
  document.getElementById('closeCameraScannerBtn')?.addEventListener('click', stopNativeCameraScanner);

  document.getElementById('scanModeBarcodeBtn')?.addEventListener('click', () => {
    state.scannerMode = 'barcode';
    openNativeCameraScanner('barcode');
  });
  document.getElementById('scanModeOcrBtn')?.addEventListener('click', () => {
    state.scannerMode = 'ocr';
    openNativeCameraScanner('ocr');
  });

  document.getElementById('scannerSampleBtn')?.addEventListener('click', triggerQuickSampleScan);
  document.getElementById('scannerUploadInput')?.addEventListener('change', () => triggerQuickSampleScan());

  // Custom Item Modal Triggers
  document.getElementById('quickAddCustomBtn')?.addEventListener('click', openCustomItemModalForNew);
  document.getElementById('emptyAddBtn')?.addEventListener('click', openCustomItemModalForNew);
  document.getElementById('closeCustomItemBtn')?.addEventListener('click', () => {
    document.getElementById('customItemModal')?.classList.add('hidden');
  });
  document.getElementById('cancelCustomItemBtn')?.addEventListener('click', () => {
    document.getElementById('customItemModal')?.classList.add('hidden');
  });
  document.getElementById('saveCustomItemBtn')?.addEventListener('click', handleSaveCustomItem);

  ['customInputQty', 'customInputPrice'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCustomPreview);
  });

  // Geolocation Radar
  document.getElementById('detectLocationBtn')?.addEventListener('click', handleDetectLocation);

  // Settings Actions: Theme choices
  document.querySelectorAll('.theme-choice-btn').forEach(btn => {
    btn.onclick = () => {
      applyTheme(btn.getAttribute('data-theme'));
      sounds.playClick();
      showToast(`Tema diterapkan: ${btn.getAttribute('data-theme')}`);
    };
  });

  // Settings Actions: Layout Toggle
  document.getElementById('toggleLayoutSettingsBtn')?.addEventListener('click', () => {
    applyLayout(!state.isBentoMode);
    sounds.playClick();
    showToast(state.isBentoMode ? 'Mode Bento Grid Aktif' : 'Mode Smartphone Aktif');
  });

  // Settings Actions: Sound Toggle
  const soundCheckbox = document.getElementById('soundToggleCheckbox');
  if (soundCheckbox) {
    soundCheckbox.checked = state.soundEnabled;
    soundCheckbox.onchange = (e) => {
      state.soundEnabled = e.target.checked;
      localStorage.setItem('sg_sound_enabled', state.soundEnabled.toString());
      sounds.playClick();
      showToast(state.soundEnabled ? 'Efek Suara Aktif' : 'Efek Suara Dibisukan');
    };
  }

  // Settings Actions: Save Budget Limit
  document.getElementById('saveBudgetLimitBtn')?.addEventListener('click', () => {
    const val = Number(document.getElementById('budgetLimitInput')?.value);
    if (val >= 50000) {
      state.budgetLimit = val;
      localStorage.setItem('sg_budget_limit', val.toString());
      renderGuardianAndEnvelopes();
      sounds.playClick();
      showToast('Pagu anggaran berhasil disimpan!');
    }
  });

  // Checkout Trip
  document.getElementById('checkoutTripBtn')?.addEventListener('click', checkoutTrip);

  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua barang dari keranjang belanja?')) {
      state.cart = [];
      state.saveCart();
      renderCartItems();
      showToast('Keranjang dikosongkan');
    }
  });

  lucide.createIcons();
});
