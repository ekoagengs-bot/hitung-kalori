const CONFIG = PropertiesService.getScriptProperties();

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
      'Waktu unggah', 'Nama file', 'Link foto Google Drive', 'Catatan',
      'Status analisis', 'Kalori (kkal)', 'Protein (g)',
      'Karbohidrat (g)', 'Lemak (g)', 'Serat (g)', 'Catatan hasil'
    ]);
    spreadsheetId = ss.getId();
    CONFIG.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  Logger.log('Folder Drive: https://drive.google.com/drive/folders/' + folderId);
  Logger.log('Spreadsheet: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
  return { folderId, spreadsheetId };
}

function doGet() {
  return ContentService.createTextOutput('Hitung Kalori AI storage endpoint aktif.');
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const nonce = String(p.nonce || '');

  try {
    if (p.action === 'saveResult') {
      return saveResult(p, nonce);
    }

    if (!p.photoData || !p.fileName) {
      throw new Error('Foto atau nama file tidak ditemukan.');
    }
    if (String(p.photoData).length > 5600000) {
      throw new Error('Ukuran foto terlalu besar. Maksimal sekitar 4 MB.');
    }

    const match = String(p.photoData).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
    if (!match) throw new Error('Format foto harus JPG, PNG, atau WEBP.');

    const folderId = CONFIG.getProperty('DRIVE_FOLDER_ID');
    const spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
    if (!folderId || !spreadsheetId) {
      throw new Error('Setup belum dijalankan. Jalankan fungsi setup terlebih dahulu.');
    }

    const bytes = Utilities.base64Decode(match[2]);
    const blob = Utilities.newBlob(bytes, match[1], safeName(p.fileName));
    const file = DriveApp.getFolderById(folderId).createFile(blob);
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat');
    sheet.appendRow([
      new Date(), file.getName(), file.getUrl(), String(p.note || ''),
      'Menunggu analisis ChatGPT', '', '', '', '', '', ''
    ]);
    const rowNumber = sheet.getLastRow();

    return page({
      ok: true, action: 'upload', nonce, rowNumber,
      url: file.getUrl(), fileName: file.getName(),
      message: 'Foto berhasil disimpan ke Google Drive dan dicatat di Google Sheets.'
    });
  } catch (err) {
    return page({
      ok: false, action: p.action || 'upload', nonce,
      message: err.message || 'Permintaan gagal.'
    });
  }
}

function saveResult(p, nonce) {
  const spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet belum dibuat. Jalankan setup terlebih dahulu.');

  const rowNumber = Number(p.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error('Nomor baris tidak valid. Unggah foto kembali.');
  }

  const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  const values = keys.map(function(key) {
    const value = Number(p[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error('Nilai ' + key + ' harus berupa angka nol atau lebih.');
    return value;
  });
  const notes = String(p.resultNotes || '').slice(0, 2000);
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat');
  if (rowNumber > sheet.getLastRow()) throw new Error('Baris data tidak ditemukan.');

  sheet.getRange(rowNumber, 5, 1, 7).setValues([[
    'Sudah dianalisis ChatGPT',
    values[0], values[1], values[2], values[3], values[4], notes
  ]]);

  return page({
    ok: true, action: 'saveResult', nonce,
    message: 'Hasil analisis berhasil disimpan ke Google Sheets.'
  });
}

function safeName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'foto-makanan';
}

function page(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>parent.postMessage(Object.assign({type:"hka-upload-result"}, ' +
    json + '), "*");</script><p>Proses selesai. Anda dapat menutup tab ini.</p></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
