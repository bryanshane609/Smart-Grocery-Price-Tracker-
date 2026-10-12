/**
 * Smart Grocery & Budget Safety Tracker (PWA)
 * Arsitektur Mobile UI untuk Siswa Rantau
 * Memenuhi Spesifikasi SRS F-01 s/d F-06
 */

// =============================================================================
// 1. DATA DEFAULT & PRESET SEED DATA ANAK RANTAU
// =============================================================================
const DEFAULT_BUDGET_LIMIT = 800000; // Rp 800.000 limit jatah bulanan anak rantau

const PRESET_BENCHMARK_ITEMS = {
  "beras ramos 5kg": { name: "Beras Ramos 5kg", category: "Sembako", unit: "pack", price: 72000 },
  "indomie goreng": { name: "Indomie Goreng", category: "Makanan Instan", unit: "bungkus", price: 3100 },
  "indomie kuah ayam bawang": { name: "Indomie Kuah Ayam Bawang", category: "Makanan Instan", unit: "bungkus", price: 3000 },
  "minyak goreng sania 2l": { name: "Minyak Goreng Sania 2L", category: "Bumbu & Minyak", unit: "liter", price: 34500 },
  "telur ayam 1kg": { name: "Telur Ayam 1kg", category: "Daging & Sayur", unit: "kg", price: 28000 },
  "sabun lifebuoy total 10 400ml": { name: "Sabun Lifebuoy Total 10 400ml", category: "Toiletries", unit: "botol", price: 19500 },
  "susu uht ultra milk 1l": { name: "Susu UHT Ultra Milk 1L", category: "Minuman", unit: "liter", price: 18500 },
  "deterjen rinso 750g": { name: "Deterjen Rinso 750g", category: "Toiletries", unit: "pack", price: 21000 },
  "shampoo pantene 160ml": { name: "Shampoo Pantene 160ml", category: "Toiletries", unit: "botol", price: 24000 },
  "bawang merah 250g": { name: "Bawang Merah 250g", category: "Bumbu & Minyak", unit: "pack", price: 12000 },
  "kecap manis bango 520ml": { name: "Kecap Manis Bango 520ml", category: "Bumbu & Minyak", unit: "pack", price: 22000 },
  "kornet sapi pronas 198g": { name: "Kornet Sapi Pronas 198g", category: "Makanan Instan", unit: "kaleng", price: 23500 },
  "sarden abc saus tomat 155g": { name: "Sarden ABC Saus Tomat 155g", category: "Makanan Instan", unit: "kaleng", price: 10500 },
  "air mineral galon refill": { name: "Air Mineral Galon Refill", category: "Minuman", unit: "pcs", price: 20000 },
  "kopi kapal api mix 10s": { name: "Kopi Kapal Api Mix 10s", category: "Minuman", unit: "pack", price: 14500 },
  "biskuit roma kelapa 300g": { name: "Biskuit Roma Kelapa 300g", category: "Camilan", unit: "pack", price: 11000 },
  "pasta gigi pepsodent 190g": { name: "Pasta Gigi Pepsodent 190g", category: "Toiletries", unit: "pcs", price: 15000 },
  "dada ayam fillet 500g": { name: "Dada Ayam Fillet 500g", category: "Daging & Sayur", unit: "pack", price: 29000 },
  "sayur sawi & wortel mix": { name: "Sayur Sawi & Wortel Mix", category: "Daging & Sayur", unit: "pack", price: 8000 }
};

const PRESET_SAMPLE_CART = [
  {
    name: "Beras Ramos 5kg",
    category: "Sembako",
    unit: "pack",
    qty: 1,
    price: 74000, // Naik Rp 2.000 vs bulan lalu
    discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
  },
  {
    name: "Indomie Goreng",
    category: "Makanan Instan",
    unit: "bungkus",
    qty: 15,
    price: 3100, // Stabil
    discount: { mode: 'single', singlePercent: 10, tier1: 0, tier2: 0, nominalAmount: 0 }
  },
  {
    name: "Minyak Goreng Sania 2L",
    category: "Bumbu & Minyak",
    unit: "liter",
    qty: 1,
    price: 33000, // Turun Rp 1.500 vs bulan lalu (Promo!)
    discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
  },
  {
    name: "Telur Ayam 1kg",
    category: "Daging & Sayur",
    unit: "kg",
    qty: 2,
    price: 29500, // Naik Rp 1.500
    discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
  },
  {
    name: "Sabun Lifebuoy Total 10 400ml",
    category: "Toiletries",
    unit: "botol",
    qty: 2,
    price: 25000,
    // Diskon bertingkat 50% + 20%
    discount: { mode: 'tier', singlePercent: 0, tier1: 50, tier2: 20, nominalAmount: 0 }
  }
];

// =============================================================================
// 2. STATE MANAGER
// =============================================================================
class AppState {
  constructor() {
    this.budgetLimit = Number(localStorage.getItem('sg_budget_limit')) || DEFAULT_BUDGET_LIMIT;
    this.cart = this.loadCart();
    this.history = this.loadHistory();
    this.benchmarks = this.loadBenchmarks();
    this.activeCategoryFilter = 'ALL';
    this.soundEnabled = localStorage.getItem('sg_sound_enabled') !== 'false';
  }

  loadCart() {
    try {
      const data = localStorage.getItem('sg_cart_items');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading cart', e);
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('sg_cart_items', JSON.stringify(this.cart));
    if (window.FirebaseSync) {
      window.FirebaseSync.syncCart(this.cart);
    }
  }

  loadHistory() {
    try {
      const data = localStorage.getItem('sg_history_trips');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading history', e);
      return [];
    }
  }

  saveHistory() {
    localStorage.setItem('sg_history_trips', JSON.stringify(this.history));
    if (window.FirebaseSync) {
      window.FirebaseSync.syncHistory(this.history);
    }
  }

  loadBenchmarks() {
    try {
      const data = localStorage.getItem('sg_benchmark_prices');
      if (data) return JSON.parse(data);
      // Fallback pre-seed defaults
      localStorage.setItem('sg_benchmark_prices', JSON.stringify(PRESET_BENCHMARK_ITEMS));
      return { ...PRESET_BENCHMARK_ITEMS };
    } catch (e) {
      return { ...PRESET_BENCHMARK_ITEMS };
    }
  }

  saveBenchmarks() {
    localStorage.setItem('sg_benchmark_prices', JSON.stringify(this.benchmarks));
    if (window.FirebaseSync) {
      window.FirebaseSync.syncBenchmarks(this.benchmarks);
    }
  }

  saveBudgetLimit(amount) {
    this.budgetLimit = amount;
    localStorage.setItem('sg_budget_limit', amount);
    if (window.FirebaseSync) {
      window.FirebaseSync.syncSettings({
        budgetLimit: this.budgetLimit,
        soundEnabled: this.soundEnabled
      });
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('sg_sound_enabled', this.soundEnabled);
    return this.soundEnabled;
  }
}

const state = new AppState();

// =============================================================================
// 3. AUDIO SYNTHESIZER (Web Audio API - Ramah Baterai & Responsif)
// =============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playWarning() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.setValueAtTime(260, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch (e) {}
  }

  playSuccess() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.07 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.07);
        osc.stop(this.ctx.currentTime + i * 0.07 + 0.15);
      });
    } catch (e) {}
  }
}

const sounds = new SoundEngine();

