/**
 * Hitung Kalori AI - Google Apps Script + Drive + Sheets + Gemini
 * Gemini key must be stored in Script Properties as GEMINI_API_KEY.
 * Never paste the key into this source file or GitHub.
 */
const CONFIG = PropertiesService.getScriptProperties();
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

function setup() {
  let folderId = CONFIG.getProperty('DRIVE_FOLDER_ID');
  let spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('Hitung Kalori AI - Foto Makanan');
    folderId = folder.getId();
    CONFIG.setProperty('DRIVE_FOLDER_ID', folderId);
  }
  if (!spreadsheetId) {
    const ss = SpreadsheetApp.create('Riwayat Hitung Kalori AI');
    const sheet = ss.getSheets()[0];
    sheet.setName('Riwayat');
    sheet.appendRow([
      'Waktu unggah', 'Nama file', 'Link foto Google Drive', 'Catatan pengguna',
      'Status analisis', 'Kalori (kkal)', 'Protein (g)',
      'Karbohidrat (g)', 'Lemak (g)', 'Serat (g)', 'Catatan AI'
    ]);
    spreadsheetId = ss.getId();
    CONFIG.setProperty('SPREADSHEET_ID', spreadsheetId);
  }
  const activeSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat');
  if (!activeSheet) throw new Error('Sheet Riwayat tidak ditemukan.');
  ensureDeleteTokens_(activeSheet);

  Logger.log('Folder foto: https://drive.google.com/drive/folders/' + folderId);
  Logger.log('Riwayat: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
  Logger.log('Gemini API key: ' + (CONFIG.getProperty('GEMINI_API_KEY') ? 'sudah diatur' : 'BELUM diatur'));
  return { folderId: folderId, spreadsheetId: spreadsheetId };
}

function doGet() {
  return ContentService.createTextOutput('Hitung Kalori AI + Gemini aktif.');
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const nonce = String(p.nonce || '');
  let file = null;
  let rowNumber = 0;
  let deleteToken = '';
  try {
    if (p.action === 'deleteRecord') {
      return deleteRecord_(p.deleteToken, nonce);
    }
    if (!p.photoData || !p.fileName) throw new Error('Foto atau nama file tidak ditemukan.');
    if (String(p.photoData).length > 5600000) throw new Error('Ukuran foto terlalu besar. Maksimal sekitar 4 MB.');
    const match = String(p.photoData).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
    if (!match) throw new Error('Format foto harus JPG, PNG, atau WEBP.');
    const folderId = CONFIG.getProperty('DRIVE_FOLDER_ID');
    const spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
    if (!folderId || !spreadsheetId) throw new Error('Setup belum dijalankan. Jalankan fungsi setup terlebih dahulu.');
    const mimeType = match[1];
    const base64Data = match[2];
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, mimeType, sanitizeFileName(p.fileName));
    file = DriveApp.getFolderById(folderId).createFile(blob);
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat');
    if (!sheet) throw new Error('Sheet Riwayat tidak ditemukan.');
    sheet.appendRow([new Date(), file.getName(), file.getUrl(), String(p.note || ''),
      'Foto tersimpan - menunggu Gemini', '', '', '', '', '', '']);
    rowNumber = sheet.getLastRow();
    deleteToken = Utilities.getUuid();
    sheet.getRange(rowNumber, 12).setValue(deleteToken);
    const analysis = analyzeWithGemini_(base64Data, mimeType, String(p.note || ''));
    writeAnalysisToSheet_(sheet, rowNumber, analysis);
    return responsePage_({
      ok: true, action: 'analyze', nonce: nonce, rowNumber: rowNumber,
      deleteToken: deleteToken, fileName: file.getName(),
      driveUrl: file.getUrl(), result: analysis,
      message: 'Analisis Gemini selesai. Foto dan hasil nutrisi sudah disimpan.'
    });
  } catch (err) {
    console.error('Hitung Kalori AI error: ' + (err && err.stack ? err.stack : err));
    if (file && rowNumber) {
      try {
        const sheet = SpreadsheetApp.openById(CONFIG.getProperty('SPREADSHEET_ID')).getSheetByName('Riwayat');
        sheet.getRange(rowNumber, 5).setValue('Foto tersimpan - analisis gagal');
        sheet.getRange(rowNumber, 11).setValue(String(err.message || err).slice(0, 1000));
      } catch (sheetError) {
        console.error('Gagal mencatat error ke Sheets: ' + sheetError);
      }
      return responsePage_({
        ok: false, action: 'analyze', nonce: nonce, rowNumber: rowNumber,
        deleteToken: deleteToken, fileName: file.getName(), driveUrl: file.getUrl(),
        message: 'Foto berhasil disimpan, tetapi analisis Gemini gagal: ' + friendlyError_(err)
      });
    }
    return responsePage_({
      ok: false, action: p.action || 'analyze', nonce: nonce,
      message: friendlyError_(err)
    });
  }
}

