/**
 * =============================================================================
 * SMART GROCERY & BUDGET SAFETY TRACKER (PWA & BENTO GRID)
 * Full-Stack JavaScript Application Engine
 * Fitur Lengkap: AI OCR Receipt, Dynamic Budget Safety, Emergency Freeze,
 * Local Deals Radar, Smart Pantry & Zero-Waste, Gamified XP & Badges.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. DATA PRESETS & SEED CONSTANTS
// -----------------------------------------------------------------------------
const DEFAULT_BUDGET_LIMIT = 800000; // Rp 800.000 pagu bulanan standar anak rantau

const PRESET_BENCHMARK_ITEMS = {
  "beras ramos 5kg": { name: "Beras Ramos 5kg", category: "Sembako", unit: "pack", price: 72000 },
  "indomie goreng": { name: "Indomie Goreng", category: "Makanan Instan", unit: "bungkus", price: 3100 },
  "indomie kuah ayam bawang": { name: "Indomie Kuah Ayam Bawang", category: "Makanan Instan", unit: "bungkus", price: 3000 },
  "minyak goreng sania 2l": { name: "Minyak Goreng Sania 2L", category: "Bumbu & Minyak", unit: "liter", price: 34500 },
  "telur ayam 1kg": { name: "Telur Ayam 1kg", category: "Daging & Sayur", unit: "kg", price: 28000 },
  "sabun lifebuoy total 10 400ml": { name: "Sabun Lifebuoy Total 10 400ml", category: "Toiletries", unit: "botol", price: 19500 },
  "susu uht ultra milk 1l": { name: "Susu UHT Ultra Milk 1L", category: "Minuman", unit: "liter", price: 18500 },
  "deterjen rinso 750g": { name: "Deterjen Rinso 750g", category: "Toiletries", unit: "pack", price: 21000 },
  "dada ayam fillet 500g": { name: "Dada Ayam Fillet 500g", category: "Daging & Sayur", unit: "pack", price: 29000 },
  "sayur sawi & wortel mix": { name: "Sayur Sawi & Wortel Mix", category: "Daging & Sayur", unit: "pack", price: 8000 },
  "biskuit roma kelapa 300g": { name: "Biskuit Roma Kelapa 300g", category: "Camilan", unit: "pack", price: 11000 }
};

const RETAILER_MULTIPLIERS = {
  "Indomaret": 1.0,
  "Alfamart": 1.02,
  "Hypermart": 0.96,
  "Pasar Tradisional": 0.88
};

// -----------------------------------------------------------------------------
// 2. STATE MANAGER (LOCALSTORAGE + FIREBASE SYNCHRONIZATION)
// -----------------------------------------------------------------------------
class AppState {
  constructor() {
    this.budgetLimit = Number(localStorage.getItem('sg_budget_limit')) || DEFAULT_BUDGET_LIMIT;
    this.cart = this.loadData('sg_cart_items', this.getInitialSampleCart());
    this.history = this.loadData('sg_history_trips', []);
    this.benchmarks = this.loadData('sg_benchmark_prices', PRESET_BENCHMARK_ITEMS);
    this.pantry = this.loadData('sg_pantry_items', this.getInitialPantryItems());
    this.isFrozen = localStorage.getItem('sg_emergency_freeze') === 'true';
    this.activeCategoryFilter = 'ALL';
    this.soundEnabled = localStorage.getItem('sg_sound_enabled') !== 'false';
    this.isDarkMode = localStorage.getItem('sg_theme') === 'dark';
    this.isBentoMode = localStorage.getItem('sg_layout_mode') === 'bento';
    this.xp = Number(localStorage.getItem('sg_user_xp')) || 620;
    this.level = Math.floor(this.xp / 200) + 1;
    this.stagedOcrItems = [];
    this.pendingImpulseItem = null;
  }

  getInitialSampleCart() {
    return [
      {
        id: 'cart_' + Date.now() + '_1',
        name: "Beras Ramos 5kg",
        category: "Sembako",
        unit: "pack",
        qty: 1,
        price: 74000,
        discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
      },
      {
        id: 'cart_' + Date.now() + '_2',
        name: "Indomie Goreng",
        category: "Makanan Instan",
        unit: "bungkus",
        qty: 10,
        price: 3100,
        discount: { mode: 'single', singlePercent: 10, tier1: 0, tier2: 0, nominalAmount: 0 }
      },
      {
        id: 'cart_' + Date.now() + '_3',
        name: "Minyak Goreng Sania 2L",
        category: "Bumbu & Minyak",
        unit: "liter",
        qty: 1,
        price: 33500,
        discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
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
      },
      {
        id: 'pantry_3',
        name: 'Telur Ayam 1kg',
        category: 'Daging & Sayur',
        unit: 'kg',
        qty: 1,
        purchasedDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        daysLeft: 9,
        isConsumed: false
      }
    ];
  }

  loadData(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Gagal memuat ${key}:`, e);
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

  saveBenchmarks() {
    localStorage.setItem('sg_benchmark_prices', JSON.stringify(this.benchmarks));
    if (window.FirebaseSync) window.FirebaseSync.syncBenchmarks(this.benchmarks);
  }

  savePantry() {
    localStorage.setItem('sg_pantry_items', JSON.stringify(this.pantry));
  }

  saveFreezeState() {
    localStorage.setItem('sg_emergency_freeze', this.isFrozen.toString());
  }

  addXp(amount, reason = '') {
    this.xp += amount;
    this.level = Math.floor(this.xp / 200) + 1;
    localStorage.setItem('sg_user_xp', this.xp.toString());
    showToast(`+${amount} XP! ${reason}`, 'sparkles');
    renderGamification();
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
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playSuccess() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
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
    osc.frequency.setValueAtTime(350, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

const sounds = new SoundEngine();

// -----------------------------------------------------------------------------
// 4. BUSINESS LOGIC & CALCULATION HELPERS
// -----------------------------------------------------------------------------
function calculateItemPricing(rawPrice, qty, discount) {
  const price = Number(rawPrice) || 0;
  const quantity = Math.max(1, Number(qty) || 1);
  const disc = discount || { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 };

  let finalUnitPrice = price;
  let unitSavings = 0;
  let explanation = '';

  if (disc.mode === 'single') {
    const p = Math.min(100, Math.max(0, Number(disc.singlePercent) || 0));
    unitSavings = price * (p / 100);
    finalUnitPrice = Math.max(0, price - unitSavings);
    explanation = `Diskon ${p}% (-Rp ${Math.round(unitSavings).toLocaleString('id-ID')}/unit)`;
  } else if (disc.mode === 'tier') {
    const t1 = Math.min(100, Math.max(0, Number(disc.tier1) || 0));
    const t2 = Math.min(100, Math.max(0, Number(disc.tier2) || 0));
    const priceAfterT1 = price * (1 - t1 / 100);
    finalUnitPrice = Math.max(0, priceAfterT1 * (1 - t2 / 100));
    unitSavings = price - finalUnitPrice;
    const effectivePercent = price > 0 ? Math.round((unitSavings / price) * 100) : 0;
    explanation = `Diskon Tier ${t1}% + ${t2}% = Efektif ${effectivePercent}% (Hemat Rp ${Math.round(unitSavings).toLocaleString('id-ID')}/unit)`;
  } else if (disc.mode === 'nominal') {
    const nom = Math.max(0, Number(disc.nominalAmount) || 0);
    finalUnitPrice = Math.max(0, price - nom);
    unitSavings = Math.min(price, nom);
    explanation = `Potongan langsung Rp ${Math.round(unitSavings).toLocaleString('id-ID')}/unit`;
  }

  const roundedUnitPrice = Math.round(finalUnitPrice);
  const rowTotal = roundedUnitPrice * quantity;
  const rowSavings = Math.round(unitSavings) * quantity;

  return {
    rawPrice: price,
    qty: quantity,
    finalUnitPrice: roundedUnitPrice,
    rowTotal,
    rowSavings,
    explanation,
    hasDiscount: unitSavings > 0
  };
}

function comparePriceWithBenchmark(productName, currentUnitPrice) {
  const key = (productName || '').toLowerCase().trim();
  const benchmark = state.benchmarks[key];

  if (!benchmark || !benchmark.price) {
    return { status: 'new', diffNominal: 0, diffPercent: 0, refPrice: null, text: 'Produk Baru' };
  }

  const diffNominal = currentUnitPrice - benchmark.price;
  const diffPercent = benchmark.price > 0 ? Math.round((diffNominal / benchmark.price) * 100) : 0;

  if (diffNominal > 0) {
    return { status: 'higher', diffNominal, diffPercent, refPrice: benchmark.price, text: `Lebih mahal Rp ${diffNominal.toLocaleString('id-ID')} (+${diffPercent}%)` };
  } else if (diffNominal < 0) {
    const absNominal = Math.abs(diffNominal);
    const absPercent = Math.abs(diffPercent);
    return { status: 'lower', diffNominal, diffPercent, refPrice: benchmark.price, text: `Lebih murah Rp ${absNominal.toLocaleString('id-ID')} (-${absPercent}%)` };
  } else {
    return { status: 'equal', diffNominal: 0, diffPercent: 0, refPrice: benchmark.price, text: 'Harga Stabil' };
  }
}

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
// 5. BUDGET SAFETY NET & EMERGENCY FREEZE ENGINE
// -----------------------------------------------------------------------------
function renderBudgetSafety() {
  let cartTotal = 0;
  let totalSavings = 0;

  state.cart.forEach(item => {
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    cartTotal += pricing.rowTotal;
    totalSavings += pricing.rowSavings;
  });

  const cartTotalHeader = document.getElementById('cartTotalHeader');
  const budgetLimitHeader = document.getElementById('budgetLimitHeader');
  const budgetProgressBar = document.getElementById('budgetProgressBar');
  const budgetSafetyBadge = document.getElementById('budgetSafetyBadge');
  const budgetSafetyText = document.getElementById('budgetSafetyText');
  const budgetRemainingText = document.getElementById('budgetRemainingText');
  const overBudgetBanner = document.getElementById('overBudgetBanner');
  const overBudgetDiffText = document.getElementById('overBudgetDiffText');
  const totalSavingsAmount = document.getElementById('totalSavingsAmount');
  const totalItemsCount = document.getElementById('totalItemsCount');
  const navCartBadge = document.getElementById('navCartBadge');

  if (cartTotalHeader) cartTotalHeader.innerHTML = `<span class="text-xs text-slate-400 font-sans">Rp</span> ${cartTotal.toLocaleString('id-ID')}`;
  if (budgetLimitHeader) budgetLimitHeader.textContent = formatRupiah(state.budgetLimit);
  if (totalSavingsAmount) totalSavingsAmount.textContent = formatRupiah(totalSavings);
  if (totalItemsCount) totalItemsCount.textContent = `${state.cart.length} item`;
  if (navCartBadge) navCartBadge.textContent = state.cart.length.toString();

  const limit = state.budgetLimit > 0 ? state.budgetLimit : 1;
  const ratio = cartTotal / limit;
  const percent = Math.min(100, Math.round(ratio * 100));
  const remaining = state.budgetLimit - cartTotal;

  if (budgetProgressBar) {
    budgetProgressBar.style.width = `${percent}%`;
    budgetProgressBar.className = 'h-full rounded-full transition-all duration-500 shadow-sm ';

    if (ratio >= 1.0) {
      budgetProgressBar.className += 'bg-rose-500 animate-pulse';
    } else if (ratio >= 0.90) {
      budgetProgressBar.className += 'bg-rose-500';
    } else if (ratio >= 0.70) {
      budgetProgressBar.className += 'bg-amber-500';
    } else {
      budgetProgressBar.className += 'bg-emerald-500';
    }
  }

  if (budgetRemainingText) {
    budgetRemainingText.textContent = formatRupiah(remaining);
    if (remaining < 0) {
      budgetRemainingText.className = 'font-bold font-mono text-rose-500 ml-1';
    } else {
      budgetRemainingText.className = 'font-bold font-mono text-emerald-600 dark:text-emerald-400 ml-1';
    }
  }

  if (budgetSafetyBadge && budgetSafetyText) {
    if (ratio >= 1.0) {
      budgetSafetyBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
      budgetSafetyText.textContent = `OVER BUDGET (${Math.round(ratio * 100)}%)`;
      if (overBudgetBanner) overBudgetBanner.classList.remove('hidden');
      if (overBudgetDiffText) overBudgetDiffText.textContent = `Melebihi pagu sebesar Rp ${Math.abs(remaining).toLocaleString('id-ID')}. Belanja non-esensial ditahan!`;
    } else if (ratio >= 0.90) {
      budgetSafetyBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
      budgetSafetyText.textContent = `Kritis (${percent}%)`;
      if (overBudgetBanner) overBudgetBanner.classList.add('hidden');
    } else if (ratio >= 0.70) {
      budgetSafetyBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      budgetSafetyText.textContent = `Waspada (${percent}%)`;
      if (overBudgetBanner) overBudgetBanner.classList.add('hidden');
    } else {
      budgetSafetyBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
      budgetSafetyText.textContent = `Aman (${percent}%)`;
      if (overBudgetBanner) overBudgetBanner.classList.add('hidden');
    }
  }

  // Update Emergency Freeze visual toggle
  const freezeToggle = document.getElementById('emergencyFreezeToggle');
  const freezeIconBadge = document.getElementById('freezeIconBadge');
  if (freezeToggle) freezeToggle.checked = state.isFrozen;
  if (freezeIconBadge) {
    if (state.isFrozen) {
      freezeIconBadge.className = 'w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center animate-pulse';
    } else {
      freezeIconBadge.className = 'w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300';
    }
  }
}

// -----------------------------------------------------------------------------
// 6. RENDER SHOPPING TROLLEY (TAB 1)
// -----------------------------------------------------------------------------
function renderCartItems() {
  const container = document.getElementById('cartItemList');
  const emptyView = document.getElementById('emptyCartView');
  const actionFooter = document.getElementById('cartActionFooter');
  if (!container) return;

  const filteredItems = state.cart.filter(item => {
    if (state.activeCategoryFilter === 'ALL') return true;
    return item.category === state.activeCategoryFilter;
  });

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.classList.remove('hidden');
    if (actionFooter) actionFooter.classList.add('hidden');
    updateCategoryCounters();
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  if (actionFooter) actionFooter.classList.remove('hidden');

  let html = '';
  filteredItems.forEach(item => {
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    const comp = comparePriceWithBenchmark(item.name, pricing.finalUnitPrice);

    let compBadgeHtml = '';
    if (comp.status === 'higher') {
      compBadgeHtml = `<span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">↑ ${comp.text}</span>`;
    } else if (comp.status === 'lower') {
      compBadgeHtml = `<span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">↓ ${comp.text}</span>`;
    } else if (comp.status === 'equal') {
      compBadgeHtml = `<span class="text-[10px] font-semibold text-slate-500">= Stabil</span>`;
    } else {
      compBadgeHtml = `<span class="text-[10px] font-semibold text-sky-600">✨ Produk Baru</span>`;
    }

    const isImpulse = item.category === 'Camilan' || item.category === 'Lainnya';

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col space-y-2.5 transition-all">
        <div class="flex items-start justify-between">
          <div class="space-y-0.5">
            <div class="flex items-center gap-1.5">
              <span class="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">${item.category}</span>
              ${isImpulse ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Non-Esensial</span>' : ''}
              ${compBadgeHtml}
            </div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${item.name}</h4>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              @ ${formatRupiah(pricing.finalUnitPrice)} / ${item.unit}
              ${pricing.hasDiscount ? `<span class="line-through text-slate-400 ml-1">${formatRupiah(item.price)}</span>` : ''}
            </div>
          </div>
          
          <div class="text-right">
            <div class="text-sm font-black font-mono text-slate-900 dark:text-white">${formatRupiah(pricing.rowTotal)}</div>
            ${pricing.hasDiscount ? `<div class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Hemat ${formatRupiah(pricing.rowSavings)}</div>` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div class="flex items-center gap-1.5">
            <button class="btn-item-qty-minus w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition" data-id="${item.id}">-</button>
            <span class="px-2 text-xs font-bold font-mono text-slate-800 dark:text-slate-100">${item.qty} ${item.unit}</span>
            <button class="btn-item-qty-plus w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition" data-id="${item.id}">+</button>
          </div>

          <div class="flex items-center gap-1.5">
            <button class="btn-item-edit p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition" data-id="${item.id}" title="Edit Item">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button class="btn-item-delete p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" data-id="${item.id}" title="Hapus Item">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateCategoryCounters();
  attachCartItemListeners();
  lucide.createIcons();
}

function attachCartItemListeners() {
  document.querySelectorAll('.btn-item-qty-minus').forEach(btn => {
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
        renderBudgetSafety();
        renderCartItems();
        sounds.playClick();
      }
    };
  });

  document.querySelectorAll('.btn-item-qty-plus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        item.qty += 1;
        state.saveCart();
        renderBudgetSafety();
        renderCartItems();
        sounds.playClick();
      }
    };
  });

  document.querySelectorAll('.btn-item-delete').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      state.cart = state.cart.filter(i => i.id !== id);
      state.saveCart();
      renderBudgetSafety();
      renderCartItems();
      sounds.playClick();
      showToast('Item dihapus dari troli');
    };
  });

  document.querySelectorAll('.btn-item-edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) openItemModalForEdit(item);
    };
  });
}

function updateCategoryCounters() {
  const counts = { ALL: state.cart.length, Sembako: 0, 'Makanan Instan': 0, 'Daging & Sayur': 0, Toiletries: 0, 'Bumbu & Minyak': 0, Camilan: 0, Lainnya: 0 };
  state.cart.forEach(item => {
    if (counts[item.category] !== undefined) counts[item.category]++;
    else counts.Lainnya++;
  });

  const catCountAll = document.getElementById('catCountAll');
  const catCountSembako = document.getElementById('catCountSembako');
  const catCountInstan = document.getElementById('catCountInstan');
  const catCountFresh = document.getElementById('catCountFresh');
  const catCountToiletries = document.getElementById('catCountToiletries');
  const catCountBumbu = document.getElementById('catCountBumbu');
  const catCountCamilan = document.getElementById('catCountCamilan');
  const catCountLainnya = document.getElementById('catCountLainnya');

  if (catCountAll) catCountAll.textContent = counts.ALL;
  if (catCountSembako) catCountSembako.textContent = counts.Sembako;
  if (catCountInstan) catCountInstan.textContent = counts['Makanan Instan'];
  if (catCountFresh) catCountFresh.textContent = counts['Daging & Sayur'];
  if (catCountToiletries) catCountToiletries.textContent = counts.Toiletries;
  if (catCountBumbu) catCountBumbu.textContent = counts['Bumbu & Minyak'];
  if (catCountCamilan) catCountCamilan.textContent = counts.Camilan;
  if (catCountLainnya) catCountLainnya.textContent = counts.Lainnya;
}

// -----------------------------------------------------------------------------
// 7. PRICE COMPARISON & LOCAL DEALS RADAR (TAB 2)
// -----------------------------------------------------------------------------
function renderRadarComparison() {
  const container = document.getElementById('retailerBarsContainer');
  const tableContainer = document.getElementById('radarItemTable');
  const winnerName = document.getElementById('radarWinnerName');
  const winnerSavings = document.getElementById('radarWinnerSavings');
  if (!container) return;

  const retailers = ['Indomaret', 'Alfamart', 'Hypermart', 'Pasar Tradisional'];
  const totals = { 'Indomaret': 0, 'Alfamart': 0, 'Hypermart': 0, 'Pasar Tradisional': 0 };

  state.cart.forEach(item => {
    const qty = item.qty || 1;
    const basePrice = item.price || 15000;
    retailers.forEach(r => {
      const mult = RETAILER_MULTIPLIERS[r] || 1.0;
      totals[r] += Math.round(basePrice * mult * qty);
    });
  });

  // Determine cheapest and highest
  let cheapestRetailer = 'Pasar Tradisional';
  let minAmount = totals[cheapestRetailer] || 0;
  let maxAmount = totals[cheapestRetailer] || 0;

  retailers.forEach(r => {
    if (totals[r] < minAmount) {
      minAmount = totals[r];
      cheapestRetailer = r;
    }
    if (totals[r] > maxAmount) {
      maxAmount = totals[r];
    }
  });

  const diffSavings = maxAmount - minAmount;

  if (winnerName) winnerName.textContent = cheapestRetailer;
  if (winnerSavings) {
    if (state.cart.length > 0) {
      winnerSavings.textContent = `Pilihan paling hemat! Anda berpotensi menghemat ${formatRupiah(diffSavings)} dibanding tempat lain.`;
    } else {
      winnerSavings.textContent = 'Tambahkan item ke troli untuk melihat kalkulasi komparasi seketika.';
    }
  }

  // Render multi-bars
  let barsHtml = '';
  retailers.forEach(r => {
    const amount = totals[r];
    const isWinner = r === cheapestRetailer && state.cart.length > 0;
    const pct = maxAmount > 0 ? Math.round((amount / maxAmount) * 100) : 50;

    barsHtml += `
      <div>
        <div class="flex justify-between font-bold text-[11px] mb-1">
          <span class="flex items-center gap-1.5">
            ${isWinner ? '👑 ' : ''}${r}
            ${isWinner ? '<span class="text-[9px] bg-white text-emerald-800 px-1.5 py-0.2 rounded-full">Termurah</span>' : ''}
          </span>
          <span class="font-mono">${formatRupiah(amount)}</span>
        </div>
        <div class="w-full bg-white/20 h-2 rounded-full overflow-hidden">
          <div class="${isWinner ? 'bg-white' : 'bg-emerald-200/60'} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  });
  container.innerHTML = barsHtml;

  // Render item breakdown table
  if (tableContainer) {
    if (state.cart.length === 0) {
      tableContainer.innerHTML = '<p class="text-slate-400 text-center py-4">Troli kosong. Masukkan barang terlebih dahulu.</p>';
      return;
    }

    let tableHtml = '';
    state.cart.forEach(item => {
      const pIndo = Math.round(item.price * RETAILER_MULTIPLIERS['Indomaret']);
      const pAlfa = Math.round(item.price * RETAILER_MULTIPLIERS['Alfamart']);
      const pHyper = Math.round(item.price * RETAILER_MULTIPLIERS['Hypermart']);
      const pPasar = Math.round(item.price * RETAILER_MULTIPLIERS['Pasar Tradisional']);

      tableHtml += `
        <div class="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-xs text-slate-800 dark:text-slate-200">${item.name} (${item.qty} ${item.unit})</h5>
            <div class="text-[10px] text-slate-400 flex gap-2 mt-0.5">
              <span>Indo: ${formatRupiah(pIndo)}</span>
              <span>Alfa: ${formatRupiah(pAlfa)}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Pasar: ${formatRupiah(pPasar)}</span>
            <span class="text-[9px] text-slate-400">Hyper: ${formatRupiah(pHyper)}</span>
          </div>
        </div>
      `;
    });
    tableContainer.innerHTML = tableHtml;
  }
}

// -----------------------------------------------------------------------------
// 8. SMART PANTRY & ZERO-WASTE TRACKER (TAB 3)
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

  const criticalItems = unconsumed.filter(p => p.daysLeft !== undefined && p.daysLeft <= 2);

  if (criticalItems.length > 0) {
    if (alertBox) alertBox.classList.remove('hidden');
    if (navAlertBadge) navAlertBadge.classList.remove('hidden');
    if (alertTitle) alertTitle.textContent = `${criticalItems.length} Bahan Mendekati Batas Kedaluwarsa!`;
    if (alertDesc) alertDesc.textContent = `${criticalItems.map(c => c.name).join(', ')} perlu diolah segera. Gunakan tombol 'Saran Resep AI'!`;
  } else {
    if (alertBox) alertBox.classList.add('hidden');
    if (navAlertBadge) navAlertBadge.classList.add('hidden');
  }

  let html = '';
  unconsumed.forEach(item => {
    let freshnessBadge = '';
    if (item.daysLeft <= 1) {
      freshnessBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">Basi Besok!</span>`;
    } else if (item.daysLeft <= 3) {
      freshnessBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300">${item.daysLeft} Hari Lagi</span>`;
    } else {
      freshnessBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">${item.daysLeft} Hari</span>`;
    }

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">${item.category}</span>
            ${freshnessBadge}
          </div>
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">${item.name}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5">Tersimpan: ${item.qty} ${item.unit} &bull; Beli: ${item.purchasedDate}</p>
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
        state.addXp(30, 'Bahan dapur sukses diolah zero-waste!');
        renderPantryStock();
        sounds.playSuccess();
      }
    };
  });
}

function showRecipeSuggestionModal() {
  const modal = document.getElementById('recipeModalBackdrop');
  const title = document.getElementById('recipeModalTitle');
  const utilizedContainer = document.getElementById('recipeUtilizedItems');
  const stepsContainer = document.getElementById('recipeStepsList');
  if (!modal) return;

  const critical = state.pantry.filter(p => !p.isConsumed && p.daysLeft <= 3);
  const sampleRecipes = [
    {
      title: "Tumis Kilat Ayam Sayur Zero-Waste",
      items: ["Dada Ayam Fillet", "Sayur Sawi & Wortel", "Bumbu Minyak"],
      steps: [
        "Potong dadu dada ayam dan cuci bersih sayur sawi & wortel.",
        "Panaskan wajan dengan 1 sdm minyak goreng sania.",
        "Tumis irisan bawang putih hingga harum, masukkan potongan ayam hingga matang.",
        "Masukkan sawi dan wortel, beri sedikit kecap manis dan sejumput garam.",
        "Aduk cepat selama 3 menit. Sajikan hangat agar nutrisi terjaga maksimal!"
      ]
    },
    {
      title: "Orak-Arik Telur & Sayur Gurih",
      items: ["Telur Ayam", "Sawi Hijau", "Bumbu Dapur"],
      steps: [
        "Kocok lepas 2 butir telur dengan sejumput garam dan lada.",
        "Tumis bawang merah & cabai rawit sebentar.",
        "Masukkan irisan sayur sawi, lalu tuangkan kocokan telur.",
        "Orak-arik hingga telur matang lembut. Siap dinikmati dengan nasi hangat!"
      ]
    }
  ];

  const recipe = sampleRecipes[0];
  if (title) title.textContent = recipe.title;

  if (utilizedContainer) {
    utilizedContainer.innerHTML = recipe.items.map(i => `
      <span class="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
        ✓ ${i}
      </span>
    `).join('');
  }

  if (stepsContainer) {
    stepsContainer.innerHTML = recipe.steps.map(s => `<li>${s}</li>`).join('');
  }

  modal.classList.remove('hidden');
}

// -----------------------------------------------------------------------------
// 9. GAMIFIKASI & ACHIEVEMENT BADGES (TAB 4)
// -----------------------------------------------------------------------------
function renderGamification() {
  const xpEl = document.getElementById('userXpTotal');
  const levelTitle = document.getElementById('userLevelTitle');
  if (xpEl) xpEl.textContent = state.xp.toString();
  if (levelTitle) levelTitle.textContent = `Budget Master Lv. ${state.level}`;

  const impulseBadge = document.getElementById('badgeImpulseShield');
  const impulseStatus = document.getElementById('impulseBadgeStatus');
  if (state.isFrozen && impulseBadge && impulseStatus) {
    impulseBadge.classList.remove('opacity-80');
    impulseBadge.classList.add('border-emerald-400');
    impulseStatus.textContent = 'Terbuka';
    impulseStatus.className = 'text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full';
  }
}

// -----------------------------------------------------------------------------
// 10. AI OCR RECEIPT SCANNER ENGINE (MODAL 1)
// -----------------------------------------------------------------------------
function openOcrModal() {
  const modal = document.getElementById('ocrModalBackdrop');
  const uploadZone = document.getElementById('ocrUploadZone');
  const scanningState = document.getElementById('ocrScanningState');
  const resultContainer = document.getElementById('ocrResultContainer');

  if (uploadZone) uploadZone.classList.remove('hidden');
  if (scanningState) scanningState.classList.add('hidden');
  if (resultContainer) resultContainer.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

function runOcrProcessing(sampleType = 'indomaret') {
  const uploadZone = document.getElementById('ocrUploadZone');
  const scanningState = document.getElementById('ocrScanningState');
  const resultContainer = document.getElementById('ocrResultContainer');
  const merchantEl = document.getElementById('ocrMerchantDetected');
  const totalEl = document.getElementById('ocrTotalDetected');
  const listEl = document.getElementById('ocrExtractedItemsList');

  if (uploadZone) uploadZone.classList.add('hidden');
  if (scanningState) scanningState.classList.remove('hidden');
  if (resultContainer) resultContainer.classList.add('hidden');

  sounds.playClick();

  // Simulate AI OCR Multimodal Processing latency
  setTimeout(() => {
    let merchant = 'Indomaret Point';
    let sampleItems = [];

    if (sampleType === 'alfamart') {
      merchant = 'Alfamart Cendrawasih';
      sampleItems = [
        { name: 'Minyak Goreng Sania 2L', category: 'Bumbu & Minyak', unit: 'liter', qty: 1, price: 33500, isEssential: true },
        { name: 'Deterjen Rinso 750g', category: 'Toiletries', unit: 'pack', qty: 1, price: 21000, isEssential: true },
        { name: 'Chiki Balls Keju 55g', category: 'Camilan', unit: 'bungkus', qty: 2, price: 8500, isEssential: false }
      ];
    } else if (sampleType === 'shopee') {
      merchant = 'Shopee Supermarket Official';
      sampleItems = [
        { name: 'Beras Ramos 5kg', category: 'Sembako', unit: 'pack', qty: 1, price: 73000, isEssential: true },
        { name: 'Susu UHT Ultra Milk 1L', category: 'Minuman', unit: 'liter', qty: 2, price: 18500, isEssential: true },
        { name: 'Oreo Vanilla 120g', category: 'Camilan', unit: 'pack', qty: 1, price: 11500, isEssential: false }
      ];
    } else {
      merchant = 'Indomaret Sudirman';
      sampleItems = [
        { name: 'Beras Ramos 5kg', category: 'Sembako', unit: 'pack', qty: 1, price: 74000, isEssential: true },
        { name: 'Telur Ayam 1kg', category: 'Daging & Sayur', unit: 'kg', qty: 1, price: 28500, isEssential: true },
        { name: 'Indomie Goreng', category: 'Makanan Instan', unit: 'bungkus', qty: 5, price: 3100, isEssential: true },
        { name: 'Biskuit Roma Kelapa 300g', category: 'Camilan', unit: 'pack', qty: 1, price: 11000, isEssential: false }
      ];
    }

    state.stagedOcrItems = sampleItems;
    const overallTotal = sampleItems.reduce((acc, item) => acc + item.price * item.qty, 0);

    if (merchantEl) merchantEl.textContent = merchant;
    if (totalEl) totalEl.textContent = formatRupiah(overallTotal);

    if (listEl) {
      listEl.innerHTML = sampleItems.map(item => `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-slate-800 dark:text-slate-200">${item.name}</span>
              ${item.isEssential ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">Esensial</span>' : '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 font-bold">Camilan</span>'}
            </div>
            <span class="text-[10px] text-slate-400 font-mono">${item.qty} ${item.unit} &bull; ${item.category}</span>
          </div>
          <span class="font-bold font-mono text-slate-900 dark:text-white">${formatRupiah(item.price * item.qty)}</span>
        </div>
      `).join('');
    }

    if (scanningState) scanningState.classList.add('hidden');
    if (resultContainer) resultContainer.classList.remove('hidden');
    sounds.playSuccess();
  }, 1400);
}

function applyStagedOcrToCart() {
  if (state.stagedOcrItems.length === 0) return;

  state.stagedOcrItems.forEach(item => {
    state.cart.push({
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: item.name,
      category: item.category,
      unit: item.unit,
      qty: item.qty,
      price: item.price,
      discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
    });
  });

  state.saveCart();
  state.addXp(50, 'Berhasil scan struk belanja dengan AI OCR!');
  renderBudgetSafety();
  renderCartItems();

  const ocrModal = document.getElementById('ocrModalBackdrop');
  if (ocrModal) ocrModal.classList.add('hidden');
  showToast('Item dari struk berhasil masuk ke troli!');
}

// -----------------------------------------------------------------------------
// 11. CHECKOUT TRIP & TRANSFER TO VIRTUAL PANTRY
// -----------------------------------------------------------------------------
function checkoutTrip() {
  if (state.cart.length === 0) return;

  let totalTrip = 0;
  let totalSavings = 0;

  state.cart.forEach(item => {
    const p = calculateItemPricing(item.price, item.qty, item.discount);
    totalTrip += p.rowTotal;
    totalSavings += p.rowSavings;

    // Update Benchmark catalog price
    const key = item.name.toLowerCase().trim();
    state.benchmarks[key] = {
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: p.finalUnitPrice
    };

    // Auto Transfer to Virtual Pantry with Default Expiry Matrix
    let expiryDays = 14;
    if (item.category === 'Daging & Sayur') expiryDays = 3;
    else if (item.category === 'Makanan Instan') expiryDays = 180;
    else if (item.category === 'Minuman') expiryDays = 7;
    else if (item.category === 'Sembako') expiryDays = 90;
    else if (item.category === 'Toiletries') expiryDays = 365;

    state.pantry.push({
      id: 'pantry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: item.name,
      category: item.category,
      unit: item.unit,
      qty: item.qty,
      purchasedDate: new Date().toISOString().split('T')[0],
      daysLeft: expiryDays,
      isConsumed: false
    });
  });

  const tripRecord = {
    id: 'trip_' + Date.now(),
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    itemCount: state.cart.length,
    totalAmount: totalTrip,
    totalSavings,
    items: [...state.cart]
  };

  state.history.unshift(tripRecord);
  state.cart = [];
  state.saveCart();
  state.saveHistory();
  state.saveBenchmarks();
  state.savePantry();

  state.addXp(100, 'Belanja bulanan selesai & stok masuk ke virtual pantry!');
  sounds.playSuccess();
  renderBudgetSafety();
  renderCartItems();
  renderPantryStock();
  renderHistoryView();
  showToast('Belanja selesai & dicatat ke Pantry!', 'check-circle');
}

// -----------------------------------------------------------------------------
// 12. RIWAYAT BELANJA (TAB 5)
// -----------------------------------------------------------------------------
function renderHistoryView() {
  const container = document.getElementById('historyListContainer');
  const emptyView = document.getElementById('emptyHistoryView');
  const countEl = document.getElementById('historyTripCount');
  const spendEl = document.getElementById('historyTotalSpend');
  const benchCountEl = document.getElementById('historyBenchmarkCount');
  if (!container) return;

  if (countEl) countEl.textContent = `${state.history.length} Transaksi`;

  let totalSpend = 0;
  state.history.forEach(t => totalSpend += t.totalAmount);
  if (spendEl) spendEl.textContent = formatRupiah(totalSpend);
  if (benchCountEl) benchCountEl.textContent = `${Object.keys(state.benchmarks).length} Produk`;

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
          ${trip.totalSavings > 0 ? `<span class="text-[10px] text-emerald-600 font-bold">Hemat ${formatRupiah(trip.totalSavings)}</span>` : ''}
        </div>
        <div class="text-right">
          <span class="text-sm font-black font-mono text-slate-900 dark:text-white block">${formatRupiah(trip.totalAmount)}</span>
          <button class="btn-view-receipt text-[11px] font-bold text-emerald-600 dark:text-emerald-400 underline mt-1" data-id="${trip.id}">
            Lihat Struk
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  document.querySelectorAll('.btn-view-receipt').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const trip = state.history.find(t => t.id === id);
      if (trip) openReceiptModal(trip);
    };
  });
}

function openReceiptModal(trip) {
  const modal = document.getElementById('receiptModalBackdrop');
  const content = document.getElementById('receiptContent');
  if (!modal || !content) return;

  let itemsHtml = (trip.items || []).map(i => `
    <div class="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-700">
      <span>${i.name} (x${i.qty})</span>
      <span class="font-mono font-bold">${formatRupiah(i.price * i.qty)}</span>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 font-mono text-center">
      <h4 class="font-bold text-sm">SMART GROCERY STORE</h4>
      <p class="text-[10px] text-slate-400">${trip.date}</p>
    </div>
    <div class="space-y-1 my-2">
      ${itemsHtml}
    </div>
    <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm">
      <span>TOTAL</span>
      <span class="font-mono text-emerald-600">${formatRupiah(trip.totalAmount)}</span>
    </div>
  `;

  modal.classList.remove('hidden');
}

// -----------------------------------------------------------------------------
// 13. PENGATURAN ANGGARAN & KATALOG BENCHMARK (TAB 6)
// -----------------------------------------------------------------------------
function renderBenchmarkCatalog(searchQuery = '') {
  const container = document.getElementById('benchmarkListPreview');
  const countEl = document.getElementById('benchmarkItemCount');
  if (!container) return;

  const entries = Object.values(state.benchmarks);
  if (countEl) countEl.textContent = `${entries.length} Produk`;

  const q = searchQuery.toLowerCase().trim();
  const filtered = entries.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Tidak ada patokan harga yang cocok.</p>';
    return;
  }

  let html = '';
  filtered.forEach(item => {
    html += `
      <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-slate-800 dark:text-slate-200">${item.name}</span>
          <span class="text-[10px] text-slate-400 block">${item.category} &bull; /${item.unit}</span>
        </div>
        <span class="font-mono font-bold text-slate-900 dark:text-white">${formatRupiah(item.price)}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

// -----------------------------------------------------------------------------
// 14. MODAL INPUT ITEM & INTERCEPTOR EMERGENCY FREEZE
// -----------------------------------------------------------------------------
function openItemModalForNew() {
  const form = document.getElementById('itemForm');
  if (form) form.reset();
  const editId = document.getElementById('editItemId');
  if (editId) editId.value = '';
  const title = document.getElementById('modalTitle');
  if (title) title.textContent = 'Tambah Item Belanja';
  const saveBtn = document.getElementById('saveBtnText');
  if (saveBtn) saveBtn.textContent = 'Simpan ke Troli';

  updateModalPricePreview();
  const modal = document.getElementById('itemModalBackdrop');
  if (modal) modal.classList.remove('hidden');
}

function openItemModalForEdit(item) {
  const modal = document.getElementById('itemModalBackdrop');
  const editId = document.getElementById('editItemId');
  const inputName = document.getElementById('inputItemName');
  const inputCat = document.getElementById('inputItemCategory');
  const inputUnit = document.getElementById('inputItemUnit');
  const inputQty = document.getElementById('inputItemQty');
  const inputPrice = document.getElementById('inputItemPrice');
  const title = document.getElementById('modalTitle');
  const saveBtn = document.getElementById('saveBtnText');

  if (editId) editId.value = item.id;
  if (inputName) inputName.value = item.name;
  if (inputCat) inputCat.value = item.category;
  if (inputUnit) inputUnit.value = item.unit;
  if (inputQty) inputQty.value = item.qty;
  if (inputPrice) inputPrice.value = item.price;
  if (title) title.textContent = 'Edit Item Belanja';
  if (saveBtn) saveBtn.textContent = 'Perbarui Item';

  updateModalPricePreview();
  if (modal) modal.classList.remove('hidden');
}

function updateModalPricePreview() {
  const inputPrice = document.getElementById('inputItemPrice');
  const inputQty = document.getElementById('inputItemQty');
  const inputName = document.getElementById('inputItemName');
  const calcDetail = document.getElementById('formCalculationDetail');
  const finalTotal = document.getElementById('formFinalRowTotal');
  const savingBadge = document.getElementById('formSavingBadge');

  const price = Number(inputPrice?.value) || 0;
  const qty = Number(inputQty?.value) || 1;
  const pricing = calculateItemPricing(price, qty, { mode: 'none' });

  if (calcDetail) calcDetail.textContent = `${qty} × ${formatRupiah(pricing.finalUnitPrice)}`;
  if (finalTotal) finalTotal.textContent = formatRupiah(pricing.rowTotal);
  if (savingBadge) savingBadge.textContent = `Hemat: ${formatRupiah(pricing.rowSavings)}`;

  // Comparator preview vs benchmark
  const comp = comparePriceWithBenchmark(inputName?.value, pricing.finalUnitPrice);
  const compText = document.getElementById('compText');
  const compRef = document.getElementById('compRefPrice');
  const compIcon = document.getElementById('compIcon');

  if (compText) compText.textContent = comp.text;
  if (compRef) compRef.textContent = comp.refPrice ? `Bln Lalu: ${formatRupiah(comp.refPrice)}` : 'Bln Lalu: -';
  if (compIcon) {
    if (comp.status === 'higher') {
      compIcon.textContent = '↑';
      compIcon.className = 'w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold bg-rose-100 text-rose-600';
    } else if (comp.status === 'lower') {
      compIcon.textContent = '↓';
      compIcon.className = 'w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold bg-emerald-100 text-emerald-600';
    } else {
      compIcon.textContent = '=';
      compIcon.className = 'w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold bg-slate-200 text-slate-600';
    }
  }
}

function handleSaveItemForm() {
  const editId = document.getElementById('editItemId')?.value;
  const name = document.getElementById('inputItemName')?.value.trim();
  const category = document.getElementById('inputItemCategory')?.value;
  const unit = document.getElementById('inputItemUnit')?.value;
  const qty = Number(document.getElementById('inputItemQty')?.value) || 1;
  const price = Number(document.getElementById('inputItemPrice')?.value) || 0;

  if (!name || price <= 0) {
    showToast('Mohon masukkan nama produk dan harga valid!', 'alert-triangle');
    return;
  }

  const isImpulse = category === 'Camilan' || category === 'Lainnya';

  // EMERGENCY FREEZE INTERCEPTOR: Tahan belanja non-esensial!
  if (state.isFrozen && isImpulse) {
    state.pendingImpulseItem = { editId, name, category, unit, qty, price };
    const freezeModal = document.getElementById('freezeAlertModalBackdrop');
    if (freezeModal) freezeModal.classList.remove('hidden');
    sounds.playAlarm();
    return;
  }

  commitItemToCart({ editId, name, category, unit, qty, price });
}

function commitItemToCart(itemData) {
  const { editId, name, category, unit, qty, price } = itemData;

  if (editId) {
    const existing = state.cart.find(i => i.id === editId);
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.unit = unit;
      existing.qty = qty;
      existing.price = price;
    }
  } else {
    state.cart.push({
      id: 'cart_' + Date.now(),
      name,
      category,
      unit,
      qty,
      price,
      discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 }
    });
  }

  state.saveCart();
  renderBudgetSafety();
  renderCartItems();
  sounds.playClick();

  const modal = document.getElementById('itemModalBackdrop');
  if (modal) modal.classList.add('hidden');
  showToast(editId ? 'Item berhasil diperbarui' : 'Item ditambahkan ke troli');
}

// -----------------------------------------------------------------------------
// 15. INITIALIZATION & EVENT LISTENERS
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Apply Saved Theme
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Apply Saved Layout (Mobile vs Bento)
  const mainContainer = document.getElementById('mainContainer');
  if (mainContainer) {
    if (state.isBentoMode) {
      mainContainer.classList.remove('mode-mobile');
      mainContainer.classList.add('mode-bento');
    } else {
      mainContainer.classList.remove('mode-bento');
      mainContainer.classList.add('mode-mobile');
    }
  }

  // Initial Renders
  renderBudgetSafety();
  renderCartItems();
  renderRadarComparison();
  renderPantryStock();
  renderGamification();
  renderHistoryView();
  renderBenchmarkCatalog();

  // Navigation Tabs Switching
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
      const activeSection = document.getElementById(target);
      if (activeSection) activeSection.classList.remove('hidden');

      document.querySelectorAll('.nav-tab-btn').forEach(b => {
        b.className = 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-slate-400 hover:text-slate-600 active:scale-95 transition';
      });
      btn.className = 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold active:scale-95 transition';

      if (target === 'tab-radar') renderRadarComparison();
      if (target === 'tab-pantry') renderPantryStock();
      if (target === 'tab-gamifikasi') renderGamification();
      if (target === 'tab-riwayat') renderHistoryView();
      if (target === 'tab-anggaran') renderBenchmarkCatalog();

      sounds.playClick();
      lucide.createIcons();
    };
  });

  // Category Filter Pills
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

  // Emergency Freeze Toggle Listener
  const freezeToggle = document.getElementById('emergencyFreezeToggle');
  if (freezeToggle) {
    freezeToggle.onchange = (e) => {
      state.isFrozen = e.target.checked;
      state.saveFreezeState();
      renderBudgetSafety();
      renderGamification();
      if (state.isFrozen) {
        state.addXp(20, 'Emergency Freeze diaktifkan! Pengeluaran dikunci.');
        sounds.playAlarm();
      } else {
        showToast('Emergency Freeze dinonaktifkan');
        sounds.playClick();
      }
    };
  }

  // Theme Toggle (Dark / Light)
  const toggleThemeBtn = document.getElementById('toggleThemeBtn');
  if (toggleThemeBtn) {
    toggleThemeBtn.onclick = () => {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('sg_theme', state.isDarkMode ? 'dark' : 'light');
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      sounds.playClick();
      showToast(state.isDarkMode ? 'Mode Gelap Aktif' : 'Mode Terang Aktif');
    };
  }

  // Layout View Switcher (Mobile App 440px vs Desktop Bento Grid 1200px)
  const toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
  if (toggleLayoutBtn) {
    toggleLayoutBtn.onclick = () => {
      state.isBentoMode = !state.isBentoMode;
      localStorage.setItem('sg_layout_mode', state.isBentoMode ? 'bento' : 'mobile');
      if (mainContainer) {
        if (state.isBentoMode) {
          mainContainer.classList.remove('mode-mobile');
          mainContainer.classList.add('mode-bento');
        } else {
          mainContainer.classList.remove('mode-bento');
          mainContainer.classList.add('mode-mobile');
        }
      }
      sounds.playClick();
      showToast(state.isBentoMode ? 'Mode Bento Grid Aktif' : 'Mode Smartphone Aktif');
    };
  }

  // Audio Toggle
  const toggleSoundBtn = document.getElementById('toggleSoundBtn');
  if (toggleSoundBtn) {
    toggleSoundBtn.onclick = () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem('sg_sound_enabled', state.soundEnabled.toString());
      sounds.playClick();
      showToast(state.soundEnabled ? 'Efek Suara Aktif' : 'Efek Suara Dibisukan');
    };
  }

  // AI OCR Triggers
  document.getElementById('topOcrBtn')?.addEventListener('click', openOcrModal);
  document.getElementById('fabScanBtn')?.addEventListener('click', openOcrModal);
  document.getElementById('emptyScanBtn')?.addEventListener('click', openOcrModal);
  document.getElementById('closeOcrBtn')?.addEventListener('click', () => {
    document.getElementById('ocrModalBackdrop')?.classList.add('hidden');
  });

  document.querySelectorAll('.preset-ocr-btn').forEach(btn => {
    btn.onclick = () => runOcrProcessing(btn.getAttribute('data-sample'));
  });

  document.getElementById('receiptFileInput')?.addEventListener('change', () => {
    runOcrProcessing('indomaret');
  });

  document.getElementById('applyOcrToCartBtn')?.addEventListener('click', applyStagedOcrToCart);

  // Manual Add Item Triggers
  document.getElementById('openAddModalBtn')?.addEventListener('click', openItemModalForNew);
  document.getElementById('emptyAddBtn')?.addEventListener('click', openItemModalForNew);
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    document.getElementById('itemModalBackdrop')?.classList.add('hidden');
  });
  document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
    document.getElementById('itemModalBackdrop')?.classList.add('hidden');
  });
  document.getElementById('saveItemBtn')?.addEventListener('click', handleSaveItemForm);

  // Modal Price Realtime Updates
  ['inputItemPrice', 'inputItemQty', 'inputItemName'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateModalPricePreview);
  });

  // Stepper Qty Buttons in Modal
  document.getElementById('btnQtyMinus')?.addEventListener('click', () => {
    const input = document.getElementById('inputItemQty');
    if (input && Number(input.value) > 1) {
      input.value = Number(input.value) - 1;
      updateModalPricePreview();
    }
  });

  document.getElementById('btnQtyPlus')?.addEventListener('click', () => {
    const input = document.getElementById('inputItemQty');
    if (input) {
      input.value = Number(input.value) + 1;
      updateModalPricePreview();
    }
  });

  document.querySelectorAll('.qty-preset').forEach(btn => {
    btn.onclick = () => {
      const add = Number(btn.getAttribute('data-add')) || 1;
      const input = document.getElementById('inputItemQty');
      if (input) {
        input.value = Number(input.value) + add;
        updateModalPricePreview();
      }
    };
  });

  // Emergency Freeze Barrier Buttons
  document.getElementById('cancelImpulseBtn')?.addEventListener('click', () => {
    document.getElementById('freezeAlertModalBackdrop')?.classList.add('hidden');
    state.pendingImpulseItem = null;
    state.addXp(30, 'Hebat! Anda sukses menahan belanja impulsif.');
    sounds.playSuccess();
  });

  document.getElementById('forceAddImpulseBtn')?.addEventListener('click', () => {
    document.getElementById('freezeAlertModalBackdrop')?.classList.add('hidden');
    if (state.pendingImpulseItem) {
      commitItemToCart(state.pendingImpulseItem);
      state.pendingImpulseItem = null;
    }
  });

  // Zero-Waste Recipe Modal Triggers
  document.getElementById('suggestRecipeBtn')?.addEventListener('click', showRecipeSuggestionModal);
  document.getElementById('closeRecipeBtn')?.addEventListener('click', () => {
    document.getElementById('recipeModalBackdrop')?.classList.add('hidden');
  });
  document.getElementById('dismissRecipeBtn')?.addEventListener('click', () => {
    document.getElementById('recipeModalBackdrop')?.classList.add('hidden');
  });

  // Trip Checkout Trigger
  document.getElementById('checkoutTripBtn')?.addEventListener('click', checkoutTrip);

  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua barang dari troli belanja?')) {
      state.cart = [];
      state.saveCart();
      renderBudgetSafety();
      renderCartItems();
      showToast('Troli dikosongkan');
    }
  });

  // Save Budget Settings
  document.getElementById('saveBudgetLimitBtn')?.addEventListener('click', () => {
    const val = Number(document.getElementById('budgetLimitInput')?.value);
    if (val >= 50000) {
      state.budgetLimit = val;
      localStorage.setItem('sg_budget_limit', val.toString());
      renderBudgetSafety();
      sounds.playSuccess();
      showToast('Pagu anggaran berhasil disimpan!');
    }
  });

  document.querySelectorAll('.budget-preset-btn').forEach(btn => {
    btn.onclick = () => {
      const amt = Number(btn.getAttribute('data-amount'));
      const input = document.getElementById('budgetLimitInput');
      if (input && amt) input.value = amt;
    };
  });

  // Benchmark Search
  document.getElementById('benchmarkSearchInput')?.addEventListener('input', (e) => {
    renderBenchmarkCatalog(e.target.value);
  });

  // Receipts Modal Close
  document.getElementById('closeReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptModalBackdrop')?.classList.add('hidden');
  });
  document.getElementById('dismissReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptModalBackdrop')?.classList.add('hidden');
  });

  document.getElementById('copyReceiptTextBtn')?.addEventListener('click', () => {
    const content = document.getElementById('receiptContent')?.innerText;
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        showToast('Struk berhasil disalin ke WhatsApp!', 'copy');
      });
    }
  });

  lucide.createIcons();
});
