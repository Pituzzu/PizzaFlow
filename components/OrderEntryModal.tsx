
import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, Lock, Trash2, Banknote, AlertTriangle, Map as MapIcon, Flame, ShoppingBag, Users, Bike, Check, Sparkles, Layers, Plus, Minus
} from 'lucide-react';
import { DB, OrderItem, MenuItem, Category, OrderType, Order, SelectedExtra } from '../types';
import { SlotSelector, generateSmartSlots, getSlotLoad, checkTableConflict, CustomCalendar, checkDateStatus, getAvailableTables, groupCartItems } from './Shared';

const DEFAULT_TABLE_DURATION = 90;

interface OrderEntryModalProps {
  manualMode: OrderType;
  editingId: string | null;
  manualForm: any;
  setManualForm: (f: any) => void;
  manualCart: OrderItem[];
  setManualCart: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  db: DB;
  setDb: React.Dispatch<React.SetStateAction<DB>>;
  closeModal: () => void;
  handleManualSubmit: (force?: boolean) => void;
  viewDate: string;
  viewShift: 'pranzo' | 'cena';
  showOverbookingConfirm: boolean;
  setShowOverbookingConfirm: (show: boolean) => void;
  errors?: Record<string, boolean>;
  clearError?: (field: string) => void;
}

