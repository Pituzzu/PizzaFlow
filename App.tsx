
import React, { useState, useEffect } from 'react';
import { 
  ChefHat, LogOut, User as UserIcon, Calendar, UtensilsCrossed, 
  LayoutDashboard, Utensils, Bike, Settings, Banknote, ShieldCheck, TrendingUp, Lock, Loader2, CloudUpload
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, query, getDocs 
} from 'firebase/firestore';
import { DB, User, Order, OrderItem, OrderType, ItemStatus, SystemConfig, Mansione } from './types';
import { INITIAL_DB } from './constants'; 
import { NotificationBanner, Modal, GlobalToolbar, SidebarBtn, getShiftFromTime } from './components/Shared';
import { PublicSite } from './components/PublicSite';
import { ReservationsTab } from './components/ReservationsTab';
import { KitchenTab } from './components/KitchenTab';
import { WaiterView } from './components/WaiterView';
import { DeliveryTab } from './components/DeliveryTab';
import { DiningTab } from './components/DiningTab';
import { SettingsTab } from './components/SettingsTab';
import { CashierTab } from './components/CashierTab';
import { MasterConfigTab } from './components/MasterConfigTab';
import { StatsTab } from './components/StatsTab';

const SESSION_KEY = 'pizzaflow_session_v1';

const getAvailableViews = (user: User | null, config: SystemConfig): string[] => {
    if (!user) return [];
    
    const views: string[] = [];
    const isAdmin = user.mansioni.includes('Amministratore');

    const check = (v: string, m: Mansione, moduleActive: boolean = true) => {
        if (!moduleActive) return false;
        return isAdmin || user.mansioni.includes(m);
    };

    if (check('prenotazioni', 'Prenotazioni')) views.push('prenotazioni');
    if (check('cucina', 'Cucina')) views.push('cucina');
    if (check('cassa', 'Cassa')) views.push('cassa');
    if (check('corriere', 'Corriere', config.moduleDelivery)) views.push('corriere');
    if (check('sala', 'Sala', config.moduleTables)) views.push('sala');
    if (check('cameriere', 'Cameriere', config.moduleTables)) views.push('cameriere');
    
    if (config.moduleStats && (isAdmin || user.mansioni.includes('Statistiche'))) {
        views.push('statistiche');
    }
    
    if (isAdmin || user.mansioni.includes('Impostazioni')) views.push('impostazioni');
    if (isAdmin) views.push('master');

    return views;
};