function analyzeWithGemini_(base64Data, mimeType, userNote) {
  const apiKey = CONFIG.getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Kunci Gemini belum dipasang. Tambahkan GEMINI_API_KEY di Properti skrip.');
  const model = CONFIG.getProperty('GEMINI_MODEL') || GEMINI_MODEL;
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';
  const prompt = [
    'Anda adalah asisten ahli gizi yang menganalisis foto makanan/minuman.',
    'Identifikasi semua makanan dan minuman yang tampak. Perkirakan ukuran porsi berdasarkan tampilan foto; jangan mengarang bahan yang tidak terlihat.',
    'Gunakan satuan gram/ml untuk porsi jika masuk akal. Estimasikan kalori, protein, karbohidrat, lemak, dan serat setiap item dan total.',
    'Perhatikan kemungkinan minyak, gula, santan, saus, kulit, tulang, dan bahan tersembunyi; jelaskan ketidakpastian.',
    'Jika foto bukan makanan/minuman atau terlalu buram, is_food harus false dan jelaskan pada notes.',
    'Balas HANYA JSON valid tanpa markdown dengan struktur: ' +
      '{"is_food":true,"items":[{"name":"nama","portion":"porsi","calories_kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"assumption":"asumsi"}],"total":{"calories_kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0},"confidence":"rendah|sedang|tinggi","notes":["catatan"],"follow_up_question":"pertanyaan atau kosong"}.',
    'Catatan pengguna: ' + (userNote || 'Tidak ada catatan tambahan.')
  ].join('\n');
  const payload = {
    contents: [{ role: 'user', parts: [
      { text: prompt },
      { inlineData: { mimeType: mimeType, data: base64Data } }
    ]}],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1400, responseMimeType: 'application/json' }
  };
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post', contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const bodyText = response.getContentText();
  let body;
  try { body = JSON.parse(bodyText); }
  catch (parseError) { throw new Error('Balasan Gemini tidak dapat dibaca (HTTP ' + status + ').'); }
  if (status < 200 || status >= 300) {
    const apiMessage = body && body.error && body.error.message ? body.error.message : bodyText;
    throw new Error('Gemini API HTTP ' + status + ': ' + String(apiMessage).slice(0, 700));
  }
  const parts = body && body.candidates && body.candidates[0] &&
    body.candidates[0].content && body.candidates[0].content.parts;
  const text = parts ? parts.map(function(part) { return part.text || ''; }).join('\n') : '';
  if (!text) throw new Error('Gemini tidak mengembalikan hasil teks. Coba foto lain.');
  return normalizeAnalysis_(parseGeminiJson_(text));
}

function parseGeminiJson_(text) {
  let cleaned = String(text).trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/i, '');
  try { return JSON.parse(cleaned); }
  catch (firstError) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Format hasil Gemini bukan JSON yang valid.');
  }
}

function normalizeAnalysis_(data) {
  const numberOrZero = function(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
  };
  const items = Array.isArray(data.items) ? data.items.slice(0, 15).map(function(item) {
    return {
      name: String(item.name || 'Makanan').slice(0, 120),
      portion: String(item.portion || 'Porsi perkiraan').slice(0, 120),
      calories_kcal: numberOrZero(item.calories_kcal),
      protein_g: numberOrZero(item.protein_g),
      carbs_g: numberOrZero(item.carbs_g),
      fat_g: numberOrZero(item.fat_g),
      fiber_g: numberOrZero(item.fiber_g),
      assumption: String(item.assumption || '').slice(0, 300)
    };
  }) : [];
  const total = data.total || {};
  return {
    is_food: Boolean(data.is_food), items: items,
    total: {
      calories_kcal: numberOrZero(total.calories_kcal),
      protein_g: numberOrZero(total.protein_g),
      carbs_g: numberOrZero(total.carbs_g),
      fat_g: numberOrZero(total.fat_g),
      fiber_g: numberOrZero(total.fiber_g)
    },
    confidence: ['rendah', 'sedang', 'tinggi'].indexOf(String(data.confidence || '').toLowerCase()) >= 0
      ? String(data.confidence).toLowerCase() : 'sedang',
    notes: Array.isArray(data.notes) ? data.notes.slice(0, 8).map(function(note) {
      return String(note).slice(0, 300);
    }) : [],
    follow_up_question: String(data.follow_up_question || '').slice(0, 300)
  };
}

