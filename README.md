# Kalori Pro — Hitung Kalori AI untuk Web dan iOS

Kalori Pro adalah Progressive Web App (PWA) yang dipublikasikan melalui GitHub Pages. Di iPhone/iPad, pengguna dapat menambahkannya ke Home Screen dan membukanya dalam mode aplikasi melalui Safari.

## Fitur edisi Pro
- Desain premium yang responsif untuk desktop, tablet, dan iPhone.
- Ambil foto langsung dari kamera perangkat atau pilih dari galeri.
- Optimasi foto di perangkat (resize + JPEG) sebelum dikirim, termasuk mengurangi ukuran foto iPhone.
- Analisis gambar otomatis dengan Google Gemini melalui Google Apps Script.
- Simpan foto di Google Drive dan estimasi nutrisi di Google Sheets.
- Ringkasan konsumsi harian dan target kalori lokal pada perangkat.
- Bagikan ringkasan hasil melalui menu Share perangkat.
- PWA manifest dan service worker untuk Home Screen dan cache shell offline.

## Backend yang digunakan
- GitHub Pages: hosting UI.
- Google Apps Script: endpoint backend.
- Google Drive: penyimpanan foto.
- Google Sheets: riwayat analisis.
- Gemini Developer API: analisis visual. Free tier memiliki batas kuota dan kebijakan data tersendiri; cek pricing dan terms terkini Google AI Studio.

## Perbarui Apps Script
Jika Anda sudah menjalankan versi Gemini sebelumnya dan hanya memperbarui UI, Apps Script yang lama tetap bisa digunakan. Jika ingin memakai versi Code.gs terbaru, salin file `google-apps-script/Code.gs` ke Apps Script, simpan, lalu Deploy > Manage deployments > Edit > New version > Deploy. Jangan jalankan `doPost` langsung dari tombol Run.

## Konfigurasi website
1. Buka website Kalori Pro.
2. Buka Pengaturan koneksi di kartu Analisis makanan.
3. Tempel URL Web App Apps Script berakhiran `/exec`.
4. Klik Simpan koneksi.
5. Pilih foto dan klik Analisis dengan Gemini.

## Memasang di iPhone/iPad
1. Buka website melalui Safari.
2. Tekan tombol Share (kotak dengan panah ke atas).
3. Pilih Add to Home Screen / Tambah ke Layar Utama.
4. Jika muncul, aktifkan Open as Web App / Buka sebagai App.
5. Tekan Add / Tambah.
6. Buka ikon Kalori Pro di Home Screen. Karena penyimpanan tiap Home Screen web app dapat terpisah dari tab Safari, masukkan URL Apps Script sekali lagi di Pengaturan koneksi jika belum tersimpan.

## Catatan
- Ini adalah PWA, bukan aplikasi native yang diterbitkan di Apple App Store. PWA dijalankan oleh Safari/WebKit.
- Fitur analisis memerlukan internet dan backend Apps Script aktif. Service worker hanya menyimpan shell UI agar halaman dapat dibuka saat offline; foto tidak dianalisis tanpa koneksi.
- Foto dikirim ke Google Apps Script dan Google Gemini. Hindari foto atau data pribadi yang sensitif.
- Ringkasan harian di bagian dashboard disimpan lokal di browser/perangkat tersebut. Data lengkap tetap tercatat di Google Sheets.
- Hasil kalori adalah estimasi visual, bukan pengukuran laboratorium.
