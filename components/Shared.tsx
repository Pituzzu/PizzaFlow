
import React, { useState } from 'react';
import { 
  Bell, X, Calendar as CalendarIcon, Sun, Moon, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { DB, Order, Table, OrderItem, Settings, OrderType, DayConfig, ServiceAvailability, Ingredient } from '../types';

const DEFAULT_TABLE_DURATION = 90;

// --- HELPERS ---

export const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const getDayName = (dateStr: string) => {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[new Date(dateStr).getDay()];
};

export const getShiftFromTime = (time: string): 'pranzo' | 'cena' => {
    if (!time) return 'cena';
    return timeToMinutes(time) < timeToMinutes("17:00") ? 'pranzo' : 'cena';
};

export const formatTableString = (order: Order) => {
    if (!order.tableId) return '';
    if (order.tableIds && order.tableIds.length > 1) {
        return `T${order.tableIds.join('+')}`;
    }
    return `T${order.tableId}`;
};

/**
 * Raggruppa gli articoli del carrello/ordine in base alla loro firma univoca (ID Piatto + Varianti)
 */
export const groupCartItems = (items: OrderItem[], globalIngredients?: Ingredient[]) => {
    const grouped: Record<string, OrderItem & { count: number, _signature: string }> = {};

    items.forEach(item => {
        const extraIds = item.selectedExtras?.map(e => e.id).sort().join(',') || '';
        const removedIds = item.removedIngredientIds?.sort().join(',') || '';
        // Firma univoca: ID_Menu | Extra_IDs | Removed_IDs | Prezzo (nel caso cambi)
        const signature = `${item.menuId}|${extraIds}|${removedIds}|${item.price}`;

        if (!grouped[signature]) {
            grouped[signature] = { ...item, count: 0, _signature: signature };
        }
        grouped[signature].count++;
    });

    return Object.values(grouped);
};

/**
 * Formatta l'ordine per testo (es. WhatsApp), includendo aggiunte e rimozioni
 */
export const formatOrderItems = (items: OrderItem[], globalIngredients?: Ingredient[]) => {
    // Usiamo il grouping per una lista pulita
    const groupedItems = groupCartItems(items);
    
    return groupedItems.map(item => {
        let line = `- ${item.count}x ${item.name}`;
        const variations: string[] = [];

        if(item.selectedExtras && item.selectedExtras.length > 0) {
            const extrasStr = item.selectedExtras.map(e => `+${e.name}`).join(', ');
            variations.push(extrasStr);
        }

        if(item.removedIngredientIds && item.removedIngredientIds.length > 0 && globalIngredients) {
            const removedNames = item.removedIngredientIds
                .map(id => globalIngredients.find(g => g.id === id)?.name)
                .filter(Boolean)
                .map(name => `-${name}`)
                .join(', ');
            if (removedNames) variations.push(removedNames);
        }

        if (variations.length > 0) {
            line += ` (${variations.join(' ')})`;
        }
        return line;
    }).join('\n');
};

/**
 * Genera il link WhatsApp risolvendo i segnaposto dinamici
 */
export const triggerWhatsApp = (order: Order, type: 'accept' | 'reject', config: DB['settings']['whatsappConfig'], globalIngredients?: Ingredient[], coverCharge: number = 0) => {
    if (!config.enabled || !order.customerPhone) return;

    let message = "";
    const isTable = order.type === 'tavolo';

    if (isTable) {
        message = type === 'accept' ? config.tableAccept : config.tableReject;
    } else {
        message = type === 'accept' ? config.foodAccept : config.foodReject;
    }

    const itemsTotal = order.items.reduce((a, i) => a + i.price, 0);
    const coverTotal = isTable && order.pax ? order.pax * coverCharge : 0;
    const totale = (itemsTotal + coverTotal).toFixed(2);
    
    let listaPiatti = formatOrderItems(order.items, globalIngredients);
    if (coverTotal > 0) {
        listaPiatti += `\n- Coperto x${order.pax} (€${coverTotal.toFixed(2)})`;
    }

    const formattedDate = order.date ? new Date(order.date).toLocaleDateString('it-IT') : "oggi";

    // Risoluzione segnaposto
    const resolvedMessage = message
        .replace(/{nome}/gi, order.customerName)
        .replace(/{data}/gi, formattedDate)
        .replace(/{ora}/gi, order.time)
        .replace(/{pax}/gi, String(order.pax || 0))
        .replace(/{ordine}/gi, `\n${listaPiatti}`) // Aggiunge un a capo prima della lista per pulizia
        .replace(/{totale}/gi, totale);

    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    // encodeURIComponent codifica correttamente \n come %0A
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(resolvedMessage)}`;
    window.open(url, '_blank');
};

export const generateSmartSlots = (dateStr: string, settings: DB['settings']) => {
  if (settings.extraordinaryClosures.includes(dateStr)) return [];
  if (settings.holidayStart && settings.holidayEnd) {
    if (dateStr >= settings.holidayStart && dateStr <= settings.holidayEnd) return [];
  }
  
  const dayName = getDayName(dateStr);
  const config = settings.weeklyConfig.find(d => d.day === dayName);
  if (!config) return [];

  const slots: string[] = [];
  const pushSlots = (startStr: string, endStr: string) => {
      if (!startStr || !endStr) return;
      let current = timeToMinutes(startStr);
      const finish = timeToMinutes(endStr);
      const effectiveFinish = finish < current ? finish + 24 * 60 : finish; 
      while (current < effectiveFinish) {
          slots.push(minutesToTime(current % (24 * 60)));
          current += settings.slotDuration;
      }
  };

  if (config.enableShift1) pushSlots(config.open1, config.close1);
  if (config.enableShift2) pushSlots(config.open2, config.close2);

  return slots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
};

export const getSlotLoad = (orders: Order[], slotTime: string, dateStr: string, excludeOrderId?: string) => {
  return orders
    .filter(o => 
      !o.isArchived && 
      o.time === slotTime && 
      (o.date === dateStr || (!o.date && dateStr === new Date().toISOString().split('T')[0])) &&
      o.id !== excludeOrderId
    )
    .reduce((acc, o) => acc + o.items.filter(i => i.category === 'Pizze' || i.requiresCooking).length, 0);
};

export const checkTableConflict = (tableId: number, date: string, startTime: string, duration: number, orders: Order[], settings: Settings) => {
    const requestedShift = getShiftFromTime(startTime);
    const mode = settings.tableConfig.mode;

    // --- MODALITÀ LIBERA: Occupazione per Intero Turno ---
    if (mode === 'libero') {
        const conflict = orders.find(o => {
            if (o.isArchived || o.date !== date) return false;
            const isTableInvolved = o.tableId === tableId || (o.tableIds && o.tableIds.includes(tableId));
            if (!isTableInvolved) return false;
            
            // Se l'ordine appartiene allo stesso turno (Pranzo/Cena), il tavolo è occupato per tutto il turno.
            return getShiftFromTime(o.time) === requestedShift;
        });
        return !!conflict;
    }

    // --- ALTRE MODALITÀ (Turni / Durata): Occupazione Temporale ---
    const startA = timeToMinutes(startTime);
    const endA = startA + duration;
    
    const conflict = orders.find(o => {
        if (o.isArchived || o.date !== date) return false;
        const isTableInvolved = o.tableId === tableId || (o.tableIds && o.tableIds.includes(tableId));
        if (!isTableInvolved) return false;
        
        const startB = timeToMinutes(o.time);
        const endB = startB + (o.duration || DEFAULT_TABLE_DURATION);
        
        return (startA < endB) && (endA > startB);
    });
    return !!conflict;
};

export const getAvailableTables = (date: string, time: string, pax: number, tables: Table[], orders: Order[], settings: Settings) => {
    return tables.filter(t => {
        if (t.capacity < pax) return false;
        if (checkTableConflict(t.id, date, time, DEFAULT_TABLE_DURATION, orders, settings)) return false;
        return true;
    });
};

// --- AVAILABILITY LOGIC ---

export const checkDateStatus = (dateStr: string, settings: Settings, orderType: OrderType | 'choose' | null): { available: boolean; reason?: string } => {
    if (!orderType || orderType === 'choose') return { available: false, reason: 'Seleziona servizio' };

    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return { available: false, reason: 'Passato' };

    // 1. Check Max Future Days (Only for Table)
    if (orderType === 'tavolo' && settings.tableConfig.maxFutureDays) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + settings.tableConfig.maxFutureDays);
        if (dateStr > maxDate.toISOString().split('T')[0]) return { available: false, reason: 'Troppo in anticipo' };
    }

    // 2. Extraordinary Closures
    if (settings.extraordinaryClosures.includes(dateStr)) return { available: false, reason: 'Chiusura Straordinaria' };

    // 3. Holidays
    if (settings.holidayStart && settings.holidayEnd) {
        if (dateStr >= settings.holidayStart && dateStr <= settings.holidayEnd) return { available: false, reason: 'Ferie' };
    }

    // 4. Weekly Config & Service Availability
    const dayName = getDayName(dateStr);
    const dayConfig = settings.weeklyConfig.find(d => d.day === dayName);
    if (!dayConfig) return { available: false, reason: 'Chiuso' };

    const shift1Active = dayConfig.enableShift1;
    const shift2Active = dayConfig.enableShift2;

    if (!shift1Active && !shift2Active) return { available: false, reason: 'Chiuso' };

    // Check specific service availability logic
    let serviceKey: keyof ServiceAvailability = 'table';
    if (orderType === 'asporto') serviceKey = 'takeaway';
    if (orderType === 'consegna') serviceKey = 'delivery';

    const isServiceActiveShift1 = shift1Active && (!dayConfig.services1 || dayConfig.services1[serviceKey]);
    const isServiceActiveShift2 = shift2Active && (!dayConfig.services2 || dayConfig.services2[serviceKey]);

    if (!isServiceActiveShift1 && !isServiceActiveShift2) return { available: false, reason: 'Servizio non attivo' };

    // 5. Basic Slot Check (if generic slots are generated)
    // Note: detailed capacity check is done later by SlotSelector, this is just "Is shop open?"
    const slots = generateSmartSlots(dateStr, settings);
    if (slots.length === 0) return { available: false, reason: 'Nessuno slot' };

    return { available: true };
};


// --- COMPONENTS ---

export function NotificationBanner({ message }: { message: string }) {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 md:top-auto md:left-auto md:bottom-6 md:right-6 md:translate-x-0 z-[2000] bg-[#800020] text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top md:slide-in-from-right duration-500 font-bold flex items-center gap-3 border-2 border-white/20 max-w-[90vw] md:max-w-md font-sans">
            <Bell size={20} className="animate-bounce shrink-0" />
            <span className="truncate">{message}</span>
        </div>
    );
}

export function Modal({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-[32px] shadow-2xl animate-in zoom-in duration-200 border-4 border-[#800020]/10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#800020]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto pr-2">
            {children}
        </div>
      </div>
    </div>
  )
}

export function GlobalToolbar({ date, setDate, shift, setShift }: { date: string, setDate: (d: string) => void, shift: 'pranzo' | 'cena', setShift: (s: 'pranzo' | 'cena') => void }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="bg-[#800020] text-white p-2 rounded-xl"><CalendarIcon size={20}/></div>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="bg-transparent font-bold text-lg outline-none dark:text-white"
                />
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto">
                <button 
                    onClick={() => setShift('pranzo')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${shift === 'pranzo' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500' : 'text-slate-400'}`}
                >
                    <Sun size={16}/> Pranzo
                </button>
                <button 
                    onClick={() => setShift('cena')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${shift === 'cena' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-500' : 'text-slate-400'}`}
                >
                    <Moon size={16}/> Cena
                </button>
            </div>
        </div>
    )
}