export function OrderEntryModal({
  manualMode,
  editingId,
  manualForm,
  setManualForm,
  manualCart,
  setManualCart,
  db,
  closeModal,
  handleManualSubmit,
  viewDate,
  viewShift,
  showOverbookingConfirm,
  setShowOverbookingConfirm,
  errors = {},
  clearError = () => {}
}: OrderEntryModalProps) {
  
  const [step, setStep] = useState(1);
  const [menuCat, setMenuCat] = useState<Category>('Pizze');
  const [itemConfiguring, setItemConfiguring] = useState<{item: MenuItem, extras: string[], removed: string[]} | null>(null);

  const categories = db.settings.categoryOrder || ['Pizze', 'Cucina', 'Bevande', 'Dessert'];

  // --- GESTIONE TAVOLI UNITI ---
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  
  // Inizializza gli ID selezionati se siamo in edit
  useEffect(() => {
      if (manualMode === 'tavolo' && manualForm.tableId) {
          const existingIds = manualForm.tableIds && manualForm.tableIds.length > 0 
              ? manualForm.tableIds 
              : [parseInt(manualForm.tableId)];
          setSelectedTableIds(existingIds);
      }
  }, [manualMode, manualForm.tableId, manualForm.tableIds]);

  // Aggiorna il form quando cambiano gli ID selezionati
  useEffect(() => {
      if (manualMode === 'tavolo') {
          const mainId = selectedTableIds.length > 0 ? selectedTableIds[0] : '';
          
          const theoreticalCap = selectedTableIds.reduce((acc, id) => {
              const table = db.tables.find(t => t.id === id);
              return acc + (table ? table.capacity : 0);
          }, 0);

          setManualForm((prev: any) => ({
              ...prev,
              tableId: String(mainId),
              tableIds: selectedTableIds,
              customCapacity: selectedTableIds.length > 0 ? theoreticalCap : 0
          }));
          if(selectedTableIds.length > 0) clearError('tableId');
      }
  }, [selectedTableIds, manualMode, db.tables]); 

  const toggleTableSelection = (tableId: number) => {
      setSelectedTableIds(prev => {
          if (prev.includes(tableId)) {
              return prev.filter(id => id !== tableId);
          } else {
              return [...prev, tableId];
          }
      });
  };

  const manualSlots = generateSmartSlots(manualForm.date, db.settings);

  // Calcolo carichi per Overbooking
  const currentSlotLoad = getSlotLoad(db.orders, manualForm.time, manualForm.date, editingId || undefined);
  const incomingLoad = manualCart.filter(i => i.requiresCooking || i.category === 'Pizze').length;
  const isOverbooking = (currentSlotLoad + incomingLoad) > db.settings.maxPizzePerSlot;

  // Gestione Carrello
  const handleItemClick = (item: MenuItem) => {
      // Apri modale se ha extra abilitati o ingredienti default rimovibili
      const hasExtras = item.allowedExtraIds && item.allowedExtraIds.length > 0;
      const hasDefaults = item.defaultIngredientIds && item.defaultIngredientIds.length > 0;

      if (hasExtras || hasDefaults) {
          setItemConfiguring({ item, extras: [], removed: [] });
      } else {
          addToManualCart(item, [], []);
      }
  };

  const addToManualCart = (item: MenuItem, extraIds: string[], removedIds: string[]) => {
    const status = item.requiresCooking ? 'new' : 'ready';
    const selectedExtras: SelectedExtra[] = [];
    let totalPrice = item.price;

    extraIds.forEach(eid => {
        const extraDef = db.settings.globalExtras.find(ge => ge.id === eid);
        if(extraDef) {
            selectedExtras.push({ id: extraDef.id, name: extraDef.name, price: extraDef.price });
            totalPrice += extraDef.price;
        }
    });

    setManualCart(prev => [...prev, { 
        ...item, 
        id: Math.random().toString(), 
        status, 
        menuId: item.id,
        price: totalPrice, 
        selectedExtras,
        removedIngredientIds: removedIds
    }]);
    setItemConfiguring(null);
  };

  const toggleExtraSelection = (extraId: string) => {
      if (!itemConfiguring) return;
      const current = itemConfiguring.extras;
      const newExtras = current.includes(extraId) 
        ? current.filter(id => id !== extraId) 
        : [...current, extraId];
      setItemConfiguring({ ...itemConfiguring, extras: newExtras });
  };

  const toggleIngredientRemoval = (ingId: string) => {
      if (!itemConfiguring) return;
      const currentRemoved = itemConfiguring.removed;
      const newRemoved = currentRemoved.includes(ingId)
        ? currentRemoved.filter(id => id !== ingId)
        : [...currentRemoved, ingId];
      setItemConfiguring({ ...itemConfiguring, removed: newRemoved });
  };

  const removeFromManualCart = (menuId: string, signature: string) => {
      // Find index of item that matches signature to remove only 1 instance
      const indexToRemove = manualCart.findIndex(item => {
          const extraIds = item.selectedExtras?.map(e => e.id).sort().join(',') || '';
          const removedIds = item.removedIngredientIds?.sort().join(',') || '';
          const sig = `${item.menuId}|${extraIds}|${removedIds}|${item.price}`;
          return sig === signature;
      });

      if (indexToRemove !== -1) {
          const newCart = [...manualCart];
          newCart.splice(indexToRemove, 1);
          setManualCart(newCart);
      }
  };

  // Raggruppamento per visualizzazione usando l'helper
  const groupedCartItems = groupCartItems(manualCart, db.settings.globalIngredients);

  const capacityWarning = manualMode === 'tavolo' && manualForm.customCapacity > 0 && manualForm.pax > manualForm.customCapacity;
  const dateStatus = checkDateStatus(manualForm.date, db.settings, manualMode);
  
  const availableTables = manualMode === 'tavolo' 
    ? getAvailableTables(manualForm.date, manualForm.time, manualForm.pax, db.tables, db.orders, db.settings) 
    : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-[2000] p-0 md:p-4 font-sans animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full md:max-w-6xl h-[95vh] md:h-[85vh] rounded-t-[32px] md:rounded-[40px] flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 relative shadow-2xl">
            
            {showOverbookingConfirm && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center animate-in zoom-in border-4 border-red-500">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4 animate-bounce"/>
                        <h3 className="text-2xl font-black italic uppercase mb-2">Attenzione!</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium">
                            Lo slot <strong>{manualForm.time}</strong> è saturo ({currentSlotLoad + incomingLoad}/{db.settings.maxPizzePerSlot} pizze).
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => handleManualSubmit(true)} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">FORZA INSERIMENTO</button>
                            <button onClick={() => setShowOverbookingConfirm(false)} className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl">ANNULLA</button>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERLAY CONFIGURAZIONE */}
            {itemConfiguring && (
                <div className="absolute inset-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col animate-in zoom-in duration-200">
                    <div className="p-6 bg-[#800020] text-white flex justify-between items-center shrink-0 shadow-lg">
                        <div>
                            <h3 className="text-2xl font-black italic uppercase">{itemConfiguring.item.name}</h3>
                            <p className="text-xs opacity-80 font-bold uppercase tracking-widest">Personalizza Piatto</p>
                        </div>
                        <button onClick={() => setItemConfiguring(null)} className="p-2 hover:bg-white/20 rounded-full"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* INGREDIENTI BASE (RIMOVIBILI) */}
                        {itemConfiguring.item.defaultIngredientIds && itemConfiguring.item.defaultIngredientIds.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-3 flex items-center gap-2"><Minus size={18}/> Ingredienti Base</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {itemConfiguring.item.defaultIngredientIds.map(ingId => {
                                        const ing = db.settings.globalIngredients?.find(g => g.id === ingId);
                                        if(!ing) return null;
                                        const isRemoved = itemConfiguring.removed.includes(ingId);
                                        return (
                                            <button
                                                key={ingId}
                                                onClick={() => toggleIngredientRemoval(ingId)}
                                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-between ${isRemoved ? 'bg-red-50 border-red-300 text-red-500 opacity-60 line-through' : 'bg-white border-slate-200 text-slate-700'}`}
                                            >
                                                {ing.name}
                                                {isRemoved && <X size={14}/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* EXTRAS (AGGIUNGIBILI) */}
                        {itemConfiguring.item.allowedExtraIds && itemConfiguring.item.allowedExtraIds.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-3 flex items-center gap-2"><Plus size={18}/> Supplementi</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {itemConfiguring.item.allowedExtraIds.map(eid => {
                                        const extra = db.settings.globalExtras.find(e => e.id === eid);
                                        if (!extra) return null;
                                        const isSelected = itemConfiguring.extras.includes(eid);
                                        return (
                                            <button 
                                                key={eid}
                                                onClick={() => toggleExtraSelection(eid)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${isSelected ? 'border-green-500 bg-green-50 text-green-800 shadow-md scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                                            >
                                                {isSelected && <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1"><Check size={12} strokeWidth={4}/></div>}
                                                <div className="font-black leading-tight">{extra.name}</div>
                                                <div className="font-bold text-sm opacity-60">€{extra.price.toFixed(2)}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Prezzo Finale</span>
                            <span className="text-3xl font-black text-[#800020]">
                                €{(itemConfiguring.item.price + itemConfiguring.extras.reduce((acc, eid) => acc + (db.settings.globalExtras.find(e => e.id === eid)?.price || 0), 0)).toFixed(2)}
                            </span>
                        </div>
                        <button 
                            onClick={() => addToManualCart(itemConfiguring.item, itemConfiguring.extras, itemConfiguring.removed)} 
                            className="px-8 py-4 bg-[#800020] text-white font-black rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Plus size={24}/> AGGIUNGI AL CARRELLO
                        </button>
                    </div>
                </div>
            )}

            <div className="p-4 md:p-6 bg-[#800020] text-white flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-xl md:text-2xl font-black italic uppercase">{editingId ? 'Modifica Ordine' : 'Nuovo Ordine'}</h3>
                    <p className="text-xs opacity-70 font-mono uppercase flex items-center gap-2">
                        {manualMode === 'asporto' && <ShoppingBag size={12}/>}
                        {manualMode === 'consegna' && <Bike size={12}/>}
                        {manualMode === 'tavolo' && <Users size={12}/>}
                        {manualMode} {editingId && `#${editingId}`}
                    </p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X/></button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                {manualMode !== 'tavolo' && (
                    <>
                        {step === 1 ? (
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 flex gap-2 border-b dark:border-slate-700 overflow-x-auto no-scrollbar shrink-0">
                                    {categories.map(c => (
                                        <button key={c} onClick={() => setMenuCat(c as any)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${menuCat === c ? 'bg-[#800020] text-white' : 'bg-slate-100 text-slate-500'}`}>{c}</button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {db.menu
                                        .filter(i => i.category === menuCat && i.visible)
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map(item => {
                                        const countInCart = manualCart.filter(c => c.menuId === item.id).length;
                                        const hasExtras = item.allowedExtraIds && item.allowedExtraIds.length > 0;
                                        const hasDefaults = item.defaultIngredientIds && item.defaultIngredientIds.length > 0;
                                        return (
                                            <button key={item.id} onClick={() => handleItemClick(item)} className="p-4 rounded-2xl border hover:border-[#800020] text-left bg-white dark:bg-slate-800 relative group shadow-sm transition-all active:scale-95">
                                                <div className="font-bold">{item.name}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="text-xs text-slate-400">€{item.price.toFixed(2)}</div>
                                                    {(hasExtras || hasDefaults) && <div className="text-[9px] font-black uppercase text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Layers size={10}/> Configura</div>}
                                                </div>
                                                {countInCart > 0 && <div className="absolute top-2 right-2 bg-[#800020] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md animate-in zoom-in">{countInCart}</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="p-4 md:p-6 border-t dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0 safe-area-bottom">
                                    <div>
                                        <div className="font-bold">{manualCart.length} prodotti</div>
                                        <div className="text-2xl font-black text-[#800020]">€{manualCart.reduce((a,b)=>a+b.price,0).toFixed(2)}</div>
                                    </div>
                                    <button onClick={() => setStep(2)} disabled={manualCart.length === 0} className="px-8 py-3 bg-[#800020] text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
                                        AVANTI <ChevronRight size={16}/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-8 overflow-y-auto lg:overflow-hidden">
                                <div className="w-full lg:w-1/2 p-4 md:p-8 space-y-4 overflow-y-auto">
                                    <h4 className="font-bold text-lg mb-2">Dettagli Cliente</h4>
                                    <div className="space-y-1">
                                        <input value={manualForm.name} onChange={e => { setManualForm({...manualForm, name: e.target.value}); clearError('name'); }} placeholder="Nome" className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#800020] border-2 transition-all ${errors.name ? 'border-red-500 bg-red-50' : 'bg-slate-100 dark:bg-slate-800 border-transparent'}`} />
                                        {errors.name && <p className="text-red-500 text-[10px] font-bold ml-1">Nome obbligatorio</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <input value={manualForm.phone} onChange={e => { setManualForm({...manualForm, phone: e.target.value}); clearError('phone'); }} placeholder="Telefono" className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#800020] border-2 transition-all ${errors.phone ? 'border-red-500 bg-red-50' : 'bg-slate-100 dark:bg-slate-800 border-transparent'}`} />
                                        {errors.phone && <p className="text-red-500 text-[10px] font-bold ml-1">Telefono obbligatorio</p>}
                                    </div>
                                    
                                    {manualMode === 'consegna' && (
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border space-y-2">
                                            <p className="text-xs font-bold uppercase text-slate-400">Indirizzo Consegna</p>
                                            <div className="flex gap-2">
                                                <div className="flex-[3] space-y-1">
                                                    <input value={manualForm.street} onChange={e => { setManualForm({...manualForm, street: e.target.value}); clearError('street'); }} placeholder="Via/Piazza" className={`w-full p-3 rounded-xl border outline-none ${errors.street ? 'border-red-500 bg-red-50' : 'bg-white dark:bg-slate-900 border-slate-200'}`}/>
                                                    {errors.street && <p className="text-red-500 text-[10px] font-bold ml-1">Obbligatorio</p>}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <input value={manualForm.civic} onChange={e => { setManualForm({...manualForm, civic: e.target.value}); clearError('civic'); }} placeholder="N." className={`w-full p-3 rounded-xl border outline-none ${errors.civic ? 'border-red-500 bg-red-50' : 'bg-white dark:bg-slate-900 border-slate-200'}`}/>
                                                    {errors.civic && <p className="text-red-500 text-[10px] font-bold ml-1">Obbl.</p>}
                                                </div>
                                            </div>
                                            <input value={manualForm.city} onChange={e => setManualForm({...manualForm, city: e.target.value})} placeholder="Città" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border outline-none"/>
                                            <input value={manualForm.extra} onChange={e => setManualForm({...manualForm, extra: e.target.value})} placeholder="Note Indirizzo (Contrada, Citofono...)" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border outline-none"/>
                                        </div>
                                    )}
                                    
                                    <div className="mt-4">
                                        <label className="text-xs font-bold uppercase text-slate-400">Note Ordine (Allergie, altro...)</label>
                                        <textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="w-full p-4 mt-1 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none border-none" rows={2} />
                                    </div>

                                    <div className="mt-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Orario Ritiro/Consegna</label>
                                        
                                        <div className="mb-2">
                                            <CustomCalendar 
                                                selectedDate={manualForm.date} 
                                                onSelect={(date) => setManualForm({...manualForm, date, time: ''})} 
                                                settings={db.settings}
                                                orderType={manualMode}
                                                allowDisabledClick={true} // Staff can override
                                            />
                                            {!dateStatus.available && (
                                                <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded-lg font-bold flex items-center gap-2 border border-yellow-200">
                                                    <AlertTriangle size={14}/>
                                                    Attenzione: {dateStatus.reason || 'Data non disponibile'}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`${errors.time ? 'p-2 rounded-xl border-2 border-red-500 bg-red-50' : ''}`}>
                                            <SlotSelector 
                                                slots={manualSlots} 
                                                orders={db.orders} 
                                                date={manualForm.date} 
                                                selected={manualForm.time} 
                                                onSelect={(t: string) => { setManualForm({...manualForm, time: t}); clearError('time'); }} 
                                                maxCapacity={db.settings.maxPizzePerSlot} 
                                                allowOverbooking={true} 
                                                orderType={manualMode} 
                                                db={db}
                                                isPublic={false}
                                                filterShift={viewShift} 
                                            />
                                            {errors.time && <p className="text-center text-red-500 font-bold text-xs mt-2">Orario obbligatorio</p>}
                                        </div>
                                    </div>
                                    {isOverbooking && manualForm.time && <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 p-4 rounded-xl font-bold text-sm flex items-center gap-3 animate-pulse"><AlertTriangle size={24}/> Attenzione: Slot saturo!</div>}
                                </div>
                                <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 flex flex-col border-t lg:border-t-0 lg:border-l dark:border-slate-700">
                                    <h4 className="font-bold text-lg mb-4">Riepilogo ({manualCart.length} prodotti)</h4>
                                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 lg:max-h-full">
                                        {groupedCartItems.map((g: any) => {
                                            const removedNames = g.removedIngredientIds?.map((id:string) => db.settings.globalIngredients?.find(ing => ing.id === id)?.name).filter(Boolean);
                                            return (
                                                <div key={g._signature} className="flex justify-between items-center text-sm bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                                    <div className="flex-1">
                                                        <div className="font-bold">{g.name} x{g.count}</div>
                                                        <div className="text-xs text-slate-400">€{(g.price * g.count).toFixed(2)}</div>
                                                        {/* VISUALIZZAZIONE DETTAGLI */}
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {g.selectedExtras?.map((e:SelectedExtra) => (
                                                                <span key={e.id} className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">+{e.name}</span>
                                                            ))}
                                                            {removedNames?.map((name:string) => (
                                                                <span key={name} className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold line-through decoration-red-500">-{name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                         <button 
                                                            onClick={() => removeFromManualCart(g.menuId, g._signature)} 
                                                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                                            title="Rimuovi una unità"
                                                         >
                                                             <Trash2 size={16}/>
                                                         </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 text-center">
                                        <div className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center justify-center gap-1"><Banknote size={14}/> Riepilogo Cassa</div>
                                        <div className="text-3xl font-black text-[#800020]">€{manualCart.reduce((a,b)=>a+b.price,0).toFixed(2)}</div>
                                    </div>
                                    <div className="flex gap-2 safe-area-bottom">
                                        <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl">INDIETRO</button>
                                        <button onClick={() => handleManualSubmit(false)} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${isOverbooking ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-[#800020]'}`}>{isOverbooking ? 'FORZA INSERIMENTO' : editingId ? 'SALVA MODIFICHE' : 'CONFERMA'}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {/* PARTE TAVOLO RIMANE INVARIATA */}
                {manualMode === 'tavolo' && (
                    <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-4 lg:gap-8 overflow-y-auto">
                        <div className="w-full lg:w-1/2 space-y-4">
                            <h4 className="font-bold text-lg">Dati Prenotazione</h4>
                            <div className="space-y-1">
                                <input value={manualForm.name} onChange={e => { setManualForm({...manualForm, name: e.target.value}); clearError('name'); }} placeholder="Nome Cliente" className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#800020] border-2 transition-all ${errors.name ? 'border-red-500 bg-red-50' : 'bg-slate-100 dark:bg-slate-800 border-transparent'}`} />
                                {errors.name && <p className="text-red-500 text-[10px] font-bold ml-1">Obbligatorio</p>}
                            </div>
                            <div className="space-y-1">
                                <input value={manualForm.phone} onChange={e => { setManualForm({...manualForm, phone: e.target.value}); clearError('phone'); }} placeholder="Telefono" className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#800020] border-2 transition-all ${errors.phone ? 'border-red-500 bg-red-50' : 'bg-slate-100 dark:bg-slate-800 border-transparent'}`} />
                                {errors.phone && <p className="text-red-500 text-[10px] font-bold ml-1">Obbligatorio</p>}
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={manualForm.pax} onChange={e => setManualForm({...manualForm, pax: parseInt(e.target.value)})} min={1} placeholder="Pax" className="flex-1 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold outline-none" />
                                {selectedTableIds.length > 0 && (
                                    <div className="flex-1 flex flex-col justify-center px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Capienza Reale</label>
                                        <input 
                                            type="number" 
                                            value={manualForm.customCapacity} 
                                            onChange={e => setManualForm({...manualForm, customCapacity: parseInt(e.target.value)})}
                                            className="w-full bg-transparent font-black text-lg outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                            {capacityWarning && (
                                <div className="text-xs text-orange-600 font-bold bg-orange-100 p-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <AlertTriangle size={14}/>
                                    Attenzione: Pax supera capienza impostata!
                                </div>
                            )}
                            
                            <div className="mt-2">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Data Prenotazione</label>
                                <CustomCalendar 
                                    selectedDate={manualForm.date} 
                                    onSelect={(date) => {
                                        setManualForm({...manualForm, date, time: '', tableId: '', tableIds: []});
                                        setSelectedTableIds([]);
                                        clearError('time');
                                    }} 
                                    settings={db.settings}
                                    orderType={manualMode}
                                    allowDisabledClick={true} // Staff can override
                                />
                                {!dateStatus.available && (
                                    <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded-lg font-bold flex items-center gap-2 border border-yellow-200">
                                        <AlertTriangle size={14}/>
                                        Attenzione: {dateStatus.reason || 'Data non disponibile'}
                                    </div>
                                )}
                            </div>
                            
                            <textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} placeholder="Note tavolo..." className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" rows={2}/>
                            <label className="text-xs font-bold text-slate-400 uppercase mt-4 block">Seleziona Orario</label>
                            <div className={`${errors.time ? 'p-2 rounded-xl border-2 border-red-500 bg-red-50' : ''}`}>
                                <SlotSelector 
                                    slots={manualSlots} 
                                    orders={db.orders} 
                                    date={manualForm.date} 
                                    selected={manualForm.time} 
                                    onSelect={(t: string) => {
                                        setManualForm({...manualForm, time: t, tableId: '', tableIds: []});
                                        setSelectedTableIds([]);
                                        clearError('time');
                                    }} 
                                    maxCapacity={db.settings.maxPizzePerSlot} 
                                    allowOverbooking={true} 
                                    orderType="tavolo" 
                                    pax={manualForm.pax} 
                                    db={db}
                                    isPublic={false}
                                />
                                {errors.time && <p className="text-center text-red-500 font-bold text-xs mt-2">Orario obbligatorio</p>}
                            </div>
                        </div>
                        <div className={`w-full lg:w-1/2 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border-2 flex flex-col ${errors.tableId ? 'border-red-500' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className={`font-bold text-lg flex items-center gap-2 ${errors.tableId ? 'text-red-500' : ''}`}><MapIcon size={20}/> {errors.tableId ? 'Seleziona Tavolo!' : 'Assegna Tavoli'}</h4>
                                {selectedTableIds.length > 0 && <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{selectedTableIds.length} selezionati</span>}
                            </div>
                            {manualForm.time ? (
                                <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto content-start max-h-60 lg:max-h-full">
                                    {db.tables.map(t => {
                                        const conflict = checkTableConflict(t.id, manualForm.date, manualForm.time, DEFAULT_TABLE_DURATION, db.orders, db.settings);
                                        const isSelected = selectedTableIds.includes(t.id);
                                        const isDisabled = conflict && !isSelected && (!editingId || !db.orders.find(o => o.id === editingId)?.tableIds?.includes(t.id));
                                        
                                        const pax = manualForm.pax || 0;
                                        const isIdeal = pax > 0 && t.capacity >= pax && t.capacity <= pax + 2;
                                        const isSmall = pax > 0 && t.capacity < pax;
                                        
                                        return (
                                            <button 
                                                key={t.id} 
                                                onClick={() => toggleTableSelection(t.id)} 
                                                disabled={isDisabled}
                                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                                    isSelected ? 'border-[#800020] bg-[#800020] text-white shadow-md z-10' : 
                                                    isDisabled ? 'border-slate-100 bg-slate-100 opacity-50 cursor-not-allowed' :
                                                    isIdeal ? 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 animate-[pulse_3s_infinite]' :
                                                    isSmall ? 'border-slate-200 bg-slate-100 opacity-40 grayscale hover:opacity-80 hover:grayscale-0' :
                                                    'border-slate-200 bg-white hover:border-[#800020]'
                                                }`}
                                            >
                                                {isIdeal && !isSelected && (
                                                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 z-10">
                                                        <Sparkles size={10}/> Ideale
                                                    </div>
                                                )}
                                                <div className="font-bold flex justify-between items-center w-full">
                                                    <span>{t.name || `Tavolo ${t.id}`}</span>
                                                    {isSelected && <Check size={16}/>}
                                                </div>
                                                <div className={`text-xs ${isSelected ? 'opacity-90' : isSmall ? 'text-slate-500 font-medium' : 'opacity-70'}`}>
                                                    Cap: {t.capacity}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : ( <div className="flex-1 flex items-center justify-center text-slate-400 italic">Seleziona un orario prima</div> )}
                            <button 
                                onClick={() => handleManualSubmit(false)} 
                                disabled={selectedTableIds.length === 0} 
                                className="w-full mt-4 py-4 bg-[#800020] text-white font-black rounded-xl shadow-lg disabled:opacity-50 safe-area-bottom"
                            >
                                {editingId ? 'SALVA MODIFICHE' : 'CONFERMA PRENOTAZIONE'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
