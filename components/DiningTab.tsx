
import React from 'react';
import { 
  LayoutDashboard, Users, CheckCircle, Receipt
} from 'lucide-react';
import { DB, Order } from '../types';
import { getShiftFromTime } from './Shared';

export function DiningTab({ db, viewDate, viewShift }: { db: DB, viewDate: string, viewShift: 'pranzo'|'cena' }) {
    const tables = db.tables;
    const getTableOrder = (tableId: number) => {
      return db.orders.find((o: Order) => 
          !o.isArchived && 
          o.isAccepted && 
          (o.tableId === tableId || (o.tableIds && o.tableIds.includes(tableId))) &&
          o.date === viewDate && 
          getShiftFromTime(o.time) === viewShift
      );
    };

    return (
        <div className="animate-in fade-in space-y-6">
            <h2 className="text-3xl font-black italic uppercase mb-6 flex items-center gap-3"><LayoutDashboard size={32}/> Monitor Sala ({viewShift})</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {tables.map(t => {
                    const order = getTableOrder(t.id);
                    const isJoined = order && order.tableIds && order.tableIds.length > 1;
                    const isBilling = order && order.tableIds 
                        ? order.tableIds.some(id => db.tables.find(tbl => tbl.id === id)?.status === 'billing') 
                        : t.status === 'billing';

                    // Generate a consistent color for joined tables based on Order ID
                    const groupColor = isJoined ? `hsl(${(order!.id.charCodeAt(2) * 50) % 360}, 70%, 95%)` : undefined;
                    const borderColor = isJoined ? `hsl(${(order!.id.charCodeAt(2) * 50) % 360}, 70%, 70%)` : undefined;

                    return (
                        <div 
                            key={t.id} 
                            style={isJoined ? { backgroundColor: groupColor, borderColor: borderColor, borderStyle: 'dashed' } : {}}
                            className={`rounded-[32px] border-4 p-6 relative flex flex-col justify-between min-h-[200px] transition-all ${
                                !isJoined && isBilling ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                !isJoined && order ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
                                !isJoined ? 'bg-white border-slate-200 text-slate-400' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-4xl font-black opacity-20">T{t.id}</span>
                                <span className={`p-2 rounded-full ${order ? 'bg-white/50' : 'bg-slate-100'}`}>
                                    {order ? <Users size={20}/> : <CheckCircle size={20}/>}
                                </span>
                            </div>
                            
                            {order ? (
                                <div>
                                    <div className="font-bold text-lg leading-tight mb-1">{order.customerName}</div>
                                    <div className="text-xs font-mono opacity-70 mb-2">{order.time} • {order.pax} Ospiti</div>
                                    <div className="flex flex-wrap gap-1">
                                        <span className="text-[10px] uppercase font-bold bg-white/50 px-2 py-1 rounded">
                                            {order.items.length} Art.
                                        </span>
                                        <span className="text-[10px] uppercase font-bold bg-white/50 px-2 py-1 rounded">
                                            €{order.items.reduce((a, b) => a + b.price, 0).toFixed(2)}
                                        </span>
                                    </div>
                                    {isJoined && <div className="text-[10px] font-black uppercase mt-2 text-slate-500 opacity-50">Unito con altri tavoli</div>}
                                </div>
                            ) : (
                                <div className="text-center font-bold opacity-50 uppercase tracking-widest mt-auto">Libero</div>
                            )}

                            {isBilling && (
                                <div className="absolute inset-0 bg-yellow-100/90 backdrop-blur-sm flex flex-col items-center justify-center text-yellow-800 animate-in fade-in rounded-[28px]">
                                    <Receipt size={48} className="mb-2"/>
                                    <span className="font-black uppercase tracking-widest">Conto</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
