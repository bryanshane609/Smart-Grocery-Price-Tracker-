/**
 * =============================================================================
 * SMART GROCERY & HOUSEHOLD FINANCIAL GUARDIAN
 * Advanced Full-Stack JavaScript Engine
 * Fitur: Stacked Cascading Discount Calculator, Voucher & Kupon Belanja,
 * 4 Color Theme Selector, Fluid Bento Layout, Native Camera Barcode/OCR,
 * Strict Emergency Freeze, Multi-Tier Envelope Budgeting, dan Real-World Store Radar.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. DATA PRESETS, BARCODE CATALOG, VOUCHERS & RETAILERS
// -----------------------------------------------------------------------------
const DEFAULT_BUDGET_LIMIT = 800000;

// Database Voucher & Kupon Belanja
const VOUCHER_DATABASE = {
  "HEMAT10K": {
    code: "HEMAT10K",
    type: "nominal",
    value: 10000,
    minSpend: 50000,
    description: "Potongan Rp 10.000 (Min. belanja Rp 50.000)"
  },
  "SUPERHEMAT20": {
    code: "SUPERHEMAT20",
    type: "percentage",
    value: 20, // 20%
    maxDiscount: 25000,
    minSpend: 75000,
    description: "Diskon 20% hingga Rp 25.000 (Min. belanja Rp 75.000)"
  },
  "GAJIAN30K": {
    code: "GAJIAN30K",
    type: "nominal",
    value: 30000,
    minSpend: 150000,
    description: "Potongan Rp 30.000 (Min. belanja Rp 150.000)"
  },
  "DISKON50": {
    code: "DISKON50",
    type: "percentage",
    value: 50, // 50%
    maxDiscount: 35000,
    minSpend: 80000,
    description: "Diskon 50% hingga Rp 35.000 (Min. belanja Rp 80.000)"
  }
};

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

// -----------------------------------------------------------------------------
// 1.4. REAL-TIME PRICE FLUCTUATION DETECTION ENGINE (STORE & ITEM ISOLATION)
// -----------------------------------------------------------------------------
class PriceFluctuationEngine {
  constructor() {
    this.storageKey = 'sg_store_price_history';
    this.history = this.loadHistory();
  }

  normalizeKey(str = '') {
    return String(str).toLowerCase().trim().replace(/[\s\-_]+/g, ' ');
  }

  loadHistory() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  saveHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
      if (window.FirebaseSync && typeof window.FirebaseSync.syncPriceHistory === 'function') {
        window.FirebaseSync.syncPriceHistory(this.history);
      }
    } catch (_) {}
  }

  mergeRemoteHistory(remoteHistory) {
    if (!remoteHistory || typeof remoteHistory !== 'object') return;
    this.history = { ...this.history, ...remoteHistory };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (_) {}
  }

  seedBaselineCatalog() {
    if (Object.keys(this.history).length > 0) return;

    // Seed baseline historical pricing dari katalog untuk demonstrasi instant
    if (typeof SUPERMARKET_CATALOG !== 'undefined' && Array.isArray(SUPERMARKET_CATALOG)) {
      SUPERMARKET_CATALOG.forEach(item => {
        const store = item.store || 'Super Indo Supermarket';
        const sNorm = this.normalizeKey(store);
        const iNorm = this.normalizeKey(item.name);
        const key = `${sNorm}__${iNorm}`;
        const basePrice = item.price;

        this.history[key] = {
          storeId: 'seed_' + Math.random().toString(36).substring(2, 6),
          storeName: store,
          itemName: item.name,
          itemKey: iNorm,
          lastPrice: basePrice,
          averagePrice: basePrice,
          lowestPrice: Math.round(basePrice * 0.93),
          highestPrice: Math.round(basePrice * 1.07),
          lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString(),
          history: [
            { price: Math.round(basePrice * 0.95), timestamp: new Date(Date.now() - 14 * 86400000).toISOString() },
            { price: basePrice, timestamp: new Date(Date.now() - 7 * 86400000).toISOString() }
          ]
        };
      });
      this.saveHistory();
    }
  }

  recordPrice(storeName, itemName, currentPrice) {
    if (!storeName || !itemName || isNaN(currentPrice) || currentPrice <= 0) return;
    const sNorm = this.normalizeKey(storeName);
    const iNorm = this.normalizeKey(itemName);
    const key = `${sNorm}__${iNorm}`;
    const nowIso = new Date().toISOString();

    const existing = this.history[key];
    if (existing) {
      existing.history = Array.isArray(existing.history) ? existing.history : [];
      existing.history.push({ price: currentPrice, timestamp: nowIso });
      existing.lastPrice = currentPrice;
      existing.lowestPrice = Math.min(existing.lowestPrice || currentPrice, currentPrice);
      existing.highestPrice = Math.max(existing.highestPrice || currentPrice, currentPrice);

      const sum = existing.history.reduce((a, b) => a + (b.price || 0), 0);
      existing.averagePrice = Math.round(sum / existing.history.length);
      existing.lastUpdated = nowIso;
      existing.storeName = storeName;
    } else {
      this.history[key] = {
        storeId: 'rec_' + Date.now(),
        storeName: storeName,
        itemName: itemName,
        itemKey: iNorm,
        lastPrice: currentPrice,
        averagePrice: currentPrice,
        lowestPrice: currentPrice,
        highestPrice: currentPrice,
        lastUpdated: nowIso,
        history: [{ price: currentPrice, timestamp: nowIso }]
      };
    }

    this.saveHistory();
  }

  comparePrice(storeName, itemName, currentPrice) {
    if (!itemName || isNaN(currentPrice) || currentPrice <= 0) {
      return { status: 'none' };
    }

    const sNorm = this.normalizeKey(storeName || state?.selectedStore || '');
    const iNorm = this.normalizeKey(itemName);
    const exactKey = `${sNorm}__${iNorm}`;

    let record = this.history[exactKey];

    // Fuzzy search jika exact key di toko ini tidak ditemukan
    if (!record) {
      for (const k of Object.keys(this.history)) {
        if (k.startsWith(`${sNorm}__`)) {
          const recItemKey = this.history[k].itemKey;
          if (recItemKey.includes(iNorm) || iNorm.includes(recItemKey)) {
            record = this.history[k];
            break;
          }
        }
      }
    }

    if (record && record.lastPrice > 0) {
      const lastPrice = record.lastPrice;
      const diff = currentPrice - lastPrice;
      const pct = Math.abs(Math.round(((diff / lastPrice) * 100) * 10) / 10);

      if (diff > 0) {
        return {
          status: 'surge',
          diff,
          pct,
          lastPrice,
          lowestPrice: record.lowestPrice,
          highestPrice: record.highestPrice,
          avgPrice: record.averagePrice,
          lastDate: record.lastUpdated,
          storeName: record.storeName
        };
      } else if (diff < 0) {
        return {
          status: 'deal',
          diff: Math.abs(diff),
          pct,
          lastPrice,
          lowestPrice: record.lowestPrice,
          highestPrice: record.highestPrice,
          avgPrice: record.averagePrice,
          lastDate: record.lastUpdated,
          storeName: record.storeName
        };
      } else {
        return {
          status: 'stable',
          diff: 0,
          pct: 0,
          lastPrice,
          lowestPrice: record.lowestPrice,
          highestPrice: record.highestPrice,
          avgPrice: record.averagePrice,
          lastDate: record.lastUpdated,
          storeName: record.storeName
        };
      }
    }

    // Cross-store comparison jika ada data di toko lain
    let crossRecord = null;
    for (const k of Object.keys(this.history)) {
      const rec = this.history[k];
      if (rec.itemKey === iNorm || rec.itemKey.includes(iNorm) || iNorm.includes(rec.itemKey)) {
        if (!crossRecord || (rec.lowestPrice && rec.lowestPrice < crossRecord.lowestPrice)) {
          crossRecord = rec;
        }
      }
    }

    if (crossRecord) {
      return {
        status: 'new_with_cross_store',
        storeName: storeName || state?.selectedStore,
        otherStore: crossRecord.storeName,
        otherPrice: crossRecord.lastPrice,
        lowestPrice: crossRecord.lowestPrice
      };
    }

    return {
      status: 'new',
      storeName: storeName || (typeof state !== 'undefined' ? state?.selectedStore : '')
    };
  }
}

// -----------------------------------------------------------------------------
// 1.5. REAL-TIME SUPERMARKET PRODUCT CATALOG DATABASE & SMART AUTO-ASSIGN
// -----------------------------------------------------------------------------
const SUPERMARKET_CATALOG = [
  // Sembako & Bahan Pokok
  { name: 'Beras Ramos Setra 5kg', price: 74500, category: 'Sembako', unit: 'kg', store: 'Indomaret' },
  { name: 'Beras Pandan Wangi Premium 5kg', price: 88000, category: 'Sembako', unit: 'kg', store: 'Super Indo' },
  { name: 'Minyak Goreng Sania 2L', price: 37900, category: 'Sembako', unit: 'liter', store: 'Alfamart' },
  { name: 'Minyak Goreng Bimoli 2L', price: 38500, category: 'Sembako', unit: 'liter', store: 'Indomaret' },
  { name: 'Minyak Goreng Tropical Botol 2L', price: 39000, category: 'Sembako', unit: 'liter', store: 'Hypermart' },
  { name: 'Telur Ayam Negeri 1kg', price: 29500, category: 'Sembako', unit: 'kg', store: 'Pasar Tradisional' },
  { name: 'Gula Pasir Gulaku Premium 1kg', price: 17500, category: 'Sembako', unit: 'kg', store: 'Indomaret' },
  { name: 'Tepung Terigu Segitiga Biru 1kg', price: 13000, category: 'Sembako', unit: 'kg', store: 'Alfamart' },
  { name: 'Garam Beryodium Cap Kapal 250g', price: 4500, category: 'Sembako', unit: 'bungkus', store: 'Indomaret' },

  // Daging & Sayur & Makanan Segar
  { name: 'Daging Sapi Rendang Segar 1kg', price: 135000, category: 'Daging & Sayur', unit: 'kg', store: 'Super Indo' },
  { name: 'Daging Dada Ayam Fillet 1kg', price: 52000, category: 'Daging & Sayur', unit: 'kg', store: 'Super Indo' },
  { name: 'Ayam Broiler Utuh 1kg', price: 38000, category: 'Daging & Sayur', unit: 'kg', store: 'Pasar Tradisional' },
  { name: 'Ikan Gurame Segar 1kg', price: 45000, category: 'Daging & Sayur', unit: 'kg', store: 'Pasar Tradisional' },
  { name: 'Udang Vaname Segar 500g', price: 48000, category: 'Daging & Sayur', unit: 'pack', store: 'Super Indo' },
  { name: 'Sayur Bayam Hijau Segar 1 Ikat', price: 4000, category: 'Daging & Sayur', unit: 'ikat', store: 'Pasar Tradisional' },
  { name: 'Sayur Kangkung Segar 1 Ikat', price: 3500, category: 'Daging & Sayur', unit: 'ikat', store: 'Pasar Tradisional' },
  { name: 'Wortel Brastagi Segar 500g', price: 9500, category: 'Daging & Sayur', unit: 'pack', store: 'Super Indo' },
  { name: 'Tomat Merah Segar 500g', price: 8000, category: 'Daging & Sayur', unit: 'pack', store: 'Indomaret' },
  { name: 'Bawang Merah Brebes 500g', price: 24000, category: 'Daging & Sayur', unit: 'gram', store: 'Pasar Tradisional' },
  { name: 'Bawang Putih Honan 500g', price: 22000, category: 'Daging & Sayur', unit: 'gram', store: 'Pasar Tradisional' },
  { name: 'Cabe Rawit Merah 250g', price: 18000, category: 'Daging & Sayur', unit: 'gram', store: 'Pasar Tradisional' },

  // Makanan Olahan, Susu & Minuman
  { name: 'Susu UHT Ultra Milk Full Cream 1L', price: 19500, category: 'Makanan Instan', unit: 'liter', store: 'Indomaret' },
  { name: 'Susu Greenfields Fresh Milk 1L', price: 31000, category: 'Makanan Instan', unit: 'liter', store: 'Super Indo' },
  { name: 'Keju Kraft Cheddar All-in-1 165g', price: 22500, category: 'Makanan Instan', unit: 'kotak', store: 'Alfamart' },
  { name: 'Mentega Blue Band Serbaguna 200g', price: 11500, category: 'Makanan Instan', unit: 'pack', store: 'Indomaret' },
  { name: 'Indomie Goreng Spesial', price: 3100, category: 'Makanan Instan', unit: 'bungkus', store: 'Indomaret' },
  { name: 'Indomie Kuah Ayam Bawang', price: 3100, category: 'Makanan Instan', unit: 'bungkus', store: 'Alfamart' },
  { name: 'Mie Sedaap Goreng Ayam Krispi', price: 3100, category: 'Makanan Instan', unit: 'bungkus', store: 'Indomaret' },
  { name: 'Nugget Ayam Fiesta Crispy 500g', price: 46500, category: 'Makanan Instan', unit: 'pack', store: 'Super Indo' },
  { name: 'Sosis Kanzler Singles Original', price: 8500, category: 'Makanan Instan', unit: 'pcs', store: 'Alfamart' },
  { name: 'Kornet Daging Sapi Pronas 198g', price: 24000, category: 'Makanan Instan', unit: 'kaleng', store: 'Indomaret' },
  { name: 'Sarden ABC Saus Tomat 155g', price: 11500, category: 'Makanan Instan', unit: 'kaleng', store: 'Alfamart' },
  { name: 'Kopi Kapal Api Spesial Mix 10x24g', price: 14500, category: 'Makanan Instan', unit: 'pack', store: 'Indomaret' },
  { name: 'Teh Celup SariWangi 50s', price: 12000, category: 'Makanan Instan', unit: 'kotak', store: 'Indomaret' },
  { name: 'Air Mineral Aqua Botol 1500ml', price: 6500, category: 'Makanan Instan', unit: 'botol', store: 'Alfamart' },

  // Toiletries & Rumah Tangga
  { name: 'Sabun Mandi Cair Lifebuoy Refill 450ml', price: 23500, category: 'Toiletries', unit: 'botol', store: 'Indomaret' },
  { name: 'Sabun Cuci Piring Sunlight Lime 700ml', price: 15000, category: 'Toiletries', unit: 'botol', store: 'Alfamart' },
  { name: 'Deterjen Rinso Matic Front Load 750ml', price: 25500, category: 'Toiletries', unit: 'botol', store: 'Super Indo' },
  { name: 'Pewangi Molto Konsentrat 720ml', price: 18500, category: 'Toiletries', unit: 'botol', store: 'Indomaret' },
  { name: 'Pasta Gigi Pepsodent Pencegah Gigi Berlubang 190g', price: 15500, category: 'Toiletries', unit: 'pcs', store: 'Alfamart' },
  { name: 'Shampoo Pantene Anti Ketombe 290ml', price: 39000, category: 'Toiletries', unit: 'botol', store: 'Super Indo' },
  { name: 'Tisu Wajah Paseo Smart 250 Sheets', price: 16500, category: 'Toiletries', unit: 'pack', store: 'Indomaret' },

  // Bumbu & Minyak
  { name: 'Kecap Manis Bango Botol 275ml', price: 16500, category: 'Bumbu & Minyak', unit: 'botol', store: 'Indomaret' },
  { name: 'Saus Sambal ABC Extra Pedas 275ml', price: 13500, category: 'Bumbu & Minyak', unit: 'botol', store: 'Alfamart' },
  { name: 'Masako Rasa Ayam 10x10g', price: 5500, category: 'Bumbu & Minyak', unit: 'bungkus', store: 'Indomaret' },

  // Camilan & Jajan
  { name: 'Biskuit Oreo Vanilla Roll 133g', price: 9500, category: 'Camilan', unit: 'pack', store: 'Indomaret' },
  { name: 'Keripik Chitato Sapi Panggang 68g', price: 11500, category: 'Camilan', unit: 'pack', store: 'Alfamart' },
  { name: 'Wafer Tango Cokelat 130g', price: 8500, category: 'Camilan', unit: 'pack', store: 'Indomaret' },
  { name: 'Cokelat SilverQueen Cashew 58g', price: 17500, category: 'Camilan', unit: 'pcs', store: 'Indomaret' },
  { name: 'Roti Tawar Kupas Sari Roti', price: 16500, category: 'Camilan', unit: 'pack', store: 'Alfamart' }
];

/**
 * Smart Auto-Assign Classifier:
 * Secara otomatis mendeteksi kategori belanja dan satuan bawaan berdasarkan kata kunci
 */
