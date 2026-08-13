import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

export default function BarcodeScannerModal({ open, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!videoRef.current) return;

    let cancelled = false;
    setError('');
    readerRef.current = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        controlsRef.current = await readerRef.current!.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;
            const text = result.getText().trim();
            if (!text) return;
            controlsRef.current?.stop();
            onDetected(text);
            onClose();
          }
        );
      } catch {
        if (!cancelled) {
          setError('Unable to access camera. Please allow camera permission.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-t-[18px] sm:rounded-[18px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid var(--sep)' }}>
          <div>
            <p className="text-[17px] font-semibold text-black dark:text-white">Scan Barcode</p>
            <p className="text-[13px] text-[#8e8e93]">Point your camera at the product barcode</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center">
            <X size={16} className="text-[#8e8e93]" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative bg-black rounded-[14px] overflow-hidden aspect-[3/4] sm:aspect-video flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 border-[2px] border-white/30 pointer-events-none" />
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[2px] bg-[#34C759]/80 shadow-[0_0_12px_rgba(52,199,89,0.7)]" />
            {!error && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/40 text-white text-[12px] rounded-[10px] px-3 py-2 flex items-center gap-2">
                <Camera size={14} />
                Camera is live. Hold steady over the barcode.
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 bg-[#fff3f2] dark:bg-[#3a1f1d] rounded-[10px] px-3 py-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-[#FF3B30] mt-[1px] flex-shrink-0" />
              <p className="text-[13px] text-[#FF3B30]">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
