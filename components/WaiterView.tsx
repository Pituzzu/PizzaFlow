
import React, { useState, useMemo } from 'react';
import { 
  Users, Bell, Clock, X, Map as MapIcon, Soup, Check, Utensils, Minus, Plus, 
  PlayCircle, Receipt, Trash2, UtensilsCrossed, Link, Sparkles, Layers, Layers as LayersIcon
} from 'lucide-react';
import { DB, Order, OrderItem, MenuItem, Category, SelectedExtra } from '../types';
import { getShiftFromTime, formatTableString } from './Shared';

const DEFAULT_TABLE_DURATION = 90;

export function WaiterView({ db, setDb, showNotify, viewDate, viewShift }: any) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [paxInput, setPaxInput] = useState(2);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [cat, setCat] = useState<Category>('Pizze');
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [filterPax, setFilterPax] = useState<number | ''>('');

  // STATI PER I MODALI NUOVI
  const [configuringItem, setConfiguringItem] = useState<{item: MenuItem, extras: string[], removed: string[]} | null>(null);
  const [isSeatingTable, setIsSeatingTable] = useState(false);
  const [seatForm, setSeatForm] = useState({ pax: 2, name: '', time: '' });

  const tables = db.tables;
  const categories = db.settings.categoryOrder || ['Pizze', 'Cucina', 'Bevande', 'Dessert'];
  
  // Trova l'ordine attivo per il tavolo (o gruppo di tavoli) nel turno corrente
  const getTableOrder = (tableId: number) => {
      return db.orders.find((o: Order) => 
          !o.isArchived && 
          o.isAccepted && 
          // Check if tableId matches the single ID or is inside the joined IDs array
          (o.tableId === tableId || (o.tableIds && o.tableIds.includes(tableId))) &&
          o.date === viewDate && 
          getShiftFromTime(o.time) === viewShift
      );
  };

  // Calcola contatori live per categoria
  const cartCategoryCounts = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [cart]);

  // --- LOGICA APERTURA TAVOLO (WALK-IN) ---
  const openSeatModal = () => {
      if(!selectedTable) return;
      // Calcolo orario intelligente basato sul turno
      const now = new Date();
      const currentH = now.getHours();
      let defaultTime = now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});

      // Se sto lavorando al turno Cena ma sono le 10:00 del mattino, defaulta a 19:30
      if (viewShift === 'cena' && currentH < 17) {
          defaultTime = '19:30';
      }
      // Se sto lavorando al turno Pranzo ma sono le 9:00, defaulta a 12:30
      if (viewShift === 'pranzo' && currentH < 11) {
          defaultTime = '12:30';
      }

      setSeatForm({ pax: paxInput || 2, name: `Tavolo ${selectedTable}`, time: defaultTime });
      setIsSeatingTable(true);
  };

  const confirmSeatTable = () => {
      if(!selectedTable) return;
      
      const newOrder: Order = {
          id: "T-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
          type: 'tavolo',
          tableId: selectedTable,
          tableIds: [selectedTable], // Start with single
          customCapacity: 0,
          customerName: seatForm.name || `Tavolo ${selectedTable}`,
          pax: seatForm.pax,
          time: seatForm.time, // Usa l'orario del form, non new Date()
          date: viewDate,
          items: [],
          timestamp: Date.now(),
          isAccepted: true,
          isArchived: false,
          duration: DEFAULT_TABLE_DURATION
      };
      
      setDb((prev: DB) => ({ ...prev, orders: [...prev.orders, newOrder] }));
      showNotify("Tavolo aperto!");
      setIsSeatingTable(false);
      setIsAddingItems(true); // Switch to order mode immediately
  };

  // --- LOGICA AGGIUNTA ARTICOLI ---
  const handleItemClick = (item: MenuItem) => {
      // Se ha opzioni (ingredienti o extra), apri configuratore
      const hasExtras = item.allowedExtraIds && item.allowedExtraIds.length > 0;
      const hasDefaults = item.defaultIngredientIds && item.defaultIngredientIds.length > 0;

      if (hasExtras || hasDefaults) {
          setConfiguringItem({ item, extras: [], removed: [] });
      } else {
          addItemToCart(item, [], []);
      }
  };

  const addItemToCart = (item: MenuItem, extraIds: string[], removedIds: string[]) => {
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

      setCart(prev => [...prev, { 
          ...item, 
          id: Math.random().toString(), 
          status, 
          menuId: item.id,
          price: totalPrice,
          selectedExtras,
          removedIngredientIds: removedIds
      }]);
      setConfiguringItem(null);
      showNotify("Aggiunto!");
  };

  // Helper Configurazione
  const toggleExtra = (eid: string) => {
      if(!configuringItem) return;
      const current = configuringItem.extras;
      setConfiguringItem({
          ...configuringItem,
          extras: current.includes(eid) ? current.filter(id => id !== eid) : [...current, eid]
      });
  };

  const toggleRemoved = (ingId: string) => {
      if(!configuringItem) return;
      const current = configuringItem.removed;
      setConfiguringItem({
          ...configuringItem,
          removed: current.includes(ingId) ? current.filter(id => id !== ingId) : [...current, ingId]
      });
  };

  const removeItemFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const sendOrder = () => {
      if(!selectedTable || cart.length === 0) return;
      const activeOrder = getTableOrder(selectedTable);
      if(activeOrder) {
          setDb((prev: DB) => ({
              ...prev,
              orders: prev.orders.map(o => o.id === activeOrder.id ? { ...o, items: [...o.items, ...cart] } : o)
          }));
          showNotify("Comanda inviata in cucina!");
          setCart([]);
          setIsAddingItems(false);
      }
  };

  const deleteItem = (orderId: string, itemId: string) => {
      setDb((prev: DB) => ({
          ...prev,
          orders: prev.orders.map(o => o.id === orderId ? { ...o, items: o.items.filter(i => i.id !== itemId) } : o)
      }));
  };

  const serveItem = (orderId: string, itemId: string) => {
      setDb((prev: DB) => ({
          ...prev,
          orders: prev.orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                  ...o,
                  items: o.items.map(i => i.id === itemId ? { ...i, status: 'served' } : i)
              };
          })
      }));
      showNotify("Piatto servito!");
  };

  const requestBill = (tableId: number) => {
      // If table is joined, we need to find all involved tables
      const order = getTableOrder(tableId);
      const tablesToUpdate = order && order.tableIds ? order.tableIds : [tableId];

      setDb((prev: DB) => ({
          ...prev,
          tables: prev.tables.map(t => tablesToUpdate.includes(t.id) ? { ...t, status: 'billing' } : t)
      }));
      showNotify("Richiesta conto inviata");
      setSelectedTable(null);
  };

  const currentTableOrder = selectedTable ? getTableOrder(selectedTable) : null;
  const currentTableObj = selectedTable ? db.tables.find(t => t.id === selectedTable) : null;

  return (
    <div className="animate-in fade-in pb-20 md:pb-0">
        
        {/* OVERLAY CONFIGURAZIONE PIATTO */}
        {configuringItem && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-5 bg-[#800020] text-white flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-black italic uppercase">{configuringItem.item.name}</h3>
                        <button onClick={() => setConfiguringItem(null)} className="p-2 hover:bg-white/20 rounded-full"><X/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* INGREDIENTI BASE */}
                        {configuringItem.item.defaultIngredientIds && configuringItem.item.defaultIngredientIds.length > 0 && (
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 mb-2 flex items-center gap-2"><Minus size={14}/> Ingredienti Base</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {configuringItem.item.defaultIngredientIds.map(ingId => {
                                        const ing = db.settings.globalIngredients.find(g => g.id === ingId);
                                        if(!ing) return null;
                                        const isRemoved = configuringItem.removed.includes(ingId);
                                        return (
                                            <button 
                                                key={ingId} 
                                                onClick={() => toggleRemoved(ingId)}
                                                className={`p-3 rounded-xl border-2 font-bold text-sm text-left flex justify-between items-center transition-all ${isRemoved ? 'bg-red-50 border-red-200 text-red-400 line-through' : 'bg-white border-slate-200 text-slate-700'}`}
                                            >
                                                {ing.name}
                                                {isRemoved && <X size={14}/>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* EXTRAS */}
                        {configuringItem.item.allowedExtraIds && configuringItem.item.allowedExtraIds.length > 0 && (
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 mb-2 flex items-center gap-2"><Plus size={14}/> Aggiungi Extra</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {configuringItem.item.allowedExtraIds.map(eid => {
                                        const extra = db.settings.globalExtras.find(e => e.id === eid);
                                        if(!extra) return null;
                                        const isSelected = configuringItem.extras.includes(eid);
                                        return (
                                            <button 
                                                key={eid} 
                                                onClick={() => toggleExtra(eid)}
                                                className={`p-3 rounded-xl border-2 font-bold text-sm text-left flex justify-between items-center transition-all ${isSelected ? 'bg-green-50 border-green-500 text-green-700 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                <span>{extra.name}</span>
                                                <span className="text-xs opacity-60">+€{extra.price.toFixed(2)}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => addItemToCart(configuringItem.item, configuringItem.extras, configuringItem.removed)} 
                        className="m-4 p-4 bg-[#800020] text-white font-black rounded-2xl shadow-xl uppercase tracking-widest hover:scale-[1.02] transition-transform"
                    >
                        Conferma Modifiche
                    </button>
                </div>
            </div>
        )}

        {/* MODALE WALK-IN / FAI ACCOMODARE */}
        {isSeatingTable && selectedTable && (
            <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in border-4 border-slate-100 dark:border-slate-800">
                    <h3 className="text-2xl font-black italic uppercase text-[#800020] mb-4">Apri Tavolo {selectedTable}</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase">Nome Cliente (Opzionale)</label>
                            <input 
                                value={seatForm.name} 
                                onChange={e => setSeatForm({...seatForm, name: e.target.value})}
                                className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold border-2 border-transparent focus:border-[#800020] outline-none"
                                placeholder={`Tavolo ${selectedTable}`}
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-black text-slate-400 uppercase">Ospiti</label>
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                                    <button onClick={() => setSeatForm({...seatForm, pax: Math.max(1, seatForm.pax - 1)})} className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm"><Minus size={16}/></button>
                                    <span className="flex-1 text-center font-black text-xl">{seatForm.pax}</span>
                                    <button onClick={() => setSeatForm({...seatForm, pax: seatForm.pax + 1})} className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm"><Plus size={16}/></button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-black text-slate-400 uppercase">Orario</label>
                                <input 
                                    type="time" 
                                    value={seatForm.time} 
                                    onChange={e => setSeatForm({...seatForm, time: e.target.value})}
                                    className="w-full h-[52px] bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-center text-lg outline-none border-2 border-transparent focus:border-[#800020]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setIsSeatingTable(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl text-slate-600 dark:text-white">Annulla</button>
                        <button onClick={confirmSeatTable} className="flex-1 py-3 bg-[#800020] text-white font-black rounded-xl shadow-lg">CONFERMA</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-3xl font-black italic uppercase flex items-center gap-3"><Utensils size={32}/> Sala & Ordini ({viewShift})</h2>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase text-slate-400 pl-2">Suggerisci x Pax:</span>
                <input 
                    type="number" 
                    min={1} 
                    max={20} 
                    value={filterPax} 
                    onChange={e => setFilterPax(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-12 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-center font-black outline-none focus:ring-2 focus:ring-[#800020]"
                />
            </div>
        </div>
        
        {/* GRID TAVOLI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map(t => {
                const order = getTableOrder(t.id);
                // Notifica: se ci sono piatti 'ready' non ancora 'served'
                const hasReadyItems = order?.items.some(i => i.status === 'ready');
                const isJoined = order && order.tableIds && order.tableIds.length > 1;
                
                // Genera un colore hash per il gruppo se unito
                const groupColor = isJoined ? `hsl(${(order!.id.charCodeAt(2) * 50) % 360}, 70%, 90%)` : undefined;
                const borderColor = isJoined ? `hsl(${(order!.id.charCodeAt(2) * 50) % 360}, 70%, 60%)` : undefined;

                // Logic for highlighting based on filterPax
                const pax = typeof filterPax === 'number' ? filterPax : 0;
                // Highlight logic only active if no order present
                const isIdeal = !order && pax > 0 && t.capacity >= pax && t.capacity <= pax + 2;
                const isSmall = !order && pax > 0 && t.capacity < pax;
                
                return (
                    <button 
                        key={t.id} 
                        onClick={() => { setSelectedTable(t.id); setIsAddingItems(false); setCart([]); if(pax > 0) setPaxInput(pax); }} 
                        style={isJoined ? { backgroundColor: groupColor, borderColor: borderColor, borderStyle: 'dashed' } : {}}
                        className={`p-6 rounded-[32px] border-4 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
                            !isJoined && order ? 'bg-white border-indigo-100 text-indigo-900 shadow-md' : 
                            !isJoined && t.status === 'billing' ? 'bg-yellow-50 border-yellow-200' :
                            !isJoined && isIdeal ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100/50 animate-[pulse_3s_infinite] text-emerald-900' :
                            !isJoined && isSmall ? 'bg-slate-50 border-slate-200 opacity-40 grayscale hover:opacity-80 hover:grayscale-0' :
                            'bg-slate-50 border-slate-200 hover:border-green-300 shadow-md'
                        }`}
                    >
                        {isIdeal && (
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 z-10">
                                <Sparkles size={10}/> Ideale
                            </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                            <div className="text-3xl font-black opacity-80">T{t.id}</div>
                            {isJoined && <Link size={16} className="text-slate-500 opacity-50"/>}
                        </div>
                        
                        {order ? (
                             <>
                                <div className="text-xs font-bold uppercase bg-white/50 px-2 py-1 rounded-lg text-indigo-900 flex items-center gap-1">
                                    <Users size={12}/> {order.pax}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 truncate max-w-full px-1">{order.customerName}</div>
                                {hasReadyItems && (
                                    <div className="absolute top-2 right-2 animate-bounce bg-green-500 text-white p-1 rounded-full shadow-lg">
                                        <Bell size={16} fill="white"/>
                                    </div>
                                )}
                             </>
                        ) : (
                             <div className={`text-xs font-bold uppercase ${isSmall ? 'text-slate-400' : 'text-slate-400'}`}>
                                {isSmall ? `Max ${t.capacity}` : 'Libero'}
                             </div>
                        )}
                        
                        {t.status === 'billing' && <div className="absolute inset-0 bg-yellow-100/80 flex items-center justify-center font-bold text-yellow-700 uppercase tracking-widest text-xs">Conto</div>}
                    </button>
                )
            })}
        </div>
        
        {/* MODALE DETTAGLIO TAVOLO */}
        {selectedTable && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
                <div className="bg-white dark:bg-slate-900 w-full md:max-w-5xl h-[95vh] md:h-[85vh] rounded-t-[32px] md:rounded-[40px] flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 relative shadow-2xl">
                    
                    {/* HEADER MODALE */}
                    <div className="p-4 md:p-6 bg-slate-100 dark:bg-slate-800 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-2xl font-black italic">
                                {currentTableOrder ? `Tavolo ${formatTableString(currentTableOrder)}` : `Tavolo ${selectedTable}`}
                            </h3>
                            {currentTableOrder && <p className="text-sm text-slate-500">{currentTableOrder.customerName} • {currentTableOrder.pax} Pax</p>}
                        </div>
                        <button onClick={() => setSelectedTable(null)} className="p-3 bg-white dark:bg-slate-700 rounded-full hover:rotate-90 transition-transform shadow-sm"><X/></button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        
                        {/* CASO 1: TAVOLO LIBERO (Far Accomodare) */}
                        {!currentTableOrder ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-6">
                                <Users size={64} className="text-slate-300 mb-4"/>
                                <h4 className="text-2xl font-bold">Tavolo Libero</h4>
                                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                                    <button onClick={() => setPaxInput(Math.max(1, paxInput - 1))} className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm"><Minus/></button>
                                    <span className="text-3xl font-black w-12 text-center">{paxInput}</span>
                                    <button onClick={() => setPaxInput(paxInput + 1)} className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm"><Plus/></button>
                                </div>
                                <button onClick={openSeatModal} className="px-10 py-4 bg-[#800020] text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-transform">
                                    FAI ACCOMODARE
                                </button>
                            </div>
                        ) : (
                        /* CASO 2: TAVOLO OCCUPATO */
                            <>
                                {/* SINISTRA: MENU (Se in modalità aggiunta) o LISTA ORDINI */}
                                <div className={`w-full md:w-1/2 flex flex-col border-r dark:border-slate-700 transition-all ${isAddingItems ? 'bg-slate-50' : 'bg-white'}`}>
                                    {isAddingItems ? (
                                        <>
                                            <div className="p-2 border-b dark:border-slate-700 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                                                {categories.map(c => {
                                                  const count = cartCategoryCounts[c] || 0;
                                                  return (
                                                    <button 
                                                      key={c} 
                                                      onClick={() => setCat(c as any)} 
                                                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap relative transition-all ${cat === c ? 'bg-[#800020] text-white shadow-md' : 'bg-white text-slate-500 border'}`}
                                                    >
                                                      {c}
                                                      {count > 0 && (
                                                        <span className="absolute -top-1 -right-1 bg-[#800020] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-in zoom-in">
                                                          {count}
                                                        </span>
                                                      )}
                                                    </button>
                                                  );
                                                })}
                                                <button onClick={() => setIsAddingItems(false)} className="ml-auto px-4 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl whitespace-nowrap">Chiudi Menu</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                                                {/* MOSTRA SOLO ITEM VISIBILI E ORDINATI */}
                                                {db.menu
                                                    .filter(m => m.category === cat && m.visible)
                                                    .sort((a: MenuItem, b: MenuItem) => (a.order || 0) - (b.order || 0))
                                                    .map(m => {
                                                    const hasOptions = (m.allowedExtraIds?.length || 0) > 0 || (m.defaultIngredientIds?.length || 0) > 0;
                                                    return (
                                                    <button key={m.id} onClick={() => handleItemClick(m)} className="p-3 rounded-xl bg-white shadow-sm border text-left hover:border-[#800020] active:scale-95 transition-transform flex flex-col justify-between h-20 relative">
                                                        {hasOptions && <div className="absolute top-1 right-1 text-slate-300"><LayersIcon size={12}/></div>}
                                                        <div className="font-bold text-sm line-clamp-1">{m.name}</div>
                                                        <div className="text-xs text-slate-400 font-black">€{m.price.toFixed(2)}</div>
                                                    </button>
                                                )})}
                                            </div>
                                            
                                            {/* ANTEPRIMA CARRELLO LOCALE */}
                                            {cart.length > 0 && (
                                                <div className="p-4 bg-white dark:bg-slate-800 border-t flex flex-col gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom duration-300">
                                                    <div className="flex items-center justify-between">
                                                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Anteprima Comanda</h4>
                                                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{cart.length} articoli</span>
                                                    </div>
                                                    
                                                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                                                      {cart.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                          <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${item.requiresCooking ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{item.name}</span>
                                                                {(item.selectedExtras?.length || 0) > 0 && <span className="text-[9px] text-green-600">+{item.selectedExtras?.length} extra</span>}
                                                                {(item.removedIngredientIds?.length || 0) > 0 && <span className="text-[9px] text-red-500">Modificato</span>}
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center gap-3">
                                                            <span className="font-black">€{item.price.toFixed(2)}</span>
                                                            <button 
                                                              onClick={() => removeItemFromCart(item.id)} 
                                                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                              <Trash2 size={14}/>
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t dark:border-slate-700">
                                                      <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Totale Parziale</span>
                                                        <span className="font-black text-xl text-[#800020]">€{cart.reduce((a, b) => a + b.price, 0).toFixed(2)}</span>
                                                      </div>
                                                      <button 
                                                        onClick={sendOrder} 
                                                        className="px-6 py-3 bg-[#800020] text-white font-black rounded-xl shadow-lg flex items-center gap-2 hover:bg-[#600018] active:scale-95 transition-all"
                                                      >
                                                        INVIA IN CUCINA <PlayCircle size={18}/>
                                                      </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-6">
                                            <UtensilsCrossed size={64} className="text-slate-200"/>
                                            <p className="text-slate-400 font-medium text-center">Tavolo pronto per una nuova comanda</p>
                                            <button onClick={() => setIsAddingItems(true)} className="px-8 py-4 bg-white border-2 border-[#800020] text-[#800020] font-black rounded-2xl shadow-lg hover:bg-[#800020] hover:text-white transition-all flex items-center gap-2 active:scale-95">
                                                <Plus size={24}/> NUOVA ORDINAZIONE
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* DESTRA: STATO ORDINE ESISTENTE */}
                                <div className="w-full md:w-1/2 flex flex-col bg-slate-50 dark:bg-slate-900 h-full border-t md:border-t-0">
                                    <div className="p-4 font-black uppercase text-xs text-slate-400 tracking-widest border-b dark:border-slate-700 flex justify-between items-center">
                                      <span>Riepilogo Tavolo</span>
                                      {currentTableOrder.items.length > 0 && (
                                        <span className="bg-[#800020] text-white px-2 py-0.5 rounded text-[10px]">{currentTableOrder.items.length} art.</span>
                                      )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {currentTableOrder.items.length === 0 && (
                                          <div className="text-center italic text-slate-400 mt-10 flex flex-col items-center gap-2 opacity-50">
                                            <Soup size={32}/>
                                            Nessun piatto ordinato finora
                                          </div>
                                        )}
                                        
                                        {/* Items List */}
                                        {currentTableOrder.items.slice().reverse().map(item => (
                                            <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm flex items-center justify-between border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                                                <div className="flex items-center gap-3">
                                                    {/* STATUS ICON */}
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                                        ${item.status === 'new' ? 'bg-slate-100 text-slate-400 dark:bg-slate-700' : 
                                                          item.status === 'preparing' ? 'bg-orange-100 text-orange-500 animate-pulse' : 
                                                          item.status === 'ready' ? 'bg-green-500 text-white animate-bounce' : 
                                                          'bg-blue-50 text-blue-300 dark:bg-blue-900/20'}`}>
                                                        {item.status === 'new' && <Clock size={16}/>}
                                                        {item.status === 'preparing' && <Soup size={16}/>}
                                                        {item.status === 'ready' && <Bell size={16}/>}
                                                        {item.status === 'served' && <Check size={16}/>}
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-sm ${item.status === 'served' ? 'line-through opacity-50' : ''}`}>{item.name}</div>
                                                        <div className="text-[10px] uppercase font-bold text-slate-400">
                                                            {item.status === 'new' ? 'In attesa' : 
                                                             item.status === 'preparing' ? 'In preparazione' : 
                                                             item.status === 'ready' ? 'PRONTO' : 'Servito'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ACTIONS */}
                                                <div className="flex items-center gap-2">
                                                    {item.status === 'new' && (
                                                        <button onClick={() => deleteItem(currentTableOrder.id, item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                    )}
                                                    {item.status === 'ready' && (
                                                        <button onClick={() => serveItem(currentTableOrder.id, item.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors shadow-sm">
                                                            SERVI
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* FOOTER ACTIONS */}
                                    <div className="p-4 border-t dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0 safe-area-bottom">
                                         <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Conto Attuale</span>
                                            <span className="font-black text-2xl">€{currentTableOrder.items.reduce((a,b) => a + b.price, 0).toFixed(2)}</span>
                                         </div>
                                         <button 
                                            onClick={() => requestBill(selectedTable)} 
                                            disabled={currentTableObj?.status === 'billing'}
                                            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center gap-2 disabled:opacity-50 hover:bg-black transition-all active:scale-95"
                                         >
                                            <Receipt size={18}/> {currentTableObj?.status === 'billing' ? 'Conto Richiesto' : 'CHIEDI CONTO'}
                                         </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
