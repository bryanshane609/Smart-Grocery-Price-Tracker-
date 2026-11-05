import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Store,
  Calendar,
  Wallet,
  Flame,
  Search,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle,
  Percent
} from 'lucide-react';

/**
 * =============================================================================
 * SMART GROCERY GUARDIAN (REACT / NEXT.JS MODULAR COMPONENT)
 * Desain Eksak Sesuai Referensi Visual:
 * - Header Putih/Clean: Logo kantong belanja kuning di kotak hitam, Toko Selector,
 *   Date Picker, Status ONLINE, Card Anggaran Ringkas, Avatar Pengguna.
 * - Hero Card Dark Charcoal: STATUS: AMAN, HEMAT RP X, TOTAL BELANJA BERJALAN,
 *   PEMAKAIAN % CAP, Sisa Aman Rp X, Segmented 10-Block Progress Bar dengan Framer Motion.
 * - Supermarket Catalog Auto-Complete, Smart Category/Unit Auto-Assign,
 *   Cascading Tier Discount, dan Kupon Belanja. Sisa Anggaran & Batas Bulanan Bersih.
 * =============================================================================
 */

// Basis Data Katalog Supermarket Real-Time
const SUPERMARKET_CATALOG = [
  { name: 'Beras Ramos Setra 5kg', price: 74500, category: 'Sembako', unit: 'kg', store: 'Indomaret' },
  { name: 'Beras Pandan Wangi Premium 5kg', price: 88000, category: 'Sembako', unit: 'kg', store: 'Lotte Mart' },
  { name: 'Minyak Goreng Sania 2L', price: 37900, category: 'Sembako', unit: 'liter', store: 'Alfamart' },
  { name: 'Minyak Goreng Bimoli 2L', price: 38500, category: 'Sembako', unit: 'liter', store: 'Indomaret' },
  { name: 'Telur Ayam Negeri 1kg', price: 29500, category: 'Sembako', unit: 'kg', store: 'Pasar Tradisional' },
  { name: 'Daging Dada Ayam Fillet 1kg', price: 52000, category: 'Daging & Sayur', unit: 'kg', store: 'Super Indo' },
  { name: 'Daging Sapi Rendang Segar 1kg', price: 135000, category: 'Daging & Sayur', unit: 'kg', store: 'Super Indo' },
  { name: 'Sayur Bayam Hijau Segar 1 Ikat', price: 4000, category: 'Daging & Sayur', unit: 'ikat', store: 'Pasar Tradisional' },
  { name: 'Indomie Goreng Spesial', price: 3100, category: 'Makanan Instan', unit: 'bungkus', store: 'Indomaret' },
  { name: 'Susu UHT Ultra Milk Full Cream 1L', price: 19500, category: 'Makanan Instan', unit: 'liter', store: 'Indomaret' },
  { name: 'Sabun Mandi Lifebuoy Cair Refill 450ml', price: 23500, category: 'Toiletries', unit: 'botol', store: 'Indomaret' },
  { name: 'Sabun Cuci Piring Sunlight Lime 700ml', price: 15000, category: 'Toiletries', unit: 'botol', store: 'Alfamart' },
  { name: 'Biskuit Oreo Vanilla Roll 133g', price: 9500, category: 'Camilan', unit: 'pack', store: 'Indomaret' },
  { name: 'Keripik Chitato Sapi Panggang 68g', price: 11500, category: 'Camilan', unit: 'pack', store: 'Alfamart' }
];

