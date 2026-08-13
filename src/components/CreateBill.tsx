import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, X, ShoppingCart, ImageDown, FileDown, Loader2 } from 'lucide-react';
import { Product, BillItem } from '../types';
import { getInventory, getTemplate, getNextBillNo, saveBill, getMargin } from '../store';
import { getQrHtml } from '../barcode';
import html2canvas from 'html2canvas';
import Toast from './Toast';

export default function CreateBill() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<BillItem[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success'|'error'|'info'>('success');
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inv = useRef<Product[]>([]);

  useEffect(() => { inv.current = getInventory(); }, []);

  const search = useCallback((v: string) => {
    setQ(v);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    const l = v.toLowerCase();
    setResults(inv.current.filter(p => p.item.toLowerCase().includes(l) || p.ean.includes(l)).slice(0, 8));
    setOpen(true);
  }, []);

  const add = useCallback((p: Product) => {
    setCart(c => {
      const e = c.find(i => i.product.id === p.id);
      if (e) return c.map(i => i.product.id === p.id ? {...i, qty: i.qty+1} : i);
      return [...c, {product: p, qty: 1}];
    });
    setQ(''); setOpen(false);
  }, []);

  const qty = useCallback((id: string, d: number) => {
    setCart(c => c.map(i => i.product.id === id ? {...i, qty: Math.max(0, i.qty+d)} : i).filter(i => i.qty > 0));
  }, []);

  const rm = useCallback((id: string) => { setCart(c => c.filter(i => i.product.id !== id)); }, []);

  const total = cart.reduce((s, i) => s + i.product.rate * i.qty, 0);
  const ti = cart.length;
  const tq = cart.reduce((s, i) => s + i.qty, 0);

  const notify = (m: string, t: 'success'|'error'|'info' = 'success') => { setToast(m); setTT(t); setTimeout(() => setToast(''), 2500); };

  // Build receipt rows for thermal template:
  // line 1 => serial + item name
  // line 2 => qty, rate, amount aligned in fixed columns
  // User template should place {{ITEMS}} inside <tbody>
  const buildItemsHtml = () => {
    return cart.map((item) =>
      `<tr>
        <td colspan="4" style="padding:5px 0 1px 0;font-size:10px;line-height:1.25;vertical-align:top;word-break:break-word;">${item.product.item}</td>
      </tr>
      <tr>
        <td style="padding:0 0 5px 0;font-size:10px;"></td>
        <td style="padding:0 0 5px 0;font-size:10px;text-align:center;">${item.qty}</td>
        <td style="padding:0 0 5px 0;font-size:10px;text-align:right;">${item.product.rate.toFixed(0)}</td>
        <td style="padding:0 0 5px 0;font-size:10px;text-align:right;font-weight:700;">${(item.product.rate * item.qty).toFixed(0)}</td>
      </tr>`
    ).join('');
  };

  // Build invoice HTML — pure function, no side effects
  const buildInvoiceHtml = async () => {
    const tpl = getTemplate();
    const bn = getNextBillNo();
    const now = new Date();
    const date = now.toLocaleDateString('en-IN');
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const custName = name || 'Walk-in Customer';

    const qrHtml = await getQrHtml(bn);

    const html = tpl
      .replace(/\{\{BILL_NO\}\}/g, bn)
      .replace(/\{\{DATE\}\}/g, date)
      .replace(/\{\{TIME\}\}/g, time)
      .replace(/\{\{CUSTOMER_NAME\}\}/g, custName)
      .replace(/\{\{ITEMS\}\}/g, buildItemsHtml())
      .replace(/\{\{TOTAL\}\}/g, total.toFixed(0))
      .replace(/\{\{TOTAL_ITEMS\}\}/g, ti.toString())
      .replace(/\{\{TOTAL_QTY\}\}/g, tq.toString())
      .replace(/\{\{BILL_BARCODE\}\}/g, qrHtml);

    return { html, bn, date, time, custName };
  };

  // Save bill to store (called once after successful export)
  const persistBill = (bn: string, date: string, time: string, custName: string) => {
    saveBill({
      id: crypto.randomUUID(), billNo: bn, date, time,
      customerName: custName, items: cart, total
    });
    setCart([]); setName('');
  };

  // Download as PNG — render template exactly as-is, no added margin/padding
  const downloadImage = async () => {
    if (!cart.length) { notify('Add items first', 'error'); return; }
    setExporting(true);

    const { html, bn, date, time, custName } = await buildInvoiceHtml();

    // Get margin setting
    const margin = getMargin();
    const pad = margin === 'none' ? '0' : margin === 'max' ? '16mm 12mm' : '8mm 6mm';

    const container = document.createElement('div');
    // display:inline-block so container shrinks to fit content (image = exact bill size)
    container.style.cssText = `position:fixed;left:-9999px;top:0;display:inline-block;background:#fff;padding:${pad};`;
    container.innerHTML = html;

    // When "none" — force 0 padding/margin on ALL elements inside so truly edge-to-edge
    if (margin === 'none') {
      container.querySelectorAll(':scope > *').forEach(el => {
        const h = el as HTMLElement;
        h.style.padding = '0';
        h.style.margin = '0';
        h.style.maxWidth = 'none';
      });
    }

    document.body.appendChild(container);

    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(container, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `invoice_${bn}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      persistBill(bn, date, time, custName);
      notify(`Invoice #${bn} saved as image`, 'success');
    } catch {
      notify('Failed to generate image', 'error');
    } finally {
      document.body.removeChild(container);
      setExporting(false);
    }
  };

  // Download as HTML — proper standalone document
  const downloadHtml = async () => {
    if (!cart.length) { notify('Add items first', 'error'); return; }
    const { html, bn, date, time, custName } = await buildInvoiceHtml();
    const margin = getMargin();
    const pad = margin === 'none' ? '0' : margin === 'max' ? '16mm 12mm' : '8mm 6mm';
    const stripCss = margin === 'none' ? 'body>*{padding:0!important;margin:0!important;max-width:none!important;}' : '';
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${bn}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    ${stripCss}
  </style>
</head>
<body style="margin:0;padding:${pad};">
${html}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoice_${bn}.html`; a.click();
    URL.revokeObjectURL(url);
    persistBill(bn, date, time, custName);
    notify(`Invoice #${bn} generated`, 'success');
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div ref={ref} className="relative">
        <div className="flex items-center bg-[#e5e5ea] dark:bg-[#1c1c1e] rounded-[10px] px-3 py-[9px]">
          <Search size={16} className="text-[#8e8e93] mr-2 flex-shrink-0" />
          <input type="text" placeholder="Search products by name or barcode"
            value={q} onChange={e => search(e.target.value)} onFocus={() => q && results.length && setOpen(true)}
            className="bg-transparent text-[17px] outline-none w-full text-black dark:text-white placeholder:text-[#8e8e93]" />
          {q && <button onClick={() => { setQ(''); setOpen(false); }} className="w-[18px] h-[18px] rounded-full bg-[#8e8e93] flex items-center justify-center ml-1"><X size={10} className="text-white" /></button>}
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#2c2c2e] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] max-h-[280px] overflow-auto z-50">
            {results.map((p, i) => (
              <button key={p.id} onClick={() => add(p)}
                className="w-full text-left flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] transition-colors"
                style={i < results.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] text-black dark:text-white truncate">{p.item}</p>
                  <p className="text-[13px] text-[#8e8e93] font-mono">{p.ean}</p>
                </div>
                <span className="text-[17px] font-semibold text-black dark:text-white ml-3 tabular-nums">₹{p.rate}</span>
                <Plus size={18} className="text-[#007AFF] ml-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Customer</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px]">
          <input type="text" placeholder="Walk-in Customer" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] bg-transparent outline-none rounded-[10px]" />
        </div>
      </div>

      {/* Cart */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Cart Items</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart size={32} className="text-[#c7c7cc] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[17px] text-[#8e8e93]">No items added</p>
              <p className="text-[13px] text-[#c7c7cc] mt-1">Search for products above</p>
            </div>
          ) : (
            <>
              {/* Column Header */}
              <div className="flex items-center px-4 py-[8px] bg-[#f8f8f8] dark:bg-[#2c2c2e]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="flex-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">Item</span>
                <span className="w-[100px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-center">Qty</span>
                <span className="w-[52px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Rate</span>
                <span className="w-[60px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Amt</span>
                <span className="w-[32px]"></span>
              </div>
              {/* Rows */}
              {cart.map((item, i) => (
                <div key={item.product.id} className="flex items-center px-4 py-[9px]"
                  style={i < cart.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
                  {/* Item name */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] text-black dark:text-white truncate leading-tight">{item.product.item}</p>
                  </div>
                  {/* Qty stepper */}
                  <div className="w-[100px] flex items-center justify-center">
                    <div className="flex items-center bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-[7px]">
                      <button onClick={() => qty(item.product.id, -1)} className="w-[28px] h-[28px] flex items-center justify-center text-[#007AFF] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] rounded-l-[7px]">
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="text-[15px] font-semibold text-black dark:text-white w-[28px] text-center tabular-nums">{item.qty}</span>
                      <button onClick={() => qty(item.product.id, 1)} className="w-[28px] h-[28px] flex items-center justify-center text-[#007AFF] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] rounded-r-[7px]">
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  {/* Rate */}
                  <span className="w-[52px] text-[14px] text-[#8e8e93] tabular-nums text-right">{item.product.rate}</span>
                  {/* Amount */}
                  <span className="w-[60px] text-[15px] font-semibold text-black dark:text-white tabular-nums text-right">{(item.product.rate * item.qty).toFixed(0)}</span>
                  {/* Delete */}
                  <div className="w-[32px] flex justify-end">
                    <button onClick={() => rm(item.product.id)} className="text-[#FF3B30] active:opacity-50 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Summary & Actions */}
      {cart.length > 0 && (
        <>
          <div>
            <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Summary</p>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-[11px]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="text-[17px] text-black dark:text-white">Items</span>
                <span className="text-[17px] text-[#8e8e93] tabular-nums">{ti}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-[11px]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="text-[17px] text-black dark:text-white">Quantity</span>
                <span className="text-[17px] text-[#8e8e93] tabular-nums">{tq}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-[11px]">
                <span className="text-[17px] font-semibold text-black dark:text-white">Total</span>
                <span className="text-[20px] font-bold text-black dark:text-white tabular-nums">₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-[10px]">
            <button onClick={downloadImage} disabled={exporting}
              className="w-full bg-[#007AFF] text-white text-[17px] font-semibold rounded-[10px] py-[14px] flex items-center justify-center gap-2 active:bg-[#0066d6] disabled:opacity-60">
              {exporting ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><ImageDown size={18} /> Download as Image</>}
            </button>
            <button onClick={downloadHtml}
              className="w-full text-[#007AFF] text-[17px] font-medium rounded-[10px] py-[14px] bg-white dark:bg-[#1c1c1e] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e] flex items-center justify-center gap-2">
              <FileDown size={18} /> Download as HTML
            </button>
            <button onClick={() => { setCart([]); setName(''); }}
              className="w-full text-[#FF3B30] text-[17px] font-medium rounded-[10px] py-[14px] bg-white dark:bg-[#1c1c1e] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e]">
              Clear All Items
            </button>
          </div>
        </>
      )}

      <Toast message={toast} type={tt} />
    </div>
  );
}