function LoginModal({ users, onLogin, onClose }: { users: User[], onLogin: (u: User) => void, onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenziali non valide');
    }
  };

  return (
    <Modal title="Accesso Staff" onClose={onClose}>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Utente" autoFocus className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-2 border-slate-300 dark:border-slate-600 focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10 transition-all font-bold" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-2 border-slate-300 dark:border-slate-600 focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10 transition-all font-bold" />
        </div>
        {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
        <button type="submit" className="w-full bg-[#800020] text-white py-4 rounded-xl font-bold hover:bg-[#600018] transition-colors shadow-lg active:scale-[0.98] uppercase tracking-widest">ACCEDI</button>
      </form>
    </Modal>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState<DB | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('prenotazioni');
  const [notify, setNotify] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType | 'choose' | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'pranzo' | 'cena'>(() => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      return (minutes >= 300 && minutes <= 960) ? 'pranzo' : 'cena';
  });

  // REALTIME SYNC WITH FIREBASE
  useEffect(() => {
    let unsubscribeSettings: any;
    let unsubscribeMenu: any;
    let unsubscribeOrders: any;
    let unsubscribeUsers: any;
    let unsubscribeTables: any;

    const setupListeners = () => {
      setLoading(true);
      
      const localDb: Partial<DB> = {
        users: [], menu: [], orders: [], tables: [], settings: INITIAL_DB.settings, theme: 'light'
      };

      // 1. Settings Document
      unsubscribeSettings = onSnapshot(doc(db, 'config', 'settings'), (doc) => {
        if (doc.exists()) {
          localDb.settings = doc.data() as any;
          setDbData(prev => prev ? { ...prev, settings: doc.data() as any } : { ...localDb as DB, settings: doc.data() as any });
          setLoading(false);
        } else {
          console.log("No settings found in Firebase. Seeding required.");
          setDbData(null);
          setLoading(false);
        }
      });

      // 2. Menu Collection
      unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        setDbData(prev => prev ? { ...prev, menu: items } : null);
      });

      // 3. Orders Collection
      unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        setDbData(prev => prev ? { ...prev, orders: items } : null);
      });

      // 4. Users Collection
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        setDbData(prev => prev ? { ...prev, users: items } : null);
      });

      // 5. Tables Collection
      unsubscribeTables = onSnapshot(collection(db, 'tables'), (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        setDbData(prev => prev ? { ...prev, tables: items.sort((a,b) => a.id - b.id) } : null);
      });
    };

    setupListeners();

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeMenu) unsubscribeMenu();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeTables) unsubscribeTables();
    };
  }, []);

  // SESSION MANAGEMENT
  useEffect(() => {
    if (dbData?.users) {
      const savedToken = localStorage.getItem(SESSION_KEY);
      if (savedToken) {
          const user = dbData.users.find(u => u.id === savedToken);
          if (user) {
              setCurrentUser(user);
              const available = getAvailableViews(user, dbData.settings.systemConfig);
              if (!available.includes(view)) setView(available[0] || 'prenotazioni');
          }
      }
    }
  }, [dbData?.users]);

  // DB SEEDING LOGIC
  const handleSeedDatabase = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'settings'), INITIAL_DB.settings);
      for (const user of INITIAL_DB.users) {
        await setDoc(doc(db, 'users', user.id), user);
      }
      for (const item of INITIAL_DB.menu) {
        await setDoc(doc(db, 'menu', item.id), item);
      }
      for (const table of INITIAL_DB.tables) {
        await setDoc(doc(db, 'tables', String(table.id)), table);
      }
      showNotify("Database inizializzato con successo!");
    } catch (e) {
      console.error(e);
      showNotify("Errore inizializzazione");
    }
    setLoading(false);
  };

  const showNotify = (msg: string) => {
    setNotify(msg);
    setTimeout(() => setNotify(null), 3000);
  };

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, user.id);
      setIsLoginOpen(false);
      const available = getAvailableViews(user, dbData!.settings.systemConfig);
      setView(available[0] || 'prenotazioni');
      showNotify(`Bentornato, ${user.username}`);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem(SESSION_KEY);
      showNotify("Disconnesso");
  };

  const fireSetDb = async (action: any) => {
    if (!dbData) return;
    const nextDb = typeof action === 'function' ? action(dbData) : action;
    
    if (nextDb.orders !== dbData.orders) {
       for (const o of nextDb.orders) {
         const old = dbData.orders.find(x => x.id === o.id);
         if (!old) await setDoc(doc(db, 'orders', o.id), o);
         else if (JSON.stringify(old) !== JSON.stringify(o)) await updateDoc(doc(db, 'orders', o.id), o as any);
       }
       const removed = dbData.orders.filter(o => !nextDb.orders.find((x:any) => x.id === o.id));
       for (const r of removed) await deleteDoc(doc(db, 'orders', r.id));
    }

    if (JSON.stringify(nextDb.settings) !== JSON.stringify(dbData.settings)) {
      await setDoc(doc(db, 'config', 'settings'), nextDb.settings);
    }

    if (JSON.stringify(nextDb.tables) !== JSON.stringify(dbData.tables)) {
       for (const t of nextDb.tables) {
         await setDoc(doc(db, 'tables', String(t.id)), t);
       }
    }

    if (JSON.stringify(nextDb.users) !== JSON.stringify(dbData.users)) {
       for (const u of nextDb.users) {
         await setDoc(doc(db, 'users', u.id), u);
       }
       const removed = dbData.users.filter(u => !nextDb.users.find((x:any) => x.id === u.id));
       for (const r of removed) await deleteDoc(doc(db, 'users', r.id));
    }

    if (JSON.stringify(nextDb.menu) !== JSON.stringify(dbData.menu)) {
       for (const m of nextDb.menu) {
         await setDoc(doc(db, 'menu', m.id), m);
       }
       const removed = dbData.menu.filter(m => !nextDb.menu.find((x:any) => x.id === m.id));
       for (const r of removed) await deleteDoc(doc(db, 'menu', r.id));
    }
  };

  const handlePublicOrder = async (formData: any) => {
      // Sanitizzazione Indirizzo Condizionale
      const isDelivery = orderType === 'consegna';
      const fullAddress = isDelivery 
        ? `${formData.street || ""}, ${formData.civic || ""}, ${formData.city || "Enna"} ${formData.extra ? `(${formData.extra})` : ''}`
        : "";

      const processedItems: OrderItem[] = cart.map(item => ({
          ...item,
          status: (item.requiresCooking ? 'new' : 'ready') as ItemStatus,
          isPaid: false,
          // Assicuriamoci che item non contenga undefined nelle sue proprietà annidate
          selectedExtras: item.selectedExtras || [],
          removedIngredientIds: item.removedIngredientIds || []
      }));

      const newId = "W-" + Math.random().toString(36).substr(2, 4).toUpperCase();
      
      // Sanitizzazione Rigorosa di newOrder per evitare undefined in Firestore
      const newOrder: Order = {
          id: newId,
          type: (orderType === 'choose' ? 'asporto' : orderType) as OrderType,
          customerName: formData.name || "Cliente Web",
          customerPhone: formData.phone || "",
          customerStreet: isDelivery ? (formData.street || "") : "",
          customerCivic: isDelivery ? (formData.civic || "") : "",
          customerCity: isDelivery ? (formData.city || "Enna") : "",
          customerExtra: isDelivery ? (formData.extra || "") : "",
          customerAddress: fullAddress,
          orderNotes: formData.notes || "",
          pax: orderType === 'tavolo' ? (formData.pax || 0) : 0,
          duration: orderType === 'tavolo' ? 90 : 0,
          time: formData.time || "00:00",
          date: formData.date || new Date().toISOString().split('T')[0],
          items: processedItems,
          timestamp: Date.now(),
          isAccepted: false, 
          isArchived: false,
          isShipped: false,
          receivedAmount: 0,
          paidCoverCharges: 0,
          payments: [],
          createdBy: 'web'
      };

      try {
        await setDoc(doc(db, 'orders', newId), newOrder);
        showNotify("Richiesta inviata correttamente!");
        setCart([]);
        setOrderType(null);
      } catch (err) {
        console.error("Firestore Save Error:", err);
        showNotify("Errore durante l'invio. Riprova.");
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin text-[#800020] mx-auto mb-4"/>
          <p className="font-bold tracking-widest uppercase">Connessione al Cloud...</p>
        </div>
      </div>
    );
  }

  if (!dbData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-lg text-center space-y-6">
          <CloudUpload size={64} className="text-[#800020] mx-auto mb-4"/>
          <h2 className="text-2xl font-black uppercase">Prima Installazione</h2>
          <p className="text-slate-500 font-medium">Il database cloud è vuoto. Clicca il pulsante qui sotto per inizializzare il sistema con i dati di configurazione predefiniti.</p>
          <button onClick={handleSeedDatabase} className="w-full bg-[#800020] text-white py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform uppercase">Inizializza Database</button>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <>
        {notify && <NotificationBanner message={notify} />}
        {isLoginOpen && <LoginModal users={dbData.users} onLogin={handleLogin} onClose={() => setIsLoginOpen(false)} />}
        <PublicSite 
          db={dbData} cart={cart} setCart={setCart} orderType={orderType} setOrderType={setOrderType} 
          onSubmit={handlePublicOrder} onStaffAccess={() => setIsLoginOpen(true)} showNotify={showNotify}
        />
      </>
    );
  }

  const availableViews = getAvailableViews(currentUser, dbData.settings.systemConfig);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans transition-colors duration-300">
        {notify && <NotificationBanner message={notify} />}
        
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#800020] text-white p-6 hidden xl:flex flex-col z-30 shadow-2xl">
            <div className="mb-10 flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl"><ChefHat size={24}/></div>
                <div>
                    <h1 className="font-black italic text-xl tracking-tighter">PizzaFlow</h1>
                    <p className="text-xs text-white/50 font-mono">v7.03-Cloud</p>
                </div>
            </div>
            
            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                {availableViews.map(v => (
                    <SidebarBtn 
                        key={v}
                        icon={
                            v === 'prenotazioni' ? <Calendar /> : 
                            v === 'cucina' ? <UtensilsCrossed /> : 
                            v === 'cassa' ? <Banknote /> :
                            v === 'sala' ? <LayoutDashboard /> : 
                            v === 'cameriere' ? <Utensils /> : 
                            v === 'corriere' ? <Bike /> : 
                            v === 'statistiche' ? <TrendingUp /> :
                            v === 'master' ? <ShieldCheck /> :
                            <Settings />
                        } 
                        label={v === 'master' ? 'Pannello Master' : v.charAt(0).toUpperCase() + v.slice(1)} 
                        active={view === v} 
                        onClick={() => setView(v)} 
                    />
                ))}
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2">
                <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold text-red-200 hover:text-white transition-colors w-full px-4 py-2 rounded-xl hover:bg-white/10">
                    <LogOut size={18}/> Logout
                </button>
            </div>
        </aside>

        <div className="xl:hidden fixed bottom-0 left-0 w-full bg-[#800020] text-white z-40 flex overflow-x-auto no-scrollbar items-center justify-start safe-area-bottom pb-4 pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
             {availableViews.map(v => (
                 <div key={v} className="flex-1 min-w-[80px] md:min-w-[100px] shrink-0">
                    <SidebarBtn 
                        fullWidth={false}
                        icon={
                            v === 'prenotazioni' ? <Calendar /> : 
                            v === 'cucina' ? <UtensilsCrossed /> : 
                            v === 'cassa' ? <Banknote /> :
                            v === 'sala' ? <LayoutDashboard /> : 
                            v === 'cameriere' ? <Utensils /> : 
                            v === 'corriere' ? <Bike /> : 
                            v === 'statistiche' ? <TrendingUp /> :
                            v === 'master' ? <ShieldCheck /> :
                            <Settings />
                        } 
                        label={v === 'master' ? 'Master' : v.charAt(0).toUpperCase() + v.slice(1)} 
                        active={view === v} 
                        onClick={() => setView(v)} 
                    />
                 </div>
             ))}
             <div className="flex-1 min-w-[80px] md:min-w-[100px] shrink-0">
                 <button onClick={handleLogout} className="w-full h-full flex flex-col items-center justify-center p-2 gap-1 text-white/70 hover:text-white transition-colors">
                     <LogOut size={24}/>
                     <span className="text-[10px] font-bold">Esci</span>
                 </button>
             </div>
        </div>

        <main className="xl:ml-64 p-4 xl:p-8 min-h-screen pb-24 xl:pb-8">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                        {view === 'master' ? 'Master Control Panel' : view}
                    </h2>
                    <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                        <UserIcon size={14}/> {currentUser.username} 
                        <span className="text-slate-600 dark:text-slate-600">•</span> <span className="uppercase text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{currentUser.mansioni.join(', ')}</span>
                    </p>
                </div>
                <div className="hidden xl:block">
                     <GlobalToolbar date={date} setDate={setDate} shift={shift} setShift={setShift} />
                </div>
            </header>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {view === 'prenotazioni' && <ReservationsTab db={dbData} setDb={fireSetDb} showNotify={showNotify} viewDate={date} viewShift={shift} currentUser={currentUser} />}
                {view === 'cucina' && <KitchenTab db={dbData} setDb={fireSetDb} viewDate={date} viewShift={shift} currentUser={currentUser} />}
                {view === 'cassa' && <CashierTab db={dbData} setDb={fireSetDb} viewDate={date} viewShift={shift} showNotify={showNotify} currentUser={currentUser} />}
                {view === 'sala' && <DiningTab db={dbData} viewDate={date} viewShift={shift} />}
                {view === 'cameriere' && <WaiterView db={dbData} setDb={fireSetDb} showNotify={showNotify} viewDate={date} viewShift={shift} currentUser={currentUser} />}
                {view === 'corriere' && <DeliveryTab db={dbData} setDb={fireSetDb} viewDate={date} viewShift={shift} currentUser={currentUser} />}
                {view === 'statistiche' && <StatsTab db={dbData} />}
                {view === 'impostazioni' && <SettingsTab db={dbData} setDb={fireSetDb} onDeleteUser={(id) => fireSetDb((p:DB) => ({...p, users: p.users.filter(u => u.id !== id)}))} showNotify={showNotify}/>}
                {view === 'master' && <MasterConfigTab db={dbData} setDb={fireSetDb} showNotify={showNotify} />}
            </div>
        </main>
    </div>
  );
}
