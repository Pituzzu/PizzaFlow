
import React from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { DB, WhatsAppConfig } from '../../types';

interface SettingsNotificationsProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    showNotify: (msg: string) => void;
}

export function SettingsNotifications({ db, setDb, showNotify }: SettingsNotificationsProps) {
    const config = db.settings.whatsappConfig;

    const updateConfig = (field: keyof WhatsAppConfig, value: any) => {
        setDb(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                whatsappConfig: { ...prev.settings.whatsappConfig, [field]: value }
            }
        }));
    };

    return (
        <div className="space-y-8 pb-24 max-w-5xl">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <h3 className="text-2xl font-black italic flex items-center gap-3 text-[#800020] uppercase tracking-tight">
                        <MessageCircle size={28}/> Template Messaggi WhatsApp
                    </h3>
                    
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Integrazione</span>
                            <span className={`font-bold ${config.enabled ? 'text-green-600' : 'text-slate-400'}`}>
                                {config.enabled ? 'ATTIVA' : 'DISATTIVA'}
                            </span>
                        </div>
                        <button 
                            onClick={() => {
                                updateConfig('enabled', !config.enabled);
                                showNotify(config.enabled ? "Integrazione disattivata" : "Integrazione attivata");
                            }}
                            className={`w-14 h-8 rounded-full p-1 transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${config.enabled ? 'translate-x-6' : ''}`}></div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* SEZIONE TAVOLI */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 p-3 rounded-xl w-fit">
                            <span className="font-black uppercase text-xs tracking-widest">Prenotazioni Tavolo</span>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-2">Conferma Prenotazione</label>
                            <textarea 
                                value={config.tableAccept}
                                onChange={e => updateConfig('tableAccept', e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020] min-h-[140px] text-sm leading-relaxed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-2">Rifiuto Prenotazione</label>
                            <textarea 
                                value={config.tableReject}
                                onChange={e => updateConfig('tableReject', e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020] min-h-[140px] text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* SEZIONE ORDINI */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-xl w-fit">
                            <span className="font-black uppercase text-xs tracking-widest">Asporto & Delivery</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-2">Conferma Ordine</label>
                            <textarea 
                                value={config.foodAccept}
                                onChange={e => updateConfig('foodAccept', e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020] min-h-[140px] text-sm leading-relaxed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-2">Rifiuto Ordine</label>
                            <textarea 
                                value={config.foodReject}
                                onChange={e => updateConfig('foodReject', e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020] min-h-[140px] text-sm leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                        <AlertCircle size={16}/> Variabili Dinamiche
                    </h4>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { tag: '{nome}', desc: 'Nome Cliente' },
                            { tag: '{data}', desc: 'Data (gg/mm/aaaa)' },
                            { tag: '{ora}', desc: 'Orario' },
                            { tag: '{pax}', desc: 'N. Persone' },
                            { tag: '{ordine}', desc: 'Lista Piatti' },
                            { tag: '{totale}', desc: 'Importo €' }
                        ].map(v => (
                            <div key={v.tag} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl text-xs border border-blue-200 dark:border-blue-800 shadow-sm flex items-center gap-2">
                                <span className="font-mono font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-1 rounded">{v.tag}</span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium">{v.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