function writeAnalysisToSheet_(sheet, rowNumber, result) {
  const total = result.total || {};
  const status = result.is_food ? 'Selesai - Gemini' : 'Foto bukan makanan / tidak dikenali';
  const notes = (result.notes || []).join(' | ') +
    (result.follow_up_question ? ' | Pertanyaan: ' + result.follow_up_question : '') +
    ' | Keyakinan: ' + (result.confidence || 'sedang');
  sheet.getRange(rowNumber, 5, 1, 7).setValues([[
    status, total.calories_kcal || 0, total.protein_g || 0, total.carbs_g || 0,
    total.fat_g || 0, total.fiber_g || 0, notes.slice(0, 2000)
  ]]);
}


/**
 * Tambahkan token hapus yang sulit ditebak untuk setiap baris.
 * Kolom L disembunyikan dari tampilan spreadsheet.
 */
function ensureDeleteTokens_(sheet) {
  if (sheet.getMaxColumns() < 12) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 12 - sheet.getMaxColumns());
  }
  sheet.getRange(1, 12).setValue('Token hapus');
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const range = sheet.getRange(2, 12, lastRow - 1, 1);
    const tokens = range.getValues();
    let changed = false;
    for (let i = 0; i < tokens.length; i++) {
      if (!tokens[i][0]) {
        tokens[i][0] = Utilities.getUuid();
        changed = true;
      }
    }
    if (changed) range.setValues(tokens);
  }
  sheet.hideColumns(12);
}

/**
 * Hapus satu record berdasarkan token rahasia, bukan nomor baris saja.
 * File Drive dipindahkan ke Sampah, lalu baris Sheets dihapus.
 */
function deleteRecord_(token, nonce) {
  const deleteToken = String(token || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deleteToken)) {
    throw new Error('Kode penghapusan tidak valid. Muat ulang hasil atau analisis foto kembali.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('Spreadsheet belum dikonfigurasi.');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat');
    if (!sheet) throw new Error('Sheet Riwayat tidak ditemukan.');

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('Riwayat foto tidak ditemukan atau sudah dihapus.');

    const tokenValues = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
    let matchingRow = -1;
    for (let i = 0; i < tokenValues.length; i++) {
      if (String(tokenValues[i][0]) === deleteToken) {
        matchingRow = i + 2;
        break;
      }
    }
    if (matchingRow < 2) throw new Error('Foto atau hasil ini sudah dihapus, atau kode penghapusannya tidak cocok.');

    const driveUrl = String(sheet.getRange(matchingRow, 3).getValue() || '');
    const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      DriveApp.getFileById(match[1]).setTrashed(true);
    }
    sheet.deleteRow(matchingRow);

    return responsePage_({
      ok: true, action: 'deleteRecord', nonce: nonce,
      deleteToken: deleteToken,
      message: 'Foto dipindahkan ke Sampah Google Drive dan catatannya dihapus dari Google Sheets.'
    });
  } finally {
    lock.releaseLock();
  }
}

function sanitizeFileName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'foto-makanan';
}

function friendlyError_(err) {
  const message = String(err && err.message ? err.message : err);
  if (/API_KEY_INVALID|API key not valid|invalid api key/i.test(message)) {
    return 'Kunci Gemini tidak valid. Periksa GEMINI_API_KEY di Properti skrip.';
  }
  if (/quota|rate limit|RESOURCE_EXHAUSTED|429/i.test(message)) {
    return 'Kuota gratis Gemini sedang habis atau batas permintaan tercapai. Coba lagi nanti atau periksa kuota AI Studio.';
  }
  if (/PERMISSION_DENIED|403/i.test(message)) {
    return 'Akses Gemini ditolak. Periksa project dan status API key di Google AI Studio.';
  }
  if (/NOT_FOUND|404|not found/i.test(message)) {
    return 'Model Gemini tidak tersedia untuk project/key ini. Periksa nama model atau buat key baru di AI Studio.';
  }
  return message.slice(0, 900);
}

function responsePage_(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>(function(){var message=Object.assign({type:"hka-gemini-result"}, ' + json + ');' +
    'try { window.top.postMessage(message, "*"); } catch(e) {}' +
    'try { window.parent.postMessage(message, "*"); } catch(e) {}' +
    '})();</script><p>Proses selesai. Anda dapat kembali ke tab aplikasi.</p></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}