// =============================================================================
// 4. CORE ENGINES: DISKON (F-03), PERHITUNGAN (F-02), & KOMPARATOR (F-04)
// =============================================================================

/**
 * F-03: Menghitung diskon bertingkat (multi-tier) dan tunggal secara matematis
 * Rumus Bertingkat: P * (1 - T1/100) * (1 - T2/100)
 */
function calculateItemPricing(rawPrice, qty, discount) {
  const price = Math.max(0, Number(rawPrice) || 0);
  const quantity = Math.max(1, Number(qty) || 1);
  const mode = discount?.mode || 'none';

  let unitFinal = price;
  let unitDiscountAmount = 0;
  let effectivePercent = 0;
  let mathExplanation = '';

  if (mode === 'single') {
    const p1 = Math.min(100, Math.max(0, Number(discount.singlePercent) || 0));
    unitDiscountAmount = Math.round(price * (p1 / 100));
    unitFinal = Math.max(0, price - unitDiscountAmount);
    effectivePercent = p1;
    mathExplanation = `Diskon ${p1}% • Hemat Rp ${formatNumber(unitDiscountAmount)}/item`;
  } else if (mode === 'tier') {
    const t1 = Math.min(100, Math.max(0, Number(discount.tier1) || 0));
    const t2 = Math.min(100, Math.max(0, Number(discount.tier2) || 0));
    
    // Potongan Tier 1
    const step1Price = price * (1 - t1 / 100);
    // Potongan Tier 2 atas hasil Tier 1
    const finalStepPrice = step1Price * (1 - t2 / 100);

    unitFinal = Math.max(0, Math.round(finalStepPrice));
    unitDiscountAmount = price - unitFinal;
    
    // Diskon efektif gabungan
    effectivePercent = price > 0 ? Math.round(((price - unitFinal) / price) * 100) : 0;
    mathExplanation = `Bertingkat ${t1}% + ${t2}% = Efektif ${effectivePercent}% (Hemat Rp ${formatNumber(unitDiscountAmount)}/item)`;
  } else if (mode === 'nominal') {
    const potong = Math.max(0, Number(discount.nominalAmount) || 0);
    unitDiscountAmount = Math.min(price, potong);
    unitFinal = Math.max(0, price - unitDiscountAmount);
    effectivePercent = price > 0 ? Math.round((unitDiscountAmount / price) * 100) : 0;
    mathExplanation = `Potongan langsung Rp ${formatNumber(potong)}/item`;
  }

  const subtotal = unitFinal * quantity;
  const originalTotal = price * quantity;
  const totalSaved = unitDiscountAmount * quantity;

  return {
    price,
    quantity,
    unitFinal,
    unitDiscountAmount,
    effectivePercent,
    mathExplanation,
    subtotal,
    originalTotal,
    totalSaved
  };
}

/**
 * F-04: Komparator Harga Realtime vs Bulan Lalu
 * Return visual flags: higher (↑), lower (↓), equal (=), new (✨)
 */
function comparePriceWithBenchmark(productName, currentUnitPrice) {
  const normKey = (productName || '').trim().toLowerCase();
  const benchmark = state.benchmarks[normKey];

  if (!benchmark || !benchmark.price) {
    return {
      status: 'new',
      symbol: '✨',
      label: 'Produk Baru',
      desc: 'Belum ada data belanja bulan lalu',
      diff: 0,
      diffPercent: 0,
      refPrice: null,
      colorClass: 'text-sky-400 bg-sky-950/60 border-sky-800'
    };
  }

  const refPrice = benchmark.price;
  const diff = currentUnitPrice - refPrice;
  const diffPercent = Math.round((Math.abs(diff) / refPrice) * 100);

  if (diff > 0) {
    return {
      status: 'higher',
      symbol: '↑',
      label: `Naik +Rp ${formatNumber(diff)} (+${diffPercent}%)`,
      desc: `Lebih mahal dibanding bulan lalu (Rp ${formatNumber(refPrice)})`,
      diff,
      diffPercent,
      refPrice,
      colorClass: 'text-red-400 bg-red-950/60 border-red-800/80'
    };
  } else if (diff < 0) {
    return {
      status: 'lower',
      symbol: '↓',
      label: `Turun -Rp ${formatNumber(Math.abs(diff))} (-${diffPercent}%)`,
      desc: `Lebih murah dibanding bulan lalu (Rp ${formatNumber(refPrice)})`,
      diff,
      diffPercent,
      refPrice,
      colorClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
    };
  } else {
    return {
      status: 'equal',
      symbol: '=',
      label: 'Harga Stabil',
      desc: `Sama persis dengan bulan lalu (Rp ${formatNumber(refPrice)})`,
      diff: 0,
      diffPercent: 0,
      refPrice,
      colorClass: 'text-slate-300 bg-slate-800/80 border-slate-700'
    };
  }
}

// =============================================================================
// 5. HELPER FORMATTERS
// =============================================================================
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

function formatRupiah(num) {
  return `Rp ${formatNumber(num)}`;
}

function showToast(msg, iconType = 'check-circle') {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  if (!toast) return;
  toastMsg.textContent = msg;

  if (iconType === 'alert') {
    toastIcon.setAttribute('data-lucide', 'alert-triangle');
    toastIcon.className = 'w-4 h-4 text-red-400 shrink-0';
  } else {
    toastIcon.setAttribute('data-lucide', 'check-circle');
    toastIcon.className = 'w-4 h-4 text-emerald-400 shrink-0';
  }

  if (window.lucide) lucide.createIcons();

  toast.classList.remove('opacity-0', '-translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-4');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2400);
}

