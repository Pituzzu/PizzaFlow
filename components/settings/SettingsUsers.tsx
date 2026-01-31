
import React, { useState } from 'react';
import { User as UserIcon, Edit, Trash2 } from 'lucide-react';
import { DB, User, Mansione } from '../../types';

interface SettingsUsersProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    onDeleteUser: (id: string) => void;
    showNotify: (msg: string) => void;
}

export function SettingsUsers({ db, setDb, onDeleteUser, showNotify }: SettingsUsersProps) {
    const [newUser, setNewUser] = useState<Partial<User>>({ mansioni: ['Cameriere'], username: '', email: '', password: '', authorizedDevices: [] });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<{mansioni: Mansione[], password: string, email: string}>({ mansioni: [], password: '', email: '' });

    const addUser = () => {
        if (!newUser.username || !newUser.email || !newUser.password) { showNotify("Compila tutti i campi"); return; }
        setDb(prev => ({ ...prev, users: [...prev.users, { ...newUser, id: 'u-' + Math.random().toString(36).substr(2, 9), authorizedDevices: [] } as User] }));
        setNewUser({ mansioni: ['Cameriere'], username: '', email: '', password: '', authorizedDevices: [] });
        showNotify("Utente creato");
    };

    const startEditUser = (u: User) => { setEditingUser(u); setEditForm({ mansioni: u.mansioni, password: u.password, email: u.email }); };
    
    const toggleEditMansione = (m: Mansione) => { setEditForm(prev => ({ ...prev, mansioni: prev.mansioni.includes(m) ? prev.mansioni.filter(x => x !== m) : [...prev.mansioni, m] })); };
    
    const toggleNewUserMansione = (m: Mansione) => {
        setNewUser(prev => ({
            ...prev,
            mansioni: prev.mansioni?.includes(m) 
                ? prev.mansioni.filter(x => x !== m) 
                : [...(prev.mansioni || []), m]
        }));
    };

    const saveEditUser = () => { if (!editingUser) return; setDb(prev => ({ ...prev, users: prev.users.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u) })); setEditingUser(null); showNotify("Utente aggiornato"); };

    const roles: Mansione[] = ['Amministratore', 'Cameriere', 'Cucina', 'Sala', 'Prenotazioni', 'Impostazioni', 'Corriere', 'Cassa', 'Statistiche'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] h-fit border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-[#800020] uppercase italic tracking-tight"><UserIcon size={24}/> Nuovo Collaboratore</h3>
                <div className="space-y-3">
                    <input placeholder="Username" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border font-bold"/>
                    <input placeholder="Email" type="email" value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border font-bold"/>
                    <input placeholder="Password" type="password" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border font-bold"/>
                    <div className="py-2">
                        <label className="text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest">Ruoli & Permessi</label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(m => (
                                <button key={m} onClick={() => toggleNewUserMansione(m)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${newUser.mansioni?.includes(m) ? 'bg-[#800020] border-[#800020] text-white' : 'bg-white text-slate-500'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={addUser} className="w-full py-4 bg-[#800020] text-white font-black rounded-xl mt-2 uppercase tracking-widest shadow-lg">CREA UTENTE</button>
                </div>
            </div>
            <div className="space-y-3">
                {db.users.map(u => (
                    <div key={u.id} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-xl text-[#800020] italic">{u.username[0].toUpperCase()}</div>
                            <div>
                                <div className="font-black text-lg uppercase tracking-tight italic">{u.username}</div>
                                <div className="text-[10px] text-slate-400 font-bold">{u.email}</div>
                                <div className="text-[9px] text-slate-400 mt-1 flex flex-wrap gap-1">{u.mansioni.map(m => <span key={m} className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase font-black">{m}</span>)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {u.username !== 'admin' && (
                                <>
                                <button onClick={() => startEditUser(u)} className="p-3 text-blue-400 hover:bg-blue-50 rounded-xl"><Edit size={20}/></button>
                                <button onClick={() => onDeleteUser(u.id)} className="p-3 text-red-300 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">Modifica {editingUser.username}</h3>
                        <div className="space-y-3">
                            <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl"/>
                            <input value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl"/>
                            <div className="flex flex-wrap gap-2">
                                {roles.map(m => (
                                    <button key={m} onClick={() => toggleEditMansione(m)} className={`px-2 py-1 rounded text-xs border ${editForm.mansioni.includes(m) ? 'bg-black text-white' : 'bg-white'}`}>{m}</button>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-200 rounded-xl">Annulla</button>
                                <button onClick={saveEditUser} className="flex-1 py-2 bg-blue-500 text-white rounded-xl">Salva</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