// Classifier Otomatis Kategori & Satuan
function autoDetectCategoryAndUnit(name) {
  if (!name) return { category: 'Lainnya', unit: 'pcs' };
  const lower = name.toLowerCase();

  let unit = 'pcs';
  if (/\b(kg|kilogram|5kg|1kg|2kg)\b/i.test(lower)) unit = 'kg';
  else if (/\b(gr|gram|500g|250g)\b/i.test(lower)) unit = 'gram';
  else if (/\b(liter|ltr|lt|1l|2l|ml)\b/i.test(lower)) unit = 'liter';
  else if (/\b(bungkus|bks|mie|indomie)\b/i.test(lower)) unit = 'bungkus';
  else if (/\b(botol|btl|kecap|saus|sabun|shampoo|sunlight|minyak)\b/i.test(lower)) unit = 'botol';
  else if (/\b(kaleng|klg|sarden|kornet)\b/i.test(lower)) unit = 'kaleng';
  else if (/\b(ikat|bayam|kangkung)\b/i.test(lower)) unit = 'ikat';
  else if (/\b(pack|pak|biskuit|oreo|chitato|wafer|tisu)\b/i.test(lower)) unit = 'pack';
  else if (/\b(kotak|box|susu uht|keju|teh)\b/i.test(lower)) unit = 'kotak';

  let category = 'Lainnya';
  if (/\b(beras|minyak|telur|gula|tepung)\b/i.test(lower)) category = 'Sembako';
  else if (/\b(ayam|daging|sapi|ikan|bayam|kangkung|tomat|bawang|sayur)\b/i.test(lower)) category = 'Daging & Sayur';
  else if (/\b(mie|indomie|susu|kopi|teh|sarden|kornet|nugget)\b/i.test(lower)) category = 'Makanan Instan';
  else if (/\b(sabun|sunlight|rinso|pepsodent|shampoo|tisu)\b/i.test(lower)) category = 'Toiletries';
  else if (/\b(garam|kecap|saus|bumbu)\b/i.test(lower)) category = 'Bumbu & Minyak';
  else if (/\b(oreo|chitato|wafer|snack|camilan|cokelat|roti)\b/i.test(lower)) category = 'Camilan';

  return { category, unit };
}

// Format Rupiah Standar
function formatRupiah(num) {
  return 'Rp ' + Math.max(0, Math.round(num || 0)).toLocaleString('id-ID');
}