// =============================================================================
// 6. UI RENDERER: BUDGET SAFETY CAP & TROLLEY BAR (F-05)
// =============================================================================
function renderBudgetSafety() {
  const totalCart = state.cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalSavings = state.cart.reduce((sum, item) => sum + (item.totalSaved || 0), 0);
  const limit = state.budgetLimit;
  const remaining = limit - totalCart;
  const percentage = limit > 0 ? Math.round((totalCart / limit) * 100) : 0;

  // Header Numbers
  const cartTotalHeader = document.getElementById('cartTotalHeader');
  const budgetLimitHeader = document.getElementById('budgetLimitHeader');
  const budgetProgressBar = document.getElementById('budgetProgressBar');
  const budgetSafetyBadge = document.getElementById('budgetSafetyBadge');
  const budgetSafetyText = document.getElementById('budgetSafetyText');
  const budgetRemainingText = document.getElementById('budgetRemainingText');
  const safetyStatusIcon = document.getElementById('safetyStatusIcon');
  const overBudgetBanner = document.getElementById('overBudgetBanner');
  const overBudgetDiffText = document.getElementById('overBudgetDiffText');
  const budgetWidget = document.getElementById('budgetSafetyWidget');

  if (cartTotalHeader) {
    cartTotalHeader.innerHTML = `<span class="text-xs text-slate-400 font-sans">Rp</span> ${formatNumber(totalCart)}`;
  }
  if (budgetLimitHeader) {
    budgetLimitHeader.textContent = formatRupiah(limit);
  }

  // Progress Bar width clamp
  const barPercent = Math.min(100, Math.max(0, percentage));
  if (budgetProgressBar) {
    budgetProgressBar.style.width = `${barPercent}%`;
  }

  // Safety stages styling
  if (percentage < 75) {
    // Stage 1: Aman (Hijau)
    budgetProgressBar.className = 'h-full rounded-full transition-all duration-500 bg-emerald-500 shadow-sm';
    budgetSafetyBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    budgetSafetyText.textContent = `Aman (${percentage}%)`;
    budgetRemainingText.className = 'font-bold font-mono text-emerald-400';
    budgetRemainingText.textContent = formatRupiah(remaining);
    safetyStatusIcon.className = 'w-3 h-3 text-emerald-400';
    overBudgetBanner.classList.add('hidden');
    budgetWidget.classList.remove('animate-pulse-danger', 'border-red-500');
  } else if (percentage < 90) {
    // Stage 2: Waspada (Kuning / Amber)
    budgetProgressBar.className = 'h-full rounded-full transition-all duration-500 bg-amber-400 shadow-sm';
    budgetSafetyBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30';
    budgetSafetyText.textContent = `Waspada (${percentage}%)`;
    budgetRemainingText.className = 'font-bold font-mono text-amber-400';
    budgetRemainingText.textContent = formatRupiah(remaining);
    safetyStatusIcon.className = 'w-3 h-3 text-amber-400';
    overBudgetBanner.classList.add('hidden');
    budgetWidget.classList.remove('animate-pulse-danger', 'border-red-500');
  } else if (percentage < 100) {
    // Stage 3: Kritis (Oranye Tua)
    budgetProgressBar.className = 'h-full rounded-full transition-all duration-500 bg-orange-500 shadow-sm';
    budgetSafetyBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/40';
    budgetSafetyText.textContent = `Kritis! (${percentage}%)`;
    budgetRemainingText.className = 'font-bold font-mono text-orange-400';
    budgetRemainingText.textContent = formatRupiah(remaining);
    safetyStatusIcon.className = 'w-3 h-3 text-orange-400';
    overBudgetBanner.classList.add('hidden');
    budgetWidget.classList.remove('animate-pulse-danger', 'border-red-500');
  } else {
    // Stage 4: DANGER / OVER BUDGET (Merah Menyala Pulsa)
    budgetProgressBar.className = 'h-full rounded-full transition-all duration-500 bg-red-600 shadow-md shadow-red-500/50';
    budgetSafetyBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
    budgetSafetyText.textContent = `OVER BUDGET! (${percentage}%)`;
    budgetRemainingText.className = 'font-bold font-mono text-red-400';
    budgetRemainingText.textContent = `-Rp ${formatNumber(Math.abs(remaining))}`;
    safetyStatusIcon.className = 'w-3 h-3 text-red-400';

    // Show Alarm Banner
    overBudgetBanner.classList.remove('hidden');
    overBudgetDiffText.textContent = `Melebihi jatah ${formatRupiah(Math.abs(remaining))}. Hapus beberapa barang opsional!`;
    budgetWidget.classList.add('animate-pulse-danger', 'border-red-500');

    // Trigger Warning Sound
    sounds.playWarning();
  }

  // Update Cart Counter & Savings
  const totalItemsCount = document.getElementById('totalItemsCount');
  const totalSavingsAmount = document.getElementById('totalSavingsAmount');
  const navCartBadge = document.getElementById('navCartBadge');

  const countItems = state.cart.reduce((cnt, item) => cnt + item.qty, 0);
  if (totalItemsCount) totalItemsCount.textContent = `${countItems} item (${state.cart.length} produk)`;
  if (totalSavingsAmount) totalSavingsAmount.textContent = formatRupiah(totalSavings);
  if (navCartBadge) navCartBadge.textContent = countItems;

  // Category counts
  updateCategoryCounters();
}

