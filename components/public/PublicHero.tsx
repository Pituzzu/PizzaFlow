
import React from 'react';
import { SiteConfig, OrderType } from '../../types';

interface PublicHeroProps {
    config: SiteConfig;
    onOrderClick: () => void;
}

export function PublicHero({ config, onOrderClick }: PublicHeroProps) {
    return (
        <section className="relative h-[85vh] flex items-center justify-center bg-[#1c1917] overflow-hidden rounded-b-[40px] shadow-2xl">
            <div className="absolute inset-0 opacity-60 bg-cover bg-center transition-transform duration-[20s] hover:scale-110" style={{backgroundImage: `url(${config.heroImage})`}}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
            
            <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
                <h1 className="font-serif text-5xl md:text-8xl font-black mb-6 leading-tight uppercase italic tracking-tighter drop-shadow-lg">{config.heroTitle}</h1>
                <p className="text-lg md:text-2xl text-stone-200 mb-10 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">{config.heroSubtitle}</p>
                <div className="flex justify-center">
                    <button 
                        onClick={onOrderClick} 
                        className="bg-[#800020] text-white px-12 py-6 rounded-full font-black text-xl hover:bg-white hover:text-[#800020] transition-all shadow-[0_20px_50px_rgba(128,0,32,0.5)] uppercase tracking-wider hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                        Ordina Ora
                    </button>
                </div>
            </div>
        </section>
    );
}
