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
  // No syncToCloud here — saveBill() always follows and will sync the counter too
  return c.toString().padStart(4, '0');
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

// ---- Margin ----
export function getMargin(): MarginSetting {
  return (localStorage.getItem(KEYS.margin) as MarginSetting) || 'default';
}
export function setMargin(m: MarginSetting) {
  localStorage.setItem(KEYS.margin, m);
  syncToCloud();
}

// ---- Dark Mode (local only — not synced) ----
export function getDarkMode(): boolean {
  return localStorage.getItem(KEYS.darkMode) === '1';
}
export function setDarkMode(on: boolean) {
  localStorage.setItem(KEYS.darkMode, on ? '1' : '0');
}

// ---- Default Template ----
const DEFAULT_TEMPLATE = `<div style="font-family: 'Courier New', Courier, monospace; width: 48mm; margin: 0 auto; padding: 4mm 0; color: #000; font-size: 11px; line-height: 1.4;">
  <div style="text-align: center; padding-bottom: 6px; border-bottom: 1px dashed #000;">
    <p style="font-size: 14px; font-weight: 700; margin: 0; letter-spacing: 1px;">RETAIL STORE</p>
    <p style="font-size: 9px; margin: 2px 0 0 0;">123 Market Street</p>
    <p style="font-size: 9px; margin: 0;">New Delhi - 110001</p>
    <p style="font-size: 9px; margin: 2px 0 0 0;">Ph: +91 98765 43210</p>
    <p style="font-size: 8px; margin: 2px 0 0 0;">GSTIN: 07AAACR1234A1Z5</p>
  </div>
  <div style="padding: 6px 0; border-bottom: 1px dashed #000; font-size: 10px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 1px 0;">Bill No:</td><td style="padding: 1px 0; text-align: right; font-weight: 700;">#{{BILL_NO}}</td></tr>
      <tr><td style="padding: 1px 0;">Date:</td><td style="padding: 1px 0; text-align: right;">{{DATE}}</td></tr>
      <tr><td style="padding: 1px 0;">Time:</td><td style="padding: 1px 0; text-align: right;">{{TIME}}</td></tr>
      <tr><td style="padding: 1px 0;">Customer:</td><td style="padding: 1px 0; text-align: right;">{{CUSTOMER_NAME}}</td></tr>
    </table>
  </div>
  <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; margin: 0;">
    <colgroup><col style="width: 46%;"><col style="width: 16%;"><col style="width: 18%;"><col style="width: 20%;"></colgroup>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="padding: 4px 0 5px 0; text-align: left; font-weight: 700; font-size: 9px;">ITEM</th>
        <th style="padding: 4px 0 5px 0; text-align: center; font-weight: 700; font-size: 9px;">QTY</th>
        <th style="padding: 4px 0 5px 0; text-align: right; font-weight: 700; font-size: 9px;">RATE</th>
        <th style="padding: 4px 0 5px 0; text-align: right; font-weight: 700; font-size: 9px;">AMT</th>
      </tr>
    </thead>
    <tbody>{{ITEMS}}</tbody>
  </table>
  <div style="border-top: 1px dashed #000; padding: 6px 0; border-bottom: 1px dashed #000;">
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <tr><td style="padding: 2px 0;">Items:</td><td style="padding: 2px 0; text-align: right;">{{TOTAL_ITEMS}}</td></tr>
      <tr><td style="padding: 2px 0;">Qty:</td><td style="padding: 2px 0; text-align: right;">{{TOTAL_QTY}}</td></tr>
      <tr><td style="padding: 4px 0; font-size: 13px; font-weight: 700;">TOTAL</td><td style="padding: 4px 0; font-size: 13px; font-weight: 700; text-align: right;">Rs.{{TOTAL}}</td></tr>
    </table>
  </div>
  {{BILL_BARCODE}}
  <div style="text-align: center; padding-top: 6px; font-size: 9px;">
    <p style="margin: 0;">Thank you! Visit again.</p>
    <p style="margin: 2px 0 0 0; font-size: 8px; color: #666;">Prices incl. of taxes</p>
  </div>
</div>`;
