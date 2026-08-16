import { useState, useEffect } from 'react';
import { Search, X, Receipt, ImageDown, FileDown, Loader2, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { Bill } from '../types';
import { deleteBill, getBills, getTemplate, getStoreName, getStorePhone, getStoreAddress, getStoreGstin, getQrSize, getMargin } from '../store';
import { getQrHtml } from '../barcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Toast from './Toast';
import ActionSheet from './ActionSheet';

export default function BillHistory() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => { setBills(getBills()); }, []);

  const notify = (m: string, t: 'success' | 'error' | 'info' = 'success') => {
    setToast(m); setTT(t); setTimeout(() => setToast(''), 2500);
  };

  const filtered = query
    ? bills.filter(b =>
        b.billNo.toLowerCase().includes(query.toLowerCase()) ||
        b.customerName.toLowerCase().includes(query.toLowerCase()) ||
        b.date.includes(query)
      )
    : bills;

  const confirmDelete = () => {
    if (!deleting) return;
    deleteBill(deleting.id);
    setBills(prev => prev.filter(b => b.id !== deleting.id));
    if (selected?.id === deleting.id) setSelected(null);
    notify(`Deleted invoice #${deleting.billNo}`, 'info');
    setDeleting(null);
  };

  const rebuildHtml = async (bill: Bill) => {
    const tpl = getTemplate();
    const qrHtml = await getQrHtml(bill.billNo, getQrSize());

    const itemsHtml = bill.items.map((item) =>
      `<tr><td colspan="4">${item.product.item}</td></tr><tr><td></td><td style="text-align:right;">${item.qty}</td><td style="text-align:right;">${item.product.rate.toFixed(2)}</td><td style="text-align:right;">${(item.product.rate * item.qty).toFixed(2)}</td></tr>`
    ).join('');

    return tpl
      .replace(/\{\{BILL_NO\}\}/g, bill.billNo)
      .replace(/\{\{DATE\}\}/g, bill.date)
      .replace(/\{\{TIME\}\}/g, bill.time)
      .replace(/\{\{CUSTOMER_NAME\}\}/g, bill.customerName)
      .replace(/\{\{STORE_NAME\}\}/g, getStoreName() || 'RETAIL STORE')
      .replace(/\{\{STORE_PHONE\}\}/g, getStorePhone() || '+91 98765 43210')
      .replace(/\{\{STORE_ADDRESS\}\}/g, getStoreAddress() || '123 Market Street, New Delhi - 110001')
      .replace(/\{\{STORE_GSTIN\}\}/g, getStoreGstin() || '07AAACR1234A1Z5')
      .replace(/\{\{ITEMS\}\}/g, itemsHtml)
      .replace(/\{\{TOTAL\}\}/g, bill.total.toFixed(2))
      .replace(/\{\{TOTAL_ITEMS\}\}/g, bill.items.length.toString())
      .replace(/\{\{TOTAL_QTY\}\}/g, bill.items.reduce((s, i) => s + i.qty, 0).toString())
      .replace(/\{\{BILL_BARCODE\}\}/g, qrHtml);
  };

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
      if (!doc) { finish(() => reject(new Error('Unable to create render frame'))); return; }

      const render = async () => {
        try {
          const target = (doc.body.firstElementChild as HTMLElement) || doc.body;
          const images = Array.from(doc.images || []);
          await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); });
          }));
          await new Promise(r => setTimeout(r, 80));

          const width = Math.max(Math.ceil(target.getBoundingClientRect().width), target.scrollWidth, target.offsetWidth, 1);
          const height = Math.max(Math.ceil(target.getBoundingClientRect().height), target.scrollHeight, target.offsetHeight, 1);
          iframe.style.width = `${width}px`;
          iframe.style.height = `${height}px`;
          await new Promise(r => setTimeout(r, 40));

          const canvas = await html2canvas(target, {
            scale: 8, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
            logging: false, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: 0,
          });
          finish(() => resolve(canvas));
        } catch (err) { finish(() => reject(err)); }
      };

      const spacing = getMargin();
      doc.open();
      doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>html,body{margin:0;padding:${spacing}px 0;background:#fff;}img{max-width:100%;}*{box-sizing:border-box;}</style></head><body>${invoiceHtml}</body></html>`);
      doc.close();
      iframe.onload = () => { render(); };
      setTimeout(() => { render(); }, 250);
    });
  };

  const downloadImage = async (bill: Bill) => {
    setExporting('image');
    try {
      const html = await rebuildHtml(bill);
      const canvas = await captureInvoice(html);
      const a = document.createElement('a');
      a.download = `invoice_${bill.billNo}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      notify(`Invoice #${bill.billNo} saved as image`, 'success');
    } catch { notify('Failed to generate image', 'error'); }
    finally { setExporting(null); }
  };

  const downloadPdf = async (bill: Bill) => {
    setExporting('pdf');
    try {
      const html = await rebuildHtml(bill);
      const canvas = await captureInvoice(html);
      const imgData = canvas.toDataURL('image/png');
      const pdfW = 57;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH], compress: true });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`invoice_${bill.billNo}.pdf`);
      notify(`Invoice #${bill.billNo} saved as PDF`, 'success');
    } catch { notify('Failed to generate PDF', 'error'); }
    finally { setExporting(null); }
  };

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-[17px] text-[#007AFF] active:opacity-60">
          <ChevronLeft size={18} strokeWidth={2.2} />
          <span>Back</span>
        </button>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '0.5px solid var(--sep)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[20px] font-bold text-black dark:text-white">#{selected.billNo}</span>
                <p className="text-[15px] text-[#8e8e93] mt-1 truncate">{selected.customerName}</p>
              </div>
              <button
                onClick={() => setDeleting(selected)}
                className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center bg-[#fff3f2] dark:bg-[#3a1f1d] text-[#FF3B30] active:opacity-70 flex-shrink-0"
                aria-label="Delete invoice"
              >
                <Trash2 size={17} />
              </button>
            </div>
            <p className="text-[13px] text-[#8e8e93] mt-1">{selected.date} · {selected.time}</p>
          </div>

          <div className="px-4 py-2" style={{ borderBottom: '0.5px solid var(--sep)' }}>
            <div className="flex items-center py-1">
              <span className="flex-1 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">Item</span>
              <span className="w-[40px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Qty</span>
              <span className="w-[60px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Rate</span>
              <span className="w-[65px] text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide text-right">Amt</span>
            </div>
            {selected.items.map((item, i) => (
              <div key={i} className="flex items-center py-[6px]" style={i < selected.items.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
                <span className="flex-1 text-[15px] text-black dark:text-white truncate pr-2">{item.product.item}</span>
                <span className="w-[40px] text-[14px] text-[#8e8e93] tabular-nums text-right">{item.qty}</span>
                <span className="w-[60px] text-[14px] text-[#8e8e93] tabular-nums text-right">{item.product.rate.toFixed(2)}</span>
                <span className="w-[65px] text-[15px] font-semibold text-black dark:text-white tabular-nums text-right">{(item.product.rate * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[17px] font-semibold text-black dark:text-white">Total</span>
            <span className="text-[20px] font-bold text-black dark:text-white tabular-nums">₹{selected.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-[10px]">
          <button onClick={() => downloadImage(selected)} disabled={!!exporting}
            className="w-full bg-[#007AFF] text-white text-[17px] font-semibold rounded-[10px] py-[14px] flex items-center justify-center gap-2 active:bg-[#0066d6] disabled:opacity-60">
            {exporting === 'image' ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><ImageDown size={18} /> Download as Image</>}
          </button>
          <button onClick={() => downloadPdf(selected)} disabled={!!exporting}
            className="w-full text-[#007AFF] text-[17px] font-medium rounded-[10px] py-[14px] bg-white dark:bg-[#1c1c1e] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e] flex items-center justify-center gap-2 disabled:opacity-60">
            {exporting === 'pdf' ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><FileDown size={18} /> Download as PDF</>}
          </button>
        </div>

        <ActionSheet
          open={!!deleting}
          title="Delete Invoice"
          message={deleting ? `Delete invoice #${deleting.billNo}? This cannot be undone.` : ''}
          actions={[{ label: 'Delete Invoice', destructive: true, onClick: confirmDelete }]}
          onCancel={() => setDeleting(null)}
        />

        <Toast message={toast} type={tt} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center bg-[#e5e5ea] dark:bg-[#1c1c1e] rounded-[10px] px-3 py-[9px]">
        <Search size={16} className="text-[#8e8e93] mr-2" />
        <input type="text" placeholder="Search by bill #, customer, or date" value={query} onChange={e => setQuery(e.target.value)}
          className="bg-transparent text-[17px] outline-none w-full text-black dark:text-white placeholder:text-[#8e8e93]" />
        {query && (
          <button onClick={() => setQuery('')} className="w-[18px] h-[18px] rounded-full bg-[#8e8e93] flex items-center justify-center">
            <X size={10} className="text-white" />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
        {bills.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt size={32} className="text-[#c7c7cc] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[17px] text-[#8e8e93]">No bills yet</p>
            <p className="text-[13px] text-[#c7c7cc] mt-1">Generated bills will appear here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[17px] text-[#8e8e93]">No results for "{query}"</p>
          </div>
        ) : (
          filtered.map((bill, i) => (
            <div key={bill.id} className="flex items-center px-4 py-[11px]" style={i < filtered.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
              <button onClick={() => setSelected(bill)} className="flex-1 min-w-0 text-left active:opacity-70">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold text-black dark:text-white">#{bill.billNo}</span>
                  <span className="text-[13px] text-[#8e8e93]">{bill.date}</span>
                </div>
                <p className="text-[14px] text-[#8e8e93] truncate mt-0.5">{bill.customerName} · {bill.items.length} items</p>
              </button>
              <span className="text-[17px] font-semibold text-black dark:text-white tabular-nums ml-3">₹{bill.total.toFixed(2)}</span>
              <button
                onClick={() => setDeleting(bill)}
                className="ml-2 w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[#FF3B30] active:opacity-70"
                aria-label="Delete invoice"
              >
                <Trash2 size={16} />
              </button>
              <button onClick={() => setSelected(bill)} className="ml-1 w-[24px] h-[24px] flex items-center justify-center active:opacity-70">
                <ChevronRight size={18} className="text-[#c7c7cc]" />
              </button>
            </div>
          ))
        )}
      </div>

      <ActionSheet
        open={!!deleting}
        title="Delete Invoice"
        message={deleting ? `Delete invoice #${deleting.billNo}? This cannot be undone.` : ''}
        actions={[{ label: 'Delete Invoice', destructive: true, onClick: confirmDelete }]}
        onCancel={() => setDeleting(null)}
      />

      <Toast message={toast} type={tt} />
    </div>
  );
}
