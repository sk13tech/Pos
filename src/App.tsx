import { useState } from 'react';
import { TabId } from './types';
import TabBar from './components/TabBar';
import CreateBill from './components/CreateBill';
import Inventory from './components/Inventory';
import Template from './components/Template';
import SettingsPanel from './components/SettingsPanel';

const titles: Record<TabId, string> = {
  create: 'Billing',
  inventory: 'Inventory',
  template: 'Template',
  settings: 'Settings',
};

export default function App() {
  const [tab, setTab] = useState<TabId>('create');

  return (
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-black transition-colors duration-300">
      {/* Sticky blurred header */}
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
  );
}
