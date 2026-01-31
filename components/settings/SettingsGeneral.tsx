
import React, { useState } from 'react';
import { Clock, Sun, Moon, CalendarX, Palmtree, Settings, Plus, X, Users, ShoppingBag, Bike } from 'lucide-react';
import { DB, DayConfig, ServiceAvailability } from '../../types';

interface SettingsGeneralProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    showNotify: (msg: string) => void;
}

export function SettingsGeneral({ db, setDb, showNotify }: SettingsGeneralProps) {
    const [newClosure, setNewClosure] = useState('');

    const updateSchedule = (dayIndex: number, field: keyof DayConfig, value: any) => {
        setDb(prev => {
            const newWeek = [...prev.settings.weeklyConfig];
            newWeek[dayIndex] = { ...newWeek[dayIndex], [field]: value };
            return { ...prev, settings: { ...prev.settings, weeklyConfig: newWeek } };
        });
    };

    const updateService = (dayIndex: number, shift: 'services1' | 'services2', service: keyof ServiceAvailability) => {
        setDb(prev => {
            const newWeek = [...prev.settings.weeklyConfig];
            const currentServices = newWeek[dayIndex][shift];
            newWeek[dayIndex] = {
                ...newWeek[dayIndex],
                [shift]: {
                    ...currentServices,
                    [service]: !currentServices[service]
                }
            };
            return { ...prev, settings: { ...prev.settings, weeklyConfig: newWeek } };
        });
    };

    const updateHoliday = (field: 'holidayStart' | 'holidayEnd', value: string) => {
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, [field]: value }
        }));
    };

    const addClosure = () => {
        if (!newClosure) return;
        if (db.settings.extraordinaryClosures.includes(newClosure)) {
            showNotify("Data già inserita");
            return;
        }
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, extraordinaryClosures: [...prev.settings.extraordinaryClosures, newClosure] }
        }));
        setNewClosure('');
    };

    const removeClosure = (date: string) => {
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, extraordinaryClosures: prev.settings.extraordinaryClosures.filter(c => c !== date) }
        }));
    };

    return (
        <div className="space-y-8 pb-24">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><Clock size={28}/> Giorni e Orari di Apertura</h3>
                <div className="space-y-4">
                    {db.settings.weeklyConfig.map((day, idx) => (
                        <div key={day.day} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 items-center gap-6">
                            <div className="lg:col-span-2">
                                <div className="font-black text-lg uppercase">{day.day}</div>
                                <button 
                                onClick={() => updateSchedule(idx, 'enableShift1', !day.enableShift1 && !day.enableShift2 ? true : day.enableShift1)}
                                className={`text-[10px] font-black uppercase px-2 py-1 rounded mt-1 ${day.enableShift1 || day.enableShift2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                >
                                    {day.enableShift1 || day.enableShift2 ? 'Aperto' : 'Chiuso'}
                                </button>
                            </div>
                            <div className="lg:col-span-5 flex items-center gap-4">
                                <button onClick={() => updateSchedule(idx, 'enableShift1', !day.enableShift1)} className={`p-2 rounded-xl transition-all ${day.enableShift1 ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`} title="Turno Pranzo"><Sun size={20}/></button>
                                <div className="flex-1 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="time" disabled={!day.enableShift1} value={day.open1} onChange={e => updateSchedule(idx, 'open1', e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg border font-bold text-sm disabled:opacity-30"/>
                                        <input type="time" disabled={!day.enableShift1} value={day.close1} onChange={e => updateSchedule(idx, 'close1', e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg border font-bold text-sm disabled:opacity-30"/>
                                    </div>
                                    {day.enableShift1 && (
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <button onClick={() => updateService(idx, 'services1', 'table')} className={`p-1.5 rounded-lg transition-all ${day.services1?.table ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 line-through'}`} title="Tavoli"><Users size={14}/></button>
                                            <button onClick={() => updateService(idx, 'services1', 'takeaway')} className={`p-1.5 rounded-lg transition-all ${day.services1?.takeaway ? 'text-amber-600 bg-amber-50' : 'text-slate-300 line-through'}`} title="Asporto"><ShoppingBag size={14}/></button>
                                            <button onClick={() => updateService(idx, 'services1', 'delivery')} className={`p-1.5 rounded-lg transition-all ${day.services1?.delivery ? 'text-blue-600 bg-blue-50' : 'text-slate-300 line-through'}`} title="Consegna"><Bike size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="lg:col-span-5 flex items-center gap-4">
                                <button onClick={() => updateSchedule(idx, 'enableShift2', !day.enableShift2)} className={`p-2 rounded-xl transition-all ${day.enableShift2 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`} title="Turno Cena"><Moon size={20}/></button>
                                <div className="flex-1 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="time" disabled={!day.enableShift2} value={day.open2} onChange={e => updateSchedule(idx, 'open2', e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg border font-bold text-sm disabled:opacity-30"/>
                                        <input type="time" disabled={!day.enableShift2} value={day.close2} onChange={e => updateSchedule(idx, 'close2', e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg border font-bold text-sm disabled:opacity-30"/>
                                    </div>
                                    {day.enableShift2 && (
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <button onClick={() => updateService(idx, 'services2', 'table')} className={`p-1.5 rounded-lg transition-all ${day.services2?.table ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 line-through'}`} title="Tavoli"><Users size={14}/></button>
                                            <button onClick={() => updateService(idx, 'services2', 'takeaway')} className={`p-1.5 rounded-lg transition-all ${day.services2?.takeaway ? 'text-amber-600 bg-amber-50' : 'text-slate-300 line-through'}`} title="Asporto"><ShoppingBag size={14}/></button>
                                            <button onClick={() => updateService(idx, 'services2', 'delivery')} className={`p-1.5 rounded-lg transition-all ${day.services2?.delivery ? 'text-blue-600 bg-blue-50' : 'text-slate-300 line-through'}`} title="Consegna"><Bike size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#800020] uppercase italic tracking-tight"><Settings size={20}/> Parametri Operativi</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Durata Slot (minuti)</label>
                            <input type="number" value={db.settings.slotDuration} onChange={e => setDb({...db, settings: {...db.settings, slotDuration: parseInt(e.target.value)}})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020]"/>
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Capacità Slot (pizze contemporanee)</label>
                            <input type="number" value={db.settings.maxPizzePerSlot} onChange={e => setDb({...db, settings: {...db.settings, maxPizzePerSlot: parseInt(e.target.value)}})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#800020]"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700 space-y-8">
                    <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#800020] uppercase italic tracking-tight"><Palmtree size={20}/> Periodo Ferie Locali</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Inizio</label>
                            <input type="date" value={db.settings.holidayStart || ''} onChange={e => updateHoliday('holidayStart', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Fine</label>
                            <input type="date" value={db.settings.holidayEnd || ''} onChange={e => updateHoliday('holidayEnd', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                    </div>
                    </div>
                    <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#800020] uppercase italic tracking-tight"><CalendarX size={20}/> Chiusure Singole</h3>
                    <div className="flex gap-2 mb-4">
                        <input type="date" value={newClosure} onChange={e => setNewClosure(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold border outline-none"/>
                        <button onClick={addClosure} className="p-3 bg-[#800020] text-white rounded-xl shadow-lg hover:bg-black transition-colors"><Plus/></button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {db.settings.extraordinaryClosures.map(date => (
                            <div key={date} className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2">
                                {new Date(date).toLocaleDateString()}
                                <button onClick={() => removeClosure(date)} className="text-red-500 hover:scale-110 transition-transform"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
