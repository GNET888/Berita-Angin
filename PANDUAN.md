# Berita Angin: Sinkron Web ↔ Mobile (Supabase)

`index.html` di sini sudah terhubung ke cloud. Selama URL/kunci Supabase belum diisi, situs berjalan lokal seperti semula.

## Langkah pasang (±10 menit)

1. Buat proyek di https://supabase.com.
2. **SQL Editor → New query** → tempel `supabase_schema.sql` → **Run**.
   (Jika sebelumnya sudah menjalankan skema versi lama, jalankan dulu `drop table if exists public.posts cascade;`.)
3. **Project Settings → API**: salin *Project URL* dan *anon public key*.
4. Buka `index.html`, cari `window.BA_SUPABASE`, ganti `ISI_URL_SUPABASE` dan `ISI_ANON_PUBLIC_KEY`.
5. **Authentication → Providers → Email**: aktif. Untuk uji coba, matikan "Confirm email".
6. **Authentication → URL Configuration**: isi *Site URL* dengan alamat GitHub Pages Anda, mis. `https://namaanda.github.io/nama-repo/`.
7. Upload ke repo GitHub, dalam satu folder: `index.html`, `ba-cloud.js` (beserta file lama: `data.js`, `manifest.webmanifest`, `sw.js`, ikon).
8. Naikkan versi cache di `sw.js` agar pengguna tidak melihat versi lama.

Login Google (opsional): aktifkan provider Google di Supabase dengan Client ID yang sama dengan yang Anda isi di meta `google-signin-client_id`.

## Yang berubah di index.html

| Perubahan |
|---|---|
| `<head>` | Konfigurasi Supabase, supabase-js (v2.45.4, jsDelivr), `ba-cloud.js` |
| Posting | Foto, video, GIF, audio diunggah ke bucket `media`; teks, polling, lokasi, dll. disimpan di tabel `posts` |
| Tampilan media | Memakai URL cloud lebih dulu; IndexedDB cadangan |
| Lini masa | Memuat postingan dari server, update langsung (realtime), hapus ikut tersinkron |
| Tombol hapus | Hanya muncul di postingan milik sendiri |
| Sign Up / Sign In / Google / Sign Out | Memakai akun cloud; akun lama yang hanya lokal tetap bisa masuk |

## Uji

1. Laptop: login, posting foto dan video.
2. HP (PWA): login dengan akun yang sama, postingan harus muncul.
3. Posting dari HP saat laptop terbuka, harus muncul tanpa refresh.
4. Hapus di satu perangkat, harus hilang di perangkat lain.

## Batasan yang perlu diketahui

- Suara polling masih tersimpan per browser (belum dibagi antar pengguna).
- Postingan lama di browser (sebelum cloud aktif) tetap lokal; tidak otomatis diunggah.
- Akun lama yang hanya lokal baru ikut sinkron setelah Sign Up ulang dengan email yang sama.
- Paket gratis Supabase: penyimpanan 1 GB; proyek dijeda otomatis bila lama tidak aktif.
- Aplikasi Play Store/App Store: bungkus dengan Capacitor (`npx cap init`, `npx cap add android`), web dan app memakai backend yang sama.