function autoDetectCategoryAndUnit(productName) {
  if (!productName || typeof productName !== 'string') {
    return { category: 'Lainnya', unit: 'pcs' };
  }
  const lower = productName.toLowerCase();

  // 1. Detect Satuan
  let unit = 'pcs';
  if (/\b(kg|kilogram|5kg|2kg|1kg|10kg)\b/i.test(lower)) {
    unit = 'kg';
  } else if (/\b(gr|gram|g|250g|500g|100g)\b/i.test(lower)) {
    unit = 'gram';
  } else if (/\b(liter|ltr|lt|1l|2l|1\.5l|ml|450ml|700ml|750ml)\b/i.test(lower)) {
    unit = 'liter';
  } else if (/\b(bungkus|bgks|bks|mie|indomie|sedaap|garam)\b/i.test(lower)) {
    unit = 'bungkus';
  } else if (/\b(botol|btl|kecap|saus|sirup|shampoo|sunlight|minyak)\b/i.test(lower)) {
    unit = 'botol';
  } else if (/\b(kaleng|klg|sarden|kornet)\b/i.test(lower)) {
    unit = 'kaleng';
  } else if (/\b(ikat|bayam|kangkung|sawi)\b/i.test(lower)) {
    unit = 'ikat';
  } else if (/\b(pack|pak|biskuit|oreo|chitato|wafer|tisu|tissue|nugget)\b/i.test(lower)) {
    unit = 'pack';
  } else if (/\b(kotak|box|teh|keju|susu uht)\b/i.test(lower)) {
    unit = 'kotak';
  }

  // 2. Detect Category
  let category = 'Lainnya';
  if (/\b(beras|minyak|telur|telor|gula|tepung|terigu)\b/i.test(lower)) {
    category = 'Sembako';
  } else if (/\b(ayam|daging|sapi|fillet|broiler|ikan|udang|bayam|kangkung|wortel|tomat|bawang|cabe|cabai|sayur)\b/i.test(lower)) {
    category = 'Daging & Sayur';
  } else if (/\b(mie|indomie|sedaap|nugget|sosis|kornet|sarden|susu|keju|mentega|kopi|teh|air|mineral|aqua)\b/i.test(lower)) {
    category = 'Makanan Instan';
  } else if (/\b(sabun|sunlight|rinso|deterjen|molto|pepsodent|shampoo|tisu|tissue|pembersih|pasta gigi)\b/i.test(lower)) {
    category = 'Toiletries';
  } else if (/\b(garam|kecap|saus|sambal|masako|royco|merica|lada|bumbu)\b/i.test(lower)) {
    category = 'Bumbu & Minyak';
  } else if (/\b(oreo|chitato|tango|silverqueen|snack|camilan|jajan|wafer|keripik|biskuit|cokelat|roti)\b/i.test(lower)) {
    category = 'Camilan';
  }

  return { category, unit };
}

// -----------------------------------------------------------------------------
// 2. MATHEMATICAL CALCULATION ENGINE: STACKED / CASCADING DISCOUNT
// -----------------------------------------------------------------------------
/**
 * Menghitung harga akhir item dengan logika cascading discount:
 * Diskon bertumpuk wajib berurutan persentase, bukan penjumlahan langsung!
 * Contoh: 100.000 dengan promo 50% + 20%
 * Step 1: 100.000 * 0.50 = 50.000
 * Step 2: 50.000 * (1 - 0.20) = 40.000 (bukan diskon 70% / 30.000)
 */
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
    explanation = `Diskon ${p}% (-${formatRupiah(unitSavings)}/unit)`;
  } else if (disc.mode === 'tier') {
    const t1 = Math.min(100, Math.max(0, Number(disc.tier1) || 0));
    const t2 = Math.min(100, Math.max(0, Number(disc.tier2) || 0));
    
    // Perhitungan Cascading Presisi
    const priceAfterT1 = price * (1 - t1 / 100);
    finalUnitPrice = Math.max(0, priceAfterT1 * (1 - t2 / 100));
    unitSavings = price - finalUnitPrice;
    const effectivePercent = price > 0 ? Math.round((unitSavings / price) * 100) : 0;
    explanation = `Diskon Bertingkat ${t1}% + ${t2}%: Rp ${price.toLocaleString('id-ID')} dipotong ${t1}% jadi Rp ${Math.round(priceAfterT1).toLocaleString('id-ID')}, lalu dipotong lagi ${t2}% jadi Rp ${Math.round(finalUnitPrice).toLocaleString('id-ID')} (Diskon Efektif: ${effectivePercent}%, Hemat ${formatRupiah(unitSavings)}/unit)`;
  } else if (disc.mode === 'nominal') {
    const nom = Math.max(0, Number(disc.nominalAmount) || 0);
    finalUnitPrice = Math.max(0, price - nom);
    unitSavings = Math.min(price, nom);
    explanation = `Potongan langsung ${formatRupiah(unitSavings)}/unit`;
  }

  const roundedUnitPrice = Math.round(finalUnitPrice);
  const normalRowTotal = price * quantity;
  const rowTotal = roundedUnitPrice * quantity;
  const rowSavings = Math.round(unitSavings) * quantity;

  return {
    rawPrice: price,
    qty: quantity,
    finalUnitPrice: roundedUnitPrice,
    normalRowTotal,
    rowTotal,
    rowSavings,
    explanation,
    hasDiscount: unitSavings > 0
  };
}

function getCategoryEmoji(cat) {
  switch (cat) {
    case 'Sembako': return '🌾';
    case 'Daging & Sayur': return '🥩';
    case 'Makanan Instan': return '🍜';
    case 'Toiletries': return '🧼';
    case 'Camilan': return '🍪';
    default: return '📦';
  }
}

// -----------------------------------------------------------------------------
// 3. STATE MANAGER
// -----------------------------------------------------------------------------
class AppState {
  constructor() {
    this.budgetLimit = Number(localStorage.getItem('sg_budget_limit')) || DEFAULT_BUDGET_LIMIT;
    this.cart = this.loadData('sg_cart_items', this.getInitialSampleCart());
    // Auto-heal: Pastikan seluruh item troli aktif selalu ter-select (checked: true)
    if (Array.isArray(this.cart)) {
      this.cart = this.cart.map(item => ({ ...item, checked: true }));
    }
    this.history = this.loadData('sg_history_trips', []);
    this.pantry = this.loadData('sg_pantry_items', this.getInitialPantryItems());
    this.isFrozen = localStorage.getItem('sg_emergency_freeze') === 'true';
    this.activeCategoryFilter = 'ALL';
    this.soundEnabled = localStorage.getItem('sg_sound_enabled') !== 'false';
    this.colorTheme = localStorage.getItem('sg_color_theme') || 'emerald'; // 'emerald' | 'obsidian' | 'amber' | 'indigo'
    this.lightMode = localStorage.getItem('sg_light_mode') || 'dark'; // 'light' | 'dark'
    this.isBentoFluid = localStorage.getItem('sg_layout_mode') === 'fluid';
    this.appliedVoucher = this.loadData('sg_applied_voucher', null);
    this.selectedStore = localStorage.getItem('sg_selected_store') || '';
    this.selectedDate = localStorage.getItem('sg_selected_date') || new Date().toISOString().split('T')[0];
    this.userCoords = null;
    this.currentRadarRadius = 3000;
    this.radarStoreSearchQuery = '';
    this.liveNearbyStores = [];

    // Muat cache toko nyata jika ada dari sesi sebelumnya
    const cachedStoresRaw = localStorage.getItem('sg_cached_stores');
    if (cachedStoresRaw) {
      try {
        const parsed = JSON.parse(cachedStoresRaw);
        if (Array.isArray(parsed.stores) && parsed.stores.length > 0) {
          this.liveNearbyStores = parsed.stores;
          if (!this.selectedStore) {
            this.selectedStore = parsed.stores[0].name;
          }
        }
      } catch (_) {}
    }
    this.scannerStream = null;
    this.scannerMode = 'barcode';
    this.scannerDetector = null;
    this.itemFormDiscount = { mode: 'none', singlePercent: 0, tier1: 50, tier2: 20, nominalAmount: 0 };
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
        discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 },
        store: "Super Indo",
        isEssential: true,
        checked: true
      },
      {
        id: 'cart_' + Date.now() + '_2',
        name: "Sabun Lifebuoy Total 10 400ml",
        category: "Toiletries",
        unit: "botol",
        qty: 2,
        price: 25000,
        // Contoh Diskon Bertingkat 50% + 20%
        discount: { mode: 'tier', singlePercent: 0, tier1: 50, tier2: 20, nominalAmount: 0 },
        store: "Indomaret",
        isEssential: true,
        checked: true
      },
      {
        id: 'cart_' + Date.now() + '_3',
        name: "Minyak Goreng Sania 2L",
        category: "Bumbu & Minyak",
        unit: "liter",
        qty: 1,
        price: 33500,
        discount: { mode: 'none', singlePercent: 0, tier1: 0, tier2: 0, nominalAmount: 0 },
        store: "Alfamart",
        isEssential: true,
        checked: true
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
    if (window.FirebaseSync?.syncCart) {
      window.FirebaseSync.syncCart(this.cart);
    }
  }

  saveHistory() {
    localStorage.setItem('sg_history_trips', JSON.stringify(this.history));
    if (window.FirebaseSync?.syncShoppingHistory) {
      window.FirebaseSync.syncShoppingHistory(this.history);
    }
  }

  savePantry() {
    localStorage.setItem('sg_pantry_items', JSON.stringify(this.pantry));
    if (window.FirebaseSync?.syncPantry) {
      window.FirebaseSync.syncPantry(this.pantry);
    }
  }

  saveSettings() {
    localStorage.setItem('sg_budget_limit', this.budgetLimit.toString());
    localStorage.setItem('sg_emergency_freeze', this.isFrozen.toString());
    localStorage.setItem('sg_applied_voucher', JSON.stringify(this.appliedVoucher));
    localStorage.setItem('sg_sound_enabled', this.soundEnabled.toString());
    localStorage.setItem('sg_color_theme', this.colorTheme);
    localStorage.setItem('sg_light_mode', this.lightMode);
    localStorage.setItem('sg_layout_mode', this.isBentoFluid ? 'fluid' : 'standard');
    if (window.FirebaseSync?.syncSettings) {
      window.FirebaseSync.syncSettings({
        budgetLimit: this.budgetLimit,
        isFrozen: this.isFrozen,
        appliedVoucher: this.appliedVoucher,
        soundEnabled: this.soundEnabled,
        colorTheme: this.colorTheme,
        lightMode: this.lightMode,
        isBentoFluid: this.isBentoFluid
      });
    }
  }

  saveFreezeState() {
    this.saveSettings();
  }

  saveVoucherState() {
    this.saveSettings();
  }

  saveBudgetLimit(limit) {
    this.budgetLimit = Number(limit) || DEFAULT_BUDGET_LIMIT;
    this.saveSettings();
  }

  saveSessionState() {
    localStorage.setItem('sg_selected_store', this.selectedStore);
    localStorage.setItem('sg_selected_date', this.selectedDate);
    if (this.liveNearbyStores && this.liveNearbyStores.length > 0) {
      localStorage.setItem('sg_cached_stores', JSON.stringify({
        stores: this.liveNearbyStores,
        coords: this.userCoords,
        timestamp: Date.now()
      }));
    }
    if (window.FirebaseSync?.syncSessionState) {
      window.FirebaseSync.syncSessionState({
        selectedStore: this.selectedStore,
        selectedDate: this.selectedDate,
        userCoords: this.userCoords,
        liveNearbyStores: this.liveNearbyStores,
        activeCategoryFilter: this.activeCategoryFilter
      });
    }
  }

  saveSelectedStore(store) {
    this.selectedStore = store;
    this.saveSessionState();
  }

  saveSelectedDate(date) {
    this.selectedDate = date;
    this.saveSessionState();
  }

  saveNearbyStores(stores, coords = null) {
    this.liveNearbyStores = stores;
    if (coords) this.userCoords = coords;
    this.saveSessionState();
  }

  saveCustomQuickItems(items) {
    this.customQuickItems = items;
    localStorage.setItem('sg_quick_select', JSON.stringify(items));
    if (window.FirebaseSync?.syncQuickSelect) {
      window.FirebaseSync.syncQuickSelect(items);
    }
  }
}