// --- CUSTOM CALENDAR COMPONENT ---

interface CustomCalendarProps {
    selectedDate: string;
    onSelect: (date: string) => void;
    settings: Settings;
    orderType: OrderType | 'choose' | null;
    allowDisabledClick?: boolean; // For staff overriding
}

export function CustomCalendar({ selectedDate, onSelect, settings, orderType, allowDisabledClick = false }: CustomCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || new Date()));

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
    };

    const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm select-none">
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft size={20}/></button>
                <span className="font-black text-lg uppercase tracking-widest text-[#800020]">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={20}/></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const { available } = checkDateStatus(dateStr, settings, orderType);
                    const isSelected = dateStr === selectedDate;

                    return (
                        <button
                            key={day}
                            onClick={() => (available || allowDisabledClick) && onSelect(dateStr)}
                            disabled={!available && !allowDisabledClick}
                            className={`
                                h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative
                                ${isSelected ? 'bg-[#1c1917] text-white shadow-lg scale-110 z-10' : ''}
                                ${!isSelected && available ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                ${!isSelected && !available ? 'bg-slate-100 text-slate-300 dark:bg-slate-900/50 dark:text-slate-700 cursor-not-allowed' : ''}
                            `}
                        >
                            {day}
                            {available && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold uppercase text-slate-400">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Disponibile</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Completo/Chiuso</div>
            </div>
        </div>
    );
}

