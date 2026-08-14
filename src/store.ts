import { Product, Bill, MarginSetting } from './types';
import { syncToCloud } from './firebase';

// Cloud is the real storage.
// localStorage = session cache only. Wiped on logout.
// Every data write instantly uploads to Firestore.

const KEYS = {
  inventory: 'retail_panel_inventory',
  template: 'retail_panel_template',
  bills: 'retail_panel_bills',
  billCounter: 'retail_panel_bill_counter',
  darkMode: 'retail_panel_dark',
  margin: 'retail_panel_margin',
  storeName: 'retail_panel_store_name',
  storePhone: 'retail_panel_store_phone',
  storeAddress: 'retail_panel_store_address',
  storeGstin: 'retail_panel_store_gstin',
  currency: 'retail_panel_currency',
  billPrefix: 'retail_panel_bill_prefix',
  qrSize: 'retail_panel_qr_size',
};

// ---- Inventory ----
export function getInventory(): Product[] {
  try { const d = localStorage.getItem(KEYS.inventory); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
export function setInventory(products: Product[]) {
  localStorage.setItem(KEYS.inventory, JSON.stringify(products));
  syncToCloud();
}

// ---- Template ----
export function getTemplate(): string {
  return localStorage.getItem(KEYS.template) || DEFAULT_TEMPLATE;
}
export function setTemplate(t: string) {
  localStorage.setItem(KEYS.template, t);
  syncToCloud();
}

// ---- Bills ----
export function getBills(): Bill[] {
  try { const d = localStorage.getItem(KEYS.bills); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
export function saveBill(bill: Bill) {
  const b = getBills(); b.unshift(bill);
  localStorage.setItem(KEYS.bills, JSON.stringify(b));
  syncToCloud();
}
export function saveBillsBulk(bills: Bill[]) {
  localStorage.setItem(KEYS.bills, JSON.stringify(bills));
  syncToCloud();
}

// ---- Bill Counter (no individual sync — synced when saveBill follows) ----
export function getNextBillNo(): string {
  const c = parseInt(localStorage.getItem(KEYS.billCounter) || '0') + 1;
  localStorage.setItem(KEYS.billCounter, c.toString());
  const prefix = getBillPrefix();
  return prefix + c.toString().padStart(4, '0');
}

// ---- Export / Import (file backup) ----
export function exportData(): string {
  return JSON.stringify({
    inventory: getInventory(),
    template: getTemplate(),
    bills: getBills(),
    billCounter: localStorage.getItem(KEYS.billCounter) || '0',
  });
}
export function importData(s: string) {
  try {
    const d = JSON.parse(s);
    if (d.inventory) localStorage.setItem(KEYS.inventory, JSON.stringify(d.inventory));
    if (d.template) localStorage.setItem(KEYS.template, d.template);
    if (d.bills) localStorage.setItem(KEYS.bills, JSON.stringify(d.bills));
    if (d.billCounter) localStorage.setItem(KEYS.billCounter, d.billCounter);
    syncToCloud();
    return true;
  } catch { return false; }
}

// ---- Invoice Spacing (0–20px) ----
export function getMargin(): MarginSetting {
  const v = parseInt(localStorage.getItem(KEYS.margin) || '0');
  return Math.max(0, Math.min(20, isNaN(v) ? 0 : v));
}
export function setMargin(m: MarginSetting) {
  const value = Math.max(0, Math.min(20, Number(m) || 0));
  localStorage.setItem(KEYS.margin, String(value));
  syncToCloud();
}

// ---- Store Info ----
export function getStoreName(): string { return localStorage.getItem(KEYS.storeName) || ''; }
export function setStoreName(v: string) { localStorage.setItem(KEYS.storeName, v); syncToCloud(); }

export function getStorePhone(): string { return localStorage.getItem(KEYS.storePhone) || ''; }
export function setStorePhone(v: string) { localStorage.setItem(KEYS.storePhone, v); syncToCloud(); }

export function getStoreAddress(): string { return localStorage.getItem(KEYS.storeAddress) || ''; }
export function setStoreAddress(v: string) { localStorage.setItem(KEYS.storeAddress, v); syncToCloud(); }

export function getStoreGstin(): string { return localStorage.getItem(KEYS.storeGstin) || ''; }
export function setStoreGstin(v: string) { localStorage.setItem(KEYS.storeGstin, v); syncToCloud(); }

// Save editable settings in one action, then sync once
export function saveSettingsBatch(settings: {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeGstin: string;
  margin: MarginSetting;
  qrSize: number;
}) {
  localStorage.setItem(KEYS.storeName, settings.storeName);
  localStorage.setItem(KEYS.storePhone, settings.storePhone);
  localStorage.setItem(KEYS.storeAddress, settings.storeAddress);
  localStorage.setItem(KEYS.storeGstin, settings.storeGstin);
  localStorage.setItem(KEYS.margin, String(settings.margin));
  localStorage.setItem(KEYS.qrSize, Math.max(20, Math.min(100, settings.qrSize)).toString());
  syncToCloud();
}

export function getCurrency(): string { return localStorage.getItem(KEYS.currency) || '₹'; }
export function setCurrency(v: string) { localStorage.setItem(KEYS.currency, v); syncToCloud(); }

export function getBillPrefix(): string { return localStorage.getItem(KEYS.billPrefix) || ''; }
export function setBillPrefix(v: string) { localStorage.setItem(KEYS.billPrefix, v); syncToCloud(); }

export function getBillCounter(): number { return parseInt(localStorage.getItem(KEYS.billCounter) || '0'); }
export function setBillCounter(v: number) { localStorage.setItem(KEYS.billCounter, v.toString()); syncToCloud(); }

// ---- QR Size (20–100px) ----
export function getQrSize(): number {
  const v = parseInt(localStorage.getItem(KEYS.qrSize) || '80');
  return Math.max(20, Math.min(100, isNaN(v) ? 80 : v));
}
export function setQrSize(v: number) {
  localStorage.setItem(KEYS.qrSize, Math.max(20, Math.min(100, v)).toString());
}

// ---- Dark Mode (local only — not synced) ----
export function getDarkMode(): boolean {
  return localStorage.getItem(KEYS.darkMode) === '1';
}
export function setDarkMode(on: boolean) {
  localStorage.setItem(KEYS.darkMode, on ? '1' : '0');
}

// ---- Default Template ----
const DEFAULT_TEMPLATE = `<div style="font-family:'Courier New',Courier,monospace;width:48mm;margin:0 auto;padding:0;color:#000;font-size:10px;line-height:1.25;">
  <p style="text-align:center;font-size:14px;font-weight:700;margin:0;letter-spacing:0.8px;">{{STORE_NAME}}</p>
  <p style="text-align:center;font-size:9px;margin:1px 0 0;">{{STORE_ADDRESS}}</p>
  <p style="text-align:center;font-size:9px;margin:1px 0 0;">Ph: {{STORE_PHONE}}</p>
  <p style="text-align:center;font-size:8px;margin:1px 0 0;">GSTIN: {{STORE_GSTIN}}</p>

  <div style="border-top:1px dashed #000;height:0;margin:5px 0 4px;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <tr><td style="padding:1px 0;">Bill No:</td><td style="padding:1px 0;text-align:right;font-weight:700;">#{{BILL_NO}}</td></tr>
    <tr><td style="padding:1px 0;">Date:</td><td style="padding:1px 0;text-align:right;">{{DATE}}</td></tr>
    <tr><td style="padding:1px 0;">Time:</td><td style="padding:1px 0;text-align:right;">{{TIME}}</td></tr>
    <tr><td style="padding:1px 0;">Customer:</td><td style="padding:1px 0;text-align:right;white-space:nowrap;">{{CUSTOMER_NAME}}</td></tr>
  </table>

  <div style="border-top:1px dashed #000;height:0;margin:4px 0 3px;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <colgroup>
      <col style="width:52%;" />
      <col style="width:14%;" />
      <col style="width:17%;" />
      <col style="width:17%;" />
    </colgroup>
    <thead>
      <tr>
        <td style="font-weight:700;padding:0 0 1px 0;">ITEM</td>
        <td style="font-weight:700;text-align:right;padding:0 3px 1px 0;">QTY</td>
        <td style="font-weight:700;text-align:right;padding:0 4px 1px 0;">RATE</td>
        <td style="font-weight:700;text-align:right;padding:0 0 1px 4px;">AMT</td>
      </tr>
    </thead>
  </table>

  <div style="border-top:1px dashed #000;height:0;margin:1px 0 2px;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <colgroup>
      <col style="width:52%;" />
      <col style="width:14%;" />
      <col style="width:17%;" />
      <col style="width:17%;" />
    </colgroup>
    <tbody>
      {{ITEMS}}
    </tbody>
  </table>

  <div style="border-top:1px dashed #000;height:0;margin:4px 0 3px;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <tr><td style="padding:1px 0;">Items:</td><td style="padding:1px 0;text-align:right;">{{TOTAL_ITEMS}}</td></tr>
    <tr><td style="padding:1px 0;">Qty:</td><td style="padding:1px 0;text-align:right;">{{TOTAL_QTY}}</td></tr>
  </table>

  <div style="border-top:1px dashed #000;height:0;margin:4px 0 3px;"></div>

  <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <tr>
      <td style="font-size:12px;font-weight:700;padding:1px 0;">TOTAL</td>
      <td style="font-size:12px;font-weight:700;text-align:right;padding:1px 0;">Rs.{{TOTAL}}</td>
    </tr>
  </table>

  <div style="border-top:1px dashed #000;height:0;margin:4px 0 5px;"></div>

  {{BILL_BARCODE}}

  <p style="text-align:center;font-size:9px;margin:5px 0 0;">Thank you! Visit again.</p>
  <p style="text-align:center;font-size:8px;margin:1px 0 0;color:#666;">Prices incl. of taxes</p>
</div>`;
