
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, AlertCircle, Soup, CheckCircle, Clock, 
  Flame, ArrowLeft, User as UserIcon,
  Check, Bell, Maximize, Minimize, Timer, RotateCcw, Ban
} from 'lucide-react';
import { DB, Order, ItemStatus, User } from '../types';
import { getShiftFromTime, formatTableString, timeToMinutes } from './Shared';

// Helper per calcolo tempo rispetto all'orario prenotazione
const getTimeStatus = (orderTime: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = orderTime.split(':').map(Number);
    const orderMinutes = h * 60 + m;
    
    const diff = currentMinutes - orderMinutes; // Positivo = Ritardo, Negativo = Anticipo
    
    return {
        minutes: Math.abs(diff),
        isLate: diff > 0,
        isFuture: diff < 0
    };
};

export function KitchenTab({ db, setDb, viewDate, viewShift, currentUser }: { db: DB, setDb: React.Dispatch<React.SetStateAction<DB>>, viewDate: string, viewShift: 'pranzo'|'cena', currentUser: User }) {
    const [now, setNow] = useState(Date.now());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000); // Aggiorna ogni 10s per i timer
        return () => clearInterval(interval);
    }, []);

    // Gestione cambio stato fullscreen nativo
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((e) => {
                console.error(`Error attempting to enable fullscreen: ${e.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // 1. FILTRO E ORDINAMENTO
    const kitchenOrders = db.orders.filter(o => 
        !o.isArchived && 
        o.isAccepted && 
        o.date === viewDate && 
        getShiftFromTime(o.time) === viewShift &&
        o.items.some(i => i.requiresCooking && i.status !== 'served') 
    ).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)); // Ordinamento Cronologico

    // 2. RAGGRUPPAMENTO IN 3 COLONNE
    const newOrders: Order[] = [];
    const preparingOrders: Order[] = [];
    const readyOrders: Order[] = [];

    kitchenOrders.forEach(o => {
        const cookingItems = o.items.filter(i => i.requiresCooking && i.status !== 'served');
        // Se non ci sono item da cucinare attivi (tutti serviti), salta
        if (cookingItems.length === 0) return;

        const allReady = cookingItems.every(i => i.status === 'ready');
        const hasPreparing = cookingItems.some(i => i.status === 'preparing');

        if (allReady) {
            readyOrders.push(o);
        } else if (hasPreparing) {
            preparingOrders.push(o);
        } else {
            newOrders.push(o);
        }
    });

    // 3. AZIONI
    const updateStatus = (orderId: string, itemId: string | 'all', newStatus: ItemStatus, assignToMe: boolean = false) => {
        setDb(prev => ({
            ...prev,
            orders: prev.orders.map(o => {
                if (o.id !== orderId) return o;
                
                const updates: any = {};
                if (assignToMe) updates.assignedChefId = currentUser.id;

                if (itemId === 'all') {
                    // Sposta solo gli item pertinenti (es. da new a preparing o da ready a preparing)
                    updates.items = o.items.map(i => {
                        if (!i.requiresCooking || i.status === 'served') return i;
                        // Logica massiva
                        if (newStatus === 'preparing' && (i.status === 'new' || i.status === 'ready')) return { ...i, status: 'preparing' };
                        if (newStatus === 'ready' && i.status === 'preparing') return { ...i, status: 'ready' };
                        return i;
                    });
                    
                    // Se tutto diventa ready, tracciamo chi lo ha fatto
                    if (newStatus === 'ready') {
                        updates.kitchenDoneBy = currentUser.username;
                    }

                } else {
                    updates.items = o.items.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
                }
                
                return { ...o, ...updates };
            })
        }));
    };

    const rollbackStatus = (orderId: string, itemId: string, currentStatus: ItemStatus) => {
        let prevStatus: ItemStatus = 'new';
        if (currentStatus === 'ready') prevStatus = 'preparing';
        if (currentStatus === 'preparing') prevStatus = 'new';
        updateStatus(orderId, itemId, prevStatus);
    };

    // RENDERIZZA CARD
    const renderCard = (order: Order, type: 'new' | 'prep' | 'ready') => {
        const { minutes, isLate, isFuture } = getTimeStatus(order.time);
        const isAssignedToMe = order.assignedChefId === currentUser.id;
        const cookingItems = order.items.filter(i => i.requiresCooking && i.status !== 'served');
        const isCompact = type === 'ready';

        return (
            <div key={order.id} className={`flex flex-col bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border-l-[8px] relative overflow-hidden transition-all
                ${type === 'ready' ? 'border-l-green-500 opacity-90' : 
                  type === 'prep' ? 'border-l-orange-500' : 
                  'border-l-slate-300'}
                ${isLate && type !== 'ready' ? 'ring-2 ring-red-500/50' : ''}
            `}>
                {/* TASTO RIPRISTINA (Solo per i completati) */}
                {type === 'ready' && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'all', 'preparing'); }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-100 text-slate-400 hover:text-white hover:bg-[#800020] rounded-full transition-all shadow-sm z-10"
                        title="Ripristina in preparazione"
                    >
                        <RotateCcw size={14}/>
                    </button>
                )}

                {/* HEADER */}
                <div className={`flex justify-between items-start border-b dark:border-slate-700 ${isCompact ? 'p-2 bg-green-50 dark:bg-green-900/20' : 'p-3 bg-slate-50 dark:bg-slate-900/50'}`}>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`${isCompact ? 'text-lg' : 'text-2xl'} font-black`}>{order.time}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-bold uppercase truncate max-w-[100px]">
                                {order.type} {formatTableString(order)}
                            </span>
                        </div>
                        <div className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]`}>
                            {order.customerName}
                        </div>
                    </div>
                    
                    {/* TIMER STATUS */}
                    <div className={`flex flex-col items-end ${isCompact ? 'scale-90 origin-top-right mr-6' : ''}`}>
                        {isLate ? (
                            <div className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-black animate-pulse flex items-center gap-1">
                                <Timer size={12}/> +{minutes}m
                            </div>
                        ) : isFuture ? (
                            <div className="bg-blue-50 text-blue-500 px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                                <Clock size={12}/> -{minutes}m
                            </div>
                        ) : (
                            <div className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-xs font-black">
                                ORA
                            </div>
                        )}
                        {order.assignedChefId && type !== 'ready' && (
                            <div className="text-[9px] font-bold text-orange-500 uppercase mt-1 flex items-center gap-1">
                                <UserIcon size={10}/> {isAssignedToMe ? 'MIO' : 'ALTRO CHEF'}
                            </div>
                        )}
                    </div>
                </div>

                {/* NOTE */}
                {order.orderNotes && (
                    <div className={`mx-3 mt-2 p-1.5 bg-yellow-50 text-yellow-800 italic rounded border border-yellow-200 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                        {order.orderNotes}
                    </div>
                )}

                {/* ITEMS */}
                <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-2 space-y-1' : 'p-3 space-y-2'}`}>
                    {cookingItems.map(item => {
                        const removedNames = item.removedIngredientIds?.map(id => 
                            db.settings.globalIngredients.find(g => g.id === id)?.name
                        ).filter(Boolean);

                        return (
                        <div 
                            key={item.id} 
                            onClick={() => {
                                if (type === 'new') updateStatus(order.id, 'all', 'preparing', true); // Start Order
                                else if (type === 'prep' && isAssignedToMe && item.status === 'preparing') updateStatus(order.id, item.id, 'ready'); // Mark Item Ready
                            }}
                            className={`flex flex-col rounded-lg border transition-all select-none cursor-pointer
                                ${isCompact ? 'p-1.5 text-xs bg-slate-50 border-slate-100' : 'p-2.5 text-base'}
                                ${item.status === 'preparing' ? 'bg-orange-50 border-orange-200' : 
                                  item.status === 'ready' ? 'bg-green-50 border-green-200' : 
                                  'bg-white border-slate-100 hover:border-slate-300'}
                            `}
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                    <div className={`rounded-full shrink-0 ${isCompact ? 'w-2 h-2' : 'w-3 h-3'} ${item.status === 'preparing' ? 'bg-orange-500 animate-pulse' : item.status === 'ready' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <span className={`font-bold leading-tight ${item.status === 'ready' ? 'text-green-700' : ''}`}>{item.name}</span>
                                </div>
                                
                                {!isCompact && item.status !== 'new' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); rollbackStatus(order.id, item.id, item.status); }}
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                                    >
                                        <ArrowLeft size={16}/>
                                    </button>
                                )}
                            </div>
                            
                            {/* SUPPLEMENTI VISIBILI IN CUCINA (VERDE/BLU) */}
                            {item.selectedExtras && item.selectedExtras.length > 0 && (
                                <div className={`ml-5 mt-1 font-black uppercase text-blue-600 dark:text-blue-400 ${isCompact ? 'text-[9px]' : 'text-xs'}`}>
                                    {item.selectedExtras.map(e => `+ ${e.name}`).join(', ')}
                                </div>
                            )}

                            {/* RIMOZIONI VISIBILI IN CUCINA (ROSSO/BARRATO) */}
                            {removedNames && removedNames.length > 0 && (
                                <div className={`ml-5 mt-0.5 font-black uppercase text-red-500 flex flex-wrap gap-2 ${isCompact ? 'text-[9px]' : 'text-xs'}`}>
                                    {removedNames.map(name => (
                                        <span key={name} className="flex items-center gap-1">
                                            <Ban size={10} strokeWidth={3}/> NO {name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )})}
                </div>

                {/* FOOTER ACTION */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 mt-auto">
                    {type === 'new' && (
                        <button onClick={() => updateStatus(order.id, 'all', 'preparing', true)} className="w-full py-3 bg-slate-800 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-black transition-all">
                            <Flame size={16}/> INIZIA
                        </button>
                    )}
                    {type === 'prep' && (
                        <button 
                            onClick={() => updateStatus(order.id, 'all', 'ready')} 
                            className={`w-full py-3 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${isAssignedToMe ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                            disabled={!isAssignedToMe}
                        >
                            <Bell size={16}/> {isAssignedToMe ? 'TUTTO PRONTO' : 'NON ASSEGNATO A TE'}
                        </button>
                    )}
                    {type === 'ready' && (
                        <div className="text-center text-[10px] font-black uppercase text-green-600 flex items-center justify-center gap-1">
                            <CheckCircle size={12}/> Al Pass ({order.kitchenDoneBy || 'Staff'})
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className="h-full bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden">
             {/* HEADER TOOLBAR (Solo se fullscreen attivo mostra versione semplificata, altrimenti usa header standard App) */}
             <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-[#800020] text-white p-2 rounded-xl"><ChefHat size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black italic uppercase text-slate-800 dark:text-white leading-none">Cucina</h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                            <span className="uppercase">{viewShift}</span>
                            <span>•</span>
                            <Clock size={12}/> {new Date(now).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 border border-slate-200">
                            Nuovi: {newOrders.length}
                        </div>
                        <div className="px-3 py-1 bg-orange-50 rounded-lg text-xs font-bold text-orange-600 border border-orange-100">
                            Prep: {preparingOrders.length}
                        </div>
                    </div>
                    <button 
                        onClick={toggleFullscreen}
                        className={`p-3 rounded-xl border-2 transition-all ${isFullscreen ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#800020]'}`}
                    >
                        {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
                    </button>
                </div>
             </div>
             
             {/* MAIN COLUMNS LAYOUT */}
             <div className="flex-1 overflow-hidden flex p-4 gap-4">
                 
                 {/* COL 1: DA FARE (35%) */}
                 <div className="flex-[3.5] flex flex-col min-w-0 bg-slate-200/50 dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div className="p-4 flex items-center gap-2 text-slate-500 uppercase font-black tracking-widest text-xs border-b border-slate-300/50">
                        <AlertCircle size={16}/> In Arrivo
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {newOrders.map(o => renderCard(o, 'new'))}
                        {newOrders.length === 0 && <div className="text-center py-10 opacity-30 font-black text-2xl uppercase">Vuoto</div>}
                    </div>
                 </div>

                 {/* COL 2: IN PREPARAZIONE (35%) */}
                 <div className="flex-[3.5] flex flex-col min-w-0 bg-orange-50/50 dark:bg-orange-900/10 rounded-[24px] border-2 border-orange-200 dark:border-orange-800/30">
                    <div className="p-4 flex items-center gap-2 text-orange-600 uppercase font-black tracking-widest text-xs border-b border-orange-200/50">
                        <Flame size={16}/> In Cottura
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {preparingOrders.map(o => renderCard(o, 'prep'))}
                        {preparingOrders.length === 0 && <div className="text-center py-10 opacity-30 font-black text-2xl text-orange-900 uppercase">Vuoto</div>}
                    </div>
                 </div>

                 {/* COL 3: PRONTI (30%) */}
                 <div className="flex-[3] flex flex-col min-w-0 bg-green-50/50 dark:bg-green-900/10 rounded-[24px] border-2 border-green-200 dark:border-green-800/30">
                    <div className="p-4 flex items-center gap-2 text-green-600 uppercase font-black tracking-widest text-xs border-b border-green-200/50">
                        <CheckCircle size={16}/> Pronti al Pass
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {readyOrders.map(o => renderCard(o, 'ready'))}
                        {readyOrders.length === 0 && <div className="text-center py-10 opacity-30 font-black text-xl text-green-900 uppercase">Pass Vuoto</div>}
                    </div>
                 </div>

             </div>
        </div>
    );
}
