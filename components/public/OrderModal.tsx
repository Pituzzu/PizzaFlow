
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, ChevronRight, Minus, Plus, ShoppingBag, Users, Bike, 
  MapPin, Clock, ChevronDown, CheckCircle, Info, Pizza, Layers, Check
} from 'lucide-react';
import { DB, OrderItem, MenuItem, OrderType, SelectedExtra, Category, Ingredient } from '../../types';
import { SlotSelector, generateSmartSlots, getDayName, getShiftFromTime, CustomCalendar, groupCartItems } from '../Shared';

interface OrderModalProps {
    db: DB;
    orderType: OrderType | 'choose';
    setOrderType: (t: OrderType | 'choose' | null) => void;
    cart: OrderItem[];
    setCart: React.Dispatch<React.SetStateAction<OrderItem[]>>;
    onSubmit: (formData: any) => void;
    showNotify: (msg: string) => void;
    onClose: () => void;
}

export function OrderModal({ db, orderType, setOrderType, cart, setCart, onSubmit, showNotify, onClose }: OrderModalProps) {
    const [step, setStep] = useState(1); // 1 = Menu/Select, 2 = Form Data
    const [menuCat, setMenuCat] = useState<Category>('Pizze');
    const [configuringItem, setConfiguringItem] = useState<{item: MenuItem, extras: string[], removed: string[]} | null>(null);
    
    // Form State initialized with empty strings to prevent undefined
    const [form, setForm] = useState({ 
        name: '', phone: '', street: '', civic: '', city: 'Enna', extra: '', 
        date: new Date().toISOString().split('T')[0], time: '', pax: 2, notes: '' 
    });
    const [phonePrefix, setPhonePrefix] = useState('+39');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const { systemConfig, siteConfig } = db.settings;
    const categories = db.settings.categoryOrder || ['Pizze', 'Cucina', 'Bevande', 'Dessert'];
    const today = new Date().toISOString().split('T')[0];
    const targetDate = orderType === 'tavolo' ? form.date : today;

    // --- Helpers ---
    const getDayConfig = (date: string) => db.settings.weeklyConfig.find(d => d.day === getDayName(date));
    
    const isServiceAvailableToday = (type: OrderType) => {
        const d = getDayConfig(today);
        if (!d) return false;
        let key: any = type === 'asporto' ? 'takeaway' : 'delivery';
        return (d.enableShift1 && (!d.services1 || d.services1[key])) || (d.enableShift2 && (!d.services2 || d.services2[key]));
    };

    const slots = useMemo(() => {
        const rawSlots = generateSmartSlots(targetDate, db.settings);
        const dayConfig = getDayConfig(targetDate);
        if (!dayConfig || !orderType || orderType === 'choose') return rawSlots;

        let tableSlots = rawSlots;
        if (orderType === 'tavolo' && db.settings.tableConfig.mode === 'turni') {
            tableSlots = (db.settings.tableConfig.fixedTurns || []).filter(turn => rawSlots.includes(turn));
        }

        return tableSlots.filter(time => {
            const shift = getShiftFromTime(time);
            const services = shift === 'pranzo' ? dayConfig.services1 : dayConfig.services2;
            let serviceKey: any = orderType === 'asporto' ? 'takeaway' : orderType === 'consegna' ? 'delivery' : 'table';
            return services ? services[serviceKey] : true; 
        });
    }, [targetDate, db.settings, orderType]);

    // --- Cart Logic ---
    const addToCart = (item: MenuItem, extraIds: string[], removedIds: string[]) => {
        const selectedExtras: SelectedExtra[] = [];
        let totalPrice = item.price;
        extraIds.forEach(eid => {
            const def = db.settings.globalExtras.find(e => e.id === eid);
            if(def) { selectedExtras.push({ ...def }); totalPrice += def.price; }
        });

        setCart(prev => [...prev, {
            ...item, id: Math.random().toString(), status: 'new', menuId: item.id,
            price: totalPrice, selectedExtras, removedIngredientIds: removedIds
        }]);
        setConfiguringItem(null);
        showNotify("Aggiunto al carrello");
    };

    const handleItemClick = (item: MenuItem) => {
        if ((item.allowedExtraIds?.length || 0) > 0 || (item.defaultIngredientIds?.length || 0) > 0) {
            setConfiguringItem({ item, extras: [], removed: [] });
        } else {
            addToCart(item, [], []);
        }
    };

    const cartTotal = cart.reduce((a, b) => a + b.price, 0);
    const cartCount = cart.length;

    // --- Submit Logic con Sanitizzazione ---
    const handleSubmit = () => {
        const newErrors: Record<string, boolean> = {};
        if (!form.name.trim()) newErrors.name = true;
        if (!phoneNumber.trim()) newErrors.phone = true;
        if (!form.time) newErrors.time = true;
        if (orderType === 'consegna' && (!form.street.trim() || !form.civic.trim())) {
            newErrors.street = true; newErrors.civic = true;
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showNotify("Compila i campi obbligatori");
            return;
        }

        const fullPhone = `${phonePrefix} ${phoneNumber.replace(/[^0-9]/g, '')}`;
        
        // Creazione oggetto pulito per Firestore
        const finalForm = {
            name: form.name.trim(),
            phone: fullPhone,
            street: form.street.trim() || "",
            civic: form.civic.trim() || "",
            city: form.city || "Enna",
            extra: form.extra.trim() || "",
            date: targetDate,
            time: form.time,
            pax: orderType === 'tavolo' ? (form.pax || 0) : 0,
            notes: form.notes.trim() || ""
        };

        onSubmit(finalForm);
    };

    // --- RENDERERS ---

    if (orderType === 'choose') {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
                <div className="bg-[#fafaf9] w-full md:max-w-2xl rounded-t-[40px] md:rounded-[40px] shadow-2xl p-8 flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-center">
                        <h2 className="font-serif text-3xl font-black italic text-[#1c1917]">Scegli Servizio</h2>
                        <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full"><X/></button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {systemConfig.moduleTakeaway && (
                            <button disabled={!isServiceAvailableToday('asporto')} onClick={() => setOrderType('asporto')} className="p-6 bg-white rounded-[32px] shadow-sm border-2 border-transparent hover:border-[#800020] text-left flex items-center gap-6 transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                                <div className="bg-stone-100 p-4 rounded-2xl text-[#1c1917] group-hover:bg-[#800020] group-hover:text-white transition-colors"><ShoppingBag size={32}/></div>
                                <div><h3 className="font-black text-xl">Asporto</h3><p className="text-stone-500 text-sm">Ritira al locale</p></div>
                            </button>
                        )}
                        {systemConfig.moduleDelivery && (
                            <button disabled={!isServiceAvailableToday('consegna')} onClick={() => setOrderType('consegna')} className="p-6 bg-white rounded-[32px] shadow-sm border-2 border-transparent hover:border-[#800020] text-left flex items-center gap-6 transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                                <div className="bg-stone-100 p-4 rounded-2xl text-[#1c1917] group-hover:bg-[#800020] group-hover:text-white transition-colors"><Bike size={32}/></div>
                                <div><h3 className="font-black text-xl">Domicilio</h3><p className="text-stone-500 text-sm">Consegna a casa tua</p></div>
                            </button>
                        )}
                        {systemConfig.moduleTables && (
                            <button onClick={() => setOrderType('tavolo')} className="p-6 bg-white rounded-[32px] shadow-sm border-2 border-transparent hover:border-[#800020] text-left flex items-center gap-6 transition-all group active:scale-95">
                                <div className="bg-stone-100 p-4 rounded-2xl text-[#1c1917] group-hover:bg-[#800020] group-hover:text-white transition-colors"><Users size={32}/></div>
                                <div><h3 className="font-black text-xl">Prenota Tavolo</h3><p className="text-stone-500 text-sm">Pranzo o Cena in sala</p></div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 font-sans animate-in fade-in">
            
            {configuringItem && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
                    <div className="bg-white w-full md:max-w-lg rounded-t-[40px] md:rounded-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-serif text-2xl font-black italic">{configuringItem.item.name}</h3>
                                <p className="text-stone-400 text-sm font-bold uppercase tracking-widest">Personalizza</p>
                            </div>
                            <button onClick={() => setConfiguringItem(null)} className="p-2 hover:bg-stone-100 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pb-6">
                            {configuringItem.item.defaultIngredientIds?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black uppercase text-stone-400 mb-3 flex items-center gap-2"><Minus size={14}/> Ingredienti Base</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {configuringItem.item.defaultIngredientIds.map(id => {
                                            const ing = db.settings.globalIngredients.find(i => i.id === id);
                                            if(!ing) return null;
                                            const removed = configuringItem.removed.includes(id);
                                            return (
                                                <button key={id} onClick={() => setConfiguringItem({...configuringItem, removed: removed ? configuringItem.removed.filter(r => r !== id) : [...configuringItem.removed, id]})} 
                                                    className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${removed ? 'border-red-200 bg-red-50 text-red-400 line-through' : 'border-stone-200 text-stone-600'}`}>
                                                    {ing.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            {configuringItem.item.allowedExtraIds?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black uppercase text-stone-400 mb-3 flex items-center gap-2"><Plus size={14}/> Aggiungi Extra</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {configuringItem.item.allowedExtraIds.map(id => {
                                            const ex = db.settings.globalExtras.find(e => e.id === id);
                                            if(!ex) return null;
                                            const selected = configuringItem.extras.includes(id);
                                            return (
                                                <button key={id} onClick={() => setConfiguringItem({...configuringItem, extras: selected ? configuringItem.extras.filter(e => e !== id) : [...configuringItem.extras, id]})}
                                                    className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${selected ? 'border-[#800020] bg-[#800020] text-white shadow-lg' : 'border-stone-100 bg-stone-50 text-stone-600'}`}>
                                                    <span className="font-bold">{ex.name}</span>
                                                    <span className="font-medium opacity-80">+€{ex.price.toFixed(2)}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => addToCart(configuringItem.item, configuringItem.extras, configuringItem.removed)} className="w-full py-4 bg-[#1c1917] text-white font-black rounded-[24px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                            Aggiungi al Carrello
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-[#fafaf9] w-full md:max-w-4xl h-[95vh] md:h-[85vh] rounded-t-[40px] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* HEADER */}
                <div className="p-6 bg-white/80 backdrop-blur-md border-b border-stone-200 flex justify-between items-center shrink-0 z-10 sticky top-0">
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><X/></button>
                    <h3 className="font-serif text-2xl font-black italic uppercase text-[#1c1917]">
                        {orderType === 'tavolo' ? 'Prenota Tavolo' : step === 1 ? 'Il Nostro Menu' : 'Completa Ordine'}
                    </h3>
                    <div className="w-10"></div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    
                    {orderType === 'tavolo' && (
                        <div className="p-6 md:p-10 max-w-xl mx-auto space-y-8">
                            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 space-y-6">
                                <div className="flex flex-col items-center">
                                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-4">Ospiti</label>
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => setForm({...form, pax: Math.max(1, form.pax-1)})} className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center hover:bg-[#800020] hover:text-white transition-colors"><Minus/></button>
                                        <span className="font-serif text-5xl font-black">{form.pax}</span>
                                        <button onClick={() => setForm({...form, pax: Math.min(20, form.pax+1)})} className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center hover:bg-[#800020] hover:text-white transition-colors"><Plus/></button>
                                    </div>
                                </div>
                                <CustomCalendar selectedDate={form.date} onSelect={(d) => setForm({...form, date: d, time: ''})} settings={db.settings} orderType="tavolo"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest block mb-4 ml-4">Orario</label>
                                <SlotSelector slots={slots} orders={db.orders} date={targetDate} selected={form.time} onSelect={(t: string) => { setForm({...form, time: t}); setErrors(prev => ({...prev, time: false})); }} maxCapacity={db.settings.maxPizzePerSlot} allowOverbooking={false} orderType="tavolo" pax={form.pax} db={db} isPublic={true}/>
                                {errors.time && <p className="text-red-500 text-xs font-bold mt-2 text-center animate-pulse">Seleziona un orario</p>}
                            </div>
                            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 space-y-4">
                                <input value={form.name} onChange={e => {setForm({...form, name: e.target.value}); setErrors(prev => ({...prev, name: false}))}} placeholder="Nome Completo" className={`w-full p-4 bg-stone-50 rounded-2xl font-bold outline-none border-2 transition-all ${errors.name ? 'border-red-500' : 'border-transparent focus:border-[#800020]'}`}/>
                                <div className="flex gap-2">
                                    <select value={phonePrefix} onChange={e => setPhonePrefix(e.target.value)} className="bg-stone-50 rounded-2xl px-4 font-bold outline-none"><option>+39</option><option>+33</option></select>
                                    <input value={phoneNumber} onChange={e => {setPhoneNumber(e.target.value); setErrors(prev => ({...prev, phone: false}))}} placeholder="Cellulare" type="tel" className={`flex-1 p-4 bg-stone-50 rounded-2xl font-bold outline-none border-2 transition-all ${errors.phone ? 'border-red-500' : 'border-transparent focus:border-[#800020]'}`}/>
                                </div>
                                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Richieste particolari..." className="w-full p-4 bg-stone-50 rounded-2xl font-medium outline-none border-2 border-transparent focus:border-[#800020]" rows={2}/>
                            </div>
                            <button onClick={handleSubmit} className="w-full py-6 bg-[#1c1917] text-white font-black rounded-[32px] text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all">CONFERMA PRENOTAZIONE</button>
                        </div>
                    )}

                    {orderType !== 'tavolo' && step === 1 && (
                        <div className="pb-32">
                            <div className="sticky top-0 bg-[#fafaf9]/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                                {categories.map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setMenuCat(cat as any)}
                                        className={`px-5 py-2.5 rounded-full text-sm font-black whitespace-nowrap transition-all ${menuCat === cat ? 'bg-[#800020] text-white shadow-lg scale-105' : 'bg-white text-stone-400 border border-stone-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {db.menu.filter(i => i.category === menuCat && i.visible).map(item => (
                                    <div key={item.id} onClick={() => handleItemClick(item)} className="bg-white p-4 rounded-[28px] shadow-sm border border-stone-100 flex gap-4 cursor-pointer hover:border-[#800020] transition-all active:scale-95 group relative overflow-hidden">
                                        <div className="w-24 h-24 rounded-2xl bg-stone-100 overflow-hidden shrink-0">
                                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name}/> : <Pizza className="w-full h-full p-6 text-stone-300"/>}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center">
                                            <h4 className="font-bold text-lg leading-tight mb-1">{item.name}</h4>
                                            <p className="text-xs text-stone-400 line-clamp-2 mb-2">{item.description}</p>
                                            <div className="font-black text-[#800020]">€{item.price.toFixed(2)}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-[#1c1917] group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                            <Plus size={18}/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {orderType !== 'tavolo' && step === 2 && (
                        <div className="p-6 md:p-10 max-w-xl mx-auto space-y-8">
                            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100">
                                <h4 className="font-bold text-lg mb-4">Carrello ({cartCount})</h4>
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {groupCartItems(cart, db.settings.globalIngredients).map(item => (
                                        <div key={item._signature} className="flex justify-between items-start text-sm">
                                            <div>
                                                <div className="font-bold">{item.count}x {item.name}</div>
                                                <div className="text-stone-400 text-xs">
                                                    {item.selectedExtras?.map(e => `+${e.name} `)}
                                                    {item.removedIngredientIds?.length > 0 && <span className="text-red-400">Modificato</span>}
                                                </div>
                                            </div>
                                            <div className="font-black">€{(item.price * item.count).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t mt-4 pt-4 flex justify-between items-center text-xl font-black">
                                    <span>Totale</span>
                                    <span>€{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 space-y-4">
                                <h4 className="font-bold text-lg mb-2">I Tuoi Dati</h4>
                                <input value={form.name} onChange={e => {setForm({...form, name: e.target.value}); setErrors(prev => ({...prev, name: false}))}} placeholder="Nome Completo" className={`w-full p-4 bg-stone-50 rounded-2xl font-bold outline-none border-2 transition-all ${errors.name ? 'border-red-500' : 'border-transparent focus:border-[#800020]'}`}/>
                                <div className="flex gap-2">
                                    <select value={phonePrefix} onChange={e => setPhonePrefix(e.target.value)} className="bg-stone-50 rounded-2xl px-4 font-bold outline-none"><option>+39</option><option>+33</option></select>
                                    <input value={phoneNumber} onChange={e => {setPhoneNumber(e.target.value); setErrors(prev => ({...prev, phone: false}))}} placeholder="Cellulare" type="tel" className={`flex-1 p-4 bg-stone-50 rounded-2xl font-bold outline-none border-2 transition-all ${errors.phone ? 'border-red-500' : 'border-transparent focus:border-[#800020]'}`}/>
                                </div>
                                {orderType === 'consegna' && (
                                    <div className="space-y-2 p-4 bg-stone-50 rounded-2xl border-2 border-stone-100">
                                        <div className="flex gap-2">
                                            <input value={form.street} onChange={e => setForm({...form, street: e.target.value})} placeholder="Via/Piazza" className={`flex-[3] p-3 bg-white rounded-xl font-bold outline-none border ${errors.street ? 'border-red-500' : 'border-stone-200'}`}/>
                                            <input value={form.civic} onChange={e => setForm({...form, civic: e.target.value})} placeholder="N." className={`flex-1 p-3 bg-white rounded-xl font-bold outline-none border ${errors.civic ? 'border-red-500' : 'border-stone-200'}`}/>
                                        </div>
                                        <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Città" className="w-full p-3 bg-white rounded-xl font-bold outline-none border border-stone-200"/>
                                    </div>
                                )}
                                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Allergie o note per il rider..." className="w-full p-4 bg-stone-50 rounded-2xl font-medium outline-none border-2 border-transparent focus:border-[#800020]" rows={2}/>
                            </div>

                            <div>
                                <h4 className="font-bold text-lg mb-4 ml-2">Orario Ritiro/Consegna</h4>
                                <SlotSelector slots={slots} orders={db.orders} date={targetDate} selected={form.time} onSelect={(t: string) => { setForm({...form, time: t}); setErrors(prev => ({...prev, time: false})); }} maxCapacity={db.settings.maxPizzePerSlot} allowOverbooking={false} orderType={orderType} pax={form.pax} db={db} isPublic={true}/>
                                {errors.time && <p className="text-red-500 text-xs font-bold mt-2 text-center animate-pulse">Seleziona un orario</p>}
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="px-6 py-4 rounded-[24px] bg-stone-200 font-bold text-stone-600">Indietro</button>
                                <button onClick={handleSubmit} className="flex-1 py-4 bg-[#1c1917] text-white font-black rounded-[24px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">INVIA ORDINE</button>
                            </div>
                        </div>
                    )}
                </div>

                {orderType !== 'tavolo' && step === 1 && cartCount > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                        <div className="pointer-events-auto bg-[#1c1917] text-white p-4 rounded-[28px] shadow-2xl flex justify-between items-center cursor-pointer active:scale-95 transition-transform" onClick={() => setStep(2)}>
                            <div className="flex items-center gap-3">
                                <div className="bg-[#800020] w-10 h-10 rounded-full flex items-center justify-center font-black text-sm">{cartCount}</div>
                                <div className="flex flex-col">
                                    <span className="font-black text-lg">€{cartTotal.toFixed(2)}</span>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Visualizza Carrello</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest">
                                Vai alla cassa <ChevronRight size={18}/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