const state = new AppState();
const priceFluctuationEngine = new PriceFluctuationEngine();
priceFluctuationEngine.seedBaselineCatalog();

// -----------------------------------------------------------------------------
// 4. SOUND ENGINE (WEB AUDIO API SYNTHESIZER)
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
    osc.frequency.setValueAtTime(1760, this.ctx.currentTime);
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

function safeCreateIcons(opts) {
  if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons(opts);
    } catch (e) {
      console.warn('Icon render non-critical warning:', e);
    }
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
    safeCreateIcons({ targets: [toastIcon] });
  }

  toast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2600);
}

// -----------------------------------------------------------------------------
// 5. TOTALS & VOUCHER VALIDATION CALCULATOR
// -----------------------------------------------------------------------------
function calculateCartTotals() {
  let subtotalNormal = 0;
  let itemsRowTotal = 0;
  let itemSavingsTotal = 0;

  state.cart.forEach(item => {
    // Reactive: Item yang tidak dicentang tidak dihitung ke total belanja berjalan
    if (item.checked === false) return;
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    subtotalNormal += pricing.normalRowTotal;
    itemsRowTotal += pricing.rowTotal;
    itemSavingsTotal += pricing.rowSavings;
  });

  // Calculate Voucher Deduction
  let voucherDiscountAmount = 0;
  let voucherIsValid = false;

  if (state.appliedVoucher && VOUCHER_DATABASE[state.appliedVoucher.code]) {
    const vDef = VOUCHER_DATABASE[state.appliedVoucher.code];
    if (itemsRowTotal >= vDef.minSpend) {
      voucherIsValid = true;
      if (vDef.type === 'nominal') {
        voucherDiscountAmount = vDef.value;
      } else if (vDef.type === 'percentage') {
        const calculated = itemsRowTotal * (vDef.value / 100);
        voucherDiscountAmount = Math.min(calculated, vDef.maxDiscount || calculated);
      }
      voucherDiscountAmount = Math.min(itemsRowTotal, Math.round(voucherDiscountAmount));
    }
  }

  const finalCartTotal = Math.max(0, itemsRowTotal - voucherDiscountAmount);
  const totalSavingsCombined = itemSavingsTotal + voucherDiscountAmount;

  return {
    subtotalNormal,
    itemsRowTotal,
    itemSavingsTotal,
    voucherDiscountAmount,
    voucherIsValid,
    finalCartTotal,
    totalSavingsCombined
  };
}

// -----------------------------------------------------------------------------
// 6. RENDER GUARDIAN, MULTI-TIER ENVELOPES & BURN RATE
// -----------------------------------------------------------------------------
function renderGuardianAndEnvelopes() {
  const totals = calculateCartTotals();
  const limit = state.budgetLimit;
  const remaining = limit - totals.finalCartTotal;
  const spentPct = limit > 0 ? Math.round((totals.finalCartTotal / limit) * 100) : 0;
  const clampedPct = Math.min(100, Math.max(0, spentPct));

  // Dynamic status tier:
  // Green: < 70% (Aman)
  // Amber: 70% - 90% (Waspada)
  // Red: > 90% (Kritis / Overbudget)
  let statusTier = 'safe';
  if (spentPct >= 90 || totals.finalCartTotal > limit) {
    statusTier = 'danger';
  } else if (spentPct >= 70) {
    statusTier = 'warning';
  }

  // ---------------------------------------------------------------------------
  // 0. UPDATE TOP HEADER & DARK CHARCOAL HERO CARD
  // ---------------------------------------------------------------------------
  const headerQuickBudgetAmount = document.getElementById('headerQuickBudgetAmount');
  const headerQuickBudgetAmountMobile = document.getElementById('headerQuickBudgetAmountMobile');
  const formattedCapK = Math.round(limit / 1000) + 'k';
  if (headerQuickBudgetAmount) headerQuickBudgetAmount.textContent = `Rp ${formattedCapK}`;
  if (headerQuickBudgetAmountMobile) headerQuickBudgetAmountMobile.textContent = `Rp ${formattedCapK}`;

  // Date picker default
  const headerDatePicker = document.getElementById('headerDatePicker');
  if (headerDatePicker && !headerDatePicker.value) {
    const today = new Date().toISOString().split('T')[0];
    headerDatePicker.value = today;
  }

  // Hero Card Status Pill
  const heroBudgetStatusPill = document.getElementById('heroBudgetStatusPill');
  const heroBudgetStatusDot = document.getElementById('heroBudgetStatusDot');
  const heroBudgetStatusText = document.getElementById('heroBudgetStatusText');
  if (heroBudgetStatusPill && heroBudgetStatusText) {
    if (statusTier === 'safe') {
      heroBudgetStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs inline-flex items-center gap-1.5';
      if (heroBudgetStatusDot) heroBudgetStatusDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
      heroBudgetStatusText.textContent = 'STATUS: AMAN';
    } else if (statusTier === 'warning') {
      heroBudgetStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs inline-flex items-center gap-1.5';
      if (heroBudgetStatusDot) heroBudgetStatusDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-500';
      heroBudgetStatusText.textContent = 'STATUS: WASPADA';
    } else {
      heroBudgetStatusPill.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs inline-flex items-center gap-1.5 animate-pulse';
      if (heroBudgetStatusDot) heroBudgetStatusDot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse';
      heroBudgetStatusText.textContent = totals.finalCartTotal > limit ? 'STATUS: OVER LIMIT' : 'STATUS: KRITIS';
    }
  }

  // Hero Card Savings Badge
  const heroSavingsText = document.getElementById('heroSavingsText');
  const totalCombinedSavings = (totals.totalSavings || 0) + (totals.voucherDiscount || 0);
  if (heroSavingsText) {
    heroSavingsText.textContent = `HEMAT RP ${Math.round(totalCombinedSavings).toLocaleString('id-ID')}`;
  }

  // Hero Card Big Numbers
  const heroCartTotalNumber = document.getElementById('heroCartTotalNumber');
  if (heroCartTotalNumber) {
    heroCartTotalNumber.textContent = totals.finalCartTotal.toLocaleString('id-ID');
  }

  const heroUsageCapText = document.getElementById('heroUsageCapText');
  if (heroUsageCapText) {
    heroUsageCapText.textContent = `${spentPct}% CAP`;
    if (statusTier === 'safe') {
      heroUsageCapText.className = 'font-mono text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100';
    } else if (statusTier === 'warning') {
      heroUsageCapText.className = 'font-mono text-xl sm:text-2xl font-black text-[#F59E0B]';
    } else {
      heroUsageCapText.className = 'font-mono text-xl sm:text-2xl font-black text-[#EF4444]';
    }
  }

  // Sisa Aman: Selalu mengikuti standar warna Dashboard / Settings (Hijau Emerald jika masih ada sisa dana, Merah jika Defisit)
  const heroRemainingNumber = document.getElementById('heroRemainingNumber');
  const heroRemainingSub = document.getElementById('heroRemainingSub');
  if (heroRemainingNumber) {
    if (remaining >= 0) {
      heroRemainingNumber.textContent = formatRupiah(remaining);
      heroRemainingNumber.className = 'text-emerald-600 dark:text-emerald-400 font-mono font-bold ml-1';
    } else {
      heroRemainingNumber.textContent = `Defisit ${formatRupiah(Math.abs(remaining))}`;
      heroRemainingNumber.className = 'text-rose-600 dark:text-rose-400 font-mono font-bold ml-1';
    }
  }
  if (heroRemainingSub) {
    if (remaining >= 0) {
      heroRemainingSub.textContent = `${Math.max(0, 100 - spentPct)}% Sisa`;
      heroRemainingSub.className = 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg';
    } else {
      heroRemainingSub.textContent = 'Defisit Anggaran';
      heroRemainingSub.className = 'text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-lg';
    }
  }

  // Hero Segmented Progress Bar (10 Blocks)
  const heroMaxLabel = document.getElementById('heroMaxLabel');
  if (heroMaxLabel) heroMaxLabel.textContent = `Max ${formattedCapK}`;

  const activeSegmentCount = totals.finalCartTotal === 0 ? 0 : Math.max(1, Math.min(10, Math.round(spentPct / 10)));
  const segBlocks = document.querySelectorAll('#heroSegmentedBar .seg-block');
  segBlocks.forEach((block, idx) => {
    const blockNum = idx + 1;
    if (blockNum <= activeSegmentCount) {
      if (statusTier === 'safe') {
        block.className = 'seg-block h-2.5 sm:h-3 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.35)] border border-[#10B981] transition-all duration-300';
      } else if (statusTier === 'warning') {
        block.className = 'seg-block h-2.5 sm:h-3 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.35)] border border-[#F59E0B] transition-all duration-300';
      } else {
        block.className = 'seg-block h-2.5 sm:h-3 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.45)] border border-[#EF4444] transition-all duration-300 animate-pulse';
      }
    } else {
      block.className = 'seg-block h-2.5 sm:h-3 rounded-full bg-slate-200 dark:bg-white/[0.08] border border-slate-300/40 dark:border-white/[0.06] shadow-none transition-all duration-300';
    }
  });

  // 1. UPDATE INTERACTIVE VISUAL BUDGET DASHBOARD (SVG GAUGE & 3 STAT CARDS)
  const gaugeCircle = document.getElementById('budgetGaugeCircle');
  const gaugePercent = document.getElementById('budgetGaugePercent');
  const gaugeStatusText = document.getElementById('gaugeStatusText');
  const visualStatusBadge = document.getElementById('budgetVisualStatusBadge');

  const circumference = 251.327;
  const offset = circumference - (clampedPct / 100) * circumference;

  if (gaugeCircle) {
    gaugeCircle.style.strokeDashoffset = offset;
    if (statusTier === 'safe') {
      gaugeCircle.style.stroke = '#10B981';
    } else if (statusTier === 'warning') {
      gaugeCircle.style.stroke = '#F59E0B';
    } else {
      gaugeCircle.style.stroke = '#F43F5E';
    }
  }

  if (gaugePercent) {
    gaugePercent.textContent = `${spentPct}%`;
    if (statusTier === 'safe') {
      gaugePercent.className = 'text-xl font-black font-mono text-emerald-600 dark:text-emerald-400';
    } else if (statusTier === 'warning') {
      gaugePercent.className = 'text-xl font-black font-mono text-amber-500 dark:text-amber-400';
    } else {
      gaugePercent.className = 'text-xl font-black font-mono text-rose-500 dark:text-rose-400';
    }
  }

  if (gaugeStatusText) {
    if (statusTier === 'safe') {
      gaugeStatusText.textContent = `🟢 Aman (${formatRupiah(remaining)} tersisa)`;
      gaugeStatusText.className = 'text-[11px] font-bold text-emerald-600 dark:text-emerald-400';
    } else if (statusTier === 'warning') {
      gaugeStatusText.textContent = `🟡 Waspada (${spentPct}% terpakai)`;
      gaugeStatusText.className = 'text-[11px] font-bold text-amber-500 dark:text-amber-400';
    } else {
      gaugeStatusText.textContent = totals.finalCartTotal > limit 
        ? `🔴 Defisit ${formatRupiah(Math.abs(remaining))}!` 
        : `🔴 Kritis (Sisa ${formatRupiah(remaining)})`;
      gaugeStatusText.className = 'text-[11px] font-bold text-rose-500 dark:text-rose-400';
    }
  }

  if (visualStatusBadge) {
    if (statusTier === 'safe') {
      visualStatusBadge.className = 'shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
      visualStatusBadge.textContent = '🟢 Anggaran Aman';
    } else if (statusTier === 'warning') {
      visualStatusBadge.className = 'shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      visualStatusBadge.textContent = '🟡 Waspada';
    } else {
      visualStatusBadge.className = 'shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse';
      visualStatusBadge.textContent = totals.finalCartTotal > limit ? '🔴 Defisit' : '🔴 Kritis';
    }
  }

  // Update 3 Stat Cards
  const statTotal = document.getElementById('statTotalBudget');
  const statSpent = document.getElementById('statSpentBudget');
  const statSpentPct = document.getElementById('statSpentPct');
  const statRem = document.getElementById('statRemainingBudget');
  const statRemPct = document.getElementById('statRemainingPct');

  if (statTotal) statTotal.textContent = formatRupiah(limit);
  if (statSpent) statSpent.textContent = formatRupiah(totals.finalCartTotal);
  if (statSpentPct) statSpentPct.textContent = `${spentPct}%`;

  if (statRem) {
    statRem.textContent = formatRupiah(remaining);
    statRem.className = remaining < 0 
      ? 'text-xs font-bold font-mono text-rose-600 dark:text-rose-400' 
      : 'text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400';
  }
  if (statRemPct) {
    if (remaining < 0) {
      statRemPct.textContent = 'Defisit';
      statRemPct.className = 'text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg';
    } else {
      statRemPct.textContent = `${Math.max(0, 100 - spentPct)}% Sisa`;
      statRemPct.className = 'text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg';
    }
  }

  // Update Dynamic Linear Progress Bar
  const linearBar = document.getElementById('budgetLinearProgressBar');
  const linearLabel = document.getElementById('budgetLinearLabel');
  if (linearBar) {
    linearBar.style.width = `${clampedPct}%`;
    if (statusTier === 'safe') {
      linearBar.style.backgroundColor = '#10B981';
    } else if (statusTier === 'warning') {
      linearBar.style.backgroundColor = '#F59E0B';
    } else {
      linearBar.style.backgroundColor = '#F43F5E';
    }
  }
  if (linearLabel) {
    linearLabel.textContent = `${spentPct}% dari batas bulanan`;
  }

  // 2. HEADER QUICK BAR
  const cartTotalHeader = document.getElementById('cartTotalHeader');
  const budgetRemainingHeader = document.getElementById('budgetRemainingHeader');
  const freezeMiniIndicator = document.getElementById('freezeMiniIndicator');

  if (cartTotalHeader) cartTotalHeader.textContent = formatRupiah(totals.finalCartTotal);
  if (budgetRemainingHeader) {
    budgetRemainingHeader.textContent = formatRupiah(remaining);
    budgetRemainingHeader.className = remaining < 0 
      ? 'font-mono font-bold text-rose-500 ml-1' 
      : 'font-mono font-bold text-brand-500 ml-1';
  }

  if (freezeMiniIndicator) {
    freezeMiniIndicator.className = state.isFrozen 
      ? 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse' 
      : 'w-2.5 h-2.5 rounded-full bg-brand-500';
  }

  // Strict Freeze Card Status
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

  // Multi-Tier Envelope Calculations
  const envCaps = {
    'Sembako': Math.round(limit * 0.45),
    'Protein': Math.round(limit * 0.30),
    'Toiletries': Math.round(limit * 0.15),
    'Camilan': Math.round(limit * 0.10)
  };

  const envSpend = { 'Sembako': 0, 'Protein': 0, 'Toiletries': 0, 'Camilan': 0 };

  state.cart.forEach(item => {
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    if (item.category === 'Sembako' || item.category === 'Bumbu & Minyak') {
      envSpend['Sembako'] += pricing.rowTotal;
    } else if (item.category === 'Daging & Sayur' || item.category === 'Makanan Instan') {
      envSpend['Protein'] += pricing.rowTotal;
    } else if (item.category === 'Toiletries') {
      envSpend['Toiletries'] += pricing.rowTotal;
    } else {
      envSpend['Camilan'] += pricing.rowTotal;
    }
  });

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

  // Burn Rate & Health Score
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const safeDailyAllowance = remaining > 0 ? Math.round(remaining / remainingDays) : 0;
  const currentDailyRate = Math.round(totals.finalCartTotal / Math.max(1, currentDay));

  const healthScoreEl = document.getElementById('healthScoreDisplay');
  const healthWordEl = document.getElementById('healthStatusWord');
  const burnRateEl = document.getElementById('burnRateText');
  const velocityBanner = document.getElementById('spendingVelocityBanner');
  const velocityText = document.getElementById('velocityWarningText');

  let healthScore = 100;
  if (totals.finalCartTotal > limit) {
    healthScore = 10;
  } else {
    const spentRatio = totals.finalCartTotal / limit;
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
      healthWordEl.className = 'text-xs font-semibold text-brand-400';
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
    if (totals.finalCartTotal > limit) {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>Peringatan Kritis:</b> Pengeluaran telah melampaui batas anggaran! Defisit sebesar ${formatRupiah(Math.abs(remaining))}. Kunci pengeluaran segera!`;
    } else if (currentDailyRate > safeDailyAllowance * 1.5 && currentDay < 20) {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>AI Spending Velocity Alert:</b> Kecepatan belanja (${formatRupiah(currentDailyRate)}/hari) melampaui jatah aman harian (${formatRupiah(safeDailyAllowance)}/hari). Jika berlanjut, anggaran akan habis lebih awal!`;
    } else {
      velocityBanner.className = 'mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-start gap-2';
      velocityText.innerHTML = `<b>Proyeksi Keuangan AI:</b> Pengeluaran Anda berada dalam kurva aman. Saldo belanja diproyeksikan mencukupi hingga akhir bulan.`;
    }
  }
}

