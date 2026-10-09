# Berita Angin — dashboard pasar dengan data harian otomatis

## Struktur
```
index.html                  kerangka halaman (HTML saja)
css/01..05-*.css            gaya (urutan = urutan kaskade, jangan diubah urutannya)
js/01..57-*.js              skrip (urutan = urutan eksekusi di index.html)
  01-data-loader.js           membaca window.__DAILY dan menimpa nilai dasar tiap halaman
  57-data-refresh.js          memantau data-meta.json, memuat data.js baru tanpa menunggu cache
data.js                     DIBUAT OTOMATIS oleh update_data.py (jangan diedit manual)
data-meta.json              DIBUAT OTOMATIS: cap waktu data, dipakai browser untuk cek data baru
update_data.py              pengambil data (Yahoo Finance, CoinGecko, alternative.me, FRED) — tanpa dependensi
sw.js                       service worker: data selalu network-first, aset statis stale-while-revalidate
manifest.webmanifest        PWA, icon-192.png, icon-512.png
.github/workflows/update-data.yml   jadwal harian + deploy GitHub Pages
```

## Alur data otomatis
1. GitHub Actions berjalan 06:30 WIB (tiap hari) dan 16:30 WIB (hari kerja), atau manual lewat **Actions → Run workflow**.
2. `update_data.py` mengambil data, menulis `data.js` + `data-meta.json`, lalu bot meng-commit keduanya.
3. Workflow langsung men-deploy situs ke GitHub Pages (satu workflow, jadi tidak bergantung pada pemicu antar-workflow).
4. Browser pengunjung memeriksa `data-meta.json` tiap 10 menit / saat tab aktif lagi. Bila ada data baru:
   tab tersembunyi → otomatis dimuat ulang; tab sedang dilihat → banner "Data pasar baru tersedia · Muat ulang".
5. Selain itu, halaman tetap mengambil harga live (CoinGecko/Yahoo) di browser; `data.js` adalah dasar harian + cadangan bila API live gagal.

Lencana kanan-bawah: hijau = data < 36 jam, merah = usang.

## Pasang (sekali saja)
1. Upload semua file ini ke repo GitHub (branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Actions → General → Workflow permissions: Read and write permissions**.
4. Buka tab **Actions → Update data pasar harian & deploy → Run workflow** untuk menjalankan pertama kali.

## Uji lokal
```
python update_data.py          # perbarui data.js
python -m http.server 8000     # buka http://localhost:8000
```
(Harus lewat http, bukan klik dua kali file, agar service worker & pengecekan data berfungsi.)

## Mengubah jadwal / daftar aset
- Jadwal: edit baris `cron` di workflow (waktu UTC; WIB = UTC+7). Contoh tiap 30 menit: `*/30 * * * *`.
- Aset: edit dict `Y`, `FX`, `HIST`, `STOCKS` di `update_data.py`. Nama baris di `Y` harus sama dengan nama baris tabel Global Market di halaman.

## Pemecahan masalah
- Lencana merah / "usang": cek tab Actions; kemungkinan Yahoo/CoinGecko membatasi (429). Skrip mempertahankan nilai lama untuk bagian yang gagal.
- Push bot ditolak: pastikan branch tidak diproteksi untuk `github-actions`, atau izin workflow = Read and write.
- Situs tidak berubah setelah deploy: hard refresh sekali; setelah itu service worker memakai versi cache baru (`__BUILD__` diganti otomatis tiap deploy).

## Tanpa GitHub (lokal)
```
python server.py                 # atau klik start.bat (Windows) / ./start.sh (Mac/Linux)
python server.py --every 3       # update tiap 3 jam
python server.py --host 0.0.0.0  # bisa dibuka dari HP satu Wi-Fi: http://IP-komputer:8000
```
Server mengecek umur data.js saat start dan tiap 10 menit; bila lebih tua dari `--every` jam, `update_data.py` dijalankan otomatis.
Alternatif tanpa server: jadwalkan `python update_data.py` dengan cron (Linux/Mac) atau Task Scheduler (Windows), mis. cron: `30 6 * * * cd /path && python3 update_data.py`.
