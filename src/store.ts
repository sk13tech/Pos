import { Product, Bill, MarginSetting, TemplateSlot } from './types';
import { syncToCloud } from './firebase';

// Cloud is the real storage.
// localStorage = session cache only. Wiped on logout.
// Every data write instantly uploads to Firestore.

const KEYS = {
  inventory: 'retail_panel_inventory',
  template: 'retail_panel_template',
  templates: 'retail_panel_templates',
  activeTemplateId: 'retail_panel_active_template_id',
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

// ---- Templates (3 slots + active/default) ----
const DEFAULT_TEMPLATE_2 = `<div style="font-family:Arial,sans-serif;width:58mm;margin:0 auto;padding:0;color:#111;font-size:10px;line-height:1.35;">
  <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:4px;">
    <div style="font-size:13px;font-weight:700;">{{STORE_NAME}}</div>
    <div style="font-size:9px;">{{STORE_ADDRESS}}</div>
    <div style="font-size:9px;">Phone: {{STORE_PHONE}}</div>
    <div style="font-size:8px;">GSTIN: {{STORE_GSTIN}}</div>
  </div>
  <table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:4px;">
    <tr><td>Bill:</td><td style="text-align:right;font-weight:700;">#{{BILL_NO}}</td></tr>
    <tr><td>Date:</td><td style="text-align:right;">{{DATE}}</td></tr>
    <tr><td>Time:</td><td style="text-align:right;">{{TIME}}</td></tr>
    <tr><td>Customer:</td><td style="text-align:right;white-space:nowrap;">{{CUSTOMER_NAME}}</td></tr>
  </table>
  <table style="width:100%;font-size:10px;border-collapse:collapse;">
    <thead><tr style="border-bottom:1px solid #000;"><th style="text-align:left;padding-bottom:2px;">ITEM</th><th style="text-align:right;padding-bottom:2px;">QTY</th><th style="text-align:right;padding-bottom:2px;">RATE</th><th style="text-align:right;padding-bottom:2px;">AMT</th></tr></thead>
    <tbody>{{ITEMS}}</tbody>
  </table>
  <div style="border-top:1px solid #000;margin:4px 0;"></div>
  <table style="width:100%;font-size:10px;border-collapse:collapse;">
    <tr><td>Items</td><td style="text-align:right;">{{TOTAL_ITEMS}}</td></tr>
    <tr><td>Qty</td><td style="text-align:right;">{{TOTAL_QTY}}</td></tr>
    <tr><td style="font-weight:700;font-size:12px;padding-top:3px;">TOTAL</td><td style="text-align:right;font-weight:700;font-size:12px;padding-top:3px;">Rs.{{TOTAL}}</td></tr>
  </table>
  {{BILL_BARCODE}}
</div>`;

const DEFAULT_TEMPLATE_3 = `<div style="font-family:'Courier New',monospace;width:48mm;margin:0 auto;padding:0;color:#000;font-size:10px;line-height:1.2;">
  <div style="text-align:center;">
    <div style="font-size:13px;font-weight:700;">{{STORE_NAME}}</div>
    <div style="font-size:8px;">{{STORE_PHONE}}</div>
  </div>
  <div style="border-top:1px dashed #000;margin:4px 0;"></div>
  <div style="font-size:9px;">Bill #{{BILL_NO}}</div>
  <div style="font-size:9px;">{{DATE}} {{TIME}}</div>
  <div style="font-size:9px;margin-bottom:4px;white-space:nowrap;">{{CUSTOMER_NAME}}</div>
  <div style="border-top:1px dashed #000;margin:4px 0;"></div>
  <table style="width:100%;font-size:9px;border-collapse:collapse;">
    <thead><tr><th style="text-align:left;">ITEM</th><th style="text-align:right;">QTY</th><th style="text-align:right;">AMT</th></tr></thead>
    <tbody>{{ITEMS}}</tbody>
  </table>
  <div style="border-top:1px dashed #000;margin:4px 0;"></div>
  <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;"><span>TOTAL</span><span>Rs.{{TOTAL}}</span></div>
  {{BILL_BARCODE}}
</div>`;

function getDefaultTemplates(): TemplateSlot[] {
  return [
    { id: 'template-1', name: 'Thermal', html: DEFAULT_TEMPLATE },
    { id: 'template-2', name: 'Clean', html: DEFAULT_TEMPLATE_2 },
    { id: 'template-3', name: 'Compact', html: DEFAULT_TEMPLATE_3 },
  ];
}

export function getTemplates(): TemplateSlot[] {
  const raw = localStorage.getItem(KEYS.templates);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as TemplateSlot[];
      if (Array.isArray(parsed) && parsed.length === 3) return parsed;
    } catch {}
  }
  // migrate old single template if present
  const oldTemplate = localStorage.getItem(KEYS.template);
  const defaults = getDefaultTemplates();
  if (oldTemplate) defaults[0].html = oldTemplate;
  localStorage.setItem(KEYS.templates, JSON.stringify(defaults));
  if (!localStorage.getItem(KEYS.activeTemplateId)) {
    localStorage.setItem(KEYS.activeTemplateId, defaults[0].id);
  }
  return defaults;
}

export function saveTemplates(templates: TemplateSlot[]) {
  localStorage.setItem(KEYS.templates, JSON.stringify(templates));
  syncToCloud();
}

export function getActiveTemplateId(): string {
  return localStorage.getItem(KEYS.activeTemplateId) || 'template-1';
}

export function setActiveTemplateId(id: string) {
  localStorage.setItem(KEYS.activeTemplateId, id);
  syncToCloud();
}

export function getTemplate(): string {
  const templates = getTemplates();
  const active = templates.find(t => t.id === getActiveTemplateId()) || templates[0];
  return active.html;
}

export function setTemplate(t: string) {
  const templates = getTemplates().map(template =>
    template.id === getActiveTemplateId() ? { ...template, html: t } : template
  );
  saveTemplates(templates);
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
export function deleteBill(id: string) {
  const next = getBills().filter((bill) => bill.id !== id);
  localStorage.setItem(KEYS.bills, JSON.stringify(next));
  syncToCloud();
}

// ---- Random 4-digit Invoice No (non-repeating) ----
export function getNextBillNo(): string {
  const used = new Set(getBills().map((b) => b.billNo));

  // 4-digit range: 1000–9999
  for (let i = 0; i < 10000; i++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!used.has(candidate)) {
      // store last generated value only for backup/reference
      localStorage.setItem(KEYS.billCounter, candidate);
      return candidate;
    }
  }

  // Fallback if all 4-digit numbers are exhausted
  const fallback = String(Date.now()).slice(-4);
  localStorage.setItem(KEYS.billCounter, fallback);
  return fallback;
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
  localStorage.setItem(KEYS.qrSize, Math.max(20, Math.min(200, settings.qrSize)).toString());
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
