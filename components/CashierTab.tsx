
import React, { useState, useMemo } from 'react';
import { 
  Banknote, Receipt, Users, CreditCard, CheckCircle, X, 
  Calculator, Wallet, AlertTriangle, Clock, History, 
  ChevronDown, ChevronUp, Soup, Bell, Check, List, RotateCcw,
  RefreshCcw, Eye, ArrowLeft, Pizza, Lock, User as UserIcon
} from 'lucide-react';
import { DB, Order, OrderItem, PaymentMethod, User, PaymentTransaction } from '../types';
import { getShiftFromTime, formatTableString, groupCartItems } from './Shared';

export function CashierTab({ db, setDb, viewDate, viewShift, showNotify, currentUser }: { db: DB, setDb: React.Dispatch<React.SetStateAction<DB>>, viewDate: string, viewShift: 'pranzo'|'cena', showNotify: (m:string)=>void, currentUser: User }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'select' | 'full' | 'split' | 'items'>('select');
  const [selectedMethod, setSelectedMethod] = useState<'contanti' | 'carta' | null>(null);
  
  // Stati per le modalità specifiche
  const [viewingArchivedId, setViewingArchivedId] = useState<string | null>(null);
  const [romanDivisor, setRomanDivisor] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCoverIndices, setSelectedCoverIndices] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 1. FILTRI ORDINI
  const openOrders = useMemo(() => {
    return db.orders.filter((o: Order) => 
      o.isAccepted && !o.isArchived && o.date === viewDate && getShiftFromTime(o.time) === viewShift
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [db.orders, viewDate, viewShift]);

  const archivedOrders = useMemo(() => {
    return db.orders.filter((o: Order) => 
      o.isArchived && o.date === viewDate && getShiftFromTime(o.time) === viewShift
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [db.orders, viewDate, viewShift]);

  const selectedOrder = openOrders.find(o => o.id === selectedOrderId);
  const archivedToView = archivedOrders.find(o => o.id === viewingArchivedId);

  // 2. LOGICA CALCOLO CONTO
  const calculateTotals = (order: Order) => {
    const itemsTotal = order.items.reduce((acc, i) => acc + i.price, 0);
    // Calcolo Coperto solo se Tavolo e non già calcolato (snapshot)
    const currentCoverCharge = order.type === 'tavolo' ? (order.pax || 0) * db.settings.tableConfig.coverCharge : 0;
    
    // Se order.coverChargeTotal esiste usiamo quello (storico), altrimenti usiamo il calcolo live
    const effectiveCover = order.coverChargeTotal !== undefined ? order.coverChargeTotal : currentCoverCharge;

    const total = itemsTotal + effectiveCover;

    // Totale Pagato basato su array transazioni
    const payments = order.payments || [];
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0) + (order.receivedAmount || 0); // Include legacy generic cash
    
    // Totali separati per visualizzazione
    const totalCash = payments.filter(p => p.method === 'contanti').reduce((acc, p) => acc + p.amount, 0) + (order.receivedAmount || 0);
    const totalCard = payments.filter(p => p.method === 'carta').reduce((acc, p) => acc + p.amount, 0);

    const paidByItems = order.items.filter(i => i.isPaid).reduce((acc, i) => acc + i.price, 0);
    const paidByCovers = (order.paidCoverCharges || 0) * db.settings.tableConfig.coverCharge;

    const balance = Math.max(0, total - totalPaid);
    
    const hasPendingKitchen = order.items.some(i => i.requiresCooking && (i.status === 'new' || i.status === 'preparing'));
    
    return { total, totalPaid, balance, hasPendingKitchen, effectiveCover, totalCash, totalCard, paidByItems, paidByCovers };
  };

  const shiftTotal = useMemo(() => {
      const openPaid = openOrders.reduce((acc, o) => acc + calculateTotals(o).totalPaid, 0);
      const archivedPaid = archivedOrders.reduce((acc, o) => {
          const items = o.items.reduce((a, i) => a + i.price, 0);
          const cover = o.coverChargeTotal || 0;
          return acc + items + cover;
      }, 0);
      return openPaid + archivedPaid;
  }, [openOrders, archivedOrders]);

  // 3. AZIONI PAGAMENTO

  const addPayment = (orderId: string, amount: number, method: 'contanti' | 'carta') => {
      const newTransaction: PaymentTransaction = {
          id: 'pay-' + Math.random().toString(36).substr(2, 9),
          amount,
          method,
          timestamp: Date.now()
      };

      setDb((prev: DB) => ({
          ...prev,
          orders: prev.orders.map(o => {
              if(o.id !== orderId) return o;
              return {
                  ...o,
                  payments: [...(o.payments || []), newTransaction]
              };
          })
      }));
  };

  const handleFullPayment = () => {
      if(!selectedOrder || !selectedMethod) return;
      const { balance } = calculateTotals(selectedOrder);
      if(balance <= 0.05) return;

      addPayment(selectedOrder.id, balance, selectedMethod);
      // Auto-finalize if balance is cleared (handled by effect or user click)
      // Per UX, lasciamo che l'utente clicchi "Archivia" dopo aver pagato
      showNotify(`Saldo registrato (${selectedMethod})`);
  };

  const handleSplitPayment = (amount: number, method: 'contanti' | 'carta') => {
      if(!selectedOrder) return;
      addPayment(selectedOrder.id, amount, method);
      showNotify(`Quota di €${amount.toFixed(2)} pagata`);
  };

  const handleItemPayment = (method: 'contanti' | 'carta') => {
      if(!selectedOrder) return;
      
      const itemsAmount = selectedOrder.items.filter(i => selectedItemIds.includes(i.id)).reduce((a,b)=>a+b.price,0);
      const coversAmount = selectedCoverIndices.length * db.settings.tableConfig.coverCharge;
      const totalToPay = itemsAmount + coversAmount;

      if(totalToPay <= 0) return;

      setDb((prev: DB) => ({
          ...prev,
          orders: prev.orders.map(o => {
              if (o.id !== selectedOrder.id) return o;
              const newTransaction: PaymentTransaction = {
                  id: 'pay-' + Math.random().toString(36).substr(2, 9),
                  amount: totalToPay,
                  method,
                  timestamp: Date.now()
              };
              return {
                  ...o,
                  items: o.items.map(i => selectedItemIds.includes(i.id) ? { ...i, isPaid: true } : i),
                  paidCoverCharges: (o.paidCoverCharges || 0) + selectedCoverIndices.length,
                  payments: [...(o.payments || []), newTransaction]
              };
          })
      }));
      setSelectedItemIds([]);
      setSelectedCoverIndices([]);
      showNotify(`Selezione saldata (${method})`);
  };

  const resetOrderPayments = (orderId: string) => {
    setDb((prev: DB) => ({
        ...prev,
        orders: prev.orders.map(o => {
            if (o.id !== orderId) return o;
            return {
                ...o,
                receivedAmount: 0,
                payments: [],
                paidCoverCharges: 0,
                items: o.items.map(i => ({ ...i, isPaid: false }))
            };
        })
    }));
    showNotify("Pagamenti resettati");
    setPaymentMode('select');
  };

  const finalizeOrder = (orderId: string) => {
    if(!selectedOrder) return;
    const { effectiveCover } = calculateTotals(selectedOrder);

    setDb((prev: DB) => {
      const order = prev.orders.find(o => o.id === orderId);
      const tablesToFree = order?.tableIds || (order?.tableId ? [order.tableId] : []);
      
      return {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? { 
            ...o, 
            isArchived: true, 
            closedBy: currentUser.username, 
            coverChargeTotal: effectiveCover 
        } : o),
        tables: prev.tables.map(t => tablesToFree.includes(t.id) ? { ...t, status: 'free' } : t)
      };
    });
    setSelectedOrderId(null);
    showNotify("Ordine archiviato");
  };

  // UI HELPERS
  const openOrderModal = (order: Order) => {
      setSelectedOrderId(order.id);
      setPaymentMode('select');
      setRomanDivisor(order.pax || 2);
      setSelectedItemIds([]);
      setSelectedCoverIndices([]);
      setSelectedMethod(null);
  };

  const totals = selectedOrder ? calculateTotals(selectedOrder) : { balance: 0, total: 0, totalPaid: 0, paidByItems: 0, paidByCovers: 0, effectiveCover: 0, totalCash: 0, totalCard: 0 };

  // CALCOLO VARIABILI ROMANA (Memoizzato per stabilità render)
  const splitBase = totals.total; // Dividiamo sempre il totale, poi verifichiamo quanto è pagato
  const singleShare = splitBase / romanDivisor;
  // Quante quote intere sono coperte dal totale pagato
  const paidSharesCount = Math.floor((totals.totalPaid + 0.05) / singleShare);

  return (
    <div className="space-y-6 animate-in fade-in pb-24 md:pb-8">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-black italic uppercase text-[#800020] flex items-center gap-3">
              <Banknote size={32}/> Modulo Cassa
          </h2>
          <div className="bg-white dark:bg-slate-800 px-6 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
              <div className="text-[10px] font-black uppercase text-slate-400">Incasso Turno</div>
              <div className="text-2xl font-black text-green-600">€{shiftTotal.toFixed(2)}</div>
          </div>
      </div>

      {/* LISTA CONTI APERTI */}
      <div>
          <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase text-slate-400 tracking-widest">
              <Clock size={14}/> Conti Aperti ({openOrders.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {openOrders.map(order => {
              const { total, balance, hasPendingKitchen } = calculateTotals(order);
              const isBilling = order.tableIds 
                ? order.tableIds.some(id => db.tables.find(t => t.id === id)?.status === 'billing')
                : db.tables.find(t => t.id === order.tableId)?.status === 'billing';
              
              return (
                <div 
                    key={order.id} 
                    onClick={() => openOrderModal(order)}
                    className={`bg-white dark:bg-slate-800 p-5 rounded-[32px] shadow-sm border-4 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden h-full
                        ${isBilling ? 'border-[#800020] animate-[pulse_2s_infinite]' : 'border-slate-100 dark:border-slate-700'}
                    `}
                >
                  {isBilling && <div className="absolute top-0 right-0 bg-[#800020] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">RICHIESTA CONTO</div>}
                  
                  <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                            {order.type} {formatTableString(order)}
                        </span>
                        <span className="font-mono text-[9px] text-slate-300">#{order.id.slice(-4)}</span>
                      </div>
                      <h4 className="text-lg font-black dark:text-white mt-1 truncate">{order.customerName}</h4>
                      
                      {hasPendingKitchen && (
                          <div className="mt-2 flex items-center gap-1 text-orange-600">
                              <AlertTriangle size={14}/>
                              <span className="text-[10px] font-black uppercase">Cucina attiva</span>
                          </div>
                      )}
                  </div>

                  <div className="mt-auto pt-4 border-t dark:border-slate-700">
                      <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-black text-slate-400">Residuo:</span>
                              <span className={`text-2xl font-black ${balance <= 0.05 ? 'text-green-500' : 'text-[#800020]'}`}>
                                  €{balance.toFixed(2)}
                              </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 text-right">
                              Tot: €{total.toFixed(2)}
                          </div>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
          {openOrders.length === 0 && <div className="p-12 text-center text-slate-400 italic bg-slate-100/50 dark:bg-slate-800/30 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-700">Nessun conto aperto.</div>}
      </div>

      {/* SEZIONE STORICO (invariata logica visualizzazione) */}
      <div className="pt-4">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest hover:text-slate-600 transition-colors">
              <History size={14}/> Storico Pagamenti ({archivedOrders.length})
              {showHistory ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          
          {showHistory && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                  {archivedOrders.map(o => {
                      // Calcola il totale comprensivo di tutto per lo storico
                      const items = o.items.reduce((a,i)=>a+i.price,0);
                      const cover = o.coverChargeTotal || 0;
                      return (
                      <div key={o.id} onClick={() => setViewingArchivedId(o.id)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-all group relative overflow-hidden">
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{o.time} • {o.type}</div>
                              <div className="font-bold text-sm truncate max-w-[120px]">{o.customerName}</div>
                          </div>
                          <div className="text-right mt-2 flex justify-between items-end">
                              <div className="text-[9px] font-mono text-slate-400">#{o.id.slice(-4)}</div>
                              <div className="font-black text-green-600">€{(items + cover).toFixed(2)}</div>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>

      {/* MODALE DI PAGAMENTO PRINCIPALE */}
      {selectedOrderId && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-0 md:p-4" onClick={() => setSelectedOrderId(null)}>
              <div className="bg-white dark:bg-slate-900 w-full md:max-w-4xl md:h-auto max-h-[90vh] rounded-t-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                  
                  {/* Header Modale */}
                  <div className="p-6 bg-[#800020] text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                      <div className="relative z-10">
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-1">
                              {paymentMode === 'select' ? 'Gestione Conto' : paymentMode === 'full' ? 'Conto Intero' : paymentMode === 'split' ? 'Alla Romana' : 'Piatti Separati'}
                          </h3>
                          <div className="flex items-center gap-3 text-sm font-medium opacity-90">
                              <span>{selectedOrder.customerName}</span>
                              <span>•</span>
                              <span>Tavolo {formatTableString(selectedOrder)}</span>
                          </div>
                      </div>
                      
                      {/* Balance Display Big */}
                      <div className="relative z-10 text-right">
                          <div className="text-[10px] uppercase font-black opacity-70 tracking-widest">Residuo da Pagare</div>
                          <div className="text-3xl md:text-4xl font-black">€{totals.balance.toFixed(2)}</div>
                      </div>

                      {/* Close */}
                      <button onClick={() => setSelectedOrderId(null)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-20"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                      
                      {/* 1. SELETTORE MODALITÀ */}
                      {paymentMode === 'select' && (
                          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                              <button onClick={() => setPaymentMode('full')} className="group bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 hover:border-[#800020] hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                      <CreditCard size={40}/>
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-black uppercase text-slate-700 dark:text-white">Conto Intero</h4>
                                      <p className="text-xs text-slate-400 mt-2 font-medium">Salda l'intero importo residuo in un'unica soluzione.</p>
                                  </div>
                              </button>

                              <button onClick={() => setPaymentMode('split')} className="group bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 hover:border-[#800020] hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="w-20 h-20 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                      <Users size={40}/>
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-black uppercase text-slate-700 dark:text-white">Alla Romana</h4>
                                      <p className="text-xs text-slate-400 mt-2 font-medium">Dividi il conto in parti uguali tra i commensali.</p>
                                  </div>
                              </button>

                              <button onClick={() => setPaymentMode('items')} className="group bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 hover:border-[#800020] hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                      <List size={40}/>
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-black uppercase text-slate-700 dark:text-white">Piatti Separati</h4>
                                      <p className="text-xs text-slate-400 mt-2 font-medium">Seleziona specifici prodotti da pagare singolarmente.</p>
                                  </div>
                              </button>
                          </div>
                      )}

                      {/* 2. CONTO INTERO */}
                      {paymentMode === 'full' && (
                          <div className="p-8 flex flex-col items-center justify-center h-full gap-8">
                              <div className="flex gap-6 w-full max-w-lg">
                                  <button 
                                    onClick={() => setSelectedMethod('contanti')}
                                    className={`flex-1 p-6 rounded-[24px] border-4 flex flex-col items-center gap-4 transition-all ${selectedMethod === 'contanti' ? 'border-green-500 bg-green-50 text-green-700 shadow-xl scale-105' : 'border-slate-200 bg-white text-slate-400 hover:border-green-300'}`}
                                  >
                                      <Banknote size={48}/>
                                      <span className="font-black text-xl uppercase">Contanti</span>
                                  </button>
                                  <button 
                                    onClick={() => setSelectedMethod('carta')}
                                    className={`flex-1 p-6 rounded-[24px] border-4 flex flex-col items-center gap-4 transition-all ${selectedMethod === 'carta' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xl scale-105' : 'border-slate-200 bg-white text-slate-400 hover:border-blue-300'}`}
                                  >
                                      <CreditCard size={48}/>
                                      <span className="font-black text-xl uppercase">Carta</span>
                                  </button>
                              </div>

                              <button 
                                  onClick={handleFullPayment}
                                  disabled={!selectedMethod || totals.balance <= 0.05}
                                  className="w-full max-w-sm py-5 bg-[#800020] text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50 disabled:grayscale disabled:scale-100"
                              >
                                  {totals.balance <= 0.05 ? 'CONTO GIÀ SALDATO' : 'CONFERMA PAGAMENTO'}
                              </button>
                          </div>
                      )}

                      {/* 3. ALLA ROMANA */}
                      {paymentMode === 'split' && (
                          <div className="p-8 flex flex-col gap-6 h-full">
                              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                  <div>
                                      <div className="text-xs font-black uppercase text-slate-400 mb-2">Diviso In</div>
                                      <div className="flex items-center gap-4">
                                          <button onClick={() => setRomanDivisor(Math.max(1, romanDivisor - 1))} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"><ChevronDown/></button>
                                          <span className="text-4xl font-black w-16 text-center">{romanDivisor}</span>
                                          <button onClick={() => setRomanDivisor(romanDivisor + 1)} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"><ChevronUp/></button>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-xs font-black uppercase text-slate-400 mb-1">Quota a Persona</div>
                                      <div className="text-4xl font-black text-blue-600">€{singleShare.toFixed(2)}</div>
                                  </div>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                  {Array.from({ length: romanDivisor }).map((_, i) => {
                                      const isPaid = i < paidSharesCount;
                                      return (
                                          <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isPaid ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-slate-200'}`}>
                                              <div className="flex items-center gap-4">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isPaid ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                      {isPaid ? <Check size={16}/> : i + 1}
                                                  </div>
                                                  <span className="font-bold text-lg">Quota {i + 1}</span>
                                              </div>
                                              
                                              {isPaid ? (
                                                  <span className="font-black text-green-600">PAGATO</span>
                                              ) : (
                                                  <div className="flex gap-2">
                                                      <button onClick={() => handleSplitPayment(singleShare, 'contanti')} className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors" title="Paga Contanti">
                                                          <Banknote size={24}/>
                                                      </button>
                                                      <button onClick={() => handleSplitPayment(singleShare, 'carta')} className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-colors" title="Paga Carta">
                                                          <CreditCard size={24}/>
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}

                      {/* 4. PIATTI E COPERTI SEPARATI */}
                      {paymentMode === 'items' && (
                          <div className="flex flex-col h-full">
                              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2">
                                  
                                  {/* SEZIONE QUOTE COPERTO */}
                                  {totals.effectiveCover > 0 && (
                                      <div className="mb-4">
                                          <div className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 pl-2">Quote Coperto</div>
                                          {Array.from({ length: selectedOrder.pax || 0 }).map((_, idx) => {
                                              const paidCount = selectedOrder.paidCoverCharges || 0;
                                              const isPaid = idx < paidCount;
                                              const isSelected = selectedCoverIndices.includes(idx);
                                              
                                              return (
                                                  <div 
                                                      key={`cover-${idx}`}
                                                      onClick={() => !isPaid && setSelectedCoverIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                                                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer mb-2 
                                                          ${isPaid ? 'bg-green-50 border-green-200 opacity-60' : isSelected ? 'bg-[#800020]/5 border-[#800020] shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}
                                                      `}
                                                  >
                                                      <div className="flex items-center gap-4">
                                                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${isSelected || isPaid ? 'bg-[#800020] border-[#800020] text-white' : 'border-slate-300'}`}>
                                                              {(isSelected || isPaid) && <Check size={14} strokeWidth={4}/>}
                                                          </div>
                                                          <div className="font-bold text-sm flex items-center gap-2">
                                                              <UserIcon size={16}/> Coperto Persona {idx + 1}
                                                          </div>
                                                      </div>
                                                      <div className="font-black text-lg">€{db.settings.tableConfig.coverCharge.toFixed(2)}</div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  )}

                                  {/* SEZIONE ARTICOLI */}
                                  <div className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 pl-2">Articoli</div>
                                  {selectedOrder.items.map(item => {
                                      const removedNames = item.removedIngredientIds?.map(id => db.settings.globalIngredients.find(g => g.id === id)?.name).filter(Boolean).join(', ');
                                      return (
                                      <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${item.isPaid ? 'bg-green-50 border-green-200 opacity-60' : selectedItemIds.includes(item.id) ? 'bg-[#800020]/5 border-[#800020] shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                           onClick={() => !item.isPaid && setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                      >
                                          <div className="flex items-center gap-4">
                                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${selectedItemIds.includes(item.id) || item.isPaid ? 'bg-[#800020] border-[#800020] text-white' : 'border-slate-300'}`}>
                                                  {(selectedItemIds.includes(item.id) || item.isPaid) && <Check size={14} strokeWidth={4}/>}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-sm">
                                                      {item.name} 
                                                      {item.selectedExtras && item.selectedExtras.length > 0 && <span className="text-[10px] text-green-600 ml-1">+{item.selectedExtras.length} extra</span>}
                                                      {removedNames && <span className="text-[10px] text-red-500 ml-1 line-through">-{removedNames}</span>}
                                                  </div>
                                                  <div className="text-[10px] font-black uppercase text-slate-400">{item.isPaid ? 'PAGATO' : 'DA SALDARE'}</div>
                                              </div>
                                          </div>
                                          <div className="font-black text-lg">€{item.price.toFixed(2)}</div>
                                      </div>
                                  )})}
                              </div>
                              
                              {/* BARRA AZIONI PER SELEZIONE */}
                              <div className="p-6 bg-white dark:bg-slate-800 border-t dark:border-slate-700 shadow-xl flex items-center justify-between shrink-0">
                                  <div>
                                      <div className="text-[10px] font-black uppercase text-slate-400">Totale Selezione</div>
                                      <div className="text-3xl font-black text-[#800020]">
                                          €{(
                                              selectedOrder.items.filter(i => selectedItemIds.includes(i.id)).reduce((a,b)=>a+b.price,0) + 
                                              (selectedCoverIndices.length * db.settings.tableConfig.coverCharge)
                                          ).toFixed(2)}
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                          disabled={selectedItemIds.length === 0 && selectedCoverIndices.length === 0}
                                          onClick={() => handleItemPayment('contanti')}
                                          className="w-14 h-14 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-all disabled:opacity-50 disabled:grayscale"
                                          title="Paga Contanti"
                                      >
                                          <Banknote size={28}/>
                                      </button>
                                      <button 
                                          disabled={selectedItemIds.length === 0 && selectedCoverIndices.length === 0}
                                          onClick={() => handleItemPayment('carta')}
                                          className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-all disabled:opacity-50 disabled:grayscale"
                                          title="Paga Carta"
                                      >
                                          <CreditCard size={28}/>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* FOOTER NAVIGAZIONE E RIEPILOGO TOTALE */}
                  <div className="bg-slate-100 dark:bg-slate-900 border-t dark:border-slate-800 flex flex-col shrink-0">
                      
                      {/* RIEPILOGO METODI PAGAMENTO */}
                      <div className="flex justify-between px-6 py-2 bg-slate-200 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-500">
                          <span>Totale Carta: <span className="text-blue-600">€{totals.totalCard.toFixed(2)}</span></span>
                          <span>Totale Contanti: <span className="text-green-600">€{totals.totalCash.toFixed(2)}</span></span>
                      </div>

                      <div className="p-4 flex justify-between items-center gap-4">
                          {paymentMode !== 'select' ? (
                              <button onClick={() => setPaymentMode('select')} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                                  <ArrowLeft size={18}/> Indietro
                              </button>
                          ) : (
                              <button onClick={() => resetOrderPayments(selectedOrder.id)} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                  <RotateCcw size={14}/> Reset Pagamenti
                              </button>
                          )}

                          {totals.balance <= 0.05 ? (
                              <button 
                                  onClick={() => finalizeOrder(selectedOrder.id)}
                                  className="px-8 py-3 bg-green-500 text-white font-black rounded-xl shadow-lg flex items-center gap-2 animate-bounce"
                              >
                                  <CheckCircle size={20}/> CHIUDI E ARCHIVIA
                              </button>
                          ) : (
                              <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                  <Lock size={14}/> Saldo residuo necessario per archiviare
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODALE STORICO (Visualizzazione Solo Lettura) */}
      {viewingArchivedId && archivedToView && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-0 md:p-4" onClick={() => setViewingArchivedId(null)}>
              <div className="bg-white dark:bg-slate-900 w-full md:max-w-xl max-h-[90vh] rounded-t-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                  
                  <div className="p-6 bg-slate-100 dark:bg-slate-800 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-2xl font-black italic uppercase">Dettaglio Storico</h3>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <span>{archivedToView.customerName}</span>
                              <span>•</span>
                              <span>{archivedToView.time}</span>
                          </div>
                      </div>
                      <button onClick={() => setViewingArchivedId(null)} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:scale-110 transition-transform"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50 dark:bg-slate-900">
                      {groupCartItems(archivedToView.items, db.settings.globalIngredients).map((item, idx) => {
                          const removedNames = item.removedIngredientIds?.map(id => db.settings.globalIngredients.find(g => g.id === id)?.name).filter(Boolean).join(', ');
                          return (
                          <div key={`${item.id}-${idx}`} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                              <div>
                                <div className="font-bold text-sm">
                                    {item.count}x {item.name}
                                </div>
                                <div className="text-[10px] text-slate-500 flex flex-wrap gap-1">
                                    {item.selectedExtras?.map(e => <span key={e.id}>+{e.name}</span>)}
                                    {removedNames && <span className="text-red-400 line-through">-{removedNames}</span>}
                                </div>
                              </div>
                              <div className="font-black text-green-600">€{(item.price * item.count).toFixed(2)}</div>
                          </div>
                      )})}
                      {archivedToView.coverChargeTotal !== undefined && archivedToView.coverChargeTotal > 0 && (
                          <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                              <div className="font-bold text-sm">Coperto ({archivedToView.pax} pax)</div>
                              <div className="font-black text-green-600">€{archivedToView.coverChargeTotal.toFixed(2)}</div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center">
                      <div className="text-xs font-black uppercase text-slate-400">Totale Incassato</div>
                      <div className="text-3xl font-black text-green-600">
                          €{((archivedToView.items.reduce((a,b)=>a+b.price, 0)) + (archivedToView.coverChargeTotal || 0)).toFixed(2)}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
