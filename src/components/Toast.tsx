import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success' }: { message: string; type?: 'success'|'error'|'info' }) {
  if (!message) return null;
  const c = { success:'text-[#34C759]', error:'text-[#FF3B30]', info:'text-[#007AFF]' };
  const i = { success:<CheckCircle size={18}/>, error:<AlertCircle size={18}/>, info:<Info size={18}/> };
  return (
    <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[200]">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-[14px] px-4 py-3 flex items-center gap-2.5 shadow-[0_2px_20px_rgba(0,0,0,0.15)] border border-[#e5e5ea] dark:border-[#38383a]">
        <span className={c[type]}>{i[type]}</span>
        <span className="text-[15px] font-medium text-black dark:text-white">{message}</span>
      </div>
    </div>
  );
}
