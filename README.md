# Hitung Kalori AI — Google Apps Script + Gemini

## Fitur
- Website statis melalui GitHub Pages.
- Foto disimpan ke Google Drive.
- Gemini 3.1 Flash-Lite menganalisis foto makanan/minuman secara otomatis.
- Hasil kalori, protein, karbohidrat, lemak, serat, asumsi, dan tingkat keyakinan disimpan ke Google Sheets.
- Tidak menggunakan OpenAI API. Gemini Developer API memiliki free tier dengan batas penggunaan; tidak dijamin tanpa batas.

## 1. Buat Gemini API Key
1. Buka https://aistudio.google.com/app/apikey.
2. Masuk dengan akun Google Anda.
3. Klik Create API key dan salin kuncinya.
4. Jangan masukkan key ke GitHub, website, atau chat. Simpan nanti di Script Properties Google Apps Script.

Model bawaan: `gemini-3.1-flash-lite`. Harga/kelayakan free tier dan batas permintaan dapat berubah; periksa halaman pricing resmi Gemini API. Pada free tier, konten yang dikirim dapat digunakan Google untuk meningkatkan produk.

## 2. Siapkan Google Apps Script
1. Buka https://script.google.com/.
2. Salin seluruh isi file `google-apps-script/Code.gs` dari repository ini ke editor Apps Script (file bernama Code.gs).
3. Klik Save.
4. Pilih fungsi `setup`, klik Run, dan berikan izin untuk Drive dan Sheets bila diminta.
5. Buka Project Settings (ikon roda gigi di panel kiri).
6. Pada bagian Script Properties, klik Add script property:
   - Property: `GEMINI_API_KEY`
   - Value: tempel Gemini API key Anda
7. (Opsional) Tambahkan `GEMINI_MODEL` = `gemini-3.1-flash-lite`.
8. Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy. Pastikan deployment adalah Web app, Execute as: Me, Who has access: Anyone.
9. Salin URL Web app yang berakhir `/exec`.

## 3. Menggunakan website
1. Buka https://ekoagengs-bot.github.io/hitung-kalori/.
2. Tempel URL Apps Script ke kolom URL Web App. URL disimpan di browser.
3. Pilih foto JPG/PNG/WEBP, maksimal 4 MB.
4. Klik Analisis foto dengan Gemini.
5. Website akan mengirim foto ke Apps Script. Apps Script menyimpan foto ke Drive, mengirimkan gambar ke Gemini, lalu menampilkan dan menyimpan hasil nutrisi ke Sheets.

## Privasi dan batas
- Foto tersimpan di Drive pemilik Apps Script dan juga dikirim ke Gemini untuk dianalisis.
- Free tier Gemini memiliki kuota/batas; setelah kuota habis, coba kembali nanti atau pertimbangkan tier berbayar. Tidak ada jaminan layanan gratis tanpa batas.
- Pada free tier, konten dapat digunakan Google untuk meningkatkan produk. Jangan unggah foto atau informasi sensitif.
- Web App dengan akses Anyone bersifat publik bagi siapa pun yang mengetahui URL. Jangan membagikan URL; penggunaan publik bisa menghabiskan kuota API, Apps Script, dan Drive.
- Nilai gizi adalah estimasi visual, bukan pengukuran laboratorium.
