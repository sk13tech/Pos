import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Copy, Check, ChevronRight, CheckCircle2 } from 'lucide-react';
import { TemplateSlot } from '../types';
import {
  getTemplate,
  getTemplates,
  saveTemplates,
  getActiveTemplateId,
  setActiveTemplateId,
  getStoreName,
  getStorePhone,
  getStoreAddress,
  getStoreGstin,
  getQrSize,
  getMargin,
} from '../store';
import { getQrHtml } from '../barcode';
import Toast from './Toast';

const VARS = [
  { name:'{{STORE_NAME}}', desc:'Store name' },
  { name:'{{STORE_PHONE}}', desc:'Store phone' },
  { name:'{{STORE_ADDRESS}}', desc:'Store address' },
  { name:'{{STORE_GSTIN}}', desc:'Store GSTIN' },
  { name:'{{BILL_NO}}', desc:'Invoice number' },
  { name:'{{DATE}}', desc:'Date' },
  { name:'{{TIME}}', desc:'Time' },
  { name:'{{CUSTOMER_NAME}}', desc:'Customer' },
  { name:'{{ITEMS}}', desc:'Items table rows' },
  { name:'{{TOTAL}}', desc:'Total' },
  { name:'{{TOTAL_ITEMS}}', desc:'Item count' },
  { name:'{{TOTAL_QTY}}', desc:'Qty total' },
  { name:'{{BILL_BARCODE}}', desc:'QR Code (DDMMYYYYBILLNO)' },
];

const SAMPLE_ITEMS = `<tr><td colspan="4" style="padding:3px 0 0 0;">Amul Butter (500g)</td></tr><tr><td style="padding:0 0 3px 0;"></td><td style="text-align:right;padding:0 3px 3px 0;">2</td><td style="text-align:right;padding:0 4px 3px 0;">270.00</td><td style="text-align:right;padding:0 0 3px 4px;">540.00</td></tr><tr><td colspan="4" style="padding:3px 0 0 0;">Red Label Tea (500g)</td></tr><tr><td style="padding:0 0 3px 0;"></td><td style="text-align:right;padding:0 3px 3px 0;">1</td><td style="text-align:right;padding:0 4px 3px 0;">235.00</td><td style="text-align:right;padding:0 0 3px 4px;">235.00</td></tr><tr><td colspan="4" style="padding:3px 0 0 0;">Parle-G Biscuit (250g)</td></tr><tr><td style="padding:0 0 3px 0;"></td><td style="text-align:right;padding:0 3px 3px 0;">3</td><td style="text-align:right;padding:0 4px 3px 0;">20.00</td><td style="text-align:right;padding:0 0 3px 4px;">60.00</td></tr>`;

