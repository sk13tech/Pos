interface ActionSheetProps {
  open: boolean;
  title?: string;
  message?: string;
  actions: { label: string; destructive?: boolean; onClick: () => void }[];
  onCancel: () => void;
}

export default function ActionSheet({ open, title, message, actions, onCancel }: ActionSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div className="relative w-full max-w-lg px-2 pb-2" onClick={e => e.stopPropagation()}>
        {/* Action group */}
        <div className="bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-xl rounded-[14px] overflow-hidden mb-2">
          {(title || message) && (
            <div className="px-4 py-3 text-center" style={{ borderBottom: '0.5px solid var(--sep)' }}>
              {title && <p className="text-[13px] font-semibold text-[#8e8e93]">{title}</p>}
              {message && <p className="text-[13px] text-[#8e8e93] mt-0.5">{message}</p>}
            </div>
          )}
          {actions.map((action, i) => (
            <button key={i} onClick={action.onClick}
              className="w-full py-[16px] text-[20px] font-normal text-center active:bg-[#d1d1d6]/50 dark:active:bg-[#3a3a3c]/50"
              style={i < actions.length - 1 ? { borderBottom: '0.5px solid var(--sep)' } : {}}
            >
              <span className={action.destructive ? 'text-[#FF3B30] font-normal' : 'text-[#007AFF]'}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button onClick={onCancel}
          className="w-full py-[16px] text-[20px] font-semibold text-[#007AFF] text-center bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-xl rounded-[14px] active:bg-[#d1d1d6]/50 dark:active:bg-[#3a3a3c]/50">
          Cancel
        </button>
      </div>
    </div>
  );
}