export default function SmartGroceryApp() {
  // Global State
  const [budgetLimit, setBudgetLimit] = useState(350000); // Default Rp 350.000 sesuai referensi
  const [selectedStore, setSelectedStore] = useState('Lotte Mart Grocery - Boulevard');
  const [selectedDate, setSelectedDate] = useState('2026-10-26');
  
  // Cart Items
  const [cartItems, setCartItems] = useState([
    {
      id: 'item-1',
      name: 'Beras Ramos Setra 5kg',
      price: 74500,
      qty: 1,
      category: 'Sembako',
      unit: 'kg',
      store: 'Lotte Mart',
      discount: { mode: 'tier', tier1: 50, tier2: 20 } // Cascading 50% + 20%
    },
    {
      id: 'item-2',
      name: 'Telur Ayam Negeri 1kg',
      price: 29500,
      qty: 1,
      category: 'Sembako',
      unit: 'kg',
      store: 'Lotte Mart',
      discount: { mode: 'single', singlePercent: 10 }
    }
  ]);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState({ code: 'HEMAT10K', discount: 10000 });

  // Custom Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customCategory, setCustomCategory] = useState('Sembako');
  const [customUnit, setCustomUnit] = useState('pcs');
  const [customDiscMode, setCustomDiscMode] = useState('none');
  const [customTier1, setCustomTier1] = useState(50);
  const [customTier2, setCustomTier2] = useState(20);
  const [customSingleDisc, setCustomSingleDisc] = useState(10);
  const [catalogSuggestions, setCatalogSuggestions] = useState([]);

  // Perhitungan Belanja & Diskon Bertingkat (Cascading Discount)
  const calculation = useMemo(() => {
    let subtotalNormal = 0;
    let totalAfterItemDiscount = 0;
    let itemSavings = 0;

    cartItems.forEach(item => {
      // Reactive: Item yang tidak dicentang tidak dihitung ke total belanja berjalan
      if (item.checked === false) return;

      const normalRow = item.price * item.qty;
      subtotalNormal += normalRow;

      let unitPriceAfterDiscount = item.price;
      if (item.discount?.mode === 'single') {
        const pct = item.discount.singlePercent || 0;
        unitPriceAfterDiscount = item.price * (1 - pct / 100);
      } else if (item.discount?.mode === 'tier') {
        // CASCADING DISCOUNT: 100k -> 50% (50k) -> 20% (40k)
        const t1 = item.discount.tier1 || 0;
        const t2 = item.discount.tier2 || 0;
        const afterStep1 = item.price * (1 - t1 / 100);
        unitPriceAfterDiscount = afterStep1 * (1 - t2 / 100);
      }

      const finalRow = Math.round(unitPriceAfterDiscount * item.qty);
      totalAfterItemDiscount += finalRow;
      itemSavings += (normalRow - finalRow);
    });

    const voucherDeduction = appliedVoucher ? appliedVoucher.discount : 0;
    const finalTotal = Math.max(0, totalAfterItemDiscount - voucherDeduction);
    const totalSavings = itemSavings + voucherDeduction;

    const remaining = budgetLimit - finalTotal;
    const spentPct = budgetLimit > 0 ? Math.round((finalTotal / budgetLimit) * 100) : 0;
    const clampedPct = Math.min(100, Math.max(0, spentPct));

    let status = 'safe';
    if (spentPct >= 90 || finalTotal > budgetLimit) status = 'danger';
    else if (spentPct >= 70) status = 'warning';

    // 10-Segment block count
    const activeSegments = finalTotal === 0 ? 0 : Math.max(1, Math.min(10, Math.round(spentPct / 10)));

    return {
      subtotalNormal,
      finalTotal,
      totalSavings,
      remaining,
      spentPct,
      clampedPct,
      status,
      activeSegments
    };
  }, [cartItems, appliedVoucher, budgetLimit]);

  // Handle Autocomplete Input
  const handleNameChange = (val) => {
    setCustomName(val);
    if (!val.trim()) {
      setCatalogSuggestions([]);
      return;
    }

    // Auto-assign kategori & satuan
    const detected = autoDetectCategoryAndUnit(val);
    if (detected.category !== 'Lainnya') setCustomCategory(detected.category);
    setCustomUnit(detected.unit);

    // Filter katalog supermarket
    const matches = SUPERMARKET_CATALOG.filter(i =>
      i.name.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 5);
    setCatalogSuggestions(matches);
  };

  const handleSelectCatalogItem = (item) => {
    setCustomName(item.name);
    setCustomPrice(item.price.toString());
    setCustomCategory(item.category);
    setCustomUnit(item.unit);
    setCatalogSuggestions([]);
  };

  // Tambah item ke keranjang
  const handleSaveItem = () => {
    if (!customName.trim() || isNaN(Number(customPrice)) || Number(customPrice) < 0) return;

    let discountObj = { mode: 'none' };
    if (customDiscMode === 'single') {
      discountObj = { mode: 'single', singlePercent: Number(customSingleDisc) || 0 };
    } else if (customDiscMode === 'tier') {
      discountObj = { mode: 'tier', tier1: Number(customTier1) || 50, tier2: Number(customTier2) || 20 };
    }

    const newItem = {
      id: 'item-' + Date.now(),
      name: customName,
      price: Number(customPrice),
      qty: Number(customQty) || 1,
      category: customCategory,
      unit: customUnit,
      store: selectedStore,
      discount: discountObj
    };

    setCartItems(prev => [newItem, ...prev]);
    setIsModalOpen(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
    setCustomDiscMode('none');
  };

  // Update kuantitas item
  const updateQty = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  // Hapus item
  const removeItem = (id) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  // Centang / Batal Centang Item (Reactive Checklist)
  const toggleCheck = (id) => {
    setCartItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const currentlyChecked = item.checked !== false;
      return { ...item, checked: !currentlyChecked };
    }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 font-sans pb-16 antialiased">
      {/* ===================================================================== */}
      {/* 1. HEADER ATAS (SMART GROCERY GUARDIAN WITH STORE & DATE PICKER)      */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Baris 1: Logo & Judul Smart Grocery GUARDIAN & Status ONLINE */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                    Smart Grocery
                  </h1>
                  <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400">
                    GUARDIAN
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                  Smart Household Financial Guardian & Real-Time Expense Protection
                </p>
              </div>
            </div>

            {/* Status Badge: ONLINE */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ONLINE</span>
            </div>
          </div>

          {/* Baris 2: Sub-Header Info (Toko Selector & Picker Tanggal) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Toko Selector */}
              <div className="relative flex items-center flex-1 max-w-xs">
                <Store className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full pl-7 pr-6 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer truncate"
                >
                  <option value="Lotte Mart Grocery - Boulevard">Lotte Mart Grocery - Boulevard</option>
                  <option value="Indomaret Minimarket">Indomaret Minimarket</option>
                  <option value="Alfamart">Alfamart</option>
                  <option value="Super Indo Modern">Super Indo Modern</option>
                  <option value="Hypermart Central">Hypermart Central</option>
                  <option value="Pasar Tradisional">Pasar Tradisional Modern</option>
                </select>
              </div>

              {/* Picker Tanggal */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTAINER                                                        */}
      {/* ===================================================================== */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-4 space-y-4">
        {/* ===================================================================== */}
        {/* 2. KARTU UTAMA ANGGARAN (SEAMLESS THEME INTEGRATED BUDGET CARD)       */}
        {/* ===================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-800 dark:text-slate-100 relative overflow-hidden transition-all duration-300"
        >
          {/* Subtle Glow Accents */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Dalam Card: Pill Status (Kiri) & Badge Hemat (Kanan) */}
          <div className="flex items-center justify-between relative z-10">
            {/* Pill Status Aman / Waspada */}
            <div
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-xs inline-flex items-center gap-1.5 ${
                calculation.status === 'safe'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : calculation.status === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  calculation.status === 'safe'
                    ? 'bg-emerald-500 animate-pulse'
                    : calculation.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span>
                {calculation.status === 'safe'
                  ? 'STATUS: AMAN'
                  : calculation.status === 'warning'
                  ? 'STATUS: WASPADA'
                  : 'STATUS: OVER LIMIT'}
              </span>
            </div>

            {/* Badge Hemat Rp */}
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-full shadow-xs">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{`HEMAT RP ${Math.round(calculation.totalSavings).toLocaleString('id-ID')}`}</span>
            </div>
          </div>

          {/* Area Anggaran Utama */}
          <div className="mt-4 relative z-10">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-widest block">
              TOTAL BELANJA BERJALAN
            </span>

            <div className="flex items-baseline justify-between mt-1">
              {/* Angka Besar */}
              <div className="flex items-baseline">
                <span className="text-slate-500 dark:text-slate-400 font-mono font-bold text-2xl sm:text-3xl mr-1.5">Rp</span>
                <motion.span
                  key={calculation.finalTotal}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="text-slate-900 dark:text-white font-mono font-black text-4xl sm:text-5xl tracking-tight"
                >
                  {calculation.finalTotal.toLocaleString('id-ID')}
                </motion.span>
              </div>

              {/* Sisi Kanan: Label Pemakaian & Cap % */}
              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest block">
                  PEMAKAIAN
                </span>
                <span className={`font-mono text-xl sm:text-2xl font-black ${
                  calculation.status === 'safe'
                    ? 'text-slate-800 dark:text-slate-100'
                    : calculation.status === 'warning'
                    ? 'text-[#F59E0B]'
                    : 'text-[#EF4444]'
                }`}>
                  {`${calculation.spentPct}% CAP`}
                </span>
              </div>
            </div>

            {/* Badge Sisa Anggaran: Mengikuti standar Dashboard & Settings (Hijau Emerald jika >= 0) */}
            <div className="mt-3.5 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Sisa Aman:{' '}
                <b className={`font-mono font-bold ml-1 ${
                  calculation.remaining >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {calculation.remaining >= 0 ? formatRupiah(calculation.remaining) : `Defisit ${formatRupiah(Math.abs(calculation.remaining))}`}
                </b>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                calculation.remaining >= 0
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
                  : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800/60'
              }`}>
                {calculation.remaining >= 0 ? `${Math.max(0, 100 - calculation.spentPct)}% Sisa` : 'Defisit Anggaran'}
              </span>
            </div>
          </div>

          {/* Segmented Progress Bar (10 Blok Kapsul Horizontal Terpisah) */}
          <div className="mt-4 pt-1 relative z-10 space-y-1.5">
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {[...Array(10)].map((_, idx) => {
                const isActive = idx < calculation.activeSegments;
                let bgClass = 'bg-slate-200 dark:bg-white/[0.08] border-slate-300/40 dark:border-white/[0.06]';

                if (isActive) {
                  if (calculation.status === 'safe') {
                    bgClass = 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.35)] border-[#10B981]';
                  } else if (calculation.status === 'warning') {
                    bgClass = 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.35)] border-[#F59E0B]';
                  } else {
                    bgClass = 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.45)] border-[#EF4444] animate-pulse';
                  }
                }

                return (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={{ scale: isActive ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    className={`h-2.5 sm:h-3 rounded-full border transition-all duration-300 ${bgClass}`}
                  />
                );
              })}
            </div>

            {/* Skala Bawah Progress Bar */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 pt-0.5">
              <span>Rp 0</span>
              <span>50%</span>
              <span className="text-[#F59E0B]">80% Waspada</span>
              <span className="text-slate-600 dark:text-slate-300">{`Max ${Math.round(budgetLimit / 1000)}k`}</span>
            </div>
          </div>
        </motion.div>

        {/* ===================================================================== */}
        {/* 3. TOMBOL TAMBAH BARANG BEBAS & VOUCHER PROMO                         */}
        {/* ===================================================================== */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-sm active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Barang Belanja Bebas</span>
          </button>
        </div>

        {/* Banner Voucher Aktif */}
        {appliedVoucher && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{appliedVoucher.code}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1.5">• Potongan Langsung Rp10.000</span>
              </div>
            </div>
            <button
              onClick={() => setAppliedVoucher(null)}
              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-rose-600"
            >
              Hapus
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 4. DAFTAR BARANG DALAM KERANJANG                                      */}
        {/* ===================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Item Keranjang ({cartItems.length})
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Subtotal: <b className="font-mono text-slate-900 dark:text-white">{formatRupiah(calculation.finalTotal)}</b>
            </span>
          </div>

          <AnimatePresence>
            {cartItems.map((item) => {
              const isChecked = item.checked !== false;

              // Diskon calculation
              let discountedPrice = item.price;
              let discountBadge = null;

              if (item.discount?.mode === 'single') {
                discountedPrice = item.price * (1 - (item.discount.singlePercent || 0) / 100);
                discountBadge = `Diskon ${item.discount.singlePercent}%`;
              } else if (item.discount?.mode === 'tier') {
                const step1 = item.price * (1 - (item.discount.tier1 || 0) / 100);
                discountedPrice = step1 * (1 - (item.discount.tier2 || 0) / 100);
                discountBadge = `Tier ${item.discount.tier1}% + ${item.discount.tier2}%`;
              }

              const rowTotal = Math.round(discountedPrice * item.qty);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-3 transition-all ${
                    isChecked ? '' : 'opacity-60 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition active:scale-90 shrink-0 ${
                        isChecked
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'border-2 border-slate-300 dark:border-slate-600 bg-transparent hover:border-emerald-500'
                      }`}
                      title={isChecked ? 'Dicentang: Masuk total belanja' : 'Belum Dicentang: Klik untuk memasukkan ke total'}
                    >
                      {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                        {discountBadge && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {discountBadge}
                          </span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold text-slate-900 dark:text-white leading-snug ${isChecked ? '' : 'line-through text-slate-400 dark:text-slate-500'}`}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium font-mono">
                        <span>Satuan: {item.unit}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatRupiah(discountedPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kuantitas Controls & Total */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-0.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shadow-xs active:scale-90"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs px-2 text-slate-800 dark:text-slate-100">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shadow-xs active:scale-90"
                      >
                        +
                      </button>
                    </div>

                    <span className={`font-mono font-black text-xs w-20 text-right ${isChecked ? 'text-slate-900 dark:text-white' : 'line-through text-slate-400 dark:text-slate-500'}`}>
                      {formatRupiah(rowTotal)}
                    </span>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

              if (item.discount?.mode === 'single') {
                discountedPrice = item.price * (1 - (item.discount.singlePercent || 0) / 100);
                discountBadge = `Diskon ${item.discount.singlePercent}%`;
              } else if (item.discount?.mode === 'tier') {
                const step1 = item.price * (1 - (item.discount.tier1 || 0) / 100);
                discountedPrice = step1 * (1 - (item.discount.tier2 || 0) / 100);
                discountBadge = `Tier ${item.discount.tier1}% + ${item.discount.tier2}%`;
              }

              const rowTotal = Math.round(discountedPrice * item.qty);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                      {discountBadge && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          {discountBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>Satuan: {item.unit}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-700">
                        {formatRupiah(discountedPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Kuantitas Controls & Total */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs active:scale-90"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs px-2 text-slate-800">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs active:scale-90"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-black text-xs text-slate-900 w-20 text-right">
                      {formatRupiah(rowTotal)}
                    </span>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* 5. MODAL TAMBAH BARANG BEBAS DENGAN KATALOG REAL-TIME                 */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-3.5 animate-slide-up text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Barang Belanja Bebas</h3>
                  <p className="text-[10px] text-slate-400">
                    Katalog supermarket, auto-assign kategori/satuan & diskon bertingkat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nama Produk dengan Auto-Complete Real-Time */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Produk / Barang <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ketik produk atau pilih katalog..."
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Suggestions Dropdown */}
              {catalogSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1 space-y-1">
                  {catalogSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCatalogItem(item)}
                      className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.category} • Satuan: {item.unit} • {item.store}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-amber-600">
                        {formatRupiah(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kategori & Satuan (Auto-Assigned) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kategori
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="Sembako">🌾 Sembako & Bahan Pokok</option>
                  <option value="Daging & Sayur">🥩 Daging & Sayur</option>
                  <option value="Makanan Instan">🍜 Makanan Instan</option>
                  <option value="Toiletries">🧼 Toiletries & Rumah Tangga</option>
                  <option value="Bumbu & Minyak">🧂 Bumbu & Minyak</option>
                  <option value="Camilan">🍪 Camilan / Jajan</option>
                  <option value="Lainnya">📦 Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Satuan
                </label>
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="pcs">pcs (buah)</option>
                  <option value="kg">kg</option>
                  <option value="gram">gram</option>
                  <option value="pack">pack</option>
                  <option value="liter">liter</option>
                  <option value="bungkus">bungkus</option>
                  <option value="botol">botol</option>
                  <option value="kaleng">kaleng</option>
                  <option value="ikat">ikat</option>
                  <option value="kotak">kotak</option>
                </select>
              </div>
            </div>

            {/* Kuantitas & Harga */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kuantitas
                </label>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-center text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Harga Satuan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Kalkulator Diskon Toko (Cascading 50%+20%) */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  Kalkulator Diskon Toko
                </span>
                <span className="text-[10px] font-semibold text-amber-700">Cascading 50%+20%</span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {['none', 'single', 'tier'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCustomDiscMode(mode)}
                    className={`py-1 rounded-lg text-[10px] font-bold transition ${
                      customDiscMode === mode
                        ? 'bg-amber-300 text-amber-950 border border-amber-400'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {mode === 'none' ? 'Tanpa' : mode === 'single' ? 'Tunggal %' : 'Bertingkat (Tier)'}
                  </button>
                ))}
              </div>

              {customDiscMode === 'tier' && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] text-amber-900 font-semibold">Tier 1 (%)</label>
                    <input
                      type="number"
                      value={customTier1}
                      onChange={(e) => setCustomTier1(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white border border-amber-200 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-900 font-semibold">Tier 2 (%)</label>
                    <input
                      type="number"
                      value={customTier2}
                      onChange={(e) => setCustomTier2(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white border border-amber-200 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Simpan */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="w-2/3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition shadow-sm active:scale-95"
              >
                ✓ Simpan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
