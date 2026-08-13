import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Plus, Trash2, Search, X, PackageOpen, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { getInventory, setInventory } from '../store';
import * as XLSX from 'xlsx';
import Toast from './Toast';
import ActionSheet from './ActionSheet';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [ni, setNI] = useState({ item:'', rate:'', mrp:'', ean:'' });
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success'|'error'|'info'>('success');
  const [showClearSheet, setShowClearSheet] = useState(false);

  useEffect(() => { setProducts(getInventory()); }, []);
  const notify = (m:string, t:'success'|'error'|'info'='success') => { setToast(m); setTT(t); setTimeout(()=>setToast(''),2500); };
  const filtered = query ? products.filter(p => p.item.toLowerCase().includes(query.toLowerCase()) || p.ean.includes(query)) : products;

  const upload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { try {
      const d = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(d,{type:'array'}); const ws = wb.Sheets[wb.SheetNames[0]];
      const j = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws);
      const imp: Product[] = j.map((row,i) => ({id:crypto.randomUUID(),item:String(row['Item']||row['item']||row['ITEM']||`Product ${i+1}`),rate:Number(row['Rate']||row['rate']||row['RATE']||0),mrp:Number(row['MRP']||row['mrp']||row['Mrp']||0),ean:String(row['EAN']||row['ean']||row['Ean']||'')}));
      setInventory(imp); setProducts(imp); notify(`${imp.length} products imported`);
    } catch { notify('Failed to read file','error'); } };
    r.readAsArrayBuffer(f); e.target.value = '';
  }, []);

  const download = useCallback(() => {
    if (!products.length) { notify('No data','error'); return; }
    const ws = XLSX.utils.json_to_sheet(products.map(p=>({Item:p.item,Rate:p.rate,MRP:p.mrp,EAN:p.ean})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Inventory'); XLSX.writeFile(wb,'inventory.xlsx');
    notify('Downloaded');
  }, [products]);

  const sample = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet([{Item:'Notebook',Rate:50,MRP:60,EAN:'8901234567890'},{Item:'Pen',Rate:10,MRP:15,EAN:'8901234567891'},{Item:'Eraser',Rate:5,MRP:8,EAN:'8901234567892'}]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Inventory'); XLSX.writeFile(wb,'sample.xlsx');
    notify('Sample downloaded','info');
  }, []);

  const addP = useCallback(() => {
    if (!ni.item.trim()) { notify('Name required','error'); return; }
    const p:Product = {id:crypto.randomUUID(),item:ni.item.trim(),rate:Number(ni.rate)||0,mrp:Number(ni.mrp)||0,ean:ni.ean.trim()};
    const u = [...products,p]; setProducts(u); setInventory(u); setNI({item:'',rate:'',mrp:'',ean:''}); setShowAdd(false); notify('Added');
  }, [ni, products]);

  const del = useCallback((id:string) => { const u=products.filter(p=>p.id!==id); setProducts(u); setInventory(u); }, [products]);

  const clearAll = () => {
    setShowClearSheet(false);
    setProducts([]); setInventory([]); notify('All products deleted','info');
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex items-center bg-[#e5e5ea] dark:bg-[#1c1c1e] rounded-[10px] px-3 py-[9px]">
        <Search size={16} className="text-[#8e8e93] mr-2" />
        <input type="text" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)}
          className="bg-transparent text-[17px] outline-none w-full text-black dark:text-white placeholder:text-[#8e8e93]" />
        {query && <button onClick={() => setQuery('')} className="w-[18px] h-[18px] rounded-full bg-[#8e8e93] flex items-center justify-center"><X size={10} className="text-white" /></button>}
      </div>

      {/* Actions */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Actions</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <label className="flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] cursor-pointer" style={{borderBottom:'0.5px solid var(--sep)'}}>
            <Upload size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-[#007AFF] flex-1">Upload Excel File</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
            <input type="file" accept=".xlsx,.xls,.csv" onChange={upload} className="hidden" />
          </label>
          <button onClick={download} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]" style={{borderBottom:'0.5px solid var(--sep)'}}>
            <Download size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-[#007AFF] flex-1 text-left">Download Inventory</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <button onClick={sample} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]" style={{borderBottom:'0.5px solid var(--sep)'}}>
            <FileSpreadsheet size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-[#007AFF] flex-1 text-left">Download Sample File</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]">
            <Plus size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-[#007AFF] flex-1 text-left">Add Product Manually</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
        </div>
        {products.length > 0 && (
          <button onClick={() => setShowClearSheet(true)} className="w-full bg-white dark:bg-[#1c1c1e] rounded-[10px] text-[#FF3B30] text-[17px] text-center py-[11px] mt-2 active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e]">
            Delete All Products
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div>
          <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">New Product</p>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
            <input placeholder="Product Name" value={ni.item} onChange={e => setNI({...ni,item:e.target.value})}
              className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] outline-none bg-transparent" style={{borderBottom:'0.5px solid var(--sep)'}} />
            <input placeholder="Selling Rate" type="number" value={ni.rate} onChange={e => setNI({...ni,rate:e.target.value})}
              className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] outline-none bg-transparent" style={{borderBottom:'0.5px solid var(--sep)'}} />
            <input placeholder="MRP" type="number" value={ni.mrp} onChange={e => setNI({...ni,mrp:e.target.value})}
              className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] outline-none bg-transparent" style={{borderBottom:'0.5px solid var(--sep)'}} />
            <input placeholder="Barcode / EAN" value={ni.ean} onChange={e => setNI({...ni,ean:e.target.value})}
              className="w-full px-4 py-[11px] text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] outline-none bg-transparent font-mono" />
          </div>
          <div className="mt-2 space-y-[10px]">
            <button onClick={addP} className="w-full bg-[#007AFF] text-white text-[17px] font-semibold rounded-[10px] py-[14px] active:bg-[#0066d6]">Save Product</button>
            <button onClick={() => setShowAdd(false)} className="w-full text-[#007AFF] text-[17px] bg-white dark:bg-[#1c1c1e] rounded-[10px] py-[14px] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e]">Cancel</button>
          </div>
        </div>
      )}

      {/* Product List */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">{products.length} Product{products.length !== 1 ? 's' : ''}</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <PackageOpen size={32} className="text-[#c7c7cc] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[17px] text-[#8e8e93]">No products</p>
              <p className="text-[13px] text-[#c7c7cc] mt-1">Upload or add manually</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center"><p className="text-[17px] text-[#8e8e93]">No results</p></div>
          ) : (
            filtered.map((p, i) => (
              <div key={p.id} className="flex items-center px-4 py-[10px]"
                style={i < filtered.length - 1 ? {borderBottom:'0.5px solid var(--sep)'} : {}}>
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-[17px] text-black dark:text-white truncate">{p.item}</p>
                  <p className="text-[13px] text-[#8e8e93]">MRP ₹{p.mrp} {p.ean ? `· ${p.ean}` : ''}</p>
                </div>
                <span className="text-[17px] font-semibold text-black dark:text-white tabular-nums mr-3">₹{p.rate}</span>
                <button onClick={() => del(p.id)} className="text-[#FF3B30] active:opacity-50"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* iOS Action Sheet for delete confirmation */}
      <ActionSheet
        open={showClearSheet}
        title="Delete All Products"
        message={`This will remove all ${products.length} products from inventory.`}
        actions={[{ label: 'Delete All', destructive: true, onClick: clearAll }]}
        onCancel={() => setShowClearSheet(false)}
      />

      <Toast message={toast} type={tt} />
    </div>
  );
}
