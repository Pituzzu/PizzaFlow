
import React from 'react';
import { 
  ShieldCheck, Lock, ToggleLeft, ToggleRight, 
  Users, ShoppingBag, Bike, Settings, TrendingUp
} from 'lucide-react';
import { DB, SystemConfig } from '../types';

interface MasterConfigTabProps {
  db: DB;
  setDb: React.Dispatch<React.SetStateAction<DB>>;
  showNotify: (msg: string) => void;
}

export function MasterConfigTab({ db, setDb, showNotify }: MasterConfigTabProps) {
  const config = db.settings.systemConfig;

  const updateConfig = (key: keyof SystemConfig, value: boolean) => {
    setDb(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        systemConfig: {
          ...prev.settings.systemConfig,
          [key]: value
        }
      }
    }));
    showNotify("Impostazione Master aggiornata");
  };

  const ConfigToggle = ({ 
    icon, 
    label, 
    value, 
    onToggle 
  }: { 
    icon: any, 
    label: string, 
    value: boolean, 
    onToggle: (v: boolean) => void 
  }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${value ? 'bg-[#800020] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <button 
        onClick={() => onToggle(!value)}
        className={`transition-colors ${value ? 'text-[#800020]' : 'text-slate-300'}`}
      >
        {value ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl">
      <div className="bg-gradient-to-br from-[#800020] to-[#500010] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <ShieldCheck className="absolute top-[-20px] right-[-20px] size-64 opacity-10 rotate-12" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Master Control</h2>
          <p className="text-white/70 font-medium max-w-md leading-relaxed">
            Gestione centralizzata dei moduli di sistema e della sicurezza avanzata per l'infrastruttura di rete.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SEZIONE SICUREZZA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Lock size={16} className="text-[#800020]" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sicurezza Sistema</h3>
          </div>
          <ConfigToggle 
            icon={<Lock />}
            label="Autenticazione 2FA"
            value={config.enable2FA}
            onToggle={(v) => updateConfig('enable2FA', v)}
          />
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed italic">
            * Se attiva, i login da nuovi dispositivi richiederanno una verifica via codice numerico inviato alla mail dell'utente.
          </div>
        </div>

        {/* SEZIONE MODULI */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Settings size={16} className="text-[#800020]" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Moduli Licenza</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <ConfigToggle 
              icon={<Users />}
              label="Modulo Sala & Tavoli"
              value={config.moduleTables}
              onToggle={(v) => updateConfig('moduleTables', v)}
            />
            <ConfigToggle 
              icon={<ShoppingBag />}
              label="Servizio Asporto"
              value={config.moduleTakeaway}
              onToggle={(v) => updateConfig('moduleTakeaway', v)}
            />
            <ConfigToggle 
              icon={<Bike />}
              label="Consegna a Domicilio"
              value={config.moduleDelivery}
              onToggle={(v) => updateConfig('moduleDelivery', v)}
            />
            <ConfigToggle 
              icon={<TrendingUp />}
              label="Analisi & Statistiche"
              value={config.moduleStats}
              onToggle={(v) => updateConfig('moduleStats', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
