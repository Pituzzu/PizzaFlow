
import React, { useState, useMemo } from 'react';
import { 
  Sun, Moon, ShoppingBag, Bike, Users, AlertCircle, Clock, X, 
  Map as MapIcon, ArrowUpRight, CheckCircle, Edit, Phone, Calendar, Timer
} from 'lucide-react';
import { DB, Order, OrderItem, OrderType } from '../types';
import { 
  generateSmartSlots, getShiftFromTime, getSlotLoad, timeToMinutes, minutesToTime, formatTableString, triggerWhatsApp
} from './Shared';
import { OrderEntryModal } from './OrderEntryModal';

const DEFAULT_TABLE_DURATION = 90;

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

const getDateLabel = (dateStr: string) => {
    if (!dateStr) return 'DATA SCONOSCIUTA';
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    if (dateStr === today) return 'OGGI';
    if (dateStr === tomorrow) return 'DOMANI';
    
    return new Date(dateStr).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
};

export function ReservationsTab({ db, setDb, showNotify, viewDate, viewShift }: any) {
  const [subTab, setSubTab] = useState<'richieste' | 'agenda' | 'completati'>('richieste');
  const [manualMode, setManualMode] = useState<OrderType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({ 
      name: '', phone: '+39 ', date: viewDate, time: '', 
      street: '', civic: '', city: 'Enna', extra: '', 
      pax: 2, tableId: '', tableIds: [] as number[], customCapacity: 0, notes: '' 
  });
  const [manualCart, setManualCart] = useState<OrderItem[]>([]);
  const [showOverbookingConfirm, setShowOverbookingConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  
  const { systemConfig, whatsappConfig } = db.settings;

  // LOGICA DI ORDINAMENTO RICHIESTE
  const pendingOrders = useMemo(() => {
      return db.orders
        .filter((o: Order) => !o.isAccepted && !o.isArchived)
        .sort((a: Order, b: Order) => {
            // 1. Ordina per data (Priorità alle date più vicine/passate)
            if (a.date !== b.date) {
                return (a.date || '') > (b.date || '') ? 1 : -1;
            }
            // 2. A parità di data, ordina per momento di creazione (FIFO)
            return a.timestamp - b.timestamp;
        });
  }, [db.orders]);

  const agendaOrders = useMemo(() => db.orders.filter((o: Order) => o.isAccepted && !o.isArchived && o.date === viewDate && getShiftFromTime(o.time) === viewShift).sort((a: Order, b: Order) => timeToMinutes(a.time) - timeToMinutes(b.time)), [db.orders, viewDate, viewShift]);
  const completedOrders = useMemo(() => db.orders.filter((o: Order) => o.isArchived && o.date === viewDate && getShiftFromTime(o.time) === viewShift).sort((a: Order, b: Order) => b.timestamp - a.timestamp), [db.orders, viewDate, viewShift]);

  const shiftSlots = useMemo(() => generateSmartSlots(viewDate, db.settings).filter(s => getShiftFromTime(s) === viewShift), [viewDate, db.settings, viewShift]);

  const startEditOrder = (order: Order) => {
      setEditingId(order.id);
      setManualMode(order.type);
      setManualForm({
          name: order.customerName, phone: order.customerPhone || '+39 ', date: order.date || viewDate, time: order.time,
          street: order.customerStreet || '', civic: order.customerCivic || '', city: order.customerCity || 'Enna',
          extra: order.customerExtra || '', pax: order.pax || 2,
          tableId: order.tableId ? String(order.tableId) : '',
          tableIds: order.tableIds || (order.tableId ? [order.tableId] : []),
          customCapacity: order.customCapacity || 0, notes: order.orderNotes || ''
      });
      setManualCart(order.items);
      setFormErrors({});
  };

  const handleManualSubmit = (force = false) => {
      const newErrors: Record<string, boolean> = {};
      if (!manualForm.name.trim()) newErrors.name = true;
      if (!manualForm.phone.trim()) newErrors.phone = true;
      if (manualMode !== 'tavolo' && !manualForm.time) newErrors.time = true;
      if (manualMode === 'consegna' && (!manualForm.street.trim() || !manualForm.civic.trim())) { newErrors.street = true; newErrors.civic = true; }
      if (manualMode === 'tavolo' && !manualForm.tableId && (!manualForm.tableIds || manualForm.tableIds.length === 0)) newErrors.tableId = true;
      if (Object.keys(newErrors).length > 0) { setFormErrors(newErrors); showNotify("Campi obbligatori mancanti"); return; }

      // ESCLUDIAMO l'ID dell'ordine corrente se siamo in modalità modifica (editingId)
      const currentSlotLoad = getSlotLoad(db.orders, manualForm.time, manualForm.date, editingId || undefined);
      const incomingLoad = manualCart.filter(i => i.requiresCooking || i.category === 'Pizze').length;
      if (manualMode !== 'tavolo' && (currentSlotLoad + incomingLoad) > db.settings.maxPizzePerSlot && !force) { setShowOverbookingConfirm(true); return; }

      // Calcolo durata personalizzata se attiva
      const customDuration = manualMode === 'tavolo' ? (db.settings.tableConfig.stayDuration || DEFAULT_TABLE_DURATION) : undefined;

      const orderData: any = {
          type: manualMode!, customerName: manualForm.name, customerPhone: manualForm.phone,
          customerStreet: manualForm.street, customerCivic: manualForm.civic, customerCity: manualForm.city,
          customerExtra: manualForm.extra, customerAddress: manualMode === 'consegna' ? `${manualForm.street}, ${manualForm.civic}, ${manualForm.city}` : undefined,
          orderNotes: manualForm.notes, pax: manualMode === 'tavolo' ? manualForm.pax : undefined,
          tableId: manualMode === 'tavolo' && manualForm.tableIds.length > 0 ? manualForm.tableIds[0] : undefined,
          tableIds: manualMode === 'tavolo' ? manualForm.tableIds : undefined,
          time: manualForm.time, date: manualForm.date, items: manualCart, isAccepted: true,
          duration: customDuration
      };

      let finalOrder: Order;
      let isFirstAcceptance = false;

      if (editingId) {
          const originalOrder = db.orders.find(o => o.id === editingId);
          // Se l'ordine originale non era ancora accettato, questa è la prima conferma
          if (originalOrder && !originalOrder.isAccepted) {
              isFirstAcceptance = true;
          }
          finalOrder = { ...originalOrder!, ...orderData };
          setDb((prev: DB) => ({ ...prev, orders: prev.orders.map(o => o.id === editingId ? finalOrder : o) }));
      } else {
          // Nuovo ordine manuale: conta sempre come prima accettazione/invio
          isFirstAcceptance = true;
          finalOrder = { ...orderData, id: "M-" + Math.random().toString(36).substr(2, 4).toUpperCase(), timestamp: Date.now(), isArchived: false, isShipped: false };
          setDb((prev: DB) => ({ ...prev, orders: [...prev.orders, finalOrder] }));
      }

      // Trigger WhatsApp SOLO se è la prima accettazione o un nuovo ordine manuale
      if (isFirstAcceptance) {
          triggerWhatsApp(finalOrder, 'accept', whatsappConfig);
          showNotify("Ordine salvato e conferma WhatsApp inviata");
      } else {
          showNotify("Ordine aggiornato correttamente");
      }
      
      closeModal();
  };

  const handleReject = (order: Order) => {
      triggerWhatsApp(order, 'reject', whatsappConfig);
      setDb((p:DB)=>({...p, orders: p.orders.filter(o=>o.id!==order.id)}));
      showNotify("Ordine rifiutato e notificato");
  };

  const closeModal = () => { setManualMode(null); setEditingId(null); setManualCart([]); setShowOverbookingConfirm(false); setFormErrors({}); };
  const archiveOrder = (id: string) => { setDb((prev: DB) => ({ ...prev, orders: prev.orders.map(o => o.id === id ? { ...o, isArchived: true } : o) })); showNotify("Ordine archiviato"); };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 xl:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <h2 className="text-3xl font-black italic uppercase mb-2">Prenotazioni</h2>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-black uppercase text-slate-400 mb-2 flex items-center gap-2">
                    {viewShift === 'pranzo' ? <Sun size={14}/> : <Moon size={14}/>} Capacità {viewShift}
                </div>
                <div className="overflow-x-auto no-scrollbar h-24">{renderCapacityBar(shiftSlots, db, viewDate)}</div>
            </div>
        </div>
        <div className="lg:col-span-1 grid grid-cols-1 gap-2">
            {systemConfig.moduleTakeaway && (
                <button onClick={() => setManualMode('asporto')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 hover:scale-[1.02]">
                    <ShoppingBag size={20}/> <span>Nuovo Asporto</span>
                </button>
            )}
            {systemConfig.moduleDelivery && (
                <button onClick={() => setManualMode('consegna')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 hover:scale-[1.02]">
                    <Bike size={20}/> <span>Nuova Consegna</span>
                </button>
            )}
            {systemConfig.moduleTables && (
                <button onClick={() => setManualMode('tavolo')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl font-bold text-[#800020] shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 hover:scale-[1.02]">
                    <Users size={20}/> <span>Nuovo Tavolo</span>
                </button>
            )}
        </div>
      </div>

      <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button onClick={() => setSubTab('richieste')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${subTab === 'richieste' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Richieste {pendingOrders.length > 0 && <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingOrders.length}</span>}</button>
          <button onClick={() => setSubTab('agenda')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-xs font-black uppercase transition-all ${subTab === 'agenda' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>In Agenda ({agendaOrders.length})</button>
          <button onClick={() => setSubTab('completati')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-xs font-black uppercase transition-all ${subTab === 'completati' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Completati ({completedOrders.length})</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {subTab === 'richieste' && pendingOrders.map((order: Order, idx: number) => {
             // Raggruppamento per data
             const showHeader = idx === 0 || order.date !== pendingOrders[idx - 1].date;
             
             return (
               <React.Fragment key={order.id}>
                 {showHeader && (
                     <div className="col-span-full mt-4 mb-2 flex items-center gap-3">
                         <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
                         <div className="text-xs font-black uppercase text-slate-400 tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-2">
                             <Calendar size={12}/> {getDateLabel(order.date || '')}
                         </div>
                         <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
                     </div>
                 )}
                 <div className="bg-white dark:bg-slate-800 p-0 rounded-[32px] shadow-sm border border-orange-200 flex flex-col justify-between overflow-hidden">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-6 flex justify-between items-start border-b border-orange-100 dark:border-orange-800/30">
                        <div>
                            <div className="text-[#800020] text-2xl font-black uppercase leading-none mb-1">
                                {getDateLabel(order.date || '').split(' ').slice(0,2).join(' ')}
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                {order.time}
                            </div>
                            <span className="inline-block mt-2 bg-white dark:bg-slate-800 border border-orange-200 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm">
                                {order.type}
                            </span>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm text-center min-w-[70px] border border-slate-100 dark:border-slate-700">
                            {order.type === 'tavolo' ? (
                                <>
                                    <Users size={24} className="mx-auto text-slate-400 mb-1"/>
                                    <div className="text-2xl font-black text-slate-700 dark:text-white">{order.pax}</div>
                                    <div className="text-[9px] font-bold uppercase text-slate-400">Persone</div>
                                </>
                            ) : (
                                <>
                                    <ShoppingBag size={24} className="mx-auto text-slate-400 mb-1"/>
                                    <div className="text-2xl font-black text-slate-700 dark:text-white">{order.items.length}</div>
                                    <div className="text-[9px] font-bold uppercase text-slate-400">Articoli</div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="font-bold text-lg text-slate-700 dark:text-slate-200">{order.customerName}</div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm mb-4">
                            <Phone size={14}/> {order.customerPhone}
                        </div>
                        
                        {order.orderNotes && (
                            <div className="bg-yellow-50 p-3 rounded-xl text-xs italic text-yellow-800 border border-yellow-100 mb-4">
                                "{order.orderNotes}"
                            </div>
                        )}

                        <div className="flex gap-2 mt-auto">
                            <button onClick={() => startEditOrder(order)} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-200 dark:shadow-none uppercase tracking-widest">
                                Gestisci
                            </button>
                            <button onClick={() => handleReject(order)} className="px-5 bg-red-50 text-red-500 border border-red-100 rounded-2xl hover:bg-red-100 transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
               </React.Fragment>
             );
          })}

          {subTab === 'agenda' && agendaOrders.map((order: Order) => {
             // Calcolo orario di fine se la modalità tavoli è durata/turni
             const endTime = (db.settings.tableConfig.mode !== 'libero' || order.duration) 
                ? minutesToTime(timeToMinutes(order.time) + (order.duration || db.settings.tableConfig.stayDuration || DEFAULT_TABLE_DURATION))
                : null;

             return (
             <div key={order.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col justify-between">
                 <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{order.type} {formatTableString(order)}</span>
                    <h4 className="font-bold text-lg">{order.customerName}</h4>
                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Clock size={14}/> {order.time}</p>
                    {endTime && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit">
                            <Timer size={12}/> Fino alle {endTime}
                        </div>
                    )}
                 </div>
                 <div className="mt-4 pt-4 border-t flex gap-2">
                     <button onClick={() => startEditOrder(order)} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl"><Edit size={18}/></button>
                     <button onClick={() => archiveOrder(order.id)} className="flex-1 px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2"><CheckCircle size={16}/> Completa</button>
                 </div>
             </div>
          )})}
      </div>
      {manualMode && (
          <OrderEntryModal 
            manualMode={manualMode} editingId={editingId} manualForm={manualForm} setManualForm={setManualForm} manualCart={manualCart} setManualCart={setManualCart}
            db={db} setDb={setDb} closeModal={closeModal} handleManualSubmit={handleManualSubmit} viewDate={viewDate} viewShift={viewShift}
            showOverbookingConfirm={showOverbookingConfirm} setShowOverbookingConfirm={setShowOverbookingConfirm} errors={formErrors} clearError={(field: string) => setFormErrors(prev => ({ ...prev, [field]: false }))}
          />
      )}
    </div>
  );
}
