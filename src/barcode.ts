import QRCode from 'qrcode';

/**
 * Generate QR code value in DDMMYYYYBILLNO format
 */
function formatQrValue(billNo: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  return `${dd}${mm}${yyyy}${billNo}`;
}

/**
 * Generate a QR code as base64 PNG data URL.
 */
export async function generateQrCode(billNo: string): Promise<string> {
  try {
    const value = formatQrValue(billNo);
    const url = await QRCode.toDataURL(value, {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    return url;
  } catch {
    return '';
  }
}

/**
 * Returns centered QR code HTML for embedding in invoice.
 */
export async function getQrHtml(billNo: string): Promise<string> {
  const src = await generateQrCode(billNo);
  if (!src) return '';
  const value = formatQrValue(billNo);
  return `<div style="text-align:center;margin:10px 0 4px 0;"><img src="${src}" style="display:block;margin:0 auto;width:100px;height:100px;" alt="QR" /><p style="font-size:8px;color:#888;margin:3px 0 0 0;font-family:monospace;">${value}</p></div>`;
}