export default function Template() {
  const [templates, setTemplatesState] = useState<TemplateSlot[]>(getTemplates());
  const [activeId, setActiveIdState] = useState(getActiveTemplateId());
  const [selectedId, setSelectedId] = useState(getActiveTemplateId());
  const [html, setHtml] = useState(getTemplate());
  const [preview, setPreview] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success'|'error'|'info'>('success');
  const [copied, setCopied] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const fresh = getTemplates();
    const active = getActiveTemplateId();
    setTemplatesState(fresh);
    setActiveIdState(active);
    setSelectedId(active);
    setHtml(fresh.find(t => t.id === active)?.html || getTemplate());
  }, []);

  useEffect(() => {
    if (!preview) return;
    (async () => {
      const qr = await getQrHtml('0001', getQrSize());
      const p = html
        .replace(/\{\{STORE_NAME\}\}/g, getStoreName() || 'RETAIL STORE')
        .replace(/\{\{STORE_PHONE\}\}/g, getStorePhone() || '+91 98765 43210')
        .replace(/\{\{STORE_ADDRESS\}\}/g, getStoreAddress() || '123 Market Street, New Delhi - 110001')
        .replace(/\{\{STORE_GSTIN\}\}/g, getStoreGstin() || '07AAACR1234A1Z5')
        .replace(/\{\{BILL_NO\}\}/g, '0001')
        .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('en-IN'))
        .replace(/\{\{TIME\}\}/g, new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
        .replace(/\{\{CUSTOMER_NAME\}\}/g, 'Rahul Sharma')
        .replace(/\{\{ITEMS\}\}/g, SAMPLE_ITEMS)
        .replace(/\{\{TOTAL\}\}/g, '835.00')
        .replace(/\{\{TOTAL_ITEMS\}\}/g, '3')
        .replace(/\{\{TOTAL_QTY\}\}/g, '6')
        .replace(/\{\{BILL_BARCODE\}\}/g, qr);
      setPreviewHtml(p);
    })();
  }, [preview, html]);

  const notify = (m: string, t: 'success'|'error'|'info' = 'success') => { setToast(m); setTT(t); setTimeout(() => setToast(''), 2500); };

  const save = () => {
    const next = templates.map(t => t.id === selectedId ? { ...t, html } : t);
    setTemplatesState(next);
    saveTemplates(next);
    notify('Template saved');
  };

  const setDefaultTemplate = () => {
    setActiveTemplateId(selectedId);
    setActiveIdState(selectedId);
    notify('Set as default template', 'success');
  };

  const selectTemplate = (id: string) => {
    const next = templates.map(t => t.id === selectedId ? { ...t, html } : t);
    setTemplatesState(next);
    setSelectedId(id);
    const selected = next.find(t => t.id === id);
    if (selected) setHtml(selected.html);
  };

  const cp = (n: string) => { navigator.clipboard.writeText(n); setCopied(n); setTimeout(() => setCopied(''), 1200); };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Controls</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <button onClick={() => setShowVars(!showVars)} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]" style={{borderBottom:'0.5px solid var(--sep)'}}>
            <span className="text-[17px] text-[#007AFF] flex-1 text-left">{showVars ? 'Hide' : 'Show'} Variables</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <button onClick={() => setPreview(!preview)} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]" style={{borderBottom:'0.5px solid var(--sep)'}}>
            {preview ? <EyeOff size={20} className="text-[#007AFF] mr-3" /> : <Eye size={20} className="text-[#007AFF] mr-3" />}
            <span className="text-[17px] text-[#007AFF] flex-1 text-left">{preview ? 'Show Editor' : 'Preview Invoice'}</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <button onClick={save} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]" style={{borderBottom:'0.5px solid var(--sep)'}}>
            <Save size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-[#007AFF] flex-1 text-left font-semibold">Save Template</span>
          </button>
          <button onClick={setDefaultTemplate} className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]">
            <CheckCircle2 size={20} className="text-[#34C759] mr-3" />
            <span className="text-[17px] text-[#34C759] flex-1 text-left font-semibold">Set as Default</span>
          </button>
        </div>
      </div>

      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Templates</p>
        <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-[12px] p-[3px] flex gap-[3px]">
          {templates.map((template) => {
            const isSelected = template.id === selectedId;
            const isDefault = template.id === activeId;
            return (
              <button
                key={template.id}
                onClick={() => selectTemplate(template.id)}
                className={`relative flex-1 min-w-0 rounded-[10px] px-2 py-[9px] text-center transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-[#3a3a3c]'
                    : 'bg-transparent'
                }`}
              >
                <div className={`text-[14px] font-medium truncate ${isSelected ? 'text-black dark:text-white' : 'text-[#8e8e93]'}`}>
                  {template.name}
                </div>
                {isDefault && (
                  <span className="absolute top-[6px] right-[8px] w-[7px] h-[7px] rounded-full bg-[#34C759]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showVars && (
        <div>
          <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Variables — Tap to Copy</p>
          <p className="text-[13px] text-[#8e8e93] px-4 mb-2 leading-relaxed">
            <code>{'{{STORE_NAME}}'}</code>, <code>{'{{STORE_PHONE}}'}</code>, <code>{'{{STORE_ADDRESS}}'}</code>, <code>{'{{STORE_GSTIN}}'}</code> come from Settings. <code>{'{{ITEMS}}'}</code> outputs item rows with right-aligned numeric values for <code>&lt;tbody&gt;</code>. <code>{'{{BILL_BARCODE}}'}</code> outputs a QR code image. Invoice spacing is applied automatically from Settings during preview/export.
          </p>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
            {VARS.map((v, i) => (
              <button key={v.name} onClick={() => cp(v.name)}
                className="w-full flex items-center px-4 py-[10px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]"
                style={i < VARS.length - 1 ? {borderBottom:'0.5px solid var(--sep)'} : {}}>
                <div className="flex-1 text-left min-w-0">
                  <code className="text-[15px] font-mono font-semibold text-black dark:text-white">{v.name}</code>
                  <p className="text-[13px] text-[#8e8e93]">{v.desc}</p>
                </div>
                {copied === v.name ? <Check size={18} className="text-[#34C759] ml-2" /> : <Copy size={18} className="text-[#c7c7cc] ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">{preview ? 'Preview' : 'HTML Editor'}</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          {!preview ? (
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              wrap="off"
              className="w-full h-[400px] px-4 py-3 text-[15px] font-mono text-black dark:text-white bg-transparent outline-none resize-none leading-relaxed overflow-x-auto whitespace-pre"
              style={{ tabSize: 2 }}
              placeholder="Paste your full invoice HTML template here..."
            />
          ) : (
            <div className="min-h-[300px] bg-white overflow-auto" style={{ margin: 0, padding: `${getMargin()}px 0` }}>
              <div style={{ margin: 0, padding: 0 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>
      </div>

      <Toast message={toast} type={tt} />
    </div>
  );
}
