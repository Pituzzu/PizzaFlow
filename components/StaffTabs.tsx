import React, { useState, useEffect } from 'react';
import { 
  Calendar, Sun, Moon, ShoppingBag, Bike, Users, AlertCircle, Clock, X, AlertTriangle, 
  Map as MapIcon, ArrowUpRight, CheckCircle, ChefHat, Soup, Check, Utensils, Minus, Plus, 
  PlayCircle, Receipt, LayoutDashboard, Trash2, GripVertical, Phone, Navigation, Bell, UtensilsCrossed,
  MapPin, Truck
} from 'lucide-react';
import { DB, Order, OrderItem, MenuItem, ItemStatus, Category, Table } from '../types';
import { 
  SlotSelector, generateSmartSlots, getShiftFromTime, getSlotLoad, timeToMinutes, 
  getAvailableTables, checkTableConflict 
} from './Shared';

const DEFAULT_TABLE_DURATION = 90;

// --- HELPERS COMPONENTS ---

function renderCapacityBar(slotList: string[], db: DB, date: string) {
    if(slotList.length === 0) return <div className="text-slate-400 text-xs italic p-4 text-center">Nessun turno in questa fascia</div>;
    
    return (
    <div className="flex items-end gap-2 h-full">
        {slotList.map(slot => {
            const load = getSlotLoad(db.orders, slot, date);
            const max = db.settings.maxPizzePerSlot;
            const percent = Math.min((load / max) * 100, 100);
            const isOver = load > max;
            
            let barColor = "bg-green-500";
            if(percent > 60) barColor = "bg-yellow-400";
            if(percent >= 100) barColor = "bg-red-500";
            if(isOver) barColor = "bg-[#800020] animate-pulse";

            return (
                <div key={slot} className="w-10 md:w-12 flex flex-col justify-end items-center gap-2 group relative h-full pb-1">
                    <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 absolute -top-4 transition-opacity z-10 bg-white shadow-sm px-1 rounded">{load}/{max}</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-lg relative overflow-hidden flex-1 min-h-[60px]">
                        <div className={`w-full absolute bottom-0 transition-all duration-500 ${barColor}`} style={{height: `${percent}%`}}></div>
                        <div className="absolute top-0 w-full border-t border-red-500/30 border-dashed"></div>
                    </div>
                    <div className={`text-[9px] md:text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-slate-500'}`}>{slot}</div>
                </div>
            )
        })}
    </div>
  );
}

// --- TAB COMPONENTS ---

