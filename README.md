# Hitung Kalori AI

Aplikasi web + WhatsApp untuk memperkirakan kalori dan makronutrien dari foto makanan/minuman menggunakan model vision AI.

## Fitur
- Web: unggah foto makanan, analisis AI, dan ringkasan nutrisi.
- WhatsApp Cloud API: pengguna mengirim foto ke nomor WhatsApp Business, bot membalas estimasi nutrisi.
- Estimasi kalori, protein, karbohidrat, lemak, serat, porsi dan catatan asumsi.

## Jalankan lokal
1. Gunakan Node.js 20+.
2. Salin `.env.example` menjadi `.env` lalu isi kredensial.
3. `npm install && npm start`
4. Buka http://localhost:3000

## Hubungkan WhatsApp
1. Buat aplikasi di Meta for Developers dan aktifkan WhatsApp Cloud API.
2. Isi `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, dan `WHATSAPP_VERIFY_TOKEN`.
3. Deploy server ke hosting HTTPS publik.
4. Atur callback URL ke `https://DOMAIN/webhook/whatsapp` dan verify token yang sama.
5. Subscribe webhook ke field `messages`.

## Konfigurasi
Lihat `.env.example`. Jangan commit `.env` atau token.

Catatan: analisis foto adalah estimasi. Ukuran porsi, minyak, gula, santan, saus dan bahan tersembunyi dapat memengaruhi hasil.