
import React, { useState } from 'react';
import { 
  Settings, Users, MessageCircle, Pizza, Globe, User as UserIcon
} from 'lucide-react';
import { DB } from '../types';
import { SettingsGeneral } from './settings/SettingsGeneral';
import { SettingsMenu } from './settings/SettingsMenu';
import { SettingsTables } from './settings/SettingsTables';
import { SettingsUsers } from './settings/SettingsUsers';
import { SettingsSite } from './settings/SettingsSite';
import { SettingsNotifications } from './settings/SettingsNotifications';

interface SettingsTabProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    onDeleteUser: (id: string) => void;
    showNotify: (msg: string) => void;
}

export function SettingsTab({ db, setDb, onDeleteUser, showNotify }: SettingsTabProps) {
    const [tab, setTab] = useState<'generale' | 'notifiche' | 'menu' | 'sito' | 'utenti' | 'tavoli'>('generale');

    return (
        <div className="animate-in fade-in space-y-6">
             <div className="flex items-center gap-4 border-b dark:border-slate-700 pb-4 overflow-x-auto no-scrollbar">
                 {[
                     { id: 'generale', icon: <Settings size={18}/> },
                     { id: 'tavoli', icon: <Users size={18}/> },
                     { id: 'notifiche', icon: <MessageCircle size={18}/> },
                     { id: 'menu', icon: <Pizza size={18}/> },
                     { id: 'sito', icon: <Globe size={18}/> },
                     { id: 'utenti', icon: <UserIcon size={18}/> }
                 ].map(t => (
                     <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-6 py-3 rounded-xl font-bold capitalize whitespace-nowrap transition-all flex items-center gap-2 ${tab === t.id ? 'bg-[#800020] text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                         {t.icon} {t.id}
                     </button>
                 ))}
             </div>

             {tab === 'generale' && <SettingsGeneral db={db} setDb={setDb} showNotify={showNotify} />}
             {tab === 'tavoli' && <SettingsTables db={db} setDb={setDb} showNotify={showNotify} />}
             {tab === 'menu' && <SettingsMenu db={db} setDb={setDb} showNotify={showNotify} />}
             {tab === 'utenti' && <SettingsUsers db={db} setDb={setDb} onDeleteUser={onDeleteUser} showNotify={showNotify} />}
             {tab === 'sito' && <SettingsSite db={db} setDb={setDb} />}
             {tab === 'notifiche' && <SettingsNotifications db={db} setDb={setDb} showNotify={showNotify} />}
        </div>
    );
}