function updateCategoryCounters() {
  const counts = { ALL: state.cart.length, Sembako: 0, 'Makanan Instan': 0, 'Daging & Sayur': 0, Toiletries: 0, 'Bumbu & Minyak': 0, Lainnya: 0 };
  state.cart.forEach(item => {
    if (counts[item.category] !== undefined) {
      counts[item.category]++;
    } else {
      counts['Lainnya']++;
    }
  });

  const map = {
    catCountAll: counts.ALL,
    catCountSembako: counts.Sembako,
    catCountInstan: counts['Makanan Instan'],
    catCountFresh: counts['Daging & Sayur'],
    catCountToiletries: counts.Toiletries,
    catCountBumbu: counts['Bumbu & Minyak'],
    catCountLainnya: counts.Lainnya
  };

  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

// =============================================================================
// 7. UI RENDERER: CART ITEMS (F-01, F-02, F-04 LIST)
// =============================================================================
function renderCartItems() {
  const container = document.getElementById('cartItemList');
  const emptyView = document.getElementById('emptyCartView');
  const actionFooter = document.getElementById('cartActionFooter');

  if (!container) return;

  const filteredCart = state.cart.filter(item => {
    if (state.activeCategoryFilter === 'ALL') return true;
    return item.category === state.activeCategoryFilter;
  });

  if (state.cart.length === 0) {
    container.innerHTML = '';
    emptyView.classList.remove('hidden');
    actionFooter.classList.add('hidden');
    return;
  }

  emptyView.classList.add('hidden');
  actionFooter.classList.remove('hidden');

  if (filteredCart.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-500 text-xs">
        Tidak ada barang di kategori <b>${state.activeCategoryFilter}</b>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredCart.map((item) => {
    // Comparison data realtime
    const comp = comparePriceWithBenchmark(item.name, item.price);
    
    // Icon category emoji
    const catIcons = {
      'Sembako': '🌾',
      'Makanan Instan': '🍜',
      'Daging & Sayur': '🥩',
      'Toiletries': '🧼',
      'Bumbu & Minyak': '🧂',
      'Minuman': '🧃',
      'Camilan': '🍪',
      'Lainnya': '📦'
    };
    const catIcon = catIcons[item.category] || '📦';

    // Discount badge
    let discountBadgeHtml = '';
    if (item.discount && item.discount.mode !== 'none') {
      discountBadgeHtml = `
        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Diskon ${item.effectivePercent}% (-Rp ${formatNumber(item.totalSaved)})
        </span>
      `;
    }

    return `
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md hover:border-slate-700/80 transition-all flex flex-col space-y-2" data-item-id="${item.id}">
        <!-- Top Row: Name, Category, Action Delete -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span class="text-xs">${catIcon}</span>
              <span class="text-[10px] font-semibold text-slate-400">${item.category}</span>
              ${discountBadgeHtml}
            </div>
            <h4 class="text-xs font-bold text-white tracking-tight truncate">${item.name}</h4>
          </div>
          
          <div class="flex items-center gap-1 shrink-0">
            <button class="btn-edit-item p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95" data-id="${item.id}" title="Edit Item">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button class="btn-delete-item p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 transition active:scale-95" data-id="${item.id}" title="Hapus">
              <i data-lucide="trash" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- F-04: Realtime Comparator Badge Row -->
        <div class="flex items-center justify-between px-2 py-1 rounded-lg border ${comp.colorClass} text-[10px]">
          <div class="flex items-center gap-1 font-bold">
            <span class="w-3.5 h-3.5 rounded flex items-center justify-center font-extrabold text-xs">${comp.symbol}</span>
            <span>${comp.label}</span>
          </div>
          <div class="text-[9px] opacity-80 font-mono">
            ${comp.refPrice ? `Bln Lalu: Rp ${formatNumber(comp.refPrice)}` : 'Item Baru'}
          </div>
        </div>

        <!-- Price & Qty Stepper Row (Thumb Ergonomics) -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <!-- Pricing Breakdown -->
          <div>
            <div class="text-[10px] text-slate-400 font-mono">
              ${item.qty} × ${formatRupiah(item.unitFinal)} / ${item.unit}
              ${item.price !== item.unitFinal ? `<s class="text-slate-600 ml-1">Rp ${formatNumber(item.price)}</s>` : ''}
            </div>
            <div class="text-sm font-extrabold text-emerald-400 font-mono">
              ${formatRupiah(item.subtotal)}
            </div>
          </div>

          <!-- Fast Stepper Component -->
          <div class="flex items-center gap-1.5 bg-slate-950 px-1 py-0.5 rounded-xl border border-slate-800">
            <button class="btn-step-minus w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-sm flex items-center justify-center active:scale-90 transition" data-id="${item.id}">
              -
            </button>
            <span class="w-7 text-center font-bold text-xs font-mono text-white">${item.qty}</span>
            <button class="btn-step-plus w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-sm flex items-center justify-center active:scale-90 transition" data-id="${item.id}">
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Attach Stepper & Action Listeners
  attachCartListeners();
}

function attachCartListeners() {
  document.querySelectorAll('.btn-step-plus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      updateItemQty(id, 1);
    };
  });

  document.querySelectorAll('.btn-step-minus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      updateItemQty(id, -1);
    };
  });

  document.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      deleteCartItem(id);
    };
  });

  document.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      openEditModal(id);
    };
  });
}

function updateItemQty(id, delta) {
  const item = state.cart.find(x => x.id === id);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    deleteCartItem(id);
    return;
  }

  item.qty = newQty;
  // Recalculate
  const calc = calculateItemPricing(item.price, item.qty, item.discount);
  Object.assign(item, calc);

  state.saveCart();
  sounds.playPop();
  renderBudgetSafety();
  renderCartItems();
}

function deleteCartItem(id) {
  const item = state.cart.find(x => x.id === id);
  const name = item ? item.name : 'Barang';
  state.cart = state.cart.filter(x => x.id !== id);
  state.saveCart();
  sounds.playPop();
  renderBudgetSafety();
  renderCartItems();
  showToast(`${name} dihapus dari troli`);
}

// =============================================================================
// 8. FORM MODAL CONTROLLER (F-01, F-02, F-03, F-04)
// =============================================================================
const modalBackdrop = document.getElementById('itemModalBackdrop');
const itemForm = document.getElementById('itemForm');
const inputItemName = document.getElementById('inputItemName');
const inputItemCategory = document.getElementById('inputItemCategory');
const inputItemUnit = document.getElementById('inputItemUnit');
const inputItemQty = document.getElementById('inputItemQty');
const inputItemPrice = document.getElementById('inputItemPrice');
const editItemId = document.getElementById('editItemId');

// Discount UI Elements
let currentDiscountMode = 'none';
const discSingleBox = document.getElementById('discSingleBox');
const discTierBox = document.getElementById('discTierBox');
const discNominalBox = document.getElementById('discNominalBox');
const inputDiscSingle = document.getElementById('inputDiscSingle');
const inputDiscTier1 = document.getElementById('inputDiscTier1');
const inputDiscTier2 = document.getElementById('inputDiscTier2');
const inputDiscNominal = document.getElementById('inputDiscNominal');
const discountExplanation = document.getElementById('discountExplanation');

// Suggestions & Live Preview Elements
const suggestionsBox = document.getElementById('suggestionsBox');
const compIcon = document.getElementById('compIcon');
const compText = document.getElementById('compText');
const compRefPrice = document.getElementById('compRefPrice');
const compAnalysisNote = document.getElementById('compAnalysisNote');
const comparatorBadgeContainer = document.getElementById('comparatorBadgeContainer');
const formCalculationDetail = document.getElementById('formCalculationDetail');
const formFinalRowTotal = document.getElementById('formFinalRowTotal');
const formSavingBadge = document.getElementById('formSavingBadge');

function openAddModal() {
  editItemId.value = '';
  document.getElementById('modalTitle').textContent = 'Tambah Item Belanja';
  document.getElementById('saveBtnText').textContent = 'Masukkan ke Troli';
  
  // Reset Form
  itemForm.reset();
  inputItemQty.value = 1;
  inputItemPrice.value = '';
  setDiscountMode('none');

  modalBackdrop.classList.remove('hidden');
  updateModalLivePreview();
  setTimeout(() => inputItemName.focus(), 100);
}

function openEditModal(id) {
  const item = state.cart.find(x => x.id === id);
  if (!item) return;

  editItemId.value = item.id;
  document.getElementById('modalTitle').textContent = 'Edit Item Belanja';
  document.getElementById('saveBtnText').textContent = 'Simpan Perubahan';

  inputItemName.value = item.name;
  inputItemCategory.value = item.category;
  inputItemUnit.value = item.unit;
  inputItemQty.value = item.qty;
  inputItemPrice.value = item.price;

  // Set discount mode
  const mode = item.discount?.mode || 'none';
  setDiscountMode(mode);
  if (mode === 'single') inputDiscSingle.value = item.discount.singlePercent || 0;
  if (mode === 'tier') {
    inputDiscTier1.value = item.discount.tier1 || 50;
    inputDiscTier2.value = item.discount.tier2 || 20;
  }
  if (mode === 'nominal') inputDiscNominal.value = item.discount.nominalAmount || 0;

  modalBackdrop.classList.remove('hidden');
  updateModalLivePreview();
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  suggestionsBox.classList.add('hidden');
}

function setDiscountMode(mode) {
  currentDiscountMode = mode;
  document.querySelectorAll('.disc-mode-btn').forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.className = 'disc-mode-btn active py-1 rounded-lg text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
    } else {
      btn.className = 'disc-mode-btn py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700';
    }
  });

  discSingleBox.classList.toggle('hidden', mode !== 'single');
  discTierBox.classList.toggle('hidden', mode !== 'tier');
  discNominalBox.classList.toggle('hidden', mode !== 'nominal');

  updateModalLivePreview();
}

function getDiscountStateFromForm() {
  return {
    mode: currentDiscountMode,
    singlePercent: Number(inputDiscSingle.value) || 0,
    tier1: Number(inputDiscTier1.value) || 0,
    tier2: Number(inputDiscTier2.value) || 0,
    nominalAmount: Number(inputDiscNominal.value) || 0
  };
}

/**
 * F-02 & F-04: Realtime calculations in the modal bottom sheet
 */
function updateModalLivePreview() {
  const price = Number(inputItemPrice.value) || 0;
  const qty = Number(inputItemQty.value) || 1;
  const discountState = getDiscountStateFromForm();
  const name = inputItemName.value.trim();

  // 1. Math Calculation (F-02 & F-03)
  const calc = calculateItemPricing(price, qty, discountState);

  formCalculationDetail.textContent = `${calc.quantity} × Rp ${formatNumber(calc.unitFinal)} (${inputItemUnit.value})`;
  formFinalRowTotal.textContent = formatRupiah(calc.subtotal);

  if (calc.totalSaved > 0) {
    formSavingBadge.classList.remove('hidden');
    formSavingBadge.textContent = `Hemat Total: ${formatRupiah(calc.totalSaved)}`;
    discountExplanation.classList.remove('hidden');
    discountExplanation.textContent = calc.mathExplanation;
  } else {
    formSavingBadge.classList.add('hidden');
    discountExplanation.classList.add('hidden');
  }

  // 2. Realtime Comparator Preview (F-04)
  const comp = comparePriceWithBenchmark(name, price);
  compIcon.textContent = comp.symbol;
  compText.textContent = comp.label;
  comparatorBadgeContainer.className = `mt-2 p-2 rounded-xl border transition-all ${comp.colorClass}`;

  if (comp.refPrice) {
    compRefPrice.textContent = `Bln Lalu: Rp ${formatNumber(comp.refPrice)}`;
    compAnalysisNote.classList.remove('hidden');
    compAnalysisNote.textContent = comp.desc;
  } else {
    compRefPrice.textContent = 'Bln Lalu: -';
    compAnalysisNote.classList.add('hidden');
  }
}

// Auto-suggestions logic for Product Name
function handleNameInputSuggestions() {
  const query = inputItemName.value.trim().toLowerCase();
  if (query.length < 1) {
    suggestionsBox.classList.add('hidden');
    updateModalLivePreview();
    return;
  }

  const matches = Object.entries(state.benchmarks).filter(([key, val]) => {
    return key.includes(query) || val.name.toLowerCase().includes(query);
  }).slice(0, 5);

  if (matches.length === 0) {
    suggestionsBox.classList.add('hidden');
    updateModalLivePreview();
    return;
  }

  suggestionsBox.innerHTML = matches.map(([_, item]) => `
    <button type="button" class="w-full text-left px-3 py-2 border-b border-slate-800 hover:bg-slate-800/90 flex items-center justify-between text-xs transition" data-name="${item.name}" data-cat="${item.category}" data-unit="${item.unit}" data-price="${item.price}">
      <div>
        <span class="font-bold text-slate-100 block">${item.name}</span>
        <span class="text-[10px] text-slate-400">${item.category} &bull; ${item.unit}</span>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-400 block">Bln Lalu</span>
        <span class="font-mono font-bold text-sky-400 text-xs">Rp ${formatNumber(item.price)}</span>
      </div>
    </button>
  `).join('');

  suggestionsBox.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      inputItemName.value = btn.getAttribute('data-name');
      inputItemCategory.value = btn.getAttribute('data-cat');
      inputItemUnit.value = btn.getAttribute('data-unit');
      if (!inputItemPrice.value) {
        inputItemPrice.value = btn.getAttribute('data-price');
      }
      suggestionsBox.classList.add('hidden');
      updateModalLivePreview();
    };
  });

  suggestionsBox.classList.remove('hidden');
  updateModalLivePreview();
}

// Save or Update Item into Cart
function handleSaveItem() {
  const name = inputItemName.value.trim();
  const price = Number(inputItemPrice.value) || 0;
  const qty = Number(inputItemQty.value) || 1;
  const category = inputItemCategory.value;
  const unit = inputItemUnit.value;
  const discount = getDiscountStateFromForm();

  if (!name) {
    showToast('Nama produk wajib diisi!', 'alert');
    inputItemName.focus();
    return;
  }

  const calc = calculateItemPricing(price, qty, discount);

  const existingId = editItemId.value;
  if (existingId) {
    // Edit existing
    const item = state.cart.find(x => x.id === existingId);
    if (item) {
      Object.assign(item, {
        name,
        category,
        unit,
        price,
        qty,
        discount,
        ...calc
      });
      showToast(`Item "${name}" diperbarui`);
    }
  } else {
    // Add new
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name,
      category,
      unit,
      price,
      qty,
      discount,
      ...calc,
      addedAt: new Date().toISOString()
    };
    state.cart.unshift(newItem);
    showToast(`"${name}" masuk ke troli`);
  }

  state.saveCart();
  sounds.playPop();
  closeModal();
  renderBudgetSafety();
  renderCartItems();
}

// =============================================================================
// 9. RIWAYAT & DATABASE BELANJA (F-06)
// =============================================================================
function checkoutCartToHistory() {
  if (state.cart.length === 0) {
    showToast('Troli belanja masih kosong!', 'alert');
    return;
  }

  const totalSpent = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalSaved = state.cart.reduce((sum, item) => sum + item.totalSaved, 0);
  const itemCount = state.cart.reduce((sum, item) => sum + item.qty, 0);

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // 1. Create Trip Record
  const trip = {
    id: 'trip_' + Date.now(),
    date: dateStr,
    time: timeStr,
    timestamp: now.toISOString(),
    storeName: 'Supermarket Bulanan',
    totalSpent,
    totalSaved,
    itemCount,
    budgetLimit: state.budgetLimit,
    status: totalSpent <= state.budgetLimit ? 'Hemat & Sesuai Budget' : 'Melebihi Limit Anggaran',
    items: JSON.parse(JSON.stringify(state.cart))
  };

  // 2. F-06: Perbarui Database Pembanding Bulan Lalu Otomatis!
  state.cart.forEach(item => {
    const normKey = item.name.trim().toLowerCase();
    state.benchmarks[normKey] = {
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: item.price, // update harga normal terakhir sebagai patokan
      lastUpdated: now.toISOString()
    };
  });
  state.saveBenchmarks();

  // 3. Save Trip to History
  state.history.unshift(trip);
  state.saveHistory();

  // 4. Empty Cart
  state.cart = [];
  state.saveCart();

  sounds.playSuccess();
  showToast('Belanja selesai! Tersimpan ke riwayat.');
  renderBudgetSafety();
  renderCartItems();
  renderHistoryView();

  // Show digital receipt right away!
  showReceiptModal(trip);
}

function renderHistoryView() {
  const container = document.getElementById('historyListContainer');
  const emptyView = document.getElementById('emptyHistoryView');
  const countBadge = document.getElementById('historyTripCount');
  const totalSpendEl = document.getElementById('historyTotalSpend');
  const benchmarkCountEl = document.getElementById('historyBenchmarkCount');

  if (!container) return;

  const totalTrips = state.history.length;
  countBadge.textContent = `${totalTrips} Transaksi`;

  const totalSpentAll = state.history.reduce((sum, t) => sum + t.totalSpent, 0);
  totalSpendEl.textContent = formatRupiah(totalSpentAll);

  const benchmarkTotal = Object.keys(state.benchmarks).length;
  benchmarkCountEl.textContent = `${benchmarkTotal} Produk`;

  if (totalTrips === 0) {
    container.innerHTML = '';
    emptyView.classList.remove('hidden');
    return;
  }

  emptyView.classList.add('hidden');

  container.innerHTML = state.history.map(trip => {
    const isOver = trip.totalSpent > trip.budgetLimit;
    const badgeColor = isOver ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

    return `
      <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col space-y-2.5">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-white">${trip.storeName}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold border ${badgeColor}">
                ${isOver ? 'Over Budget' : 'Aman'}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5">${trip.date} &bull; ${trip.time || ''} &bull; ${trip.itemCount} Item</p>
          </div>
          <div class="text-right">
            <span class="text-sm font-extrabold text-emerald-400 font-mono block">${formatRupiah(trip.totalSpent)}</span>
            ${trip.totalSaved > 0 ? `<span class="text-[9px] text-amber-400 font-mono">Hemat: ${formatRupiah(trip.totalSaved)}</span>` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-slate-800/70 text-xs">
          <button class="btn-view-receipt text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 active:scale-95 transition" data-id="${trip.id}">
            <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
            <span>Lihat Struk Digital</span>
          </button>
          <button class="btn-delete-trip text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5 active:scale-95 transition" data-id="${trip.id}">
            <i data-lucide="trash-2" class="w-3 h-3"></i>
            <span>Hapus</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Attach trip actions
  container.querySelectorAll('.btn-view-receipt').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const trip = state.history.find(t => t.id === id);
      if (trip) showReceiptModal(trip);
    };
  });

  container.querySelectorAll('.btn-delete-trip').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Hapus transaksi ini dari riwayat?')) {
        state.history = state.history.filter(t => t.id !== id);
        state.saveHistory();
        renderHistoryView();
        showToast('Transaksi dihapus');
      }
    };
  });
}

