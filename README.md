# Hitung Kalori AI — mode gratis tanpa API

## Arsitektur
- GitHub Pages: antarmuka web statis.
- Google Apps Script: menerima foto dan menyimpan data.
- Google Drive: menyimpan foto pada akun Google pemilik Apps Script.
- Google Sheets: mencatat unggahan serta angka nutrisi.
- ChatGPT: menganalisis foto secara manual. Tidak menggunakan OpenAI API dan tidak ada biaya API.

## Menyiapkan Google Apps Script
1. Buka https://script.google.com/ lalu buat project baru bernama **Hitung Kalori AI**.
2. Buka file `google-apps-script/Code.gs` pada repository ini. Salin seluruh isinya ke file `Code.gs` pada Apps Script.
3. Klik **Save**.
4. Pada dropdown fungsi di toolbar, pilih `setup`, lalu klik **Run**. Berikan izin Google untuk membuat folder Drive dan spreadsheet.
5. Klik **Deploy > New deployment**.
6. Pilih jenis **Web app**.
7. **Execute as:** Me.
8. **Who has access:** Anyone. Endpoint ini publik; siapa pun yang mengetahui URL dapat mengirim unggahan ke akun Drive Anda. Jangan sebarkan URL, dan jangan gunakan untuk dokumen sensitif.
9. Klik **Deploy**, selesaikan otorisasi, lalu salin URL Web app yang berakhiran `/exec`.

## Menggunakan website
1. Buka https://ekoagengs-bot.github.io/hitung-kalori/.
2. Tempel URL Web app Apps Script di kolom pertama.
3. Pilih foto JPG/PNG/WEBP maksimal 4 MB.
4. Klik **Simpan foto ke Google Drive**. Aplikasi menyimpan foto dan menambahkan baris baru di Google Sheets.
5. Klik **Buka ChatGPT untuk analisis foto**. Di ChatGPT, lampirkan foto asli dari perangkat.
6. Klik **Salin prompt analisis**, tempel prompt di ChatGPT, lalu baca hasil estimasi.
7. Kembali ke website, masukkan total kalori, protein, karbohidrat, lemak dan serat. Klik **Simpan hasil nutrisi ke Google Sheets**.

## Catatan dan batasan
- Analisis tidak otomatis: pengguna harus mengunggah foto sendiri ke ChatGPT.
- Aplikasi tidak membaca percakapan ChatGPT atau mengirim foto ke ChatGPT secara otomatis.
- Foto disimpan pada Google Drive akun yang menjalankan Apps Script. Pastikan akun Google yang digunakan benar.
- Apps Script dan Drive memiliki kuota serta batas penggunaan. Ukuran foto dibatasi sekitar 4 MB.
- Google dapat menampilkan peringatan aplikasi belum diverifikasi saat otorisasi skrip pribadi. Jalankan hanya kode yang sudah diperiksa dan berasal dari repository Anda sendiri.
- Jangan pernah menaruh API key, password, atau token rahasia di GitHub.