// -----------------------------------------------------------------------------
// 7. RENDER TROLI BELANJA, STACKED DISCOUNTS & VOUCHER BANNER
// -----------------------------------------------------------------------------
function renderCartItems() {
  const container = document.getElementById('cartItemList');
  const emptyView = document.getElementById('emptyCartView');
  const actionFooter = document.getElementById('cartActionFooter');
  const totalItemsCount = document.getElementById('totalItemsCount');
  const navCartBadge = document.getElementById('navCartBadge');
  const totalSavingsAmount = document.getElementById('totalSavingsAmount');
  if (!container) return;

  const totals = calculateCartTotals();

  if (totalItemsCount) totalItemsCount.textContent = `${state.cart.length} item`;
  if (navCartBadge) navCartBadge.textContent = state.cart.length.toString();
  if (totalSavingsAmount) totalSavingsAmount.textContent = formatRupiah(totals.totalSavingsCombined);

  // Update Persistent Sticky Dock
  const dockCartBadge = document.getElementById('dockCartBadge');
  const dockFinalTotal = document.getElementById('dockFinalTotal');
  const dockRemainingBadge = document.getElementById('dockRemainingBadge');
  if (dockCartBadge) dockCartBadge.textContent = `${state.cart.length} item`;
  if (dockFinalTotal) dockFinalTotal.textContent = formatRupiah(totals.finalCartTotal);
  if (dockRemainingBadge) {
    const remaining = state.budgetLimit - totals.finalCartTotal;
    if (remaining >= 0) {
      dockRemainingBadge.className = 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg whitespace-nowrap';
      dockRemainingBadge.textContent = `Sisa ${formatRupiah(remaining)}`;
    } else {
      dockRemainingBadge.className = 'text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-lg whitespace-nowrap';
      dockRemainingBadge.textContent = `Defisit ${formatRupiah(Math.abs(remaining))}`;
    }
  }

  // Update Footer Breakdown
  const fSubtotalNormal = document.getElementById('footerSubtotalNormal');
  const fItemSavingsAmount = document.getElementById('footerItemSavingsAmount');
  const fVoucherRow = document.getElementById('footerVoucherDiscountRow');
  const fVoucherAmount = document.getElementById('footerVoucherDiscountAmount');
  const fFinalTotal = document.getElementById('footerFinalTotal');

  if (fSubtotalNormal) fSubtotalNormal.textContent = formatRupiah(totals.subtotalNormal);
  if (fItemSavingsAmount) fItemSavingsAmount.textContent = `-${formatRupiah(totals.itemSavingsTotal)}`;
  
  if (fVoucherRow && fVoucherAmount) {
    if (totals.voucherDiscountAmount > 0) {
      fVoucherRow.classList.remove('hidden');
      fVoucherAmount.textContent = `-${formatRupiah(totals.voucherDiscountAmount)}`;
    } else {
      fVoucherRow.classList.add('hidden');
    }
  }

  if (fFinalTotal) fFinalTotal.textContent = formatRupiah(totals.finalCartTotal);

  // Update Active Voucher Banner
  const voucherBanner = document.getElementById('activeVoucherBanner');
  const voucherCodeText = document.getElementById('activeVoucherCodeText');
  const voucherDescText = document.getElementById('activeVoucherDescText');

  if (state.appliedVoucher && VOUCHER_DATABASE[state.appliedVoucher.code]) {
    const vDef = VOUCHER_DATABASE[state.appliedVoucher.code];
    if (voucherBanner) voucherBanner.classList.remove('hidden');
    if (voucherCodeText) voucherCodeText.textContent = vDef.code;
    if (voucherDescText) {
      if (totals.itemsRowTotal >= vDef.minSpend) {
        voucherDescText.textContent = `✓ Hemat ${formatRupiah(totals.voucherDiscountAmount)} (${vDef.description})`;
      } else {
        const diff = vDef.minSpend - totals.itemsRowTotal;
        voucherDescText.textContent = `⚠️ Kurang ${formatRupiah(diff)} lagi untuk aktifkan kupon`;
      }
    }
  } else {
    if (voucherBanner) voucherBanner.classList.add('hidden');
  }

  // Sync Cart Drawer jika sedang terbuka
  renderCartDrawer();

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
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    const isImpulse = item.category === 'Camilan' || item.category === 'Lainnya';
    const isChecked = item.checked !== false;

    // Real-Time Price Fluctuation Comparison for this store
    const fluc = priceFluctuationEngine.comparePrice(item.store, item.name, item.price);
    let flucBadgeHtml = '';
    if (fluc.status === 'surge') {
      flucBadgeHtml = `<span class="shrink-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 inline-flex items-center gap-0.5" title="Harga naik Rp ${formatRupiah(fluc.diff)} (+${fluc.pct}%) dari belanja sebelumnya"><i data-lucide="trending-up" class="w-2.5 h-2.5"></i> +${fluc.pct}%</span>`;
    } else if (fluc.status === 'deal') {
      flucBadgeHtml = `<span class="shrink-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 inline-flex items-center gap-0.5" title="Harga promo turun Rp ${formatRupiah(fluc.diff)} (-${fluc.pct}%)"><i data-lucide="trending-down" class="w-2.5 h-2.5"></i> -${fluc.pct}%</span>`;
    } else if (fluc.status === 'stable') {
      flucBadgeHtml = `<span class="shrink-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60 inline-flex items-center gap-0.5" title="Harga sama stabil seperti terakhir kali"><i data-lucide="minus" class="w-2.5 h-2.5"></i> Stabil</span>`;
    }

    let discountBadgeHtml = '';
    if (pricing.hasDiscount) {
      discountBadgeHtml = `
        <div class="mt-1 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-[10px] text-amber-800 dark:text-amber-300 leading-tight">
          <b>Diskon:</b> ${pricing.explanation}
        </div>
      `;
    }

    html += `
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col space-y-2 transition-all ${isChecked ? '' : 'opacity-70 bg-slate-50/80 dark:bg-slate-800/60'}">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-2.5">
            <button class="btn-toggle-check w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition active:scale-90 shrink-0 ${isChecked ? 'bg-brand-500 text-white shadow-xs' : 'border-2 border-slate-300 dark:border-slate-600 bg-transparent hover:border-brand-500'}" data-id="${item.id}" title="${isChecked ? 'Dicentang: Masuk total belanja' : 'Tidak Dicentang: Klik untuk memasukkan ke total'}">
              ${isChecked ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>' : ''}
            </button>
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${item.category}</span>
                ${isImpulse ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Non-Esensial</span>' : '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-400">Esensial</span>'}
                <span class="text-[10px] text-slate-400 font-medium">@ ${item.store || state?.selectedStore || 'Supermarket'}</span>
                ${flucBadgeHtml}
              </div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${item.name}</h4>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                ${formatRupiah(pricing.finalUnitPrice)} / ${item.unit || 'pcs'}
                ${pricing.hasDiscount ? `<span class="line-through text-slate-400 ml-1.5">${formatRupiah(item.price)}</span>` : ''}
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <div class="text-sm font-black font-mono text-slate-900 dark:text-white">${formatRupiah(pricing.rowTotal)}</div>
            ${pricing.hasDiscount ? `<span class="text-[9px] font-bold text-brand-600 dark:text-brand-400">Hemat ${formatRupiah(pricing.rowSavings)}</span>` : ''}
          </div>
        </div>

        ${discountBadgeHtml}

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div class="flex items-center gap-1.5">
            <button class="btn-qty-minus w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition" data-id="${item.id}">-</button>
            <span class="px-2 text-xs font-bold font-mono text-slate-800 dark:text-slate-100">${item.qty} ${item.unit || 'pcs'}</span>
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
  safeCreateIcons();
}

function attachCartEventListeners() {
  document.querySelectorAll('.btn-toggle-check').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        const currentlyChecked = item.checked !== false;
        item.checked = !currentlyChecked;
        state.saveCart();
        renderCartItems();
        sounds.playClick();
      }
    };
  });
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
        const nextPricing = calculateItemPricing(item.price, item.qty + 1, item.discount);
        const currentPricing = calculateItemPricing(item.price, item.qty, item.discount);
        const addedNominal = nextPricing.rowTotal - currentPricing.rowTotal;

        const totals = calculateCartTotals();
        if (state.isFrozen && (totals.finalCartTotal + addedNominal) > state.budgetLimit) {
          showStrictFreezeModal('Kuantitas tidak dapat ditambah karena total akan melebihi batas anggaran hard-cap!');
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
// 7.5. INTERACTIVE CART DRAWER & HORIZONTAL QUICK SELECT CAROUSEL
// -----------------------------------------------------------------------------
function openCartDrawer() {
  const drawer = document.getElementById('cartReviewDrawer');
  if (!drawer) return;
  drawer.classList.remove('hidden', 'pointer-events-none');
  drawer.classList.add('pointer-events-auto');
  renderCartDrawer();
  sounds.playClick();
  safeCreateIcons();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartReviewDrawer');
  if (drawer) {
    drawer.classList.add('hidden', 'pointer-events-none');
    drawer.classList.remove('pointer-events-auto');
  }
}

function renderCartDrawer() {
  const container = document.getElementById('drawerItemList');
  const countBadge = document.getElementById('drawerItemCountBadge');
  const subtotalNormal = document.getElementById('drawerSubtotalNormal');
  const savingsAmount = document.getElementById('drawerSavingsAmount');
  const finalTotal = document.getElementById('drawerFinalTotal');
  if (!container) return;

  const totals = calculateCartTotals();
  if (countBadge) countBadge.textContent = `${state.cart.length} Barang`;
  if (subtotalNormal) subtotalNormal.textContent = formatRupiah(totals.subtotalNormal);
  if (savingsAmount) savingsAmount.textContent = `-${formatRupiah(totals.totalSavingsCombined)}`;
  if (finalTotal) finalTotal.textContent = formatRupiah(totals.finalCartTotal);

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-slate-400">
        <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600"></i>
        <p class="text-xs font-semibold">Troli belanja Anda masih kosong</p>
      </div>
    `;
    safeCreateIcons();
    return;
  }

  let html = '';
  state.cart.forEach(item => {
    const pricing = calculateItemPricing(item.price, item.qty, item.discount);
    const emoji = getCategoryEmoji(item.category);

    html += `
      <div class="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base shrink-0">
            ${emoji}
          </div>
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">${item.name}</h4>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
              <span class="whitespace-nowrap">${formatRupiah(pricing.finalUnitPrice)} / ${item.unit}</span>
              <span>&bull;</span>
              <span class="truncate">@ ${item.store || 'Super Indo'}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Stepper -->
          <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-600">
            <button class="drawer-qty-minus w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition" data-id="${item.id}">-</button>
            <span class="font-mono text-xs font-bold px-1 min-w-[18px] text-center">${item.qty}</span>
            <button class="drawer-qty-plus w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition" data-id="${item.id}">+</button>
          </div>

          <!-- Total -->
          <div class="text-right min-w-[60px]">
            <span class="font-mono font-black text-xs text-slate-900 dark:text-white block whitespace-nowrap">${formatRupiah(pricing.rowTotal)}</span>
          </div>

          <button class="drawer-btn-delete p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0" data-id="${item.id}" title="Hapus Barang">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.drawer-qty-minus').forEach(btn => {
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

  container.querySelectorAll('.drawer-qty-plus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const item = state.cart.find(i => i.id === id);
      if (item) {
        item.qty += 1;
        state.saveCart();
        renderCartItems();
        sounds.playClick();
      }
    };
  });

  container.querySelectorAll('.drawer-btn-delete').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      state.cart = state.cart.filter(i => i.id !== id);
      state.saveCart();
      renderCartItems();
      sounds.playClick();
      showToast('Barang dihapus dari troli');
    };
  });

  safeCreateIcons();
}

function renderQuickSelectCarousel() {
  const container = document.getElementById('quickSelectCarousel');
  if (!container) return;

  const quickItems = SUPERMARKET_CATALOG.slice(0, 10);
  let html = '';
  quickItems.forEach(item => {
    const emoji = getCategoryEmoji(item.category);
    html += `
      <div class="carousel-item shrink-0 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-brand-500 transition-all flex flex-col justify-between w-36 sm:w-40 select-none" style="scroll-snap-align: start;">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-base">${emoji}</span>
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[75px]">@ ${item.store}</span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug" title="${item.name}">${item.name}</h4>
          <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${item.unit}</span>
        </div>
        <div class="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span class="font-mono font-bold text-xs text-brand-600 dark:text-brand-400 whitespace-nowrap">${formatRupiah(item.price)}</span>
          <button type="button" class="btn-quick-add-carousel w-6 h-6 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition active:scale-90" data-name="${item.name}" title="Tambah ke Troli">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-quick-add-carousel').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const itemName = btn.getAttribute('data-name');
      const found = SUPERMARKET_CATALOG.find(i => i.name === itemName);
      if (found) {
        validateAndAddItemToCart({
          name: found.name,
          category: found.category,
          unit: found.unit,
          qty: 1,
          price: found.price,
          discount: { mode: 'none' },
          store: found.store
        });
        sounds.playClick();
      }
    };
  });

  safeCreateIcons();
  setupCarouselChevrons();
}

