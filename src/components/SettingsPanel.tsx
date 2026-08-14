import { useState } from 'react';
import {
  Moon,
  LogIn, LogOut, User, Download, Upload,
  Loader2, ChevronRight, HelpCircle, RefreshCw,
  Store, Phone, MapPin, FileText
} from 'lucide-react';
import {
  getDarkMode,
  setDarkMode,
  getMargin,
  exportData,
  importData,
  getStoreName,
  getStorePhone,
  getStoreAddress,
  getStoreGstin,
  saveSettingsBatch,
  getQrSize,
} from '../store';
import { MarginSetting } from '../types';
import { googleSignIn, googleSignOut, syncToCloudNow } from '../firebase';
import { useAuth } from '../App';
import Toast from './Toast';
import ActionSheet from './ActionSheet';

export default function SettingsPanel() {
  const { user, restoring } = useAuth();
  const [toast, setToast] = useState('');
  const [tt, setTT] = useState<'success'|'error'|'info'>('success');
  const [dark, setDark] = useState(getDarkMode());
  const [marginVal, setMarginVal] = useState<MarginSetting>(getMargin());
  const [authLoading, setAuthLoading] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const [sName, setSName] = useState(getStoreName());
  const [sPhone, setSPhone] = useState(getStorePhone());
  const [sAddr, setSAddr] = useState(getStoreAddress());
  const [sGstin, setSGstin] = useState(getStoreGstin());
  const [qrSizeVal, setQrSizeVal] = useState(getQrSize());

  const notify = (m: string, t: 'success' | 'error' | 'info' = 'success') => {
    setToast(m);
    setTT(t);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleDark = () => {
    const n = !dark;
    setDark(n);
    setDarkMode(n);
    document.documentElement.classList.toggle('dark', n);
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      await googleSignIn();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Sign in failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowSignOut(false);
    try {
      await googleSignOut();
      notify('Signed out', 'info');
    } catch {
      notify('Sign out failed', 'error');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      saveSettingsBatch({
        storeName: sName,
        storePhone: sPhone,
        storeAddress: sAddr,
        storeGstin: sGstin,
        margin: marginVal,
        qrSize: qrSizeVal,
      });
      if (user) {
        await syncToCloudNow();
      }
      notify('Settings saved', 'success');
    } catch {
      notify('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const backupToFile = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Backup saved', 'success');
  };

  const restoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const ok = importData(ev.target?.result as string);
      notify(ok ? 'Data restored from file' : 'Invalid file', ok ? 'success' : 'error');
    };
    r.readAsText(f);
    e.target.value = '';
  };

  const handleManualSync = async () => {
    setManualSyncing(true);
    try {
      await syncToCloudNow();
      notify('Synced to cloud', 'success');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Sync failed', 'error');
    } finally {
      setManualSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Profile */}
      {user ? (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-3.5 px-4 py-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-[60px] h-[60px] rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-[60px] h-[60px] rounded-full bg-[#e5e5ea] dark:bg-[#38383a] flex items-center justify-center">
                <User size={28} className="text-[#8e8e93]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[20px] font-semibold text-black dark:text-white truncate">{user.displayName || 'User'}</p>
              <p className="text-[14px] text-[#8e8e93] truncate">{user.email}</p>
              <p className="text-[12px] text-[#c7c7cc] mt-0.5">Google Account</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <button
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full flex items-center px-4 py-[16px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] disabled:opacity-50"
          >
            <div className="w-[50px] h-[50px] rounded-full bg-[#e5e5ea] dark:bg-[#38383a] flex items-center justify-center mr-3.5">
              {authLoading ? <Loader2 size={22} className="text-[#007AFF] animate-spin" /> : <User size={24} className="text-[#8e8e93]" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[17px] font-semibold text-[#007AFF]">{authLoading ? 'Signing in...' : 'Sign in with Google'}</p>
              <p className="text-[13px] text-[#8e8e93]">Auto-sync your data to cloud</p>
            </div>
            <LogIn size={20} className="text-[#007AFF]" />
          </button>
        </div>
      )}

      {restoring && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 size={14} className="text-[#8e8e93] animate-spin" />
          <span className="text-[13px] text-[#8e8e93]">Restoring from cloud...</span>
        </div>
      )}

      {/* Store Information */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Store Information</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <SettingInput icon={<Store size={20} className="text-[#007AFF]" />} placeholder="Store Name" value={sName} onChange={setSName} />
          <SettingInput icon={<Phone size={20} className="text-[#34C759]" />} placeholder="Phone Number" value={sPhone} onChange={setSPhone} type="tel" />
          <SettingInput icon={<MapPin size={20} className="text-[#FF9500]" />} placeholder="Address" value={sAddr} onChange={setSAddr} />
          <SettingInput icon={<FileText size={20} className="text-[#AF52DE]" />} placeholder="GSTIN" value={sGstin} onChange={setSGstin} last />
        </div>
        <p className="text-[13px] text-[#8e8e93] px-4 mt-[6px]">Used in invoice template variables.</p>
      </div>

      {/* Appearance */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Appearance</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <div className="flex items-center px-4 py-[11px]">
            <Moon size={20} className="text-[#8e8e93] mr-3" />
            <span className="text-[17px] text-black dark:text-white flex-1">Dark Mode</span>
            <button
              onClick={toggleDark}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-300 ${dark ? 'bg-[#34C759]' : 'bg-[#e5e5ea]'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform duration-300 ${dark ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Spacing */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Invoice Spacing</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] text-black dark:text-white">{marginVal}px</span>
            <span className="text-[13px] text-[#8e8e93]">0 – 20</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={marginVal}
            onChange={e => setMarginVal(Number(e.target.value))}
            className="w-full ios-slider"
          />
          <p className="text-[13px] text-[#8e8e93] mt-3 px-1">
            Adds top and bottom spacing around the bill during preview, image export, and PDF export.
          </p>
        </div>
      </div>

      {/* QR Code Size */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">QR Code Size</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] text-black dark:text-white">{qrSizeVal}px</span>
            <span className="text-[13px] text-[#8e8e93]">20 – 100</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={1}
            value={qrSizeVal}
            onChange={e => setQrSizeVal(Number(e.target.value))}
            className="w-full ios-slider"
          />
        </div>
      </div>

      {/* Save Settings */}
      <button
        onClick={handleSaveSettings}
        disabled={savingSettings}
        className="w-full bg-[#007AFF] text-white rounded-[10px] text-[17px] font-semibold text-center py-[13px] active:bg-[#0066d6] disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {savingSettings ? <Loader2 size={18} className="animate-spin" /> : null}
        {savingSettings ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Backup & Restore */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Backup & Restore</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden">
          <button
            onClick={backupToFile}
            className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c]"
            style={{ borderBottom: '0.5px solid var(--sep)' }}
          >
            <Download size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-black dark:text-white flex-1 text-left">Backup to File</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <label
            className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] cursor-pointer"
            style={user ? { borderBottom: '0.5px solid var(--sep)' } : {}}
          >
            <Upload size={20} className="text-[#007AFF] mr-3" />
            <span className="text-[17px] text-black dark:text-white flex-1 text-left">Restore from File</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
            <input type="file" accept=".json" onChange={restoreFromFile} className="hidden" />
          </label>
          {user && (
            <button
              onClick={handleManualSync}
              disabled={manualSyncing}
              className="w-full flex items-center px-4 py-[11px] active:bg-[#d1d1d6] dark:active:bg-[#3a3a3c] disabled:opacity-50"
            >
              {manualSyncing ? <Loader2 size={20} className="text-[#34C759] mr-3 animate-spin" /> : <RefreshCw size={20} className="text-[#34C759] mr-3" />}
              <span className="text-[17px] text-black dark:text-white flex-1 text-left">{manualSyncing ? 'Syncing...' : 'Sync to Cloud Now'}</span>
              <ChevronRight size={18} className="text-[#c7c7cc]" />
            </button>
          )}
        </div>
      </div>

      {/* Help */}
      <div>
        <p className="text-[13px] text-[#8e8e93] uppercase px-4 mb-[6px] font-medium">Help</p>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[10px] overflow-hidden px-4 py-3">
          <div className="flex gap-3">
            <HelpCircle size={20} className="text-[#007AFF] flex-shrink-0 mt-[2px]" />
            <ol className="text-[15px] text-black dark:text-white space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Sign in — cloud data auto-restores</li>
              <li>Every change auto-syncs to cloud</li>
              <li>Use Save Settings to update store details</li>
              <li>Use file backup for offline safety</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      {user && (
        <button
          onClick={() => setShowSignOut(true)}
          className="w-full bg-white dark:bg-[#1c1c1e] rounded-[10px] text-[#FF3B30] text-[17px] text-center py-[13px] active:bg-[#f2f2f7] dark:active:bg-[#2c2c2e] flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Sign Out
        </button>
      )}

      <ActionSheet
        open={showSignOut}
        title="Sign Out"
        message="All local data will be cleared. Your data is safe in the cloud."
        actions={[{ label: 'Sign Out', destructive: true, onClick: handleLogout }]}
        onCancel={() => setShowSignOut(false)}
      />

      <Toast message={toast} type={tt} />
    </div>
  );
}

function SettingInput({
  icon,
  placeholder,
  value,
  onChange,
  type,
  last,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  last?: boolean;
}) {
  return (
    <div className="flex items-center px-4 py-[7px]" style={!last ? { borderBottom: '0.5px solid var(--sep)' } : {}}>
      <span className="mr-3 flex-shrink-0">{icon}</span>
      <input
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-[17px] text-black dark:text-white placeholder:text-[#c7c7cc] bg-transparent outline-none py-[4px]"
      />
    </div>
  );
}
