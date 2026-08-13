import { useState, useEffect, createContext, useContext } from 'react';
import { TabId } from './types';
import TabBar from './components/TabBar';
import CreateBill from './components/CreateBill';
import Inventory from './components/Inventory';
import Template from './components/Template';
import SettingsPanel from './components/SettingsPanel';
import { onAuthChange, restoreFromCloud, type User } from './firebase';

// Auth context — available to all components
interface AuthCtx {
  user: User | null;
  restoring: boolean;
}
const AuthContext = createContext<AuthCtx>({ user: null, restoring: false });
export function useAuth() { return useContext(AuthContext); }

const titles: Record<TabId, string> = {
  create: 'Billing',
  inventory: 'Inventory',
  template: 'Template',
  settings: 'Settings',
};

export default function App() {
  const [tab, setTab] = useState<TabId>('create');
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Global auth listener — survives tab switches and page reloads
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setRestoring(true);
        try { await restoreFromCloud(u.uid); } catch {}
        finally { setRestoring(false); }
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, restoring }}>
      <div className="min-h-screen bg-[#f2f2f7] dark:bg-black transition-colors duration-300">
        <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] px-4 pb-2 bg-[#f2f2f7]/70 dark:bg-black/70 backdrop-blur-[40px] [-webkit-backdrop-filter:blur(40px)_saturate(200%)] border-b border-[#c6c6c8]/30 dark:border-[#38383a]/40">
          <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight pt-4">{titles[tab]}</h1>
        </header>

        <main className="px-4 pb-[100px] max-w-lg mx-auto pt-2">
          {tab === 'create' && <CreateBill />}
          {tab === 'inventory' && <Inventory />}
          {tab === 'template' && <Template />}
          {tab === 'settings' && <SettingsPanel />}
        </main>

        <TabBar active={tab} onChange={setTab} />
      </div>
    </AuthContext.Provider>
  );
}
