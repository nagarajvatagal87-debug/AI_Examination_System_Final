const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../../config/Supabase');

const pdfBufferCache = new Map(); // submissionId -> Buffer
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function storePdf(submissionId, fileBuffer) {
  pdfBufferCache.set(submissionId, fileBuffer);

  const filePath = path.join(uploadsDir, `${submissionId}.pdf`);
  try {
    fs.writeFileSync(filePath, fileBuffer);
  } catch (err) {
    console.warn('Failed to write PDF to local disk:', err.message);
  }
}

async function getPdfBuffer(submissionId, scannedFilePath) {
  // 1. Check in-memory buffer cache
  if (pdfBufferCache.has(submissionId)) {
    return pdfBufferCache.get(submissionId);
  }

  // 2. Check local disk fallback
  const localFile = path.join(uploadsDir, `${submissionId}.pdf`);
  if (fs.existsSync(localFile)) {
    try {
      const buf = fs.readFileSync(localFile);
      pdfBufferCache.set(submissionId, buf);
      return buf;
    } catch (e) {}
  }

  // 3. Try downloading from Supabase storage
  if (scannedFilePath) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET || 'exam-files')
        .download(scannedFilePath);

      if (data && !error) {
        const arrayBuf = await data.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        pdfBufferCache.set(submissionId, buf);
        return buf;
      }
    } catch (e) {}
  }

  return null;
}

module.exports = {
  storePdf,
  getPdfBuffer,
};