function setupCarouselChevrons() {
  const container = document.getElementById('quickSelectCarousel');
  const prevBtn = document.getElementById('quickCarouselPrevBtn');
  const nextBtn = document.getElementById('quickCarouselNextBtn');
  if (!container || !prevBtn || !nextBtn) return;

  const updateButtons = () => {
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    prevBtn.disabled = scrollLeft <= 4;
    nextBtn.disabled = scrollLeft >= maxScroll - 4;
  };

  prevBtn.onclick = () => {
    container.scrollBy({ left: -200, behavior: 'smooth' });
  };
  nextBtn.onclick = () => {
    container.scrollBy({ left: 200, behavior: 'smooth' });
  };

  container.onscroll = updateButtons;
  updateButtons();
}

function setupModalChipsChevrons() {
  const container = document.getElementById('modalChipsContainer');
  const prevBtn = document.getElementById('modalChipsPrevBtn');
  const nextBtn = document.getElementById('modalChipsNextBtn');
  if (!container || !prevBtn || !nextBtn) return;

  prevBtn.onclick = () => container.scrollBy({ left: -160, behavior: 'smooth' });
  nextBtn.onclick = () => container.scrollBy({ left: 160, behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// 8. VOUCHER & KUPON BELANJA ACTIONS
// -----------------------------------------------------------------------------
function handleApplyVoucher(codeString) {
  const code = (codeString || '').trim().toUpperCase();
  if (!code) {
    showToast('Masukkan kode kupon voucher valid!', 'alert-triangle');
    return;
  }

  const vDef = VOUCHER_DATABASE[code];
  if (!vDef) {
    showToast(`Kode voucher "${code}" tidak ditemukan atau sudah kadaluwarsa!`, 'alert-triangle');
    sounds.playAlarm();
    return;
  }

  const totals = calculateCartTotals();
  if (totals.itemsRowTotal < vDef.minSpend) {
    const diff = vDef.minSpend - totals.itemsRowTotal;
    showToast(`Voucher ${code} butuh minimum belanja ${formatRupiah(vDef.minSpend)}. Tambah ${formatRupiah(diff)} lagi!`, 'alert-triangle');
    sounds.playAlarm();
    return;
  }

  state.appliedVoucher = { code };
  state.saveVoucherState();
  renderCartItems();
  sounds.playClick();
  showToast(`Voucher ${code} berhasil diterapkan!`, 'check-circle');
}

function handleRemoveVoucher() {
  state.appliedVoucher = null;
  state.saveVoucherState();
  renderCartItems();
  sounds.playClick();
  showToast('Voucher belanja dilepas');
}

// -----------------------------------------------------------------------------
// 9. STRICT EMERGENCY FREEZE ENFORCEMENT & BARRIER
// -----------------------------------------------------------------------------
function showStrictFreezeModal(reasonMessage) {
  const modal = document.getElementById('strictFreezeModal');
  const msgEl = document.getElementById('strictFreezeMessage');
  const limitEl = document.getElementById('freezeModalLimit');
  const spendEl = document.getElementById('freezeModalSpend');

  if (msgEl && reasonMessage) msgEl.textContent = reasonMessage;
  if (limitEl) limitEl.textContent = formatRupiah(state.budgetLimit);
  if (spendEl) spendEl.textContent = formatRupiah(calculateCartTotals().finalCartTotal);

  if (modal) modal.classList.remove('hidden');
}

function validateAndAddItemToCart(itemData) {
  const isImpulse = itemData.category === 'Camilan' || itemData.category === 'Lainnya';
  const totals = calculateCartTotals();
  const pricing = calculateItemPricing(itemData.price, itemData.qty, itemData.discount);
  const projectedTotal = totals.finalCartTotal + pricing.rowTotal;

  // RULE 1: Emergency Freeze Active & Item is Non-Essential
  if (state.isFrozen && isImpulse) {
    showStrictFreezeModal('Sistem menolak transaksi ini karena kategori "Camilan / Non-Esensial" diblokir mutlak saat Emergency Freeze aktif.');
    sounds.playAlarm();
    return false;
  }

  // RULE 2: Emergency Freeze Active & Over-Budget Hard Limit
  if (state.isFrozen && projectedTotal > state.budgetLimit) {
    showStrictFreezeModal(`Total transaksi (${formatRupiah(projectedTotal)}) melampaui batas anggaran bulanan (${formatRupiah(state.budgetLimit)}). Hard Budget Cap aktif!`);
    sounds.playAlarm();
    return false;
  }

  const targetStore = itemData.store || state.selectedStore || 'Super Indo Supermarket';

  // Commit item
  if (itemData.id) {
    const existing = state.cart.find(i => i.id === itemData.id);
    if (existing) {
      existing.name = itemData.name;
      existing.category = itemData.category;
      existing.unit = itemData.unit;
      existing.qty = itemData.qty;
      existing.price = itemData.price;
      existing.discount = itemData.discount;
      existing.store = targetStore;
    }
  } else {
    state.cart.push({
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: itemData.name,
      category: itemData.category,
      unit: itemData.unit,
      qty: itemData.qty,
      price: itemData.price,
      discount: itemData.discount || { mode: 'none' },
      store: targetStore,
      isEssential: !isImpulse,
      checked: true
    });
  }

  // Auto-record price history in Fluctuation Engine for future baseline comparison
  priceFluctuationEngine.recordPrice(targetStore, itemData.name, itemData.price);

  state.saveCart();
  renderCartItems();
  sounds.playClick();
  showToast(itemData.id ? 'Item diperbarui' : 'Barang masuk ke troli');
  return true;
}

// -----------------------------------------------------------------------------
// 10. REAL-WORLD SUPERMARKET & STORE RADAR (TAB 3)
// -----------------------------------------------------------------------------
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function matchStoreProfile(name = '') {
  const n = name.toLowerCase();
  if (n.includes('pasar') || n.includes('tradisional') || n.includes('rakyat')) {
    return { multiplier: 0.88, badge: 'Harga Paling Murah', type: 'Pasar Rakyat' };
  }
  if (n.includes('super indo') || n.includes('superindo')) {
    return { multiplier: 0.94, badge: 'Spesialis Makanan Segar', type: 'Supermarket Segar' };
  }
  if (n.includes('lotte') || n.includes('grosir')) {
    return { multiplier: 0.95, badge: 'Cocok Grosir', type: 'Grosir Ritel' };
  }
  if (n.includes('hyper') || n.includes('transmart') || n.includes('carrefour')) {
    return { multiplier: 0.96, badge: 'Lengkap Bulanan', type: 'Hypermarket' };
  }
  if (n.includes('hero') || n.includes('farmers') || n.includes('ranch')) {
    return { multiplier: 1.08, badge: 'Supermarket Premium', type: 'Premium Grocery' };
  }
  if (n.includes('indomaret') || n.includes('indo mart') || n.includes('point')) {
    return { multiplier: 1.00, badge: 'Minimarket Cepat', type: 'Minimarket' };
  }
  if (n.includes('alfa')) {
    return { multiplier: 1.02, badge: 'Banyak Promo Poin', type: 'Minimarket' };
  }
  return { multiplier: 1.00, badge: 'Supermarket Terdekat', type: 'Ritel Belanja' };
}

function formatDistinctStoreName(el, distMeters) {
  const rawName = (el.tags?.name || el.tags?.brand || el.tags?.operator || '').trim();
  const shopType = el.tags?.shop || 'supermarket';
  let cleanName = rawName;
  if (!cleanName) {
    cleanName = shopType === 'supermarket' ? 'Supermarket' :
                shopType === 'convenience' ? 'Minimarket' :
                shopType === 'greengrocer' ? 'Toko Buah & Sayur' :
                shopType === 'department_store' ? 'Toserba' : 'Toko Sembako';
  }

  const branch = el.tags?.branch || el.tags?.['branch:id'];
  const street = el.tags?.['addr:street'];
  const distText = distMeters < 1000 ? `${distMeters}m` : `${(distMeters / 1000).toFixed(1)}km`;

  if (branch) {
    return `${cleanName} (${branch}) • ${distText}`;
  } else if (street) {
    return `${cleanName} - ${street} • ${distText}`;
  } else {
    return `${cleanName} • ${distText}`;
  }
}

async function fetchNearbySupermarketsOverpass(latitude, longitude, areaName, radius = 3000) {
  state.currentRadarRadius = radius;
  const statusEl = document.getElementById('radarLocationStatus');
  if (statusEl) {
    statusEl.innerHTML = `<span class="animate-pulse text-brand-600 dark:text-brand-400">📡 Memindai toko & supermarket nyata (radius ${(radius/1000).toFixed(1)} km)...</span>`;
  }

  const query = `[out:json][timeout:25];(node["shop"~"supermarket|convenience|grocery|greengrocer|department_store|mall"](around:${radius},${latitude},${longitude});way["shop"~"supermarket|convenience|grocery|greengrocer|department_store|mall"](around:${radius},${latitude},${longitude}););out center 40;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) throw new Error('Overpass status: ' + response.status);
    const data = await response.json();

    if (Array.isArray(data.elements) && data.elements.length > 0) {
      const seenNames = new Set();
      const liveStores = [];

      data.elements.forEach(el => {
        const storeLat = el.lat || el.center?.lat;
        const storeLon = el.lon || el.center?.lon;
        if (!storeLat || !storeLon) return;

        const dist = calculateHaversineDistance(latitude, longitude, storeLat, storeLon);
        const distinctName = formatDistinctStoreName(el, dist);
        const profile = matchStoreProfile(el.tags?.name || el.tags?.brand || '');
        const addr = el.tags?.['addr:street'] || el.tags?.['addr:full'] || `${areaName}`;

        if (!seenNames.has(distinctName)) {
          seenNames.add(distinctName);
          liveStores.push({
            id: 'osm_' + el.id,
            name: distinctName,
            baseName: el.tags?.name || el.tags?.brand || distinctName,
            type: profile.type,
            defaultDistanceMeters: dist,
            multiplier: profile.multiplier,
            badge: profile.badge,
            address: addr,
            lat: storeLat,
            lon: storeLon
          });
        }
      });

      if (liveStores.length > 0) {
        liveStores.sort((a, b) => a.defaultDistanceMeters - b.defaultDistanceMeters);
        state.saveNearbyStores(liveStores, { latitude, longitude });

        updateHeaderStoreSelector(liveStores);
        if (statusEl) {
          statusEl.textContent = `📍 ${areaName} • ${liveStores.length} supermarket/ritel nyata terdeteksi (Radius ${(radius/1000).toFixed(1)} km)`;
        }
        renderRealWorldRadar();
        return;
      }
    }
    throw new Error('Tidak ada toko terdaftar di radius ini');
  } catch (err) {
    console.warn('[Overpass] Live query error:', err.message);
    if (statusEl) {
      statusEl.textContent = `📍 ${areaName} • Sinyal Overpass sibuk. Menampilkan toko terdekat yang tersimpan.`;
    }
    // Jika ada cache lokal, pakai cache
    if (state.liveNearbyStores && state.liveNearbyStores.length > 0) {
      updateHeaderStoreSelector(state.liveNearbyStores);
      renderRealWorldRadar();
    }
  }
}

function updateHeaderStoreSelector(stores) {
  const headerSelector = document.getElementById('headerStoreSelector');
  const customSelector = document.getElementById('customInputStore');
  if (!Array.isArray(stores) || stores.length === 0) return;

  const priorityBaselineStores = [
    'Super Indo Supermarket',
    'Indomaret',
    'Alfamart',
    'Pasar Tradisional / Pasar Jaya',
    'Hypermart Central'
  ];

  // Deduplikasi nama secara ketat agar tidak ada nama toko/minimarket yang muncul berulang
  const seen = new Set();
  const uniqueStores = [];

  stores.forEach(s => {
    let cleanName = (s.baseName || s.name || '').split('•')[0].trim();
    if (cleanName && !seen.has(cleanName)) {
      seen.add(cleanName);
      uniqueStores.push({
        ...s,
        name: cleanName
      });
    }
  });

  priorityBaselineStores.forEach(pStore => {
    if (!seen.has(pStore)) {
      seen.add(pStore);
      uniqueStores.push({
        name: pStore,
        baseName: pStore,
        multiplier: 1.0
      });
    }
  });

  const currentHeaderVal = state.selectedStore || headerSelector?.value || uniqueStores[0].name;

  if (headerSelector) {
    headerSelector.innerHTML = uniqueStores.map(s => {
      const isSel = s.name === currentHeaderVal;
      return `<option value="${s.name}" ${isSel ? 'selected' : ''}>${s.name}</option>`;
    }).join('');
    state.selectedStore = headerSelector.value;
  }

  if (customSelector) {
    const currentCustomVal = customSelector.value || currentHeaderVal;
    customSelector.innerHTML = uniqueStores.map(s => {
      const isSel = s.name === currentCustomVal;
      return `<option value="${s.name}" ${isSel ? 'selected' : ''}>${s.name}</option>`;
    }).join('');
  }
}

function renderRealWorldRadar() {
  const container = document.getElementById('realWorldStoresList');
  const winnerName = document.getElementById('radarWinnerName');
  const winnerSavings = document.getElementById('radarWinnerSavings');
  if (!container) return;

  let storesToUse = Array.isArray(state.liveNearbyStores) ? [...state.liveNearbyStores] : [];

  // Filter pencarian toko manual jika user mengetik di search input
  if (state.radarStoreSearchQuery && state.radarStoreSearchQuery.trim()) {
    const q = state.radarStoreSearchQuery.toLowerCase().trim();
    storesToUse = storesToUse.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  }

  if (storesToUse.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2">
        <i data-lucide="map-pin-off" class="w-8 h-8 text-slate-400 mx-auto"></i>
        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada toko nyata terdeteksi</h4>
        <p class="text-[10px] text-slate-500">Klik "Lokasi Saya" di atas untuk memindai supermarket & toko terdekat via OpenStreetMap Overpass API.</p>
      </div>
    `;
    safeCreateIcons();
    return;
  }

  const storeEvaluations = storesToUse.map(store => {
    let storeTotal = 0;
    state.cart.forEach(item => {
      const baseItemPrice = item.price || 15000;
      const qty = item.qty || 1;
      storeTotal += Math.round(baseItemPrice * (store.multiplier || 1.0)) * qty;
    });

    return {
      ...store,
      computedTotal: storeTotal
    };
  });

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
      <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border ${isWinner ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-700/80'} shadow-xs flex items-center justify-between gap-3">
        <div class="space-y-0.5 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}">
              ${store.badge}
            </span>
            <span class="shrink-0 whitespace-nowrap text-[10px] text-slate-400 flex items-center gap-0.5">
              <i data-lucide="map-pin" class="w-3 h-3 text-brand-500 shrink-0"></i> ${distanceText}
            </span>
          </div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">${store.name}</h4>
          <p class="text-[10px] text-slate-400 truncate">${store.address} &bull; ${store.type}</p>
        </div>

        <div class="text-right shrink-0">
          <span class="text-sm font-black font-mono whitespace-nowrap ${isWinner ? 'text-brand-500' : 'text-slate-800 dark:text-slate-200'}">
            ${formatRupiah(store.computedTotal)}
          </span>
          <span class="block text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">Estimasi Total</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  safeCreateIcons();
}

async function handleDetectLocation(customRadius = null) {
  const btn = document.getElementById('detectLocationBtn');
  const statusEl = document.getElementById('radarLocationStatus');
  const radius = customRadius || state.currentRadarRadius || 3000;

  if (!navigator.geolocation) {
    showToast('Perangkat tidak mendukung geolokasi GPS.', 'alert-triangle');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-60');
  }
  if (statusEl) statusEl.textContent = 'Mendeteksi sinyal GPS presisi tinggi...';
  showToast('Mendeteksi GPS lokasi Anda...', 'navigation');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      state.userCoords = { latitude, longitude, accuracy };

      let areaName = 'Lokasi Terdeteksi';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          areaName = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.city || 'Sekitar Anda';
        }
      } catch (_) {}

      if (statusEl) {
        statusEl.textContent = `📍 ${areaName} (Akurasi: ±${Math.round(accuracy)}m)`;
      }

      await fetchNearbySupermarketsOverpass(latitude, longitude, areaName, radius);

      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-60');
      }
      showToast(`Lokasi GPS terverifikasi: ${areaName}!`, 'check-circle');
      renderRealWorldRadar();
    },
    async (error) => {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-60');
      }
      let msg = 'Izin lokasi GPS belum aktif.';
      if (error.code === 1) {
        msg = 'Izin GPS ditolak. Memindai area standar via Overpass API.';
      }
      if (statusEl) statusEl.textContent = msg;
      showToast(msg, 'alert-triangle');

      // Fallback coordinate nyata (Jakarta Pusat: -6.1754, 106.8272) untuk menjamin Overpass tetap query toko nyata
      await fetchNearbySupermarketsOverpass(-6.1754, 106.8272, 'Jakarta Pusat', radius);
      renderRealWorldRadar();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

