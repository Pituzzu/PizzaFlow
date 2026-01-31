
import React from 'react';
import { ImageIcon, FileText, Phone, Share2, Instagram, Facebook, Music2 } from 'lucide-react';
import { DB, SiteConfig } from '../../types';

interface SettingsSiteProps {
    db: DB;
    setDb: React.Dispatch<React.SetStateAction<DB>>;
}

export function SettingsSite({ db, setDb }: SettingsSiteProps) {
    const updateSiteConfig = (field: keyof SiteConfig, value: string) => {
        setDb(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                siteConfig: { ...prev.settings.siteConfig, [field]: value }
            }
        }));
    };

    return (
        <div className="space-y-8 pb-24 max-w-6xl">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><ImageIcon size={24}/> Hero Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Titolo Principale</label>
                            <input value={db.settings.siteConfig.heroTitle} onChange={e => updateSiteConfig('heroTitle', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sottotitolo</label>
                            <textarea value={db.settings.siteConfig.heroSubtitle} onChange={e => updateSiteConfig('heroSubtitle', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-medium border outline-none focus:border-[#800020]" rows={3}/>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Immagine Hero (URL)</label>
                            <input value={db.settings.siteConfig.heroImage} onChange={e => updateSiteConfig('heroImage', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-mono text-xs border outline-none focus:border-[#800020]"/>
                        </div>
                        <div className="h-40 rounded-2xl overflow-hidden border bg-slate-100">
                            <img src={db.settings.siteConfig.heroImage} className="w-full h-full object-cover" alt="Preview Hero"/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><FileText size={24}/> Storytelling & Filosofia</h3>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Titolo Sezione 1</label>
                                <input value={db.settings.siteConfig.aboutTitle} onChange={e => updateSiteConfig('aboutTitle', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descrizione 1</label>
                                <textarea value={db.settings.siteConfig.aboutText} onChange={e => updateSiteConfig('aboutText', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-medium border outline-none focus:border-[#800020]" rows={4}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Foto 1 (URL)</label>
                            <input value={db.settings.siteConfig.aboutImage} onChange={e => updateSiteConfig('aboutImage', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-xs font-mono mb-2"/>
                            <div className="h-44 rounded-xl overflow-hidden border bg-slate-100"><img src={db.settings.siteConfig.aboutImage} className="w-full h-full object-cover" alt="About 1"/></div>
                        </div>
                    </div>
                    <hr className="dark:border-slate-700"/>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Foto 2 (URL)</label>
                            <input value={db.settings.siteConfig.aboutImage2} onChange={e => updateSiteConfig('aboutImage2', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-xs font-mono mb-2"/>
                            <div className="h-44 rounded-xl overflow-hidden border bg-slate-100"><img src={db.settings.siteConfig.aboutImage2} className="w-full h-full object-cover" alt="About 2"/></div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Titolo Sezione 2</label>
                                <input value={db.settings.siteConfig.aboutTitle2} onChange={e => updateSiteConfig('aboutTitle2', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descrizione 2</label>
                                <textarea value={db.settings.siteConfig.aboutText2} onChange={e => updateSiteConfig('aboutText2', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-medium border outline-none focus:border-[#800020]" rows={4}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><Phone size={24}/> Recapiti & Località</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Indirizzo Fisico</label>
                            <input value={db.settings.siteConfig.contactAddress} onChange={e => updateSiteConfig('contactAddress', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telefono Pubblico</label>
                            <input value={db.settings.siteConfig.contactPhone} onChange={e => updateSiteConfig('contactPhone', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Ufficiale</label>
                            <input value={db.settings.siteConfig.contactEmail} onChange={e => updateSiteConfig('contactEmail', e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold border outline-none focus:border-[#800020]"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black italic mb-6 flex items-center gap-3 text-[#800020] uppercase tracking-tight"><Share2 size={24}/> Social Presence</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Instagram size={24}/></div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Instagram URL</label>
                                <input value={db.settings.siteConfig.socialInstagram} onChange={e => updateSiteConfig('socialInstagram', e.target.value)} placeholder="https://instagram.com/..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-sm outline-none focus:border-[#800020]"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Facebook size={24}/></div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Facebook URL</label>
                                <input value={db.settings.siteConfig.socialFacebook} onChange={e => updateSiteConfig('socialFacebook', e.target.value)} placeholder="https://facebook.com/..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-sm outline-none focus:border-[#800020]"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 text-white rounded-xl"><Music2 size={24}/></div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">TikTok URL</label>
                                <input value={db.settings.siteConfig.socialTiktok} onChange={e => updateSiteConfig('socialTiktok', e.target.value)} placeholder="https://tiktok.com/@..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-sm outline-none focus:border-[#800020]"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