function showReceiptModal(trip) {
  const modal = document.getElementById('receiptModalBackdrop');
  const content = document.getElementById('receiptContent');

  if (!modal || !content) return;

  window.activeReceiptTrip = trip;

  content.innerHTML = `
    <!-- Receipt Header -->
    <div class="text-center pb-2 border-b border-dashed border-slate-700">
      <h4 class="font-extrabold text-white text-sm">SMART GROCERY RECEIPT</h4>
      <p class="text-[10px] text-slate-400 font-mono">${trip.date} • ${trip.time || ''}</p>
      <p class="text-[10px] text-slate-400">${trip.storeName}</p>
    </div>

    <!-- Items List -->
    <div class="space-y-1.5 max-h-56 overflow-y-auto scrollbar-none pr-1">
      ${trip.items.map(it => `
        <div class="flex items-start justify-between text-[11px] leading-tight">
          <div class="flex-1 pr-2">
            <span class="font-bold text-slate-200 block">${it.name}</span>
            <span class="text-[10px] text-slate-400 font-mono">${it.qty} × Rp ${formatNumber(it.unitFinal)}</span>
          </div>
          <div class="text-right font-mono font-bold text-slate-200">
            Rp ${formatNumber(it.subtotal)}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Receipt Totals -->
    <div class="pt-2 border-t border-dashed border-slate-700 space-y-1 font-mono text-[11px]">
      <div class="flex justify-between text-slate-400">
        <span>Total Barang:</span>
        <span>${trip.itemCount} pcs</span>
      </div>
      ${trip.totalSaved > 0 ? `
        <div class="flex justify-between text-amber-400">
          <span>Hemat Diskon:</span>
          <span>-Rp ${formatNumber(trip.totalSaved)}</span>
        </div>
      ` : ''}
      <div class="flex justify-between text-sm font-extrabold text-emerald-400 pt-1 border-t border-slate-800">
        <span>TOTAL BELANJA:</span>
        <span>${formatRupiah(trip.totalSpent)}</span>
      </div>
      <div class="flex justify-between text-[10px] text-slate-400">
        <span>Limit Anggaran:</span>
        <span>${formatRupiah(trip.budgetLimit)}</span>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function copyReceiptToClipboard() {
  const trip = window.activeReceiptTrip;
  if (!trip) return;

  let text = `🛒 STRUK BELANJA BULANAN - SMART GROCERY\n`;
  text += `📅 ${trip.date} ${trip.time || ''}\n`;
  text += `🏪 ${trip.storeName}\n`;
  text += `--------------------------------\n`;
  trip.items.forEach(it => {
    text += `• ${it.name}\n  ${it.qty} × Rp ${formatNumber(it.unitFinal)} = Rp ${formatNumber(it.subtotal)}\n`;
  });
  text += `--------------------------------\n`;
  if (trip.totalSaved > 0) text += `💰 Hemat Diskon: Rp ${formatNumber(trip.totalSaved)}\n`;
  text += `💵 TOTAL: ${formatRupiah(trip.totalSpent)}\n`;
  text += `🛡️ Limit Budget: ${formatRupiah(trip.budgetLimit)}\n`;
  text += `Catatan otomatis dari Smart Grocery & Budget Tracker PWA`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Struk tersalin ke clipboard!');
  }).catch(() => {
    showToast('Gagal menyalin struk', 'alert');
  });
}

