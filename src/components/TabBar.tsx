import { ReceiptText, Box, FileCode, Settings } from 'lucide-react';
import { TabId } from '../types';

const tabs: { id: TabId; label: string; Icon: React.FC<{ size: number; strokeWidth: number; className?: string }> }[] = [
  { id: 'create', label: 'Billing', Icon: ReceiptText },
  { id: 'inventory', label: 'Inventory', Icon: Box },
  { id: 'template', label: 'Template', Icon: FileCode },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f8f8f8]/70 dark:bg-[#1c1c1e]/70 backdrop-blur-[40px] [-webkit-backdrop-filter:blur(40px)_saturate(200%)] border-t border-[#c6c6c8]/30 dark:border-[#38383a]/40 transition-colors duration-300">
      <div className="flex max-w-lg mx-auto pt-[8px]" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {tabs.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <button key={id} onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-[3px] ${on ? 'text-[#007AFF]' : 'text-[#999]'}`}>
              <Icon size={22} strokeWidth={on ? 2 : 1.5} />
              <span className={`text-[10px] ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