// Inisialisasi Otomatis Store Locator saat Aplikasi Dimuat
async function initLiveStoreLocator() {
  // Jika sudah ada cache, render dulu
  if (state.liveNearbyStores && state.liveNearbyStores.length > 0) {
    updateHeaderStoreSelector(state.liveNearbyStores);
    renderRealWorldRadar();
  }

  // Coba dapatkan lokasi GPS otomatis
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleDetectLocation(state.currentRadarRadius);
      },
      () => {
        // Jika tidak diizinkan, jalankan query Overpass area standar jika belum ada toko
        if (!state.liveNearbyStores || state.liveNearbyStores.length === 0) {
          fetchNearbySupermarketsOverpass(-6.1754, 106.8272, 'Jakarta Pusat', 3000);
        }
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }
}

// -----------------------------------------------------------------------------
// 11. NATIVE CAMERA SCANNER
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
      btnBarcode.className = 'py-2 rounded-xl bg-brand-500 shadow-sm transition';
      btnOcr.className = 'py-2 rounded-xl text-slate-300 hover:text-white transition';
    } else {
      btnBarcode.className = 'py-2 rounded-xl text-slate-300 hover:text-white transition';
      btnOcr.className = 'py-2 rounded-xl bg-brand-500 shadow-sm transition';
    }
  }

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
    showToast('Kamera fisik tidak dapat diakses. Gunakan opsi unggah foto/contoh.', 'camera-off');
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
  if (!('BarcodeDetector' in window)) return;

  if (!state.scannerDetector) {
    try {
      state.scannerDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'upc_a']
      });
    } catch (e) {}
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
          clearInterval(interval);
          handleDetectedBarcode(barcodes[0].rawValue);
        }
      }
    } catch (e) {}
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
    statusBadge.innerHTML = `<span class="text-brand-400 font-bold">✓ Terdeteksi:</span> ${product.name} (${formatRupiah(product.price)})`;
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
    const barcodes = Object.keys(BARCODE_CATALOG);
    const chosen = barcodes[Math.floor(Math.random() * barcodes.length)];
    handleDetectedBarcode(chosen);
  } else {
    sounds.playBarcodeBeep();
    stopNativeCameraScanner();
    const mockItems = [
      { name: "Beras Ramos Premium 5kg", category: "Sembako", unit: "pack", qty: 1, price: 74000, store: "Indomaret" },
      { name: "Telur Ayam Negeri 1kg", category: "Daging & Sayur", unit: "kg", qty: 1, price: 28500, store: "Indomaret" }
    ];
    mockItems.forEach(item => validateAndAddItemToCart(item));
    showToast('Struk berhasil diekstrak via AI OCR!', 'camera');
  }
}

// -----------------------------------------------------------------------------
// 12. CUSTOM GROCERY ITEM BUILDER WITH STACKED DISCOUNT CALCULATOR
// -----------------------------------------------------------------------------
function openCustomItemModalForNew() {
  const form = document.getElementById('customItemForm');
  if (form) form.reset();
  const idEl = document.getElementById('customEditId');
  if (idEl) idEl.value = '';
  const title = document.getElementById('customItemModalTitle');
  if (title) title.textContent = 'Tambah Barang Belanja Bebas';

  const badgeEl = document.getElementById('autoDetectedBadge');
  if (badgeEl) badgeEl.classList.add('hidden');
  const suggestionsBox = document.getElementById('catalogSuggestionsBox');
  if (suggestionsBox) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
  }

  // Set default store from header selector
  const storeEl = document.getElementById('customInputStore');
  if (storeEl && state.selectedStore) {
    storeEl.value = state.selectedStore;
  }

  const flucContainer = document.getElementById('priceFluctuationContainer');
  if (flucContainer) flucContainer.classList.add('hidden');
  const popover = document.getElementById('priceFluctuationPopover');
  if (popover) popover.classList.add('hidden');

  state.itemFormDiscount = { mode: 'none', singlePercent: 0, tier1: 50, tier2: 20, nominalAmount: 0 };
  updateDiscountModeButtonsUI();
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
  const badgeEl = document.getElementById('autoDetectedBadge');
  const suggestionsBox = document.getElementById('catalogSuggestionsBox');

  if (suggestionsBox) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
  }

  if (idEl) idEl.value = item.id;
  if (nameEl) nameEl.value = item.name;
  if (catEl) catEl.value = item.category;
  if (unitEl) unitEl.value = item.unit || 'pcs';
  if (qtyEl) qtyEl.value = item.qty || 1;
  if (priceEl) priceEl.value = item.price || 0;
  if (storeEl) storeEl.value = item.store || state.selectedStore || 'Super Indo';
  if (title) title.textContent = 'Edit Barang Belanja';

  if (badgeEl) {
    badgeEl.classList.remove('hidden');
    badgeEl.textContent = `Kategori: ${item.category} • Satuan: ${item.unit || 'pcs'}`;
  }

  if (badgeEl) {
    badgeEl.classList.remove('hidden');
    badgeEl.textContent = `Kategori: ${item.category} • Satuan: ${item.unit || 'pcs'}`;
  }

  state.itemFormDiscount = item.discount || { mode: 'none', singlePercent: 0, tier1: 50, tier2: 20, nominalAmount: 0 };
  updateDiscountModeButtonsUI();
  updateCustomPreview();
  updatePriceFluctuationBadge();

  if (modal) modal.classList.remove('hidden');
}

function setupSupermarketCatalogAutocomplete() {
  const nameInput = document.getElementById('customInputName');
  const suggestionsBox = document.getElementById('catalogSuggestionsBox');
  const badgeEl = document.getElementById('autoDetectedBadge');
  const catEl = document.getElementById('customInputCategory');
  const unitEl = document.getElementById('customInputUnit');
  const priceEl = document.getElementById('customInputPrice');
  const storeEl = document.getElementById('customInputStore');

  if (!nameInput || !suggestionsBox) return;

  const selectCatalogItem = (item) => {
    nameInput.value = item.name;
    if (priceEl) priceEl.value = item.price;
    if (catEl) catEl.value = item.category;
    if (unitEl) unitEl.value = item.unit;
    if (storeEl) storeEl.value = item.store || 'Indomaret';

    if (badgeEl) {
      badgeEl.classList.remove('hidden');
      badgeEl.textContent = `Katalog ✨ ${item.category} • ${item.unit}`;
    }

    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    updateCustomPreview();
    sounds.playClick();
  };

  nameInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    if (!query) {
      suggestionsBox.classList.add('hidden');
      suggestionsBox.innerHTML = '';
      if (badgeEl) badgeEl.classList.add('hidden');
      return;
    }

    // 1. Smart Auto-Assign on free custom typing
    const detected = autoDetectCategoryAndUnit(query);
    if (catEl && detected.category !== 'Lainnya') catEl.value = detected.category;
    if (unitEl) unitEl.value = detected.unit;

    if (badgeEl) {
      badgeEl.classList.remove('hidden');
      badgeEl.textContent = `✨ Auto-assign: ${detected.category} • ${detected.unit}`;
    }

    // 2. Real-Time Supermarket Catalog Auto-Complete filter
    const matches = SUPERMARKET_CATALOG.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6);

    if (matches.length === 0) {
      suggestionsBox.classList.add('hidden');
      suggestionsBox.innerHTML = '';
      return;
    }

    let html = '';
    matches.forEach(item => {
      html += `
        <div class="catalog-suggestion-item p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer flex items-center justify-between transition text-xs" data-item-name="${item.name}">
          <div>
            <div class="font-bold text-slate-900 dark:text-white">${item.name}</div>
            <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span class="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-medium">${item.category}</span>
              <span>•</span>
              <span>Satuan: ${item.unit}</span>
              <span>•</span>
              <span class="text-brand-600 dark:text-brand-400">${item.store}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="font-mono font-bold text-brand-600 dark:text-brand-400">${formatRupiah(item.price)}</span>
          </div>
        </div>
      `;
    });

    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.remove('hidden');

    suggestionsBox.querySelectorAll('.catalog-suggestion-item').forEach(itemEl => {
      itemEl.onclick = () => {
        const itemName = itemEl.getAttribute('data-item-name');
        const found = SUPERMARKET_CATALOG.find(i => i.name === itemName);
        if (found) selectCatalogItem(found);
      };
    });
  });

  // Quick chips click
  document.querySelectorAll('.quick-catalog-chip').forEach(chip => {
    chip.onclick = () => {
      const targetName = chip.getAttribute('data-name');
      const found = SUPERMARKET_CATALOG.find(i => i.name === targetName);
      if (found) {
        selectCatalogItem(found);
      }
    };
  });

  // Close suggestion dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add('hidden');
    }
  });
}

