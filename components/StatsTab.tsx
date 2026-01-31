
import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Calendar, CreditCard, Banknote, Users, 
  Award, AlertTriangle, PieChart, ShoppingBag, Bike, ChefHat, User as UserIcon, Minus, Plus, ArrowRight
} from 'lucide-react';
import { DB, Order, OrderItem } from '../types';

interface StatsTabProps {
    db: DB;
}

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export function StatsTab({ db }: StatsTabProps) {
    const [period, setPeriod] = useState<Period>('today');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // --- HELPER DATE ---
    const isInDateRange = (dateStr: string | undefined, p: Period) => {
        if (!dateStr) return false;
        
        // Per il custom range usiamo il confronto diretto stringhe ISO (YYYY-MM-DD)
        // È sicuro ed efficiente
        if (p === 'custom') {
            if (!customRange.start || !customRange.end) return false;
            return dateStr >= customRange.start && dateStr <= customRange.end;
        }

        const d = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const orderDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (p === 'today') return orderDate.getTime() === today.getTime();
        
        if (p === 'yesterday') {
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            return orderDate.getTime() === y.getTime();
        }

        if (p === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo && orderDate <= today;
        }

        if (p === 'month') {
            return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        }

        if (p === 'year') {
            return orderDate.getFullYear() === today.getFullYear();
        }
        return false;
    };

    // --- FILTRAGGIO ORDINI ---
    const filteredOrders = useMemo(() => {
        return db.orders.filter(o => o.isArchived && isInDateRange(o.date, period));
    }, [db.orders, period, customRange]);

    // --- KPI FINANZIARI ---
    const financialStats = useMemo(() => {
        let totalRevenue = 0;
        let totalOrders = filteredOrders.length;
        let totalPax = 0;
        let cash = 0;
        let card = 0;

        filteredOrders.forEach(o => {
            const itemsVal = o.items.reduce((a, i) => a + i.price, 0);
            const coverVal = o.coverChargeTotal || 0;
            const orderTotal = itemsVal + coverVal;
            
            totalRevenue += orderTotal;
            totalPax += (o.pax || 0);

            // Calcolo metodi pagamento
            const cashTx = (o.payments || []).filter(p => p.method === 'contanti').reduce((a, p) => a + p.amount, 0);
            // Fallback per vecchi ordini senza payments array: usa receivedAmount o assume contanti se mancante
            const legacyCash = o.receivedAmount || (o.payments?.length ? 0 : orderTotal); 
            cash += cashTx + legacyCash;

            const cardTx = (o.payments || []).filter(p => p.method === 'carta').reduce((a, p) => a + p.amount, 0);
            card += cardTx;
        });

        const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        // Fix rounding visual bugs
        const totalCalc = cash + card;
        const cashPct = totalCalc > 0 ? (cash / totalCalc) * 100 : 0;
        const cardPct = totalCalc > 0 ? (card / totalCalc) * 100 : 0;

        return { totalRevenue, totalOrders, totalPax, avgTicket, cash, card, cashPct, cardPct };
    }, [filteredOrders]);

    // --- PERFORMANCE STAFF (Multiruolo) ---
    const staffStats = useMemo(() => {
        const stats: any[] = [];

        db.users.forEach(user => {
            const userStats: any = { 
                name: user.username, 
                roles: user.mansioni,
                waiterOrders: 0, waiterRevenue: 0,
                courierDeliveries: 0, courierCash: 0,
                kitchenItems: 0
            };

            filteredOrders.forEach(o => {
                // CAMERIERE: Chi ha creato l'ordine
                if (o.createdBy === user.username) {
                    userStats.waiterOrders++;
                    userStats.waiterRevenue += o.items.reduce((a,i)=>a+i.price,0) + (o.coverChargeTotal || 0);
                }

                // CORRIERE: Chi ha chiuso l'ordine di tipo consegna (assunto: chi chiude = chi consegna)
                if (o.type === 'consegna' && o.closedBy === user.username) {
                    userStats.courierDeliveries++;
                    userStats.courierCash += (o.payments || []).filter(p=>p.method==='contanti').reduce((a,p)=>a+p.amount,0) + (o.receivedAmount || 0);
                }

                // CUCINA: Chi ha segnato come "Pronto"
                if (o.kitchenDoneBy === user.username) {
                    userStats.kitchenItems += o.items.filter(i => i.requiresCooking).length;
                }
            });

            // Aggiungi solo se ha fatto qualcosa
            if (userStats.waiterOrders > 0 || userStats.courierDeliveries > 0 || userStats.kitchenItems > 0) {
                stats.push(userStats);
            }
        });

        return stats;
    }, [db.users, filteredOrders]);

    // --- MENU ENGINEERING ---
    const menuStats = useMemo(() => {
        const itemCounts: Record<string, {name: string, count: number}> = {};
        const removedIngs: Record<string, number> = {};
        const addedExtras: Record<string, number> = {};

        filteredOrders.forEach(o => {
            o.items.forEach(i => {
                // Top Piatti
                if (!itemCounts[i.menuId]) itemCounts[i.menuId] = { name: i.name, count: 0 };
                itemCounts[i.menuId].count++;

                // Rimozioni
                (i.removedIngredientIds || []).forEach(id => {
                    const ingName = db.settings.globalIngredients.find(g => g.id === id)?.name || id;
                    removedIngs[ingName] = (removedIngs[ingName] || 0) + 1;
                });

                // Extra
                (i.selectedExtras || []).forEach(e => {
                    addedExtras[e.name] = (addedExtras[e.name] || 0) + 1;
                });
            });
        });

        const sortedItems = Object.values(itemCounts).sort((a,b) => b.count - a.count);
        const sortedRemoved = Object.entries(removedIngs).sort((a,b) => b[1] - a[1]).slice(0,5);
        const sortedExtras = Object.entries(addedExtras).sort((a,b) => b[1] - a[1]).slice(0,5);

        return {
            top: sortedItems.slice(0, 5),
            flop: sortedItems.slice(-5).reverse(),
            removed: sortedRemoved,
            extras: sortedExtras
        };
    }, [filteredOrders, db.settings.globalIngredients]);

    return (
        <div className="space-y-8 animate-in fade-in pb-24 max-w-7xl mx-auto">
            
            {/* HEADER & FILTRI */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 sticky top-0 z-20 backdrop-blur-md bg-opacity-90 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-black italic uppercase text-[#800020] flex items-center gap-3">
                        <TrendingUp size={32}/> Analytics
                    </h2>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
                        {['today', 'yesterday', 'week', 'month', 'year', 'custom'].map((p) => (
                            <button 
                                key={p}
                                onClick={() => setPeriod(p as Period)}
                                className={`px-4 py-2 rounded-xl font-bold text-xs uppercase whitespace-nowrap transition-all ${period === p ? 'bg-white text-[#800020] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {p === 'today' ? 'Oggi' : p === 'yesterday' ? 'Ieri' : p === 'week' ? '7 Giorni' : p === 'month' ? 'Mese' : p === 'year' ? 'Anno' : 'Personalizza'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FILTRO PERSONALIZZATO UI */}
                {period === 'custom' && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 flex flex-col sm:flex-row items-center gap-4 justify-center">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 pl-1">Data Inizio</label>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Calendar size={16} className="text-[#800020]"/>
                                <input 
                                    type="date" 
                                    value={customRange.start} 
                                    onChange={e => setCustomRange({...customRange, start: e.target.value})}
                                    className="bg-transparent font-bold text-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-300 mt-4 hidden sm:block"/>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 pl-1">Data Fine</label>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Calendar size={16} className="text-[#800020]"/>
                                <input 
                                    type="date" 
                                    value={customRange.end} 
                                    onChange={e => setCustomRange({...customRange, end: e.target.value})}
                                    className="bg-transparent font-bold text-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SEZIONE 1: KPI FINANZIARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-[#800020] to-[#500010] rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
                    <Banknote className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:scale-110 transition-transform"/>
                    <div className="relative z-10">
                        <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Fatturato {period === 'today' ? 'Odierno' : period === 'custom' ? 'Range' : 'Periodo'}</div>
                        <div className="text-4xl font-black">€{financialStats.totalRevenue.toFixed(2)}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <PieChart size={18}/> <span className="text-xs font-black uppercase tracking-widest">Scontrino Medio</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white">€{financialStats.avgTicket.toFixed(2)}</div>
                </div>

                {/* PIE CHART VISIVO */}
                <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-green-600"><Banknote size={16}/> Contanti</span>
                            <span className="font-black">€{financialStats.cash.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{width: `${financialStats.cashPct}%`}}></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-blue-600"><CreditCard size={16}/> Carte/Digital</span>
                            <span className="font-black">€{financialStats.card.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${financialStats.cardPct}%`}}></div>
                        </div>
                    </div>
                    {/* CSS PIE CHART */}
                    <div className="w-24 h-24 rounded-full border-8 border-slate-100 relative shrink-0" style={{
                        background: `conic-gradient(#22c55e ${financialStats.cashPct}%, #3b82f6 0)`
                    }}>
                        <div className="absolute inset-2 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-400">SPLIT</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEZIONE 2: PERFORMANCE TEAM */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-black italic uppercase text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                    <Award size={24} className="text-[#800020]"/> Classifica Operativa
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* CAMERIERI */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><UserIcon size={14}/> Sala & Ordini</h4>
                        {staffStats.filter(s => s.waiterOrders > 0).sort((a,b)=>b.waiterRevenue - a.waiterRevenue).map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">{i+1}</div>
                                    <div>
                                        <div className="font-bold">{s.name}</div>
                                        <div className="text-[10px] text-slate-400">{s.waiterOrders} ordini creati</div>
                                    </div>
                                </div>
                                <div className="font-black text-[#800020]">€{s.waiterRevenue.toFixed(0)}</div>
                            </div>
                        ))}
                        {staffStats.filter(s => s.waiterOrders > 0).length === 0 && <div className="text-sm text-slate-400 italic">Nessun dato sala</div>}
                    </div>

                    <div className="space-y-8">
                        {/* CORRIERI */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><Bike size={14}/> Delivery Top</h4>
                            {staffStats.filter(s => s.courierDeliveries > 0).sort((a,b)=>b.courierDeliveries - a.courierDeliveries).map((s, i) => (
                                <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                                        <div>
                                            <div className="font-bold">{s.name}</div>
                                            <div className="text-[10px] text-slate-400">Incassato: €{s.courierCash.toFixed(0)}</div>
                                        </div>
                                    </div>
                                    <div className="font-black text-blue-600">{s.courierDeliveries} <span className="text-[9px] uppercase">viaggi</span></div>
                                </div>
                            ))}
                            {staffStats.filter(s => s.courierDeliveries > 0).length === 0 && <div className="text-sm text-slate-400 italic">Nessun dato delivery</div>}
                        </div>

                        {/* CUCINA */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><ChefHat size={14}/> Eroi della Cucina</h4>
                            {staffStats.filter(s => s.kitchenItems > 0).sort((a,b)=>b.kitchenItems - a.kitchenItems).map((s, i) => (
                                <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                                        <div className="font-bold">{s.name}</div>
                                    </div>
                                    <div className="font-black text-orange-600">{s.kitchenItems} <span className="text-[9px] uppercase">piatti</span></div>
                                </div>
                            ))}
                            {staffStats.filter(s => s.kitchenItems > 0).length === 0 && <div className="text-sm text-slate-400 italic">Nessun dato cucina (clicca 'Tutto Pronto' per tracciare)</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* SEZIONE 3: MENU ENGINEERING */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black italic uppercase text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={24} className="text-green-500"/> Top 5 Piatti
                    </h3>
                    <div className="space-y-3">
                        {menuStats.top.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-300 text-sm">#{i+1}</span>
                                    <span className="font-bold">{p.name}</span>
                                </div>
                                <span className="font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-xs">{p.count} v.</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black italic uppercase text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                        <AlertTriangle size={24} className="text-red-500"/> Flop 5 Piatti (Meno Venduti)
                    </h3>
                    <div className="space-y-3">
                        {menuStats.flop.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 opacity-70">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">{p.name}</span>
                                </div>
                                <span className="font-black text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded text-xs">{p.count} v.</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODIFICHE COMUNI */}
                <div className="md:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black italic uppercase text-slate-700 dark:text-white mb-6">Analisi Modifiche</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-xs font-black uppercase text-red-400 mb-3 flex items-center gap-2"><Minus size={14}/> Ingredienti più Rimossi</h4>
                            <div className="flex flex-wrap gap-2">
                                {menuStats.removed.map(([name, count]) => (
                                    <div key={name} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                                        {name} ({count})
                                    </div>
                                ))}
                                {menuStats.removed.length === 0 && <span className="text-xs text-slate-400 italic">Nessun dato</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-green-500 mb-3 flex items-center gap-2"><Plus size={14}/> Extra più Richiesti</h4>
                            <div className="flex flex-wrap gap-2">
                                {menuStats.extras.map(([name, count]) => (
                                    <div key={name} className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100">
                                        {name} ({count})
                                    </div>
                                ))}
                                {menuStats.extras.length === 0 && <span className="text-xs text-slate-400 italic">Nessun dato</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
