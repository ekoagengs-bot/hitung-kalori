import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Gunakan foto JPG, PNG, atau WEBP.'), ok);
  }
});
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20 }));

const SYSTEM_PROMPT = `Kamu asisten nutrisi. Identifikasi semua makanan/minuman yang terlihat dan estimasikan porsi serta gizinya. Jangan menyatakan angka pasti: jelaskan ketidakpastian khususnya minyak, gula, saus, santan dan bahan tersembunyi. Jika bukan makanan/minuman atau foto tidak jelas, set is_food=false. Kembalikan JSON valid:
{"is_food":true,"items":[{"name":"...", "portion":"...", "calories_kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"assumption":"..."}],"total":{"calories_kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0},"confidence":"rendah|sedang|tinggi","notes":["..."],"follow_up_question":"..." }`;
async function analyzeImage(buffer, mimeType, context = '') {
  if (!openai) throw new Error('OPENAI_API_KEY belum dikonfigurasi.');
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: context || 'Analisis foto makanan/minuman ini. Perkirakan porsi yang terlihat.' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}`, detail: 'high' } }
      ]}
    ]
  });
  return JSON.parse(response.choices[0]?.message?.content || '{}');
}
function formatResult(r) {
  if (!r.is_food) return `Saya belum dapat mengenali makanan/minuman. ${(r.notes || []).join(' ')} Coba foto ulang dengan pencahayaan cukup.`;
  const t = r.total || {};
  const lines = ['🍽️ *HASIL ANALISIS KALORI*', '',
    ...(r.items || []).map((it, i) => `${i + 1}. *${it.name}* — ${it.portion}\n   ${Math.round(it.calories_kcal || 0)} kkal | Protein ${it.protein_g || 0}g | Karbo ${it.carbs_g || 0}g | Lemak ${it.fat_g || 0}g | Serat ${it.fiber_g || 0}g`),
    '', `🔥 *TOTAL: ${Math.round(t.calories_kcal || 0)} kkal*`,
    `Protein ${t.protein_g || 0}g | Karbohidrat ${t.carbs_g || 0}g`,
    `Lemak ${t.fat_g || 0}g | Serat ${t.fiber_g || 0}g`,
    `Keyakinan estimasi: *${r.confidence || 'sedang'}*`,
    ...(r.notes || []).map(n => `• ${n}`),
    ...(r.follow_up_question ? [`❓ ${r.follow_up_question}`] : []),
    '', '_Angka adalah estimasi visual, bukan pengukuran laboratorium._'];
  return lines.join('\n');
}

app.get('/api/health', (_req, res) => res.json({
  ok: true, aiConfigured: Boolean(openai),
  whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}));
app.post('/api/analyze', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Foto belum dipilih.' });
    const result = await analyzeImage(req.file.buffer, req.file.mimetype, req.body?.context || '');
    res.json(result);
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message || 'Analisis gagal.' });
  }
});

app.get('/webhook/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});
async function graphRequest(path, body) {
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const r = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'WhatsApp API error');
  return data;
}
async function sendText(to, body) {
  return graphRequest(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', recipient_type: 'individual', to,
    type: 'text', text: { preview_url: false, body }
  });
}
async function getMedia(mediaId) {
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const metaRes = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
  });
  const meta = await metaRes.json();
  if (!metaRes.ok || !meta.url) throw new Error(meta.error?.message || 'Gagal mengambil metadata gambar');
  const mediaRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } });
  if (!mediaRes.ok) throw new Error('Gagal mengunduh foto WhatsApp');
  const mime = mediaRes.headers.get('content-type') || meta.mime_type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Format foto harus JPG, PNG, atau WEBP.');
  const bytes = Buffer.from(await mediaRes.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Foto terlalu besar. Maksimal 8 MB.');
  return { bytes, mime };
}
app.post('/webhook/whatsapp', async (req, res) => {
  // Acknowledge quickly; Meta retries webhook deliveries when acknowledgement is delayed.
  res.sendStatus(200);
  try {
    const messages = req.body?.entry?.flatMap(e => e.changes || [])
      .flatMap(c => c.value?.messages || []) || [];
    for (const msg of messages) {
      if (!msg.from) continue;
      if (msg.type !== 'image' || !msg.image?.id) {
        await sendText(msg.from, 'Halo! Kirim foto makanan atau minuman (JPG/PNG/WEBP), nanti saya hitungkan estimasi kalori dan gizinya. 📸');
        continue;
      }
      try {
        await sendText(msg.from, '📸 Foto diterima. Saya sedang menganalisis makanan dan porsinya...');
        const media = await getMedia(msg.image.id);
        const result = await analyzeImage(media.bytes, media.mime, msg.image.caption || 'Analisis foto makanan/minuman ini.');
        await sendText(msg.from, formatResult(result));
      } catch (err) {
        console.error('WhatsApp processing error:', err.message);
        await sendText(msg.from, 'Maaf, foto belum berhasil dianalisis. Coba kirim ulang dengan foto lebih jelas. Pastikan layanan AI aktif.');
      }
    }
  } catch (err) { console.error('Webhook error:', err.message); }
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || 'Permintaan tidak valid.' });
});
app.listen(port, () => console.log(`Hitung Kalori AI berjalan di port ${port}`));