// =============================================================================
// 10. ANGGARAN & BENCHMARK CATALOG VIEW (TAB 3)
// =============================================================================
function renderBenchmarkCatalog(filterText = '') {
  const container = document.getElementById('benchmarkListPreview');
  const countEl = document.getElementById('benchmarkItemCount');
  if (!container) return;

  const entries = Object.entries(state.benchmarks);
  if (countEl) countEl.textContent = `${entries.length} Produk`;

  const filtered = entries.filter(([key, item]) => {
    if (!filterText) return true;
    return key.includes(filterText.toLowerCase()) || item.name.toLowerCase().includes(filterText.toLowerCase());
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-slate-500 text-xs">
        Tidak ditemukan produk pembanding
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(([_, item]) => `
    <div class="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
      <div>
        <span class="font-bold text-slate-200 block">${item.name}</span>
        <span class="text-[10px] text-slate-500">${item.category} &bull; per ${item.unit}</span>
      </div>
      <div class="text-right">
        <span class="font-mono font-bold text-sky-400 text-xs">Rp ${formatNumber(item.price)}</span>
      </div>
    </div>
  `).join('');
}

// Preload Realistic Seed Data
function loadSampleData() {
  state.budgetLimit = 800000;
  state.benchmarks = { ...PRESET_BENCHMARK_ITEMS };
  state.saveBenchmarks();
  state.saveBudgetLimit(800000);

  // Preload Sample Cart with dynamic pricing calculation
  state.cart = PRESET_SAMPLE_CART.map((raw, idx) => {
    const calc = calculateItemPricing(raw.price, raw.qty, raw.discount);
    return {
      id: 'sample_' + idx + '_' + Date.now(),
      ...raw,
      ...calc,
      addedAt: new Date().toISOString()
    };
  });
  state.saveCart();

  // Preload Sample Past History Trip (Bulan Lalu)
  const lastMonthTrip = {
    id: 'sample_past_trip_01',
    date: '10 Sep 2026',
    time: '14:20',
    timestamp: '2026-09-10T14:20:00.000Z',
    storeName: 'Super Indo Mahasiswa',
    totalSpent: 735000,
    totalSaved: 42000,
    itemCount: 22,
    budgetLimit: 800000,
    status: 'Hemat & Sesuai Budget',
    items: [
      { name: 'Beras Ramos 5kg', qty: 1, unit: 'pack', unitFinal: 72000, subtotal: 72000 },
      { name: 'Minyak Goreng Sania 2L', qty: 1, unit: 'liter', unitFinal: 34500, subtotal: 34500 },
      { name: 'Indomie Goreng', qty: 20, unit: 'bungkus', unitFinal: 3100, subtotal: 62000 },
      { name: 'Telur Ayam 1kg', qty: 2, unit: 'kg', unitFinal: 28000, subtotal: 56000 }
    ]
  };
  state.history = [lastMonthTrip];
  state.saveHistory();

  sounds.playSuccess();
  showToast('Contoh data belanja anak rantau dimuat!');
  renderBudgetSafety();
  renderCartItems();
  renderHistoryView();
  renderBenchmarkCatalog();

  const budgetInput = document.getElementById('budgetLimitInput');
  if (budgetInput) budgetInput.value = state.budgetLimit;
}

// Reset All Data
function resetAllData() {
  if (confirm('Apakah Anda yakin ingin menghapus semua data keranjang, riwayat, dan patokan harga?')) {
    state.cart = [];
    state.history = [];
    state.benchmarks = { ...PRESET_BENCHMARK_ITEMS };
    state.budgetLimit = DEFAULT_BUDGET_LIMIT;
    state.saveCart();
    state.saveHistory();
    state.saveBenchmarks();
    state.saveBudgetLimit(DEFAULT_BUDGET_LIMIT);

    showToast('Semua data berhasil direset!');
    renderBudgetSafety();
    renderCartItems();
    renderHistoryView();
    renderBenchmarkCatalog();

    const budgetInput = document.getElementById('budgetLimitInput');
    if (budgetInput) budgetInput.value = DEFAULT_BUDGET_LIMIT;
  }
}

// Export Data to JSON
function exportDataJSON() {
  const exportPayload = {
    budgetLimit: state.budgetLimit,
    cart: state.cart,
    history: state.history,
    benchmarks: state.benchmarks,
    exportedAt: new Date().toISOString()
  };

  const text = JSON.stringify(exportPayload, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Backup JSON tersalin ke clipboard!');
  }).catch(() => {
    showToast('Gagal menyalin backup', 'alert');
  });
}

// =============================================================================
// 11. NAVIGATION TABS CONTROLLER (Bottom Navigation Bar)
// =============================================================================
function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const sections = document.querySelectorAll('.tab-content');
  const fab = document.getElementById('fabContainer');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      // Update Section Visibility
      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      // Update Tab Styles
      tabs.forEach(t => {
        if (t === tab) {
          t.className = 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-emerald-400 font-bold active:scale-95 transition relative';
        } else {
          t.className = 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-slate-400 hover:text-slate-200 font-medium active:scale-95 transition relative';
        }
      });

      // Only show FAB on Belanja tab
      if (fab) {
        if (targetId === 'tab-belanja') {
          fab.classList.remove('hidden');
        } else {
          fab.classList.add('hidden');
        }
      }

      sounds.playPop();

      // Refresh specific views
      if (targetId === 'tab-riwayat') renderHistoryView();
      if (targetId === 'tab-anggaran') {
        renderBenchmarkCatalog();
        const budgetInput = document.getElementById('budgetLimitInput');
        if (budgetInput) budgetInput.value = state.budgetLimit;
      }
    });
  });
}

