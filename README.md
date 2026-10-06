# Berita Angin — 1% Issue, 99% Fact

> Dasbor web untuk memantau **pasar kripto, saham AS, dan pasar global** secara real-time, dilengkapi artikel edukasi Web3 berbahasa Indonesia, kalkulator risiko trading, dan e-wallet multi-chain.

![Static](https://img.shields.io/badge/deploy-static%20hosting-0ea5e9)
![PWA](https://img.shields.io/badge/PWA-ready-34d399)
![Language](https://img.shields.io/badge/bahasa-Indonesia-f43f5e)
![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20Vanilla%20JS-a78bfa)

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Struktur Halaman](#struktur-halaman)
- [Teknologi](#teknologi)
- [Sumber Data](#sumber-data)
- [Memulai](#memulai)
- [Deploy](#deploy)
- [Kustomisasi](#kustomisasi)
- [Struktur Berkas](#struktur-berkas)
- [Catatan Keamanan](#catatan-keamanan)
- [Disclaimer](#disclaimer)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)
- [Kontak](#kontak)

---

## Tentang Proyek

**Berita Angin** adalah aplikasi web satu halaman (single-page) yang menggabungkan berita, data pasar langsung, dan materi edukasi keuangan digital dalam satu antarmuka yang cepat dan responsif. Aplikasi berjalan sepenuhnya di sisi klien sehingga dapat di-host di layanan statis seperti GitHub Pages, Netlify, Vercel, atau Cloudflare Pages tanpa server tambahan.

Tujuan utamanya: membantu investor dan pembelajar di Indonesia membaca pasar dengan **data yang terverifikasi, bukan sekadar isu**.

## Fitur Utama

**Pasar & Data**
- **Live Crypto Index Tracker** — harga, perubahan, dan sparkline aset kripto, plus grafik candlestick.
- **US Market Live Monitor** — pemantauan indeks AS, *Top Movers* large cap, dan **Sector Rotation Monitor**.
- **Global Market Overview** — ringkasan lintas pasar, indikator makro (mis. DXY, VIX), dan likuiditas.
- **Kalender Libur Bursa AS** serta **konverter mata uang**.
- **Berita pasar AS** dengan sumber online yang diperbarui berkala.
- **Ticker berjalan** di bagian atas halaman (dapat dimatikan).

**Web3 & Dompet**
- **Web3 e-Wallet & Multi-Chain Vault** — tampilan aset token, riwayat transaksi, dan alur kirim/terima aset.
- **Koneksi dompet** melalui Ethers/Web3 (mis. MetaMask) dan dukungan jaringan seperti Ethereum, Polygon, dan Arbitrum.

**Alat Trading**
- **Market Stat / kalkulator risiko** — hitung ukuran posisi dari modal, harga masuk, stop loss, target harga, dan risiko per trade (%).

**Edukasi**
- Artikel pilihan keuangan digital: dasar Web3, DeFi, smart contract, layer-2, oracle, DAO, tokenisasi aset dunia nyata (RWA).
- Analisis korelasi saham–kripto, manajemen risiko, glosarium, dan FAQ.

**Pengalaman Pengguna**
- **PWA** — dapat dipasang di perangkat dan berjalan dengan service worker.
- **Tema gelap/terang/otomatis**, pilihan warna aksen, latar, font, radius sudut, dan kontras tinggi.
- **Efek 3D** pada kartu dan grafik (dapat dikurangi lewat mode tenang).
- Zona waktu dan format jam 12/24 yang dapat diatur (default WIB).
- Pengaturan tersimpan lokal di peramban.

## Struktur Halaman

| Halaman | ID | Isi |
|---|---|---|
| Beranda | `page-home` | Hero, artikel pilihan keuangan digital |
| Crypto Market | `page-crypto-market` | Index tracker, live streaming, e-wallet & vault |
| Stock Exchange | `page-stock-exchange` | Overview market, sektor, top movers, berita, kalender, konverter |
| Global Market | `page-global-market` | Ringkasan pasar global dan makro |
| Market Stat | `page-market-stat` | Kalkulator risiko trading |
| Profil | `page-profile` | Identitas, keahlian, dan portofolio |
| Pengaturan | `page-settings` | Personalisasi tampilan, serta artikel edukasi |
| Detail Artikel | `page-article-detail` | Pembaca artikel lengkap |

## Teknologi

- **Front-end:** HTML5, CSS, JavaScript (vanilla)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) (CDN) + CSS kustom
- **Grafik:** [Chart.js](https://www.chartjs.org) 4.4.1, `chartjs-adapter-date-fns`, `chartjs-chart-financial` (candlestick), plus plugin 3D kustom
- **Ikon & font:** Font Awesome 6.5.1, Inter (Google Fonts)
- **Web3:** Ethers.js / Web3.js untuk koneksi dompet dan RPC
- **PWA:** `manifest.webmanifest` dan `sw.js`

## Sumber Data

Aplikasi mengambil data publik dari sejumlah layanan pihak ketiga, antara lain:

| Kategori | Sumber |
|---|---|
| Harga & logo kripto | CoinGecko |
| Saham & indeks | Yahoo Finance |
| Berita pasar | CNBC, Dow Jones feeds, Yahoo Finance feeds |
| Sentimen pasar | Alternative.me (Fear & Greed) |
| Kurs mata uang | open.er-api.com |
| Data makro | FRED (St. Louis Fed) |
| DeFi | DefiLlama |
| RPC blockchain | Ethereum, Polygon, Arbitrum (endpoint publik) |

Di hosting statis, permintaan dicoba melalui beberapa rute secara bertahap dan paralel, dengan cache 30 detik antar modul agar tetap cepat dan hemat kuota API. Bila memungkinkan, aplikasi juga akan memakai endpoint proxy `/api/health` jika tersedia di server Anda.

> **Catatan:** layanan gratis memiliki batas permintaan (rate limit) dan dapat berubah sewaktu-waktu. Ketersediaan data tidak dijamin.

## Memulai

### Prasyarat
- Peramban modern (Chrome, Edge, Firefox, Safari)
- Koneksi internet (untuk data real-time dan pustaka CDN)

### Menjalankan secara lokal

```bash
# 1. Klon repositori
git clone https://github.com/<username>/<nama-repo>.git
cd <nama-repo>

# 2. Jalankan server statis (pilih salah satu)
python3 -m http.server 8080
# atau
npx serve .
```

Buka `http://localhost:8080/my_web3_news.html` di peramban.

> Disarankan menggunakan server lokal, bukan membuka berkas langsung (`file://`), agar service worker, manifest PWA, dan permintaan jaringan berfungsi normal.

## Deploy

Karena murni statis, aplikasi dapat dipublikasikan di:

- **GitHub Pages** — aktifkan di *Settings → Pages*
- **Netlify / Vercel / Cloudflare Pages** — arahkan ke direktori proyek tanpa langkah build

Agar fitur PWA berjalan, pastikan berkas berikut berada satu folder dengan halaman utama:

```
manifest.webmanifest
sw.js
icon-192.png
```

Pertimbangkan menamai berkas utama menjadi `index.html` agar tersedia di URL akar.

## Kustomisasi

Buka halaman **Pengaturan** di dalam aplikasi untuk mengubah:

| Opsi | Keterangan |
|---|---|
| Tema | Gelap, terang, atau otomatis mengikuti sistem |
| Aksen & latar | Sky, emerald, violet, amber, rose, cyan; latar black/coal/night |
| Tipografi & bentuk | Ukuran font, jenis font, radius sudut |
| Efek visual | Kedalaman 3D, tilt kartu, mode tenang, kontras tinggi |
| Ticker | Aktif/nonaktif dan kecepatan |
| Waktu | Zona waktu (WIB/WITA/WIT/UTC, dll.) dan format 12/24 jam |
| Nama & peran | Personalisasi tampilan sapaan |

Grafik 3D juga dapat dinyalakan atau dimatikan lewat konsol peramban:

```js
baChart3D(false); // matikan
baChart3D(true);  // nyalakan
```

## Struktur Berkas

```
.
├── my_web3_news.html      # Aplikasi utama (HTML, CSS, dan JS dalam satu berkas)
├── manifest.webmanifest   # Manifest PWA
├── sw.js                  # Service worker
├── icon-192.png           # Ikon aplikasi
└── README.md
```

## Catatan Keamanan

- **Jangan pernah** memasukkan *private key* atau *seed phrase* ke aplikasi web mana pun, termasuk proyek ini.
- Fitur koneksi dompet hanya meminta izin melalui penyedia dompet Anda (mis. MetaMask); selalu periksa alamat tujuan dan jaringan sebelum menandatangani transaksi.
- Saldo dan aset yang tampil pada kartu e-wallet di halaman profil bersifat **contoh tampilan** dan bukan data on-chain nyata sampai dompet terhubung.
- Aplikasi memuat skrip dari CDN pihak ketiga. Untuk penggunaan produksi, pertimbangkan *pinning* versi dan Subresource Integrity (SRI).

## Disclaimer

Seluruh konten di **Berita Angin** disediakan untuk tujuan **informasi dan edukasi**, bukan nasihat keuangan, investasi, hukum, atau pajak. Aset kripto dan saham berisiko tinggi dan nilainya dapat turun drastis. Lakukan riset mandiri (*DYOR*) dan konsultasikan dengan penasihat berlisensi sebelum mengambil keputusan.

## Kontribusi

Kontribusi sangat disambut.

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m "feat: deskripsi singkat"`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buka Pull Request

Untuk laporan bug atau usulan fitur, silakan buka *Issue* dengan langkah reproduksi yang jelas.

## Lisensi

Tentukan lisensi proyek Anda (mis. MIT) dan tambahkan berkas `LICENSE`.

## Kontak

**Achmad Efendi** — CEO, Berita Angin
Spesialis arsitektur dApp, keamanan protokol DeFi, dan analisis kuantitatif pasar aset digital.

---

<p align="center"><i>Berita Angin — 1% Issue, 99% Fact.</i></p>