function updateDiscountModeButtonsUI() {
  document.querySelectorAll('.custom-disc-mode-btn').forEach(btn => {
    const mode = btn.getAttribute('data-mode');
    if (mode === state.itemFormDiscount.mode) {
      btn.className = 'custom-disc-mode-btn active py-1 rounded-lg text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700';
    } else {
      btn.className = 'custom-disc-mode-btn py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  });

  const singleBox = document.getElementById('customDiscSingleBox');
  const tierBox = document.getElementById('customDiscTierBox');
  const nominalBox = document.getElementById('customDiscNominalBox');

  if (singleBox) singleBox.classList.toggle('hidden', state.itemFormDiscount.mode !== 'single');
  if (tierBox) tierBox.classList.toggle('hidden', state.itemFormDiscount.mode !== 'tier');
  if (nominalBox) nominalBox.classList.toggle('hidden', state.itemFormDiscount.mode !== 'nominal');
}

function updateCustomPreview() {
  const qty = Number(document.getElementById('customInputQty')?.value) || 1;
  const price = Number(document.getElementById('customInputPrice')?.value) || 0;
  const calcEl = document.getElementById('customCalcPreview');
  const totalEl = document.getElementById('customTotalPreview');
  const noteEl = document.getElementById('customDiscountNote');
  const savingBadge = document.getElementById('customSavingBadge');

  // Read current discount inputs
  const mode = state.itemFormDiscount.mode;
  if (mode === 'single') {
    state.itemFormDiscount.singlePercent = Number(document.getElementById('customInputDiscSingle')?.value) || 0;
  } else if (mode === 'tier') {
    state.itemFormDiscount.tier1 = Number(document.getElementById('customInputDiscTier1')?.value) || 0;
    state.itemFormDiscount.tier2 = Number(document.getElementById('customInputDiscTier2')?.value) || 0;
  } else if (mode === 'nominal') {
    state.itemFormDiscount.nominalAmount = Number(document.getElementById('customInputDiscNominal')?.value) || 0;
  }

  const pricing = calculateItemPricing(price, qty, state.itemFormDiscount);

  if (calcEl) calcEl.textContent = `${qty} × ${formatRupiah(pricing.finalUnitPrice)}`;
  if (totalEl) totalEl.textContent = formatRupiah(pricing.rowTotal);

  if (savingBadge) {
    if (pricing.hasDiscount) {
      savingBadge.classList.remove('hidden');
      savingBadge.textContent = `Hemat ${formatRupiah(pricing.rowSavings)}`;
    } else {
      savingBadge.classList.add('hidden');
    }
  }

  if (noteEl) {
    if (pricing.hasDiscount && pricing.explanation) {
      noteEl.classList.remove('hidden');
      noteEl.textContent = pricing.explanation;
    } else {
      noteEl.classList.add('hidden');
    }
  }

  // Update Real-Time Price Fluctuation Comparison
  updatePriceFluctuationBadge();
}

function updatePriceFluctuationBadge() {
  const nameInput = document.getElementById('customInputName');
  const priceInput = document.getElementById('customInputPrice');
  const storeInput = document.getElementById('customInputStore');
  const container = document.getElementById('priceFluctuationContainer');
  const badge = document.getElementById('priceFluctuationBadge');
  const popover = document.getElementById('priceFluctuationPopover');

  if (!container || !badge) return;

  const name = nameInput?.value.trim();
  const price = Number(priceInput?.value) || 0;
  const store = storeInput?.value || state.selectedStore;

  if (!name || price <= 0) {
    container.classList.add('hidden');
    if (popover) popover.classList.add('hidden');
    return;
  }

  const res = priceFluctuationEngine.comparePrice(store, name, price);
  if (res.status === 'none') {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  let badgeClass = '';
  let iconName = '';
  let badgeText = '';

  if (res.status === 'surge') {
    badgeClass = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    iconName = 'trending-up';
    badgeText = `Naik ${formatRupiah(res.diff)} (+${res.pct}%) dari belanja terakhir di ${res.storeName}`;
  } else if (res.status === 'deal') {
    badgeClass = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    iconName = 'trending-down';
    badgeText = `Turun ${formatRupiah(res.diff)} (-${res.pct}%)! Lebih hemat dari biasanya`;
  } else if (res.status === 'stable') {
    badgeClass = 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    iconName = 'minus';
    badgeText = `Harga sama seperti terakhir kali (${formatRupiah(res.lastPrice)})`;
  } else if (res.status === 'new_with_cross_store') {
    badgeClass = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    iconName = 'sparkles';
    badgeText = `Harga baru di toko ini (Pernah ${formatRupiah(res.otherPrice)} di ${res.otherStore})`;
  } else {
    badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    iconName = 'sparkles';
    badgeText = `Harga pertama tercatat di toko ini`;
  }

  badge.className = `cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs transition active:scale-95 ${badgeClass}`;
  badge.innerHTML = `
    <i data-lucide="${iconName}" class="w-3.5 h-3.5 shrink-0"></i>
    <span class="truncate">${badgeText}</span>
    <i data-lucide="chevron-down" class="w-3 h-3 opacity-60 shrink-0 ml-0.5"></i>
  `;

  // Update Popover contents
  const popStore = document.getElementById('popoverStoreName');
  const popLast = document.getElementById('popoverLastPrice');
  const popLowest = document.getElementById('popoverLowestPrice');
  const popAvg = document.getElementById('popoverAvgPrice');
  const popCross = document.getElementById('popoverCrossStoreTip');
  const popCrossText = document.getElementById('popoverCrossStoreText');

  if (popStore) popStore.textContent = res.storeName || store;
  if (popLast) popLast.textContent = res.lastPrice ? formatRupiah(res.lastPrice) : '-';
  if (popLowest) popLowest.textContent = res.lowestPrice ? formatRupiah(res.lowestPrice) : formatRupiah(price);
  if (popAvg) popAvg.textContent = res.avgPrice ? formatRupiah(res.avgPrice) : formatRupiah(price);

  if (popCross && popCrossText) {
    if (res.otherStore && res.otherPrice) {
      popCross.classList.remove('hidden');
      popCrossText.textContent = `Pernah tercatat ${formatRupiah(res.otherPrice)} di ${res.otherStore}`;
    } else {
      popCross.classList.add('hidden');
    }
  }

  safeCreateIcons();
}

function handleSaveCustomItem() {
  const id = document.getElementById('customEditId')?.value;
  const name = document.getElementById('customInputName')?.value.trim();
  const category = document.getElementById('customInputCategory')?.value;
  const unit = document.getElementById('customInputUnit')?.value;
  const qty = Number(document.getElementById('customInputQty')?.value) || 1;
  const price = Number(document.getElementById('customInputPrice')?.value) || 0;
  const store = document.getElementById('customInputStore')?.value;

  if (!name || isNaN(price) || price < 0) {
    showToast('Mohon masukkan nama produk dan harga valid (minimal Rp 0)!', 'alert-triangle');
    return;
  }

  const success = validateAndAddItemToCart({
    id,
    name,
    category,
    unit,
    qty,
    price,
    discount: { ...state.itemFormDiscount },
    store
  });

  if (success) {
    const modal = document.getElementById('customItemModal');
    if (modal) modal.classList.add('hidden');
  }
}

// -----------------------------------------------------------------------------
// 13. SMART PANTRY & ZERO-WASTE
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

        <button class="btn-consume-pantry px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-brand-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition" data-id="${item.id}">
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
// 14. RIWAYAT BELANJA
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

  const totals = calculateCartTotals();

  // Transfer to virtual pantry
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
    totalAmount: totals.finalCartTotal,
    items: [...state.cart]
  });

  state.cart = [];
  state.appliedVoucher = null;
  state.saveCart();
  state.saveVoucherState();
  state.saveHistory();
  state.savePantry();

  renderCartItems();
  renderPantryStock();
  renderHistoryView();
  sounds.playClick();
  showToast('Belanja selesai & stok masuk ke Virtual Pantry!');
}

// -----------------------------------------------------------------------------
// 15. INITIALIZATION, THEME COLOR & EVENT LISTENERS
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 1. Apply Color Theme
  const applyColorTheme = (themeName) => {
    state.colorTheme = themeName;
    localStorage.setItem('sg_color_theme', themeName);
    document.documentElement.setAttribute('data-color-theme', themeName);

    // Update active border on color theme buttons
    document.querySelectorAll('.color-palette-btn').forEach(btn => {
      const match = btn.getAttribute('data-theme-name') === themeName;
      if (match) {
        btn.classList.add('border-brand-500', 'ring-2', 'ring-brand-500/20', 'bg-brand-50/50', 'dark:bg-slate-800');
        btn.classList.remove('border-slate-200', 'dark:border-slate-700');
      } else {
        btn.classList.remove('border-brand-500', 'ring-2', 'ring-brand-500/20', 'bg-brand-50/50');
        btn.classList.add('border-slate-200', 'dark:border-slate-700');
      }
    });

    renderGuardianAndEnvelopes();
  };
  applyColorTheme(state.colorTheme);

  // 2. Apply Light / Dark Mode
  const applyLightMode = (mode) => {
    state.lightMode = mode;
    localStorage.setItem('sg_light_mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  applyLightMode(state.lightMode);

  // 3. Apply Fluid / Compact Layout (No rigid pixels)
  const mainContainer = document.getElementById('mainContainer');
  const layoutModeText = document.getElementById('layoutModeText');
  const applyLayoutMode = (isFluid) => {
    state.isBentoFluid = isFluid;
    localStorage.setItem('sg_layout_mode', isFluid ? 'fluid' : 'compact');
    if (mainContainer) {
      if (isFluid) {
        mainContainer.classList.remove('app-viewport-compact');
        mainContainer.classList.add('app-viewport-fluid');
        if (layoutModeText) layoutModeText.textContent = 'Tampilan Bento Grid Lebar';
      } else {
        mainContainer.classList.remove('app-viewport-fluid');
        mainContainer.classList.add('app-viewport-compact');
        if (layoutModeText) layoutModeText.textContent = 'Tampilan Kompak Seluler';
      }
    }
  };
  applyLayoutMode(state.isBentoFluid);

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

    // Tampilkan sticky action dock HANYA di tab belanja troli aktif agar tidak menutupi tab lain
    const actionDock = document.getElementById('stickyActionDock');
    if (actionDock) {
      if (targetId === 'tab-belanja') {
        actionDock.classList.remove('hidden');
      } else {
        actionDock.classList.add('hidden');
      }
    }

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-target') === targetId;
      btn.className = match
        ? 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-brand-500 font-bold active:scale-95 transition'
        : 'nav-tab-btn flex-1 flex flex-col items-center py-1 rounded-xl text-slate-400 hover:text-slate-600 active:scale-95 transition';
    });

    if (targetId === 'tab-radar') renderRealWorldRadar();
    if (targetId === 'tab-pantry') renderPantryStock();
    if (targetId === 'tab-guardian') renderGuardianAndEnvelopes();
    if (targetId === 'tab-riwayat') renderHistoryView();

    sounds.playClick();
    safeCreateIcons();
  };

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.getAttribute('data-target'));
  });

  // Header Settings Button
  document.getElementById('headerSettingsBtn')?.addEventListener('click', () => {
    switchTab('tab-settings');
  });

  // Header Store Selector & Date Picker Persistence
  const headerStoreSelector = document.getElementById('headerStoreSelector');
  if (headerStoreSelector) {
    if (state.selectedStore) headerStoreSelector.value = state.selectedStore;
    headerStoreSelector.addEventListener('change', (e) => {
      state.saveSelectedStore(e.target.value);
      showToast(`Lokasi toko: ${e.target.value}`);
      sounds.playClick();
    });
  }

  const headerDatePicker = document.getElementById('headerDatePicker');
  if (headerDatePicker) {
    if (!state.selectedDate) {
      state.selectedDate = new Date().toISOString().split('T')[0];
    }
    headerDatePicker.value = state.selectedDate;
    headerDatePicker.addEventListener('change', (e) => {
      state.saveSelectedDate(e.target.value);
      sounds.playClick();
    });
  }

  // ---------------------------------------------------------------------------
  // SILENT & SEAMLESS BI-DIRECTIONAL REAL-TIME SYNCHRONIZATION (ZERO-CLOUD UI)
  // ---------------------------------------------------------------------------

  // ⚡ 1. Handler saat koneksi Firebase siap (Hydration & Auto-Sync)
  window.addEventListener('firebase-ready', async () => {
    if (!window.FirebaseSync) return;

    try {
      // Tarik data shared cloud secara diam-diam di background
      const cloudData = await window.FirebaseSync.pullAllSharedData();
      if (cloudData) {
        let hasUpdatedUI = false;

        // Hydrate Cart
        if (Array.isArray(cloudData.cart) && cloudData.cart.length > 0) {
          state.cart = cloudData.cart.map(it => ({ ...it, checked: true }));
          localStorage.setItem('sg_cart_items', JSON.stringify(state.cart));
          hasUpdatedUI = true;
        } else if (state.cart && state.cart.length > 0) {
          window.FirebaseSync.syncCart(state.cart);
        }

        // Hydrate Session Context (Store, Date, Nearby Stores)
        if (cloudData.session) {
          if (cloudData.session.selectedStore) {
            state.selectedStore = cloudData.session.selectedStore;
            localStorage.setItem('sg_selected_store', state.selectedStore);
            if (headerStoreSelector) headerStoreSelector.value = state.selectedStore;
          }
          if (cloudData.session.selectedDate) {
            state.selectedDate = cloudData.session.selectedDate;
            localStorage.setItem('sg_selected_date', state.selectedDate);
            if (headerDatePicker) headerDatePicker.value = state.selectedDate;
          }
          if (Array.isArray(cloudData.session.liveNearbyStores) && cloudData.session.liveNearbyStores.length > 0) {
            state.liveNearbyStores = cloudData.session.liveNearbyStores;
            updateHeaderStoreSelector(state.liveNearbyStores);
            renderRealWorldRadar();
          }
        } else if (state.selectedStore || (state.liveNearbyStores && state.liveNearbyStores.length > 0)) {
          state.saveSessionState();
        }

        // Hydrate Price History & Fluctuation Engine
        if (cloudData.priceHistory && typeof cloudData.priceHistory === 'object') {
          priceFluctuationEngine.mergeRemoteHistory(cloudData.priceHistory);
        } else if (priceFluctuationEngine.history && Object.keys(priceFluctuationEngine.history).length > 0) {
          window.FirebaseSync.syncPriceHistory(priceFluctuationEngine.history);
        }

        // Hydrate Settings & Budget Target
        if (cloudData.settings) {
          if (cloudData.settings.budgetLimit) {
            state.budgetLimit = Number(cloudData.settings.budgetLimit);
            localStorage.setItem('sg_budget_limit', state.budgetLimit.toString());
            const budgetInput = document.getElementById('budgetLimitInput');
            if (budgetInput) budgetInput.value = state.budgetLimit;
          }
          if (typeof cloudData.settings.isFrozen === 'boolean') {
            state.isFrozen = cloudData.settings.isFrozen;
            localStorage.setItem('sg_emergency_freeze', state.isFrozen.toString());
          }
          if (cloudData.settings.appliedVoucher !== undefined) {
            state.appliedVoucher = cloudData.settings.appliedVoucher;
            localStorage.setItem('sg_applied_voucher', JSON.stringify(state.appliedVoucher));
          }
          hasUpdatedUI = true;
        } else {
          state.saveSettings();
        }

        // Hydrate Shopping History (Completed Trips)
        if (Array.isArray(cloudData.history) && cloudData.history.length > 0) {
          state.history = cloudData.history;
          localStorage.setItem('sg_history_trips', JSON.stringify(state.history));
          renderHistoryView();
        } else if (state.history && state.history.length > 0) {
          window.FirebaseSync.syncShoppingHistory(state.history);
        }

        // Hydrate Pantry Stock
        if (Array.isArray(cloudData.pantry) && cloudData.pantry.length > 0) {
          state.pantry = cloudData.pantry;
          localStorage.setItem('sg_pantry_items', JSON.stringify(state.pantry));
          renderPantryStock();
        } else if (state.pantry && state.pantry.length > 0) {
          window.FirebaseSync.syncPantry(state.pantry);
        }

        if (hasUpdatedUI) {
          renderCartItems();
          renderGuardianAndEnvelopes();
          safeCreateIcons();
        }
      }
    } catch (_) {}
  });

  // ⚡ 2. Realtime Listener: Troli Belanja Aktif (Cart Mirroring)
  window.addEventListener('cloud-cart-update', (e) => {
    let remoteItems = e.detail?.items;
    if (!Array.isArray(remoteItems)) return;

    remoteItems = remoteItems.map(item => ({
      ...item,
      checked: true
    }));

    const currentJson = JSON.stringify(state.cart);
    const remoteJson = JSON.stringify(remoteItems);
    if (currentJson !== remoteJson) {
      state.cart = remoteItems;
      localStorage.setItem('sg_cart_items', remoteJson);
      renderCartItems();
      renderGuardianAndEnvelopes();
      safeCreateIcons();
    }
  });

  // ⚡ 3. Realtime Listener: Konteks Sesi Toko & Lokasi GPS
  window.addEventListener('cloud-session-update', (e) => {
    const detail = e.detail || {};
    let shouldUpdateUI = false;

    if (detail.selectedStore && detail.selectedStore !== state.selectedStore) {
      state.selectedStore = detail.selectedStore;
      localStorage.setItem('sg_selected_store', state.selectedStore);
      if (headerStoreSelector) headerStoreSelector.value = state.selectedStore;
      const customStoreInput = document.getElementById('customInputStore');
      if (customStoreInput) customStoreInput.value = state.selectedStore;
      shouldUpdateUI = true;
    }

    if (detail.selectedDate && detail.selectedDate !== state.selectedDate) {
      state.selectedDate = detail.selectedDate;
      localStorage.setItem('sg_selected_date', state.selectedDate);
      if (headerDatePicker) headerDatePicker.value = state.selectedDate;
    }

    if (Array.isArray(detail.liveNearbyStores) && detail.liveNearbyStores.length > 0) {
      const currJson = JSON.stringify(state.liveNearbyStores);
      const newJson = JSON.stringify(detail.liveNearbyStores);
      if (currJson !== newJson) {
        state.liveNearbyStores = detail.liveNearbyStores;
        updateHeaderStoreSelector(state.liveNearbyStores);
        renderRealWorldRadar();
        shouldUpdateUI = true;
      }
    }

    if (shouldUpdateUI) {
      renderCartItems();
      safeCreateIcons();
    }
  });

  // ⚡ 4. Realtime Listener: Database Fluktuasi Harga Toko
  window.addEventListener('cloud-price-history-update', (e) => {
    const remoteHistory = e.detail?.history;
    if (remoteHistory && typeof remoteHistory === 'object') {
      priceFluctuationEngine.mergeRemoteHistory(remoteHistory);
      renderCartItems();
      updatePriceFluctuationBadge();
      safeCreateIcons();
    }
  });

  // ⚡ 5. Realtime Listener: Pengaturan Anggaran & Emergency Freeze
  window.addEventListener('cloud-settings-update', (e) => {
    const detail = e.detail || {};
    let shouldUpdate = false;

    if (detail.budgetLimit && detail.budgetLimit !== state.budgetLimit) {
      state.budgetLimit = Number(detail.budgetLimit);
      localStorage.setItem('sg_budget_limit', state.budgetLimit.toString());
      const budgetInput = document.getElementById('budgetLimitInput');
      if (budgetInput) budgetInput.value = state.budgetLimit;
      shouldUpdate = true;
    }

    if (typeof detail.isFrozen === 'boolean' && detail.isFrozen !== state.isFrozen) {
      state.isFrozen = detail.isFrozen;
      localStorage.setItem('sg_emergency_freeze', state.isFrozen.toString());
      const freezeToggleEl = document.getElementById('emergencyFreezeToggle');
      if (freezeToggleEl) freezeToggleEl.checked = state.isFrozen;
      shouldUpdate = true;
    }

    if (detail.appliedVoucher !== undefined) {
      const currV = JSON.stringify(state.appliedVoucher);
      const newV = JSON.stringify(detail.appliedVoucher);
      if (currV !== newV) {
        state.appliedVoucher = detail.appliedVoucher;
        localStorage.setItem('sg_applied_voucher', newV);
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      renderGuardianAndEnvelopes();
      renderCartItems();
      safeCreateIcons();
    }
  });

  // ⚡ 6. Realtime Listener: Riwayat Struk Transaksi Selesai
  window.addEventListener('cloud-history-update', (e) => {
    const remoteTrips = e.detail?.trips;
    if (Array.isArray(remoteTrips)) {
      const curJ = JSON.stringify(state.history);
      const remJ = JSON.stringify(remoteTrips);
      if (curJ !== remJ) {
        state.history = remoteTrips;
        localStorage.setItem('sg_history_trips', remJ);
        renderHistoryView();
        safeCreateIcons();
      }
    }
  });

  // ⚡ 7. Realtime Listener: Inventaris Pantry Rumah Tangga
  window.addEventListener('cloud-pantry-update', (e) => {
    const remotePantry = e.detail?.items;
    if (Array.isArray(remotePantry)) {
      const curJ = JSON.stringify(state.pantry);
      const remJ = JSON.stringify(remotePantry);
      if (curJ !== remJ) {
        state.pantry = remotePantry;
        localStorage.setItem('sg_pantry_items', remJ);
        renderPantryStock();
        safeCreateIcons();
      }
    }
  });

  // ⚡ 8. Realtime Listener: Quick-Select Items & Custom Catalog
  window.addEventListener('cloud-quick-select-update', (e) => {
    const customItems = e.detail?.customItems;
    if (Array.isArray(customItems)) {
      state.customQuickItems = customItems;
      localStorage.setItem('sg_quick_select', JSON.stringify(customItems));
      renderQuickSelectCarousel();
      safeCreateIcons();
    }
  });

  // Category Pills
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.cat-pill').forEach(b => {
        b.className = 'cat-pill px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 transition active:scale-95';
      });
      btn.className = 'cat-pill active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-brand-500 text-white shadow-xs transition active:scale-95';
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

  // Voucher Actions
  document.getElementById('applyVoucherBtn')?.addEventListener('click', () => {
    const val = document.getElementById('voucherCodeInput')?.value;
    handleApplyVoucher(val);
  });

  document.querySelectorAll('.quick-voucher-chip').forEach(btn => {
    btn.onclick = () => {
      const code = btn.getAttribute('data-code');
      const input = document.getElementById('voucherCodeInput');
      if (input) input.value = code;
      handleApplyVoucher(code);
    };
  });

  document.getElementById('removeVoucherBtn')?.addEventListener('click', handleRemoveVoucher);

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

  // Custom Item Discount Mode Buttons
  document.querySelectorAll('.custom-disc-mode-btn').forEach(btn => {
    btn.onclick = () => {
      state.itemFormDiscount.mode = btn.getAttribute('data-mode');
      updateDiscountModeButtonsUI();
      updateCustomPreview();
      sounds.playClick();
    };
  });

  // Tier Preset Buttons in Item Builder
  document.querySelectorAll('.tier-preset-btn').forEach(btn => {
    btn.onclick = () => {
      const t1 = Number(btn.getAttribute('data-t1')) || 50;
      const t2 = Number(btn.getAttribute('data-t2')) || 20;
      const inT1 = document.getElementById('customInputDiscTier1');
      const inT2 = document.getElementById('customInputDiscTier2');
      if (inT1) inT1.value = t1;
      if (inT2) inT2.value = t2;
      updateCustomPreview();
      sounds.playClick();
    };
  });

  ['customInputQty', 'customInputPrice', 'customInputDiscSingle', 'customInputDiscTier1', 'customInputDiscTier2', 'customInputDiscNominal'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCustomPreview);
  });

  // Geolocation Radar
  document.getElementById('detectLocationBtn')?.addEventListener('click', handleDetectLocation);

  // Settings: Color Themes Selection (4 Palet Warna)
  document.querySelectorAll('.color-palette-btn').forEach(btn => {
    btn.onclick = () => {
      const theme = btn.getAttribute('data-theme-name');
      applyColorTheme(theme);
      sounds.playClick();
      showToast(`Tema warna aktif: ${theme.toUpperCase()}`);
    };
  });

  // Settings: Light / Dark Mode Buttons
  document.querySelectorAll('.dark-mode-btn').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-mode');
      applyLightMode(mode);
      sounds.playClick();
      showToast(`Mode pencahayaan: ${mode.toUpperCase()}`);
    };
  });

  // Settings: Fluid / Compact Layout Toggle
  document.getElementById('toggleLayoutSettingsBtn')?.addEventListener('click', () => {
    applyLayoutMode(!state.isBentoFluid);
    sounds.playClick();
    showToast(state.isBentoFluid ? 'Mode Bento Grid Lebar Aktif' : 'Mode Kompak Seluler Aktif');
  });

  // Settings: Sound Toggle
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

  // Settings: Save Budget Limit
  document.getElementById('saveBudgetLimitBtn')?.addEventListener('click', () => {
    const val = Number(document.getElementById('budgetLimitInput')?.value);
    if (val >= 50000) {
      state.saveBudgetLimit(val);
      renderGuardianAndEnvelopes();
      sounds.playClick();
      showToast('Batas anggaran bulanan berhasil disimpan!');
    }
  });

  // Checkout Trip
  document.getElementById('checkoutTripBtn')?.addEventListener('click', checkoutTrip);

  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    if (confirm('Kosongkan semua barang dari keranjang belanja?')) {
      state.cart = [];
      state.appliedVoucher = null;
      state.saveCart();
      state.saveVoucherState();
      renderCartItems();
      showToast('Keranjang dikosongkan');
    }
  });

  // Sticky Action Dock & Cart Review Drawer Event Listeners
  document.getElementById('dockReviewTrigger')?.addEventListener('click', openCartDrawer);
  document.getElementById('closeCartDrawerBtn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('drawerCloseActionBtn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cartReviewDrawer')?.addEventListener('click', (e) => {
    if (e.target.id === 'cartReviewDrawer') closeCartDrawer();
  });
  document.getElementById('dockAddCustomBtn')?.addEventListener('click', openCustomItemModalForNew);
  document.getElementById('dockLaunchScannerBtn')?.addEventListener('click', () => openNativeCameraScanner('barcode'));
  document.getElementById('drawerCheckoutBtn')?.addEventListener('click', () => {
    checkoutTrip();
    closeCartDrawer();
  });

  // Real-Time Price Fluctuation Interactive Popover & Input Hooks
  document.getElementById('priceFluctuationBadge')?.addEventListener('click', () => {
    const pop = document.getElementById('priceFluctuationPopover');
    if (pop) {
      pop.classList.toggle('hidden');
      sounds.playClick();
      safeCreateIcons();
    }
  });

  ['customInputName', 'customInputPrice', 'customInputStore'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', updatePriceFluctuationBadge);
    el?.addEventListener('change', updatePriceFluctuationBadge);
  });

  // Radar: Radius selector buttons
  document.querySelectorAll('.radar-radius-btn').forEach(btn => {
    btn.onclick = () => {
      const radius = Number(btn.getAttribute('data-radius')) || 3000;
      document.querySelectorAll('.radar-radius-btn').forEach(b => {
        b.className = 'radar-radius-btn px-2.5 py-1 rounded-lg text-[10px] font-bold border transition active:scale-95 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      });
      btn.className = 'radar-radius-btn active px-2.5 py-1 rounded-lg text-[10px] font-bold border transition active:scale-95 bg-brand-500 text-white border-brand-500 shadow-xs';
      state.currentRadarRadius = radius;
      sounds.playClick();
      if (state.userCoords) {
        fetchNearbySupermarketsOverpass(state.userCoords.latitude, state.userCoords.longitude, 'Lokasi Terdeteksi', radius);
      } else {
        handleDetectLocation(radius);
      }
    };
  });

  // Radar: Search store filter
  document.getElementById('radarStoreSearchInput')?.addEventListener('input', (e) => {
    state.radarStoreSearchQuery = e.target.value;
    renderRealWorldRadar();
  });

  // Horizontal Quick Select Carousel & Modal Chevrons
  renderQuickSelectCarousel();
  setupModalChipsChevrons();

  // Supermarket Catalog Autocomplete & Smart Auto-Assign
  setupSupermarketCatalogAutocomplete();

  // Live Real-World Store Locator (Overpass API auto-boot)
  initLiveStoreLocator();

  safeCreateIcons();
});