// =============================================================================
// 12. INITIALIZATION & EVENT LISTENERS BINDING
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Setup Month Display
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    const d = new Date();
    dateEl.textContent = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  }

  // Setup Nav Tabs
  setupNavigationTabs();

  // Category Filter Pills
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => {
        p.className = 'cat-pill px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition active:scale-95';
      });
      pill.className = 'cat-pill active px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-emerald-600 text-white shadow-md shadow-emerald-900/30 transition active:scale-95';

      state.activeCategoryFilter = pill.getAttribute('data-category');
      sounds.playPop();
      renderCartItems();
    });
  });

  // Modal Open & Close Events
  document.getElementById('openAddModalBtn')?.addEventListener('click', openAddModal);
  document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);

  // Stepper buttons inside modal
  document.getElementById('btnQtyMinus')?.addEventListener('click', () => {
    const val = Math.max(1, (Number(inputItemQty.value) || 1) - 1);
    inputItemQty.value = val;
    updateModalLivePreview();
  });
  document.getElementById('btnQtyPlus')?.addEventListener('click', () => {
    const val = (Number(inputItemQty.value) || 1) + 1;
    inputItemQty.value = val;
    updateModalLivePreview();
  });

  // Quick Qty Presets inside modal
  document.querySelectorAll('.qty-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const add = Number(btn.getAttribute('data-add')) || 1;
      inputItemQty.value = (Number(inputItemQty.value) || 0) + add;
      updateModalLivePreview();
    });
  });

  // Realtime Live Calculation Listeners inside modal
  inputItemName.addEventListener('input', handleNameInputSuggestions);
  inputItemCategory.addEventListener('change', updateModalLivePreview);
  inputItemUnit.addEventListener('change', updateModalLivePreview);
  inputItemQty.addEventListener('input', updateModalLivePreview);
  inputItemPrice.addEventListener('input', updateModalLivePreview);

  // Discount Mode Switchers inside modal
  document.querySelectorAll('.disc-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setDiscountMode(mode);
    });
  });

  // Discount Quick Preset Buttons
  document.querySelectorAll('.disc-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inputDiscSingle.value = btn.getAttribute('data-val');
      updateModalLivePreview();
    });
  });

  document.querySelectorAll('.tier-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inputDiscTier1.value = btn.getAttribute('data-t1');
      inputDiscTier2.value = btn.getAttribute('data-t2');
      updateModalLivePreview();
    });
  });

  inputDiscSingle.addEventListener('input', updateModalLivePreview);
  inputDiscTier1.addEventListener('input', updateModalLivePreview);
  inputDiscTier2.addEventListener('input', updateModalLivePreview);
  inputDiscNominal.addEventListener('input', updateModalLivePreview);

  // Save Item Button
  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveItem();
  });

  // Cart Actions
  document.getElementById('checkoutTripBtn')?.addEventListener('click', checkoutCartToHistory);
  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua barang di troli?')) {
      state.cart = [];
      state.saveCart();
      sounds.playPop();
      renderBudgetSafety();
      renderCartItems();
      showToast('Troli dikosongkan');
    }
  });

  // Receipt Modal actions
  document.getElementById('closeReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptModalBackdrop').classList.add('hidden');
  });
  document.getElementById('dismissReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptModalBackdrop').classList.add('hidden');
  });
  document.getElementById('copyReceiptTextBtn')?.addEventListener('click', copyReceiptToClipboard);

  // Help & Info Modal
  document.getElementById('quickHelpBtn')?.addEventListener('click', () => {
    document.getElementById('helpModalBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeHelpBtn')?.addEventListener('click', () => {
    document.getElementById('helpModalBackdrop').classList.add('hidden');
  });
  document.getElementById('dismissHelpBtn')?.addEventListener('click', () => {
    document.getElementById('helpModalBackdrop').classList.add('hidden');
  });

  // Audio Toggle
  const toggleSoundBtn = document.getElementById('toggleSoundBtn');
  const soundIcon = document.getElementById('soundIcon');
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', () => {
      const enabled = state.toggleSound();
      soundIcon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
      if (window.lucide) lucide.createIcons();
      showToast(enabled ? 'Suara diaktifkan' : 'Suara dimatikan');
    });
  }

  // Budget Presets
  document.querySelectorAll('.budget-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = Number(btn.getAttribute('data-amount')) || 800000;
      const budgetInput = document.getElementById('budgetLimitInput');
      if (budgetInput) budgetInput.value = amt;
    });
  });

  document.getElementById('saveBudgetLimitBtn')?.addEventListener('click', () => {
    const budgetInput = document.getElementById('budgetLimitInput');
    const amt = Number(budgetInput.value) || DEFAULT_BUDGET_LIMIT;
    state.saveBudgetLimit(amt);
    sounds.playPop();
    renderBudgetSafety();
    showToast(`Limit anggaran diubah ke ${formatRupiah(amt)}`);
  });

  // Benchmark search
  document.getElementById('benchmarkSearchInput')?.addEventListener('input', (e) => {
    renderBenchmarkCatalog(e.target.value);
  });

  // Preset Preload and Reset buttons
  document.getElementById('loadPresetDataBtn')?.addEventListener('click', loadSampleData);
  document.getElementById('btnLoadSampleAll')?.addEventListener('click', loadSampleData);
  document.getElementById('btnExportData')?.addEventListener('click', exportDataJSON);
  document.getElementById('btnResetAll')?.addEventListener('click', resetAllData);

  // Setup Firebase Cloud Sync UI & Listeners
  setupFirebaseUI();

  // Initial Load: If fresh, auto-load realistic sample data so user immediately sees comparator in action!
  if (state.cart.length === 0 && state.history.length === 0) {
    loadSampleData();
  } else {
    renderBudgetSafety();
    renderCartItems();
    renderHistoryView();
    renderBenchmarkCatalog();
  }

  // Lucide Icons Render
  if (window.lucide) {
    lucide.createIcons();
  }
});

