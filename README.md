# Hitung Kalori AI — mode gratis tanpa API

## Arsitektur
- GitHub Pages: antarmuka web statis.
- Google Apps Script: endpoint penerimaan foto.
- Google Drive: penyimpanan foto pribadi.
- Google Sheets: daftar unggahan.
- ChatGPT: analisis foto secara manual oleh pengguna. Tidak ada OpenAI API dan tidak ada biaya API.

## Menyiapkan Google Apps Script
1. Buka https://script.google.com/ dan buat project baru bernama Hitung Kalori AI.
2. Salin isi file `Code.gs` dari repository ini ke editor Apps Script.
3. Klik Save.
4. Pada dropdown fungsi, pilih `setup`, lalu klik Run. Berikan izin Google untuk membuat folder Drive dan spreadsheet.
5. Klik Deploy > New deployment.
6. Pilih jenis Web app.
7. Execute as: Me.
8. Who has access: Anyone (endpoint publik). Jangan gunakan untuk menyimpan dokumen sensitif. Siapa pun yang mengetahui URL dapat mengirim unggahan; batasi penyebaran URL dan pantau kuota Drive/Apps Script.
9. Klik Deploy, selesaikan otorisasi, lalu salin URL Web app yang berakhiran `/exec`.

## Menggunakan website
1. Buka GitHub Pages.
2. Tempel URL Web app Apps Script pada kolom pertama.
3. Pilih foto JPG/PNG/WEBP maksimal 4 MB.
4. Klik Simpan foto ke Google Drive.
5. Setelah berhasil, klik Buka ChatGPT untuk analisis foto. Lampirkan foto asli dari perangkat dan tempel prompt analisis yang disediakan.
6. Foto dan tautannya tercatat di folder Drive serta spreadsheet yang dibuat oleh fungsi setup.

## Catatan
- Analisis tidak otomatis: pengguna harus mengunggah foto ke ChatGPT sendiri.
- Aplikasi ini tidak mengakses percakapan ChatGPT atau mengirim foto ke ChatGPT secara otomatis.
- Foto disimpan pada Google Drive akun yang menjalankan Apps Script. Pastikan akun Google Anda benar.
- Apps Script dan Drive memiliki kuota dan batas ukuran; foto dibatasi sekitar 4 MB.
- Jangan pernah menaruh API key, password, atau token rahasia di GitHub.
