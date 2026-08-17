import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, X, ShoppingCart, ImageDown, FileDown, Loader2, ScanLine } from 'lucide-react';
import { Product, BillItem } from '../types';
import {
  getInventory,
  getTemplate,
  getNextBillNo,
  saveBill,
  getStoreName,
  getStorePhone,
  getStoreAddress,
  getStoreGstin,
  getQrSize,
  getMargin,
} from '../store';
import { getQrHtml } from '../barcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Toast from './Toast';
import BarcodeScannerModal from './BarcodeScannerModal';
import AnimatedNumber from './AnimatedNumber';
import { useCartLock } from '../App';

export default function CreateBill() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<BillItem[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success' | 'error' | 'info'>('success');
  const [exporting, setExporting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inv = useRef<Product[]>([]);
  const { setCartCount } = useCartLock();

  useEffect(() => {
    inv.current = getInventory();
  }, []);

  // Report cart count to App so tab switching can be blocked
  useEffect(() => {
    setCartCount(cart.length);
  }, [cart.length, setCartCount]);

  const notify = (m: string, t: 'success' | 'error' | 'info' = 'success') => {
    setToast(m);
    setTT(t);
    setTimeout(() => setToast(''), 2500);
  };

  const search = useCallback((v: string) => {
    setQ(v);
    if (!v.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const l = v.toLowerCase();
    setResults(inv.current.filter(p => p.item.toLowerCase().includes(l) || p.ean.includes(l)).slice(0, 8));
    setOpen(true);
  }, []);

  const add = useCallback((p: Product) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === p.id);
      if (existing) return c.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product: p, qty: 1 }];
    });
    setQ('');
    setOpen(false);
  }, []);

  const handleScannedValue = useCallback((value: string) => {
    const exact = inv.current.find(p => p.ean.trim() === value.trim());
    if (exact) {
      add(exact);
      notify(`Added ${exact.item}`, 'success');
      return;
    }

    const partial = inv.current.find(p => p.ean.includes(value.trim()) || value.includes(p.ean));
    if (partial) {
      add(partial);
      notify(`Added ${partial.item}`, 'success');
      return;
    }

    setQ(value);
    search(value);
    notify('No exact barcode match found', 'info');
  }, [add, search]);

  const qty = useCallback((id: string, d: number) => {
    setCart(c => c.map(i => i.product.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter(i => i.qty > 0));
  }, []);

  const rm = useCallback((id: string) => {
    setCart(c => c.filter(i => i.product.id !== id));
  }, []);

  const total = cart.reduce((s, i) => s + i.product.rate * i.qty, 0);
  const ti = cart.length;
  const tq = cart.reduce((s, i) => s + i.qty, 0);

  // Item rows use same 4-col widths as template header (52/14/17/17).
  // Row 1: item name spans all 4 cols with top padding.
  // Row 2: empty first col, then qty/rate/amt right-aligned with bottom padding.
  const buildItemsHtml = () => {
    return cart.map((item) =>
      `<tr><td colspan="4" style="padding:3px 0 0 0;">${item.product.item}</td></tr><tr><td style="padding:0 0 3px 0;"></td><td style="text-align:right;padding:0 3px 3px 0;">${item.qty}</td><td style="text-align:right;padding:0 4px 3px 0;">${item.product.rate.toFixed(2)}</td><td style="text-align:right;padding:0 0 3px 4px;">${(item.product.rate * item.qty).toFixed(2)}</td></tr>`
    ).join('');
  };

  const buildInvoiceHtml = async () => {
    const tpl = getTemplate();
    const bn = getNextBillNo();
    const now = new Date();
    const date = now.toLocaleDateString('en-IN');
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const custName = name || 'Walk-in Customer';
    const qrHtml = await getQrHtml(bn, getQrSize());

    const html = tpl
      .replace(/\{\{BILL_NO\}\}/g, bn)
      .replace(/\{\{DATE\}\}/g, date)
      .replace(/\{\{TIME\}\}/g, time)
      .replace(/\{\{CUSTOMER_NAME\}\}/g, custName)
      .replace(/\{\{STORE_NAME\}\}/g, getStoreName() || 'RETAIL STORE')
      .replace(/\{\{STORE_PHONE\}\}/g, getStorePhone() || '+91 98765 43210')
      .replace(/\{\{STORE_ADDRESS\}\}/g, getStoreAddress() || '123 Market Street, New Delhi - 110001')
      .replace(/\{\{STORE_GSTIN\}\}/g, getStoreGstin() || '07AAACR1234A1Z5')
      .replace(/\{\{ITEMS\}\}/g, buildItemsHtml())
      .replace(/\{\{TOTAL\}\}/g, total.toFixed(2))
      .replace(/\{\{TOTAL_ITEMS\}\}/g, ti.toString())
      .replace(/\{\{TOTAL_QTY\}\}/g, tq.toString())
      .replace(/\{\{BILL_BARCODE\}\}/g, qrHtml);

    return { html, bn, date, time, custName };
  };

  const persistBill = (bn: string, date: string, time: string, custName: string) => {
    saveBill({
      id: crypto.randomUUID(),
      billNo: bn,
      date,
      time,
      customerName: custName,
      items: cart,
      total,
    });
    setCart([]);
    setName('');
  };

  // Render exact template HTML into isolated iframe and capture the template root.
  const captureInvoice = (invoiceHtml: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:800px;height:1600px;border:0;visibility:hidden;background:#fff;';
      document.body.appendChild(iframe);

      let done = false;
      const finish = (fn: () => void) => {
        if (done) return;
        done = true;
        try { document.body.removeChild(iframe); } catch {}
        fn();
      };

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        finish(() => reject(new Error('Unable to create render frame')));
        return;
      }

      const render = async () => {
        try {
          const target = (doc.body.firstElementChild as HTMLElement) || doc.body;

          const images = Array.from(doc.images || []);
          await Promise.all(images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            });
          }));

          await new Promise(r => setTimeout(r, 80));

          const width = Math.max(
            Math.ceil(target.getBoundingClientRect().width),
            target.scrollWidth,
            target.offsetWidth,
            1,
          );
          const height = Math.max(
            Math.ceil(target.getBoundingClientRect().height),
            target.scrollHeight,
            target.offsetHeight,
            1,
          );

          iframe.style.width = `${width}px`;
          iframe.style.height = `${height}px`;
          await new Promise(r => setTimeout(r, 40));

          const canvas = await html2canvas(target, {
            scale: 8,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            scrollX: 0,
            scrollY: 0,
          });

          finish(() => resolve(canvas));
        } catch (err) {
          finish(() => reject(err));
        }
      };

      const spacing = getMargin();
      doc.open();
      doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>html,body{margin:0;padding:${spacing}px 0;background:#fff;}img{max-width:100%;}*{box-sizing:border-box;}</style></head><body>${invoiceHtml}</body></html>`);
      doc.close();

      iframe.onload = () => { render(); };
      setTimeout(() => { render(); }, 250);
    });
  };

  const downloadImage = async () => {
    if (!cart.length) { notify('Add items first', 'error'); return; }
    setExporting(true);
    try {
      const { html, bn, date, time, custName } = await buildInvoiceHtml();
      const canvas = await captureInvoice(html);
      const a = document.createElement('a');
      a.download = `invoice_${bn}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      persistBill(bn, date, time, custName);
      notify(`Invoice #${bn} saved as image`, 'success');
    } catch {
      notify('Failed to generate image', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Download as real 57mm PDF using high-res canvas
  const downloadPdf = async () => {
    if (!cart.length) { notify('Add items first', 'error'); return; }
    setExporting(true);
    try {
      const { html, bn, date, time, custName } = await buildInvoiceHtml();
      const canvas = await captureInvoice(html);
      const imgData = canvas.toDataURL('image/png');
      const pdfW = 57;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`invoice_${bn}.pdf`);
      persistBill(bn, date, time, custName);
      notify(`Invoice #${bn} saved as PDF`, 'success');
    } catch {
      notify('Failed to generate PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="space-y-5">
      <div ref={ref} className="relative">
        <div className="flex items-center bg-[#e5e5ea] dark:bg-[#1c1c1e] rounded-[10px] px-3 py-[9px] gap-2">
          <Search size={16} className="text-[#8e8e93] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search products by name or barcode"
            value={q}
            onChange={e => search(e.target.value)}
            onFocus={() => q && results.length && setOpen(true)}
            className="bg-transparent text-[17px] outline-none w-full text-black dark:text-white placeholder:text-[#8e8e93]"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="w-[28px] h-[28px] rounded-[8px] bg-white dark:bg-[#2c2c2e] flex items-center justify-center flex-shrink-0 active:opacity-70"
            aria-label="Scan barcode"
          >
            <ScanLine size={16} className="text-[#007AFF]" />
          </button>
          {q && (
            <button onClick={() => { setQ(''); setOpen(false); }} className="w-[18px] h-[18px] rounded-full bg-[#8e8e93] flex items-center justify-center flex-shrink-0">
              <X size={10} className="text-white" />
            </button>
          )}
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#2c2c2e] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] max-h-[280px] overflow-auto z-50">
            {results.map((p, i) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="w-full text-left flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] transition-colors"
                style={i < results.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] text-black dark:text-white truncate">{p.item}</p>
                  <p className="text-[13px] text-[#8e8e93] font-mono">{p.ean}</p>
                </div>
                <span className="text-[17px] font-semibold text-black dark:text-white ml-3 tabular-nums">₹{p.rate.toFixed(2)}</span>
                <Plus size={18} className="text-[#007AFF] ml-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Customer</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px]">
          <input
            type="text"
            placeholder="Walk-in Customer"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] bg-transparent outline-none rounded-[10px]"
          />
        </div>
      </div>

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
              <div className="flex items-center px-4 py-[8px] bg-[#f8f8f8] dark:bg-[#2c2c2e]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="flex-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">Item</span>
                <span className="w-[100px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-center">Qty</span>
                <span className="w-[52px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Rate</span>
                <span className="w-[60px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Amt</span>
                <span className="w-[32px]"></span>
              </div>
              {cart.map((item, i) => (
                <div key={item.product.id} className="flex items-center px-4 py-[9px]" style={i < cart.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] text-black dark:text-white truncate leading-tight">{item.product.item}</p>
                  </div>
                  <div className="w-[100px] flex items-center justify-center">
                    <div className="flex items-center bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-[7px]">
                      <button onClick={() => qty(item.product.id, -1)} className="w-[28px] h-[28px] flex items-center justify-center text-[#007AFF] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] rounded-l-[7px]">
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <AnimatedNumber value={item.qty} className="text-[15px] font-semibold text-black dark:text-white w-[28px] text-center tabular-nums inline-block" />
                      <button onClick={() => qty(item.product.id, 1)} className="w-[28px] h-[28px] flex items-center justify-center text-[#007AFF] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] rounded-r-[7px]">
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <span className="w-[52px] text-[14px] text-[#8e8e93] tabular-nums text-right">{item.product.rate.toFixed(2)}</span>
                  <AnimatedNumber value={item.product.rate * item.qty} decimals={2} className="w-[60px] text-[15px] font-semibold text-black dark:text-white tabular-nums text-right inline-block" />
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

      {cart.length > 0 && (
        <>
          <div>
            <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Summary</p>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-[11px]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="text-[17px] text-black dark:text-white">Items</span>
                <AnimatedNumber value={ti} className="text-[17px] text-[#8e8e93] tabular-nums" />
              </div>
              <div className="flex items-center justify-between px-4 py-[11px]" style={{ borderBottom: '0.5px solid var(--sep)' }}>
                <span className="text-[17px] text-black dark:text-white">Quantity</span>
                <span className="text-[17px] text-[#8e8e93] tabular-nums">{tq}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-[11px]">
                <span className="text-[17px] font-semibold text-black dark:text-white">Total</span>
                <AnimatedNumber value={total} decimals={2} prefix="₹" className="text-[20px] font-bold text-black dark:text-white tabular-nums" />
              </div>
            </div>
          </div>

          <div className="space-y-[10px]">
            <button onClick={downloadImage} disabled={exporting}
              className="w-full bg-[#007AFF] text-white text-[17px] font-semibold rounded-[10px] py-[14px] flex items-center justify-center gap-2 active:bg-[#0066d6] disabled:opacity-60">
              {exporting ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><ImageDown size={18} /> Download as Image</>}
            </button>
            <button onClick={downloadPdf} disabled={exporting}
              className="w-full text-[#007AFF] text-[17px] font-medium rounded-[10px] py-[14px] bg-white dark:bg-[#1c1c1e] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e] flex items-center justify-center gap-2 disabled:opacity-60">
              {exporting ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><FileDown size={18} /> Download as PDF</>}
            </button>
            <button onClick={() => { setCart([]); setName(''); }}
              className="w-full text-[#FF3B30] text-[17px] font-medium rounded-[10px] py-[14px] bg-white dark:bg-[#1c1c1e] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e]">
              Clear All Items
            </button>
          </div>
        </>
      )}

      <BarcodeScannerModal open={showScanner} onClose={() => setShowScanner(false)} onDetected={handleScannedValue} />
      <Toast message={toast} type={tt} />
    </div>
  );
}