// =============================================================================
// 13. FIREBASE REALTIME SHARED CLOUD UI & LISTENERS
// =============================================================================
function setupFirebaseUI() {
  const cloudStatusDot = document.getElementById('cloudStatusDot');
  const cloudStatusText = document.getElementById('cloudStatusText');
  const firebaseStatusBadge = document.getElementById('firebaseStatusBadge');
  const btnPushToCloud = document.getElementById('btnPushToCloud');
  const btnPullFromCloud = document.getElementById('btnPullFromCloud');
  const cloudSyncHeaderBtn = document.getElementById('cloudSyncHeaderBtn');

  // 1. Status Connection Listener
  window.addEventListener('firebase-status-change', (e) => {
    const { status, message } = e.detail || {};

    if (cloudStatusDot && cloudStatusText) {
      if (status === 'connected') {
        cloudStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        cloudStatusText.textContent = 'Live Cloud';
        cloudStatusText.className = 'text-[10px] font-bold font-mono text-emerald-400';
      } else if (status === 'syncing') {
        cloudStatusDot.className = 'w-2 h-2 rounded-full bg-sky-400 animate-pulse';
        cloudStatusText.textContent = 'Syncing...';
        cloudStatusText.className = 'text-[10px] font-bold font-mono text-sky-400';
      } else if (status === 'offline') {
        cloudStatusDot.className = 'w-2 h-2 rounded-full bg-slate-500';
        cloudStatusText.textContent = 'Offline';
        cloudStatusText.className = 'text-[10px] font-bold font-mono text-slate-400';
      } else if (status === 'error') {
        cloudStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
        cloudStatusText.textContent = 'Lokal';
        cloudStatusText.className = 'text-[10px] font-bold font-mono text-amber-400';
      }
    }

    if (firebaseStatusBadge) {
      if (status === 'connected') {
        firebaseStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
        firebaseStatusBadge.textContent = 'Live Realtime ☁️';
      } else if (status === 'syncing') {
        firebaseStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 animate-pulse';
        firebaseStatusBadge.textContent = 'Menyinkronkan...';
      } else if (status === 'offline') {
        firebaseStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
        firebaseStatusBadge.textContent = 'Mode Offline';
      } else {
        firebaseStatusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40';
        firebaseStatusBadge.textContent = message || 'Mode Lokal';
      }
    }
  });

  // 2. ⚡ REALTIME LISTENER: Troli Belanja Aktif (Updated across all devices instantly!)
  window.addEventListener('cloud-cart-update', (e) => {
    const remoteItems = e.detail?.items;
    if (!Array.isArray(remoteItems)) return;

    const currentJson = JSON.stringify(state.cart);
    const remoteJson = JSON.stringify(remoteItems);

    if (currentJson !== remoteJson) {
      state.cart = remoteItems;
      localStorage.setItem('sg_cart_items', remoteJson);
      renderBudgetSafety();
      renderCartItems();
    }
  });

  // 3. ⚡ REALTIME LISTENER: Pengaturan Anggaran
  window.addEventListener('cloud-settings-update', (e) => {
    const remoteBudget = e.detail?.budgetLimit;
    if (remoteBudget && remoteBudget !== state.budgetLimit) {
      state.budgetLimit = Number(remoteBudget);
      localStorage.setItem('sg_budget_limit', state.budgetLimit);
      renderBudgetSafety();
      const budgetInput = document.getElementById('budgetLimitInput');
      if (budgetInput) budgetInput.value = state.budgetLimit;
    }
  });

  // 4. ⚡ REALTIME LISTENER: Patokan Harga Bulan Lalu
  window.addEventListener('cloud-benchmarks-update', (e) => {
    const remoteCatalog = e.detail?.catalog;
    if (remoteCatalog && typeof remoteCatalog === 'object') {
      const currentJson = JSON.stringify(state.benchmarks);
      const remoteJson = JSON.stringify(remoteCatalog);
      if (currentJson !== remoteJson) {
        state.benchmarks = remoteCatalog;
        localStorage.setItem('sg_benchmark_prices', remoteJson);
        renderBenchmarkCatalog();
        renderCartItems(); // Re-evaluate price comparison arrows
      }
    }
  });

  // 5. ⚡ REALTIME LISTENER: Riwayat Belanja
  window.addEventListener('cloud-history-update', (e) => {
    const remoteTrips = e.detail?.trips;
    if (Array.isArray(remoteTrips)) {
      const currentJson = JSON.stringify(state.history);
      const remoteJson = JSON.stringify(remoteTrips);
      if (currentJson !== remoteJson) {
        state.history = remoteTrips;
        localStorage.setItem('sg_history_trips', remoteJson);
        renderHistoryView();
      }
    }
  });

  // Header cloud pill -> Go to Anggaran/Cloud tab
  cloudSyncHeaderBtn?.addEventListener('click', () => {
    document.querySelector('.nav-tab-btn[data-target="tab-anggaran"]')?.click();
  });

  // Manual Push to Cloud (Paksa Upload Data Saat Ini)
  btnPushToCloud?.addEventListener('click', async () => {
    if (!window.FirebaseSync) {
      showToast('Firebase belum terhubung', 'alert');
      return;
    }
    showToast('Menyimpan ke 1 Cloud Bersama...');
    await window.FirebaseSync.syncCart(state.cart);
    await window.FirebaseSync.syncSettings({ budgetLimit: state.budgetLimit, soundEnabled: state.soundEnabled });
    await window.FirebaseSync.syncBenchmarks(state.benchmarks);
    await window.FirebaseSync.syncHistory(state.history);
    showToast('Tersimpan di Cloud untuk Semua Device! ☁️');
  });

  // Manual Pull from Cloud (Segarkan Data dari Cloud)
  btnPullFromCloud?.addEventListener('click', async () => {
    if (!window.FirebaseSync) {
      showToast('Firebase belum terhubung', 'alert');
      return;
    }
    showToast('Mengambil data terbaru dari Cloud...');
    const data = await window.FirebaseSync.pullAllSharedData();
    if (data && (data.cart || data.settings || data.benchmarks || data.history)) {
      if (data.cart) state.cart = data.cart;
      if (data.settings?.budgetLimit) state.budgetLimit = data.settings.budgetLimit;
      if (data.benchmarks) state.benchmarks = data.benchmarks;
      if (data.history) state.history = data.history;

      localStorage.setItem('sg_cart_items', JSON.stringify(state.cart));
      localStorage.setItem('sg_budget_limit', state.budgetLimit);
      localStorage.setItem('sg_benchmark_prices', JSON.stringify(state.benchmarks));
      localStorage.setItem('sg_history_trips', JSON.stringify(state.history));

      renderBudgetSafety();
      renderCartItems();
      renderHistoryView();
      renderBenchmarkCatalog();
      showToast('Data cloud berhasil diperbarui!');
    } else {
      showToast('Data cloud sudah sinkron.');
    }
  });
}
