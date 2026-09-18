BERITA ANGIN
« 1% Issue, 99% Fakta »
Portal Berita Independen, Analisis Makroekonomi, Pasar Modal (IDX & Crypto), serta Jurnalisme Investigasi Terkini.

📖 Tentang Proyek
Berita Angin adalah platform berita berbasis web modern dan interaktif yang dirancang untuk menyajikan jurnalisme investigasi mendalam serta analitik data keuangan global secara real-time. Proyek ini menjembatani kebutuhan informasi masyarakat modern melalui kombinasi narasi jurnalistik berstandar tinggi dan dasbor finansial interaktif untuk pasar modal, komoditas, serta aset digital (kripto).

✨ Fitur Utama
📰 Dynamic Newsroom & Headline Carousel: Penyajian berita utama (breaking news), laporan investigasi khusus, serta sistem navigasi kategori berita yang responsif.
📑 Immersive Article Viewer: Format bacaan mendalam (long-form journalism) yang dilengkapi dengan tipografi optimal, tabel data terstruktur, dan elemen visual pendukung.
📈 ProTrader & Stock Exchange Terminal: Pemantauan instrumen keuangan bursa efek (IDX) secara langsung (live ticks) yang divisualisasikan melalui grafik interaktif Chart.js.
🪙 Global Markets & Crypto Tracker: Pelacakan kapitalisasi pasar global, Fear & Greed Index, serta daftar peringkat aset kripto (Top Gainers/Losers).
📊 Performance Analyst: Modul analitik performa portofolio dan pasar dengan simulasi aliran data langsung (live market performance).
👤 Professional Portfolio & Editorial Team: Transparansi profil, rekam jejak, latar belakang pendidikan, serta spesialisasi dari tim jurnalis dan analis finansial.
🌓 Adaptive Theme Engine: Fitur peralihan mode Dark dan Light secara mulus untuk kenyamanan visual pembaca.

🛠️ Stack Teknologi
Proyek ini dibangun menggunakan arsitektur modern berbasis klien (Single Page Application / SPA frontend-heavy) tanpa ketergantungan framework backend yang kompleks:
Markup & Styling: HTML5, Tailwind CSS (via CDN)
Logika & State Management: Vanilla JavaScript (ES6+)
Visualisasi Data: Chart.js

Aset & Ikon: FontAwesome, Google Fonts (Inter)
📂 Struktur Direktori & Arsitektur Halaman
Aplikasi dikelola menggunakan pendekatan modular di dalam manajemen DOM tunggal:

Plaintext
├── index.html                  # Entry point & SPA Container
├── assets/
│   ├── css/                    # Kustomisasi style tambahan
│   └── js/
│       ├── app.js              # Logika utama router & manajemen view
│       └── charts.js           # Konfigurasi integrasi Chart.js
└── README.md                   # Dokumentasi proyek

Modul Tampilan (Views):
#home-page : Beranda utama & sirkulasi berita terbaru.
#article-page : Halaman baca artikel penuh.
#markets-page : Indeks pasar global dan bursa kripto.
#stock-exchange-page : Terminal ProTrader instrumen keuangan.
#performance-analyst-page : Dasbor analitik performa pasar.
#profile-page : Direktori profil pengembang dan editor.

🚀 Panduan Memulai (Getting Started)
Ikuti langkah-langkah berikut untuk menjalankan proyek di lingkungan lokal Anda:
Prasyarat
Peramban web modern (Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari).
Koneksi internet aktif (diperlukan untuk memuat pustaka eksternal seperti Tailwind CSS dan Chart.js via CDN).

Instalasi & Menjalankan Proyek
Clone repository ini atau unduh arsip proyek:
Bash

git clone https://github.com/username/berita-angin.git
Buka direktori proyek:
Bash

cd berita-angin
Jalankan aplikasi:
Cukup buka file index.html langsung di peramban web Anda, atau
Gunakan ekstensi Live Server di Visual Studio Code untuk pengalaman hot-reloading yang optimal.

🎨 Konfigurasi Desain & Palet Warna
Sistem desain Berita Angin dirancang dengan prinsip keterbacaan tinggi (high legibility):
Primary Brand Color: #005C9E (Biru Korporat / Otoritas Finansial)
Dark Background: #000000 & #111827 (Clean Dark Mode)

Accent Indicators:
Bullish / Gain: #10b981 (Hijau)
Bearish / Loss: #ef4444 (Merah)
Terminal Accent: #3b82f6 (Biru Aksen)

👥 Kontributor & Tim Editorial
Lead Editor & Senior Financial Analyst: Achmad Efendi, SE, MM
Email Kontak: ven.genioes@gmail.com
Lokasi: Jakarta Pusat, Indonesia
📄 Lisensi
Proyek ini didistribusikan di bawah lisensi MIT
