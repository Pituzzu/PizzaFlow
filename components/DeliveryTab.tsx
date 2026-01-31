
import React, { useState, useMemo } from 'react';
import { 
  X, Phone, Navigation, MapPin, Truck, CheckCircle, 
  RotateCcw, CreditCard, Banknote, User as UserIcon, History, 
  ChevronRight, AlertCircle, Clock, Users, Check
} from 'lucide-react';
import { DB, Order, User } from '../types';
import { timeToMinutes, getShiftFromTime } from './Shared';

export function DeliveryTab({ db, setDb, viewDate, viewShift, currentUser }: { db: DB, setDb: React.Dispatch<React.SetStateAction<DB>>, viewDate: string, viewShift: 'pranzo'|'cena', currentUser: User }) {
    const [subTab, setSubTab] = useState<'common' | 'my-trips' | 'history'>('common');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // 1. FILTRI LOGICI
    const baseOrders = useMemo(() => db.orders.filter(o => 
        o.type === 'consegna' && 
        o.isAccepted && 
        o.date === viewDate && 
        getShiftFromTime(o.time) === viewShift
    ), [db.orders, viewDate, viewShift]);

    // Ordini disponibili per tutti (non ancora spediti)
    const commonOrders = useMemo(() => baseOrders.filter(o => !o.isShipped && !o.isArchived)
        .sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time)), [baseOrders]);

    // I miei viaggi (spediti ma non ancora archiviati)
    const myTrips = useMemo(() => baseOrders.filter(o => o.isShipped && !o.isArchived && o.assignedCourierId === currentUser.id), [baseOrders, currentUser.id]);

    // Il mio storico (archiviati e consegnati da me)
    const myHistory = useMemo(() => baseOrders.filter(o => o.isArchived && o.assignedCourierId === currentUser.id)
        .sort((a,b) => b.timestamp - a.timestamp), [baseOrders, currentUser.id]);

    // 2. CALCOLI FINANZIARI
    const myTripTotal = useMemo(() => myTrips.reduce((acc, o) => {
        const total = o.items.reduce((a, i) => a + i.price, 0);
        const paid = o.items.filter(i => i.isPaid).reduce((a, i) => a + i.price, 0) + (o.receivedAmount || 0);
        return acc + Math.max(0, total - paid);
    }, 0), [myTrips]);

    const myHistoryTotal = useMemo(() => myHistory.reduce((acc, o) => acc + o.items.reduce((a, i) => a + i.price, 0), 0), [myHistory]);

    // 3. AZIONI
    const takeOwnership = (orderId: string) => {
        setDb(prev => ({
            ...prev,
            orders: prev.orders.map(o => o.id === orderId ? { ...o, isShipped: true, assignedCourierId: currentUser.id } : o)
        }));
        setSubTab('my-trips');
        setSelectedOrder(null);
    };

    const releaseOwnership = (orderId: string) => {
        setDb(prev => ({
            ...prev,
            orders: prev.orders.map(o => o.id === orderId ? { ...o, isShipped: false, assignedCourierId: undefined } : o)
        }));
        setSelectedOrder(null);
    };

    const markAsDelivered = (orderId: string) => {
        setDb(prev => ({
            ...prev,
            orders: prev.orders.map(o => {
                if (o.id !== orderId) return o;
                return { 
                    ...o, 
                    isArchived: true, 
                    isShipped: true, 
                    items: o.items.map(i => ({ ...i, isPaid: true })) 
                };
            })
        }));
        setSelectedOrder(null);
    };

    const isPaidOnline = (o: Order) => o.items.every(i => i.isPaid);

    const renderOrderCard = (order: Order) => {
        const total = order.items.reduce((a, i) => a + i.price, 0);
        const paid = order.items.filter(i => i.isPaid).reduce((a, i) => a + i.price, 0) + (order.receivedAmount || 0);
        const balance = Math.max(0, total - paid);
        const online = isPaidOnline(order);
        const allReady = order.items.every(i => i.status === 'ready' || i.status === 'served');

        return (
            <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`bg-white dark:bg-slate-800 p-5 rounded-[32px] shadow-sm border-2 transition-all active:scale-[0.98] flex flex-col justify-between relative overflow-hidden group hover:border-[#800020]
                    ${subTab === 'common' ? (allReady ? 'border-green-100' : 'border-slate-100 dark:border-slate-700') : 
                      subTab === 'my-trips' ? 'border-blue-100' : 'border-slate-100 opacity-60'}
                `}
            >
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className="text-xl font-black">{order.time}</span>
                            <span className="text-[10px] font-mono text-slate-300">#{order.id.slice(-4)}</span>
                        </div>
                        <div className={`p-2 rounded-xl ${online ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`} title={online ? 'Pagato Online' : 'Contanti alla Consegna'}>
                            {online ? <CreditCard size={18}/> : <Banknote size={18}/>}
                        </div>
                    </div>
                    
                    <h4 className="font-bold text-lg dark:text-white leading-tight truncate">{order.customerName}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin size={12}/> {order.customerAddress || `${order.customerStreet}, ${order.customerCivic}`}
                    </p>

                    {subTab === 'common' && allReady && (
                         <div className="mt-3 bg-green-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded w-fit animate-pulse">
                             Pronto al ritiro
                         </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t dark:border-slate-700 flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-slate-400">{online ? 'Pagato' : 'Da Incassare'}</span>
                        <span className={`text-xl font-black ${online ? 'text-green-500' : 'text-[#800020]'}`}>
                            €{online ? total.toFixed(2) : balance.toFixed(2)}
                        </span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" size={20}/>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in h-full flex flex-col pb-24 md:pb-0">
            {/* RIEPILOGO STATISTICHE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-3xl font-black italic uppercase text-[#800020] flex items-center gap-3 shrink-0">
                    <Truck size={32}/> Consegne
                </h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm shrink-0">
                        <div className="text-[9px] font-black uppercase text-slate-400">In Giro</div>
                        <div className="text-lg font-black text-blue-600">€{myTripTotal.toFixed(2)}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm shrink-0">
                        <div className="text-[9px] font-black uppercase text-slate-400">Mio Incasso</div>
                        <div className="text-lg font-black text-green-600">€{myHistoryTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* MOBILE NAVIGATION TABS */}
            <div className="flex p-1 bg-slate-200 dark:bg-slate-700 rounded-[20px] mb-6 shrink-0">
                <button 
                    onClick={() => setSubTab('common')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${subTab === 'common' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}
                >
                    <Users size={18}/> Comuni ({commonOrders.length})
                </button>
                <button 
                    onClick={() => setSubTab('my-trips')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${subTab === 'my-trips' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500'}`}
                >
                    <Truck size={18}/> Miei Viaggi ({myTrips.length})
                </button>
                <button 
                    onClick={() => setSubTab('history')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${subTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}
                >
                    <History size={18}/> Mio Storico ({myHistory.length})
                </button>
            </div>

            {/* GRID ORDINI */}
            <div className="flex-1 overflow-y-auto px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {subTab === 'common' && commonOrders.map(renderOrderCard)}
                    {subTab === 'my-trips' && myTrips.map(renderOrderCard)}
                    {subTab === 'history' && myHistory.map(renderOrderCard)}
                </div>

                {/* EMPTY STATES */}
                {((subTab === 'common' && commonOrders.length === 0) || 
                  (subTab === 'my-trips' && myTrips.length === 0) || 
                  (subTab === 'history' && myHistory.length === 0)) && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 italic">
                        <AlertCircle size={48} className="mb-4 opacity-20"/>
                        Nessun ordine in questa sezione
                    </div>
                )}
            </div>

            {/* DETTAGLIO ORDINE E AZIONI */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full md:max-w-xl max-h-[90vh] rounded-t-[40px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 bg-[#800020] text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter">{selectedOrder.customerName}</h3>
                                <p className="text-xs opacity-70 font-bold uppercase">{selectedOrder.time} • #{selectedOrder.id.slice(-4)}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* INDIRIZZO E MAPPA */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl shadow-sm"><MapPin className="text-[#800020]" size={24}/></div>
                                    <div className="flex-1">
                                        <div className="font-bold text-lg">{selectedOrder.customerAddress || `${selectedOrder.customerStreet} ${selectedOrder.customerCivic}, ${selectedOrder.customerCity}`}</div>
                                        {selectedOrder.customerExtra && <div className="text-xs text-[#800020] font-black uppercase mt-1 tracking-tight">{selectedOrder.customerExtra}</div>}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <a href={`tel:${selectedOrder.customerPhone}`} className="py-4 bg-white dark:bg-slate-700 border shadow-sm rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors uppercase">
                                        <Phone size={18}/> Chiama
                                    </a>
                                    <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.customerAddress || "")}`, '_blank')} className="py-4 bg-white dark:bg-slate-700 border shadow-sm rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors uppercase">
                                        <Navigation size={18}/> Naviga
                                    </button>
                                </div>
                            </div>

                            {/* NOTE */}
                            {selectedOrder.orderNotes && (
                                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex items-start gap-3">
                                    <AlertCircle className="text-yellow-600 shrink-0" size={20}/>
                                    <p className="text-sm font-medium text-yellow-800 italic">"{selectedOrder.orderNotes}"</p>
                                </div>
                            )}

                            {/* RIEPILOGO CASSA ORDINE */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border-4 border-slate-100 dark:border-slate-700 text-center">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center justify-center gap-2">
                                    {isPaidOnline(selectedOrder) ? <CreditCard size={14}/> : <Banknote size={14}/>}
                                    {isPaidOnline(selectedOrder) ? 'ORDINE GIÀ PAGATO ONLINE' : 'PAGAMENTO ALLA CONSEGNA'}
                                </div>
                                <div className={`text-5xl font-black tracking-tighter ${isPaidOnline(selectedOrder) ? 'text-green-500' : 'text-[#800020]'}`}>
                                    €{selectedOrder.items.reduce((a,b)=>a+b.price, 0).toFixed(2)}
                                </div>
                            </div>

                            {/* Lista Prodotti con Spunta Verde */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Verifica Prodotti</h4>
                                {selectedOrder.items.map((item, i) => {
                                    const isReady = item.status === 'ready' || item.status === 'served';
                                    return (
                                        <div key={i} className="flex justify-between items-center py-2 border-b dark:border-slate-800 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isReady ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent'}`}>
                                                    {isReady && <Check size={14} strokeWidth={4}/>}
                                                </div>
                                                <span className={`font-medium text-sm ${!isReady ? 'text-slate-400 italic' : 'dark:text-white'}`}>{item.name}</span>
                                            </div>
                                            <span className={`font-bold text-sm ${!isReady ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>€{item.price.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 safe-area-bottom">
                            {!selectedOrder.isArchived && (
                                <div className="flex flex-col gap-3">
                                    {!selectedOrder.isShipped ? (
                                        <div className="space-y-3">
                                            {(() => {
                                                const allReady = selectedOrder.items.every(i => i.status === 'ready' || i.status === 'served');
                                                return (
                                                    <>
                                                        {!allReady && (
                                                            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-2xl border border-orange-200 animate-in fade-in">
                                                                <AlertCircle size={20}/>
                                                                <span className="text-xs font-black uppercase">Attesa: La cucina sta ancora preparando questo ordine</span>
                                                            </div>
                                                        )}
                                                        <button 
                                                            onClick={() => takeOwnership(selectedOrder.id)}
                                                            disabled={!allReady}
                                                            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                                        >
                                                            <Truck size={24}/> Prendi in Carico
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => markAsDelivered(selectedOrder.id)}
                                                className="w-full py-5 bg-green-500 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95"
                                            >
                                                <CheckCircle size={24}/> Consegnato & Pagato
                                            </button>
                                            <button 
                                                onClick={() => releaseOwnership(selectedOrder.id)} 
                                                className="w-full py-3 text-slate-400 font-bold flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
                                            >
                                                <RotateCcw size={16}/> Rilascia Ordine (Rimetti in comune)
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {selectedOrder.isArchived && (
                                <div className="w-full py-4 bg-green-100 text-green-700 font-black rounded-3xl flex items-center justify-center gap-3 uppercase tracking-widest">
                                    <CheckCircle size={24}/> Ordine Completato
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
