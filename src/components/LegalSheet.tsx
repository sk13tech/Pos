import { X } from 'lucide-react';

interface LegalSheetProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function LegalSheet({ open, title, children, onClose }: LegalSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/35" />
      <div
        className="relative w-full max-w-lg max-h-[88vh] bg-white dark:bg-[#1c1c1e] rounded-t-[18px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl" style={{ borderBottom: '0.5px solid var(--sep)' }}>
          <span className="text-[17px] font-semibold text-black dark:text-white">{title}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center">
            <X size={16} className="text-[#8e8e93]" />
          </button>
        </div>
        <div className="px-4 py-4 overflow-y-auto max-h-[calc(88vh-57px)] text-[15px] leading-relaxed text-black dark:text-white space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
