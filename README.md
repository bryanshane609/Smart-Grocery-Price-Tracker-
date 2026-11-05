# 🛒 Smart Grocery & Budget Safety Tracker (PWA & Bento Grid)

Platform Web FinTech Rumah Tangga & Smart Pantry yang menggabungkan **AI-Powered OCR Receipt Scanning**, **Dynamic Budget Safety Net**, **Emergency Freeze Anti-Impulsif**, **Price Comparison Radar (4 Ritel)**, **Virtual Pantry & Expiry Guard (Zero-Waste)**, serta **Gamified Badges & XP**.

---

## 🌟 Fitur Utama & Spesifikasi Fungsional

### 1. 📷 Smart Receipt Scanner (AI-Powered OCR)
- **Ekstraksi Cerdas:** Unggah foto struk belanja supermarket (Indomaret, Alfamart, Hypermart) atau tangkapan layar e-commerce (Shopee, Tokopedia).
- **Auto-Categorization:** AI otomatis mengklasifikasikan item ke dalam *Bahan Pokok*, *Kebutuhan Rumah Tangga*, *Makanan Segar*, atau *Camilan/Non-Esensial*.
- **Quick Demo Preset:** Dilengkapi tombol uji cepat struk Indomaret, Alfamart, dan Shopee Mart dengan animasi scanning laser real-time.
- **1-Klik Transfer:** Masukkan seluruh item hasil ekstraksi ke troli belanja dan virtual pantry sekaligus.

### 2. 🛡️ Dynamic Budget Safety Net & "Emergency Freeze"
- **Safety Gauge Bulanan:**
  - 🟢 **Aman (< 70%):** Indikator hijau, status finansial stabil.
  - 🟡 **Waspada (70% - 89%):** Peringatan dini agar memprioritaskan barang kebutuhan pokok.
  - 🔴 **Kritis (≥ 90%):** Banner peringatan overbudget menyala dengan kalkulasi sisa saldo/defisit.
- **Sakelar "Emergency Freeze" Anti-Impulsif:**
  - Jika sakelar diaktifkan, sistem mengunci sisa anggaran belanja.
  - Saat pengguna mencoba menambahkan barang kategori camilan/non-esensial, sistem memblokir pencatatan dan menampilkan **Persuasive Psychological Friction Barrier** (Tips FinTech penunda belanja impulsif).
  - Pengguna mendapatkan **+30 XP & Achievement Badge "Impulse Shield"** saat berhasil menahan diri.

### 3. 📡 Price Comparison & Local Deals Radar
- **Multi-Retailer Benchmark:** Membandingkan total biaya troli belanja di **Indomaret**, **Alfamart**, **Hypermart**, dan **Pasar Tradisional**.
- **AI Savings Recommendation:** Menampilkan supermarket termurah dan menghitung potensi penghematan nominal Rupiah secara seketika.
- **Breakdown Harga Per Item:** Memetakan komparasi harga satuan produk antar ritel.

### 4. 🧊 Smart Pantry & Expiry Tracker (Zero-Waste)
- **Inventaris Virtual Otomatis:** Setiap transaksi belanja yang diselesaikan langsung memindahkan stok bahan ke Virtual Pantry.
- **Shelf-Life Matrix:** Menghitung sisa hari kesegaran secara presisi (Daging 3 hari, Sayur 5 hari, Susu 7 hari, Sembako 90 hari, Instan 180 hari).
- **Zero-Waste Recipe Generator (AI Chef):** Tombol *"Saran Resep AI"* memberikan resep masakan praktis langkah demi langkah untuk menyelamatkan bahan-bahan yang mendekati basi.

### 5. 🏆 Gamified Savings & Achievement Badges
- **Sistem Level & XP:** Pengguna mengumpulkan XP dari aktivitas hemat:
  - Scan Struk AI OCR: `+50 XP`
  - Sukses Menahan Belanja Impulsif: `+30 XP`
  - Selesai Belanja dengan Surplus Anggaran: `+100 XP`
  - Menghabiskan Bahan Pantry Tanpa Basi: `+30 XP`
- **Lencana Prestasi:** *Budget Master*, *Zero Waste Hero*, *Smart Shopper*, dan *Impulse Shield*.

---

## 🎨 Desain UI/UX & Tampilan Modern

- **Bento Grid & Mobile Switcher:** Tombol layout di bilah atas memungkinkan beralih instan antara **Mode Smartphone 440px (Mobile-First Thumb-Friendly)** dan **Mode Desktop Bento Grid 1200px (Modular Dashboard)**.
- **Dark Mode & Light Mode:** Palet warna *Emerald Green* (`#10B981`) & *Slate Dark* (`#0F172A` / `#1E293B`) dengan persistensi preferensi.
- **Ergonomi Sentuh:** Stepper kuantitas besar (`-` dan `+`), kalkulator diskon bertingkat (misal `50% + 20%`), serta feedback audio Web Audio API.

---

## 🏗️ Struktur Basis Data & Arsitektur Backend

1. **Skema Basis Data PostgreSQL (`schema.sql`):**
   - `users`: Data pengguna, XP, dan level.
   - `budgets`: Pagu bulanan dan status emergency freeze.
   - `transactions`: Arsip struk belanja dan metadata OCR.
   - `grocery_items`: Baris produk, harga normal, harga akhir diskon, kategori, dan status esensial.
   - `pantry_stock`: Pelacak masa simpan bahan dapur, tanggal kedaluwarsa, dan status konsumsi zero-waste.
   - `price_benchmarks`: Patokan harga multi-ritel untuk radar komparator.
   - `achievement_badges`: Katalog lencana gamifikasi.

2. **REST API Server (`server.js`):**
   - `POST /api/ocr/receipt` - Memproses ekstraksi data struk belanja.
   - `POST /api/budget/evaluate` - Mengevaluasi ambang batas anggaran & status freeze.
   - `POST /api/radar/compare` - Komparator harga antar ritel.
   - `POST /api/pantry/suggest-recipes` - Generator saran resep zero-waste.
   - `GET /api/badges` - Mengambil status milestone gamifikasi.

---

## 🚀 Cara Menjalankan

### Opsi 1: Buka Langsung di Peramban Web (Tanpa Install Apapun)
Cukup klik ganda file **`index.html`** langsung di browser (Chrome, Edge, Safari, Firefox). Seluruh modul (OCR Scanner, Radar, Pantry, Gamifikasi, Dark Mode) berjalan 100% mandiri di peramban.

### Opsi 2: Jalankan dengan Server Node.js
```bash
npm start
# atau
node server.js
```
Akses di browser: **`http://localhost:3000/`**

### Opsi 3: Pasang sebagai PWA di Smartphone
1. Buka aplikasi di peramban smartphone.
2. Pilih menu **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
3. Aplikasi akan terpasang sebagai Progressive Web App tanpa bilah URL peramban dan siap digunakan offline.
