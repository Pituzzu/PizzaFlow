
import React from 'react';
import { Pizza, Instagram, Facebook, Music2, Lock } from 'lucide-react';
import { SiteConfig } from '../../types';

interface PublicFooterProps {
    config: SiteConfig;
    onStaffAccess: () => void;
    onNavigate: (section: 'home' | 'about' | 'contacts') => void;
}

export function PublicFooter({ config, onStaffAccess, onNavigate }: PublicFooterProps) {
    return (
        <footer className="bg-[#0c0a09] pt-24 pb-12 text-stone-300 font-sans border-t border-stone-800 rounded-t-[60px] mt-[-40px] relative z-20">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
                <div className="col-span-2 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#800020] text-white p-3 rounded-2xl shadow-[0_0_20px_rgba(128,0,32,0.4)]"><Pizza size={32}/></div>
                        <span className="font-serif font-black text-3xl tracking-tight uppercase text-white">Pizza Flow</span>
                    </div>
                    <p className="text-lg text-stone-500 leading-relaxed max-w-md font-light">
                        Autentica tradizione ennese, dal cuore della Sicilia direttamente sulla tua tavola. Ingredienti locali e passione senza tempo.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8">Esplora</h4>
                    <ul className="space-y-4 text-stone-500 font-bold text-sm">
                        <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors hover:translate-x-2 duration-300 inline-block">Home</button></li>
                        <li><button onClick={() => onNavigate('about')} className="hover:text-white transition-colors hover:translate-x-2 duration-300 inline-block">Chi Siamo</button></li>
                        <li><button onClick={() => onNavigate('contacts')} className="hover:text-white transition-colors hover:translate-x-2 duration-300 inline-block">Contatti</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8">Seguici</h4>
                    <div className="flex gap-4">
                        {config.socialInstagram && <a href={config.socialInstagram} target="_blank" rel="noreferrer" className="p-4 bg-stone-900 rounded-2xl hover:bg-[#800020] text-white transition-all hover:-translate-y-1"><Instagram size={20}/></a>}
                        {config.socialFacebook && <a href={config.socialFacebook} target="_blank" rel="noreferrer" className="p-4 bg-stone-900 rounded-2xl hover:bg-[#800020] text-white transition-all hover:-translate-y-1"><Facebook size={20}/></a>}
                        {config.socialTiktok && <a href={config.socialTiktok} target="_blank" rel="noreferrer" className="p-4 bg-stone-900 rounded-2xl hover:bg-[#800020] text-white transition-all hover:-translate-y-1"><Music2 size={20}/></a>}
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-stone-900/50 text-xs font-black uppercase tracking-widest text-stone-700">
                <span>© {new Date().getFullYear()} Pizza Flow Enna.</span>
                <button onClick={onStaffAccess} className="flex items-center gap-2 hover:text-[#800020] transition-colors border border-stone-800 px-4 py-2 rounded-xl hover:bg-stone-900"><Lock size={12}/> Area Riservata</button>
            </div>
        </footer>
    );
}
