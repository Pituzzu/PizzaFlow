
import React, { useState } from 'react';
import { Layout, Layers, Plus, Edit, Trash2, ArrowUp, ArrowDown, Pizza, Eye, EyeOff, Save, ToggleRight, ToggleLeft, List } from 'lucide-react';
import { DB, MenuItem, Extra, Ingredient } from '../../types';
import { Modal } from '../Shared';

interface SettingsMenuProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
    showNotify: (msg: string) => void;
}

export function SettingsMenu({ db, setDb, showNotify }: SettingsMenuProps) {
    const [newItem, setNewItem] = useState<Partial<MenuItem>>({ category: 'Pizze', price: 0, name: '', description: '', visible: true, imageUrl: '', requiresCooking: true, allowedExtraIds: [], defaultIngredientIds: [] });
    const [newExtra, setNewExtra] = useState<Partial<Extra>>({ name: '', price: 0 });
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({ name: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<{name: string, index: number} | null>(null);
    const [renamingCategory, setRenamingCategory] = useState('');
    const [selectedMenuCat, setSelectedMenuCat] = useState<string>('Pizze');

    const categories = db.settings.categoryOrder || ['Pizze', 'Cucina', 'Bevande', 'Dessert'];

    // --- LOGICA EXTRAS (SUPPLEMENTI) ---
    const addExtra = () => {
        if(!newExtra.name || newExtra.price === undefined) return;
        const extra: Extra = {
            id: 'ex-' + Math.random().toString(36).substr(2, 6),
            name: newExtra.name,
            price: Number(newExtra.price)
        };
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, globalExtras: [...(prev.settings.globalExtras || []), extra] }
        }));
        setNewExtra({ name: '', price: 0 });
        showNotify("Supplemento aggiunto");
    };

    const deleteExtra = (id: string) => {
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, globalExtras: prev.settings.globalExtras.filter(e => e.id !== id) }
        }));
    };

    // --- LOGICA INGREDIENTI GLOBALI ---
    const addIngredient = () => {
        if(!newIngredient.name) return;
        const ing: Ingredient = {
            id: 'ing-' + Math.random().toString(36).substr(2, 6),
            name: newIngredient.name
        };
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, globalIngredients: [...(prev.settings.globalIngredients || []), ing] }
        }));
        setNewIngredient({ name: '' });
        showNotify("Ingrediente aggiunto");
    };

    const deleteIngredient = (id: string) => {
        setDb(prev => ({
            ...prev,
            settings: { ...prev.settings, globalIngredients: (prev.settings.globalIngredients || []).filter(i => i.id !== id) }
        }));
    };

    // --- LOGICA MENU (PIATTI) ---
    const addMenuItem = () => {
        if(!newItem.name || !newItem.price) return;
        const lastOrder = db.menu
            .filter(m => m.category === (newItem.category || selectedMenuCat))
            .reduce((max, m) => Math.max(max, m.order || 0), 0);
        setDb(prev => ({
            ...prev,
            menu: [...prev.menu, { ...newItem, id: Math.random().toString(), price: Number(newItem.price), visible: true, order: lastOrder + 1, allowedExtraIds: newItem.allowedExtraIds || [], defaultIngredientIds: newItem.defaultIngredientIds || [] } as MenuItem]
        }));
        setNewItem({ category: selectedMenuCat, price: 0, name: '', description: '', visible: true, imageUrl: '', requiresCooking: true, allowedExtraIds: [], defaultIngredientIds: [] });
        showNotify("Piatto aggiunto");
    };

    const deleteMenuItem = (id: string) => { setDb(prev => ({ ...prev, menu: prev.menu.filter(i => i.id !== id) })); };
    const toggleItemVisibility = (id: string) => { setDb(prev => ({ ...prev, menu: prev.menu.map(i => i.id === id ? { ...i, visible: !i.visible } : i) })); };
    const saveEditedItem = () => { if(!editingItem) return; setDb(prev => ({ ...prev, menu: prev.menu.map(i => i.id === editingItem.id ? editingItem : i) })); setEditingItem(null); showNotify("Piatto modificato"); };

    const moveItem = (itemId: string, direction: 'up' | 'down') => {
        const categoryItems = db.menu.filter(i => i.category === selectedMenuCat).sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = categoryItems.findIndex(i => i.id === itemId);
        if (idx === -1) return;
        if (direction === 'up' && idx > 0) {
            const current = categoryItems[idx]; const prev = categoryItems[idx - 1];
            const tempOrder = current.order || 0; current.order = prev.order || 0; prev.order = tempOrder;
            setDb(prevDB => ({ ...prevDB, menu: prevDB.menu.map(m => { if (m.id === current.id) return { ...m, order: current.order }; if (m.id === prev.id) return { ...m, order: current.order }; return m; }) }));
        } else if (direction === 'down' && idx < categoryItems.length - 1) {
            const current = categoryItems[idx]; const next = categoryItems[idx + 1];
            const tempOrder = current.order || 0; current.order = next.order || 0; next.order = tempOrder;
            setDb(prevDB => ({ ...prevDB, menu: prevDB.menu.map(m => { if (m.id === current.id) return { ...m, order: current.order }; if (m.id === next.id) return { ...m, order: next.order }; return m; }) }));
        }
    };

    const toggleAllowedExtra = (extraId: string) => {
        if(!editingItem) return;
        const currentExtras = editingItem.allowedExtraIds || [];
        const newExtras = currentExtras.includes(extraId) 
            ? currentExtras.filter(id => id !== extraId) 
            : [...currentExtras, extraId];
        setEditingItem({...editingItem, allowedExtraIds: newExtras});
    };

    const toggleDefaultIngredient = (ingId: string) => {
        if(!editingItem) return;
        const currentIngs = editingItem.defaultIngredientIds || [];
        const newIngs = currentIngs.includes(ingId)
            ? currentIngs.filter(id => id !== ingId)
            : [...currentIngs, ingId];
        setEditingItem({...editingItem, defaultIngredientIds: newIngs});
    };

    // --- LOGICA CATEGORIE ---
    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...categories];
        if (direction === 'up' && index > 0) [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        else if (direction === 'down' && index < newOrder.length - 1) [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setDb(prev => ({ ...prev, settings: { ...prev.settings, categoryOrder: newOrder } }));
    };

    const addCategory = () => {
        if(!newCategoryName.trim()) return;
        if(categories.includes(newCategoryName)) { showNotify("Categoria esistente"); return; }
        setDb(prev => ({ ...prev, settings: { ...prev.settings, categoryOrder: [...prev.settings.categoryOrder, newCategoryName] } }));
        setNewCategoryName('');
        showNotify("Categoria aggiunta");
    };

    const deleteCategory = (cat: string) => {
        if(db.menu.some(i => i.category === cat)) { showNotify("Sposta/Elimina prima i piatti"); return; }
        setDb(prev => ({ ...prev, settings: { ...prev.settings, categoryOrder: prev.settings.categoryOrder.filter(c => c !== cat) } }));
    };

    const startEditCategory = (name: string, index: number) => { setEditingCategory({name, index}); setRenamingCategory(name); };
    const saveCategoryRename = () => {
        if(!editingCategory || !renamingCategory.trim()) return;
        setDb(prev => {
            const newOrder = [...prev.settings.categoryOrder]; newOrder[editingCategory.index] = renamingCategory;
            const newMenu = prev.menu.map(item => item.category === editingCategory.name ? { ...item, category: renamingCategory } : item);
            return { ...prev, menu: newMenu, settings: { ...prev.settings, categoryOrder: newOrder } };
        });
        setEditingCategory(null); showNotify("Categoria rinominata");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-24">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><Layout size={18}/> Categorie</h3>
                    <div className="space-y-2 mb-4">
                        {categories.map((cat, idx) => (
                            <div key={cat} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${selectedMenuCat === cat ? 'bg-[#800020] border-[#800020] text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 cursor-pointer'}`} onClick={() => setSelectedMenuCat(cat)}>
                                <div className="flex items-center gap-3 font-bold">
                                    <div className="flex flex-col gap-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'up'); }} className="p-0.5 hover:bg-black/10 rounded disabled:opacity-20" disabled={idx === 0}><ArrowUp size={12}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'down'); }} className="p-0.5 hover:bg-black/10 rounded disabled:opacity-20" disabled={idx === categories.length - 1}><ArrowDown size={12}/></button>
                                    </div>
                                    {cat}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); startEditCategory(cat, idx); }} className="p-1.5 hover:bg-black/10 rounded-lg opacity-70"><Edit size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }} className="p-1.5 hover:bg-black/10 rounded-lg opacity-70"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input placeholder="Nuova..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-bold outline-none"/>
                        <button onClick={addCategory} className="p-3 bg-[#800020] text-white rounded-xl shadow-lg"><Plus/></button>
                    </div>
                </div>

                {/* GESTIONE SUPPLEMENTI GLOBALI */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><Layers size={18}/> Lista Supplementi</h3>
                    <div className="flex gap-2 mb-4">
                        <input placeholder="Nome" value={newExtra.name} onChange={e => setNewExtra({...newExtra, name: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-bold outline-none"/>
                        <input type="number" placeholder="€" value={newExtra.price || ''} onChange={e => setNewExtra({...newExtra, price: parseFloat(e.target.value)})} className="w-16 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-bold outline-none text-center"/>
                        <button onClick={addExtra} className="p-3 bg-green-500 text-white rounded-xl shadow-lg"><Plus/></button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {db.settings.globalExtras?.map(extra => (
                            <div key={extra.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-sm">{extra.name}</div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-green-600">€{extra.price.toFixed(2)}</span>
                                    <button onClick={() => deleteExtra(extra.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        {(!db.settings.globalExtras || db.settings.globalExtras.length === 0) && <div className="text-center text-xs text-slate-400 italic py-2">Nessun supplemento definito</div>}
                    </div>
                </div>

                {/* GESTIONE INGREDIENTI GLOBALI */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><List size={18}/> Lista Ingredienti</h3>
                    <div className="flex gap-2 mb-4">
                        <input placeholder="Nome ingrediente..." value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-bold outline-none"/>
                        <button onClick={addIngredient} className="p-3 bg-blue-500 text-white rounded-xl shadow-lg"><Plus/></button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {(db.settings.globalIngredients || []).map(ing => (
                            <div key={ing.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-sm">{ing.name}</div>
                                <button onClick={() => deleteIngredient(ing.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        {(!db.settings.globalIngredients || db.settings.globalIngredients.length === 0) && <div className="text-center text-xs text-slate-400 italic py-2">Nessun ingrediente definito</div>}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-black italic text-[#800020] uppercase leading-none">{selectedMenuCat}</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{db.menu.filter(m => m.category === selectedMenuCat).length} Piatti presenti</p>
                    </div>
                    <button onClick={() => addMenuItem()} className="bg-[#800020] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all">
                        <Plus size={18}/> AGGIUNGI PIATTO RAPIDO
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {db.menu.filter(m => m.category === selectedMenuCat).sort((a, b) => (a.order || 0) - (b.order || 0)).map((m, idx, filteredArr) => (
                        <div key={m.id} className={`bg-white dark:bg-slate-800 rounded-3xl border-2 transition-all p-4 flex gap-4 ${m.visible ? 'border-slate-100 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800 opacity-50 grayscale'}`}>
                            <div className="flex flex-col justify-center gap-2 pr-2 border-r dark:border-slate-700">
                                <button onClick={() => moveItem(m.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-20"><ArrowUp size={16}/></button>
                                <button onClick={() => moveItem(m.id, 'down')} disabled={idx === filteredArr.length - 1} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-20"><ArrowDown size={16}/></button>
                            </div>
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex-shrink-0 overflow-hidden border">
                                {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover"/> : <Pizza className="w-full h-full p-4 text-slate-300"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-lg truncate pr-2">{m.name}</h4>
                                    <span className="font-black text-[#800020] shrink-0">€{m.price.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{m.description || "Nessuna descrizione"}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <button onClick={() => setEditingItem(m)} className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100"><Edit size={16}/></button>
                                    <button onClick={() => toggleItemVisibility(m.id)} className={`p-2 rounded-xl ${m.visible ? 'text-green-500 bg-green-50 hover:bg-green-100' : 'text-slate-400 bg-slate-50'}`}>{m.visible ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                                    <button onClick={() => deleteMenuItem(m.id)} className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 ml-auto"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editingItem && (
                 <Modal title={`Modifica: ${editingItem.name}`} onClose={() => setEditingItem(null)}>
                     <div className="space-y-4">
                         <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-4 rounded-xl bg-slate-100 font-bold border-2 focus:border-[#800020] outline-none"/>
                         <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})} className="w-full p-4 rounded-xl bg-slate-100 font-bold border-2 focus:border-[#800020] outline-none"/>
                            <select value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full p-4 rounded-xl bg-slate-100 font-bold border-2 focus:border-[#800020] outline-none">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <input value={editingItem.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} placeholder="URL Immagine" className="w-full p-4 rounded-xl bg-slate-100 font-bold border-2 focus:border-[#800020] outline-none"/>
                         <textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full p-4 rounded-xl bg-slate-100 font-medium border-2 focus:border-[#800020] outline-none" rows={3}/>
                         
                         {/* SELEZIONE SUPPLEMENTI ASSOCIABILI */}
                         <div className="bg-slate-50 p-4 rounded-xl border-2">
                             <h4 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Supplementi Abilitati</h4>
                             <div className="flex flex-wrap gap-2">
                                 {db.settings.globalExtras?.map(extra => (
                                     <button 
                                        key={extra.id}
                                        onClick={() => toggleAllowedExtra(extra.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editingItem.allowedExtraIds?.includes(extra.id) ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                     >
                                         {extra.name} (+€{extra.price.toFixed(2)})
                                     </button>
                                 ))}
                                 {(!db.settings.globalExtras || db.settings.globalExtras.length === 0) && <span className="text-xs italic text-slate-400">Nessun supplemento globale definito.</span>}
                             </div>
                         </div>

                         {/* SELEZIONE INGREDIENTI BASE */}
                         <div className="bg-slate-50 p-4 rounded-xl border-2">
                             <h4 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Ingredienti Base (Default)</h4>
                             <div className="flex flex-wrap gap-2">
                                 {(db.settings.globalIngredients || []).map(ing => (
                                     <button 
                                        key={ing.id}
                                        onClick={() => toggleDefaultIngredient(ing.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editingItem.defaultIngredientIds?.includes(ing.id) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                     >
                                         {ing.name}
                                     </button>
                                 ))}
                                 {(!db.settings.globalIngredients || db.settings.globalIngredients.length === 0) && <span className="text-xs italic text-slate-400">Nessun ingrediente globale definito.</span>}
                             </div>
                         </div>

                         <button onClick={() => setEditingItem({...editingItem, requiresCooking: !editingItem.requiresCooking})} className={`w-full p-4 rounded-xl border-2 flex items-center justify-between ${editingItem.requiresCooking ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50'}`}>
                             <span className="font-bold">Richiede Cucina</span> {editingItem.requiresCooking ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                         </button>
                         <button onClick={saveEditedItem} className="w-full py-5 bg-[#800020] text-white font-black rounded-2xl shadow-xl"><Save className="inline mr-2"/> SALVA</button>
                     </div>
                 </Modal>
             )}
        </div>
    );
}
