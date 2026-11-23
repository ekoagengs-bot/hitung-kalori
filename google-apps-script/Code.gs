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
    sheet.appendRow(['Waktu unggah','Nama file','Link foto Google Drive','Catatan','Status analisis','Kalori (kkal)','Protein (g)','Karbohidrat (g)','Lemak (g)','Serat (g)','Catatan hasil']);
    spreadsheetId = ss.getId();
    CONFIG.setProperty('SPREADSHEET_ID', spreadsheetId);
  }
  return {folderId, spreadsheetId};
}

function doGet() {
  return ContentService.createTextOutput('Hitung Kalori AI storage endpoint aktif.');
}

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const nonce = String(p.nonce || '');
  try {
    if (!p.photoData || !p.fileName) throw new Error('Foto atau nama file tidak ditemukan.');
    if (String(p.photoData).length > 5600000) throw new Error('Ukuran foto terlalu besar. Maksimal sekitar 4 MB.');
    const match = String(p.photoData).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
    if (!match) throw new Error('Format foto harus JPG, PNG, atau WEBP.');
    const bytes = Utilities.base64Decode(match[2]);
    const blob = Utilities.newBlob(bytes, match[1], safeName(p.fileName));
    const folderId = CONFIG.getProperty('DRIVE_FOLDER_ID');
    const spreadsheetId = CONFIG.getProperty('SPREADSHEET_ID');
    if (!folderId || !spreadsheetId) throw new Error('Setup belum dijalankan. Jalankan fungsi setup terlebih dahulu.');
    const file = DriveApp.getFolderById(folderId).createFile(blob);
    const url = file.getUrl();
    SpreadsheetApp.openById(spreadsheetId).getSheetByName('Riwayat')
      .appendRow([new Date(), file.getName(), url, String(p.note || ''), 'Menunggu analisis ChatGPT', '', '', '', '', '', '']);
    return page({ok:true,nonce,url,fileName:file.getName(),message:'Foto berhasil disimpan ke Google Drive dan dicatat di Google Sheets.'});
  } catch (err) {
    return page({ok:false,nonce,message:err.message || 'Gagal menyimpan foto.'});
  }
}

function safeName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').slice(0,120) || 'foto-makanan';
}

function page(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><script>parent.postMessage(Object.assign({type:"hka-upload-result"}, '+json+'), "*");</script><p>Permintaan selesai. Anda dapat menutup tab ini.</p></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
