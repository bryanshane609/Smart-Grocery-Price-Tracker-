# 🛒 Smart Grocery & Budget Safety Tracker (PWA)

Aplikasi Web Mobile (Progressive Web App) bergaya Native App yang dirancang khusus untuk mendampingi **siswa rantau** saat berbelanja bulanan di supermarket sambil mendorong troli belanja dengan satu tangan.

---

## 📱 Arsitektur & Standar Tampilan Mobile
1. **Format Layar Smartphone (Mobile-First):**
   - Batas lebar maksimal `430px` (*centered* dengan bayangan estetik saat dibuka di peramban desktop).
   - Tampilan penuh (100% viewport) saat dibuka di layar smartphone.
2. **Navigasi Bawah (Floating Bottom Navigation Bar):**
   - Menu navigasi melayang ramah jempol dengan ikon Lucide untuk 3 tab utama:
     - 🛒 **Belanja:** Keranjang aktif, filter kategori, pengontrol safety cap realtime.
     - 📜 **Riwayat:** Arsip riwayat belanja bulanan & struk digital.
     - ⚙️ **Anggaran:** Penyetelan limit anggaran bulanan & katalog harga pembanding.
3. **Ergonomi Sentuh Ramah Jempol:**
   - Tombol *stepper* kuantitas besar (`-` dan `+`).
   - *Bottom Sheet Drawer* meluncur halus dari bawah untuk input cepat tanpa menggeser jari ke atas layar.
   - Input harga angka besar dengan format Rupiah otomatis.
4. **Dukungan PWA (Progressive Web App):**
   - Dilengkapi `manifest.json`, icon maskable SVG, dan `sw.js` (Service Worker) untuk instalasi langsung ke Layar Utama (*Add to Home Screen*) dan dapat berjalan tanpa koneksi internet (*offline ready*).

---

## 📋 Checklist Kebutuhan Fungsional SRS

| Kode | Fitur | Status | Deskripsi & Implementasi |
| :--- | :--- | :---: | :--- |
| **F-01** | **Pencatatan Item Belanja Lengkap** | ✅ Selesai | Form modal memuat Nama Produk (dengan *auto-suggest* cepat), Kategori (Sembako, Makanan Instan, Daging/Sayur, Toiletries, Bumbu/Minyak, Minuman, Camilan, Lainnya), Satuan (`pcs`, `pack`, `kg`, `liter`, `bungkus`, `botol`, dll.), Kuantitas (Qty), dan Harga Satuan. |
| **F-02** | **Perhitungan Kuantitas Otomatis** | ✅ Selesai | Perubahan Qty atau harga satuan mengalikan total baris item dan total belanja secara realtime seketika tanpa reload. |
| **F-03** | **Kalkulator Diskon Bertingkat** | ✅ Selesai | Mendukung diskon tunggal (contoh: `25%`), potongan nominal langsung (`-Rp 5.000`), dan **diskon bertumpuk/multi-tier** (contoh: `50% + 20%`) dengan rumus matematis tepat: `Harga_Akhir = Harga_Awal × (1 - T1/100) × (1 - T2/100)`. Menampilkan label diskon efektif dan total rupiah yang dihemat. |
| **F-04** | **Komparator Harga Realtime vs Bulan Lalu** | ✅ Selesai | Indikator visual seketika saat nama/harga diinput: <br>• **Panah Merah Naik (↑)**: Lebih mahal dibanding bulan lalu (+selisih nominal & %).<br>• **Panah Hijau Turun (↓)**: Lebih murah dibanding bulan lalu (-selisih nominal & %).<br>• **Tanda Setara (=)**: Harga stabil/sama.<br>• **Tanda Bintang (✨)**: Produk baru jika belum ada riwayat. |
| **F-05** | **Pengendali Anggaran (Safety Cap)** | ✅ Selesai | Batas maksimal anggaran bulanan dapat diatur. Dilengkapi *progress bar* dinamis & badge status warna adaptif: <br>• **Hijau Aman** (< 75%)<br>• **Kuning Waspada** (75% - 89%)<br>• **Oranye Kritis** (90% - 99%)<br>• **Merah Menyala Pulsa (🚨 OVER BUDGET)** (≥ 100%) dengan alarm visual dan kalkulasi sisa saldo/defisit realtime. |
| **F-06** | **Riwayat & Database Belanja** | ✅ Selesai | Penyimpanan otomatis via `LocalStorage`. Fitur *"Selesaikan & Simpan ke Riwayat"* mengarsipkan transaksi ke struk digital (dapat disalin ke WhatsApp/catatan kost) dan **secara otomatis memperbarui harga patokan bulan lalu** untuk perbandingan belanja berikutnya. |

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dibangun menggunakan struktur web modern murni (HTML5, Tailwind CSS, Lucide Icons, Vanilla JavaScript) tanpa dependensi rumit:

### Opsi 1: Menjalankan dengan Node.js (Server Lokal Sudah Siap)
```bash
npm start
# atau
node server.js
```
Akses di browser: **`http://localhost:3000/`**

### Opsi 2: Buka Langsung di Browser
Cukup klik ganda (double click) file **`index.html`** langsung di peramban (Chrome, Edge, Safari, Firefox).

### Opsi 3: Pasang di Smartphone (PWA)
1. Buka URL aplikasi di peramban smartphone (misal Chrome di Android atau Safari di iOS).
2. Tekan menu opsi peramban (ikon titik tiga atau tombol Share).
3. Pilih **"Tambahkan ke Layar Utama" / "Add to Home Screen"**.
4. Aplikasi akan terpasang sebagai aplikasi mandiri (*standalone*) tanpa bilah URL peramban.

---

## 💡 Fitur Unggulan Tambahan
- **Contoh Data Anak Rantau (Preload Seed Data):** Tersedia tombol satu kali klik untuk memuat keranjang dan riwayat bulan lalu yang realistis (Beras, Telur, Indomie, Minyak Sania, Sabun Lifebuoy) agar Anda bisa langsung menguji komparator dan safety cap seketika.
- **Audio Feedback Synthesizer (Web Audio API):** Memberikan umpan balik suara klik saat memasukkan item dan suara nada alarm saat keranjang *over budget* (dapat dimatikan melalui tombol di header).
- **Struk Belanja Digital:** Format struk rapi dengan tombol salin otomatis ke format pesan teks WhatsApp.