export function ReservationsTab({ db, setDb, showNotify, viewDate, viewShift }: any) {
  const pendingWebOrders = db.orders.filter((o: Order) => !o.isAccepted && !o.isArchived && o.type !== 'tavolo');
  
  const agendaOrders = db.orders.filter((o: Order) => 
      o.isAccepted && 
      !o.isArchived &&
      o.date === viewDate && 
      getShiftFromTime(o.time) === viewShift
  ).sort((a: Order, b: Order) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const [manualMode, setManualMode] = useState<'asporto' | 'consegna' | 'tavolo' | null>(null);
  const [step, setStep] = useState(1);
  const [manualForm, setManualForm] = useState({ 
      name: '', phone: '+39 ', date: viewDate, time: '', 
      // Indirizzo Granulare
      street: '', civic: '', city: 'Enna', extra: '', 
      pax: 2, tableId: '',
      notes: '' 
  });
  const [manualCart, setManualCart] = useState<OrderItem[]>([]);
  const [menuCat, setMenuCat] = useState<Category>('Pizze');
  const [showOverbookingConfirm, setShowOverbookingConfirm] = useState(false);
  
  const manualSlots = generateSmartSlots(manualForm.date, db.settings);
  const shiftSlots = generateSmartSlots(viewDate, db.settings).filter(s => getShiftFromTime(s) === viewShift);
  
  const categories = db.settings.categoryOrder || ['Pizze', 'Cucina', 'Bevande', 'Dessert'];

  const groupedCart = manualCart.reduce((acc: any, item) => {
      if (!acc[item.menuId]) { acc[item.menuId] = { ...item, count: 0, ids: [] }; }
      acc[item.menuId].count++;
      acc[item.menuId].ids.push(item.id);
      return acc;
  }, {});

  const addToManualCart = (item: MenuItem) => {
    // STATUS LOGIC: se richiede cottura, 'new', altrimenti 'ready'
    const status = item.requiresCooking ? 'new' : 'ready';
    setManualCart(prev => [...prev, { ...item, id: Math.random().toString(), status, menuId: item.id }]);
  };

  const currentSlotLoad = getSlotLoad(db.orders, manualForm.time, manualForm.date);
  const incomingLoad = manualCart.filter(i => i.requiresCooking).length;
  const isOverbooking = (currentSlotLoad + incomingLoad) > db.settings.maxPizzePerSlot;

  const handleManualSubmit = (force = false) => {
      if (!manualForm.name || !manualForm.phone || (!manualForm.time && manualMode !== 'tavolo')) {
          showNotify("Compila tutti i campi obbligatori"); return;
      }
      if (manualMode === 'consegna' && (!manualForm.street || !manualForm.civic)) {
          showNotify("Indirizzo incompleto"); return;
      }
      if (manualMode === 'tavolo' && !manualForm.tableId) {
          showNotify("Assegna un tavolo"); return;
      }
      if (manualMode !== 'tavolo' && isOverbooking && !force) {
          setShowOverbookingConfirm(true); return;
      }

      const fullAddress = manualMode === 'consegna' 
        ? `${manualForm.street}, ${manualForm.civic}, ${manualForm.city} ${manualForm.extra ? `(${manualForm.extra})` : ''}`
        : undefined;

      const newOrder: Order = {
          id: "M-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
          type: manualMode!,
          customerName: manualForm.name,
          customerPhone: manualForm.phone,
          customerStreet: manualForm.street,
          customerCivic: manualForm.civic,
          customerCity: manualForm.city,
          customerExtra: manualForm.extra,
          customerAddress: fullAddress,
          orderNotes: manualForm.notes,
          pax: manualMode === 'tavolo' ? manualForm.pax : undefined,
          tableId: manualMode === 'tavolo' ? parseInt(manualForm.tableId) : undefined,
          duration: manualMode === 'tavolo' ? DEFAULT_TABLE_DURATION : undefined,
          time: manualForm.time,
          date: manualForm.date,
          items: manualCart,
          timestamp: Date.now(),
          isAccepted: true, 
          isArchived: false,
          isShipped: false
      };

      setDb((prev: DB) => ({ ...prev, orders: [...prev.orders, newOrder] }));
      showNotify("Ordine inserito!");
      setManualMode(null);
      setStep(1);
      setManualForm({ name: '', phone: '+39 ', date: viewDate, time: '', street: '', civic: '', city: 'Enna', extra: '', pax: 2, tableId: '', notes: '' });
      setManualCart([]);
      setShowOverbookingConfirm(false);
  };

  const accept = (id: string) => {
    setDb((prev: DB) => ({ ...prev, orders: prev.orders.map(o => o.id === id ? { ...o, isAccepted: true } : o) }));
    showNotify("Ordine accettato!");
  };

  const reject = (id: string) => {
    setDb((prev: DB) => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
  };
  
  const archiveOrder = (id: string) => {
    setDb((prev: DB) => ({ ...prev, orders: prev.orders.map(o => o.id === id ? { ...o, isArchived: true } : o) }));
    showNotify("Ordine archiviato e pagato!");
  };

  const availableTables = manualMode === 'tavolo' ? getAvailableTables(manualForm.date, manualForm.time, manualForm.pax, db.tables, db.orders, db.settings) : [];

  return (
    <div className="space-y-8 animate-in fade-in pb-20 md:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <h2 className="text-3xl font-black italic uppercase mb-2">Prenotazioni</h2>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-[24px] overflow-hidden">
                <div className="text-xs font-black uppercase text-slate-400 mb-2 flex items-center gap-2">
                    {viewShift === 'pranzo' ? <Sun size={14}/> : <Moon size={14}/>} 
                    Capacità {viewShift}
                </div>
                <div className="overflow-x-auto no-scrollbar h-24">
                        {renderCapacityBar(shiftSlots, db, viewDate)}
                </div>
            </div>
        </div>
        <div className="lg:col-span-1 grid grid-cols-1 gap-2">
            <button onClick={() => setManualMode('asporto')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700">
                <ShoppingBag size={20}/> <span>Nuovo Asporto</span>
            </button>
            <button onClick={() => setManualMode('consegna')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700">
                <Bike size={20}/> <span>Nuova Consegna</span>
            </button>
            <button onClick={() => setManualMode('tavolo')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700">
                <Users size={20}/> <span>Nuovo Tavolo</span>
            </button>
        </div>
      </div>

      {pendingWebOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4"><span className="bg-orange-100 text-orange-600 p-2 rounded-xl"><AlertCircle size={20}/></span><h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Da Approvare</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingWebOrders.map((order: Order) => (
                    <div key={order.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between mb-4"><span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{order.type}</span><span className="text-xs font-mono text-slate-400">#{order.id}</span></div>
                            <h4 className="text-xl font-bold dark:text-white">{order.customerName}</h4>
                            <p className="text-sm text-slate-500 mb-2 flex items-center gap-1"><Clock size={14}/> {order.date} {order.time}</p>
                            {order.orderNotes && <div className="bg-yellow-50 p-2 rounded-lg text-xs italic text-yellow-700 mb-2">"{order.orderNotes}"</div>}
                            <div className="border-t pt-2 mt-2 space-y-1 max-h-32 overflow-y-auto">{order.items.map(i => <div key={i.id} className="text-xs flex justify-between"><span>{i.name}</span><span>€{i.price}</span></div>)}</div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => accept(order.id)} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">ACCETTA</button>
                            <button onClick={() => reject(order.id)} className="px-4 bg-red-100 text-red-500 rounded-xl hover:bg-red-200"><X/></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      <div>
         <div className="flex items-center gap-3 mb-6"><span className="bg-[#800020] text-white p-2 rounded-xl"><Calendar size={20}/></span><h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Agenda {viewShift}</h3></div>
         <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             {agendaOrders.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 italic">Nessun ordine in agenda per questo turno.</div>
             ) : (
                 <div className="divide-y dark:divide-slate-700">
                     {agendaOrders.map((order: Order) => (
                         <div key={order.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                             <div className="flex items-center gap-4">
                                 <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl font-black text-lg min-w-[80px] text-center">
                                     {order.time}
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${order.type === 'tavolo' ? 'bg-indigo-100 text-indigo-700' : order.type === 'asporto' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`}>{order.type} {order.tableId ? `T${order.tableId}` : ''}</span>
                                         <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                                     </div>
                                     <h4 className="font-bold text-lg">{order.customerName} <span className="text-sm font-normal text-slate-400">({order.pax ? `${order.pax}p` : `${order.items.length} art.`})</span></h4>
                                     {order.customerAddress && <p className="text-xs text-slate-500 flex items-center gap-1"><MapIcon size={12}/> {order.customerAddress}</p>}
                                     {order.orderNotes && <p className="text-xs text-yellow-600 italic">Note: {order.orderNotes}</p>}
                                 </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 {order.type === 'tavolo' ? (
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-slate-200">
                                        <ArrowUpRight size={16}/> Apri Conto
                                    </button>
                                 ) : (
                                    <button onClick={() => archiveOrder(order.id)} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-green-200">
                                        <CheckCircle size={16}/> Consegna & Paga
                                    </button>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>

      {manualMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-[2000] p-0 md:p-4">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-6xl h-[95vh] md:h-[85vh] rounded-t-[32px] md:rounded-[40px] flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 relative">
                
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

                <div className="p-4 md:p-6 bg-[#800020] text-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl md:text-2xl font-black italic uppercase">Nuovo: {manualMode}</h3>
                    <button onClick={() => { setManualMode(null); setStep(1); setManualCart([]); }} className="p-2 hover:bg-white/20 rounded-full"><X/></button>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                    {/* FLUSSO ASPORTO/CONSEGNA */}
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
                                        {db.menu.filter(i => i.category === menuCat && i.visible).map(item => {
                                            const countInCart = manualCart.filter(c => c.menuId === item.id).length;
                                            return (
                                                <button key={item.id} onClick={() => addToManualCart(item)} className="p-4 rounded-2xl border hover:border-[#800020] text-left bg-white dark:bg-slate-800 relative group shadow-sm">
                                                    <div className="font-bold">{item.name}</div>
                                                    <div className="text-xs text-slate-400">€{item.price}</div>
                                                    {countInCart > 0 && <div className="absolute top-2 right-2 bg-[#800020] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md animate-in zoom-in">{countInCart}</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 md:p-6 border-t dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0 safe-area-bottom">
                                        <div className="font-bold">{manualCart.length} prodotti</div>
                                        <button onClick={() => setStep(2)} disabled={manualCart.length === 0} className="px-8 py-3 bg-[#800020] text-white font-bold rounded-xl disabled:opacity-50">AVANTI</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-8 overflow-y-auto lg:overflow-hidden">
                                    <div className="w-full lg:w-1/2 p-4 md:p-8 space-y-4 overflow-y-auto">
                                        <h4 className="font-bold text-lg mb-2">Dettagli Cliente</h4>
                                        <input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="Nome" className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#800020]" />
                                        <input value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} placeholder="Telefono" className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#800020]" />
                                        
                                        {manualMode === 'consegna' && (
                                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border space-y-2">
                                                <p className="text-xs font-bold uppercase text-slate-400">Indirizzo Consegna</p>
                                                <div className="flex gap-2">
                                                    <input value={manualForm.street} onChange={e => setManualForm({...manualForm, street: e.target.value})} placeholder="Via/Piazza" className="flex-[3] p-3 rounded-xl bg-white dark:bg-slate-900 border outline-none"/>
                                                    <input value={manualForm.civic} onChange={e => setManualForm({...manualForm, civic: e.target.value})} placeholder="N." className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 border outline-none"/>
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
                                            <input 
                                                type="date" 
                                                value={manualForm.date} 
                                                disabled={true}
                                                onChange={e => setManualForm({...manualForm, date: e.target.value, time: ''})} 
                                                className="w-full p-4 mb-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold opacity-60 cursor-not-allowed" 
                                            />
                                            <SlotSelector 
                                                slots={manualSlots} 
                                                orders={db.orders} 
                                                date={manualForm.date} 
                                                selected={manualForm.time} 
                                                onSelect={(t: string) => setManualForm({...manualForm, time: t})} 
                                                maxCapacity={db.settings.maxPizzePerSlot} 
                                                allowOverbooking={true} 
                                                orderType={manualMode} 
                                                db={db}
                                                isPublic={false}
                                                filterShift={viewShift} 
                                            />
                                        </div>
                                        {isOverbooking && manualForm.time && <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 p-4 rounded-xl font-bold text-sm flex items-center gap-3 animate-pulse"><AlertTriangle size={24}/> Attenzione: Slot saturo!</div>}
                                    </div>
                                    <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 flex flex-col border-t lg:border-t-0 lg:border-l dark:border-slate-700">
                                        <h4 className="font-bold text-lg mb-4">Riepilogo</h4>
                                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 lg:max-h-full">
                                            {Object.values(groupedCart).map((g: any) => (
                                                <div key={g.menuId} className="flex justify-between text-sm bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm"><span className="font-medium">{g.name} x{g.count}</span><span>€{(g.price * g.count).toFixed(2)}</span></div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 safe-area-bottom">
                                            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl">INDIETRO</button>
                                            <button onClick={() => handleManualSubmit(false)} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${isOverbooking ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-[#800020]'}`}>{isOverbooking ? 'FORZA INSERIMENTO' : 'CONFERMA'}</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {/* FLUSSO TAVOLO */}
                    {manualMode === 'tavolo' && (
                        <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-8 gap-4 lg:gap-8 overflow-y-auto">
                            <div className="w-full lg:w-1/2 space-y-4">
                                <h4 className="font-bold text-lg">Dati Prenotazione</h4>
                                <input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="Nome Cliente" className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold outline-none" />
                                <input value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} placeholder="Telefono" className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" />
                                <input type="number" value={manualForm.pax} onChange={e => setManualForm({...manualForm, pax: parseInt(e.target.value), tableId: ''})} min={1} placeholder="Pax" className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold outline-none" />
                                
                                {/* DATE SELECTOR ENABLED ONLY FOR TABLES */}
                                <input 
                                    type="date" 
                                    value={manualForm.date} 
                                    onChange={e => setManualForm({...manualForm, date: e.target.value, time: '', tableId: ''})} 
                                    className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold" 
                                />
                                
                                <textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} placeholder="Note tavolo..." className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" rows={2}/>
                                <label className="text-xs font-bold text-slate-400 uppercase mt-4 block">Seleziona Orario</label>
                                
                                <SlotSelector 
                                    slots={manualSlots} 
                                    orders={db.orders} 
                                    date={manualForm.date} 
                                    selected={manualForm.time} 
                                    onSelect={(t: string) => setManualForm({...manualForm, time: t, tableId: ''})} 
                                    maxCapacity={db.settings.maxPizzePerSlot} 
                                    allowOverbooking={true} 
                                    orderType="tavolo" 
                                    pax={manualForm.pax} 
                                    db={db}
                                    isPublic={false}
                                    filterShift={viewShift}
                                />
                            </div>
                            <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700 flex flex-col">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><MapIcon size={20}/> Assegna Tavolo</h4>
                                {manualForm.time ? (
                                    availableTables.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto content-start max-h-60 lg:max-h-full">
                                            {availableTables.map(t => (
                                                <button key={t.id} onClick={() => setManualForm({...manualForm, tableId: String(t.id)})} className={`p-4 rounded-xl border-2 text-left transition-all ${String(manualForm.tableId) === String(t.id) ? 'border-[#800020] bg-[#800020] text-white' : 'border-slate-200 bg-white hover:border-[#800020]'}`}>
                                                    <div className="font-bold">{t.name || `Tavolo ${t.id}`}</div>
                                                    <div className="text-xs opacity-70">Cap: {t.capacity}</div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : ( <div className="flex-1 flex items-center justify-center text-red-500 font-bold text-center">Nessun tavolo disponibile</div> )
                                ) : ( <div className="flex-1 flex items-center justify-center text-slate-400 italic">Seleziona un orario prima</div> )}
                                <button onClick={() => handleManualSubmit(false)} disabled={!manualForm.tableId} className="w-full mt-4 py-4 bg-[#800020] text-white font-black rounded-xl shadow-lg disabled:opacity-50 safe-area-bottom">CONFERMA PRENOTAZIONE</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}