export function SlotSelector({ slots, orders, date, selected, onSelect, maxCapacity, allowOverbooking, db, orderType, pax, isPublic, filterShift, cartSize = 0 }: any) {
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const validSlots = slots.filter((slot: string) => {
        if (isToday && timeToMinutes(slot) < currentMinutes) return false;
        if (filterShift && getShiftFromTime(slot) !== filterShift) return false;
        return true;
    });

    if (validSlots.length === 0) {
      return (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-center text-slate-400 font-bold text-xs border-2 border-dashed border-slate-300 dark:border-slate-700 w-full">
           CHIUSO / NESSUN ORARIO DISPONIBILE
        </div>
      );
    }

    const lunchSlots = validSlots.filter((s: string) => getShiftFromTime(s) === 'pranzo');
    const dinnerSlots = validSlots.filter((s: string) => getShiftFromTime(s) === 'cena');

    const renderGrid = (list: string[], label: string) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-4 last:mb-0">
                <div className={`text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${isPublic ? 'text-[#1c1917]' : 'text-slate-400'}`}>
                    {label === 'Pranzo' ? <Sun size={14}/> : <Moon size={14}/>} {label}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {list.map(slot => {
                        const load = getSlotLoad(orders, slot, date);
                        let isDisabled = false;
                        let isFull = false;

                        if (orderType === 'tavolo' && db && pax && isPublic) {
                            // Passing db.settings to getAvailableTables for mode check
                            const available = getAvailableTables(date, slot, pax, db.tables, db.orders, db.settings);
                            if (available.length === 0) { isFull = true; isDisabled = true; }
                        } else if (orderType !== 'tavolo') {
                            const projectedLoad = load + (isPublic ? cartSize : 0);
                            if (projectedLoad > maxCapacity) { isFull = true; isDisabled = !allowOverbooking; }
                        }

                        let btnClass = isPublic 
                            ? "bg-white border-stone-200 text-stone-600 hover:border-[#d97706]" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white";
                        
                        if (selected === slot) {
                            btnClass = isPublic ? "bg-[#1c1917] text-white border-[#1c1917]" : "bg-[#800020] text-white border-[#800020]";
                        } else if (isDisabled) {
                            btnClass = isPublic ? "bg-stone-100 text-stone-300 border-transparent cursor-not-allowed" : "bg-red-50 dark:bg-red-900/20 text-red-300 opacity-60";
                        } else if (isFull && !isDisabled) {
                            btnClass = "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600"; 
                        }

                        return (
                            <button
                                key={slot}
                                onClick={() => !isDisabled && onSelect(slot)}
                                disabled={isDisabled}
                                className={`p-3 rounded-xl border-2 transition-all text-xs flex flex-col items-center justify-center relative overflow-hidden ${btnClass}`}
                            >
                                <span className="font-bold z-10">{slot}</span>
                                {!isPublic && orderType !== 'tavolo' && (
                                     <div className="z-10 text-[9px] mt-1 font-mono opacity-80">[{load}/{maxCapacity}]</div>
                                )}
                                {isFull && !isPublic && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-lg"></div>}
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {renderGrid(lunchSlots, "Pranzo")}
            {renderGrid(dinnerSlots, "Cena")}
        </div>
    )
}

export function SidebarBtn({ icon, label, active, onClick, fullWidth = true }: { icon: any, label: string, active: boolean, onClick: () => void, fullWidth?: boolean, key?: any }) {
  return (
    <button onClick={onClick} className={`
      ${fullWidth ? 'w-full flex-row px-4 py-3 justify-start gap-3' : 'w-full flex-col p-2 gap-1 justify-center'} 
      flex items-center rounded-2xl transition-all 
      ${active ? 'bg-white text-[#800020] shadow-lg scale-[1.02]' : 'hover:bg-white/10 text-white/70 hover:text-white'}
    `}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: fullWidth ? 20 : 24 })}
      <span className={`${fullWidth ? 'text-sm' : 'text-[10px]'} font-bold tracking-tight`}>{label}</span>
    </button>
  );
}
