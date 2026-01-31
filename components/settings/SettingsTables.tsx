
import React, { useState } from 'react';
import { Users, Clock, Calendar, Timer, Hourglass, X, Coins } from 'lucide-react';
import { DB, TableConfig } from '../../types';

interface SettingsTablesProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    showNotify: (msg: string) => void;
}

export function SettingsTables({ db, setDb, showNotify }: SettingsTablesProps) {
    const [newTurn, setNewTurn] = useState('');

    const updateTableConfig = (field: keyof TableConfig, value: any) => {
        setDb(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                tableConfig: { ...prev.settings.tableConfig, [field]: value }
            }
        }));
    };

    const addFixedTurn = () => {
        if(!newTurn) return;
        if(db.settings.tableConfig.fixedTurns.includes(newTurn)) return;
        const newTurns = [...db.settings.tableConfig.fixedTurns, newTurn].sort();
        updateTableConfig('fixedTurns', newTurns);
        setNewTurn('');
    };

    const removeFixedTurn = (turn: string) => {
        const newTurns = db.settings.tableConfig.fixedTurns.filter(t => t !== turn);
        updateTableConfig('fixedTurns', newTurns);
    };

    return (
        <div className="pb-24 max-w-5xl space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><Users size={28}/> Logica di Prenotazione</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { id: 'libero', icon: <Clock size={24}/>, title: 'Modalità Libera', desc: 'Il cliente prenota in qualsiasi orario disponibile secondo gli slot della cucina.' },
                        { id: 'turni', icon: <Calendar size={24}/>, title: 'Modalità a Turni', desc: 'Orari fissi predefiniti (es. 19:30, 21:30). Il cliente vede solo questi.' },
                        { id: 'durata', icon: <Timer size={24}/>, title: 'Modalità a Durata', desc: 'Slot liberi ma con tempo limitato. Il cliente vede l\'orario di rilascio.' }
                    ].map(m => (
                        <button 
                        key={m.id} 
                        onClick={() => updateTableConfig('mode', m.id)}
                        className={`p-6 rounded-3xl border-2 text-left transition-all flex flex-col gap-3 ${db.settings.tableConfig.mode === m.id ? 'border-[#800020] bg-[#800020] text-white shadow-xl scale-[1.02]' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                        >
                            <div className={`p-3 rounded-2xl w-fit ${db.settings.tableConfig.mode === m.id ? 'bg-white/20' : 'bg-white shadow-sm'}`}>{m.icon}</div>
                            <div>
                                <h4 className="font-bold text-lg">{m.title}</h4>
                                <p className="text-xs opacity-70 mt-1 leading-relaxed">{m.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* ANTICIPO MASSIMO PRENOTAZIONE */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-in fade-in">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Hourglass size={20}/> Limite Prenotazione</h4>
                        <div className="flex items-center gap-4">
                            <input 
                            type="number" 
                            value={db.settings.tableConfig.maxFutureDays || 60} 
                            onChange={e => updateTableConfig('maxFutureDays', parseInt(e.target.value))} 
                            className="w-24 p-4 rounded-xl border bg-white font-black text-2xl outline-none focus:ring-2 focus:ring-[#800020] text-center"
                            />
                            <div>
                                <span className="font-bold text-slate-500 block">Anticipo massimo (giorni)</span>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Finestra temporale di prenotazione.</p>
                            </div>
                        </div>
                    </div>

                    {/* COSTO COPERTO */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-in fade-in">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Coins size={20}/> Costo Servizio</h4>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                                <input 
                                    type="number" 
                                    step="0.50"
                                    value={db.settings.tableConfig.coverCharge} 
                                    onChange={e => updateTableConfig('coverCharge', parseFloat(e.target.value))} 
                                    className="w-32 p-4 pl-8 rounded-xl border bg-white font-black text-2xl outline-none focus:ring-2 focus:ring-[#800020] text-center"
                                />
                            </div>
                            <div>
                                <span className="font-bold text-slate-500 block">Prezzo Coperto</span>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Applicato per ogni persona al tavolo.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONFIGURAZIONE TURNI */}
                {db.settings.tableConfig.mode === 'turni' && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-in fade-in">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20}/> Configurazione Turni Fissi</h4>
                        <div className="flex gap-4 mb-4">
                            <input type="time" value={newTurn} onChange={e => setNewTurn(e.target.value)} className="p-3 rounded-xl border bg-white font-bold text-lg outline-none focus:ring-2 focus:ring-[#800020]"/>
                            <button onClick={addFixedTurn} className="px-6 bg-[#800020] text-white font-bold rounded-xl shadow-lg hover:bg-black transition-colors">AGGIUNGI ORARIO</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {db.settings.tableConfig.fixedTurns.map(turn => (
                                <div key={turn} className="bg-white border px-4 py-2 rounded-xl font-black text-lg flex items-center gap-3 shadow-sm">
                                    {turn}
                                    <button onClick={() => removeFixedTurn(turn)} className="text-red-500 hover:bg-red-50 rounded-full p-1"><X size={16}/></button>
                                </div>
                            ))}
                            {db.settings.tableConfig.fixedTurns.length === 0 && <span className="text-slate-400 italic text-sm">Nessun turno definito. Aggiungine uno.</span>}
                        </div>
                    </div>
                )}

                {/* CONFIGURAZIONE DURATA */}
                {db.settings.tableConfig.mode === 'durata' && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-in fade-in mt-6">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Timer size={20}/> Durata Permanenza</h4>
                        <div className="flex items-center gap-4">
                            <input 
                            type="number" 
                            value={db.settings.tableConfig.stayDuration} 
                            onChange={e => updateTableConfig('stayDuration', parseInt(e.target.value))} 
                            className="w-24 p-4 rounded-xl border bg-white font-black text-2xl outline-none focus:ring-2 focus:ring-[#800020] text-center"
                            />
                            <span className="font-bold text-slate-500">Minuti di occupazione tavolo</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Questo valore verrà usato per calcolare l'orario di rilascio del tavolo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
